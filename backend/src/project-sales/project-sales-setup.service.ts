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
import { validateProjectDates } from './planningInput';
import { PrismaService } from '../prisma/prisma.service';

type ProjectDraftBody = {
  name?: unknown;
  code?: unknown;
  description?: unknown;
  lifecycleStage?: unknown;
  completionPercent?: unknown;
  defaultDeliveryDate?: unknown;
  plannedStartDate?: unknown;
  permitNumber?: unknown;
  permitAuthority?: unknown;
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
  authorizedContact?: unknown;
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
    const city = this.optionalText(body.city) ?? '';
    const district = this.optionalText(body.district) ?? '';
    const neighborhood = this.optionalText(body.neighborhood) ?? null;
    const address = this.optionalText(body.address) ?? '';
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

    const plannedUnitTypes = Array.isArray(body.plannedUnitTypes) && body.plannedUnitTypes.length
      ? this.parseUnitTypes(body.plannedUnitTypes)
      : [];
    const plannedOtherUnitTypeName = plannedUnitTypes.includes(UnitType.DIGER)
      ? this.parsePlannedOtherUnitTypeName(
          plannedUnitTypes,
          body.plannedOtherUnitTypeName,
        )
      : null;

    const geometryType = this.optionalEnum(
      ProjectGeometryType,
      body.geometryType,
      'Geçersiz proje geometrisi.',
    ) ?? ProjectGeometryType.DIKDORTGEN;

    await this.ensureProjectCodeAvailable(userId, code);

    const create = (client: PrismaService | Prisma.TransactionClient) => client.project.create({
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
        adaNo: this.cadastralNumber(body.adaNo, 6, 'Ada'),
        parselNo: this.cadastralNumber(body.parselNo, 4, 'Parsel'),
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
    if (!this.hasPlanning(body)) return { ...await create(this.prisma), plannedStartDate: null, permitNumber: null, permitAuthority: null };
    const start = this.parsePlanningStart(body.plannedStartDate, lifecycleStage, lifecycleDetails.defaultDeliveryDate);
    return this.prisma.$transaction(async tx => {
      const created = await create(tx);
      const planning = await this.savePlanningStart(tx, created.id, start, body);
      return { ...created, ...planning };
    });
  }

  async listProjectDrafts(userId: string, userRole: Role) {
    const projects = await this.prisma.project.findMany({
      where:
        userRole === Role.SUPER_ADMIN
          ? {}
          : {
              ownerId: userId,
            },
      select: this.projectListSelect(),
      orderBy: [{ isActive: 'desc' }, { updatedAt: 'desc' }],
    });
    return this.attachPlanning(projects);
  }

  async getProjectSetup(projectId: string, userId: string, userRole: Role) {
    const project = await this.prisma.project.findUnique({
      where: {
        id: projectId,
      },
      include: {
        authorizedContact: true,
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
            description: true,
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

    const row = await this.prisma.systemSetting.findUnique({ where: { key: this.planningKey(projectId) } });
    return { ...project, ...this.readPlanning(row?.valueJson) };
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

    if (this.hasOwn(body, 'authorizedContact')) {
      await this.saveAuthorizedContact(projectId, body.authorizedContact);
    }

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
      data.city = this.optionalText(body.city) ?? '';
    }

    if (this.hasOwn(body, 'district')) {
      data.district = this.optionalText(body.district) ?? '';
    }

    if (this.hasOwn(body, 'neighborhood')) {
      data.neighborhood = this.optionalText(body.neighborhood) ?? null;
    }

    if (this.hasOwn(body, 'address')) {
      data.address = this.optionalText(body.address) ?? '';
    }

    if (this.hasOwn(body, 'adaNo')) {
      data.adaNo = this.cadastralNumber(body.adaNo, 6, 'Ada');
    }

    if (this.hasOwn(body, 'parselNo')) {
      data.parselNo = this.cadastralNumber(body.parselNo, 4, 'Parsel');
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

    if (Object.keys(data).length === 0 && !this.hasPlanning(body)) {
      throw new BadRequestException('Güncellenecek proje bilgisi bulunamadı.');
    }

    const update = (client: PrismaService | Prisma.TransactionClient) => client.project.update({
      where: { id: projectId }, data, select: this.projectListSelect(),
    });
    if (!this.hasPlanning(body) && !this.hasOwn(body, 'lifecycleStage') && !this.hasOwn(body, 'defaultDeliveryDate')) return (await this.attachPlanning([await update(this.prisma)]))[0];
    const row = await this.prisma.systemSetting.findUnique({ where: { key: this.planningKey(projectId) } });
    const previous = this.readPlanningStart(row?.valueJson);
    const incoming = this.hasOwn(body, 'plannedStartDate') ? body.plannedStartDate : previous;
    const delivery = this.hasOwn(body, 'defaultDeliveryDate') ? this.optionalDate(body.defaultDeliveryDate, 'Tahmini teslim tarihi') : project.defaultDeliveryDate;
    const start = this.parsePlanningStart(incoming, lifecycleStage, delivery, this.hasOwn(body, 'plannedStartDate') || Boolean(previous));
    return this.prisma.$transaction(async tx => {
      const updated = await update(tx);
      const planning = await this.savePlanningStart(tx, projectId, start, body);
      return { ...updated, ...planning };
    });
  }

  private parseContactPhone(value: unknown, label: string, required: boolean) {
    const text = this.optionalText(value);
    if (!text) {
      if (required) throw new BadRequestException(`${label} zorunludur.`);
      return null;
    }
    const compact = text.replace(/[\s()-]/g, '');
    if (!/^\+?[0-9]{10,15}$/.test(compact)) {
      throw new BadRequestException(`${label} geçerli bir numara olmalıdır.`);
    }
    return compact;
  }

  // Proje yetkilisi: null gönderilirse kayıt silinir.
  private async saveAuthorizedContact(projectId: string, value: unknown) {
    if (value === null) {
      await this.prisma.projectAuthorizedContact.deleteMany({ where: { projectId } });
      return;
    }
    if (typeof value !== 'object' || Array.isArray(value)) {
      throw new BadRequestException('Proje yetkilisi bilgisi geçersiz.');
    }
    const raw = value as Record<string, unknown>;
    const fullName = this.requiredText(raw.fullName, 'Proje yetkilisi ad soyad zorunludur.');
    const phone = this.parseContactPhone(raw.phone, 'Proje yetkilisi telefonu', true) as string;
    const whatsappSameAsPhone = raw.whatsappSameAsPhone === true;
    const whatsapp = whatsappSameAsPhone ? phone : this.parseContactPhone(raw.whatsapp, 'Proje yetkilisi WhatsApp numarası', false);
    const email = this.optionalText(raw.email);
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new BadRequestException('Proje yetkilisi e-posta adresi geçerli değil.');
    }
    const data = { fullName, phone, whatsapp, whatsappSameAsPhone, email: email ?? null };
    await this.prisma.projectAuthorizedContact.upsert({
      where: { projectId },
      create: { projectId, ...data },
      update: data,
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

  protected async attachPlanning<T extends { id: string }>(projects: T[]) {
    const rows = await this.prisma.systemSetting.findMany({ where: { key: { in: projects.map(project => this.planningKey(project.id)) } } });
    return projects.map(project => {
      const row = rows.find(item => item.key === this.planningKey(project.id));
      return { ...project, ...this.readPlanning(row?.valueJson) };
    });
  }

  private planningKey(projectId: string) { return `EPH_PROJECT_PLANNING_${projectId}`; }

  private readPlanningStart(value: Prisma.JsonValue | undefined): string | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    return typeof value.plannedStartDate === 'string' ? value.plannedStartDate : null;
  }

  private parsePlanningStart(value: unknown, stage: ProjectLifecycleStage | null, delivery: Date | null, required = true) {
    if (stage !== ProjectLifecycleStage.PLANNED) return null;
    const start = this.optionalDate(value, 'Proje başlangıç tarihi');
    const normalized = start?.toISOString().slice(0, 7);
    const error = validateProjectDates(stage, delivery?.toISOString() || '', normalized || '', new Date(), required);
    if (error && (required || start)) throw new BadRequestException(error);
    return normalized ? `${normalized}-01` : null;
  }

  private hasPlanning(body: ProjectDraftBody) {
    return ['plannedStartDate','permitNumber','permitAuthority'].some(key=>this.hasOwn(body,key));
  }

  private readPlanning(value: Prisma.JsonValue | undefined) {
    const object = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    return { plannedStartDate: this.readPlanningStart(value), permitNumber: typeof object.permitNumber === 'string' ? object.permitNumber : null, permitAuthority: typeof object.permitAuthority === 'string' ? object.permitAuthority : null };
  }

  private async savePlanningStart(tx: Prisma.TransactionClient, projectId: string, start: string | null, body: ProjectDraftBody) {
    const key = this.planningKey(projectId);
    const row = await tx.systemSetting.findUnique({ where: { key } });
    const previous = this.readPlanning(row?.valueJson);
    const text = (value:unknown,label:string,max:number) => { if(value==null||value==='')return null;if(typeof value!=='string'||value.trim().length>max)throw new BadRequestException(`${label} en fazla ${max} karakter olabilir.`);return value.trim()||null; };
    const valueJson = { plannedStartDate: start, permitNumber: this.hasOwn(body,'permitNumber')?text(body.permitNumber,'Ruhsat numarası',80):previous.permitNumber, permitAuthority: this.hasOwn(body,'permitAuthority')?text(body.permitAuthority,'Ruhsatı veren idare',120):previous.permitAuthority };
    await tx.systemSetting.upsert({ where: { key }, create: { key, valueJson }, update: { valueJson } });
    return valueJson;
  }

  private parseLifecycleDetails(
    lifecycleStage: ProjectLifecycleStage | null,
    completionPercent: unknown,
    defaultDeliveryDate: unknown,
  ) {
    if (!lifecycleStage) {
      throw new BadRequestException('Proje aşaması zorunludur.');
    }

    if (lifecycleStage === ProjectLifecycleStage.READY) return { completionPercent: 100, defaultDeliveryDate: null };

    const deliveryDate = this.optionalDate(
      defaultDeliveryDate,
      'Tahmini teslim tarihi',
    );

    if (deliveryDate) {
      const error = validateProjectDates(lifecycleStage, deliveryDate.toISOString(), '', new Date(), false);
      if (error) throw new BadRequestException(error);
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

  private cadastralNumber(value: unknown, maxLength: number, label: string) {
    const text = this.optionalText(value);
    if (text && !new RegExp(`^\\d{1,${maxLength}}$`).test(text)) {
      throw new BadRequestException(`${label} numarası en fazla ${maxLength} rakam olmalıdır.`);
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


