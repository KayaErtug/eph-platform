import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role, UnitStatus } from '@prisma/client';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

type DownPaymentMode = 'PERCENT' | 'FIXED';

type OfferPreviewBody = {
  offerPrice?: unknown;
  downPayment?: unknown;
  installmentCount?: unknown;
  annualRatePercent?: unknown;
  balloonPayment?: unknown;
  firstInstallmentDate?: unknown;
  customerId?: unknown;
  note?: unknown;
};

type DownPaymentInput = {
  mode?: unknown;
  value?: unknown;
};

const BLOCKED_UNIT_STATUSES = new Set<UnitStatus>([
  UnitStatus.SATILDI,
  UnitStatus.KIRALANDII,
  UnitStatus.PASIF,
]);

const MAX_INSTALLMENT_COUNT = 120;
const MAX_ANNUAL_RATE_PERCENT = 200;

@Injectable()
export class ProjectSalesOfferService {
  constructor(private readonly prisma: PrismaService) {}

  async previewOffer(
    unitId: string,
    userId: string,
    userRole: Role,
    body: OfferPreviewBody,
  ) {
    const unit = await this.prisma.unit.findUnique({
      where: { id: unitId },
      select: {
        id: true,
        projectId: true,
        inventoryCode: true,
        type: true,
        status: true,
        roomCount: true,
        floorLabel: true,
        number: true,
        price: true,
        priceCurrency: true,
        project: {
          select: {
            id: true,
            ownerId: true,
            name: true,
            code: true,
            city: true,
            district: true,
          },
        },
      },
    });

    if (!unit) {
      throw new NotFoundException('Bağımsız bölüm bulunamadı.');
    }

    this.ensureProjectAccess(unit.project.ownerId, userId, userRole);

    if (BLOCKED_UNIT_STATUSES.has(unit.status)) {
      throw new BadRequestException(
        'Satılmış, kiralanmış veya pasif bağımsız bölüm için teklif oluşturulamaz.',
      );
    }

    const customerId = this.optionalText(body.customerId, 120);
    if (customerId) {
      await this.ensureCustomerAccess(
        customerId,
        unit.project.ownerId,
        userId,
        userRole,
      );
    }

    const listPrice = this.positiveNumber(unit.price, 'Liste fiyatı');
    const offerPrice = body.offerPrice == null || body.offerPrice === ''
      ? listPrice
      : this.positiveNumber(body.offerPrice, 'Teklif fiyatı');
    const currency = String(unit.priceCurrency || 'TRY').trim().toUpperCase();
    const downPayment = this.parseDownPayment(body.downPayment, offerPrice);
    const balloonPayment = this.nonNegativeNumber(
      body.balloonPayment ?? 0,
      'Balon ödeme',
    );

    if (downPayment.amount + balloonPayment > offerPrice) {
      throw new BadRequestException(
        'Peşinat ve balon ödeme toplamı teklif fiyatını aşamaz.',
      );
    }

    const financedPrincipal = this.roundMoney(
      offerPrice - downPayment.amount - balloonPayment,
    );
    const installmentCount = this.installmentCount(
      body.installmentCount,
      financedPrincipal,
    );
    const annualRatePercent = this.ratePercent(body.annualRatePercent ?? 0);

    if (financedPrincipal === 0 && installmentCount > 0) {
      throw new BadRequestException(
        'Finanse edilecek tutar yoksa taksit sayısı sıfır olmalıdır.',
      );
    }

    if (financedPrincipal > 0 && installmentCount === 0) {
      throw new BadRequestException(
        'Finanse edilecek tutar için taksit sayısı en az 1 olmalıdır.',
      );
    }

    const firstInstallmentDate = this.firstInstallmentDate(
      body.firstInstallmentDate,
    );
    const monthlyRate = annualRatePercent / 12 / 100;
    const monthlyInstallment = this.calculateInstallment(
      financedPrincipal,
      installmentCount,
      monthlyRate,
    );
    const schedule = this.buildSchedule({
      principal: financedPrincipal,
      installmentCount,
      monthlyRate,
      monthlyInstallment,
      firstInstallmentDate,
    });
    const totalInstallments = this.roundMoney(
      schedule.reduce((total, item) => total + item.amount, 0),
    );
    const totalPayable = this.roundMoney(
      downPayment.amount + totalInstallments + balloonPayment,
    );
    const financingCost = this.roundMoney(totalPayable - offerPrice);
    const listDifference = this.roundMoney(offerPrice - listPrice);
    const listDifferencePercent = listPrice > 0
      ? this.roundPercent((listDifference / listPrice) * 100)
      : 0;
    const generatedAt = new Date();
    const note = this.optionalText(body.note, 500);
    const offerReference = this.createOfferReference({
      unitId,
      offerPrice,
      currency,
      downPayment,
      installmentCount,
      annualRatePercent,
      balloonPayment,
      firstInstallmentDate,
      generatedAt,
    });

    return {
      offerReference,
      generatedAt: generatedAt.toISOString(),
      project: {
        id: unit.project.id,
        name: unit.project.name,
        code: unit.project.code,
        city: unit.project.city,
        district: unit.project.district,
      },
      unit: {
        id: unit.id,
        inventoryCode: unit.inventoryCode,
        type: unit.type,
        status: unit.status,
        roomCount: unit.roomCount,
        floorLabel: unit.floorLabel,
        number: unit.number,
        listPrice,
        currency,
      },
      customerId,
      note,
      pricing: {
        listPrice,
        offerPrice,
        listDifference,
        listDifferencePercent,
        currency,
      },
      paymentPlan: {
        downPayment,
        financedPrincipal,
        annualRatePercent,
        monthlyRatePercent: this.roundPercent(monthlyRate * 100),
        installmentCount,
        monthlyInstallment,
        balloonPayment,
        totalInstallments,
        financingCost,
        totalPayable,
        firstInstallmentDate:
          installmentCount > 0 ? firstInstallmentDate.toISOString() : null,
        schedule,
      },
      policy: {
        version: 'PROJECT_SALES_OFFER_V1',
        previewOnly: true,
        persistentContract: false,
        maximumInstallmentCount: MAX_INSTALLMENT_COUNT,
        maximumAnnualRatePercent: MAX_ANNUAL_RATE_PERCENT,
        privateCrmContactFieldsIncluded: false,
      },
    };
  }

  private parseDownPayment(value: unknown, offerPrice: number) {
    const input = this.recordValue(value);
    const mode = String(input.mode || 'PERCENT')
      .trim()
      .toUpperCase() as DownPaymentMode;
    const rawValue = this.nonNegativeNumber(input.value ?? 0, 'Peşinat');

    if (mode !== 'PERCENT' && mode !== 'FIXED') {
      throw new BadRequestException(
        'Peşinat modu PERCENT veya FIXED olmalıdır.',
      );
    }

    if (mode === 'PERCENT' && rawValue > 100) {
      throw new BadRequestException('Peşinat yüzdesi %100 değerini aşamaz.');
    }

    const amount = mode === 'PERCENT'
      ? this.roundMoney((offerPrice * rawValue) / 100)
      : this.roundMoney(rawValue);

    if (amount > offerPrice) {
      throw new BadRequestException('Peşinat teklif fiyatını aşamaz.');
    }

    return {
      mode,
      value: rawValue,
      amount,
      percentOfOffer:
        offerPrice > 0
          ? this.roundPercent((amount / offerPrice) * 100)
          : 0,
    };
  }

  private calculateInstallment(
    principal: number,
    installmentCount: number,
    monthlyRate: number,
  ) {
    if (principal <= 0 || installmentCount <= 0) return 0;
    if (monthlyRate <= 0) {
      return this.roundMoney(principal / installmentCount);
    }

    const denominator = 1 - Math.pow(1 + monthlyRate, -installmentCount);
    return this.roundMoney((principal * monthlyRate) / denominator);
  }

  private buildSchedule(input: {
    principal: number;
    installmentCount: number;
    monthlyRate: number;
    monthlyInstallment: number;
    firstInstallmentDate: Date;
  }) {
    const rows: Array<{
      sequence: number;
      dueDate: string;
      amount: number;
      principal: number;
      financingCharge: number;
      remainingPrincipal: number;
    }> = [];

    if (input.installmentCount === 0) return rows;

    let remaining = input.principal;

    for (let index = 0; index < input.installmentCount; index += 1) {
      const sequence = index + 1;
      const financingCharge = this.roundMoney(remaining * input.monthlyRate);
      let principalPart = this.roundMoney(
        input.monthlyInstallment - financingCharge,
      );
      let amount = input.monthlyInstallment;

      if (sequence === input.installmentCount) {
        principalPart = this.roundMoney(remaining);
        amount = this.roundMoney(principalPart + financingCharge);
      }

      remaining = this.roundMoney(Math.max(0, remaining - principalPart));
      const dueDate = new Date(input.firstInstallmentDate);
      dueDate.setUTCMonth(dueDate.getUTCMonth() + index);

      rows.push({
        sequence,
        dueDate: dueDate.toISOString(),
        amount,
        principal: principalPart,
        financingCharge,
        remainingPrincipal: remaining,
      });
    }

    return rows;
  }

  private async ensureCustomerAccess(
    customerId: string,
    projectOwnerId: string,
    userId: string,
    userRole: Role,
  ) {
    if (userRole === Role.SUPER_ADMIN && userId !== projectOwnerId) {
      throw new ForbiddenException(
        'SUPER_ADMIN özel CRM müşteri kaydını teklife bağlayamaz.',
      );
    }

    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      select: { id: true, ownerId: true },
    });

    if (!customer || customer.ownerId !== projectOwnerId) {
      throw new ForbiddenException('Bu CRM müşteri kaydı bu projeye bağlanamaz.');
    }
  }

  private ensureProjectAccess(ownerId: string, userId: string, userRole: Role) {
    if (ownerId === userId || userRole === Role.SUPER_ADMIN) return;
    throw new ForbiddenException('Bu proje için teklif oluşturma yetkiniz yok.');
  }

  private firstInstallmentDate(value: unknown) {
    if (value !== undefined && value !== null && value !== '') {
      const parsed = new Date(String(value));
      if (Number.isNaN(parsed.getTime())) {
        throw new BadRequestException('İlk taksit tarihi geçersiz.');
      }
      return parsed;
    }

    const date = new Date();
    date.setUTCHours(0, 0, 0, 0);
    date.setUTCMonth(date.getUTCMonth() + 1);
    return date;
  }

  private installmentCount(value: unknown, financedPrincipal: number) {
    if (value === undefined || value === null || value === '') {
      return financedPrincipal > 0 ? 12 : 0;
    }

    const parsed = Number(value);
    if (
      !Number.isInteger(parsed) ||
      parsed < 0 ||
      parsed > MAX_INSTALLMENT_COUNT
    ) {
      throw new BadRequestException(
        `Taksit sayısı 0 ile ${MAX_INSTALLMENT_COUNT} arasında tam sayı olmalıdır.`,
      );
    }

    return parsed;
  }

  private ratePercent(value: unknown) {
    const parsed = this.nonNegativeNumber(value, 'Yıllık finansman oranı');
    if (parsed > MAX_ANNUAL_RATE_PERCENT) {
      throw new BadRequestException(
        `Yıllık finansman oranı %${MAX_ANNUAL_RATE_PERCENT} değerini aşamaz.`,
      );
    }
    return parsed;
  }

  private createOfferReference(value: Record<string, unknown>) {
    return `EPH-OF-${createHash('sha256')
      .update(JSON.stringify(value))
      .digest('hex')
      .slice(0, 12)
      .toUpperCase()}`;
  }

  private recordValue(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    return value as Record<string, unknown>;
  }

  private positiveNumber(value: unknown, label: string) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      throw new BadRequestException(`${label} sıfırdan büyük olmalıdır.`);
    }
    return this.roundMoney(parsed);
  }

  private nonNegativeNumber(value: unknown, label: string) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) {
      throw new BadRequestException(`${label} sıfır veya sıfırdan büyük olmalıdır.`);
    }
    return this.roundMoney(parsed);
  }

  private optionalText(value: unknown, maxLength: number) {
    if (value === undefined || value === null || value === '') return null;
    const text = String(value).trim();
    if (text.length > maxLength) {
      throw new BadRequestException(`Metin en fazla ${maxLength} karakter olabilir.`);
    }
    return text || null;
  }

  private roundMoney(value: number) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  private roundPercent(value: number) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }
}
