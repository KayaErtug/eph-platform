import { listingNumber } from '../common/listing-number';
import { UnitStatus } from '@prisma/client';
import { redactPoolDeedOwnerText, serializePoolPrivateInfo } from '../units/pool-privacy';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  KontorHareketTuru,
  KontorIslemTuru,
  PortfolioApprovalStatus,
  Prisma,
  Role,
  UyelikDurumu,
} from '@prisma/client';
import { randomUUID } from 'crypto';

import { AdminService } from '../admin/admin.service';
import { EphMatchEngineService } from '../matching/eph-match-engine.service';
import { PrismaService } from '../prisma/prisma.service';
import { PoolAudienceService } from '../pool-audience/pool-audience.service';

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
  constructor(
    private readonly prisma: PrismaService,
    private readonly ephMatchEngine: EphMatchEngineService,
    private readonly adminService: AdminService,
    private readonly poolAudienceService: PoolAudienceService,
  ) {}

  private isSuperAdmin(user?: CurrentUser) {
    return String(user?.role || '').toUpperCase() === Role.SUPER_ADMIN;
  }

  private hasPoolLocation(project?: {
    latitude?: number | null;
    longitude?: number | null;
    mapAddress?: string | null;
    address?: string | null;
    placeId?: string | null;
  } | null) {
    if (!project) return false;

    const latitude = Number(project.latitude || 0);
    const longitude = Number(project.longitude || 0);
    const hasCoordinates =
      Number.isFinite(latitude) &&
      Number.isFinite(longitude) &&
      Boolean(latitude && longitude);

    return Boolean(
      hasCoordinates ||
        String(project.mapAddress || '').trim() ||
        String(project.address || '').trim() ||
        String(project.placeId || '').trim(),
    );
  }

  private getApproximatePoolCoordinates(
    unitId: string,
    latitudeInput?: number | null,
    longitudeInput?: number | null,
  ) {
    const latitude = Number(latitudeInput || 0);
    const longitude = Number(longitudeInput || 0);

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      !latitude ||
      !longitude
    ) {
      return {
        latitude: null,
        longitude: null,
      };
    }

    let hash = 0;
    const source = String(unitId || 'EPH');

    for (let index = 0; index < source.length; index += 1) {
      hash = (hash * 31 + source.charCodeAt(index)) % 104729;
    }

    const latitudeOffset = ((hash % 7) - 3) * 0.00055;
    const longitudeOffset =
      ((Math.floor(hash / 7) % 7) - 3) * 0.00065;

    return {
      latitude: Number(
        (Math.round(latitude * 100) / 100 + latitudeOffset).toFixed(6),
      ),
      longitude: Number(
        (Math.round(longitude * 100) / 100 + longitudeOffset).toFixed(6),
      ),
    };
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

  private async calculatePoolMatch(
    unit: any,
    customers: any[],
  ) {
    const best =
      await this.ephMatchEngine.findBestCustomerMatchForUnit(
        unit,
        customers,
        {
          source: 'HAVUZ',
          useDistance: false,
        },
      );

    if (!best) {
      return {
        score: 0,
        customerId: null as string | null,
        budgetDiff: 0,
        reasons: [] as string[],
      };
    }

    const referenceBudget =
      best.priceMatch?.declaredMaxBudget || 0;

    const unitPrice = Number(unit.price || 0);

    const budgetDiff =
      referenceBudget > 0 && unitPrice > 0
        ? Math.round(
            (Math.abs(unitPrice - referenceBudget) /
              Math.max(unitPrice, referenceBudget)) *
              100,
          )
        : 0;

    return {
      score: best.matchScore,
      customerId: best.customerId,
      budgetDiff,
      reasons: best.matchReasons.slice(0, 5),
    };
  }

  async lookupListing(number: string, user: CurrentUser) {
    const id = listingNumber(number);
    const unit = await this.prisma.unit.findFirst({
      where: { id, project: { code: null }, OR: [
        { poolPublishedAt: { not: null } },
        { poolRemovedAt: { not: null } },
        { isPoolVisible: true, approvalStatus: PortfolioApprovalStatus.HAVUZDA },
      ] },
      select: {
        id: true, isPoolVisible: true, approvalStatus: true, status: true,
        project: { select: { ownerId: true, isActive: true } },
      },
    });
    const visible = unit ? await this.poolAudienceService.filterVisibleUnits(user, [unit]) : [];
    if (!visible.length) throw new NotFoundException('İlan bulunamadı.');
    const active = unit!.isPoolVisible && unit!.approvalStatus === PortfolioApprovalStatus.HAVUZDA
      && unit!.project.isActive && ![UnitStatus.PASIF, UnitStatus.SATILDI, UnitStatus.KIRALANDII].includes(unit!.status as any);
    return { id: unit!.id, status: active ? 'ACTIVE' : 'PASSIVE' };
  }

  async findPoolUnits(user: CurrentUser) {
    const [units, customers] = await Promise.all([
      this.prisma.unit.findMany({
        where: {
          status: { notIn: [UnitStatus.PASIF, UnitStatus.SATILDI, UnitStatus.KIRALANDII] },
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
              neighborhood: true,
              address: true,
              latitude: true,
              longitude: true,
              mapAddress: true,
              placeId: true,
              ownerId: true,
              owner: { select: { role: true, firstName: true, lastName: true, companyName: true, office: { select: { name: true } } } },
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

    const visibleUnits =
      await this.poolAudienceService.filterVisibleUnits(user, units);

    const [accessRows, configuredPrivateInfoCost] =
      await Promise.all([
        this.isSuperAdmin(user)
          ? Promise.resolve([])
          : this.prisma.kontorHareketi.findMany({
              where: {
                kullaniciId: user.id,
                hareketTuru: KontorHareketTuru.HARCAMA,
                islemTuru: {
                  in: [
                    KontorIslemTuru.HAVUZ_OZEL_BILGI,
                    KontorIslemTuru.HAVUZ_KONUM,
                    KontorIslemTuru.HAVUZ_TELEFON,
                    KontorIslemTuru.HAVUZ_WHATSAPP,
                  ],
                },
                ilgiliKayitTuru: 'UNIT',
                ilgiliKayitId: {
                  in: visibleUnits.map((unit) => unit.id),
                },
              },
              select: {
                ilgiliKayitId: true,
              },
            }),
        this.adminService.getNumericSystemSetting(
          'POOL_PRIVATE_INFO_COST',
          25,
        ),
      ]);

    const privateInfoCost = Number.isFinite(configuredPrivateInfoCost)
      ? Math.max(0, Math.trunc(configuredPrivateInfoCost))
      : 25;

    const privateInfoUnitIds = new Set(
      accessRows
        .map((row) => row.ilgiliKayitId)
        .filter((value): value is string => Boolean(value)),
    );
    return Promise.all(
      visibleUnits.map(async (unit) => {
      const isOwnPortfolio = unit.project.ownerId === user.id;
      const hasLocation = this.hasPoolLocation(unit.project);
      const privateInfoUnlocked =
        this.isSuperAdmin(user) ||
        isOwnPortfolio ||
        privateInfoUnitIds.has(unit.id);
      const approximate = this.getApproximatePoolCoordinates(
        unit.id,
        unit.project.latitude,
        unit.project.longitude,
      );

      return {
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
        ...serializePoolPrivateInfo(
          unit,
          privateInfoUnlocked,
        ),
        privateInfoCost,
        price: unit.price,
        priceCurrency: unit.priceCurrency,
        description: redactPoolDeedOwnerText(unit, unit.description),
        phoneCallAllowed: Boolean(
          unit.allowPhoneCall && String(unit.contactPhone || '').trim(),
        ),
        whatsappAllowed: Boolean(
          unit.allowWhatsapp && String(unit.whatsappPhone || '').trim(),
        ),
        isVerified: unit.isVerified,
        isPoolVisible: unit.isPoolVisible,
        approvalStatus: unit.approvalStatus,
        tapuVerified: unit.tapuVerified,
        photoVerified: unit.photoVerified,
        yetkiVerified: unit.yetkiVerified,
        createdAt: unit.createdAt,
        poolPublishedAt: unit.poolPublishedAt,
        images: unit.images,
        project: {
          id: unit.project.id,
          name: redactPoolDeedOwnerText(unit, unit.project.name),
          city: unit.project.city,
          district: unit.project.district,
          neighborhood: unit.project.neighborhood,
          address: privateInfoUnlocked ? unit.project.address : null,
          latitude: privateInfoUnlocked
            ? unit.project.latitude
            : approximate.latitude,
          longitude: privateInfoUnlocked
            ? unit.project.longitude
            : approximate.longitude,
          mapAddress: privateInfoUnlocked ? unit.project.mapAddress : null,
          placeId: privateInfoUnlocked ? unit.project.placeId : null,
          ownerRole: unit.project.owner.role,
          isOwnPortfolio,
          hasLocation,
          locationUnlocked: privateInfoUnlocked,
          locationPrecision: hasLocation
            ? privateInfoUnlocked
              ? 'EXACT'
              : 'APPROXIMATE'
            : 'NONE',
        },
        poolMatch: await this.calculatePoolMatch(unit, customers),
      };
      }),
    );
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

    if (!unit || !unit.project.isActive || [UnitStatus.PASIF, UnitStatus.SATILDI, UnitStatus.KIRALANDII].includes(unit.status as any)) {
      throw new NotFoundException('Portföy bulunamadı.');
    }

    if (source === 'POOL') {
      if (
        !unit.isPoolVisible ||
        unit.approvalStatus !== PortfolioApprovalStatus.HAVUZDA
      ) {
        throw new BadRequestException('Portföy Havuz içinde aktif değil.');
      }

      await this.poolAudienceService.assertCanViewUnit(unitId, user);
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
          companyName: true, office: { select: { name: true } },
        },
      }),
    ]);

    if (!unit || !unit.project.isActive || [UnitStatus.PASIF, UnitStatus.SATILDI, UnitStatus.KIRALANDII].includes(unit.status as any)) {
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
