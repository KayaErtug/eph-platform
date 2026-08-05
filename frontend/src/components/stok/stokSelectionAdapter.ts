import {
  STOK_SELECTION_TREE,
  type StokMainCategoryKey,
  type StokSelectionMainCategory,
  type StokSelectionSubCategory,
} from "./stokSelectionTree";

export type SelectionSpecialField = {
  key: string;
  label: string;
  options: string[];
  required?: boolean;
};

export type SelectionFieldRule = {
  type: string;
  requiredFields: string[];
  optionalFields: string[];
  specialFields: SelectionSpecialField[];
  note?: string;
};

const FORM_MAIN_CATEGORY_KEYS: StokMainCategoryKey[] = [
  "KONUT",
  "BINA",
  "IS_YERI",
  "ARAZI",
  "KONUT_PROJELERI",
  "TURISTIK_TESIS",
];

const MAIN_CATEGORY_FORM_LABELS: Record<StokMainCategoryKey, string> = {
  KONUT: "KONUT",
  BINA: "BİNA",
  IS_YERI: "İŞYERİ",
  ARAZI: "ARAZİ",
  KONUT_PROJELERI: "KONUT PROJELERİ",
  TURISTIK_TESIS: "TURİSTİK TESİS",
  DEVRE_MULK: "DEVRE MÜLK",
  OZEL_PORTFOY: "ÖZEL PORTFÖY",
};

const SUBCATEGORY_FORM_LABEL_OVERRIDES: Record<string, string> = {
  FABRIKA_URETIM_TESISI: "Fabrika & Üretim Tesisi",
  DEPO_ANTREPO: "Depo & Antrepo",
  DUKKAN_MAGAZA: "Dükkan & Mağaza",
  OFIS_BURO: "Ofis",
  KONUT_PROJESI: "Daire",
  REZIDANS_PROJESI: "Rezidans",
  VILLA_PROJESI: "Villa",
};

const TYPE_LABEL_OVERRIDES: Record<string, string> = {
  FABRIKA_URETIM_TESISI: "Fabrika & Üretim Tesisi",
  DEPO_ANTREPO: "Depo & Antrepo",
  DUKKAN_MAGAZA: "Dükkan & Mağaza",
  OFIS_BURO: "Ofis",
  KONUT_PROJESI: "Konut Projesi / Daire",
  REZIDANS_PROJESI: "Konut Projesi / Rezidans",
  VILLA_PROJESI: "Konut Projesi / Villa",
};

const LEVEL_FIELD_KEYS_BY_TYPE: Record<
  string,
  { level1?: string; level2?: string; level3?: string }
> = {
  VILLA: { level1: "villaType", level2: "layoutType", level3: "poolType" },
  YAZLIK: { level1: "summerHouseType", level2: "buildingStyle" },
  MUSTAK_EV: { level1: "homeType", level2: "layoutType" },
  KOY_EVI: { level1: "buildingStyle" },
  DAG_EVI_YAYLA_EVI: { level1: "buildingStyle", level2: "accessSeason" },
  APARTMAN: { level1: "buildingUsage", level2: "layoutType" },
  KOMPLE_BINA: { level1: "buildingUsage" },
  IS_HANI: { level1: "buildingUsage" },
  PLAZA_BINA: { level1: "plazaClass" },
  REZIDANS_BINA: { level1: "buildingUsage" },
  OTEL_BINASI: { level1: "hotelBuildingStatus" },
  FABRIKA_URETIM_TESISI: { level1: "industrialBuildingType" },
  ATOLYE: { level1: "workshopType" },
  TICARI_ISLETME: { level1: "businessType" },
  DEPO_ANTREPO: { level1: "warehouseType" },
  DUKKAN_MAGAZA: { level1: "shopType" },
  OFIS_BURO: { level1: "officeType" },
  BENZIN_ISTASYONU: { level1: "stationType" },
  ARSA: { level1: "zoningType" },
  TARLA: { level1: "fieldType" },
  BAG: { level1: "vineyardType" },
  BAHCE: { level1: "gardenType" },
  ZEYTINLIK: { level1: "oliveGroveType" },
  KONUT_PROJESI: { level2: "projectStatus" },
  REZIDANS_PROJESI: { level2: "projectStatus" },
  VILLA_PROJESI: { level1: "villaType", level2: "layoutType", level3: "projectStatus" },
  OTEL: { level1: "hotelSubType" },
  PANSIYON: { level1: "pensionType" },
  KAMP_YERI: { level1: "campType" },
  TATIL_KOYU: { level1: "resortType" },
  DEVRE_MULK: { level1: "periodType" },
};

const REQUIRED_SPECIAL_FIELDS = new Set([
  "VILLA:villaType",
  "VILLA:layoutType",
  "YAZLIK:summerHouseType",
  "MUSTAK_EV:homeType",
  "KOY_EVI:buildingStyle",
  "DAG_EVI_YAYLA_EVI:buildingStyle",
  "APARTMAN:buildingUsage",
  "KOMPLE_BINA:buildingUsage",
  "IS_HANI:buildingUsage",
  "PLAZA_BINA:plazaClass",
  "REZIDANS_BINA:buildingUsage",
  "OTEL_BINASI:hotelBuildingStatus",
  "FABRIKA_URETIM_TESISI:industrialBuildingType",
  "BENZIN_ISTASYONU:stationType",
  "ARSA:zoningType",
  "DEVRE_MULK:periodType",
]);

const SPECIAL_FIELD_LABELS: Record<string, string> = {
  villaType: "Villa Tipi",
  layoutType: "Nizam Tipi",
  poolType: "Havuz Tipi",
  summerHouseType: "Yazlık Türü",
  buildingStyle: "Yapı Tipi",
  homeType: "Ev Tipi",
  accessSeason: "Ulaşım Durumu",
  buildingUsage: "Bina Kullanım Tipi",
  plazaClass: "Plaza Sınıfı",
  hotelBuildingStatus: "Otel Bina Durumu",
  industrialBuildingType: "Sanayi Yapı Tipi",
  workshopType: "Atölye Tipi",
  businessType: "İşletme Tipi",
  warehouseType: "Depo Tipi",
  shopType: "Dükkan Tipi",
  officeType: "Ofis Tipi",
  stationType: "İstasyon Tipi",
  zoningType: "İmar Durumu",
  fieldType: "Tarla Tipi",
  vineyardType: "Bağ Tipi",
  gardenType: "Bahçe Tipi",
  oliveGroveType: "Zeytinlik Tipi",
  projectStatus: "Proje Durumu",
  hotelSubType: "Otel Alt Tipi",
  pensionType: "Pansiyon Tipi",
  campType: "Kamp Tipi",
  resortType: "Tesis Tipi",
  periodType: "Dönem Tipi",
};

const SPECIAL_FIELD_OPTION_FALLBACKS: Record<string, string[]> = {
  poolType: ["Havuz Yok", "Özel Havuz", "Ortak Havuz"],
  buildingStyle: ["Tek Katlı Ev", "Dubleks Ev", "Tripleks Ev"],
  layoutType: ["Ayrık Nizam", "Bitişik Nizam"],
  accessSeason: ["Yaz-Kış Ulaşım", "Sadece Yaz Ulaşım"],
  projectStatus: ["Ön Satış", "İnşaat Halinde", "Teslime Hazır", "Hemen Teslim"],
};

const FEATURE_TAG_GROUPS: Record<string, string[]> = {
  konut: ["interior", "exterior", "location", "transport", "front", "view"],
  apartment: ["accessibility"],
  residence: ["interior", "accessibility", "luxury"],
  villa: ["accessibility", "luxury"],
  summer: ["luxury"],
  detached: ["accessibility"],
  rural: ["landInfrastructure"],
  mountain: ["landInfrastructure", "luxury"],
  building: ["exterior", "location", "transport", "front", "view", "accessibility", "commercial"],
  apartment_building: [],
  commercial: ["commercial"],
  plaza: ["exterior", "location", "transport", "front", "view", "accessibility", "luxury"],
  tourism: ["tourism", "commercial", "location", "transport", "front", "view", "luxury"],
  industrial: ["commercial", "transport", "front", "exterior"],
  warehouse: ["commercial", "transport", "front", "exterior"],
  office: ["interior", "commercial", "exterior", "location", "transport", "front", "accessibility"],
  station: ["commercial", "transport", "front", "exterior"],
  land: ["location", "transport", "front", "view", "zoning", "landInfrastructure"],
  zoning: ["zoning"],
  landInfrastructure: ["landInfrastructure"],
  agriculture: ["location", "view", "landInfrastructure"],
  project: ["interior", "exterior", "location", "transport", "front", "view", "accessibility", "luxury"],
  camp: ["landInfrastructure"],
  timeshare: ["interior", "exterior"],
  premium: ["luxury"],
  luxury: ["luxury"],
  location: ["location"],
  transport: ["transport"],
  front: ["front"],
  view: ["view"],
  exterior: ["exterior"],
  interior: ["interior"],
  security: ["exterior"],
  parking: ["exterior"],
  garden: ["exterior", "location", "view"],
  pool: ["exterior", "luxury"],
  heating: ["interior"],
  hotel: [],
  resort: [],
};

function getSupportedMainCategories() {
  return FORM_MAIN_CATEGORY_KEYS.map((key) =>
    STOK_SELECTION_TREE.find((category) => category.key === key),
  ).filter((category): category is StokSelectionMainCategory => Boolean(category));
}

function getFormSubCategoryLabel(subCategory: StokSelectionSubCategory) {
  return SUBCATEGORY_FORM_LABEL_OVERRIDES[subCategory.key] || subCategory.label;
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function getLevel1Options(subCategory: StokSelectionSubCategory) {
  return unique(subCategory.options.map((option) => option.label));
}

function getLevel2Options(subCategory: StokSelectionSubCategory) {
  return unique(
    subCategory.options.flatMap((option) =>
      (option.children || []).map((child) => child.label),
    ),
  );
}

function getLevel3Options(subCategory: StokSelectionSubCategory) {
  return unique(
    subCategory.options.flatMap((option) =>
      (option.children || []).flatMap((child) =>
        (child.children || []).map((grandChild) => grandChild.label),
      ),
    ),
  );
}

function getLevelLabel(
  subCategory: StokSelectionSubCategory,
  level: "level1" | "level2" | "level3",
  fieldKey: string,
) {
  if (level === "level1") return subCategory.level1Label || SPECIAL_FIELD_LABELS[fieldKey] || fieldKey;
  if (level === "level2") return subCategory.level2Label || SPECIAL_FIELD_LABELS[fieldKey] || fieldKey;
  return subCategory.level3Label || SPECIAL_FIELD_LABELS[fieldKey] || fieldKey;
}

function getLevelOptions(
  subCategory: StokSelectionSubCategory,
  level: "level1" | "level2" | "level3",
  fieldKey: string,
  type: string,
) {
  const options =
    level === "level1"
      ? getLevel1Options(subCategory)
      : level === "level2"
        ? getLevel2Options(subCategory)
        : getLevel3Options(subCategory);

  if (options.length > 0) return options;

  if (fieldKey === "layoutType" && type === "VILLA") {
    return ["Ayrık Nizam", "İkiz Villa", "Bitişik Nizam"];
  }

  return SPECIAL_FIELD_OPTION_FALLBACKS[fieldKey] || [];
}

function makeSpecialField(
  type: string,
  subCategory: StokSelectionSubCategory,
  level: "level1" | "level2" | "level3",
  fieldKey?: string,
): SelectionSpecialField | null {
  if (!fieldKey) return null;

  return {
    key: fieldKey,
    label: getLevelLabel(subCategory, level, fieldKey),
    options: getLevelOptions(subCategory, level, fieldKey, type),
    required: REQUIRED_SPECIAL_FIELDS.has(`${type}:${fieldKey}`) || undefined,
  };
}

export const MAIN_CATEGORY_OPTIONS = getSupportedMainCategories().map(
  (category) => MAIN_CATEGORY_FORM_LABELS[category.key],
);

export const CATEGORY_OPTIONS: Record<string, string[]> = Object.fromEntries(
  getSupportedMainCategories().map((category) => [
    MAIN_CATEGORY_FORM_LABELS[category.key],
    category.subCategories.map(getFormSubCategoryLabel),
  ]),
);

export const CATEGORY_TYPE_MAP: Record<string, Record<string, string>> = Object.fromEntries(
  getSupportedMainCategories().map((category) => [
    MAIN_CATEGORY_FORM_LABELS[category.key],
    Object.fromEntries(
      category.subCategories.map((subCategory) => [
        getFormSubCategoryLabel(subCategory),
        subCategory.key,
      ]),
    ),
  ]),
);

export const TYPE_LABELS: Record<string, string> = Object.fromEntries(
  STOK_SELECTION_TREE.flatMap((category) =>
    category.subCategories.map((subCategory) => [
      subCategory.key,
      TYPE_LABEL_OVERRIDES[subCategory.key] || subCategory.label,
    ]),
  ),
);

export function getSelectionMainCategoryByType(type?: string) {
  const normalizedType = String(type || "DAIRE");

  return (
    STOK_SELECTION_TREE.find((category) =>
      category.subCategories.some((subCategory) => subCategory.key === normalizedType),
    ) || STOK_SELECTION_TREE[0]
  );
}

export function getSelectionSubCategoryByType(type?: string) {
  const normalizedType = String(type || "DAIRE");
  const mainCategory = getSelectionMainCategoryByType(normalizedType);

  return (
    mainCategory.subCategories.find((subCategory) => subCategory.key === normalizedType) ||
    STOK_SELECTION_TREE[0].subCategories[0]
  );
}

export function getSelectionFieldRule(type?: string): SelectionFieldRule {
  const normalizedType = String(type || "DAIRE");
  const subCategory = getSelectionSubCategoryByType(normalizedType);
  const levelKeys = LEVEL_FIELD_KEYS_BY_TYPE[normalizedType] || {};
  const specialFields = [
    makeSpecialField(normalizedType, subCategory, "level1", levelKeys.level1),
    makeSpecialField(normalizedType, subCategory, "level2", levelKeys.level2),
    makeSpecialField(normalizedType, subCategory, "level3", levelKeys.level3),
  ].filter((field): field is SelectionSpecialField => Boolean(field));

  return {
    type: normalizedType,
    requiredFields: [...subCategory.requiredFields],
    optionalFields: [...subCategory.optionalFields],
    specialFields,
    note: subCategory.note,
  };
}

export function getSelectionFeatureGroupKeys(type?: string) {
  const subCategory = getSelectionSubCategoryByType(type);

  return unique(
    subCategory.featurePresets.flatMap((presetKey) => FEATURE_TAG_GROUPS[presetKey] || []),
  );
}

export function getAllSelectionTypeKeys() {
  return unique(
    STOK_SELECTION_TREE.flatMap((category) =>
      category.subCategories.map((subCategory) => subCategory.key),
    ),
  );
}
