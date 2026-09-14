"use client";

export const PORTFOLIO_METADATA_PREFIX = "__EPH_META__:";

export const PORTFOLIO_METADATA_KEYS = [
  "buildingAge",
  "openArea",
  "closedArea",
  "netArea",
  "grossArea",
  "gardenArea",
  "landArea",
  "unitCount",
  "bedCount",
  "bathroomCount",
  "heatingType",
  "parkingType",
  "front",
  "view",
  "elevator",
  "usageStatus",
  "serviceType",
  "seasonUsage",
  "restorationStatus",
  "villaType",
  "layoutType",
  "poolType",
  "summerHouseType",
  "buildingStyle",
  "homeType",
  "accessSeason",
  "buildingUsage",
  "plazaClass",
  "hotelBuildingStatus",
  "industrialBuildingType",
  "workshopType",
  "businessType",
  "warehouseType",
  "shopType",
  "officeType",
  "stationType",
  "zoningType",
  "fieldType",
  "vineyardType",
  "gardenType",
  "oliveGroveType",
  "projectStatus",
  "hotelSubType",
  "pensionType",
  "campType",
  "resortType",
  "periodType",
] as const;

export type PortfolioMetadataKey = (typeof PORTFOLIO_METADATA_KEYS)[number];

function cleanValue(value: unknown) {
  return String(value ?? "").trim();
}

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function isPortfolioMetadataFeature(value: unknown) {
  return String(value || "").startsWith(PORTFOLIO_METADATA_PREFIX);
}

export function makePortfolioMetadataFeature(
  key: string,
  value: unknown,
) {
  const cleanKey = cleanValue(key);
  const cleanMetaValue = cleanValue(value);

  if (!cleanKey || !cleanMetaValue) return "";

  return `${PORTFOLIO_METADATA_PREFIX}${encodeURIComponent(cleanKey)}:${encodeURIComponent(cleanMetaValue)}`;
}

export function parsePortfolioMetadataFeature(value: unknown) {
  const raw = String(value || "");

  if (!raw.startsWith(PORTFOLIO_METADATA_PREFIX)) return null;

  const payload = raw.slice(PORTFOLIO_METADATA_PREFIX.length);
  const separatorIndex = payload.indexOf(":");

  if (separatorIndex < 0) return null;

  const key = safeDecode(payload.slice(0, separatorIndex));
  const metaValue = safeDecode(payload.slice(separatorIndex + 1));

  if (!key || !metaValue) return null;

  return { key, value: metaValue };
}

export function getPublicPortfolioFeatures(features: unknown): string[] {
  if (!Array.isArray(features)) return [];

  return Array.from(
    new Set(
      features
        .map((item) => cleanValue(item))
        .filter(Boolean)
        .filter((item) => !isPortfolioMetadataFeature(item)),
    ),
  );
}

export function decodePortfolioMetadataState(
  features: unknown,
): Record<string, string> {
  if (!Array.isArray(features)) return {};

  return features.reduce<Record<string, string>>((result, item) => {
    const parsed = parsePortfolioMetadataFeature(item);

    if (parsed) {
      result[parsed.key] = parsed.value;
    }

    return result;
  }, {});
}

export function getPortfolioMetadataValue(
  features: unknown,
  key: string,
) {
  return decodePortfolioMetadataState(features)[key] || "";
}

export function encodePortfolioMetadataFeatures(
  source: Record<string, unknown> | null | undefined,
): string[] {
  if (!source) return [];

  return PORTFOLIO_METADATA_KEYS.map((key) =>
    makePortfolioMetadataFeature(key, source[key]),
  ).filter(Boolean);
}

export function mergePortfolioFeatureMetadata(
  features: unknown,
  source: Record<string, unknown> | null | undefined,
): string[] {
  return Array.from(
    new Set([
      ...getPublicPortfolioFeatures(features),
      ...encodePortfolioMetadataFeatures(source),
    ]),
  );
}

export const FEATURE_LABELS: Record<string, string> = {
  ASANSOR: "Asansör",
  KAPALI_OTOPARK: "Kapalı Otopark",
  ACIK_OTOPARK: "Açık Otopark",
  GUVENLIK: "Güvenlik",
  SITE_ICERISINDE: "Site İçerisinde",
  JENERATOR: "Jeneratör",
  YANGIN_MERDIVENI: "Yangın Merdiveni",
  KAMERA_SISTEMI: "Kamera Sistemi",
  SU_DEPOSU: "Su Deposu",
  HIDROFOR: "Hidrofor",
  FIBER_INTERNET: "Fiber İnternet",
  EBEVEYN_BANYOSU: "Ebeveyn Banyosu",
  BALKON: "Balkon",
  TERAS: "Teras",
  KILER: "Kiler",
  GIYINME_ODASI: "Giyinme Odası",
  ANKASTRE_MUTFAK: "Ankastre Mutfak",
  AKILLI_EV: "Akıllı Ev Sistemi",
  SOMINE: "Şömine",
  KLIMA: "Klima",
  ISI_YALITIMI: "Isı Yalıtımı",
  SES_YALITIMI: "Ses Yalıtımı",
  DENIZ_MANZARASI: "Deniz Manzarası",
  DOGA_MANZARASI: "Doğa Manzarası",
  SEHIR_MANZARASI: "Şehir Manzarası",
  YUKLEME_RAMPASI: "Yükleme Rampası",
  TIR_GIRISI: "TIR Girişi",
  VINC_SISTEMI: "Vinç Sistemi",
  SANAYI_ELEKTRIGI: "Sanayi Elektriği",
  FORKLIFT_ALANI: "Forklift Alanı",
  DEPOLAMA_ALANI: "Depolama Alanı",
  YANGIN_SONDURME_SISTEMI: "Yangın Söndürme Sistemi",
  YOLU_ACIK: "Yolu Açık",
  KADASTRO_YOLU: "Kadastro Yolu Var",
  ELEKTRIK_VAR: "Elektrik Var",
  SU_VAR: "Su Var",
  SONDAJ_VAR: "Sondaj Var",
  CEVRILI: "Çevrili",
  KOSE_PARSEL: "Köşe Parsel",
  IFRAZLI: "İfrazlı",
  HISSELI: "Hisseli",
};

export function getFeatureLabel(code: string) {
  return FEATURE_LABELS[code] || code;
}

export function getFeatureLabels(features?: unknown): string[] {
  return getPublicPortfolioFeatures(features).map(getFeatureLabel);
}

export const METADATA_KEY_LABELS: Record<string, string> = {
  buildingAge: "Bina Yaşı",
  openArea: "Açık Alan",
  closedArea: "Kapalı Alan",
  netArea: "Net Alan",
  grossArea: "Brüt Alan",
  gardenArea: "Bahçe Alanı",
  landArea: "Arsa Alanı",
  unitCount: "Bağımsız Bölüm Sayısı",
  bedCount: "Yatak Sayısı",
  bathroomCount: "Banyo Sayısı",
  heatingType: "Isınma Türü",
  parkingType: "Otopark",
  front: "Cephe",
  view: "Manzara",
  elevator: "Asansör",
  usageStatus: "Kullanım Durumu",
  serviceType: "Hizmet Tipi",
  seasonUsage: "Kullanım Şekli",
  restorationStatus: "Restorasyon Durumu",
  villaType: "Villa Tipi",
  layoutType: "Yerleşim Tipi",
  poolType: "Havuz Tipi",
  summerHouseType: "Yazlık Tipi",
  buildingStyle: "Bina Stili",
  homeType: "Ev Tipi",
  accessSeason: "Ulaşım Sezonu",
  buildingUsage: "Kullanım Amacı",
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
  resortType: "Tatil Köyü Tipi",
  periodType: "Dönem Tipi",
};

export function getMetadataLabel(key: string) {
  return METADATA_KEY_LABELS[key] || key;
}
