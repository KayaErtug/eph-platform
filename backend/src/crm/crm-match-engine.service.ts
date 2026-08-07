import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CustomerPurchaseIntent,
  Role,
  UnitStatus,
  UnitType,
} from '@prisma/client';

import { LinaDistanceService } from '../lina/geo/lina-distance.service';
import { PrismaService } from '../prisma/prisma.service';
import { PropertyCriteriaService } from '../property-criteria/property-criteria.service';
import { CrmService } from './crm.service';

type PropertyGroup =
  | 'RESIDENTIAL'
  | 'LAND'
  | 'COMMERCIAL'
  | 'INDUSTRIAL'
  | 'TOURISM'
  | 'PROJECT';

type MatchCandidate = {
  unit: any;
  propertyGroup: PropertyGroup;
  priceTolerance: number;
  priceScore: number;
  priceReasons: string[];
  priceDetails: {
    declaredMaxBudget: number | null;
    buyerNegotiationCeiling: number | null;
    sellerAskingPrice: number;
    sellerNegotiationFloor: number;
    overlapAmount: number | null;
    tolerancePercent: number;
    withinDeclaredBudget: boolean;
  };
};

@Injectable()
export class CrmMatchEngineService extends CrmService {
  private readonly locationRadiusKm = 5;

  private readonly landTypes = new Set<UnitType>([
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

  private readonly commercialTypes = new Set<UnitType>([
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

  private readonly industrialTypes = new Set<UnitType>([
    UnitType.FABRIKA_URETIM_TESISI,
    UnitType.ATOLYE,
    UnitType.DEPO_ANTREPO,
    UnitType.LOJISTIK_MERKEZI,
    UnitType.FABRIKA_ATOLYE,
    UnitType.URETIM_TESISI,
    UnitType.AKARYAKIT_ISTASYONU,
  ]);

  private readonly tourismTypes = new Set<UnitType>([
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

  private readonly projectTypes = new Set<UnitType>([
    UnitType.KONUT_PROJESI,
    UnitType.VILLA_PROJESI,
    UnitType.REZIDANS_PROJESI,
    UnitType.KARMA_PROJE,
    UnitType.AVM_PROJESI,
    UnitType.TICARI_PROJE,
  ]);

  constructor(
    private readonly matchPrisma: PrismaService,
    private readonly matchDistanceService: LinaDistanceService,
    matchPropertyCriteriaService: PropertyCriteriaService,
  ) {
    super(
      matchPrisma,
      matchDistanceService,
      matchPropertyCriteriaService,
    );
  }

  override async getCustomerInterestMatches(
    interestId: string,
    userId: string,
    userRole: Role,
  ) {
    const interest = await this.matchPrisma.customerInterest.findUnique({
      where: { id: interestId },
      include: { customer: true },
    });

    if (!interest) {
      throw new NotFoundException('İlgi bölgesi bulunamadı.');
    }

    if (
      userRole !== Role.SUPER_ADMIN &&
      interest.customer.ownerId !== userId
    ) {
      throw new ForbiddenException(
        'Bu CRM ilgi bölgesine erişim yetkiniz yok.',
      );
    }

    const origin = this.buildV3InterestDistancePoint(interest);

    if (!origin || !interest.city || !interest.neighborhood) {
      await this.touchInterest(interest.id);
      return [];
    }

    const poolUnits = await this.matchPrisma.unit.findMany({
      where: { isPoolVisible: true },
      include: {
        project: true,
        images: {
          where: { isCover: true },
          take: 1,
        },
      },
      orderBy: { poolPublishedAt: 'desc' },
    });

    const candidates = poolUnits
      .filter((unit) =>
        this.passesCityFilter(interest.city, unit.project?.city),
      )
      .filter((unit) =>
        this.passesPropertyTypeFilter(interest.propertyTypes, unit.type),
      )
      .filter((unit) => this.passesStatusFilter(interest, unit.status))
      .map((unit): MatchCandidate | null => {
        const propertyGroup = this.getPropertyGroup(unit.type);
        const priceTolerance = this.getPriceTolerance(propertyGroup);
        const priceMatch = this.calculatePriceMatch({
          unitPrice: Number(unit.price || 0),
          minBudget: interest.minBudget,
          maxBudget: interest.maxBudget,
          tolerance: priceTolerance,
        });

        if (!priceMatch.eligible) {
          return null;
        }

        return {
          unit,
          propertyGroup,
          priceTolerance,
          priceScore: priceMatch.score,
          priceReasons: priceMatch.reasons,
          priceDetails: priceMatch.details,
        };
      })
      .filter((candidate): candidate is MatchCandidate => Boolean(candidate));

    const evaluated = await this.mapV3WithConcurrency(
      candidates,
      4,
      async (candidate) => {
        const destination = this.buildV3UnitDistancePoint(candidate.unit);

        if (!destination) {
          return null;
        }

        let distanceResult: any;

        try {
          distanceResult = await this.matchDistanceService.calculate({
            origin,
            destination,
            routingPreference: 'TRAFFIC_AWARE',
            avoidFerries: true,
            avoidTolls: false,
            avoidHighways: false,
          });
        } catch {
          return null;
        }

        const straightLineDistanceKm =
          typeof distanceResult?.straightLine?.distanceKm === 'number'
            ? Number(distanceResult.straightLine.distanceKm)
            : null;

        if (
          straightLineDistanceKm === null ||
          straightLineDistanceKm > this.locationRadiusKm
        ) {
          return null;
        }

        const locationScore = this.getLocationScore(straightLineDistanceKm);
        const secondary = this.calculateSecondaryScore(
          candidate.unit,
          interest,
          candidate.propertyGroup,
        );
        const matchScore = Math.max(
          0,
          Math.min(
            100,
            Math.round(
              candidate.priceScore +
                locationScore.score +
                secondary.score,
            ),
          ),
        );

        return {
          unitId: candidate.unit.id,
          projectName: candidate.unit.project?.name,
          city: candidate.unit.project?.city,
          district: candidate.unit.project?.district,
          neighborhood: candidate.unit.project?.address,
          price: candidate.unit.price,
          roomCount: candidate.unit.roomCount,
          area: candidate.unit.area,
          coverImage: candidate.unit.images?.[0]?.url || null,
          matchScore,
          matchLevel: this.getV3MatchLevel(matchScore),
          matchReasons: [
            ...candidate.priceReasons,
            locationScore.reason,
            ...secondary.reasons,
          ],
          distance: {
            decisionReady: true,
            drivingDistanceKm:
              typeof distanceResult?.driving?.distanceKm === 'number'
                ? Number(distanceResult.driving.distanceKm)
                : null,
            durationMinutes:
              typeof distanceResult?.driving?.durationMinutes === 'number'
                ? Number(distanceResult.driving.durationMinutes)
                : null,
            staticDurationMinutes:
              typeof distanceResult?.driving?.staticDurationMinutes === 'number'
                ? Number(distanceResult.driving.staticDurationMinutes)
                : null,
            straightLineDistanceKm,
            detourFactor:
              typeof distanceResult?.comparison?.detourFactor === 'number'
                ? Number(distanceResult.comparison.detourFactor)
                : null,
            roadNetworkBarrierSignal:
              distanceResult?.comparison?.roadNetworkBarrierSignal === true,
            errorCode: distanceResult?.driving?.errorCode || null,
            message: distanceResult?.driving?.message || null,
          },
          matchPolicy: {
            version: 'CRM_MATCH_V3',
            propertyGroup: candidate.propertyGroup,
            priceTolerancePercent: Math.round(
              candidate.priceTolerance * 100,
            ),
            locationRadiusKm: this.locationRadiusKm,
            locationMetric: 'STRAIGHT_LINE_RADIUS',
            cityHardFilter: true,
            districtHardFilter: false,
            propertyTypeHardFilter: true,
            statusHardFilter: true,
          },
          priceMatch: candidate.priceDetails,
        };
      },
    );

    await this.touchInterest(interest.id);

    return evaluated
      .filter((result): result is NonNullable<typeof result> => Boolean(result))
      .sort((left, right) => {
        if (right.matchScore !== left.matchScore) {
          return right.matchScore - left.matchScore;
        }

        return (
          (left.distance.straightLineDistanceKm ?? Number.MAX_VALUE) -
          (right.distance.straightLineDistanceKm ?? Number.MAX_VALUE)
        );
      });
  }

  private getPropertyGroup(type: UnitType): PropertyGroup {
    if (this.landTypes.has(type)) return 'LAND';
    if (this.industrialTypes.has(type)) return 'INDUSTRIAL';
    if (this.commercialTypes.has(type)) return 'COMMERCIAL';
    if (this.tourismTypes.has(type)) return 'TOURISM';
    if (this.projectTypes.has(type)) return 'PROJECT';
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
  }) {
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

  private getLocationScore(distanceKm: number) {
    if (distanceKm <= 0.5) {
      return {
        score: 30,
        reason: `Hedef mahalle merkezine ${this.formatKm(distanceKm)} km`,
      };
    }
    if (distanceKm <= 1) {
      return {
        score: 28,
        reason: `Hedef mahalleye çok yakın (${this.formatKm(distanceKm)} km)`,
      };
    }
    if (distanceKm <= 2.5) {
      return {
        score: 25,
        reason: `Hedef mahalleye yakın (${this.formatKm(distanceKm)} km)`,
      };
    }
    if (distanceKm <= 4) {
      return {
        score: 22,
        reason: `Hedef mahalle çevresinde (${this.formatKm(distanceKm)} km)`,
      };
    }
    return {
      score: 18,
      reason: `5 km eşleşme alanında (${this.formatKm(distanceKm)} km)`,
    };
  }

  private calculateSecondaryScore(
    unit: any,
    interest: any,
    group: PropertyGroup,
  ) {
    const weights = this.getSecondaryWeights(group);
    let score = 0;
    const reasons: string[] = [];

    if (
      weights.area > 0 &&
      this.isWithinOptionalRange(unit.area, interest.minArea, interest.maxArea)
    ) {
      score += weights.area;
      reasons.push('m² hedefi uyumlu');
    }

    if (
      weights.room > 0 &&
      Array.isArray(interest.roomCounts) &&
      interest.roomCounts.length > 0 &&
      unit.roomCount &&
      interest.roomCounts.includes(unit.roomCount)
    ) {
      score += weights.room;
      reasons.push('Oda sayısı uyumlu');
    }

    if (
      weights.features > 0 &&
      Array.isArray(interest.features) &&
      interest.features.length > 0 &&
      Array.isArray(unit.features)
    ) {
      const requested = new Set(
        interest.features.map((feature: string) => this.normalizeText(feature)),
      );
      const available = new Set(
        unit.features.map((feature: string) => this.normalizeText(feature)),
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
    return (
      !Array.isArray(propertyTypes) ||
      propertyTypes.length === 0 ||
      propertyTypes.includes(unitType)
    );
  }

  private passesStatusFilter(interest: any, unitStatus: UnitStatus) {
    if (Array.isArray(interest.statuses) && interest.statuses.length > 0) {
      return interest.statuses.includes(unitStatus);
    }

    const intent = interest.purchaseIntent as CustomerPurchaseIntent;

    if (intent === CustomerPurchaseIntent.KIRALAMA) {
      return new Set<UnitStatus>([
        UnitStatus.KIRALIK,
        UnitStatus.GUNLUK_KIRALIK,
        UnitStatus.DEVREN_KIRALIK,
      ]).has(unitStatus);
    }

    if (
      intent === CustomerPurchaseIntent.SATIN_ALMA ||
      intent === CustomerPurchaseIntent.YATIRIM
    ) {
      return new Set<UnitStatus>([
        UnitStatus.SATILIK,
        UnitStatus.DEVREN_SATILIK,
        UnitStatus.ON_SATIS,
        UnitStatus.YAKINDA_SATISTA,
        UnitStatus.INSAAT_HALINDE,
        UnitStatus.TESLIME_HAZIR,
        UnitStatus.HEMEN_TESLIM,
      ]).has(unitStatus);
    }

    if (intent === CustomerPurchaseIntent.KAT_KARSILIGI) {
      return unitStatus === UnitStatus.KAT_KARSILIGI;
    }

    return true;
  }

  private buildV3InterestDistancePoint(interest: any) {
    const neighborhood = String(interest.neighborhood || '').trim();
    const city = String(interest.city || '').trim();

    if (!neighborhood || !city) {
      return null;
    }

    const district = String(interest.district || '').trim();
    return {
      label: interest.title?.trim() || 'CRM hedef mahallesi',
      address: [neighborhood, district, city, 'Türkiye']
        .filter(Boolean)
        .join(', '),
      city,
      district: district || undefined,
      neighborhood,
    };
  }

  private buildV3UnitDistancePoint(unit: any) {
    const project = unit.project;

    if (!project) {
      return null;
    }

    const hasCoordinates =
      typeof project.latitude === 'number' &&
      Number.isFinite(project.latitude) &&
      typeof project.longitude === 'number' &&
      Number.isFinite(project.longitude);
    const address =
      project.mapAddress?.trim() ||
      [project.address, project.district, project.city, 'Türkiye']
        .filter((value: unknown): value is string =>
          typeof value === 'string' && Boolean(value.trim()),
        )
        .join(', ');

    if (!hasCoordinates && !project.placeId?.trim() && !address) {
      return null;
    }

    return {
      label: project.name?.trim() || `Portföy ${unit.id.slice(0, 8)}`,
      latitude: hasCoordinates ? project.latitude : undefined,
      longitude: hasCoordinates ? project.longitude : undefined,
      address: address || undefined,
      city: project.city || undefined,
      district: project.district || undefined,
      neighborhood: project.address || undefined,
      placeId: project.placeId?.trim() || undefined,
    };
  }

  private isWithinOptionalRange(
    value: unknown,
    minValue: unknown,
    maxValue: unknown,
  ) {
    const numberValue = this.toPositiveNumber(value);
    const min = this.toPositiveNumber(minValue);
    const max = this.toPositiveNumber(maxValue);

    if (numberValue === null || (min === null && max === null)) return false;
    if (min !== null && numberValue < min) return false;
    if (max !== null && numberValue > max) return false;
    return true;
  }

  private getV3MatchLevel(score: number) {
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

  private toPositiveNumber(value: unknown): number | null {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) && numberValue > 0
      ? numberValue
      : null;
  }

  private formatKm(value: number) {
    return value.toLocaleString('tr-TR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  }

  private async touchInterest(interestId: string) {
    await this.matchPrisma.customerInterest.update({
      where: { id: interestId },
      data: { lastMatchedAt: new Date() },
    });
  }

  private async mapV3WithConcurrency<T, R>(
    items: T[],
    concurrency: number,
    mapper: (item: T, index: number) => Promise<R>,
  ): Promise<R[]> {
    if (items.length === 0) return [];

    const results = new Array<R>(items.length);
    let cursor = 0;
    const workers = Array.from(
      { length: Math.max(1, Math.min(concurrency, items.length)) },
      async () => {
        while (true) {
          const index = cursor;
          cursor += 1;
          if (index >= items.length) return;
          results[index] = await mapper(items[index], index);
        }
      },
    );

    await Promise.all(workers);
    return results;
  }
}
