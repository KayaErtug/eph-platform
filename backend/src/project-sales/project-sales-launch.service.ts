import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Optional,
  NotFoundException,
} from '@nestjs/common';
import {
  KontorHareketTuru,
  KontorIslemTuru,
  PortfolioApprovalStatus,
  ProjectSetupStatus,
  Role,
  UnitStatus,
} from '@prisma/client';
import { createHmac, randomUUID, timingSafeEqual } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { resolveOfficeWallet } from '../office/office-wallet.rules';
import { readCost } from '../pricing/commercial-costs';
import { PoolAudienceService, type AudienceInput } from '../pool-audience/pool-audience.service';

const PLATFORM_URL =
  process.env.FRONTEND_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.APP_URL ||
  'https://emlakportfoyhavuzu.com';

const PRESENTATION_TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 14;

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

@Injectable()
export class ProjectSalesLaunchService {
  constructor(private readonly prisma: PrismaService, private readonly audience: PoolAudienceService,
    @Optional() private readonly notifications?: NotificationsService) {}

  async getLaunchCenter(projectId: string, userId: string, userRole: Role) {
    const project = await this.getAuthorizedProject(projectId, userId, userRole);
    const stats = this.getProjectStats(project);
    const renderBrief = this.buildRenderBrief(project, stats);
    const presentation = this.buildPresentationPreview(project, stats);
    const publishReadiness = this.buildPublishReadiness(project, stats);

    return {
      project: this.serializeProject(project),
      renderBrief,
      presentation,
      publishReadiness,
    };
  }

  async createPresentationShareLink(
    projectId: string,
    userId: string,
    userRole: Role,
  ) {
    const launch = await this.getLaunchCenter(projectId, userId, userRole);

    if (launch.project.setupStatus !== ProjectSetupStatus.TAMAMLANDI) {
      throw new BadRequestException(
        'Müşteri sunum linki için proje kurulumu tamamlanmalıdır.',
      );
    }

    const expiresAt = Date.now() + PRESENTATION_TOKEN_TTL_MS;
    const nonce = randomUUID().replace(/-/g, '');
    const payload = `${projectId}.${expiresAt}.${nonce}`;
    const signature = this.signPayload(payload);
    const token = Buffer.from(`${payload}.${signature}`).toString('base64url');

    return {
      token,
      expiresAt: new Date(expiresAt).toISOString(),
      url: `${PLATFORM_URL}/proje-sunum/${token}`,
      presentation: launch.presentation,
      publishReadiness: launch.publishReadiness,
    };
  }

  async getPresentationByToken(token: string) {
    const projectId = this.verifyPresentationToken(token);
    const project = await this.getProject(projectId);
    project.units = await this.audience.filterPublicUnits(project.units);
    if (!project.units.length) throw new NotFoundException('Bu proje genel sunuma açık değil.');
    const stats = this.getProjectStats(project);
    const publishReadiness = this.buildPublishReadiness(project, stats);

    if (project.setupStatus !== ProjectSetupStatus.TAMAMLANDI) {
      throw new NotFoundException('Proje sunumu yayında değil.');
    }

    return {
      project: this.serializeProject(project),
      presentation: this.buildPresentationPreview(project, stats),
      publishReadiness,
    };
  }

  async createRenderWorkOrder(
    projectId: string,
    userId: string,
    userRole: Role,
  ) {
    const launch = await this.getLaunchCenter(projectId, userId, userRole);
    const workOrderId = `RND-${randomUUID().slice(0, 8).toUpperCase()}`;

    return {
      id: workOrderId,
      status: 'BRIEF_READY',
      createdAt: new Date().toISOString(),
      project: launch.project,
      scenes: launch.renderBrief.renderScenes.map((scene, index) => ({
        ...scene,
        outputName: `${workOrderId}-${index + 1}-${scene.key}.png`,
        aspectRatio: scene.key === 'sales_cover' ? '16:9' : '4:3',
        quality: 'sales_presentation',
      })),
      negativePrompt: launch.renderBrief.negativePrompt,
      nextAction:
        'Bu brief gerçek görsel üretim sağlayıcısına bağlandığında render kuyruğuna gönderilecek.',
    };
  }

  async publishToPool(
    projectId: string,
    userId: string,
    userRole: Role,
    poolAudience?: AudienceInput,
    payment: { walletSource?: string; walletOfficeId?: string; expectedCostPk?: number } = {},
  ) {
    const project = await this.getAuthorizedProject(projectId, userId, userRole);
    const stats = this.getProjectStats(project);
    const publishReadiness = this.buildPublishReadiness(project, stats);

    if (!publishReadiness.ready) {
      throw new BadRequestException(
        { message: 'Proje havuza yayınlanmadan önce eksikler tamamlanmalıdır.', issues: publishReadiness.issues },
      );
    }

    const publishedAt = new Date();
    let billing = { costPk: 0, spent: 0, previousBalance: 0, remainingBalance: 0 };
    const result = await this.prisma.$transaction(async tx => {
      // Tek seferlik proje havuz ücreti: proje havuzda kaldığı sürece ve sonradan eklenen bölümler için tekrar alınmaz.
      const alreadyInPool = (await tx.unit.count({
        where: { projectId: project.id, isSalesInventory: true, isPoolVisible: true, approvalStatus: PortfolioApprovalStatus.HAVUZDA },
      })) > 0;
      const projectCostPk = alreadyInPool || userRole === Role.SUPER_ADMIN ? 0 : await readCost(tx, 'COST_PROJE_HAVUZ');
      if (payment.expectedCostPk !== undefined && payment.expectedCostPk !== projectCostPk) {
        throw new BadRequestException('Güncel proje havuz ücretini kontrol edip tekrar onaylayın.');
      }
      if (projectCostPk > 0) {
        const selected = await resolveOfficeWallet(tx, userId, { walletSource: payment.walletSource, walletOfficeId: payment.walletOfficeId }, true);
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`wallet:${selected.chargeUserId}`}))`;
        await tx.$queryRaw`SELECT "id" FROM "KontorCuzdani" WHERE "kullaniciId" = ${selected.chargeUserId} FOR UPDATE`;
        const wallet = await tx.kontorCuzdani.findUnique({ where: { kullaniciId: selected.chargeUserId } });
        if (!wallet?.aktifMi || wallet.bakiye < projectCostPk) throw new BadRequestException('Krediniz bu işlem için yeterli değil.');
        const debit = await tx.kontorCuzdani.updateMany({
          where: { kullaniciId: selected.chargeUserId, aktifMi: true, bakiye: { gte: projectCostPk } },
          data: { bakiye: { decrement: projectCostPk }, toplamHarcama: { increment: projectCostPk } },
        });
        if (debit.count !== 1) throw new BadRequestException('PK kesintisi doğrulanamadı. Yayınlama geri alındı.');
        await tx.kontorHareketi.create({
          data: {
            kullaniciId: selected.chargeUserId,
            hareketTuru: KontorHareketTuru.HARCAMA,
            islemTuru: KontorIslemTuru.HAVUZ_PORTFOY_YAYIN,
            miktar: projectCostPk,
            oncekiBakiye: wallet.bakiye,
            sonrakiBakiye: wallet.bakiye - projectCostPk,
            aciklama: `Proje EPH Havuzuna gönderildi (${project.name}). ${projectCostPk} PK harcandı.`,
            ilgiliKayitTuru: 'PROJECT',
            ilgiliKayitId: project.id,
            olusturanId: userId,
          },
        });
        billing = { costPk: projectCostPk, spent: projectCostPk, previousBalance: wallet.bakiye, remainingBalance: wallet.bakiye - projectCostPk };
      }
      if (poolAudience) await this.audience.setProjectAudience(projectId, { id: userId, role: userRole }, poolAudience, tx);
      const published = await tx.unit.updateMany({
      where: {
        projectId: project.id,
        isSalesInventory: true,
        status: { in: [...AVAILABLE_STATUSES] },
      },
      data: {
        approvalStatus: PortfolioApprovalStatus.HAVUZDA,
        isPoolVisible: true,
        isOffMarket: false,
        poolPublishedAt: publishedAt,
        poolRemovedAt: null,
      },
    });
      if (!alreadyInPool && published.count > 0) await this.notifications?.notify(project.ownerId, {
        type: 'PROJECT_POOL_ACCEPTED', priority: 'ONEMLI', title: 'Projeniz havuza kabul edildi',
        body: 'Projenizin bağımsız bölümleri EPH Havuzunda yayınlandı.', actionUrl: `/project-sales/${project.id}`,
        eventKey: `project-pool:${project.id}:${publishedAt.toISOString()}`,
      }, tx);
      return published;
    });

    const nextProject = await this.getProject(project.id);
    const nextStats = this.getProjectStats(nextProject);

    return {
      success: true,
      publishedAt: publishedAt.toISOString(),
      publishedUnitCount: result.count,
      billing,
      project: this.serializeProject(nextProject),
      publishReadiness: this.buildPublishReadiness(nextProject, nextStats),
    };
  }

  async withdrawFromPool(projectId: string, userId: string, userRole: Role) {
    const project = await this.getAuthorizedProject(projectId, userId, userRole);
    const removedAt = new Date();
    const result = await this.prisma.unit.updateMany({
      where: { projectId: project.id, isSalesInventory: true, isPoolVisible: true },
      data: { isPoolVisible: false, isOffMarket: false, poolRemovedAt: removedAt, approvalStatus: PortfolioApprovalStatus.ONAYLANDI },
    });
    return { success: true, withdrawnUnitCount: result.count, removedAt: removedAt.toISOString() };
  }

  private async getAuthorizedProject(
    projectId: string,
    userId: string,
    userRole: Role,
  ) {
    const project = await this.getProject(projectId);

    this.ensureProjectAccess(project.ownerId, userId, userRole);

    return project;
  }

  private async getProject(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
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
          where: { isActive: true },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
          include: {
            floors: {
              orderBy: [{ sortOrder: 'asc' }, { level: 'asc' }],
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
          where: { isSalesInventory: true },
          orderBy: [{ inventorySortOrder: 'asc' }, { createdAt: 'asc' }],
          select: {
            id: true,
            type: true,
            status: true,
            price: true,
            priceCurrency: true,
            roomCount: true,
            floor: true,
            floorLabel: true,
            number: true,
            netArea: true,
            grossArea: true,
            facades: true,
            conceptLabel: true,
            block: {
              select: {
                code: true,
                name: true,
                sortOrder: true,
              },
            },
            images: {
              orderBy: [
                { isCover: 'desc' },
                { sortOrder: 'asc' },
                { createdAt: 'asc' },
              ],
              select: {
                id: true,
                url: true,
                supabaseUrl: true,
                isCover: true,
              },
            },
            mediaPackage: {
              select: {
                id: true,
                name: true,
                code: true,
                assets: {
                  orderBy: [
                    { isCover: 'desc' },
                    { sortOrder: 'asc' },
                    { createdAt: 'asc' },
                  ],
                  take: 1,
                  select: {
                    url: true,
                    supabaseUrl: true,
                    isCover: true,
                  },
                },
              },
            },
          },
        },
        spaces: {
          where: { isActive: true, isCustomerVisible: true },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
          select: {
            id: true,
            name: true,
            spaceType: true,
            customTypeName: true,
            grossArea: true,
            description: true,
          },
        },
        mediaPackages: {
          where: { isActive: true },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
          select: {
            id: true,
            name: true,
            code: true,
            type: true,
            _count: {
              select: {
                assets: true,
                units: true,
              },
            },
            assets: {
              orderBy: [
                { isCover: 'desc' },
                { sortOrder: 'asc' },
                { createdAt: 'asc' },
              ],
              take: 1,
              select: {
                url: true,
                supabaseUrl: true,
                isCover: true,
              },
            },
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Proje bulunamadı.');
    }

    return project;
  }

  private getProjectStats(project: Awaited<ReturnType<ProjectSalesLaunchService['getAuthorizedProject']>>) {
    const units = project.units;
    const pricedUnits = units.filter((unit) => Number(unit.price || 0) > 0);
    const imageCount = project.mediaPackages.reduce(
      (total, mediaPackage) => total + mediaPackage._count.assets,
      units.reduce((total,unit)=>total+(unit.images?.length||0),0),
    );
    const totalListValue = units.reduce(
      (total, unit) => total + Number(unit.price || 0),
      0,
    );
    const floors = project.blocks.flatMap((block) => block.floors);
    const maxFloor = floors.reduce(
      (max, floor) => Math.max(max, Number(floor.level || 0)),
      0,
    );
    const unitTypes = Array.from(
      new Set(units.map((unit) => this.unitTypeLabel(String(unit.type)))),
    );
    const roomCounts = Array.from(
      new Set(units.map((unit) => unit.roomCount).filter(Boolean)),
    ) as string[];

    return {
      totalUnits: units.length,
      pricedUnits: pricedUnits.length,
      availableUnits: units.filter((unit) => AVAILABLE_STATUSES.has(unit.status)).length,
      reservedUnits: units.filter((unit) => RESERVED_STATUSES.has(unit.status)).length,
      closedUnits: units.filter((unit) => CLOSED_STATUSES.has(unit.status)).length,
      passiveUnits: units.filter((unit) => unit.status === UnitStatus.PASIF).length,
      imageCount,
      packageCount: project.mediaPackages.length,
      totalListValue,
      maxFloor,
      unitTypes,
      roomCounts,
    };
  }

  private buildRenderBrief(
    project: Awaited<ReturnType<ProjectSalesLaunchService['getAuthorizedProject']>>,
    stats: ReturnType<ProjectSalesLaunchService['getProjectStats']>,
  ) {
    const hasCommercialGround = project.units.some((unit) =>
      String(unit.type).includes('DUKKAN') || String(unit.type).includes('OFIS'),
    );
    const blockNames = project.blocks.map((block) => block.name || `${block.code} Blok`);
    const visibleSpaces = project.spaces
      .slice(0, 6)
      .map((space) => space.customTypeName || this.spaceTypeLabel(String(space.spaceType)));
    const architecturalStyle =
      stats.maxFloor >= 12
        ? 'premium rezidans / yüksek katlı şehir projesi'
        : stats.totalUnits >= 80
          ? 'modern site yerleşimi'
          : hasCommercialGround
            ? 'zemin ticari alanlı modern apartman'
            : 'butik aile konutu';

    return {
      architecturalStyle,
      projectCharacter: [
        `${project.city} / ${project.district} lokasyonunda ${project.blocks.length} bloklu proje`,
        `${stats.totalUnits} satış/kiralama bağımsız bölümü`,
        stats.maxFloor > 0 ? `en yüksek blok ${stats.maxFloor} kat` : null,
        hasCommercialGround ? 'zemin katta ticari kullanım vurgusu' : null,
      ].filter(Boolean),
      renderScenes: [
        {
          key: 'front_facade',
          title: 'Ön Cephe Ana Render',
          prompt: this.joinPrompt([
            `${project.name} adlı ${architecturalStyle}`,
            `${project.city} ${project.district} çevresinde konumlanan gerçekçi mimari dış cephe`,
            `${project.blocks.length} blok, ${stats.maxFloor || 'çok'} kat, ${stats.unitTypes.join(', ') || 'konut'} tipleri`,
            hasCommercialGround ? 'zemin katta mağaza/dükkan cepheleri' : 'konut girişi ve balkon düzeni',
            'gündüz ışığı, temiz peyzaj, profesyonel gayrimenkul satış render kalitesi',
          ]),
        },
        {
          key: 'aerial_site',
          title: 'Kuşbakışı Vaziyet Render',
          prompt: this.joinPrompt([
            `${project.name} proje vaziyet planı`,
            blockNames.length ? `bloklar: ${blockNames.join(', ')}` : null,
            visibleSpaces.length ? `sosyal alanlar: ${visibleSpaces.join(', ')}` : null,
            'yollar, peyzaj, otopark ve yaya aksları okunabilir kuşbakışı kompozisyon',
          ]),
        },
        {
          key: 'sales_cover',
          title: 'Satış Sunumu Kapak Görseli',
          prompt: this.joinPrompt([
            `${project.name} için premium emlak satış kapağı`,
            `${project.city} / ${project.district} lokasyon hissi`,
            'modern mimari, ferah peyzaj, güven veren kurumsal sunum dili',
          ]),
        },
      ],
      negativePrompt:
        'bulanık, karanlık, bozuk perspektif, okunmayan bina, kalabalık tabela, düşük kalite, gerçek dışı ölçek',
      sourceData: {
        blocks: blockNames,
        unitTypes: stats.unitTypes,
        roomCounts: stats.roomCounts,
        customerVisibleSpaces: visibleSpaces,
      },
    };
  }

  private buildPresentationPreview(
    project: Awaited<ReturnType<ProjectSalesLaunchService['getAuthorizedProject']>>,
    stats: ReturnType<ProjectSalesLaunchService['getProjectStats']>,
  ) {
    const coverPackage =
      project.mediaPackages.find((item) => item._count.assets > 0) || null;
    const coverAsset = coverPackage?.assets[0] || null;
    const firstUnitWithImage = project.units.find(
      (u: any) =>
        (u.images && u.images.length > 0) ||
        (u.mediaPackage?.assets && u.mediaPackage.assets.length > 0),
    );
    const fallbackCoverUrl =
      (firstUnitWithImage as any)?.images?.[0]?.supabaseUrl ||
      (firstUnitWithImage as any)?.images?.[0]?.url ||
      (firstUnitWithImage as any)?.mediaPackage?.assets?.[0]?.supabaseUrl ||
      (firstUnitWithImage as any)?.mediaPackage?.assets?.[0]?.url ||
      null;

    const highlightedUnits = project.units
      .filter((unit) => AVAILABLE_STATUSES.has(unit.status))
      .slice(0, 8)
      .map((unit) => ({
        id: unit.id,
        title: [unit.block?.code, unit.number || unit.floorLabel]
          .filter(Boolean)
          .join(' / '),
        type: this.unitTypeLabel(String(unit.type)),
        roomCount: unit.roomCount,
        netArea: unit.netArea,
        grossArea: unit.grossArea,
        price: unit.price,
        priceCurrency: unit.priceCurrency,
        status: unit.status,
        coverUrl:
          (unit as any).images?.[0]?.supabaseUrl ||
          (unit as any).images?.[0]?.url ||
          unit.mediaPackage?.assets[0]?.supabaseUrl ||
          unit.mediaPackage?.assets[0]?.url ||
          null,
      }));

    return {
      title: project.name,
      subtitle: [project.city, project.district, project.neighborhood]
        .filter(Boolean)
        .join(' / '),
      coverUrl: coverAsset?.supabaseUrl || coverAsset?.url || fallbackCoverUrl,
      metrics: {
        totalUnits: stats.totalUnits,
        availableUnits: stats.availableUnits,
        reservedUnits: stats.reservedUnits,
        closedUnits: stats.closedUnits,
        imageCount: stats.imageCount,
      },
      highlights: [
        `${project.blocks.length} bloklu proje`,
        `${stats.totalUnits} bağımsız bölüm`,
        stats.unitTypes.length ? stats.unitTypes.join(', ') : null,
        project.spaces.length ? `${project.spaces.length} sosyal/proje alanı` : null,
      ].filter(Boolean),
      highlightedUnits,
    };
  }

  private buildPublishReadiness(
    project: Awaited<ReturnType<ProjectSalesLaunchService['getAuthorizedProject']>>,
    stats: ReturnType<ProjectSalesLaunchService['getProjectStats']>,
  ) {
    const checks = [
      {
        key: 'project_completed',
        label: 'Proje kurulumu tamamlandı',
        passed: project.setupStatus === ProjectSetupStatus.TAMAMLANDI,
      },
      {
        key: 'sales_stock_exists',
        label: 'Satış stoku oluşturuldu',
        passed: stats.totalUnits > 0,
      },
      {
        key: 'prices_entered',
        label: 'Satış stokunda fiyatlar girildi',
        passed: stats.totalUnits > 0 && stats.pricedUnits === stats.totalUnits,
        detail: `${stats.pricedUnits}/${stats.totalUnits} fiyatlı`,
      },
      {
        key: 'media_uploaded',
        label: 'Görsel paketleri yüklendi',
        passed: stats.totalUnits > 0 && project.units.every(unit => unit.images?.length || unit.mediaPackage?.assets?.length),
        detail: `${stats.imageCount} görsel`,
      },
      {
        key: 'active_stock_available',
        label: 'Yayınlanabilir aktif stok var',
        passed: stats.availableUnits > 0,
        detail: `${stats.availableUnits} aktif`,
      },
    ];

    return {
      ready: checks.every((check) => check.passed),
      checks,
      issues: [
        ...checks.filter(check => !check.passed).map(check => ({ code: check.key, message: check.label + ('detail' in check && check.detail ? ': ' + check.detail : '') })),
        ...project.units.flatMap(unit => {
          const label = [unit.block?.code, unit.floorLabel || unit.floor, unit.number || unit.id].filter(value => value !== null && value !== undefined && value !== '').join(' / ');
          return [
            ...(Number(unit.price || 0) <= 0 ? [{ code: 'price_' + unit.id, message: label + ': fiyat girilmedi.' }] : []),
            ...(!unit.images?.length && !unit.mediaPackage?.assets?.length ? [{ code: 'media_' + unit.id, message: label + ': bölüm fotoğrafı veya bağlı görsel paketi eksik.' }] : []),
          ];
        }),
      ],
      nextAction: checks.every((check) => check.passed)
        ? 'HAVUZ_YAYININA_HAZIR'
        : 'EKSIKLERI_TAMAMLA',
      warning:
        'Yayın gerçekleşene kadar proje satış verileri portföy ve havuz ekranlarında gizli tutulur.',
    };
  }

  private serializeProject(
    project: Awaited<ReturnType<ProjectSalesLaunchService['getAuthorizedProject']>>,
  ) {
    return {
      id: project.id,
      name: project.name,
      code: project.code,
      city: project.city,
      district: project.district,
      neighborhood: project.neighborhood,
      setupStatus: project.setupStatus,
      updatedAt: project.updatedAt,
    };
  }

  private ensureProjectAccess(ownerId: string, userId: string, userRole: Role) {
    if (userRole === Role.SUPER_ADMIN || ownerId === userId) return;

    throw new ForbiddenException('Bu proje için işlem yetkiniz yok.');
  }

  private joinPrompt(parts: Array<string | null | undefined>) {
    return parts.filter(Boolean).join(', ');
  }

  private signPayload(payload: string) {
    return createHmac('sha256', this.presentationSecret())
      .update(payload)
      .digest('base64url');
  }

  private verifyPresentationToken(token: string) {
    let decoded = '';

    try {
      decoded = Buffer.from(token, 'base64url').toString('utf8');
    } catch {
      throw new NotFoundException('Sunum bağlantısı geçersiz.');
    }

    const parts = decoded.split('.');

    if (parts.length !== 4) {
      throw new NotFoundException('Sunum bağlantısı geçersiz.');
    }

    const [projectId, expiresAtText, nonce, signature] = parts;
    const expiresAt = Number(expiresAtText);
    const payload = `${projectId}.${expiresAtText}.${nonce}`;
    const expected = this.signPayload(payload);

    if (
      !projectId ||
      !Number.isFinite(expiresAt) ||
      expiresAt < Date.now() ||
      !this.safeEqual(signature, expected)
    ) {
      throw new NotFoundException('Sunum bağlantısı süresi dolmuş veya geçersiz.');
    }

    return projectId;
  }

  private safeEqual(left: string, right: string) {
    const leftBuffer = Buffer.from(left);
    const rightBuffer = Buffer.from(right);

    return (
      leftBuffer.length === rightBuffer.length &&
      timingSafeEqual(leftBuffer, rightBuffer)
    );
  }

  private presentationSecret() {
    return (
      process.env.PROJECT_PRESENTATION_SECRET ||
      process.env.JWT_SECRET ||
      'eph-project-presentation-development-secret'
    );
  }

  private unitTypeLabel(type: string) {
    const labels: Record<string, string> = {
      DAIRE: 'Daire',
      VILLA: 'Villa',
      REZIDANS: 'Rezidans',
      DUKKAN_MAGAZA: 'Dükkan',
      OFIS_BURO: 'Ofis',
      HOME_OFFICE: 'Home Office',
    };

    return labels[type] || type.replace(/_/g, ' ');
  }

  private spaceTypeLabel(type: string) {
    const labels: Record<string, string> = {
      HAVUZ: 'Havuz',
      OTOPARK: 'Otopark',
      COCUK_PARKI: 'Çocuk parkı',
      BAHCE: 'Bahçe',
      SOSYAL_TESIS: 'Sosyal tesis',
      SPOR_ALANI: 'Spor alanı',
      GUVENLIK: 'Güvenlik',
    };

    return labels[type] || type.replace(/_/g, ' ');
  }
}
