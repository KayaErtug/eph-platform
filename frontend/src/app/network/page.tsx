"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Bookmark,
  ChevronDown,
  Edit3,
  Loader2,
  MapPin,
  Plus,
  Search,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

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
  visibility?: string | null;
  tags?: string[] | null;
  expiresAt?: string | null;
  createdAt?: string | null;
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

type TopicForm = {
  title: string;
  category: ForumCategory | "";
  requestIntent: string;
  city: string;
  district: string;
  budget: string;
  currency: string;
  detail: string;
  urgency: string;
  validFor: string;
  visibility: string;
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
  { key: "Tüm Talepler", label: "Tümü", countTone: "bg-blue-100 text-blue-700" },
  { key: "Portföy Arıyorum", label: "Portföy Arıyorum", countTone: "bg-emerald-100 text-emerald-700" },
  { key: "Kat Karşılığı Arsa Arıyorum", label: "Kat Karşılığı Arsa Arıyorum", countTone: "bg-orange-100 text-orange-700" },
  { key: "Bölgesel Satış Ofisi Arıyorum", label: "Bölgesel Satış Ofisi Arıyorum", countTone: "bg-violet-100 text-violet-700" },
  { key: "İş Ortağı Arıyorum", label: "İş Ortağı Arıyorum", countTone: "bg-blue-100 text-blue-700" },
  { key: "Yatırımcı Arıyorum", label: "Yatırımcı Arıyorum", countTone: "bg-amber-100 text-amber-700" },
  { key: "Sektörel İhtiyaçlar", label: "Sektörel İhtiyaçlar", countTone: "bg-purple-100 text-purple-700" },
  { key: "Duyuru", label: "Duyuru", countTone: "bg-red-100 text-red-700" },
  { key: "Diğer", label: "Diğer", countTone: "bg-slate-100 text-slate-700" },
] as const;

const PERSONAL_TABS: { key: PersonalTabKey; label: string; icon: string }[] = [
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
  EMLAKCI: ["PORTFOY_ARIYORUM", "KAT_KARSILIGI_ARSA_ARIYORUM", "SEKTOREL_IHTIYACLAR", "KAMPANYA_DUYURU"],
  MUTEAHHIT: ["BOLGESEL_SATIS_OFISI_ARIYORUM", "KAT_KARSILIGI_ARSA_ARIYORUM", "KAMPANYA_DUYURU", "SEKTOREL_IHTIYACLAR", "DIGER"],
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

const REQUEST_INTENT_OPTIONS = ["Tümü", "Kiralık Arıyorum", "Satılık Arıyorum", "Arıyorum"];
const CREATE_REQUEST_INTENT_OPTIONS = ["Kiralık Arıyorum", "Satılık Arıyorum", "Arıyorum"];
const VALID_OPTIONS = ["3 gün", "7 gün", "15 gün", "30 gün"];
const URGENCY_OPTIONS = ["Normal", "Acil", "Müşteri Hazır", "Sıcak Talep"];
const CURRENCY_OPTIONS = ["TRY", "USD", "EUR", "GBP"];

const VISIBILITY_OPTIONS = [
  { label: "Tüm EPH", value: "TUM_EPH" },
  { label: "Sadece emlakçılar", value: "SADECE_EMLAKCILAR" },
  { label: "Sadece müteahhitler / inşaat firmaları", value: "SADECE_MUTEAHHITLER" },
  { label: "Sadece bağlantılarım", value: "SADECE_BAGLANTILARIM" },
];

const CITY_OPTIONS = [
  "K.K.T.C.",
  "Adana",
  "Adıyaman",
  "Afyonkarahisar",
  "Ağrı",
  "Aksaray",
  "Amasya",
  "Ankara",
  "Antalya",
  "Aydın",
  "Balıkesir",
  "Bolu",
  "Bursa",
  "Çanakkale",
  "Denizli",
  "Diyarbakır",
  "Edirne",
  "Elazığ",
  "Erzurum",
  "Eskişehir",
  "Gaziantep",
  "Hatay",
  "İstanbul",
  "İzmir",
  "Kayseri",
  "Kocaeli",
  "Konya",
  "Kütahya",
  "Malatya",
  "Manisa",
  "Mardin",
  "Mersin",
  "Muğla",
  "Sakarya",
  "Samsun",
  "Tekirdağ",
  "Trabzon",
  "Van",
];

const DISTRICT_OPTIONS_BY_CITY: Record<string, string[]> = {
  "K.K.T.C.": ["Lefkoşa", "Girne", "Gazimağusa", "Güzelyurt", "İskele", "Lefke"],
  Denizli: ["Merkezefendi", "Pamukkale", "Acıpayam", "Buldan", "Çal", "Çameli", "Çardak", "Çivril", "Honaz", "Sarayköy", "Tavas"],
  İstanbul: ["Kadıköy", "Ataşehir", "Üsküdar", "Beşiktaş", "Şişli", "Bakırköy", "Beylikdüzü", "Esenyurt", "Sarıyer"],
  Ankara: ["Çankaya", "Keçiören", "Yenimahalle", "Etimesgut", "Mamak", "Gölbaşı", "Sincan"],
  İzmir: ["Konak", "Karşıyaka", "Bornova", "Buca", "Çiğli", "Bayraklı", "Urla"],
  Antalya: ["Muratpaşa", "Konyaaltı", "Kepez", "Alanya", "Manavgat", "Serik"],
};

const DEFAULT_FORM: TopicForm = {
  title: "",
  category: "",
  requestIntent: "",
  city: "",
  district: "",
  budget: "",
  currency: "TRY",
  detail: "",
  urgency: "Normal",
  validFor: "7 gün",
  visibility: "TUM_EPH",
};

function normalizeText(value?: string | null) {
  return String(value || "").toLocaleLowerCase("tr-TR").trim();
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
  if (raw.includes("MUTEAHHIT") || raw.includes("MUTEAHIT") || raw.includes("MUTAAHHIT")) return "MUTEAHHIT";
  if (raw.includes("EMLAK")) return "EMLAKCI";

  return raw || "EMLAKCI";
}

function getCategoryOption(value?: string | null) {
  const raw = String(value || "").trim();
  const byValue = ALL_CATEGORY_OPTIONS.find((item) => item.value === raw);

  if (byValue) return byValue;

  const text = normalizeText(raw);

  if (text.includes("portföy") || text.includes("portfoy")) return ALL_CATEGORY_OPTIONS[0];
  if (text.includes("kat") || text.includes("arsa")) return ALL_CATEGORY_OPTIONS[1];
  if (text.includes("satış") || text.includes("satis") || text.includes("ofis")) return ALL_CATEGORY_OPTIONS[2];
  if (text.includes("iş ortağı") || text.includes("is ortagi") || text.includes("ortak")) return ALL_CATEGORY_OPTIONS[3];
  if (text.includes("yatırım") || text.includes("yatirim")) return ALL_CATEGORY_OPTIONS[4];
  if (text.includes("sektör") || text.includes("sektor") || text.includes("ihtiyaç") || text.includes("ihtiyac")) return ALL_CATEGORY_OPTIONS[5];
  if (text.includes("duyuru") || text.includes("kampanya")) return ALL_CATEGORY_OPTIONS[7];

  return ALL_CATEGORY_OPTIONS[8];
}

function categoryLabel(value?: string | null) {
  return getCategoryOption(value).label;
}

function categoryFamily(value?: string | null) {
  const category = getCategoryOption(value).value;

  if (category === "PORTFOY_ARIYORUM") return "Portföy Arıyorum";
  if (category === "KAT_KARSILIGI_ARSA_ARIYORUM") return "Kat Karşılığı Arsa Arıyorum";
  if (category === "BOLGESEL_SATIS_OFISI_ARIYORUM") return "Bölgesel Satış Ofisi Arıyorum";
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
  const tag = (post.tags || []).find((item) => String(item || "").startsWith("Talep Türü:"));
  const value = String(tag || "").replace("Talep Türü:", "").trim();

  if (CREATE_REQUEST_INTENT_OPTIONS.includes(value)) return value;

  const text = normalizeText([post.title, post.description, ...(post.tags || [])].join(" "));

  if (text.includes("kiralık") || text.includes("kiralik")) return "Kiralık Arıyorum";
  if (text.includes("satılık") || text.includes("satilik")) return "Satılık Arıyorum";

  return "Arıyorum";
}

function postMatchesCategory(post: NetworkPost, filter: string) {
  if (filter === "Tüm Talepler") return true;

  return categoryFamily(post.type) === filter;
}

function postMatchesIntent(post: NetworkPost, filter: string) {
  if (filter === "Tümü") return true;

  return getRequestIntentFromPost(post) === filter;
}

function tabCount(posts: NetworkPost[], key: string) {
  if (key === "Tüm Talepler") return posts.length;

  return posts.filter((post) => categoryFamily(post.type) === key).length;
}

function formatMoney(value?: string | number | null, currency = "TRY") {
  if (value == null || value === "") return "";

  const numeric = typeof value === "number" ? value : Number(String(value).replace(/\D/g, ""));

  if (!numeric) return String(value);

  return `${numeric.toLocaleString("tr-TR")} ${currency === "TRY" ? "TL" : currency}`;
}

function formatBudgetInput(value: string) {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 13);

  if (!digits) return "";

  return Number(digits).toLocaleString("tr-TR");
}

function budgetCurrencyFromPost(post: NetworkPost) {
  const tag = (post.tags || []).find((item) => String(item || "").startsWith("Döviz:"));
  const currency = String(tag || "").replace("Döviz:", "").trim();

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

function isHotPost(post: NetworkPost) {
  const text = normalizeText([post.urgency, post.title, post.description].filter(Boolean).join(" "));

  return text.includes("acil") || text.includes("sıcak") || text.includes("sicak") || text.includes("hazır") || text.includes("hazir");
}

function getRoleCategories(role?: string | null) {
  const normalized = normalizeRole(role);
  const values = ROLE_CATEGORY_MAP[normalized] || ROLE_CATEGORY_MAP.EMLAKCI;

  return values
    .map((value) => ALL_CATEGORY_OPTIONS.find((item) => item.value === value))
    .filter(Boolean) as ForumCategoryOption[];
}

function getDistrictOptions(city: string) {
  return DISTRICT_OPTIONS_BY_CITY[city] || ["Merkez"];
}

function canManagePost(post: NetworkPost, user?: { id?: string | null; role?: string | null } | null) {
  const role = normalizeRole(user?.role);

  return Boolean(user?.id && (post.userId === user.id || role === "ADMIN" || role === "SUPER_ADMIN"));
}

function categoryBadgeClass(value?: string | null) {
  const family = categoryFamily(value);

  if (family === "Kat Karşılığı Arsa Arıyorum") return "border-orange-200 bg-orange-50 text-orange-600";
  if (family === "Portföy Arıyorum") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (family === "Bölgesel Satış Ofisi Arıyorum") return "border-violet-200 bg-violet-50 text-violet-700";
  if (family === "İş Ortağı Arıyorum") return "border-blue-200 bg-blue-50 text-blue-700";
  if (family === "Yatırımcı Arıyorum") return "border-amber-200 bg-amber-50 text-amber-700";
  if (family === "Sektörel İhtiyaçlar") return "border-purple-200 bg-purple-50 text-purple-700";
  if (family === "Duyuru") return "border-red-200 bg-red-50 text-red-600";

  return "border-slate-200 bg-slate-50 text-slate-700";
}

function formFromPost(post: NetworkPost): TopicForm {
  return {
    title: post.title || "",
    category: getCategoryOption(post.type).value,
    requestIntent: getRequestIntentFromPost(post),
    city: post.city || "",
    district: post.district || "",
    budget: post.budget ? formatBudgetInput(String(post.budget)) : "",
    currency: budgetCurrencyFromPost(post),
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

function MarqueeRow({ children, duration = 34 }: { children: ReactNode; duration?: number }) {
  return (
    <div className="talep-marquee-viewport overflow-hidden">
      <div className="talep-marquee-track flex w-max items-center gap-2" style={{ animationDuration: `${duration}s` }}>
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
  const [deletingId, setDeletingId] = useState("");
  const [flowFilter, setFlowFilter] = useState("Tüm Talepler");
  const [intentFilter, setIntentFilter] = useState("Tümü");
  const [personalFilter, setPersonalFilter] = useState<PersonalTabKey>("ALL");
  const [search, setSearch] = useState("");
  const [savedPostIds, setSavedPostIds] = useState<Set<string>>(new Set());
  const [interestedPostIds, setInterestedPostIds] = useState<Set<string>>(new Set());

  const roleCategories = useMemo(() => getRoleCategories(user?.role), [user?.role]);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const res = await api.get("/network/posts");
      setPosts(Array.isArray(res.data) ? res.data : []);
    } catch {
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  const syncPersonalStorage = () => {
    setSavedPostIds(readStoredPostIds("eph-saved-network-"));
    setInterestedPostIds(readStoredPostIds("eph-interested-network-"));
  };

  useEffect(() => {
    fetchPosts();
    syncPersonalStorage();
  }, []);

  const baseFilteredPosts = useMemo(() => {
    const keyword = normalizeText(search);

    return posts
      .filter((post) => postMatchesCategory(post, flowFilter))
      .filter((post) => postMatchesIntent(post, intentFilter))
      .filter((post) => {
        if (!keyword) return true;

        const haystack = normalizeText(
          [post.title, post.description, post.type, post.city, post.district, post.neighborhood, ...(post.tags || [])]
            .filter(Boolean)
            .join(" "),
        );

        return haystack.includes(keyword);
      })
      .sort((a, b) => {
        if (isHotPost(a) !== isHotPost(b)) return isHotPost(a) ? -1 : 1;

        return String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
      });
  }, [flowFilter, intentFilter, posts, search]);

  const filteredPosts = useMemo(() => {
    if (personalFilter === "MINE") {
      return baseFilteredPosts.filter((post) => user?.id && post.userId === user.id);
    }

    if (personalFilter === "SAVED") {
      return baseFilteredPosts.filter((post) => savedPostIds.has(post.id));
    }

    if (personalFilter === "INTERESTED") {
      return baseFilteredPosts.filter((post) => interestedPostIds.has(post.id));
    }

    return baseFilteredPosts;
  }, [baseFilteredPosts, interestedPostIds, personalFilter, savedPostIds, user?.id]);

  const mineCount = useMemo(() => posts.filter((post) => user?.id && post.userId === user.id).length, [posts, user?.id]);
  const savedCount = useMemo(() => posts.filter((post) => savedPostIds.has(post.id)).length, [posts, savedPostIds]);
  const interestedCount = useMemo(() => posts.filter((post) => interestedPostIds.has(post.id)).length, [posts, interestedPostIds]);

  const personalTabCounts: Record<PersonalTabKey, number> = {
    ALL: posts.length,
    MINE: mineCount,
    SAVED: savedCount,
    INTERESTED: interestedCount,
  };

  const saveTopic = async (form: TopicForm) => {
    if (!user?.id) {
      alert("Oturum bulunamadı. Lütfen tekrar giriş yapın.");
      router.push("/giris");
      return;
    }

    const allowedCategories = getRoleCategories(user.role);
    const selectedCategory = allowedCategories.find((item) => item.value === form.category);

    if (!selectedCategory) {
      alert("Bu rol ile seçilen kategoride talep oluşturamazsınız.");
      return;
    }

    if (!form.requestIntent) {
      alert("Lütfen talep türünü seçin.");
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
      form.budget ? `Döviz:${form.currency}` : "",
    ]
      .filter(Boolean)
      .slice(0, 8);

    const payload = {
      userId: user.id,
      type: selectedCategory.value,
      title: form.title.trim(),
      description: form.detail.trim(),
      city: form.city.trim() || null,
      district: form.district.trim() || null,
      neighborhood: null,
      budget: form.budget ? Number(form.budget.replace(/\D/g, "")) : null,
      urgency: form.urgency,
      visibility: form.visibility,
      tags,
      expiresAt: expiresAtFromValidFor(form.validFor),
    };

    try {
      setSaving(true);

      if (editingPost) {
        await api.patch(`/network/posts/${editingPost.id}`, payload);
      } else {
        await api.post("/network/posts", payload);
      }

      await fetchPosts();
      setModalOpen(false);
      setEditingPost(null);
    } catch (error: any) {
      alert(error?.response?.data?.message || "Talep kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePost = async (post: NetworkPost) => {
    if (!confirm("Bu talebi silmek istiyor musun?")) return;

    try {
      setDeletingId(post.id);
      await api.delete(`/network/posts/${post.id}`);
      setPosts((current) => current.filter((item) => item.id !== post.id));
      localStorage.removeItem(`eph-saved-network-${post.id}`);
      localStorage.removeItem(`eph-interested-network-${post.id}`);
      syncPersonalStorage();
    } catch (error: any) {
      alert(error?.response?.data?.message || "Talep silinemedi.");
    } finally {
      setDeletingId("");
    }
  };

  const handleToggleSave = (post: NetworkPost) => {
    const key = `eph-saved-network-${post.id}`;
    const next = !savedPostIds.has(post.id);

    localStorage.setItem(key, next ? "1" : "0");
    syncPersonalStorage();
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

  const metrics = [
    { id: "total", label: "Toplam Talep", value: posts.length, tone: "text-[#1557D6]" },
    { id: "mine", label: "Taleplerim", value: mineCount, tone: "text-orange-600" },
    { id: "saved", label: "Kaydettiklerim", value: savedCount, tone: "text-amber-600" },
    { id: "interested", label: "İlgilendiklerim", value: interestedCount, tone: "text-emerald-600" },
    { id: "portfoy", label: "Portföy Arıyorum", value: tabCount(posts, "Portföy Arıyorum"), tone: "text-emerald-600" },
    { id: "kat", label: "Kat Karşılığı", value: tabCount(posts, "Kat Karşılığı Arsa Arıyorum"), tone: "text-orange-600" },
    { id: "sektorel", label: "Sektörel İhtiyaçlar", value: tabCount(posts, "Sektörel İhtiyaçlar"), tone: "text-violet-600" },
  ];

  return (
    <main className="min-h-[calc(100dvh-64px)] bg-[#F4F8FF] px-2 pb-24 pt-2 text-[#06194A] sm:px-3">
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
          mask-image: linear-gradient(90deg, transparent 0%, black 6%, black 94%, transparent 100%);
          -webkit-mask-image: linear-gradient(90deg, transparent 0%, black 6%, black 94%, transparent 100%);
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

        @media (prefers-reduced-motion: reduce) {
          .talep-marquee-track {
            animation: none;
            overflow-x: auto;
            width: 100%;
          }
        }
      `}</style>

      <div className="mx-auto w-full max-w-[430px] space-y-3 overflow-hidden">
        <section className="rounded-[28px] border border-white bg-white/95 px-4 py-4 text-center shadow-[0_16px_44px_rgba(15,23,42,0.08)]">
          <h1 className="text-center text-[32px] font-black leading-none tracking-[-0.06em] text-[#06194A]">Talep Merkezi</h1>
          <p className="mx-auto mt-2 max-w-[330px] text-center text-[14px] font-extrabold leading-5 text-[#475569]">
            Elinizdekini değil, ihtiyacınızı paylaşın.
          </p>
          <span className="mx-auto mt-3 block h-1 w-10 rounded-full bg-[#1557D6]" />
        </section>

        <section className="rounded-[26px] border border-white bg-white/95 p-2 shadow-[0_14px_34px_rgba(15,23,42,0.075)]">
          <div className="grid grid-cols-4 gap-1.5">
            {PERSONAL_TABS.map((tab) => {
              const active = personalFilter === tab.key;

              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setPersonalFilter(tab.key)}
                  className={`min-h-[58px] rounded-[20px] border px-1.5 py-2 text-center transition active:scale-[0.98] ${
                    active ? "border-[#1557D6] bg-[#EFF6FF] text-[#1557D6]" : "border-[#E2EAF5] bg-white text-[#06194A]"
                  }`}
                >
                  <span className="block text-center text-[16px] leading-none">{tab.icon}</span>
                  <span className="mt-1 block text-center text-[9.5px] font-black leading-[11px]">{tab.label}</span>
                  <span className="mt-1 inline-flex min-w-[22px] justify-center rounded-full bg-white px-1.5 text-[10px] font-black text-[#1557D6]">
                    {personalTabCounts[tab.key]}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="-mx-2 overflow-hidden pl-2">
          <MarqueeRow duration={42}>
            {REQUEST_TABS.map((tab, index) => {
              const active = flowFilter === tab.key;

              return (
                <button
                  key={`request-tab-${tab.key}-${index}`}
                  type="button"
                  onClick={() => setFlowFilter(tab.key)}
                  className={`min-h-[148px] w-[104px] shrink-0 overflow-hidden rounded-[22px] border bg-white text-center shadow-[0_12px_30px_rgba(15,23,42,0.08)] transition active:scale-[0.98] ${
                    active ? "border-[#1557D6] ring-2 ring-blue-100" : "border-[#E2EAF5]"
                  }`}
                >
                  <div className="relative h-[72px] w-full overflow-hidden bg-[#EEF5FF]">
                    <Image
                      src={CATEGORY_IMAGES[tab.key] || CATEGORY_IMAGES["Tüm Talepler"]}
                      alt={tab.label}
                      fill
                      sizes="104px"
                      className="object-cover"
                    />
                  </div>
                  <div className="flex min-h-[52px] items-center justify-center px-1.5">
                    <p className="text-center text-[11.5px] font-black leading-[14px] tracking-[-0.02em] text-[#06194A]">{tab.label}</p>
                  </div>
                  <span className={`mx-auto inline-flex min-h-[24px] min-w-[34px] items-center justify-center rounded-full px-2 text-[13px] font-black ${tab.countTone}`}>
                    {tabCount(posts, tab.key)}
                  </span>
                </button>
              );
            })}
          </MarqueeRow>
        </section>

        <section className="rounded-[26px] border border-white bg-white/95 p-3 shadow-[0_14px_34px_rgba(15,23,42,0.075)]">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex h-12 min-w-0 flex-[1_1_100%] items-center gap-2 rounded-[24px] bg-[#F1F5FB] px-3">
              <Search size={18} className="shrink-0 text-[#64748B]" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="min-w-0 flex-1 bg-transparent text-left text-[13px] font-bold text-[#06194A] outline-none placeholder:text-[#94A3B8]"
                placeholder="Talep başlığı, şehir, ilçe..."
              />
            </div>

            <button
              type="button"
              className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-[22px] border border-[#DDE7F3] bg-white px-3 text-[12px] font-black text-[#06194A]"
            >
              <MapPin size={16} className="text-[#1557D6]" />
              Şehir
              <ChevronDown size={14} />
            </button>

            <button
              type="button"
              className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-[22px] border border-[#DDE7F3] bg-white px-3 text-[12px] font-black text-[#06194A]"
            >
              <SlidersHorizontal size={15} className="text-[#1557D6]" />
              Filtrele
            </button>
          </div>
        </section>

        <section className="rounded-[26px] border border-white bg-white/95 p-3 shadow-[0_14px_34px_rgba(15,23,42,0.075)]">
          <div className="flex items-center gap-2">
            <p className="w-[86px] shrink-0 text-center text-[13px] font-black leading-4 text-[#06194A]">Talep Türü</p>
            <select
              value={intentFilter}
              onChange={(event) => setIntentFilter(event.target.value)}
              className="h-11 min-w-0 flex-1 rounded-[18px] border border-[#1557D6] bg-white px-3 text-center text-[13px] font-black text-[#06194A] outline-none"
            >
              {REQUEST_INTENT_OPTIONS.map((item, index) => (
                <option key={`intent-filter-${item}-${index}`} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            {CREATE_REQUEST_INTENT_OPTIONS.map((item, index) => {
              const active = intentFilter === item;

              return (
                <button
                  key={`intent-button-${item}-${index}`}
                  type="button"
                  onClick={() => setIntentFilter(active ? "Tümü" : item)}
                  className={`flex h-11 items-center justify-center rounded-[18px] border px-2 text-center text-[11px] font-black leading-3 transition active:scale-[0.98] ${
                    active ? "border-[#1557D6] bg-[#EFF6FF] text-[#1557D6]" : "border-[#E2EAF5] bg-white text-[#06194A]"
                  }`}
                >
                  {item}
                </button>
              );
            })}
          </div>
        </section>

        <section className="-mx-2 overflow-hidden pl-2">
          <MarqueeRow duration={28}>
            {metrics.map((metric, index) => (
              <MetricBox key={`metric-${metric.id}-${index}`} label={metric.label} value={metric.value} tone={metric.tone} />
            ))}
          </MarqueeRow>
        </section>

        <section className="rounded-[26px] border border-white bg-white/95 p-3 shadow-[0_14px_34px_rgba(15,23,42,0.075)]">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1 text-center">
              <h2 className="text-center text-[22px] font-black tracking-[-0.04em] text-[#06194A]">
                {PERSONAL_TABS.find((item) => item.key === personalFilter)?.label || "Tüm Talepler"}
              </h2>
              <p className="text-center text-[11px] font-bold text-[#64748B]">{filteredPosts.length} talep listeleniyor</p>
            </div>

            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-[24px] bg-[#1557D6] px-4 text-[13px] font-black text-white shadow-[0_12px_26px_rgba(21,87,214,0.25)]"
            >
              <Plus size={18} />
              Yeni Talep
            </button>
          </div>
        </section>

        <section className="overflow-hidden rounded-[26px] border border-[#E2EAF5] bg-white shadow-[0_18px_44px_rgba(15,23,42,0.08)]">
          {loading ? (
            <div className="flex min-h-[320px] items-center justify-center">
              <div className="text-center">
                <Loader2 className="mx-auto animate-spin text-[#1557D6]" size={30} />
                <p className="mt-3 text-center text-[12px] font-black text-[#64748B]">Talep merkezi yükleniyor...</p>
              </div>
            </div>
          ) : filteredPosts.length === 0 ? (
            <EmptyForumState activeTab={personalFilter} onCreate={openCreateModal} />
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

      <button
        type="button"
        onClick={() => router.push("/lina")}
        className="fixed bottom-[84px] right-4 z-30 flex h-[76px] w-[76px] flex-col items-center justify-center rounded-full bg-gradient-to-br from-[#7C3AED] to-[#4F46E5] text-white shadow-[0_18px_38px_rgba(79,70,229,0.34)]"
      >
        <Sparkles size={25} fill="white" />
        <span className="mt-1 text-[13px] font-black">Lina</span>
      </button>

      {modalOpen && (
        <TopicModal
          mode={editingPost ? "edit" : "create"}
          initialForm={editingPost ? formFromPost(editingPost) : DEFAULT_FORM}
          saving={saving}
          categories={roleCategories}
          userRole={user?.role}
          onClose={() => {
            setModalOpen(false);
            setEditingPost(null);
          }}
          onSave={saveTopic}
        />
      )}
    </main>
  );
}

function MetricBox({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="min-h-[76px] w-[104px] shrink-0 rounded-[22px] border border-white bg-white px-1.5 py-3 text-center shadow-[0_12px_28px_rgba(15,23,42,0.07)]">
      <p className="text-center text-[8.5px] font-black uppercase leading-[12px] tracking-[-0.01em] text-[#06194A]">{label}</p>
      <p className={`mt-1 text-center text-[25px] font-black leading-none ${tone}`}>{value}</p>
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
  const location = [post.city, post.district].filter(Boolean).join(" / ");
  const budget = post.budget ? formatMoney(post.budget, budgetCurrencyFromPost(post)) : "Bütçe yok";
  const remaining = remainingTime(post.expiresAt);
  const remainingDanger = remaining.includes("3 gün") || remaining.includes("Süre doldu");
  const image = getCategoryImage(post.type);

  return (
    <article className="grid min-h-[146px] grid-cols-[82px_1fr_76px] gap-2 border-b border-[#E7EEF8] bg-white px-2.5 py-3 last:border-b-0">
      <button
        type="button"
        onClick={onOpen}
        className="relative mt-1 h-[72px] w-[82px] overflow-hidden rounded-[16px] bg-[#EEF5FF] shadow-[0_8px_18px_rgba(15,23,42,0.10)]"
      >
        <Image src={image} alt={category} fill sizes="82px" className="object-cover" />
      </button>

      <button type="button" onClick={onOpen} className="min-w-0 text-left">
        <div className="flex flex-wrap gap-1">
          <span className={`inline-flex max-w-full rounded-full border px-2 py-0.5 text-[9px] font-black uppercase leading-4 ${categoryBadgeClass(post.type)}`}>
            <span className="truncate">{category}</span>
          </span>

          {isMine && <StatusBadge tone="mine" label="Benim Talebim" />}
          {isSaved && <StatusBadge tone="saved" label="Kaydedildi" />}
          {isInterested && <StatusBadge tone="interested" label="İlgilenildi" />}
        </div>

        <h3 className="mt-1 line-clamp-2 text-left text-[14px] font-black leading-5 tracking-[-0.03em] text-[#06194A]">
          {post.title}
        </h3>

        <p className="mt-0.5 flex items-center gap-1 text-left text-[10.5px] font-bold text-[#64748B]">
          <MapPin size={12} />
          <span className="truncate">{location || "Konum belirtilmedi"}</span>
        </p>

        <div className="mt-1 flex flex-wrap items-center gap-2 text-[10.5px] font-black">
          <span className="text-[#1557D6]">{budget}</span>
          <span className={remainingDanger ? "text-red-500" : "text-emerald-600"}>• {remaining}</span>
        </div>

        <div className="mt-1 flex items-center gap-2 text-[10px] font-black text-[#64748B]">
          <span>👁 {Number(post.id.slice(0, 2).replace(/\D/g, "")) + 18 || 18}</span>
          <span>⭐ {isSaved ? 1 : 0}</span>
          <span>🤝 {isInterested ? 1 : 0}</span>
        </div>
      </button>

      <div className="flex flex-col items-end gap-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onToggleSave}
            className={`flex h-9 w-9 items-center justify-center rounded-full border ${
              isSaved ? "border-[#1557D6] bg-[#EFF6FF] text-[#1557D6]" : "border-[#E2EAF5] bg-white text-[#06194A]"
            }`}
          >
            <Bookmark size={17} fill={isSaved ? "currentColor" : "none"} />
          </button>

          <button
            type="button"
            onClick={onOpen}
            className="inline-flex h-9 min-w-[58px] items-center justify-center rounded-full border border-[#DDE7F3] bg-[#F4F8FF] px-2 text-[11px] font-black text-[#1557D6]"
          >
            İncele
          </button>
        </div>

        {canManage && (
          <div className="grid w-[72px] grid-cols-1 gap-1.5">
            <button
              type="button"
              onClick={onEdit}
              className="flex h-9 items-center justify-center gap-1 rounded-[14px] border border-blue-100 bg-blue-50 text-[10px] font-black text-[#1557D6]"
            >
              <Edit3 size={13} />
              Düzenle
            </button>

            <button
              type="button"
              onClick={onDelete}
              disabled={deleting}
              className="flex h-9 items-center justify-center gap-1 rounded-[14px] border border-red-100 bg-red-50 text-[10px] font-black text-red-600 disabled:opacity-60"
            >
              {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
              Sil
            </button>
          </div>
        )}
      </div>
    </article>
  );
}

function StatusBadge({ label, tone }: { label: string; tone: "mine" | "saved" | "interested" }) {
  const className =
    tone === "mine"
      ? "bg-orange-50 text-orange-700 border-orange-100"
      : tone === "saved"
        ? "bg-amber-50 text-amber-700 border-amber-100"
        : "bg-emerald-50 text-emerald-700 border-emerald-100";

  return <span className={`inline-flex rounded-full border px-2 py-0.5 text-[9px] font-black leading-4 ${className}`}>{label}</span>;
}

function EmptyForumState({ activeTab, onCreate }: { activeTab: PersonalTabKey; onCreate: () => void }) {
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
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[24px] bg-[#EFF6FF] text-[#1557D6]">
          <Bell size={28} />
        </div>
        <h3 className="mt-4 text-center text-[20px] font-black tracking-[-0.04em] text-[#06194A]">{title}</h3>
        <p className="mt-2 text-center text-[13px] font-bold leading-5 text-[#64748B]">{text}</p>
        <button
          type="button"
          onClick={onCreate}
          className="mt-4 inline-flex h-11 items-center justify-center rounded-[22px] bg-[#1557D6] px-5 text-[13px] font-black text-white"
        >
          Yeni Talep Oluştur
        </button>
      </div>
    </div>
  );
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
  const safeCategories = useMemo(() => {
    const roleBasedCategories = getRoleCategories(userRole);
    const incomingValues = new Set(categories.map((item) => item.value));
    const finalList = roleBasedCategories.filter((item) => incomingValues.has(item.value) || categories.length === 0);

    return finalList.length > 0 ? finalList : roleBasedCategories;
  }, [categories, userRole]);

  const correctedInitialForm = useMemo(() => {
    const allowed = safeCategories.some((item) => item.value === initialForm.category);

    return {
      ...initialForm,
      category: allowed ? initialForm.category : "",
    };
  }, [initialForm, safeCategories]);

  const [form, setForm] = useState<TopicForm>(correctedInitialForm);
  const districtOptions = useMemo(() => getDistrictOptions(form.city), [form.city]);
  const selectedCategory = safeCategories.find((item) => item.value === form.category);

  const updateForm = (patch: Partial<TopicForm>) => {
    setForm((current) => ({ ...current, ...patch }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#06194A]/38 px-2 pb-2 backdrop-blur-sm">
      <section className="max-h-[92dvh] w-full max-w-[430px] overflow-hidden rounded-[30px] border border-white bg-white shadow-[0_24px_70px_rgba(15,23,42,0.22)]">
        <div className="flex items-center justify-between border-b border-[#E2EAF5] px-4 py-3">
          <div className="min-w-0 flex-1 text-center">
            <h2 className="text-center text-[21px] font-black tracking-[-0.05em] text-[#06194A]">
              {mode === "edit" ? "Talebi Düzenle" : "Yeni Talep Oluştur"}
            </h2>
            <p className="text-center text-[11px] font-bold text-[#64748B]">
              {normalizeRole(userRole) === "ADMIN" || normalizeRole(userRole) === "SUPER_ADMIN"
                ? "Admin yetkisiyle tüm kategoriler açık."
                : "Sadece rolünüze uygun kategoriler gösteriliyor."}
            </p>
          </div>
          <button type="button" onClick={onClose} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F1F5FB] text-[#06194A]">
            <X size={20} />
          </button>
        </div>

        <div className="max-h-[calc(92dvh-78px)] space-y-3 overflow-y-auto px-4 py-4">
          <FieldLabel title="Talep Kategorisi" required />
          <div className="grid grid-cols-1 gap-2">
            {safeCategories.map((category, index) => {
              const active = form.category === category.value;

              return (
                <button
                  key={`modal-category-${category.value}-${index}`}
                  type="button"
                  onClick={() => updateForm({ category: category.value })}
                  className={`rounded-[20px] border p-3 text-left transition active:scale-[0.99] ${
                    active ? "border-[#1557D6] bg-[#EFF6FF]" : "border-[#E2EAF5] bg-white"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-[16px] bg-[#EEF5FF]">
                      <Image src={getCategoryImage(category.value)} alt={category.label} fill sizes="48px" className="object-cover" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-left text-[14px] font-black text-[#06194A]">{category.label}</span>
                      <span className="mt-0.5 block text-left text-[11px] font-bold leading-4 text-[#64748B]">{category.hint}</span>
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {selectedCategory && (
            <div className="rounded-[22px] border border-[#DDE7F3] bg-[#F8FBFF] p-3 text-center">
              <p className="text-center text-[12px] font-black text-[#1557D6]">{selectedCategory.label}</p>
              <p className="mt-1 text-center text-[11px] font-bold leading-4 text-[#64748B]">{selectedCategory.hint}</p>
            </div>
          )}

          <FieldLabel title="Talep Türü" required />
          <select
            value={form.requestIntent}
            onChange={(event) => updateForm({ requestIntent: event.target.value })}
            className="h-12 w-full rounded-[18px] border border-[#DDE7F3] bg-white px-3 text-[13px] font-black text-[#06194A] outline-none"
          >
            <option value="">Talep türü seçin</option>
            {CREATE_REQUEST_INTENT_OPTIONS.map((item, index) => (
              <option key={`modal-intent-${item}-${index}`} value={item}>
                {item}
              </option>
            ))}
          </select>

          <FieldLabel title="Talep Başlığı" required />
          <input
            value={form.title}
            onChange={(event) => updateForm({ title: event.target.value.slice(0, 80) })}
            className="h-12 w-full rounded-[18px] border border-[#DDE7F3] bg-white px-3 text-[13px] font-bold text-[#06194A] outline-none placeholder:text-[#94A3B8]"
            placeholder="Örn: Merkezefendi 3+1 daire arıyorum"
          />

          <div className="grid grid-cols-2 gap-2">
            <div>
              <FieldLabel title="İl" />
              <select
                value={form.city}
                onChange={(event) => updateForm({ city: event.target.value, district: "" })}
                className="h-12 w-full rounded-[18px] border border-[#DDE7F3] bg-white px-3 text-[13px] font-bold text-[#06194A] outline-none"
              >
                <option value="">İl seçin</option>
                {CITY_OPTIONS.map((city, index) => (
                  <option key={`city-${city}-${index}`} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <FieldLabel title="İlçe" />
              <select
                value={form.district}
                onChange={(event) => updateForm({ district: event.target.value })}
                className="h-12 w-full rounded-[18px] border border-[#DDE7F3] bg-white px-3 text-[13px] font-bold text-[#06194A] outline-none"
              >
                <option value="">İlçe seçin</option>
                {districtOptions.map((district, index) => (
                  <option key={`district-${district}-${index}`} value={district}>
                    {district}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-[1fr_92px] gap-2">
            <div>
              <FieldLabel title="Bütçe" />
              <input
                value={form.budget}
                onChange={(event) => updateForm({ budget: formatBudgetInput(event.target.value) })}
                className="h-12 w-full rounded-[18px] border border-[#DDE7F3] bg-white px-3 text-[13px] font-bold text-[#06194A] outline-none placeholder:text-[#94A3B8]"
                placeholder="9.000.000"
              />
            </div>

            <div>
              <FieldLabel title="Para" />
              <select
                value={form.currency}
                onChange={(event) => updateForm({ currency: event.target.value })}
                className="h-12 w-full rounded-[18px] border border-[#DDE7F3] bg-white px-3 text-[13px] font-bold text-[#06194A] outline-none"
              >
                {CURRENCY_OPTIONS.map((currency, index) => (
                  <option key={`currency-${currency}-${index}`} value={currency}>
                    {currency}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <FieldLabel title="Aciliyet" />
              <select
                value={form.urgency}
                onChange={(event) => updateForm({ urgency: event.target.value })}
                className="h-12 w-full rounded-[18px] border border-[#DDE7F3] bg-white px-3 text-[13px] font-bold text-[#06194A] outline-none"
              >
                {URGENCY_OPTIONS.map((item, index) => (
                  <option key={`urgency-${item}-${index}`} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <FieldLabel title="Süre" />
              <select
                value={form.validFor}
                onChange={(event) => updateForm({ validFor: event.target.value })}
                className="h-12 w-full rounded-[18px] border border-[#DDE7F3] bg-white px-3 text-[13px] font-bold text-[#06194A] outline-none"
              >
                {VALID_OPTIONS.map((item, index) => (
                  <option key={`valid-${item}-${index}`} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <FieldLabel title="Görünürlük" />
          <select
            value={form.visibility}
            onChange={(event) => updateForm({ visibility: event.target.value })}
            className="h-12 w-full rounded-[18px] border border-[#DDE7F3] bg-white px-3 text-[13px] font-bold text-[#06194A] outline-none"
          >
            {VISIBILITY_OPTIONS.map((item, index) => (
              <option key={`visibility-${item.value}-${index}`} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>

          <FieldLabel title="Açıklama" required />
          <textarea
            value={form.detail}
            onChange={(event) => updateForm({ detail: event.target.value.slice(0, 200) })}
            className="min-h-[110px] w-full resize-none rounded-[20px] border border-[#DDE7F3] bg-white px-3 py-3 text-[13px] font-bold leading-5 text-[#06194A] outline-none placeholder:text-[#94A3B8]"
            placeholder="Talebinizi kısa, net ve profesyonel şekilde yazın."
          />
          <p className="text-right text-[11px] font-bold text-[#64748B]">{form.detail.length}/200</p>

          <button
            type="button"
            disabled={saving}
            onClick={() => onSave(form)}
            className="flex h-13 min-h-[52px] w-full items-center justify-center rounded-[24px] bg-[#1557D6] px-5 text-[14px] font-black text-white shadow-[0_14px_30px_rgba(21,87,214,0.28)] disabled:opacity-70"
          >
            {saving ? <Loader2 size={20} className="animate-spin" /> : mode === "edit" ? "Talebi Güncelle" : "Talebi Yayınla"}
          </button>
        </div>
      </section>
    </div>
  );
}

function FieldLabel({ title, required = false }: { title: string; required?: boolean }) {
  return (
    <label className="mb-1 mt-1 block text-left text-[12px] font-black text-[#06194A]">
      {title}
      {required && <span className="text-red-500"> *</span>}
    </label>
  );
}