"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Bookmark,
  CheckCircle2,
  ChevronDown,
  Edit3,
  Loader2,
  MapPin,
  Plus,
  Search,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  TriangleAlert,
  X,
} from "lucide-react";

import ForumAdvancedFilter, {
  applyForumAdvancedFilters,
  countForumAdvancedFilters,
  createEmptyForumAdvancedFilters,
  type ForumAdvancedFilterState,
} from "@/components/forum/ForumAdvancedFilter";
import {
  SchemaFormEngine,
  type EPHSchemaDefinition,
  type EPHSchemaState,
} from "@/components/schema-engine";
import {
  deriveLegacyLocationFields,
  normalizeLocationAreas as normalizeEPHLocationAreas,
} from "@/components/create-system";
import {
  FORUM_REQUEST_CATEGORY_OPTIONS,
  FORUM_REQUEST_VISIBILITY_OPTIONS,
  getForumRequestCategoryVisual,
  getForumRequestIntentVisual,
  getForumRequestTypeLabel,
  getForumRequestTypeOptions,
  normalizeForumRequestTypeCode,
  forumRequestSchema,
} from "@/schemas/forum/forum-request.schema";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";

type NetworkUser = {
  id?: string;
  firstName?: string | null;
  lastName?: string | null;
  role?: string | null;
  email?: string | null;
};

type NetworkPost = {
  id: string;
  userId?: string | null;
  user?: NetworkUser | null;
  User?: NetworkUser | null;
  urgency?: string | null;
  type?: string | null;
  title: string;
  description?: string | null;
  city?: string | null;
  district?: string | null;
  neighborhood?: string | null;
  budget?: number | null;
  minArea?: number | null;
  maxArea?: number | null;
  minRoom?: number | null;
  maxRoom?: number | null;
  minBudget?: number | null;
  maxBudget?: number | null;
  propertyTypes?: string[] | null;
  roomCounts?: string[] | null;
  features?: string[] | null;
  priceCurrency?: string | null;
  areas?: Array<{
    city?: string | null;
    district?: string | null;
    neighborhood?: string | null;
  }> | null;
  visibility?: string | null;
  tags?: string[] | null;
  expiresAt?: string | null;
  createdAt?: string | null;
  viewCount?: number | null;
  followerCount?: number | null;
  requestCount?: number | null;
};

type ForumCategory =
  | "PORTFOY_ARIYORUM"
  | "KAT_KARSILIGI_ARSA_ARIYORUM"
  | "BOLGESEL_SATIS_OFISI_ARIYORUM"
  | "IS_ORTAGI_ARIYORUM"
  | "YATIRIMCI_ARIYORUM"
  | "SEKTOREL_IHTIYACLAR"
  | "DUYURU"
  | "KAMPANYA_DUYURU"
  | "DIGER";

type ForumCategoryOption = {
  value: ForumCategory;
  label: string;
  hint: string;
};

type ForumAreaEntry = {
  city: string;
  district: string;
  neighborhood: string;
};

function normalizeForumAreas(
  value: unknown,
): ForumAreaEntry[] {
  return normalizeEPHLocationAreas(value).map(
    (area) => ({
      city: area.city,
      district: area.district,
      neighborhood: area.neighborhood,
    }),
  );
}

function formatForumArea(
  area: ForumAreaEntry,
) {
  return [
    area.city,
    area.district,
    area.neighborhood,
  ]
    .filter(Boolean)
    .join(" / ");
}

function getPostAreaLabels(
  post: Pick<
    NetworkPost,
    | "areas"
    | "city"
    | "district"
    | "neighborhood"
  >,
) {
  const normalizedAreas =
    normalizeForumAreas(post.areas);

  const areaLabels = normalizedAreas
    .map(formatForumArea)
    .filter(Boolean);

  if (areaLabels.length > 0) {
    return Array.from(
      new Set(areaLabels),
    );
  }

  const legacyLocation = [
    post.city,
    post.district,
    post.neighborhood,
  ]
    .filter(Boolean)
    .join(" / ");

  return legacyLocation
    ? [legacyLocation]
    : [];
}

function getPostAreaCompactLabel(
  post: Pick<
    NetworkPost,
    | "areas"
    | "city"
    | "district"
    | "neighborhood"
  >,
) {
  const areas = getPostAreaLabels(post);

  if (areas.length === 0) {
    return "Konum belirtilmedi";
  }

  if (areas.length === 1) {
    return areas[0];
  }

  return `${areas[0]} +${
    areas.length - 1
  } bölge`;
}

type TopicForm = {
  title: string;
  category: ForumCategory | "";
  requestIntent: string;
  propertyType: string;
  areas: ForumAreaEntry[];
  city: string;
  district: string;
  neighborhood: string;
  budget: string;
  minArea: string;
  maxArea: string;
  minRoom: string;
  maxRoom: string;
  minBudget: string;
  maxBudget: string;
  currency: string;
  detail: string;
  urgency: string;
  validFor: string;
  visibility: string;
};

type PropertyValidationWarningIssue = {
  code: string;
  field?: string;
  message?: string;
  metadata?: {
    linaExplanation?: string;
    [key: string]: unknown;
  };
};

type PropertyValidationConfirmation = {
  form: TopicForm;
  linaTitle: string;
  confirmationText: string;
  requiredWarningCodes: string[];
  warnings: PropertyValidationWarningIssue[];
};

type PersonalTabKey = "ALL" | "MINE" | "SAVED" | "INTERESTED";

const CATEGORY_IMAGES: Record<string, string> = {
  "Tüm Talepler": "/talep-merkezi/tum-talepler.jpg",
  "Portföy Arıyorum": "/talep-merkezi/portfoy-ariyorum.jpg",
  "Kat Karşılığı Arsa Arıyorum": "/talep-merkezi/kat-karsiligi-arsa.jpg",
  "Bölgesel Satış Ofisi Arıyorum": "/talep-merkezi/bolgesel-satis-ofisi.jpg",
  "İş Ortağı Arıyorum": "/talep-merkezi/is-ortagi.jpg",
  "Yatırımcı Arıyorum": "/talep-merkezi/yatirimci.jpg",
  "Sektörel İhtiyaçlar": "/talep-merkezi/sektorel-ihtiyaclar.jpg",
  Duyuru: "/talep-merkezi/duyuru.jpg",
  Diğer: "/talep-merkezi/diger.jpg",
};

const REQUEST_TABS = [
  {
    key: "Tüm Talepler",
    label: "Tümü",
    countTone: "bg-orange-100 text-blue-700",
  },
  {
    key: "Portföy Arıyorum",
    label: "Portföy Arıyorum",
    countTone: "bg-emerald-100 text-emerald-700",
  },
  {
    key: "Kat Karşılığı Arsa Arıyorum",
    label: "Kat Karşılığı Arsa Arıyorum",
    countTone: "bg-orange-100 text-orange-700",
  },
  {
    key: "Bölgesel Satış Ofisi Arıyorum",
    label: "Bölgesel Satış Ofisi Arıyorum",
    countTone: "bg-violet-100 text-violet-700",
  },
  {
    key: "İş Ortağı Arıyorum",
    label: "İş Ortağı Arıyorum",
    countTone: "bg-orange-100 text-blue-700",
  },
  {
    key: "Yatırımcı Arıyorum",
    label: "Yatırımcı Arıyorum",
    countTone: "bg-amber-100 text-amber-700",
  },
  {
    key: "Sektörel İhtiyaçlar",
    label: "Sektörel İhtiyaçlar",
    countTone: "bg-purple-100 text-purple-700",
  },
  { key: "Duyuru", label: "Duyuru", countTone: "bg-red-100 text-red-700" },
  { key: "Diğer", label: "Diğer", countTone: "bg-slate-100 text-slate-700" },
] as const;

const PERSONAL_TABS: {
  key: PersonalTabKey;
  label: string;
  icon: string;
}[] = [
  { key: "ALL", label: "Tüm Talepler", icon: "🌐" },
  { key: "MINE", label: "Taleplerim", icon: "📌" },
  { key: "SAVED", label: "Kaydettiklerim", icon: "⭐" },
  { key: "INTERESTED", label: "İlgilendiklerim", icon: "🤝" },
];

const ALL_CATEGORY_OPTIONS: ForumCategoryOption[] = [
  {
    value: "PORTFOY_ARIYORUM",
    label: "Portföy Arıyorum",
    hint: "Hazır müşteriniz veya talebiniz için uygun portföy arayın.",
  },
  {
    value: "KAT_KARSILIGI_ARSA_ARIYORUM",
    label: "Kat Karşılığı Arsa Arıyorum",
    hint: "Arsa, müteahhit veya kat karşılığı geliştirme talebi açın.",
  },
  {
    value: "BOLGESEL_SATIS_OFISI_ARIYORUM",
    label: "Bölgesel Satış Ofisi Arıyorum",
    hint: "Proje ya da portföy satışı için bölgesel satış ofisi arayın.",
  },
  {
    value: "IS_ORTAGI_ARIYORUM",
    label: "İş Ortağı Arıyorum",
    hint: "Satış partneri, yüklenici veya çözüm ortağı arayın.",
  },
  {
    value: "YATIRIMCI_ARIYORUM",
    label: "Yatırımcı Arıyorum",
    hint: "Finansman, yatırım veya proje ortağı arayın.",
  },
  {
    value: "SEKTOREL_IHTIYACLAR",
    label: "Sektörel İhtiyaçlar",
    hint: "Tapu, ekspertiz, fotoğraf, drone ve benzeri ihtiyaçları paylaşın.",
  },
  {
    value: "DUYURU",
    label: "Duyuru",
    hint: "Sektörel veya platform odaklı kısa duyuru paylaşın.",
  },
  {
    value: "KAMPANYA_DUYURU",
    label: "Kampanya & Duyuru",
    hint: "Kampanya, lansman veya dönemsel bilgilendirme paylaşın.",
  },
  {
    value: "DIGER",
    label: "Diğer",
    hint: "Listede olmayan profesyonel ihtiyacınızı paylaşın.",
  },
];

const ROLE_CATEGORY_MAP: Record<string, ForumCategory[]> = {
  EMLAKCI: [
    "PORTFOY_ARIYORUM",
    "KAT_KARSILIGI_ARSA_ARIYORUM",
    "SEKTOREL_IHTIYACLAR",
    "KAMPANYA_DUYURU",
  ],
  MUTEAHHIT: [
    "BOLGESEL_SATIS_OFISI_ARIYORUM",
    "KAT_KARSILIGI_ARSA_ARIYORUM",
    "KAMPANYA_DUYURU",
    "SEKTOREL_IHTIYACLAR",
    "DIGER",
  ],
  INSAAT_FIRMASI: [
    "BOLGESEL_SATIS_OFISI_ARIYORUM",
    "KAT_KARSILIGI_ARSA_ARIYORUM",
    "IS_ORTAGI_ARIYORUM",
    "YATIRIMCI_ARIYORUM",
    "KAMPANYA_DUYURU",
    "SEKTOREL_IHTIYACLAR",
    "DIGER",
  ],
  ADMIN: [
    "PORTFOY_ARIYORUM",
    "KAT_KARSILIGI_ARSA_ARIYORUM",
    "BOLGESEL_SATIS_OFISI_ARIYORUM",
    "IS_ORTAGI_ARIYORUM",
    "YATIRIMCI_ARIYORUM",
    "SEKTOREL_IHTIYACLAR",
    "DUYURU",
    "KAMPANYA_DUYURU",
    "DIGER",
  ],
  SUPER_ADMIN: [
    "PORTFOY_ARIYORUM",
    "KAT_KARSILIGI_ARSA_ARIYORUM",
    "BOLGESEL_SATIS_OFISI_ARIYORUM",
    "IS_ORTAGI_ARIYORUM",
    "YATIRIMCI_ARIYORUM",
    "SEKTOREL_IHTIYACLAR",
    "DUYURU",
    "KAMPANYA_DUYURU",
    "DIGER",
  ],
};

const REQUEST_TYPE_FILTER_OPTIONS = [
  { value: "Tümü", label: "Tümü" },
  { value: "PORTFOY_KIRALIK", label: "Kiralık Portföy" },
  { value: "PORTFOY_SATILIK", label: "Satılık Portföy" },
  { value: "DIGER_TURLER", label: "Diğer Talep Türleri" },
];

const QUICK_REQUEST_TYPE_FILTERS = REQUEST_TYPE_FILTER_OPTIONS.slice(1);
const DEFAULT_FORM: TopicForm = {
  title: "",
  category: "",
  requestIntent: "",
  propertyType: "",
  areas: [],
  city: "",
  district: "",
  neighborhood: "",
  budget: "",
  minArea: "",
  maxArea: "",
  minRoom: "",
  maxRoom: "",
  minBudget: "",
  maxBudget: "",
  currency: "TRY",
  detail: "",
  urgency: "Normal",
  validFor: "7 gün",
  visibility: "TUM_EPH",
};

function normalizeText(value?: string | null) {
  return String(value || "")
    .toLocaleLowerCase("tr-TR")
    .trim();
}

function normalizeRole(role?: string | null) {
  const raw = String(role || "")
    .toLocaleUpperCase("tr-TR")
    .trim()
    .replaceAll("İ", "I")
    .replaceAll("Ü", "U")
    .replaceAll("Ğ", "G")
    .replaceAll("Ş", "S")
    .replaceAll("Ö", "O")
    .replaceAll("Ç", "C")
    .replaceAll("-", "_")
    .replaceAll(" ", "_");

  if (raw.includes("SUPER")) return "SUPER_ADMIN";
  if (raw.includes("ADMIN")) return "ADMIN";
  if (raw.includes("INSAAT")) return "INSAAT_FIRMASI";
  if (
    raw.includes("MUTEAHHIT") ||
    raw.includes("MUTEAHIT") ||
    raw.includes("MUTAAHHIT")
  )
    return "MUTEAHHIT";
  if (raw.includes("EMLAK")) return "EMLAKCI";

  return raw || "EMLAKCI";
}

function getCategoryOption(value?: string | null) {
  const raw = String(value || "").trim();
  const byValue = ALL_CATEGORY_OPTIONS.find((item) => item.value === raw);

  if (byValue) return byValue;

  const text = normalizeText(raw);

  if (text.includes("portföy") || text.includes("portfoy"))
    return ALL_CATEGORY_OPTIONS[0];
  if (text.includes("kat") || text.includes("arsa"))
    return ALL_CATEGORY_OPTIONS[1];
  if (text.includes("satış") || text.includes("satis") || text.includes("ofis"))
    return ALL_CATEGORY_OPTIONS[2];
  if (
    text.includes("iş ortağı") ||
    text.includes("is ortagi") ||
    text.includes("ortak")
  )
    return ALL_CATEGORY_OPTIONS[3];
  if (text.includes("yatırım") || text.includes("yatirim"))
    return ALL_CATEGORY_OPTIONS[4];
  if (
    text.includes("sektör") ||
    text.includes("sektor") ||
    text.includes("ihtiyaç") ||
    text.includes("ihtiyac")
  )
    return ALL_CATEGORY_OPTIONS[5];
  if (text.includes("duyuru") || text.includes("kampanya"))
    return ALL_CATEGORY_OPTIONS[7];

  return ALL_CATEGORY_OPTIONS[8];
}

function categoryLabel(value?: string | null) {
  return getCategoryOption(value).label;
}

function categoryFamily(value?: string | null) {
  const category = getCategoryOption(value).value;

  if (category === "PORTFOY_ARIYORUM") return "Portföy Arıyorum";
  if (category === "KAT_KARSILIGI_ARSA_ARIYORUM")
    return "Kat Karşılığı Arsa Arıyorum";
  if (category === "BOLGESEL_SATIS_OFISI_ARIYORUM")
    return "Bölgesel Satış Ofisi Arıyorum";
  if (category === "IS_ORTAGI_ARIYORUM") return "İş Ortağı Arıyorum";
  if (category === "YATIRIMCI_ARIYORUM") return "Yatırımcı Arıyorum";
  if (category === "SEKTOREL_IHTIYACLAR") return "Sektörel İhtiyaçlar";
  if (category === "DUYURU" || category === "KAMPANYA_DUYURU") return "Duyuru";

  return "Diğer";
}

function getCategoryImage(value?: string | null) {
  const family = categoryFamily(value);

  return CATEGORY_IMAGES[family] || CATEGORY_IMAGES["Tüm Talepler"];
}

function getRequestIntentFromPost(post: NetworkPost) {
  const tag = (post.tags || []).find((item) =>
    String(item || "").startsWith("Talep Türü:"),
  );
  const explicit = normalizeForumRequestTypeCode(
    String(tag || "").replace("Talep Türü:", "").trim(),
  );
  if (explicit) return explicit;

  const text = normalizeText([post.title, post.description, ...(post.tags || [])].join(" "));
  if (text.includes("kiralık") || text.includes("kiralik")) return "PORTFOY_KIRALIK";
  if (text.includes("satılık") || text.includes("satilik")) return "PORTFOY_SATILIK";
  return getForumRequestTypeOptions(getCategoryOption(post.type).value)[0]?.value || "DIGER_GENEL_TALEP";
}

function postMatchesCategory(post: NetworkPost, filter: string) {
  if (filter === "Tüm Talepler") return true;

  return categoryFamily(post.type) === filter;
}

function postMatchesIntent(post: NetworkPost, filter: string) {
  if (filter === "Tümü") return true;
  const requestType = getRequestIntentFromPost(post);
  if (filter === "DIGER_TURLER") return !["PORTFOY_KIRALIK", "PORTFOY_SATILIK"].includes(requestType);
  return requestType === filter;
}

function tabCount(posts: NetworkPost[], key: string) {
  if (key === "Tüm Talepler") return posts.length;

  return posts.filter((post) => categoryFamily(post.type) === key).length;
}

function formatMoney(value?: string | number | null, currency = "TRY") {
  if (value == null || value === "") return "";

  const numeric =
    typeof value === "number"
      ? value
      : Number(String(value).replace(/\D/g, ""));

  if (!numeric) return String(value);

  return `${numeric.toLocaleString("tr-TR")} ${currency === "TRY" ? "TL" : currency}`;
}

function formatPostBudget(post: NetworkPost) {
  const currency = budgetCurrencyFromPost(post);

  const minBudget =
    post.minBudget != null && Number(post.minBudget) > 0
      ? Number(post.minBudget)
      : null;

  const maxBudget =
    post.maxBudget != null && Number(post.maxBudget) > 0
      ? Number(post.maxBudget)
      : null;

  if (
    minBudget !== null &&
    maxBudget !== null
  ) {
    if (minBudget === maxBudget) {
      return formatMoney(minBudget, currency);
    }

    return `${formatMoney(
      minBudget,
      currency,
    )} – ${formatMoney(
      maxBudget,
      currency,
    )}`;
  }

  if (minBudget !== null) {
    return `${formatMoney(
      minBudget,
      currency,
    )} ve üzeri`;
  }

  if (maxBudget !== null) {
    return `${formatMoney(
      maxBudget,
      currency,
    )}'a kadar`;
  }

  if (
    post.budget != null &&
    Number(post.budget) > 0
  ) {
    return formatMoney(post.budget, currency);
  }

  return "Bütçe belirtilmedi";
}

function formatBudgetInput(value: string) {
  const digits = String(value || "")
    .replace(/\D/g, "")
    .slice(0, 13);

  if (!digits) return "";

  return Number(digits).toLocaleString("tr-TR");
}

function budgetCurrencyFromPost(post: NetworkPost) {
  const tag = (post.tags || []).find((item) =>
    String(item || "").startsWith("Döviz:"),
  );
  const currency = String(tag || "")
    .replace("Döviz:", "")
    .trim();

  return currency || "TRY";
}

function remainingTime(value?: string | null) {
  if (!value) return "Süre yok";

  const diff = new Date(value).getTime() - Date.now();

  if (diff <= 0) return "Süre doldu";

  const day = Math.ceil(diff / (1000 * 60 * 60 * 24));

  return `${day} gün kaldı`;
}

function validForFromExpiresAt(value?: string | null) {
  if (!value) return "7 gün";

  const diff = new Date(value).getTime() - Date.now();
  const day = Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));

  if (day <= 3) return "3 gün";
  if (day <= 7) return "7 gün";
  if (day <= 15) return "15 gün";

  return "30 gün";
}

function expiresAtFromValidFor(value: string) {
  const date = new Date();

  if (value === "3 gün") date.setDate(date.getDate() + 3);
  else if (value === "7 gün") date.setDate(date.getDate() + 7);
  else if (value === "15 gün") date.setDate(date.getDate() + 15);
  else date.setDate(date.getDate() + 30);

  return date.toISOString();
}

function getRoleCategories(role?: string | null) {
  const normalized = normalizeRole(role);
  const values = ROLE_CATEGORY_MAP[normalized] || ROLE_CATEGORY_MAP.EMLAKCI;

  return values
    .map((value) => ALL_CATEGORY_OPTIONS.find((item) => item.value === value))
    .filter(Boolean) as ForumCategoryOption[];
}

function canManagePost(
  post: NetworkPost,
  user?: { id?: string | null; role?: string | null } | null,
) {
  const role = normalizeRole(user?.role);

  return Boolean(
    user?.id &&
    (post.userId === user.id || role === "ADMIN" || role === "SUPER_ADMIN"),
  );
}

function categoryBadgeClass(value?: string | null) {
  const family = categoryFamily(value);

  if (family === "Kat Karşılığı Arsa Arıyorum")
    return "border-orange-200 bg-orange-50 text-orange-600";
  if (family === "Portföy Arıyorum")
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (family === "Bölgesel Satış Ofisi Arıyorum")
    return "border-violet-200 bg-violet-50 text-violet-700";
  if (family === "İş Ortağı Arıyorum")
    return "border-blue-200 bg-blue-50 text-blue-700";
  if (family === "Yatırımcı Arıyorum")
    return "border-amber-200 bg-amber-50 text-amber-700";
  if (family === "Sektörel İhtiyaçlar")
    return "border-purple-200 bg-purple-50 text-purple-700";
  if (family === "Duyuru") return "border-red-200 bg-red-50 text-red-600";

  return "border-slate-200 bg-slate-50 text-slate-700";
}

function formFromPost(post: NetworkPost): TopicForm {
  return {
    title: post.title || "",
    category: getCategoryOption(post.type).value,
    requestIntent: getRequestIntentFromPost(post),
    propertyType:
      Array.isArray(post.propertyTypes) && post.propertyTypes.length > 0
        ? String(post.propertyTypes[0] || "")
        : "",
    areas: normalizeForumAreas(post.areas),
    city: post.city || "",
    district: post.district || "",
    neighborhood: post.neighborhood || "",
    budget: post.budget ? formatBudgetInput(String(post.budget)) : "",
    minArea: post.minArea != null ? String(post.minArea) : "",
    maxArea: post.maxArea != null ? String(post.maxArea) : "",
    minRoom: post.minRoom != null ? String(post.minRoom) : "",
    maxRoom: post.maxRoom != null ? String(post.maxRoom) : "",
    minBudget:
      post.minBudget
        ? formatBudgetInput(String(post.minBudget))
        : post.budget
          ? formatBudgetInput(String(post.budget))
          : "",
    maxBudget:
      post.maxBudget
        ? formatBudgetInput(String(post.maxBudget))
        : post.budget
          ? formatBudgetInput(String(post.budget))
          : "",
    currency: post.priceCurrency || budgetCurrencyFromPost(post),
    detail: post.description || "",
    urgency: post.urgency || "Normal",
    validFor: validForFromExpiresAt(post.expiresAt),
    visibility: post.visibility || "TUM_EPH",
  };
}

function readStoredPostIds(prefix: string) {
  if (typeof window === "undefined") return new Set<string>();

  const values = new Set<string>();

  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index) || "";

    if (key.startsWith(prefix) && window.localStorage.getItem(key) === "1") {
      values.add(key.replace(prefix, ""));
    }
  }

  return values;
}

function MarqueeRow({
  children,
  duration = 34,
}: {
  children: ReactNode;
  duration?: number;
}) {
  return (
    <div className="talep-marquee-viewport overflow-hidden">
      <div
        className="talep-marquee-track flex w-max items-center gap-2"
        style={{ animationDuration: `${duration}s` }}
      >
        {children}
        {children}
      </div>
    </div>
  );
}

export default function NetworkPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [posts, setPosts] = useState<NetworkPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<NetworkPost | null>(null);
  const [saving, setSaving] = useState(false);
  const [propertyValidationConfirmation, setPropertyValidationConfirmation] =
    useState<PropertyValidationConfirmation | null>(null);
  const [deletingId, setDeletingId] = useState("");
  const [flowFilter, setFlowFilter] = useState("Tüm Talepler");
  const [intentFilter, setIntentFilter] = useState("Tümü");
  const [personalFilter, setPersonalFilter] = useState<PersonalTabKey>("ALL");
  const [search, setSearch] = useState("");
  const [advancedFilterOpen, setAdvancedFilterOpen] = useState(false);
  const [advancedFilters, setAdvancedFilters] =
    useState<ForumAdvancedFilterState>(() =>
      createEmptyForumAdvancedFilters(),
    );
  const [savedPostIds, setSavedPostIds] = useState<Set<string>>(new Set());
  const [interestedPostIds, setInterestedPostIds] = useState<Set<string>>(
    new Set(),
  );

  const roleCategories = useMemo(
    () => getRoleCategories(user?.role),
    [user?.role],
  );

  const fetchPosts = async () => {
    try {
      setLoading(true);

      const [postsRes, followedRes] = await Promise.all([
        api.get("/network/posts"),
        user?.id
          ? api.get("/network/posts/followed", {
              params: {
                userId: user.id,
              },
            })
          : Promise.resolve({ data: [] }),
      ]);

      const nextPosts = Array.isArray(postsRes.data) ? postsRes.data : [];
      const followedItems = Array.isArray(followedRes.data)
        ? followedRes.data
        : [];
      const nextSavedIds = new Set<string>(
        followedItems
          .map((item: { post?: NetworkPost | null }) => item?.post?.id)
          .filter(Boolean) as string[],
      );

      setPosts(nextPosts);
      setSavedPostIds(nextSavedIds);
    } catch {
      setPosts([]);
      setSavedPostIds(new Set());
    } finally {
      setLoading(false);
    }
  };

  const syncPersonalStorage = () => {
    setInterestedPostIds(readStoredPostIds("eph-interested-network-"));
  };

  useEffect(() => {
    fetchPosts();
    syncPersonalStorage();
  }, [user?.id]);

  const baseFilteredPosts = useMemo(() => {
    return applyForumAdvancedFilters(posts, advancedFilters, search)
      .filter((post) => postMatchesCategory(post, flowFilter))
      .filter((post) => postMatchesIntent(post, intentFilter));
  }, [advancedFilters, flowFilter, intentFilter, posts, search]);

  const advancedFilterCount = useMemo(
    () => countForumAdvancedFilters(advancedFilters),
    [advancedFilters],
  );

  const locationFilterLabel = useMemo(() => {
    if (advancedFilters.neighborhoods.length > 0) {
      return `${advancedFilters.neighborhoods.length} mahalle`;
    }

    if (advancedFilters.districts.length > 0) {
      return `${advancedFilters.districts.length} ilçe`;
    }

    if (advancedFilters.cities.length === 1) {
      return advancedFilters.cities[0];
    }

    if (advancedFilters.cities.length > 1) {
      return `${advancedFilters.cities.length} il`;
    }

    return "Konum";
  }, [
    advancedFilters.cities,
    advancedFilters.districts,
    advancedFilters.neighborhoods,
  ]);

  const filteredPosts = useMemo(() => {
    if (personalFilter === "MINE") {
      return baseFilteredPosts.filter(
        (post) => user?.id && post.userId === user.id,
      );
    }

    if (personalFilter === "SAVED") {
      return baseFilteredPosts.filter((post) => savedPostIds.has(post.id));
    }

    if (personalFilter === "INTERESTED") {
      return baseFilteredPosts.filter((post) => interestedPostIds.has(post.id));
    }

    return baseFilteredPosts;
  }, [
    baseFilteredPosts,
    interestedPostIds,
    personalFilter,
    savedPostIds,
    user?.id,
  ]);

  const mineCount = useMemo(
    () => posts.filter((post) => user?.id && post.userId === user.id).length,
    [posts, user?.id],
  );
  const savedCount = useMemo(
    () => posts.filter((post) => savedPostIds.has(post.id)).length,
    [posts, savedPostIds],
  );
  const interestedCount = useMemo(
    () => posts.filter((post) => interestedPostIds.has(post.id)).length,
    [posts, interestedPostIds],
  );

  const personalTabCounts: Record<PersonalTabKey, number> = {
    ALL: posts.length,
    MINE: mineCount,
    SAVED: savedCount,
    INTERESTED: interestedCount,
  };

  const saveTopic = async (
    form: TopicForm,
    acknowledgedWarningCodes: string[] = [],
  ) => {
    if (!user?.id) {
      alert("Oturum bulunamadı. Lütfen tekrar giriş yapın.");
      router.push("/giris");
      return;
    }

    const normalizedUserRole = normalizeRole(user.role);
    const allowedCategories =
      normalizedUserRole === "SUPER_ADMIN"
        ? ALL_CATEGORY_OPTIONS
        : getRoleCategories(user.role);
    const selectedCategory = allowedCategories.find(
      (item) => item.value === form.category,
    );

    if (!selectedCategory) {
      alert("Bu rol ile seçilen kategoride talep oluşturamazsınız.");
      return;
    }

    if (!form.requestIntent) {
      alert("Lütfen talep türünü seçin.");
      return;
    }

    if (
      form.category === "PORTFOY_ARIYORUM" &&
      !form.propertyType
    ) {
      alert("Lütfen gayrimenkul tipini seçin.");
      return;
    }

    if (!form.title.trim()) {
      alert("Lütfen talep başlığını yazın.");
      return;
    }

    if (!form.detail.trim()) {
      alert("Lütfen açıklama yazın.");
      return;
    }

    if (form.detail.trim().length > 200) {
      alert("Açıklama en fazla 200 karakter olabilir.");
      return;
    }

    const tags = [
      selectedCategory.label,
      `Talep Türü:${form.requestIntent}`,
      form.urgency,
      form.city,
      form.district,
      form.neighborhood,
      form.budget || form.minBudget || form.maxBudget
        ? `Döviz:${form.currency}`
        : "",
    ]
      .filter(Boolean)
      .slice(0, 8);

    const minBudgetValue = form.minBudget
      ? Number(form.minBudget.replace(/\D/g, ""))
      : null;

    const maxBudgetValue = form.maxBudget
      ? Number(form.maxBudget.replace(/\D/g, ""))
      : null;

    const legacyBudgetValue =
      maxBudgetValue ||
      minBudgetValue ||
      (form.budget
        ? Number(form.budget.replace(/\D/g, ""))
        : null);

    const payload = {
      userId: user.id,
      type: selectedCategory.value,
      propertyTypes:
        form.category === "PORTFOY_ARIYORUM" && form.propertyType
          ? [form.propertyType]
          : [],
      priceCurrency: form.currency,
      title: form.title.trim(),
      description: form.detail.trim(),
      city: form.city.trim() || null,
      district: form.district.trim() || null,
      neighborhood: form.neighborhood.trim() || null,
      budget: legacyBudgetValue,
      minArea: form.minArea ? Number(form.minArea.replace(/\D/g, "")) : null,
      maxArea: form.maxArea ? Number(form.maxArea.replace(/\D/g, "")) : null,
      minRoom: form.minRoom ? Number(form.minRoom.replace(/\D/g, "")) : null,
      maxRoom: form.maxRoom ? Number(form.maxRoom.replace(/\D/g, "")) : null,
      minBudget: minBudgetValue,
      maxBudget: maxBudgetValue,
      areas: form.areas,
      urgency: form.urgency,
      visibility: form.visibility,
      tags,
      expiresAt: expiresAtFromValidFor(form.validFor),
      acknowledgedWarningCodes,
    };

    try {
      setSaving(true);

      if (editingPost) {
        await api.patch(`/network/posts/${editingPost.id}`, payload);
      } else {
        await api.post("/network/posts", payload);
      }

      await fetchPosts();
      setPropertyValidationConfirmation(null);
      setModalOpen(false);
      setEditingPost(null);
    } catch (error: any) {
      const responseData = error?.response?.data;

      if (
        responseData?.code ===
        "PROPERTY_VALIDATION_CONFIRMATION_REQUIRED"
      ) {
        const requiredWarningCodes = Array.isArray(
          responseData.requiredWarningCodes,
        )
          ? responseData.requiredWarningCodes.filter(
              (code: unknown): code is string =>
                typeof code === "string" && Boolean(code.trim()),
            )
          : [];

        const warnings = Array.isArray(responseData.warnings)
          ? responseData.warnings
          : [];

        if (requiredWarningCodes.length > 0) {
          setPropertyValidationConfirmation({
            form,
            linaTitle:
              responseData.linaTitle ||
              "Lina olağan dışı bir değer fark etti",
            confirmationText:
              responseData.confirmationText ||
              "Bu değerin doğru olduğunu onaylıyorum",
            requiredWarningCodes,
            warnings,
          });
          return;
        }
      }

      alert(responseData?.message || "Talep kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePost = async (post: NetworkPost) => {
    if (!confirm("Bu talebi silmek istiyor musun?")) return;

    try {
      setDeletingId(post.id);
      await api.delete(`/network/posts/${post.id}`, {
        data: {
          userId: user?.id,
        },
      });
      setPosts((current) => current.filter((item) => item.id !== post.id));
      setSavedPostIds((current) => {
        const next = new Set(current);
        next.delete(post.id);
        return next;
      });
      localStorage.removeItem(`eph-interested-network-${post.id}`);
      syncPersonalStorage();
    } catch (error: any) {
      alert(error?.response?.data?.message || "Talep silinemedi.");
    } finally {
      setDeletingId("");
    }
  };

  const handleToggleSave = async (post: NetworkPost) => {
    if (!user?.id) {
      alert("Kaydetmek için lütfen tekrar giriş yapın.");
      router.push("/giris");
      return;
    }

    if (post.userId === user.id) {
      alert("Kendi talebinizi kaydetmenize gerek yok.");
      return;
    }

    const isSaved = savedPostIds.has(post.id);
    const previousSavedIds = new Set(savedPostIds);

    setSavedPostIds((current) => {
      const next = new Set(current);

      if (isSaved) next.delete(post.id);
      else next.add(post.id);

      return next;
    });

    setPosts((current) =>
      current.map((item) => {
        if (item.id !== post.id) return item;

        const currentCount = item.followerCount || 0;

        return {
          ...item,
          followerCount: Math.max(0, currentCount + (isSaved ? -1 : 1)),
        };
      }),
    );

    try {
      const res = isSaved
        ? await api.delete(`/network/posts/${post.id}/follow`, {
            data: {
              userId: user.id,
            },
          })
        : await api.post(`/network/posts/${post.id}/follow`, {
            userId: user.id,
          });

      const followerCount = Number(res?.data?.followerCount);

      if (Number.isFinite(followerCount)) {
        setPosts((current) =>
          current.map((item) =>
            item.id === post.id ? { ...item, followerCount } : item,
          ),
        );
      }
    } catch (error: any) {
      setSavedPostIds(previousSavedIds);
      await fetchPosts();
      alert(error?.response?.data?.message || "Kaydetme işlemi tamamlanamadı.");
    }
  };

  const handleOpenPost = (post: NetworkPost) => {
    router.push(`/network/${post.id}`);
  };

  const openCreateModal = () => {
    setEditingPost(null);
    setModalOpen(true);
  };

  const openEditModal = (post: NetworkPost) => {
    setEditingPost(post);
    setModalOpen(true);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const createParam = params.get("create");
    const tabParam = params.get("tab");
    if (createParam !== "1" && !tabParam) return;

    if (createParam === "1") openCreateModal();

    const tabMap: Record<string, PersonalTabKey> = {
      mine: "MINE",
      saved: "SAVED",
      interested: "INTERESTED",
    };
    if (tabParam && tabMap[tabParam]) setPersonalFilter(tabMap[tabParam]);

    params.delete("create");
    params.delete("tab");
    const nextQuery = params.toString();
    const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}${window.location.hash}`;
    window.history.replaceState(window.history.state, "", nextUrl);
  }, [user?.id]);

  const metrics = [
    {
      id: "total",
      label: "Toplam Talep",
      value: posts.length,
      tone: "text-[#EA580C]",
    },
    {
      id: "mine",
      label: "Taleplerim",
      value: mineCount,
      tone: "text-orange-600",
    },
    {
      id: "saved",
      label: "Kaydettiklerim",
      value: savedCount,
      tone: "text-amber-600",
    },
    {
      id: "interested",
      label: "İlgilendiklerim",
      value: interestedCount,
      tone: "text-emerald-600",
    },
    {
      id: "portfoy",
      label: "Portföy Arıyorum",
      value: tabCount(posts, "Portföy Arıyorum"),
      tone: "text-emerald-600",
    },
    {
      id: "kat",
      label: "Kat Karşılığı",
      value: tabCount(posts, "Kat Karşılığı Arsa Arıyorum"),
      tone: "text-orange-600",
    },
    {
      id: "sektorel",
      label: "Sektörel İhtiyaçlar",
      value: tabCount(posts, "Sektörel İhtiyaçlar"),
      tone: "text-violet-600",
    },
  ];

  return (
    <main
      className="min-h-[calc(100dvh-64px)] bg-[#FFF1D6] px-2 pt-2 text-[#3A2208] sm:px-3"
      style={{
        paddingBottom: "calc(112px + env(safe-area-inset-bottom, 0px))",
      }}
    >
      <style jsx global>{`
        @keyframes talepMarqueeFlow {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }

        .talep-marquee-viewport {
          mask-image: linear-gradient(
            90deg,
            transparent 0%,
            black 6%,
            black 94%,
            transparent 100%
          );
          -webkit-mask-image: linear-gradient(
            90deg,
            transparent 0%,
            black 6%,
            black 94%,
            transparent 100%
          );
        }

        .talep-marquee-track {
          animation-name: talepMarqueeFlow;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }

        .talep-marquee-track:hover,
        .talep-marquee-track:active {
          animation-play-state: paused;
        }

        @keyframes forumSilverShine {
          0% {
            background-position: 210% center;
          }
          100% {
            background-position: -210% center;
          }
        }

        .forum-command-shell {
          background:
            radial-gradient(
              circle at 92% 4%,
              rgba(255, 255, 255, 0.92),
              transparent 32%
            ),
            radial-gradient(
              circle at 4% 94%,
              rgba(251, 146, 60, 0.30),
              transparent 34%
            ),
            linear-gradient(155deg, #FFF4E5 0%, #FFE4B8 52%, #FFD28A 100%);
        }

        .forum-command-grid {
          background-image:
            linear-gradient(rgba(234, 88, 12, 0.055) 1px, transparent 1px),
            linear-gradient(
              90deg,
              rgba(234, 88, 12, 0.055) 1px,
              transparent 1px
            );
          background-size: 24px 24px;
        }

        .forum-silver-text {
          color: #475569;
          background-image: linear-gradient(
            110deg,
            #334155 0%,
            #64748b 30%,
            #f8fafc 47%,
            #ffffff 50%,
            #94a3b8 58%,
            #334155 100%
          );
          background-size: 240% 100%;
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: forumSilverShine 4.8s linear infinite;
        }

        .forum-scrollbar {
          scrollbar-width: none;
        }

        .forum-scrollbar::-webkit-scrollbar {
          display: none;
        }

        @media (prefers-reduced-motion: reduce) {
          .talep-marquee-track {
            animation: none;
            overflow-x: auto;
            width: 100%;
          }

          .forum-silver-text {
            animation: none;
            background-image: none;
            -webkit-text-fill-color: #475569;
          }
        }
      `}</style>

      <div className="mx-auto w-full max-w-[430px] space-y-3 overflow-hidden">
        <section className="forum-command-shell relative overflow-hidden rounded-[30px] border border-[#F5A94A] shadow-[0_20px_48px_rgba(194,65,12,0.18)]">
          <div className="forum-command-grid pointer-events-none absolute inset-0 opacity-65" />
          <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full border border-white/70" />
          <div className="pointer-events-none absolute -left-20 bottom-16 h-48 w-48 rounded-full border border-orange-300/35" />

          <div className="relative space-y-3 p-3">
            <header className="rounded-[26px] border border-[#FED7AA] bg-[#FFFBF5]/95 px-4 py-4 text-center shadow-[0_14px_34px_rgba(194,65,12,0.12)] backdrop-blur">
              <h1 className="text-center text-[31px] font-black leading-none tracking-[-0.06em] text-[#3A2208]">
                Talep Merkezi
              </h1>
              <p className="forum-silver-text mx-auto mt-2 max-w-[340px] text-center text-[13.5px] font-black leading-5">
                Elinizdekini değil, ihtiyacınızı paylaşın.
              </p>
              <span className="mx-auto mt-3 block h-1 w-12 rounded-full bg-gradient-to-r from-[#C2410C] via-[#F59E0B] to-[#EA580C] shadow-[0_0_14px_rgba(56,189,248,0.45)]" />
            </header>

            <section className="rounded-[25px] border border-[#FED7AA] bg-[#FFFBF5]/95 p-2 shadow-[0_14px_32px_rgba(194,65,12,0.11)] backdrop-blur">
              <div className="grid grid-cols-4 gap-1.5">
                {PERSONAL_TABS.map((tab) => {
                  const active = personalFilter === tab.key;

                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setPersonalFilter(tab.key)}
                      className={`min-h-[65px] rounded-[19px] border px-1 py-2 text-center transition active:scale-[0.98] ${
                        active
                          ? "border-[#EA580C] bg-[#FFF1E8] text-[#EA580C] shadow-[0_8px_18px_rgba(21,87,214,0.13)]"
                          : "border-[#FED7AA] bg-white text-[#3A2208]"
                      }`}
                    >
                      <span className="block text-center text-[17px] leading-none">
                        {tab.icon}
                      </span>
                      <span className="mt-1 block min-h-[20px] text-center text-[9px] font-black leading-[10px]">
                        {tab.label}
                      </span>
                      <span className="mt-1 inline-flex min-w-[22px] justify-center rounded-full bg-white px-1.5 text-[10px] font-black text-[#EA580C] shadow-[0_2px_7px_rgba(15,23,42,0.08)]">
                        {personalTabCounts[tab.key]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="-mx-1 overflow-hidden pl-1">
              <MarqueeRow duration={42}>
                {REQUEST_TABS.map((tab, index) => {
                  const active = flowFilter === tab.key;

                  return (
                    <button
                      key={`request-tab-${tab.key}-${index}`}
                      type="button"
                      onClick={() => setFlowFilter(tab.key)}
                      className={`min-h-[148px] w-[104px] shrink-0 overflow-hidden rounded-[22px] border bg-white text-center shadow-[0_12px_30px_rgba(194,65,12,0.12)] transition active:scale-[0.98] ${
                        active
                          ? "border-[#EA580C] ring-2 ring-orange-100"
                          : "border-[#FED7AA]"
                      }`}
                    >
                      <div className="relative h-[72px] w-full overflow-hidden bg-[#EEF5FF]">
                        <Image
                          src={
                            CATEGORY_IMAGES[tab.key] ||
                            CATEGORY_IMAGES["Tüm Talepler"]
                          }
                          alt={tab.label}
                          fill
                          sizes="104px"
                          className="object-cover"
                        />
                      </div>
                      <div className="flex min-h-[52px] items-center justify-center px-1.5">
                        <p className="text-center text-[11px] font-black leading-[13px] tracking-[-0.02em] text-[#3A2208]">
                          {tab.label}
                        </p>
                      </div>
                      <span
                        className={`mx-auto inline-flex min-h-[24px] min-w-[34px] items-center justify-center rounded-full px-2 text-[13px] font-black ${tab.countTone}`}
                      >
                        {tabCount(posts, tab.key)}
                      </span>
                    </button>
                  );
                })}
              </MarqueeRow>
            </section>

            <section className="rounded-[25px] border border-[#FED7AA] bg-[#FFFBF5]/95 p-3 shadow-[0_14px_32px_rgba(194,65,12,0.11)] backdrop-blur">
              <div className="flex h-12 items-center gap-2 rounded-[21px] bg-[#FFF7ED] px-3 ring-1 ring-[#FED7AA]">
                <Search size={17} className="shrink-0 text-[#7C5A36]" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="min-w-0 flex-1 bg-transparent text-left text-[12px] font-bold text-[#3A2208] outline-none placeholder:text-[#94A3B8]"
                  placeholder="Talep başlığı, şehir, ilçe..."
                />
              </div>

              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAdvancedFilterOpen(true)}
                  className={`relative flex h-11 min-w-0 items-center justify-center gap-1.5 rounded-[19px] border px-2 text-[11px] font-black transition active:scale-[0.98] ${
                    advancedFilters.cities.length > 0 ||
                    advancedFilters.districts.length > 0 ||
                    advancedFilters.neighborhoods.length > 0
                      ? "border-[#EA580C] bg-[#FFF1E8] text-[#C2410C]"
                      : "border-[#FED7AA] bg-white text-[#3A2208]"
                  }`}
                >
                  <MapPin size={15} className="shrink-0 text-[#EA580C]" />
                  <span className="min-w-0 truncate">{locationFilterLabel}</span>
                  <ChevronDown size={13} className="shrink-0" />
                </button>

                <button
                  type="button"
                  onClick={() => setAdvancedFilterOpen(true)}
                  className={`relative flex h-11 min-w-0 items-center justify-center gap-1.5 rounded-[19px] border px-2 text-[11px] font-black transition active:scale-[0.98] ${
                    advancedFilterOpen || advancedFilterCount > 0
                      ? "border-[#EA580C] bg-[#FFF1E8] text-[#EA580C]"
                      : "border-[#FED7AA] bg-white text-[#3A2208]"
                  }`}
                >
                  <SlidersHorizontal
                    size={15}
                    className="shrink-0 text-[#EA580C]"
                  />
                  Gelişmiş Filtre
                  {advancedFilterCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#EA580C] px-1 text-[9px] font-black text-white">
                      {advancedFilterCount}
                    </span>
                  )}
                </button>
              </div>
            </section>

            <section className="grid grid-cols-4 overflow-hidden rounded-[22px] border border-[#FED7AA] bg-[#FFFBF5]/95 shadow-[0_14px_32px_rgba(194,65,12,0.11)] backdrop-blur">
              {metrics.slice(0, 4).map((metric, index) => (
                <MetricBox
                  key={`metric-${metric.id}-${index}`}
                  label={metric.label}
                  value={metric.value}
                  tone={metric.tone}
                />
              ))}
            </section>

            <section className="rounded-[25px] border border-[#FED7AA] bg-[#FFFBF5]/95 p-3 shadow-[0_14px_32px_rgba(194,65,12,0.11)] backdrop-blur">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1 text-center">
                  <h2 className="text-center text-[21px] font-black tracking-[-0.04em] text-[#3A2208]">
                    {PERSONAL_TABS.find(
                      (item) => item.key === personalFilter,
                    )?.label || "Tüm Talepler"}
                  </h2>
                  <p className="text-center text-[10px] font-bold text-[#7C5A36]">
                    {filteredPosts.length} profesyonel talep listeleniyor
                  </p>
                </div>

                <button
                  type="button"
                  onClick={openCreateModal}
                  className="inline-flex h-12 shrink-0 items-center justify-center gap-1.5 rounded-[22px] bg-gradient-to-b from-[#2563EB] to-[#EA580C] px-3.5 text-[11px] font-black text-white shadow-[0_12px_25px_rgba(21,87,214,0.24)] transition active:scale-[0.98]"
                >
                  <Plus size={16} />
                  Yeni Talep
                </button>
              </div>
            </section>
          </div>
        </section>

        <section className="overflow-hidden rounded-[26px] border border-[#F5A94A] bg-[#FFF8EE] shadow-[0_18px_44px_rgba(194,65,12,0.12)]">
          {loading ? (
            <div className="flex min-h-[320px] items-center justify-center">
              <div className="text-center">
                <Loader2
                  className="mx-auto animate-spin text-[#EA580C]"
                  size={30}
                />
                <p className="mt-3 text-center text-[12px] font-black text-[#7C5A36]">
                  Talep merkezi yükleniyor...
                </p>
              </div>
            </div>
          ) : filteredPosts.length === 0 ? (
            <EmptyForumState
              activeTab={personalFilter}
              onCreate={openCreateModal}
            />
          ) : (
            <div>
              {filteredPosts.map((post, index) => {
                const isMine = Boolean(user?.id && post.userId === user.id);
                const isSaved = savedPostIds.has(post.id);
                const isInterested = interestedPostIds.has(post.id);

                return (
                  <RequestCard
                    key={`network-post-${post.id}-${index}`}
                    post={post}
                    canManage={canManagePost(post, user)}
                    deleting={deletingId === post.id}
                    isMine={isMine}
                    isSaved={isSaved}
                    isInterested={isInterested}
                    onOpen={() => handleOpenPost(post)}
                    onEdit={() => openEditModal(post)}
                    onDelete={() => handleDeletePost(post)}
                    onToggleSave={() => handleToggleSave(post)}
                  />
                );
              })}
            </div>
          )}
        </section>
      </div>

      <ForumAdvancedFilter
        open={advancedFilterOpen}
        posts={posts}
        value={advancedFilters}
        onApply={(nextFilters) => {
          setAdvancedFilters(nextFilters);
          setAdvancedFilterOpen(false);
        }}
        onClose={() => setAdvancedFilterOpen(false)}
      />

      {modalOpen && (
        <TopicModal
          mode={editingPost ? "edit" : "create"}
          initialForm={editingPost ? formFromPost(editingPost) : DEFAULT_FORM}
          saving={saving}
          categories={roleCategories}
          userRole={user?.role}
          onClose={() => {
            setPropertyValidationConfirmation(null);
            setModalOpen(false);
            setEditingPost(null);
          }}
          onSave={saveTopic}
        />
      )}

      {propertyValidationConfirmation && (
        <LinaPropertyValidationModal
          warning={propertyValidationConfirmation}
          saving={saving}
          onClose={() =>
            setPropertyValidationConfirmation(null)
          }
          onConfirm={async () => {
            const currentWarning =
              propertyValidationConfirmation;

            setPropertyValidationConfirmation(null);

            await saveTopic(
              currentWarning.form,
              currentWarning.requiredWarningCodes,
            );
          }}
        />
      )}
    </main>
  );
}

function LinaPropertyValidationModal({
  warning,
  saving,
  onClose,
  onConfirm,
}: {
  warning: PropertyValidationConfirmation;
  saving: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
}) {
  const [confirmed, setConfirmed] = useState(false);

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-[2px] sm:items-center sm:p-5">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="lina-property-warning-title"
        className="max-h-[92dvh] w-full overflow-y-auto rounded-t-[30px] border border-amber-300 bg-[#FFFBEB] shadow-[0_28px_90px_rgba(15,23,42,0.35)] sm:max-w-[560px] sm:rounded-[30px]"
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-amber-200 bg-[#FFFBEB]/95 px-5 py-5 backdrop-blur sm:px-6">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
              <Sparkles size={25} />
            </div>

            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-amber-700">
                Lina Kontrolü
              </p>
              <h2
                id="lina-property-warning-title"
                className="mt-1 text-[20px] font-black leading-tight text-slate-900"
              >
                {warning.linaTitle}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Uyarıyı kapat"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-amber-200 bg-white text-slate-600 disabled:opacity-50"
          >
            <X size={19} />
          </button>
        </div>

        <div className="space-y-4 px-5 py-5 sm:px-6">
          <div className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-100/70 p-4">
            <TriangleAlert
              size={22}
              className="mt-0.5 shrink-0 text-amber-700"
            />
            <p className="text-[13px] font-semibold leading-6 text-amber-950">
              Girdiğiniz değer mümkün görünüyor; ancak olağan aralığın
              dışında. Yazım hatası olmadığını kontrol edin.
            </p>
          </div>

          <div className="space-y-3">
            {warning.warnings.map((issue, index) => (
              <div
                key={`${issue.code}-${index}`}
                className="rounded-2xl border border-amber-200 bg-white p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                    <TriangleAlert size={16} />
                  </div>

                  <p className="text-[13px] font-bold leading-6 text-slate-800">
                    {issue.metadata?.linaExplanation ||
                      issue.message ||
                      "Olağan dışı bir kriter değeri tespit edildi."}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-amber-300 bg-white p-4">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(event) =>
                setConfirmed(event.target.checked)
              }
              disabled={saving}
              className="mt-1 h-5 w-5 shrink-0 accent-amber-600"
            />
            <span className="text-[13px] font-black leading-6 text-slate-900">
              {warning.confirmationText}
            </span>
          </label>

          <div className="grid grid-cols-1 gap-3 pt-1 sm:grid-cols-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="h-12 rounded-2xl border border-slate-300 bg-white px-4 text-[13px] font-black text-slate-700 disabled:opacity-50"
            >
              Değeri Düzelt
            </button>

            <button
              type="button"
              onClick={onConfirm}
              disabled={!confirmed || saving}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-amber-600 px-4 text-[13px] font-black text-white shadow-lg shadow-amber-600/20 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {saving ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <CheckCircle2 size={18} />
              )}
              Onayla ve Devam Et
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricBox({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div className="min-w-0 border-r border-[#E2EAF5] px-1 py-2.5 text-center last:border-r-0">
      <p className="text-center text-[7.5px] font-black uppercase leading-[10px] tracking-[0.02em] text-[#6F4E2B]">
        {label}
      </p>
      <p
        className={`mt-1 text-center text-[21px] font-black leading-none ${tone}`}
      >
        {value}
      </p>
    </div>
  );
}

function RequestCard({
  post,
  canManage,
  deleting,
  isMine,
  isSaved,
  isInterested,
  onOpen,
  onEdit,
  onDelete,
  onToggleSave,
}: {
  post: NetworkPost;
  canManage: boolean;
  deleting: boolean;
  isMine: boolean;
  isSaved: boolean;
  isInterested: boolean;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleSave: () => void;
}) {
  const category = categoryLabel(post.type);
  const categoryValue = getCategoryOption(post.type).value;
  const categoryVisual = getForumRequestCategoryVisual(categoryValue);
  const requestIntentCode = getRequestIntentFromPost(post);
  const requestIntent = getForumRequestTypeLabel(requestIntentCode);
  const intentVisual = getForumRequestIntentVisual(requestIntentCode);
  const hasPortfolioIntent =
    categoryValue === "PORTFOY_ARIYORUM" &&
    ["PORTFOY_KIRALIK", "PORTFOY_SATILIK"].includes(requestIntentCode);
  const portfolioFoil =
    requestIntentCode === "PORTFOY_SATILIK"
      ? "ALTIN"
      : requestIntentCode === "PORTFOY_KIRALIK"
        ? "GÜMÜŞ"
        : "";
  const urgency = String(post.urgency || "Normal");
  const location =
    getPostAreaCompactLabel(post);
  const budget = formatPostBudget(post);
  const remaining = remainingTime(post.expiresAt);
  const remainingMatch = remaining.match(/\d+/);
  const remainingDay = remainingMatch ? Number(remainingMatch[0]) : null;
  const remainingDanger =
    remaining.includes("Süre doldu") ||
    (remainingDay !== null && remainingDay <= 3);
  const image = getCategoryImage(post.type);
  const owner = post.user || post.User;
  const ownerName =
    [owner?.firstName, owner?.lastName].filter(Boolean).join(" ") ||
    "EPH Üyesi";
  const ownerRoleCode = normalizeRole(owner?.role);
  const ownerRoleLabels: Record<string, string> = {
    EMLAKCI: "Emlakçı",
    MUTEAHHIT: "Müteahhit",
    INSAAT_FIRMASI: "İnşaat Firması",
    ADMIN: "Admin",
    SUPER_ADMIN: "Yazılım Ekibi",
  };
  const ownerRole = ownerRoleLabels[ownerRoleCode] || "EPH Üyesi";
  const visibility =
    FORUM_REQUEST_VISIBILITY_OPTIONS.find(
      (item) => item.value === post.visibility,
    )?.label ||
    "Tüm EPH";
  const createdDate = (() => {
    if (!post.createdAt) return "Tarih yok";

    const date = new Date(post.createdAt);

    if (Number.isNaN(date.getTime())) return "Tarih yok";

    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = String(date.getFullYear()).slice(-2);

    return `${day}.${month}.${year}`;
  })();

  const urgencyClass =
    urgency === "Acil"
      ? "border-red-200 bg-red-50 text-red-600"
      : urgency === "Sıcak Talep"
        ? "border-orange-200 bg-orange-50 text-orange-700"
        : urgency === "Müşteri Hazır"
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-slate-200 bg-slate-50 text-slate-600";

  return (
    <article
      className="relative mx-1.5 my-1.5 overflow-hidden rounded-[18px] px-2 py-2"
      style={{
        borderColor: categoryVisual.borderColor,
        borderStyle: "solid",
        borderWidth: `${categoryVisual.borderWidth || 2}px`,
        backgroundColor: categoryVisual.backgroundColor,
        boxShadow: [
          categoryVisual.shadow ||
            "0 6px 16px rgba(15, 23, 42, 0.06)",
          `inset 6px 0 0 ${categoryVisual.accentColor}`,
        ]
          .filter(Boolean)
          .join(", "),
      }}
    >
      {hasPortfolioIntent && (
        <>
          <span
            className="pointer-events-none absolute left-0 top-0 h-9 w-9 rounded-tl-[15px] border-l-[5px] border-t-[5px]"
            style={{ borderColor: intentVisual.accentColor }}
            aria-hidden="true"
          />
          <span
            className="pointer-events-none absolute bottom-0 right-0 h-9 w-9 rounded-br-[15px] border-b-[5px] border-r-[5px]"
            style={{ borderColor: intentVisual.accentColor }}
            aria-hidden="true"
          />
          <span
            className="pointer-events-none absolute right-2 top-1 rounded-full border px-1.5 py-0.5 text-[7px] font-black tracking-[0.08em]"
            style={{
              borderColor: intentVisual.borderColor,
              backgroundColor: intentVisual.selectedBackgroundColor,
              color: intentVisual.textColor,
              boxShadow: intentVisual.shadow,
            }}
            aria-hidden="true"
          >
            {portfolioFoil}
          </span>
        </>
      )}

      <div className="grid grid-cols-[68px_minmax(0,1fr)] gap-2">
        <button
          type="button"
          onClick={onOpen}
          className="relative h-[68px] w-[68px] overflow-hidden rounded-[15px] bg-[#EEF5FF] shadow-[0_7px_16px_rgba(15,23,42,0.10)]"
          aria-label={`${post.title} talebini aç`}
        >
          <Image
            src={image}
            alt={category}
            fill
            sizes="68px"
            className="object-cover"
          />
        </button>

        <button
          type="button"
          onClick={onOpen}
          className="min-w-0 text-left"
        >
          <div className="flex flex-wrap items-center gap-1">
            <span
              className="inline-flex max-w-full rounded-full border px-1.5 py-0.5 text-[8px] font-black uppercase leading-3"
              style={{
                borderColor: categoryVisual.borderColor,
                backgroundColor: categoryVisual.selectedBackgroundColor,
                color: categoryVisual.textColor,
              }}
            >
              <span className="break-words">{category}</span>
            </span>

            <span
              className="inline-flex rounded-full border px-1.5 py-0.5 text-[8px] font-black leading-3"
              style={{
                borderColor: intentVisual.borderColor,
                borderWidth: `${hasPortfolioIntent ? 2 : 1}px`,
                backgroundColor: intentVisual.selectedBackgroundColor,
                color: intentVisual.textColor,
                boxShadow: hasPortfolioIntent ? intentVisual.shadow : "none",
              }}
            >
              {requestIntent}
            </span>

            <span
              className={`inline-flex rounded-full border px-1.5 py-0.5 text-[8px] font-black leading-3 ${urgencyClass}`}
            >
              {urgency}
            </span>

            {isMine && <StatusBadge tone="mine" label="Benim" />}
            {isSaved && <StatusBadge tone="saved" label="Kayıtlı" />}
            {isInterested && (
              <StatusBadge tone="interested" label="İlgili" />
            )}
          </div>

          <h3 className="mt-1 break-words text-left text-[12.5px] font-black leading-[16px] tracking-[-0.025em] text-[#3A2208]">
            {post.title}
          </h3>

          <p className="mt-0.5 flex min-w-0 items-start gap-1 text-left text-[9.5px] font-bold leading-3 text-[#7C5A36]">
            <MapPin size={11} className="mt-px shrink-0" />
            <span className="min-w-0 break-words">
              {location || "Konum belirtilmedi"}
            </span>
          </p>
        </button>
      </div>

      <button
        type="button"
        onClick={onOpen}
        className="mt-1.5 grid w-full grid-cols-2 gap-x-2 gap-y-1 rounded-[12px] px-2 py-1.5 text-left"
        style={{
          backgroundColor: hasPortfolioIntent
            ? intentVisual.backgroundColor
            : categoryVisual.selectedBackgroundColor,
          border: `1px solid ${
            hasPortfolioIntent
              ? intentVisual.borderColor
              : categoryVisual.borderColor
          }`,
        }}
      >
        <span className="min-w-0 break-words text-[9.5px] font-black leading-3 text-[#EA580C]">
          {budget}
        </span>

        <span
          className={`min-w-0 break-words text-right text-[9.5px] font-black leading-3 ${
            remainingDanger ? "text-red-500" : "text-emerald-600"
          }`}
        >
          {remaining}
        </span>

        <span className="min-w-0 break-words text-[9px] font-bold leading-3 text-[#6F4E2B]">
          👤 {ownerName} · {ownerRole}
        </span>

        <span className="min-w-0 break-words text-right text-[9px] font-bold leading-3 text-[#7C5A36]">
          {createdDate} · {visibility}
        </span>
      </button>

      <div className="mt-1.5 flex min-w-0 items-center justify-between gap-2 rounded-[12px] border border-white/80 bg-white/88 px-1.5 py-1.5 shadow-[0_3px_10px_rgba(15,23,42,0.06)]">
        <div className="flex min-w-0 items-center gap-1">
          <span className="inline-flex h-7 items-center rounded-full bg-[#F8FBFF] px-2 text-[9px] font-black text-[#7C5A36]">
            👁 {post.viewCount || 0}
          </span>
          <span className="inline-flex h-7 items-center rounded-full bg-[#FFF8E8] px-2 text-[9px] font-black text-amber-700">
            ⭐ {post.followerCount || 0}
          </span>
          <span className="inline-flex h-7 items-center rounded-full bg-[#ECFDF5] px-2 text-[9px] font-black text-emerald-700">
            🤝 {post.requestCount || (isInterested ? 1 : 0)}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={onToggleSave}
            className={`flex h-8 w-8 items-center justify-center rounded-full border ${
              isSaved
                ? "border-[#EA580C] bg-[#FFF1E8] text-[#EA580C]"
                : "border-[#F6C98B] bg-[#FFFBF5] text-[#3A2208]"
            }`}
            aria-label={isSaved ? "Kaydı kaldır" : "Talebi kaydet"}
          >
            <Bookmark size={14} fill={isSaved ? "currentColor" : "none"} />
          </button>

          <button
            type="button"
            onClick={onOpen}
            className="inline-flex h-8 items-center justify-center rounded-full border border-[#DDE7F3] bg-[#FFF1D6] px-2.5 text-[9.5px] font-black text-[#EA580C]"
          >
            İncele
          </button>

          {canManage && (
            <>
              <button
                type="button"
                onClick={onEdit}
                className="flex h-8 items-center justify-center gap-1 rounded-full border border-orange-100 bg-blue-50 px-2 text-[9px] font-black text-[#EA580C]"
              >
                <Edit3 size={11} />
                Düzenle
              </button>

              <button
                type="button"
                onClick={onDelete}
                disabled={deleting}
                className="flex h-8 items-center justify-center gap-1 rounded-full border border-red-100 bg-red-50 px-2 text-[9px] font-black text-red-600 disabled:opacity-60"
              >
                {deleting ? (
                  <Loader2 size={11} className="animate-spin" />
                ) : (
                  <Trash2 size={11} />
                )}
                Sil
              </button>
            </>
          )}
        </div>
      </div>
    </article>
  );
}

function StatusBadge({
  label,
  tone,
}: {
  label: string;
  tone: "mine" | "saved" | "interested";
}) {
  const className =
    tone === "mine"
      ? "bg-orange-50 text-orange-700 border-orange-100"
      : tone === "saved"
        ? "bg-amber-50 text-amber-700 border-amber-100"
        : "bg-emerald-50 text-emerald-700 border-emerald-100";

  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 text-[9px] font-black leading-4 ${className}`}
    >
      {label}
    </span>
  );
}

function EmptyForumState({
  activeTab,
  onCreate,
}: {
  activeTab: PersonalTabKey;
  onCreate: () => void;
}) {
  const title =
    activeTab === "MINE"
      ? "Henüz talebiniz yok"
      : activeTab === "SAVED"
        ? "Kaydedilmiş talep yok"
        : activeTab === "INTERESTED"
          ? "İlgilendiğiniz talep yok"
          : "Talep bulunamadı";

  const text =
    activeTab === "MINE"
      ? "İlk talebinizi oluşturarak Talep Merkezi'nde görünür olun."
      : activeTab === "SAVED"
        ? "Beğendiğiniz talepleri kaydedip burada takip edebilirsiniz."
        : activeTab === "INTERESTED"
          ? "İlgilendiğiniz talepler burada listelenecek."
          : "Seçtiğin filtrelere uygun talep yok. Yeni bir talep oluşturarak ağı başlatabilirsin.";

  return (
    <div className="flex min-h-[300px] items-center justify-center p-5">
      <div className="mx-auto max-w-[300px] text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[24px] bg-[#FFF1E8] text-[#EA580C]">
          <Bell size={28} />
        </div>
        <h3 className="mt-4 text-center text-[20px] font-black tracking-[-0.04em] text-[#3A2208]">
          {title}
        </h3>
        <p className="mt-2 text-center text-[13px] font-bold leading-5 text-[#7C5A36]">
          {text}
        </p>
        <button
          type="button"
          onClick={onCreate}
          className="mt-4 inline-flex h-11 items-center justify-center rounded-[22px] bg-[#EA580C] px-5 text-[13px] font-black text-white"
        >
          Yeni Talep Oluştur
        </button>
      </div>
    </div>
  );
}

function topicFormToSchemaState(form: TopicForm): EPHSchemaState {
  return {
    category: form.category,
    requestIntent: form.requestIntent,
    propertyType: form.propertyType,
    areas: form.areas as unknown as string[],
    title: form.title,
    city: form.city,
    district: form.district,
    neighborhood: form.neighborhood,
    budget: form.budget,
    minArea: form.minArea,
    maxArea: form.maxArea,
    minRoom: form.minRoom,
    maxRoom: form.maxRoom,
    minBudget: form.minBudget,
    maxBudget: form.maxBudget,
    currency: form.currency,
    urgency: form.urgency,
    validFor: form.validFor,
    visibility: form.visibility,
    description: form.detail,
  };
}

function schemaStateToTopicForm(
  state: EPHSchemaState,
): TopicForm {
  const areas = normalizeForumAreas(state.areas);
  const primaryLocation =
    deriveLegacyLocationFields(areas);

  return {
    category: String(state.category || "") as ForumCategory | "",
    requestIntent: String(state.requestIntent || ""),
    propertyType: String(state.propertyType || ""),
    areas,
    title: String(state.title || ""),
    city:
      primaryLocation.city ||
      String(state.city || ""),
    district:
      primaryLocation.district ||
      String(state.district || ""),
    neighborhood:
      primaryLocation.neighborhood ||
      String(state.neighborhood || ""),
    budget: String(state.budget || ""),
    minArea: String(state.minArea || ""),
    maxArea: String(state.maxArea || ""),
    minRoom: String(state.minRoom || ""),
    maxRoom: String(state.maxRoom || ""),
    minBudget: String(state.minBudget || ""),
    maxBudget: String(state.maxBudget || ""),
    currency: String(state.currency || "TRY"),
    urgency: String(state.urgency || "Normal"),
    validFor: String(state.validFor || "7 gün"),
    visibility: String(state.visibility || "TUM_EPH"),
    detail: String(state.description || ""),
  };
}

function createRoleAwareForumSchema(
  categories: ForumCategoryOption[],
): EPHSchemaDefinition {
  return {
    ...forumRequestSchema,
    sections: forumRequestSchema.sections.map((section) => ({
      ...section,
      fields: section.fields.map((field) => {
        if (
          field.id === "forum-category-form" &&
          field.type === "single-select"
        ) {
          return {
            ...field,
            options: categories.map((category) => ({
              value: category.value,
              label: category.label,
              hint: category.hint,
              visual: FORUM_REQUEST_CATEGORY_OPTIONS.find(
                (option) => option.value === category.value,
              )?.visual,
            })),
          };
        }

        return field;
      }),
    })),
  };
}

function TopicModal({
  mode,
  initialForm,
  saving,
  categories,
  userRole,
  onClose,
  onSave,
}: {
  mode: "create" | "edit";
  initialForm: TopicForm;
  saving: boolean;
  categories: ForumCategoryOption[];
  userRole?: string | null;
  onClose: () => void;
  onSave: (form: TopicForm) => void;
}) {
  const [initialState] = useState<EPHSchemaState>(() =>
    topicFormToSchemaState(initialForm),
  );

  const schema = useMemo(
    () => createRoleAwareForumSchema(categories),
    [categories],
  );

  const role = normalizeRole(userRole);
  const subtitle =
    role === "ADMIN" || role === "SUPER_ADMIN"
      ? "Admin yetkisiyle tüm kategoriler açık."
      : "Rolünüze uygun alanları ortak EPH veri sistemiyle doldurun.";

  return (
    <SchemaFormEngine
      open
      schema={schema}
      value={initialState}
      title={mode === "edit" ? "Talebi Düzenle" : "Yeni Talep Oluştur"}
      subtitle={subtitle}
      submitLabel={mode === "edit" ? "Talebi Güncelle" : "Talebi Yayınla"}
      cancelLabel="Vazgeç"
      saving={saving}
      theme={{
        accent: "#EA580C",
        accentSoft: "#FFF0DC",
        accentText: "#9A3412",
        panel: "#FFF4E3",
        surfaceSoft: "#FFE4B8",
        border: "#F5A94A",
      }}
      onClose={onClose}
      onSubmit={(state) => onSave(schemaStateToTopicForm(state))}
    />
  );
}
