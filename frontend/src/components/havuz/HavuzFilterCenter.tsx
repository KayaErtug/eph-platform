"use client";

import { useMemo, useState } from "react";
import {
  Check,
  ChevronDown,
  MapPin,
  RotateCcw,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";

import {
  STATUS_LABELS,
  TYPE_LABELS,
} from "@/components/stok/stokConstants";

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
  minPrice: string;
  maxPrice: string;
  minArea: string;
  maxArea: string;
  sort: HavuzSortMode;
};

export type HavuzPoolItemLike = {
  unit: {
    id: string;
    type?: string | null;
    status?: string | null;
    roomCount?: string | null;
    area?: number | null;
    price?: number | null;
    priceCurrency?: string | null;
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
};

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

const SORT_OPTIONS: Array<{ value: HavuzSortMode; label: string }> = [
  { value: "MATCH_DESC", label: "CRM eşleşmesi yüksekten düşüğe" },
  { value: "NEWEST", label: "En yeni portföyler" },
  { value: "PRICE_ASC", label: "Fiyat düşükten yükseğe" },
  { value: "PRICE_DESC", label: "Fiyat yüksekten düşüğe" },
  { value: "AREA_DESC", label: "Metrekare büyükten küçüğe" },
];

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
    minPrice: "",
    maxPrice: "",
    minArea: "",
    maxArea: "",
    sort: "MATCH_DESC",
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

function roleLabel(value: string) {
  const labels: Record<string, string> = {
    EMLAKCI: "Emlakçı",
    MUTEAHHIT: "Müteahhit",
    INSAAT_FIRMASI: "İnşaat Firması",
    OFIS_SAHIBI: "Ofis Sahibi",
    TAKIM_LIDERI: "Takım Lideri",
    SUPER_ADMIN: "Yazılım Ekibi",
  };

  return labels[value] || value.replaceAll("_", " ");
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

export function applyHavuzFilters<T extends HavuzPoolItemLike>(
  items: T[],
  filters: HavuzFilterState,
  keyword = "",
): T[] {
  const query = normalize(keyword);
  const minPrice = parseNumber(filters.minPrice);
  const maxPrice = parseNumber(filters.maxPrice);
  const minArea = parseNumber(filters.minArea);
  const maxArea = parseNumber(filters.maxArea);

  const filtered = items.filter(({ unit, match }) => {
    const type = String(unit.type || "");
    const status = String(unit.status || "");
    const city = String(unit.project?.city || "");
    const district = String(unit.project?.district || "");
    const neighborhood = String(unit.project?.address || "");
    const room = String(unit.roomCount || "");
    const currency = String(unit.priceCurrency || "TRY");
    const ownerRole = String(unit.project?.owner?.role || "");
    const price = Number(unit.price || 0);
    const area = Number(unit.area || 0);

    if (filters.types.length > 0 && !filters.types.includes(type)) return false;
    if (filters.statuses.length > 0 && !filters.statuses.includes(status))
      return false;
    if (filters.cities.length > 0 && !filters.cities.includes(city)) return false;
    if (
      filters.districts.length > 0 &&
      !filters.districts.includes(district)
    )
      return false;
    if (
      filters.neighborhoods.length > 0 &&
      !filters.neighborhoods.includes(neighborhood)
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

    if (minPrice && price < minPrice) return false;
    if (maxPrice && price > maxPrice) return false;
    if (minArea && area < minArea) return false;
    if (maxArea && area > maxArea) return false;

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
            unit.isVerified ||
              (unit.tapuVerified && unit.yetkiVerified),
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
          unit.priceCurrency,
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
  ].reduce((total, list) => total + list.length, 0);

  const rangeCount = [
    filters.minPrice,
    filters.maxPrice,
    filters.minArea,
    filters.maxArea,
  ].filter(Boolean).length;

  return (
    arrayCount +
    rangeCount +
    (filters.sort !== "MATCH_DESC" ? 1 : 0)
  );
}

export function getHavuzFilterChips(filters: HavuzFilterState) {
  const chips: string[] = [];

  filters.types.forEach((value) => chips.push(typeLabel(value)));
  filters.statuses.forEach((value) => chips.push(statusLabel(value)));
  filters.cities.forEach((value) => chips.push(value));
  filters.districts.forEach((value) => chips.push(value));
  filters.neighborhoods.forEach((value) => chips.push(value));
  filters.rooms.forEach((value) => chips.push(value));
  filters.currencies.forEach((value) => chips.push(value));
  filters.ownerRoles.forEach((value) => chips.push(roleLabel(value)));
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

  if (filters.minPrice) chips.push(`Min. ${filters.minPrice} ₺`);
  if (filters.maxPrice) chips.push(`Maks. ${filters.maxPrice} ₺`);
  if (filters.minArea) chips.push(`Min. ${filters.minArea} m²`);
  if (filters.maxArea) chips.push(`Maks. ${filters.maxArea} m²`);

  return chips;
}

function formatNumericInput(value: string) {
  const digits = String(value || "").replace(/\D/g, "");
  return digits ? Number(digits).toLocaleString("tr-TR") : "";
}

function MultiSelectSection({
  title,
  options,
  selected,
  onChange,
  open = false,
  searchable = true,
}: {
  title: string;
  options: Option[];
  selected: string[];
  onChange: (next: string[]) => void;
  open?: boolean;
  searchable?: boolean;
}) {
  const [query, setQuery] = useState("");

  const visibleOptions = useMemo(() => {
    const normalizedQuery = normalize(query);

    if (!normalizedQuery) return options;

    return options.filter((option) =>
      normalize(option.label).includes(normalizedQuery),
    );
  }, [options, query]);

  const toggle = (value: string) => {
    onChange(
      selected.includes(value)
        ? selected.filter((item) => item !== value)
        : [...selected, value],
    );
  };

  return (
    <details
      open={open}
      className="group overflow-hidden rounded-[20px] border-2 border-[#C7D6E8] bg-white"
    >
      <summary className="flex min-h-[52px] cursor-pointer list-none items-center justify-between gap-2 bg-[#F8FAFC] px-3 py-2">
        <div className="min-w-0">
          <p className="text-[13px] font-black text-[#1F2937]">{title}</p>
          <p className="mt-0.5 text-[10px] font-bold text-[#64748B]">
            {selected.length > 0
              ? `${selected.length} seçim aktif`
              : "Çoklu seçim yapılabilir"}
          </p>
        </div>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[12px] border border-[#C7D6E8] bg-white text-[#2563EB]">
          <ChevronDown
            size={16}
            className="transition-transform group-open:rotate-180"
          />
        </div>
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

        <div className="mb-2 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onChange(options.map((option) => option.value))}
            className="min-h-[36px] rounded-[13px] border-2 border-[#C7D6E8] bg-white px-2 text-[10px] font-black text-[#2563EB]"
          >
            Tümünü Seç
          </button>
          <button
            type="button"
            onClick={() => onChange([])}
            className="min-h-[36px] rounded-[13px] border-2 border-[#C7D6E8] bg-white px-2 text-[10px] font-black text-[#64748B]"
          >
            Seçimi Temizle
          </button>
        </div>

        <div className="grid max-h-[250px] grid-cols-2 gap-2 overflow-y-auto pr-0.5">
          {visibleOptions.map((option) => {
            const checked = selected.includes(option.value);

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => toggle(option.value)}
                className={`flex min-h-[42px] min-w-0 items-center gap-2 rounded-[14px] border-2 px-2 text-left text-[10.5px] font-black leading-4 ${
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
              </button>
            );
          })}
        </div>

        {visibleOptions.length === 0 && (
          <p className="py-4 text-center text-[11px] font-bold text-[#64748B]">
            Eşleşen seçenek bulunamadı.
          </p>
        )}
      </div>
    </details>
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
  const typeOptions = useMemo<Option[]>(
    () =>
      unique(items.map((item) => item.unit.type)).map((value) => ({
        value,
        label: typeLabel(value),
      })),
    [items],
  );

  const statusOptions = useMemo<Option[]>(
    () =>
      unique(items.map((item) => item.unit.status)).map((value) => ({
        value,
        label: statusLabel(value),
      })),
    [items],
  );

  const cityOptions = useMemo<Option[]>(
    () =>
      unique(items.map((item) => item.unit.project?.city)).map((value) => ({
        value,
        label: value,
      })),
    [items],
  );

  const districtOptions = useMemo<Option[]>(() => {
    const list = items.filter(
      (item) =>
        filters.cities.length === 0 ||
        filters.cities.includes(String(item.unit.project?.city || "")),
    );

    return unique(list.map((item) => item.unit.project?.district)).map(
      (value) => ({
        value,
        label: value,
      }),
    );
  }, [filters.cities, items]);

  const neighborhoodOptions = useMemo<Option[]>(() => {
    const list = items.filter((item) => {
      const city = String(item.unit.project?.city || "");
      const district = String(item.unit.project?.district || "");

      if (filters.cities.length > 0 && !filters.cities.includes(city))
        return false;
      if (
        filters.districts.length > 0 &&
        !filters.districts.includes(district)
      )
        return false;

      return true;
    });

    return unique(list.map((item) => item.unit.project?.address)).map(
      (value) => ({
        value,
        label: value,
      }),
    );
  }, [filters.cities, filters.districts, items]);

  const roomOptions = useMemo<Option[]>(
    () =>
      unique(items.map((item) => item.unit.roomCount)).map((value) => ({
        value,
        label: value,
      })),
    [items],
  );

  const availableCurrencies = useMemo(() => {
    const values = new Set(
      unique(items.map((item) => item.unit.priceCurrency || "TRY")),
    );

    return CURRENCY_OPTIONS.filter((option) => values.has(option.value));
  }, [items]);

  const ownerRoleOptions = useMemo<Option[]>(
    () =>
      unique(items.map((item) => item.unit.project?.owner?.role)).map(
        (value) => ({
          value,
          label: roleLabel(value),
        }),
      ),
    [items],
  );

  if (!open) return null;

  const set = <K extends keyof HavuzFilterState>(
    key: K,
    value: HavuzFilterState[K],
  ) => {
    onChange({ ...filters, [key]: value });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/60 sm:items-center sm:p-4">
      <section className="flex h-[100dvh] w-full max-w-[460px] flex-col overflow-hidden bg-[#F4F8FF] shadow-[0_24px_70px_rgba(15,23,42,0.36)] sm:h-[min(94dvh,860px)] sm:rounded-[30px] sm:border-2 sm:border-[#C7D6E8]">
        <header className="shrink-0 border-b-2 border-[#C7D6E8] bg-white px-3 pb-3 pt-[max(12px,env(safe-area-inset-top))]">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#2563EB]">
                Havuz Arama Merkezi
              </p>
              <h2 className="mt-1 text-[21px] font-black tracking-[-0.04em] text-[#1F2937]">
                Gelişmiş Filtreler
              </h2>
              <p className="mt-1 text-[11px] font-bold leading-4 text-[#64748B]">
                Aynı grupta VEYA, farklı gruplar arasında VE uygulanır.
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
        </header>

        <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-3 py-3">
          <MultiSelectSection
            title="Portföy Türü"
            options={typeOptions}
            selected={filters.types}
            onChange={(value) => set("types", value)}
            open
          />

          <MultiSelectSection
            title="İşlem Türü"
            options={statusOptions}
            selected={filters.statuses}
            onChange={(value) => set("statuses", value)}
            open
          />

          <MultiSelectSection
            title="İl"
            options={cityOptions}
            selected={filters.cities}
            onChange={(value) => {
              const allowedDistricts = new Set(
                items
                  .filter(
                    (item) =>
                      value.length === 0 ||
                      value.includes(String(item.unit.project?.city || "")),
                  )
                  .map((item) => String(item.unit.project?.district || "")),
              );

              onChange({
                ...filters,
                cities: value,
                districts: filters.districts.filter((item) =>
                  allowedDistricts.has(item),
                ),
                neighborhoods: [],
              });
            }}
            open
          />

          <MultiSelectSection
            title="İlçe"
            options={districtOptions}
            selected={filters.districts}
            onChange={(value) =>
              onChange({
                ...filters,
                districts: value,
                neighborhoods: [],
              })
            }
            open
          />

          <MultiSelectSection
            title="Mahalle / Köy / Mevki"
            options={neighborhoodOptions}
            selected={filters.neighborhoods}
            onChange={(value) => set("neighborhoods", value)}
            open
          />

          <MultiSelectSection
            title="Oda Sayısı"
            options={roomOptions}
            selected={filters.rooms}
            onChange={(value) => set("rooms", value)}
          />

          <MultiSelectSection
            title="Para Birimi"
            options={availableCurrencies}
            selected={filters.currencies}
            onChange={(value) => set("currencies", value)}
            searchable={false}
          />

          <MultiSelectSection
            title="Portföy Sahibi Rolü"
            options={ownerRoleOptions}
            selected={filters.ownerRoles}
            onChange={(value) => set("ownerRoles", value)}
          />

          <MultiSelectSection
            title="Doğrulama ve Konum"
            options={VERIFICATION_OPTIONS}
            selected={filters.verification}
            onChange={(value) => set("verification", value)}
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
            <summary className="flex min-h-[52px] cursor-pointer list-none items-center justify-between gap-2 bg-[#F8FAFC] px-3 py-2">
              <div>
                <p className="text-[13px] font-black text-[#1F2937]">
                  Fiyat ve Metrekare
                </p>
                <p className="mt-0.5 text-[10px] font-bold text-[#64748B]">
                  Alt ve üst sınırlar birlikte kullanılabilir
                </p>
              </div>
              <ChevronDown
                size={16}
                className="text-[#2563EB] transition-transform group-open:rotate-180"
              />
            </summary>

            <div className="grid grid-cols-2 gap-2 border-t-2 border-[#E2EAF5] p-2.5">
              <label className="min-w-0">
                <span className="mb-1 block text-[9px] font-black uppercase text-[#64748B]">
                  Min. Fiyat
                </span>
                <input
                  inputMode="numeric"
                  value={filters.minPrice}
                  onChange={(event) =>
                    set("minPrice", formatNumericInput(event.target.value))
                  }
                  placeholder="0"
                  className="h-11 w-full rounded-[14px] border-2 border-[#C7D6E8] bg-white px-2 text-[11px] font-black outline-none focus:border-[#2563EB]"
                />
              </label>

              <label className="min-w-0">
                <span className="mb-1 block text-[9px] font-black uppercase text-[#64748B]">
                  Maks. Fiyat
                </span>
                <input
                  inputMode="numeric"
                  value={filters.maxPrice}
                  onChange={(event) =>
                    set("maxPrice", formatNumericInput(event.target.value))
                  }
                  placeholder="Sınırsız"
                  className="h-11 w-full rounded-[14px] border-2 border-[#C7D6E8] bg-white px-2 text-[11px] font-black outline-none focus:border-[#2563EB]"
                />
              </label>

              <label className="min-w-0">
                <span className="mb-1 block text-[9px] font-black uppercase text-[#64748B]">
                  Min. m²
                </span>
                <input
                  inputMode="numeric"
                  value={filters.minArea}
                  onChange={(event) =>
                    set("minArea", formatNumericInput(event.target.value))
                  }
                  placeholder="0"
                  className="h-11 w-full rounded-[14px] border-2 border-[#C7D6E8] bg-white px-2 text-[11px] font-black outline-none focus:border-[#2563EB]"
                />
              </label>

              <label className="min-w-0">
                <span className="mb-1 block text-[9px] font-black uppercase text-[#64748B]">
                  Maks. m²
                </span>
                <input
                  inputMode="numeric"
                  value={filters.maxArea}
                  onChange={(event) =>
                    set("maxArea", formatNumericInput(event.target.value))
                  }
                  placeholder="Sınırsız"
                  className="h-11 w-full rounded-[14px] border-2 border-[#C7D6E8] bg-white px-2 text-[11px] font-black outline-none focus:border-[#2563EB]"
                />
              </label>
            </div>
          </details>

          <details
            open
            className="group overflow-hidden rounded-[20px] border-2 border-[#C7D6E8] bg-white"
          >
            <summary className="flex min-h-[52px] cursor-pointer list-none items-center justify-between gap-2 bg-[#F8FAFC] px-3 py-2">
              <div>
                <p className="text-[13px] font-black text-[#1F2937]">
                  Sıralama
                </p>
                <p className="mt-0.5 text-[10px] font-bold text-[#64748B]">
                  Sonuçların gösterim önceliği
                </p>
              </div>
              <ChevronDown
                size={16}
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