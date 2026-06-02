export const MAIN_CATEGORY_OPTIONS = [
  "KONUT",
  "İŞYERİ",
  "ARAZİ",
  "KONUT PROJELERİ",
  "TURİSTİK TESİS",
];

export const CATEGORY_OPTIONS: Record<string, string[]> = {
  KONUT: ["Daire", "Rezidans", "Villa", "Yazlık", "Müstakil Ev"],

  İŞYERİ: [
    "Fabrika & Üretim Tesisi",
    "Atölye",
    "Ticari İşletme",
    "Depo & Antrepo",
    "Dükkan & Mağaza",
    "Ofis",
  ],

  ARAZİ: ["Arsa", "Tarla", "Bağ", "Bahçe", "Zeytinlik"],

  "KONUT PROJELERİ": ["Daire", "Rezidans", "Villa"],

  "TURİSTİK TESİS": [
    "Otel",
    "Apart Otel",
    "Butik Otel",
    "Motel",
    "Pansiyon",
    "Kamp Yeri (Mocamp)",
    "Tatil Köyü",
    "Devre Mülk",
  ],
};

export const CATEGORY_TYPE_MAP: Record<string, Record<string, string>> = {
  KONUT: {
    Daire: "DAIRE",
    Rezidans: "REZIDANS",
    Villa: "VILLA",
    Yazlık: "YAZLIK",
    "Müstakil Ev": "MUSTAK_EV",
  },

  İŞYERİ: {
    "Fabrika & Üretim Tesisi": "FABRIKA_URETIM_TESISI",
    Atölye: "ATOLYE",
    "Ticari İşletme": "TICARI_ISLETME",
    "Depo & Antrepo": "DEPO_ANTREPO",
    "Dükkan & Mağaza": "DUKKAN_MAGAZA",
    Ofis: "OFIS_BURO",
  },

  ARAZİ: {
    Arsa: "ARSA",
    Tarla: "TARLA",
    Bağ: "BAG",
    Bahçe: "BAHCE",
    Zeytinlik: "ZEYTINLIK",
  },

  "KONUT PROJELERİ": {
    Daire: "KONUT_PROJESI",
    Rezidans: "REZIDANS_PROJESI",
    Villa: "VILLA_PROJESI",
  },

  "TURİSTİK TESİS": {
    Otel: "OTEL",
    "Apart Otel": "APART_OTEL",
    "Butik Otel": "BUTIK_OTEL",
    Motel: "MOTEL",
    Pansiyon: "PANSIYON",
    "Kamp Yeri (Mocamp)": "KAMP_YERI",
    "Tatil Köyü": "TATIL_KOYU",
    "Devre Mülk": "DEVRE_MULK",
  },
};

export const STATUS_LABELS: Record<string, string> = {
  SATILIK: "Satılık",
  KIRALIK: "Kiralık",
  GUNLUK_KIRALIK: "Günlük Kiralık",
  DEVREN_SATILIK: "Devren Satılık",
  DEVREN_KIRALIK: "Devren Kiralık",
  ON_SATIS: "Ön Satış",
  PROJE_ASAMASI: "Proje Aşaması",
  YAKINDA_SATISTA: "Yakında Satışta",
  INSAAT_HALINDE: "İnşaat Halinde",
  TESLIME_HAZIR: "Teslime Hazır",
  HEMEN_TESLIM: "Hemen Teslim",
  INSAAT_PROJESI: "İnşaat Projesi",
  KAT_KARSILIGI: "Kat Karşılığı",
  HASILAT_PAYLASIMLI: "Hasılat Paylaşımlı",
  REZERVE: "Rezerve",
  SATILDI: "Satıldı",
  KIRALANDII: "Kiralandı",
  PASIF: "Pasif",
};

export const STATUS_COLORS: Record<string, { color: string; bg: string; border: string; dot: string }> = {
  SATILIK: { color: "#067647", bg: "#ECFDF3", border: "#ABEFC6", dot: "#17B26A" },
  KIRALIK: { color: "#175CD3", bg: "#EFF8FF", border: "#B2DDFF", dot: "#2E90FA" },
  GUNLUK_KIRALIK: { color: "#175CD3", bg: "#EFF8FF", border: "#B2DDFF", dot: "#2E90FA" },
  DEVREN_SATILIK: { color: "#6941C6", bg: "#F4F3FF", border: "#D9D6FE", dot: "#7A5AF8" },
  DEVREN_KIRALIK: { color: "#6941C6", bg: "#F4F3FF", border: "#D9D6FE", dot: "#7A5AF8" },
  ON_SATIS: { color: "#B54708", bg: "#FFFAEB", border: "#FEDF89", dot: "#F79009" },
  PROJE_ASAMASI: { color: "#B54708", bg: "#FFFAEB", border: "#FEDF89", dot: "#F79009" },
  YAKINDA_SATISTA: { color: "#B54708", bg: "#FFFAEB", border: "#FEDF89", dot: "#F79009" },
  INSAAT_HALINDE: { color: "#B54708", bg: "#FFFAEB", border: "#FEDF89", dot: "#F79009" },
  TESLIME_HAZIR: { color: "#067647", bg: "#ECFDF3", border: "#ABEFC6", dot: "#17B26A" },
  HEMEN_TESLIM: { color: "#067647", bg: "#ECFDF3", border: "#ABEFC6", dot: "#17B26A" },
  INSAAT_PROJESI: { color: "#B54708", bg: "#FFFAEB", border: "#FEDF89", dot: "#F79009" },
  KAT_KARSILIGI: { color: "#B54708", bg: "#FFFAEB", border: "#FEDF89", dot: "#F79009" },
  HASILAT_PAYLASIMLI: { color: "#B54708", bg: "#FFFAEB", border: "#FEDF89", dot: "#F79009" },
  REZERVE: { color: "#93370D", bg: "#FFF6ED", border: "#FED7AA", dot: "#FB6514" },
  SATILDI: { color: "#344054", bg: "#F2F4F7", border: "#D0D5DD", dot: "#667085" },
  KIRALANDII: { color: "#344054", bg: "#F2F4F7", border: "#D0D5DD", dot: "#667085" },
  PASIF: { color: "#344054", bg: "#F2F4F7", border: "#D0D5DD", dot: "#667085" },
};

export const TYPE_LABELS: Record<string, string> = {
  DAIRE: "Daire",
  REZIDANS: "Rezidans",
  VILLA: "Villa",
  YAZLIK: "Yazlık",
  MUSTAK_EV: "Müstakil Ev",

  FABRIKA_URETIM_TESISI: "Fabrika & Üretim Tesisi",
  ATOLYE: "Atölye",
  TICARI_ISLETME: "Ticari İşletme",
  DEPO_ANTREPO: "Depo & Antrepo",
  DUKKAN_MAGAZA: "Dükkan & Mağaza",
  OFIS_BURO: "Ofis",

  ARSA: "Arsa",
  TARLA: "Tarla",
  BAG: "Bağ",
  BAHCE: "Bahçe",
  ZEYTINLIK: "Zeytinlik",

  KONUT_PROJESI: "Konut Projesi / Daire",
  REZIDANS_PROJESI: "Konut Projesi / Rezidans",
  VILLA_PROJESI: "Konut Projesi / Villa",

  OTEL: "Otel",
  APART_OTEL: "Apart Otel",
  BUTIK_OTEL: "Butik Otel",
  MOTEL: "Motel",
  PANSIYON: "Pansiyon",
  KAMP_YERI: "Kamp Yeri (Mocamp)",
  TATIL_KOYU: "Tatil Köyü",
  DEVRE_MULK: "Devre Mülk",
};

export const ROOM_COUNT_OPTIONS = [
  "1+0",
  "1+1",
  "2+0",
  "2+1",
  "3+1",
  "3+2",
  "4+1",
  "4+2",
  "5+1",
  "5+2",
  "6+1",
  "6+2",
  "6+3",
  "7+1",
  "7+2",
  "7+3",
  "7+4",
  "8+1",
  "8+2",
  "8+3",
  "8+4",
];

export const OFFICE_ROOM_COUNT_OPTIONS = ["1+0", "1+1", "2+1", "3+1", "4+1", "4+2"];

export const BUILDING_AGE_OPTIONS = [
  "0",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6-10 arası",
  "11-15 arası",
  "16-20 arası",
  "21-25 arası",
  "26-30 arası",
  "31 ve üzeri",
];

export const BUILDING_FLOOR_OPTIONS = [
  ...Array.from({ length: 20 }, (_, index) => String(index + 1)),
  "21+",
];

export const STATUS_GROUPS = [
  { label: "Satış", statuses: ["SATILIK", "DEVREN_SATILIK", "ON_SATIS", "YAKINDA_SATISTA", "HEMEN_TESLIM", "TESLIME_HAZIR"] },
  { label: "Proje", statuses: ["PROJE_ASAMASI", "INSAAT_HALINDE", "INSAAT_PROJESI", "KAT_KARSILIGI", "HASILAT_PAYLASIMLI"] },
  { label: "Kiralık", statuses: ["KIRALIK", "GUNLUK_KIRALIK", "DEVREN_KIRALIK"] },
  { label: "Diğer", statuses: ["REZERVE", "SATILDI", "KIRALANDII", "PASIF"] },
];

export const CITIES = ["Adana","Adıyaman","Afyonkarahisar","Ağrı","Amasya","Ankara","Antalya","Artvin","Aydın","Balıkesir","Bilecik","Bingöl","Bitlis","Bolu","Burdur","Bursa","Çanakkale","Çankırı","Çorum","Denizli","Diyarbakır","Edirne","Elazığ","Erzincan","Erzurum","Eskişehir","Gaziantep","Giresun","Gümüşhane","Hakkari","Hatay","Isparta","İçel","İstanbul","İzmir","Kars","Kastamonu","Kayseri","Kırklareli","Kırşehir","Kocaeli","Konya","Kütahya","Malatya","Manisa","Kahramanmaraş","Mardin","Muğla","Muş","Nevşehir","Niğde","Ordu","Rize","Sakarya","Samsun","Siirt","Sinop","Sivas","Tekirdağ","Tokat","Trabzon","Tunceli","Şanlıurfa","Uşak","Van","Yozgat","Zonguldak","Aksaray","Bayburt","Karaman","Kırıkkale","Batman","Şırnak","Bartın","Ardahan","Iğdır","Yalova","Karabük","Kilis","Osmaniye","Düzce"];
