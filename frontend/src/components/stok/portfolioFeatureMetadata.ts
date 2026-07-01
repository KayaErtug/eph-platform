"use client";

export const PORTFOLIO_METADATA_PREFIX = "__EPH_META__:";

export const PORTFOLIO_METADATA_KEYS = [
  "buildingAge",
  "openArea",
  "closedArea",
  "bedCount",
  "villaType",
  "layoutType",
  "poolType",
  "summerHouseType",
  "buildingStyle",
  "homeType",
  "accessSeason",
  "buildingUsage",
  "plazaClass",
  "hotelBuildingStatus",
  "industrialBuildingType",
  "workshopType",
  "businessType",
  "warehouseType",
  "shopType",
  "officeType",
  "stationType",
  "zoningType",
  "fieldType",
  "vineyardType",
  "gardenType",
  "oliveGroveType",
  "projectStatus",
  "hotelSubType",
  "pensionType",
  "campType",
  "resortType",
  "periodType",
] as const;

export type PortfolioMetadataKey = (typeof PORTFOLIO_METADATA_KEYS)[number];

function cleanValue(value: unknown) {
  return String(value ?? "").trim();
}

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function isPortfolioMetadataFeature(value: unknown) {
  return String(value || "").startsWith(PORTFOLIO_METADATA_PREFIX);
}

export function makePortfolioMetadataFeature(
  key: string,
  value: unknown,
) {
  const cleanKey = cleanValue(key);
  const cleanMetaValue = cleanValue(value);

  if (!cleanKey || !cleanMetaValue) return "";

  return `${PORTFOLIO_METADATA_PREFIX}${encodeURIComponent(cleanKey)}:${encodeURIComponent(cleanMetaValue)}`;
}

export function parsePortfolioMetadataFeature(value: unknown) {
  const raw = String(value || "");

  if (!raw.startsWith(PORTFOLIO_METADATA_PREFIX)) return null;

  const payload = raw.slice(PORTFOLIO_METADATA_PREFIX.length);
  const separatorIndex = payload.indexOf(":");

  if (separatorIndex < 0) return null;

  const key = safeDecode(payload.slice(0, separatorIndex));
  const metaValue = safeDecode(payload.slice(separatorIndex + 1));

  if (!key || !metaValue) return null;

  return { key, value: metaValue };
}

export function getPublicPortfolioFeatures(features: unknown): string[] {
  if (!Array.isArray(features)) return [];

  return Array.from(
    new Set(
      features
        .map((item) => cleanValue(item))
        .filter(Boolean)
        .filter((item) => !isPortfolioMetadataFeature(item)),
    ),
  );
}

export function decodePortfolioMetadataState(
  features: unknown,
): Record<string, string> {
  if (!Array.isArray(features)) return {};

  return features.reduce<Record<string, string>>((result, item) => {
    const parsed = parsePortfolioMetadataFeature(item);

    if (parsed) {
      result[parsed.key] = parsed.value;
    }

    return result;
  }, {});
}

export function getPortfolioMetadataValue(
  features: unknown,
  key: string,
) {
  return decodePortfolioMetadataState(features)[key] || "";
}

export function encodePortfolioMetadataFeatures(
  source: Record<string, unknown> | null | undefined,
): string[] {
  if (!source) return [];

  return PORTFOLIO_METADATA_KEYS.map((key) =>
    makePortfolioMetadataFeature(key, source[key]),
  ).filter(Boolean);
}

export function mergePortfolioFeatureMetadata(
  features: unknown,
  source: Record<string, unknown> | null | undefined,
): string[] {
  return Array.from(
    new Set([
      ...getPublicPortfolioFeatures(features),
      ...encodePortfolioMetadataFeatures(source),
    ]),
  );
}