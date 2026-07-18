import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ActivityType,
  CustomerPropertyRelation,
  CustomerStatus,
  KontorHareketTuru,
  KontorIslemTuru,
  PortfolioApprovalStatus,
  ProjectSetupStatus,
  Role,
  UnitStatus,
  UnitType,
} from '@prisma/client';
import { randomUUID } from 'crypto';

import { PrismaService } from '../prisma/prisma.service';

const PLATFORM_URL =
  process.env.FRONTEND_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.APP_URL ||
  'https://emlakportfoyhavuzu.com';

type CurrentUserPayload = {
  id: string;
  role?: Role | string;
};

type CreateUnitPayload = {
  type: UnitType;
  floor?: number;
  floorLabel?: string;
  totalFloors?: number;
  priceCurrency?: string;
  number?: string;
  adaNo?: string;
  parselNo?: string;
  roomCount?: string;
  area?: number;
  price: number;
  status?: UnitStatus;
  description?: string;
  deedOwnerFullName?: string;
  deedOwnerPhone?: string;
  deedOwnerEmail?: string;
  availableCreditAmount?: number | string | null;
  doorAccessInfo?: string | null;
  features?: string[];
};

type PoolActionPayload = {
  message?: string;
  matchScore?: number;
  note?: string;
};

const unitInclude = {
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
      owner: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          role: true,
          memberCode: true,
        },
      },
    },
  },
  images: {
    orderBy: [
      { isCover: 'desc' as const },
      { sortOrder: 'asc' as const },
      { createdAt: 'asc' as const },
    ],
  },
  authorityDocuments: {
    orderBy: { createdAt: 'desc' as const },
  },
};


const PORTFOLIO_METADATA_PREFIX = '__EPH_META__:';

const PORTFOLIO_METADATA_KEYS = new Set([
  'buildingAge',
  'openArea',
  'closedArea',
  'bedCount',
  'villaType',
  'layoutType',
  'poolType',
  'summerHouseType',
  'buildingStyle',
  'homeType',
  'accessSeason',
  'buildingUsage',
  'plazaClass',
  'hotelBuildingStatus',
  'industrialBuildingType',
  'workshopType',
  'businessType',
  'warehouseType',
  'shopType',
  'officeType',
  'stationType',
  'zoningType',
  'fieldType',
  'vineyardType',
  'gardenType',
  'oliveGroveType',
  'projectStatus',
  'hotelSubType',
  'pensionType',
  'campType',
  'resortType',
  'periodType',
]);

type RequiredPortfolioRule = {
  fields: string[];
  specialFields?: string[];
};

const REQUIRED_PORTFOLIO_RULES: Record<string, RequiredPortfolioRule> = {
  DAIRE: { fields: ['roomCount', 'area', 'buildingAge', 'floor', 'totalFloors', 'price'] },
  REZIDANS: { fields: ['roomCount', 'area', 'buildingAge', 'floor', 'totalFloors', 'price'] },
  VILLA: {
    fields: ['roomCount', 'area', 'buildingAge', 'price'],
    specialFields: ['villaType', 'layoutType'],
  },
  YAZLIK: {
    fields: ['roomCount', 'area', 'buildingAge', 'price'],
    specialFields: ['summerHouseType'],
  },
  MUSTAK_EV: {
    fields: ['roomCount', 'area', 'buildingAge', 'price'],
    specialFields: ['homeType'],
  },
  KOY_EVI: {
    fields: ['roomCount', 'area', 'price'],
    specialFields: ['buildingStyle'],
  },
  DAG_EVI_YAYLA_EVI: {
    fields: ['roomCount', 'area', 'price'],
    specialFields: ['buildingStyle'],
  },
  APARTMAN: {
    fields: ['area', 'buildingAge', 'totalFloors', 'price'],
    specialFields: ['buildingUsage'],
  },
  KOMPLE_BINA: {
    fields: ['area', 'buildingAge', 'totalFloors', 'price'],
    specialFields: ['buildingUsage'],
  },
  IS_HANI: {
    fields: ['area', 'totalFloors', 'price'],
    specialFields: ['buildingUsage'],
  },
  PLAZA_BINA: {
    fields: ['area', 'totalFloors', 'price'],
    specialFields: ['plazaClass'],
  },
  REZIDANS_BINA: {
    fields: ['area', 'totalFloors', 'price'],
    specialFields: ['buildingUsage'],
  },
  OTEL_BINASI: {
    fields: ['roomCount', 'area', 'totalFloors', 'price'],
    specialFields: ['hotelBuildingStatus'],
  },
  FABRIKA_URETIM_TESISI: {
    fields: ['area', 'openArea', 'price'],
    specialFields: ['industrialBuildingType'],
  },
  ATOLYE: { fields: ['area', 'price'] },
  TICARI_ISLETME: { fields: ['area', 'price'] },
  DEPO_ANTREPO: { fields: ['area', 'price'] },
  DUKKAN_MAGAZA: { fields: ['area', 'price'] },
  OFIS_BURO: { fields: ['roomCount', 'area', 'floor', 'price'] },
  BENZIN_ISTASYONU: {
    fields: ['area', 'closedArea', 'price'],
    specialFields: ['stationType'],
  },
  ARSA: {
    fields: ['area', 'adaNo', 'parselNo', 'price'],
    specialFields: ['zoningType'],
  },
  TARLA: { fields: ['area', 'adaNo', 'parselNo', 'price'] },
  BAG: { fields: ['area', 'adaNo', 'parselNo', 'price'] },
  BAHCE: { fields: ['area', 'adaNo', 'parselNo', 'price'] },
  ZEYTINLIK: { fields: ['area', 'adaNo', 'parselNo', 'price'] },
  KONUT_PROJESI: { fields: ['area', 'price'] },
  REZIDANS_PROJESI: { fields: ['area', 'price'] },
  VILLA_PROJESI: { fields: ['area', 'price'] },
  OTEL: { fields: ['roomCount', 'bedCount', 'area', 'price'] },
  PANSIYON: { fields: ['roomCount', 'bedCount', 'area', 'price'] },
  KAMP_YERI: { fields: ['openArea', 'price'] },
  TATIL_KOYU: { fields: ['openArea', 'closedArea', 'roomCount', 'price'] },
  DEVRE_MULK: {
    fields: ['roomCount', 'area', 'price'],
    specialFields: ['periodType'],
  },
};

const PORTFOLIO_FIELD_LABELS: Record<string, string> = {
  roomCount: 'Oda Sayısı',
  area: 'Alan',
  openArea: 'Açık Alan',
  closedArea: 'Kapalı Alan',
  bedCount: 'Yatak Sayısı',
  buildingAge: 'Bina Yaşı',
  floor: 'Bulunduğu Kat',
  totalFloors: 'Toplam Kat Sayısı',
  adaNo: 'Ada No',
  parselNo: 'Parsel No',
  number: 'Bağımsız Bölüm / Kapı No',
  price: 'Fiyat',
  villaType: 'Villa Tipi',
  layoutType: 'Nizam Tipi',
  summerHouseType: 'Yazlık Türü',
  homeType: 'Ev Tipi',
  buildingStyle: 'Yapı Tipi',
  buildingUsage: 'Bina Kullanım Tipi',
  plazaClass: 'Plaza Sınıfı',
  hotelBuildingStatus: 'Otel Bina Durumu',
  industrialBuildingType: 'Sanayi Yapı Tipi',
  stationType: 'İstasyon Tipi',
  zoningType: 'İmar Durumu',
  periodType: 'Dönem Tipi',
};

@Injectable()
export class UnitsService {
  constructor(private prisma: PrismaService) {}

  private isSuperAdmin(user?: CurrentUserPayload) {
    return user?.role === Role.SUPER_ADMIN || user?.role === 'SUPER_ADMIN';
  }

  private isAdmin(user?: CurrentUserPayload) {
    return user?.role === Role.ADMIN || user?.role === 'ADMIN';
  }

  private isModerator(user?: CurrentUserPayload) {
    return user?.role === Role.MODERATOR || user?.role === 'MODERATOR';
  }

  private isApprovalManager(user?: CurrentUserPayload) {
    return this.isSuperAdmin(user) || this.isAdmin(user) || this.isModerator(user);
  }

  private isOwner(user: CurrentUserPayload, ownerId: string) {
    return Boolean(user?.id && ownerId && user.id === ownerId);
  }

  private ensureCanViewUnit(user: CurrentUserPayload, ownerId: string) {
    if (this.isSuperAdmin(user)) return;
    if (this.isOwner(user, ownerId)) return;

    throw new ForbiddenException('Bu portföyü görüntüleme yetkiniz yok.');
  }

  private ensureCanManageUnit(user: CurrentUserPayload, ownerId: string) {
    if (this.isSuperAdmin(user)) return;
    if (this.isOwner(user, ownerId)) return;

    throw new ForbiddenException('Bu portföy için işlem yetkiniz yok.');
  }

  private ensureApprovalManager(user: CurrentUserPayload) {
    if (!this.isApprovalManager(user)) {
      throw new ForbiddenException(
        'Bu işlem sadece Moderatör, Admin veya Yazılım Ekibi tarafından yapılabilir.',
      );
    }
  }

  private isPortfolioContentLocked(
    approvalStatus?: PortfolioApprovalStatus | string | null,
  ) {
    const normalizedStatus = String(approvalStatus || '').toUpperCase();

    const lockedStatuses = new Set<PortfolioApprovalStatus>([
      PortfolioApprovalStatus.INCELEMEYE_GONDERILDI,
      PortfolioApprovalStatus.INCELEMEDE,
      PortfolioApprovalStatus.ONAYLANDI,
      PortfolioApprovalStatus.HAVUZDA,
    ]);

    return lockedStatuses.has(
      normalizedStatus as PortfolioApprovalStatus,
    );
  }

  private ensurePortfolioContentEditable(
    user: CurrentUserPayload,
    unit: {
      approvalStatus?: PortfolioApprovalStatus | string | null;
    },
  ) {
    if (this.isSuperAdmin(user)) return;

    if (this.isPortfolioContentLocked(unit.approvalStatus)) {
      throw new ForbiddenException(
        'Portföy incelemeye gönderildikten sonra bilgileri değiştirilemez. Düzeltme gerekiyorsa portföyün Eksik Bilgi durumuna alınması gerekir.',
      );
    }
  }

  private getPrivateUnitWhere(user: CurrentUserPayload) {
    if (this.isSuperAdmin(user)) return {};

    if (this.isAdmin(user) || this.isModerator(user)) {
      return {
        id: '__ADMIN_PORTFOY_GOREMEZ__',
      };
    }

    return {
      project: {
        ownerId: user.id,
      },
    };
  }

  private getClassicPortfolioProjectWhere() {
    return {
      code: null,
      declaredIndependentUnitCount: null,
      declaredSalesInventoryCount: null,
      plannedUnitTypes: {
        isEmpty: true,
      },
      blocks: {
        none: {},
      },
      mediaPackages: {
        none: {},
      },
      designReviewRequests: {
        none: {},
      },
    };
  }

  private getPoolVisibleProjectWhere() {
    return {
      OR: [
        this.getClassicPortfolioProjectWhere(),
        {
          setupStatus: ProjectSetupStatus.TAMAMLANDI,
        },
      ],
    };
  }

  private getPortfolioVisibleProjectWhere() {
    return this.getClassicPortfolioProjectWhere();
  }

  private isProjectSalesProject(project: {
    code?: string | null;
    declaredIndependentUnitCount?: number | null;
    declaredSalesInventoryCount?: number | null;
    plannedUnitTypes?: unknown[] | null;
    setupStatus?: ProjectSetupStatus | string | null;
    _count?: {
      blocks?: number;
      mediaPackages?: number;
      designReviewRequests?: number;
    } | null;
  }) {
    return Boolean(
      project.code ||
        project.declaredIndependentUnitCount !== null ||
        project.declaredSalesInventoryCount !== null ||
        (Array.isArray(project.plannedUnitTypes) &&
          project.plannedUnitTypes.length > 0) ||
        Number(project._count?.blocks || 0) > 0 ||
        Number(project._count?.mediaPackages || 0) > 0 ||
        Number(project._count?.designReviewRequests || 0) > 0,
    );
  }

  private isProjectVisibleInPortfolio(project: {
    code?: string | null;
    declaredIndependentUnitCount?: number | null;
    declaredSalesInventoryCount?: number | null;
    plannedUnitTypes?: unknown[] | null;
    setupStatus?: ProjectSetupStatus | string | null;
    _count?: {
      blocks?: number;
      mediaPackages?: number;
      designReviewRequests?: number;
    } | null;
  }) {
    return !this.isProjectSalesProject(project);
  }

  private isProjectVisibleInPool(project: {
    code?: string | null;
    declaredIndependentUnitCount?: number | null;
    declaredSalesInventoryCount?: number | null;
    plannedUnitTypes?: unknown[] | null;
    setupStatus?: ProjectSetupStatus | string | null;
    _count?: {
      blocks?: number;
      mediaPackages?: number;
      designReviewRequests?: number;
    } | null;
  }) {
    return (
      !this.isProjectSalesProject(project) ||
      project.setupStatus === ProjectSetupStatus.TAMAMLANDI
    );
  }

  private ensureProjectVisibleForPortfolioActions(project: {
    code?: string | null;
    declaredIndependentUnitCount?: number | null;
    declaredSalesInventoryCount?: number | null;
    plannedUnitTypes?: unknown[] | null;
    setupStatus?: ProjectSetupStatus | string | null;
  }) {
    if (this.isProjectVisibleInPortfolio(project)) return;

    throw new BadRequestException(
      'Proje satış modülündeki projeler tamamlanmadan portföyde yayınlanamaz veya paylaşılamaz.',
    );
  }

  private async getUnitWithProjectOrFail(id: string) {
    const unit = await this.prisma.unit.findUnique({
      where: { id },
      include: { project: true },
    });

    if (!unit) {
      throw new NotFoundException('Portföy bulunamadı.');
    }

    return unit;
  }

  private async getPoolUnitWithProjectOrFail(id: string) {
    const unit = await this.prisma.unit.findUnique({
      where: { id },
      include: {
        project: {
          include: {
            owner: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                role: true,
              },
            },
          },
        },
      },
    });

    if (!unit) {
      throw new NotFoundException('Portföy bulunamadı.');
    }

    if (!this.isProjectVisibleInPool(unit.project)) {
      throw new BadRequestException('Bu portfÃ¶y ÅŸu anda Havuz iÃ§inde aktif deÄŸil.');
    }

    if (!unit.isPoolVisible || unit.approvalStatus !== PortfolioApprovalStatus.HAVUZDA) {
      throw new BadRequestException('Bu portföy şu anda Havuz içinde aktif değil.');
    }

    return unit;
  }

  private getEphId(id: string) {
    const cleaned = String(id || '').replace(/-/g, '').slice(0, 6).toUpperCase();
    return `EPH-${cleaned || '000000'}`;
  }

  private async getOrCreateKontorWallet(userId: string) {
    let wallet = await this.prisma.kontorCuzdani.findUnique({
      where: {
        kullaniciId: userId,
      },
    });

    if (!wallet) {
      wallet = await this.prisma.kontorCuzdani.create({
        data: {
          kullaniciId: userId,
          bakiye: 0,
          toplamYukleme: 0,
          toplamHarcama: 0,
          toplamHediye: 0,
          aktifMi: true,
        },
      });
    }

    return wallet;
  }

  async getPoolWallet(user: CurrentUserPayload) {
    const wallet = await this.getOrCreateKontorWallet(user.id);

    return {
      ok: true,
      balance: wallet.bakiye,
      toplamYukleme: wallet.toplamYukleme,
      toplamHarcama: wallet.toplamHarcama,
      toplamHediye: wallet.toplamHediye,
      aktifMi: wallet.aktifMi,
    };
  }

  private async spendKontor(input: {
    userId: string;
    amount: number;
    islemTuru: KontorIslemTuru;
    aciklama: string;
    ilgiliKayitTuru: string;
    ilgiliKayitId: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      let wallet = await tx.kontorCuzdani.findUnique({
        where: {
          kullaniciId: input.userId,
        },
      });

      if (!wallet) {
        wallet = await tx.kontorCuzdani.create({
          data: {
            kullaniciId: input.userId,
            bakiye: 0,
            toplamYukleme: 0,
            toplamHarcama: 0,
            toplamHediye: 0,
            aktifMi: true,
          },
        });
      }

      if (!wallet.aktifMi) {
        throw new BadRequestException('Kontör cüzdanınız aktif değil.');
      }

      if (wallet.bakiye < input.amount) {
        throw new BadRequestException(
          `Bu işlem için ${input.amount} kontör gerekir. Mevcut bakiyeniz ${wallet.bakiye} kontör.`,
        );
      }

      const nextBalance = wallet.bakiye - input.amount;

      const updatedWallet = await tx.kontorCuzdani.update({
        where: {
          kullaniciId: input.userId,
        },
        data: {
          bakiye: nextBalance,
          toplamHarcama: {
            increment: input.amount,
          },
        },
      });

      const movement = await tx.kontorHareketi.create({
        data: {
          kullaniciId: input.userId,
          hareketTuru: KontorHareketTuru.HARCAMA,
          islemTuru: input.islemTuru,
          miktar: input.amount,
          oncekiBakiye: wallet.bakiye,
          sonrakiBakiye: nextBalance,
          aciklama: input.aciklama,
          ilgiliKayitTuru: input.ilgiliKayitTuru,
          ilgiliKayitId: input.ilgiliKayitId,
          olusturanId: input.userId,
        },
      });

      return {
        wallet: updatedWallet,
        movement,
      };
    });
  }

  private async createPoolNotification(input: {
    ownerId: string;
    title: string;
    message: string;
    unitId: string;
  }) {
    return this.prisma.networkNotification.create({
      data: {
        userId: input.ownerId,
        postId: null,
        title: input.title,
        message: input.message,
      },
    });
  }

  private hasApprovalDocument(unit: {
    tapuVerified: boolean;
    yetkiVerified: boolean;
  }) {
    return Boolean(unit.tapuVerified || unit.yetkiVerified);
  }

  private hasPortfolioPhoto(unit: {
    photoVerified?: boolean | null;
    images?: Array<unknown>;
  }) {
    return Boolean(unit.photoVerified || (Array.isArray(unit.images) && unit.images.length > 0));
  }

  private hasPortfolioLocation(unit: {
    project?: {
      city?: string | null;
      district?: string | null;
      address?: string | null;
      latitude?: number | string | null;
      longitude?: number | string | null;
    } | null;
  }) {
    const project = unit.project;
    if (!project) return false;

    const hasCoordinates = Boolean(Number(project.latitude || 0) && Number(project.longitude || 0));
    const hasTextLocation = Boolean(project.city && project.district && project.address);

    return hasCoordinates || hasTextLocation;
  }

  private calculateUnitQualityScore(unit: {
    tapuVerified: boolean;
    yetkiVerified: boolean;
    photoVerified?: boolean | null;
    approvalStatus?: PortfolioApprovalStatus | string | null;
    isPoolVisible?: boolean | null;
    images?: Array<unknown>;
    project?: {
      city?: string | null;
      district?: string | null;
      address?: string | null;
      latitude?: number | string | null;
      longitude?: number | string | null;
    } | null;
  }) {
    const hasPhoto = this.hasPortfolioPhoto(unit);
    const hasDocument = this.hasApprovalDocument(unit);
    const hasLocation = this.hasPortfolioLocation(unit);
    const isAuthorized =
      unit.approvalStatus === PortfolioApprovalStatus.ONAYLANDI ||
      unit.approvalStatus === PortfolioApprovalStatus.HAVUZDA ||
      Boolean(unit.yetkiVerified || unit.tapuVerified);
    const isPoolReady =
      unit.approvalStatus === PortfolioApprovalStatus.ONAYLANDI ||
      unit.approvalStatus === PortfolioApprovalStatus.HAVUZDA ||
      Boolean(unit.isPoolVisible);

    const photoScore = hasPhoto ? 25 : 0;
    const documentScore = hasDocument ? 25 : 0;
    const locationScore = hasLocation ? 20 : 0;
    const authorizationScore = isAuthorized ? 15 : 0;
    const poolReadinessScore = isPoolReady ? 15 : 0;

    const score = photoScore + documentScore + locationScore + authorizationScore + poolReadinessScore;

    return Math.max(0, Math.min(100, score));
  }

  private getQualityLevel(score: number) {
    if (score >= 90) return 'Mükemmel';
    if (score >= 75) return 'Çok İyi';
    if (score >= 60) return 'İyi';
    if (score >= 40) return 'Geliştirilmeli';
    return 'Riskli';
  }

  private getPortfolioQualitySnapshot(unit: any) {
    const qualityScore = this.calculateUnitQualityScore(unit);
    const hasPhoto = this.hasPortfolioPhoto(unit);
    const hasDocument = this.hasApprovalDocument(unit);
    const hasLocation = this.hasPortfolioLocation(unit);
    const isPoolReady =
      unit.approvalStatus === PortfolioApprovalStatus.ONAYLANDI ||
      unit.approvalStatus === PortfolioApprovalStatus.HAVUZDA ||
      Boolean(unit.isPoolVisible);

    return {
      id: unit.id,
      portfolioNo: this.getEphId(unit.id),
      title: unit.project?.name || 'EPH Portföy',
      city: unit.project?.city || null,
      district: unit.project?.district || null,
      status: unit.status,
      approvalStatus: unit.approvalStatus,
      isPoolVisible: Boolean(unit.isPoolVisible),
      qualityScore,
      qualityLevel: this.getQualityLevel(qualityScore),
      hasPhoto,
      hasDocument,
      hasLocation,
      isPoolReady,
      missing: {
        photo: !hasPhoto,
        document: !hasDocument,
        location: !hasLocation,
      },
    };
  }

  private safeDecodePortfolioMetadata(value: string) {
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }

  private parsePortfolioMetadataFeature(value: unknown) {
    const raw = String(value || '').trim();

    if (!raw.startsWith(PORTFOLIO_METADATA_PREFIX)) return null;

    const payload = raw.slice(PORTFOLIO_METADATA_PREFIX.length);
    const separatorIndex = payload.indexOf(':');

    if (separatorIndex < 1) return null;

    const key = this.safeDecodePortfolioMetadata(
      payload.slice(0, separatorIndex),
    ).trim();
    const metadataValue = this.safeDecodePortfolioMetadata(
      payload.slice(separatorIndex + 1),
    ).trim();

    if (!PORTFOLIO_METADATA_KEYS.has(key) || !metadataValue) return null;

    return {
      key,
      value: metadataValue.slice(0, 250),
    };
  }

  private normalizeFeatures(value?: unknown) {
    if (!Array.isArray(value)) return [];

    const allowed = new Set([
      'ASANSOR',
      'KAPALI_OTOPARK',
      'ACIK_OTOPARK',
      'GUVENLIK',
      'SITE_ICERISINDE',
      'JENERATOR',
      'YANGIN_MERDIVENI',
      'KAMERA_SISTEMI',
      'SU_DEPOSU',
      'HIDROFOR',
      'FIBER_INTERNET',
      'EBEVEYN_BANYOSU',
      'BALKON',
      'TERAS',
      'KILER',
      'GIYINME_ODASI',
      'ANKASTRE_MUTFAK',
      'AKILLI_EV',
      'SOMINE',
      'KLIMA',
      'ISI_YALITIMI',
      'SES_YALITIMI',
      'DENIZ_MANZARASI',
      'DOGA_MANZARASI',
      'SEHIR_MANZARASI',
      'YUKLEME_RAMPASI',
      'TIR_GIRISI',
      'VINC_SISTEMI',
      'SANAYI_ELEKTRIGI',
      'FORKLIFT_ALANI',
      'DEPOLAMA_ALANI',
      'YANGIN_SONDURME_SISTEMI',
      'YOLU_ACIK',
      'KADASTRO_YOLU',
      'ELEKTRIK_VAR',
      'SU_VAR',
      'SONDAJ_VAR',
      'CEVRILI',
      'KOSE_PARSEL',
      'IFRAZLI',
      'HISSELI',
    ]);

    return Array.from(
      new Set(
        value
          .map((item) => {
            const metadata = this.parsePortfolioMetadataFeature(item);

            if (metadata) {
              return `${PORTFOLIO_METADATA_PREFIX}${encodeURIComponent(
                metadata.key,
              )}:${encodeURIComponent(metadata.value)}`;
            }

            const normalized = String(item || '').trim().toUpperCase();
            return allowed.has(normalized) ? normalized : '';
          })
          .filter(Boolean),
      ),
    );
  }

  private getPortfolioMetadata(features?: unknown) {
    if (!Array.isArray(features)) return {} as Record<string, string>;

    return features.reduce<Record<string, string>>((result, item) => {
      const metadata = this.parsePortfolioMetadataFeature(item);

      if (metadata) {
        result[metadata.key] = metadata.value;
      }

      return result;
    }, {});
  }

  private hasPortfolioValue(value: unknown) {
    return String(value ?? '').trim().length > 0;
  }

  private hasPositivePortfolioNumber(value: unknown) {
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric > 0;
  }

  private validateRequiredPortfolioFields(data: Record<string, any>) {
    const type = String(data.type || '').trim().toUpperCase();
    const rule = REQUIRED_PORTFOLIO_RULES[type] || REQUIRED_PORTFOLIO_RULES.DAIRE;
    const metadata = this.getPortfolioMetadata(data.features);
    const missing: string[] = [];

    const hasField = (field: string) => {
      if (field === 'floor') {
        return (
          this.hasPortfolioValue(data.floorLabel) ||
          data.floor === 0 ||
          (typeof data.floor === 'number' && Number.isFinite(data.floor))
        );
      }

      if (['area', 'price', 'totalFloors', 'openArea', 'closedArea'].includes(field)) {
        const value = field in metadata ? metadata[field] : data[field];
        return this.hasPositivePortfolioNumber(value);
      }

      if (field in metadata) {
        return this.hasPortfolioValue(metadata[field]);
      }

      return this.hasPortfolioValue(data[field]);
    };

    for (const field of rule.fields) {
      if (!hasField(field)) {
        missing.push(PORTFOLIO_FIELD_LABELS[field] || field);
      }
    }

    for (const field of rule.specialFields || []) {
      if (!this.hasPortfolioValue(metadata[field])) {
        missing.push(PORTFOLIO_FIELD_LABELS[field] || field);
      }
    }

    if (missing.length > 0) {
      throw new BadRequestException(
        `Portföy kaydı başarısız.\nEksik zorunlu alanlar:\n${missing
          .map((label) => `• ${label}`)
          .join('\n')}`,
      );
    }
  }

  private cleanText(value?: string | null) {
    const text = String(value || '').trim();
    return text || undefined;
  }

  private normalizePhone(value?: string | null) {
    const text = String(value || '').trim();
    return text || undefined;
  }

  private normalizeOptionalNumber(value?: number | string | null) {
    if (value === null || value === undefined || value === '') return undefined;

    if (typeof value === 'number') {
      return Number.isFinite(value) && value > 0 ? value : undefined;
    }

    const normalized = String(value).replace(/[^0-9]/g, '');
    if (!normalized) return undefined;

    const numeric = Number(normalized);
    return Number.isFinite(numeric) && numeric > 0 ? numeric : undefined;
  }

  private isLandUnitType(type?: UnitType | string | null) {
    const normalized = String(type || '')
      .trim()
      .toLocaleUpperCase('tr-TR')
      .replaceAll('İ', 'I')
      .replaceAll('Ğ', 'G')
      .replaceAll('Ü', 'U')
      .replaceAll('Ş', 'S')
      .replaceAll('Ö', 'O')
      .replaceAll('Ç', 'C');

    return [
      'ARSA',
      'ARAZI',
      'ARAZİ',
      'TARLA',
      'BAG',
      'BAĞ',
      'BAHCE',
      'BAHÇE',
      'ZEYTINLIK',
      'ZEYTİNLİK',
      'CIFTLIK',
      'ÇIFTLIK',
      'IMARLI_ARSA',
      'İMARLI_ARSA',
      'KONUT_ARSASI',
      'VILLA_ARSASI',
      'VİLLA_ARSASI',
      'TICARI_ARSA',
      'TİCARİ_ARSA',
      'SANAYI_ARSASI',
      'SANAYİ_ARSASI',
      'TURIZM_IMARLI_ARSA',
      'TURİZM_İMARLI_ARSA',
    ].some((keyword) => normalized.includes(keyword));
  }

  private normalizeAdaNo(value?: string | null) {
    const text = String(value || '').trim();
    if (!text) return undefined;

    if (!/^\d{1,6}$/.test(text)) {
      throw new BadRequestException('Ada No sadece rakamlardan oluşmalı ve en fazla 6 hane olmalıdır.');
    }

    return text;
  }

  private normalizeParselNo(value?: string | null) {
    const text = String(value || '').trim();
    if (!text) return undefined;

    if (!/^\d{1,4}$/.test(text)) {
      throw new BadRequestException('Parsel No sadece rakamlardan oluşmalı ve en fazla 4 hane olmalıdır.');
    }

    return text;
  }

  private validateAdaParselForUnit(input: {
    type?: UnitType | string | null;
    adaNo?: string | null;
    parselNo?: string | null;
  }) {
    const adaNo = this.normalizeAdaNo(input.adaNo);
    const parselNo = this.normalizeParselNo(input.parselNo);

    if (this.isLandUnitType(input.type)) {
      if (!adaNo) {
        throw new BadRequestException('Arsa, tarla ve arazi türlerinde Ada No zorunludur.');
      }

      if (!parselNo) {
        throw new BadRequestException('Arsa, tarla ve arazi türlerinde Parsel No zorunludur.');
      }
    }

    return { adaNo, parselNo };
  }

  private canSeeDoorAccessInfo(user: CurrentUserPayload, ownerId?: string | null) {
    return this.isSuperAdmin(user) || Boolean(ownerId && this.isOwner(user, ownerId));
  }

  private redactDoorAccessInfo<
    T extends {
      doorAccessInfo?: string | null;
      deedOwnerFullName?: string | null;
      deedOwnerPhone?: string | null;
      deedOwnerEmail?: string | null;
      project?: { ownerId?: string | null } | null;
    },
  >(user: CurrentUserPayload, unit: T): T {
    if (this.canSeeDoorAccessInfo(user, unit.project?.ownerId)) return unit;

    return {
      ...unit,
      doorAccessInfo: null,
      deedOwnerFullName: null,
      deedOwnerPhone: null,
      deedOwnerEmail: null,
    };
  }

  private splitFullName(fullName?: string | null) {
    const cleanName = this.cleanText(fullName);

    if (!cleanName) {
      return { firstName: 'Tapu Sahibi', lastName: 'Bilinmiyor' };
    }

    const parts = cleanName.split(/\s+/).filter(Boolean);

    if (parts.length === 1) {
      return { firstName: parts[0], lastName: 'Bilinmiyor' };
    }

    return {
      firstName: parts.slice(0, -1).join(' '),
      lastName: parts.slice(-1).join(' '),
    };
  }

  private async linkCustomerProperty(input: {
    customerId: string;
    unitId: string;
    relationType: CustomerPropertyRelation;
    notes?: string;
  }) {
    await this.prisma.customerProperty.upsert({
      where: {
        customerId_unitId_relationType: {
          customerId: input.customerId,
          unitId: input.unitId,
          relationType: input.relationType,
        },
      },
      update: {
        notes: input.notes || undefined,
      },
      create: {
        customerId: input.customerId,
        unitId: input.unitId,
        relationType: input.relationType,
        notes: input.notes || undefined,
      },
    });
  }

  private async syncDeedOwnerToCrm(input: {
    ownerId: string;
    unitId: string;
    project: {
      name?: string | null;
      city?: string | null;
      district?: string | null;
      address?: string | null;
    };
    unit: {
      type?: UnitType | string | null;
      status?: UnitStatus | string | null;
      price?: number | null;
      area?: number | null;
      deedOwnerFullName?: string | null;
      deedOwnerPhone?: string | null;
      deedOwnerEmail?: string | null;
    };
  }) {
    const fullName = this.cleanText(input.unit.deedOwnerFullName);
    const phone = this.normalizePhone(input.unit.deedOwnerPhone);
    const email = this.cleanText(input.unit.deedOwnerEmail);

    if (!fullName || (!phone && !email)) return;

    const { firstName, lastName } = this.splitFullName(fullName);
    const portfolioNo = `EPH-${input.unitId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase()}-${input.unitId.replace(/[^a-zA-Z0-9]/g, '').slice(-4).toUpperCase()}`;
    const location = [input.project.address, input.project.district, input.project.city]
      .filter(Boolean)
      .join(' / ');
    const note = [
      'Bu kişi, portföy girişi sırasında tapu sahibi olarak otomatik CRM kaydına işlendi.',
      `Bağlı Portföy: ${portfolioNo}`,
      `Portföy ID: ${input.unitId}`,
      input.project.name ? `Portföy/Proje: ${input.project.name}` : '',
      location ? `Konum: ${location}` : '',
      input.unit.type ? `Mülk Tipi: ${input.unit.type}` : '',
      input.unit.status ? `Durum: ${input.unit.status}` : '',
      input.unit.area ? `m²: ${input.unit.area}` : '',
      input.unit.price ? `Fiyat: ${input.unit.price}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    const existing = await this.prisma.customer.findFirst({
      where: {
        ownerId: input.ownerId,
        OR: [
          phone ? { phone } : undefined,
          email ? { email } : undefined,
        ].filter(Boolean) as any[],
      },
    });

    if (existing) {
      const existingTags = Array.isArray(existing.tags) ? existing.tags : [];
      const nextTags = Array.from(
        new Set([...existingTags, 'PORTFOY_TAPU_SAHIBI', `PORTFOY_${input.unitId}`]),
      );

      await this.prisma.customer.update({
        where: { id: existing.id },
        data: {
          firstName: existing.firstName || firstName,
          lastName: existing.lastName || lastName,
          phone: existing.phone || phone,
          email: existing.email || email,
          city: existing.city || input.project.city || undefined,
          interestedArea:
            existing.interestedArea ||
            [input.project.district, input.project.address].filter(Boolean).join(' / ') ||
            undefined,
          interestedType: existing.interestedType || String(input.unit.type || ''),
          source: existing.source || 'PORTFOY_TAPU_SAHIBI',
          notes: [existing.notes, note].filter(Boolean).join('\n\n---\n\n'),
          tags: nextTags,
          updatedAt: new Date(),
        },
      });

      await this.prisma.activity.create({
        data: {
          customerId: existing.id,
          userId: input.ownerId,
          type: ActivityType.NOT,
          note: `Tapu sahibi bilgisi portföy ile eşleştirildi. Portföy ID: ${input.unitId}`,
        },
      });

      await this.linkCustomerProperty({
        customerId: existing.id,
        unitId: input.unitId,
        relationType: CustomerPropertyRelation.TAPU_SAHIBI,
        notes: 'Portföy girişi sırasında tapu sahibi olarak eşleştirildi.',
      });

      return;
    }

    const customer = await this.prisma.customer.create({
      data: {
        ownerId: input.ownerId,
        firstName,
        lastName,
        phone,
        email,
        city: input.project.city || undefined,
        interestedArea:
          [input.project.district, input.project.address].filter(Boolean).join(' / ') ||
          undefined,
        interestedType: String(input.unit.type || '') || undefined,
        budget: input.unit.price || undefined,
        source: 'PORTFOY_TAPU_SAHIBI',
        status: CustomerStatus.YENI_LEAD,
        tags: ['PORTFOY_TAPU_SAHIBI', `PORTFOY_${input.unitId}`],
        notes: note,
      },
    });

    await this.prisma.activity.create({
      data: {
        customerId: customer.id,
        userId: input.ownerId,
        type: ActivityType.NOT,
        note: `Tapu sahibi portföy girişinden otomatik CRM kaydı olarak oluşturuldu. Portföy ID: ${input.unitId}`,
      },
    });

    await this.linkCustomerProperty({
      customerId: customer.id,
      unitId: input.unitId,
      relationType: CustomerPropertyRelation.TAPU_SAHIBI,
      notes: 'Portföy girişi sırasında tapu sahibi olarak otomatik oluşturuldu.',
    });
  }

  async create(
    user: CurrentUserPayload,
    projectId: string,
    data: CreateUnitPayload,
  ) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Proje bulunamadı.');
    }

    this.ensureCanManageUnit(user, project.ownerId);

    const normalizedFeatures = this.normalizeFeatures(data.features);

    this.validateRequiredPortfolioFields({
      ...data,
      features: normalizedFeatures,
    });

    const adaParsel = this.validateAdaParselForUnit({
      type: data.type,
      adaNo: data.adaNo,
      parselNo: data.parselNo,
    });

    const createdUnit = await this.prisma.unit.create({
      data: {
        type: data.type,
        floor: data.floor,
        floorLabel: data.floorLabel,
        totalFloors: data.totalFloors,
        priceCurrency: data.priceCurrency || 'TRY',
        number: this.cleanText(data.number),
        adaNo: adaParsel.adaNo,
        parselNo: adaParsel.parselNo,
        roomCount: data.roomCount,
        area: data.area,
        price: data.price,
        status: data.status || UnitStatus.SATILIK,
        description: data.description,
        deedOwnerFullName: this.cleanText(data.deedOwnerFullName),
        deedOwnerPhone: this.normalizePhone(data.deedOwnerPhone),
        deedOwnerEmail: this.cleanText(data.deedOwnerEmail),
        availableCreditAmount: this.normalizeOptionalNumber(data.availableCreditAmount),
        doorAccessInfo: this.cleanText(data.doorAccessInfo),
        features: normalizedFeatures,
        projectId,
        approvalStatus: PortfolioApprovalStatus.TASLAK,
        isPoolVisible: false,
      },
      include: unitInclude,
    });

    await this.syncDeedOwnerToCrm({
      ownerId: project.ownerId,
      unitId: createdUnit.id,
      project,
      unit: createdUnit,
    });

    return createdUnit;
  }

  async findOne(user: CurrentUserPayload, id: string) {
    const unit = await this.prisma.unit.findUnique({
      where: { id },
      include: {
        ...unitInclude,
        project: {
          select: {
            ...unitInclude.project.select,
            code: true,
            declaredIndependentUnitCount: true,
            declaredSalesInventoryCount: true,
            plannedUnitTypes: true,
            setupStatus: true,
            _count: {
              select: {
                blocks: true,
                mediaPackages: true,
                designReviewRequests: true,
              },
            },
          },
        },
      },
    });

    if (!unit) {
      throw new NotFoundException('Portföy bulunamadı.');
    }

    this.ensureCanViewUnit(user, unit.project.ownerId);

    if (!this.isProjectVisibleInPortfolio(unit.project)) {
      throw new NotFoundException('Portföy bulunamadı.');
    }

    return this.redactDoorAccessInfo(user, unit);
  }

  async findPortfolioApprovals(
    user: CurrentUserPayload,
    filters?: { status?: string },
  ) {
    this.ensureApprovalManager(user);

    const rawStatus = String(filters?.status || '').trim().toUpperCase();

    const approvalStatus =
      rawStatus && rawStatus !== 'ALL'
        ? (rawStatus as PortfolioApprovalStatus)
        : undefined;

    const approvalStatuses: PortfolioApprovalStatus[] = [
      PortfolioApprovalStatus.BELGE_BEKLENIYOR,
      PortfolioApprovalStatus.INCELEMEYE_GONDERILDI,
      PortfolioApprovalStatus.INCELEMEDE,
      PortfolioApprovalStatus.EKSIK_BILGI_BEKLENIYOR,
      PortfolioApprovalStatus.ONAYLANDI,
      PortfolioApprovalStatus.HAVUZDA,
      PortfolioApprovalStatus.REDDEDILDI,
    ];

    const units = await this.prisma.unit.findMany({
      where: {
        approvalStatus: approvalStatus || {
          in: approvalStatuses,
        },
        project: this.getPortfolioVisibleProjectWhere(),
      },
      include: unitInclude,
      orderBy: [
        { submittedForApprovalAt: 'desc' },
        { updatedAt: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    return units.map((unit) => this.redactDoorAccessInfo(user, unit));
  }

  async findByProject(
    user: CurrentUserPayload,
    projectId: string,
    filters?: { status?: UnitStatus; type?: UnitType },
  ) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        ownerId: true,
        code: true,
        declaredIndependentUnitCount: true,
        declaredSalesInventoryCount: true,
        plannedUnitTypes: true,
        setupStatus: true,
        _count: {
          select: {
            blocks: true,
            mediaPackages: true,
            designReviewRequests: true,
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Proje bulunamadı.');
    }

    this.ensureCanViewUnit(user, project.ownerId);

    if (!this.isProjectVisibleInPortfolio(project)) {
      throw new NotFoundException('Proje bulunamadı.');
    }

    const units = await this.prisma.unit.findMany({
      where: {
        projectId,
        status: filters?.status,
        type: filters?.type,
      },
      include: unitInclude,
      orderBy: [{ floor: 'asc' }, { number: 'asc' }],
    });

    return units.map((unit) => this.redactDoorAccessInfo(user, unit));
  }

  async findAll(
    user: CurrentUserPayload,
    filters?: {
      status?: UnitStatus;
      type?: UnitType;
      city?: string;
      isOffMarket?: boolean;
    },
  ) {
    const units = await this.prisma.unit.findMany({
      where: {
        ...this.getPrivateUnitWhere(user),
        status: filters?.status,
        type: filters?.type,
        isOffMarket: filters?.isOffMarket,
        project: {
          ...(this.isSuperAdmin(user) || this.isAdmin(user) || this.isModerator(user)
            ? {}
            : { ownerId: user.id }),
          ...this.getPortfolioVisibleProjectWhere(),
          isActive: true,
          city: filters?.city
            ? { contains: filters.city, mode: 'insensitive' }
            : undefined,
        },
      },
      include: unitInclude,
      orderBy: { createdAt: 'desc' },
    });

    return units.map((unit) => this.redactDoorAccessInfo(user, unit));
  }

  async findPool(
    user: CurrentUserPayload,
    filters?: {
      status?: UnitStatus;
      type?: UnitType;
      city?: string;
    },
  ) {
    const units = await this.prisma.unit.findMany({
      where: {
        isPoolVisible: true,
        approvalStatus: PortfolioApprovalStatus.HAVUZDA,
        status: filters?.status,
        type: filters?.type,
        project: {
          ...this.getPoolVisibleProjectWhere(),
          isActive: true,
          city: filters?.city
            ? { contains: filters.city, mode: 'insensitive' }
            : undefined,
        },
      },
      include: unitInclude,
      orderBy: { poolPublishedAt: 'desc' },
    });

    return units.map((unit) => this.redactDoorAccessInfo(user, unit));
  }

  async poolMessage(id: string, user: CurrentUserPayload, body?: PoolActionPayload) {
    const unit = await this.getPoolUnitWithProjectOrFail(id);

    if (this.isOwner(user, unit.project.ownerId)) {
      throw new BadRequestException('Kendi portföyünüz için Havuz mesajı başlatamazsınız.');
    }

    const ephId = this.getEphId(unit.id);
    const title = `Havuz Mesajı - ${ephId}`;
    const firstMessage =
      this.cleanText(body?.message) ||
      `Merhaba, ${ephId} numaralı Havuz portföyü hakkında bilgi almak istiyorum.`;

    const dedupWindowStart = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentCharge = await this.prisma.kontorHareketi.findFirst({
      where: {
        kullaniciId: user.id,
        hareketTuru: KontorHareketTuru.HARCAMA,
        islemTuru: KontorIslemTuru.HAVUZ_MESAJ,
        ilgiliKayitTuru: 'UNIT',
        ilgiliKayitId: unit.id,
        olusturulmaTarihi: { gte: dedupWindowStart },
      },
      orderBy: { olusturulmaTarihi: 'desc' },
    });

    let cost = 3;
    let spent = 0;
    let previousBalance: number;
    let remainingBalance: number;
    let responseMessage: string;

    if (recentCharge) {
      const wallet = await this.prisma.kontorCuzdani.findUnique({
        where: { kullaniciId: user.id },
      });
      previousBalance = wallet?.bakiye ?? 0;
      remainingBalance = wallet?.bakiye ?? 0;
      responseMessage = 'Bu Havuz ilanı için 24 saat içinde zaten kontör harcadınız, tekrar düşülmedi.';
    } else {
      const kontorResult = await this.spendKontor({
        userId: user.id,
        amount: 3,
        islemTuru: KontorIslemTuru.HAVUZ_MESAJ,
        aciklama: `${ephId} için Havuz mesajı başlatıldı.`,
        ilgiliKayitTuru: 'UNIT',
        ilgiliKayitId: unit.id,
      });
      spent = 3;
      previousBalance = kontorResult.movement.oncekiBakiye;
      remainingBalance = kontorResult.wallet.bakiye;
      responseMessage = 'Mesaj başlatıldı. 3 kontör harcandı.';
    }

    const conversation = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.conversation.findFirst({
        where: {
          postId: null,
          title,
          ConversationParticipant: {
            every: {
              userId: {
                in: [user.id, unit.project.ownerId],
              },
            },
          },
        },
        include: {
          ConversationParticipant: true,
        },
      });

      const activeConversation =
        existing && existing.ConversationParticipant.length === 2
          ? existing
          : await tx.conversation.create({
              data: {
                id: randomUUID(),
                postId: null,
                title,
                updatedAt: new Date(),
                ConversationParticipant: {
                  create: [
                    {
                      id: randomUUID(),
                      userId: user.id,
                    },
                    {
                      id: randomUUID(),
                      userId: unit.project.ownerId,
                    },
                  ],
                },
              },
              include: {
                ConversationParticipant: true,
              },
            });

      await tx.message.create({
        data: {
          id: randomUUID(),
          conversationId: activeConversation.id,
          senderId: user.id,
          body: firstMessage,
        },
      });

      await tx.conversation.update({
        where: {
          id: activeConversation.id,
        },
        data: {
          updatedAt: new Date(),
        },
      });

      return activeConversation;
    });

    await this.createPoolNotification({
      ownerId: unit.project.ownerId,
      unitId: unit.id,
      title: 'Havuz mesajı başlatıldı',
      message: `${ephId} numaralı portföyünüz için yeni bir Havuz mesajı var.`,
    });

    return {
      ok: true,
      message: responseMessage,
      cost,
      spent,
      previousBalance,
      remainingBalance,
      balance: remainingBalance,
      conversationId: conversation.id,
      url: `/messages/${conversation.id}`,
    };
  }

  async poolInterest(id: string, user: CurrentUserPayload, body?: PoolActionPayload) {
    const unit = await this.getPoolUnitWithProjectOrFail(id);

    if (this.isOwner(user, unit.project.ownerId)) {
      throw new BadRequestException('Kendi portföyünüz için ilgileniyorum bildirimi gönderemezsiniz.');
    }

    const ephId = this.getEphId(unit.id);
    const scoreText = Number(body?.matchScore || 0) > 0 ? ` Uyum: %${Number(body?.matchScore)}.` : '';
    const noteText = this.cleanText(body?.note) ? ` Not: ${this.cleanText(body?.note)}.` : '';

    const kontorResult = await this.spendKontor({
      userId: user.id,
      amount: 10,
      islemTuru: KontorIslemTuru.HAVUZ_ILGILENIYORUM,
      aciklama: `${ephId} için ilgileniyorum bildirimi gönderildi.`,
      ilgiliKayitTuru: 'UNIT',
      ilgiliKayitId: unit.id,
    });

    await this.createPoolNotification({
      ownerId: unit.project.ownerId,
      unitId: unit.id,
      title: 'Portföyünüzle ilgilenen var',
      message: `${ephId} numaralı Havuz portföyünüz için ilgileniyorum bildirimi alındı.${scoreText}${noteText}`,
    });

    return {
      ok: true,
      message: 'İlgileniyorum bildirimi gönderildi. 10 kontör harcandı.',
      cost: 10,
      spent: 10,
      previousBalance: kontorResult.movement.oncekiBakiye,
      remainingBalance: kontorResult.wallet.bakiye,
      balance: kontorResult.wallet.bakiye,
    };
  }

  async poolMatchingCustomer(id: string, user: CurrentUserPayload, body?: PoolActionPayload) {
    const unit = await this.getPoolUnitWithProjectOrFail(id);

    if (this.isOwner(user, unit.project.ownerId)) {
      throw new BadRequestException('Kendi portföyünüz için eşleşen müşterim var bildirimi gönderemezsiniz.');
    }

    const ephId = this.getEphId(unit.id);
    const scoreText = Number(body?.matchScore || 0) > 0 ? ` Uyum: %${Number(body?.matchScore)}.` : '';
    const noteText = this.cleanText(body?.note) ? ` Not: ${this.cleanText(body?.note)}.` : '';

    const kontorResult = await this.spendKontor({
      userId: user.id,
      amount: 20,
      islemTuru: KontorIslemTuru.HAVUZ_ESLESEN_MUSTERIM_VAR,
      aciklama: `${ephId} için eşleşen müşterim var bildirimi gönderildi.`,
      ilgiliKayitTuru: 'UNIT',
      ilgiliKayitId: unit.id,
    });

    await this.createPoolNotification({
      ownerId: unit.project.ownerId,
      unitId: unit.id,
      title: 'Eşleşen müşteri bildirimi',
      message: `${ephId} numaralı Havuz portföyünüz için eşleşen müşterim var bildirimi alındı.${scoreText}${noteText}`,
    });

    return {
      ok: true,
      message: 'Eşleşen müşterim var bildirimi gönderildi. 20 kontör harcandı.',
      cost: 20,
      spent: 20,
      previousBalance: kontorResult.movement.oncekiBakiye,
      remainingBalance: kontorResult.wallet.bakiye,
      balance: kontorResult.wallet.bakiye,
    };
  }

  async createPoolShareLink(id: string, user: CurrentUserPayload) {
    const unit = await this.getPoolUnitWithProjectOrFail(id);

    const shareLink = await this.prisma.poolShareLink.create({
      data: {
        token: randomUUID(),
        unitId: unit.id,
        sharedById: user.id,
      },
    });

    return {
      token: shareLink.token,
      url: `${PLATFORM_URL}/paylasim/${shareLink.token}`,
    };
  }

  async getPoolShareByToken(token: string) {
    const shareLink = await this.prisma.poolShareLink.findUnique({
      where: { token },
    });

    if (!shareLink) {
      throw new NotFoundException('Paylaşım bağlantısı bulunamadı.');
    }

    const unit = await this.prisma.unit.findUnique({
      where: { id: shareLink.unitId },
      include: {
        ...unitInclude,
        project: {
          select: {
            ...unitInclude.project.select,
            code: true,
            declaredIndependentUnitCount: true,
            declaredSalesInventoryCount: true,
            plannedUnitTypes: true,
            setupStatus: true,
          },
        },
      },
    });

    if (
      !unit ||
      !unit.isPoolVisible ||
      unit.approvalStatus !== PortfolioApprovalStatus.HAVUZDA ||
      !this.isProjectVisibleInPool(unit.project)
    ) {
      throw new NotFoundException('Bu portföy artık Havuz içinde aktif değil.');
    }

    const sharedBy = await this.prisma.user.findUnique({
      where: { id: shareLink.sharedById },
      select: { firstName: true, lastName: true, phone: true },
    });

    await this.prisma.poolShareLink.update({
      where: { id: shareLink.id },
      data: { viewCount: { increment: 1 } },
    });

    return {
      ephId: this.getEphId(unit.id),
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
      price: unit.price,
      priceCurrency: unit.priceCurrency,
      description: unit.description,
      images: unit.images,
      isVerified: unit.isVerified,
      tapuVerified: unit.tapuVerified,
      photoVerified: unit.photoVerified,
      yetkiVerified: unit.yetkiVerified,
      project: {
        name: unit.project?.name || null,
        city: unit.project?.city || null,
        district: unit.project?.district || null,
      },
      sharedBy: sharedBy
        ? {
            fullName:
              this.cleanText(`${sharedBy.firstName} ${sharedBy.lastName}`) ||
              'EPH Yetkilisi',
            phone: this.normalizePhone(sharedBy.phone) || null,
          }
        : null,
    };
  }

  async createPortfolioShareLink(id: string, user: CurrentUserPayload) {
    const unit = await this.getUnitWithProjectOrFail(id);

    this.ensureCanManageUnit(user, unit.project.ownerId);
    this.ensureProjectVisibleForPortfolioActions(unit.project);

    const shareLink = await this.prisma.poolShareLink.create({
      data: {
        token: randomUUID(),
        unitId: unit.id,
        sharedById: user.id,
      },
    });

    return {
      token: shareLink.token,
      url: `${PLATFORM_URL}/portfoy-paylasim/${shareLink.token}`,
    };
  }

  async getPortfolioShareByToken(token: string) {
    const shareLink = await this.prisma.poolShareLink.findUnique({
      where: { token },
    });

    if (!shareLink) {
      throw new NotFoundException('Paylaşım bağlantısı bulunamadı.');
    }

    const unit = await this.prisma.unit.findUnique({
      where: { id: shareLink.unitId },
      include: {
        ...unitInclude,
        project: {
          select: {
            ...unitInclude.project.select,
            code: true,
            declaredIndependentUnitCount: true,
            declaredSalesInventoryCount: true,
            plannedUnitTypes: true,
            setupStatus: true,
          },
        },
      },
    });

    if (!unit) {
      throw new NotFoundException('Bu portföy artık mevcut değil.');
    }

    if (!this.isProjectVisibleInPortfolio(unit.project)) {
      throw new NotFoundException('Bu portföy artık mevcut değil.');
    }

    const sharedBy = await this.prisma.user.findUnique({
      where: { id: shareLink.sharedById },
      select: { firstName: true, lastName: true, phone: true },
    });

    await this.prisma.poolShareLink.update({
      where: { id: shareLink.id },
      data: { viewCount: { increment: 1 } },
    });

    return {
      ephId: this.getEphId(unit.id),
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
      price: unit.price,
      priceCurrency: unit.priceCurrency,
      description: unit.description,
      images: unit.images,
      isVerified: unit.isVerified,
      tapuVerified: unit.tapuVerified,
      photoVerified: unit.photoVerified,
      yetkiVerified: unit.yetkiVerified,
      project: {
        name: unit.project?.name || null,
        city: unit.project?.city || null,
        district: unit.project?.district || null,
      },
      sharedBy: sharedBy
        ? {
            fullName:
              this.cleanText(`${sharedBy.firstName} ${sharedBy.lastName}`) ||
              'EPH Yetkilisi',
            phone: this.normalizePhone(sharedBy.phone) || null,
          }
        : null,
    };
  }

  async submitApproval(id: string, user: CurrentUserPayload) {
    const unit = await this.getUnitWithProjectOrFail(id);

    this.ensureCanManageUnit(user, unit.project.ownerId);
    this.ensurePortfolioContentEditable(user, unit);
    this.ensureProjectVisibleForPortfolioActions(unit.project);

    if (!this.hasApprovalDocument(unit)) {
      return this.prisma.unit.update({
        where: { id },
        data: {
          approvalStatus: PortfolioApprovalStatus.BELGE_BEKLENIYOR,
          isPoolVisible: false,
          approvalNote:
            'Havuza gönderebilmek için yetki belgesi, tapu veya ilgili doğrulama evrakı gereklidir.',
        },
        include: unitInclude,
      });
    }

    return this.prisma.unit.update({
      where: { id },
      data: {
        approvalStatus: PortfolioApprovalStatus.INCELEMEYE_GONDERILDI,
        submittedForApprovalAt: new Date(),
        rejectedAt: null,
        approvalNote: null,
        isPoolVisible: false,
      },
      include: unitInclude,
    });
  }

  async markReviewing(
    id: string,
    user: CurrentUserPayload,
    body?: { note?: string },
  ) {
    this.ensureApprovalManager(user);

    await this.getUnitWithProjectOrFail(id);

    return this.prisma.unit.update({
      where: { id },
      data: {
        approvalStatus: PortfolioApprovalStatus.INCELEMEDE,
        approvalNote: body?.note || 'Portföy incelemeye alındı.',
        isPoolVisible: false,
      },
      include: unitInclude,
    });
  }

  async requestMissingInfo(
    id: string,
    user: CurrentUserPayload,
    body?: { note?: string },
  ) {
    this.ensureApprovalManager(user);

    await this.getUnitWithProjectOrFail(id);

    return this.prisma.unit.update({
      where: { id },
      data: {
        approvalStatus: PortfolioApprovalStatus.EKSIK_BILGI_BEKLENIYOR,
        approvalNote:
          body?.note ||
          'EPH inceleme ekibi bu portföy için ek bilgi veya belge bekliyor.',
        isPoolVisible: false,
        poolRemovedAt: new Date(),
      },
      include: unitInclude,
    });
  }

  async approve(id: string, user: CurrentUserPayload, body?: { note?: string }) {
    this.ensureApprovalManager(user);

    const unit = await this.getUnitWithProjectOrFail(id);

    if (!this.hasApprovalDocument(unit)) {
      throw new BadRequestException(
        'Bu portföyde onay için yeterli doğrulama evrakı bulunmuyor.',
      );
    }

    const approvableStatuses = new Set<PortfolioApprovalStatus>([
      PortfolioApprovalStatus.INCELEMEYE_GONDERILDI,
      PortfolioApprovalStatus.INCELEMEDE,
    ]);

    if (!approvableStatuses.has(unit.approvalStatus)) {
      throw new BadRequestException(
        'Yalnızca kullanıcı tarafından incelemeye gönderilmiş portföyler onaylanabilir.',
      );
    }

    return this.prisma.unit.update({
      where: { id },
      data: {
        approvalStatus: PortfolioApprovalStatus.HAVUZDA,
        approvedAt: new Date(),
        rejectedAt: null,
        approvalNote:
          body?.note ||
          'Portföy onaylandı ve otomatik olarak havuzda yayınlandı.',
        isVerified: true,
        verifiedAt: new Date(),
        isPoolVisible: true,
        poolPublishedAt: new Date(),
        poolRemovedAt: null,
      },
      include: unitInclude,
    });
  }

  async reject(id: string, user: CurrentUserPayload, body?: { note?: string }) {
    this.ensureApprovalManager(user);

    await this.getUnitWithProjectOrFail(id);

    return this.prisma.unit.update({
      where: { id },
      data: {
        approvalStatus: PortfolioApprovalStatus.REDDEDILDI,
        rejectedAt: new Date(),
        approvalNote: body?.note || 'Portföy doğrulama sürecinde reddedildi.',
        isPoolVisible: false,
        poolRemovedAt: new Date(),
      },
      include: unitInclude,
    });
  }

  async sendToPool(id: string, user: CurrentUserPayload) {
    const unit = await this.getUnitWithProjectOrFail(id);

    this.ensureApprovalManager(user);

    this.ensureProjectVisibleForPortfolioActions(unit.project);

    if (unit.approvalStatus !== PortfolioApprovalStatus.ONAYLANDI) {
      throw new BadRequestException(
        'Sadece onaylanmış portföyler havuza gönderilebilir.',
      );
    }

    return this.prisma.unit.update({
      where: { id },
      data: {
        approvalStatus: PortfolioApprovalStatus.HAVUZDA,
        isPoolVisible: true,
        poolPublishedAt: new Date(),
        poolRemovedAt: null,
      },
      include: unitInclude,
    });
  }

  async removeFromPool(id: string, user: CurrentUserPayload) {
    const unit = await this.getUnitWithProjectOrFail(id);

    if (!this.isOwner(user, unit.project.ownerId)) {
      throw new ForbiddenException(
        'Bu ilanı yalnızca portföy sahibi geri çekebilir.',
      );
    }

    if (!unit.isPoolVisible) {
      throw new BadRequestException('Bu portföy zaten havuzda değil.');
    }

    return this.prisma.unit.update({
      where: { id },
      data: {
        approvalStatus: PortfolioApprovalStatus.TASLAK,
        isPoolVisible: false,
        approvedAt: null,
        isVerified: false,
        verifiedAt: null,
        poolRemovedAt: new Date(),
        approvalNote:
          'Portföy havuzdan kaldırıldı. Yeniden yayın için bilgileri kontrol edip admin incelemesine gönderin.',
      },
      include: unitInclude,
    });
  }

  async updateStatus(id: string, user: CurrentUserPayload, status: UnitStatus) {
    const unit = await this.getUnitWithProjectOrFail(id);

    this.ensureCanManageUnit(user, unit.project.ownerId);
    this.ensurePortfolioContentEditable(user, unit);
    this.ensureProjectVisibleForPortfolioActions(unit.project);

    return this.prisma.unit.update({
      where: { id },
      data: { status },
      include: unitInclude,
    });
  }

  async update(id: string, user: CurrentUserPayload, data: any) {
    const unit = await this.getUnitWithProjectOrFail(id);

    this.ensureCanManageUnit(user, unit.project.ownerId);
    this.ensurePortfolioContentEditable(user, unit);

    const protectedFields = [
      'approvalStatus',
      'isPoolVisible',
      'submittedForApprovalAt',
      'approvedAt',
      'rejectedAt',
      'approvalNote',
      'poolPublishedAt',
      'poolRemovedAt',
      'isVerified',
      'verifiedAt',
    ];

    for (const field of protectedFields) {
      if (field in data && !this.isSuperAdmin(user)) {
        delete data[field];
      }
    }

    const { availableCreditAmount, doorAccessInfo, ...safeData } = data;
    const nextType = 'type' in data ? data.type : unit.type;
    const nextAdaNo = 'adaNo' in data ? data.adaNo : (unit as any).adaNo;
    const nextParselNo = 'parselNo' in data ? data.parselNo : (unit as any).parselNo;
    const nextFeatures =
      'features' in data
        ? this.normalizeFeatures(data.features)
        : this.normalizeFeatures(unit.features);

    this.validateRequiredPortfolioFields({
      ...unit,
      ...data,
      type: nextType,
      adaNo: nextAdaNo,
      parselNo: nextParselNo,
      features: nextFeatures,
    });

    const adaParsel = this.validateAdaParselForUnit({
      type: nextType,
      adaNo: nextAdaNo,
      parselNo: nextParselNo,
    });

    const updatedUnit = await this.prisma.unit.update({
      where: { id },
      data: {
        ...safeData,
        adaNo: adaParsel.adaNo,
        parselNo: adaParsel.parselNo,
        deedOwnerFullName:
          'deedOwnerFullName' in data
            ? this.cleanText(data.deedOwnerFullName)
            : undefined,
        deedOwnerPhone:
          'deedOwnerPhone' in data
            ? this.normalizePhone(data.deedOwnerPhone)
            : undefined,
        deedOwnerEmail:
          'deedOwnerEmail' in data
            ? this.cleanText(data.deedOwnerEmail)
            : undefined,
        availableCreditAmount:
          'availableCreditAmount' in data
            ? this.normalizeOptionalNumber(availableCreditAmount)
            : undefined,
        doorAccessInfo:
          'doorAccessInfo' in data
            ? this.cleanText(doorAccessInfo)
            : undefined,
        features:
          'features' in data
            ? nextFeatures
            : undefined,
      },
      include: unitInclude,
    });

    await this.syncDeedOwnerToCrm({
      ownerId: unit.project.ownerId,
      unitId: updatedUnit.id,
      project: unit.project,
      unit: updatedUnit,
    });

    return updatedUnit;
  }

  async verifyUnit(
    id: string,
    data: {
      tapuVerified?: boolean;
      photoVerified?: boolean;
      yetkiVerified?: boolean;
      isOffMarket?: boolean;
    },
  ) {
    const unit = await this.prisma.unit.findUnique({
      where: { id },
    });

    if (!unit) {
      throw new NotFoundException('Portföy bulunamadı.');
    }

    const isVerified = Boolean(
      data.tapuVerified || data.photoVerified || data.yetkiVerified,
    );

    const verifiedAt = isVerified ? new Date() : null;

    return this.prisma.unit.update({
      where: { id },
      data: {
        ...data,
        isVerified,
        verifiedAt,
      },
      include: unitInclude,
    });
  }

  async getQualitySummary(user: CurrentUserPayload) {
    const units = await this.prisma.unit.findMany({
      where: {
        ...this.getPrivateUnitWhere(user),
        project: {
          ...(this.isSuperAdmin(user) || this.isAdmin(user) || this.isModerator(user)
            ? {}
            : { ownerId: user.id }),
          ...this.getPortfolioVisibleProjectWhere(),
          isActive: true,
        },
      },
      include: unitInclude,
      orderBy: { createdAt: 'desc' },
    });

    const snapshots = units.map((unit) => this.getPortfolioQualitySnapshot(unit));
    const totalPortfolioCount = snapshots.length;
    const averageQualityScore = totalPortfolioCount
      ? Math.round(
          snapshots.reduce((sum, item) => sum + item.qualityScore, 0) /
            totalPortfolioCount,
        )
      : 0;

    const qualityPortfolioCount = snapshots.filter((item) => item.qualityScore >= 75).length;
    const riskyPortfolioCount = snapshots.filter((item) => item.qualityScore < 40).length;
    const poolReadyCount = snapshots.filter((item) => item.isPoolReady).length;
    const missingPhotoCount = snapshots.filter((item) => item.missing.photo).length;
    const missingDocumentCount = snapshots.filter((item) => item.missing.document).length;
    const missingLocationCount = snapshots.filter((item) => item.missing.location).length;
    const unauthorizedPortfolioCount = snapshots.filter(
      (item) =>
        item.approvalStatus !== PortfolioApprovalStatus.ONAYLANDI &&
        item.approvalStatus !== PortfolioApprovalStatus.HAVUZDA,
    ).length;

    const byQualityDesc = [...snapshots].sort((a, b) => b.qualityScore - a.qualityScore);
    const byQualityAsc = [...snapshots].sort((a, b) => a.qualityScore - b.qualityScore);

    return {
      totalPortfolioCount,
      qualityPortfolioCount,
      riskyPortfolioCount,
      poolReadyCount,
      averageQualityScore,
      missingPhotoCount,
      missingDocumentCount,
      missingLocationCount,
      unauthorizedPortfolioCount,
      lists: {
        topQuality: byQualityDesc.slice(0, 5),
        risky: byQualityAsc.filter((item) => item.qualityScore < 60).slice(0, 5),
        missingPhotos: snapshots.filter((item) => item.missing.photo).slice(0, 5),
        missingDocuments: snapshots.filter((item) => item.missing.document).slice(0, 5),
        missingLocations: snapshots.filter((item) => item.missing.location).slice(0, 5),
        poolReady: snapshots.filter((item) => item.isPoolReady).slice(0, 5),
      },
    };
  }

  async remove(id: string, user: CurrentUserPayload) {
    const unit = await this.getUnitWithProjectOrFail(id);

    this.ensureCanManageUnit(user, unit.project.ownerId);
    this.ensurePortfolioContentEditable(user, unit);

    return this.prisma.unit.delete({
      where: { id },
    });
  }
}
