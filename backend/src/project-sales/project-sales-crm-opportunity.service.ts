import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CustomerPurchaseIntent,
  CustomerRole,
  Role,
  UnitStatus,
  UnitType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type PropertyGroup =
  | 'RESIDENTIAL'
  | 'LAND'
  | 'COMMERCIAL'
  | 'INDUSTRIAL'
  | 'TOURISM'
  | 'PROJECT';

type ProjectLocation = {
  city: string;
  district: string;
  neighborhood: string | null;
};

type InterestForMatching = {
  statuses: UnitStatus[];
  purchaseIntent: CustomerPurchaseIntent;
};

type PriceMatch = {
  eligible: boolean;
  score: number;
  reasons: string[];
  details: {
    declaredMaxBudget: number | null;
    buyerNegotiationCeiling: number | null;
    sellerAskingPrice: number;
    sellerNegotiationFloor: number;
    overlapAmount: number | null;
    tolerancePercent: number;
    withinDeclaredBudget: boolean;
  };
};

const MARKETABLE_STATUSES = new Set<UnitStatus>([
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
  UnitStatus.GUNLUK_KIRALIK,
  UnitStatus.KAT_KARSILIGI,
]);

const LAND_TYPES = new Set<UnitType>([
  UnitType.ARSA,
  UnitType.KONUT_ARSASI,
  UnitType.VILLA_ARSASI,
  UnitType.TICARI_ARSA,
  UnitType.SANAYI_ARSASI,
  UnitType.TURIZM_IMARLI_ARSA,
  UnitType.TARLA,
  UnitType.BAHCE,
  UnitType.BAG,
  UnitType.ZEYTINLIK,
  UnitType.MEYVE_BAHCESI,
  UnitType.SERA,
  UnitType.BESI_CIFTLIGI,
  UnitType.ORMAN_ARAZISI,
  UnitType.ADA,
]);

const COMMERCIAL_TYPES = new Set<UnitType>([
  UnitType.DUKKAN_MAGAZA,
  UnitType.OFIS_BURO,
  UnitType.TICARI_ISLETME,
  UnitType.HOME_OFFICE,
  UnitType.PLAZA_KATI,
  UnitType.SHOWROOM,
  UnitType.IS_HANI_KATI,
  UnitType.IS_MERKEZI,
  UnitType.PAYLASIMLI_OFIS,
  UnitType.KOMPLE_BINA,
]);

const INDUSTRIAL_TYPES = new Set<UnitType>([
  UnitType.FABRIKA_URETIM_TESISI,
  UnitType.ATOLYE,
  UnitType.DEPO_ANTREPO,
  UnitType.LOJISTIK_MERKEZI,
  UnitType.FABRIKA_ATOLYE,
  UnitType.URETIM_TESISI,
  UnitType.AKARYAKIT_ISTASYONU,
]);

const TOURISM_TYPES = new Set<UnitType>([
  UnitType.OTEL_PANSIYON,
  UnitType.APART_OTEL,
  UnitType.OTEL,
  UnitType.BUTIK_OTEL,
  UnitType.MOTEL,
  UnitType.PANSIYON,
  UnitType.KAMP_YERI,
  UnitType.TATIL_KOYU,
  UnitType.RESTORAN,
  UnitType.KAFE,
  UnitType.DUGUN_SALONU,
  UnitType.SPOR_TESISI,
  UnitType.OKUL_EGITIM_TESISI,
  UnitType.HASTANE_SAGLIK_TESISI,
  UnitType.TURISTIK_TESIS,
]);

const PROJECT_TYPES = new Set<UnitType>([
  UnitType.KONUT_PROJESI,
  UnitType.VILLA_PROJESI,
  UnitType.REZIDANS_PROJESI,
  UnitType.KARMA_PROJE,
  UnitType.AVM_PROJESI,
  UnitType.TICARI_PROJE,
]);

const MIN_OPPORTUNITY_SCORE = 40;
const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;

@Injectable()
export class ProjectSalesCrmOpportunityService {
  constructor(private readonly prisma: PrismaService) {}

  async getProjectOpportunities(
    projectId: string,
    userId: string,
    userRole: Role,
    requestedLimit?: unknown,
  ) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        ownerId: true,
        name: true,
        code: true,
        city: true,
        district: true,
        neighborhood: true,
        isActive: true,
      },
    });

    if (!project) {
      throw new NotFoundException('Proje bulunamadı.');
    }

    if (project.ownerId !== userId && userRole !== Role.SUPER_ADMIN) {
      throw new ForbiddenException('Bu projenin müşteri fırsatlarına erişim yetkiniz yok.');
    }

    const [units, interests] = await Promise.all([
      this.prisma.unit.findMany({
        where: {
          projectId,
          isSalesInventory: true,
          status: {
            in: Array.from(MARKETABLE_STATUSES),
          },
        },
        select: {
          id: true,
          blockId: true,
          floorId: true,
          inventoryCode: true,
          type: true,
          status: true,
          floor: true,
          floorLabel: true,
          number: true,
          roomCount: true,
          conceptLabel: true,
          area: true,
          netArea: true,
          grossArea: true,
          facades: true,
          price: true,
          priceCurrency: true,
          features: true,
          deliveryDate: true,
          updatedAt: true,
          block: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
          projectFloor: {
            select: {
              id: true,
              level: true,
              label: true,
            },
          },
          images: {
            where: { isCover: true },
            select: { url: true },
            take: 1,
          },
        },
        orderBy: [
          { inventorySortOrder: 'asc' },
          { createdAt: 'asc' },
        ],
      }),
      this.prisma.customerInterest.findMany({
        where: {
          isActive: true,
          customer: {
            ownerId: project.ownerId,
            roles: {
              has: CustomerRole.ALICI,
            },
          },
        },
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              email: true,
              company: true,
              status: true,
            },
          },
        },
        orderBy: [
          { priority: 'desc' },
          { updatedAt: 'desc' },
        ],
      }),
    ]);

    const location: ProjectLocation = {
      city: project.city,
      district: project.district,
      neighborhood: project.neighborhood,
    };

    const opportunities = [] as Array<{
      unitId: string;
      customerId: string;
      interestId: string;
      matchScore: number;
      matchLevel: string;
      matchReasons: string[];
      propertyGroup: PropertyGroup;
      priceMatch: PriceMatch['details'];
      customer: {
        id: string;
        fullName: string;
        phone: string | null;
        email: string | null;
        company: string | null;
        status: string;
      };
      interest: {
        id: string;
        title: string | null;
        priority: string;
        purchaseIntent: CustomerPurchaseIntent;
        city: string | null;
        district: string | null;
        neighborhood: string | null;
        minBudget: number | null;
        maxBudget: number | null;
        priceCurrency: string;
      };
      unit: {
        id: string;
        inventoryCode: string | null;
        type: UnitType;
        status: UnitStatus;
        blockCode: string | null;
        blockName: string | null;
        floorLabel: string | null;
        number: string | null;
        roomCount: string | null;
        conceptLabel: string | null;
        area: number | null;
        netArea: number | null;
        grossArea: number | null;
        price: number;
        priceCurrency: string;
        coverImage: string | null;
      };
      matchPolicy: {
        version: 'PROJECT_CRM_RADAR_V1';
        priceTolerancePercent: number;
        cityHardFilter: true;
        propertyTypeHardFilter: true;
        statusHardFilter: true;
        currencyHardFilter: true;
      };
    }>;

    for (const interest of interests) {
      if (!this.passesCityFilter(interest.city, project.city)) {
        continue;
      }

      const locationScore = this.getLocationScore(interest, location);

      for (const unit of units) {
        if (Number(unit.price) <= 0) {
          continue;
        }

        if (!this.passesPropertyTypeFilter(interest.propertyTypes, unit.type)) {
          continue;
        }

        if (!this.passesStatusFilter(interest, unit.status)) {
          continue;
        }

        const unitCurrency = this.normalizeCurrency(unit.priceCurrency || 'TRY');
        const interestCurrency = this.normalizeCurrency(
          interest.priceCurrency || 'TRY',
        );

        if (unitCurrency !== interestCurrency) {
          continue;
        }

        const propertyGroup = this.getPropertyGroup(unit.type);
        const priceTolerance = this.getPriceTolerance(propertyGroup);
        const priceMatch = this.calculatePriceMatch({
          unitPrice: Number(unit.price),
          minBudget: interest.minBudget,
          maxBudget: interest.maxBudget,
          tolerance: priceTolerance,
        });

        if (!priceMatch.eligible) {
          continue;
        }

        const secondary = this.calculateSecondaryScore(
          unit,
          interest,
          propertyGroup,
        );
        const matchScore = Math.max(
          0,
          Math.min(
            100,
            Math.round(priceMatch.score + locationScore.score + secondary.score),
          ),
        );

        if (matchScore < MIN_OPPORTUNITY_SCORE) {
          continue;
        }

        opportunities.push({
          unitId: unit.id,
          customerId: interest.customer.id,
          interestId: interest.id,
          matchScore,
          matchLevel: this.getMatchLevel(matchScore),
          matchReasons: [
            ...priceMatch.reasons,
            locationScore.reason,
            ...secondary.reasons,
          ],
          propertyGroup,
          priceMatch: priceMatch.details,
          customer: {
            id: interest.customer.id,
            fullName: `${interest.customer.firstName} ${interest.customer.lastName}`.trim(),
            phone: interest.customer.phone,
            email: interest.customer.email,
            company: interest.customer.company,
            status: interest.customer.status,
          },
          interest: {
            id: interest.id,
            title: interest.title,
            priority: interest.priority,
            purchaseIntent: interest.purchaseIntent,
            city: interest.city,
            district: interest.district,
            neighborhood: interest.neighborhood,
            minBudget: interest.minBudget,
            maxBudget: interest.maxBudget,
            priceCurrency: interestCurrency,
          },
          unit: {
            id: unit.id,
            inventoryCode: unit.inventoryCode,
            type: unit.type,
            status: unit.status,
            blockCode: unit.block?.code || null,
            blockName: unit.block?.name || null,
            floorLabel: unit.projectFloor?.label || unit.floorLabel,
            number: unit.number,
            roomCount: unit.roomCount,
            conceptLabel: unit.conceptLabel,
            area: unit.area,
            netArea: unit.netArea,
            grossArea: unit.grossArea,
            price: Number(unit.price),
            priceCurrency: unitCurrency,
            coverImage: unit.images[0]?.url || null,
          },
          matchPolicy: {
            version: 'PROJECT_CRM_RADAR_V1',
            priceTolerancePercent: Math.round(priceTolerance * 100),
            cityHardFilter: true,
            propertyTypeHardFilter: true,
            statusHardFilter: true,
            currencyHardFilter: true,
          },
        });
      }
    }

    opportunities.sort((left, right) => {
      if (right.matchScore !== left.matchScore) {
        return right.matchScore - left.matchScore;
      }

      return left.unit.inventoryCode?.localeCompare(
        right.unit.inventoryCode || '',
        'tr-TR',
      ) || 0;
    });

    const limit = this.normalizeLimit(requestedLimit);
    const matchedUnitIds = new Set(opportunities.map((item) => item.unitId));
    const matchedCustomerIds = new Set(
      opportunities.map((item) => item.customerId),
    );
    const unpricedUnitCount = units.filter(
      (unit) => Number(unit.price) <= 0,
    ).length;

    const unitRadar = units.map((unit) => {
      const matches = opportunities
        .filter((item) => item.unitId === unit.id)
        .slice(0, 3)
        .map((item) => ({
          customerId: item.customerId,
          customerName: item.customer.fullName,
          interestId: item.interestId,
          matchScore: item.matchScore,
          matchLevel: item.matchLevel,
          matchReasons: item.matchReasons,
        }));

      return {
        unitId: unit.id,
        inventoryCode: unit.inventoryCode,
        type: unit.type,
        status: unit.status,
        blockCode: unit.block?.code || null,
        floorLabel: unit.projectFloor?.label || unit.floorLabel,
        number: unit.number,
        roomCount: unit.roomCount,
        price: Number(unit.price),
        priceCurrency: this.normalizeCurrency(unit.priceCurrency || 'TRY'),
        opportunityCount: opportunities.filter(
          (item) => item.unitId === unit.id,
        ).length,
        bestMatchScore: matches[0]?.matchScore || null,
        topMatches: matches,
      };
    });

    return {
      generatedAt: new Date().toISOString(),
      project: {
        id: project.id,
        name: project.name,
        code: project.code,
        city: project.city,
        district: project.district,
        neighborhood: project.neighborhood,
        isActive: project.isActive,
      },
      summary: {
        salesInventoryCount: units.length,
        activeBuyerInterestCount: interests.length,
        matchedPairCount: opportunities.length,
        strongOpportunityCount: opportunities.filter(
          (item) => item.matchScore >= 75,
        ).length,
        perfectOpportunityCount: opportunities.filter(
          (item) => item.matchScore >= 90,
        ).length,
        matchedUnitCount: matchedUnitIds.size,
        matchedCustomerCount: matchedCustomerIds.size,
        unitsWithoutBuyerMatchCount: units.filter(
          (unit) =>
            Number(unit.price) > 0 && !matchedUnitIds.has(unit.id),
        ).length,
        unpricedUnitCount,
      },
      opportunities: opportunities.slice(0, limit),
      unitRadar,
      policy: {
        version: 'PROJECT_CRM_RADAR_V1',
        minimumOpportunityScore: MIN_OPPORTUNITY_SCORE,
        defaultLimit: DEFAULT_LIMIT,
        maxLimit: MAX_LIMIT,
        usesPrivateProjectInventory: true,
        usesOnlyProjectOwnerCrm: true,
      },
    };
  }

  private getPropertyGroup(type: UnitType): PropertyGroup {
    if (LAND_TYPES.has(type)) return 'LAND';
    if (INDUSTRIAL_TYPES.has(type)) return 'INDUSTRIAL';
    if (COMMERCIAL_TYPES.has(type)) return 'COMMERCIAL';
    if (TOURISM_TYPES.has(type)) return 'TOURISM';
    if (PROJECT_TYPES.has(type)) return 'PROJECT';
    return 'RESIDENTIAL';
  }

  private getPriceTolerance(group: PropertyGroup) {
    if (group === 'LAND' || group === 'INDUSTRIAL') return 0.4;
    if (
      group === 'COMMERCIAL' ||
      group === 'TOURISM' ||
      group === 'PROJECT'
    ) {
      return 0.35;
    }

    return 0.3;
  }

  private calculatePriceMatch(input: {
    unitPrice: number;
    minBudget: number | null;
    maxBudget: number | null;
    tolerance: number;
  }): PriceMatch {
    const unitPrice = Math.max(0, input.unitPrice);
    const minBudget = this.toPositiveNumber(input.minBudget);
    const maxBudget = this.toPositiveNumber(input.maxBudget);
    const tolerancePercent = Math.round(input.tolerance * 100);
    const sellerNegotiationFloor = unitPrice * (1 - input.tolerance);

    if (maxBudget === null) {
      return {
        eligible: true,
        score: 25,
        reasons: ['Maksimum bütçe belirtilmedi'],
        details: {
          declaredMaxBudget: null,
          buyerNegotiationCeiling: null,
          sellerAskingPrice: unitPrice,
          sellerNegotiationFloor,
          overlapAmount: null,
          tolerancePercent,
          withinDeclaredBudget: false,
        },
      };
    }

    const buyerNegotiationCeiling = maxBudget * (1 + input.tolerance);
    const withinDeclaredBudget = unitPrice <= maxBudget;
    const overlapAmount = buyerNegotiationCeiling - sellerNegotiationFloor;

    if (!withinDeclaredBudget && overlapAmount < 0) {
      return {
        eligible: false,
        score: 0,
        reasons: [],
        details: {
          declaredMaxBudget: maxBudget,
          buyerNegotiationCeiling,
          sellerAskingPrice: unitPrice,
          sellerNegotiationFloor,
          overlapAmount,
          tolerancePercent,
          withinDeclaredBudget,
        },
      };
    }

    if (withinDeclaredBudget) {
      const minBudgetMatched = minBudget === null || unitPrice >= minBudget;
      return {
        eligible: true,
        score: minBudgetMatched ? 50 : 46,
        reasons: [
          minBudgetMatched
            ? 'Fiyat beyan edilen bütçe içinde'
            : 'Fiyat maksimum bütçenin altında',
        ],
        details: {
          declaredMaxBudget: maxBudget,
          buyerNegotiationCeiling,
          sellerAskingPrice: unitPrice,
          sellerNegotiationFloor,
          overlapAmount,
          tolerancePercent,
          withinDeclaredBudget,
        },
      };
    }

    const maximumAskRatio =
      (1 + input.tolerance) / Math.max(0.01, 1 - input.tolerance);
    const currentAskRatio = unitPrice / maxBudget;
    const progress = Math.max(
      0,
      Math.min(
        1,
        (currentAskRatio - 1) / Math.max(0.01, maximumAskRatio - 1),
      ),
    );

    return {
      eligible: true,
      score: Math.round(45 - progress * 20),
      reasons: [
        `%${tolerancePercent} pazarlık bandında fiyat kesişimi var`,
      ],
      details: {
        declaredMaxBudget: maxBudget,
        buyerNegotiationCeiling,
        sellerAskingPrice: unitPrice,
        sellerNegotiationFloor,
        overlapAmount,
        tolerancePercent,
        withinDeclaredBudget,
      },
    };
  }

  private getLocationScore(
    interest: {
      city: string | null;
      district: string | null;
      neighborhood: string | null;
    },
    project: ProjectLocation,
  ) {
    const requestedNeighborhood = this.normalizeText(interest.neighborhood);
    const requestedDistrict = this.normalizeText(interest.district);
    const requestedCity = this.normalizeText(interest.city);
    const projectNeighborhood = this.normalizeText(project.neighborhood);
    const projectDistrict = this.normalizeText(project.district);

    if (
      requestedNeighborhood &&
      projectNeighborhood &&
      requestedNeighborhood === projectNeighborhood
    ) {
      return { score: 30, reason: 'Hedef mahalle ile aynı konum' };
    }

    if (
      requestedDistrict &&
      projectDistrict &&
      requestedDistrict === projectDistrict
    ) {
      return { score: 25, reason: 'Hedef ilçe ile aynı konum' };
    }

    if (requestedCity) {
      return { score: 18, reason: 'Hedef il ile aynı konum' };
    }

    return { score: 10, reason: 'CRM kaydında il tercihi belirtilmedi' };
  }

  private calculateSecondaryScore(
    unit: {
      area: number | null;
      netArea: number | null;
      grossArea: number | null;
      roomCount: string | null;
      features: string[];
    },
    interest: {
      minArea: number | null;
      maxArea: number | null;
      roomCounts: string[];
      features: string[];
    },
    group: PropertyGroup,
  ) {
    const weights = this.getSecondaryWeights(group);
    let score = 0;
    const reasons: string[] = [];
    const unitArea = unit.netArea ?? unit.area ?? unit.grossArea;

    if (
      weights.area > 0 &&
      this.isWithinOptionalRange(unitArea, interest.minArea, interest.maxArea)
    ) {
      score += weights.area;
      reasons.push('m² hedefi uyumlu');
    }

    if (
      weights.room > 0 &&
      interest.roomCounts.length > 0 &&
      unit.roomCount &&
      interest.roomCounts.includes(unit.roomCount)
    ) {
      score += weights.room;
      reasons.push('Oda sayısı uyumlu');
    }

    if (
      weights.features > 0 &&
      interest.features.length > 0 &&
      unit.features.length > 0
    ) {
      const requested = new Set(
        interest.features.map((feature) => this.normalizeText(feature)),
      );
      const available = new Set(
        unit.features.map((feature) => this.normalizeText(feature)),
      );
      const matched = [...requested].filter((feature) =>
        available.has(feature),
      ).length;

      if (matched > 0) {
        score += Math.max(
          1,
          Math.round(weights.features * (matched / requested.size)),
        );
        reasons.push(`${matched}/${requested.size} özellik uyumlu`);
      }
    }

    return { score, reasons };
  }

  private getSecondaryWeights(group: PropertyGroup) {
    if (group === 'LAND') return { area: 12, room: 0, features: 8 };
    if (group === 'INDUSTRIAL') return { area: 8, room: 0, features: 12 };
    if (group === 'COMMERCIAL') return { area: 10, room: 0, features: 10 };
    if (group === 'TOURISM' || group === 'PROJECT') {
      return { area: 8, room: 2, features: 10 };
    }

    return { area: 10, room: 5, features: 5 };
  }

  private passesCityFilter(interestCity: unknown, projectCity: unknown) {
    const requested = this.normalizeText(interestCity);
    return !requested || requested === this.normalizeText(projectCity);
  }

  private passesPropertyTypeFilter(
    propertyTypes: UnitType[],
    unitType: UnitType,
  ) {
    return propertyTypes.length === 0 || propertyTypes.includes(unitType);
  }

  private passesStatusFilter(
    interest: InterestForMatching,
    unitStatus: UnitStatus,
  ) {
    if (interest.statuses.length > 0) {
      return interest.statuses.includes(unitStatus);
    }

    if (interest.purchaseIntent === CustomerPurchaseIntent.KIRALAMA) {
      return new Set<UnitStatus>([
        UnitStatus.KIRALIK,
        UnitStatus.GUNLUK_KIRALIK,
        UnitStatus.DEVREN_KIRALIK,
      ]).has(unitStatus);
    }

    if (
      interest.purchaseIntent === CustomerPurchaseIntent.SATIN_ALMA ||
      interest.purchaseIntent === CustomerPurchaseIntent.YATIRIM
    ) {
      return new Set<UnitStatus>([
        UnitStatus.SATILIK,
        UnitStatus.DEVREN_SATILIK,
        UnitStatus.ON_SATIS,
        UnitStatus.YAKINDA_SATISTA,
        UnitStatus.INSAAT_HALINDE,
        UnitStatus.TESLIME_HAZIR,
        UnitStatus.HEMEN_TESLIM,
        UnitStatus.PROJE_ASAMASI,
        UnitStatus.INSAAT_PROJESI,
      ]).has(unitStatus);
    }

    if (interest.purchaseIntent === CustomerPurchaseIntent.KAT_KARSILIGI) {
      return unitStatus === UnitStatus.KAT_KARSILIGI;
    }

    return true;
  }

  private isWithinOptionalRange(
    value: unknown,
    minValue: unknown,
    maxValue: unknown,
  ) {
    const numberValue = this.toPositiveNumber(value);
    const min = this.toPositiveNumber(minValue);
    const max = this.toPositiveNumber(maxValue);

    if (numberValue === null || (min === null && max === null)) {
      return false;
    }

    if (min !== null && numberValue < min) return false;
    if (max !== null && numberValue > max) return false;
    return true;
  }

  private getMatchLevel(score: number) {
    if (score >= 90) return 'Mükemmel';
    if (score >= 75) return 'Çok Güçlü';
    if (score >= 60) return 'Güçlü';
    if (score >= 40) return 'Uygun';
    return 'Zayıf';
  }

  private normalizeText(value: unknown) {
    return String(value ?? '')
      .trim()
      .toLocaleLowerCase('tr-TR')
      .replace(/\s+/g, ' ');
  }

  private normalizeCurrency(value: unknown) {
    return String(value || 'TRY')
      .trim()
      .toLocaleUpperCase('tr-TR');
  }

  private toPositiveNumber(value: unknown): number | null {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) && numberValue > 0
      ? numberValue
      : null;
  }

  private normalizeLimit(value: unknown) {
    const parsed = Number(value);

    if (!Number.isFinite(parsed) || parsed <= 0) {
      return DEFAULT_LIMIT;
    }

    return Math.min(MAX_LIMIT, Math.max(1, Math.floor(parsed)));
  }
}
