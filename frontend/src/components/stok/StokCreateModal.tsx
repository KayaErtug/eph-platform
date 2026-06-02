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

interface Props {
  open: boolean;
  onClose: () => void;
  projects: Project[];
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
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MIN_FILE_SIZE = 30 * 1024;
const MIN_IMAGE_WIDTH = 800;
const MIN_IMAGE_HEIGHT = 600;
const MAX_DESCRIPTION_LENGTH = 500;
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

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
  return "Daire / Bölüm No *";
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
  return ACCEPTED_IMAGE_TYPES.includes(file.type);
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
  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);

  const [imageError, setImageError] = useState("");
  const [localError, setLocalError] = useState("");
  const [checkingImages, setCheckingImages] = useState(false);
  const [provinceOptions, setProvinceOptions] = useState<LocationOption[]>([]);
  const [districtOptions, setDistrictOptions] = useState<LocationOption[]>([]);
  const [placeOptions, setPlaceOptions] = useState<LocationOption[]>([]);
  const [locationLoading, setLocationLoading] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState("");
  const [mainCategory, setMainCategory] = useState("KONUT");

  const selectedCurrency = String(unitForm.priceCurrency || "TRY");
  const selectedFloorLabel = String((unitForm as any).floorLabel || "");
  const buildingFloorCount = String((unitForm as any).totalFloors || "");
  const buildingAge = String((unitForm as any).buildingAge || "");
  const bedCount = String((unitForm as any).bedCount || "");
  const openArea = String((unitForm as any).openArea || "");
  const closedArea = String((unitForm as any).closedArea || "");
  const selectedSubCategory = getSubCategoryFromType(unitForm.type);
  const subCategoryOptions = CATEGORY_OPTIONS[mainCategory] || CATEGORY_OPTIONS.KONUT;
  const roomOptions = isOfficeDetailType(unitForm.type) ? OFFICE_ROOM_COUNT_OPTIONS : ROOM_COUNT_OPTIONS;
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
    return (coverImage ? 1 : 0) + galleryImages.length;
  }, [coverImage, galleryImages.length]);

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

  if (!open) return null;

  const validateFiles = async (files: File[]) => {
    const invalidType = files.find((file) => !isAcceptedImage(file));

    if (invalidType) {
      return "Sadece JPG, PNG veya WEBP formatında görsel yükleyebilirsiniz.";
    }

    const tooLarge = files.find((file) => file.size > MAX_FILE_SIZE);

    if (tooLarge) {
      return `Seçtiğiniz görsel 10 MB sınırını aşıyor. Lütfen daha küçük bir görsel seçiniz. (${tooLarge.name})`;
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

  const handleCoverChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    setImageError("");

    if (!file) return;

    setCheckingImages(true);
    const error = await validateFiles([file]);
    setCheckingImages(false);

    if (error) {
      setImageError(error);
      event.target.value = "";
      return;
    }

    if (coverImage?.previewUrl) URL.revokeObjectURL(coverImage.previewUrl);

    setCoverImage(createLocalImage(file));
    event.target.value = "";
  };

  const handleGalleryChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);

    setImageError("");

    if (files.length === 0) return;

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

    setGalleryImages((current) => [...current, ...newImages]);

    if (files.length > remaining) {
      setImageError(
        `En fazla ${MAX_GALLERY_COUNT} galeri fotoğrafı yükleyebilirsiniz. Fazla seçilen görseller eklenmedi.`,
      );
    }

    event.target.value = "";
  };

  const removeCoverImage = () => {
    if (coverImage?.previewUrl) URL.revokeObjectURL(coverImage.previewUrl);
    setCoverImage(null);
  };

  const removeGalleryImage = (id: string) => {
    setGalleryImages((current) => {
      const removed = current.find((image) => image.id === id);
      if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl);
      return current.filter((image) => image.id !== id);
    });
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
      <div className="stock-modal-v2" onClick={(e) => e.stopPropagation()}>
        <div className="stock-modal-v2-head">
          <div>
            <div className="stock-section-kicker">Yeni Portföy</div>
            <h2>Yeni Portföy Ekle</h2>
            <p>Gayrimenkul portföy kaydını görselleriyle birlikte oluştur.</p>
          </div>
          <button onClick={onClose}>×</button>
        </div>

        <div className="stock-modal-v2-body">
          {formSuccess && <div className="stock-form-success">Portföy başarıyla eklendi.</div>}
          {formError && <div className="stock-form-error">{formError}</div>}
          {localError && <div className="stock-form-error">{localError}</div>}
          {imageError && <div className="stock-form-error">{imageError}</div>}

          <div className="stock-form-block">
            <h3>Proje</h3>
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
                </>
              )}
            </div>
          </div>

          <div className="stock-form-block">
            <h3>Mülk Bilgileri</h3>
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
                  <input
                    type="number"
                    value={bedCount}
                    onChange={(e) => setUnitField("bedCount", e.target.value)}
                    placeholder="Örn: 40"
                  />
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
                  <span>Bulunduğu Kat</span>
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
                  <span>{isVillaType(unitForm.type) ? "Yapı Kat Sayısı" : "Toplam Kat Sayısı"}</span>
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
            <h3>Portföy Görselleri</h3>

            <div className="stock-form-grid">
              <div className="stock-form-field full">
                <span>Kapak Fotoğrafı * (1 adet)</span>

                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleCoverChange}
                  style={{ display: "none" }}
                />

                <button
                  type="button"
                  className="stock-save-btn"
                  onClick={() => coverInputRef.current?.click()}
                  disabled={checkingImages}
                >
                  {checkingImages ? "Görsel kontrol ediliyor..." : "Kapak Fotoğrafı Seç"}
                </button>

                {coverImage ? (
                  <div className="mt-4 overflow-hidden rounded-[24px] border border-[#DDE7F3] bg-[#F7FBFF]">
                    <img
                      src={coverImage.previewUrl}
                      alt="Kapak fotoğrafı önizleme"
                      className="h-56 w-full object-cover"
                    />

                    <div className="flex items-center justify-between gap-3 p-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-[#06194A]">
                          {coverImage.file.name}
                        </p>
                        <p className="text-xs font-bold text-[#64748B]">
                          {formatFileSize(coverImage.file.size)}
                        </p>
                      </div>

                      <button type="button" className="stock-cancel-btn" onClick={removeCoverImage}>
                        Sil
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 rounded-[24px] border border-dashed border-[#DDE7F3] bg-[#F7FBFF] p-5 text-center text-sm font-bold text-[#64748B]">
                    Kapak fotoğrafı portföy kartlarında ve detay sayfasında ana görsel olarak kullanılacak.
                  </div>
                )}
              </div>

              <div className="stock-form-field full">
                <span>Galeri Fotoğrafları ({galleryImages.length}/{MAX_GALLERY_COUNT})</span>

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
                  onClick={() => galleryInputRef.current?.click()}
                  disabled={galleryImages.length >= MAX_GALLERY_COUNT || checkingImages}
                >
                  {checkingImages ? "Görseller kontrol ediliyor..." : "Galeri Fotoğrafı Seç"}
                </button>

                <p className="mt-2 text-xs font-bold text-[#64748B]">
                  Maksimum {MAX_GALLERY_COUNT} galeri fotoğrafı. JPG, PNG ve WEBP desteklenir. Her görsel en fazla 10 MB olmalıdır.
                </p>

                {galleryImages.length > 0 ? (
                  <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
                    {galleryImages.map((image, index) => (
                      <div
                        key={image.id}
                        className="overflow-hidden rounded-[20px] border border-[#DDE7F3] bg-[#F7FBFF]"
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
                        </div>

                        <div className="p-2">
                          <p className="truncate text-xs font-black text-[#06194A]">
                            {image.file.name}
                          </p>
                          <p className="text-[10px] font-bold text-[#64748B]">
                            {formatFileSize(image.file.size)}
                          </p>

                          <button
                            type="button"
                            className="mt-2 w-full rounded-xl bg-rose-50 px-3 py-2 text-xs font-black text-rose-700"
                            onClick={() => removeGalleryImage(image.id)}
                          >
                            Sil
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-4 rounded-[24px] border border-dashed border-[#DDE7F3] bg-[#F7FBFF] p-5 text-center text-sm font-bold text-[#64748B]">
                    Galeri fotoğrafları portföy detay sayfasında kullanılacak.
                  </div>
                )}
              </div>

              <div className="stock-form-field full">
                <span>Görsel Limiti</span>
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-[20px] border border-[#DDE7F3] bg-[#F7FBFF] p-4 text-center">
                    <p className="text-2xl font-black text-[#06194A]">1</p>
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-[#64748B]">
                      Kapak
                    </p>
                  </div>

                  <div className="rounded-[20px] border border-[#DDE7F3] bg-[#F7FBFF] p-4 text-center">
                    <p className="text-2xl font-black text-[#06194A]">15</p>
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-[#64748B]">
                      Galeri
                    </p>
                  </div>

                  <div className="rounded-[20px] border border-[#DDE7F3] bg-[#F7FBFF] p-4 text-center">
                    <p className="text-2xl font-black text-[#06194A]">
                      {totalSelectedImages}
                    </p>
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-[#64748B]">
                      Seçili
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="stock-modal-v2-foot">
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
      </div>
    </div>
  );
}
