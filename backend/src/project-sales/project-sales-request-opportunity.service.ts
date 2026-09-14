import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  NetworkVisibility,
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

type RequestArea = {
  city: string;
  district: string;
  neighborhood: string;
};

type ProjectLocation = {
  city: string;
  district: string;
  neighborhood: string | null;
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
]);

const SALE_STATUSES = new Set<UnitStatus>([
  UnitStatus.SATILIK,
  UnitStatus.DEVREN_SATILIK,
  UnitStatus.ON_SATIS,
  UnitStatus.YAKINDA_SATISTA,
  UnitStatus.INSAAT_HALINDE,
  UnitStatus.TESLIME_HAZIR,
  UnitStatus.HEMEN_TESLIM,
  UnitStatus.PROJE_ASAMASI,
  UnitStatus.INSAAT_PROJESI,
]);

const RENT_STATUSES = new Set<UnitStatus>([
  UnitStatus.KIRALIK,
  UnitStatus.GUNLUK_KIRALIK,
  UnitStatus.DEVREN_KIRALIK,
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
export class ProjectSalesRequestOpportunityService {
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
      throw new ForbiddenException(
        'Bu projenin Talep Merkezi fırsatlarına erişim yetkiniz yok.',
      );
    }

    const now = new Date();
    const [units, requests] = await Promise.all([
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
      this.prisma.networkPost.findMany({
        where: {
          type: 'PORTFOY_ARIYORUM',
          isActive: true,
          expiresAt: { gt: now },
          userId: { not: project.ownerId },
          visibility: {
            in: [
              NetworkVisibility.TUM_EPH,
              NetworkVisibility.SADECE_MUTEAHHITLER,
            ],
          },
        },
        select: {
          id: true,
          type: true,
          title: true,
          description: true,
          city: true,
          district: true,
          neighborhood: true,
          areas: true,
          budget: true,
          minArea: true,
          maxArea: true,
          minBudget: true,
          maxBudget: true,
          propertyTypes: true,
          roomCounts: true,
          features: true,
          priceCurrency: true,
          urgency: true,
          visibility: true,
          tags: true,
          expiresAt: true,
          createdAt: true,
        },
        orderBy: [
          { createdAt: 'desc' },
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
      requestId: string;
      matchScore: number;
      matchLevel: string;
      matchReasons: string[];
      propertyGroup: PropertyGroup;
      priceMatch: PriceMatch['details'];
      request: {
        id: string;
        title: string;
        urgency: string | null;
        requestType: string;
        areas: RequestArea[];
        minBudget: number | null;
        maxBudget: number | null;
        priceCurrency: string;
        minArea: number | null;
        maxArea: number | null;
        roomCounts: string[];
        features: string[];
        createdAt: Date;
        expiresAt: Date;
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
        version: 'PROJECT_REQUEST_RADAR_V1';
        priceTolerancePercent: number;
        cityHardFilter: true;
        propertyTypeHardFilter: true;
        statusHardFilter: true;
        currencyHardFilter: true;
        requesterIdentityHidden: true;
      };
    }>;

    for (const request of requests) {
      const requestAreas = this.normalizeRequestAreas(request);

      if (!this.passesCityFilter(requestAreas, location.city)) {
        continue;
      }

      const requestType = this.getRequestType(request.tags);
      const locationScore = this.getLocationScore(requestAreas, location);
      const requestMinBudget = request.minBudget ?? request.budget;
      const requestMaxBudget = request.maxBudget ?? request.budget;

      for (const unit of units) {
        if (Number(unit.price) <= 0) {
          continue;
        }

        if (!this.passesPropertyTypeFilter(request.propertyTypes, unit.type)) {
          continue;
        }

        if (!this.passesRequestStatusFilter(requestType, unit.status)) {
          continue;
        }

        const unitCurrency = this.normalizeCurrency(unit.priceCurrency || 'TRY');
        const requestCurrency = this.normalizeCurrency(
          request.priceCurrency || 'TRY',
        );

        if (unitCurrency !== requestCurrency) {
          continue;
        }

        const propertyGroup = this.getPropertyGroup(unit.type);
        const priceTolerance = this.getPriceTolerance(propertyGroup);
        const priceMatch = this.calculatePriceMatch({
          unitPrice: Number(unit.price),
          minBudget: requestMinBudget,
          maxBudget: requestMaxBudget,
          tolerance: priceTolerance,
        });

        if (!priceMatch.eligible) {
          continue;
        }

        const secondary = this.calculateSecondaryScore(
          unit,
          request,
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
          requestId: request.id,
          matchScore,
          matchLevel: this.getMatchLevel(matchScore),
          matchReasons: [
            ...priceMatch.reasons,
            locationScore.reason,
            ...secondary.reasons,
          ],
          propertyGroup,
          priceMatch: priceMatch.details,
          request: {
            id: request.id,
            title: request.title,
            urgency: request.urgency,
            requestType,
            areas: requestAreas,
            minBudget: this.toPositiveNumber(requestMinBudget),
            maxBudget: this.toPositiveNumber(requestMaxBudget),
            priceCurrency: requestCurrency,
            minArea: request.minArea,
            maxArea: request.maxArea,
            roomCounts: request.roomCounts,
            features: request.features,
            createdAt: request.createdAt,
            expiresAt: request.expiresAt,
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
            version: 'PROJECT_REQUEST_RADAR_V1',
            priceTolerancePercent: Math.round(priceTolerance * 100),
            cityHardFilter: true,
            propertyTypeHardFilter: true,
            statusHardFilter: true,
            currencyHardFilter: true,
            requesterIdentityHidden: true,
          },
        });
      }
    }

    opportunities.sort((left, right) => {
      if (right.matchScore !== left.matchScore) {
        return right.matchScore - left.matchScore;
      }

      return left.request.createdAt.getTime() > right.request.createdAt.getTime()
        ? -1
        : 1;
    });

    const limit = this.normalizeLimit(requestedLimit);
    const matchedUnitIds = new Set(opportunities.map((item) => item.unitId));
    const matchedRequestIds = new Set(
      opportunities.map((item) => item.requestId),
    );
    const unpricedUnitCount = units.filter(
      (unit) => Number(unit.price) <= 0,
    ).length;

    const unitRadar = units.map((unit) => {
      const matches = opportunities
        .filter((item) => item.unitId === unit.id)
        .slice(0, 3)
        .map((item) => ({
          requestId: item.requestId,
          requestTitle: item.request.title,
          requestType: item.request.requestType,
          urgency: item.request.urgency,
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

    const requestRadar = requests
      .map((request) => {
        const matches = opportunities
          .filter((item) => item.requestId === request.id)
          .slice(0, 3)
          .map((item) => ({
            unitId: item.unitId,
            inventoryCode: item.unit.inventoryCode,
            matchScore: item.matchScore,
            matchLevel: item.matchLevel,
            matchReasons: item.matchReasons,
          }));

        return {
          requestId: request.id,
          title: request.title,
          urgency: request.urgency,
          requestType: this.getRequestType(request.tags),
          opportunityCount: opportunities.filter(
            (item) => item.requestId === request.id,
          ).length,
          bestMatchScore: matches[0]?.matchScore || null,
          topMatches: matches,
        };
      })
      .filter((item) => item.opportunityCount > 0);

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
        activeRequestCount: requests.length,
        matchedPairCount: opportunities.length,
        strongOpportunityCount: opportunities.filter(
          (item) => item.matchScore >= 75,
        ).length,
        perfectOpportunityCount: opportunities.filter(
          (item) => item.matchScore >= 90,
        ).length,
        matchedUnitCount: matchedUnitIds.size,
        matchedRequestCount: matchedRequestIds.size,
        unitsWithoutRequestMatchCount: units.filter(
          (unit) => Number(unit.price) > 0 && !matchedUnitIds.has(unit.id),
        ).length,
        unpricedUnitCount,
      },
      opportunities: opportunities.slice(0, limit),
      unitRadar,
      requestRadar,
      policy: {
        version: 'PROJECT_REQUEST_RADAR_V1',
        minimumOpportunityScore: MIN_OPPORTUNITY_SCORE,
        defaultLimit: DEFAULT_LIMIT,
        maxLimit: MAX_LIMIT,
        usesPrivateProjectInventory: true,
        requesterIdentityHidden: true,
        connectionOnlyRequestsExcluded: true,
      },
    };
  }

  private normalizeRequestAreas(request: {
    areas: unknown;
    city: string | null;
    district: string | null;
    neighborhood: string | null;
  }): RequestArea[] {
    const rawAreas = Array.isArray(request.areas) ? request.areas : [];
    const normalizedAreas = rawAreas
      .map((area) => {
        if (!area || typeof area !== 'object' || Array.isArray(area)) {
          return null;
        }

        const value = area as Record<string, unknown>;
        return {
          city: String(value.city || '').trim(),
          district: String(value.district || '').trim(),
          neighborhood: String(value.neighborhood || '').trim(),
        };
      })
      .filter(
        (area): area is RequestArea =>
          Boolean(area && (area.city || area.district || area.neighborhood)),
      );

    if (normalizedAreas.length > 0) {
      return normalizedAreas;
    }

    const legacyArea = {
      city: String(request.city || '').trim(),
      district: String(request.district || '').trim(),
      neighborhood: String(request.neighborhood || '').trim(),
    };

    return legacyArea.city || legacyArea.district || legacyArea.neighborhood
      ? [legacyArea]
      : [];
  }

  private getRequestType(tags: string[]) {
    const requestTypeTag = tags.find((tag) =>
      String(tag || '').startsWith('Talep Türü:'),
    );

    return String(requestTypeTag || '')
      .replace('Talep Türü:', '')
      .trim()
      .toUpperCase();
  }

  private passesCityFilter(areas: RequestArea[], projectCity: string) {
    const requestedCities = areas
      .map((area) => this.normalizeText(area.city))
      .filter(Boolean);

    return (
      requestedCities.length === 0 ||
      requestedCities.includes(this.normalizeText(projectCity))
    );
  }

  private getLocationScore(areas: RequestArea[], project: ProjectLocation) {
    const projectCity = this.normalizeText(project.city);
    const projectDistrict = this.normalizeText(project.district);
    const projectNeighborhood = this.normalizeText(project.neighborhood);

    let bestScore = 10;
    let bestReason = 'Talepte konum detayı sınırlı';

    for (const area of areas) {
      if (this.normalizeText(area.city) !== projectCity) {
        continue;
      }

      const requestedDistrict = this.normalizeText(area.district);
      const requestedNeighborhood = this.normalizeText(area.neighborhood);

      if (
        requestedNeighborhood &&
        projectNeighborhood &&
        requestedNeighborhood === projectNeighborhood
      ) {
        return { score: 30, reason: 'Talep edilen mahalle ile aynı konum' };
      }

      if (
        requestedDistrict &&
        projectDistrict &&
        requestedDistrict === projectDistrict &&
        bestScore < 25
      ) {
        bestScore = 25;
        bestReason = 'Talep edilen ilçe ile aynı konum';
        continue;
      }

      if (bestScore < 18) {
        bestScore = 18;
        bestReason = 'Talep edilen il ile aynı konum';
      }
    }

    return { score: bestScore, reason: bestReason };
  }

  private passesPropertyTypeFilter(
    propertyTypes: UnitType[],
    unitType: UnitType,
  ) {
    return propertyTypes.length === 0 || propertyTypes.includes(unitType);
  }

  private passesRequestStatusFilter(requestType: string, unitStatus: UnitStatus) {
    if (requestType === 'PORTFOY_KIRALIK') {
      return RENT_STATUSES.has(unitStatus);
    }

    if (requestType === 'PORTFOY_SATILIK') {
      return SALE_STATUSES.has(unitStatus);
    }

    return false;
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

  private calculateSecondaryScore(
    unit: {
      area: number | null;
      netArea: number | null;
      grossArea: number | null;
      roomCount: string | null;
      features: string[];
    },
    request: {
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
      this.isWithinOptionalRange(unitArea, request.minArea, request.maxArea)
    ) {
      score += weights.area;
      reasons.push('m² hedefi uyumlu');
    }

    if (
      weights.room > 0 &&
      request.roomCounts.length > 0 &&
      unit.roomCount &&
      request.roomCounts.includes(unit.roomCount)
    ) {
      score += weights.room;
      reasons.push('Oda sayısı uyumlu');
    }

    if (
      weights.features > 0 &&
      request.features.length > 0 &&
      unit.features.length > 0
    ) {
      const requested = new Set(
        request.features.map((feature) => this.normalizeText(feature)),
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

  private normalizeCurrency(value: unknown) {
    return String(value || 'TRY').trim().toUpperCase();
  }

  private normalizeText(value: unknown) {
    return String(value ?? '')
      .trim()
      .toLocaleLowerCase('tr-TR')
      .replace(/\s+/g, ' ');
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

    return Math.min(MAX_LIMIT, Math.max(1, Math.trunc(parsed)));
  }
}
