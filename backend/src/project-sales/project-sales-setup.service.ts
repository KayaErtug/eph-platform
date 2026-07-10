import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  ProjectGeometryType,
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
    const name = this.requiredText(body.name, 'Proje adÄ± zorunludur.');
    const city = this.requiredText(body.city, 'Ä°l zorunludur.');
    const district = this.requiredText(body.district, 'Ä°lÃ§e zorunludur.');
    const neighborhood = this.requiredText(
      body.neighborhood,
      'Mahalle zorunludur.',
    );
    const address = this.requiredText(body.address, 'AÃ§Ä±k adres zorunludur.');
    const code = body.code
      ? this.normalizeProjectCode(body.code)
      : await this.generateUniqueProjectCode(userId, name);
    const declaredIndependentUnitCount = this.optionalNonNegativeInteger(
      body.declaredIndependentUnitCount,
      'Toplam baÄŸÄ±msÄ±z bÃ¶lÃ¼m sayÄ±sÄ±',
    );
    const declaredSalesInventoryCount = this.optionalNonNegativeInteger(
      body.declaredSalesInventoryCount,
      'SatÄ±ÅŸ veya kiralama stoku sayÄ±sÄ±',
    );

    this.validateDeclaredCounts(
      declaredIndependentUnitCount,
      declaredSalesInventoryCount,
    );

    const geometryType = this.optionalEnum(
      ProjectGeometryType,
      body.geometryType,
      'GeÃ§ersiz proje geometrisi.',
    ) ?? ProjectGeometryType.DIKDORTGEN;

    await this.ensureProjectCodeAvailable(userId, code);

    return this.prisma.project.create({
      data: {
        name,
        code,
        description: this.optionalText(body.description),
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
        plannedUnitTypes: this.parseUnitTypes(body.plannedUnitTypes),
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
      throw new NotFoundException('Proje bulunamadÄ±.');
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
      throw new NotFoundException('Proje bulunamadÄ±.');
    }

    this.ensureProjectAccess(project.ownerId, userId, userRole);

    const data: Prisma.ProjectUpdateInput = {};

    if (this.hasOwn(body, 'name')) {
      data.name = this.requiredText(body.name, 'Proje adÄ± zorunludur.');
    }

    if (this.hasOwn(body, 'code')) {
      const code = this.normalizeProjectCode(body.code);
      await this.ensureProjectCodeAvailable(project.ownerId, code, project.id);
      data.code = code;
    }

    if (this.hasOwn(body, 'description')) {
      data.description = this.optionalText(body.description);
    }

    if (this.hasOwn(body, 'city')) {
      data.city = this.requiredText(body.city, 'Ä°l zorunludur.');
    }

    if (this.hasOwn(body, 'district')) {
      data.district = this.requiredText(body.district, 'Ä°lÃ§e zorunludur.');
    }

    if (this.hasOwn(body, 'neighborhood')) {
      data.neighborhood = this.requiredText(
        body.neighborhood,
        'Mahalle zorunludur.',
      );
    }

    if (this.hasOwn(body, 'address')) {
      data.address = this.requiredText(body.address, 'AÃ§Ä±k adres zorunludur.');
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
          'Toplam baÄŸÄ±msÄ±z bÃ¶lÃ¼m sayÄ±sÄ±',
        )
      : project.declaredIndependentUnitCount;
    const declaredSalesInventoryCount = this.hasOwn(
      body,
      'declaredSalesInventoryCount',
    )
      ? this.optionalNonNegativeInteger(
          body.declaredSalesInventoryCount,
          'SatÄ±ÅŸ veya kiralama stoku sayÄ±sÄ±',
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

    if (this.hasOwn(body, 'plannedUnitTypes')) {
      data.plannedUnitTypes = this.parseUnitTypes(body.plannedUnitTypes);
    }

    if (this.hasOwn(body, 'geometryType')) {
      const geometryType = this.requiredEnum(
        ProjectGeometryType,
        body.geometryType,
        'GeÃ§ersiz proje geometrisi.',
      );

      data.geometryType = geometryType;
      data.needsSoftwareTeamReview = COMPLEX_GEOMETRIES.has(geometryType);
    }

    if (this.hasOwn(body, 'wizardStep')) {
      data.wizardStep = this.requiredEnum(
        ProjectWizardStep,
        body.wizardStep,
        'GeÃ§ersiz proje sihirbazÄ± adÄ±mÄ±.',
      );
    }

    if (this.hasOwn(body, 'setupStatus')) {
      const setupStatus = this.requiredEnum(
        ProjectSetupStatus,
        body.setupStatus,
        'GeÃ§ersiz proje kurulum durumu.',
      );

      if (!USER_EDITABLE_SETUP_STATUSES.has(setupStatus)) {
        throw new BadRequestException(
          'Bu proje kurulum durumu doÄŸrudan deÄŸiÅŸtirilemez.',
        );
      }

      data.setupStatus = setupStatus;
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('GÃ¼ncellenecek proje bilgisi bulunamadÄ±.');
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
      throw new NotFoundException('Proje bulunamadÄ±.');
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
      message: 'Proje ve projeye baÄŸlÄ± tÃ¼m kayÄ±tlar silindi.',
    };
  }

  private projectListSelect(): Prisma.ProjectSelect {
    return {
      id: true,
      name: true,
      code: true,
      description: true,
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

    throw new ForbiddenException('Bu projeye eriÅŸim yetkiniz yok.');
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
        'Bu proje kodu daha Ã¶nce kullanÄ±lmÄ±ÅŸ. FarklÄ± bir proje kodu girin.',
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

    throw new BadRequestException('Proje kodu Ã¼retilemedi. Tekrar deneyin.');
  }

  private normalizeProjectCode(value: unknown) {
    const normalized = this.requiredText(
      value,
      'Proje kodu boÅŸ bÄ±rakÄ±lamaz.',
    )
      .toLocaleUpperCase('tr-TR')
      .replace(/Ã‡/g, 'C')
      .replace(/Ä/g, 'G')
      .replace(/Ä°/g, 'I')
      .replace(/Ã–/g, 'O')
      .replace(/Å/g, 'S')
      .replace(/Ãœ/g, 'U')
      .replace(/[^A-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    if (!normalized) {
      throw new BadRequestException('GeÃ§erli bir proje kodu girin.');
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
        'SatÄ±ÅŸ veya kiralama stoku sayÄ±sÄ± toplam baÄŸÄ±msÄ±z bÃ¶lÃ¼m sayÄ±sÄ±ndan bÃ¼yÃ¼k olamaz.',
      );
    }
  }

  private parseUnitTypes(value: unknown): UnitType[] {
    if (!Array.isArray(value)) {
      throw new BadRequestException(
        'Planlanan baÄŸÄ±msÄ±z bÃ¶lÃ¼m tipleri liste biÃ§iminde olmalÄ±dÄ±r.',
      );
    }

    const allowed = new Set(Object.values(UnitType));
    const result = Array.from(
      new Set(
        value.map((item) =>
          this.requiredText(item, 'BaÄŸÄ±msÄ±z bÃ¶lÃ¼m tipi boÅŸ olamaz.')
            .trim()
            .toUpperCase(),
        ),
      ),
    );

    if (result.length === 0) {
      throw new BadRequestException(
        'En az bir planlanan baÄŸÄ±msÄ±z bÃ¶lÃ¼m tipi seÃ§ilmelidir.',
      );
    }

    if (result.length > 30) {
      throw new BadRequestException(
        'En fazla 30 planlanan baÄŸÄ±msÄ±z bÃ¶lÃ¼m tipi seÃ§ilebilir.',
      );
    }

    for (const item of result) {
      if (!allowed.has(item as UnitType)) {
        throw new BadRequestException(
          `GeÃ§ersiz baÄŸÄ±msÄ±z bÃ¶lÃ¼m tipi: ${item}`,
        );
      }
    }

    return result as UnitType[];
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
      throw new BadRequestException(`${label} deÄŸeri geÃ§ersiz.`);
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
        `${label} sÄ±fÄ±r veya sÄ±fÄ±rdan bÃ¼yÃ¼k tam sayÄ± olmalÄ±dÄ±r.`,
      );
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


