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
  existingDocumentStatus?: {
    propertyDeed?: boolean;
    deedOwnerIdFront?: boolean;
    deedOwnerIdBack?: boolean;
  };
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

const ACCEPTED_DOCUMENT_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "application/pdf",
];

const MAX_DOCUMENT_SIZE = 15 * 1024 * 1024;

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
  { value: "10", label: "1-10 arasÄ±" },
  { value: "50", label: "11-50 arasÄ±" },
  { value: "250", label: "51-250 arasÄ±" },
  { value: "500", label: "251-500 arasÄ±" },
  { value: "1000", label: "501-1000 arasÄ±" },
  { value: "1001", label: "1000+" },
];

const CURRENCY_OPTIONS = [
  { value: "TRY", label: "TÃ¼rk LirasÄ±", symbol: "â‚º" },
  { value: "USD", label: "Amerikan DolarÄ±", symbol: "$" },
  { value: "EUR", label: "Euro", symbol: "â‚¬" },
  { value: "GBP", label: "Ä°ngiliz Sterlini", symbol: "Â£" },
];

const FLOOR_LABEL_OPTIONS = [
  "Kot -1",
  "Bodrum",
  "YarÄ± Bodrum",
  "Zemin Kat",
  "YÃ¼ksek GiriÅŸ",
  "BahÃ§e KatÄ±",

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

  "Ã‡atÄ± KatÄ±",
  "Teras KatÄ±",
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
  "BaÄŸ",
  "BahÃ§e",
  "Zeytinlik",
  "Meyve BahÃ§esi",
  "Hisseli Parsel",
  "MÃ¼stakil Parsel",
  "KÃ¶y YerleÅŸik AlanÄ±",
  "Ä°marlÄ± Arsa",
  "Konut Ä°marlÄ± Arsa",
  "Villa Ä°marlÄ± Arsa",
  "Ticari Ä°marlÄ± Arsa",
  "Sanayi Ä°marlÄ± Arsa",
  "Turizm Ä°marlÄ± Arsa",
  "Yola Cepheli",
  "Kadastro Yolu Var",
  "Su Var",
  "Elektrik Var",
  "Sondaj / Kuyu Var",
  "Ã‡iftlik Kurulumuna Uygun",
];

const INDUSTRIAL_USAGE_OPTIONS = [
  "Depo",
  "Antrepo",
  "Fabrika",
  "AtÃ¶lye",
  "Ãœretim Tesisi",
  "Lojistik Merkezi",
  "SoÄŸuk Hava Deposu",
  "YÃ¼kleme RampalÄ±",
  "TÄ±r GiriÅŸine Uygun",
  "Sanayi ElektriÄŸi Var",
];

const COMMERCIAL_USAGE_OPTIONS = [
  "Cadde Ãœzeri",
  "DÃ¼kkan",
  "MaÄŸaza",
  "Ofis",
  "Home Office",
  "Plaza Ofis",
  "Restoran",
  "Kafe",
  "Otel / Pansiyon",
  "Tabela DeÄŸeri YÃ¼ksek",
  "Depolu",
  "WC / Mutfak Var",
];

function normalizeTypeKey(value: string) {
  return String(value || "")
    .toLocaleUpperCase("tr-TR")
    .replaceAll("Ä°", "I")
    .replaceAll("Ä", "G")
    .replaceAll("Ãœ", "U")
    .replaceAll("Å", "S")
    .replaceAll("Ã–", "O")
    .replaceAll("Ã‡", "C");
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
  if (isTouristicType(type)) return "Oda SayÄ±sÄ±";
  if (isOfficeDetailType(type)) return "Oda SayÄ±sÄ±";
  if (isResidentialDetailType(type)) return "Oda SayÄ±sÄ±";
  return "Oda SayÄ±sÄ±";
}

function getRoomPlaceholder(type: string) {
  if (isTouristicType(type)) return "Ã–rn: 12 oda, 24 oda, 40 oda";
  if (isOfficeDetailType(type)) return "Ã–rn: 1+1, 2+1, 4+2";
  return "Ã–rn: 3+1, 4+1, 5+2";
}

function getAreaLabel(type: string) {
  if (isLandType(type)) return "Arazi AlanÄ± (mÂ²) *";
  if (isIndustrialType(type)) return "KapalÄ± / KullanÄ±m AlanÄ± (mÂ²) *";
  if (isCommercialType(type)) return "KullanÄ±m AlanÄ± (mÂ²) *";
  if (type === "KAMP_YERI") return "AÃ§Ä±k Alan (mÂ²) *";
  if (type === "TATIL_KOYU") return "Toplam Alan (mÂ²) *";
  return "Alan (mÂ²) *";
}

function getNumberLabel(type: string) {
  if (isLandType(type)) return "Ada / Parsel / KayÄ±t No *";
  if (isIndustrialType(type)) return "Blok / KapÄ± / Tesis No *";
  if (isCommercialType(type)) return "BaÄŸÄ±msÄ±z BÃ¶lÃ¼m / KapÄ± No *";
  if (isVillaType(type)) return "Villa / KapÄ± No *";
  return "Daire / BÃ¶lÃ¼m No";
}

function getNumberPlaceholder(type: string) {
  if (isLandType(type)) return "Ã–rn: Ada 123 / Parsel 45";
  if (isIndustrialType(type)) return "Ã–rn: A Blok, KapÄ± 12, Tesis 3";
  if (isCommercialType(type)) return "Ã–rn: DÃ¼kkan 4, Ofis 12, Plaza 8";
  if (isVillaType(type)) return "Ã–rn: Villa 6, A-12, KapÄ± 3";
  return "Ã–rn: 6, A-12, B Blok 3";
}


function getFieldLabel(field: PortfolioFieldKey, type: string, required: boolean) {
  const requiredMark = required ? " *" : "";

  if (field === "roomCount") return `${getRoomLabel(type)}${requiredMark}`;
  if (field === "area") return `${getAreaLabel(type).replace(" *", "")}${requiredMark}`;
  if (field === "openArea") return `AÃ§Ä±k Alan (mÂ²)${requiredMark}`;
  if (field === "closedArea") return `KapalÄ± Alan (mÂ²)${requiredMark}`;
  if (field === "bedCount") return `Yatak SayÄ±sÄ±${requiredMark}`;
  if (field === "buildingAge") return `Bina YaÅŸÄ±${requiredMark}`;
  if (field === "floor") return `BulunduÄŸu Kat${requiredMark}`;
  if (field === "totalFloors") return `${isVillaType(type) ? "YapÄ± Kat SayÄ±sÄ±" : "Toplam Kat SayÄ±sÄ±"}${requiredMark}`;
  if (field === "adaNo") return `Ada No${requiredMark}`;
  if (field === "parselNo") return `Parsel No${requiredMark}`;
  if (field === "number") return `${getNumberLabel(type).replace(" *", "")}${requiredMark}`;
  if (field === "price") return `Fiyat${requiredMark}`;
  if (field === "description") return `AÃ§Ä±klama${requiredMark}`;
  if (field === "availableCreditAmount") return `KullanÄ±labilir Kredi TutarÄ±${requiredMark}`;

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
  return mainCategory === "KONUT" || mainCategory === "KONUT PROJELERÄ°";
}

function isOfficeDetailType(type: string) {
  return type === "OFIS_BURO";
}

function isTouristicType(type: string) {
  return getMainCategoryFromType(type) === "TURÄ°STÄ°K TESÄ°S";
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

  if (normalized.includes("ASANSOR")) return "â†•";
  if (normalized.includes("OTOPARK") || normalized.includes("ARAC PARK")) return "â–£";
  if (normalized.includes("GUVENLIK")) return "â—‡";
  if (normalized.includes("SITE")) return "âŒ‚";
  if (normalized.includes("JENERATOR") || normalized.includes("ELEKTRIK")) return "âš¡";
  if (normalized.includes("YANGIN")) return "â—‰";
  if (normalized.includes("KAMERA")) return "â—‰";
  if (normalized.includes("SU") || normalized.includes("SONDAJ") || normalized.includes("KUYU")) return "â‰ˆ";
  if (normalized.includes("FIBER") || normalized.includes("INTERNET") || normalized.includes("WI-FI")) return "âŒ";
  if (normalized.includes("BANYO") || normalized.includes("WC") || normalized.includes("DUS")) return "â—‹";
  if (normalized.includes("BALKON") || normalized.includes("TERAS")) return "â–¤";
  if (normalized.includes("KILER") || normalized.includes("DEPO")) return "â–¦";
  if (normalized.includes("MUTFAK")) return "â—†";
  if (normalized.includes("AKILLI")) return "âœ¦";
  if (normalized.includes("SOMINE") || normalized.includes("HAMAM") || normalized.includes("SAUNA") || normalized.includes("SPA")) return "â™¨";
  if (normalized.includes("KLIMA") || normalized.includes("SOGUK")) return "â„";
  if (normalized.includes("YALITIM")) return "â˜€";
  if (normalized.includes("DENIZ") || normalized.includes("GOL") || normalized.includes("NEHIR")) return "â‰ˆ";
  if (normalized.includes("DOGA") || normalized.includes("DAG") || normalized.includes("ORMAN") || normalized.includes("PARK")) return "â™§";
  if (normalized.includes("SEHIR") || normalized.includes("CADDE") || normalized.includes("MERKEZ")) return "â–¥";
  if (normalized.includes("YUKLEME") || normalized.includes("RAMPA")) return "â‡…";
  if (normalized.includes("TIR") || normalized.includes("KAMYON")) return "â–°";
  if (normalized.includes("VINC") || normalized.includes("SANAYI")) return "âš™";
  if (normalized.includes("YOL")) return "â•";
  if (normalized.includes("TAPU") || normalized.includes("IMAR") || normalized.includes("KADASTRO")) return "âŒ–";
  if (normalized.includes("CEPHE") || normalized.includes("KOSE")) return "âŒŸ";
  if (normalized.includes("HAVUZ")) return "â‰ˆ";
  if (normalized.includes("MANZARA")) return "â—";

  return "âœ“";
}

function getFeatureGroupTitle(group: string) {
  const labels: Record<string, string> = {
    interior: "Ä°Ã§ Ã–zellikler",
    exterior: "DÄ±ÅŸ Ã–zellikler",
    location: "Muhit",
    transport: "UlaÅŸÄ±m",
    front: "Cephe",
    view: "Manzara",
    accessibility: "Engelliye / YaÅŸlÄ±ya Uygun",
    zoning: "Tapu / Ä°mar",
    landInfrastructure: "Arazi AltyapÄ±sÄ±",
    commercial: "Ticari DeÄŸer",
    tourism: "Turistik Tesis",
    luxury: "LÃ¼ks Ã–zellikler",
  };

  return labels[group] || "Ã–zellik";
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
    "AkÄ±llÄ± Ev",
    "Alarm (HÄ±rsÄ±z)",
    "Alarm (YangÄ±n)",
    "BarbekÃ¼",
    "Beyaz EÅŸya",
    "Ã‡amaÅŸÄ±r OdasÄ±",
    "Ã‡elik KapÄ±",
    "DuÅŸakabin",
    "Ebeveyn Banyosu",
    "Fiber Ä°nternet",
    "Giyinme OdasÄ±",
    "GÃ¶rÃ¼ntÃ¼lÃ¼ Diafon",
    "Hilton Banyo",
    "IsÄ±cam",
    "Jakuzi",
    "Klima",
    "Kiler",
    "Mutfak (Ankastre)",
    "Mutfak DoÄŸalgazÄ±",
    "Panjur / Jaluzi",
    "Parke Zemin",
    "ÅÃ¶mine",
    "Teras",
    "Vestiyer",
    "YÃ¼z TanÄ±ma & Parmak Ä°zi",
    "AraÃ§ Åarj Ä°stasyonu",
    "24 Saat GÃ¼venlik",
    "BahÃ§e TerasÄ±",
    "Ã‡ocuk Oyun ParkÄ±",
    "Hamam",
    "IsÄ± YalÄ±tÄ±mÄ±",
    "JeneratÃ¶r",
    "Kamera Sistemi",
    "KÃ¶pek ParkÄ±",
    "MÃ¼stakil Havuzlu",
    "Sauna",
    "Ses YalÄ±tÄ±mÄ±",
    "Spor AlanÄ±",
    "Su Deposu",
    "YÃ¼zme Havuzu (AÃ§Ä±k)",
    "YÃ¼zme Havuzu (KapalÄ±)",
    "Ã–zel Havuz",
    "Sonsuzluk Havuzu",
    "DoÄŸa Ä°Ã§inde",
    "Denize SÄ±fÄ±r",
    "GÃ¶le SÄ±fÄ±r",
    "Park",
    "Plaj",
    "Åehir Merkezi",
    "Anayol",
    "Cadde",
    "Sahil",
    "Asfalt Yol",
    "DoÄŸu",
    "GÃ¼ney",
    "KÃ¶ÅŸe Parsel",
    "Ã‡ift Cephe",
    "BoÄŸaz",
    "Deniz",
    "DoÄŸa",
    "GÃ¶l",
    "Havuz",
    "Park & YeÅŸil Alan",
    "Panoramik",
    "Ã–zel Ä°skele",
    "Marina BaÄŸlantÄ±sÄ±",
    "AkÄ±llÄ± Ev Sistemi",
    "Yerden IsÄ±tma",
    "Otomatik Panjur",
    "Sinema OdasÄ±",
    "Hizmetli OdasÄ±",
  ]),
  land: new Set([
    "KÃ¶y Merkezi",
    "KÃ¶y YakÄ±nÄ±",
    "DoÄŸa Ä°Ã§inde",
    "Anayol",
    "Cadde",
    "Stabilize Yol",
    "Asfalt Yol",
    "KÃ¶ÅŸe Parsel",
    "Ã‡ift Cephe",
    "Cadde Cepheli",
    "DoÄŸa",
    "GÃ¶l",
    "Nehir",
    "DaÄŸ",
    "Vadi",
    "Panoramik",
    "MÃ¼stakil Tapu",
    "Hisseli Tapu",
    "Ä°frazlÄ±",
    "Tevhidli",
    "Konut Ä°marlÄ±",
    "Villa Ä°marlÄ±",
    "Ticari Ä°marlÄ±",
    "Sanayi Ä°marlÄ±",
    "Turizm Ä°marlÄ±",
    "Konut + Ticaret",
    "Ä°marsÄ±z",
    "Sit AlanÄ±",
    "Kat KarÅŸÄ±lÄ±ÄŸÄ±na Uygun",
    "Su Var",
    "Elektrik Var",
    "DoÄŸalgaz YakÄ±n",
    "Sondaj / Kuyu Var",
    "Sulama KanalÄ±",
    "Artezyen",
    "Damlama Sulama",
    "Yola Cepheli",
    "Kadastral Yolu Var",
    "Ã‡it Ã‡evrili",
    "Dere KenarÄ±",
    "GÃ¶l KenarÄ±",
    "TarÄ±m YapÄ±lÄ±yor",
    "Meyve AÄŸaÃ§larÄ± Var",
    "Zeytin AÄŸaÃ§larÄ± Var",
  ]),
  commercial: new Set([
    "ADSL",
    "Alarm (HÄ±rsÄ±z)",
    "Alarm (YangÄ±n)",
    "Ã‡elik KapÄ±",
    "Fiber Ä°nternet",
    "Klima",
    "Mutfak DoÄŸalgazÄ±",
    "Spot AydÄ±nlatma",
    "YÃ¼z TanÄ±ma & Parmak Ä°zi",
    "AraÃ§ Åarj Ä°stasyonu",
    "24 Saat GÃ¼venlik",
    "Hidrofor",
    "JeneratÃ¶r",
    "Kamera Sistemi",
    "Su Deposu",
    "YangÄ±n Merdiveni",
    "AlÄ±ÅŸveriÅŸ Merkezi",
    "Belediye",
    "Hastane",
    "Market",
    "Åehir Merkezi",
    "Anayol",
    "Cadde",
    "DolmuÅŸ",
    "E-5",
    "Metro",
    "MetrobÃ¼s",
    "MinibÃ¼s",
    "OtobÃ¼s DuraÄŸÄ±",
    "TEM",
    "Tramvay",
    "KÃ¶ÅŸe Parsel",
    "Ã‡ift Cephe",
    "Cadde Cepheli",
    "AraÃ§ Park Yeri",
    "GiriÅŸ / Rampa",
    "Cadde Ãœzeri",
    "KÃ¶ÅŸe Konum",
    "Tabela DeÄŸeri YÃ¼ksek",
    "Yaya TrafiÄŸi YoÄŸun",
    "AraÃ§ TrafiÄŸi YoÄŸun",
    "KiracÄ±lÄ±",
    "Devren",
    "Depolu",
    "BacalÄ±",
    "WC Var",
    "Mutfak Var",
    "YÃ¼kleme AlanÄ±",
    "TÄ±r GiriÅŸli",
    "Rampa Var",
    "Otopark Var",
  ]),
  tourism: new Set([
    "ADSL",
    "Beyaz EÅŸya",
    "DuÅŸakabin",
    "Ebeveyn Banyosu",
    "Fiber Ä°nternet",
    "GÃ¶rÃ¼ntÃ¼lÃ¼ Diafon",
    "Klima",
    "Mobilya",
    "Mutfak (Ankastre)",
    "Teras",
    "24 Saat GÃ¼venlik",
    "Buhar OdasÄ±",
    "Ã‡ocuk Oyun ParkÄ±",
    "Hamam",
    "JeneratÃ¶r",
    "Kamera Sistemi",
    "Sauna",
    "Spor AlanÄ±",
    "YÃ¼zme Havuzu (AÃ§Ä±k)",
    "YÃ¼zme Havuzu (KapalÄ±)",
    "Denize SÄ±fÄ±r",
    "GÃ¶le SÄ±fÄ±r",
    "Plaj",
    "Åehir Merkezi",
    "DoÄŸa Ä°Ã§inde",
    "HavaalanÄ±",
    "Sahil",
    "Deniz",
    "DoÄŸa",
    "GÃ¶l",
    "Panoramik",
    "AÃ§Ä±k Havuz",
    "KapalÄ± Havuz",
    "Spa",
    "Restoran",
    "Bar",
    "ToplantÄ± Salonu",
    "DÃ¼ÄŸÃ¼n AlanÄ±",
    "Plaj KullanÄ±mÄ±",
    "RuhsatlÄ±",
    "Sezonluk Ä°ÅŸletme",
    "12 Ay AÃ§Ä±k",
    "Ã–zel Havuz",
    "Sonsuzluk Havuzu",
    "BahÃ§e TerasÄ±",
    "Panoramik Manzara",
  ]),
} as const;

const GLOBAL_FEATURE_BLOCKLIST = new Set<string>();

const AGRICULTURE_PRECISE_FILTERS = {
  arsa: new Set([
    "KÃ¶y YakÄ±nÄ±",
    "DoÄŸa Ä°Ã§inde",
    "Anayol",
    "Cadde",
    "Stabilize Yol",
    "Asfalt Yol",
    "KÃ¶ÅŸe Parsel",
    "Ã‡ift Cephe",
    "Cadde Cepheli",
    "MÃ¼stakil Tapu",
    "Hisseli Tapu",
    "Ä°frazlÄ±",
    "Tevhidli",
    "Konut Ä°marlÄ±",
    "Villa Ä°marlÄ±",
    "Ticari Ä°marlÄ±",
    "Sanayi Ä°marlÄ±",
    "Turizm Ä°marlÄ±",
    "Konut + Ticaret",
    "Ä°marsÄ±z",
    "Kat KarÅŸÄ±lÄ±ÄŸÄ±na Uygun",
    "Su Var",
    "Elektrik Var",
    "DoÄŸalgaz YakÄ±n",
    "Yola Cepheli",
    "Kadastral Yolu Var",
  ]),
  tarla: new Set([
    "KÃ¶y Merkezi",
    "KÃ¶y YakÄ±nÄ±",
    "DoÄŸa Ä°Ã§inde",
    "Stabilize Yol",
    "Asfalt Yol",
    "DoÄŸa",
    "DaÄŸ",
    "Vadi",
    "MÃ¼stakil Tapu",
    "Hisseli Tapu",
    "Su Var",
    "Elektrik Var",
    "Sondaj / Kuyu Var",
    "Sulama KanalÄ±",
    "Artezyen",
    "Damlama Sulama",
    "Yola Cepheli",
    "Kadastral Yolu Var",
    "Ã‡it Ã‡evrili",
    "TarÄ±m YapÄ±lÄ±yor",
  ]),
  bag: new Set([
    "KÃ¶y Merkezi",
    "KÃ¶y YakÄ±nÄ±",
    "DoÄŸa Ä°Ã§inde",
    "Stabilize Yol",
    "Asfalt Yol",
    "DoÄŸa",
    "DaÄŸ",
    "Vadi",
    "MÃ¼stakil Tapu",
    "Hisseli Tapu",
    "Su Var",
    "Elektrik Var",
    "Sondaj / Kuyu Var",
    "Sulama KanalÄ±",
    "Damlama Sulama",
    "Yola Cepheli",
    "Kadastral Yolu Var",
    "Ã‡it Ã‡evrili",
    "TarÄ±m YapÄ±lÄ±yor",
  ]),
  bahce: new Set([
    "KÃ¶y Merkezi",
    "KÃ¶y YakÄ±nÄ±",
    "DoÄŸa Ä°Ã§inde",
    "Asfalt Yol",
    "DoÄŸa",
    "GÃ¶l",
    "Vadi",
    "MÃ¼stakil Tapu",
    "Hisseli Tapu",
    "Su Var",
    "Elektrik Var",
    "Sondaj / Kuyu Var",
    "Damlama Sulama",
    "Yola Cepheli",
    "Kadastral Yolu Var",
    "Ã‡it Ã‡evrili",
    "Meyve AÄŸaÃ§larÄ± Var",
  ]),
  zeytinlik: new Set([
    "KÃ¶y YakÄ±nÄ±",
    "DoÄŸa Ä°Ã§inde",
    "Stabilize Yol",
    "Asfalt Yol",
    "DoÄŸa",
    "DaÄŸ",
    "Vadi",
    "MÃ¼stakil Tapu",
    "Hisseli Tapu",
    "Su Var",
    "Elektrik Var",
    "Sondaj / Kuyu Var",
    "Damlama Sulama",
    "Yola Cepheli",
    "Kadastral Yolu Var",
    "Ã‡it Ã‡evrili",
    "Zeytin AÄŸaÃ§larÄ± Var",
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
    label: "Villa / kÃ¶ÅŸk / yalÄ±",
  },
  {
    keywords: ["DUKKAN", "MAGAZA", "OFIS", "HOME_OFFICE", "PLAZA", "TICARI"],
    min: 10,
    max: 10000,
    label: "DÃ¼kkan / ofis / ticari alan",
  },
  {
    keywords: ["DEPO", "FABRIKA", "SANAYI", "ATOLYE", "IMALATHANE", "LOJISTIK"],
    min: 50,
    max: 100000,
    label: "Depo / fabrika / sanayi alanÄ±",
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
    label: "Tarla / baÄŸ / bahÃ§e",
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

function isAcceptedDocument(file: File) {
  const type = String(file.type || "").toLowerCase();

  if (!type) return true;

  return ACCEPTED_DOCUMENT_TYPES.includes(type);
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

function formatPhoneInput(value: string) {
  const onlyDigits = value.replace(/\D/g, "").slice(0, 11);

  if (!onlyDigits) return "";

  const normalized = onlyDigits.startsWith("90") && onlyDigits.length > 10
    ? `0${onlyDigits.slice(2)}`.slice(0, 11)
    : onlyDigits;

  const digits = normalized.startsWith("0") ? normalized : `0${normalized}`.slice(0, 11);
  const parts = [
    digits.slice(0, 4),
    digits.slice(4, 7),
    digits.slice(7, 9),
    digits.slice(9, 11),
  ].filter(Boolean);

  return parts.join(" ");
}

function getPhoneDigits(value: string) {
  return value.replace(/\D/g, "");
}

function isValidTurkishPhone(value: string) {
  const digits = getPhoneDigits(value);

  if (!digits) return true;
  if (digits.length === 11 && digits.startsWith("05")) return true;
  if (digits.length === 10 && digits.startsWith("5")) return true;

  return false;
}

function normalizeEmailInput(value: string) {
  return value.trim().toLocaleLowerCase("tr-TR").replace(/\s+/g, "");
}

function isValidEmail(value: string) {
  const email = normalizeEmailInput(value);

  if (!email) return true;

  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
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
  return CURRENCY_OPTIONS.find((option) => option.value === value)?.symbol || "â‚º";
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
      label: "Bu mÃ¼lk tipi",
    }
  );
}

function getFloorNumberFromLabel(label: string) {
  const exactFloor = label.match(/^(\d+)\. Kat$/);
  if (exactFloor) return exactFloor[1];

  if (label === "Zemin Kat" || label === "GiriÅŸ KatÄ±" || label === "DÃ¼kkan GiriÅŸi") return "0";
  if (label === "YÃ¼ksek GiriÅŸ") return "1";

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
      reject(new Error("GÃ¶rsel okunamadÄ±."));
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
  existingDocumentStatus,
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
  const deedOwnerPhone = String((unitForm as any).deedOwnerPhone || "");
  const deedOwnerEmail = String((unitForm as any).deedOwnerEmail || "");
  const availableCreditAmountDisplay = formatPriceInput(String((unitForm as any).availableCreditAmount || ""));
  const doorAccessInfo = String((unitForm as any).doorAccessInfo || "");
  const deedOwnerIdFrontFile = (unitForm as any).deedOwnerIdFrontFile as File | null | undefined;
  const deedOwnerIdBackFile = (unitForm as any).deedOwnerIdBackFile as File | null | undefined;
  const propertyDeedFile = (unitForm as any).propertyDeedFile as File | null | undefined;
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
      return "Sadece JPG, PNG veya WEBP formatÄ±nda gÃ¶rsel yÃ¼kleyebilirsiniz.";
    }

    const tooLarge = files.find((file) => file.size > MAX_FILE_SIZE);

    if (tooLarge) {
      return `SeÃ§tiÄŸiniz gÃ¶rsel 15 MB sÄ±nÄ±rÄ±nÄ± aÅŸÄ±yor. SeÃ§ilen gÃ¶rsel: ${formatFileSize(tooLarge.size)}. LÃ¼tfen daha dÃ¼ÅŸÃ¼k boyutlu bir JPG, PNG veya WEBP gÃ¶rsel yÃ¼kleyiniz. (${tooLarge.name})`;
    }

    const tooSmall = files.find((file) => file.size < MIN_FILE_SIZE);

    if (tooSmall) {
      return `SeÃ§tiÄŸiniz gÃ¶rsel dosyasÄ± Ã§ok kÃ¼Ã§Ã¼k gÃ¶rÃ¼nÃ¼yor. LÃ¼tfen daha kaliteli bir gÃ¶rsel yÃ¼kleyiniz. (${tooSmall.name})`;
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
      return `UyarÄ±: ${lowResolutionFiles.length} gÃ¶rselin Ã§Ã¶zÃ¼nÃ¼rlÃ¼ÄŸÃ¼ dÃ¼ÅŸÃ¼k olabilir. YÃ¼klemeyi engellemedik, ancak daha kaliteli fotoÄŸraf kullanmanÄ±z Ã¶nerilir. (${lowResolutionFiles.slice(0, 3).join(", ")}${lowResolutionFiles.length > 3 ? ", ..." : ""})`;
    }

    if (unreadableFiles.length > 0) {
      return `UyarÄ±: ${unreadableFiles.length} gÃ¶rselin Ã¶n izlemesi tarayÄ±cÄ±da okunamadÄ±. HEIC/HEIF veya cihaz kaynaklÄ± olabilir; yÃ¼klemeyi engellemedik. (${unreadableFiles.slice(0, 3).join(", ")}${unreadableFiles.length > 3 ? ", ..." : ""})`;
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
      setImageError(`En fazla ${MAX_GALLERY_COUNT} galeri fotoÄŸrafÄ± yÃ¼kleyebilirsiniz.`);
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

    const selectedKeys = new Set<string>();
    const existingKeys = new Set(
      galleryImages.map((image) =>
        image.file
          ? `${image.file.name}-${image.file.size}-${image.file.lastModified}`
          : `${image.id}-${image.previewUrl || ""}`,
      ),
    );

    const uniqueFiles = acceptedFiles.filter((file) => {
      const key = `${file.name}-${file.size}-${file.lastModified}`;

      if (selectedKeys.has(key) || existingKeys.has(key)) return false;

      selectedKeys.add(key);
      return true;
    });

    if (uniqueFiles.length === 0) {
      setImageError("AynÄ± fotoÄŸraf birden fazla kez eklenemez.");
      event.target.value = "";
      return;
    }

    const newImages = uniqueFiles.map(createLocalImage);

    setGalleryImages((current) => {
      const nextImages = [...current, ...newImages];

      if (!coverImage && nextImages.length > 0) {
        setCoverImage(nextImages[0]);
      }

      return nextImages;
    });

    if (files.length > remaining) {
      setImageError(
        `En fazla ${MAX_GALLERY_COUNT} galeri fotoÄŸrafÄ± yÃ¼kleyebilirsiniz. Fazla seÃ§ilen gÃ¶rseller eklenmedi.`,
      );
    } else if (uniqueFiles.length !== acceptedFiles.length) {
      setImageError("AynÄ± fotoÄŸraf birden fazla kez eklenemez.");
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

  const setUnitFileField = (key: string, file: File | null) => {
    setUnitForm((current) => ({ ...current, [key]: file } as UnitFormState));
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

  const handleIdentityDocumentChange = (key: "deedOwnerIdFrontFile" | "deedOwnerIdBackFile", file?: File) => {
    setImageError("");

    if (!file) {
      setUnitFileField(key, null);
      return;
    }

    if (!isAcceptedDocument(file)) {
      setImageError("Kimlik belgesi JPG, PNG, WEBP veya PDF formatÄ±nda olmalÄ±dÄ±r.");
      setUnitFileField(key, null);
      return;
    }

    if (file.size > MAX_DOCUMENT_SIZE) {
      setImageError(`Kimlik belgesi 15 MB sÄ±nÄ±rÄ±nÄ± aÅŸÄ±yor. SeÃ§ilen belge: ${formatFileSize(file.size)}.`);
      setUnitFileField(key, null);
      return;
    }

    setUnitFileField(key, file);
  };

  const handlePropertyDeedDocumentChange = (file?: File) => {
    setImageError("");

    if (!file) {
      setUnitFileField("propertyDeedFile", null);
      return;
    }

    if (!isAcceptedDocument(file)) {
      setImageError("Tapu dosyasÄ± JPG, PNG, WEBP veya PDF formatÄ±nda olmalÄ±dÄ±r.");
      setUnitFileField("propertyDeedFile", null);
      return;
    }

    if (file.size > MAX_DOCUMENT_SIZE) {
      setImageError(`Tapu dosyasÄ± 15 MB sÄ±nÄ±rÄ±nÄ± aÅŸÄ±yor. SeÃ§ilen belge: ${formatFileSize(file.size)}.`);
      setUnitFileField("propertyDeedFile", null);
      return;
    }

    setUnitFileField("propertyDeedFile", file);
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
      deedOwnerFullName: fullName || (current as any).deedOwnerFullName || "",
      deedOwnerPhone: customer.phone ? formatPhoneInput(customer.phone) : (current as any).deedOwnerPhone || "",
      deedOwnerEmail: customer.email ? normalizeEmailInput(customer.email) : (current as any).deedOwnerEmail || "",
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
      return `${rule.label} metrekare deÄŸeri mantÄ±ksÄ±z gÃ¶rÃ¼nÃ¼yor. ${rule.min.toLocaleString("tr-TR")} mÂ² ile ${rule.max.toLocaleString("tr-TR")} mÂ² arasÄ±nda bir deÄŸer giriniz veya bilgiyi kontrol ediniz.`;
    }

    if (isRequiredField("area") && !area) {
      return "Alan bilgisi zorunludur.";
    }

    if (isRequiredField("price") && !price) {
      return "Fiyat bilgisi zorunludur.";
    }

    if (adaNo && adaNo !== cleanAdaNo) {
      return "Ada No sadece rakamlardan oluÅŸmalÄ± ve en fazla 6 hane olmalÄ±dÄ±r.";
    }

    if (parselNo && parselNo !== cleanParselNo) {
      return "Parsel No sadece rakamlardan oluÅŸmalÄ± ve en fazla 4 hane olmalÄ±dÄ±r.";
    }

    if (isRequiredField("adaNo") && !cleanAdaNo) {
      return "Bu portfÃ¶y tipi iÃ§in Ada No zorunludur.";
    }

    if (isRequiredField("parselNo") && !cleanParselNo) {
      return "Bu portfÃ¶y tipi iÃ§in Parsel No zorunludur.";
    }

    if (isRequiredField("number") && !number) {
      return "BaÄŸÄ±msÄ±z bÃ¶lÃ¼m / kapÄ± numarasÄ± zorunludur.";
    }

    if (!isLandType(unitForm.type) && /^\d{5,}$/.test(number)) {
      return "BaÄŸÄ±msÄ±z bÃ¶lÃ¼m / kapÄ± numarasÄ± olaÄŸan dÄ±ÅŸÄ± gÃ¶rÃ¼nÃ¼yor. LÃ¼tfen deÄŸeri kontrol ediniz.";
    }

    if (price && (price < 100000 || price > 5000000000)) {
      return "Fiyat deÄŸeri olaÄŸan dÄ±ÅŸÄ± gÃ¶rÃ¼nÃ¼yor. LÃ¼tfen para birimini ve tutarÄ± kontrol ediniz.";
    }

    if (isRequiredField("roomCount") && !String(unitForm.roomCount || "").trim()) {
      return "Oda sayÄ±sÄ± zorunludur.";
    }

    if (isRequiredField("buildingAge") && !buildingAge) {
      return "Bina yaÅŸÄ± zorunludur.";
    }

    if (isRequiredField("floor") && !selectedFloorLabel) {
      return "BulunduÄŸu kat zorunludur.";
    }

    if (isRequiredField("totalFloors") && !buildingFloorCount) {
      return "Kat sayÄ±sÄ± zorunludur.";
    }

    if (isRequiredField("bedCount") && !bedCount.trim()) {
      return "Yatak sayÄ±sÄ± zorunludur.";
    }

    if (isRequiredField("closedArea") && !closedArea.trim()) {
      return "KapalÄ± alan zorunludur.";
    }

    if (isRequiredField("openArea") && !openArea.trim()) {
      return "AÃ§Ä±k alan zorunludur.";
    }

    const missingSpecialField = specialFields.find((field) =>
      field.required && !String((unitForm as any)[field.key] || "").trim(),
    );

    if (missingSpecialField) {
      return `${missingSpecialField.label} zorunludur.`;
    }

    if (!propertyDeedFile && !existingDocumentStatus?.propertyDeed) {
      return "Bu portfÃ¶ye ait tapu dosyasÄ± zorunludur.";
    }

    if (deedOwnerPhone && !isValidTurkishPhone(deedOwnerPhone)) {
      return "Tapu sahibi telefonu geÃ§erli formatta olmalÄ±dÄ±r. Ã–rn: 0542 852 41 41";
    }

    if (deedOwnerEmail && !isValidEmail(deedOwnerEmail)) {
      return "Tapu sahibi e-posta adresi geÃ§erli formatta olmalÄ±dÄ±r. Ã–rn: isim@mail.com";
    }

    const availableCreditAmount = Number(String((unitForm as any).availableCreditAmount || "").replace(/\D/g, ""));

    if (availableCreditAmount && price && availableCreditAmount > price) {
      return "KullanÄ±labilir kredi tutarÄ± satÄ±ÅŸ fiyatÄ±ndan bÃ¼yÃ¼k olamaz.";
    }

    if (doorAccessInfo.length > 500) {
      return "KapÄ± eriÅŸim bilgisi en fazla 500 karakter olabilir.";
    }

    if (descriptionLength > MAX_DESCRIPTION_LENGTH) {
      return `AÃ§Ä±klama alanÄ± en fazla ${MAX_DESCRIPTION_LENGTH} karakter olabilir.`;
    }

    if (showFloorFields && selectedFloorLabel && buildingFloorCount) {
      const foundFloor = Number(getFloorNumberFromLabel(selectedFloorLabel));
      const totalFloor = Number(buildingFloorCount);

      if (foundFloor > totalFloor) {
        return "BulunduÄŸu kat, toplam kat sayÄ±sÄ±ndan bÃ¼yÃ¼k olamaz. LÃ¼tfen kat bilgisini kontrol ediniz.";
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
        <button className="stock-modal-v10-close" onClick={onClose} aria-label="Kapat">Ã—</button>

        <div className="stock-modal-v2-body stock-modal-v10-body" style={{ paddingBottom: "156px" }}>
          {formSuccess && <div className="stock-form-success">PortfÃ¶y baÅŸarÄ±yla eklendi.</div>}
          {formError && <div className="stock-form-error">{formError}</div>}
          {localError && <div className="stock-form-error">{localError}</div>}
          {imageError && <div className="stock-form-error">{imageError}</div>}

          <div className="stock-form-block rounded-[30px] border-2 border-[#CBD8EA] bg-white p-3 shadow-[0_22px_54px_rgba(15,23,42,0.14)]">
            <div className="stock-form-grid">
              {projects.length > 0 && (
                <label className="stock-form-field full">
                  <span>Mevcut Projeye Ekle</span>
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                  >
                    <option value="">Yeni Proje OluÅŸtur</option>
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
                  <span>Proje AdÄ± *</span>
                  <input
                    value={projectForm.name}
                    onChange={(e) => setProjectField("name", e.target.value)}
                    onBlur={(e) => setProjectFieldFormatted("name", e.target.value)}
                  />
                </label>
              )}

              <label className="stock-form-field">
                <span>Åehir *</span>
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
                  <option value="">Åehir seÃ§iniz</option>
                  {provinceOptions.map((city) => (
                    <option key={city.id} value={city.name}>
                      {city.name}
                    </option>
                  ))}
                </select>
                {locationLoading && (
                  <p className="mt-2 text-center text-xs font-bold text-[#64748B]">
                    Konum verisi yÃ¼kleniyor...
                  </p>
                )}
              </label>

              <label className="stock-form-field">
                <span>Ä°lÃ§e *</span>
                {districtOptions.length > 0 ? (
                  <select
                    value={projectForm.district}
                    onChange={(e) => {
                      setProjectField("district", e.target.value);
                      setProjectField("address", "");
                      setSelectedPlace("");
                    }}
                  >
                    <option value="">Ä°lÃ§e seÃ§iniz</option>
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
                      locationLoading ? "Ä°lÃ§eler yÃ¼kleniyor..." : "Ä°lÃ§e yazÄ±nÄ±z"
                    }
                  />
                )}
              </label>

              <label className="stock-form-field full">
                <span>Mahalle / KÃ¶y / Mevki *</span>
                {placeOptions.length > 0 ? (
                  <select
                    value={selectedPlace || projectForm.address}
                    onChange={(e) => {
                      const value = e.target.value;
                      setSelectedPlace(value);
                      setProjectField("address", value);
                    }}
                  >
                    <option value="">Mahalle / kÃ¶y seÃ§iniz</option>
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
                        ? "Mahalle / kÃ¶y verisi yÃ¼kleniyor..."
                        : "Mahalle / kÃ¶y / mevki yazÄ±nÄ±z"
                    }
                  />
                )}
              </label>

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
            </div>
          </div>

          <div className="stock-form-block rounded-[30px] border-2 border-[#CBD8EA] bg-white p-3 shadow-[0_22px_54px_rgba(15,23,42,0.14)]">
            <div className="stock-form-grid">
              <label className="stock-form-field">
                <span>MÃ¼lk Tipi *</span>
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
                    <option value="">Oda sayÄ±sÄ± seÃ§iniz</option>
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
                    placeholder="Ã–rn: 190"
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
                    placeholder="Ã–rn: 5000"
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
                    placeholder="Ã–rn: 1200"
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
                    <option value="">Yatak sayÄ±sÄ± seÃ§iniz</option>
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
                    <option value="">Bina yaÅŸÄ± seÃ§iniz</option>
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
                    <option value="">Kat seÃ§iniz</option>
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
                    <option value="">SeÃ§iniz</option>
                    {BUILDING_FLOOR_OPTIONS.map((floor) => (
                      <option key={floor} value={floor}>
                        {floor} KatlÄ±
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
                    <option value="">SeÃ§iniz</option>
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

              {showAdaNoField && (
                <label className="stock-form-field">
                  <span>{getFieldLabel("adaNo", unitForm.type, isRequiredField("adaNo"))}</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={adaNo}
                    onChange={(e) => setUnitField("adaNo", sanitizeAdaNo(e.target.value))}
                    placeholder="Ã–rn: 4752"
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
                    placeholder="Ã–rn: 11"
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
                      placeholder="Ã–rn: 10.500.000"
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
          </div>


          <div className="stock-form-block rounded-[30px] border-2 border-[#CBD8EA] bg-white p-3 shadow-[0_22px_54px_rgba(15,23,42,0.14)]">
            <div className="stock-form-grid">
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
                      âœ¦
                    </span>
                    <span className="min-w-0">
                      <b className="block text-[14px] font-black tracking-[-0.02em] text-[#06194A]">Ek Ã–zellikler</b>
                      <small className="mt-0.5 block text-[11px] font-bold leading-4 text-[#64748B]">
                        {selectedFeatures.length > 0 ? `${selectedFeatures.length} Ã¶zellik seÃ§ildi Â· PortfÃ¶y kartÄ±nda Ã¶zellik rozeti olarak gÃ¶rÃ¼nÃ¼r` : "Bu portfÃ¶y tipine uygun ek Ã¶zellikleri seÃ§"}
                      </small>
                    </span>
                  </span>
                  <span className={`relative shrink-0 rounded-full px-4 py-2 text-[11px] font-black shadow-[0_10px_22px_rgba(21,87,214,0.14)] ${featuresOpen ? "bg-[#06194A] text-white" : "bg-[#1557D6] text-white"}`}>
                    {featuresOpen ? "Gizle" : "GÃ¶ster"}
                  </span>
                </button>
              </div>

              {featuresOpen && (
                <div className="stock-form-field full">
                  <div className="rounded-[26px] border border-[#DDE7F3] bg-gradient-to-b from-white to-[#F8FAFC] p-3 shadow-[0_18px_44px_rgba(15,23,42,0.07)]">
                    <div className="mb-3 flex items-center justify-between gap-2 rounded-[20px] bg-[#15803D] px-3 py-2 text-white shadow-[0_14px_30px_rgba(21,128,61,0.18)]">
                      <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/60">Ã–ne Ã‡Ä±kanlar</p>
                        <p className="mt-0.5 text-[12px] font-black leading-4">SeÃ§ilenler portfÃ¶y detayÄ±nda Ã¶zellik rozeti olarak gÃ¶rÃ¼nÃ¼r.</p>
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
                                  {selectedInGroup > 0 ? `${selectedInGroup} seÃ§ili Â· ${group.options.length} seÃ§enek` : `${group.options.length} seÃ§enek`}
                                </small>
                              </span>

                              <span className={`flex h-9 w-9 items-center justify-center justify-self-end rounded-[14px] text-[18px] font-black transition ${groupOpen ? "bg-[#06194A] text-white" : "bg-[#EFF6FF] text-[#1557D6]"}`}>
                                {groupOpen ? "âˆ’" : "+"}
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
                                        {checked ? "âœ“" : "+"}
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
                          SeÃ§imleri Temizle
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="stock-form-block rounded-[30px] border-2 border-[#CBD8EA] bg-white p-3 shadow-[0_22px_54px_rgba(15,23,42,0.14)]">
            <div className="stock-form-grid">
              <div className="stock-form-field full rounded-[24px] border-2 border-[#D6E1F0] bg-white p-4 shadow-[0_18px_42px_rgba(15,23,42,0.12)]">
                <span className="inline-flex w-full items-center justify-center gap-2 rounded-[16px] border-b border-[#D6E1F0] bg-white px-3 py-2 text-[#06194A]">ğŸ”’ EriÅŸim Bilgileri</span>
                <p className="mt-2 text-center text-xs font-bold leading-5 text-[#64748B]">
                  KapÄ± ÅŸifresi, site giriÅŸ kodu, kapÄ±cÄ± bilgisi gibi eriÅŸim notlarÄ± mahremdir. Havuzda ve genel gÃ¶rÃ¼nÃ¼mde gerÃ§ek deÄŸer gÃ¶sterilmez.
                </p>
              </div>

              <label className="stock-form-field full rounded-[24px] border-2 border-[#D6E1F0] bg-white p-4 text-center shadow-[0_18px_42px_rgba(15,23,42,0.12)]">
                <span>KapÄ± EriÅŸim Bilgisi</span>
                <textarea
                  maxLength={500}
                  value={doorAccessInfo}
                  onChange={(e) => setUnitField("doorAccessInfo", e.target.value)}
                  placeholder="Ã–rn: A Blok kapÄ± ÅŸifresi 4455 / KapÄ±cÄ± Mehmet Bey / Site giriÅŸ kodu 9876"
                />
                <p className="mt-2 text-center text-xs font-black text-[#64748B]">
                  Ekranda kullanÄ±cÄ±ya: â€œğŸ”’ RandevulaÅŸma sonrasÄ± portfÃ¶y sahibinden talep ediniz.â€ ÅŸeklinde gÃ¶sterilir.
                </p>
              </label>
            </div>
          </div>

          <div className="stock-form-block rounded-[30px] border-2 border-[#CBD8EA] bg-white p-3 shadow-[0_22px_54px_rgba(15,23,42,0.14)]">
            <div className="stock-form-grid">
              <div className="stock-form-field full">
                <span className="inline-flex w-full items-center justify-center gap-2 rounded-[16px] border-b border-[#D6E1F0] bg-white px-3 py-2 text-[#06194A]">ğŸ‘¤ Tapu Sahibi Bilgileri</span>
                <p className="mt-2 text-center text-xs font-bold leading-5 text-[#64748B]">
                  Bu bilgiler mahremdir. Sadece portfÃ¶y sahibi ve YazÄ±lÄ±m Ekibi gÃ¶rebilir. PortfÃ¶y kaydedilince CRM kaydÄ± otomatik oluÅŸturulur veya mevcut CRM kaydÄ±yla eÅŸleÅŸtirilir.
                </p>
              </div>

              {crmCustomers.length > 0 && (
                <label className="stock-form-field full">
                  <span>CRMâ€™den Tapu Sahibi SeÃ§</span>
                  <select
                    value={selectedCrmCustomerId}
                    onChange={(e) => handleCrmCustomerSelect(e.target.value)}
                  >
                    <option value="">CRM kaydÄ± seÃ§meden devam et</option>
                    {crmCustomers.map((customer) => {
                      const fullName = [customer.firstName, customer.lastName]
                        .filter(Boolean)
                        .join(" ")
                        .trim() || "Ä°simsiz CRM KaydÄ±";
                      const meta = [customer.phone, customer.email].filter(Boolean).join(" Â· ");

                      return (
                        <option key={customer.id} value={customer.id}>
                          {fullName}{meta ? ` (${meta})` : ""}
                        </option>
                      );
                    })}
                  </select>
                  <small className="stock-upload-hint">
                    Kendi CRM kayÄ±tlarÄ±nÄ±zdan seÃ§im yaparsanÄ±z ad, telefon ve e-posta otomatik dolar.
                  </small>
                </label>
              )}

              <label className="stock-form-field">
                <span>Tapu Sahibi Ad Soyad</span>
                <input
                  value={deedOwnerFullName}
                  onChange={(e) => setUnitField("deedOwnerFullName", e.target.value)}
                  onBlur={(e) => setUnitField("deedOwnerFullName", normalizeTurkishText(e.target.value))}
                  placeholder="Ã–rn: Ahmet YÄ±lmaz"
                />
              </label>

              <label className="stock-form-field">
                <span>Tapu Sahibi Telefon</span>
                <input
                  type="tel"
                  inputMode="tel"
                  value={deedOwnerPhone}
                  onChange={(e) => setUnitField("deedOwnerPhone", formatPhoneInput(e.target.value))}
                  onBlur={(e) => setUnitField("deedOwnerPhone", formatPhoneInput(e.target.value))}
                  maxLength={14}
                  placeholder="Ã–rn: 0542 852 41 41"
                />
              </label>

              <label className="stock-form-field full">
                <span>Tapu Sahibi E-posta</span>
                <input
                  type="email"
                  inputMode="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  value={deedOwnerEmail}
                  onChange={(e) => setUnitField("deedOwnerEmail", normalizeEmailInput(e.target.value))}
                  onBlur={(e) => setUnitField("deedOwnerEmail", normalizeEmailInput(e.target.value))}
                  placeholder="Ã–rn: tapusahibi@email.com"
                />
              </label>

              <div className="stock-form-field full rounded-[24px] border-2 border-[#D6E1F0] bg-white p-4 shadow-[0_18px_42px_rgba(15,23,42,0.12)]">
                <span className="inline-flex w-full items-center justify-center gap-2 rounded-[16px] border-b border-[#D6E1F0] bg-white px-3 py-2 text-[#06194A]">ğŸ“„ PortfÃ¶y Tapu DosyasÄ± *</span>
                <p className="mt-2 text-center text-xs font-bold leading-5 text-[#64748B]">
                  Her portfÃ¶y iÃ§in tapu dosyasÄ± ayrÄ± yÃ¼klenir. Kimlik belgesi kiÅŸiye aittir; tapu dosyasÄ± portfÃ¶ye aittir.
                </p>
              </div>

              <label className="stock-form-field full rounded-[24px] border-2 border-[#D6E1F0] bg-white p-4 text-center shadow-[0_18px_42px_rgba(15,23,42,0.12)]">
                <span>Tapu DosyasÄ± *</span>
                <input
                  id="propertyDeedFileInput"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={(e) => handlePropertyDeedDocumentChange(e.target.files?.[0])}
                  className="hidden"
                />
                <label
                  htmlFor="propertyDeedFileInput"
                  className="mt-2 flex min-h-[48px] w-full cursor-pointer items-center justify-center rounded-[18px] border border-[#C7D6E8] bg-[#F8FAFC] px-3 text-center text-sm font-black text-[#06194A] shadow-inner transition active:scale-[0.99]"
                >
                  {propertyDeedFile ? propertyDeedFile.name : "Tapu dosyasÄ± seÃ§"}
                </label>
                <small className="stock-upload-hint mt-2 block text-center">
                  {propertyDeedFile ? `SeÃ§ildi Â· ${formatFileSize(propertyDeedFile.size)}` : "JPG / PNG / WEBP / PDF Â· maks. 15 MB"}
                </small>
                {propertyDeedFile && (
                  <button
                    type="button"
                    className="mx-auto mt-2 flex min-h-[38px] items-center justify-center rounded-xl bg-rose-50 px-4 py-2 text-[11px] font-black text-rose-700"
                    onClick={() => setUnitFileField("propertyDeedFile", null)}
                  >
                    Tapu dosyasÄ±nÄ± kaldÄ±r
                  </button>
                )}
              </label>

              {selectedCrmCustomerId ? (
                <div className="stock-form-field full rounded-[24px] border-2 border-emerald-200 bg-gradient-to-b from-emerald-50 to-white p-4 text-center shadow-[0_14px_30px_rgba(16,185,129,0.10)]">
                  <span className="inline-flex w-full items-center justify-center gap-2 rounded-[16px] bg-white px-3 py-2 text-[#065F46] shadow-[0_10px_22px_rgba(16,185,129,0.08)]">âœ… Tapu sahibi CRMâ€™den seÃ§ildi</span>
                  <p className="mt-2 text-xs font-bold leading-5 text-[#64748B]">
                    Kimlik Ã¶n yÃ¼z / arka yÃ¼z bilgisi kiÅŸi kaydÄ±nda tutulur. AynÄ± tapu sahibi iÃ§in tekrar istenmez.
                  </p>
                </div>
              ) : (
                <>
                  <div className="stock-form-field full rounded-[24px] border-2 border-[#D6E1F0] bg-white p-4 shadow-[0_18px_42px_rgba(15,23,42,0.12)]">
                    <span className="inline-flex w-full items-center justify-center gap-2 rounded-[16px] border-b border-[#D6E1F0] bg-white px-3 py-2 text-[#06194A]">ğŸ” Tapu Sahibi Kimlik Belgesi</span>
                    <p className="mt-2 text-center text-xs font-bold leading-5 text-[#64748B]">
                      Ä°lk kez girilen tapu sahibi iÃ§in kimlik belgesi alÄ±nÄ±r. CRMâ€™den seÃ§ilen kiÅŸilerde tekrar istenmez.
                    </p>
                  </div>

                  <label className="stock-form-field rounded-[24px] border-2 border-[#D6E1F0] bg-white p-4 text-center shadow-[0_18px_42px_rgba(15,23,42,0.12)]">
                    <span>Kimlik Ã–n YÃ¼z</span>
                    <input
                      id="deedOwnerIdFrontFileInput"
                      type="file"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      onChange={(e) => handleIdentityDocumentChange("deedOwnerIdFrontFile", e.target.files?.[0])}
                      className="hidden"
                    />
                    <label
                      htmlFor="deedOwnerIdFrontFileInput"
                      className="mt-2 flex min-h-[48px] w-full cursor-pointer items-center justify-center rounded-[18px] border border-[#C7D6E8] bg-[#F8FAFC] px-3 text-center text-sm font-black text-[#06194A] shadow-inner transition active:scale-[0.99]"
                    >
                      {deedOwnerIdFrontFile ? deedOwnerIdFrontFile.name : "Kimlik Ã¶n yÃ¼z seÃ§"}
                    </label>
                    <small className="stock-upload-hint mt-2 block text-center">
                      {deedOwnerIdFrontFile ? `SeÃ§ildi Â· ${formatFileSize(deedOwnerIdFrontFile.size)}` : "JPG / PNG / WEBP / PDF Â· maks. 15 MB"}
                    </small>
                    {deedOwnerIdFrontFile && (
                      <button
                        type="button"
                        className="mx-auto mt-2 flex min-h-[38px] items-center justify-center rounded-xl bg-rose-50 px-4 py-2 text-[11px] font-black text-rose-700"
                        onClick={() => setUnitFileField("deedOwnerIdFrontFile", null)}
                      >
                        Ã–n yÃ¼zÃ¼ kaldÄ±r
                      </button>
                    )}
                  </label>

                  <label className="stock-form-field rounded-[24px] border-2 border-[#D6E1F0] bg-white p-4 text-center shadow-[0_18px_42px_rgba(15,23,42,0.12)]">
                    <span>Kimlik Arka YÃ¼z</span>
                    <input
                      id="deedOwnerIdBackFileInput"
                      type="file"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      onChange={(e) => handleIdentityDocumentChange("deedOwnerIdBackFile", e.target.files?.[0])}
                      className="hidden"
                    />
                    <label
                      htmlFor="deedOwnerIdBackFileInput"
                      className="mt-2 flex min-h-[48px] w-full cursor-pointer items-center justify-center rounded-[18px] border border-[#C7D6E8] bg-[#F8FAFC] px-3 text-center text-sm font-black text-[#06194A] shadow-inner transition active:scale-[0.99]"
                    >
                      {deedOwnerIdBackFile ? deedOwnerIdBackFile.name : "Kimlik arka yÃ¼z seÃ§"}
                    </label>
                    <small className="stock-upload-hint mt-2 block text-center">
                      {deedOwnerIdBackFile ? `SeÃ§ildi Â· ${formatFileSize(deedOwnerIdBackFile.size)}` : "JPG / PNG / WEBP / PDF Â· maks. 15 MB"}
                    </small>
                    {deedOwnerIdBackFile && (
                      <button
                        type="button"
                        className="mx-auto mt-2 flex min-h-[38px] items-center justify-center rounded-xl bg-rose-50 px-4 py-2 text-[11px] font-black text-rose-700"
                        onClick={() => setUnitFileField("deedOwnerIdBackFile", null)}
                      >
                        Arka yÃ¼zÃ¼ kaldÄ±r
                      </button>
                    )}
                  </label>
                </>
              )}
            </div>
          </div>

          <div className="stock-form-block rounded-[30px] border-2 border-[#CBD8EA] bg-white p-3 shadow-[0_22px_54px_rgba(15,23,42,0.14)]">
            <div className="stock-form-grid">
              <div className="stock-form-field full">
                <span className="inline-flex w-full items-center justify-center gap-2 rounded-[16px] border-b border-[#D6E1F0] bg-white px-3 py-2 text-[#06194A]">ğŸ–¼ï¸ Galeriye FotoÄŸraf Ekle * ({galleryImages.length}/{MAX_GALLERY_COUNT})</span>
                <small className="stock-upload-hint block text-center">
                  JPG / PNG / WEBP Â· min. 800Ã—600 px Â· Ã¶nerilen 1920Ã—1080 Â· maks. 15 MB
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
                  {checkingImages ? "GÃ¶rseller kontrol ediliyor..." : "Galeriye FotoÄŸraf Ekle"}
                </button>

                <p className="mt-2 text-xs font-bold text-[#64748B]">
                  Ä°lk eklenen fotoÄŸraf otomatik kapak olur. Ä°sterseniz baÅŸka bir gÃ¶rseli â€œKapak Yapâ€ olarak seÃ§ebilirsiniz.
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
                              alt={`Galeri fotoÄŸrafÄ± ${index + 1}`}
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
                              {image.file?.name || image.name || `FotoÄŸraf ${index + 1}`}
                            </p>
                            <p className="text-[10px] font-bold text-[#64748B]">
                              {image.file?.size ? formatFileSize(image.file.size) : image.size ? formatFileSize(image.size) : image.existing ? "Mevcut fotoÄŸraf" : ""}
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
                    En az 1 fotoÄŸraf ekleyiniz. Kapak fotoÄŸrafÄ±nÄ± galeri iÃ§inden seÃ§ebilirsiniz.
                  </div>
                )}
              </div>

              <div className="stock-form-field full stock-image-summary-row">
                <span>GÃ¶rsel Ã–zeti</span>
                <div className="stock-image-summary">
                  <div>
                    <b>Kapak</b>
                    <strong>{coverImage ? "SeÃ§ildi" : "Bekliyor"}</strong>
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

        {!geoPickerOpen && !galleryPickerActive && !checkingImages && (
          <div className="stock-modal-v2-foot stock-modal-v10-foot">
            {footerAlertMessage && (
              <div className="col-span-2 mb-2 flex w-full items-center justify-center rounded-[18px] border border-rose-200 bg-rose-50 px-3 py-2 text-center text-[12px] font-black leading-5 text-rose-700 shadow-[0_12px_26px_rgba(225,29,72,0.10)]">
                {footerAlertMessage}
              </div>
            )}

            <button className="stock-cancel-btn" onClick={onClose}>
              Ä°ptal
            </button>

            <button
              className="stock-save-btn"
              onClick={handleSubmit}
              disabled={formLoading || checkingImages}
            >
              {formLoading ? "Kaydediliyor..." : "PortfÃ¶yÃ¼ Kaydet"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

