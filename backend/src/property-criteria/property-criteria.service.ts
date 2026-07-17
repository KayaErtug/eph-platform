import { Injectable } from '@nestjs/common';
import { UnitStatus, UnitType } from '@prisma/client';

import {
  NormalizedPropertyCriteria,
  PROPERTY_CRITERIA_VERSION,
  PropertyCriteriaArea,
  PropertyCriteriaAreaInput,
  PropertyCriteriaInput,
  PropertyCriteriaRange,
} from './property-criteria.types';

const UNIT_TYPE_ALIASES: Record<string, UnitType> = {
  DAG_EVI_YAYLA_EVI: UnitType.DAG_EVI,
  APARTMAN: UnitType.KOMPLE_BINA,
  IS_HANI: UnitType.IS_MERKEZI,
  PLAZA_BINA: UnitType.IS_MERKEZI,
  REZIDANS_BINA: UnitType.KOMPLE_BINA,
  OTEL_BINASI: UnitType.OTEL_PANSIYON,
  BENZIN_ISTASYONU: UnitType.AKARYAKIT_ISTASYONU,
};


@Injectable()
export class PropertyCriteriaService {
  normalize(input: PropertyCriteriaInput): NormalizedPropertyCriteria {
    const exactPrice = this.toNumber(input.price);
    const exactGrossArea = this.toNumber(input.grossArea ?? input.area);
    const exactNetArea = this.toNumber(input.netArea);

    return {
      version: PROPERTY_CRITERIA_VERSION,
      recordKind: input.recordKind,
      source: input.source ?? 'UNKNOWN',
      sourceId: this.toNullableString(input.sourceId),

      areas: this.normalizeAreas(input.areas, {
        country: input.country,
        city: input.city,
        district: input.district,
        neighborhood: input.neighborhood,
        latitude: input.latitude,
        longitude: input.longitude,
      }),

      propertyTypes: this.normalizeUnitTypes(
        input.propertyTypes ?? input.propertyType,
      ),

      statuses: this.normalizeEnumArray(
        input.statuses ?? input.status,
        Object.values(UnitStatus),
      ),

      budget: this.normalizeRange(
        input.minBudget ?? exactPrice,
        input.maxBudget ?? exactPrice,
      ),

      priceCurrency: this.normalizeCurrency(input.priceCurrency),

      grossArea: this.normalizeRange(
        input.minArea ?? exactGrossArea,
        input.maxArea ?? exactGrossArea,
      ),

      netArea: this.normalizeRange(
        input.minNetArea ?? exactNetArea,
        input.maxNetArea ?? exactNetArea,
      ),

      roomCounts: this.normalizeStringArray(
        input.roomCounts ?? input.roomCount,
      ),

      features: this.normalizeStringArray(input.features),

      availableCreditAmount: this.toNumber(input.availableCreditAmount),
      isActive: this.toBoolean(input.isActive, true),
    };
  }

  normalizeAreas(
    value: unknown,
    fallback?: PropertyCriteriaAreaInput,
  ): PropertyCriteriaArea[] {
    const rawAreas = this.toArray(this.parseJsonValue(value));

    if (rawAreas.length === 0 && fallback) {
      rawAreas.push(fallback);
    }

    const seen = new Set<string>();
    const result: PropertyCriteriaArea[] = [];

    for (const rawArea of rawAreas) {
      if (!this.isRecord(rawArea)) {
        continue;
      }

      const area: PropertyCriteriaArea = {
        country:
          this.toNullableString(rawArea.country)?.toUpperCase() || 'TR',
        city: this.toNullableString(rawArea.city) || '',
        district: this.toNullableString(rawArea.district) || '',
        neighborhood: this.toNullableString(rawArea.neighborhood) || '',
        latitude: this.toNumber(rawArea.latitude),
        longitude: this.toNumber(rawArea.longitude),
      };

      if (!area.city) {
        continue;
      }

      const key = [
        area.country,
        area.city,
        area.district,
        area.neighborhood,
      ]
        .map((part) => part.toLocaleLowerCase('tr-TR'))
        .join('|');

      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      result.push(area);
    }

    return result;
  }

  buildAreaSummary(areas: PropertyCriteriaArea[]): string {
    return areas
      .map((area) =>
        [area.city, area.district, area.neighborhood]
          .filter(Boolean)
          .join(' / '),
      )
      .filter(Boolean)
      .join(' | ');
  }

  private normalizeUnitTypes(
    value: unknown,
  ): UnitType[] {
    const allowed = new Set<string>(
      Object.values(UnitType),
    );
    const seen = new Set<UnitType>();
    const result: UnitType[] = [];

    for (const item of this.toArray(value)) {
      const raw =
        this.toNullableString(item)?.toUpperCase();

      if (!raw) {
        continue;
      }

      const normalized = allowed.has(raw)
        ? (raw as UnitType)
        : UNIT_TYPE_ALIASES[raw];

      if (!normalized || seen.has(normalized)) {
        continue;
      }

      seen.add(normalized);
      result.push(normalized);
    }

    return result;
  }

  private normalizeEnumArray<T extends string>(
    value: unknown,
    allowedValues: readonly T[],
  ): T[] {
    const allowed = new Set<string>(allowedValues);
    const seen = new Set<string>();
    const result: T[] = [];

    for (const item of this.toArray(value)) {
      const normalized = this.toNullableString(item)?.toUpperCase();

      if (!normalized || !allowed.has(normalized) || seen.has(normalized)) {
        continue;
      }

      seen.add(normalized);
      result.push(normalized as T);
    }

    return result;
  }

  private normalizeStringArray(value: unknown): string[] {
    const seen = new Set<string>();
    const result: string[] = [];

    for (const item of this.toArray(value)) {
      const normalized = this.toNullableString(item);

      if (!normalized) {
        continue;
      }

      const key = normalized.toLocaleLowerCase('tr-TR');

      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      result.push(normalized);
    }

    return result;
  }

  private normalizeRange(
    minimumValue: unknown,
    maximumValue: unknown,
  ): PropertyCriteriaRange {
    let min = this.toNumber(minimumValue);
    let max = this.toNumber(maximumValue);

    if (min !== null && max !== null && min > max) {
      [min, max] = [max, min];
    }

    return { min, max };
  }

  private normalizeCurrency(value: unknown): string {
    return this.toNullableString(value)?.toUpperCase() || 'TRY';
  }

  private toArray(value: unknown): unknown[] {
    if (Array.isArray(value)) {
      return value;
    }

    if (value === null || value === undefined || value === '') {
      return [];
    }

    if (typeof value === 'string' && /[,|]/.test(value)) {
      return value
        .split(/[,|]/)
        .map((item) => item.trim())
        .filter(Boolean);
    }

    return [value];
  }

  private parseJsonValue(value: unknown): unknown {
    if (typeof value !== 'string') {
      return value;
    }

    const trimmed = value.trim();

    if (!trimmed.startsWith('[') && !trimmed.startsWith('{')) {
      return value;
    }

    try {
      return JSON.parse(trimmed);
    } catch {
      return value;
    }
  }

  private toNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const normalized =
      typeof value === 'string'
        ? value.replace(/\s/g, '').replace(',', '.')
        : value;

    const numberValue = Number(normalized);

    return Number.isFinite(numberValue) ? numberValue : null;
  }

  private toNullableString(value: unknown): string | null {
    if (value === null || value === undefined) {
      return null;
    }

    const normalized = String(value).trim();

    return normalized || null;
  }

  private toBoolean(value: unknown, fallback: boolean): boolean {
    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'number') {
      return value !== 0;
    }

    if (typeof value === 'string') {
      const normalized = value.trim().toLocaleLowerCase('tr-TR');

      if (['false', '0', 'hayır', 'hayir', 'pasif'].includes(normalized)) {
        return false;
      }

      if (['true', '1', 'evet', 'aktif'].includes(normalized)) {
        return true;
      }
    }

    return fallback;
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
