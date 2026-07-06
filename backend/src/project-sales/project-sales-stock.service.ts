import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role, UnitStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type SalesStockUpdateBody = {
  price?: unknown;
  priceCurrency?: unknown;
  status?: unknown;
};

type SalesStockBulkUpdateBody = {
  updates?: unknown;
};

type PreparedSalesStockUpdate = {
  unitId: string;
  data: {
    price?: number;
    priceCurrency?: string;
    status?: UnitStatus;
    isOffMarket?: boolean;
  };
};

const AVAILABLE_STATUSES = new Set<UnitStatus>([
  UnitStatus.SATILIK,
  UnitStatus.KIRALIK,
  UnitStatus.ON_SATIS,
  UnitStatus.YAKINDA_SATISTA,
  UnitStatus.INSAAT_HALINDE,
  UnitStatus.TESLIME_HAZIR,
  UnitStatus.HEMEN_TESLIM,
  UnitStatus.PROJE_ASAMASI,
  UnitStatus.INSAAT_PROJESI,
  UnitStatus.DEVREN_SATILIK,
  UnitStatus.DEVREN_KIRALIK,
]);

const RESERVED_STATUSES = new Set<UnitStatus>([
  UnitStatus.REZERVE,
  UnitStatus.OPSIYONLU,
]);

const CLOSED_STATUSES = new Set<UnitStatus>([
  UnitStatus.SATILDI,
  UnitStatus.KIRALANDII,
]);

const USER_SELECTABLE_STATUSES = new Set<UnitStatus>([
  UnitStatus.SATILIK,
  UnitStatus.KIRALIK,
  UnitStatus.REZERVE,
  UnitStatus.OPSIYONLU,
  UnitStatus.SATILDI,
  UnitStatus.KIRALANDII,
  UnitStatus.ON_SATIS,
  UnitStatus.YAKINDA_SATISTA,
  UnitStatus.INSAAT_HALINDE,
  UnitStatus.TESLIME_HAZIR,
  UnitStatus.HEMEN_TESLIM,
  UnitStatus.PROJE_ASAMASI,
  UnitStatus.PASIF,
]);

@Injectable()
export class ProjectSalesStockService {
  constructor(private readonly prisma: PrismaService) {}

  async getProjectStock(
    projectId: string,
    userId: string,
    userRole: Role,
  ) {
    const project = await this.prisma.project.findUnique({
      where: {
        id: projectId,
      },
      select: {
        id: true,
        ownerId: true,
        name: true,
        code: true,
        city: true,
        district: true,
        neighborhood: true,
        setupStatus: true,
        wizardStep: true,
        declaredSalesInventoryCount: true,
        updatedAt: true,
      },
    });

    if (!project) {
      throw new NotFoundException('Proje bulunamadı.');
    }

    this.ensureProjectAccess(project.ownerId, userId, userRole);

    const units = await this.prisma.unit.findMany({
      where: {
        projectId,
        isSalesInventory: true,
      },
      select: {
        id: true,
        projectId: true,
        blockId: true,
        floorId: true,
        inventoryCode: true,
        inventorySortOrder: true,
        type: true,
        legalStatus: true,
        commercialPurpose: true,
        floor: true,
        floorLabel: true,
        number: true,
        roomCount: true,
        conceptLabel: true,
        netArea: true,
        grossArea: true,
        facades: true,
        deliveryDate: true,
        price: true,
        priceCurrency: true,
        status: true,
        isOffMarket: true,
        updatedAt: true,
        block: {
          select: {
            id: true,
            code: true,
            name: true,
            sortOrder: true,
          },
        },
        projectFloor: {
          select: {
            id: true,
            level: true,
            label: true,
            sortOrder: true,
          },
        },
      },
      orderBy: [
        {
          inventorySortOrder: 'asc',
        },
        {
          createdAt: 'asc',
        },
      ],
    });

    const summary = {
      total: units.length,
      available: units.filter((unit) => AVAILABLE_STATUSES.has(unit.status))
        .length,
      reserved: units.filter((unit) => RESERVED_STATUSES.has(unit.status))
        .length,
      closed: units.filter((unit) => CLOSED_STATUSES.has(unit.status)).length,
      passive: units.filter((unit) => unit.status === UnitStatus.PASIF).length,
      priced: units.filter((unit) => Number(unit.price) > 0).length,
      totalListValue: units.reduce(
        (total, unit) => total + Number(unit.price || 0),
        0,
      ),
    };

    return {
      project: {
        id: project.id,
        name: project.name,
        code: project.code,
        city: project.city,
        district: project.district,
        neighborhood: project.neighborhood,
        setupStatus: project.setupStatus,
        wizardStep: project.wizardStep,
        declaredSalesInventoryCount: project.declaredSalesInventoryCount,
        updatedAt: project.updatedAt,
      },
      summary,
      units,
    };
  }

  async updateUnitStock(
    unitId: string,
    userId: string,
    userRole: Role,
    body: SalesStockUpdateBody,
  ) {
    const unit = await this.prisma.unit.findUnique({
      where: {
        id: unitId,
      },
      select: {
        id: true,
        projectId: true,
        isSalesInventory: true,
        project: {
          select: {
            ownerId: true,
          },
        },
      },
    });

    if (!unit) {
      throw new NotFoundException('Bağımsız bölüm bulunamadı.');
    }

    this.ensureProjectAccess(unit.project.ownerId, userId, userRole);

    if (!unit.isSalesInventory) {
      throw new BadRequestException(
        'Bu bağımsız bölüm satış veya kiralama stokunda değildir.',
      );
    }

    const data = this.prepareUpdateData(body);

    await this.prisma.unit.update({
      where: {
        id: unitId,
      },
      data,
    });

    return this.getProjectStock(unit.projectId, userId, userRole);
  }

  async updateProjectStockBulk(
    projectId: string,
    userId: string,
    userRole: Role,
    body: SalesStockBulkUpdateBody,
  ) {
    const project = await this.prisma.project.findUnique({
      where: {
        id: projectId,
      },
      select: {
        id: true,
        ownerId: true,
      },
    });

    if (!project) {
      throw new NotFoundException('Proje bulunamadı.');
    }

    this.ensureProjectAccess(project.ownerId, userId, userRole);

    if (!Array.isArray(body.updates)) {
      throw new BadRequestException(
        'Toplu güncelleme için updates listesi zorunludur.',
      );
    }

    if (body.updates.length === 0) {
      throw new BadRequestException(
        'Toplu güncelleme listesi boş olamaz.',
      );
    }

    if (body.updates.length > 1000) {
      throw new BadRequestException(
        'Tek işlemde en fazla 1.000 bağımsız bölüm güncellenebilir.',
      );
    }

    const preparedUpdates = body.updates.map((rawUpdate, index) => {
      if (!rawUpdate || typeof rawUpdate !== 'object') {
        throw new BadRequestException(
          `${index + 1}. toplu güncelleme satırı geçersiz.`,
        );
      }

      const update = rawUpdate as Record<string, unknown>;
      const unitId = String(update.unitId || '').trim();

      if (!unitId) {
        throw new BadRequestException(
          `${index + 1}. toplu güncelleme satırında unitId zorunludur.`,
        );
      }

      return {
        unitId,
        data: this.prepareUpdateData(update),
      } satisfies PreparedSalesStockUpdate;
    });

    const uniqueUnitIds = new Set(
      preparedUpdates.map((update) => update.unitId),
    );

    if (uniqueUnitIds.size !== preparedUpdates.length) {
      throw new BadRequestException(
        'Aynı bağımsız bölüm toplu güncelleme listesinde birden fazla kez bulunamaz.',
      );
    }

    const authorizedUnits = await this.prisma.unit.findMany({
      where: {
        id: {
          in: Array.from(uniqueUnitIds),
        },
        projectId,
        isSalesInventory: true,
      },
      select: {
        id: true,
      },
    });

    if (authorizedUnits.length !== preparedUpdates.length) {
      throw new BadRequestException(
        'Bir veya daha fazla bağımsız bölüm bu projeye ait değil ya da satış stokunda bulunmuyor.',
      );
    }

    await this.prisma.$transaction(
      preparedUpdates.map((update) =>
        this.prisma.unit.update({
          where: {
            id: update.unitId,
          },
          data: update.data,
        }),
      ),
    );

    return this.getProjectStock(projectId, userId, userRole);
  }

  private prepareUpdateData(body: SalesStockUpdateBody) {
    const data: PreparedSalesStockUpdate['data'] = {};

    if (body.price !== undefined) {
      data.price = this.nonNegativePrice(body.price);
    }

    if (body.priceCurrency !== undefined) {
      const currency = String(body.priceCurrency || '')
        .trim()
        .toLocaleUpperCase('tr-TR');

      if (currency !== 'TRY') {
        throw new BadRequestException(
          'Faz 1 satış stok ekranında yalnız TRY para birimi kullanılabilir.',
        );
      }

      data.priceCurrency = currency;
    }

    if (body.status !== undefined) {
      const status = String(body.status || '')
        .trim()
        .toLocaleUpperCase('tr-TR') as UnitStatus;

      if (!USER_SELECTABLE_STATUSES.has(status)) {
        throw new BadRequestException('Geçersiz satış stoku durumu.');
      }

      data.status = status;
      data.isOffMarket = status === UnitStatus.PASIF;
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException(
        'Güncellenecek fiyat veya durum bilgisi bulunamadı.',
      );
    }

    return data;
  }

  private ensureProjectAccess(
    ownerId: string,
    userId: string,
    userRole: Role,
  ) {
    if (ownerId === userId || userRole === Role.SUPER_ADMIN) {
      return;
    }

    throw new ForbiddenException(
      'Bu projenin satış stokunu görüntüleme veya güncelleme yetkiniz yok.',
    );
  }

  private nonNegativePrice(value: unknown) {
    const normalized =
      typeof value === 'string'
        ? value.trim().replace(/\./g, '').replace(',', '.')
        : value;
    const parsed = Number(normalized);

    if (!Number.isFinite(parsed) || parsed < 0) {
      throw new BadRequestException(
        'Fiyat sıfır veya sıfırdan büyük bir sayı olmalıdır.',
      );
    }

    return parsed;
  }
}
