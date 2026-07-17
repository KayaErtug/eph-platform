import type {
  EPHLegacyLocationFields,
  EPHLocationArea,
  EPHLocationAreaInput,
  EPHLocationScope,
} from "./location.types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value),
  );
}

function normalizeText(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizeNullableText(value: unknown): string | null {
  const normalized = normalizeText(value);
  return normalized || null;
}

function normalizeNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const normalized =
    typeof value === "string"
      ? value.replace(/\s/g, "").replace(",", ".")
      : value;

  const numberValue = Number(normalized);

  return Number.isFinite(numberValue) ? numberValue : null;
}

function parseLocationValue(value: unknown): unknown {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();

  if (!trimmed.startsWith("[") && !trimmed.startsWith("{")) {
    return value;
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

function toLocationArray(value: unknown): unknown[] {
  const parsed = parseLocationValue(value);

  if (Array.isArray(parsed)) {
    return parsed;
  }

  if (
    parsed === null ||
    parsed === undefined ||
    parsed === ""
  ) {
    return [];
  }

  return [parsed];
}

export function normalizeLocationArea(
  value: unknown,
): EPHLocationArea | null {
  if (!isRecord(value)) {
    return null;
  }

  const input = value as EPHLocationAreaInput;
  const city = normalizeText(input.city);

  if (!city) {
    return null;
  }

  return {
    country:
      normalizeText(input.country).toUpperCase() || "TR",
    city,
    district: normalizeText(input.district),
    neighborhood: normalizeText(input.neighborhood),
    latitude: normalizeNumber(input.latitude),
    longitude: normalizeNumber(input.longitude),
    placeId: normalizeNullableText(input.placeId),
  };
}

export function getLocationAreaKey(
  area: EPHLocationArea,
): string {
  return [
    area.country,
    area.city,
    area.district,
    area.neighborhood,
  ]
    .map((part) =>
      part.toLocaleLowerCase("tr-TR").trim(),
    )
    .join("|");
}

export function normalizeLocationAreas(
  value: unknown,
): EPHLocationArea[] {
  const result: EPHLocationArea[] = [];
  const seen = new Set<string>();

  for (const item of toLocationArray(value)) {
    const area = normalizeLocationArea(item);

    if (!area) {
      continue;
    }

    const key = getLocationAreaKey(area);

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(area);
  }

  return result;
}

export function getLocationScope(
  area: EPHLocationArea,
): EPHLocationScope {
  if (area.neighborhood) {
    return "NEIGHBORHOOD";
  }

  if (area.district) {
    return "DISTRICT";
  }

  return "CITY";
}

export function formatLocationArea(
  area: EPHLocationArea,
): string {
  if (!area.district) {
    return `${area.city} / İlin tamamı`;
  }

  if (!area.neighborhood) {
    return `${area.city} / ${area.district} / İlçenin tamamı`;
  }

  return [
    area.city,
    area.district,
    area.neighborhood,
  ].join(" / ");
}

export function buildLocationSummary(value: unknown): string {
  return normalizeLocationAreas(value)
    .map(formatLocationArea)
    .join(" | ");
}

export function getPrimaryLocationArea(
  value: unknown,
): EPHLocationArea | null {
  return normalizeLocationAreas(value)[0] ?? null;
}

export function deriveLegacyLocationFields(
  value: unknown,
): EPHLegacyLocationFields {
  const primaryArea = getPrimaryLocationArea(value);

  return {
    city: primaryArea?.city ?? "",
    district: primaryArea?.district ?? "",
    neighborhood: primaryArea?.neighborhood ?? "",
  };
}

export function mergeLocationAreas(
  ...values: unknown[]
): EPHLocationArea[] {
  return normalizeLocationAreas(
    values.flatMap((value) =>
      normalizeLocationAreas(value),
    ),
  );
}

export function isLocationAreaMatch(
  candidateValue: unknown,
  filterValue: unknown,
): boolean {
  const candidates = normalizeLocationAreas(candidateValue);
  const filters = normalizeLocationAreas(filterValue);

  if (filters.length === 0) {
    return true;
  }

  if (candidates.length === 0) {
    return false;
  }

  return filters.some((filterArea) =>
    candidates.some((candidateArea) => {
      const sameCountry =
        candidateArea.country.toLocaleLowerCase("tr-TR") ===
        filterArea.country.toLocaleLowerCase("tr-TR");

      const sameCity =
        candidateArea.city.toLocaleLowerCase("tr-TR") ===
        filterArea.city.toLocaleLowerCase("tr-TR");

      if (!sameCountry || !sameCity) {
        return false;
      }

      if (!filterArea.district) {
        return true;
      }

      const sameDistrict =
        candidateArea.district.toLocaleLowerCase("tr-TR") ===
        filterArea.district.toLocaleLowerCase("tr-TR");

      if (!sameDistrict) {
        return false;
      }

      if (!filterArea.neighborhood) {
        return true;
      }

      return (
        candidateArea.neighborhood.toLocaleLowerCase("tr-TR") ===
        filterArea.neighborhood.toLocaleLowerCase("tr-TR")
      );
    }),
  );
}
