import {
  registerEPHSchema,
  type EPHSchemaDefinition,
  type EPHSchemaOption,
  type EPHSchemaOptionVisual,
  type EPHSchemaState,
} from "@/components/schema-engine";

export type ForumRequestCategory =
  | "PORTFOY_ARIYORUM"
  | "KAT_KARSILIGI_ARSA_ARIYORUM"
  | "BOLGESEL_SATIS_OFISI_ARIYORUM"
  | "IS_ORTAGI_ARIYORUM"
  | "YATIRIMCI_ARIYORUM"
  | "SEKTOREL_IHTIYACLAR"
  | "DUYURU"
  | "KAMPANYA_DUYURU"
  | "DIGER";

export type ForumRequestTypeCode =
  | "PORTFOY_KIRALIK"
  | "PORTFOY_SATILIK"
  | "ARSA_KONUT_PROJESI"
  | "ARSA_TICARI_PROJE"
  | "ARSA_KARMA_PROJE"
  | "ARSA_KENTSEL_DONUSUM"
  | "SATIS_OFISI_PROJE"
  | "SATIS_OFISI_BOLGESEL_PARTNER"
  | "SATIS_OFISI_TEK_YETKILI"
  | "SATIS_OFISI_BAYILIK_TEMSILCILIK"
  | "IS_ORTAGI_PORTFOY"
  | "IS_ORTAGI_PROJE"
  | "IS_ORTAGI_COZUM"
  | "IS_ORTAGI_YUKLENICI_TASERON"
  | "YATIRIMCI_ARSA"
  | "YATIRIMCI_PROJE"
  | "YATIRIMCI_FINANSMAN"
  | "YATIRIMCI_KURUMSAL"
  | "HIZMET_EKSPERTIZ"
  | "HIZMET_TAPU_HUKUK"
  | "HIZMET_FOTOGRAF_DRONE"
  | "HIZMET_MIMARLIK_MUHENDISLIK"
  | "HIZMET_REKLAM_PAZARLAMA"
  | "HIZMET_DIGER"
  | "DUYURU_GENEL"
  | "DUYURU_ETKINLIK_EGITIM"
  | "DUYURU_PLATFORM"
  | "DUYURU_BOLGESEL"
  | "KAMPANYA_LANSMAN"
  | "KAMPANYA_SATIS"
  | "KAMPANYA_FIYAT_GUNCELLEME"
  | "KAMPANYA_ETKINLIK_TANITIM"
  | "DIGER_GENEL_TALEP"
  | "DIGER_BILGI_DESTEK"
  | "DIGER_LISTE_DISI";

export type ForumRequestSortMode =
  | "NEWEST"
  | "EXPIRING"
  | "URGENT"
  | "POPULAR"
  | "BUDGET_ASC"
  | "BUDGET_DESC";


export const FORUM_REQUEST_CATEGORY_VISUALS: Record<
  ForumRequestCategory,
  EPHSchemaOptionVisual
> = {
  PORTFOY_ARIYORUM: {
    borderColor: "#2563EB",
    backgroundColor: "#EAF2FF",
    selectedBackgroundColor: "#D7E6FF",
    textColor: "#163C8C",
    accentColor: "#2563EB",
    borderWidth: 3,
    shadow: "0 8px 20px rgba(37, 99, 235, 0.22)",
  },
  KAT_KARSILIGI_ARSA_ARIYORUM: {
    borderColor: "#C026D3",
    backgroundColor: "#FDF2FF",
    selectedBackgroundColor: "#F5D9FB",
    textColor: "#7A1B80",
    accentColor: "#C026D3",
    borderWidth: 3,
    shadow: "0 8px 20px rgba(192, 38, 211, 0.22)",
  },
  BOLGESEL_SATIS_OFISI_ARIYORUM: {
    borderColor: "#EA580C",
    backgroundColor: "#FFF3E8",
    selectedBackgroundColor: "#FFE1C7",
    textColor: "#8A2C00",
    accentColor: "#EA580C",
    borderWidth: 3,
    shadow: "0 8px 20px rgba(234, 88, 12, 0.18)",
  },
  IS_ORTAGI_ARIYORUM: {
    borderColor: "#0F766E",
    backgroundColor: "#EAFBF8",
    selectedBackgroundColor: "#CFF3EC",
    textColor: "#0A4D48",
    accentColor: "#0F766E",
    borderWidth: 3,
    shadow: "0 8px 20px rgba(15, 118, 110, 0.18)",
  },
  YATIRIMCI_ARIYORUM: {
    borderColor: "#4338CA",
    backgroundColor: "#EEF0FF",
    selectedBackgroundColor: "#DCE1FF",
    textColor: "#2E278A",
    accentColor: "#4338CA",
    borderWidth: 3,
    shadow: "0 8px 20px rgba(67, 56, 202, 0.22)",
  },
  SEKTOREL_IHTIYACLAR: {
    borderColor: "#475569",
    backgroundColor: "#F1F5F9",
    selectedBackgroundColor: "#DCE5EE",
    textColor: "#263443",
    accentColor: "#475569",
    borderWidth: 3,
    shadow: "0 8px 18px rgba(71, 85, 105, 0.16)",
  },
  DUYURU: {
    borderColor: "#CA8A04",
    backgroundColor: "#FFF8DB",
    selectedBackgroundColor: "#FFED9E",
    textColor: "#6A4500",
    accentColor: "#CA8A04",
    borderWidth: 3,
    shadow: "0 8px 18px rgba(202, 138, 4, 0.18)",
  },
  KAMPANYA_DUYURU: {
    borderColor: "#E11D48",
    backgroundColor: "#FFF0F3",
    selectedBackgroundColor: "#FFD7E0",
    textColor: "#881337",
    accentColor: "#E11D48",
    borderWidth: 3,
    shadow: "0 8px 18px rgba(225, 29, 72, 0.18)",
  },
  DIGER: {
    borderColor: "#65A30D",
    backgroundColor: "#F7FEE7",
    selectedBackgroundColor: "#E6F7BC",
    textColor: "#3F6212",
    accentColor: "#65A30D",
    borderWidth: 3,
    shadow: "0 8px 18px rgba(101, 163, 13, 0.18)",
  },
};

export function getForumRequestCategoryVisual(
  category?: string | null,
): EPHSchemaOptionVisual {
  const key = String(category || "").trim() as ForumRequestCategory;

  return (
    FORUM_REQUEST_CATEGORY_VISUALS[key] ||
    FORUM_REQUEST_CATEGORY_VISUALS.DIGER
  );
}

export type ForumRequestFormState = EPHSchemaState & {
  category: ForumRequestCategory | "";
  requestIntent: string;
  title: string;
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
  urgency: string;
  validFor: string;
  visibility: string;
  description: string;
};

export type ForumRequestFilterState = EPHSchemaState & {
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
  sort: ForumRequestSortMode;
};

export const FORUM_REQUEST_CATEGORY_OPTIONS: EPHSchemaOption[] = [
  {
    value: "PORTFOY_ARIYORUM",
    visual: FORUM_REQUEST_CATEGORY_VISUALS.PORTFOY_ARIYORUM,
    label: "Portföy Arıyorum",
    hint: "Hazır müşteri veya talep için uygun portföy arayın.",
  },
  {
    value: "KAT_KARSILIGI_ARSA_ARIYORUM",
    visual: FORUM_REQUEST_CATEGORY_VISUALS.KAT_KARSILIGI_ARSA_ARIYORUM,
    label: "Kat Karşılığı Arsa Arıyorum",
    hint: "Arsa, müteahhit veya kat karşılığı geliştirme talebi açın.",
  },
  {
    value: "BOLGESEL_SATIS_OFISI_ARIYORUM",
    visual: FORUM_REQUEST_CATEGORY_VISUALS.BOLGESEL_SATIS_OFISI_ARIYORUM,
    label: "Bölgesel Satış Ofisi Arıyorum",
    hint: "Proje ya da portföy satışı için bölgesel satış ofisi arayın.",
  },
  {
    value: "IS_ORTAGI_ARIYORUM",
    visual: FORUM_REQUEST_CATEGORY_VISUALS.IS_ORTAGI_ARIYORUM,
    label: "İş Ortağı Arıyorum",
    hint: "Satış partneri, yüklenici veya çözüm ortağı arayın.",
  },
  {
    value: "YATIRIMCI_ARIYORUM",
    visual: FORUM_REQUEST_CATEGORY_VISUALS.YATIRIMCI_ARIYORUM,
    label: "Yatırımcı Arıyorum",
    hint: "Finansman, yatırım veya proje ortağı arayın.",
  },
  {
    value: "SEKTOREL_IHTIYACLAR",
    visual: FORUM_REQUEST_CATEGORY_VISUALS.SEKTOREL_IHTIYACLAR,
    label: "Sektörel İhtiyaçlar",
    hint: "Tapu, ekspertiz, fotoğraf, drone ve benzeri ihtiyaçları paylaşın.",
  },
  {
    value: "DUYURU",
    visual: FORUM_REQUEST_CATEGORY_VISUALS.DUYURU,
    label: "Duyuru",
    hint: "Sektörel veya platform odaklı kısa duyuru paylaşın.",
  },
  {
    value: "KAMPANYA_DUYURU",
    visual: FORUM_REQUEST_CATEGORY_VISUALS.KAMPANYA_DUYURU,
    label: "Kampanya ve Duyuru",
    hint: "Kampanya, lansman veya dönemsel bilgilendirme paylaşın.",
  },
  {
    value: "DIGER",
    visual: FORUM_REQUEST_CATEGORY_VISUALS.DIGER,
    label: "Diğer",
    hint: "Listede olmayan profesyonel ihtiyacınızı paylaşın.",
  },
];

const PORTFOLIO_RENTAL_VISUAL: EPHSchemaOptionVisual = {
  borderColor: "#94A3B8",
  backgroundColor: "#F8FAFC",
  selectedBackgroundColor: "#E2E8F0",
  textColor: "#334155",
  accentColor: "#A8B3C2",
  borderWidth: 3,
  shadow: "0 8px 20px rgba(100, 116, 139, 0.24)",
};

const PORTFOLIO_SALE_VISUAL: EPHSchemaOptionVisual = {
  borderColor: "#C9A227",
  backgroundColor: "#FFF9E6",
  selectedBackgroundColor: "#F8E7A6",
  textColor: "#6B4E00",
  accentColor: "#D4AF37",
  borderWidth: 3,
  shadow: "0 8px 20px rgba(201, 162, 39, 0.28)",
};

function createRequestTypeOption(
  value: ForumRequestTypeCode,
  label: string,
  hint: string,
  visual: EPHSchemaOptionVisual,
): EPHSchemaOption {
  return { value, label, hint, visual };
}

export const FORUM_REQUEST_TYPES_BY_CATEGORY: Record<
  ForumRequestCategory,
  EPHSchemaOption[]
> = {
  PORTFOY_ARIYORUM: [
    createRequestTypeOption("PORTFOY_KIRALIK", "Kiralık Portföy Arıyorum", "Kiralık müşteriniz için uygun portföy arayın.", PORTFOLIO_RENTAL_VISUAL),
    createRequestTypeOption("PORTFOY_SATILIK", "Satılık Portföy Arıyorum", "Satılık müşteriniz için uygun portföy arayın.", PORTFOLIO_SALE_VISUAL),
  ],
  KAT_KARSILIGI_ARSA_ARIYORUM: [
    createRequestTypeOption("ARSA_KONUT_PROJESI", "Konut Projesi İçin Arsa", "Konut geliştirmeye uygun kat karşılığı arsa arayın.", FORUM_REQUEST_CATEGORY_VISUALS.KAT_KARSILIGI_ARSA_ARIYORUM),
    createRequestTypeOption("ARSA_TICARI_PROJE", "Ticari Proje İçin Arsa", "Ofis, mağaza veya ticari proje geliştirmeye uygun arsa arayın.", FORUM_REQUEST_CATEGORY_VISUALS.KAT_KARSILIGI_ARSA_ARIYORUM),
    createRequestTypeOption("ARSA_KARMA_PROJE", "Karma Proje İçin Arsa", "Konut ve ticari birimleri birlikte içeren proje için arsa arayın.", FORUM_REQUEST_CATEGORY_VISUALS.KAT_KARSILIGI_ARSA_ARIYORUM),
    createRequestTypeOption("ARSA_KENTSEL_DONUSUM", "Kentsel Dönüşüm Projesi", "Dönüşüm veya yenileme projesi için uygun taşınmaz arayın.", FORUM_REQUEST_CATEGORY_VISUALS.KAT_KARSILIGI_ARSA_ARIYORUM),
  ],
  BOLGESEL_SATIS_OFISI_ARIYORUM: [
    createRequestTypeOption("SATIS_OFISI_PROJE", "Proje Satış Ofisi Arıyorum", "Projenizin satışını yönetecek profesyonel satış ofisi arayın.", FORUM_REQUEST_CATEGORY_VISUALS.BOLGESEL_SATIS_OFISI_ARIYORUM),
    createRequestTypeOption("SATIS_OFISI_BOLGESEL_PARTNER", "Bölgesel Satış Partneri Arıyorum", "Belirli bir bölgede satış ağı güçlü çözüm ortağı arayın.", FORUM_REQUEST_CATEGORY_VISUALS.BOLGESEL_SATIS_OFISI_ARIYORUM),
    createRequestTypeOption("SATIS_OFISI_TEK_YETKILI", "Tek Yetkili Satış Ofisi Arıyorum", "Projeniz için tek yetkili satış organizasyonu arayın.", FORUM_REQUEST_CATEGORY_VISUALS.BOLGESEL_SATIS_OFISI_ARIYORUM),
    createRequestTypeOption("SATIS_OFISI_BAYILIK_TEMSILCILIK", "Bayilik / Temsilcilik Arıyorum", "Markanız veya projeniz için bayilik ya da temsilcilik ağı kurun.", FORUM_REQUEST_CATEGORY_VISUALS.BOLGESEL_SATIS_OFISI_ARIYORUM),
  ],
  IS_ORTAGI_ARIYORUM: [
    createRequestTypeOption("IS_ORTAGI_PORTFOY", "Portföy Ortağı Arıyorum", "Portföy paylaşımı ve ortak satış için iş ortağı arayın.", FORUM_REQUEST_CATEGORY_VISUALS.IS_ORTAGI_ARIYORUM),
    createRequestTypeOption("IS_ORTAGI_PROJE", "Proje Ortağı Arıyorum", "Yeni veya devam eden proje için profesyonel ortak arayın.", FORUM_REQUEST_CATEGORY_VISUALS.IS_ORTAGI_ARIYORUM),
    createRequestTypeOption("IS_ORTAGI_COZUM", "Çözüm Ortağı Arıyorum", "Operasyonel veya teknik ihtiyacınız için çözüm ortağı arayın.", FORUM_REQUEST_CATEGORY_VISUALS.IS_ORTAGI_ARIYORUM),
    createRequestTypeOption("IS_ORTAGI_YUKLENICI_TASERON", "Yüklenici / Taşeron Arıyorum", "Uygulama, yapım veya saha işleri için yüklenici arayın.", FORUM_REQUEST_CATEGORY_VISUALS.IS_ORTAGI_ARIYORUM),
  ],
  YATIRIMCI_ARIYORUM: [
    createRequestTypeOption("YATIRIMCI_ARSA", "Arsa Yatırımcısı Arıyorum", "Arsa alımı veya geliştirmesi için yatırımcı arayın.", FORUM_REQUEST_CATEGORY_VISUALS.YATIRIMCI_ARIYORUM),
    createRequestTypeOption("YATIRIMCI_PROJE", "Proje Yatırımcısı Arıyorum", "Gayrimenkul projesi için yatırım ortağı arayın.", FORUM_REQUEST_CATEGORY_VISUALS.YATIRIMCI_ARIYORUM),
    createRequestTypeOption("YATIRIMCI_FINANSMAN", "Finansman Ortağı Arıyorum", "Projenizin finansman ihtiyacı için ortak arayın.", FORUM_REQUEST_CATEGORY_VISUALS.YATIRIMCI_ARIYORUM),
    createRequestTypeOption("YATIRIMCI_KURUMSAL", "Kurumsal Yatırımcı Arıyorum", "Fon, şirket veya kurumsal yatırımcı arayın.", FORUM_REQUEST_CATEGORY_VISUALS.YATIRIMCI_ARIYORUM),
  ],
  SEKTOREL_IHTIYACLAR: [
    createRequestTypeOption("HIZMET_EKSPERTIZ", "Ekspertiz Hizmeti", "Değerleme veya ekspertiz hizmeti arayın.", FORUM_REQUEST_CATEGORY_VISUALS.SEKTOREL_IHTIYACLAR),
    createRequestTypeOption("HIZMET_TAPU_HUKUK", "Tapu / Hukuk Hizmeti", "Tapu, sözleşme veya hukuki destek arayın.", FORUM_REQUEST_CATEGORY_VISUALS.SEKTOREL_IHTIYACLAR),
    createRequestTypeOption("HIZMET_FOTOGRAF_DRONE", "Fotoğraf / Drone Hizmeti", "Profesyonel çekim, video veya drone hizmeti arayın.", FORUM_REQUEST_CATEGORY_VISUALS.SEKTOREL_IHTIYACLAR),
    createRequestTypeOption("HIZMET_MIMARLIK_MUHENDISLIK", "Mimarlık / Mühendislik", "Proje, tasarım veya teknik danışmanlık hizmeti arayın.", FORUM_REQUEST_CATEGORY_VISUALS.SEKTOREL_IHTIYACLAR),
    createRequestTypeOption("HIZMET_REKLAM_PAZARLAMA", "Reklam / Pazarlama", "Tanıtım, dijital pazarlama veya reklam hizmeti arayın.", FORUM_REQUEST_CATEGORY_VISUALS.SEKTOREL_IHTIYACLAR),
    createRequestTypeOption("HIZMET_DIGER", "Diğer Hizmet", "Listede bulunmayan sektörel hizmet ihtiyacınızı paylaşın.", FORUM_REQUEST_CATEGORY_VISUALS.SEKTOREL_IHTIYACLAR),
  ],
  DUYURU: [
    createRequestTypeOption("DUYURU_GENEL", "Genel Duyuru", "EPH üyelerine yönelik genel bilgilendirme paylaşın.", FORUM_REQUEST_CATEGORY_VISUALS.DUYURU),
    createRequestTypeOption("DUYURU_ETKINLIK_EGITIM", "Etkinlik / Eğitim", "Etkinlik, seminer veya eğitim duyurusu paylaşın.", FORUM_REQUEST_CATEGORY_VISUALS.DUYURU),
    createRequestTypeOption("DUYURU_PLATFORM", "Platform Bilgilendirmesi", "EPH platformuyla ilgili bilgilendirme paylaşın.", FORUM_REQUEST_CATEGORY_VISUALS.DUYURU),
    createRequestTypeOption("DUYURU_BOLGESEL", "Bölgesel Duyuru", "Belirli bir il veya bölgeye yönelik duyuru paylaşın.", FORUM_REQUEST_CATEGORY_VISUALS.DUYURU),
  ],
  KAMPANYA_DUYURU: [
    createRequestTypeOption("KAMPANYA_LANSMAN", "Yeni Proje Lansmanı", "Yeni proje veya ürün lansmanınızı duyurun.", FORUM_REQUEST_CATEGORY_VISUALS.KAMPANYA_DUYURU),
    createRequestTypeOption("KAMPANYA_SATIS", "Satış Kampanyası", "Dönemsel satış kampanyanızı paylaşın.", FORUM_REQUEST_CATEGORY_VISUALS.KAMPANYA_DUYURU),
    createRequestTypeOption("KAMPANYA_FIYAT_GUNCELLEME", "Fiyat Güncellemesi", "Fiyat, ödeme planı veya ticari koşul güncellemesini duyurun.", FORUM_REQUEST_CATEGORY_VISUALS.KAMPANYA_DUYURU),
    createRequestTypeOption("KAMPANYA_ETKINLIK_TANITIM", "Etkinlik / Tanıtım", "Tanıtım günü, toplantı veya özel etkinliğinizi paylaşın.", FORUM_REQUEST_CATEGORY_VISUALS.KAMPANYA_DUYURU),
  ],
  DIGER: [
    createRequestTypeOption("DIGER_GENEL_TALEP", "Genel Talep", "Listede yer almayan genel profesyonel talebinizi paylaşın.", FORUM_REQUEST_CATEGORY_VISUALS.DIGER),
    createRequestTypeOption("DIGER_BILGI_DESTEK", "Bilgi / Destek Talebi", "Bilgi, yönlendirme veya profesyonel destek isteyin.", FORUM_REQUEST_CATEGORY_VISUALS.DIGER),
    createRequestTypeOption("DIGER_LISTE_DISI", "Listede Olmayan Diğer Talep", "Mevcut kategorilerde bulunmayan talebinizi paylaşın.", FORUM_REQUEST_CATEGORY_VISUALS.DIGER),
  ],
};

export const FORUM_ALL_REQUEST_TYPE_OPTIONS: EPHSchemaOption[] =
  Object.values(FORUM_REQUEST_TYPES_BY_CATEGORY).flat();

const FORUM_REQUEST_TYPE_ALIASES: Record<string, ForumRequestTypeCode> = {
  "kiralık arıyorum": "PORTFOY_KIRALIK",
  "kiralik ariyorum": "PORTFOY_KIRALIK",
  "kiralık portföy arıyorum": "PORTFOY_KIRALIK",
  "satılık arıyorum": "PORTFOY_SATILIK",
  "satilik ariyorum": "PORTFOY_SATILIK",
  "satılık portföy arıyorum": "PORTFOY_SATILIK",
};

export function getForumRequestTypeOptions(category?: string | null): EPHSchemaOption[] {
  return FORUM_REQUEST_TYPES_BY_CATEGORY[String(category || "") as ForumRequestCategory] || [];
}

export function normalizeForumRequestTypeCode(value?: string | null): string {
  const raw = String(value || "").trim();
  if (FORUM_ALL_REQUEST_TYPE_OPTIONS.some((option) => option.value === raw)) return raw;
  return FORUM_REQUEST_TYPE_ALIASES[raw.toLocaleLowerCase("tr-TR")] || raw;
}

export function getForumRequestTypeLabel(value?: string | null): string {
  const normalized = normalizeForumRequestTypeCode(value);
  return FORUM_ALL_REQUEST_TYPE_OPTIONS.find((option) => option.value === normalized)?.label || String(value || "").trim() || "Talep Türü Belirtilmedi";
}

export function getForumRequestIntentVisual(intent?: string | null): EPHSchemaOptionVisual {
  const normalized = normalizeForumRequestTypeCode(intent);
  return FORUM_ALL_REQUEST_TYPE_OPTIONS.find((option) => option.value === normalized)?.visual || FORUM_REQUEST_CATEGORY_VISUALS.DIGER;
}

export const FORUM_REQUEST_CURRENCY_OPTIONS: EPHSchemaOption[] = [
  { value: "TRY", label: "Türk Lirası (₺)" },
  { value: "USD", label: "Dolar ($)" },
  { value: "EUR", label: "Euro (€)" },
  { value: "GBP", label: "Sterlin (£)" },
];

export const FORUM_REQUEST_URGENCY_OPTIONS: EPHSchemaOption[] = [
  { value: "Normal", label: "Normal" },
  { value: "Acil", label: "Acil" },
  { value: "Müşteri Hazır", label: "Müşteri Hazır" },
  { value: "Sıcak Talep", label: "Sıcak Talep" },
];

export const FORUM_REQUEST_VALIDITY_OPTIONS: EPHSchemaOption[] = [
  { value: "3 gün", label: "3 Gün" },
  { value: "7 gün", label: "7 Gün" },
  { value: "15 gün", label: "15 Gün" },
  { value: "30 gün", label: "30 Gün" },
];

export const FORUM_REQUEST_VISIBILITY_OPTIONS: EPHSchemaOption[] = [
  { value: "TUM_EPH", label: "Tüm EPH" },
  { value: "SADECE_EMLAKCILAR", label: "Sadece Emlakçılar" },
  {
    value: "SADECE_MUTEAHHITLER",
    label: "Müteahhitler ve İnşaat Firmaları",
  },
  { value: "SADECE_BAGLANTILARIM", label: "Sadece Bağlantılarım" },
];

export const FORUM_REQUEST_OWNER_ROLE_OPTIONS: EPHSchemaOption[] = [
  { value: "EMLAKCI", label: "Emlakçı" },
  { value: "MUTEAHHIT", label: "Müteahhit" },
  { value: "INSAAT_FIRMASI", label: "İnşaat Firması" },
  { value: "ADMIN", label: "Admin" },
  { value: "SUPER_ADMIN", label: "Yazılım Ekibi" },
];

export const FORUM_REQUEST_DATE_OPTIONS: EPHSchemaOption[] = [
  { value: "TODAY", label: "Bugün Eklenenler" },
  { value: "LAST_7_DAYS", label: "Son 7 Gün" },
  { value: "LAST_30_DAYS", label: "Son 30 Gün" },
];

export const FORUM_REQUEST_EXPIRY_OPTIONS: EPHSchemaOption[] = [
  { value: "WITHIN_3_DAYS", label: "3 Gün İçinde Bitecek" },
  { value: "WITHIN_7_DAYS", label: "7 Gün İçinde Bitecek" },
  { value: "OVER_7_DAYS", label: "7 Günden Fazla Süresi Var" },
];

export const FORUM_REQUEST_SORT_OPTIONS: EPHSchemaOption[] = [
  { value: "NEWEST", label: "En Yeni Talepler" },
  { value: "EXPIRING", label: "Süresi En Yakın" },
  { value: "URGENT", label: "Acil ve Sıcak Talepler" },
  { value: "POPULAR", label: "En Çok İlgi Gören" },
  { value: "BUDGET_ASC", label: "Bütçe Düşükten Yükseğe" },
  { value: "BUDGET_DESC", label: "Bütçe Yüksekten Düşüğe" },
];

export const FORUM_ROLE_CATEGORY_MAP: Record<string, ForumRequestCategory[]> = {
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
  ADMIN: FORUM_REQUEST_CATEGORY_OPTIONS.map(
    (option) => option.value as ForumRequestCategory,
  ),
  SUPER_ADMIN: FORUM_REQUEST_CATEGORY_OPTIONS.map(
    (option) => option.value as ForumRequestCategory,
  ),
};

export function normalizeForumRole(role?: string | null) {
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
  ) {
    return "MUTEAHHIT";
  }
  if (raw.includes("EMLAK")) return "EMLAKCI";

  return raw || "EMLAKCI";
}

export function getForumCategoriesForRole(role?: string | null) {
  const allowed =
    FORUM_ROLE_CATEGORY_MAP[normalizeForumRole(role)] ||
    FORUM_ROLE_CATEGORY_MAP.EMLAKCI;

  return FORUM_REQUEST_CATEGORY_OPTIONS.filter((option) =>
    allowed.includes(option.value as ForumRequestCategory),
  );
}

export function createEmptyForumRequestFormState(): ForumRequestFormState {
  return {
    category: "",
    requestIntent: "",
    title: "",
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
    urgency: "Normal",
    validFor: "7 gün",
    visibility: "TUM_EPH",
    description: "",
  };
}

export function createEmptyForumRequestFilterState(): ForumRequestFilterState {
  return {
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
    sort: "URGENT",
  };
}

export const forumRequestSchema: EPHSchemaDefinition = {
  id: "eph.forum.request",
  version: 1,
  entity: "ForumRequest",
  title: "Forum Talebi",
  description:
    "Forum talep girişi, filtreleme, detay görüntüleme ve Lina analizi için ortak alan sözlüğü.",
  defaultStateByMode: {
    form: createEmptyForumRequestFormState(),
    filter: createEmptyForumRequestFilterState(),
    detail: createEmptyForumRequestFormState(),
    lina: createEmptyForumRequestFormState(),
  },
  sections: [
    {
      id: "identity",
      title: "Talep Bilgileri",
      order: 10,
      fields: [
        {
          id: "forum-category-form",
          key: "category",
          label: "Talep Kategorisi",
          type: "single-select",
          modes: ["form", "detail", "lina"],
          order: 10,
          options: FORUM_REQUEST_CATEGORY_OPTIONS,
          searchable: true,
          resetKeysOnChange: ["requestIntent"],
          validation: {
            required: true,
            message: "Lütfen talep kategorisini seçin.",
          },
          lina: {
            meaning: "Forum talebinin ana iş kategorisi",
            analyticsKey: "forum_request_category",
            entityPath: "forum.request.category",
            comparable: true,
            synonyms: ["talep kategorisi", "forum kategorisi", "iş talebi"],
          },
        },
        {
          id: "forum-categories-filter",
          key: "categories",
          label: "Kategori",
          type: "multi-select",
          modes: ["filter"],
          order: 11,
          options: FORUM_REQUEST_CATEGORY_OPTIONS,
          searchable: true,
        },
        {
          id: "forum-intent-form",
          key: "requestIntent",
          label: "Talep Türü",
          type: "single-select",
          modes: ["form", "detail", "lina"],
          order: 20,
          options: (state) =>
            getForumRequestTypeOptions(String(state.category || "")),
          validation: {
            required: true,
            message: "Lütfen talep türünü seçin.",
            validate: (value, state) => {
              const category = String(state.category || "");
              const normalizedValue = normalizeForumRequestTypeCode(String(value || ""));
              const allowed = getForumRequestTypeOptions(category).some((option) => option.value === normalizedValue);
              return allowed ? null : "Seçilen talep türü bu kategoriyle uyumlu değil.";
            },
          },
          lina: {
            meaning: "Forum kategorisi içindeki yapılandırılmış alt talep türü",
            analyticsKey: "forum_request_intent",
            entityPath: "forum.request.intent",
            comparable: true,
            synonyms: ["talep türü", "alt kategori", "işlem amacı"],
          },
        },
        {
          id: "forum-intents-filter",
          key: "intents",
          label: "Talep Türü",
          type: "multi-select",
          modes: ["filter"],
          order: 21,
          options: FORUM_ALL_REQUEST_TYPE_OPTIONS,
        },
        {
          id: "forum-title",
          key: "title",
          label: "Talep Başlığı",
          type: "text",
          modes: ["form", "detail", "lina"],
          order: 30,
          placeholder: "Örn: Merkezefendi 3+1 daire arıyorum",
          validation: {
            required: true,
            maxLength: 50,
          },
          lina: {
            meaning: "Forum talebinin kısa ve kullanıcı tarafından yazılmış başlığı",
            analyticsKey: "forum_request_title",
            entityPath: "forum.request.title",
            searchable: true,
            comparable: false,
          },
        },
      ],
    },
    {
      id: "criteria",
      title: "Arama Kriterleri",
      description:
        "Kategori ve tür seçildikten sonra aranan portföy kriterlerini belirtin.",
      order: 15,
      fields: [
        {
          id: "forum-min-area",
          key: "minArea",
          label: "Minimum m²",
          type: "number",
          modes: ["form", "detail"],
          order: 10,
          placeholder: "Örn: 90",
          hidden: (state) =>
            String(state.category || "") !== "PORTFOY_ARIYORUM" ||
            !String(state.requestIntent || ""),
        },
        {
          id: "forum-max-area",
          key: "maxArea",
          label: "Maksimum m²",
          type: "number",
          modes: ["form", "detail"],
          order: 20,
          placeholder: "Örn: 160",
          hidden: (state) =>
            String(state.category || "") !== "PORTFOY_ARIYORUM" ||
            !String(state.requestIntent || ""),
        },
        {
          id: "forum-min-room",
          key: "minRoom",
          label: "Minimum Oda Sayısı",
          type: "number",
          modes: ["form", "detail"],
          order: 30,
          placeholder: "Örn: 2",
          hidden: (state) =>
            String(state.category || "") !== "PORTFOY_ARIYORUM" ||
            !String(state.requestIntent || ""),
        },
        {
          id: "forum-max-room",
          key: "maxRoom",
          label: "Maksimum Oda Sayısı",
          type: "number",
          modes: ["form", "detail"],
          order: 40,
          placeholder: "Örn: 4",
          hidden: (state) =>
            String(state.category || "") !== "PORTFOY_ARIYORUM" ||
            !String(state.requestIntent || ""),
        },
        {
          id: "forum-min-budget",
          key: "minBudget",
          label: "Minimum Bütçe (₺)",
          type: "number",
          modes: ["form", "detail"],
          order: 50,
          placeholder: "Örn: 2000000",
          hidden: (state) =>
            String(state.category || "") !== "PORTFOY_ARIYORUM" ||
            !String(state.requestIntent || ""),
        },
        {
          id: "forum-max-budget",
          key: "maxBudget",
          label: "Maksimum Bütçe (₺)",
          type: "number",
          modes: ["form", "detail"],
          order: 60,
          placeholder: "Örn: 5000000",
          hidden: (state) =>
            String(state.category || "") !== "PORTFOY_ARIYORUM" ||
            !String(state.requestIntent || ""),
        },
      ],
    },
    {
      id: "location",
      title: "Adres",
      description: "İl, ilçe ve mahalle alanları ortak konum sözlüğünü kullanır.",
      order: 20,
      fields: [
        {
          id: "forum-location-form",
          key: "areas",
          label: "Konum (çoklu il / ilçe / mahalle)",
          type: "location-multi",
          modes: ["form"],
          order: 5,
          areasKey: "areas",
          showNeighborhood: true,
        },
        {
          id: "forum-location-filter",
          key: "location",
          label: "Konum",
          type: "location",
          modes: ["filter"],
          order: 10,
          cityKey: "cities",
          districtKey: "districts",
          neighborhoodKey: "neighborhoods",
          multipleInFilter: true,
          showNeighborhood: true,
        },
        {
          id: "forum-city",
          key: "city",
          label: "İl",
          type: "text",
          modes: ["detail", "lina"],
          order: 20,
          lina: {
            meaning: "Talebin hedeflendiği ana şehir",
            analyticsKey: "target_city",
            entityPath: "forum.request.location.city",
            comparable: true,
            synonyms: ["şehir", "il", "hedef il"],
          },
        },
        {
          id: "forum-district",
          key: "district",
          label: "İlçe",
          type: "text",
          modes: ["detail", "lina"],
          order: 30,
          lina: {
            meaning: "Talebin hedeflendiği ilçe",
            analyticsKey: "target_district",
            entityPath: "forum.request.location.district",
            comparable: true,
            synonyms: ["ilçe", "hedef ilçe"],
          },
        },
        {
          id: "forum-neighborhood",
          key: "neighborhood",
          label: "Mahalle",
          type: "text",
          modes: ["detail", "lina"],
          order: 40,
          lina: {
            meaning: "Talebin hedeflendiği mahalle, köy veya belde",
            analyticsKey: "target_neighborhood",
            entityPath: "forum.request.location.neighborhood",
            comparable: true,
            synonyms: ["mahalle", "köy", "belde", "mevki"],
          },
        },
      ],
    },
    {
      id: "budget",
      title: "Bütçe",
      order: 30,
      fields: [
        {
          id: "forum-budget-form",
          key: "budget",
          label: "Bütçe",
          type: "money",
          modes: ["form", "detail", "lina"],
          order: 10,
          currencyKey: "currency",
          currencies: FORUM_REQUEST_CURRENCY_OPTIONS,
          lina: {
            meaning: "Talep için belirtilen hedef bütçe",
            analyticsKey: "target_budget",
            entityPath: "forum.request.budget.amount",
            comparable: true,
            unit: "currency",
            synonyms: ["fiyat", "bütçe", "hedef fiyat"],
          },
        },
        {
          id: "forum-budget-filter",
          key: "budgetRange",
          label: "Bütçe Aralığı",
          type: "range",
          modes: ["filter"],
          order: 11,
          minKey: "minBudget",
          maxKey: "maxBudget",
          minPlaceholder: "Minimum",
          maxPlaceholder: "Maksimum",
          inputMode: "numeric",
        },
        {
          id: "forum-currency-form",
          key: "currency",
          label: "Para Birimi",
          type: "single-select",
          modes: ["form", "detail", "lina"],
          order: 20,
          options: FORUM_REQUEST_CURRENCY_OPTIONS,
          defaultValue: "TRY",
          lina: {
            meaning: "Bütçenin para birimi",
            analyticsKey: "target_currency",
            entityPath: "forum.request.budget.currency",
            comparable: true,
          },
        },
        {
          id: "forum-currencies-filter",
          key: "currencies",
          label: "Para Birimi",
          type: "multi-select",
          modes: ["filter"],
          order: 21,
          options: FORUM_REQUEST_CURRENCY_OPTIONS,
        },
      ],
    },
    {
      id: "publication",
      title: "Yayın Bilgileri",
      order: 40,
      fields: [
        {
          id: "forum-urgency-form",
          key: "urgency",
          label: "Aciliyet",
          type: "single-select",
          modes: ["form", "detail", "lina"],
          order: 10,
          options: FORUM_REQUEST_URGENCY_OPTIONS,
          defaultValue: "Normal",
          lina: {
            meaning: "Talebin işlem önceliği ve aciliyet seviyesi",
            analyticsKey: "request_urgency",
            entityPath: "forum.request.urgency",
            comparable: true,
            synonyms: ["acil", "sıcak talep", "müşteri hazır"],
          },
        },
        {
          id: "forum-urgencies-filter",
          key: "urgencies",
          label: "Aciliyet",
          type: "multi-select",
          modes: ["filter"],
          order: 11,
          options: FORUM_REQUEST_URGENCY_OPTIONS,
        },
        {
          id: "forum-validity-form",
          key: "validFor",
          label: "Yayın Süresi",
          type: "single-select",
          modes: ["form", "detail", "lina"],
          order: 20,
          options: FORUM_REQUEST_VALIDITY_OPTIONS,
          defaultValue: "7 gün",
          lina: {
            meaning: "Talebin platformda aktif kalacağı süre",
            analyticsKey: "request_validity",
            entityPath: "forum.request.validity",
            comparable: false,
          },
        },
        {
          id: "forum-expiry-filter",
          key: "expiryRanges",
          label: "Kalan Süre",
          type: "multi-select",
          modes: ["filter"],
          order: 21,
          options: FORUM_REQUEST_EXPIRY_OPTIONS,
        },
        {
          id: "forum-visibility-form",
          key: "visibility",
          label: "Görünürlük",
          type: "single-select",
          modes: ["form", "detail", "lina"],
          order: 30,
          options: FORUM_REQUEST_VISIBILITY_OPTIONS,
          defaultValue: "TUM_EPH",
          lina: {
            meaning: "Forum talebini görebilecek kullanıcı kitlesi",
            analyticsKey: "request_visibility",
            entityPath: "forum.request.visibility",
            comparable: false,
          },
        },
        {
          id: "forum-visibilities-filter",
          key: "visibilities",
          label: "Görünürlük",
          type: "multi-select",
          modes: ["filter"],
          order: 31,
          options: FORUM_REQUEST_VISIBILITY_OPTIONS,
        },
        {
          id: "forum-owner-roles-filter",
          key: "ownerRoles",
          label: "Paylaşan Rolü",
          type: "multi-select",
          modes: ["filter"],
          order: 40,
          options: FORUM_REQUEST_OWNER_ROLE_OPTIONS,
        },
        {
          id: "forum-created-filter",
          key: "dateRanges",
          label: "Yayın Tarihi",
          type: "multi-select",
          modes: ["filter"],
          order: 50,
          options: FORUM_REQUEST_DATE_OPTIONS,
        },
        {
          id: "forum-sort-filter",
          key: "sort",
          label: "Sıralama",
          type: "single-select",
          modes: ["filter"],
          order: 60,
          options: FORUM_REQUEST_SORT_OPTIONS,
          defaultValue: "URGENT",
        },
      ],
    },
    {
      id: "description",
      title: "Açıklama",
      order: 50,
      fields: [
        {
          id: "forum-description",
          key: "description",
          label: "Açıklama",
          type: "textarea",
          modes: ["form", "detail", "lina"],
          order: 10,
          placeholder: "Talebinizi kısa, net ve profesyonel şekilde yazın.",
          validation: {
            required: true,
            minLength: 12,
            maxLength: 200,
          },
          lina: {
            meaning: "Talebin serbest metin ayrıntıları",
            analyticsKey: "forum_request_description",
            entityPath: "forum.request.description",
            searchable: true,
            comparable: false,
          },
        },
      ],
    },
  ],
};

registerEPHSchema(forumRequestSchema);
