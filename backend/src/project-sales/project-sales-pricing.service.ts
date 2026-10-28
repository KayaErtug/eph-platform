import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role, UnitStatus, UnitType } from '@prisma/client';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

type PricingMode = 'PERCENT' | 'FIXED';
type PricingDirection = 'INCREASE' | 'DECREASE';

type PricingSelection = {
  unitIds: string[];
  blockId: string | null;
  floorId: string | null;
  roomCount: string | null;
  unitType: UnitType | null;
  statuses: UnitStatus[];
};

type PricingAdjustment = {
  mode: PricingMode;
  direction: PricingDirection;
  value: number;
  roundingStep: number;
};

type PricingUnitSnapshot = {
  id: string;
  inventoryCode: string | null;
  blockId: string | null;
  floorId: string | null;
  roomCount: string | null;
  type: UnitType;
  status: UnitStatus;
  priceCurrency: string;
  currentPrice: number;
  nextPrice: number;
  difference: number;
  updatedAt: Date;
};

type BulkPricingBody = {
  selection?: unknown;
  adjustment?: unknown;
  previewHash?: unknown;
  confirmation?: unknown;
};

const LOCKED_STATUSES = new Set<UnitStatus>([
  UnitStatus.REZERVE,
  UnitStatus.OPSIYONLU,
  UnitStatus.SATILDI,
  UnitStatus.KIRALANDII,
  UnitStatus.PASIF,
]);

const MAX_BULK_UNIT_COUNT = 1000;
const CONFIRMATION_TEXT = 'FIYATLARI_GUNCELLE';

@Injectable()
export class ProjectSalesPricingService {
  constructor(private readonly prisma: PrismaService) {}

  async previewBulkPricing(
    projectId: string,
    userId: string,
    userRole: Role,
    body: BulkPricingBody,
  ) {
    const preview = await this.buildPreview(projectId, userId, userRole, body);

    return this.toPublicPreview(preview);
  }

  async applyBulkPricing(
    projectId: string,
    userId: string,
    userRole: Role,
    body: BulkPricingBody,
  ) {
    const confirmation = String(body.confirmation || '').trim();

    if (confirmation !== CONFIRMATION_TEXT) {
      throw new BadRequestException(
        `Toplu fiyat güncellemesi için confirmation alanı ${CONFIRMATION_TEXT} olmalıdır.`,
      );
    }

    const previewHash = String(body.previewHash || '').trim();

    if (!previewHash) {
      throw new BadRequestException(
        'Önce fiyat önizlemesi oluşturulmalı ve previewHash gönderilmelidir.',
      );
    }

    const preview = await this.buildPreview(projectId, userId, userRole, body);

    if (preview.previewHash !== previewHash) {
      throw new BadRequestException(
        'Satış stoku önizlemeden sonra değişti. Fiyatları yeniden önizleyip tekrar onaylayın.',
      );
    }

    await this.prisma.$transaction(async (transaction) => {
      for (const unit of preview.units) {
        const result = await transaction.unit.updateMany({
          where: {
            id: unit.id,
            projectId,
            updatedAt: unit.updatedAt,
          },
          data: {
            price: unit.nextPrice,
          },
        });

        if (result.count !== 1) {
          throw new BadRequestException(
            'Toplu fiyat güncellemesi sırasında stok değişti. İşlem geri alındı; yeniden önizleme yapın.',
          );
        }
      }
    });

    return {
      applied: true,
      projectId,
      updatedUnitCount: preview.units.length,
      skippedLockedUnitCount: preview.skippedLockedUnitCount,
      previousTotal: preview.previousTotal,
      newTotal: preview.newTotal,
      totalDifference: preview.totalDifference,
      adjustment: preview.adjustment,
      appliedAt: new Date().toISOString(),
    };
  }

  private async buildPreview(
    projectId: string,
    userId: string,
    userRole: Role,
    body: BulkPricingBody,
  ) {
    await this.ensureProjectAccess(projectId, userId, userRole);

    const selection = this.prepareSelection(body.selection);
    const adjustment = this.prepareAdjustment(body.adjustment);
    const where = this.buildUnitWhere(projectId, selection);

    const selectedUnits = await this.prisma.unit.findMany({
      where,
      select: {
        id: true,
        inventoryCode: true,
        blockId: true,
        floorId: true,
        roomCount: true,
        type: true,
        status: true,
        price: true,
        priceCurrency: true,
        updatedAt: true,
      },
      orderBy: [
        { inventorySortOrder: 'asc' },
        { createdAt: 'asc' },
      ],
      take: MAX_BULK_UNIT_COUNT + 1,
    });

    if (selectedUnits.length > MAX_BULK_UNIT_COUNT) {
      throw new BadRequestException(
        `Tek toplu fiyat işleminde en fazla ${MAX_BULK_UNIT_COUNT.toLocaleString('tr-TR')} bağımsız bölüm seçilebilir.`,
      );
    }

    const editableUnits = selectedUnits.filter(
      (unit) => !LOCKED_STATUSES.has(unit.status),
    );
    const skippedLockedUnitCount = selectedUnits.length - editableUnits.length;

    if (editableUnits.length === 0) {
      throw new BadRequestException(
        selectedUnits.length === 0
          ? 'Seçilen kriterlere uygun satış stoku bulunamadı.'
          : 'Seçilen bağımsız bölümlerin tamamı rezerve, opsiyonlu, satılmış, kiralanmış veya pasif durumda.',
      );
    }

    if (adjustment.mode === 'FIXED') {
      const currencies = new Set(
        editableUnits.map((unit) => (unit.priceCurrency || 'TRY').toUpperCase()),
      );

      if (currencies.size > 1) {
        throw new BadRequestException(
          'Sabit tutarlı fiyat değişikliği farklı para birimlerine aynı anda uygulanamaz. Para birimine göre ayrı işlem yapın.',
        );
      }
    }

    const units: PricingUnitSnapshot[] = editableUnits.map((unit) => {
      const currentPrice = Number(unit.price || 0);
      const nextPrice = this.calculateNextPrice(currentPrice, adjustment);

      return {
        id: unit.id,
        inventoryCode: unit.inventoryCode,
        blockId: unit.blockId,
        floorId: unit.floorId,
        roomCount: unit.roomCount,
        type: unit.type,
        status: unit.status,
        priceCurrency: (unit.priceCurrency || 'TRY').toUpperCase(),
        currentPrice,
        nextPrice,
        difference: this.roundMoney(nextPrice - currentPrice),
        updatedAt: unit.updatedAt,
      };
    });

    const previousTotal = this.roundMoney(
      units.reduce((total, unit) => total + unit.currentPrice, 0),
    );
    const newTotal = this.roundMoney(
      units.reduce((total, unit) => total + unit.nextPrice, 0),
    );
    const totalDifference = this.roundMoney(newTotal - previousTotal);
    const previewHash = this.createPreviewHash(
      projectId,
      selection,
      adjustment,
      units,
    );

    return {
      projectId,
      selection,
      adjustment,
      selectedUnitCount: selectedUnits.length,
      editableUnitCount: units.length,
      skippedLockedUnitCount,
      previousTotal,
      newTotal,
      totalDifference,
      previewHash,
      units,
    };
  }

  private toPublicPreview(preview: Awaited<ReturnType<typeof this.buildPreview>>) {
    return {
      projectId: preview.projectId,
      selection: preview.selection,
      adjustment: preview.adjustment,
      selectedUnitCount: preview.selectedUnitCount,
      editableUnitCount: preview.editableUnitCount,
      skippedLockedUnitCount: preview.skippedLockedUnitCount,
      previousTotal: preview.previousTotal,
      newTotal: preview.newTotal,
      totalDifference: preview.totalDifference,
      previewHash: preview.previewHash,
      confirmationRequired: CONFIRMATION_TEXT,
      units: preview.units.map((unit) => ({
        id: unit.id,
        inventoryCode: unit.inventoryCode,
        blockId: unit.blockId,
        floorId: unit.floorId,
        roomCount: unit.roomCount,
        type: unit.type,
        status: unit.status,
        priceCurrency: unit.priceCurrency,
        currentPrice: unit.currentPrice,
        nextPrice: unit.nextPrice,
        difference: unit.difference,
      })),
    };
  }

  private async ensureProjectAccess(
    projectId: string,
    userId: string,
    userRole: Role,
  ) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, ownerId: true },
    });

    if (!project) {
      throw new NotFoundException('Proje bulunamadı.');
    }

    if (project.ownerId !== userId && userRole !== Role.SUPER_ADMIN) {
      throw new ForbiddenException(
        'Bu projenin toplu fiyatlarını yönetme yetkiniz yok.',
      );
    }
  }

  private prepareSelection(value: unknown): PricingSelection {
    const input = this.recordValue(value);
    const unitIds = this.stringArray(input.unitIds, 'unitIds', MAX_BULK_UNIT_COUNT);
    const blockId = this.optionalString(input.blockId);
    const floorId = this.optionalString(input.floorId);
    const roomCount = this.optionalString(input.roomCount);
    const unitType = this.optionalEnumValue(
      input.unitType,
      Object.values(UnitType),
      'unitType',
    );
    const statuses = this.enumArray(
      input.statuses,
      Object.values(UnitStatus),
      'statuses',
    );

    return {
      unitIds: Array.from(new Set(unitIds)).sort(),
      blockId,
      floorId,
      roomCount,
      unitType,
      statuses: Array.from(new Set(statuses)).sort(),
    };
  }

  private prepareAdjustment(value: unknown): PricingAdjustment {
    const input = this.recordValue(value);
    const mode = String(input.mode || '').trim().toUpperCase() as PricingMode;
    const direction = String(input.direction || '')
      .trim()
      .toUpperCase() as PricingDirection;
    const adjustmentValue = this.positiveNumber(input.value, 'value');
    const roundingStep = this.nonNegativeNumber(
      input.roundingStep ?? 0,
      'roundingStep',
    );

    if (mode !== 'PERCENT' && mode !== 'FIXED') {
      throw new BadRequestException(
        'adjustment.mode PERCENT veya FIXED olmalıdır.',
      );
    }

    if (direction !== 'INCREASE' && direction !== 'DECREASE') {
      throw new BadRequestException(
        'adjustment.direction INCREASE veya DECREASE olmalıdır.',
      );
    }

    if (mode === 'PERCENT' && adjustmentValue > 100) {
      throw new BadRequestException(
        'Tek işlemde yüzdesel fiyat değişikliği %100 değerini aşamaz.',
      );
    }

    if (roundingStep > 1_000_000) {
      throw new BadRequestException(
        'roundingStep 1.000.000 değerini aşamaz.',
      );
    }

    return {
      mode,
      direction,
      value: adjustmentValue,
      roundingStep,
    };
  }

  private buildUnitWhere(
    projectId: string,
    selection: PricingSelection,
  ): Prisma.UnitWhereInput {
    return {
      projectId,
      isSalesInventory: true,
      ...(selection.unitIds.length > 0
        ? { id: { in: selection.unitIds } }
        : {}),
      ...(selection.blockId ? { blockId: selection.blockId } : {}),
      ...(selection.floorId ? { floorId: selection.floorId } : {}),
      ...(selection.roomCount ? { roomCount: selection.roomCount } : {}),
      ...(selection.unitType ? { type: selection.unitType } : {}),
      ...(selection.statuses.length > 0
        ? { status: { in: selection.statuses } }
        : {}),
    };
  }

  private calculateNextPrice(
    currentPrice: number,
    adjustment: PricingAdjustment,
  ) {
    const magnitude =
      adjustment.mode === 'PERCENT'
        ? currentPrice * (adjustment.value / 100)
        : adjustment.value;
    const signedMagnitude =
      adjustment.direction === 'INCREASE' ? magnitude : -magnitude;
    const rawPrice = currentPrice + signedMagnitude;

    if (!Number.isFinite(rawPrice) || rawPrice < 0) {
      throw new BadRequestException(
        'Fiyat değişikliği sonucunda sıfırdan küçük veya geçersiz fiyat oluşuyor.',
      );
    }

    if (adjustment.roundingStep > 0) {
      return this.roundMoney(
        Math.round(rawPrice / adjustment.roundingStep) *
          adjustment.roundingStep,
      );
    }

    return this.roundMoney(rawPrice);
  }

  private createPreviewHash(
    projectId: string,
    selection: PricingSelection,
    adjustment: PricingAdjustment,
    units: PricingUnitSnapshot[],
  ) {
    const payload = {
      projectId,
      selection,
      adjustment,
      units: [...units]
        .sort((left, right) => left.id.localeCompare(right.id))
        .map((unit) => ({
          id: unit.id,
          price: unit.currentPrice,
          nextPrice: unit.nextPrice,
          updatedAt: unit.updatedAt.toISOString(),
        })),
    };

    return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
  }

  private recordValue(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {};
    }

    return value as Record<string, unknown>;
  }

  private optionalString(value: unknown) {
    const normalized = String(value ?? '').trim();
    return normalized || null;
  }

  private stringArray(value: unknown, field: string, maxItems: number) {
    if (value === undefined || value === null) {
      return [];
    }

    if (!Array.isArray(value)) {
      throw new BadRequestException(`${field} bir liste olmalıdır.`);
    }

    if (value.length > maxItems) {
      throw new BadRequestException(
        `${field} en fazla ${maxItems.toLocaleString('tr-TR')} kayıt içerebilir.`,
      );
    }

    return value.map((item) => String(item ?? '').trim()).filter(Boolean);
  }

  private enumArray<T extends string>(
    value: unknown,
    allowedValues: readonly T[],
    field: string,
  ): T[] {
    if (value === undefined || value === null) {
      return [];
    }

    if (!Array.isArray(value)) {
      throw new BadRequestException(`${field} bir liste olmalıdır.`);
    }

    const allowed = new Set<string>(allowedValues);
    const normalized = value.map((item) =>
      String(item ?? '').trim().toUpperCase(),
    );
    const invalid = normalized.find((item) => item && !allowed.has(item));

    if (invalid) {
      throw new BadRequestException(`${field} içinde geçersiz değer: ${invalid}`);
    }

    return normalized.filter(Boolean) as T[];
  }

  private optionalEnumValue<T extends string>(
    value: unknown,
    allowedValues: readonly T[],
    field: string,
  ): T | null {
    const normalized = String(value ?? '').trim().toUpperCase();

    if (!normalized) {
      return null;
    }

    if (!new Set<string>(allowedValues).has(normalized)) {
      throw new BadRequestException(`${field} geçersiz.`);
    }

    return normalized as T;
  }

  private positiveNumber(value: unknown, field: string) {
    const parsed = this.numberValue(value);

    if (!Number.isFinite(parsed) || parsed <= 0) {
      throw new BadRequestException(`${field} sıfırdan büyük olmalıdır.`);
    }

    return parsed;
  }

  private nonNegativeNumber(value: unknown, field: string) {
    const parsed = this.numberValue(value);

    if (!Number.isFinite(parsed) || parsed < 0) {
      throw new BadRequestException(`${field} sıfır veya daha büyük olmalıdır.`);
    }

    return parsed;
  }

  private numberValue(value: unknown) {
    const normalized =
      typeof value === 'string'
        ? value.trim().replace(/\./g, '').replace(',', '.')
        : value;

    return Number(normalized);
  }

  private roundMoney(value: number) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }
}
