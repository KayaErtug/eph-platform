"use client";

import { useMemo } from "react";

import {
  AdvancedFilterCenter,
  createDistrictLocationKey,
  createNeighborhoodLocationKey,
  locationSelectionLabel,
  type AdvancedFilterOption,
  type AdvancedFilterSection,
  type AdvancedFilterState,
} from "@/components/advanced-filter";
import {
  STATUS_LABELS,
  TYPE_LABELS,
} from "@/components/stok/stokConstants";

export type PortfolioSortMode =
  | "NEWEST"
  | "PRICE_ASC"
  | "PRICE_DESC"
  | "AREA_DESC";

export type PortfolioFilterState = AdvancedFilterState & {
  types: string[];
  statuses: string[];
  cities: string[];
  districts: string[];
  neighborhoods: string[];
  rooms: string[];
  currencies: string[];
  verification: string[];
  poolStates: string[];
  approvalStatuses: string[];
  locationStates: string[];
  dateRanges: string[];
  floors: string[];
  deedStates: string[];
  creditStates: string[];
  swapStates: string[];
  advisors: string[];
  minPrice: string;
  maxPrice: string;
  minArea: string;
  maxArea: string;
  sort: PortfolioSortMode;
};

export type PortfolioFilterUnit = {
  id: string;
  type?: string | null;
  status?: string | null;
  roomCount?: string | null;
  area?: number | null;
  price?: number | null;
  priceCurrency?: string | null;
  description?: string | null;
  createdAt?: string | null;
  floor?: number | null;
  floorLabel?: string | null;
  totalFloors?: number | null;
  isVerified?: boolean;
  isPoolVisible?: boolean;
  approvalStatus?: string | null;
  tapuVerified?: boolean;
  photoVerified?: boolean;
  yetkiVerified?: boolean;
  availableCreditAmount?: number | null;
  creditEligible?: boolean | null;
  swapAvailable?: boolean | null;
  owner?: {
    id?: string | null;
    firstName?: string | null;
    lastName?: string | null;
  } | null;
  project?: {
    name?: string | null;
    city?: string | null;
    district?: string | null;
    address?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    owner?: {
      id?: string | null;
      firstName?: string | null;
      lastName?: string | null;
    } | null;
  } | null;
};

type Option = {
  value: string;
  label: string;
};

type ArrayFilterKey =
  | "types"
  | "statuses"
  | "cities"
  | "districts"
  | "neighborhoods"
  | "rooms"
  | "currencies"
  | "verification"
  | "poolStates"
  | "approvalStatuses"
  | "locationStates"
  | "dateRanges"
  | "floors"
  | "deedStates"
  | "creditStates"
  | "swapStates"
  | "advisors";

type StoredFilter = {
  id: string;
  name: string;
  filters: PortfolioFilterState;
  createdAt: number;
};

export type PortfolioFilterChip = {
  id: string;
  key: ArrayFilterKey | "minPrice" | "maxPrice" | "minArea" | "maxArea" | "sort";
  value: string;
  label: string;
};

const SAVED_FILTERS_KEY = "eph-portfolio-saved-filters-v1";
const RECENT_FILTERS_KEY = "eph-portfolio-recent-filters-v1";

const VERIFICATION_OPTIONS: Option[] = [
  { value: "EPH_APPROVED", label: "EPH Onaylı" },
  { value: "TAPU_VERIFIED", label: "Tapu Doğrulandı" },
  { value: "AUTHORITY_VERIFIED", label: "Yetki Belgesi Doğrulandı" },
  { value: "PHOTO_VERIFIED", label: "Fotoğraf Doğrulandı" },
  { value: "UNVERIFIED", label: "Doğrulama Bekliyor" },
];

const POOL_OPTIONS: Option[] = [
  { value: "IN_POOL", label: "Havuzda" },
  { value: "OUT_POOL", label: "Havuz Dışında" },
];

const LOCATION_OPTIONS: Option[] = [
  { value: "WITH_LOCATION", label: "Harita Konumu Var" },
  { value: "WITHOUT_LOCATION", label: "Harita Konumu Yok" },
];

const DATE_OPTIONS: Option[] = [
  { value: "TODAY", label: "Bugün" },
  { value: "LAST_7_DAYS", label: "Son 7 Gün" },
  { value: "LAST_30_DAYS", label: "Son 30 Gün" },
];

const CURRENCY_OPTIONS: Option[] = [
  { value: "TRY", label: "Türk Lirası" },
  { value: "USD", label: "Dolar" },
  { value: "EUR", label: "Euro" },
  { value: "GBP", label: "Sterlin" },
];

const DEED_OPTIONS: Option[] = [
  { value: "DEED_VERIFIED", label: "Tapu Doğrulandı" },
  { value: "DEED_PENDING", label: "Tapu Kontrol Bekliyor" },
];

const CREDIT_OPTIONS: Option[] = [
  { value: "CREDIT_AVAILABLE", label: "Krediye Uygun" },
  { value: "CREDIT_UNAVAILABLE", label: "Kredi Bilgisi Yok" },
];

const SWAP_OPTIONS: Option[] = [
  { value: "SWAP_AVAILABLE", label: "Takasa Uygun" },
  { value: "SWAP_UNAVAILABLE", label: "Takas Yok" },
];

const SORT_OPTIONS: Array<{ value: PortfolioSortMode; label: string }> = [
  { value: "NEWEST", label: "En Yeni" },
  { value: "PRICE_ASC", label: "Fiyat Artan" },
  { value: "PRICE_DESC", label: "Fiyat Azalan" },
  { value: "AREA_DESC", label: "m² Büyükten Küçüğe" },
];

const APPROVAL_LABELS: Record<string, string> = {
  TASLAK: "Taslak",
  YETKI_BELGESI_BEKLIYOR: "Yetki Belgesi Bekliyor",
  INCELEMEYE_GONDERILDI: "İncelemeye Gönderildi",
  INCELEMEDE: "İncelemede",
  ONAYLANDI: "Onaylandı",
  REDDEDILDI: "Reddedildi",
  HAVUZDA: "Havuzda",
  EKSIK_BILGI: "Eksik Bilgi",
  EKSIK_BILGI_BEKLENIYOR: "Eksik Bilgi Bekleniyor",
};

const LABEL_MAPS: Record<string, Record<string, string>> = {
  verification: Object.fromEntries(
    VERIFICATION_OPTIONS.map((item) => [item.value, item.label]),
  ),
  poolStates: Object.fromEntries(
    POOL_OPTIONS.map((item) => [item.value, item.label]),
  ),
  locationStates: Object.fromEntries(
    LOCATION_OPTIONS.map((item) => [item.value, item.label]),
  ),
  dateRanges: Object.fromEntries(
    DATE_OPTIONS.map((item) => [item.value, item.label]),
  ),
  deedStates: Object.fromEntries(
    DEED_OPTIONS.map((item) => [item.value, item.label]),
  ),
  creditStates: Object.fromEntries(
    CREDIT_OPTIONS.map((item) => [item.value, item.label]),
  ),
  swapStates: Object.fromEntries(
    SWAP_OPTIONS.map((item) => [item.value, item.label]),
  ),
};

export function createEmptyPortfolioFilters(): PortfolioFilterState {
  return {
    types: [],
    statuses: [],
    cities: [],
    districts: [],
    neighborhoods: [],
    rooms: [],
    currencies: [],
    verification: [],
    poolStates: [],
    approvalStatuses: [],
    locationStates: [],
    dateRanges: [],
    floors: [],
    deedStates: [],
    creditStates: [],
    swapStates: [],
    advisors: [],
    minPrice: "",
    maxPrice: "",
    minArea: "",
    maxArea: "",
    sort: "NEWEST",
  };
}

function hydrateFilters(value?: Partial<PortfolioFilterState> | null) {
  return {
    ...createEmptyPortfolioFilters(),
    ...(value || {}),
  };
}

function normalize(value?: string | null) {
  return String(value || "")
    .toLocaleLowerCase("tr-TR")
    .trim();
}

function parseNumber(value: string) {
  const numeric = Number(String(value || "").replace(/\D/g, ""));
  return Number.isFinite(numeric) ? numeric : 0;
}

function unique(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(values.map((value) => String(value || "").trim()).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b, "tr"));
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

function approvalLabel(value: string) {
  return APPROVAL_LABELS[value] || value.replaceAll("_", " ");
}

function isUnitVerified(unit: PortfolioFilterUnit) {
  return Boolean(
    unit.isVerified ||
      (unit.tapuVerified && unit.photoVerified && unit.yetkiVerified),
  );
}

function hasLocation(unit: PortfolioFilterUnit) {
  return Boolean(
    Number(unit.project?.latitude) && Number(unit.project?.longitude),
  );
}

function isInPool(unit: PortfolioFilterUnit) {
  return Boolean(
    unit.isPoolVisible || String(unit.approvalStatus || "") === "HAVUZDA",
  );
}

function isCreditAvailable(unit: PortfolioFilterUnit) {
  return Boolean(
    Number(unit.availableCreditAmount || 0) > 0 || unit.creditEligible,
  );
}

function readSwapState(unit: PortfolioFilterUnit) {
  if (typeof unit.swapAvailable === "boolean") return unit.swapAvailable;

  const text = normalize(
    [unit.description, ...(Array.isArray((unit as any).features) ? (unit as any).features : [])]
      .filter(Boolean)
      .join(" "),
  );

  return text.includes("takas");
}

function readFloor(unit: PortfolioFilterUnit) {
  if (unit.floorLabel) return String(unit.floorLabel);
  if (unit.floor != null) return `${unit.floor}. Kat`;
  return "";
}

function readAdvisor(unit: PortfolioFilterUnit) {
  const source = (unit.owner || unit.project?.owner || (unit as any).user || null) as
    | {
        id?: string | null;
        firstName?: string | null;
        lastName?: string | null;
      }
    | null;

  const name = [source?.firstName, source?.lastName].filter(Boolean).join(" ").trim();
  if (!name) return "";
  return source?.id ? `${source.id}::${name}` : name;
}

function advisorLabel(value: string) {
  return value.includes("::") ? value.split("::").slice(1).join("::") : value;
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

export function applyPortfolioFilters<T extends PortfolioFilterUnit>(
  units: T[],
  filters: PortfolioFilterState,
  keyword = "",
): T[] {
  const hydrated = hydrateFilters(filters);
  const query = normalize(keyword);
  const minPrice = parseNumber(hydrated.minPrice);
  const maxPrice = parseNumber(hydrated.maxPrice);
  const minArea = parseNumber(hydrated.minArea);
  const maxArea = parseNumber(hydrated.maxArea);

  const filtered = units.filter((unit) => {
    const type = String(unit.type || "");
    const status = String(unit.status || "");
    const city = String(unit.project?.city || "");
    const district = String(unit.project?.district || "");
    const neighborhood = String(unit.project?.address || "");
    const room = String(unit.roomCount || "");
    const currency = String(unit.priceCurrency || "TRY");
    const approvalStatus = String(unit.approvalStatus || "");
    const price = Number(unit.price || 0);
    const area = Number(unit.area || 0);
    const verified = isUnitVerified(unit);
    const pool = isInPool(unit);
    const location = hasLocation(unit);
    const floor = readFloor(unit);
    const advisor = readAdvisor(unit);
    const credit = isCreditAvailable(unit);
    const swap = readSwapState(unit);

    if (hydrated.types.length > 0 && !hydrated.types.includes(type)) return false;
    if (hydrated.statuses.length > 0 && !hydrated.statuses.includes(status)) return false;
    const districtKey = createDistrictLocationKey(city, district);
    const neighborhoodKey = createNeighborhoodLocationKey(
      city,
      district,
      neighborhood,
    );

    if (hydrated.cities.length > 0 && !hydrated.cities.includes(city)) return false;
    if (
      hydrated.districts.length > 0 &&
      !hydrated.districts.includes(districtKey) &&
      !hydrated.districts.includes(district)
    )
      return false;
    if (
      hydrated.neighborhoods.length > 0 &&
      !hydrated.neighborhoods.includes(neighborhoodKey) &&
      !hydrated.neighborhoods.includes(neighborhood)
    )
      return false;
    if (hydrated.rooms.length > 0 && !hydrated.rooms.includes(room)) return false;
    if (hydrated.currencies.length > 0 && !hydrated.currencies.includes(currency))
      return false;
    if (
      hydrated.approvalStatuses.length > 0 &&
      !hydrated.approvalStatuses.includes(approvalStatus)
    )
      return false;
    if (hydrated.floors.length > 0 && !hydrated.floors.includes(floor)) return false;
    if (hydrated.advisors.length > 0 && !hydrated.advisors.includes(advisor))
      return false;

    if (minPrice && price < minPrice) return false;
    if (maxPrice && price > maxPrice) return false;
    if (minArea && area < minArea) return false;
    if (maxArea && area > maxArea) return false;

    if (
      hydrated.verification.length > 0 &&
      !hydrated.verification.some((flag) => {
        if (flag === "EPH_APPROVED") return verified;
        if (flag === "TAPU_VERIFIED") return Boolean(unit.tapuVerified || unit.isVerified);
        if (flag === "AUTHORITY_VERIFIED")
          return Boolean(unit.yetkiVerified || unit.isVerified);
        if (flag === "PHOTO_VERIFIED")
          return Boolean(unit.photoVerified || unit.isVerified);
        if (flag === "UNVERIFIED") return !verified;
        return false;
      })
    )
      return false;

    if (
      hydrated.poolStates.length > 0 &&
      !hydrated.poolStates.some((flag) =>
        flag === "IN_POOL" ? pool : flag === "OUT_POOL" ? !pool : false,
      )
    )
      return false;

    if (
      hydrated.locationStates.length > 0 &&
      !hydrated.locationStates.some((flag) =>
        flag === "WITH_LOCATION"
          ? location
          : flag === "WITHOUT_LOCATION"
            ? !location
            : false,
      )
    )
      return false;

    if (
      hydrated.deedStates.length > 0 &&
      !hydrated.deedStates.some((flag) =>
        flag === "DEED_VERIFIED"
          ? Boolean(unit.tapuVerified || unit.isVerified)
          : flag === "DEED_PENDING"
            ? !Boolean(unit.tapuVerified || unit.isVerified)
            : false,
      )
    )
      return false;

    if (
      hydrated.creditStates.length > 0 &&
      !hydrated.creditStates.some((flag) =>
        flag === "CREDIT_AVAILABLE"
          ? credit
          : flag === "CREDIT_UNAVAILABLE"
            ? !credit
            : false,
      )
    )
      return false;

    if (
      hydrated.swapStates.length > 0 &&
      !hydrated.swapStates.some((flag) =>
        flag === "SWAP_AVAILABLE"
          ? swap
          : flag === "SWAP_UNAVAILABLE"
            ? !swap
            : false,
      )
    )
      return false;

    if (
      hydrated.dateRanges.length > 0 &&
      !hydrated.dateRanges.some((range) => isInDateRange(unit.createdAt, range))
    )
      return false;

    if (query) {
      const haystack = normalize(
        [
          unit.project?.name,
          unit.project?.city,
          unit.project?.district,
          unit.project?.address,
          typeLabel(type),
          statusLabel(status),
          unit.roomCount,
          unit.description,
          advisorLabel(advisor),
        ]
          .filter(Boolean)
          .join(" "),
      );

      if (!haystack.includes(query)) return false;
    }

    return true;
  });

  return [...filtered].sort((a, b) => {
    if (hydrated.sort === "PRICE_ASC")
      return Number(a.price || 0) - Number(b.price || 0);
    if (hydrated.sort === "PRICE_DESC")
      return Number(b.price || 0) - Number(a.price || 0);
    if (hydrated.sort === "AREA_DESC")
      return Number(b.area || 0) - Number(a.area || 0);

    return (
      new Date(String(b.createdAt || 0)).getTime() -
      new Date(String(a.createdAt || 0)).getTime()
    );
  });
}

export function countPortfolioFilters(filters: PortfolioFilterState) {
  const hydrated = hydrateFilters(filters);
  const arrayCount = [
    hydrated.types,
    hydrated.statuses,
    hydrated.cities,
    hydrated.districts,
    hydrated.neighborhoods,
    hydrated.rooms,
    hydrated.currencies,
    hydrated.verification,
    hydrated.poolStates,
    hydrated.approvalStatuses,
    hydrated.locationStates,
    hydrated.dateRanges,
    hydrated.floors,
    hydrated.deedStates,
    hydrated.creditStates,
    hydrated.swapStates,
    hydrated.advisors,
  ].reduce((total, values) => total + values.length, 0);

  return (
    arrayCount +
    Number(Boolean(hydrated.minPrice)) +
    Number(Boolean(hydrated.maxPrice)) +
    Number(Boolean(hydrated.minArea)) +
    Number(Boolean(hydrated.maxArea)) +
    Number(hydrated.sort !== "NEWEST")
  );
}

function labelForFilter(key: ArrayFilterKey, value: string) {
  if (key === "types") return typeLabel(value);
  if (key === "statuses") return statusLabel(value);
  if (key === "districts" || key === "neighborhoods")
    return locationSelectionLabel(value);
  if (key === "approvalStatuses") return approvalLabel(value);
  if (key === "advisors") return `Danışman: ${advisorLabel(value)}`;
  if (key === "floors") return `Kat: ${value}`;
  if (key === "rooms") return `Oda: ${value}`;
  if (key === "currencies")
    return CURRENCY_OPTIONS.find((item) => item.value === value)?.label || value;
  return LABEL_MAPS[key]?.[value] || value;
}

const ARRAY_FILTER_KEYS: ArrayFilterKey[] = [
  "types",
  "statuses",
  "cities",
  "districts",
  "neighborhoods",
  "rooms",
  "currencies",
  "verification",
  "poolStates",
  "approvalStatuses",
  "locationStates",
  "dateRanges",
  "floors",
  "deedStates",
  "creditStates",
  "swapStates",
  "advisors",
];

export function getPortfolioFilterChipEntries(
  filters: PortfolioFilterState,
): PortfolioFilterChip[] {
  const hydrated = hydrateFilters(filters);
  const chips: PortfolioFilterChip[] = [];

  ARRAY_FILTER_KEYS.forEach((key) => {
    hydrated[key].forEach((value) => {
      chips.push({
        id: `${key}:${value}`,
        key,
        value,
        label: labelForFilter(key, value),
      });
    });
  });

  if (hydrated.minPrice) {
    chips.push({
      id: "minPrice",
      key: "minPrice",
      value: hydrated.minPrice,
      label: `Min. ${Number(hydrated.minPrice).toLocaleString("tr-TR")} ₺`,
    });
  }

  if (hydrated.maxPrice) {
    chips.push({
      id: "maxPrice",
      key: "maxPrice",
      value: hydrated.maxPrice,
      label: `Maks. ${Number(hydrated.maxPrice).toLocaleString("tr-TR")} ₺`,
    });
  }

  if (hydrated.minArea) {
    chips.push({
      id: "minArea",
      key: "minArea",
      value: hydrated.minArea,
      label: `Min. ${hydrated.minArea} m²`,
    });
  }

  if (hydrated.maxArea) {
    chips.push({
      id: "maxArea",
      key: "maxArea",
      value: hydrated.maxArea,
      label: `Maks. ${hydrated.maxArea} m²`,
    });
  }

  if (hydrated.sort !== "NEWEST") {
    chips.push({
      id: "sort",
      key: "sort",
      value: hydrated.sort,
      label:
        SORT_OPTIONS.find((item) => item.value === hydrated.sort)?.label ||
        hydrated.sort,
    });
  }

  return chips;
}

export function getPortfolioFilterChips(filters: PortfolioFilterState) {
  return getPortfolioFilterChipEntries(filters).map((chip) => chip.label);
}

export function removePortfolioFilterChip(
  filters: PortfolioFilterState,
  chip: PortfolioFilterChip,
): PortfolioFilterState {
  const hydrated = hydrateFilters(filters);

  if (ARRAY_FILTER_KEYS.includes(chip.key as ArrayFilterKey)) {
    const key = chip.key as ArrayFilterKey;

    return {
      ...hydrated,
      [key]: hydrated[key].filter((value) => value !== chip.value),
    } as PortfolioFilterState;
  }

  if (chip.key === "sort") {
    return {
      ...hydrated,
      sort: "NEWEST",
    };
  }

  return {
    ...hydrated,
    [chip.key]: "",
  } as PortfolioFilterState;
}

function addCounts(
  options: AdvancedFilterOption[],
  values: string[],
): AdvancedFilterOption[] {
  return options.map((option) => ({
    ...option,
    count: values.filter((value) => value === option.value).length,
  }));
}

function optionsFromRecord(
  labels: Record<string, string>,
  values: string[],
): AdvancedFilterOption[] {
  const optionValues = unique([...Object.keys(labels), ...values]);

  return optionValues.map((value) => ({
    value,
    label: labels[value] || value.replaceAll("_", " "),
    count: values.filter((item) => item === value).length,
  }));
}

export default function PortfolioFilterCenter({
  open,
  units,
  filters,
  resultCount,
  onChange,
  onClose,
}: {
  open: boolean;
  units: PortfolioFilterUnit[];
  filters: PortfolioFilterState;
  resultCount: number;
  onChange: (filters: PortfolioFilterState) => void;
  onClose: () => void;
}) {
  const sections = useMemo<AdvancedFilterSection[]>(() => {
    const types = units.map((unit) => String(unit.type || "").trim()).filter(Boolean);
    const statuses = units
      .map((unit) => String(unit.status || "").trim())
      .filter(Boolean);
    const rooms = units
      .map((unit) => String(unit.roomCount || "").trim())
      .filter(Boolean);
    const floors = units.map(readFloor).filter(Boolean);
    const currencies = units
      .map((unit) => String(unit.priceCurrency || "TRY").trim())
      .filter(Boolean);
    const approvals = units
      .map((unit) => String(unit.approvalStatus || "").trim())
      .filter(Boolean);
    const advisors = units.map(readAdvisor).filter(Boolean);
    const verificationValues = units.flatMap((unit) => {
      const values: string[] = [];
      if (isUnitVerified(unit)) values.push("EPH_APPROVED");
      if (unit.tapuVerified || unit.isVerified) values.push("TAPU_VERIFIED");
      if (unit.yetkiVerified || unit.isVerified)
        values.push("AUTHORITY_VERIFIED");
      if (unit.photoVerified || unit.isVerified) values.push("PHOTO_VERIFIED");
      if (!isUnitVerified(unit)) values.push("UNVERIFIED");
      return values;
    });
    const poolValues = units.map((unit) =>
      isInPool(unit) ? "IN_POOL" : "OUT_POOL",
    );
    const locationValues = units.map((unit) =>
      hasLocation(unit) ? "WITH_LOCATION" : "WITHOUT_LOCATION",
    );
    const deedValues = units.map((unit) =>
      unit.tapuVerified || unit.isVerified ? "DEED_VERIFIED" : "DEED_PENDING",
    );
    const creditValues = units.map((unit) =>
      isCreditAvailable(unit) ? "CREDIT_AVAILABLE" : "CREDIT_UNAVAILABLE",
    );
    const swapValues = units.map((unit) =>
      readSwapState(unit) ? "SWAP_AVAILABLE" : "SWAP_UNAVAILABLE",
    );

    const roomOptions = unique(rooms).map((value) => ({
      value,
      label: value,
      count: rooms.filter((item) => item === value).length,
    }));
    const floorOptions = unique(floors).map((value) => ({
      value,
      label: value,
      count: floors.filter((item) => item === value).length,
    }));
    const advisorOptions = unique(advisors).map((value) => ({
      value,
      label: advisorLabel(value),
      count: advisors.filter((item) => item === value).length,
    }));

    return [
      {
        id: "location",
        title: "Adres",
        description: "Birden fazla il, ilçe ve mahalle seçebilirsiniz.",
        defaultOpen: true,
        fields: [
          {
            id: "portfolio-location",
            type: "location",
            label: "Konum",
            cityKey: "cities",
            districtKey: "districts",
            neighborhoodKey: "neighborhoods",
            multiple: true,
            showNeighborhood: true,
          },
        ],
      },
      {
        id: "portfolio",
        title: "Portföy Bilgileri",
        fields: [
          {
            id: "portfolio-types",
            type: "multi-select",
            label: "Portföy Türü",
            valueKey: "types",
            options: optionsFromRecord(
              TYPE_LABELS as Record<string, string>,
              types,
            ),
            searchable: true,
            searchPlaceholder: "Portföy türü ara...",
          },
          {
            id: "portfolio-statuses",
            type: "multi-select",
            label: "İlan Durumu",
            valueKey: "statuses",
            options: optionsFromRecord(
              STATUS_LABELS as Record<string, string>,
              statuses,
            ),
          },
          {
            id: "portfolio-rooms",
            type: "multi-select",
            label: "Oda Sayısı",
            valueKey: "rooms",
            options: roomOptions,
            searchable: true,
            searchPlaceholder: "Oda sayısı ara...",
          },
          {
            id: "portfolio-floors",
            type: "multi-select",
            label: "Kat Bilgisi",
            valueKey: "floors",
            options: floorOptions,
            searchable: true,
            searchPlaceholder: "Kat bilgisi ara...",
          },
        ],
      },
      {
        id: "price-area",
        title: "Fiyat ve Alan",
        fields: [
          {
            id: "portfolio-price-range",
            type: "range",
            label: "Fiyat Aralığı",
            minKey: "minPrice",
            maxKey: "maxPrice",
            minPlaceholder: "Minimum",
            maxPlaceholder: "Maksimum",
            inputMode: "numeric",
          },
          {
            id: "portfolio-currencies",
            type: "multi-select",
            label: "Para Birimi",
            valueKey: "currencies",
            options: addCounts(CURRENCY_OPTIONS, currencies),
          },
          {
            id: "portfolio-area-range",
            type: "range",
            label: "Metrekare Aralığı",
            minKey: "minArea",
            maxKey: "maxArea",
            minPlaceholder: "Minimum",
            maxPlaceholder: "Maksimum",
            inputMode: "numeric",
            suffix: "m²",
          },
        ],
      },
      {
        id: "verification",
        title: "Yetki ve Yayın Bilgileri",
        fields: [
          {
            id: "portfolio-verification",
            type: "multi-select",
            label: "Doğrulama",
            valueKey: "verification",
            options: addCounts(VERIFICATION_OPTIONS, verificationValues),
          },
          {
            id: "portfolio-pool",
            type: "multi-select",
            label: "Havuz Durumu",
            valueKey: "poolStates",
            options: addCounts(POOL_OPTIONS, poolValues),
          },
          {
            id: "portfolio-approval",
            type: "multi-select",
            label: "Onay Durumu",
            valueKey: "approvalStatuses",
            options: optionsFromRecord(APPROVAL_LABELS, approvals),
          },
          {
            id: "portfolio-location-state",
            type: "multi-select",
            label: "Harita Konumu",
            valueKey: "locationStates",
            options: addCounts(LOCATION_OPTIONS, locationValues),
          },
          {
            id: "portfolio-deed",
            type: "multi-select",
            label: "Tapu",
            valueKey: "deedStates",
            options: addCounts(DEED_OPTIONS, deedValues),
          },
          {
            id: "portfolio-credit",
            type: "multi-select",
            label: "Kredi",
            valueKey: "creditStates",
            options: addCounts(CREDIT_OPTIONS, creditValues),
          },
          {
            id: "portfolio-swap",
            type: "multi-select",
            label: "Takas",
            valueKey: "swapStates",
            options: addCounts(SWAP_OPTIONS, swapValues),
          },
          {
            id: "portfolio-advisors",
            type: "multi-select",
            label: "Danışman",
            valueKey: "advisors",
            options: advisorOptions,
            searchable: true,
            searchPlaceholder: "Danışman ara...",
          },
          {
            id: "portfolio-created-date",
            type: "multi-select",
            label: "Eklenme Tarihi",
            valueKey: "dateRanges",
            options: DATE_OPTIONS,
          },
          {
            id: "portfolio-sort",
            type: "single-select",
            label: "Sıralama",
            valueKey: "sort",
            options: SORT_OPTIONS,
            placeholder: "En Yeni Portföyler",
          },
        ],
      },
    ];
  }, [units]);

  return (
    <AdvancedFilterCenter
      open={open}
      title="Portföy Gelişmiş Filtre"
      subtitle="Portföyleri konum, tür, fiyat ve doğrulama bilgilerine göre süzün."
      sections={sections}
      value={filters}
      defaultValue={createEmptyPortfolioFilters()}
      resultCount={resultCount}
      clearLabel="Tümünü Temizle"
      theme={{
        accent: "#7C3AED",
        accentSoft: "#F3E8FF",
        accentText: "#6D28D9",
        panel: "#FAF7FF",
        surfaceSoft: "#EDE9FE",
        border: "#DDD6FE",
      }}
      onApply={(nextValue) => {
        onChange(nextValue as PortfolioFilterState);
        onClose();
      }}
      onClose={onClose}
    />
  );
}
