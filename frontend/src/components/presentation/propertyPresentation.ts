import {
  decodePortfolioMetadataState,
  getFeatureLabels,
} from "@/components/stok/portfolioFeatureMetadata";

export type PropertyPresentationInput = {
  type?: string | null;
  status?: string | null;
  roomCount?: string | null;
  area?: number | null;
  netArea?: number | null;
  grossArea?: number | null;
  floor?: number | null;
  floorLabel?: string | null;
  totalFloors?: number | null;
  conceptLabel?: string | null;
  facades?: string[] | null;
  features?: string[] | null;
  adaNo?: string | null;
  parselNo?: string | null;
  project?: {
    city?: string | null;
    district?: string | null;
    address?: string | null;
    neighborhood?: string | null;
  } | null;
};

export type PropertyPresentationCard = {
  key: string;
  label: string;
  value: string;
  icon: string;
};

function normalize(value?: string | null) {
  return String(value || "")
    .toLocaleUpperCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/İ/g, "I")
    .trim();
}

function formatArea(value?: number | null) {
  const numeric = Number(value || 0);
  return numeric > 0 ? `${numeric.toLocaleString("tr-TR")} m²` : "Belirtilmedi";
}

function clean(value?: string | number | null) {
  const text = String(value ?? "").trim();
  return text || "Belirtilmedi";
}

function locationValue(unit: PropertyPresentationInput) {
  return (
    [
      unit.project?.city,
      unit.project?.district,
      unit.project?.neighborhood || unit.project?.address,
    ]
      .filter(Boolean)
      .join(" / ") || "Belirtilmedi"
  );
}

export function getCombinedFloorValue(unit: PropertyPresentationInput) {
  const floor = unit.floorLabel ||
    (unit.floor !== null && unit.floor !== undefined ? String(unit.floor) : "");
  const total = unit.totalFloors ? String(unit.totalFloors) : "";

  if (floor && total) return `${floor}/${total}`;
  if (floor) return floor;
  if (total) return `${total} Katlı`;
  return "Belirtilmedi";
}

function metadata(unit: PropertyPresentationInput) {
  return decodePortfolioMetadataState(unit.features);
}

function firstFeature(unit: PropertyPresentationInput, fallback = "Belirtilmedi") {
  return getFeatureLabels(unit.features)[0] || fallback;
}

function card(
  key: string,
  label: string,
  value: string | number | null | undefined,
  icon: string,
): PropertyPresentationCard {
  return { key, label, value: clean(value), icon };
}

export function getPropertyPresentationCards(
  unit: PropertyPresentationInput,
): PropertyPresentationCard[] {
  const type = normalize(unit.type);
  const meta = metadata(unit);
  const location = locationValue(unit);
  const area = formatArea(unit.area || unit.grossArea || unit.netArea);
  const buildingAge = clean(meta.buildingAge);
  const floor = getCombinedFloorValue(unit);
  const adaParsel =
    [unit.adaNo, unit.parselNo].filter(Boolean).join(" / ") || "Belirtilmedi";
  const facade =
    Array.isArray(unit.facades) && unit.facades.length > 0
      ? unit.facades.join(", ")
      : "Belirtilmedi";

  const baseLocation = card("location", "Konum", location, "📍");

  if (["DAIRE", "REZIDANS"].includes(type)) {
    return [
      baseLocation,
      card("area", "Alan", area, "📐"),
      card("room", "Oda Planı", unit.roomCount, "🛋️"),
      card("floor", "Bulunduğu Kat", floor, "🏢"),
      card("age", "Bina Yaşı", buildingAge, "🏗️"),
    ];
  }

  if (["VILLA", "YAZLIK", "MUSTAK_EV", "KOY_EVI", "DAG_EVI_YAYLA_EVI"].includes(type)) {
    const propertyStyle =
      meta.villaType ||
      meta.summerHouseType ||
      meta.homeType ||
      meta.buildingStyle ||
      meta.layoutType;

    return [
      baseLocation,
      card("area", "Alan", area, "📐"),
      card("room", "Oda Planı", unit.roomCount, "🛋️"),
      card("style", "Kat / Yapı Tipi", propertyStyle, "🏡"),
      card("age", "Bina Yaşı", buildingAge, "🏗️"),
    ];
  }

  if (["OFIS_BURO"].includes(type)) {
    return [
      baseLocation,
      card("area", "Alan", area, "📐"),
      card("room", "Bölüm Planı", unit.roomCount || meta.officeType, "🧩"),
      card("floor", "Bulunduğu Kat", floor, "🏢"),
      card("age", "Bina Yaşı", buildingAge, "🏗️"),
    ];
  }

  if (["DUKKAN_MAGAZA", "TICARI_ISLETME"].includes(type)) {
    return [
      baseLocation,
      card("area", "Alan", area, "📐"),
      card("usage", "Kullanım Tipi", meta.shopType || meta.businessType, "🏪"),
      card("floor", "Kat Yapısı", floor, "🏬"),
      card("age", "Bina Yaşı", buildingAge, "🏗️"),
    ];
  }

  if (["DEPO_ANTREPO", "ATOLYE"].includes(type)) {
    return [
      baseLocation,
      card("area", "Alan", area, "📐"),
      card("building", "Yapı Tipi", meta.warehouseType || meta.workshopType, "🏭"),
      card("technical", "Teknik Özellik", firstFeature(unit), "🚚"),
      card("age", "Bina Yaşı", buildingAge, "🏗️"),
    ];
  }

  if (["FABRIKA_URETIM_TESISI"].includes(type)) {
    return [
      baseLocation,
      card("closed", "Kapalı Alan", meta.closedArea || area, "🏭"),
      card("open", "Açık Alan", meta.openArea, "🌐"),
      card("building", "Sanayi Yapı Tipi", meta.industrialBuildingType, "⚙️"),
      card("age", "Bina Yaşı", buildingAge, "🏗️"),
    ];
  }

  if (["ARSA"].includes(type)) {
    return [
      baseLocation,
      card("area", "Alan", area, "📐"),
      card("zoning", "İmar Durumu", meta.zoningType, "📋"),
      card("parcel", "Ada / Parsel", adaParsel, "🧭"),
      card("facade", "Cephe", facade, "🛣️"),
    ];
  }

  if (["TARLA", "BAG", "BAHCE", "ZEYTINLIK"].includes(type)) {
    const landType =
      meta.fieldType ||
      meta.vineyardType ||
      meta.gardenType ||
      meta.oliveGroveType ||
      String(unit.type || "").replaceAll("_", " ");

    return [
      baseLocation,
      card("area", "Alan", area, "📐"),
      card("landType", "Nitelik", landType, "🌿"),
      card("parcel", "Ada / Parsel", adaParsel, "🧭"),
      card("technical", "Arazi Özelliği", firstFeature(unit), "🛣️"),
    ];
  }

  if (["APARTMAN", "KOMPLE_BINA", "IS_HANI", "PLAZA_BINA", "REZIDANS_BINA"].includes(type)) {
    return [
      baseLocation,
      card("area", "Toplam Alan", area, "📐"),
      card("usage", "Kullanım Tipi", meta.buildingUsage || meta.plazaClass, "🏢"),
      card("floors", "Kat Sayısı", unit.totalFloors, "🏬"),
      card("age", "Bina Yaşı", buildingAge, "🏗️"),
    ];
  }

  if (["OTEL_BINASI", "OTEL", "PANSIYON", "TATIL_KOYU", "KAMP_YERI"].includes(type)) {
    return [
      baseLocation,
      card("area", "Alan", area, "📐"),
      card("capacity", "Oda / Yatak", unit.roomCount || meta.bedCount, "🛏️"),
      card(
        "tourismType",
        "Tesis Tipi",
        meta.hotelSubType || meta.pensionType || meta.campType || meta.resortType,
        "🏨",
      ),
      card("building", "Bina Durumu", meta.hotelBuildingStatus || buildingAge, "🏗️"),
    ];
  }

  if (["BENZIN_ISTASYONU"].includes(type)) {
    return [
      baseLocation,
      card("area", "Toplam Alan", area, "📐"),
      card("closed", "Kapalı Alan", meta.closedArea, "🏢"),
      card("station", "İstasyon Tipi", meta.stationType, "⛽"),
      card("technical", "Teknik Özellik", firstFeature(unit), "⚙️"),
    ];
  }

  if (["KONUT_PROJESI", "REZIDANS_PROJESI", "VILLA_PROJESI"].includes(type)) {
    return [
      baseLocation,
      card("area", "Proje Alanı", area, "📐"),
      card("status", "Proje Durumu", meta.projectStatus, "🚧"),
      card("concept", "Konsept", unit.conceptLabel, "🏙️"),
      card("feature", "Öne Çıkan", firstFeature(unit), "✨"),
    ];
  }

  if (["DEVRE_MULK"].includes(type)) {
    return [
      baseLocation,
      card("area", "Alan", area, "📐"),
      card("room", "Oda Planı", unit.roomCount, "🛋️"),
      card("period", "Dönem Tipi", meta.periodType, "📅"),
      card("feature", "Öne Çıkan", firstFeature(unit), "✨"),
    ];
  }

  return [
    baseLocation,
    card("area", "Alan", area, "📐"),
    card("room", "Plan", unit.roomCount || unit.conceptLabel, "🧩"),
    card("floor", "Kat / Yapı", floor, "🏢"),
    card("feature", "Öne Çıkan", firstFeature(unit), "✨"),
  ];
}

export function getPresentationStatusLabel(status?: string | null) {
  const normalized = normalize(status);
  const labels: Record<string, string> = {
    SATILIK: "Satılık",
    KIRALIK: "Kiralık",
    GUNLUK_KIRALIK: "Günlük Kiralık",
    DEVREN_KIRALIK: "Devren Kiralık",
    DEVREN_SATILIK: "Devren Satılık",
    ON_SATIS: "Ön Satış",
    YAKINDA_SATISTA: "Yakında Satışta",
    HEMEN_TESLIM: "Hemen Teslim",
    SATILDI: "Satıldı",
    KIRALANDI: "Kiralandı",
  };

  return labels[normalized] || String(status || "Portföy").replaceAll("_", " ");
}
