"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Loader2,
  MapPin,
  RotateCcw,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";

import {
  BUILDING_AGE_OPTIONS,
  CATEGORY_TYPE_MAP,
  MAIN_CATEGORY_OPTIONS,
  OFFICE_ROOM_COUNT_OPTIONS,
  ROOM_COUNT_OPTIONS,
  STATUS_LABELS,
  TOURISTIC_ROOM_BED_COUNT_OPTIONS,
  TYPE_LABELS,
} from "@/components/stok/stokConstants";
import {
  fetchDistrictOptions,
  fetchPlaceOptions,
  fetchProvinceOptions,
  type LocationOption,
} from "@/components/stok/locationData";
import {
  FIELD_RULES,
  getFieldRule,
  type PortfolioSpecialField,
} from "@/components/stok/stokFieldRules";
import {
  STOK_FEATURE_GROUPS,
  getFeatureGroups,
  type StokFeatureGroup,
} from "@/components/stok/stokFeatureGroups";
import { getFeaturePresetKeys } from "@/components/stok/stokFeaturePresets";
import {
  decodePortfolioMetadataState,
  getPublicPortfolioFeatures,
} from "@/components/stok/portfolioFeatureMetadata";

export type HavuzSortMode =
  | "MATCH_DESC"
  | "NEWEST"
  | "PRICE_ASC"
  | "PRICE_DESC"
  | "AREA_DESC";

export type HavuzFilterState = {
  types: string[];
  statuses: string[];
  cities: string[];
  districts: string[];
  neighborhoods: string[];
  rooms: string[];
  currencies: string[];
  ownerRoles: string[];
  verification: string[];
  matchBands: string[];
  crmFlags: string[];
  dateRanges: string[];
  buildingAges: string[];
  floorLabels: string[];
  featureSelections: Record<string, string[]>;
  specialSelections: Record<string, string[]>;
  minPrice: string;
  maxPrice: string;
  minArea: string;
  maxArea: string;
  minOpenArea: string;
  maxOpenArea: string;
  minClosedArea: string;
  maxClosedArea: string;
  minFloor: string;
  maxFloor: string;
  minTotalFloors: string;
  maxTotalFloors: string;
  minBedCount: string;
  maxBedCount: string;
  minCredit: string;
  maxCredit: string;
  sort: HavuzSortMode;
};

export type HavuzPoolItemLike = {
  unit: {
    id: string;
    type?: string | null;
    status?: string | null;
    roomCount?: string | null;
    area?: number | null;
    floor?: number | null;
    floorLabel?: string | null;
    totalFloors?: number | null;
    price?: number | null;
    priceCurrency?: string | null;
    availableCreditAmount?: number | null;
    features?: string[] | null;
    createdAt?: string | null;
    isVerified?: boolean;
    tapuVerified?: boolean;
    photoVerified?: boolean;
    yetkiVerified?: boolean;
    project?: {
      city?: string | null;
      district?: string | null;
      address?: string | null;
      latitude?: number | null;
      longitude?: number | null;
      name?: string | null;
      owner?: {
        role?: string | null;
      } | null;
    } | null;
  };
  match: {
    score: number;
    customer: unknown | null;
    budgetDiff: number;
  };
};

type Option = {
  value: string;
  label: string;
  group?: string;
  count?: number;
};

type DistrictLocationOption = LocationOption & {
  city: string;
  key: string;
};

type PlaceLocationOption = LocationOption & {
  city: string;
  district: string;
  districtKey: string;
  key: string;
};

type DynamicSpecialField = PortfolioSpecialField & {
  countByOption: Record<string, number>;
};

const LOCATION_SEPARATOR = "|||";

function getHavuzCityDisplayName(value?: string | null) {
  return String(value || "").trim();
}

const FLOOR_LABEL_OPTIONS = [
  "Kot -1",
  "Bodrum",
  "Yarı Bodrum",
  "Zemin Kat",
  "Yüksek Giriş",
  "Bahçe Katı",
  ...Array.from({ length: 15 }, (_, index) => `${index + 1}. Kat`),
  "Çatı Katı",
  "Teras Katı",
  "Penthouse",
];

const VERIFICATION_OPTIONS: Option[] = [
  { value: "EPH_APPROVED", label: "EPH Onaylı" },
  { value: "TAPU_VERIFIED", label: "Tapu Doğrulandı" },
  { value: "AUTHORITY_VERIFIED", label: "Yetki Belgesi Doğrulandı" },
  { value: "PHOTO_VERIFIED", label: "Fotoğraf Doğrulandı" },
  { value: "WITH_LOCATION", label: "Harita Konumu Var" },
];

const MATCH_BAND_OPTIONS: Option[] = [
  { value: "90_PLUS", label: "%90 ve üzeri" },
  { value: "75_89", label: "%75 – %89" },
  { value: "50_74", label: "%50 – %74" },
  { value: "UNDER_50", label: "%50 altı" },
];

const CRM_OPTIONS: Option[] = [
  { value: "HAS_CUSTOMER", label: "Eşleşen CRM müşterisi var" },
  { value: "BUDGET_CLOSE", label: "Müşteri bütçesine yakın" },
];

const DATE_OPTIONS: Option[] = [
  { value: "TODAY", label: "Bugün eklenenler" },
  { value: "LAST_7_DAYS", label: "Son 7 gün" },
  { value: "LAST_30_DAYS", label: "Son 30 gün" },
];

const CURRENCY_OPTIONS: Option[] = [
  { value: "TRY", label: "Türk Lirası (₺)" },
  { value: "USD", label: "Dolar ($)" },
  { value: "EUR", label: "Euro (€)" },
  { value: "GBP", label: "Sterlin (£)" },
];

const OWNER_ROLE_OPTIONS: Option[] = [
  { value: "EMLAKCI", label: "Emlakçı" },
  { value: "MUTEAHHIT", label: "Müteahhit" },
  { value: "INSAAT_FIRMASI", label: "İnşaat Firması" },
];

const SORT_OPTIONS: Array<{ value: HavuzSortMode; label: string }> = [
  { value: "MATCH_DESC", label: "CRM eşleşmesi yüksekten düşüğe" },
  { value: "NEWEST", label: "En yeni portföyler" },
  { value: "PRICE_ASC", label: "Fiyat düşükten yükseğe" },
  { value: "PRICE_DESC", label: "Fiyat yüksekten düşüğe" },
  { value: "AREA_DESC", label: "Metrekare büyükten küçüğe" },
];

const TYPE_OPTIONS: Option[] = MAIN_CATEGORY_OPTIONS.flatMap((mainCategory) =>
  Object.entries(CATEGORY_TYPE_MAP[mainCategory] || {}).map(
    ([label, value]) => ({
      value,
      label,
      group: mainCategory,
    }),
  ),
);

const STATUS_OPTIONS: Option[] = Object.entries(STATUS_LABELS as Record<string, string>).map(
  ([value, label]) => ({
    value,
    label,
  }),
);

const ROOM_OPTIONS: Option[] = Array.from(
  new Set([
    ...ROOM_COUNT_OPTIONS,
    ...OFFICE_ROOM_COUNT_OPTIONS,
    ...TOURISTIC_ROOM_BED_COUNT_OPTIONS,
  ]),
).map((value) => ({ value, label: value }));

const BUILDING_AGE_FILTER_OPTIONS: Option[] = BUILDING_AGE_OPTIONS.map(
  (value) => ({
    value,
    label: value === "0" ? "Sıfır Bina" : value,
  }),
);

const FLOOR_FILTER_OPTIONS: Option[] = FLOOR_LABEL_OPTIONS.map((value) => ({
  value,
  label: value,
}));

const VERIFICATION_LABELS = Object.fromEntries(
  VERIFICATION_OPTIONS.map((item) => [item.value, item.label]),
);

const MATCH_LABELS = Object.fromEntries(
  MATCH_BAND_OPTIONS.map((item) => [item.value, item.label]),
);

const CRM_LABELS = Object.fromEntries(
  CRM_OPTIONS.map((item) => [item.value, item.label]),
);

const DATE_LABELS = Object.fromEntries(
  DATE_OPTIONS.map((item) => [item.value, item.label]),
);

const OWNER_ROLE_LABELS = Object.fromEntries(
  OWNER_ROLE_OPTIONS.map((item) => [item.value, item.label]),
);

export function createEmptyHavuzFilters(): HavuzFilterState {
  return {
    types: [],
    statuses: [],
    cities: [],
    districts: [],
    neighborhoods: [],
    rooms: [],
    currencies: [],
    ownerRoles: [],
    verification: [],
    matchBands: [],
    crmFlags: [],
    dateRanges: [],
    buildingAges: [],
    floorLabels: [],
    featureSelections: {},
    specialSelections: {},
    minPrice: "",
    maxPrice: "",
    minArea: "",
    maxArea: "",
    minOpenArea: "",
    maxOpenArea: "",
    minClosedArea: "",
    maxClosedArea: "",
    minFloor: "",
    maxFloor: "",
    minTotalFloors: "",
    maxTotalFloors: "",
    minBedCount: "",
    maxBedCount: "",
    minCredit: "",
    maxCredit: "",
    sort: "MATCH_DESC",
  };
}

function normalize(value?: string | null) {
  return String(value || "")
    .toLocaleLowerCase("tr-TR")
    .trim();
}

function parseNumber(value: unknown) {
  const cleaned = String(value ?? "")
    .replace(/\./g, "")
    .replace(",", ".")
    .replace(/[^\d.-]/g, "");
  const numeric = Number(cleaned);
  return Number.isFinite(numeric) ? numeric : 0;
}

function hasRangeValue(value: string) {
  return String(value || "").trim().length > 0;
}

function matchesRange(
  rawValue: unknown,
  minValue: string,
  maxValue: string,
) {
  const hasMin = hasRangeValue(minValue);
  const hasMax = hasRangeValue(maxValue);

  if (!hasMin && !hasMax) return true;

  const value = parseNumber(rawValue);

  if (!Number.isFinite(value) || (!value && String(rawValue ?? "") !== "0")) {
    return false;
  }

  if (hasMin && value < parseNumber(minValue)) return false;
  if (hasMax && value > parseNumber(maxValue)) return false;

  return true;
}

function typeLabel(value: string) {
  return (
    (TYPE_LABELS as Record<string, string>)[value] ||
    value.replaceAll("_", " ")
  );
}

function statusLabel(value: string) {
  return (
    (STATUS_LABELS as Record<string, string>)[value] ||
    value.replaceAll("_", " ")
  );
}

function roleLabel(value: string) {
  return OWNER_ROLE_LABELS[value] || value.replaceAll("_", " ");
}

function featureLabel(value: string) {
  const separatorIndex = value.indexOf(":");
  return separatorIndex >= 0 ? value.slice(separatorIndex + 1) : value;
}

function makeDistrictKey(city: string, district: string) {
  return [city, district].join(LOCATION_SEPARATOR);
}

function parseDistrictKey(value: string) {
  const [city = "", district = ""] = String(value || "").split(
    LOCATION_SEPARATOR,
  );
  return { city, district };
}

function makeNeighborhoodKey(
  city: string,
  district: string,
  neighborhood: string,
) {
  return [city, district, neighborhood].join(LOCATION_SEPARATOR);
}

function parseNeighborhoodKey(value: string) {
  const [city = "", district = "", neighborhood = ""] = String(
    value || "",
  ).split(LOCATION_SEPARATOR);
  return { city, district, neighborhood };
}

function matchesCompositeSelection(
  selections: string[],
  compositeKey: string,
  leafValue: string,
) {
  return (
    selections.length === 0 ||
    selections.includes(compositeKey) ||
    selections.includes(leafValue)
  );
}

function isInMatchBand(score: number, band: string) {
  if (band === "90_PLUS") return score >= 90;
  if (band === "75_89") return score >= 75 && score < 90;
  if (band === "50_74") return score >= 50 && score < 75;
  if (band === "UNDER_50") return score < 50;
  return false;
}

function isInDateRange(value: string | null | undefined, range: string) {
  const createdAt = new Date(String(value || "")).getTime();

  if (!Number.isFinite(createdAt)) return false;

  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  if (range === "TODAY") {
    const created = new Date(createdAt);
    const today = new Date();

    return (
      created.getFullYear() === today.getFullYear() &&
      created.getMonth() === today.getMonth() &&
      created.getDate() === today.getDate()
    );
  }

  if (range === "LAST_7_DAYS") return createdAt >= now - 7 * day;
  if (range === "LAST_30_DAYS") return createdAt >= now - 30 * day;

  return false;
}

function activeNestedEntries(record: Record<string, string[]>) {
  return Object.entries(record).filter(([, values]) => values.length > 0);
}

function matchesFeatureSelections(
  unitFeatures: string[],
  selections: Record<string, string[]>,
) {
  return activeNestedEntries(selections).every(([, selectedValues]) =>
    selectedValues.some((value) => unitFeatures.includes(value)),
  );
}

function matchesSpecialSelections(
  metadata: Record<string, string>,
  selections: Record<string, string[]>,
) {
  return activeNestedEntries(selections).every(([key, selectedValues]) =>
    selectedValues.includes(metadata[key] || ""),
  );
}

export function applyHavuzFilters<T extends HavuzPoolItemLike>(
  items: T[],
  filters: HavuzFilterState,
  keyword = "",
): T[] {
  const query = normalize(keyword);

  const filtered = items.filter(({ unit, match }) => {
    const type = String(unit.type || "");
    const status = String(unit.status || "");
    const city = String(unit.project?.city || "");
    const district = String(unit.project?.district || "");
    const neighborhood = String(unit.project?.address || "");
    const room = String(unit.roomCount || "");
    const currency = String(unit.priceCurrency || "TRY");
    const ownerRole = String(unit.project?.owner?.role || "");
    const publicFeatures = getPublicPortfolioFeatures(unit.features);
    const metadata = decodePortfolioMetadataState(unit.features);

    if (filters.types.length > 0 && !filters.types.includes(type)) return false;
    if (filters.statuses.length > 0 && !filters.statuses.includes(status))
      return false;
    if (filters.cities.length > 0 && !filters.cities.includes(city))
      return false;
    if (
      !matchesCompositeSelection(
        filters.districts,
        makeDistrictKey(city, district),
        district,
      )
    )
      return false;
    if (
      !matchesCompositeSelection(
        filters.neighborhoods,
        makeNeighborhoodKey(city, district, neighborhood),
        neighborhood,
      )
    )
      return false;
    if (filters.rooms.length > 0 && !filters.rooms.includes(room)) return false;
    if (
      filters.currencies.length > 0 &&
      !filters.currencies.includes(currency)
    )
      return false;
    if (
      filters.ownerRoles.length > 0 &&
      !filters.ownerRoles.includes(ownerRole)
    )
      return false;
    if (
      filters.buildingAges.length > 0 &&
      !filters.buildingAges.includes(metadata.buildingAge || "")
    )
      return false;
    if (
      filters.floorLabels.length > 0 &&
      !filters.floorLabels.includes(String(unit.floorLabel || ""))
    )
      return false;

    if (!matchesRange(unit.price, filters.minPrice, filters.maxPrice))
      return false;
    if (!matchesRange(unit.area, filters.minArea, filters.maxArea))
      return false;
    if (
      !matchesRange(
        metadata.openArea,
        filters.minOpenArea,
        filters.maxOpenArea,
      )
    )
      return false;
    if (
      !matchesRange(
        metadata.closedArea,
        filters.minClosedArea,
        filters.maxClosedArea,
      )
    )
      return false;
    if (!matchesRange(unit.floor, filters.minFloor, filters.maxFloor))
      return false;
    if (
      !matchesRange(
        unit.totalFloors,
        filters.minTotalFloors,
        filters.maxTotalFloors,
      )
    )
      return false;
    if (
      !matchesRange(
        metadata.bedCount,
        filters.minBedCount,
        filters.maxBedCount,
      )
    )
      return false;
    if (
      !matchesRange(
        unit.availableCreditAmount,
        filters.minCredit,
        filters.maxCredit,
      )
    )
      return false;

    if (!matchesFeatureSelections(publicFeatures, filters.featureSelections))
      return false;
    if (!matchesSpecialSelections(metadata, filters.specialSelections))
      return false;

    if (
      filters.matchBands.length > 0 &&
      !filters.matchBands.some((band) => isInMatchBand(match.score, band))
    )
      return false;

    if (
      filters.crmFlags.length > 0 &&
      !filters.crmFlags.some((flag) => {
        if (flag === "HAS_CUSTOMER") return Boolean(match.customer);
        if (flag === "BUDGET_CLOSE")
          return Boolean(match.customer) && Number(match.budgetDiff || 100) <= 20;
        return false;
      })
    )
      return false;

    if (
      filters.verification.length > 0 &&
      !filters.verification.some((flag) => {
        if (flag === "EPH_APPROVED")
          return Boolean(
            unit.isVerified || (unit.tapuVerified && unit.yetkiVerified),
          );
        if (flag === "TAPU_VERIFIED")
          return Boolean(unit.tapuVerified || unit.isVerified);
        if (flag === "AUTHORITY_VERIFIED")
          return Boolean(unit.yetkiVerified || unit.isVerified);
        if (flag === "PHOTO_VERIFIED")
          return Boolean(unit.photoVerified || unit.isVerified);
        if (flag === "WITH_LOCATION")
          return Boolean(
            Number(unit.project?.latitude) &&
              Number(unit.project?.longitude),
          );
        return false;
      })
    )
      return false;

    if (
      filters.dateRanges.length > 0 &&
      !filters.dateRanges.some((range) =>
        isInDateRange(unit.createdAt, range),
      )
    )
      return false;

    if (query) {
      const haystack = normalize(
        [
          unit.project?.name,
          city,
          district,
          neighborhood,
          typeLabel(type),
          statusLabel(status),
          room,
          currency,
          ...publicFeatures.map(featureLabel),
          ...Object.values(metadata),
        ].join(" "),
      );

      if (!haystack.includes(query)) return false;
    }

    return true;
  });

  return [...filtered].sort((a, b) => {
    if (filters.sort === "NEWEST") {
      return String(b.unit.createdAt || "").localeCompare(
        String(a.unit.createdAt || ""),
      );
    }

    if (filters.sort === "PRICE_ASC") {
      return Number(a.unit.price || 0) - Number(b.unit.price || 0);
    }

    if (filters.sort === "PRICE_DESC") {
      return Number(b.unit.price || 0) - Number(a.unit.price || 0);
    }

    if (filters.sort === "AREA_DESC") {
      return Number(b.unit.area || 0) - Number(a.unit.area || 0);
    }

    return Number(b.match.score || 0) - Number(a.match.score || 0);
  });
}

export function countHavuzFilters(filters: HavuzFilterState) {
  const arrayCount = [
    filters.types,
    filters.statuses,
    filters.cities,
    filters.districts,
    filters.neighborhoods,
    filters.rooms,
    filters.currencies,
    filters.ownerRoles,
    filters.verification,
    filters.matchBands,
    filters.crmFlags,
    filters.dateRanges,
    filters.buildingAges,
    filters.floorLabels,
  ].reduce((total, list) => total + list.length, 0);

  const nestedCount = [
    filters.featureSelections,
    filters.specialSelections,
  ].reduce(
    (total, record) =>
      total +
      Object.values(record).reduce(
        (innerTotal, values) => innerTotal + values.length,
        0,
      ),
    0,
  );

  const rangeCount = [
    filters.minPrice,
    filters.maxPrice,
    filters.minArea,
    filters.maxArea,
    filters.minOpenArea,
    filters.maxOpenArea,
    filters.minClosedArea,
    filters.maxClosedArea,
    filters.minFloor,
    filters.maxFloor,
    filters.minTotalFloors,
    filters.maxTotalFloors,
    filters.minBedCount,
    filters.maxBedCount,
    filters.minCredit,
    filters.maxCredit,
  ].filter(Boolean).length;

  return (
    arrayCount +
    nestedCount +
    rangeCount +
    (filters.sort !== "MATCH_DESC" ? 1 : 0)
  );
}

export function getHavuzFilterChips(filters: HavuzFilterState) {
  const chips: string[] = [];

  filters.types.forEach((value) => chips.push(typeLabel(value)));
  filters.statuses.forEach((value) => chips.push(statusLabel(value)));
  filters.cities.forEach((value) => chips.push(getHavuzCityDisplayName(value)));
  filters.districts.forEach((value) =>
    chips.push(parseDistrictKey(value).district || value),
  );
  filters.neighborhoods.forEach((value) =>
    chips.push(parseNeighborhoodKey(value).neighborhood || value),
  );
  filters.rooms.forEach((value) => chips.push(value));
  filters.currencies.forEach((value) => chips.push(value));
  filters.ownerRoles.forEach((value) => chips.push(roleLabel(value)));
  filters.buildingAges.forEach((value) =>
    chips.push(value === "0" ? "Sıfır Bina" : `Bina yaşı: ${value}`),
  );
  filters.floorLabels.forEach((value) => chips.push(value));
  filters.verification.forEach((value) =>
    chips.push(VERIFICATION_LABELS[value] || value),
  );
  filters.matchBands.forEach((value) =>
    chips.push(MATCH_LABELS[value] || value),
  );
  filters.crmFlags.forEach((value) =>
    chips.push(CRM_LABELS[value] || value),
  );
  filters.dateRanges.forEach((value) =>
    chips.push(DATE_LABELS[value] || value),
  );

  activeNestedEntries(filters.featureSelections).forEach(([, values]) =>
    values.forEach((value) => chips.push(featureLabel(value))),
  );

  activeNestedEntries(filters.specialSelections).forEach(([key, values]) => {
    const label =
      Object.values(FIELD_RULES as Record<string, { specialFields: PortfolioSpecialField[] }>)
        .flatMap((rule) => rule.specialFields)
        .find((field) => field.key === key)?.label || key;

    values.forEach((value) => chips.push(`${label}: ${value}`));
  });

  const rangeLabels: Array<[string, string]> = [
    [filters.minPrice, `Min. ${filters.minPrice} fiyat`],
    [filters.maxPrice, `Maks. ${filters.maxPrice} fiyat`],
    [filters.minArea, `Min. ${filters.minArea} m²`],
    [filters.maxArea, `Maks. ${filters.maxArea} m²`],
    [filters.minOpenArea, `Min. ${filters.minOpenArea} m² açık alan`],
    [filters.maxOpenArea, `Maks. ${filters.maxOpenArea} m² açık alan`],
    [filters.minClosedArea, `Min. ${filters.minClosedArea} m² kapalı alan`],
    [filters.maxClosedArea, `Maks. ${filters.maxClosedArea} m² kapalı alan`],
    [filters.minFloor, `Min. ${filters.minFloor}. kat`],
    [filters.maxFloor, `Maks. ${filters.maxFloor}. kat`],
    [filters.minTotalFloors, `Min. ${filters.minTotalFloors} toplam kat`],
    [filters.maxTotalFloors, `Maks. ${filters.maxTotalFloors} toplam kat`],
    [filters.minBedCount, `Min. ${filters.minBedCount} yatak`],
    [filters.maxBedCount, `Maks. ${filters.maxBedCount} yatak`],
    [filters.minCredit, `Min. ${filters.minCredit} kredi`],
    [filters.maxCredit, `Maks. ${filters.maxCredit} kredi`],
  ];

  rangeLabels.forEach(([value, label]) => {
    if (value) chips.push(label);
  });

  return chips;
}

function formatNumericInput(value: string) {
  const digits = String(value || "").replace(/\D/g, "");
  return digits ? Number(digits).toLocaleString("tr-TR") : "";
}

function optionCount(
  items: HavuzPoolItemLike[],
  predicate: (item: HavuzPoolItemLike) => boolean,
) {
  return items.reduce((total, item) => total + (predicate(item) ? 1 : 0), 0);
}

function withCount(
  options: Option[],
  getCount: (value: string) => number,
) {
  return options.map((option) => ({
    ...option,
    count: getCount(option.value),
  }));
}

function MultiSelectSection({
  title,
  options,
  selected,
  onChange,
  defaultOpen = false,
  searchable = true,
  emptyText = "Seçenek bulunamadı.",
  loading = false,
  hint,
}: {
  title: string;
  options: Option[];
  selected: string[];
  onChange: (next: string[]) => void;
  defaultOpen?: boolean;
  searchable?: boolean;
  emptyText?: string;
  loading?: boolean;
  hint?: string;
}) {
  const [query, setQuery] = useState("");

  const visibleOptions = useMemo(() => {
    const normalizedQuery = normalize(query);

    if (!normalizedQuery) return options;

    return options.filter((option) =>
      normalize(`${option.label} ${option.group || ""}`).includes(
        normalizedQuery,
      ),
    );
  }, [options, query]);

  const groupedOptions = useMemo(() => {
    const groups = new Map<string, Option[]>();

    visibleOptions.forEach((option) => {
      const group = option.group || "";
      const current = groups.get(group) || [];
      current.push(option);
      groups.set(group, current);
    });

    return Array.from(groups.entries());
  }, [visibleOptions]);

  const toggle = (value: string) => {
    onChange(
      selected.includes(value)
        ? selected.filter((item) => item !== value)
        : [...selected, value],
    );
  };

  return (
    <details
      open={defaultOpen}
      className="group overflow-hidden rounded-[20px] border-2 border-[#C7D6E8] bg-white"
    >
      <summary className="grid min-h-[58px] cursor-pointer list-none grid-cols-[20px_minmax(0,1fr)_20px] items-center gap-2 bg-[#F8FAFC] px-3 py-2">
        <span className="h-5 w-5" aria-hidden="true" />

        <div className="min-w-0 text-center">
          <p className="text-[13px] font-black text-[#1F2937]">{title}</p>
          <p className="mt-0.5 text-[10px] font-bold leading-4 text-[#64748B]">
            {selected.length > 0
              ? `${selected.length} seçim aktif`
              : hint || "Birden fazla seçim yapılabilir"}
          </p>
        </div>

        <ChevronDown
          size={17}
          className="shrink-0 text-[#2563EB] transition-transform group-open:rotate-180"
        />
      </summary>

      <div className="border-t-2 border-[#E2EAF5] p-2.5">
        {searchable && options.length > 6 && (
          <div className="mb-2 flex items-center gap-2 rounded-[14px] border-2 border-[#C7D6E8] bg-[#EEF3F8] px-2.5">
            <Search size={14} className="text-[#64748B]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={`${title} içinde ara`}
              className="h-10 min-w-0 flex-1 bg-transparent text-[11px] font-bold text-[#1F2937] outline-none"
            />
          </div>
        )}

        {options.length > 0 && (
          <div className="mb-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() =>
                onChange(visibleOptions.map((option) => option.value))
              }
              className="min-h-[36px] rounded-[13px] border-2 border-[#C7D6E8] bg-white px-2 text-[10px] font-black text-[#2563EB]"
            >
              Görünenleri Seç
            </button>
            <button
              type="button"
              onClick={() => onChange([])}
              className="min-h-[36px] rounded-[13px] border-2 border-[#C7D6E8] bg-white px-2 text-[10px] font-black text-[#64748B]"
            >
              Seçimi Temizle
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex min-h-[82px] items-center justify-center gap-2 text-[11px] font-black text-[#2563EB]">
            <Loader2 size={17} className="animate-spin" />
            Veriler yükleniyor...
          </div>
        ) : visibleOptions.length > 0 ? (
          <div className="max-h-[330px] overflow-y-auto pr-0.5">
            {groupedOptions.map(([group, groupOptions]) => (
              <div key={group || "default"} className="mb-3 last:mb-0">
                {group && (
                  <p className="mb-1.5 rounded-[10px] bg-[#EEF3F8] px-2 py-1 text-[9px] font-black uppercase tracking-[0.08em] text-[#64748B]">
                    {group}
                  </p>
                )}

                <div className="grid grid-cols-2 gap-2">
                  {groupOptions.map((option) => {
                    const checked = selected.includes(option.value);

                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => toggle(option.value)}
                        className={`grid min-h-[44px] min-w-0 grid-cols-[20px_1fr_auto] items-center gap-2 rounded-[14px] border-2 px-2 text-left text-[10.5px] font-black leading-4 ${
                          checked
                            ? "border-[#2563EB] bg-[#EFF6FF] text-[#1D4ED8]"
                            : "border-[#D7E3F2] bg-white text-[#334155]"
                        }`}
                      >
                        <span
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-[7px] border-2 ${
                            checked
                              ? "border-[#2563EB] bg-[#2563EB] text-white"
                              : "border-[#B8C9DD] bg-white text-transparent"
                          }`}
                        >
                          <Check size={12} />
                        </span>
                        <span className="min-w-0 break-words [overflow-wrap:anywhere]">
                          {option.label}
                        </span>
                        {typeof option.count === "number" && (
                          <span
                            className={`min-w-5 rounded-full px-1.5 py-0.5 text-center text-[8.5px] ${
                              option.count > 0
                                ? "bg-[#DBEAFE] text-[#1D4ED8]"
                                : "bg-slate-100 text-slate-400"
                            }`}
                          >
                            {option.count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="py-5 text-center text-[11px] font-bold text-[#64748B]">
            {emptyText}
          </p>
        )}
      </div>
    </details>
  );
}


function PremiumCitySelector({
  options,
  selected,
  onChange,
  loading,
}: {
  options: Option[];
  selected: string[];
  onChange: (next: string[]) => void;
  loading: boolean;
}) {
  const [quickQuery, setQuickQuery] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerQuery, setPickerQuery] = useState("");
  const [activeLetter, setActiveLetter] = useState("");
  const [draftSelected, setDraftSelected] = useState<string[]>(selected);

  useEffect(() => {
    if (!pickerOpen) return;
    setDraftSelected(selected);
    setPickerQuery("");
    setActiveLetter("");
  }, [pickerOpen, selected]);

  const quickCityValues = ["İstanbul", "Ankara", "İzmir", "Antalya", "Denizli"];

  const quickCities = useMemo(
    () =>
      quickCityValues
        .map((value) => options.find((option) => option.value === value))
        .filter((option): option is Option => Boolean(option)),
    [options],
  );

  const quickMatches = useMemo(() => {
    const query = normalize(quickQuery);

    if (!query) return [];

    return options
      .filter((option) =>
        normalize(`${option.label} ${option.value}`).includes(query),
      )
      .sort(
        (first, second) =>
          Number(second.count || 0) - Number(first.count || 0) ||
          first.label.localeCompare(second.label, "tr-TR"),
      )
      .slice(0, 6);
  }, [options, quickQuery]);

  const letters = useMemo(
    () =>
      Array.from(
        new Set(
          options
            .map((option) =>
              option.label
                .trim()
                .charAt(0)
                .toLocaleUpperCase("tr-TR"),
            )
            .filter(Boolean),
        ),
      ).sort((first, second) => first.localeCompare(second, "tr-TR")),
    [options],
  );

  const pickerOptions = useMemo(() => {
    const query = normalize(pickerQuery);

    return options
      .filter((option) => {
        const matchesQuery =
          !query ||
          normalize(`${option.label} ${option.value}`).includes(query);
        const matchesLetter =
          !activeLetter ||
          option.label
            .trim()
            .charAt(0)
            .toLocaleUpperCase("tr-TR") === activeLetter;

        return matchesQuery && matchesLetter;
      })
      .sort((first, second) => {
        const firstHasPortfolio = Number(first.count || 0) > 0;
        const secondHasPortfolio = Number(second.count || 0) > 0;

        if (firstHasPortfolio !== secondHasPortfolio) {
          return firstHasPortfolio ? -1 : 1;
        }

        if (firstHasPortfolio && secondHasPortfolio) {
          const countDifference =
            Number(second.count || 0) - Number(first.count || 0);

          if (countDifference !== 0) return countDifference;
        }

        return first.label.localeCompare(second.label, "tr-TR");
      });
  }, [activeLetter, options, pickerQuery]);

  const portfolioCities = pickerOptions.filter(
    (option) => Number(option.count || 0) > 0,
  );
  const otherCities = pickerOptions.filter(
    (option) => Number(option.count || 0) === 0,
  );

  const toggleImmediate = (value: string) => {
    onChange(
      selected.includes(value)
        ? selected.filter((item) => item !== value)
        : [...selected, value],
    );
    setQuickQuery("");
  };

  const toggleDraft = (value: string) => {
    setDraftSelected((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );
  };

  const renderCityRow = (option: Option) => {
    const checked = draftSelected.includes(option.value);
    const count = Number(option.count || 0);

    return (
      <button
        key={option.value}
        type="button"
        onClick={() => toggleDraft(option.value)}
        className={`grid min-h-[50px] w-full grid-cols-[24px_minmax(0,1fr)_auto] items-center gap-2 rounded-[15px] border px-3 text-left transition active:scale-[0.99] ${
          checked
            ? "border-[#0F766E] bg-[#F0FDFA] shadow-[0_8px_20px_rgba(15,118,110,0.10)]"
            : "border-[#D7E3F2] bg-white"
        }`}
      >
        <span
          className={`flex h-6 w-6 items-center justify-center rounded-[8px] border ${
            checked
              ? "border-[#0F766E] bg-[#0F766E] text-white"
              : "border-[#B8C9DD] bg-white text-transparent"
          }`}
        >
          <Check size={14} />
        </span>

        <span className="min-w-0">
          <span
            className={`block whitespace-normal break-normal text-[12px] font-black leading-4 [overflow-wrap:normal] [word-break:normal] ${
              checked ? "text-[#0F766E]" : "text-[#1F2937]"
            }`}
          >
            {option.label}
          </span>
          {option.label !== option.value && (
            <span className="mt-0.5 block text-[8.5px] font-bold text-[#94A3B8]">
              Resmî ad: {option.value}
            </span>
          )}
        </span>

        <span
          className={`min-w-8 rounded-full px-2 py-1 text-center text-[9px] font-black ${
            count > 0
              ? "bg-[#DBEAFE] text-[#1D4ED8]"
              : "bg-[#F1F5F9] text-[#94A3B8]"
          }`}
        >
          {count}
        </span>
      </button>
    );
  };

  return (
    <>
      <section className="overflow-hidden rounded-[24px] border border-[#A7E5DF] bg-[linear-gradient(145deg,#FFFFFF_0%,#F0FDFA_55%,#EFF6FF_100%)] p-3 shadow-[0_14px_34px_rgba(15,118,110,0.09)]">
        <div className="grid grid-cols-[40px_minmax(0,1fr)_40px] items-center gap-2">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[15px] bg-[#CCFBF1] text-[#0F766E]">
            <MapPin size={19} />
          </span>

          <div className="min-w-0 text-center">
            <p className="text-[13px] font-black text-[#083344]">Konum</p>
            <p className="mt-0.5 text-[9.5px] font-bold text-[#64748B]">
              {selected.length > 0
                ? `${selected.length} il seçildi`
                : "İl seçerek bölgeyi daraltın"}
            </p>
          </div>

          {selected.length > 0 ? (
            <button
              type="button"
              onClick={() => onChange([])}
              className="flex h-10 w-10 items-center justify-center rounded-[14px] border border-rose-200 bg-white text-rose-600"
              aria-label="Konum seçimlerini temizle"
            >
              <RotateCcw size={15} />
            </button>
          ) : (
            <div className="h-10 w-10" aria-hidden="true" />
          )}
        </div>

        <div className="relative mt-3">
          <div className="flex min-h-[46px] items-center gap-2 rounded-[16px] border border-[#B8E5E2] bg-white px-3 shadow-inner">
            {loading ? (
              <Loader2 size={16} className="animate-spin text-[#0F766E]" />
            ) : (
              <Search size={16} className="text-[#0F766E]" />
            )}
            <input
              value={quickQuery}
              onChange={(event) => setQuickQuery(event.target.value)}
              placeholder="İl veya bölge ara..."
              className="h-11 min-w-0 flex-1 bg-transparent text-[12px] font-bold text-[#1F2937] outline-none placeholder:text-[#94A3B8]"
            />
            {quickQuery && (
              <button
                type="button"
                onClick={() => setQuickQuery("")}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-[#F1F5F9] text-[#64748B]"
                aria-label="İl aramasını temizle"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {quickQuery && (
            <div className="absolute inset-x-0 top-[52px] z-20 overflow-hidden rounded-[18px] border border-[#B8E5E2] bg-white p-1.5 shadow-[0_18px_45px_rgba(15,23,42,0.18)]">
              {quickMatches.length > 0 ? (
                quickMatches.map((option) => {
                  const checked = selected.includes(option.value);

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => toggleImmediate(option.value)}
                      className={`flex min-h-[42px] w-full items-center justify-between gap-2 rounded-[13px] px-2.5 text-left ${
                        checked ? "bg-[#F0FDFA]" : "bg-white"
                      }`}
                    >
                      <span
                        className={`min-w-0 whitespace-normal break-normal text-[11px] font-black [overflow-wrap:normal] [word-break:normal] ${
                          checked ? "text-[#0F766E]" : "text-[#334155]"
                        }`}
                      >
                        {option.label}
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        <span className="rounded-full bg-[#EFF6FF] px-2 py-1 text-[8.5px] font-black text-[#1D4ED8]">
                          {option.count || 0}
                        </span>
                        {checked && <Check size={14} className="text-[#0F766E]" />}
                      </span>
                    </button>
                  );
                })
              ) : (
                <p className="px-3 py-4 text-center text-[10px] font-bold text-[#64748B]">
                  Aramanızla eşleşen il bulunamadı.
                </p>
              )}
            </div>
          )}
        </div>

        {quickCities.length > 0 && (
          <div className="mt-3">
            <p className="mb-2 text-center text-[8.5px] font-black uppercase tracking-[0.12em] text-[#64748B]">
              Hızlı Seçim
            </p>
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {quickCities.map((option) => {
                const checked = selected.includes(option.value);

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => toggleImmediate(option.value)}
                    className={`shrink-0 rounded-full border px-3 py-1.5 text-[9.5px] font-black ${
                      checked
                        ? "border-[#0F766E] bg-[#0F766E] text-white"
                        : "border-[#B8E5E2] bg-white text-[#0F766E]"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {selected.length > 0 && (
          <div className="mt-3 rounded-[16px] border border-[#C8E7E4] bg-white/90 p-2.5">
            <p className="mb-2 text-center text-[8.5px] font-black uppercase tracking-[0.12em] text-[#64748B]">
              Seçili Konumlar
            </p>
            <div className="flex max-h-[74px] flex-wrap gap-1.5 overflow-y-auto">
              {selected.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => toggleImmediate(value)}
                  className="flex items-center gap-1 rounded-full bg-[#E6FFFB] px-2.5 py-1.5 text-[9.5px] font-black text-[#0F766E]"
                >
                  <span>{getHavuzCityDisplayName(value)}</span>
                  <X size={11} />
                </button>
              ))}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="mt-3 flex min-h-[46px] w-full items-center justify-between gap-3 rounded-[16px] border border-[#0F766E] bg-white px-3 text-left text-[#0F766E] shadow-[0_8px_20px_rgba(15,118,110,0.08)] active:scale-[0.99]"
        >
          <span>
            <span className="block text-[11px] font-black">Tüm İlleri Gör</span>
            <span className="mt-0.5 block text-[8.5px] font-bold text-[#64748B]">
              {options.length || 81} il ve KKTC bölgeleri
            </span>
          </span>
          <ChevronRight size={17} className="shrink-0" />
        </button>
      </section>

      {pickerOpen && (
        <div className="fixed inset-0 z-[140] flex items-end justify-center bg-[#062925]/70 backdrop-blur-[2px] sm:items-center sm:p-4">
          <section className="flex h-[100dvh] w-full max-w-[460px] flex-col overflow-hidden bg-[#F6FBFB] shadow-[0_24px_70px_rgba(6,41,37,0.42)] sm:h-[min(92dvh,860px)] sm:rounded-[30px] sm:border sm:border-[#99F6E4]">
            <header className="shrink-0 border-b border-[#C8E7E4] bg-[linear-gradient(145deg,#FFFFFF_0%,#F0FDFA_100%)] px-3 pb-3 pt-[max(12px,env(safe-area-inset-top))]">
              <div className="grid grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-2">
                <div className="h-11 w-11" aria-hidden="true" />
                <div className="min-w-0 text-center">
                  <p className="text-[9px] font-black uppercase tracking-[0.15em] text-[#0F766E]">
                    PREMIUM KONUM SEÇİCİ
                  </p>
                  <h3 className="mt-1 text-[19px] font-black tracking-[-0.04em] text-[#083344]">
                    İl Seçimi
                  </h3>
                  <p className="mt-0.5 text-[9px] font-bold text-[#64748B]">
                    Çoklu seçim · {draftSelected.length} il seçili
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPickerOpen(false)}
                  className="flex h-11 w-11 items-center justify-center rounded-[17px] border border-[#99F6E4] bg-white text-[#0F766E]"
                  aria-label="İl seçiciyi kapat"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="mt-3 flex min-h-[46px] items-center gap-2 rounded-[16px] border border-[#B8E5E2] bg-white px-3 shadow-inner">
                <Search size={16} className="text-[#0F766E]" />
                <input
                  value={pickerQuery}
                  onChange={(event) => {
                    setPickerQuery(event.target.value);
                    setActiveLetter("");
                  }}
                  placeholder="İl ara..."
                  className="h-11 min-w-0 flex-1 bg-transparent text-[12px] font-bold outline-none placeholder:text-[#94A3B8]"
                  autoFocus
                />
                {(pickerQuery || activeLetter) && (
                  <button
                    type="button"
                    onClick={() => {
                      setPickerQuery("");
                      setActiveLetter("");
                    }}
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-[#F1F5F9] text-[#64748B]"
                    aria-label="İl filtresini temizle"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              {draftSelected.length > 0 && (
                <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
                  {draftSelected.map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => toggleDraft(value)}
                      className="flex shrink-0 items-center gap-1 rounded-full bg-[#E6FFFB] px-2.5 py-1.5 text-[9px] font-black text-[#0F766E]"
                    >
                      {getHavuzCityDisplayName(value)}
                      <X size={10} />
                    </button>
                  ))}
                </div>
              )}

              <div className="mt-2 flex gap-1 overflow-x-auto pb-1">
                <button
                  type="button"
                  onClick={() => setActiveLetter("")}
                  className={`flex h-8 min-w-10 shrink-0 items-center justify-center rounded-[11px] border px-2 text-[9px] font-black ${
                    !activeLetter
                      ? "border-[#0F766E] bg-[#0F766E] text-white"
                      : "border-[#B8E5E2] bg-white text-[#0F766E]"
                  }`}
                >
                  Tümü
                </button>
                {letters.map((letter) => (
                  <button
                    key={letter}
                    type="button"
                    onClick={() => {
                      setActiveLetter(letter);
                      setPickerQuery("");
                    }}
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[11px] border text-[9px] font-black ${
                      activeLetter === letter
                        ? "border-[#0F766E] bg-[#0F766E] text-white"
                        : "border-[#B8E5E2] bg-white text-[#0F766E]"
                    }`}
                  >
                    {letter}
                  </button>
                ))}
              </div>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3">
              {loading ? (
                <div className="flex min-h-[180px] items-center justify-center gap-2 text-[11px] font-black text-[#0F766E]">
                  <Loader2 size={18} className="animate-spin" />
                  İl listesi yükleniyor...
                </div>
              ) : pickerOptions.length > 0 ? (
                <div className="space-y-4">
                  {portfolioCities.length > 0 && (
                    <section>
                      <div className="mb-2 flex items-center justify-between gap-2 px-1">
                        <p className="text-[9px] font-black uppercase tracking-[0.12em] text-[#0F766E]">
                          Portföylü İller
                        </p>
                        <span className="rounded-full bg-[#DBEAFE] px-2 py-1 text-[8px] font-black text-[#1D4ED8]">
                          {portfolioCities.length}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {portfolioCities.map(renderCityRow)}
                      </div>
                    </section>
                  )}

                  {otherCities.length > 0 && (
                    <section>
                      <div className="mb-2 flex items-center justify-between gap-2 px-1">
                        <p className="text-[9px] font-black uppercase tracking-[0.12em] text-[#64748B]">
                          Diğer İller
                        </p>
                        <span className="rounded-full bg-[#F1F5F9] px-2 py-1 text-[8px] font-black text-[#64748B]">
                          {otherCities.length}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {otherCities.map(renderCityRow)}
                      </div>
                    </section>
                  )}
                </div>
              ) : (
                <div className="flex min-h-[180px] items-center justify-center rounded-[22px] border border-dashed border-[#B8E5E2] bg-white px-6 text-center">
                  <p className="text-[11px] font-bold leading-5 text-[#64748B]">
                    Aramanızla eşleşen il bulunamadı.
                  </p>
                </div>
              )}
            </div>

            <footer className="shrink-0 border-t border-[#C8E7E4] bg-white p-3 pb-[max(12px,env(safe-area-inset-bottom))] shadow-[0_-12px_30px_rgba(6,41,37,0.06)]">
              <div className="mb-2 flex items-center justify-between gap-2 rounded-[14px] bg-[#F0FDFA] px-3 py-2">
                <span className="text-[9.5px] font-black text-[#64748B]">
                  {draftSelected.length} il seçildi
                </span>
                {draftSelected.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setDraftSelected([])}
                    className="text-[9px] font-black text-rose-600"
                  >
                    Seçimi Temizle
                  </button>
                )}
              </div>

              <div className="grid grid-cols-[0.8fr_1.2fr] gap-2">
                <button
                  type="button"
                  onClick={() => setPickerOpen(false)}
                  className="min-h-[50px] rounded-[16px] border border-[#C7D6E8] bg-white text-[11px] font-black text-[#64748B]"
                >
                  Vazgeç
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onChange(draftSelected);
                    setPickerOpen(false);
                  }}
                  className="min-h-[50px] rounded-[16px] bg-[linear-gradient(135deg,#0F766E_0%,#0891B2_100%)] px-2 text-[11px] font-black text-white shadow-[0_10px_24px_rgba(15,118,110,0.25)]"
                >
                  {draftSelected.length > 0
                    ? `${draftSelected.length} İli Uygula`
                    : "Tüm İlleri Göster"}
                </button>
              </div>
            </footer>
          </section>
        </div>
      )}
    </>
  );
}

function NumericRangeSection({
  filters,
  onChange,
}: {
  filters: HavuzFilterState;
  onChange: (filters: HavuzFilterState) => void;
}) {
  const rows: Array<{
    label: string;
    minKey: keyof HavuzFilterState;
    maxKey: keyof HavuzFilterState;
    suffix: string;
  }> = [
    {
      label: "Fiyat",
      minKey: "minPrice",
      maxKey: "maxPrice",
      suffix: "₺ / $ / € / £",
    },
    {
      label: "Toplam Alan",
      minKey: "minArea",
      maxKey: "maxArea",
      suffix: "m²",
    },
    {
      label: "Açık Alan",
      minKey: "minOpenArea",
      maxKey: "maxOpenArea",
      suffix: "m²",
    },
    {
      label: "Kapalı Alan",
      minKey: "minClosedArea",
      maxKey: "maxClosedArea",
      suffix: "m²",
    },
    {
      label: "Bulunduğu Kat",
      minKey: "minFloor",
      maxKey: "maxFloor",
      suffix: "kat",
    },
    {
      label: "Toplam Kat",
      minKey: "minTotalFloors",
      maxKey: "maxTotalFloors",
      suffix: "kat",
    },
    {
      label: "Yatak Sayısı",
      minKey: "minBedCount",
      maxKey: "maxBedCount",
      suffix: "adet",
    },
    {
      label: "Kullanılabilir Kredi",
      minKey: "minCredit",
      maxKey: "maxCredit",
      suffix: "tutar",
    },
  ];

  const set = (key: keyof HavuzFilterState, value: string) => {
    onChange({ ...filters, [key]: value });
  };

  return (
    <details
      open
      className="group overflow-hidden rounded-[20px] border-2 border-[#C7D6E8] bg-white"
    >
      <summary className="grid min-h-[58px] cursor-pointer list-none grid-cols-[20px_minmax(0,1fr)_20px] items-center gap-2 bg-[#F8FAFC] px-3 py-2">
        <span className="h-5 w-5" aria-hidden="true" />

        <div className="min-w-0 text-center">
          <p className="text-[13px] font-black text-[#1F2937]">
            Sayısal Aralıklar
          </p>
          <p className="mt-0.5 text-[10px] font-bold leading-4 text-[#64748B]">
            Minimum ve maksimum değerleri birlikte kullanabilirsiniz
          </p>
        </div>

        <ChevronDown
          size={17}
          className="text-[#2563EB] transition-transform group-open:rotate-180"
        />
      </summary>

      <div className="space-y-2.5 border-t-2 border-[#E2EAF5] p-2.5">
        {rows.map((row) => (
          <div
            key={row.label}
            className="rounded-[16px] border border-[#D7E3F2] bg-[#F8FAFC] p-2"
          >
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <span className="text-[10px] font-black text-[#1F2937]">
                {row.label}
              </span>
              <span className="text-[8.5px] font-black text-[#94A3B8]">
                {row.suffix}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                inputMode="numeric"
                value={String(filters[row.minKey] || "")}
                onChange={(event) =>
                  set(row.minKey, formatNumericInput(event.target.value))
                }
                placeholder="Minimum"
                className="h-10 min-w-0 rounded-[13px] border-2 border-[#C7D6E8] bg-white px-2 text-center text-[10.5px] font-black outline-none focus:border-[#2563EB]"
              />
              <input
                inputMode="numeric"
                value={String(filters[row.maxKey] || "")}
                onChange={(event) =>
                  set(row.maxKey, formatNumericInput(event.target.value))
                }
                placeholder="Maksimum"
                className="h-10 min-w-0 rounded-[13px] border-2 border-[#C7D6E8] bg-white px-2 text-center text-[10.5px] font-black outline-none focus:border-[#2563EB]"
              />
            </div>
          </div>
        ))}
      </div>
    </details>
  );
}

function getAllowedFeatureGroupKeys(types: string[]) {
  if (types.length === 0) return Object.keys(STOK_FEATURE_GROUPS);

  return Array.from(
    new Set(types.flatMap((type) => getFeaturePresetKeys(type))),
  );
}

function getAllowedSpecialKeys(types: string[]) {
  const rules =
    types.length > 0 ? types.map((type) => getFieldRule(type)) : Object.values(FIELD_RULES as Record<string, ReturnType<typeof getFieldRule>>);

  return new Set(
    rules.flatMap((rule) => rule.specialFields.map((field) => field.key)),
  );
}

function pruneNestedSelections(
  selections: Record<string, string[]>,
  allowedKeys: Set<string>,
) {
  return Object.fromEntries(
    Object.entries(selections).filter(
      ([key, values]) => allowedKeys.has(key) && values.length > 0,
    ),
  );
}

export default function HavuzFilterCenter({
  open,
  items,
  filters,
  resultCount,
  onChange,
  onClose,
}: {
  open: boolean;
  items: HavuzPoolItemLike[];
  filters: HavuzFilterState;
  resultCount: number;
  onChange: (filters: HavuzFilterState) => void;
  onClose: () => void;
}) {
  const [provinceOptions, setProvinceOptions] = useState<LocationOption[]>([]);
  const [districtOptions, setDistrictOptions] = useState<
    DistrictLocationOption[]
  >([]);
  const [placeOptions, setPlaceOptions] = useState<PlaceLocationOption[]>([]);
  const [provinceLoading, setProvinceLoading] = useState(false);
  const [districtLoading, setDistrictLoading] = useState(false);
  const [placeLoading, setPlaceLoading] = useState(false);
  const districtCache = useRef<Map<string, DistrictLocationOption[]>>(new Map());
  const placeCache = useRef<Map<string, PlaceLocationOption[]>>(new Map());

  useEffect(() => {
    if (!open || provinceOptions.length > 0) return;

    let active = true;
    setProvinceLoading(true);

    fetchProvinceOptions()
      .then((options) => {
        if (active) setProvinceOptions(options);
      })
      .finally(() => {
        if (active) setProvinceLoading(false);
      });

    return () => {
      active = false;
    };
  }, [open, provinceOptions.length]);

  useEffect(() => {
    if (!open || filters.cities.length === 0) {
      setDistrictOptions([]);
      setDistrictLoading(false);
      return;
    }

    let active = true;
    setDistrictLoading(true);

    Promise.all(
      filters.cities.map(async (city) => {
        const cached = districtCache.current.get(city);

        if (cached) return cached;

        const options = await fetchDistrictOptions(city);
        const normalized = options.map((option) => ({
          ...option,
          city,
          key: makeDistrictKey(city, option.name),
        }));

        districtCache.current.set(city, normalized);
        return normalized;
      }),
    )
      .then((groups) => {
        if (!active) return;
        setDistrictOptions(
          groups
            .flat()
            .sort(
              (a, b) =>
                a.city.localeCompare(b.city, "tr-TR") ||
                a.name.localeCompare(b.name, "tr-TR"),
            ),
        );
      })
      .finally(() => {
        if (active) setDistrictLoading(false);
      });

    return () => {
      active = false;
    };
  }, [filters.cities, open]);

  useEffect(() => {
    if (!open || filters.districts.length === 0) {
      setPlaceOptions([]);
      setPlaceLoading(false);
      return;
    }

    let active = true;
    setPlaceLoading(true);

    Promise.all(
      filters.districts.map(async (districtKey) => {
        const parsed = parseDistrictKey(districtKey);
        const districtOption = districtOptions.find(
          (option) => option.key === districtKey,
        );
        const cached = placeCache.current.get(districtKey);

        if (cached) return cached;

        const options = await fetchPlaceOptions(
          parsed.city,
          parsed.district,
          districtOption?.id,
        );

        const normalized = options.map((option) => ({
          ...option,
          city: parsed.city,
          district: parsed.district,
          districtKey,
          key: makeNeighborhoodKey(
            parsed.city,
            parsed.district,
            option.name,
          ),
        }));

        placeCache.current.set(districtKey, normalized);
        return normalized;
      }),
    )
      .then((groups) => {
        if (!active) return;
        setPlaceOptions(
          groups
            .flat()
            .sort(
              (a, b) =>
                a.city.localeCompare(b.city, "tr-TR") ||
                a.district.localeCompare(b.district, "tr-TR") ||
                a.name.localeCompare(b.name, "tr-TR"),
            ),
        );
      })
      .finally(() => {
        if (active) setPlaceLoading(false);
      });

    return () => {
      active = false;
    };
  }, [districtOptions, filters.districts, open]);

  const typeOptions = useMemo(
    () =>
      withCount(TYPE_OPTIONS, (value) =>
        optionCount(items, (item) => String(item.unit.type || "") === value),
      ),
    [items],
  );

  const statusOptions = useMemo(
    () =>
      withCount(STATUS_OPTIONS, (value) =>
        optionCount(items, (item) => String(item.unit.status || "") === value),
      ),
    [items],
  );

  const cityOptions = useMemo<Option[]>(
    () =>
      provinceOptions.map((option) => ({
        value: option.name,
        label: getHavuzCityDisplayName(option.name),
        count: optionCount(
          items,
          (item) => String(item.unit.project?.city || "") === option.name,
        ),
      })),
    [items, provinceOptions],
  );

  const districtFilterOptions = useMemo<Option[]>(
    () =>
      districtOptions.map((option) => ({
        value: option.key,
        label: option.name,
        group: getHavuzCityDisplayName(option.city),
        count: optionCount(
          items,
          (item) =>
            String(item.unit.project?.city || "") === option.city &&
            String(item.unit.project?.district || "") === option.name,
        ),
      })),
    [districtOptions, items],
  );

  const neighborhoodFilterOptions = useMemo<Option[]>(
    () =>
      placeOptions.map((option) => ({
        value: option.key,
        label: option.name,
        group: `${getHavuzCityDisplayName(option.city)} / ${option.district}`,
        count: optionCount(
          items,
          (item) =>
            String(item.unit.project?.city || "") === option.city &&
            String(item.unit.project?.district || "") === option.district &&
            String(item.unit.project?.address || "") === option.name,
        ),
      })),
    [items, placeOptions],
  );

  const roomOptions = useMemo(
    () =>
      withCount(ROOM_OPTIONS, (value) =>
        optionCount(
          items,
          (item) => String(item.unit.roomCount || "") === value,
        ),
      ),
    [items],
  );

  const currencyOptions = useMemo(
    () =>
      withCount(CURRENCY_OPTIONS, (value) =>
        optionCount(
          items,
          (item) => String(item.unit.priceCurrency || "TRY") === value,
        ),
      ),
    [items],
  );

  const ownerRoleOptions = useMemo(
    () =>
      withCount(OWNER_ROLE_OPTIONS, (value) =>
        optionCount(
          items,
          (item) => String(item.unit.project?.owner?.role || "") === value,
        ),
      ),
    [items],
  );

  const buildingAgeOptions = useMemo(
    () =>
      withCount(BUILDING_AGE_FILTER_OPTIONS, (value) =>
        optionCount(
          items,
          (item) =>
            decodePortfolioMetadataState(item.unit.features).buildingAge ===
            value,
        ),
      ),
    [items],
  );

  const floorOptions = useMemo(
    () =>
      withCount(FLOOR_FILTER_OPTIONS, (value) =>
        optionCount(
          items,
          (item) => String(item.unit.floorLabel || "") === value,
        ),
      ),
    [items],
  );

  const featureGroups = useMemo<StokFeatureGroup[]>(() => {
    return getFeatureGroups(getAllowedFeatureGroupKeys(filters.types));
  }, [filters.types]);

  const featureGroupOptions = useMemo(
    () =>
      featureGroups.map((group) => ({
        ...group,
        filterOptions: group.options.map((label) => {
          const value = `${group.key}:${label}`;
          return {
            value,
            label,
            count: optionCount(items, (item) =>
              getPublicPortfolioFeatures(item.unit.features).includes(value),
            ),
          };
        }),
      })),
    [featureGroups, items],
  );

  const specialFields = useMemo<DynamicSpecialField[]>(() => {
    const rules =
      filters.types.length > 0
        ? filters.types.map((type) => getFieldRule(type))
        : Object.values(FIELD_RULES as Record<string, ReturnType<typeof getFieldRule>>);

    const map = new Map<string, PortfolioSpecialField>();

    rules.forEach((rule) => {
      rule.specialFields.forEach((field) => {
        const current = map.get(field.key);

        if (!current) {
          map.set(field.key, { ...field, options: [...field.options] });
          return;
        }

        current.options = Array.from(
          new Set([...current.options, ...field.options]),
        );
      });
    });

    return Array.from(map.values()).map((field) => ({
      ...field,
      countByOption: Object.fromEntries(
        field.options.map((option) => [
          option,
          optionCount(
            items,
            (item) =>
              decodePortfolioMetadataState(item.unit.features)[field.key] ===
              option,
          ),
        ]),
      ),
    }));
  }, [filters.types, items]);

  if (!open) return null;

  const set = <K extends keyof HavuzFilterState>(
    key: K,
    value: HavuzFilterState[K],
  ) => {
    onChange({ ...filters, [key]: value });
  };

  const updateNested = (
    parentKey: "featureSelections" | "specialSelections",
    childKey: string,
    values: string[],
  ) => {
    const next = {
      ...filters[parentKey],
      [childKey]: values,
    };

    if (values.length === 0) {
      delete next[childKey];
    }

    onChange({ ...filters, [parentKey]: next });
  };

  const handleTypeChange = (types: string[]) => {
    const allowedFeatureKeys = new Set(getAllowedFeatureGroupKeys(types));
    const allowedSpecialKeys = getAllowedSpecialKeys(types);

    onChange({
      ...filters,
      types,
      featureSelections: pruneNestedSelections(
        filters.featureSelections,
        allowedFeatureKeys,
      ),
      specialSelections: pruneNestedSelections(
        filters.specialSelections,
        allowedSpecialKeys,
      ),
    });
  };

  const handleCityChange = (cities: string[]) => {
    const districts = filters.districts.filter((value) =>
      cities.includes(parseDistrictKey(value).city),
    );
    const districtSet = new Set(districts);
    const neighborhoods = filters.neighborhoods.filter((value) => {
      const parsed = parseNeighborhoodKey(value);
      return districtSet.has(makeDistrictKey(parsed.city, parsed.district));
    });

    onChange({
      ...filters,
      cities,
      districts,
      neighborhoods,
    });
  };

  const handleDistrictChange = (districts: string[]) => {
    const districtSet = new Set(districts);

    onChange({
      ...filters,
      districts,
      neighborhoods: filters.neighborhoods.filter((value) => {
        const parsed = parseNeighborhoodKey(value);
        return districtSet.has(
          makeDistrictKey(parsed.city, parsed.district),
        );
      }),
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/60 sm:items-center sm:p-4">
      <section className="flex h-[100dvh] w-full max-w-[480px] flex-col overflow-hidden bg-[#F4F8FF] shadow-[0_24px_70px_rgba(15,23,42,0.36)] sm:h-[min(95dvh,900px)] sm:rounded-[30px] sm:border-2 sm:border-[#C7D6E8]">
        <header className="shrink-0 border-b-2 border-[#C7D6E8] bg-white px-3 pb-3 pt-[max(12px,env(safe-area-inset-top))]">
          <div className="grid grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-2">
            <div className="h-11 w-11" aria-hidden="true" />

            <div className="min-w-0 text-center">
              <h2 className="text-[21px] font-black tracking-[-0.04em] text-[#1F2937]">
                Havuz Detaylı Filtre
              </h2>
              <p className="mt-1 text-[11px] font-bold leading-4 text-[#64748B]">
                Tüm il, ilçe, mahalle, portföy türü ve giriş özellikleri.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] border-2 border-[#C7D6E8] bg-[#F8FAFC] text-[#2563EB]"
              aria-label="Filtreleri kapat"
            >
              <X size={19} />
            </button>
          </div>

          <div className="mt-2 rounded-[14px] border border-[#BFDBFE] bg-[#EFF6FF] px-3 py-2 text-center text-[10px] font-black leading-4 text-[#1D4ED8]">
            Aynı bölümde VEYA • Farklı bölümler arasında VE
          </div>
        </header>

        <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-3 py-3">
          <PremiumCitySelector
            options={cityOptions}
            selected={filters.cities}
            onChange={handleCityChange}
            loading={provinceLoading}
          />

          {filters.cities.length > 0 && (
            <MultiSelectSection
              title="İlçe"
              options={districtFilterOptions}
              selected={filters.districts}
              onChange={handleDistrictChange}
              defaultOpen
              loading={districtLoading}
              emptyText="Seçtiğiniz iller için ilçe bulunamadı."
              hint={`${filters.cities.length} il için ilçe seçimi`}
            />
          )}

          {filters.districts.length > 0 && (
            <MultiSelectSection
              title="Mahalle / Köy / Mevki"
              options={neighborhoodFilterOptions}
              selected={filters.neighborhoods}
              onChange={(value) => set("neighborhoods", value)}
              defaultOpen
              loading={placeLoading}
              emptyText="Seçtiğiniz ilçeler için yerleşim bulunamadı."
              hint={`${filters.districts.length} ilçe için yerleşim seçimi`}
            />
          )}

          <section className="rounded-[20px] border-2 border-[#C4B5FD] bg-gradient-to-br from-violet-50 to-white p-3 text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.1em] text-violet-700">
              Portföy Giriş Evreni
            </p>
            <p className="mt-1 text-[12px] font-black text-[#1F2937]">
              Tür seçimine göre tüm detaylar açılır
            </p>
          </section>

          <MultiSelectSection
            title="Portföy Türü"
            options={typeOptions}
            selected={filters.types}
            onChange={handleTypeChange}
            defaultOpen
            hint="Portföy girişindeki bütün türler"
          />

          <MultiSelectSection
            title="İşlem / Pazarlama Durumu"
            options={statusOptions}
            selected={filters.statuses}
            onChange={(value) => set("statuses", value)}
            defaultOpen
            hint="Satılık, kiralık, proje ve diğer durumlar"
          />

          <MultiSelectSection
            title="Oda Sayısı"
            options={roomOptions}
            selected={filters.rooms}
            onChange={(value) => set("rooms", value)}
          />

          <MultiSelectSection
            title="Bina Yaşı"
            options={buildingAgeOptions}
            selected={filters.buildingAges}
            onChange={(value) => set("buildingAges", value)}
          />

          <MultiSelectSection
            title="Bulunduğu Kat"
            options={floorOptions}
            selected={filters.floorLabels}
            onChange={(value) => set("floorLabels", value)}
          />

          <MultiSelectSection
            title="Para Birimi"
            options={currencyOptions}
            selected={filters.currencies}
            onChange={(value) => set("currencies", value)}
            searchable={false}
          />

          <NumericRangeSection filters={filters} onChange={onChange} />

          {specialFields.length > 0 && (
            <section className="rounded-[20px] border-2 border-[#F2C66D] bg-[#FFF7E6] p-3 text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.1em] text-amber-700">
                Türe Özel Alanlar
              </p>
              <p className="mt-1 text-[11px] font-bold leading-4 text-amber-900">
                {filters.types.length > 0
                  ? "Seçtiğiniz portföy türlerine ait özel detaylar"
                  : "Tür seçilmediği için bütün özel detaylar gösteriliyor"}
              </p>
            </section>
          )}

          {specialFields.map((field) => (
            <MultiSelectSection
              key={field.key}
              title={field.label}
              options={field.options.map((option) => ({
                value: option,
                label: option,
                count: field.countByOption[option] || 0,
              }))}
              selected={filters.specialSelections[field.key] || []}
              onChange={(values) =>
                updateNested("specialSelections", field.key, values)
              }
              searchable={field.options.length > 6}
            />
          ))}

          {featureGroupOptions.length > 0 && (
            <section className="rounded-[20px] border-2 border-[#86EFAC] bg-[#F0FDF4] p-3 text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.1em] text-emerald-700">
                Detaylı Özellikler
              </p>
              <p className="mt-1 text-[11px] font-bold leading-4 text-emerald-900">
                İç, dış, muhit, ulaşım, cephe, manzara, imar ve diğerleri
              </p>
            </section>
          )}

          {featureGroupOptions.map((group) => (
            <MultiSelectSection
              key={group.key}
              title={group.label}
              options={group.filterOptions}
              selected={filters.featureSelections[group.key] || []}
              onChange={(values) =>
                updateNested("featureSelections", group.key, values)
              }
            />
          ))}

          <section className="rounded-[20px] border-2 border-[#C7D6E8] bg-white p-3 text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.1em] text-[#64748B]">
              Ek Filtreler
            </p>
          </section>

          <MultiSelectSection
            title="Doğrulama ve Harita"
            options={withCount(VERIFICATION_OPTIONS, (value) =>
              optionCount(items, (item) => {
                if (value === "EPH_APPROVED")
                  return Boolean(
                    item.unit.isVerified ||
                      (item.unit.tapuVerified && item.unit.yetkiVerified),
                  );
                if (value === "TAPU_VERIFIED")
                  return Boolean(
                    item.unit.tapuVerified || item.unit.isVerified,
                  );
                if (value === "AUTHORITY_VERIFIED")
                  return Boolean(
                    item.unit.yetkiVerified || item.unit.isVerified,
                  );
                if (value === "PHOTO_VERIFIED")
                  return Boolean(
                    item.unit.photoVerified || item.unit.isVerified,
                  );
                return Boolean(
                  Number(item.unit.project?.latitude) &&
                    Number(item.unit.project?.longitude),
                );
              }),
            )}
            selected={filters.verification}
            onChange={(value) => set("verification", value)}
            searchable={false}
          />

          <MultiSelectSection
            title="Portföy Sahibi"
            options={ownerRoleOptions}
            selected={filters.ownerRoles}
            onChange={(value) => set("ownerRoles", value)}
            searchable={false}
          />

          <MultiSelectSection
            title="CRM Eşleşme Oranı"
            options={MATCH_BAND_OPTIONS}
            selected={filters.matchBands}
            onChange={(value) => set("matchBands", value)}
            searchable={false}
          />

          <MultiSelectSection
            title="CRM Eşleşme Durumu"
            options={CRM_OPTIONS}
            selected={filters.crmFlags}
            onChange={(value) => set("crmFlags", value)}
            searchable={false}
          />

          <MultiSelectSection
            title="Eklenme Tarihi"
            options={DATE_OPTIONS}
            selected={filters.dateRanges}
            onChange={(value) => set("dateRanges", value)}
            searchable={false}
          />

          <details
            open
            className="group overflow-hidden rounded-[20px] border-2 border-[#C7D6E8] bg-white"
          >
            <summary className="grid min-h-[58px] cursor-pointer list-none grid-cols-[20px_minmax(0,1fr)_20px] items-center gap-2 bg-[#F8FAFC] px-3 py-2">
              <span className="h-5 w-5" aria-hidden="true" />

              <div className="min-w-0 text-center">
                <p className="text-[13px] font-black text-[#1F2937]">
                  Sıralama
                </p>
                <p className="mt-0.5 text-[10px] font-bold leading-4 text-[#64748B]">
                  Sonuçların gösterim önceliği
                </p>
              </div>

              <ChevronDown
                size={17}
                className="text-[#2563EB] transition-transform group-open:rotate-180"
              />
            </summary>

            <div className="space-y-2 border-t-2 border-[#E2EAF5] p-2.5">
              {SORT_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => set("sort", option.value)}
                  className={`flex min-h-[42px] w-full items-center gap-2 rounded-[14px] border-2 px-2.5 text-left text-[10.5px] font-black ${
                    filters.sort === option.value
                      ? "border-[#2563EB] bg-[#EFF6FF] text-[#1D4ED8]"
                      : "border-[#D7E3F2] bg-white text-[#334155]"
                  }`}
                >
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                      filters.sort === option.value
                        ? "border-[#2563EB] bg-[#2563EB] text-white"
                        : "border-[#B8C9DD] text-transparent"
                    }`}
                  >
                    <Check size={11} />
                  </span>
                  {option.label}
                </button>
              ))}
            </div>
          </details>
        </div>

        <footer className="shrink-0 border-t-2 border-[#C7D6E8] bg-white p-3 pb-[max(12px,env(safe-area-inset-bottom))]">
          <div className="mb-2 text-center text-[10px] font-black text-[#64748B]">
            Seçimlerinizle eşleşen <strong className="text-[#2563EB]">{resultCount}</strong> portföy bulundu
          </div>
          <div className="grid grid-cols-[0.9fr_1.1fr] gap-2">
            <button
              type="button"
              onClick={() => onChange(createEmptyHavuzFilters())}
              className="flex min-h-[48px] items-center justify-center gap-1.5 rounded-[16px] border-2 border-[#C7D6E8] bg-white px-2 text-[11px] font-black text-[#2563EB]"
            >
              <RotateCcw size={15} />
              Temizle
            </button>

            <button
              type="button"
              onClick={onClose}
              className="flex min-h-[48px] items-center justify-center gap-1.5 rounded-[16px] bg-[#2563EB] px-2 text-[11px] font-black text-white shadow-[0_10px_22px_rgba(37,99,235,0.24)]"
            >
              <SlidersHorizontal size={15} />
              {resultCount} Portföyü Göster
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}