export type PortfolioFieldKey =
  | "roomCount"
  | "area"
  | "openArea"
  | "closedArea"
  | "bedCount"
  | "buildingAge"
  | "floor"
  | "totalFloors"
  | "adaNo"
  | "parselNo"
  | "number"
  | "price"
  | "description"
  | "availableCreditAmount";

export type PortfolioSpecialField = {
  key: string;
  label: string;
  options: string[];
  required?: boolean;
};

export type PortfolioFieldRule = {
  type: string;
  requiredFields: PortfolioFieldKey[];
  optionalFields: PortfolioFieldKey[];
  specialFields: PortfolioSpecialField[];
  note?: string;
};

export const VILLA_TYPE_OPTIONS = [
  "Tek Katlı Villa",
  "Dubleks Villa",
  "Tripleks Villa",
  "Fourplex Villa",
];

export const VILLA_LAYOUT_OPTIONS = [
  "Ayrık Nizam",
  "İkiz Villa",
  "Bitişik Nizam",
];

export const POOL_TYPE_OPTIONS = [
  "Havuz Yok",
  "Özel Havuz",
  "Ortak Havuz",
];

export const HOME_TYPE_OPTIONS = [
  "Tek Katlı Ev",
  "Dubleks Ev",
  "Tripleks Ev",
];

export const RURAL_BUILDING_TYPE_OPTIONS = [
  "Tek Katlı",
  "Dubleks",
  "Taş Ev",
  "Ahşap Ev",
  "Kerpiç Ev",
  "Bungalov",
  "Restore Edilmiş",
  "Restorasyon Gerekli",
];

export const YAZLIK_TYPE_OPTIONS = [
  "Yazlık Daire",
  "Yazlık Villa",
  "Yazlık Müstakil Ev",
  "Yazlık Rezidans",
];

export const ACCESS_SEASON_OPTIONS = [
  "Yaz-Kış Ulaşım",
  "Sadece Yaz Ulaşım",
];

export const BUILDING_USAGE_OPTIONS = [
  "Konut Ağırlıklı",
  "Ticari Ağırlıklı",
  "Karma Kullanım",
];

export const BUILDING_ORDER_OPTIONS = [
  "Ayrık Nizam",
  "Bitişik Nizam",
];

export const PLAZA_CLASS_OPTIONS = [
  "A Sınıfı",
  "B Sınıfı",
  "C Sınıfı",
];

export const STATION_TYPE_OPTIONS = [
  "Akaryakıt",
  "LPG",
  "Akaryakıt + LPG",
  "Dinlenme Tesisi",
];

export const LAND_ZONING_OPTIONS = [
  "Konut İmarlı",
  "Ticari İmarlı",
  "Sanayi İmarlı",
  "Villa İmarlı",
  "Turizm İmarlı",
];

export const FIELD_RULES: Record<string, PortfolioFieldRule> = {
  DAIRE: {
    type: "DAIRE",
    requiredFields: ["roomCount", "area", "buildingAge", "floor", "totalFloors", "price"],
    optionalFields: ["adaNo", "parselNo", "number", "description", "availableCreditAmount"],
    specialFields: [],
  },

  REZIDANS: {
    type: "REZIDANS",
    requiredFields: ["roomCount", "area", "buildingAge", "floor", "totalFloors", "price"],
    optionalFields: ["number", "description", "availableCreditAmount", "adaNo", "parselNo"],
    specialFields: [],
  },

  VILLA: {
    type: "VILLA",
    requiredFields: ["roomCount", "area", "buildingAge", "price"],
    optionalFields: ["number", "description", "availableCreditAmount", "adaNo", "parselNo"],
    specialFields: [
      { key: "villaType", label: "Villa Tipi", options: VILLA_TYPE_OPTIONS, required: true },
      { key: "layoutType", label: "Nizam Tipi", options: VILLA_LAYOUT_OPTIONS, required: true },
      { key: "poolType", label: "Havuz Tipi", options: POOL_TYPE_OPTIONS },
    ],
    note: "Villa için klasik kat sayısı yerine villa tipi kullanılır.",
  },

  YAZLIK: {
    type: "YAZLIK",
    requiredFields: ["roomCount", "area", "buildingAge", "price"],
    optionalFields: ["number", "description", "availableCreditAmount", "adaNo", "parselNo"],
    specialFields: [
      { key: "summerHouseType", label: "Yazlık Türü", options: YAZLIK_TYPE_OPTIONS, required: true },
      { key: "buildingStyle", label: "Yapı Tipi", options: HOME_TYPE_OPTIONS },
    ],
  },

  MUSTAK_EV: {
    type: "MUSTAK_EV",
    requiredFields: ["roomCount", "area", "buildingAge", "price"],
    optionalFields: ["number", "description", "availableCreditAmount", "adaNo", "parselNo"],
    specialFields: [
      { key: "homeType", label: "Ev Tipi", options: HOME_TYPE_OPTIONS, required: true },
      { key: "layoutType", label: "Nizam Tipi", options: BUILDING_ORDER_OPTIONS },
    ],
  },

  KOY_EVI: {
    type: "KOY_EVI",
    requiredFields: ["roomCount", "area", "price"],
    optionalFields: ["number", "description", "adaNo", "parselNo"],
    specialFields: [
      { key: "buildingStyle", label: "Yapı Tipi", options: RURAL_BUILDING_TYPE_OPTIONS, required: true },
    ],
  },

  DAG_EVI_YAYLA_EVI: {
    type: "DAG_EVI_YAYLA_EVI",
    requiredFields: ["roomCount", "area", "price"],
    optionalFields: ["number", "description", "adaNo", "parselNo"],
    specialFields: [
      { key: "buildingStyle", label: "Yapı Tipi", options: RURAL_BUILDING_TYPE_OPTIONS, required: true },
      { key: "accessSeason", label: "Ulaşım Durumu", options: ACCESS_SEASON_OPTIONS },
    ],
  },

  APARTMAN: {
    type: "APARTMAN",
    requiredFields: ["area", "buildingAge", "totalFloors", "price"],
    optionalFields: ["adaNo", "parselNo", "description"],
    specialFields: [
      { key: "buildingUsage", label: "Bina Tipi", options: ["Komple Apartman", "Apartman Bloğu"], required: true },
      { key: "layoutType", label: "Nizam Tipi", options: BUILDING_ORDER_OPTIONS },
    ],
  },

  KOMPLE_BINA: {
    type: "KOMPLE_BINA",
    requiredFields: ["area", "buildingAge", "totalFloors", "price"],
    optionalFields: ["adaNo", "parselNo", "description"],
    specialFields: [
      { key: "buildingUsage", label: "Bina Kullanım Tipi", options: BUILDING_USAGE_OPTIONS, required: true },
    ],
  },

  IS_HANI: {
    type: "IS_HANI",
    requiredFields: ["area", "totalFloors", "price"],
    optionalFields: ["description"],
    specialFields: [
      { key: "buildingUsage", label: "Bina Kullanım Tipi", options: ["İş Hanı", "Pasaj", "Ticari Blok"], required: true },
    ],
  },

  PLAZA_BINA: {
    type: "PLAZA_BINA",
    requiredFields: ["area", "totalFloors", "price"],
    optionalFields: ["description"],
    specialFields: [
      { key: "plazaClass", label: "Plaza Sınıfı", options: PLAZA_CLASS_OPTIONS, required: true },
    ],
  },

  REZIDANS_BINA: {
    type: "REZIDANS_BINA",
    requiredFields: ["area", "totalFloors", "price"],
    optionalFields: ["description"],
    specialFields: [
      { key: "buildingUsage", label: "Rezidans Bina Tipi", options: ["Komple Rezidans", "Rezidans Bloğu"], required: true },
    ],
  },

  OTEL_BINASI: {
    type: "OTEL_BINASI",
    requiredFields: ["roomCount", "area", "totalFloors", "price"],
    optionalFields: ["bedCount", "description"],
    specialFields: [
      { key: "hotelBuildingStatus", label: "Otel Bina Durumu", options: ["Faal Otel", "Boş Otel Binası", "Dönüşüme Uygun"], required: true },
    ],
  },

  FABRIKA_URETIM_TESISI: {
    type: "FABRIKA_URETIM_TESISI",
    requiredFields: ["area", "openArea", "price"],
    optionalFields: ["number", "description"],
    specialFields: [
      { key: "industrialBuildingType", label: "Sanayi Yapı Tipi", options: ["Fabrika", "Üretim Tesisi", "İmalathane"], required: true },
    ],
  },

  ATOLYE: {
    type: "ATOLYE",
    requiredFields: ["area", "price"],
    optionalFields: ["number", "description"],
    specialFields: [
      { key: "workshopType", label: "Atölye Tipi", options: ["Üretim Atölyesi", "Tamir Atölyesi", "Depolu Atölye"] },
    ],
  },

  TICARI_ISLETME: {
    type: "TICARI_ISLETME",
    requiredFields: ["area", "price"],
    optionalFields: ["number", "description"],
    specialFields: [
      { key: "businessType", label: "İşletme Tipi", options: ["Devren", "Aktif İşletme", "Boş Ticari Alan"] },
    ],
  },

  DEPO_ANTREPO: {
    type: "DEPO_ANTREPO",
    requiredFields: ["area", "price"],
    optionalFields: ["openArea", "number", "description"],
    specialFields: [
      { key: "warehouseType", label: "Depo Tipi", options: ["Depo", "Antrepo", "Soğuk Hava Deposu", "Lojistik Depo"] },
    ],
  },

  DUKKAN_MAGAZA: {
    type: "DUKKAN_MAGAZA",
    requiredFields: ["area", "price"],
    optionalFields: ["floor", "number", "description"],
    specialFields: [
      { key: "shopType", label: "Dükkan Tipi", options: ["Dükkan", "Mağaza", "Showroom", "Depolu Dükkan"] },
    ],
  },

  OFIS_BURO: {
    type: "OFIS_BURO",
    requiredFields: ["roomCount", "area", "floor", "price"],
    optionalFields: ["number", "description"],
    specialFields: [
      { key: "officeType", label: "Ofis Tipi", options: ["Büro", "Plaza Ofis", "Home Office", "Kat Ofisi"] },
    ],
  },

  BENZIN_ISTASYONU: {
    type: "BENZIN_ISTASYONU",
    requiredFields: ["area", "closedArea", "price"],
    optionalFields: ["description"],
    specialFields: [
      { key: "stationType", label: "İstasyon Tipi", options: STATION_TYPE_OPTIONS, required: true },
    ],
  },

  ARSA: {
    type: "ARSA",
    requiredFields: ["area", "adaNo", "parselNo", "price"],
    optionalFields: ["description"],
    specialFields: [
      { key: "zoningType", label: "İmar Durumu", options: LAND_ZONING_OPTIONS, required: true },
    ],
  },

  TARLA: {
    type: "TARLA",
    requiredFields: ["area", "adaNo", "parselNo", "price"],
    optionalFields: ["description"],
    specialFields: [
      { key: "fieldType", label: "Tarla Tipi", options: ["Sulu Tarla", "Kuru Tarla", "Ekili Tarla", "Boş Tarla"] },
    ],
  },

  BAG: {
    type: "BAG",
    requiredFields: ["area", "adaNo", "parselNo", "price"],
    optionalFields: ["description"],
    specialFields: [
      { key: "vineyardType", label: "Bağ Tipi", options: ["Üzüm Bağı", "Hobi Bağı", "Bağ Evi Olan"] },
    ],
  },

  BAHCE: {
    type: "BAHCE",
    requiredFields: ["area", "adaNo", "parselNo", "price"],
    optionalFields: ["description"],
    specialFields: [
      { key: "gardenType", label: "Bahçe Tipi", options: ["Meyve Bahçesi", "Hobi Bahçesi", "Sebze Bahçesi", "Karışık Bahçe"] },
    ],
  },

  ZEYTINLIK: {
    type: "ZEYTINLIK",
    requiredFields: ["area", "adaNo", "parselNo", "price"],
    optionalFields: ["description"],
    specialFields: [
      { key: "oliveGroveType", label: "Zeytinlik Tipi", options: ["Bakımlı Zeytinlik", "Genç Zeytinlik", "Verimli Zeytinlik"] },
    ],
  },

  KONUT_PROJESI: {
    type: "KONUT_PROJESI",
    requiredFields: ["area", "price"],
    optionalFields: ["roomCount", "description", "adaNo", "parselNo"],
    specialFields: [
      { key: "projectStatus", label: "Proje Durumu", options: ["Ön Satış", "İnşaat Halinde", "Teslime Hazır", "Hemen Teslim"] },
    ],
  },

  REZIDANS_PROJESI: {
    type: "REZIDANS_PROJESI",
    requiredFields: ["area", "price"],
    optionalFields: ["roomCount", "description", "adaNo", "parselNo"],
    specialFields: [
      { key: "projectStatus", label: "Proje Durumu", options: ["Ön Satış", "İnşaat Halinde", "Teslime Hazır", "Hemen Teslim"] },
    ],
  },

  VILLA_PROJESI: {
    type: "VILLA_PROJESI",
    requiredFields: ["area", "price"],
    optionalFields: ["roomCount", "description", "adaNo", "parselNo"],
    specialFields: [
      { key: "villaType", label: "Villa Tipleri", options: VILLA_TYPE_OPTIONS },
      { key: "layoutType", label: "Nizam Tipleri", options: VILLA_LAYOUT_OPTIONS },
    ],
  },

  OTEL: {
    type: "OTEL",
    requiredFields: ["roomCount", "bedCount", "area", "price"],
    optionalFields: ["description"],
    specialFields: [
      { key: "hotelSubType", label: "Otel Alt Tipi", options: ["Otel", "Apart Otel", "Butik Otel", "Motel", "Termal Otel"] },
    ],
  },

  PANSIYON: {
    type: "PANSIYON",
    requiredFields: ["roomCount", "bedCount", "area", "price"],
    optionalFields: ["description"],
    specialFields: [
      { key: "pensionType", label: "Pansiyon Tipi", options: ["Aile Pansiyonu", "Butik Pansiyon", "Apart Pansiyon"] },
    ],
  },

  KAMP_YERI: {
    type: "KAMP_YERI",
    requiredFields: ["openArea", "price"],
    optionalFields: ["description"],
    specialFields: [
      { key: "campType", label: "Kamp Tipi", options: ["Çadır Kampı", "Karavan Kampı", "Karma Kamp", "Glamping"] },
    ],
  },

  TATIL_KOYU: {
    type: "TATIL_KOYU",
    requiredFields: ["openArea", "closedArea", "roomCount", "price"],
    optionalFields: ["bedCount", "description"],
    specialFields: [
      { key: "resortType", label: "Tesis Tipi", options: ["Tatil Köyü", "Bungalov Tesisi", "Resort Tesis"] },
    ],
  },

  DEVRE_MULK: {
    type: "DEVRE_MULK",
    requiredFields: ["roomCount", "area", "price"],
    optionalFields: ["description"],
    specialFields: [
      { key: "periodType", label: "Dönem Tipi", options: ["Yaz Dönemi", "Kış Dönemi", "Bayram Dönemi", "Esnek Dönem"], required: true },
    ],
  },
};

export function getFieldRule(type: string) {
  return FIELD_RULES[type] || FIELD_RULES.DAIRE;
}

export function hasRequiredField(type: string, field: PortfolioFieldKey) {
  return getFieldRule(type).requiredFields.includes(field);
}

export function hasOptionalField(type: string, field: PortfolioFieldKey) {
  return getFieldRule(type).optionalFields.includes(field);
}

export function shouldShowField(type: string, field: PortfolioFieldKey) {
  const rule = getFieldRule(type);
  return rule.requiredFields.includes(field) || rule.optionalFields.includes(field);
}

export function getSpecialFields(type: string) {
  return getFieldRule(type).specialFields;
}