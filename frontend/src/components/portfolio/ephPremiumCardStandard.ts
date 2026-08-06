import {
  TYPE_LABELS,
  getSelectionSubCategoryByType,
} from "@/components/stok/stokSelectionAdapter";
import {
  decodePortfolioMetadataState,
  getFeatureLabels,
} from "@/components/stok/portfolioFeatureMetadata";

export type EphCardVariant =
  | "detail"
  | "whatsapp"
  | "instagram-post"
  | "story"
  | "reel";

export type EphCardIconKey =
  | "room"
  | "area"
  | "floor"
  | "age"
  | "heating"
  | "parking"
  | "front"
  | "elevator"
  | "home"
  | "layout"
  | "land"
  | "view"
  | "pool"
  | "zoning"
  | "parcel"
  | "status"
  | "bed"
  | "open-area"
  | "closed-area"
  | "usage"
  | "class"
  | "building";

export type EphCardFact = {
  key: string;
  label: string;
  value: string;
  icon: EphCardIconKey;
};

export type EphPortfolioShareInput = {
  id: string;
  title: string;
  location: string;
  status?: string;
  price: string;
  roomCount: string;
  area: string;
  floor?: string;
  authorization?: string;
  coverImage?: string;
  consultantName?: string;
  consultantPhone?: string;
  portfolioNo?: string;
  score?: number;
  scoreLabel?: string;
  shortDescription?: string;
  longDescription?: string;
  features?: Array<{ icon: string; label: string }>;
  shareUrl?: string;
};

export type EphPremiumCardData = {
  id: string;
  title: string;
  propertyType: string;
  typeKey: string;
  status: string;
  price: string;
  location: string;
  coverImage: string;
  portfolioNo: string;
  authorization: string;
  consultantName: string;
  consultantPhone: string;
  score?: number;
  scoreLabel?: string;
  description: string;
  facts: EphCardFact[];
  additionalFeatures: string[];
  shareUrl: string;
};

type UnknownRecord = Record<string, unknown>;

const CURRENCY_SYMBOLS: Record<string, string> = {
  TRY: "₺",
  USD: "$",
  EUR: "€",
  GBP: "£",
};

const FRONT_VALUES = [
  "Batı",
  "Doğu",
  "Güney",
  "Kuzey",
  "Köşe Parsel",
  "Çift Cephe",
  "Cadde Cepheli",
];

const VIEW_VALUES = [
  "Boğaz",
  "Deniz",
  "Doğa",
  "Göl",
  "Havuz",
  "Nehir",
  "Park & Yeşil Alan",
  "Şehir",
  "Dağ",
  "Vadi",
  "Panoramik",
  "Marina",
  "Golf Sahası",
];

const HEATING_VALUES = [
  "Yerden Isıtma",
  "Merkezi Sistem",
  "Kombi Doğalgaz",
  "Doğalgaz",
  "Klima",
  "Şömine",
  "Soba",
  "Isı Pompası",
  "Güneş Enerjisi",
];

const PARKING_VALUES = [
  "Kapalı Otopark",
  "Açık Otopark",
  "Otopark Var",
  "Araç Park Yeri",
];

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function normalize(value: unknown) {
  return clean(value)
    .toLocaleUpperCase("tr-TR")
    .replaceAll("İ", "I")
    .replaceAll("Ğ", "G")
    .replaceAll("Ü", "U")
    .replaceAll("Ş", "S")
    .replaceAll("Ö", "O")
    .replaceAll("Ç", "C");
}

function unique(values: string[]) {
  return Array.from(new Set(values.map(clean).filter(Boolean)));
}

function getMetadata(unit: UnknownRecord) {
  const features = Array.isArray(unit.features) ? unit.features : [];
  return decodePortfolioMetadataState(features) as Record<string, string>;
}

function readValue(
  unit: UnknownRecord,
  metadata: Record<string, string>,
  keys: string[],
) {
  for (const key of keys) {
    const directValue = clean(unit[key]);
    if (directValue) return directValue;

    const metadataValue = clean(metadata[key]);
    if (metadataValue) return metadataValue;
  }

  return "";
}

function findFeature(featureLabels: string[], candidates: string[]) {
  for (const candidate of candidates) {
    const candidateNormalized = normalize(candidate);
    const exact = featureLabels.find(
      (label) => normalize(label) === candidateNormalized,
    );
    if (exact) return exact;
  }

  for (const candidate of candidates) {
    const candidateNormalized = normalize(candidate);
    const partial = featureLabels.find((label) =>
      normalize(label).includes(candidateNormalized),
    );
    if (partial) return partial;
  }

  return "";
}

function formatArea(value: unknown) {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric) || numeric <= 0) return "—";
  return `${numeric.toLocaleString("tr-TR")} m²`;
}

function formatMoney(value: unknown, currency?: unknown) {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric) || numeric <= 0) return "Fiyat belirtilmedi";
  const symbol = CURRENCY_SYMBOLS[clean(currency) || "TRY"] || "₺";
  return `${numeric.toLocaleString("tr-TR")} ${symbol}`;
}

function compactFloor(unit: UnknownRecord) {
  const totalFloors = clean(unit.totalFloors);
  const numericFloor = clean(unit.floor);
  const floorLabel = clean(unit.floorLabel);

  let floor = numericFloor;

  if (!floor && floorLabel) {
    const matched = floorLabel.match(/-?\d+/)?.[0];
    floor = matched || floorLabel.replace(/\s*Katı?\s*/gi, "").trim();
  }

  if (floor && totalFloors) return `${floor}/${totalFloors}`;
  if (floor) return floor;
  if (floorLabel) return floorLabel;
  return "—";
}

function getImages(unit: UnknownRecord) {
  const images = Array.isArray(unit.images)
    ? (unit.images as UnknownRecord[])
    : [];

  return images
    .map((image) => ({
      url: clean(image.supabaseUrl) || clean(image.url),
      isCover: Boolean(image.isCover),
      sortOrder: Number(image.sortOrder || 0),
    }))
    .filter((image) => image.url)
    .sort((a, b) => {
      if (a.isCover !== b.isCover) return a.isCover ? -1 : 1;
      return a.sortOrder - b.sortOrder;
    });
}

function makePortfolioNo(id: unknown) {
  const raw = clean(id).replace(/[^a-zA-Z0-9]/g, "");
  const first = raw.slice(0, 4).toLocaleUpperCase("tr-TR") || "PORT";
  const last = raw.slice(-4).toLocaleUpperCase("tr-TR") || "0001";
  return `EPH-${first}-${last}`;
}

function fact(
  key: string,
  label: string,
  value: unknown,
  icon: EphCardIconKey,
): EphCardFact {
  return {
    key,
    label,
    value: clean(value) || "—",
    icon,
  };
}

function buildResidentialFacts(
  typeKey: string,
  unit: UnknownRecord,
  metadata: Record<string, string>,
  featureLabels: string[],
) {
  const roomCount = readValue(unit, metadata, ["roomCount"]);
  const netArea = formatArea(
    readValue(unit, metadata, ["netArea", "area"]),
  );
  const buildingAge = readValue(unit, metadata, [
    "buildingAge",
    "buildingAgeLabel",
  ]);
  const heating =
    readValue(unit, metadata, ["heatingType", "heatingSystem"]) ||
    findFeature(featureLabels, HEATING_VALUES);
  const parking =
    readValue(unit, metadata, ["parkingType", "parking"]) ||
    findFeature(featureLabels, PARKING_VALUES);
  const frontage =
    readValue(unit, metadata, ["front", "frontage", "cephe"]) ||
    findFeature(featureLabels, FRONT_VALUES);
  const view =
    readValue(unit, metadata, ["view", "viewType", "manzara"]) ||
    findFeature(featureLabels, VIEW_VALUES);
  const elevator =
    readValue(unit, metadata, ["elevator", "hasElevator"]) ||
    (findFeature(featureLabels, ["Asansör", "Engelliye Uygun Asansör"])
      ? "Var"
      : "—");

  if (typeKey === "VILLA") {
    return [
      fact("roomCount", "Oda Sayısı", roomCount, "room"),
      fact("netArea", "Net m²", netArea, "area"),
      fact(
        "villaType",
        "Villa Tipi",
        readValue(unit, metadata, ["villaType"]),
        "home",
      ),
      fact(
        "layoutType",
        "Nizam Tipi",
        readValue(unit, metadata, ["layoutType"]),
        "layout",
      ),
      fact(
        "landArea",
        "Arsa m²",
        formatArea(
          readValue(unit, metadata, ["landArea", "gardenArea", "openArea"]),
        ),
        "land",
      ),
      fact("buildingAge", "Bina Yaşı", buildingAge, "age"),
      fact("heatingType", "Isınma Türü", heating, "heating"),
      fact("parkingType", "Otopark", parking, "parking"),
    ];
  }

  if (typeKey === "YAZLIK") {
    const summerHouseType = readValue(unit, metadata, ["summerHouseType"]);
    const simplifiedType = summerHouseType.replace(/^Yazlık\s+/i, "") || summerHouseType;
    const usage =
      readValue(unit, metadata, ["seasonUsage", "usageType", "accessSeason"]) ||
      (findFeature(featureLabels, ["Sezonluk İşletme"])
        ? "Sezonluk"
        : "—");

    return [
      fact("roomCount", "Oda Sayısı", roomCount, "room"),
      fact("netArea", "Net m²", netArea, "area"),
      fact("summerHouseType", "Yazlık Türü", simplifiedType, "home"),
      fact("seasonUsage", "Kullanım Şekli", usage, "usage"),
      fact("buildingAge", "Bina Yaşı", buildingAge, "age"),
      fact("heatingType", "Isınma Türü", heating, "heating"),
      fact("parkingType", "Otopark", parking, "parking"),
      fact("view", "Manzara", view, "view"),
    ];
  }

  if (typeKey === "MUSTAK_EV") {
    return [
      fact("roomCount", "Oda Sayısı", roomCount, "room"),
      fact("netArea", "Net m²", netArea, "area"),
      fact(
        "homeType",
        "Ev Tipi",
        readValue(unit, metadata, ["homeType", "buildingStyle"]),
        "home",
      ),
      fact(
        "layoutType",
        "Nizam Tipi",
        readValue(unit, metadata, ["layoutType"]),
        "layout",
      ),
      fact("buildingAge", "Bina Yaşı", buildingAge, "age"),
      fact(
        "gardenArea",
        "Bahçe m²",
        formatArea(readValue(unit, metadata, ["gardenArea", "landArea"])),
        "land",
      ),
      fact("heatingType", "Isınma Türü", heating, "heating"),
      fact("parkingType", "Otopark", parking, "parking"),
    ];
  }

  if (["KOY_EVI", "DAG_EVI_YAYLA_EVI"].includes(typeKey)) {
    return [
      fact("roomCount", "Oda Sayısı", roomCount, "room"),
      fact("netArea", "Net m²", netArea, "area"),
      fact(
        "buildingStyle",
        "Yapı Tipi",
        readValue(unit, metadata, ["buildingStyle", "homeType"]),
        "home",
      ),
      fact(
        "accessSeason",
        typeKey === "KOY_EVI" ? "Restorasyon" : "Ulaşım Durumu",
        readValue(unit, metadata, [
          typeKey === "KOY_EVI" ? "restorationStatus" : "accessSeason",
          "accessSeason",
        ]),
        "usage",
      ),
      fact("buildingAge", "Bina Yaşı", buildingAge, "age"),
      fact(
        "landArea",
        "Arsa m²",
        formatArea(readValue(unit, metadata, ["landArea", "gardenArea"])),
        "land",
      ),
      fact("heatingType", "Isınma Türü", heating, "heating"),
      fact("parkingType", "Otopark", parking, "parking"),
    ];
  }

  return [
    fact("roomCount", "Oda Sayısı", roomCount, "room"),
    fact("netArea", "Net m²", netArea, "area"),
    fact("floor", "Bulunduğu Kat", compactFloor(unit), "floor"),
    fact("buildingAge", "Bina Yaşı", buildingAge, "age"),
    fact("heatingType", "Isınma Türü", heating, "heating"),
    fact("parkingType", "Otopark", parking, "parking"),
    fact("front", "Cephe", frontage, "front"),
    fact("elevator", "Asansör", elevator, "elevator"),
  ];
}

function buildLandFacts(
  unit: UnknownRecord,
  metadata: Record<string, string>,
  featureLabels: string[],
) {
  const frontage =
    readValue(unit, metadata, ["front", "frontage", "yolaCephe"]) ||
    findFeature(featureLabels, FRONT_VALUES);
  const view =
    readValue(unit, metadata, ["view", "viewType"]) ||
    findFeature(featureLabels, VIEW_VALUES);
  const infrastructure = unique(
    featureLabels.filter((label) =>
      [
        "SU VAR",
        "ELEKTRIK VAR",
        "DOGALGAZ",
        "SONDAJ",
        "KUYU",
        "KADASTRAL YOLU",
      ].some((keyword) => normalize(label).includes(keyword)),
    ),
  ).join(", ");

  return [
    fact("area", "Alan", formatArea(unit.area), "area"),
    fact(
      "zoningType",
      "İmar Durumu",
      readValue(unit, metadata, ["zoningType", "zoningStatus"]),
      "zoning",
    ),
    fact("adaNo", "Ada No", unit.adaNo, "parcel"),
    fact("parselNo", "Parsel No", unit.parselNo, "parcel"),
    fact("front", "Cephe", frontage, "front"),
    fact("view", "Manzara", view, "view"),
    fact("infrastructure", "Altyapı", infrastructure, "status"),
    fact(
      "road",
      "Yol Durumu",
      findFeature(featureLabels, ["Asfalt Yol", "Stabilize Yol", "Kadastral Yolu Var"]),
      "usage",
    ),
  ];
}

function buildCommercialFacts(
  typeKey: string,
  unit: UnknownRecord,
  metadata: Record<string, string>,
  featureLabels: string[],
) {
  const typeFields: Record<string, [string, string]> = {
    FABRIKA_URETIM_TESISI: ["industrialBuildingType", "Sanayi Yapı Tipi"],
    ATOLYE: ["workshopType", "Atölye Tipi"],
    TICARI_ISLETME: ["businessType", "İşletme Tipi"],
    DEPO_ANTREPO: ["warehouseType", "Depo Tipi"],
    DUKKAN_MAGAZA: ["shopType", "Dükkan Tipi"],
    OFIS_BURO: ["officeType", "Ofis Tipi"],
    BENZIN_ISTASYONU: ["stationType", "İstasyon Tipi"],
  };
  const [specialKey, specialLabel] = typeFields[typeKey] || [
    "buildingUsage",
    "Kullanım Tipi",
  ];

  return [
    fact(specialKey, specialLabel, readValue(unit, metadata, [specialKey]), "usage"),
    fact("area", "Kullanım Alanı", formatArea(unit.area), "area"),
    fact("floor", "Kat", compactFloor(unit), "floor"),
    fact(
      "openArea",
      "Açık Alan",
      formatArea(readValue(unit, metadata, ["openArea"])),
      "open-area",
    ),
    fact(
      "closedArea",
      "Kapalı Alan",
      formatArea(readValue(unit, metadata, ["closedArea", "area"])),
      "closed-area",
    ),
    fact(
      "parking",
      "Otopark",
      readValue(unit, metadata, ["parkingType"]) ||
        findFeature(featureLabels, PARKING_VALUES),
      "parking",
    ),
    fact(
      "front",
      "Cephe",
      findFeature(featureLabels, FRONT_VALUES),
      "front",
    ),
    fact(
      "commercialValue",
      "Ticari Değer",
      findFeature(featureLabels, [
        "Cadde Üzeri",
        "Köşe Konum",
        "Tabela Değeri Yüksek",
        "Yaya Trafiği Yoğun",
      ]),
      "status",
    ),
  ];
}

function buildBuildingFacts(
  typeKey: string,
  unit: UnknownRecord,
  metadata: Record<string, string>,
  featureLabels: string[],
) {
  const typeFields: Record<string, [string, string]> = {
    APARTMAN: ["buildingUsage", "Apartman Tipi"],
    KOMPLE_BINA: ["buildingUsage", "Kullanım Tipi"],
    IS_HANI: ["buildingUsage", "İş Hanı Tipi"],
    PLAZA_BINA: ["plazaClass", "Plaza Sınıfı"],
    REZIDANS_BINA: ["buildingUsage", "Rezidans Tipi"],
    OTEL_BINASI: ["hotelBuildingStatus", "Otel Durumu"],
  };
  const [specialKey, specialLabel] = typeFields[typeKey] || [
    "buildingUsage",
    "Bina Tipi",
  ];

  return [
    fact(specialKey, specialLabel, readValue(unit, metadata, [specialKey]), "building"),
    fact("area", "Toplam Alan", formatArea(unit.area), "area"),
    fact("totalFloors", "Toplam Kat", unit.totalFloors, "floor"),
    fact(
      "unitCount",
      "Bağımsız Bölüm",
      readValue(unit, metadata, ["unitCount"]),
      "room",
    ),
    fact(
      "buildingAge",
      "Bina Yaşı",
      readValue(unit, metadata, ["buildingAge"]),
      "age",
    ),
    fact(
      "heating",
      "Isınma Türü",
      readValue(unit, metadata, ["heatingType"]) ||
        findFeature(featureLabels, HEATING_VALUES),
      "heating",
    ),
    fact(
      "parking",
      "Otopark",
      readValue(unit, metadata, ["parkingType"]) ||
        findFeature(featureLabels, PARKING_VALUES),
      "parking",
    ),
    fact("front", "Cephe", findFeature(featureLabels, FRONT_VALUES), "front"),
  ];
}

function buildTourismFacts(
  typeKey: string,
  unit: UnknownRecord,
  metadata: Record<string, string>,
  featureLabels: string[],
) {
  const typeFields: Record<string, [string, string]> = {
    OTEL: ["hotelSubType", "Otel Tipi"],
    PANSIYON: ["pensionType", "Pansiyon Tipi"],
    KAMP_YERI: ["campType", "Kamp Tipi"],
    TATIL_KOYU: ["resortType", "Tesis Tipi"],
    DEVRE_MULK: ["periodType", "Dönem Tipi"],
  };
  const [specialKey, specialLabel] = typeFields[typeKey] || [
    "resortType",
    "Tesis Tipi",
  ];

  return [
    fact(specialKey, specialLabel, readValue(unit, metadata, [specialKey]), "class"),
    fact("roomCount", "Oda Sayısı", unit.roomCount, "room"),
    fact("bedCount", "Yatak Sayısı", readValue(unit, metadata, ["bedCount"]), "bed"),
    fact("area", "Toplam Alan", formatArea(unit.area), "area"),
    fact("openArea", "Açık Alan", formatArea(readValue(unit, metadata, ["openArea"])), "open-area"),
    fact("closedArea", "Kapalı Alan", formatArea(readValue(unit, metadata, ["closedArea"])), "closed-area"),
    fact("pool", "Havuz", findFeature(featureLabels, ["Açık Havuz", "Kapalı Havuz", "Yüzme Havuzu (Açık)", "Yüzme Havuzu (Kapalı)"]), "pool"),
    fact("status", "İşletme Durumu", findFeature(featureLabels, ["12 Ay Açık", "Sezonluk İşletme", "Ruhsatlı"]), "status"),
  ];
}

function buildProjectFacts(
  typeKey: string,
  unit: UnknownRecord,
  metadata: Record<string, string>,
  featureLabels: string[],
) {
  return [
    fact("projectStatus", "Proje Durumu", readValue(unit, metadata, ["projectStatus"]), "status"),
    fact("propertyType", "Proje Tipi", TYPE_LABELS[typeKey] || typeKey, "building"),
    fact("roomCount", "Oda Planı", unit.roomCount, "room"),
    fact("area", "Net m²", formatArea(unit.area), "area"),
    fact("totalFloors", "Toplam Kat", unit.totalFloors, "floor"),
    fact("heating", "Isınma Türü", readValue(unit, metadata, ["heatingType"]) || findFeature(featureLabels, HEATING_VALUES), "heating"),
    fact("parking", "Otopark", readValue(unit, metadata, ["parkingType"]) || findFeature(featureLabels, PARKING_VALUES), "parking"),
    fact("view", "Manzara", findFeature(featureLabels, VIEW_VALUES), "view"),
  ];
}

function buildFacts(
  typeKey: string,
  unit: UnknownRecord,
  metadata: Record<string, string>,
  featureLabels: string[],
) {
  const mainCategoryKey = getSelectionSubCategoryByType(typeKey)
    ? String(
        typeKey.startsWith("KONUT_") ||
          typeKey.startsWith("REZIDANS_") ||
          typeKey.startsWith("VILLA_")
          ? "KONUT_PROJELERI"
          : "",
      )
    : "";

  if (
    [
      "DAIRE",
      "REZIDANS",
      "VILLA",
      "YAZLIK",
      "MUSTAK_EV",
      "KOY_EVI",
      "DAG_EVI_YAYLA_EVI",
    ].includes(typeKey)
  ) {
    return buildResidentialFacts(typeKey, unit, metadata, featureLabels);
  }

  if (["ARSA", "TARLA", "BAG", "BAHCE", "ZEYTINLIK"].includes(typeKey)) {
    return buildLandFacts(unit, metadata, featureLabels);
  }

  if (
    [
      "FABRIKA_URETIM_TESISI",
      "ATOLYE",
      "TICARI_ISLETME",
      "DEPO_ANTREPO",
      "DUKKAN_MAGAZA",
      "OFIS_BURO",
      "BENZIN_ISTASYONU",
    ].includes(typeKey)
  ) {
    return buildCommercialFacts(typeKey, unit, metadata, featureLabels);
  }

  if (
    [
      "APARTMAN",
      "KOMPLE_BINA",
      "IS_HANI",
      "PLAZA_BINA",
      "REZIDANS_BINA",
      "OTEL_BINASI",
    ].includes(typeKey)
  ) {
    return buildBuildingFacts(typeKey, unit, metadata, featureLabels);
  }

  if (["OTEL", "PANSIYON", "KAMP_YERI", "TATIL_KOYU", "DEVRE_MULK"].includes(typeKey)) {
    return buildTourismFacts(typeKey, unit, metadata, featureLabels);
  }

  if (
    mainCategoryKey === "KONUT_PROJELERI" ||
    ["KONUT_PROJESI", "REZIDANS_PROJESI", "VILLA_PROJESI"].includes(typeKey)
  ) {
    return buildProjectFacts(typeKey, unit, metadata, featureLabels);
  }

  return buildResidentialFacts("DAIRE", unit, metadata, featureLabels);
}

function resolvePropertyType(
  typeKey: string,
  metadata: Record<string, string>,
) {
  if (typeKey === "YAZLIK" && clean(metadata.summerHouseType)) {
    return clean(metadata.summerHouseType);
  }

  return TYPE_LABELS[typeKey] || getSelectionSubCategoryByType(typeKey)?.label || typeKey;
}

export function buildEphPremiumCardData(
  unitInput: unknown,
  base?: EphPortfolioShareInput | null,
): EphPremiumCardData {
  const unit = (unitInput || {}) as UnknownRecord;
  const metadata = getMetadata(unit);
  const featureLabels = getFeatureLabels(unit.features);
  const typeKey = clean(unit.type) || "DAIRE";
  const project = (unit.project || {}) as UnknownRecord;
  const owner = (project.owner || {}) as UnknownRecord;
  const propertyType = resolvePropertyType(typeKey, metadata);
  const projectName = clean(project.name) || "EPH Portföy";
  const title = clean(base?.title) || `${projectName} · ${propertyType}`;
  const location =
    clean(base?.location) ||
    [clean(project.district), clean(project.city)].filter(Boolean).join(" / ") ||
    "Konum bilgisi yok";
  const images = getImages(unit);
  const id = clean(unit.id) || clean(base?.id);
  const additionalFeatures = unique([
    ...featureLabels,
    ...(base?.features || []).map((item) => item.label),
  ]).slice(0, 12);
  const consultantName =
    clean(base?.consultantName) ||
    [clean(owner.firstName), clean(owner.lastName)].filter(Boolean).join(" ") ||
    "EPH Üyesi";

  return {
    id,
    title,
    propertyType,
    typeKey,
    status: clean(base?.status) || clean(unit.status) || "Portföy",
    price:
      clean(base?.price) || formatMoney(unit.price, unit.priceCurrency),
    location,
    coverImage:
      clean(base?.coverImage) || images[0]?.url || "/showcase/stock.jpg",
    portfolioNo: clean(base?.portfolioNo) || makePortfolioNo(id),
    authorization:
      clean(base?.authorization) ||
      (unit.isVerified || unit.yetkiVerified ? "Yetkili Portföy" : "EPH Portföy"),
    consultantName,
    consultantPhone: clean(base?.consultantPhone) || "Telefon paylaşılmadı",
    score: base?.score,
    scoreLabel: clean(base?.scoreLabel),
    description:
      clean(base?.shortDescription) ||
      clean(unit.description) ||
      "Bu portföy için açıklama henüz eklenmedi.",
    facts: buildFacts(typeKey, unit, metadata, featureLabels).slice(0, 8),
    additionalFeatures,
    shareUrl:
      clean(base?.shareUrl) ||
      (id ? `https://emlakportfoyhavuzu.com/portfoy/${id}` : ""),
  };
}
