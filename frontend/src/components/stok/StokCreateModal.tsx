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
const MIN_FILE_SIZE = 30 * 1024;
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
  group: "general" | "residential" | "commercial" | "land" | "industrial";
};

const FEATURE_OPTIONS: FeatureOption[] = [
  { key: "ASANSOR", label: "Asansör", group: "general" },
  { key: "KAPALI_OTOPARK", label: "Kapalı Otopark", group: "general" },
  { key: "ACIK_OTOPARK", label: "Açık Otopark", group: "general" },
  { key: "GUVENLIK", label: "Güvenlik", group: "general" },
  { key: "SITE_ICERISINDE", label: "Site İçerisinde", group: "general" },
  { key: "JENERATOR", label: "Jeneratör", group: "general" },
  { key: "YANGIN_MERDIVENI", label: "Yangın Merdiveni", group: "general" },
  { key: "KAMERA_SISTEMI", label: "Kamera Sistemi", group: "general" },
  { key: "SU_DEPOSU", label: "Su Deposu", group: "general" },
  { key: "HIDROFOR", label: "Hidrofor", group: "general" },
  { key: "FIBER_INTERNET", label: "Fiber İnternet", group: "general" },
  { key: "EBEVEYN_BANYOSU", label: "Ebeveyn Banyosu", group: "residential" },
  { key: "BALKON", label: "Balkon", group: "residential" },
  { key: "TERAS", label: "Teras", group: "residential" },
  { key: "KILER", label: "Kiler", group: "residential" },
  { key: "GIYINME_ODASI", label: "Giyinme Odası", group: "residential" },
  { key: "ANKASTRE_MUTFAK", label: "Ankastre Mutfak", group: "residential" },
  { key: "AKILLI_EV", label: "Akıllı Ev Sistemi", group: "residential" },
  { key: "SOMINE", label: "Şömine", group: "residential" },
  { key: "KLIMA", label: "Klima", group: "residential" },
  { key: "ISI_YALITIMI", label: "Isı Yalıtımı", group: "residential" },
  { key: "SES_YALITIMI", label: "Ses Yalıtımı", group: "residential" },
  { key: "DENIZ_MANZARASI", label: "Deniz Manzarası", group: "residential" },
  { key: "DOGA_MANZARASI", label: "Doğa Manzarası", group: "residential" },
  { key: "SEHIR_MANZARASI", label: "Şehir Manzarası", group: "residential" },
  { key: "YUKLEME_RAMPASI", label: "Yükleme Rampası", group: "industrial" },
  { key: "TIR_GIRISI", label: "TIR Girişi", group: "industrial" },
  { key: "VINC_SISTEMI", label: "Vinç Sistemi", group: "industrial" },
  { key: "SANAYI_ELEKTRIGI", label: "Sanayi Elektriği", group: "industrial" },
  { key: "FORKLIFT_ALANI", label: "Forklift Alanı", group: "industrial" },
  { key: "DEPOLAMA_ALANI", label: "Depolama Alanı", group: "industrial" },
  { key: "YANGIN_SONDURME_SISTEMI", label: "Yangın Söndürme Sistemi", group: "industrial" },
  { key: "YOLU_ACIK", label: "Yolu Açık", group: "land" },
  { key: "KADASTRO_YOLU", label: "Kadastro Yolu Var", group: "land" },
  { key: "ELEKTRIK_VAR", label: "Elektrik Var", group: "land" },
  { key: "SU_VAR", label: "Su Var", group: "land" },
  { key: "SONDAJ_VAR", label: "Sondaj Var", group: "land" },
  { key: "CEVRILI", label: "Çevrili", group: "land" },
  { key: "KOSE_PARSEL", label: "Köşe Parsel", group: "land" },
  { key: "IFRAZLI", label: "İfrazlı", group: "land" },
  { key: "HISSELI", label: "Hisseli", group: "land" },
];

function getFeatureOptionsForType(type: string) {
  const groups = new Set<FeatureOption["group"]>(["general"]);

  if (isResidentialDetailType(type) || isVillaType(type) || isTouristicType(type)) groups.add("residential");
  if (isIndustrialType(type)) groups.add("industrial");
  if (isCommercialType(type)) groups.add("commercial");
  if (isLandType(type)) groups.add("land");

  return FEATURE_OPTIONS.filter((option) => groups.has(option.group));
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

  const selectedCurrency = String(unitForm.priceCurrency || "TRY");
  const selectedFloorLabel = String((unitForm as any).floorLabel || "");
  const buildingFloorCount = String((unitForm as any).totalFloors || "");
  const buildingAge = String((unitForm as any).buildingAge || "");
  const bedCount = String((unitForm as any).bedCount || "");
  const openArea = String((unitForm as any).openArea || "");
  const closedArea = String((unitForm as any).closedArea || "");
  const deedOwnerFullName = String((unitForm as any).deedOwnerFullName || "");
  const deedOwnerPhone = String((unitForm as any).deedOwnerPhone || "");
  const deedOwnerEmail = String((unitForm as any).deedOwnerEmail || "");
  const deedOwnerIdFrontFile = (unitForm as any).deedOwnerIdFrontFile as File | null | undefined;
  const deedOwnerIdBackFile = (unitForm as any).deedOwnerIdBackFile as File | null | undefined;
  const selectedFeatures = Array.isArray((unitForm as any).features) ? ((unitForm as any).features as string[]) : [];
  const featureOptions = getFeatureOptionsForType(unitForm.type);
  const selectedSubCategory = getSubCategoryFromType(unitForm.type);
  const subCategoryOptions = CATEGORY_OPTIONS[mainCategory] || CATEGORY_OPTIONS.KONUT;
  const roomOptions = isTouristicType(unitForm.type)
    ? TOURISTIC_ROOM_BED_COUNT_OPTIONS
    : isOfficeDetailType(unitForm.type)
      ? OFFICE_ROOM_COUNT_OPTIONS
      : ROOM_COUNT_OPTIONS;
  const priceDisplay = formatPriceInput(String(unitForm.price || ""));
  const descriptionLength = unitForm.description.length;
  const showRoomCountField = shouldShowRoomCountField(unitForm.type);
  const showBuildingAgeField = shouldShowBuildingAgeField(unitForm.type);
  const showFloorFields = shouldShowFloorFields(unitForm.type);
  const showBuildingFloorCount = shouldShowBuildingFloorCount(unitForm.type);
  const showBedCountField = shouldShowBedCountField(unitForm.type);
  const showOpenAreaField = shouldShowOpenAreaField(unitForm.type);
  const showClosedAreaField = shouldShowClosedAreaField(unitForm.type);

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

    for (const file of files) {
      try {
        const dimensions = await getImageDimensions(file);

        if (dimensions.width < MIN_IMAGE_WIDTH || dimensions.height < MIN_IMAGE_HEIGHT) {
          return `Yüklediğiniz görselin çözünürlüğü düşük. En az ${MIN_IMAGE_WIDTH}x${MIN_IMAGE_HEIGHT} piksel önerilir. (${file.name})`;
        }
      } catch {
        return `Görsel okunamadı. Lütfen farklı bir JPG, PNG veya WEBP dosyası seçiniz. (${file.name})`;
      }
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

      if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl);

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

  const handleIdentityDocumentChange = (key: "deedOwnerIdFrontFile" | "deedOwnerIdBackFile", file?: File) => {
    setImageError("");

    if (!file) {
      setUnitFileField(key, null);
      return;
    }

    if (!isAcceptedDocument(file)) {
      setImageError("Kimlik belgesi JPG, PNG, WEBP veya PDF formatında olmalıdır.");
      setUnitFileField(key, null);
      return;
    }

    if (file.size > MAX_DOCUMENT_SIZE) {
      setImageError(`Kimlik belgesi 15 MB sınırını aşıyor. Seçilen belge: ${formatFileSize(file.size)}.`);
      setUnitFileField(key, null);
      return;
    }

    setUnitFileField(key, file);
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
    const rule = getAreaRule(unitForm.type);

    if (area && (area < rule.min || area > rule.max)) {
      return `${rule.label} metrekare değeri mantıksız görünüyor. ${rule.min.toLocaleString("tr-TR")} m² ile ${rule.max.toLocaleString("tr-TR")} m² arasında bir değer giriniz veya bilgiyi kontrol ediniz.`;
    }

    if (!isLandType(unitForm.type) && /^\d{5,}$/.test(number)) {
      return "Bağımsız bölüm / kapı numarası olağan dışı görünüyor. Lütfen değeri kontrol ediniz.";
    }

    if (price && (price < 100000 || price > 5000000000)) {
      return "Fiyat değeri olağan dışı görünüyor. Lütfen para birimini ve tutarı kontrol ediniz.";
    }

    if (showRoomCountField && !String(unitForm.roomCount || "").trim()) {
      return "Oda sayısı zorunludur.";
    }

    if (showBuildingAgeField && !buildingAge) {
      return "Bina yaşı zorunludur.";
    }

    if (showFloorFields && !selectedFloorLabel) {
      return "Bulunduğu kat zorunludur.";
    }

    if (showBuildingFloorCount && !buildingFloorCount) {
      return "Kat sayısı zorunludur.";
    }

    if (showBedCountField && !bedCount.trim()) {
      return "Yatak sayısı zorunludur.";
    }

    if (showClosedAreaField && !closedArea.trim()) {
      return "Kapalı alan zorunludur.";
    }

    if (deedOwnerPhone && !isValidTurkishPhone(deedOwnerPhone)) {
      return "Tapu sahibi telefonu geçerli formatta olmalıdır. Örn: 0542 852 41 41";
    }

    if (deedOwnerEmail && !isValidEmail(deedOwnerEmail)) {
      return "Tapu sahibi e-posta adresi geçerli formatta olmalıdır. Örn: isim@mail.com";
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

  return (
    <div className="stock-modal-v2-backdrop" onClick={onClose}>
      <div
        className="stock-modal-v2 stock-modal-v10"
        onClick={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
      >
        <button className="stock-modal-v10-close" onClick={onClose} aria-label="Kapat">×</button>

        <div className="stock-modal-v2-body stock-modal-v10-body" style={{ paddingBottom: "118px" }}>
          {formSuccess && <div className="stock-form-success">Portföy başarıyla eklendi.</div>}
          {formError && <div className="stock-form-error">{formError}</div>}
          {localError && <div className="stock-form-error">{localError}</div>}
          {imageError && <div className="stock-form-error">{imageError}</div>}

          <div className="stock-form-block">
            <div className="stock-form-grid">
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
                <>
                  <label className="stock-form-field">
                    <span>Proje Adı *</span>
                    <input
                      value={projectForm.name}
                      onChange={(e) => setProjectField("name", e.target.value)}
                      onBlur={(e) => setProjectFieldFormatted("name", e.target.value)}
                    />
                  </label>

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
                      <p className="mt-2 text-xs font-bold text-[#64748B]">
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

                  <label className="stock-form-field">
                    <span>Mahalle / Köy / Mevki *</span>
                    {placeOptions.length > 0 ? (
                      <select
                        value={selectedPlace}
                        onChange={(e) => {
                          const value = e.target.value;
                          setSelectedPlace(value);
                          setProjectField("address", value);
                        }}
                      >
                        <option value="">Mahalle / köy seçiniz</option>
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
                </>
              )}
            </div>
          </div>

          <div className="stock-form-block">
            <div className="stock-form-grid">
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
                  <span>{getRoomLabel(unitForm.type)} *</span>
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

              <label className="stock-form-field">
                <span>{getAreaLabel(unitForm.type)}</span>
                <input
                  type="number"
                  value={unitForm.area}
                  onChange={(e) => setUnitField("area", e.target.value)}
                  placeholder="Örn: 190"
                />
              </label>

              {showOpenAreaField && (
                <label className="stock-form-field">
                  <span>Açık Alan (m²) *</span>
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
                  <span>Kapalı Alan (m²) *</span>
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
                  <span>Yatak Sayısı *</span>
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
                  <span>Bina Yaşı *</span>
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
                  <span>Bulunduğu Kat *</span>
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
                  <span>{isVillaType(unitForm.type) ? "Yapı Kat Sayısı *" : "Toplam Kat Sayısı *"}</span>
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

              <label className="stock-form-field">
                <span>{getNumberLabel(unitForm.type)}</span>
                <input
                  value={unitForm.number}
                  onChange={(e) => setUnitField("number", e.target.value)}
                  placeholder={getNumberPlaceholder(unitForm.type)}
                />
              </label>

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
                <span>Fiyat ({getCurrencySymbol(selectedCurrency)}) *</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={priceDisplay}
                  onChange={(e) => setUnitField("price", parseFormattedNumber(e.target.value))}
                  placeholder="Örn: 10.500.000"
                />
              </label>

              <label className="stock-form-field full">
                <span>Açıklama</span>
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
            </div>
          </div>


          <div className="stock-form-block">
            <div className="stock-form-grid">
              <div className="stock-form-field full">
                <button
                  type="button"
                  onClick={() => setFeaturesOpen((current) => !current)}
                  className="flex min-h-[54px] w-full items-center justify-between gap-3 rounded-[20px] border border-[#DDE7F3] bg-gradient-to-r from-[#F8FAFC] to-white px-4 text-left shadow-[0_12px_28px_rgba(15,23,42,0.06)]"
                >
                  <span>
                    <b className="block text-[14px] font-black text-[#06194A]">Ek Özellikler</b>
                    <small className="mt-1 block text-[11px] font-bold text-[#64748B]">
                      {selectedFeatures.length > 0 ? `${selectedFeatures.length} özellik seçildi` : "İstersen portföyün öne çıkan özelliklerini seç"}
                    </small>
                  </span>
                  <span className={`rounded-full px-3 py-1.5 text-[11px] font-black ${featuresOpen ? "bg-[#1557D6] text-white" : "bg-[#EFF6FF] text-[#1557D6]"}`}>
                    {featuresOpen ? "Gizle" : "Göster"}
                  </span>
                </button>
              </div>

              {featuresOpen && (
                <div className="stock-form-field full">
                  <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                    {featureOptions.map((feature) => {
                      const checked = selectedFeatures.includes(feature.key);

                      return (
                        <button
                          key={feature.key}
                          type="button"
                          onClick={() => toggleFeature(feature.key)}
                          className={`flex min-h-[44px] items-center justify-center rounded-[16px] border px-2 text-center text-[11px] font-black shadow-[0_8px_18px_rgba(15,23,42,0.05)] transition active:scale-[0.99] ${
                            checked
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-[#DDE7F3] bg-white text-[#475569]"
                          }`}
                        >
                          {checked ? "☑ " : "☐ "}{feature.label}
                        </button>
                      );
                    })}
                  </div>

                  {selectedFeatures.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setUnitField("features", [] as any)}
                      className="mx-auto mt-3 flex min-h-[34px] items-center justify-center rounded-xl bg-rose-50 px-3 py-2 text-center text-[11px] font-black text-rose-700"
                    >
                      Seçimleri Temizle
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="stock-form-block">
            <div className="stock-form-grid">
              <div className="stock-form-field full">
                <span>Tapu Sahibi Bilgileri</span>
                <p className="mt-1 text-xs font-bold leading-5 text-[#64748B]">
                  Bu bilgiler mahremdir. Sadece portföy sahibi ve Yazılım Ekibi görebilir. Portföy kaydedilince CRM kaydı otomatik oluşturulur veya mevcut CRM kaydıyla eşleştirilir.
                </p>
              </div>

              {crmCustomers.length > 0 && (
                <label className="stock-form-field full">
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
                      const meta = [customer.phone, customer.email].filter(Boolean).join(" · ");

                      return (
                        <option key={customer.id} value={customer.id}>
                          {fullName}{meta ? ` (${meta})` : ""}
                        </option>
                      );
                    })}
                  </select>
                  <small className="stock-upload-hint">
                    Kendi CRM kayıtlarınızdan seçim yaparsanız ad, telefon ve e-posta otomatik dolar.
                  </small>
                </label>
              )}

              <label className="stock-form-field">
                <span>Tapu Sahibi Ad Soyad</span>
                <input
                  value={deedOwnerFullName}
                  onChange={(e) => setUnitField("deedOwnerFullName", e.target.value)}
                  onBlur={(e) => setUnitField("deedOwnerFullName", normalizeTurkishText(e.target.value))}
                  placeholder="Örn: Ahmet Yılmaz"
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
                  placeholder="Örn: 0542 852 41 41"
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
                  placeholder="Örn: tapusahibi@email.com"
                />
              </label>

              <div className="stock-form-field full">
                <span>Tapu Sahibi Kimlik Belgesi</span>
                <p className="mt-1 text-xs font-bold leading-5 text-[#64748B]">
                  Kimlik belgeleri mahrem evraktır. Sadece portföy sahibi ve Yazılım Ekibi görebilir. Admin ve Moderatör görüntüleyemez.
                </p>
              </div>

              <label className="stock-form-field">
                <span>Kimlik Ön Yüz</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={(e) => handleIdentityDocumentChange("deedOwnerIdFrontFile", e.target.files?.[0])}
                />
                <small className="stock-upload-hint">
                  {deedOwnerIdFrontFile ? `Seçildi: ${deedOwnerIdFrontFile.name} (${formatFileSize(deedOwnerIdFrontFile.size)})` : "JPG / PNG / WEBP / PDF · maks. 15 MB"}
                </small>
                {deedOwnerIdFrontFile && (
                  <button
                    type="button"
                    className="mt-2 rounded-xl bg-rose-50 px-3 py-2 text-[11px] font-black text-rose-700"
                    onClick={() => setUnitFileField("deedOwnerIdFrontFile", null)}
                  >
                    Ön yüzü kaldır
                  </button>
                )}
              </label>

              <label className="stock-form-field">
                <span>Kimlik Arka Yüz</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={(e) => handleIdentityDocumentChange("deedOwnerIdBackFile", e.target.files?.[0])}
                />
                <small className="stock-upload-hint">
                  {deedOwnerIdBackFile ? `Seçildi: ${deedOwnerIdBackFile.name} (${formatFileSize(deedOwnerIdBackFile.size)})` : "JPG / PNG / WEBP / PDF · maks. 15 MB"}
                </small>
                {deedOwnerIdBackFile && (
                  <button
                    type="button"
                    className="mt-2 rounded-xl bg-rose-50 px-3 py-2 text-[11px] font-black text-rose-700"
                    onClick={() => setUnitFileField("deedOwnerIdBackFile", null)}
                  >
                    Arka yüzü kaldır
                  </button>
                )}
              </label>
            </div>
          </div>

          <div className="stock-form-block">
            <div className="stock-form-grid">
              <div className="stock-form-field full">
                <span>Galeriye Fotoğraf Ekle * ({galleryImages.length}/{MAX_GALLERY_COUNT})</span>
                <small className="stock-upload-hint">
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
                  <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
                    {galleryImages.map((image, index) => {
                      const isCover = coverImage?.id === image.id;

                      return (
                        <div
                          key={image.id}
                          className={`overflow-hidden rounded-[20px] border bg-[#F7FBFF] ${
                            isCover ? "border-emerald-400 ring-2 ring-emerald-100" : "border-[#DDE7F3]"
                          }`}
                        >
                          <div className="relative h-28">
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

                          <div className="p-2">
                            <p className="truncate text-xs font-black text-[#06194A]">
                              {image.file.name}
                            </p>
                            <p className="text-[10px] font-bold text-[#64748B]">
                              {formatFileSize(image.file.size)}
                            </p>

                            <div className="mt-2 grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                className={`rounded-xl px-2 py-2 text-[11px] font-black ${
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
                                className="rounded-xl bg-rose-50 px-2 py-2 text-[11px] font-black text-rose-700"
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

        {!geoPickerOpen && !galleryPickerActive && !checkingImages && (
          <div className="stock-modal-v2-foot stock-modal-v10-foot">
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
