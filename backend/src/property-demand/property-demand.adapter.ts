import { Injectable } from "@nestjs/common";
import { UnitType } from "@prisma/client";

import { getCardProfileBinding } from "../property-card/property-card-profile.registry";
import {
  PropertyDemand,
  PropertyDemandArea,
  PropertyDemandCardProfileCriteria,
  PropertyTransactionType,
} from "./property-demand.types";

const REQUEST_CRITERIA_META_PREFIX = "__EPH_META__REQUEST_CRITERIA__:";
const REQUEST_INTENT_TAG_PREFIX = "Talep Türü:";

type RecordLike = Record<string, unknown>;

type LegacyCriteriaMeta = {
  version?: unknown;
  unitType?: unknown;
  cardProfile?: unknown;
  profile?: unknown;
  values?: unknown;
  priorities?: unknown;
};

@Injectable()
export class PropertyDemandAdapter {
  fromNetworkPost(input: RecordLike): PropertyDemand {
    const requestIntent = this.readNetworkRequestIntent(input);
    const unitType = this.readUnitType(input.propertyTypes ?? input.unitType);
    const decodedMeta = this.decodeLegacyCriteria(input.features);
    const cardProfileCriteria = this.resolveCardProfileCriteria(
      input.cardProfileCriteria,
      decodedMeta,
      unitType,
      input.roomCounts,
    );

    const category = this.readNetworkCategory(input.type, requestIntent);

    return {
      category,
      requestIntent,
      transactionType: this.mapNetworkTransaction(requestIntent),
      unitType,
      location: this.mapLocation(input),
      commercial: this.mapCommercial(input, true),
      areaCriteria: this.mapAreaCriteria(input),
      cardProfileCriteria,
      features: this.readRealFeatures(input.features),
      title: this.toString(input.title) ?? "",
      description: this.toString(input.description),
      urgency: this.toString(input.urgency),
      validity: {
        expiresAt: this.toIsoString(input.expiresAt),
      },
      visibility: this.toString(input.visibility) ?? "",
      extension:
        category === "KAT_KARSILIGI_ARSA_ARIYORUM" &&
        this.toNumber(input.landSharePercent) !== null
          ? { landSharePercent: this.toNumber(input.landSharePercent) as number }
          : null,
    };
  }

  fromCustomerInterest(input: RecordLike): PropertyDemand {
    const purchaseIntent = this.toString(input.purchaseIntent);
    const unitType = this.readUnitType(input.propertyTypes ?? input.unitType);
    const decodedMeta = this.decodeLegacyCriteria(input.features);
    const cardProfileCriteria = this.resolveCardProfileCriteria(
      input.cardProfileCriteria,
      decodedMeta,
      unitType,
      input.roomCounts,
    );

    return {
      category: "PORTFOY_ARIYORUM",
      requestIntent: purchaseIntent,
      transactionType: this.mapCrmTransaction(purchaseIntent),
      unitType,
      location: this.mapLocation(input),
      commercial: this.mapCommercial(input, false),
      areaCriteria: this.mapAreaCriteria(input),
      cardProfileCriteria,
      features: this.readRealFeatures(input.features),
      title: this.toString(input.title) ?? "",
      description: this.toString(input.notes ?? input.description),
      urgency: this.toString(input.priority ?? input.urgency),
      validity: { expiresAt: null },
      visibility: "",
      extension: null,
    };
  }

  decodeLegacyCardProfileCriteria(
    features: unknown,
    unitType?: string | null,
    roomCounts?: unknown,
  ): PropertyDemandCardProfileCriteria | null {
    return this.resolveCardProfileCriteria(
      null,
      this.decodeLegacyCriteria(features),
      unitType ?? null,
      roomCounts,
    );
  }

  private resolveCardProfileCriteria(
    firstClassValue: unknown,
    legacyMeta: LegacyCriteriaMeta | null,
    unitType: string | null,
    roomCounts: unknown,
  ): PropertyDemandCardProfileCriteria | null {
    const firstClass = this.normalizeFirstClassCriteria(firstClassValue);
    const legacy = firstClass
      ? null
      : this.normalizeLegacyCriteria(legacyMeta, unitType);
    const resolved = firstClass ?? legacy;
    const fallbackRooms = this.toStringArray(roomCounts);

    if (resolved) {
      const values = this.normalizeCriteriaMap(resolved.values);
      if (!values.roomCount?.length && fallbackRooms.length) {
        values.roomCount = fallbackRooms;
      }
      return { ...resolved, values };
    }

    if (!fallbackRooms.length) return null;

    const profile = this.inferProfile(unitType);
    if (!profile) return null;

    return {
      version: "1.3",
      profile,
      values: { roomCount: fallbackRooms },
    };
  }

  private normalizeFirstClassCriteria(
    value: unknown,
  ): PropertyDemandCardProfileCriteria | null {
    if (!this.isRecord(value)) return null;
    const profile = this.toString(value.profile ?? value.cardProfile);
    if (!profile) return null;

    return {
      version: "1.3",
      profile,
      values: this.normalizeCriteriaMap(value.values),
      ...this.withPriorities(value.priorities),
    };
  }

  private normalizeLegacyCriteria(
    meta: LegacyCriteriaMeta | null,
    unitType: string | null,
  ): PropertyDemandCardProfileCriteria | null {
    if (!meta) return null;
    const profile =
      this.toString(meta.cardProfile ?? meta.profile) ?? this.inferProfile(unitType);
    if (!profile) return null;

    return {
      version: "1.3",
      profile,
      values: this.normalizeCriteriaMap(meta.values ?? meta),
      ...this.withPriorities(meta.priorities),
    };
  }

  private withPriorities(value: unknown) {
    if (!this.isRecord(value)) return {};
    const priorities = Object.fromEntries(
      Object.entries(value)
        .map(([key, raw]) => [key, String(raw ?? "").trim().toUpperCase()] as const)
        .filter(([, priority]) => priority === "MUST" || priority === "PREFERENCE" || priority === "ANY"),
    ) as Record<string, "MUST" | "PREFERENCE" | "ANY">;
    return Object.keys(priorities).length ? { priorities } : {};
  }

  private decodeLegacyCriteria(features: unknown): LegacyCriteriaMeta | null {
    if (!Array.isArray(features)) return null;
    const item = features.find(
      (value) =>
        typeof value === "string" &&
        value.startsWith(REQUEST_CRITERIA_META_PREFIX),
    );
    if (typeof item !== "string") return null;

    try {
      const parsed = JSON.parse(item.slice(REQUEST_CRITERIA_META_PREFIX.length));
      return this.isRecord(parsed) ? (parsed as LegacyCriteriaMeta) : null;
    } catch {
      return null;
    }
  }

  private readRealFeatures(features: unknown): string[] {
    if (!Array.isArray(features)) return [];
    return this.uniqueStrings(
      features.filter(
        (value) =>
          typeof value === "string" &&
          !value.startsWith(REQUEST_CRITERIA_META_PREFIX),
      ),
    );
  }

  private readNetworkRequestIntent(input: RecordLike): string | null {
    const direct = this.toString(input.requestIntent);
    if (direct) return direct;

    if (Array.isArray(input.tags)) {
      for (const tag of input.tags) {
        if (typeof tag !== "string" || !tag.startsWith(REQUEST_INTENT_TAG_PREFIX)) {
          continue;
        }
        const value = tag.slice(REQUEST_INTENT_TAG_PREFIX.length).trim();
        if (value) return value;
      }
    }

    const type = this.toString(input.type);
    return type === "PORTFOY_SATILIK" || type === "PORTFOY_KIRALIK"
      ? type
      : null;
  }

  private readNetworkCategory(typeValue: unknown, requestIntent: string | null) {
    const type = this.toString(typeValue) ?? "";
    if (
      (type === "PORTFOY_SATILIK" || type === "PORTFOY_KIRALIK") &&
      requestIntent === type
    ) {
      return "PORTFOY_ARIYORUM";
    }
    return type;
  }

  private mapNetworkTransaction(
    requestIntent: string | null,
  ): PropertyTransactionType | null {
    if (requestIntent === "PORTFOY_SATILIK") return "SATILIK";
    if (requestIntent === "PORTFOY_KIRALIK") return "KIRALIK";
    return null;
  }

  private mapCrmTransaction(
    purchaseIntent: string | null,
  ): PropertyTransactionType | null {
    if (purchaseIntent === "SATIN_ALMA") return "SATILIK";
    if (purchaseIntent === "KIRALAMA") return "KIRALIK";
    return null;
  }

  private mapLocation(input: RecordLike) {
    const structured = this.parseAreaArray(input.areas);
    const topLevelCity = this.toString(input.city);
    const city = topLevelCity ?? this.toString(structured[0]?.city) ?? null;

    const structuredAreas = structured.length
      ? structured
          .filter((area) => {
            const areaCity = this.toString(area.city);
            return !city || !areaCity || this.sameText(areaCity, city);
          })
          .map((area) => ({
            district: this.toString(area.district),
            neighborhood: this.toString(area.neighborhood),
          }))
          .filter(
            (area): area is { district: string; neighborhood: string | null } =>
              Boolean(area.district),
          )
      : [];

    const flatDistrict = this.toString(input.district);
    const flatAreas: PropertyDemandArea[] =
      structured.length === 0 && flatDistrict
        ? [
            {
              district: flatDistrict,
              neighborhood: this.toString(input.neighborhood),
            },
          ]
        : [];

    return {
      city,
      areas: this.uniqueAreas(structuredAreas.length ? structuredAreas : flatAreas),
    };
  }

  private mapCommercial(input: RecordLike, useLegacyBudget: boolean) {
    const explicitMin = this.toNumber(input.minBudget);
    const explicitMax = this.toNumber(input.maxBudget);
    const legacyBudget = useLegacyBudget ? this.toNumber(input.budget) : null;

    return {
      minBudget: explicitMin,
      maxBudget: explicitMax ?? (explicitMin === null ? legacyBudget : null),
      currency: (this.toString(input.priceCurrency) ?? "TRY").toUpperCase(),
    };
  }

  private mapAreaCriteria(input: RecordLike) {
    let min = this.toNumber(input.minArea);
    let max = this.toNumber(input.maxArea);
    if (min !== null && max !== null && min > max) [min, max] = [max, min];
    return { min, max };
  }

  private readUnitType(value: unknown): string | null {
    const first = Array.isArray(value) ? value[0] : value;
    const normalized = this.toString(first)?.toUpperCase();
    if (!normalized) return null;
    return (Object.values(UnitType) as string[]).includes(normalized)
      ? normalized
      : null;
  }

  private inferProfile(unitType: string | null): string | null {
    if (!unitType || !(Object.values(UnitType) as string[]).includes(unitType)) {
      return null;
    }
    return getCardProfileBinding(unitType as UnitType)?.profileCode ?? null;
  }

  private normalizeCriteriaMap(value: unknown): Record<string, string[]> {
    if (!this.isRecord(value)) return {};
    return Object.fromEntries(
      Object.entries(value)
        .map(([key, raw]) => [key, this.toStringArray(raw)] as const)
        .filter(([, values]) => values.length > 0),
    );
  }

  private parseAreaArray(value: unknown): RecordLike[] {
    let parsed = value;
    if (typeof value === "string") {
      try {
        parsed = JSON.parse(value);
      } catch {
        return [];
      }
    }
    return Array.isArray(parsed)
      ? parsed.filter((item): item is RecordLike => this.isRecord(item))
      : [];
  }

  private uniqueAreas(areas: PropertyDemandArea[]): PropertyDemandArea[] {
    const seen = new Set<string>();
    return areas.filter((area) => {
      const key = `${area.district}|${area.neighborhood ?? ""}`.toLocaleLowerCase("tr-TR");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private toStringArray(value: unknown): string[] {
    if (Array.isArray(value)) return this.uniqueStrings(value);
    const one = this.toString(value);
    return one ? [one] : [];
  }

  private uniqueStrings(value: unknown[]): string[] {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const item of value) {
      const text = this.toString(item);
      if (!text) continue;
      const key = text.toLocaleLowerCase("tr-TR");
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(text);
    }
    return result;
  }

  private toString(value: unknown): string | null {
    if (value === null || value === undefined) return null;
    const text = String(value).trim();
    return text || null;
  }

  private toNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === "") return null;
    const normalized =
      typeof value === "string"
        ? value.replace(/\s/g, "").replace(",", ".")
        : value;
    const numberValue = Number(normalized);
    return Number.isFinite(numberValue) ? numberValue : null;
  }

  private toIsoString(value: unknown): string | null {
    if (value instanceof Date && Number.isFinite(value.getTime())) {
      return value.toISOString();
    }
    const text = this.toString(value);
    if (!text) return null;
    const date = new Date(text);
    return Number.isFinite(date.getTime()) ? date.toISOString() : text;
  }

  private sameText(a: string, b: string) {
    return a.toLocaleLowerCase("tr-TR") === b.toLocaleLowerCase("tr-TR");
  }

  private isRecord(value: unknown): value is RecordLike {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }
}
