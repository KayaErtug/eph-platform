"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  BUILDING_AGE_OPTIONS,
  BUILDING_FLOOR_OPTIONS,
  CATEGORY_OPTIONS,
  CATEGORY_TYPE_MAP,
  MAIN_CATEGORY_OPTIONS,
  OFFICE_ROOM_COUNT_OPTIONS,
  ROOM_COUNT_OPTIONS,
  TOURISTIC_ROOM_BED_COUNT_OPTIONS,
  STATUS_LABELS,
  TYPE_LABELS,
} from "./stokConstants";
import { getFeatureGroups } from "./stokFeatureGroups";
import { getFeaturePresetKeys } from "./stokFeaturePresets";
import {
  getFieldRule,
  getSpecialFields,
  shouldShowField,
  type PortfolioFieldKey,
} from "./stokFieldRules";
import {
  fetchDistrictOptions,
  fetchPlaceOptions,
  fetchProvinceOptions,
  type LocationOption,
} from "./locationData";
import type { LocalPortfolioImage, Project, ProjectFormState, UnitFormState } from "./stokTypes";
import GoogleGeoPicker from "./GoogleGeoPicker";

type CrmCustomerOption = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  email?: string | null;
  city?: string | null;
  interestedArea?: string | null;
};

interface Props {
  open: boolean;
  onClose: () => void;
  projects: Project[];
  crmCustomers?: CrmCustomerOption[];
  selectedProjectId: string;
  setSelectedProjectId: (value: string) => void;
  projectForm: ProjectFormState;
  setProjectForm: React.Dispatch<React.SetStateAction<ProjectFormState>>;
  unitForm: UnitFormState;
  setUnitForm: React.Dispatch<React.SetStateAction<UnitFormState>>;
  formError: string;
  formSuccess: boolean;
  formLoading: boolean;
  coverImage: LocalPortfolioImage | null;
  setCoverImage: React.Dispatch<React.SetStateAction<LocalPortfolioImage | null>>;
  galleryImages: LocalPortfolioImage[];
  setGalleryImages: React.Dispatch<React.SetStateAction<LocalPortfolioImage[]>>;
  onSubmit: () => void;
}

const MAX_GALLERY_COUNT = 15;
const MAX_FILE_SIZE = 15 * 1024 * 1024;
const MIN_FILE_SIZE = 5 * 1024;
const MIN_IMAGE_WIDTH = 800;
const MIN_IMAGE_HEIGHT = 600;
const MAX_DESCRIPTION_LENGTH = 500;
const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/octet-stream",
];


const SPECIAL_FIELD_KEYS = [
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
];


const TOURISTIC_BED_COUNT_VALUE_OPTIONS = [
  { value: "10", label: "1-10 arası" },
  { value: "50", label: "11-50 arası" },
  { value: "250", label: "51-250 arası" },
  { value: "500", label: "251-500 arası" },
  { value: "1000", label: "501-1000 arası" },
  { value: "1001", label: "1000+" },
];

const CURRENCY_OPTIONS = [
  { value: "TRY", label: "Türk Lirası", symbol: "₺" },
  { value: "USD", label: "Amerikan Doları", symbol: "$" },
  { value: "EUR", label: "Euro", symbol: "€" },
  { value: "GBP", label: "İngiliz Sterlini", symbol: "£" },
];

const FLOOR_LABEL_OPTIONS = [
  "Kot -1",
  "Bodrum",
  "Yarı Bodrum",
  "Zemin Kat",
  "Yüksek Giriş",
  "Bahçe Katı",

  "1. Kat",
  "2. Kat",
  "3. Kat",
  "4. Kat",
  "5. Kat",
  "6. Kat",
  "7. Kat",
  "8. Kat",
  "9. Kat",
  "10. Kat",
  "11. Kat",
  "12. Kat",
  "13. Kat",
  "14. Kat",
  "15. Kat",

  "Çatı Katı",
  "Teras Katı",
  "Penthouse",
];


const LAND_TYPE_KEYWORDS = [
  "ARSA",
  "TARLA",
  "BAG",
  "BAHCE",
  "ZEYTINLIK",
  "CIFTLIK",
  "IMARLI",
  "KONUT_ARSASI",
  "VILLA_ARSASI",
  "TICARI_ARSA",
  "SANAYI_ARSASI",
  "TURIZM_IMARLI_ARSA",
];

const INDUSTRIAL_TYPE_KEYWORDS = ["FABRIKA", "ATOLYE", "URETIM", "SANAYI", "DEPO", "LOJISTIK"];
const COMMERCIAL_TYPE_KEYWORDS = ["DUKKAN", "MAGAZA", "OFIS", "PLAZA", "AVM", "RESTORAN", "KAFE", "OTEL", "PANSIYON"];
const VILLA_TYPE_KEYWORDS = ["VILLA", "KOSK", "YALI", "KONAK", "MUSTAKIL"];

const LAND_QUALITY_OPTIONS = [
  "Tarla",
  "Bağ",
  "Bahçe",
  "Zeytinlik",
  "Meyve Bahçesi",
  "Hisseli Parsel",
  "Müstakil Parsel",
  "Köy Yerleşik Alanı",
  "İmarlı Arsa",
  "Konut İmarlı Arsa",
  "Villa İmarlı Arsa",
  "Ticari İmarlı Arsa",
  "Sanayi İmarlı Arsa",
  "Turizm İmarlı Arsa",
  "Yola Cepheli",
  "Kadastro Yolu Var",
  "Su Var",
  "Elektrik Var",
  "Sondaj / Kuyu Var",
  "Çiftlik Kurulumuna Uygun",
];

const INDUSTRIAL_USAGE_OPTIONS = [
  "Depo",
  "Antrepo",
  "Fabrika",
  "Atölye",
  "Üretim Tesisi",
  "Lojistik Merkezi",
  "Soğuk Hava Deposu",
  "Yükleme Rampalı",
  "Tır Girişine Uygun",
  "Sanayi Elektriği Var",
];

const COMMERCIAL_USAGE_OPTIONS = [
  "Cadde Üzeri",
  "Dükkan",
  "Mağaza",
  "Ofis",
  "Home Office",
  "Plaza Ofis",
  "Restoran",
  "Kafe",
  "Otel / Pansiyon",
  "Tabela Değeri Yüksek",
  "Depolu",
  "WC / Mutfak Var",
];

function normalizeTypeKey(value: string) {
  return String(value || "")
    .toLocaleUpperCase("tr-TR")
    .replaceAll("İ", "I")
    .replaceAll("Ğ", "G")
    .replaceAll("Ü", "U")
    .replaceAll("Ş", "S")
    .replaceAll("Ö", "O")
    .replaceAll("Ç", "C");
}

function typeHasKeyword(type: string, keywords: string[]) {
  const normalized = normalizeTypeKey(type);
  return keywords.some((keyword) => normalized.includes(keyword));
}

function isLandType(type: string) {
  return typeHasKeyword(type, LAND_TYPE_KEYWORDS);
}

function sanitizeAdaNo(value: string) {
  return String(value || '').replace(/\D/g, '').slice(0, 6);
}

function sanitizeParselNo(value: string) {
  return String(value || '').replace(/\D/g, '').slice(0, 4);
}

function isIndustrialType(type: string) {
  return typeHasKeyword(type, INDUSTRIAL_TYPE_KEYWORDS);
}

function isCommercialType(type: string) {
  return typeHasKeyword(type, COMMERCIAL_TYPE_KEYWORDS);
}

function isVillaType(type: string) {
  return typeHasKeyword(type, VILLA_TYPE_KEYWORDS);
}

function shouldShowFloorFields(type: string) {
  return isResidentialDetailType(type) || isOfficeDetailType(type);
}

function shouldShowBuildingFloorCount(type: string) {
  return isResidentialDetailType(type) || isOfficeDetailType(type) || isTouristicType(type);
}

function getRoomLabel(type: string) {
  if (isTouristicType(type)) return "Oda Sayısı";
  if (isOfficeDetailType(type)) return "Oda Sayısı";
  if (isResidentialDetailType(type)) return "Oda Sayısı";
  return "Oda Sayısı";
}

function getRoomPlaceholder(type: string) {
  if (isTouristicType(type)) return "Örn: 12 oda, 24 oda, 40 oda";
  if (isOfficeDetailType(type)) return "Örn: 1+1, 2+1, 4+2";
  return "Örn: 3+1, 4+1, 5+2";
}

function getAreaLabel(type: string) {
  if (isLandType(type)) return "Arazi Alanı (m²) *";
  if (isIndustrialType(type)) return "Kapalı / Kullanım Alanı (m²) *";
  if (isCommercialType(type)) return "Kullanım Alanı (m²) *";
  if (type === "KAMP_YERI") return "Açık Alan (m²) *";
  if (type === "TATIL_KOYU") return "Toplam Alan (m²) *";
  return "Alan (m²) *";
}

function getNumberLabel(type: string) {
  if (isLandType(type)) return "Ada / Parsel / Kayıt No *";
  if (isIndustrialType(type)) return "Blok / Kapı / Tesis No *";
  if (isCommercialType(type)) return "Bağımsız Bölüm / Kapı No *";
  if (isVillaType(type)) return "Villa / Kapı No *";
  return "Daire / Bölüm No";
}

function getNumberPlaceholder(type: string) {
  if (isLandType(type)) return "Örn: Ada 123 / Parsel 45";
  if (isIndustrialType(type)) return "Örn: A Blok, Kapı 12, Tesis 3";
  if (isCommercialType(type)) return "Örn: Dükkan 4, Ofis 12, Plaza 8";
  if (isVillaType(type)) return "Örn: Villa 6, A-12, Kapı 3";
  return "Örn: 6, A-12, B Blok 3";
}


function getFieldLabel(field: PortfolioFieldKey, type: string, required: boolean) {
  const requiredMark = required ? " *" : "";

  if (field === "roomCount") return `${getRoomLabel(type)}${requiredMark}`;
  if (field === "area") return `${getAreaLabel(type).replace(" *", "")}${requiredMark}`;
  if (field === "openArea") return `Açık Alan (m²)${requiredMark}`;
  if (field === "closedArea") return `Kapalı Alan (m²)${requiredMark}`;
  if (field === "bedCount") return `Yatak Sayısı${requiredMark}`;
  if (field === "buildingAge") return `Bina Yaşı${requiredMark}`;
  if (field === "floor") return `Bulunduğu Kat${requiredMark}`;
  if (field === "totalFloors") return `${isVillaType(type) ? "Yapı Kat Sayısı" : "Toplam Kat Sayısı"}${requiredMark}`;
  if (field === "adaNo") return `Ada No${requiredMark}`;
  if (field === "parselNo") return `Parsel No${requiredMark}`;
  if (field === "number") return `${getNumberLabel(type).replace(" *", "")}${requiredMark}`;
  if (field === "price") return `Fiyat${requiredMark}`;
  if (field === "description") return `Açıklama${requiredMark}`;
  if (field === "availableCreditAmount") return `Kullanılabilir Kredi Tutarı${requiredMark}`;

  return `${field}${requiredMark}`;
}

function getTypeKeyFromCategory(mainCategory: string, subCategory: string) {
  return CATEGORY_TYPE_MAP[mainCategory]?.[subCategory] || "DAIRE";
}

function getMainCategoryFromType(type: string) {
  for (const [mainCategory, items] of Object.entries(CATEGORY_TYPE_MAP)) {
    if (Object.values(items).includes(type)) return mainCategory;
  }

  return "KONUT";
}

function getSubCategoryFromType(type: string) {
  const mainCategory = getMainCategoryFromType(type);
  const items = CATEGORY_TYPE_MAP[mainCategory] || {};
  const found = Object.entries(items).find(([, typeKey]) => typeKey === type);
  return found?.[0] || CATEGORY_OPTIONS[mainCategory]?.[0] || "Daire";
}

function isResidentialDetailType(type: string) {
  const mainCategory = getMainCategoryFromType(type);
  return mainCategory === "KONUT" || mainCategory === "KONUT PROJELERİ";
}

function isOfficeDetailType(type: string) {
  return type === "OFIS_BURO";
}

function isTouristicType(type: string) {
  return getMainCategoryFromType(type) === "TURİSTİK TESİS";
}

function shouldShowRoomCountField(type: string) {
  return isResidentialDetailType(type) || isOfficeDetailType(type) || ["OTEL", "APART_OTEL", "BUTIK_OTEL", "MOTEL", "PANSIYON", "DEVRE_MULK"].includes(type);
}

function shouldShowBuildingAgeField(type: string) {
  return isResidentialDetailType(type) || isOfficeDetailType(type);
}

function shouldShowOpenAreaField(type: string) {
  return ["KAMP_YERI", "TATIL_KOYU"].includes(type);
}

function shouldShowClosedAreaField(type: string) {
  return type === "TATIL_KOYU";
}

function shouldShowBedCountField(type: string) {
  return ["OTEL", "BUTIK_OTEL", "MOTEL", "PANSIYON"].includes(type);
}

type AreaRule = {
  keywords: string[];
  min: number;
  max: number;
  label: string;
};


type FeatureOption = {
  key: string;
  label: string;
  group: string;
  groupLabel: string;
};

function makeFeatureKey(groupKey: string, option: string) {
  return `${groupKey}:${option}`;
}

function getFeatureIcon(value: string) {
  const normalized = normalizeTypeKey(value);

  if (normalized.includes("ASANSOR")) return "↕";
  if (normalized.includes("OTOPARK") || normalized.includes("ARAC PARK")) return "▣";
  if (normalized.includes("GUVENLIK")) return "◇";
  if (normalized.includes("SITE")) return "⌂";
  if (normalized.includes("JENERATOR") || normalized.includes("ELEKTRIK")) return "⚡";
  if (normalized.includes("YANGIN")) return "◉";
  if (normalized.includes("KAMERA")) return "◉";
  if (normalized.includes("SU") || normalized.includes("SONDAJ") || normalized.includes("KUYU")) return "≈";
  if (normalized.includes("FIBER") || normalized.includes("INTERNET") || normalized.includes("WI-FI")) return "⌁";
  if (normalized.includes("BANYO") || normalized.includes("WC") || normalized.includes("DUS")) return "○";
  if (normalized.includes("BALKON") || normalized.includes("TERAS")) return "▤";
  if (normalized.includes("KILER") || normalized.includes("DEPO")) return "▦";
  if (normalized.includes("MUTFAK")) return "◆";
  if (normalized.includes("AKILLI")) return "✦";
  if (normalized.includes("SOMINE") || normalized.includes("HAMAM") || normalized.includes("SAUNA") || normalized.includes("SPA")) return "♨";
  if (normalized.includes("KLIMA") || normalized.includes("SOGUK")) return "❄";
  if (normalized.includes("YALITIM")) return "☀";
  if (normalized.includes("DENIZ") || normalized.includes("GOL") || normalized.includes("NEHIR")) return "≈";
  if (normalized.includes("DOGA") || normalized.includes("DAG") || normalized.includes("ORMAN") || normalized.includes("PARK")) return "♧";
  if (normalized.includes("SEHIR") || normalized.includes("CADDE") || normalized.includes("MERKEZ")) return "▥";
  if (normalized.includes("YUKLEME") || normalized.includes("RAMPA")) return "⇅";
  if (normalized.includes("TIR") || normalized.includes("KAMYON")) return "▰";
  if (normalized.includes("VINC") || normalized.includes("SANAYI")) return "⚙";
  if (normalized.includes("YOL")) return "═";
  if (normalized.includes("TAPU") || normalized.includes("IMAR") || normalized.includes("KADASTRO")) return "⌖";
  if (normalized.includes("CEPHE") || normalized.includes("KOSE")) return "⌟";
  if (normalized.includes("HAVUZ")) return "≈";
  if (normalized.includes("MANZARA")) return "●";

  return "✓";
}

function getFeatureGroupTitle(group: string) {
  const labels: Record<string, string> = {
    interior: "İç Özellikler",
    exterior: "Dış Özellikler",
    location: "Muhit",
    transport: "Ulaşım",
    front: "Cephe",
    view: "Manzara",
    accessibility: "Engelliye / Yaşlıya Uygun",
    zoning: "Tapu / İmar",
    landInfrastructure: "Arazi Altyapısı",
    commercial: "Ticari Değer",
    tourism: "Turistik Tesis",
    luxury: "Lüks Özellikler",
  };

  return labels[group] || "Özellik";
}

function getFeatureGroupTone(group: string) {
  const tones: Record<string, string> = {
    interior: "from-violet-50 to-white text-violet-700 border-violet-100",
    exterior: "from-blue-50 to-white text-[#1557D6] border-blue-100",
    location: "from-emerald-50 to-white text-emerald-700 border-emerald-100",
    transport: "from-sky-50 to-white text-sky-700 border-sky-100",
    front: "from-amber-50 to-white text-amber-700 border-amber-100",
    view: "from-cyan-50 to-white text-cyan-700 border-cyan-100",
    accessibility: "from-indigo-50 to-white text-indigo-700 border-indigo-100",
    zoning: "from-orange-50 to-white text-orange-700 border-orange-100",
    landInfrastructure: "from-emerald-50 to-white text-emerald-700 border-emerald-100",
    commercial: "from-amber-50 to-white text-amber-700 border-amber-100",
    tourism: "from-fuchsia-50 to-white text-fuchsia-700 border-fuchsia-100",
    luxury: "from-slate-100 to-white text-slate-700 border-slate-200",
  };

  return tones[group] || "from-blue-50 to-white text-[#1557D6] border-blue-100";
}


const FEATURE_FILTERS = {
  villa: new Set([
    "Akıllı Ev",
    "Alarm (Hırsız)",
    "Alarm (Yangın)",
    "Barbekü",
    "Beyaz Eşya",
    "Çamaşır Odası",
    "Çelik Kapı",
    "Duşakabin",
    "Ebeveyn Banyosu",
    "Fiber İnternet",
    "Giyinme Odası",
    "Görüntülü Diafon",
    "Hilton Banyo",
    "Isıcam",
    "Jakuzi",
    "Klima",
    "Kiler",
    "Mutfak (Ankastre)",
    "Mutfak Doğalgazı",
    "Panjur / Jaluzi",
    "Parke Zemin",
    "Şömine",
    "Teras",
    "Vestiyer",
    "Yüz Tanıma & Parmak İzi",
    "Araç Şarj İstasyonu",
    "24 Saat Güvenlik",
    "Bahçe Terası",
    "Çocuk Oyun Parkı",
    "Hamam",
    "Isı Yalıtımı",
    "Jeneratör",
    "Kamera Sistemi",
    "Köpek Parkı",
    "Müstakil Havuzlu",
    "Sauna",
    "Ses Yalıtımı",
    "Spor Alanı",
    "Su Deposu",
    "Yüzme Havuzu (Açık)",
    "Yüzme Havuzu (Kapalı)",
    "Özel Havuz",
    "Sonsuzluk Havuzu",
    "Doğa İçinde",
    "Denize Sıfır",
    "Göle Sıfır",
    "Park",
    "Plaj",
    "Şehir Merkezi",
    "Anayol",
    "Cadde",
    "Sahil",
    "Asfalt Yol",
    "Doğu",
    "Güney",
    "Köşe Parsel",
    "Çift Cephe",
    "Boğaz",
    "Deniz",
    "Doğa",
    "Göl",
    "Havuz",
    "Park & Yeşil Alan",
    "Panoramik",
    "Özel İskele",
    "Marina Bağlantısı",
    "Akıllı Ev Sistemi",
    "Yerden Isıtma",
    "Otomatik Panjur",
    "Sinema Odası",
    "Hizmetli Odası",
  ]),
  land: new Set([
    "Köy Merkezi",
    "Köy Yakını",
    "Doğa İçinde",
    "Anayol",
    "Cadde",
    "Stabilize Yol",
    "Asfalt Yol",
    "Köşe Parsel",
    "Çift Cephe",
    "Cadde Cepheli",
    "Doğa",
    "Göl",
    "Nehir",
    "Dağ",
    "Vadi",
    "Panoramik",
    "Müstakil Tapu",
    "Hisseli Tapu",
    "İfrazlı",
    "Tevhidli",
    "Konut İmarlı",
    "Villa İmarlı",
    "Ticari İmarlı",
    "Sanayi İmarlı",
    "Turizm İmarlı",
    "Konut + Ticaret",
    "İmarsız",
    "Sit Alanı",
    "Kat Karşılığına Uygun",
    "Su Var",
    "Elektrik Var",
    "Doğalgaz Yakın",
    "Sondaj / Kuyu Var",
    "Sulama Kanalı",
    "Artezyen",
    "Damlama Sulama",
    "Yola Cepheli",
    "Kadastral Yolu Var",
    "Çit Çevrili",
    "Dere Kenarı",
    "Göl Kenarı",
    "Tarım Yapılıyor",
    "Meyve Ağaçları Var",
    "Zeytin Ağaçları Var",
  ]),
  commercial: new Set([
    "ADSL",
    "Alarm (Hırsız)",
    "Alarm (Yangın)",
    "Çelik Kapı",
    "Fiber İnternet",
    "Klima",
    "Mutfak Doğalgazı",
    "Spot Aydınlatma",
    "Yüz Tanıma & Parmak İzi",
    "Araç Şarj İstasyonu",
    "24 Saat Güvenlik",
    "Hidrofor",
    "Jeneratör",
    "Kamera Sistemi",
    "Su Deposu",
    "Yangın Merdiveni",
    "Alışveriş Merkezi",
    "Belediye",
    "Hastane",
    "Market",
    "Şehir Merkezi",
    "Anayol",
    "Cadde",
    "Dolmuş",
    "E-5",
    "Metro",
    "Metrobüs",
    "Minibüs",
    "Otobüs Durağı",
    "TEM",
    "Tramvay",
    "Köşe Parsel",
    "Çift Cephe",
    "Cadde Cepheli",
    "Araç Park Yeri",
    "Giriş / Rampa",
    "Cadde Üzeri",
    "Köşe Konum",
    "Tabela Değeri Yüksek",
    "Yaya Trafiği Yoğun",
    "Araç Trafiği Yoğun",
    "Kiracılı",
    "Devren",
    "Depolu",
    "Bacalı",
    "WC Var",
    "Mutfak Var",
    "Yükleme Alanı",
    "Tır Girişli",
    "Rampa Var",
    "Otopark Var",
  ]),
  tourism: new Set([
    "ADSL",
    "Beyaz Eşya",
    "Duşakabin",
    "Ebeveyn Banyosu",
    "Fiber İnternet",
    "Görüntülü Diafon",
    "Klima",
    "Mobilya",
    "Mutfak (Ankastre)",
    "Teras",
    "24 Saat Güvenlik",
    "Buhar Odası",
    "Çocuk Oyun Parkı",
    "Hamam",
    "Jeneratör",
    "Kamera Sistemi",
    "Sauna",
    "Spor Alanı",
    "Yüzme Havuzu (Açık)",
    "Yüzme Havuzu (Kapalı)",
    "Denize Sıfır",
    "Göle Sıfır",
    "Plaj",
    "Şehir Merkezi",
    "Doğa İçinde",
    "Havaalanı",
    "Sahil",
    "Deniz",
    "Doğa",
    "Göl",
    "Panoramik",
    "Açık Havuz",
    "Kapalı Havuz",
    "Spa",
    "Restoran",
    "Bar",
    "Toplantı Salonu",
    "Düğün Alanı",
    "Plaj Kullanımı",
    "Ruhsatlı",
    "Sezonluk İşletme",
    "12 Ay Açık",
    "Özel Havuz",
    "Sonsuzluk Havuzu",
    "Bahçe Terası",
    "Panoramik Manzara",
  ]),
} as const;

const GLOBAL_FEATURE_BLOCKLIST = new Set<string>();

const AGRICULTURE_PRECISE_FILTERS = {
  arsa: new Set([
    "Köy Yakını",
    "Doğa İçinde",
    "Anayol",
    "Cadde",
    "Stabilize Yol",
    "Asfalt Yol",
    "Köşe Parsel",
    "Çift Cephe",
    "Cadde Cepheli",
    "Müstakil Tapu",
    "Hisseli Tapu",
    "İfrazlı",
    "Tevhidli",
    "Konut İmarlı",
    "Villa İmarlı",
    "Ticari İmarlı",
    "Sanayi İmarlı",
    "Turizm İmarlı",
    "Konut + Ticaret",
    "İmarsız",
    "Kat Karşılığına Uygun",
    "Su Var",
    "Elektrik Var",
    "Doğalgaz Yakın",
    "Yola Cepheli",
    "Kadastral Yolu Var",
  ]),
  tarla: new Set([
    "Köy Merkezi",
    "Köy Yakını",
    "Doğa İçinde",
    "Stabilize Yol",
    "Asfalt Yol",
    "Doğa",
    "Dağ",
    "Vadi",
    "Müstakil Tapu",
    "Hisseli Tapu",
    "Su Var",
    "Elektrik Var",
    "Sondaj / Kuyu Var",
    "Sulama Kanalı",
    "Artezyen",
    "Damlama Sulama",
    "Yola Cepheli",
    "Kadastral Yolu Var",
    "Çit Çevrili",
    "Tarım Yapılıyor",
  ]),
  bag: new Set([
    "Köy Merkezi",
    "Köy Yakını",
    "Doğa İçinde",
    "Stabilize Yol",
    "Asfalt Yol",
    "Doğa",
    "Dağ",
    "Vadi",
    "Müstakil Tapu",
    "Hisseli Tapu",
    "Su Var",
    "Elektrik Var",
    "Sondaj / Kuyu Var",
    "Sulama Kanalı",
    "Damlama Sulama",
    "Yola Cepheli",
    "Kadastral Yolu Var",
    "Çit Çevrili",
    "Tarım Yapılıyor",
  ]),
  bahce: new Set([
    "Köy Merkezi",
    "Köy Yakını",
    "Doğa İçinde",
    "Asfalt Yol",
    "Doğa",
    "Göl",
    "Vadi",
    "Müstakil Tapu",
    "Hisseli Tapu",
    "Su Var",
    "Elektrik Var",
    "Sondaj / Kuyu Var",
    "Damlama Sulama",
    "Yola Cepheli",
    "Kadastral Yolu Var",
    "Çit Çevrili",
    "Meyve Ağaçları Var",
  ]),
  zeytinlik: new Set([
    "Köy Yakını",
    "Doğa İçinde",
    "Stabilize Yol",
    "Asfalt Yol",
    "Doğa",
    "Dağ",
    "Vadi",
    "Müstakil Tapu",
    "Hisseli Tapu",
    "Su Var",
    "Elektrik Var",
    "Sondaj / Kuyu Var",
    "Damlama Sulama",
    "Yola Cepheli",
    "Kadastral Yolu Var",
    "Çit Çevrili",
    "Zeytin Ağaçları Var",
  ]),
} as const;

function getFeatureFilterForType(type: string) {
  const normalized = normalizeTypeKey(type);

  if (normalized.includes("ZEYTINLIK")) return AGRICULTURE_PRECISE_FILTERS.zeytinlik;
  if (normalized === "BAG" || normalized.includes("BAG")) return AGRICULTURE_PRECISE_FILTERS.bag;
  if (normalized.includes("BAHCE")) return AGRICULTURE_PRECISE_FILTERS.bahce;
  if (normalized.includes("TARLA")) return AGRICULTURE_PRECISE_FILTERS.tarla;
  if (normalized.includes("ARSA") || normalized.includes("IMARLI")) return AGRICULTURE_PRECISE_FILTERS.arsa;

  if (isLandType(type)) return FEATURE_FILTERS.land;
  if (isCommercialType(type) || isIndustrialType(type)) return FEATURE_FILTERS.commercial;
  if (isTouristicType(type)) return FEATURE_FILTERS.tourism;
  if (isVillaType(type)) return FEATURE_FILTERS.villa;

  return null;
}

function getFeatureOptionsForType(type: string): FeatureOption[] {
  const allowedOptions = getFeatureFilterForType(type);

  return getFeatureGroups(getFeaturePresetKeys(type)).flatMap((group) =>
    group.options
      .filter((option) => !GLOBAL_FEATURE_BLOCKLIST.has(option))
      .filter((option) => !allowedOptions || allowedOptions.has(option))
      .map((option) => ({
        key: makeFeatureKey(group.key, option),
        label: option,
        group: group.key,
        groupLabel: group.label,
      })),
  );
}

const AREA_RULES: AreaRule[] = [
  {
    keywords: ["DAIRE", "REZIDANS", "APART", "STUDYO", "LOFT", "PENTHOUSE"],
    min: 20,
    max: 1000,
    label: "Daire / rezidans",
  },
  {
    keywords: ["VILLA", "KOSK", "YALI", "KONAK", "MUSTAKIL"],
    min: 50,
    max: 5000,
    label: "Villa / köşk / yalı",
  },
  {
    keywords: ["DUKKAN", "MAGAZA", "OFIS", "HOME_OFFICE", "PLAZA", "TICARI"],
    min: 10,
    max: 10000,
    label: "Dükkan / ofis / ticari alan",
  },
  {
    keywords: ["DEPO", "FABRIKA", "SANAYI", "ATOLYE", "IMALATHANE", "LOJISTIK"],
    min: 50,
    max: 100000,
    label: "Depo / fabrika / sanayi alanı",
  },
  {
    keywords: ["ARSA", "IMARLI", "KONUT_IMARLI", "TICARI_IMARLI"],
    min: 50,
    max: 1000000,
    label: "Arsa",
  },
  {
    keywords: ["TARLA", "BAG", "BAHCE", "ZEYTINLIK", "CIFTLIK"],
    min: 100,
    max: 10000000,
    label: "Tarla / bağ / bahçe",
  },
];

function formatFileSize(size: number) {
  if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(size / 1024))} KB`;
}

function isAcceptedImage(file: File) {
  const type = String(file.type || "").toLowerCase();

  if (!type) return true;

  return ACCEPTED_IMAGE_TYPES.includes(type);
}


function normalizeTurkishText(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("tr-TR")
    .split(/(\s+|\/|-)/)
    .map((part) => {
      if (/^\s+$|^\/$|^-$/.test(part)) return part;
      if (!part) return part;
      return part.charAt(0).toLocaleUpperCase("tr-TR") + part.slice(1);
    })
    .join("")
    .replace(/\s+/g, " ");
}






function formatPriceInput(value: string) {
  const onlyDigits = value.replace(/\D/g, "");
  if (!onlyDigits) return "";
  return Number(onlyDigits).toLocaleString("tr-TR");
}

function parseFormattedNumber(value: string) {
  return value.replace(/\D/g, "");
}

function getCurrencySymbol(value?: string) {
  return CURRENCY_OPTIONS.find((option) => option.value === value)?.symbol || "₺";
}

function getAreaRule(type: string) {
  const normalized = normalizeTypeKey(type);
  return (
    AREA_RULES.find((rule) =>
      rule.keywords.some((keyword) => normalized.includes(keyword)),
    ) || {
      keywords: [],
      min: 10,
      max: 1000000,
      label: "Bu mülk tipi",
    }
  );
}

function getFloorNumberFromLabel(label: string) {
  const exactFloor = label.match(/^(\d+)\. Kat$/);
  if (exactFloor) return exactFloor[1];

  if (label === "Zemin Kat" || label === "Giriş Katı" || label === "Dükkan Girişi") return "0";
  if (label === "Yüksek Giriş") return "1";

  const kot = label.match(/^Kot -(\d+)$/);
  if (kot) return `-${kot[1]}`;

  return "";
}

function getImageDimensions(file: File) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);

    image.onload = () => {
      const result = { width: image.width, height: image.height };
      URL.revokeObjectURL(url);
      resolve(result);
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Görsel okunamadı."));
    };

    image.src = url;
  });
}

export default function StokCreateModal({
  open,
  onClose,
  projects,
  crmCustomers = [],
  selectedProjectId,
  setSelectedProjectId,
  projectForm,
  setProjectForm,
  unitForm,
  setUnitForm,
  formError,
  formSuccess,
  formLoading,
  coverImage,
  setCoverImage,
  galleryImages,
  setGalleryImages,
  onSubmit,
}: Props) {
  const galleryInputRef = useRef<HTMLInputElement | null>(null);

  const [imageError, setImageError] = useState("");
  const [localError, setLocalError] = useState("");
  const [checkingImages, setCheckingImages] = useState(false);
  const [provinceOptions, setProvinceOptions] = useState<LocationOption[]>([]);
  const [districtOptions, setDistrictOptions] = useState<LocationOption[]>([]);
  const [placeOptions, setPlaceOptions] = useState<LocationOption[]>([]);
  const [locationLoading, setLocationLoading] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState("");
  const [selectedCrmCustomerId, setSelectedCrmCustomerId] = useState("");
  const [mainCategory, setMainCategory] = useState("KONUT");
  const [geoPickerOpen, setGeoPickerOpen] = useState(false);
  const [galleryPickerActive, setGalleryPickerActive] = useState(false);
  const [featuresOpen, setFeaturesOpen] = useState(false);
  const [expandedFeatureGroups, setExpandedFeatureGroups] = useState<string[]>([]);

  const selectedCurrency = String(unitForm.priceCurrency || "TRY");
  const selectedFloorLabel = String((unitForm as any).floorLabel || "");
  const buildingFloorCount = String((unitForm as any).totalFloors || "");
  const buildingAge = String((unitForm as any).buildingAge || "");
  const bedCount = String((unitForm as any).bedCount || "");
  const openArea = String((unitForm as any).openArea || "");
  const closedArea = String((unitForm as any).closedArea || "");
  const deedOwnerFullName = String((unitForm as any).deedOwnerFullName || "");
  const adaNo = String((unitForm as any).adaNo || "");
  const parselNo = String((unitForm as any).parselNo || "");
  const availableCreditAmountDisplay = formatPriceInput(String((unitForm as any).availableCreditAmount || ""));
  const doorAccessInfo = String((unitForm as any).doorAccessInfo || "");
  const selectedFeatures = Array.isArray((unitForm as any).features) ? ((unitForm as any).features as string[]) : [];
  const featureOptions = useMemo(() => getFeatureOptionsForType(unitForm.type), [unitForm.type]);
  const groupedFeatureOptions = useMemo(() => {
    const groupMap = new Map<string, { key: string; label: string; options: FeatureOption[] }>();

    featureOptions.forEach((feature) => {
      const existing = groupMap.get(feature.group);

      if (existing) {
        existing.options.push(feature);
        return;
      }

      groupMap.set(feature.group, {
        key: feature.group,
        label: feature.groupLabel || getFeatureGroupTitle(feature.group),
        options: [feature],
      });
    });

    return Array.from(groupMap.values()).filter((group) => group.options.length > 0);
  }, [featureOptions]);
  const selectedSubCategory = getSubCategoryFromType(unitForm.type);
  const subCategoryOptions = CATEGORY_OPTIONS[mainCategory] || CATEGORY_OPTIONS.KONUT;
  const roomOptions = isTouristicType(unitForm.type)
    ? TOURISTIC_ROOM_BED_COUNT_OPTIONS
    : isOfficeDetailType(unitForm.type)
      ? OFFICE_ROOM_COUNT_OPTIONS
      : ROOM_COUNT_OPTIONS;
  const priceDisplay = formatPriceInput(String(unitForm.price || ""));
  const descriptionLength = unitForm.description.length;
  const fieldRule = getFieldRule(unitForm.type);
  const specialFields = getSpecialFields(unitForm.type);
  const isRequiredField = (field: PortfolioFieldKey) => fieldRule.requiredFields.includes(field);
  const isVisibleField = (field: PortfolioFieldKey) => shouldShowField(unitForm.type, field);
  const showRoomCountField = isVisibleField("roomCount");
  const showBuildingAgeField = isVisibleField("buildingAge");
  const showFloorFields = isVisibleField("floor");
  const showBuildingFloorCount = isVisibleField("totalFloors");
  const showBedCountField = isVisibleField("bedCount");
  const showOpenAreaField = isVisibleField("openArea");
  const showClosedAreaField = isVisibleField("closedArea");
  const showAreaField = isVisibleField("area");
  const showAdaNoField = isVisibleField("adaNo");
  const showParselNoField = isVisibleField("parselNo");
  const showNumberField = isVisibleField("number");
  const showPriceField = isVisibleField("price");
  const showDescriptionField = isVisibleField("description");
  const showAvailableCreditAmountField = isVisibleField("availableCreditAmount");

  const totalSelectedImages = useMemo(() => {
    return galleryImages.length;
  }, [galleryImages.length]);

  useEffect(() => {
    if (!open) return;

    let alive = true;
    setLocationLoading(true);

    fetchProvinceOptions()
      .then((options) => {
        if (!alive) return;
        setProvinceOptions(options);
      })
      .finally(() => {
        if (alive) setLocationLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [open]);

  useEffect(() => {
    if (!open || !projectForm.city) {
      setDistrictOptions([]);
      setPlaceOptions([]);
      setSelectedPlace("");
      return;
    }

    let alive = true;
    setLocationLoading(true);
    setPlaceOptions([]);
    setSelectedPlace("");

    fetchDistrictOptions(projectForm.city)
      .then((options) => {
        if (!alive) return;
        setDistrictOptions(options);
      })
      .finally(() => {
        if (alive) setLocationLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [open, projectForm.city]);

  useEffect(() => {
    if (!open || !projectForm.city || !projectForm.district) {
      setPlaceOptions([]);
      setSelectedPlace("");
      return;
    }

    let alive = true;
    setLocationLoading(true);
    setSelectedPlace("");

    const districtId = districtOptions.find(
      (district) => district.name === projectForm.district,
    )?.id;

    fetchPlaceOptions(projectForm.city, projectForm.district, districtId)
      .then((options) => {
        if (!alive) return;
        setPlaceOptions(options);
      })
      .finally(() => {
        if (alive) setLocationLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [open, projectForm.city, projectForm.district, districtOptions]);

  useEffect(() => {
    if (!open) return;
    setMainCategory(getMainCategoryFromType(unitForm.type));
  }, [open, unitForm.type]);

  useEffect(() => {
    if (!open || typeof window === "undefined") return;

    const scrollY = window.scrollY;
    const originalOverflow = document.body.style.overflow;
    const originalPosition = document.body.style.position;
    const originalTop = document.body.style.top;
    const originalWidth = document.body.style.width;

    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.position = originalPosition;
      document.body.style.top = originalTop;
      document.body.style.width = originalWidth;
      window.scrollTo(0, scrollY);
    };
  }, [open]);

  useEffect(() => {
    if (!galleryPickerActive || typeof window === "undefined") return;

    const clearGalleryPickerActive = () => {
      window.setTimeout(() => setGalleryPickerActive(false), 300);
    };

    window.addEventListener("focus", clearGalleryPickerActive);

    return () => {
      window.removeEventListener("focus", clearGalleryPickerActive);
    };
  }, [galleryPickerActive]);

  useEffect(() => {
    setExpandedFeatureGroups([]);
  }, [unitForm.type]);

  if (!open) return null;

  const validateFiles = async (files: File[]) => {
    const invalidType = files.find((file) => !isAcceptedImage(file));

    if (invalidType) {
      return "Sadece JPG, PNG veya WEBP formatında görsel yükleyebilirsiniz.";
    }

    const tooLarge = files.find((file) => file.size > MAX_FILE_SIZE);

    if (tooLarge) {
      return `Seçtiğiniz görsel 15 MB sınırını aşıyor. Seçilen görsel: ${formatFileSize(tooLarge.size)}. Lütfen daha düşük boyutlu bir JPG, PNG veya WEBP görsel yükleyiniz. (${tooLarge.name})`;
    }

    const tooSmall = files.find((file) => file.size < MIN_FILE_SIZE);

    if (tooSmall) {
      return `Seçtiğiniz görsel dosyası çok küçük görünüyor. Lütfen daha kaliteli bir görsel yükleyiniz. (${tooSmall.name})`;
    }

    return "";
  };

  const getImageQualityWarning = async (files: File[]) => {
    const lowResolutionFiles: string[] = [];
    const unreadableFiles: string[] = [];

    for (const file of files) {
      try {
        const dimensions = await getImageDimensions(file);

        if (dimensions.width < MIN_IMAGE_WIDTH || dimensions.height < MIN_IMAGE_HEIGHT) {
          lowResolutionFiles.push(file.name);
        }
      } catch {
        unreadableFiles.push(file.name);
      }
    }

    if (lowResolutionFiles.length > 0) {
      return `Uyarı: ${lowResolutionFiles.length} görselin çözünürlüğü düşük olabilir. Yüklemeyi engellemedik, ancak daha kaliteli fotoğraf kullanmanız önerilir. (${lowResolutionFiles.slice(0, 3).join(", ")}${lowResolutionFiles.length > 3 ? ", ..." : ""})`;
    }

    if (unreadableFiles.length > 0) {
      return `Uyarı: ${unreadableFiles.length} görselin ön izlemesi tarayıcıda okunamadı. HEIC/HEIF veya cihaz kaynaklı olabilir; yüklemeyi engellemedik. (${unreadableFiles.slice(0, 3).join(", ")}${unreadableFiles.length > 3 ? ", ..." : ""})`;
    }

    return "";
  };

  const createLocalImage = (file: File): LocalPortfolioImage => ({
    id: `${file.name}-${file.size}-${file.lastModified}-${Math.random()
      .toString(16)
      .slice(2)}`,
    file,
    previewUrl: URL.createObjectURL(file),
  });

  const handleGalleryChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);

    setImageError("");
    setGalleryPickerActive(false);

    if (files.length === 0) {
      setGalleryPickerActive(false);
      return;
    }

    setGalleryPickerActive(false);

    const remaining = MAX_GALLERY_COUNT - galleryImages.length;

    if (remaining <= 0) {
      setImageError(`En fazla ${MAX_GALLERY_COUNT} galeri fotoğrafı yükleyebilirsiniz.`);
      event.target.value = "";
      return;
    }

    const acceptedFiles = files.slice(0, remaining);

    setCheckingImages(true);
    const error = await validateFiles(acceptedFiles);
    const qualityWarning = error ? "" : await getImageQualityWarning(acceptedFiles);
    setCheckingImages(false);

    if (error) {
      setImageError(error);
      event.target.value = "";
      return;
    }

    const newImages = acceptedFiles.map(createLocalImage);

    setGalleryImages((current) => {
      const nextImages = [...current, ...newImages];

      if (!coverImage && nextImages.length > 0) {
        setCoverImage(nextImages[0]);
      }

      return nextImages;
    });

    if (files.length > remaining) {
      setImageError(
        `En fazla ${MAX_GALLERY_COUNT} galeri fotoğrafı yükleyebilirsiniz. Fazla seçilen görseller eklenmedi.`,
      );
    } else if (qualityWarning) {
      setImageError(qualityWarning);
    }

    event.target.value = "";
  };

  const removeGalleryImage = (id: string) => {
    setGalleryImages((current) => {
      const removed = current.find((image) => image.id === id);
      const nextImages = current.filter((image) => image.id !== id);

      if (coverImage?.id === id) {
        setCoverImage(nextImages[0] || null);
      }

      if (removed?.previewUrl?.startsWith("blob:")) URL.revokeObjectURL(removed.previewUrl);

      return nextImages;
    });
  };

  const makeCoverImage = (image: LocalPortfolioImage) => {
    setCoverImage(image);
  };

  const setProjectField = (key: keyof ProjectFormState, value: string) => {
    setProjectForm((current) => ({ ...current, [key]: value }));
  };

  const setProjectFieldFormatted = (key: keyof ProjectFormState, value: string) => {
    setProjectForm((current) => ({ ...current, [key]: normalizeTurkishText(value) }));
  };

  const setUnitField = (key: keyof UnitFormState | string, value: string) => {
    setUnitForm((current) => ({ ...current, [key]: value } as UnitFormState));
  };


  const toggleFeature = (featureKey: string) => {
    setUnitForm((current) => {
      const currentFeatures = Array.isArray((current as any).features) ? ((current as any).features as string[]) : [];
      const exists = currentFeatures.includes(featureKey);
      const nextFeatures = exists
        ? currentFeatures.filter((item) => item !== featureKey)
        : [...currentFeatures, featureKey];

      return { ...current, features: nextFeatures } as UnitFormState;
    });
  };

  const toggleFeatureGroup = (groupKey: string) => {
    setExpandedFeatureGroups((current) =>
      current.includes(groupKey)
        ? current.filter((item) => item !== groupKey)
        : [...current, groupKey],
    );
  };

  const handleCrmCustomerSelect = (customerId: string) => {
    setSelectedCrmCustomerId(customerId);

    if (!customerId) return;

    const customer = crmCustomers.find((item) => item.id === customerId);

    if (!customer) return;

    const fullName = [customer.firstName, customer.lastName]
      .filter(Boolean)
      .join(" ")
      .trim();

    setUnitForm((current) => ({
      ...(current as any),
      deedOwnerFullName:
        fullName || (current as any).deedOwnerFullName || "",
    } as UnitFormState));

    if (!projectForm.city && customer.city) {
      setProjectForm((current) => ({ ...current, city: customer.city || current.city }));
    }
  };

  const validateSmartForm = () => {
    const area = Number(unitForm.area || 0);
    const price = Number(unitForm.price || 0);
    const number = String(unitForm.number || "").trim();
    const cleanAdaNo = sanitizeAdaNo(adaNo);
    const cleanParselNo = sanitizeParselNo(parselNo);
    const rule = getAreaRule(unitForm.type);

    if (area && (area < rule.min || area > rule.max)) {
      return `${rule.label} metrekare değeri mantıksız görünüyor. ${rule.min.toLocaleString("tr-TR")} m² ile ${rule.max.toLocaleString("tr-TR")} m² arasında bir değer giriniz veya bilgiyi kontrol ediniz.`;
    }

    if (isRequiredField("area") && !area) {
      return "Alan bilgisi zorunludur.";
    }

    if (isRequiredField("price") && !price) {
      return "Fiyat bilgisi zorunludur.";
    }

    if (adaNo && adaNo !== cleanAdaNo) {
      return "Ada No sadece rakamlardan oluşmalı ve en fazla 6 hane olmalıdır.";
    }

    if (parselNo && parselNo !== cleanParselNo) {
      return "Parsel No sadece rakamlardan oluşmalı ve en fazla 4 hane olmalıdır.";
    }

    if (isRequiredField("adaNo") && !cleanAdaNo) {
      return "Bu portföy tipi için Ada No zorunludur.";
    }

    if (isRequiredField("parselNo") && !cleanParselNo) {
      return "Bu portföy tipi için Parsel No zorunludur.";
    }

    if (isRequiredField("number") && !number) {
      return "Bağımsız bölüm / kapı numarası zorunludur.";
    }

    if (!isLandType(unitForm.type) && /^\d{5,}$/.test(number)) {
      return "Bağımsız bölüm / kapı numarası olağan dışı görünüyor. Lütfen değeri kontrol ediniz.";
    }

    if (price && (price < 100000 || price > 5000000000)) {
      return "Fiyat değeri olağan dışı görünüyor. Lütfen para birimini ve tutarı kontrol ediniz.";
    }

    if (isRequiredField("roomCount") && !String(unitForm.roomCount || "").trim()) {
      return "Oda sayısı zorunludur.";
    }

    if (isRequiredField("buildingAge") && !buildingAge) {
      return "Bina yaşı zorunludur.";
    }

    if (isRequiredField("floor") && !selectedFloorLabel) {
      return "Bulunduğu kat zorunludur.";
    }

    if (isRequiredField("totalFloors") && !buildingFloorCount) {
      return "Kat sayısı zorunludur.";
    }

    if (isRequiredField("bedCount") && !bedCount.trim()) {
      return "Yatak sayısı zorunludur.";
    }

    if (isRequiredField("closedArea") && !closedArea.trim()) {
      return "Kapalı alan zorunludur.";
    }

    if (isRequiredField("openArea") && !openArea.trim()) {
      return "Açık alan zorunludur.";
    }

    const missingSpecialField = specialFields.find((field) =>
      field.required && !String((unitForm as any)[field.key] || "").trim(),
    );

    if (missingSpecialField) {
      return `${missingSpecialField.label} zorunludur.`;
    }


    const availableCreditAmount = Number(String((unitForm as any).availableCreditAmount || "").replace(/\D/g, ""));

    if (availableCreditAmount && price && availableCreditAmount > price) {
      return "Kullanılabilir kredi tutarı satış fiyatından büyük olamaz.";
    }

    if (doorAccessInfo.length > 500) {
      return "Ziyaret ve erişim notları en fazla 500 karakter olabilir.";
    }

    if (descriptionLength > MAX_DESCRIPTION_LENGTH) {
      return `Açıklama alanı en fazla ${MAX_DESCRIPTION_LENGTH} karakter olabilir.`;
    }

    if (showFloorFields && selectedFloorLabel && buildingFloorCount) {
      const foundFloor = Number(getFloorNumberFromLabel(selectedFloorLabel));
      const totalFloor = Number(buildingFloorCount);

      if (foundFloor > totalFloor) {
        return "Bulunduğu kat, toplam kat sayısından büyük olamaz. Lütfen kat bilgisini kontrol ediniz.";
      }
    }

    return "";
  };

  const handleSubmit = () => {
    setLocalError("");
    const error = validateSmartForm();

    if (error) {
      setLocalError(error);
      return;
    }

    onSubmit();
  };

  const footerAlertMessage = localError || formError || imageError || "";

  return (
    <div className="stock-modal-v2-backdrop" onClick={onClose}>
      <div
        className="stock-modal-v2 stock-modal-v10"
        onClick={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
      >
        <button className="stock-modal-v10-close" onClick={onClose} aria-label="Kapat">×</button>

        <div className="stock-modal-v2-body stock-modal-v10-body" style={{ paddingBottom: "156px" }}>
          {formSuccess && <div className="stock-form-success">Portföy başarıyla eklendi.</div>}
          {formError && <div className="stock-form-error">{formError}</div>}
          {localError && <div className="stock-form-error">{localError}</div>}
          {imageError && <div className="stock-form-error">{imageError}</div>}

          <div className="stock-form-block rounded-[30px] border-2 border-[#D7E1EF] bg-[#F8FAFC] p-3 shadow-[0_22px_54px_rgba(15,23,42,0.14)]">
            <div className="stock-form-grid">
              <section className="col-span-full rounded-[26px] border-2 border-[#F2C66D] bg-[#FFF7E6] p-3 shadow-[0_14px_30px_rgba(180,83,9,0.08)]">
                <div className="mb-3 rounded-[16px] bg-[#F59E0B] px-3 py-2 text-center text-[11px] font-black uppercase tracking-[0.12em] text-white">
                  Proje Bilgileri
                </div>
                <div className="grid gap-3">
              {projects.length > 0 && (
                <label className="stock-form-field full">
                  <span>Mevcut Projeye Ekle</span>
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                  >
                    <option value="">Yeni Proje Oluştur</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.city})
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {!selectedProjectId && (
                <label className="stock-form-field full">
                  <span>Proje Adı *</span>
                  <input
                    value={projectForm.name}
                    onChange={(e) => setProjectField("name", e.target.value)}
                    onBlur={(e) => setProjectFieldFormatted("name", e.target.value)}
                  />
                </label>
              )}
                </div>
              </section>

              <section className="col-span-full rounded-[26px] border-2 border-[#8CC8F6] bg-[#EDF8FF] p-3 shadow-[0_14px_30px_rgba(2,132,199,0.08)]">
                <div className="mb-3 rounded-[16px] bg-[#0284C7] px-3 py-2 text-center text-[11px] font-black uppercase tracking-[0.12em] text-white">
                  Adres Bilgileri
                </div>
                <div className="grid gap-3">
              <label className="stock-form-field">
                <span>Şehir *</span>
                <select
                  value={projectForm.city}
                  onChange={(e) => {
                    const nextCity = e.target.value;
                    setProjectForm((current) => ({
                      ...current,
                      city: nextCity,
                      district: "",
                      address: "",
                    }));
                    setSelectedPlace("");
                  }}
                >
                  <option value="">Şehir seçiniz</option>
                  {provinceOptions.map((city) => (
                    <option key={city.id} value={city.name}>
                      {city.name}
                    </option>
                  ))}
                </select>
                {locationLoading && (
                  <p className="mt-2 text-center text-xs font-bold text-[#64748B]">
                    Konum verisi yükleniyor...
                  </p>
                )}
              </label>

              <label className="stock-form-field">
                <span>İlçe *</span>
                {districtOptions.length > 0 ? (
                  <select
                    value={projectForm.district}
                    onChange={(e) => {
                      setProjectField("district", e.target.value);
                      setProjectField("address", "");
                      setSelectedPlace("");
                    }}
                  >
                    <option value="">İlçe seçiniz</option>
                    {districtOptions.map((district) => (
                      <option key={district.id} value={district.name}>
                        {district.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    value={projectForm.district}
                    onChange={(e) => setProjectField("district", e.target.value)}
                    onBlur={(e) => setProjectFieldFormatted("district", e.target.value)}
                    placeholder={
                      locationLoading ? "İlçeler yükleniyor..." : "İlçe yazınız"
                    }
                  />
                )}
              </label>

              <label className="stock-form-field full">
                <span>Mahalle / Köy / Mevki *</span>
                {placeOptions.length > 0 ? (
                  <select
                    value={selectedPlace || projectForm.address}
                    onChange={(e) => {
                      const value = e.target.value;
                      setSelectedPlace(value);
                      setProjectField("address", value);
                    }}
                  >
                    <option value="">Mahalle / köy seçiniz</option>
                    {projectForm.address && !placeOptions.some((place) => place.name === projectForm.address) && (
                      <option value={projectForm.address}>{projectForm.address}</option>
                    )}
                    {placeOptions.map((place) => (
                      <option key={place.id} value={place.name}>
                        {place.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    value={projectForm.address}
                    onChange={(e) => setProjectField("address", e.target.value)}
                    onBlur={(e) => setProjectFieldFormatted("address", e.target.value)}
                    placeholder={
                      locationLoading
                        ? "Mahalle / köy verisi yükleniyor..."
                        : "Mahalle / köy / mevki yazınız"
                    }
                  />
                )}
              </label>
                </div>
              </section>

              <section className="col-span-full rounded-[26px] border-2 border-[#F3A7A7] bg-[#FFF1F2] p-3 shadow-[0_14px_30px_rgba(225,29,72,0.08)]">
                <div className="mb-3 rounded-[16px] bg-[#E11D48] px-3 py-2 text-center text-[11px] font-black uppercase tracking-[0.12em] text-white">
                  Harita ve Konum Doğrulama
                </div>
              <div className="stock-form-field full">
                <GoogleGeoPicker
                  city={projectForm.city}
                  district={projectForm.district}
                  address={projectForm.address}
                  latitude={Number((projectForm as any).latitude || 0) || null}
                  longitude={Number((projectForm as any).longitude || 0) || null}
                  mapAddress={String((projectForm as any).mapAddress || "")}
                  placeId={String((projectForm as any).placeId || "")}
                  onOpenChange={setGeoPickerOpen}
                  onChange={(location) => {
                    const nextAddress = String((location as any).address || "").trim();

                    if (nextAddress) {
                      setSelectedPlace(nextAddress);
                    }

                    setProjectForm((current) => ({
                      ...(current as any),
                      city: String((location as any).city || current.city || "").trim(),
                      district: String((location as any).district || current.district || "").trim(),
                      address: nextAddress || current.address || location.mapAddress,
                      latitude: location.latitude,
                      longitude: location.longitude,
                      mapAddress: location.mapAddress,
                      placeId: location.placeId || "",
                    }));
                  }}
                />
              </div>
              </section>
            </div>
          </div>

          <div className="stock-form-block rounded-[30px] border-2 border-[#D7E1EF] bg-[#F8FAFC] p-3 shadow-[0_22px_54px_rgba(15,23,42,0.14)]">
            <div className="stock-form-grid">
              <section className="col-span-full rounded-[26px] border-2 border-[#B8AEF4] bg-[#F4F1FF] p-3 shadow-[0_14px_30px_rgba(109,40,217,0.08)]">
                <div className="mb-3 rounded-[16px] bg-[#6D28D9] px-3 py-2 text-center text-[11px] font-black uppercase tracking-[0.12em] text-white">
                  Portföy Temel Bilgileri
                </div>
                <div className="grid gap-3">
              <label className="stock-form-field">
                <span>Mülk Tipi *</span>
                <select
                  value={mainCategory}
                  onChange={(e) => {
                    const nextMainCategory = e.target.value;
                    const firstSubCategory = CATEGORY_OPTIONS[nextMainCategory]?.[0] || "Daire";
                    const nextType = getTypeKeyFromCategory(nextMainCategory, firstSubCategory);

                    setMainCategory(nextMainCategory);
                    setUnitForm((current) => ({
                      ...current,
                      type: nextType,
                      roomCount: "",
                      floor: "",
                      floorLabel: "",
                      totalFloors: "",
                      number: "",
                      adaNo: "",
                      parselNo: "",
                      openArea: "",
                      closedArea: "",
                      bedCount: "",
                      ...Object.fromEntries(SPECIAL_FIELD_KEYS.map((key) => [key, ""])),
                    } as UnitFormState));
                    setLocalError("");
                  }}
                >
                  {MAIN_CATEGORY_OPTIONS.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>

              <label className="stock-form-field">
                <span>Alt Kategori *</span>
                <select
                  value={selectedSubCategory}
                  onChange={(e) => {
                    const subCategory = e.target.value;
                    const nextType = getTypeKeyFromCategory(mainCategory, subCategory);

                    setUnitForm((current) => ({
                      ...current,
                      type: nextType,
                      roomCount: "",
                      floor: "",
                      floorLabel: "",
                      totalFloors: "",
                      number: "",
                      adaNo: "",
                      parselNo: "",
                      openArea: "",
                      closedArea: "",
                      bedCount: "",
                      ...Object.fromEntries(SPECIAL_FIELD_KEYS.map((key) => [key, ""])),
                    } as UnitFormState));
                    setLocalError("");
                  }}
                >
                  {subCategoryOptions.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>

              <label className="stock-form-field">
                <span>Durum *</span>
                <select
                  value={unitForm.status}
                  onChange={(e) => setUnitField("status", e.target.value)}
                >
                  {Object.entries(STATUS_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </label>

              {showRoomCountField && (
                <label className="stock-form-field">
                  <span>{getFieldLabel("roomCount", unitForm.type, isRequiredField("roomCount"))}</span>
                  <select
                    value={unitForm.roomCount}
                    onChange={(e) => setUnitField("roomCount", e.target.value)}
                  >
                    <option value="">Oda sayısı seçiniz</option>
                    {roomOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {showAreaField && (
                <label className="stock-form-field">
                  <span>{getFieldLabel("area", unitForm.type, isRequiredField("area"))}</span>
                  <input
                    type="number"
                    value={unitForm.area}
                    onChange={(e) => setUnitField("area", e.target.value)}
                    placeholder="Örn: 190"
                  />
                </label>
              )}

              {showOpenAreaField && (
                <label className="stock-form-field">
                  <span>{getFieldLabel("openArea", unitForm.type, isRequiredField("openArea"))}</span>
                  <input
                    type="number"
                    value={openArea}
                    onChange={(e) => setUnitField("openArea", e.target.value)}
                    placeholder="Örn: 5000"
                  />
                </label>
              )}

              {showClosedAreaField && (
                <label className="stock-form-field">
                  <span>{getFieldLabel("closedArea", unitForm.type, isRequiredField("closedArea"))}</span>
                  <input
                    type="number"
                    value={closedArea}
                    onChange={(e) => setUnitField("closedArea", e.target.value)}
                    placeholder="Örn: 1200"
                  />
                </label>
              )}

              {showBedCountField && (
                <label className="stock-form-field">
                  <span>{getFieldLabel("bedCount", unitForm.type, isRequiredField("bedCount"))}</span>
                  <select
                    value={bedCount}
                    onChange={(e) => setUnitField("bedCount", e.target.value)}
                  >
                    <option value="">Yatak sayısı seçiniz</option>
                    {TOURISTIC_BED_COUNT_VALUE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {showBuildingAgeField && (
                <label className="stock-form-field">
                  <span>{getFieldLabel("buildingAge", unitForm.type, isRequiredField("buildingAge"))}</span>
                  <select
                    value={buildingAge}
                    onChange={(e) => setUnitField("buildingAge", e.target.value)}
                  >
                    <option value="">Bina yaşı seçiniz</option>
                    {BUILDING_AGE_OPTIONS.map((age) => (
                      <option key={age} value={age}>
                        {age}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {showFloorFields && (
                <label className="stock-form-field">
                  <span>{getFieldLabel("floor", unitForm.type, isRequiredField("floor"))}</span>
                  <select
                    value={selectedFloorLabel}
                    onChange={(e) => {
                      const label = e.target.value;
                      setUnitForm((current) => ({
                        ...current,
                        floorLabel: label,
                        floor: getFloorNumberFromLabel(label),
                      } as UnitFormState));
                    }}
                  >
                    <option value="">Kat seçiniz</option>
                    {FLOOR_LABEL_OPTIONS.map((floor) => (
                      <option key={floor} value={floor}>
                        {floor}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {showBuildingFloorCount && (
                <label className="stock-form-field">
                  <span>{getFieldLabel("totalFloors", unitForm.type, isRequiredField("totalFloors"))}</span>
                  <select
                    value={buildingFloorCount}
                    onChange={(e) => setUnitField("totalFloors", e.target.value)}
                  >
                    <option value="">Seçiniz</option>
                    {BUILDING_FLOOR_OPTIONS.map((floor) => (
                      <option key={floor} value={floor}>
                        {floor} Katlı
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {specialFields.map((field) => (
                <label key={field.key} className="stock-form-field">
                  <span>{field.label}{field.required ? " *" : ""}</span>
                  <select
                    value={String((unitForm as any)[field.key] || "")}
                    onChange={(e) => setUnitField(field.key, e.target.value)}
                  >
                    <option value="">Seçiniz</option>
                    {field.options.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
              ))}

              {fieldRule.note && (
                <div className="stock-form-field full">
                  <p className="rounded-[16px] border border-[#C7D6E8] bg-[#F8FAFC] px-3 py-2 text-center text-xs font-bold leading-5 text-[#64748B]">
                    {fieldRule.note}
                  </p>
                </div>
              )}

                </div>
              </section>

              <section className="col-span-full rounded-[26px] border-2 border-[#7DD3FC] bg-[#ECFEFF] p-3 shadow-[0_14px_30px_rgba(8,145,178,0.08)]">
                <div className="mb-3 rounded-[16px] bg-[#0891B2] px-3 py-2 text-center text-[11px] font-black uppercase tracking-[0.12em] text-white">
                  Ada, Parsel ve Fiyat Bilgileri
                </div>
                <div className="grid gap-3">
              {showAdaNoField && (
                <label className="stock-form-field">
                  <span>{getFieldLabel("adaNo", unitForm.type, isRequiredField("adaNo"))}</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={adaNo}
                    onChange={(e) => setUnitField("adaNo", sanitizeAdaNo(e.target.value))}
                    placeholder="Örn: 4752"
                    maxLength={6}
                  />
                </label>
              )}

              {showParselNoField && (
                <label className="stock-form-field">
                  <span>{getFieldLabel("parselNo", unitForm.type, isRequiredField("parselNo"))}</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={parselNo}
                    onChange={(e) => setUnitField("parselNo", sanitizeParselNo(e.target.value))}
                    placeholder="Örn: 11"
                    maxLength={4}
                  />
                </label>
              )}

              {showNumberField && (
                <label className="stock-form-field">
                  <span>{getFieldLabel("number", unitForm.type, isRequiredField("number"))}</span>
                  <input
                    value={unitForm.number}
                    onChange={(e) => setUnitField("number", e.target.value)}
                    placeholder={getNumberPlaceholder(unitForm.type)}
                  />
                </label>
              )}

              {showPriceField && (
                <>
                  <label className="stock-form-field">
                    <span>Para Birimi *</span>
                    <select
                      value={selectedCurrency}
                      onChange={(e) => setUnitField("priceCurrency", e.target.value)}
                    >
                      {CURRENCY_OPTIONS.map((currency) => (
                        <option key={currency.value} value={currency.value}>
                          {currency.symbol} {currency.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="stock-form-field full">
                    <span>{getFieldLabel("price", unitForm.type, isRequiredField("price"))} ({getCurrencySymbol(selectedCurrency)})</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={priceDisplay}
                      onChange={(e) => setUnitField("price", parseFormattedNumber(e.target.value))}
                      placeholder="Örn: 10.500.000"
                    />
                  </label>
                </>
              )}

              {showDescriptionField && (
                <label className="stock-form-field full">
                  <span>{getFieldLabel("description", unitForm.type, isRequiredField("description"))}</span>
                  <textarea
                    maxLength={MAX_DESCRIPTION_LENGTH}
                    value={unitForm.description}
                    onChange={(e) => setUnitField("description", e.target.value)}
                    onBlur={(e) => setUnitField("description", normalizeTurkishText(e.target.value))}
                  />
                  <p className={`mt-2 text-xs font-black ${descriptionLength > 450 ? "text-amber-700" : "text-[#64748B]"}`}>
                    {descriptionLength} / {MAX_DESCRIPTION_LENGTH} karakter
                  </p>
                </label>
              )}
                </div>
              </section>
            </div>
          </div>


          <div className="stock-form-block rounded-[30px] border-[3px] border-[#8B5CF6] bg-[#F5F3FF] p-3 shadow-[0_22px_54px_rgba(109,40,217,0.14)] ring-4 ring-[#DDD6FE]/70">
            <div className="mb-3 rounded-[16px] bg-[#7C3AED] px-3 py-2 text-center text-[11px] font-black uppercase tracking-[0.12em] text-white shadow-[0_10px_24px_rgba(124,58,237,0.24)]">
              Ek Özellikler
            </div>
            <div className="stock-form-grid rounded-[24px] border-2 border-[#A78BFA] bg-[#FCFAFF] p-3 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.75),0_14px_30px_rgba(109,40,217,0.08)]">
              <div className="stock-form-field full">
                <button
                  type="button"
                  onClick={() => setFeaturesOpen((current) => !current)}
                  className={`relative flex min-h-[64px] w-full items-center justify-between gap-3 overflow-hidden rounded-[24px] border-2 px-4 text-left shadow-[0_18px_42px_rgba(15,23,42,0.12)] transition active:scale-[0.99] ${
                    featuresOpen
                      ? "border-[#D6E1F0] bg-white"
                      : "border-[#D6E1F0] bg-white"
                  }`}
                >
                  <span className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-[#1557D6]/8" />
                  <span className="relative flex min-w-0 items-center gap-3">
                    <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] text-[18px] font-black shadow-[0_10px_22px_rgba(21,87,214,0.16)] ${featuresOpen ? "bg-[#1557D6] text-white" : "bg-white text-[#1557D6]"}`}>
                      ✦
                    </span>
                    <span className="min-w-0">
                      <b className="block text-[14px] font-black tracking-[-0.02em] text-[#06194A]">Ek Özellikler</b>
                      <small className="mt-0.5 block text-[11px] font-bold leading-4 text-[#64748B]">
                        {selectedFeatures.length > 0 ? `${selectedFeatures.length} özellik seçildi · Portföy kartında özellik rozeti olarak görünür` : "Bu portföy tipine uygun ek özellikleri seç"}
                      </small>
                    </span>
                  </span>
                  <span className={`relative shrink-0 rounded-full px-4 py-2 text-[11px] font-black shadow-[0_10px_22px_rgba(21,87,214,0.14)] ${featuresOpen ? "bg-[#06194A] text-white" : "bg-[#1557D6] text-white"}`}>
                    {featuresOpen ? "Gizle" : "Göster"}
                  </span>
                </button>
              </div>

              {featuresOpen && (
                <div className="stock-form-field full">
                  <div className="rounded-[26px] border border-[#DDE7F3] bg-gradient-to-b from-white to-[#F8FAFC] p-3 shadow-[0_18px_44px_rgba(15,23,42,0.07)]">
                    <div className="mb-3 flex items-center justify-between gap-2 rounded-[20px] bg-[#15803D] px-3 py-2 text-white shadow-[0_14px_30px_rgba(21,128,61,0.18)]">
                      <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/60">Öne Çıkanlar</p>
                        <p className="mt-0.5 text-[12px] font-black leading-4">Seçilenler portföy detayında özellik rozeti olarak görünür.</p>
                      </div>
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[16px] bg-white/12 text-[13px] font-black">
                        {selectedFeatures.length}/{featureOptions.length}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {groupedFeatureOptions.map((group) => {
                        const groupOpen = expandedFeatureGroups.includes(group.key);
                        const selectedInGroup = group.options.filter((feature) => selectedFeatures.includes(feature.key)).length;

                        return (
                          <div key={group.key} className="overflow-hidden rounded-[20px] border-2 border-[#D6E4F4] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
                            <button
                              type="button"
                              onClick={() => toggleFeatureGroup(group.key)}
                              className={`grid min-h-[62px] w-full grid-cols-[1fr_42px] items-center gap-3 px-4 py-2 text-center transition active:scale-[0.99] ${
                                groupOpen ? "bg-[#F8FAFC]" : "bg-white"
                              }`}
                              aria-expanded={groupOpen}
                            >
                              <span className="min-w-0">
                                <b className="block truncate text-[12px] font-black uppercase tracking-[0.08em] text-[#06194A]">{group.label}</b>
                                <small className="mt-0.5 block text-[10px] font-bold text-[#64748B]">
                                  {selectedInGroup > 0 ? `${selectedInGroup} seçili · ${group.options.length} seçenek` : `${group.options.length} seçenek`}
                                </small>
                              </span>

                              <span className={`flex h-9 w-9 items-center justify-center justify-self-end rounded-[14px] text-[18px] font-black transition ${groupOpen ? "bg-[#06194A] text-white" : "bg-[#EFF6FF] text-[#1557D6]"}`}>
                                {groupOpen ? "−" : "+"}
                              </span>
                            </button>

                            {groupOpen && (
                              <div className="grid grid-cols-2 gap-2 border-t-2 border-[#D6E4F4] bg-[#EEF5FF] p-2 md:grid-cols-3">
                                {group.options.map((feature, index) => {
                                  const checked = selectedFeatures.includes(feature.key);
                                  const isLastOdd = group.options.length % 2 === 1 && index === group.options.length - 1;

                                  return (
                                    <button
                                      key={feature.key}
                                      type="button"
                                      onClick={() => toggleFeature(feature.key)}
                                      className={`group relative flex min-h-[58px] items-center justify-center overflow-hidden rounded-[18px] border px-2.5 text-center text-[11px] font-black shadow-[0_10px_22px_rgba(15,23,42,0.06)] transition active:scale-[0.98] ${isLastOdd ? "col-span-2 mx-auto w-[calc(50%-0.25rem)] min-w-[136px] md:col-span-1 md:col-start-2 md:w-full" : "w-full"} ${
                                        checked
                                          ? "border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-emerald-100 text-emerald-800 ring-1 ring-emerald-100"
                                          : "border-[#DDE7F3] bg-white text-[#475569] hover:border-[#BFD3F7] hover:bg-white"
                                      }`}
                                    >
                                      <span className={`absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black ${checked ? "bg-emerald-600 text-white" : "bg-[#F1F5F9] text-[#94A3B8]"}`}>
                                        {checked ? "✓" : "+"}
                                      </span>
                                      <span className="flex flex-col items-center justify-center gap-1.5 px-1">
                                        <span className="line-clamp-2 leading-tight">{feature.label}</span>
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {selectedFeatures.length > 0 && (
                      <div className="mt-3 flex items-center justify-center">
                        <button
                          type="button"
                          onClick={() => setUnitField("features", [] as any)}
                          className="flex min-h-[38px] items-center justify-center rounded-[14px] bg-rose-50 px-4 py-2 text-center text-[11px] font-black text-rose-700 shadow-[0_10px_22px_rgba(225,29,72,0.08)] transition active:scale-[0.98]"
                        >
                          Seçimleri Temizle
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="stock-form-block rounded-[30px] border-[3px] border-[#F59E0B] bg-[#FFE7AD] p-3 shadow-[0_22px_54px_rgba(180,83,9,0.20)] ring-4 ring-[#FCD34D]/80">
            <div className="mb-3 rounded-[16px] bg-[#D97706] px-3 py-2 text-center text-[11px] font-black uppercase tracking-[0.12em] text-white shadow-[0_10px_24px_rgba(217,119,6,0.24)]">
              Ziyaret ve Erişim
            </div>
            <div className="stock-form-grid rounded-[24px] border-2 border-[#E9A93C] bg-[#FFF0C7] p-3 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.65),0_14px_30px_rgba(180,83,9,0.14)]">
              <div className="stock-form-field full rounded-[24px] border-2 border-[#F2B94B] bg-[#FFF8E1] p-4 shadow-[0_18px_42px_rgba(180,83,9,0.12)]">
                <span className="inline-flex w-full items-center justify-center gap-2 rounded-[16px] border border-[#F3C96B] bg-[#FFF1C8] px-3 py-2 text-[#06194A]">🔒 Ziyaret ve Erişim Bilgileri</span>
                <p className="mt-2 text-center text-xs font-bold leading-5 text-[#64748B]">
                  Ziyaret saati, randevu bilgisi, yol tarifi veya erişim notları burada tutulur. Havuzda ve genel görünümde gerçek değer gösterilmez.
                </p>
              </div>

              <label className="stock-form-field full rounded-[24px] border-2 border-[#F2B94B] bg-[#FFF8E1] p-4 text-center shadow-[0_18px_42px_rgba(180,83,9,0.12)]">
                <span>Ziyaret ve Erişim Notları</span>
                <textarea
                  maxLength={500}
                  value={doorAccessInfo}
                  onChange={(e) => setUnitField("doorAccessInfo", e.target.value)}
                  placeholder="Ziyaret ve erişimle ilgili bilinmesi gereken bilgileri yazın..."
                />
                <p className="mt-2 text-center text-xs font-black text-[#64748B]">
                  Ekranda kullanıcıya: “🔒 Randevulaşma sonrası portföy sahibinden talep ediniz.” şeklinde gösterilir.
                </p>
              </label>
            </div>
          </div>

          <div className="stock-form-block rounded-[30px] border-[3px] border-[#A855F7] bg-[#EEDBFF] p-3 shadow-[0_22px_54px_rgba(126,34,206,0.20)] ring-4 ring-[#D8B4FE]/85">
            <div className="mb-3 rounded-[16px] bg-[#9333EA] px-3 py-2 text-center text-[11px] font-black uppercase tracking-[0.12em] text-white shadow-[0_10px_24px_rgba(147,51,234,0.24)]">
              Tapu Sahibi
            </div>
            <div className="stock-form-grid rounded-[24px] border-2 border-[#C084FC] bg-[#F4E6FF] p-3 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.65),0_14px_30px_rgba(126,34,206,0.14)]">
              <div className="stock-form-field full rounded-[24px] border-2 border-[#D8B4FE] bg-[#FBF3FF] p-4 shadow-[0_16px_36px_rgba(126,34,206,0.10)]">
                <span className="inline-flex w-full items-center justify-center gap-2 rounded-[16px] border border-[#D8B4FE] bg-[#F1E2FF] px-3 py-2 text-[#06194A]">
                  👤 Tapu Sahibi
                </span>
                <p className="mt-2 text-center text-xs font-bold leading-5 text-[#64748B]">
                  Tapu sahibini CRM kayıtlarınızdan seçin veya yalnızca ad soyad bilgisini girin.
                </p>
              </div>

              {crmCustomers.length > 0 && (
                <label className="stock-form-field full rounded-[24px] border-2 border-[#D8B4FE] bg-[#FBF3FF] p-4 shadow-[0_16px_36px_rgba(126,34,206,0.10)]">
                  <span>CRM’den Tapu Sahibi Seç</span>
                  <select
                    value={selectedCrmCustomerId}
                    onChange={(e) => handleCrmCustomerSelect(e.target.value)}
                  >
                    <option value="">CRM kaydı seçmeden devam et</option>
                    {crmCustomers.map((customer) => {
                      const fullName = [customer.firstName, customer.lastName]
                        .filter(Boolean)
                        .join(" ")
                        .trim() || "İsimsiz CRM Kaydı";

                      return (
                        <option key={customer.id} value={customer.id}>
                          {fullName}
                        </option>
                      );
                    })}
                  </select>
                  <small className="stock-upload-hint">
                    Seçilen CRM kaydının ad soyad bilgisi otomatik doldurulur.
                  </small>
                </label>
              )}

              <label className="stock-form-field full rounded-[24px] border-2 border-[#D8B4FE] bg-[#FBF3FF] p-4 shadow-[0_16px_36px_rgba(126,34,206,0.10)]">
                <span>Tapu Sahibi Ad Soyad</span>
                <input
                  value={deedOwnerFullName}
                  onChange={(e) =>
                    setUnitField("deedOwnerFullName", e.target.value)
                  }
                  onBlur={(e) =>
                    setUnitField(
                      "deedOwnerFullName",
                      normalizeTurkishText(e.target.value),
                    )
                  }
                  placeholder="Örn: Ahmet Yılmaz"
                />
              </label>
            </div>
          </div>

          <div className="stock-form-block rounded-[30px] border-[3px] border-[#FB923C] bg-[#FFF7ED] p-3 shadow-[0_22px_54px_rgba(194,65,12,0.14)] ring-4 ring-[#FED7AA]/70">
            <div className="mb-3 rounded-[16px] bg-[#EA580C] px-3 py-2 text-center text-[11px] font-black uppercase tracking-[0.12em] text-white shadow-[0_10px_24px_rgba(234,88,12,0.24)]">
              Portföy Fotoğrafları
            </div>
            <div className="stock-form-grid rounded-[24px] border-2 border-[#FDBA74] bg-[#FFFCF7] p-3 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.8),0_14px_30px_rgba(194,65,12,0.08)]">
              <div className="stock-form-field full">
                <span className="inline-flex w-full items-center justify-center gap-2 rounded-[16px] border-b border-[#D6E1F0] bg-white px-3 py-2 text-[#06194A]">🖼️ Galeriye Fotoğraf Ekle * ({galleryImages.length}/{MAX_GALLERY_COUNT})</span>
                <small className="stock-upload-hint block text-center">
                  JPG / PNG / WEBP · min. 800×600 px · önerilen 1920×1080 · maks. 15 MB
                </small>

                <input
                  ref={galleryInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={handleGalleryChange}
                  style={{ display: "none" }}
                />

                <button
                  type="button"
                  className="stock-save-btn"
                  onClick={() => {
                    setGalleryPickerActive(true);
                    galleryInputRef.current?.click();
                  }}
                  disabled={galleryImages.length >= MAX_GALLERY_COUNT || checkingImages}
                >
                  {checkingImages ? "Görseller kontrol ediliyor..." : "Galeriye Fotoğraf Ekle"}
                </button>

                <p className="mt-2 text-xs font-bold text-[#64748B]">
                  İlk eklenen fotoğraf otomatik kapak olur. İsterseniz başka bir görseli “Kapak Yap” olarak seçebilirsiniz.
                </p>

                {galleryImages.length > 0 ? (
                  <div className="mt-4 grid grid-cols-2 gap-3 pb-6 md:grid-cols-3">
                    {galleryImages.map((image, index) => {
                      const isCover = coverImage?.id === image.id;

                      return (
                        <div
                          key={image.id}
                          className={`overflow-hidden rounded-[20px] border bg-[#F7FBFF] shadow-[0_10px_24px_rgba(15,23,42,0.05)] ${
                            isCover ? "border-emerald-400 ring-2 ring-emerald-100" : "border-[#DDE7F3]"
                          }`}
                        >
                          <div className="relative aspect-[4/3] min-h-[118px] overflow-hidden bg-[#EEF5FF]">
                            <img
                              src={image.previewUrl}
                              alt={`Galeri fotoğrafı ${index + 1}`}
                              className="absolute inset-0 h-full w-full object-cover"
                            />

                            <span className="absolute left-2 top-2 rounded-full bg-white/92 px-2 py-1 text-[10px] font-black text-[#06194A]">
                              {index + 1}
                            </span>

                            {isCover && (
                              <span className="absolute bottom-2 left-2 rounded-full bg-emerald-600 px-2 py-1 text-[10px] font-black text-white">
                                Kapak
                              </span>
                            )}
                          </div>

                          <div className="p-2.5">
                            <p className="truncate text-xs font-black text-[#06194A]">
                              {image.file?.name || image.name || `Fotoğraf ${index + 1}`}
                            </p>
                            <p className="text-[10px] font-bold text-[#64748B]">
                              {image.file?.size ? formatFileSize(image.file.size) : image.size ? formatFileSize(image.size) : image.existing ? "Mevcut fotoğraf" : ""}
                            </p>

                            <div className="mt-2 grid grid-cols-1 gap-2">
                              <button
                                type="button"
                                className={`min-h-[40px] rounded-xl px-2 py-2 text-[12px] font-black ${
                                  isCover
                                    ? "bg-emerald-50 text-emerald-700"
                                    : "bg-blue-50 text-[#1557D6]"
                                }`}
                                onClick={() => makeCoverImage(image)}
                                disabled={isCover}
                              >
                                {isCover ? "Kapak" : "Kapak Yap"}
                              </button>

                              <button
                                type="button"
                                className="min-h-[40px] rounded-xl bg-rose-50 px-2 py-2 text-[12px] font-black text-rose-700"
                                onClick={() => removeGalleryImage(image.id)}
                              >
                                Sil
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="mt-4 rounded-[24px] border border-dashed border-[#DDE7F3] bg-[#F7FBFF] p-5 text-center text-sm font-bold text-[#64748B]">
                    En az 1 fotoğraf ekleyiniz. Kapak fotoğrafını galeri içinden seçebilirsiniz.
                  </div>
                )}
              </div>

              <div className="stock-form-field full stock-image-summary-row">
                <span>Görsel Özeti</span>
                <div className="stock-image-summary">
                  <div>
                    <b>Kapak</b>
                    <strong>{coverImage ? "Seçildi" : "Bekliyor"}</strong>
                  </div>
                  <div>
                    <b>Galeri</b>
                    <strong>{galleryImages.length}/{MAX_GALLERY_COUNT}</strong>
                  </div>
                  <div>
                    <b>Toplam</b>
                    <strong>{totalSelectedImages}/{MAX_GALLERY_COUNT}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>


        <style jsx global>{`
          .stock-modal-v10 .stock-form-field > input:not([type="file"]),
          .stock-modal-v10 .stock-form-field > select,
          .stock-modal-v10 .stock-form-field > textarea {
            width: 100%;
            min-height: 54px;
            border: 2px solid #9fb5d1 !important;
            border-radius: 16px !important;
            background: linear-gradient(180deg, #ffffff 0%, #f7faff 100%) !important;
            color: #06194a !important;
            font-weight: 800 !important;
            box-shadow:
              inset 0 1px 0 rgba(255, 255, 255, 0.95),
              0 8px 18px rgba(15, 23, 42, 0.09) !important;
            transition: border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease;
          }

          .stock-modal-v10 .stock-form-field > textarea {
            min-height: 118px;
            resize: vertical;
          }

          .stock-modal-v10 .stock-form-field > input:not([type="file"]):hover,
          .stock-modal-v10 .stock-form-field > select:hover,
          .stock-modal-v10 .stock-form-field > textarea:hover {
            border-color: #6f8fb8 !important;
          }

          .stock-modal-v10 .stock-form-field > input:not([type="file"]):focus,
          .stock-modal-v10 .stock-form-field > select:focus,
          .stock-modal-v10 .stock-form-field > textarea:focus {
            border-color: #2563eb !important;
            outline: none !important;
            box-shadow:
              0 0 0 4px rgba(37, 99, 235, 0.16),
              0 12px 24px rgba(37, 99, 235, 0.13) !important;
            transform: translateY(-1px);
          }

          .stock-modal-v10 .stock-form-field > input::placeholder,
          .stock-modal-v10 .stock-form-field > textarea::placeholder {
            color: #708198 !important;
            opacity: 1 !important;
            font-weight: 700 !important;
          }

          .stock-modal-v10 .stock-form-field > span:first-child {
            color: #26364f;
            font-weight: 900;
            letter-spacing: 0.05em;
          }
        `}</style>

        {!geoPickerOpen && !galleryPickerActive && !checkingImages && (
          <div className="stock-modal-v2-foot stock-modal-v10-foot">
            {footerAlertMessage && (
              <div className="col-span-2 mb-2 flex w-full items-center justify-center rounded-[18px] border border-rose-200 bg-rose-50 px-3 py-2 text-center text-[12px] font-black leading-5 text-rose-700 shadow-[0_12px_26px_rgba(225,29,72,0.10)]">
                {footerAlertMessage}
              </div>
            )}

            <button className="stock-cancel-btn" onClick={onClose}>
              İptal
            </button>

            <button
              className="stock-save-btn"
              onClick={handleSubmit}
              disabled={formLoading || checkingImages}
            >
              {formLoading ? "Kaydediliyor..." : "Portföyü Kaydet"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
