"use client";

import { useMemo } from "react";

import {
  AdvancedFilterCenter,
  countAdvancedFilters,
  createDistrictLocationKey,
  createNeighborhoodLocationKey,
  type AdvancedFilterOption,
  type AdvancedFilterSection,
  type AdvancedFilterState,
} from "@/components/advanced-filter";
import {
  FORUM_ALL_REQUEST_TYPE_OPTIONS,
  normalizeForumRequestTypeCode,
} from "@/schemas/forum/forum-request.schema";

export type ForumFilterUser = {
  id?: string | null;
  role?: string | null;
};

export type ForumFilterPost = {
  id: string;
  userId?: string | null;
  user?: ForumFilterUser | null;
  User?: ForumFilterUser | null;
  type?: string | null;
  title?: string | null;
  description?: string | null;
  city?: string | null;
  district?: string | null;
  neighborhood?: string | null;
  budget?: number | null;
  urgency?: string | null;
  visibility?: string | null;
  tags?: string[] | null;
  expiresAt?: string | null;
  createdAt?: string | null;
  viewCount?: number | null;
  followerCount?: number | null;
  requestCount?: number | null;
};

export type ForumSortMode =
  | "NEWEST"
  | "EXPIRING"
  | "BUDGET_ASC"
  | "BUDGET_DESC"
  | "POPULAR"
  | "URGENT";

export type ForumAdvancedFilterState = AdvancedFilterState & {
  categories: string[];
  intents: string[];
  cities: string[];
  districts: string[];
  neighborhoods: string[];
  currencies: string[];
  urgencies: string[];
  visibilities: string[];
  ownerRoles: string[];
  dateRanges: string[];
  expiryRanges: string[];
  minBudget: string;
  maxBudget: string;
  sort: ForumSortMode;
};

export type ForumAdvancedFilterProps<T extends ForumFilterPost> = {
  open: boolean;
  posts: T[];
  value: ForumAdvancedFilterState;
  onApply: (value: ForumAdvancedFilterState) => void;
  onClose: () => void;
};

const CATEGORY_OPTIONS: AdvancedFilterOption[] = [
  { value: "PORTFOY_ARIYORUM", label: "Portföy Arıyorum" },
  {
    value: "KAT_KARSILIGI_ARSA_ARIYORUM",
    label: "Kat Karşılığı Arsa Arıyorum",
  },
  {
    value: "BOLGESEL_SATIS_OFISI_ARIYORUM",
    label: "Bölgesel Satış Ofisi Arıyorum",
  },
  { value: "IS_ORTAGI_ARIYORUM", label: "İş Ortağı Arıyorum" },
  { value: "YATIRIMCI_ARIYORUM", label: "Yatırımcı Arıyorum" },
  { value: "SEKTOREL_IHTIYACLAR", label: "Sektörel İhtiyaçlar" },
  { value: "DUYURU", label: "Duyuru" },
  { value: "KAMPANYA_DUYURU", label: "Kampanya ve Duyuru" },
  { value: "DIGER", label: "Diğer" },
];

const CATEGORY_ALIASES: Record<string, string> = {
  "portföy arıyorum": "PORTFOY_ARIYORUM",
  "kat karşılığı arsa arıyorum": "KAT_KARSILIGI_ARSA_ARIYORUM",
  "bölgesel satış ofisi arıyorum": "BOLGESEL_SATIS_OFISI_ARIYORUM",
  "iş ortağı arıyorum": "IS_ORTAGI_ARIYORUM",
  "yatırımcı arıyorum": "YATIRIMCI_ARIYORUM",
  "sektörel ihtiyaçlar": "SEKTOREL_IHTIYACLAR",
  duyuru: "DUYURU",
  "kampanya & duyuru": "KAMPANYA_DUYURU",
  "kampanya ve duyuru": "KAMPANYA_DUYURU",
  diğer: "DIGER",
};

const INTENT_OPTIONS: AdvancedFilterOption[] =
  FORUM_ALL_REQUEST_TYPE_OPTIONS.map((option) => ({
    value: option.value,
    label: option.label,
  }));

const URGENCY_OPTIONS: AdvancedFilterOption[] = [
  { value: "Normal", label: "Normal" },
  { value: "Acil", label: "Acil" },
  { value: "Müşteri Hazır", label: "Müşteri Hazır" },
  { value: "Hazır Müşteri", label: "Hazır Müşteri" },
  { value: "Sıcak Talep", label: "Sıcak Talep" },
];

const VISIBILITY_OPTIONS: AdvancedFilterOption[] = [
  { value: "TUM_EPH", label: "Tüm EPH" },
  { value: "SADECE_EMLAKCILAR", label: "Sadece Emlakçılar" },
  {
    value: "SADECE_MUTEAHHITLER",
    label: "Müteahhitler ve İnşaat Firmaları",
  },
  { value: "SADECE_BAGLANTILARIM", label: "Sadece Bağlantılarım" },
];

const CURRENCY_OPTIONS: AdvancedFilterOption[] = [
  { value: "TRY", label: "Türk Lirası (₺)" },
  { value: "USD", label: "Dolar ($)" },
  { value: "EUR", label: "Euro (€)" },
  { value: "GBP", label: "Sterlin (£)" },
];

const OWNER_ROLE_OPTIONS: AdvancedFilterOption[] = [
  { value: "EMLAKCI", label: "Emlakçı" },
  { value: "MUTEAHHIT", label: "Müteahhit" },
  { value: "INSAAT_FIRMASI", label: "İnşaat Firması" },
  { value: "ADMIN", label: "Admin" },
  { value: "SUPER_ADMIN", label: "Yazılım Ekibi" },
];

const DATE_OPTIONS: AdvancedFilterOption[] = [
  { value: "TODAY", label: "Bugün Eklenenler" },
  { value: "LAST_7_DAYS", label: "Son 7 Gün" },
  { value: "LAST_30_DAYS", label: "Son 30 Gün" },
];

const EXPIRY_OPTIONS: AdvancedFilterOption[] = [
  { value: "WITHIN_3_DAYS", label: "3 Gün İçinde Bitecek" },
  { value: "WITHIN_7_DAYS", label: "7 Gün İçinde Bitecek" },
  { value: "OVER_7_DAYS", label: "7 Günden Fazla Süresi Var" },
];

const SORT_OPTIONS: AdvancedFilterOption[] = [
  { value: "NEWEST", label: "En Yeni Talepler" },
  { value: "EXPIRING", label: "Süresi En Yakın" },
  { value: "URGENT", label: "Acil ve Sıcak Talepler" },
  { value: "POPULAR", label: "En Çok İlgi Gören" },
  { value: "BUDGET_ASC", label: "Bütçe Düşükten Yükseğe" },
  { value: "BUDGET_DESC", label: "Bütçe Yüksekten Düşüğe" },
];

const DEFAULT_FORUM_FILTERS: ForumAdvancedFilterState = {
  categories: [],
  intents: [],
  cities: [],
  districts: [],
  neighborhoods: [],
  currencies: [],
  urgencies: [],
  visibilities: [],
  ownerRoles: [],
  dateRanges: [],
  expiryRanges: [],
  minBudget: "",
  maxBudget: "",
  sort: "NEWEST",
};

function normalize(value?: string | null) {
  return String(value || "")
    .trim()
    .toLocaleLowerCase("tr-TR");
}

function parseNumber(value: unknown) {
  const cleaned = String(value ?? "")
    .replace(/\./g, "")
    .replace(",", ".")
    .replace(/[^\d.-]/g, "");
  const numeric = Number(cleaned);

  return Number.isFinite(numeric) ? numeric : 0;
}

function getPostUser(post: ForumFilterPost) {
  return post.user || post.User || null;
}

function getPostTags(post: ForumFilterPost) {
  return Array.isArray(post.tags)
    ? post.tags.map((tag) => String(tag || "").trim()).filter(Boolean)
    : [];
}

function getTagValue(post: ForumFilterPost, prefix: string) {
  const normalizedPrefix = normalize(prefix);

  const tag = getPostTags(post).find((item) =>
    normalize(item).startsWith(normalizedPrefix),
  );

  if (!tag) return "";

  const separatorIndex = tag.indexOf(":");
  return separatorIndex >= 0 ? tag.slice(separatorIndex + 1).trim() : "";
}

function normalizeCategory(value?: string | null) {
  const raw = String(value || "").trim();
  const upper = raw.toUpperCase();

  if (CATEGORY_OPTIONS.some((option) => option.value === upper)) return upper;

  return CATEGORY_ALIASES[normalize(raw)] || upper;
}

function getPostIntent(post: ForumFilterPost) {
  const explicit = normalizeForumRequestTypeCode(
    getTagValue(post, "Talep Türü:"),
  );
  if (explicit) return explicit;

  const haystack = normalize(
    [post.title, post.description, ...getPostTags(post)].join(" "),
  );

  if (haystack.includes("kiralık")) return "PORTFOY_KIRALIK";
  if (haystack.includes("satılık")) return "PORTFOY_SATILIK";

  return "";
}

function getPostCurrency(post: ForumFilterPost) {
  return getTagValue(post, "Döviz:").toUpperCase() || "TRY";
}

function isInCreatedDateRange(
  value: string | null | undefined,
  range: string,
) {
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

function isInExpiryRange(
  value: string | null | undefined,
  range: string,
) {
  const expiresAt = new Date(String(value || "")).getTime();
  if (!Number.isFinite(expiresAt)) return false;

  const remaining = expiresAt - Date.now();
  const day = 24 * 60 * 60 * 1000;

  if (remaining <= 0) return false;
  if (range === "WITHIN_3_DAYS") return remaining <= 3 * day;
  if (range === "WITHIN_7_DAYS") return remaining <= 7 * day;
  if (range === "OVER_7_DAYS") return remaining > 7 * day;

  return false;
}

function urgencyWeight(value?: string | null) {
  const normalized = normalize(value);

  if (normalized.includes("acil")) return 4;
  if (normalized.includes("sıcak")) return 3;
  if (normalized.includes("hazır")) return 2;

  return 1;
}

function popularityScore(post: ForumFilterPost) {
  return (
    Number(post.viewCount || 0) +
    Number(post.followerCount || 0) * 3 +
    Number(post.requestCount || 0) * 5
  );
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

export function createEmptyForumAdvancedFilters(): ForumAdvancedFilterState {
  return {
    ...DEFAULT_FORUM_FILTERS,
    categories: [],
    intents: [],
    cities: [],
    districts: [],
    neighborhoods: [],
    currencies: [],
    urgencies: [],
    visibilities: [],
    ownerRoles: [],
    dateRanges: [],
    expiryRanges: [],
  };
}

export function countForumAdvancedFilters(
  filters: ForumAdvancedFilterState,
) {
  return countAdvancedFilters(filters, DEFAULT_FORUM_FILTERS);
}

export function applyForumAdvancedFilters<T extends ForumFilterPost>(
  posts: T[],
  filters: ForumAdvancedFilterState,
  keyword = "",
): T[] {
  const query = normalize(keyword);
  const minBudget = parseNumber(filters.minBudget);
  const maxBudget = parseNumber(filters.maxBudget);

  const filtered = posts.filter((post) => {
    const category = normalizeCategory(post.type);
    const intent = getPostIntent(post);
    const city = String(post.city || "").trim();
    const district = String(post.district || "").trim();
    const neighborhood = String(post.neighborhood || "").trim();
    const districtKey = createDistrictLocationKey(city, district);
    const neighborhoodKey = createNeighborhoodLocationKey(
      city,
      district,
      neighborhood,
    );
    const currency = getPostCurrency(post);
    const urgency = String(post.urgency || "Normal").trim();
    const visibility = String(post.visibility || "TUM_EPH").trim();
    const ownerRole = String(getPostUser(post)?.role || "").trim();
    const budget = Number(post.budget || 0);

    if (
      filters.categories.length > 0 &&
      !filters.categories.includes(category)
    ) {
      return false;
    }

    if (filters.intents.length > 0 && !filters.intents.includes(intent)) {
      return false;
    }

    if (filters.cities.length > 0 && !filters.cities.includes(city)) {
      return false;
    }

    if (
      filters.districts.length > 0 &&
      !filters.districts.includes(districtKey) &&
      !filters.districts.includes(district)
    ) {
      return false;
    }

    if (
      filters.neighborhoods.length > 0 &&
      !filters.neighborhoods.includes(neighborhoodKey) &&
      !filters.neighborhoods.includes(neighborhood)
    ) {
      return false;
    }

    if (
      filters.currencies.length > 0 &&
      !filters.currencies.includes(currency)
    ) {
      return false;
    }

    if (
      filters.urgencies.length > 0 &&
      !filters.urgencies.includes(urgency)
    ) {
      return false;
    }

    if (
      filters.visibilities.length > 0 &&
      !filters.visibilities.includes(visibility)
    ) {
      return false;
    }

    if (
      filters.ownerRoles.length > 0 &&
      !filters.ownerRoles.includes(ownerRole)
    ) {
      return false;
    }

    if (minBudget && budget < minBudget) return false;
    if (maxBudget && budget > maxBudget) return false;

    if (
      filters.dateRanges.length > 0 &&
      !filters.dateRanges.some((range) =>
        isInCreatedDateRange(post.createdAt, range),
      )
    ) {
      return false;
    }

    if (
      filters.expiryRanges.length > 0 &&
      !filters.expiryRanges.some((range) =>
        isInExpiryRange(post.expiresAt, range),
      )
    ) {
      return false;
    }

    if (query) {
      const haystack = normalize(
        [
          post.title,
          post.description,
          post.type,
          city,
          district,
          neighborhood,
          intent,
          urgency,
          visibility,
          ownerRole,
          ...getPostTags(post),
        ]
          .filter(Boolean)
          .join(" "),
      );

      if (!haystack.includes(query)) return false;
    }

    return true;
  });

  return [...filtered].sort((a, b) => {
    if (filters.sort === "EXPIRING") {
      return (
        new Date(String(a.expiresAt || "")).getTime() -
        new Date(String(b.expiresAt || "")).getTime()
      );
    }

    if (filters.sort === "BUDGET_ASC") {
      return Number(a.budget || 0) - Number(b.budget || 0);
    }

    if (filters.sort === "BUDGET_DESC") {
      return Number(b.budget || 0) - Number(a.budget || 0);
    }

    if (filters.sort === "POPULAR") {
      return popularityScore(b) - popularityScore(a);
    }

    if (filters.sort === "URGENT") {
      const urgencyDifference =
        urgencyWeight(b.urgency) - urgencyWeight(a.urgency);

      if (urgencyDifference !== 0) return urgencyDifference;
    }

    return String(b.createdAt || "").localeCompare(
      String(a.createdAt || ""),
    );
  });
}

export default function ForumAdvancedFilter<
  T extends ForumFilterPost,
>({
  open,
  posts,
  value,
  onApply,
  onClose,
}: ForumAdvancedFilterProps<T>) {
  const sections = useMemo<AdvancedFilterSection[]>(() => {
    const categories = posts.map((post) => normalizeCategory(post.type));
    const intents = posts.map(getPostIntent);
    const urgencies = posts.map((post) =>
      String(post.urgency || "Normal").trim(),
    );
    const visibilities = posts.map((post) =>
      String(post.visibility || "TUM_EPH").trim(),
    );
    const currencies = posts.map(getPostCurrency);
    const ownerRoles = posts.map((post) =>
      String(getPostUser(post)?.role || "").trim(),
    );

    return [
      {
        id: "location",
        title: "Adres",
        description: "Birden fazla il, ilçe ve mahalle seçebilirsiniz.",
        defaultOpen: true,
        fields: [
          {
            id: "forum-location",
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
        id: "request",
        title: "Talep Bilgileri",
        fields: [
          {
            id: "forum-categories",
            type: "multi-select",
            label: "Kategori",
            valueKey: "categories",
            options: addCounts(CATEGORY_OPTIONS, categories),
            searchable: true,
            searchPlaceholder: "Kategori ara...",
          },
          {
            id: "forum-intents",
            type: "multi-select",
            label: "Talep Türü",
            valueKey: "intents",
            options: addCounts(INTENT_OPTIONS, intents),
          },
          {
            id: "forum-urgencies",
            type: "multi-select",
            label: "Aciliyet",
            valueKey: "urgencies",
            options: addCounts(URGENCY_OPTIONS, urgencies),
          },
          {
            id: "forum-visibilities",
            type: "multi-select",
            label: "Görünürlük",
            valueKey: "visibilities",
            options: addCounts(VISIBILITY_OPTIONS, visibilities),
          },
        ],
      },
      {
        id: "budget",
        title: "Bütçe",
        fields: [
          {
            id: "forum-budget-range",
            type: "range",
            label: "Bütçe Aralığı",
            minKey: "minBudget",
            maxKey: "maxBudget",
            minPlaceholder: "Minimum",
            maxPlaceholder: "Maksimum",
            inputMode: "numeric",
          },
          {
            id: "forum-currencies",
            type: "multi-select",
            label: "Para Birimi",
            valueKey: "currencies",
            options: addCounts(CURRENCY_OPTIONS, currencies),
          },
        ],
      },
      {
        id: "publisher",
        title: "Yayın Bilgileri",
        fields: [
          {
            id: "forum-owner-roles",
            type: "multi-select",
            label: "Paylaşan Rolü",
            valueKey: "ownerRoles",
            options: addCounts(OWNER_ROLE_OPTIONS, ownerRoles),
          },
          {
            id: "forum-created-date",
            type: "multi-select",
            label: "Yayın Tarihi",
            valueKey: "dateRanges",
            options: DATE_OPTIONS,
          },
          {
            id: "forum-expiry",
            type: "multi-select",
            label: "Kalan Süre",
            valueKey: "expiryRanges",
            options: EXPIRY_OPTIONS,
          },
          {
            id: "forum-sort",
            type: "single-select",
            label: "Sıralama",
            valueKey: "sort",
            options: SORT_OPTIONS,
            placeholder: "En Yeni Talepler",
          },
        ],
      },
    ];
  }, [posts]);

  const resultCount = useMemo(
    () => applyForumAdvancedFilters(posts, value).length,
    [posts, value],
  );

  return (
    <AdvancedFilterCenter
      open={open}
      title="Talep Merkezi Gelişmiş Filtre"
      subtitle="Talepleri konum, bütçe, aciliyet ve yayın bilgilerine göre süzün."
      sections={sections}
      value={value}
      defaultValue={DEFAULT_FORUM_FILTERS}
      resultCount={resultCount}
      theme={{
        accent: "#EA580C",
        accentSoft: "#FFF1E8",
        accentText: "#C2410C",
        panel: "#FFF7ED",
        surfaceSoft: "#FFEDD5",
        border: "#FED7AA",
      }}
      onApply={(nextValue) =>
        onApply(nextValue as ForumAdvancedFilterState)
      }
      onClose={onClose}
    />
  );
}
