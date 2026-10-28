import { Injectable } from '@nestjs/common';
import { NetworkVisibility } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type DemandHeatmapQuery = {
  city?: unknown;
  district?: unknown;
  days?: unknown;
};

type DemandArea = {
  city: string;
  district: string;
  neighborhood: string;
};

type DemandRow = {
  id: string;
  city: string | null;
  district: string | null;
  neighborhood: string | null;
  areas: unknown;
  budget: number | null;
  minBudget: number | null;
  maxBudget: number | null;
  minArea: number | null;
  maxArea: number | null;
  propertyTypes: string[];
  roomCounts: string[];
  priceCurrency: string;
  tags: string[];
  createdAt: Date;
};

type CountItem = {
  key: string;
  count: number;
};

const DEFAULT_DAYS = 30;
const MAX_DAYS = 90;
const MAX_SOURCE_ROWS = 5000;
const MIN_DETAIL_COHORT = 3;

@Injectable()
export class ProjectSalesDemandHeatmapService {
  constructor(private readonly prisma: PrismaService) {}

  async getHeatmap(query: DemandHeatmapQuery) {
    const now = new Date();
    const days = this.normalizeDays(query.days);
    const from = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const requestedCity = this.cleanText(query.city);
    const requestedDistrict = this.cleanText(query.district);

    const rows = await this.prisma.networkPost.findMany({
      where: {
        type: 'PORTFOY_ARIYORUM',
        isActive: true,
        createdAt: { gte: from },
        expiresAt: { gt: now },
        visibility: {
          in: [
            NetworkVisibility.TUM_EPH,
            NetworkVisibility.SADECE_MUTEAHHITLER,
          ],
        },
      },
      select: {
        id: true,
        city: true,
        district: true,
        neighborhood: true,
        areas: true,
        budget: true,
        minBudget: true,
        maxBudget: true,
        minArea: true,
        maxArea: true,
        propertyTypes: true,
        roomCounts: true,
        priceCurrency: true,
        tags: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: MAX_SOURCE_ROWS,
    });

    const filtered = (rows as DemandRow[]).filter((row) =>
      this.matchesLocationFilter(
        this.normalizeAreas(row),
        requestedCity,
        requestedDistrict,
      ),
    );

    const locationKeys = {
      cities: new Map<string, number>(),
      districts: new Map<string, number>(),
      neighborhoods: new Map<string, number>(),
    };
    const propertyTypes = new Map<string, number>();
    const roomCounts = new Map<string, number>();
    const intents = new Map<string, number>();
    const budgetSamples = new Map<string, number[]>();
    const areaSamples: number[] = [];

    for (const row of filtered) {
      const areas = this.normalizeAreas(row);
      const uniqueCities = new Set<string>();
      const uniqueDistricts = new Set<string>();
      const uniqueNeighborhoods = new Set<string>();

      for (const area of areas) {
        if (area.city) uniqueCities.add(area.city);
        if (area.city && area.district) {
          uniqueDistricts.add(`${area.city} / ${area.district}`);
        }
        if (area.city && area.district && area.neighborhood) {
          uniqueNeighborhoods.add(
            `${area.city} / ${area.district} / ${area.neighborhood}`,
          );
        }
      }

      this.incrementUnique(locationKeys.cities, uniqueCities);
      this.incrementUnique(locationKeys.districts, uniqueDistricts);
      this.incrementUnique(locationKeys.neighborhoods, uniqueNeighborhoods);

      for (const propertyType of new Set(row.propertyTypes || [])) {
        if (propertyType) this.increment(propertyTypes, propertyType);
      }

      for (const roomCount of new Set(row.roomCounts || [])) {
        if (roomCount) this.increment(roomCounts, roomCount);
      }

      const intent = this.getRequestIntent(row.tags || []);
      this.increment(intents, intent || 'BELIRSIZ');

      const currency = this.normalizeCurrency(row.priceCurrency);
      const budget = this.getRepresentativeBudget(row);
      if (budget !== null) {
        const samples = budgetSamples.get(currency) || [];
        samples.push(budget);
        budgetSamples.set(currency, samples);
      }

      const area = this.getRepresentativeArea(row);
      if (area !== null) areaSamples.push(area);
    }

    const summaryCount = filtered.length;

    return {
      generatedAt: now.toISOString(),
      period: {
        days,
        from: from.toISOString(),
        to: now.toISOString(),
      },
      filters: {
        city: requestedCity || null,
        district: requestedDistrict || null,
      },
      summary: {
        activeRequestCount: summaryCount,
        saleRequestCount: intents.get('PORTFOY_SATILIK') || 0,
        rentRequestCount: intents.get('PORTFOY_KIRALIK') || 0,
        sourceRowLimit: MAX_SOURCE_ROWS,
        sourceRowsScanned: rows.length,
        sourceLimitReached: rows.length >= MAX_SOURCE_ROWS,
        privacyMinimumCohort: MIN_DETAIL_COHORT,
      },
      locations: {
        cities: this.rankCounts(locationKeys.cities, summaryCount, 20, 1),
        districts: this.rankCounts(locationKeys.districts, summaryCount, 30, 1),
        neighborhoods: this.rankCounts(
          locationKeys.neighborhoods,
          summaryCount,
          40,
          MIN_DETAIL_COHORT,
        ),
      },
      propertyTypes: this.rankCounts(propertyTypes, summaryCount, 30, 1),
      roomCounts: this.rankCounts(roomCounts, summaryCount, 20, 1),
      budgetByCurrency: Array.from(budgetSamples.entries())
        .map(([currency, values]) => ({
          currency,
          ...this.getNumericStats(values),
        }))
        .filter((item) => item.sampleCount >= MIN_DETAIL_COHORT)
        .sort((left, right) => right.sampleCount - left.sampleCount),
      area: this.getNumericStats(areaSamples),
      privacy: {
        identityFieldsIncluded: false,
        titlesIncluded: false,
        descriptionsIncluded: false,
        phoneOrEmailIncluded: false,
        neighborhoodMinimumCohort: MIN_DETAIL_COHORT,
        aggregateOnly: true,
      },
      policy: {
        version: 'PROJECT_DEMAND_HEATMAP_V1',
        source: 'TALEP_MERKEZI',
        includesPrivateCrm: false,
        includesExpiredRequests: false,
        connectionOnlyRequestsExcluded: true,
      },
    };
  }

  private normalizeAreas(row: {
    areas: unknown;
    city: string | null;
    district: string | null;
    neighborhood: string | null;
  }): DemandArea[] {
    const rawAreas = Array.isArray(row.areas) ? row.areas : [];
    const normalized = rawAreas
      .map((area) => {
        if (!area || typeof area !== 'object' || Array.isArray(area)) {
          return null;
        }

        const item = area as Record<string, unknown>;
        return {
          city: this.cleanText(item.city),
          district: this.cleanText(item.district),
          neighborhood: this.cleanText(item.neighborhood),
        };
      })
      .filter(
        (area): area is DemandArea =>
          Boolean(area && (area.city || area.district || area.neighborhood)),
      );

    if (normalized.length > 0) return normalized;

    const legacy = {
      city: this.cleanText(row.city),
      district: this.cleanText(row.district),
      neighborhood: this.cleanText(row.neighborhood),
    };

    return legacy.city || legacy.district || legacy.neighborhood
      ? [legacy]
      : [];
  }

  private matchesLocationFilter(
    areas: DemandArea[],
    city: string,
    district: string,
  ) {
    if (!city && !district) return true;

    return areas.some((area) => {
      const cityMatches = !city || this.sameText(area.city, city);
      const districtMatches = !district || this.sameText(area.district, district);
      return cityMatches && districtMatches;
    });
  }

  private getRequestIntent(tags: string[]) {
    const tag = tags.find((item) =>
      String(item || '').startsWith('Talep Türü:'),
    );

    return String(tag || '')
      .replace('Talep Türü:', '')
      .trim()
      .toUpperCase();
  }

  private getRepresentativeBudget(row: DemandRow) {
    const min = this.toPositiveNumber(row.minBudget ?? row.budget);
    const max = this.toPositiveNumber(row.maxBudget ?? row.budget);

    if (min !== null && max !== null) return (min + max) / 2;
    return max ?? min;
  }

  private getRepresentativeArea(row: DemandRow) {
    const min = this.toPositiveNumber(row.minArea);
    const max = this.toPositiveNumber(row.maxArea);

    if (min !== null && max !== null) return (min + max) / 2;
    return max ?? min;
  }

  private getNumericStats(values: number[]) {
    const cleaned = values
      .filter((value) => Number.isFinite(value) && value > 0)
      .sort((left, right) => left - right);

    if (cleaned.length < MIN_DETAIL_COHORT) {
      return {
        sampleCount: cleaned.length,
        minimum: null,
        median: null,
        average: null,
        maximum: null,
      };
    }

    const middle = Math.floor(cleaned.length / 2);
    const median =
      cleaned.length % 2 === 0
        ? (cleaned[middle - 1] + cleaned[middle]) / 2
        : cleaned[middle];
    const average =
      cleaned.reduce((total, value) => total + value, 0) / cleaned.length;

    return {
      sampleCount: cleaned.length,
      minimum: this.round(cleaned[0]),
      median: this.round(median),
      average: this.round(average),
      maximum: this.round(cleaned[cleaned.length - 1]),
    };
  }

  private rankCounts(
    source: Map<string, number>,
    total: number,
    limit: number,
    minimumCohort: number,
  ) {
    const entries: CountItem[] = Array.from(source.entries())
      .map(([key, count]) => ({ key, count }))
      .filter((item) => item.count >= minimumCohort)
      .sort((left, right) => {
        if (right.count !== left.count) return right.count - left.count;
        return left.key.localeCompare(right.key, 'tr-TR');
      })
      .slice(0, limit);
    const maximum = entries[0]?.count || 0;

    return entries.map((item) => ({
      key: item.key,
      count: item.count,
      sharePercent: total > 0 ? this.round((item.count / total) * 100) : 0,
      demandScore:
        maximum > 0 ? Math.max(1, Math.round((item.count / maximum) * 100)) : 0,
    }));
  }

  private increment(source: Map<string, number>, key: string) {
    source.set(key, (source.get(key) || 0) + 1);
  }

  private incrementUnique(source: Map<string, number>, keys: Set<string>) {
    for (const key of keys) this.increment(source, key);
  }

  private normalizeDays(value: unknown) {
    if (value === undefined || value === null || value === '') return DEFAULT_DAYS;
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 1) return DEFAULT_DAYS;
    return Math.min(parsed, MAX_DAYS);
  }

  private normalizeCurrency(value: unknown) {
    const currency = String(value || 'TRY').trim().toUpperCase();
    return currency || 'TRY';
  }

  private sameText(left: unknown, right: unknown) {
    return this.normalizeText(left) === this.normalizeText(right);
  }

  private normalizeText(value: unknown) {
    return this.cleanText(value).toLocaleLowerCase('tr-TR');
  }

  private cleanText(value: unknown) {
    return String(value || '').trim();
  }

  private toPositiveNumber(value: unknown) {
    if (value === null || value === undefined || value === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

  private round(value: number) {
    return Math.round(value * 100) / 100;
  }
}
