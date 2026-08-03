import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  PortfolioApprovalStatus,
  ProjectSetupStatus,
  Role,
  UnitStatus,
  UyelikDurumu,
} from '@prisma/client';
import { randomUUID } from 'crypto';

import { PrismaService } from '../prisma/prisma.service';

type CurrentUser = {
  id: string;
  role?: Role | string;
};

type ProjectPresentationLinkRow = {
  id: string;
  token: string;
  projectId: string;
  sharedById: string;
  durationHours: number;
  expiresAt: Date;
  revokedAt: Date | null;
  viewCount: number;
  whatsappClickCount: number;
  lastViewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

const PLATFORM_URL =
  process.env.FRONTEND_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.APP_URL ||
  'https://emlakportfoyhavuzu.com';

const ALLOWED_DURATIONS = new Set([24, 72, 168, 336]);

const AVAILABLE_STATUSES = new Set<string>([
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

const RESERVED_STATUSES = new Set<string>([
  UnitStatus.REZERVE,
  UnitStatus.OPSIYONLU,
]);

const CLOSED_STATUSES = new Set<string>([
  UnitStatus.SATILDI,
  UnitStatus.KIRALANDII,
]);

@Injectable()
export class PoolProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async listProjects(user: CurrentUser) {
    const [projects, customers] = await Promise.all([
      this.findProjects(),
      this.findCustomers(user.id),
    ]);

    return projects
      .map((project) => this.serializeProject(project, customers, false))
      .sort((first, second) => {
        const firstDate = new Date(first.publishedAt || first.updatedAt).getTime();
        const secondDate = new Date(second.publishedAt || second.updatedAt).getTime();
        return secondDate - firstDate;
      });
  }

  async getProjectDetail(projectId: string, user: CurrentUser) {
    const [project, customers] = await Promise.all([
      this.findProject(projectId),
      this.findCustomers(user.id),
    ]);

    return this.serializeProject(project, customers, true);
  }

  async listPresentations(projectId: string, user: CurrentUser) {
    await this.ensureProjectVisible(projectId);

    const rows = await this.prisma.$queryRaw<ProjectPresentationLinkRow[]>`
      SELECT *
      FROM "EphProjectPresentationLink"
      WHERE "projectId" = ${projectId}
        AND "sharedById" = ${user.id}
      ORDER BY "createdAt" DESC
      LIMIT 20
    `;

    return rows.map((row) => this.serializeLink(row));
  }

  async createPresentation(
    projectId: string,
    user: CurrentUser,
    durationInput?: unknown,
  ) {
    await this.ensurePresentationMembership(user);
    await this.ensureProjectVisible(projectId);

    const durationHours = this.normalizeDuration(durationInput);
    const expiresAt = new Date(Date.now() + durationHours * 60 * 60 * 1000);

    const row = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        SELECT pg_advisory_xact_lock(
          hashtext(${`pool-project-presentation:${projectId}:${user.id}`})
        )
      `;

      const active = await tx.$queryRaw<ProjectPresentationLinkRow[]>`
        SELECT *
        FROM "EphProjectPresentationLink"
        WHERE "projectId" = ${projectId}
          AND "sharedById" = ${user.id}
          AND "revokedAt" IS NULL
          AND "expiresAt" > NOW()
        ORDER BY "createdAt" DESC
        LIMIT 1
      `;

      if (active[0]) {
        const updated = await tx.$queryRaw<ProjectPresentationLinkRow[]>`
          UPDATE "EphProjectPresentationLink"
          SET "durationHours" = ${durationHours},
              "expiresAt" = ${expiresAt},
              "updatedAt" = NOW()
          WHERE "id" = ${active[0].id}
          RETURNING *
        `;
        return updated[0];
      }

      const created = await tx.$queryRaw<ProjectPresentationLinkRow[]>`
        INSERT INTO "EphProjectPresentationLink" (
          "id", "token", "projectId", "sharedById", "durationHours",
          "expiresAt", "createdAt", "updatedAt"
        ) VALUES (
          ${randomUUID()}, ${randomUUID()}, ${projectId}, ${user.id},
          ${durationHours}, ${expiresAt}, NOW(), NOW()
        )
        RETURNING *
      `;

      return created[0];
    });

    return this.serializeLink(row);
  }

  async renewPresentation(
    id: string,
    user: CurrentUser,
    durationInput?: unknown,
  ) {
    const durationHours = this.normalizeDuration(durationInput);
    const expiresAt = new Date(Date.now() + durationHours * 60 * 60 * 1000);

    const rows = await this.prisma.$queryRaw<ProjectPresentationLinkRow[]>`
      UPDATE "EphProjectPresentationLink"
      SET "durationHours" = ${durationHours},
          "expiresAt" = ${expiresAt},
          "revokedAt" = NULL,
          "updatedAt" = NOW()
      WHERE "id" = ${id}
        AND "sharedById" = ${user.id}
      RETURNING *
    `;

    if (!rows[0]) {
      throw new NotFoundException('Proje sunum bağlantısı bulunamadı.');
    }

    return this.serializeLink(rows[0]);
  }

  async revokePresentation(id: string, user: CurrentUser) {
    const rows = await this.prisma.$queryRaw<ProjectPresentationLinkRow[]>`
      UPDATE "EphProjectPresentationLink"
      SET "revokedAt" = NOW(), "updatedAt" = NOW()
      WHERE "id" = ${id}
        AND "sharedById" = ${user.id}
      RETURNING *
    `;

    if (!rows[0]) {
      throw new NotFoundException('Proje sunum bağlantısı bulunamadı.');
    }

    return this.serializeLink(rows[0]);
  }

  async getPublicPresentation(token: string) {
    const rows = await this.prisma.$queryRaw<ProjectPresentationLinkRow[]>`
      SELECT *
      FROM "EphProjectPresentationLink"
      WHERE "token" = ${token}
      LIMIT 1
    `;
    const link = rows[0];

    if (!link || link.revokedAt || new Date(link.expiresAt).getTime() <= Date.now()) {
      throw new NotFoundException('Sunum bağlantısı süresi dolmuş veya iptal edilmiş.');
    }

    const [project, sharer] = await Promise.all([
      this.findProject(link.projectId),
      this.prisma.user.findUnique({
        where: { id: link.sharedById },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          profileImageUrl: true,
          memberCode: true,
          isVerified: true,
          role: true,
          office: { select: { name: true } },
        },
      }),
      this.prisma.$executeRaw`
        UPDATE "EphProjectPresentationLink"
        SET "viewCount" = "viewCount" + 1,
            "lastViewedAt" = NOW(),
            "updatedAt" = NOW()
        WHERE "id" = ${link.id}
      `,
    ]);

    const serialized = this.serializeProject(project, [], true, true);

    return {
      link: {
        expiresAt: link.expiresAt,
        viewCount: link.viewCount + 1,
      },
      project: serialized,
      presentation: {
        title: serialized.name,
        subtitle: serialized.locationLabel,
        coverUrl: serialized.coverUrl,
        metrics: serialized.metrics,
        typeBreakdown: serialized.typeBreakdown,
        roomCounts: serialized.roomCounts,
        priceRange: serialized.priceRange,
        spaces: serialized.spaces,
        blocks: serialized.blocks,
        availableUnits: serialized.units.filter(
          (unit: any) => unit.availabilityGroup === 'AVAILABLE',
        ),
      },
      sharer: sharer
        ? {
            id: sharer.id,
            name: `${sharer.firstName} ${sharer.lastName}`.trim(),
            phone: sharer.phone,
            profileImageUrl: sharer.profileImageUrl,
            memberCode: sharer.memberCode,
            isVerified: sharer.isVerified,
            role: sharer.role,
            officeName: sharer.office?.name || null,
          }
        : null,
    };
  }

  async trackWhatsappClick(token: string) {
    const rows = await this.prisma.$queryRaw<ProjectPresentationLinkRow[]>`
      UPDATE "EphProjectPresentationLink"
      SET "whatsappClickCount" = "whatsappClickCount" + 1,
          "updatedAt" = NOW()
      WHERE "token" = ${token}
        AND "revokedAt" IS NULL
        AND "expiresAt" > NOW()
      RETURNING *
    `;

    if (!rows[0]) {
      throw new NotFoundException('Sunum bağlantısı geçerli değil.');
    }

    return { success: true };
  }

  private async findProjects() {
    return this.prisma.project.findMany({
      where: {
        isActive: true,
        code: { not: null },
        setupStatus: ProjectSetupStatus.TAMAMLANDI,
        owner: {
          role: { in: [Role.MUTEAHHIT, Role.INSAAT_FIRMASI] },
        },
        units: {
          some: {
            isSalesInventory: true,
            isPoolVisible: true,
            approvalStatus: PortfolioApprovalStatus.HAVUZDA,
          },
        },
      },
      include: this.projectInclude(),
    });
  }

  private async findProject(projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        isActive: true,
        code: { not: null },
        setupStatus: ProjectSetupStatus.TAMAMLANDI,
        owner: {
          role: { in: [Role.MUTEAHHIT, Role.INSAAT_FIRMASI] },
        },
        units: {
          some: {
            isSalesInventory: true,
            isPoolVisible: true,
            approvalStatus: PortfolioApprovalStatus.HAVUZDA,
          },
        },
      },
      include: this.projectInclude(),
    });

    if (!project) {
      throw new NotFoundException('Havuz projesi bulunamadı.');
    }

    return project;
  }

  private projectInclude() {
    return {
      owner: {
        select: { id: true, role: true },
      },
      blocks: {
        where: { isActive: true },
        orderBy: [{ sortOrder: 'asc' as const }, { createdAt: 'asc' as const }],
        select: {
          id: true,
          code: true,
          name: true,
          sortOrder: true,
          floors: {
            where: { isActive: true },
            orderBy: [{ sortOrder: 'asc' as const }, { level: 'asc' as const }],
            select: { id: true, level: true, label: true },
          },
        },
      },
      spaces: {
        where: { isActive: true, isCustomerVisible: true },
        orderBy: [{ sortOrder: 'asc' as const }, { createdAt: 'asc' as const }],
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
        orderBy: [{ sortOrder: 'asc' as const }, { createdAt: 'asc' as const }],
        select: {
          id: true,
          name: true,
          type: true,
          assets: {
            orderBy: [
              { isCover: 'desc' as const },
              { sortOrder: 'asc' as const },
              { createdAt: 'asc' as const },
            ],
            take: 8,
            select: { url: true, supabaseUrl: true, isCover: true },
          },
        },
      },
      units: {
        where: {
          isSalesInventory: true,
          isPoolVisible: true,
          approvalStatus: PortfolioApprovalStatus.HAVUZDA,
          status: { not: UnitStatus.PASIF },
        },
        orderBy: [
          { inventorySortOrder: 'asc' as const },
          { createdAt: 'asc' as const },
        ],
        select: {
          id: true,
          type: true,
          status: true,
          price: true,
          priceCurrency: true,
          roomCount: true,
          floor: true,
          floorLabel: true,
          totalFloors: true,
          number: true,
          area: true,
          netArea: true,
          grossArea: true,
          facades: true,
          features: true,
          conceptLabel: true,
          description: true,
          poolPublishedAt: true,
          block: { select: { id: true, code: true, name: true, sortOrder: true } },
          projectFloor: { select: { id: true, level: true, label: true } },
          images: {
            orderBy: [
              { isCover: 'desc' as const },
              { sortOrder: 'asc' as const },
              { createdAt: 'asc' as const },
            ],
            take: 4,
            select: { url: true, supabaseUrl: true, isCover: true },
          },
          mediaPackage: {
            select: {
              assets: {
                orderBy: [
                  { isCover: 'desc' as const },
                  { sortOrder: 'asc' as const },
                  { createdAt: 'asc' as const },
                ],
                take: 2,
                select: { url: true, supabaseUrl: true, isCover: true },
              },
            },
          },
        },
      },
    };
  }

  private async findCustomers(userId: string) {
    return this.prisma.customer.findMany({
      where: { ownerId: userId },
      include: { interests: { where: { isActive: true } } },
      orderBy: { updatedAt: 'desc' },
    });
  }

  private serializeProject(
    project: any,
    customers: any[],
    includeUnits: boolean,
    publicMode = false,
  ) {
    const units = Array.isArray(project.units) ? project.units : [];
    const pricedUnits = units.filter((unit: any) => Number(unit.price || 0) > 0);
    const currency =
      pricedUnits.find((unit: any) => unit.priceCurrency)?.priceCurrency || 'TRY';
    const prices = pricedUnits.map((unit: any) => Number(unit.price));
    const matches = publicMode
      ? []
      : units.map((unit: any) => ({
          unitId: unit.id,
          ...this.calculateUnitMatch(unit, project, customers),
        }));
    const matchingUnits = matches.filter((match: any) => match.score > 0);
    const matchedCustomerIds = new Set(
      matchingUnits.map((match: any) => match.customerId).filter(Boolean),
    );
    const customerSummary = new Map<string, any>();

    for (const match of matchingUnits) {
      if (!match.customerId) continue;
      const customer = customers.find((item) => item.id === match.customerId);
      const existing = customerSummary.get(match.customerId) || {
        customerId: match.customerId,
        customerName: customer
          ? `${customer.firstName} ${customer.lastName}`.trim()
          : 'CRM Müşterisi',
        matchedUnitCount: 0,
        bestScore: 0,
      };
      existing.matchedUnitCount += 1;
      existing.bestScore = Math.max(existing.bestScore, match.score);
      customerSummary.set(match.customerId, existing);
    }

    const typeMap = new Map<string, any>();
    for (const unit of units) {
      const key = String(unit.type);
      const entry = typeMap.get(key) || {
        type: key,
        label: this.unitTypeLabel(key),
        count: 0,
        availableCount: 0,
        reservedCount: 0,
        soldCount: 0,
        minPrice: null,
        maxPrice: null,
      };
      entry.count += 1;
      const group = this.availabilityGroup(unit.status);
      if (group === 'AVAILABLE') entry.availableCount += 1;
      if (group === 'RESERVED') entry.reservedCount += 1;
      if (group === 'CLOSED') entry.soldCount += 1;
      const price = Number(unit.price || 0);
      if (price > 0) {
        entry.minPrice = entry.minPrice === null ? price : Math.min(entry.minPrice, price);
        entry.maxPrice = entry.maxPrice === null ? price : Math.max(entry.maxPrice, price);
      }
      typeMap.set(key, entry);
    }

    const mediaUrls = project.mediaPackages
      .flatMap((item: any) => item.assets || [])
      .map((asset: any) => asset.supabaseUrl || asset.url)
      .filter(Boolean);
    const unitMediaUrls = units
      .flatMap((unit: any) => [
        ...(unit.images || []),
        ...(unit.mediaPackage?.assets || []),
      ])
      .map((asset: any) => asset.supabaseUrl || asset.url)
      .filter(Boolean);
    const images = Array.from(new Set([...mediaUrls, ...unitMediaUrls])).slice(0, 24);
    const publishedDates = units
      .map((unit: any) => unit.poolPublishedAt)
      .filter(Boolean)
      .map((value: any) => new Date(value).getTime());

    const serializedUnits = units.map((unit: any) => {
      const match = matches.find((item: any) => item.unitId === unit.id) || null;
      return {
        id: unit.id,
        title: [unit.block?.code, unit.number || unit.floorLabel]
          .filter(Boolean)
          .join(' / '),
        blockId: unit.block?.id || null,
        blockCode: unit.block?.code || null,
        blockName: unit.block?.name || null,
        floorId: unit.projectFloor?.id || null,
        floor: unit.floor,
        floorLabel: unit.floorLabel || unit.projectFloor?.label || null,
        totalFloors: unit.totalFloors,
        number: unit.number,
        type: unit.type,
        typeLabel: this.unitTypeLabel(String(unit.type)),
        status: unit.status,
        statusLabel: this.statusLabel(String(unit.status)),
        availabilityGroup: this.availabilityGroup(unit.status),
        roomCount: unit.roomCount,
        area: unit.area,
        netArea: unit.netArea,
        grossArea: unit.grossArea,
        facades: unit.facades,
        features: unit.features,
        conceptLabel: unit.conceptLabel,
        description: unit.description,
        price: unit.price,
        priceCurrency: unit.priceCurrency,
        coverUrl:
          unit.images?.[0]?.supabaseUrl ||
          unit.images?.[0]?.url ||
          unit.mediaPackage?.assets?.[0]?.supabaseUrl ||
          unit.mediaPackage?.assets?.[0]?.url ||
          images[0] ||
          null,
        match,
      };
    });

    const metrics = {
      totalUnits: units.length,
      availableUnits: units.filter(
        (unit: any) => this.availabilityGroup(unit.status) === 'AVAILABLE',
      ).length,
      reservedUnits: units.filter(
        (unit: any) => this.availabilityGroup(unit.status) === 'RESERVED',
      ).length,
      closedUnits: units.filter(
        (unit: any) => this.availabilityGroup(unit.status) === 'CLOSED',
      ).length,
    };

    return {
      id: project.id,
      kind: 'PROJECT',
      name: project.name,
      code: project.code,
      description: project.description,
      city: project.city,
      district: project.district,
      neighborhood: project.neighborhood,
      address: project.address,
      locationLabel: [
        project.city,
        project.district,
        project.neighborhood || project.address,
      ]
        .filter(Boolean)
        .join(' / '),
      latitude: project.latitude,
      longitude: project.longitude,
      completionPercent: project.completionPercent,
      deliveryDate: project.defaultDeliveryDate,
      ownerRole: project.owner?.role,
      isOwnPortfolio: project.owner?.id === customers?.[0]?.ownerId,
      blockCount: project.blocks.length,
      blocks: project.blocks.map((block: any) => ({
        id: block.id,
        code: block.code,
        name: block.name || `${block.code} Blok`,
        floorCount: block.floors.length,
        floors: block.floors,
      })),
      spaces: project.spaces.map((space: any) => ({
        id: space.id,
        name: space.customTypeName || space.name || this.spaceTypeLabel(String(space.spaceType)),
        type: space.spaceType,
        grossArea: space.grossArea,
        description: space.description,
      })),
      metrics,
      typeBreakdown: Array.from(typeMap.values()),
      roomCounts: Array.from(
        new Set(units.map((unit: any) => unit.roomCount).filter(Boolean)),
      ),
      priceRange: {
        min: prices.length ? Math.min(...prices) : null,
        max: prices.length ? Math.max(...prices) : null,
        currency,
      },
      coverUrl: images[0] || null,
      images,
      representativeUnitId:
        serializedUnits.find((unit: any) => unit.availabilityGroup === 'AVAILABLE')?.id ||
        serializedUnits[0]?.id ||
        null,
      crmMatch: {
        matchedCustomerCount: matchedCustomerIds.size,
        matchedUnitCount: matchingUnits.length,
        bestScore: matchingUnits.reduce(
          (highest: number, item: any) => Math.max(highest, item.score),
          0,
        ),
        topMatches: Array.from(customerSummary.values())
          .sort((first: any, second: any) => second.bestScore - first.bestScore)
          .slice(0, 8),
      },
      publishedAt: publishedDates.length
        ? new Date(Math.max(...publishedDates)).toISOString()
        : null,
      updatedAt: project.updatedAt,
      units: includeUnits ? serializedUnits : [],
    };
  }

  private calculateUnitMatch(unit: any, project: any, customers: any[]) {
    const unitText = [
      unit.type,
      unit.status,
      unit.roomCount,
      unit.description,
      unit.features?.join(' '),
      project.name,
      project.city,
      project.district,
      project.neighborhood,
      project.address,
    ]
      .filter(Boolean)
      .join(' ')
      .toLocaleLowerCase('tr-TR');
    let best = { score: 0, customerId: null as string | null, reasons: [] as string[] };

    for (const customer of customers) {
      const interests = customer.interests?.length
        ? customer.interests
        : [
            {
              city: customer.city,
              district: customer.interestedArea,
              propertyTypes: customer.interestedType ? [customer.interestedType] : [],
              maxBudget: customer.budget,
            },
          ];

      for (const interest of interests) {
        let score = 0;
        const reasons: string[] = [];
        const city = String(interest.city || '').toLocaleLowerCase('tr-TR').trim();
        const district = String(interest.district || '').toLocaleLowerCase('tr-TR').trim();
        const neighborhood = String(interest.neighborhood || '')
          .toLocaleLowerCase('tr-TR')
          .trim();

        if (city && city === String(project.city || '').toLocaleLowerCase('tr-TR')) {
          score += 25;
          reasons.push('İl eşleşiyor');
        }
        if (district && unitText.includes(district)) {
          score += 20;
          reasons.push('İlçe eşleşiyor');
        }
        if (neighborhood && unitText.includes(neighborhood)) {
          score += 10;
          reasons.push('Mahalle eşleşiyor');
        }

        const propertyTypes = Array.isArray(interest.propertyTypes)
          ? interest.propertyTypes.map((value: any) => String(value).toUpperCase())
          : [];
        if (propertyTypes.includes(String(unit.type).toUpperCase())) {
          score += 15;
          reasons.push('Gayrimenkul tipi eşleşiyor');
        }

        const maxBudget = Number(interest.maxBudget || customer.budget || 0);
        const minBudget = Number(interest.minBudget || 0);
        const price = Number(unit.price || 0);
        if (
          price > 0 &&
          (minBudget || maxBudget) &&
          (!minBudget || price >= minBudget) &&
          (!maxBudget || price <= maxBudget)
        ) {
          score += 20;
          reasons.push('Bütçe aralığında');
        }

        const roomCounts = Array.isArray(interest.roomCounts)
          ? interest.roomCounts.map(String)
          : [];
        if (unit.roomCount && roomCounts.includes(String(unit.roomCount))) {
          score += 5;
          reasons.push('Oda planı eşleşiyor');
        }

        const minArea = Number(interest.minArea || 0);
        const maxArea = Number(interest.maxArea || 0);
        const area = Number(unit.area || unit.grossArea || unit.netArea || 0);
        if (
          area > 0 &&
          (minArea || maxArea) &&
          (!minArea || area >= minArea) &&
          (!maxArea || area <= maxArea)
        ) {
          score += 5;
          reasons.push('Alan beklentisine uygun');
        }

        if (score > best.score) {
          best = {
            score: Math.min(score, 100),
            customerId: customer.id,
            reasons: reasons.slice(0, 5),
          };
        }
      }
    }

    return best;
  }

  private async ensureProjectVisible(projectId: string) {
    await this.findProject(projectId);
  }

  private async ensurePresentationMembership(user: CurrentUser) {
    if (String(user.role || '').toUpperCase() === Role.SUPER_ADMIN) return;

    const now = new Date();
    const membership = await this.prisma.kullaniciUyelikPaketi.findFirst({
      where: {
        kullaniciId: user.id,
        durum: UyelikDurumu.AKTIF,
        baslangicTarihi: { lte: now },
        OR: [{ bitisTarihi: null }, { bitisTarihi: { gte: now } }],
      },
      orderBy: { baslangicTarihi: 'desc' },
    });

    if (!membership) {
      throw new ForbiddenException(
        'Proje müşteri sunumu oluşturmak için aktif üyelik gereklidir.',
      );
    }
  }

  private normalizeDuration(value: unknown) {
    const duration = Number(value || 168);
    if (!ALLOWED_DURATIONS.has(duration)) {
      throw new BadRequestException(
        'Sunum süresi 24 saat, 3 gün, 7 gün veya 14 gün olmalıdır.',
      );
    }
    return duration;
  }

  private serializeLink(row: ProjectPresentationLinkRow) {
    return {
      id: row.id,
      token: row.token,
      projectId: row.projectId,
      durationHours: row.durationHours,
      expiresAt: row.expiresAt,
      revokedAt: row.revokedAt,
      viewCount: row.viewCount,
      whatsappClickCount: row.whatsappClickCount,
      lastViewedAt: row.lastViewedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      status: row.revokedAt
        ? 'REVOKED'
        : new Date(row.expiresAt).getTime() <= Date.now()
          ? 'EXPIRED'
          : 'ACTIVE',
      url: `${PLATFORM_URL}/proje-sunum/${row.token}`,
    };
  }

  private availabilityGroup(status: unknown) {
    const normalized = String(status || '');
    if (AVAILABLE_STATUSES.has(normalized)) return 'AVAILABLE';
    if (RESERVED_STATUSES.has(normalized)) return 'RESERVED';
    if (CLOSED_STATUSES.has(normalized)) return 'CLOSED';
    return 'OTHER';
  }

  private unitTypeLabel(type: string) {
    const labels: Record<string, string> = {
      DAIRE: 'Daire',
      VILLA: 'Villa',
      REZIDANS: 'Rezidans',
      DUKKAN_MAGAZA: 'Dükkan',
      OFIS_BURO: 'Ofis',
      HOME_OFFICE: 'Home Office',
      DEPO_ANTREPO: 'Depo / Antrepo',
      FABRIKA_URETIM_TESISI: 'Fabrika / Üretim Tesisi',
    };
    return labels[type] || type.replace(/_/g, ' ');
  }

  private statusLabel(status: string) {
    const labels: Record<string, string> = {
      SATILIK: 'Satışta',
      ON_SATIS: 'Ön Satış',
      YAKINDA_SATISTA: 'Yakında Satışta',
      INSAAT_HALINDE: 'İnşaat Halinde',
      TESLIME_HAZIR: 'Teslime Hazır',
      HEMEN_TESLIM: 'Hemen Teslim',
      REZERVE: 'Rezerve',
      OPSIYONLU: 'Opsiyonlu',
      SATILDI: 'Satıldı',
      KIRALANDII: 'Kiralandı',
    };
    return labels[status] || status.replace(/_/g, ' ');
  }

  private spaceTypeLabel(type: string) {
    const labels: Record<string, string> = {
      HAVUZ: 'Havuz',
      OTOPARK: 'Otopark',
      COCUK_PARKI: 'Çocuk Parkı',
      BAHCE: 'Bahçe',
      SPOR_ALANI: 'Spor Alanı',
      SOSYAL_TESIS: 'Sosyal Tesis',
      GUVENLIK: 'Güvenlik',
      YURUYUS_PARKURU: 'Yürüyüş Parkuru',
    };
    return labels[type] || type.replace(/_/g, ' ');
  }
}
