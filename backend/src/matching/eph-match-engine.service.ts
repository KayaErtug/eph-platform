import { Injectable } from '@nestjs/common';
import { UnitType } from '@prisma/client';

import { LinaDistanceService } from '../lina/geo/lina-distance.service';
import { PropertyCardProfileService } from '../property-card/property-card-profile.service';
import {
  getCriterionSemantic,
  matchesCriterion,
} from './eph-match-criterion-semantics';

export type EphMatchSource =
  | 'CRM'
  | 'TALEP_MERKEZI'
  | 'PORTFOY'
  | 'HAVUZ'
  | 'PROJE_STOK';

export type EphMatchDemand = {
  id?: string | null;
  title?: string | null;
  city?: string | null;
  district?: string | null;
  neighborhood?: string | null;
  propertyTypes?: Array<string | UnitType> | null;
  statuses?: string[] | null;
  purchaseIntent?: string | null;
  minBudget?: number | null;
  maxBudget?: number | null;
  budget?: number | null;
  minArea?: number | null;
  maxArea?: number | null;
  roomCounts?: string[] | null;
  features?: string[] | null;
  cardProfileCriteria?: unknown;
  priceCurrency?: string | null;
};

export type EphMatchOptions = {
  source?: EphMatchSource;
  useDistance?: boolean;
  strictLocation?: boolean;
  strictBudget?: boolean;
  paidScan?: boolean;
};

export type EphMatchResult = {
  unitId: string;
  projectName: string | null;
  city: string | null;
  district: string | null;
  neighborhood: string | null;
  type: string;
  status: string;
  price: number;
  roomCount: string | null;
  area: number | null;
  coverImage: string | null;
  matchScore: number;
  matchLevel: 'GUCLU' | 'UYGUN' | 'ZAYIF';
  matchReasons: string[];
  distance: {
    decisionReady: boolean;
    drivingDistanceKm: number | null;
    durationMinutes: number | null;
    straightLineDistanceKm: number | null;
  } | null;
  matchPolicy: {
    version: 'EPH_MATCH_V1' | 'EPH_PAID_MATCH_V1';
    source: EphMatchSource;
    propertyGroup: PropertyGroup;
    priceTolerancePercent: number;
    locationRadiusKm: number;
    cityHardFilter: true;
    districtHardFilter: boolean;
    neighborhoodHardFilter: boolean;
    propertyTypeHardFilter: true;
    statusHardFilter: true;
  };
  priceMatch: PriceMatchDetails;
};

type PropertyGroup =
  | 'RESIDENTIAL'
  | 'LAND'
  | 'COMMERCIAL'
  | 'INDUSTRIAL'
  | 'TOURISM'
  | 'PROJECT';

type PriceMatchDetails = {
  declaredMaxBudget: number | null;
  buyerNegotiationCeiling: number | null;
  sellerAskingPrice: number;
  sellerNegotiationFloor: number;
  overlapAmount: number | null;
  tolerancePercent: number;
  withinDeclaredBudget: boolean;
};

type PriceMatch = {
  eligible: boolean;
  score: number;
  reasons: string[];
  details: PriceMatchDetails;
};

@Injectable()
export class EphMatchEngineService {
  private readonly locationRadiusKm = 5;

  private readonly landTypes = new Set<string>([
    'ARSA',
    'KONUT_ARSASI',
    'VILLA_ARSASI',
    'TICARI_ARSA',
    'SANAYI_ARSASI',
    'TURIZM_IMARLI_ARSA',
    'TARLA',
    'BAHCE',
    'BAG',
    'ZEYTINLIK',
    'MEYVE_BAHCESI',
    'SERA',
    'BESI_CIFTLIGI',
    'ORMAN_ARAZISI',
    'ADA',
  ]);

  private readonly commercialTypes = new Set<string>([
    'DUKKAN_MAGAZA',
    'OFIS_BURO',
    'TICARI_ISLETME',
    'HOME_OFFICE',
    'PLAZA_KATI',
    'SHOWROOM',
    'IS_HANI_KATI',
    'IS_MERKEZI',
    'PAYLASIMLI_OFIS',
    'KOMPLE_BINA',
  ]);

  private readonly industrialTypes = new Set<string>([
    'FABRIKA_URETIM_TESISI',
    'ATOLYE',
    'DEPO_ANTREPO',
    'LOJISTIK_MERKEZI',
    'FABRIKA_ATOLYE',
    'URETIM_TESISI',
    'AKARYAKIT_ISTASYONU',
  ]);

  private readonly tourismTypes = new Set<string>([
    'OTEL_PANSIYON',
    'APART_OTEL',
    'OTEL',
    'BUTIK_OTEL',
    'MOTEL',
    'PANSIYON',
    'KAMP_YERI',
    'TATIL_KOYU',
    'RESTORAN',
    'KAFE',
    'DUGUN_SALONU',
    'SPOR_TESISI',
    'OKUL_EGITIM_TESISI',
    'HASTANE_SAGLIK_TESISI',
    'TURISTIK_TESIS',
  ]);

  private readonly projectTypes = new Set<string>([
    'KONUT_PROJESI',
    'VILLA_PROJESI',
    'REZIDANS_PROJESI',
    'KARMA_PROJE',
    'AVM_PROJESI',
    'TICARI_PROJE',
  ]);

  constructor(
    private readonly distanceService: LinaDistanceService,
    private readonly propertyCardProfileService: PropertyCardProfileService,
  ) {}

  async matchDemandToUnits(
    demand: EphMatchDemand,
    units: any[],
    options: EphMatchOptions = {},
  ): Promise<EphMatchResult[]> {
    const results = await this.mapWithConcurrency(
      units,
      4,
      (unit) => this.matchDemandToUnit(demand, unit, options),
    );

    return results
      .filter((result): result is EphMatchResult => Boolean(result))
      .sort((left, right) => {
        if (right.matchScore !== left.matchScore) {
          return right.matchScore - left.matchScore;
        }

        return (
          (left.distance?.straightLineDistanceKm ?? Number.MAX_VALUE) -
          (right.distance?.straightLineDistanceKm ?? Number.MAX_VALUE)
        );
      });
  }

  async matchDemandToUnit(
    demand: EphMatchDemand,
    unit: any,
    options: EphMatchOptions = {},
  ): Promise<EphMatchResult | null> {
    const project = unit?.project;

    if (!unit || !project) {
      return null;
    }

    const katKarsiligi = demand.statuses?.includes('KAT_KARSILIGI') || demand.purchaseIntent === 'KAT_KARSILIGI';
    let paidAreaHard = true;
    if (options.paidScan) {
      const profile = demand.cardProfileCriteria as { priorities?: Record<string, string>; values?: Record<string, string[]> } | null;
      const areaPriority = profile?.priorities?.grossArea ?? profile?.priorities?.netArea;
      if (areaPriority === 'ANY') demand = { ...demand, minArea: null, maxArea: null };
      paidAreaHard = areaPriority !== 'PREFERENCE';
      const roomPriority = profile?.priorities?.roomCount;
      const rooms = profile?.values?.roomCount?.length ? profile.values.roomCount : demand.roomCounts || [];
      if (rooms.length && roomPriority !== 'PREFERENCE' && roomPriority !== 'ANY') {
        const operator = rooms.length > 1 ? 'EXACT_OR_ANY' : 'ORDERED_MINIMUM';
        if (!unit.roomCount || !matchesCriterion(operator, rooms, unit.roomCount)) return null;
      }
      const currency = (value: unknown) => String(value || 'TRY').toUpperCase().replace(/^TL$/, 'TRY');
      const price = Number(unit.price);
      if ((!katKarsiligi && (!Number.isFinite(price) || price <= 0)) || unit.isOffMarket || project.isActive === false ||
        ['PASIF', 'SATILDI', 'KIRALANDII'].includes(String(unit.status)) ||
        currency(demand.priceCurrency) !== currency(unit.priceCurrency)) return null;
      const minBudget = this.toPositiveNumber(demand.minBudget);
      if (!katKarsiligi && minBudget !== null && price < minBudget) return null;
      const district = this.normalizeDistrict(demand.district, demand.city);
      const unitDistrict = this.normalizeDistrict(project.district, project.city);
      if (district && district !== unitDistrict) return null;
      const neighborhood = this.normalizeLocationText(demand.neighborhood);
      const actual = this.normalizeLocationText(project.neighborhood || project.mapAddress || project.address);
      if (neighborhood) {
        const escaped = neighborhood.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        if (project.neighborhood ? actual !== neighborhood : !new RegExp('(^|[\\s,;/])' + escaped + '(?=$|[\\s,;/])').test(actual)) return null;
      }
      const area = this.toPositiveNumber(unit.area) ?? this.toPositiveNumber(unit.grossArea) ?? this.toPositiveNumber(unit.netArea);
      const minimum = this.toPositiveNumber(demand.minArea), maximum = this.toPositiveNumber(demand.maxArea);
      if (paidAreaHard && (minimum !== null || maximum !== null) && (area === null || (minimum !== null && area < minimum) || (maximum !== null && area > maximum))) return null;
    }


    if (!this.passesCityFilter(demand.city, project.city)) {
      return null;
    }

    if (!this.passesPropertyTypeFilter(demand.propertyTypes, unit.type)) {
      return null;
    }

    if (!this.passesStatusFilter(demand, unit.status)) {
      return null;
    }

    const propertyGroup = this.getPropertyGroup(unit.type);
    const strictBudget = options.paidScan === true || options.strictBudget === true || options.source === 'CRM';
    const strictLocation = options.paidScan === true || options.strictLocation === true || options.source === 'CRM';
    const allowNearbyNeighborhood = options.paidScan !== true && options.source === 'CRM' &&
      options.useDistance !== false && options.strictLocation !== true;
    const priceTolerance =
      strictBudget
        ? 0
        : this.getPriceTolerance(propertyGroup);

    const priceMatch = this.calculatePriceMatch({
      unitPrice: Number(unit.price || 0),
      minBudget: katKarsiligi ? null : demand.minBudget,
      maxBudget: katKarsiligi ? null : demand.maxBudget ?? demand.budget,
      tolerance: priceTolerance,
    });

    if (!priceMatch.eligible) {
      return null;
    }

    const location = await this.calculateLocation(
      demand,
      unit,
      options.useDistance !== false,
      strictLocation,
      allowNearbyNeighborhood,
    );

    if (!location.eligible) {
      return null;
    }

    const unitArea =
      this.toPositiveNumber(unit.area) ??
      this.toPositiveNumber(unit.grossArea) ??
      this.toPositiveNumber(unit.netArea);

    const minimumArea =
      this.toPositiveNumber(demand.minArea);

    if (
      minimumArea !== null &&
      unitArea !== null &&
      unitArea < minimumArea &&
      (!options.paidScan || paidAreaHard)
    ) {
      return null;
    }

    const areaVerificationReason =
      minimumArea !== null && unitArea === null
        ? 'İlanın alan bilgisi eksik; m² kriteri teyit edilmeli'
        : null;

    const secondary = this.calculateSecondaryScore(
      unit,
      demand,
      propertyGroup,
      options.paidScan === true,
    );

    if (!secondary.eligible) {
      return null;
    }

    const matchScore = Math.max(
      0,
      Math.min(
        100,
        Math.round(priceMatch.score + location.score + secondary.score),
      ),
    );

    return {
      unitId: String(unit.id),
      projectName: project.name || null,
      city: project.city || null,
      district: project.district || null,
      neighborhood:
        project.neighborhood ||
        project.mapAddress ||
        project.address ||
        null,
      type: String(unit.type || ''),
      status: String(unit.status || ''),
      price: Number(unit.price || 0),
      roomCount: unit.roomCount || null,
      area:
        this.toPositiveNumber(unit.area) ??
        this.toPositiveNumber(unit.grossArea) ??
        this.toPositiveNumber(unit.netArea),
      coverImage:
        unit.images?.[0]?.url ||
        unit.images?.[0]?.supabaseUrl ||
        unit.mediaPackage?.assets?.[0]?.url ||
        unit.mediaPackage?.assets?.[0]?.supabaseUrl ||
        null,
      matchScore,
      matchLevel: this.getMatchLevel(matchScore),
      matchReasons: [
        ...priceMatch.reasons,
        location.reason,
        ...(areaVerificationReason ? [areaVerificationReason] : []),
        ...secondary.reasons,
      ].filter(Boolean),
      distance: location.distance,
      matchPolicy: {
        version: options.paidScan ? 'EPH_PAID_MATCH_V1' : 'EPH_MATCH_V1',
        source: options.source || 'CRM',
        propertyGroup,
        priceTolerancePercent: Math.round(priceTolerance * 100),
        locationRadiusKm: this.locationRadiusKm,
        cityHardFilter: true,
        districtHardFilter: strictLocation,
        neighborhoodHardFilter: strictLocation && !allowNearbyNeighborhood,
        propertyTypeHardFilter: true,
        statusHardFilter: true,
      },
      priceMatch: priceMatch.details,
    };
  }

  async findBestCustomerMatchForUnit(
    unit: any,
    customers: any[],
    options: EphMatchOptions = {},
  ) {
    let best:
      | (EphMatchResult & {
          customerId: string;
          interestId: string | null;
        })
      | null = null;

    for (const customer of customers || []) {
      const interests =
        Array.isArray(customer.interests) && customer.interests.length > 0
          ? customer.interests.filter(
              (interest: any) => interest.isActive !== false,
            )
          : [
              {
                city: customer.city,
                district: customer.interestedArea,
                propertyTypes: customer.interestedType
                  ? [customer.interestedType]
                  : [],
                maxBudget: customer.budget,
              },
            ];

      for (const interest of interests) {
        const result = await this.matchDemandToUnit(interest, unit, {
          ...options,
          source: options.source || 'CRM',
        });

        if (!result) continue;

        if (!best || result.matchScore > best.matchScore) {
          best = {
            ...result,
            customerId: String(customer.id),
            interestId: interest?.id ? String(interest.id) : null,
          };
        }
      }
    }

    return best;
  }

  private async calculateLocation(
    demand: EphMatchDemand,
    unit: any,
    useDistance: boolean,
    strictLocation: boolean,
    allowNearbyNeighborhood: boolean,
  ) {
    const city = this.normalizeText(demand.city);
    const neighborhood = this.normalizeLocationText(demand.neighborhood);

    const project = unit.project || {};

    const district = this.normalizeDistrict(
      demand.district,
      demand.city,
    );

    const unitDistrict = this.normalizeDistrict(
      project.district,
      project.city,
    );
    const unitNeighborhood = this.normalizeLocationText(
      project.neighborhood || project.mapAddress || project.address,
    );

    if (strictLocation) {
      if (district && unitDistrict && district !== unitDistrict) {
        return { eligible: false, score: 0, reason: '', distance: null };
      }

      if (neighborhood) {
        if (unitNeighborhood) {
          if (unitNeighborhood.includes(neighborhood)) {
            return {
              eligible: true,
              score: 30,
              reason: 'Seçilen mahalle eşleşiyor',
              distance: null,
            };
          }
          if (!allowNearbyNeighborhood || (district && !unitDistrict)) {
            return { eligible: false, score: 0, reason: '', distance: null };
          }
        }

        if (!unitNeighborhood) {
          if (district && unitDistrict === district) {
            return {
              eligible: true,
              score: 12,
              reason: 'İlan mahalle bilgisi eksik; konum teyidi gerekli',
              distance: null,
            };
          }
          return {
            eligible: true,
            score: 6,
            reason: 'İlan mahalle ve ilçe bilgisi eksik; konum teyidi gerekli',
            distance: null,
          };
        }
      }

      if (!neighborhood && district && unitDistrict === district) {
        return {
          eligible: true,
          score: 30,
          reason: 'Seçilen ilçe eşleşiyor',
          distance: null,
        };
      }

      if (!neighborhood && district && !unitDistrict) {
        return {
          eligible: true,
          score: 8,
          reason: 'İlan ilçe bilgisi eksik; konum teyidi gerekli',
          distance: null,
        };
      }
    }

    if (useDistance && neighborhood && city) {
      const origin = {
        label: demand.title?.trim() || 'EPH hedef bölgesi',
        address: [demand.neighborhood, demand.district, demand.city, 'Türkiye']
          .filter(Boolean)
          .join(', '),
        city: demand.city || undefined,
        district: demand.district || undefined,
        neighborhood: demand.neighborhood || undefined,
      };

      const destination = this.buildUnitDistancePoint(unit);

      if (destination) {
        try {
          const distanceResult: any = await this.distanceService.calculate({
            origin,
            destination,
            routingPreference: 'TRAFFIC_AWARE',
            avoidFerries: true,
            avoidTolls: false,
            avoidHighways: false,
          });

          const straightLineDistanceKm =
            typeof distanceResult?.straightLine?.distanceKm === 'number'
              && Number.isFinite(distanceResult.straightLine.distanceKm)
              && distanceResult.straightLine.distanceKm >= 0
              ? Number(distanceResult.straightLine.distanceKm)
              : null;

          const requiresVerifiedRoute = strictLocation && allowNearbyNeighborhood &&
            Boolean(unitNeighborhood) && !unitNeighborhood.includes(neighborhood);
          const drivingDistanceKm =
            distanceResult?.driving?.available === true &&
            typeof distanceResult.driving.distanceKm === 'number' &&
            Number.isFinite(distanceResult.driving.distanceKm) &&
            distanceResult.driving.distanceKm >= 0
              ? Number(distanceResult.driving.distanceKm)
              : null;
          const locationDistanceKm = requiresVerifiedRoute
            ? distanceResult?.decision?.ready === true ? drivingDistanceKm : null
            : straightLineDistanceKm;

          if (
            (straightLineDistanceKm !== null && straightLineDistanceKm > this.locationRadiusKm) ||
            (locationDistanceKm !== null && locationDistanceKm > this.locationRadiusKm)
          ) {
            return {
              eligible: false,
              score: 0,
              reason: '',
              distance: null,
            };
          }

          if (locationDistanceKm !== null) {
            const score = this.getDistanceLocationScore(locationDistanceKm);

            return {
              eligible: true,
              score: score.score,
              reason: requiresVerifiedRoute ? `${score.reason} · araç mesafesi` : score.reason,
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
                straightLineDistanceKm,
              },
            };
          }
        } catch {
          // Coğrafi servis kullanılamazsa hiyerarşik konum eşleşmesine düş.
        }
      }
    }

    if (strictLocation && neighborhood && unitNeighborhood &&
      !unitNeighborhood.includes(neighborhood)) {
      return { eligible: false, score: 0, reason: '', distance: null };
    }

    if (
      neighborhood &&
      unitNeighborhood &&
      unitNeighborhood.includes(neighborhood)
    ) {
      return {
        eligible: true,
        score: 30,
        reason: 'Mahalle eşleşiyor',
        distance: null,
      };
    }

    if (district && district === unitDistrict) {
      return {
        eligible: true,
        score: neighborhood ? 25 : 30,
        reason: 'İlçe eşleşiyor',
        distance: null,
      };
    }

    if (city) {
      return {
        eligible: true,
        score: district || neighborhood ? 15 : 30,
        reason: district
          ? 'Aynı ilde alternatif bölge'
          : 'İl eşleşiyor',
        distance: null,
      };
    }

    return {
      eligible: true,
      score: district || neighborhood ? 0 : 30,
      reason: 'Konum kriteri belirtilmedi',
      distance: null,
    };
  }

  private buildUnitDistancePoint(unit: any) {
    const project = unit?.project;

    if (!project) {
      return null;
    }

    const latitude = Number(project.latitude);
    const longitude = Number(project.longitude);
    const hasCoordinates =
      Number.isFinite(latitude) &&
      Number.isFinite(longitude) &&
      latitude !== 0 &&
      longitude !== 0;

    const address =
      String(project.mapAddress || '').trim() ||
      [
        project.neighborhood,
        project.address,
        project.district,
        project.city,
        'Türkiye',
      ]
        .filter(Boolean)
        .join(', ');

    if (!hasCoordinates && !String(project.placeId || '').trim() && !address) {
      return null;
    }

    return {
      label: project.name?.trim() || `Portföy ${String(unit.id).slice(0, 8)}`,
      latitude: hasCoordinates ? latitude : undefined,
      longitude: hasCoordinates ? longitude : undefined,
      placeId: String(project.placeId || '').trim() || undefined,
      address: address || undefined,
      city: project.city || undefined,
      district: project.district || undefined,
      neighborhood: project.neighborhood || undefined,
    };
  }

  private calculatePriceMatch(input: {
    unitPrice: number;
    minBudget?: number | null;
    maxBudget?: number | null;
    tolerance: number;
  }): PriceMatch {
    const unitPrice = Math.max(0, Number(input.unitPrice || 0));
    const minBudget = this.toPositiveNumber(input.minBudget);
    const maxBudget = this.toPositiveNumber(input.maxBudget);
    const tolerancePercent = Math.round(input.tolerance * 100);
    const sellerNegotiationFloor = unitPrice * (1 - input.tolerance);

    if (maxBudget === null) {
      return {
        eligible: true,
        score: minBudget === null || unitPrice >= minBudget ? 50 : 46,
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
      const minimumFits =
        minBudget === null || unitPrice >= minBudget;

      return {
        eligible: true,
        score: minimumFits ? 50 : 46,
        reasons: [
          minimumFits
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
    unit: any,
    demand: EphMatchDemand,
    group: PropertyGroup,
    requireKnownMust = false,
  ) {
    const weights = this.getSecondaryWeights(group);
    let score = 0;
    const reasons: string[] = [];

    const unitArea =
      this.toPositiveNumber(unit.area) ??
      this.toPositiveNumber(unit.grossArea) ??
      this.toPositiveNumber(unit.netArea);

    if (!this.rangeRequested(demand.minArea, demand.maxArea)) {
      score += weights.area;
    }

    if (
      weights.area > 0 &&
      this.rangeRequested(demand.minArea, demand.maxArea) &&
      unitArea !== null
    ) {
      const minimumArea =
        this.toPositiveNumber(demand.minArea);

      const maximumArea =
        this.toPositiveNumber(demand.maxArea);

      if (
        minimumArea !== null &&
        unitArea >= minimumArea
      ) {
        score += weights.area;

        reasons.push(
          maximumArea !== null && unitArea > maximumArea
            ? `Minimum m² kriterini karşılıyor; daha geniş (${unitArea} m²)`
            : 'm² hedefi uyumlu',
        );
      } else if (
        minimumArea === null &&
        maximumArea !== null &&
        unitArea <= maximumArea
      ) {
        score += weights.area;
        reasons.push('m² hedefi uyumlu');
      }
    }

    const cardCriteria = demand.cardProfileCriteria as Record<string, any> | null;
    const cardValues = cardCriteria?.values && typeof cardCriteria.values === 'object'
      ? cardCriteria.values as Record<string, unknown>
      : {};
    const profileRooms = Array.isArray(cardValues.roomCount)
      ? cardValues.roomCount.map(String).filter((room) => room.trim())
      : [];
    const roomAlternatives = profileRooms.length > 1;
    const requestedRooms = (requireKnownMust && cardCriteria?.priorities?.roomCount === 'ANY' ? [] : roomAlternatives ? profileRooms : demand.roomCounts || [])
      .map(String)
      .filter((room) => room.trim());

    if (!requestedRooms.length) {
      score += weights.room;
    } else if (
      weights.room > 0 &&
      unit.roomCount &&
      (roomAlternatives
        ? matchesCriterion('EXACT_OR_ANY', requestedRooms, unit.roomCount)
        : requestedRooms.some((room) =>
            matchesCriterion('ORDERED_MINIMUM', [room], unit.roomCount),
          ))
    ) {
      score += weights.room;
      reasons.push('Minimum oda sayısı kriterini karşılıyor');
    }

    const featureMatch = this.calculateFeatureMatch(unit, demand, requireKnownMust);

    if (featureMatch.mustMismatch) {
      return { eligible: false, score: 0, reasons: [] };
    }

    if (weights.features > 0) {
      if (featureMatch.requested === 0) {
        score += weights.features;
      } else if (featureMatch.matched > 0) {
        score += Math.max(
          1,
          Math.round(
            weights.features *
              (featureMatch.matched / featureMatch.requested),
          ),
        );
        reasons.push(
          `${featureMatch.matched}/${featureMatch.requested} özellik/kart kriteri uyumlu`,
        );
      }
    }

    reasons.push(...featureMatch.verificationReasons);

    return { eligible: true, score, reasons };
  }

  private calculateFeatureMatch(unit: any, demand: EphMatchDemand, requireKnownMust = false) {
    let requested = 0;
    let matched = 0;

    if (Array.isArray(demand.features) && demand.features.length > 0) {
      const requestedFeatures = new Set(
        demand.features
          .map((feature) => this.normalizeText(feature))
          .filter(Boolean),
      );
      const availableFeatures = new Set(
        (Array.isArray(unit.features) ? unit.features : [])
          .filter((feature: unknown) =>
            !String(feature || '').startsWith('__EPH_META__:'),
          )
          .map((feature: unknown) => this.normalizeText(feature))
          .filter(Boolean),
      );

      requested += requestedFeatures.size;
      matched += [...requestedFeatures].filter((feature) =>
        availableFeatures.has(feature),
      ).length;
    }

    const rawCriteria = demand.cardProfileCriteria;

    const criteria =
      rawCriteria &&
      typeof rawCriteria === 'object' &&
      !Array.isArray(rawCriteria) &&
      'values' in rawCriteria &&
      rawCriteria.values &&
      typeof rawCriteria.values === 'object' &&
      !Array.isArray(rawCriteria.values)
        ? (rawCriteria.values as Record<string, unknown>)
        : null;

    let resolved: ReturnType<PropertyCardProfileService['resolve']> | null = null;
    try {
      resolved = this.propertyCardProfileService.resolve({
        unitType: String(unit.type || ''),
        values: unit,
        features: Array.isArray(unit.features) ? unit.features : [],
      });
    } catch {
      resolved = null;
    }

    const slotMap = new Map(
      (resolved?.slots || []).map((slot) => [slot.key, slot.value]),
    );

    const requestedProfile =
      rawCriteria &&
      typeof rawCriteria === 'object' &&
      !Array.isArray(rawCriteria) &&
      'profile' in rawCriteria
        ? String(rawCriteria.profile || '')
        : '';

    const resolvedProfile = String((resolved as any)?.profile?.code || '');

    const profileCode =
      requestedProfile || resolvedProfile;

    const priorities =
      rawCriteria &&
      typeof rawCriteria === 'object' &&
      !Array.isArray(rawCriteria) &&
      'priorities' in rawCriteria &&
      (rawCriteria as any).priorities &&
      typeof (rawCriteria as any).priorities === 'object' &&
      !Array.isArray((rawCriteria as any).priorities)
        ? (rawCriteria as any).priorities as Record<string, unknown>
        : {};
    let mustMismatch = false;
    const verificationReasons: string[] = [];

    const priorityFor = (key: string) => {
      const raw = String(priorities[key] ?? '').trim().toUpperCase();
      return raw === 'MUST' || raw === 'PREFERENCE' || raw === 'ANY'
        ? raw
        : 'PREFERENCE';
    };

    for (const [key, rawPriority] of Object.entries(priorities)) {
      if (String(rawPriority ?? '').trim().toUpperCase() !== 'MUST') continue;
      const expected = criteria?.[key];
      if (!Array.isArray(expected) || expected.length === 0) {
        if (requireKnownMust) mustMismatch = true;
        verificationReasons.push(`Teyit gerekli: ${this.getCriterionLabel(key)} kriteri tamamlanmamış`);
      }
    }

    if (!criteria) {
      return { requested, matched, mustMismatch, verificationReasons };
    }

    for (const [key, rawValues] of Object.entries(criteria)) {
      const expectedValues = (
        Array.isArray(rawValues) ? rawValues : []
      ).filter(
        (value) => String(value ?? '').trim(),
      );

      if (!expectedValues.length) continue;

      const priority = priorityFor(key);
      if (priority === 'ANY') continue;

      requested += 1;

      const actualValue = slotMap.get(key);
      const hasActual = actualValue !== null && actualValue !== undefined && String(actualValue).trim() !== '';

      if (!slotMap.has(key) || !hasActual) {
        if (requireKnownMust && priority === 'PREFERENCE') verificationReasons.push(`Bilgi eksik: ${this.getCriterionLabel(key)} teyit edilmeli`);
        if (priority === 'MUST') {
          if (requireKnownMust) mustMismatch = true;
          verificationReasons.push(`Teyit gerekli: ilanda ${this.getCriterionLabel(key)} bilgisi bulunmuyor`);
        }
        continue;
      }

      const semantic = getCriterionSemantic(
        profileCode,
        key,
      );

      const operator = key === 'roomCount' && expectedValues.length > 1
        ? 'EXACT_OR_ANY'
        : semantic.operator;

      if (
        matchesCriterion(
          operator,
          expectedValues,
          actualValue,
        )
      ) {
        matched += 1;
      } else if (priority === 'MUST') {
        mustMismatch = true;
      }
    }

    return { requested, matched, mustMismatch, verificationReasons };
  }

  private passesCityFilter(requestedCity: unknown, projectCity: unknown) {
    const requested = this.normalizeText(requestedCity);
    return !requested || requested === this.normalizeText(projectCity);
  }

  private passesPropertyTypeFilter(
    propertyTypes: EphMatchDemand['propertyTypes'],
    unitType: unknown,
  ) {
    if (!Array.isArray(propertyTypes) || propertyTypes.length === 0) {
      return true;
    }

    const requested = propertyTypes.map((value) =>
      String(value).toUpperCase(),
    );

    return requested.includes(String(unitType || '').toUpperCase());
  }

  private passesStatusFilter(demand: EphMatchDemand, unitStatus: unknown) {
    const status = String(unitStatus || '').toUpperCase();

    if (Array.isArray(demand.statuses) && demand.statuses.length > 0) {
      return demand.statuses
        .map((value) => String(value).toUpperCase())
        .includes(status);
    }

    const intent = String(demand.purchaseIntent || '').toUpperCase();

    if (intent === 'KIRALAMA') {
      return new Set([
        'KIRALIK',
        'GUNLUK_KIRALIK',
        'DEVREN_KIRALIK',
      ]).has(status);
    }

    if (intent === 'SATIN_ALMA' || intent === 'YATIRIM') {
      return new Set([
        'SATILIK',
        'DEVREN_SATILIK',
        'ON_SATIS',
        'YAKINDA_SATISTA',
        'INSAAT_HALINDE',
        'TESLIME_HAZIR',
        'HEMEN_TESLIM',
      ]).has(status);
    }

    if (intent === 'KAT_KARSILIGI') {
      return status === 'KAT_KARSILIGI';
    }

    return true;
  }

  private getPropertyGroup(type: unknown): PropertyGroup {
    const value = String(type || '').toUpperCase();

    if (this.landTypes.has(value)) return 'LAND';
    if (this.industrialTypes.has(value)) return 'INDUSTRIAL';
    if (this.commercialTypes.has(value)) return 'COMMERCIAL';
    if (this.tourismTypes.has(value)) return 'TOURISM';
    if (this.projectTypes.has(value)) return 'PROJECT';

    return 'RESIDENTIAL';
  }

  private getCriterionLabel(key: string) {
    const labels: Record<string, string> = {
      roomCount: 'Oda planı',
      netArea: 'Net m²',
      grossArea: 'Brüt m²',
      floor: 'Kat',
      floorLabel: 'Kat',
      buildingAge: 'Bina yaşı',
      heatingType: 'Isıtma',
      parkingType: 'Otopark',
      facade: 'Cephe',
      elevatorStatus: 'Asansör',
      balconyStatus: 'Balkon',
    };
    return labels[key] || key.replace(/([a-z])([A-Z])/g, '$1 $2');
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

  private getSecondaryWeights(group: PropertyGroup) {
    if (group === 'LAND') return { area: 12, room: 0, features: 8 };
    if (group === 'INDUSTRIAL') return { area: 8, room: 0, features: 12 };
    if (group === 'COMMERCIAL') return { area: 10, room: 0, features: 10 };

    if (group === 'TOURISM' || group === 'PROJECT') {
      return { area: 8, room: 2, features: 10 };
    }

    return { area: 10, room: 5, features: 5 };
  }

  private getDistanceLocationScore(distanceKm: number) {
    if (distanceKm <= 0.5) {
      return {
        score: 30,
        reason: `Hedef bölge merkezine ${this.formatKm(distanceKm)} km`,
      };
    }

    if (distanceKm <= 1) {
      return {
        score: 28,
        reason: `Hedef bölgeye çok yakın (${this.formatKm(distanceKm)} km)`,
      };
    }

    if (distanceKm <= 2.5) {
      return {
        score: 25,
        reason: `Hedef bölgeye yakın (${this.formatKm(distanceKm)} km)`,
      };
    }

    if (distanceKm <= 4) {
      return {
        score: 22,
        reason: `Hedef bölge çevresinde (${this.formatKm(distanceKm)} km)`,
      };
    }

    return {
      score: 18,
      reason: `5 km eşleşme alanında (${this.formatKm(distanceKm)} km)`,
    };
  }

  private getMatchLevel(score: number): 'GUCLU' | 'UYGUN' | 'ZAYIF' {
    if (score >= 75) return 'GUCLU';
    if (score >= 40) return 'UYGUN';
    return 'ZAYIF';
  }

  private rangeRequested(min: unknown, max: unknown) {
    return this.toPositiveNumber(min) !== null ||
      this.toPositiveNumber(max) !== null;
  }

  private isWithinOptionalRange(
    value: unknown,
    min: unknown,
    max: unknown,
  ) {
    const numeric = this.toPositiveNumber(value);
    const minimum = this.toPositiveNumber(min);
    const maximum = this.toPositiveNumber(max);

    if (numeric === null) return false;
    if (minimum !== null && numeric < minimum) return false;
    if (maximum !== null && numeric > maximum) return false;

    return true;
  }

  private toPositiveNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const numeric = Number(value);

    return Number.isFinite(numeric) && numeric > 0
      ? numeric
      : null;
  }

  normalizeDistrict(
    value: unknown,
    city?: unknown,
  ) {
    let district = this.normalizeLocationText(value)
      .replace(/\s+/g, ' ')
      .trim();

    const normalizedCity = this.normalizeLocationText(city);

    if (
      normalizedCity &&
      district.startsWith(`${normalizedCity} `)
    ) {
      district = district
        .slice(normalizedCity.length)
        .trim();
    }

    return district;
  }

  private normalizeText(value: unknown) {
    return String(value || '')
      .trim()
      .toLocaleLowerCase('tr-TR');
  }

  private normalizeLocationText(value: unknown) {
    return this.normalizeText(value)
      .replace(/\bmahallesi\b/g, '')
      .replace(/\bmah\.?\b/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private formatKm(value: number) {
    return value < 1
      ? value.toFixed(2)
      : value.toFixed(1);
  }

  private async mapWithConcurrency<T, R>(
    items: T[],
    concurrency: number,
    worker: (item: T) => Promise<R>,
  ): Promise<R[]> {
    const results = new Array<R>(items.length);
    let nextIndex = 0;

    const runners = Array.from(
      { length: Math.min(concurrency, items.length) },
      async () => {
        while (true) {
          const index = nextIndex++;
          if (index >= items.length) return;

          results[index] = await worker(items[index]);
        }
      },
    );

    await Promise.all(runners);

    return results;
  }
}
