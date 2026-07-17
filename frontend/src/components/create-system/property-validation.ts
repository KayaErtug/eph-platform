export type EPHPropertyNumericField =
  | "minArea"
  | "maxArea"
  | "minRoom"
  | "maxRoom"
  | "minBudget"
  | "maxBudget";

type EPHPropertyFamily =
  | "APARTMENT"
  | "VILLA"
  | "OFFICE"
  | "COMMERCIAL"
  | "INDUSTRIAL"
  | "LAND"
  | "TOURISM"
  | "BUILDING";

type EPHNumericLimits = {
  areaMin: number;
  areaMax: number;
  roomMin?: number;
  roomMax?: number;
  allowZeroRoom?: boolean;
};

const HARD_BUDGET_MAX =
  999_999_999_999_999;

const FAMILY_LIMITS:
  Record<EPHPropertyFamily, EPHNumericLimits> = {
  APARTMENT: {
    areaMin: 10,
    areaMax: 5_000,
    roomMin: 0,
    roomMax: 20,
    allowZeroRoom: true,
  },

  VILLA: {
    areaMin: 20,
    areaMax: 20_000,
    roomMin: 1,
    roomMax: 50,
    allowZeroRoom: false,
  },

  OFFICE: {
    areaMin: 5,
    areaMax: 1_000_000,
    roomMin: 0,
    roomMax: 100,
    allowZeroRoom: true,
  },

  COMMERCIAL: {
    areaMin: 5,
    areaMax: 1_000_000,
  },

  INDUSTRIAL: {
    areaMin: 20,
    areaMax: 20_000_000,
  },

  LAND: {
    areaMin: 1,
    areaMax: 1_000_000_000,
  },

  TOURISM: {
    areaMin: 20,
    areaMax: 5_000_000,
  },

  BUILDING: {
    areaMin: 20,
    areaMax: 20_000_000,
  },
};

const APARTMENT_TYPES = new Set([
  "DAIRE",
  "REZIDANS",
  "KONUT_PROJESI",
  "REZIDANS_PROJESI",
  "DEVRE_MULK",
]);

const VILLA_TYPES = new Set([
  "VILLA",
  "YAZLIK",
  "MUSTAK_EV",
  "KOY_EVI",
  "DAG_EVI_YAYLA_EVI",
  "VILLA_PROJESI",
]);

const OFFICE_TYPES = new Set([
  "OFIS_BURO",
]);

const COMMERCIAL_TYPES = new Set([
  "DUKKAN_MAGAZA",
  "TICARI_ISLETME",
  "BENZIN_ISTASYONU",
]);

const INDUSTRIAL_TYPES = new Set([
  "FABRIKA_URETIM_TESISI",
  "ATOLYE",
  "DEPO_ANTREPO",
]);

const LAND_TYPES = new Set([
  "ARSA",
  "TARLA",
  "BAG",
  "BAHCE",
  "ZEYTINLIK",
]);

const TOURISM_TYPES = new Set([
  "OTEL",
  "PANSIYON",
  "KAMP_YERI",
  "TATIL_KOYU",
  "OTEL_BINASI",
]);

function resolvePropertyFamily(
  propertyType?: string | null,
): EPHPropertyFamily {
  const type = String(
    propertyType || "",
  ).trim().toUpperCase();

  if (APARTMENT_TYPES.has(type)) {
    return "APARTMENT";
  }

  if (VILLA_TYPES.has(type)) {
    return "VILLA";
  }

  if (OFFICE_TYPES.has(type)) {
    return "OFFICE";
  }

  if (COMMERCIAL_TYPES.has(type)) {
    return "COMMERCIAL";
  }

  if (INDUSTRIAL_TYPES.has(type)) {
    return "INDUSTRIAL";
  }

  if (LAND_TYPES.has(type)) {
    return "LAND";
  }

  if (TOURISM_TYPES.has(type)) {
    return "TOURISM";
  }

  return "BUILDING";
}

function valueExists(value: unknown) {
  return (
    value !== null &&
    value !== undefined &&
    String(value).trim() !== ""
  );
}

function toNumber(
  value: unknown,
): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value)
      ? value
      : null;
  }

  if (typeof value !== "string") {
    return null;
  }

  let normalized = value
    .trim()
    .replace(/\s/g, "");

  if (!normalized) {
    return null;
  }

  if (
    normalized.includes(".") &&
    normalized.includes(",")
  ) {
    normalized = normalized
      .replace(/\./g, "")
      .replace(",", ".");
  } else if (normalized.includes(",")) {
    normalized = normalized.replace(",", ".");
  } else if (
    /^-?\d{1,3}(\.\d{3})+$/.test(
      normalized,
    )
  ) {
    normalized = normalized.replace(/\./g, "");
  }

  const result = Number(normalized);

  return Number.isFinite(result)
    ? result
    : null;
}

function formatNumber(value: number) {
  return value.toLocaleString("tr-TR");
}

function getRangeValues(
  field: EPHPropertyNumericField,
  value: unknown,
  state: Record<string, unknown>,
) {
  if (
    field === "minArea" ||
    field === "maxArea"
  ) {
    return {
      minimum:
        field === "minArea"
          ? toNumber(value)
          : toNumber(state.minArea),
      maximum:
        field === "maxArea"
          ? toNumber(value)
          : toNumber(state.maxArea),
      label: "Metrekare",
    };
  }

  if (
    field === "minRoom" ||
    field === "maxRoom"
  ) {
    return {
      minimum:
        field === "minRoom"
          ? toNumber(value)
          : toNumber(state.minRoom),
      maximum:
        field === "maxRoom"
          ? toNumber(value)
          : toNumber(state.maxRoom),
      label: "Oda sayısı",
    };
  }

  return {
    minimum:
      field === "minBudget"
        ? toNumber(value)
        : toNumber(state.minBudget),
    maximum:
      field === "maxBudget"
        ? toNumber(value)
        : toNumber(state.maxBudget),
    label: "Bütçe",
  };
}

export function propertyTypeSupportsEPHDemandRoomRange(
  propertyType?: string | null,
  _recordKind?: string,
) {
  const family =
    resolvePropertyFamily(propertyType);

  return (
    family === "APARTMENT" ||
    family === "VILLA" ||
    family === "OFFICE"
  );
}

export function isEPHLandPropertyType(
  propertyType?: string | null,
) {
  return (
    resolvePropertyFamily(propertyType) ===
    "LAND"
  );
}

export function validateEPHPropertyField(
  field: EPHPropertyNumericField,
  value: unknown,
  state: Record<string, unknown>,
): string | null {
  if (!valueExists(value)) {
    return null;
  }

  const numericValue = toNumber(value);

  if (numericValue === null) {
    return "Geçerli bir sayı girin.";
  }

  const propertyType = String(
    state.propertyType || "",
  );

  if (!propertyType) {
    return null;
  }

  const family =
    resolvePropertyFamily(propertyType);

  const limits = FAMILY_LIMITS[family];

  if (numericValue < 0) {
    return "Negatif değer girilemez.";
  }

  if (
    field === "minArea" ||
    field === "maxArea"
  ) {
    if (numericValue === 0) {
      return "Metrekare sıfır olamaz.";
    }

    if (numericValue < limits.areaMin) {
      return `Bu gayrimenkul türünde metrekare en az ${formatNumber(
        limits.areaMin,
      )} olmalıdır.`;
    }

    if (numericValue > limits.areaMax) {
      return `Bu gayrimenkul türünde metrekare en fazla ${formatNumber(
        limits.areaMax,
      )} olabilir.`;
    }
  }

  if (
    field === "minRoom" ||
    field === "maxRoom"
  ) {
    if (
      limits.roomMin === undefined ||
      limits.roomMax === undefined
    ) {
      return "Oda sayısı bu gayrimenkul türünde kullanılamaz.";
    }

    if (!Number.isInteger(numericValue)) {
      return "Oda sayısı tam sayı olmalıdır.";
    }

    if (
      numericValue === 0 &&
      !limits.allowZeroRoom
    ) {
      return "Oda sayısı sıfır olamaz.";
    }

    if (numericValue < limits.roomMin) {
      return `Oda sayısı en az ${formatNumber(
        limits.roomMin,
      )} olmalıdır.`;
    }

    if (numericValue > limits.roomMax) {
      return `Oda sayısı en fazla ${formatNumber(
        limits.roomMax,
      )} olabilir.`;
    }
  }

  if (
    field === "minBudget" ||
    field === "maxBudget"
  ) {
    if (numericValue === 0) {
      return "Bütçe sıfır olamaz.";
    }

    if (numericValue > HARD_BUDGET_MAX) {
      return `Bütçe en fazla ${formatNumber(
        HARD_BUDGET_MAX,
      )} olabilir.`;
    }
  }

  const range = getRangeValues(
    field,
    value,
    state,
  );

  if (
    range.minimum !== null &&
    range.maximum !== null &&
    range.minimum > range.maximum
  ) {
    return `${range.label} için minimum değer maksimum değerden büyük olamaz.`;
  }

  return null;
}
