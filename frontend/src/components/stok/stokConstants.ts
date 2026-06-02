export const MAIN_CATEGORY_OPTIONS = [
  "Konut",
  "İş Yeri",
  "Arazi",
  "Konut Projesi",
  "Bina",
  "Devre Mülk",
  "Turistik Tesis",
  "Özel Portföy",
];

export const CATEGORY_OPTIONS: Record<string, string[]> = {
  Konut: [
    "Daire",
    "Villa",
    "Müstakil Ev",
    "Rezidans",
    "Loft",
    "Penthouse",
    "Tiny House",
    "Bungalov",
    "Yalı",
    "Konak",
  ],

  "İş Yeri": [
    "Dükkan",
    "Ofis",
    "Plaza Ofisi",
    "Showroom",
    "Depo",
    "Fabrika",
    "Akaryakıt İstasyonu",
    "Restoran",
    "Kafe",
  ],

  Arazi: [
    "Arsa",
    "Tarla",
    "Bahçe",
    "Bağ",
    "Zeytinlik",
    "Meyve Bahçesi",
    "Sera",
    "Çiftlik",
  ],

  "Konut Projesi": [
    "Konut Projesi",
    "Villa Projesi",
    "Rezidans Projesi",
    "Karma Proje",
  ],

  Bina: [
    "Komple Bina",
    "Apartman",
    "İş Merkezi",
  ],

  "Devre Mülk": [
    "Devre Mülk",
  ],

  "Turistik Tesis": [
    "Otel",
    "Apart Otel",
    "Pansiyon",
    "Turistik Tesis",
  ],

  "Özel Portföy": [
    "Özel Portföy",
  ],
};

export const STATUS_LABELS: Record<string, string> = {
  SATILIK: "Satılık",
  KIRALIK: "Kiralık",
  GUNLUK_KIRALIK: "Günlük Kiralık",
  DEVREN_SATILIK: "Devren Satılık",
  DEVREN_KIRALIK: "Devren Kiralık",
  ON_SATIS: "Ön Satış",
  PROJE_ASAMASI: "Proje Aşaması",
  INSAAT_HALINDE: "İnşaat Halinde",
  TESLIME_HAZIR: "Teslime Hazır",
  REZERVE: "Rezerve",
  SATILDI: "Satıldı",
  KIRALANDI: "Kiralandı",
  PASIF: "Pasif",
};

export const STATUS_COLORS: Record<
  string,
  { color: string; bg: string; border: string; dot: string }
> = {
  SATILIK: {
    color: "#067647",
    bg: "#ECFDF3",
    border: "#ABEFC6",
    dot: "#17B26A",
  },

  KIRALIK: {
    color: "#175CD3",
    bg: "#EFF8FF",
    border: "#B2DDFF",
    dot: "#2E90FA",
  },

  GUNLUK_KIRALIK: {
    color: "#175CD3",
    bg: "#EFF8FF",
    border: "#B2DDFF",
    dot: "#2E90FA",
  },

  DEVREN_SATILIK: {
    color: "#6941C6",
    bg: "#F4F3FF",
    border: "#D9D6FE",
    dot: "#7A5AF8",
  },

  DEVREN_KIRALIK: {
    color: "#6941C6",
    bg: "#F4F3FF",
    border: "#D9D6FE",
    dot: "#7A5AF8",
  },

  ON_SATIS: {
    color: "#B54708",
    bg: "#FFFAEB",
    border: "#FEDF89",
    dot: "#F79009",
  },

  PROJE_ASAMASI: {
    color: "#B54708",
    bg: "#FFFAEB",
    border: "#FEDF89",
    dot: "#F79009",
  },

  INSAAT_HALINDE: {
    color: "#B54708",
    bg: "#FFFAEB",
    border: "#FEDF89",
    dot: "#F79009",
  },

  TESLIME_HAZIR: {
    color: "#067647",
    bg: "#ECFDF3",
    border: "#ABEFC6",
    dot: "#17B26A",
  },

  REZERVE: {
    color: "#93370D",
    bg: "#FFF6ED",
    border: "#FED7AA",
    dot: "#FB6514",
  },

  SATILDI: {
    color: "#344054",
    bg: "#F2F4F7",
    border: "#D0D5DD",
    dot: "#667085",
  },

  KIRALANDI: {
    color: "#344054",
    bg: "#F2F4F7",
    border: "#D0D5DD",
    dot: "#667085",
  },

  PASIF: {
    color: "#344054",
    bg: "#F2F4F7",
    border: "#D0D5DD",
    dot: "#667085",
  },
};

export const TYPE_LABELS: Record<string, string> = {
  DAIRE: "Daire",
  VILLA: "Villa",
  MUSTAKIL_EV: "Müstakil Ev",
  REZIDANS: "Rezidans",
  LOFT: "Loft",
  PENTHOUSE: "Penthouse",
  TINY_HOUSE: "Tiny House",
  BUNGALOV: "Bungalov",
  YALI: "Yalı",
  KONAK: "Konak",

  DUKKAN: "Dükkan",
  OFIS: "Ofis",
  PLAZA_OFISI: "Plaza Ofisi",
  SHOWROOM: "Showroom",
  DEPO: "Depo",
  FABRIKA: "Fabrika",
  AKARYAKIT_ISTASYONU: "Akaryakıt İstasyonu",
  RESTORAN: "Restoran",
  KAFE: "Kafe",

  ARSA: "Arsa",
  TARLA: "Tarla",
  BAHCE: "Bahçe",
  BAG: "Bağ",
  ZEYTINLIK: "Zeytinlik",
  MEYVE_BAHCESI: "Meyve Bahçesi",
  SERA: "Sera",
  CIFTLIK: "Çiftlik",

  KONUT_PROJESI: "Konut Projesi",
  VILLA_PROJESI: "Villa Projesi",
  REZIDANS_PROJESI: "Rezidans Projesi",
  KARMA_PROJE: "Karma Proje",

  KOMPLE_BINA: "Komple Bina",
  APARTMAN: "Apartman",
  IS_MERKEZI: "İş Merkezi",

  DEVRE_MULK: "Devre Mülk",

  OTEL: "Otel",
  APART_OTEL: "Apart Otel",
  PANSIYON: "Pansiyon",
  TURISTIK_TESIS: "Turistik Tesis",

  OZEL_PORTFOY: "Özel Portföy",
};

export const ROOM_COUNT_OPTIONS = [
  "1+0",
  "1+1",
  "2+1",
  "3+1",
  "4+1",
  "4+2",
  "5+1",
  "5+2",
  "6+1",
  "6+2",
  "Loft",
  "Penthouse",
];

export const STATUS_GROUPS = [
  {
    label: "Satış",
    statuses: ["SATILIK", "DEVREN_SATILIK", "ON_SATIS"],
  },
  {
    label: "Kiralık",
    statuses: ["KIRALIK", "GUNLUK_KIRALIK", "DEVREN_KIRALIK"],
  },
  {
    label: "Proje",
    statuses: ["PROJE_ASAMASI", "INSAAT_HALINDE", "TESLIME_HAZIR"],
  },
  {
    label: "Diğer",
    statuses: ["REZERVE", "SATILDI", "KIRALANDI", "PASIF"],
  },
];

export const CITIES = [
  "Adana",
  "Ankara",
  "Antalya",
  "Aydın",
  "Balıkesir",
  "Bursa",
  "Denizli",
  "Eskişehir",
  "Gaziantep",
  "Hatay",
  "İstanbul",
  "İzmir",
  "Kayseri",
  "Kocaeli",
  "Konya",
  "Manisa",
  "Mersin",
  "Muğla",
  "Sakarya",
  "Samsun",
  "Tekirdağ",
  "Trabzon",
];