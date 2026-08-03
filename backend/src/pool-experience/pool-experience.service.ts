import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  PortfolioApprovalStatus,
  Prisma,
  Role,
  UyelikDurumu,
} from '@prisma/client';
import { randomUUID } from 'crypto';

import { PrismaService } from '../prisma/prisma.service';

type CurrentUser = {
  id: string;
  role?: Role | string;
};

type PresentationSource = 'POOL' | 'PORTFOLIO';

type PresentationLinkRow = {
  id: string;
  token: string;
  unitId: string;
  sharedById: string;
  source: PresentationSource;
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

@Injectable()
export class PoolExperienceService {
  constructor(private readonly prisma: PrismaService) {}

  private isSuperAdmin(user?: CurrentUser) {
    return String(user?.role || '').toUpperCase() === Role.SUPER_ADMIN;
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

  private getStatus(row: PresentationLinkRow) {
    if (row.revokedAt) return 'REVOKED';
    if (new Date(row.expiresAt).getTime() <= Date.now()) return 'EXPIRED';
    return 'ACTIVE';
  }

  private serializeLink(row: PresentationLinkRow) {
    return {
      id: row.id,
      token: row.token,
      unitId: row.unitId,
      source: row.source,
      durationHours: row.durationHours,
      expiresAt: row.expiresAt,
      revokedAt: row.revokedAt,
      viewCount: row.viewCount,
      whatsappClickCount: row.whatsappClickCount,
      lastViewedAt: row.lastViewedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      status: this.getStatus(row),
      url: `${PLATFORM_URL}/paylasim/${row.token}`,
    };
  }

  private async ensurePresentationMembership(user: CurrentUser) {
    if (this.isSuperAdmin(user)) return;

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
        'Müşteri sunumu oluşturmak için aktif üyelik gereklidir.',
      );
    }

    const membershipPackage = await this.prisma.uyelikPaketi.findUnique({
      where: { id: membership.paketId },
      select: { aktifMi: true },
    });

    if (!membershipPackage?.aktifMi) {
      throw new ForbiddenException('Üyelik paketiniz aktif değil.');
    }
  }

  private buildUnitSearchText(unit: any) {
    return [
      unit.type,
      unit.status,
      unit.roomCount,
      unit.description,
      unit.project?.name,
      unit.project?.city,
      unit.project?.district,
      unit.project?.address,
      ...(Array.isArray(unit.features) ? unit.features : []),
    ]
      .filter(Boolean)
      .join(' ')
      .toLocaleLowerCase('tr-TR');
  }

  private calculatePoolMatch(unit: any, customers: any[]) {
    const unitText = this.buildUnitSearchText(unit);
    const unitCity = String(unit.project?.city || '')
      .toLocaleLowerCase('tr-TR')
      .trim();
    const unitDistrict = String(unit.project?.district || '')
      .toLocaleLowerCase('tr-TR')
      .trim();
    const unitType = String(unit.type || '').toUpperCase();
    const unitStatus = String(unit.status || '').toUpperCase();
    const unitArea = Number(unit.area || 0);
    const unitPrice = Number(unit.price || 0);
    const unitRoom = String(unit.roomCount || '').trim();

    let best = {
      score: 0,
      customerId: null as string | null,
      budgetDiff: 0,
      reasons: [] as string[],
    };

    for (const customer of customers) {
      const interests = Array.isArray(customer.interests)
        ? customer.interests.filter((interest: any) => interest.isActive !== false)
        : [];

      const profiles =
        interests.length > 0
          ? interests
          : [
              {
                city: customer.city,
                district: customer.interestedArea,
                propertyTypes: customer.interestedType
                  ? [customer.interestedType]
                  : [],
                minBudget: null,
                maxBudget: customer.budget,
                roomCounts: [],
                features: [],
              },
            ];

      for (const interest of profiles) {
        let score = 0;
        let budgetDiff = 0;
        const reasons: string[] = [];

        const city = String(interest.city || '')
          .toLocaleLowerCase('tr-TR')
          .trim();
        const district = String(interest.district || '')
          .toLocaleLowerCase('tr-TR')
          .trim();
        const neighborhood = String(interest.neighborhood || '')
          .toLocaleLowerCase('tr-TR')
          .trim();

        if (city && city === unitCity) {
          score += 22;
          reasons.push('İl eşleşiyor');
        }

        if (
          district &&
          (district === unitDistrict || unitText.includes(district))
        ) {
          score += 18;
          reasons.push('İlçe eşleşiyor');
        }

        if (neighborhood && unitText.includes(neighborhood)) {
          score += 10;
          reasons.push('Mahalle eşleşiyor');
        }

        const propertyTypes = Array.isArray(interest.propertyTypes)
          ? interest.propertyTypes.map((value: unknown) =>
              String(value || '').toUpperCase(),
            )
          : [];

        if (
          propertyTypes.includes(unitType) ||
          (!propertyTypes.length &&
            String(customer.interestedType || '')
              .toLocaleLowerCase('tr-TR')
              .split(/[|,/]/)
              .some((value: string) =>
                value.trim() ? unitText.includes(value.trim()) : false,
              ))
        ) {
          score += 15;
          reasons.push('Gayrimenkul tipi eşleşiyor');
        }

        const statuses = Array.isArray(interest.statuses)
          ? interest.statuses.map((value: unknown) =>
              String(value || '').toUpperCase(),
            )
          : [];

        if (statuses.includes(unitStatus)) {
          score += 5;
          reasons.push('İşlem tipi eşleşiyor');
        }

        const minBudget = Number(interest.minBudget || 0);
        const maxBudget = Number(
          interest.maxBudget || customer.budget || 0,
        );

        if (unitPrice && (minBudget || maxBudget)) {
          if (
            (!minBudget || unitPrice >= minBudget) &&
            (!maxBudget || unitPrice <= maxBudget)
          ) {
            score += 20;
            reasons.push('Bütçe aralığında');
          } else {
            const reference = maxBudget || minBudget;
            budgetDiff = reference
              ? Math.round(
                  (Math.abs(unitPrice - reference) /
                    Math.max(unitPrice, reference)) *
                    100,
                )
              : 0;

            if (budgetDiff <= 10) {
              score += 14;
              reasons.push('Bütçeye çok yakın');
            } else if (budgetDiff <= 20) {
              score += 9;
              reasons.push('Bütçeye yakın');
            } else if (budgetDiff <= 35) {
              score += 4;
            }
          }
        }

        const minArea = Number(interest.minArea || 0);
        const maxArea = Number(interest.maxArea || 0);
        if (
          unitArea &&
          (minArea || maxArea) &&
          (!minArea || unitArea >= minArea) &&
          (!maxArea || unitArea <= maxArea)
        ) {
          score += 7;
          reasons.push('Alan beklentisine uygun');
        }

        const roomCounts = Array.isArray(interest.roomCounts)
          ? interest.roomCounts.map(String)
          : [];
        if (unitRoom && roomCounts.includes(unitRoom)) {
          score += 3;
          reasons.push('Oda planı eşleşiyor');
        }

        if (score > best.score) {
          best = {
            score: Math.min(score, 100),
            customerId: customer.id,
            budgetDiff,
            reasons: reasons.slice(0, 5),
          };
        }
      }
    }

    return best;
  }

  async findPoolUnits(user: CurrentUser) {
    const [units, customers] = await Promise.all([
      this.prisma.unit.findMany({
        where: {
          isPoolVisible: true,
          approvalStatus: PortfolioApprovalStatus.HAVUZDA,
          project: {
            isActive: true,
            code: null,
          },
        },
        include: {
          project: {
            select: {
              id: true,
              name: true,
              city: true,
              district: true,
              address: true,
              latitude: true,
              longitude: true,
              mapAddress: true,
              placeId: true,
              ownerId: true,
              owner: { select: { role: true } },
            },
          },
          images: {
            orderBy: [
              { isCover: 'desc' },
              { sortOrder: 'asc' },
              { createdAt: 'asc' },
            ],
          },
        },
        orderBy: { poolPublishedAt: 'desc' },
      }),
      this.prisma.customer.findMany({
        where: { ownerId: user.id },
        include: { interests: { where: { isActive: true } } },
        orderBy: { updatedAt: 'desc' },
      }),
    ]);

    return units.map((unit) => ({
      id: unit.id,
      type: unit.type,
      status: unit.status,
      roomCount: unit.roomCount,
      area: unit.area,
      netArea: unit.netArea,
      grossArea: unit.grossArea,
      floor: unit.floor,
      floorLabel: unit.floorLabel,
      totalFloors: unit.totalFloors,
      conceptLabel: unit.conceptLabel,
      facades: unit.facades,
      features: unit.features,
      adaNo: unit.adaNo,
      parselNo: unit.parselNo,
      price: unit.price,
      availableCreditAmount: unit.availableCreditAmount,
      priceCurrency: unit.priceCurrency,
      description: unit.description,
      isVerified: unit.isVerified,
      isPoolVisible: unit.isPoolVisible,
      approvalStatus: unit.approvalStatus,
      tapuVerified: unit.tapuVerified,
      photoVerified: unit.photoVerified,
      yetkiVerified: unit.yetkiVerified,
      createdAt: unit.createdAt,
      images: unit.images,
      project: {
        id: unit.project.id,
        name: unit.project.name,
        city: unit.project.city,
        district: unit.project.district,
        address: unit.project.address,
        latitude: unit.project.latitude,
        longitude: unit.project.longitude,
        mapAddress: unit.project.mapAddress,
        placeId: unit.project.placeId,
        ownerRole: unit.project.owner.role,
        isOwnPortfolio: unit.project.ownerId === user.id,
      },
      poolMatch: this.calculatePoolMatch(unit, customers),
    }));
  }

  private async getUnitForPresentation(
    unitId: string,
    user: CurrentUser,
    source: PresentationSource,
  ) {
    const unit = await this.prisma.unit.findUnique({
      where: { id: unitId },
      include: {
        project: {
          select: {
            ownerId: true,
            isActive: true,
          },
        },
      },
    });

    if (!unit || !unit.project.isActive) {
      throw new NotFoundException('Portföy bulunamadı.');
    }

    if (source === 'POOL') {
      if (
        !unit.isPoolVisible ||
        unit.approvalStatus !== PortfolioApprovalStatus.HAVUZDA
      ) {
        throw new BadRequestException('Portföy Havuz içinde aktif değil.');
      }
    } else if (
      !this.isSuperAdmin(user) &&
      unit.project.ownerId !== user.id
    ) {
      throw new ForbiddenException(
        'Yalnız kendi portföyünüz için özel sunum oluşturabilirsiniz.',
      );
    }

    return unit;
  }

  async createPresentation(
    unitId: string,
    user: CurrentUser,
    source: PresentationSource,
    durationInput?: unknown,
  ) {
    await this.ensurePresentationMembership(user);
    await this.getUnitForPresentation(unitId, user, source);

    const durationHours = this.normalizeDuration(durationInput);
    const expiresAt = new Date(Date.now() + durationHours * 60 * 60 * 1000);

    const row = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        SELECT pg_advisory_xact_lock(
          hashtext(${`presentation:${source}:${unitId}:${user.id}`})
        )
      `;

      const active = await tx.$queryRaw<PresentationLinkRow[]>`
        SELECT *
        FROM "EphPresentationLink"
        WHERE
          "unitId" = ${unitId}
          AND "sharedById" = ${user.id}
          AND "source" = ${source}
          AND "revokedAt" IS NULL
          AND "expiresAt" > NOW()
        ORDER BY "createdAt" DESC
        LIMIT 1
      `;

      if (active[0]) {
        const updated = await tx.$queryRaw<PresentationLinkRow[]>`
          UPDATE "EphPresentationLink"
          SET
            "durationHours" = ${durationHours},
            "expiresAt" = ${expiresAt},
            "updatedAt" = NOW()
          WHERE "id" = ${active[0].id}
          RETURNING *
        `;

        return updated[0];
      }

      const created = await tx.$queryRaw<PresentationLinkRow[]>`
        INSERT INTO "EphPresentationLink" (
          "id",
          "token",
          "unitId",
          "sharedById",
          "source",
          "durationHours",
          "expiresAt",
          "createdAt",
          "updatedAt"
        )
        VALUES (
          ${randomUUID()},
          ${randomUUID()},
          ${unitId},
          ${user.id},
          ${source},
          ${durationHours},
          ${expiresAt},
          NOW(),
          NOW()
        )
        RETURNING *
      `;

      return created[0];
    });

    return this.serializeLink(row);
  }

  async listPresentations(
    unitId: string,
    user: CurrentUser,
    source: PresentationSource,
  ) {
    await this.getUnitForPresentation(unitId, user, source);

    const rows = await this.prisma.$queryRaw<PresentationLinkRow[]>`
      SELECT *
      FROM "EphPresentationLink"
      WHERE
        "unitId" = ${unitId}
        AND "sharedById" = ${user.id}
        AND "source" = ${source}
      ORDER BY "createdAt" DESC
      LIMIT 20
    `;

    return rows.map((row) => this.serializeLink(row));
  }

  async renewPresentation(
    linkId: string,
    user: CurrentUser,
    durationInput?: unknown,
  ) {
    const durationHours = this.normalizeDuration(durationInput);
    const expiresAt = new Date(Date.now() + durationHours * 60 * 60 * 1000);

    const rows = await this.prisma.$queryRaw<PresentationLinkRow[]>`
      UPDATE "EphPresentationLink"
      SET
        "durationHours" = ${durationHours},
        "expiresAt" = ${expiresAt},
        "revokedAt" = NULL,
        "updatedAt" = NOW()
      WHERE
        "id" = ${linkId}
        AND "sharedById" = ${user.id}
      RETURNING *
    `;

    if (!rows[0]) {
      throw new NotFoundException('Sunum bağlantısı bulunamadı.');
    }

    return this.serializeLink(rows[0]);
  }

  async revokePresentation(linkId: string, user: CurrentUser) {
    const rows = await this.prisma.$queryRaw<PresentationLinkRow[]>`
      UPDATE "EphPresentationLink"
      SET
        "revokedAt" = NOW(),
        "updatedAt" = NOW()
      WHERE
        "id" = ${linkId}
        AND "sharedById" = ${user.id}
        AND "revokedAt" IS NULL
      RETURNING *
    `;

    if (!rows[0]) {
      throw new NotFoundException('Aktif sunum bağlantısı bulunamadı.');
    }

    return this.serializeLink(rows[0]);
  }

  private async findActivePresentation(token: string) {
    const rows = await this.prisma.$queryRaw<PresentationLinkRow[]>`
      SELECT *
      FROM "EphPresentationLink"
      WHERE "token" = ${token}
      LIMIT 1
    `;

    const link = rows[0];

    if (!link || link.revokedAt || new Date(link.expiresAt).getTime() <= Date.now()) {
      throw new NotFoundException(
        'Bu müşteri sunumu bağlantısı geçersiz, iptal edilmiş veya süresi dolmuş.',
      );
    }

    return link;
  }

  async getCustomerPresentation(token: string) {
    const link = await this.findActivePresentation(token);

    const [unit, sharedBy] = await Promise.all([
      this.prisma.unit.findUnique({
        where: { id: link.unitId },
        include: {
          project: {
            select: {
              name: true,
              city: true,
              district: true,
              neighborhood: true,
              latitude: true,
              longitude: true,
              isActive: true,
            },
          },
          images: {
            orderBy: [
              { isCover: 'desc' },
              { sortOrder: 'asc' },
              { createdAt: 'asc' },
            ],
          },
        },
      }),
      this.prisma.user.findUnique({
        where: { id: link.sharedById },
        select: {
          firstName: true,
          lastName: true,
          phone: true,
          profileImageUrl: true,
          memberCode: true,
          isVerified: true,
          office: { select: { name: true } },
        },
      }),
    ]);

    if (!unit || !unit.project.isActive) {
      throw new NotFoundException('Bu portföy artık mevcut değil.');
    }

    if (
      link.source === 'POOL' &&
      (!unit.isPoolVisible ||
        unit.approvalStatus !== PortfolioApprovalStatus.HAVUZDA)
    ) {
      throw new NotFoundException('Bu portföy artık Havuz içinde aktif değil.');
    }

    await this.prisma.$executeRaw`
      UPDATE "EphPresentationLink"
      SET
        "viewCount" = "viewCount" + 1,
        "lastViewedAt" = NOW(),
        "updatedAt" = NOW()
      WHERE "id" = ${link.id}
    `;

    return {
      ephId: `EPH-${unit.id.replaceAll('-', '').slice(0, 6).toUpperCase()}`,
      type: unit.type,
      status: unit.status,
      roomCount: unit.roomCount,
      area: unit.area,
      netArea: unit.netArea,
      grossArea: unit.grossArea,
      floor: unit.floor,
      floorLabel: unit.floorLabel,
      totalFloors: unit.totalFloors,
      conceptLabel: unit.conceptLabel,
      facades: unit.facades,
      features: unit.features,
      adaNo: unit.adaNo,
      parselNo: unit.parselNo,
      price: unit.price,
      priceCurrency: unit.priceCurrency,
      description: unit.description,
      images: unit.images,
      isVerified: unit.isVerified,
      tapuVerified: unit.tapuVerified,
      photoVerified: unit.photoVerified,
      yetkiVerified: unit.yetkiVerified,
      project: {
        name: unit.project.name,
        city: unit.project.city,
        district: unit.project.district,
        neighborhood: unit.project.neighborhood,
        latitude: unit.project.latitude,
        longitude: unit.project.longitude,
      },
      sharedBy: sharedBy
        ? {
            fullName:
              `${sharedBy.firstName || ''} ${sharedBy.lastName || ''}`.trim() ||
              'EPH Üyesi',
            phone: sharedBy.phone || null,
            profileImageUrl: sharedBy.profileImageUrl || null,
            memberCode: sharedBy.memberCode || null,
            officeName: sharedBy.office?.name || null,
            isVerified: sharedBy.isVerified,
          }
        : null,
      presentation: {
        source: link.source,
        expiresAt: link.expiresAt,
        durationHours: link.durationHours,
      },
    };
  }

  async recordWhatsappClick(token: string) {
    const link = await this.findActivePresentation(token);

    await this.prisma.$executeRaw`
      UPDATE "EphPresentationLink"
      SET
        "whatsappClickCount" = "whatsappClickCount" + 1,
        "updatedAt" = NOW()
      WHERE "id" = ${link.id}
    `;

    return { ok: true };
  }
}
