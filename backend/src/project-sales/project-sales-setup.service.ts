import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  ProjectGeometryType,
  ProjectLifecycleStage,
  ProjectSetupStatus,
  ProjectWizardStep,
  Role,
  UnitType,
} from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

type ProjectDraftBody = {
  name?: unknown;
  code?: unknown;
  description?: unknown;
  lifecycleStage?: unknown;
  completionPercent?: unknown;
  defaultDeliveryDate?: unknown;
  city?: unknown;
  district?: unknown;
  neighborhood?: unknown;
  address?: unknown;
  adaNo?: unknown;
  parselNo?: unknown;
  latitude?: unknown;
  longitude?: unknown;
  mapAddress?: unknown;
  placeId?: unknown;
  declaredIndependentUnitCount?: unknown;
  declaredSalesInventoryCount?: unknown;
  plannedUnitTypes?: unknown;
  plannedOtherUnitTypeName?: unknown;
  geometryType?: unknown;
  wizardStep?: unknown;
  setupStatus?: unknown;
};

const COMPLEX_GEOMETRIES = new Set<ProjectGeometryType>([
  ProjectGeometryType.BESGEN,
  ProjectGeometryType.ALTIGEN,
  ProjectGeometryType.YILDIZ,
  ProjectGeometryType.DAIRESEL,
  ProjectGeometryType.KIRIK_CEPHELI,
  ProjectGeometryType.COK_KANATLI,
  ProjectGeometryType.BAGLANTILI_KULELER,
  ProjectGeometryType.OZEL_KARMASIK,
]);

const USER_EDITABLE_SETUP_STATUSES = new Set<ProjectSetupStatus>([
  ProjectSetupStatus.TASLAK,
  ProjectSetupStatus.YAPI_OLUSTURULUYOR,
  ProjectSetupStatus.BILGI_GIRISI_EKSIK,
  ProjectSetupStatus.KONTROLE_HAZIR,
]);

@Injectable()
export class ProjectSalesSetupService {
  constructor(private readonly prisma: PrismaService) {}

  async createProjectDraft(userId: string, body: ProjectDraftBody) {
    const name = this.requiredText(body.name, 'Proje adı zorunludur.');
    const city = this.requiredText(body.city, 'İl zorunludur.');
    const district = this.requiredText(body.district, 'İlçe zorunludur.');
    const neighborhood = this.requiredText(
      body.neighborhood,
      'Mahalle zorunludur.',
    );
    const address = this.requiredText(body.address, 'Açık adres zorunludur.');
    const code = body.code
      ? this.normalizeProjectCode(body.code)
      : await this.generateUniqueProjectCode(userId, name);
    const declaredIndependentUnitCount = this.optionalNonNegativeInteger(
      body.declaredIndependentUnitCount,
      'Toplam bağımsız bölüm sayısı',
    );
    const declaredSalesInventoryCount = this.optionalNonNegativeInteger(
      body.declaredSalesInventoryCount,
      'Satış veya kiralama stoku sayısı',
    );

    this.validateDeclaredCounts(
      declaredIndependentUnitCount,
      declaredSalesInventoryCount,
    );

    const lifecycleStage = this.requiredEnum(
      ProjectLifecycleStage,
      body.lifecycleStage,
      'Proje aşaması zorunludur.',
    );
    const lifecycleDetails = this.parseLifecycleDetails(
      lifecycleStage,
      body.completionPercent,
      body.defaultDeliveryDate,
    );

    const plannedUnitTypes = this.parseUnitTypes(
      body.plannedUnitTypes,
    );
    const plannedOtherUnitTypeName =
      this.parsePlannedOtherUnitTypeName(
        plannedUnitTypes,
        body.plannedOtherUnitTypeName,
      );

    const geometryType = this.optionalEnum(
      ProjectGeometryType,
      body.geometryType,
      'Geçersiz proje geometrisi.',
    ) ?? ProjectGeometryType.DIKDORTGEN;

    await this.ensureProjectCodeAvailable(userId, code);

    return this.prisma.project.create({
      data: {
        name,
        code,
        description: this.optionalText(body.description),
        lifecycleStage,
        completionPercent: lifecycleDetails.completionPercent,
        defaultDeliveryDate: lifecycleDetails.defaultDeliveryDate,
        city,
        district,
        neighborhood,
        address,
        adaNo: this.optionalText(body.adaNo),
        parselNo: this.optionalText(body.parselNo),
        latitude: this.optionalCoordinate(body.latitude, 'Enlem', -90, 90),
        longitude: this.optionalCoordinate(
          body.longitude,
          'Boylam',
          -180,
          180,
        ),
        mapAddress: this.optionalText(body.mapAddress),
        placeId: this.optionalText(body.placeId),
        declaredIndependentUnitCount,
        declaredSalesInventoryCount,
        plannedUnitTypes,
        plannedOtherUnitTypeName,
        geometryType,
        needsSoftwareTeamReview: COMPLEX_GEOMETRIES.has(geometryType),
        wizardStep: ProjectWizardStep.PROJE_BILGILERI,
        setupStatus: ProjectSetupStatus.TASLAK,
        owner: {
          connect: {
            id: userId,
          },
        },
      },
      select: this.projectListSelect(),
    });
  }

  async listProjectDrafts(userId: string, userRole: Role) {
    return this.prisma.project.findMany({
      where:
        userRole === Role.SUPER_ADMIN
          ? {}
          : {
              ownerId: userId,
            },
      select: this.projectListSelect(),
      orderBy: [{ isActive: 'desc' }, { updatedAt: 'desc' }],
    });
  }

  async getProjectSetup(projectId: string, userId: string, userRole: Role) {
    const project = await this.prisma.project.findUnique({
      where: {
        id: projectId,
      },
      include: {
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
        blocks: {
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
          include: {
            floors: {
              orderBy: [{ sortOrder: 'asc' }, { level: 'asc' }],
              include: {
                _count: {
                  select: {
                    units: true,
                    spaces: true,
                  },
                },
              },
            },
            _count: {
              select: {
                units: true,
                spaces: true,
              },
            },
          },
        },
        units: {
          orderBy: [{ inventorySortOrder: 'asc' }, { createdAt: 'asc' }],
          select: {
            id: true,
            blockId: true,
            floorId: true,
            inventoryCode: true,
            inventorySortOrder: true,
            type: true,
            floor: true,
            floorLabel: true,
            number: true,
            roomCount: true,
            netArea: true,
            grossArea: true,
            facades: true,
            conceptLabel: true,
            legalStatus: true,
            commercialPurpose: true,
            isSalesInventory: true,
          },
        },
        spaces: {
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        },
        designReviewRequests: {
          orderBy: {
            requestedAt: 'desc',
          },
          include: {
            requestedBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                role: true,
              },
            },
            reviewedBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                role: true,
              },
            },
          },
        },
        _count: {
          select: {
            blocks: true,
            units: true,
            spaces: true,
            designReviewRequests: true,
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Proje bulunamadı.');
    }

    this.ensureProjectAccess(project.ownerId, userId, userRole);

    return project;
  }

  async updateProjectDraft(
    projectId: string,
    userId: string,
    userRole: Role,
    body: ProjectDraftBody,
  ) {
    const project = await this.prisma.project.findUnique({
      where: {
        id: projectId,
      },
    });

    if (!project) {
      throw new NotFoundException('Proje bulunamadı.');
    }

    this.ensureProjectAccess(project.ownerId, userId, userRole);

    const data: Prisma.ProjectUpdateInput = {};

    if (this.hasOwn(body, 'name')) {
      data.name = this.requiredText(body.name, 'Proje adı zorunludur.');
    }

    if (this.hasOwn(body, 'code')) {
      const code = this.normalizeProjectCode(body.code);
      await this.ensureProjectCodeAvailable(project.ownerId, code, project.id);
      data.code = code;
    }

    if (this.hasOwn(body, 'description')) {
      data.description = this.optionalText(body.description);
    }

    let lifecycleStage = project.lifecycleStage;

    if (this.hasOwn(body, 'lifecycleStage')) {
      lifecycleStage = this.requiredEnum(
        ProjectLifecycleStage,
        body.lifecycleStage,
        'Geçersiz proje aşaması.',
      );
      data.lifecycleStage = lifecycleStage;
    }

    if (
      this.hasOwn(body, 'lifecycleStage') ||
      this.hasOwn(body, 'completionPercent') ||
      this.hasOwn(body, 'defaultDeliveryDate')
    ) {
      const lifecycleDetails = this.parseLifecycleDetails(
        lifecycleStage,
        this.hasOwn(body, 'completionPercent')
          ? body.completionPercent
          : project.completionPercent,
        this.hasOwn(body, 'defaultDeliveryDate')
          ? body.defaultDeliveryDate
          : project.defaultDeliveryDate,
      );

      data.completionPercent = lifecycleDetails.completionPercent;
      data.defaultDeliveryDate = lifecycleDetails.defaultDeliveryDate;
    }

    if (this.hasOwn(body, 'city')) {
      data.city = this.requiredText(body.city, 'İl zorunludur.');
    }

    if (this.hasOwn(body, 'district')) {
      data.district = this.requiredText(body.district, 'İlçe zorunludur.');
    }

    if (this.hasOwn(body, 'neighborhood')) {
      data.neighborhood = this.requiredText(
        body.neighborhood,
        'Mahalle zorunludur.',
      );
    }

    if (this.hasOwn(body, 'address')) {
      data.address = this.requiredText(body.address, 'Açık adres zorunludur.');
    }

    if (this.hasOwn(body, 'adaNo')) {
      data.adaNo = this.optionalText(body.adaNo);
    }

    if (this.hasOwn(body, 'parselNo')) {
      data.parselNo = this.optionalText(body.parselNo);
    }

    if (this.hasOwn(body, 'latitude')) {
      data.latitude = this.optionalCoordinate(body.latitude, 'Enlem', -90, 90);
    }

    if (this.hasOwn(body, 'longitude')) {
      data.longitude = this.optionalCoordinate(
        body.longitude,
        'Boylam',
        -180,
        180,
      );
    }

    if (this.hasOwn(body, 'mapAddress')) {
      data.mapAddress = this.optionalText(body.mapAddress);
    }

    if (this.hasOwn(body, 'placeId')) {
      data.placeId = this.optionalText(body.placeId);
    }

    const declaredIndependentUnitCount = this.hasOwn(
      body,
      'declaredIndependentUnitCount',
    )
      ? this.optionalNonNegativeInteger(
          body.declaredIndependentUnitCount,
          'Toplam bağımsız bölüm sayısı',
        )
      : project.declaredIndependentUnitCount;
    const declaredSalesInventoryCount = this.hasOwn(
      body,
      'declaredSalesInventoryCount',
    )
      ? this.optionalNonNegativeInteger(
          body.declaredSalesInventoryCount,
          'Satış veya kiralama stoku sayısı',
        )
      : project.declaredSalesInventoryCount;

    this.validateDeclaredCounts(
      declaredIndependentUnitCount,
      declaredSalesInventoryCount,
    );

    if (this.hasOwn(body, 'declaredIndependentUnitCount')) {
      data.declaredIndependentUnitCount = declaredIndependentUnitCount;
    }

    if (this.hasOwn(body, 'declaredSalesInventoryCount')) {
      data.declaredSalesInventoryCount = declaredSalesInventoryCount;
    }

    if (
      this.hasOwn(body, 'plannedUnitTypes') ||
      this.hasOwn(body, 'plannedOtherUnitTypeName')
    ) {
      const plannedUnitTypes = this.hasOwn(body, 'plannedUnitTypes')
        ? this.parseUnitTypes(body.plannedUnitTypes)
        : project.plannedUnitTypes;

      const plannedOtherUnitTypeName =
        this.parsePlannedOtherUnitTypeName(
          plannedUnitTypes,
          this.hasOwn(body, 'plannedOtherUnitTypeName')
            ? body.plannedOtherUnitTypeName
            : project.plannedOtherUnitTypeName,
        );

      if (this.hasOwn(body, 'plannedUnitTypes')) {
        data.plannedUnitTypes = plannedUnitTypes;
      }

      data.plannedOtherUnitTypeName =
        plannedOtherUnitTypeName;
    }

    if (this.hasOwn(body, 'geometryType')) {
      const geometryType = this.requiredEnum(
        ProjectGeometryType,
        body.geometryType,
        'Geçersiz proje geometrisi.',
      );

      data.geometryType = geometryType;
      data.needsSoftwareTeamReview = COMPLEX_GEOMETRIES.has(geometryType);
    }

    if (this.hasOwn(body, 'wizardStep')) {
      data.wizardStep = this.requiredEnum(
        ProjectWizardStep,
        body.wizardStep,
        'Geçersiz proje sihirbazı adımı.',
      );
    }

    if (this.hasOwn(body, 'setupStatus')) {
      const setupStatus = this.requiredEnum(
        ProjectSetupStatus,
        body.setupStatus,
        'Geçersiz proje kurulum durumu.',
      );

      if (!USER_EDITABLE_SETUP_STATUSES.has(setupStatus)) {
        throw new BadRequestException(
          'Bu proje kurulum durumu doğrudan değiştirilemez.',
        );
      }

      data.setupStatus = setupStatus;
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('Güncellenecek proje bilgisi bulunamadı.');
    }

    return this.prisma.project.update({
      where: {
        id: projectId,
      },
      data,
      select: this.projectListSelect(),
    });
  }

  async deleteProjectDraft(
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
      },
    });

    if (!project) {
      throw new NotFoundException('Proje bulunamadı.');
    }

    this.ensureProjectAccess(project.ownerId, userId, userRole);

    await this.prisma.project.delete({
      where: {
        id: projectId,
      },
    });

    return {
      success: true,
      projectId: project.id,
      projectName: project.name,
      message: 'Proje ve projeye bağlı tüm kayıtlar silindi.',
    };
  }

  private projectListSelect(): Prisma.ProjectSelect {
    return {
      id: true,
      name: true,
      code: true,
      description: true,
      lifecycleStage: true,
      city: true,
      district: true,
      neighborhood: true,
      address: true,
      adaNo: true,
      parselNo: true,
      latitude: true,
      longitude: true,
      mapAddress: true,
      placeId: true,
      declaredIndependentUnitCount: true,
      declaredSalesInventoryCount: true,
      plannedUnitTypes: true,
      plannedOtherUnitTypeName: true,
      geometryType: true,
      wizardStep: true,
      setupStatus: true,
      needsSoftwareTeamReview: true,
      completionPercent: true,
      defaultDeliveryDate: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          blocks: true,
          units: true,
          spaces: true,
          designReviewRequests: true,
        },
      },
    };
  }

  private ensureProjectAccess(
    ownerId: string,
    userId: string,
    userRole: Role,
  ) {
    if (ownerId === userId || userRole === Role.SUPER_ADMIN) {
      return;
    }

    throw new ForbiddenException('Bu projeye erişim yetkiniz yok.');
  }

  private async ensureProjectCodeAvailable(
    ownerId: string,
    code: string,
    ignoredProjectId?: string,
  ) {
    const existing = await this.prisma.project.findFirst({
      where: {
        ownerId,
        code,
        id: ignoredProjectId
          ? {
              not: ignoredProjectId,
            }
          : undefined,
      },
      select: {
        id: true,
      },
    });

    if (existing) {
      throw new BadRequestException(
        'Bu proje kodu daha önce kullanılmış. Farklı bir proje kodu girin.',
      );
    }
  }

  private async generateUniqueProjectCode(userId: string, name: string) {
    const nameCode = this.normalizeProjectCode(name).slice(0, 24) || 'PROJE';

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const suffix = randomUUID().replaceAll('-', '').slice(0, 6).toUpperCase();
      const code = `${nameCode}-${suffix}`;
      const exists = await this.prisma.project.findFirst({
        where: {
          ownerId: userId,
          code,
        },
        select: {
          id: true,
        },
      });

      if (!exists) {
        return code;
      }
    }

    throw new BadRequestException('Proje kodu üretilemedi. Tekrar deneyin.');
  }

  private normalizeProjectCode(value: unknown) {
    const normalized = this.requiredText(
      value,
      'Proje kodu boş bırakılamaz.',
    )
      .toLocaleUpperCase('tr-TR')
      .replace(/Ç/g, 'C')
      .replace(/Ğ/g, 'G')
      .replace(/İ/g, 'I')
      .replace(/Ö/g, 'O')
      .replace(/Ş/g, 'S')
      .replace(/Ü/g, 'U')
      .replace(/[^A-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    if (!normalized) {
      throw new BadRequestException('Geçerli bir proje kodu girin.');
    }

    return normalized.slice(0, 40);
  }

  private validateDeclaredCounts(
    independentUnitCount: number | null,
    salesInventoryCount: number | null,
  ) {
    if (
      independentUnitCount !== null &&
      salesInventoryCount !== null &&
      salesInventoryCount > independentUnitCount
    ) {
      throw new BadRequestException(
        'Satış veya kiralama stoku sayısı toplam bağımsız bölüm sayısından büyük olamaz.',
      );
    }
  }

  private parseUnitTypes(value: unknown): UnitType[] {
    if (!Array.isArray(value)) {
      throw new BadRequestException(
        'Planlanan bağımsız bölüm tipleri liste biçiminde olmalıdır.',
      );
    }

    const allowed = new Set(Object.values(UnitType));
    const result = Array.from(
      new Set(
        value.map((item) =>
          this.requiredText(item, 'Bağımsız bölüm tipi boş olamaz.')
            .trim()
            .toUpperCase(),
        ),
      ),
    );

    if (result.length === 0) {
      throw new BadRequestException(
        'En az bir planlanan bağımsız bölüm tipi seçilmelidir.',
      );
    }

    if (result.length > 30) {
      throw new BadRequestException(
        'En fazla 30 planlanan bağımsız bölüm tipi seçilebilir.',
      );
    }

    for (const item of result) {
      if (!allowed.has(item as UnitType)) {
        throw new BadRequestException(
          `Geçersiz bağımsız bölüm tipi: ${item}`,
        );
      }
    }

    return result as UnitType[];
  }

  private parsePlannedOtherUnitTypeName(
    plannedUnitTypes: UnitType[],
    value: unknown,
  ) {
    if (!plannedUnitTypes.includes(UnitType.DIGER)) {
      return null;
    }

    const name = this.requiredText(
      value,
      'Diğer bağımsız bölüm türünün adı zorunludur.',
    );

    if (name.length < 2 || name.length > 80) {
      throw new BadRequestException(
        'Diğer bağımsız bölüm türünün adı 2 ile 80 karakter arasında olmalıdır.',
      );
    }

    return name;
  }

  private optionalCoordinate(
    value: unknown,
    label: string,
    minimum: number,
    maximum: number,
  ) {
    if (value === undefined || value === null || value === '') {
      return null;
    }

    const parsed = Number(value);

    if (!Number.isFinite(parsed) || parsed < minimum || parsed > maximum) {
      throw new BadRequestException(`${label} değeri geçersiz.`);
    }

    return parsed;
  }

  private optionalNonNegativeInteger(value: unknown, label: string) {
    if (value === undefined || value === null || value === '') {
      return null;
    }

    const parsed = Number(value);

    if (!Number.isInteger(parsed) || parsed < 0) {
      throw new BadRequestException(
        `${label} sıfır veya sıfırdan büyük tam sayı olmalıdır.`,
      );
    }

    return parsed;
  }

  private parseLifecycleDetails(
    lifecycleStage: ProjectLifecycleStage | null,
    completionPercent: unknown,
    defaultDeliveryDate: unknown,
  ) {
    if (!lifecycleStage) {
      throw new BadRequestException('Proje aşaması zorunludur.');
    }

    const deliveryDate = this.optionalDate(
      defaultDeliveryDate,
      'Tahmini teslim tarihi',
    );

    if (lifecycleStage === ProjectLifecycleStage.READY) {
      return {
        completionPercent: 100,
        defaultDeliveryDate: deliveryDate,
      };
    }

    if (lifecycleStage === ProjectLifecycleStage.PLANNED) {
      return {
        completionPercent: 0,
        defaultDeliveryDate: deliveryDate,
      };
    }

    const parsedCompletion = this.optionalNonNegativeInteger(
      completionPercent,
      'Proje tamamlanma oranı',
    );

    if (
      parsedCompletion === null ||
      parsedCompletion <= 0 ||
      parsedCompletion >= 100
    ) {
      throw new BadRequestException(
        'Devam eden projelerde tamamlanma oranı 1 ile 99 arasında olmalıdır.',
      );
    }

    if (!deliveryDate) {
      throw new BadRequestException(
        'Devam eden projelerde tahmini teslim tarihi zorunludur.',
      );
    }

    return {
      completionPercent: parsedCompletion,
      defaultDeliveryDate: deliveryDate,
    };
  }

  private optionalDate(value: unknown, label: string) {
    if (value === undefined || value === null || value === '') {
      return null;
    }

    if (value instanceof Date) {
      if (Number.isNaN(value.getTime())) {
        throw new BadRequestException(`${label} geçersiz.`);
      }

      return value;
    }

    const text = String(value).trim();
    const parsed = new Date(
      /^\d{4}-\d{2}-\d{2}$/.test(text)
        ? `${text}T00:00:00.000Z`
        : text,
    );

    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException(`${label} geçersiz.`);
    }

    return parsed;
  }

  private requiredEnum<T extends Record<string, string>>(
    enumObject: T,
    value: unknown,
    message: string,
  ): T[keyof T] {
    const parsed = this.optionalEnum(enumObject, value, message);

    if (!parsed) {
      throw new BadRequestException(message);
    }

    return parsed;
  }

  private optionalEnum<T extends Record<string, string>>(
    enumObject: T,
    value: unknown,
    message: string,
  ): T[keyof T] | null {
    if (value === undefined || value === null || value === '') {
      return null;
    }

    const normalized = String(value).trim().toUpperCase();
    const matched = Object.values(enumObject).find(
      (item) => item.toUpperCase() === normalized,
    );

    if (!matched) {
      throw new BadRequestException(message);
    }

    return matched as T[keyof T];
  }

  private requiredText(value: unknown, message: string) {
    const text = this.optionalText(value);

    if (!text) {
      throw new BadRequestException(message);
    }

    return text;
  }

  private optionalText(value: unknown) {
    if (value === undefined || value === null) {
      return null;
    }

    const text = String(value).trim();
    return text || null;
  }

  private hasOwn(object: object, key: string) {
    return Object.prototype.hasOwnProperty.call(object, key);
  }
}


