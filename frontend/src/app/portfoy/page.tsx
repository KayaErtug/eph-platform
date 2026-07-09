"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Bell,
  Building2,
  ChevronDown,
  ChevronUp,
  Edit3,
  Eye,
  Heart,
  Loader2,
  Map as MapIcon,
  MapPin,
  MoreVertical,
  Navigation,
  Plus,
  Send,
  Search,
  Share2,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";

import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import StokCreateModal from "@/components/stok/StokCreateModal";
import {
  decodePortfolioMetadataState,
  mergePortfolioFeatureMetadata,
} from "@/components/stok/portfolioFeatureMetadata";
import PortfolioShareModal from "@/components/portfolio/PortfolioShareModal";
import type { PortfolioShareData } from "@/components/portfolio/PortfolioShareCard";
import PortfolioFilterCenter, {
  applyPortfolioFilters,
  countPortfolioFilters,
  createEmptyPortfolioFilters,
  getPortfolioFilterChipEntries,
  removePortfolioFilterChip,
  type PortfolioFilterState,
} from "@/components/portfolio/PortfolioFilterCenter";
import type {
  LocalPortfolioImage,
  Project,
  ProjectFormState,
  Unit,
  UnitFormState,
} from "@/components/stok/stokTypes";


type CrmCustomerOption = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  email?: string | null;
  city?: string | null;
  interestedArea?: string | null;
};

type Conversation = {
  id: string;
  unreadCount?: number;
};

type MapUnit = Unit & {
  project?: Unit["project"] & {
    latitude?: number | null;
    longitude?: number | null;
    mapAddress?: string | null;
    placeId?: string | null;
  };
};

const statusLabels: Record<string, string> = {
  SATILIK: "Satılık",
  KIRALIK: "Kiralık",
  GUNLUK_KIRALIK: "Günlük Kiralık",
  DEVREN_SATILIK: "Devren Satılık",
  DEVREN_KIRALIK: "Devren Kiralık",
  ON_SATIS: "Ön Satış",
  PROJE_ASAMASI: "Proje Aşaması",
  YAKINDA_SATISTA: "Yakında Satışta",
  INSAAT_HALINDE: "İnşaat Halinde",
  HEMEN_TESLIM: "Hemen Teslim",
  INSAAT_PROJESI: "İnşaat Projesi",
  KAT_KARSILIGI: "Kat Karşılığı",
  HASILAT_PAYLASIMLI: "Hasılat Paylaşımlı",
  REZERVE: "Rezerve",
  SATILDI: "Satıldı",
  KIRALANDI: "Kiralandı",
  PASIF: "Pasif",
};


const CURRENCY_SYMBOLS: Record<string, string> = {
  TRY: "₺",
  USD: "$",
  EUR: "€",
  GBP: "£",
};


const EPH_OWL_IMAGE_DATA_URI = "data:image/png;base64,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";

function escapeMapHtml(value?: string | number | null) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function createEphMapPinSvg(
  primaryColor: string,
  selected = false,
) {
  const glow = selected ? "0.38" : "0.24";
  const strokeWidth = selected ? 3 : 2;

  return `
    <svg width="72" height="88" viewBox="0 0 72 88" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="ephPinGradient" x1="18" y1="6" x2="56" y2="76" gradientUnits="userSpaceOnUse">
          <stop stop-color="${primaryColor}"/>
          <stop offset="1" stop-color="#061A3A"/>
        </linearGradient>
        <filter id="ephPinShadow" x="-35%" y="-20%" width="170%" height="175%">
          <feDropShadow dx="0" dy="8" stdDeviation="6" flood-color="#061A3A" flood-opacity="${glow}"/>
        </filter>
      </defs>
      <path
        filter="url(#ephPinShadow)"
        d="M36 84C36 84 65 52.4 65 30C65 13.5 52 2 36 2C20 2 7 13.5 7 30C7 52.4 36 84 36 84Z"
        fill="url(#ephPinGradient)"
        stroke="white"
        stroke-width="${strokeWidth}"
      />
      <circle cx="36" cy="31" r="23" fill="white" fill-opacity="0.98"/>
      <circle cx="36" cy="31" r="20.5" fill="#EFF6FF" stroke="#B9D2F3" stroke-width="1.5"/>
      <image href="${EPH_OWL_IMAGE_DATA_URI}" x="15" y="12" width="42" height="34" preserveAspectRatio="xMidYMid meet"/>
      <circle cx="36" cy="31" r="24.5" fill="none" stroke="${selected ? "#FFC107" : "#D9E8FA"}" stroke-width="${selected ? 3 : 1}"/>
    </svg>
  `;
}

const NEW_PORTFOLIO_DAYS = 30;

function formatEnumLabel(value?: string | null) {
  return String(value || "")
    .toLocaleLowerCase("tr-TR")
    .split("_")
    .filter(Boolean)
    .map(
      (part) =>
        part.charAt(0).toLocaleUpperCase("tr-TR") + part.slice(1),
    )
    .join(" ");
}


const DEFAULT_CENTER = { lat: 37.783, lng: 29.096 };

declare global {
  interface Window {
    google?: any;
    ephPortfolioGoogleMapsReady?: Promise<void>;
  }
}

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

function getMapsApiKey() {
  return GOOGLE_MAPS_API_KEY;
}

function loadGoogleMapsScript() {
  if (typeof window === "undefined")
    return Promise.reject(new Error("Tarayıcı ortamı bulunamadı."));
  if (window.google?.maps) return Promise.resolve();
  if (window.ephPortfolioGoogleMapsReady)
    return window.ephPortfolioGoogleMapsReady;

  const apiKey = getMapsApiKey();

  if (!apiKey)
    return Promise.reject(new Error("Google Maps API anahtarı tanımlı değil."));

  window.ephPortfolioGoogleMapsReady = new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[data-eph-portfolio-google-maps="true"]',
    );

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve());
      existingScript.addEventListener("error", () =>
        reject(new Error("Google Maps yüklenemedi.")),
      );
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&language=tr&region=TR`;
    script.async = true;
    script.defer = true;
    script.dataset.ephPortfolioGoogleMaps = "true";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Google Maps yüklenemedi."));
    document.head.appendChild(script);
  });

  return window.ephPortfolioGoogleMapsReady;
}

function parseFormattedNumber(value: string) {
  return Number(String(value || "").replace(/[^0-9]/g, ""));
}

function formatPrice(value?: number, currency?: string) {
  const numeric = Number(value || 0);
  const symbol = CURRENCY_SYMBOLS[currency || "TRY"] || "₺";

  if (!numeric) return "Fiyat yok";

  return `${numeric.toLocaleString("tr-TR")} ${symbol}`;
}

function formatCompactPrice(value?: number, currency?: string) {
  const numeric = Number(value || 0);
  const symbol = CURRENCY_SYMBOLS[currency || "TRY"] || "₺";

  if (!numeric) return "—";

  return `${numeric.toLocaleString("tr-TR")} ${symbol}`;
}

function getUnitImages(unit?: Unit | null) {
  const images = Array.isArray(unit?.images) ? unit.images : [];

  return images
    .filter((image) => image?.url || image?.supabaseUrl)
    .map((image) => ({
      ...image,
      displayUrl: image.supabaseUrl || image.url || "",
    }))
    .sort((a, b) => {
      if (a.isCover !== b.isCover) return a.isCover ? -1 : 1;
      if ((a.sortOrder || 0) !== (b.sortOrder || 0))
        return (a.sortOrder || 0) - (b.sortOrder || 0);
      return String(a.createdAt || "").localeCompare(String(b.createdAt || ""));
    });
}

function getUnitCoverImage(unit?: Unit | null) {
  const images = getUnitImages(unit);
  return (
    images.find((image) => image.isCover)?.displayUrl ||
    images[0]?.displayUrl ||
    ""
  );
}

function isUnitVerified(unit?: Unit | null) {
  return Boolean(
    unit?.isVerified ||
    (unit?.tapuVerified && unit?.photoVerified && unit?.yetkiVerified),
  );
}

function formatFloorInfo(
  unit: Pick<Unit, "floor" | "floorLabel" | "totalFloors">,
) {
  const floorText =
    unit.floorLabel || (unit.floor != null ? `${unit.floor}. Kat` : "Kat yok");
  const totalText = unit.totalFloors ? `${unit.totalFloors} Katlı` : "";
  return totalText ? `${floorText} / ${totalText}` : floorText;
}

function getPortfolioNo(unit: Unit) {
  const raw = String(unit.id || "EPH").replace(/[^a-zA-Z0-9]/g, "");
  return `EPH-${raw.slice(0, 4).toLocaleUpperCase("tr-TR") || "PORT"}-${raw.slice(-4).toLocaleUpperCase("tr-TR") || "0001"}`;
}

function getShareUrl(unit: Unit) {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/portfoy/${unit.id}`;
}

function makeWhatsappLocationText(unit: MapUnit) {
  const lat = unit.project?.latitude;
  const lng = unit.project?.longitude;
  const mapsUrl =
    lat && lng
      ? `https://www.google.com/maps?q=${lat},${lng}`
      : getShareUrl(unit);
  const location = [unit.project?.city, unit.project?.district, unit.project?.address]
    .filter(Boolean)
    .join(" / ");

  return [
    "Merhaba, size EPH üzerinden portföy konumu gönderiyorum.",
    "",
    `Portföy: ${unit.project?.name || "EPH Portföy"}`,
    location ? `Konum: ${location}` : "",
    unit.price ? `Fiyat: ${formatPrice(unit.price, unit.priceCurrency)}` : "",
    "",
    `Harita: ${mapsUrl}`,
  ]
    .filter((item) => item !== "")
    .join("\n");
}

function StokPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const { user } = useAuthStore();

  const [projects, setProjects] = useState<Project[]>([]);
  const [crmCustomers, setCrmCustomers] = useState<CrmCustomerOption[]>([]);
  const [units, setUnits] = useState<MapUnit[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [showMapPins, setShowMapPins] = useState(true);
  const [mapSelectedUnitId, setMapSelectedUnitId] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [portfolioFilters, setPortfolioFilters] =
    useState<PortfolioFilterState>(() => createEmptyPortfolioFilters());
  const [search, setSearch] = useState("");  const [shareOpen, setShareOpen] = useState(false);
  const [shareData, setShareData] = useState<PortfolioShareData | null>(null);
  const [deletingUnitId, setDeletingUnitId] = useState("");
  const [poolActionUnitId, setPoolActionUnitId] = useState("");
  const [editingUnit, setEditingUnit] = useState<MapUnit | null>(null);
  const [unreadMessages, setUnreadMessages] = useState(0);

  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [projectForm, setProjectForm] = useState<ProjectFormState>({
    name: "",
    city: "Denizli",
    district: "",
    address: "",
  });
  const [unitForm, setUnitForm] = useState<UnitFormState>({
    type: "DAIRE",
    floor: "",
    floorLabel: "",
    totalFloors: "",
    number: "",
    adaNo: "",
    parselNo: "",
    roomCount: "3+1",
    area: "",
    price: "",
    priceCurrency: "TRY",
    status: "SATILIK",
    description: "",
    deedOwnerFullName: "",
    deedOwnerPhone: "",
    deedOwnerEmail: "",
    features: [],
    availableCreditAmount: "",
    doorAccessInfo: "",
  } as UnitFormState);
  const [coverImage, setCoverImage] = useState<LocalPortfolioImage | null>(
    null,
  );
  const [galleryImages, setGalleryImages] = useState<LocalPortfolioImage[]>([]);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState(false);
  const [formSuccessMessage, setFormSuccessMessage] = useState("");
  const [formWarningMessage, setFormWarningMessage] = useState("");

  const canAddUnit =
    user?.role === "MUTEAHHIT" ||
    user?.role === "INSAAT_FIRMASI" ||
    user?.role === "EMLAKCI" ||
    user?.role === "SUPER_ADMIN";

  useEffect(() => setHydrated(true), []);

  useEffect(() => {
    if (!hydrated) return;
    if (!user) {
      router.push("/giris");
      return;
    }
    fetchData();
  }, [hydrated, user, router]);

  useEffect(() => {
    const editId = searchParams.get("edit");

    if (!editId || units.length === 0 || showModal) return;

    const foundUnit = units.find((unit) => unit.id === editId);

    if (foundUnit) {
      openEditModal(foundUnit);
      router.replace("/portfoy", { scroll: false });
    }
  }, [router, searchParams, showModal, units]);

  useEffect(() => {
    if (!hydrated || !user) return;
    if (searchParams.get("create") !== "1") return;

    router.replace("/portfoy", { scroll: false });

    if (showModal || !canAddUnit) return;
    openCreateModal();
  }, [hydrated, user, searchParams, showModal, canAddUnit, router]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [projectRes, unitRes, crmRes, conversationsRes] = await Promise.all([
        api.get("/projects/my"),
        api.get("/units"),
        api.get("/crm/customers").catch(() => ({ data: [] })),
        user?.id ? api.get(`/conversations?userId=${user.id}`).catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
      ]);
      setProjects(projectRes.data || []);
      setUnits(unitRes.data || []);
      setCrmCustomers(Array.isArray(crmRes.data) ? crmRes.data : []);

      const conversations = Array.isArray(conversationsRes.data)
        ? (conversationsRes.data as Conversation[])
        : [];

      setUnreadMessages(
        conversations.reduce((sum, conversation) => sum + (conversation.unreadCount || 0), 0),
      );
    } finally {
      setLoading(false);
    }
  };

  const filteredUnits = useMemo(
    () => applyPortfolioFilters(units, portfolioFilters, search),
    [portfolioFilters, search, units],
  );

  const activeFilterCount = countPortfolioFilters(portfolioFilters);
  const activeFilterChips = getPortfolioFilterChipEntries(portfolioFilters);

  const mapUnits = useMemo(() => {
    return filteredUnits.filter(
      (unit) =>
        Number(unit.project?.latitude) && Number(unit.project?.longitude),
    );
  }, [filteredUnits]);

  const selectedMapUnit = useMemo(() => {
    if (!mapUnits.length) return null;

    return (
      mapUnits.find((unit) => unit.id === mapSelectedUnitId) ||
      mapUnits[0] ||
      null
    );
  }, [mapSelectedUnitId, mapUnits]);

  const missingLocationCount = useMemo(() => {
    return filteredUnits.filter(
      (unit) =>
        !Number(unit.project?.latitude) || !Number(unit.project?.longitude),
    ).length;
  }, [filteredUnits]);

  const rentCount = useMemo(
    () =>
      units.filter((unit) => String(unit.status || "").includes("KIRALIK"))
        .length,
    [units],
  );
  const saleCount = useMemo(
    () =>
      units.filter(
        (unit) =>
          String(unit.status || "").includes("SATILIK") ||
          unit.status === "SATILIK",
      ).length,
    [units],
  );
  const averageValue = useMemo(() => {
    if (!units.length) return 0;
    return Math.round(
      units.reduce((sum, unit) => sum + (Number(unit.price) || 0), 0) /
        units.length,
    );
  }, [units]);
  const makeExistingGalleryImages = (unit: MapUnit): LocalPortfolioImage[] => {
    return getUnitImages(unit as Unit).map((image, index) => ({
      id: `existing-${image.id}`,
      previewUrl: image.displayUrl,
      existing: true,
      remoteId: image.id,
      name: image.originalName || `Mevcut fotoğraf ${index + 1}`,
      size: image.size || 0,
      isCover: Boolean(image.isCover),
    }));
  };

  const resetSelectedImages = () => {
    if (coverImage?.previewUrl?.startsWith("blob:")) URL.revokeObjectURL(coverImage.previewUrl);
    galleryImages.forEach((image) => {
      if (image.previewUrl?.startsWith("blob:")) URL.revokeObjectURL(image.previewUrl);
    });
    setCoverImage(null);
    setGalleryImages([]);
  };

  const resetForm = () => {
    setEditingUnit(null);
    setSelectedProjectId("");
    setProjectForm({
      name: "",
      city: "Denizli",
      district: "",
      address: "",
    } as ProjectFormState);
    setUnitForm({
      type: "DAIRE",
      floor: "",
      floorLabel: "",
      totalFloors: "",
      number: "",
      adaNo: "",
      parselNo: "",
      roomCount: "3+1",
      area: "",
      price: "",
      priceCurrency: "TRY",
      status: "SATILIK",
      description: "",
      deedOwnerFullName: "",
      deedOwnerPhone: "",
      deedOwnerEmail: "",
      features: [],
      availableCreditAmount: "",
      doorAccessInfo: "",
    } as UnitFormState);
    setFormError("");
    setFormSuccess(false);
    setFormSuccessMessage("");
    setFormWarningMessage("");
    resetSelectedImages();
  };

  const openCreateModal = () => {
    const currentRole = String(user?.role || "").toUpperCase();

    if (currentRole === "ADMIN") {
      window.alert("Rolünüz Admin olduğu için portföy girişi yapamazsınız.");
      return;
    }

    if (!canAddUnit) {
      window.alert("Bu kullanıcı rolüyle portföy girişi yapamazsınız.");
      return;
    }

    resetForm();
    setShowModal(true);
  };

  const openEditModal = (unit: MapUnit) => {
    resetSelectedImages();
    const existingGalleryImages = makeExistingGalleryImages(unit);
    const storedFeatures = Array.isArray((unit as any).features)
      ? ((unit as any).features as string[])
      : [];
    const metadataState = decodePortfolioMetadataState(storedFeatures);
    setGalleryImages(existingGalleryImages);
    setCoverImage(
      existingGalleryImages.find((image) => image.isCover) ||
        existingGalleryImages[0] ||
        null,
    );
    setEditingUnit(unit);
    setSelectedProjectId(unit.project?.id || "");
    setProjectForm({
      name: unit.project?.name || "",
      city: unit.project?.city || "Denizli",
      district: unit.project?.district || "",
      address: unit.project?.address || "",
      latitude: (unit.project as any)?.latitude ?? undefined,
      longitude: (unit.project as any)?.longitude ?? undefined,
      mapAddress: (unit.project as any)?.mapAddress ?? undefined,
      placeId: (unit.project as any)?.placeId ?? undefined,
    } as ProjectFormState);
    setUnitForm({
      type: unit.type || "DAIRE",
      floor: unit.floor != null ? String(unit.floor) : "",
      floorLabel: unit.floorLabel || "",
      totalFloors: unit.totalFloors != null ? String(unit.totalFloors) : "",
      number: unit.number || "",
      adaNo: (unit as any).adaNo || "",
      parselNo: (unit as any).parselNo || "",
      roomCount: unit.roomCount || "",
      area: unit.area != null ? String(unit.area) : "",
      price: unit.price != null ? String(Math.round(Number(unit.price))) : "",
      priceCurrency: (unit.priceCurrency as any) || "TRY",
      status: unit.status || "SATILIK",
      description: unit.description || "",
      deedOwnerFullName: (unit as any).deedOwnerFullName || "",
      deedOwnerPhone: (unit as any).deedOwnerPhone || "",
      deedOwnerEmail: (unit as any).deedOwnerEmail || "",
      ...metadataState,
      features: storedFeatures,
      availableCreditAmount:
        (unit as any).availableCreditAmount != null
          ? String(Math.round(Number((unit as any).availableCreditAmount)))
          : "",
      doorAccessInfo: (unit as any).doorAccessInfo || "",
    } as UnitFormState);
    setFormError("");
    setFormSuccess(false);
    setFormSuccessMessage("");
    setFormWarningMessage("");
    setShowModal(true);
  };

  const hasUnsavedCreateData = () => {
    if (editingUnit) return false;

    return Boolean(
      selectedProjectId ||
      String(projectForm.name || "").trim() ||
      String(projectForm.district || "").trim() ||
      String(projectForm.address || "").trim() ||
      String(unitForm.area || "").trim() ||
      String(unitForm.price || "").trim() ||
      String(unitForm.floorLabel || "").trim() ||
      String(unitForm.totalFloors || "").trim() ||
      String(unitForm.description || "").trim() ||
      String((unitForm as any).buildingAge || "").trim() ||
      galleryImages.length > 0
    );
  };

  const closeModalAfterSave = () => {
    setShowModal(false);
    resetForm();
  };

  const closeModal = () => {
    if (formLoading) return;

    if (hasUnsavedCreateData()) {
      const shouldDiscard = window.confirm(
        "Girdiğiniz portföy bilgileri henüz kaydedilmedi. Formdan çıkarsanız bilgiler silinir. Çıkmak istediğinize emin misiniz?",
      );

      if (!shouldDiscard) return;
    }

    setShowModal(false);
    resetForm();
  };

  const uploadPortfolioImage = async (
    unitId: string,
    file: File,
    isCover: boolean,
    sortOrder: number,
  ) => {
    const payload = new FormData();
    payload.append("portfolioId", unitId);
    payload.append("isCover", isCover ? "true" : "false");
    payload.append("sortOrder", String(sortOrder));
    payload.append("file", file);

    return api.post("/portfolio-images/upload", payload, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  };














  const getPortfolioSaveErrorMessage = (error: any, editing: boolean) => {
    const rawMessage = error?.response?.data?.message;
    const messages = (Array.isArray(rawMessage) ? rawMessage : [rawMessage])
      .map((item) => String(item || '').trim())
      .filter(Boolean);
    const fallback = editing
      ? 'Portföy güncellemesi sırasında beklenmeyen bir hata oluştu.'
      : 'Portföy girişi sırasında beklenmeyen bir hata oluştu.';
    const detail = messages.length ? messages.join('\n• ') : fallback;

    if (
      detail.startsWith('Portföy kaydı başarısız.') ||
      detail.startsWith('Portföy girişi başarısız.') ||
      detail.startsWith('Portföy güncellemesi başarısız.')
    ) {
      return detail;
    }

    return `${editing ? 'Portföy güncellemesi' : 'Portföy girişi'} başarısız.\nNeden: ${detail}`;
  };

  const handleSubmit = async () => {
    setFormError('');
    setFormSuccess(false);
    setFormSuccessMessage('');
    setFormWarningMessage('');
    setFormLoading(true);

    try {
      const numericPrice = parseFormattedNumber(unitForm.price);
      const numericArea = Number(unitForm.area || 0);
      const numericAvailableCreditAmount = parseFormattedNumber(
        String((unitForm as any).availableCreditAmount || ''),
      );
      const normalizedFeatures = mergePortfolioFeatureMetadata(
        (unitForm as any).features,
        unitForm as unknown as Record<string, unknown>,
      );

      const unitPayload = {
        type: unitForm.type,
        floor: unitForm.floor ? parseInt(unitForm.floor, 10) : undefined,
        floorLabel: unitForm.floorLabel || undefined,
        totalFloors: unitForm.totalFloors
          ? parseInt(unitForm.totalFloors, 10)
          : undefined,
        number: unitForm.number,
        adaNo: String((unitForm as any).adaNo || '').trim() || undefined,
        parselNo: String((unitForm as any).parselNo || '').trim() || undefined,
        roomCount: unitForm.roomCount || undefined,
        area: numericArea || undefined,
        price: numericPrice,
        priceCurrency: unitForm.priceCurrency || 'TRY',
        status: unitForm.status,
        description: unitForm.description || undefined,
        deedOwnerFullName:
          String((unitForm as any).deedOwnerFullName || '').trim() || undefined,
        deedOwnerPhone:
          String((unitForm as any).deedOwnerPhone || '').trim() || undefined,
        deedOwnerEmail:
          String((unitForm as any).deedOwnerEmail || '').trim() || undefined,
        availableCreditAmount: numericAvailableCreditAmount || undefined,
        doorAccessInfo:
          String((unitForm as any).doorAccessInfo || '').trim() || undefined,
        features: normalizedFeatures,
      };

      if (editingUnit) {
        await api.patch(`/units/${editingUnit.id}`, unitPayload);

        const selectedCoverImage = coverImage || galleryImages[0] || null;
        const newGalleryImages = galleryImages.filter((image) => image.file);
        const existingImageCount = galleryImages.filter(
          (image) => image.existing,
        ).length;
        const uploadResults = await Promise.allSettled(
          newGalleryImages.map((image, index) =>
            uploadPortfolioImage(
              editingUnit.id,
              image.file!,
              image.id === selectedCoverImage?.id,
              existingImageCount + index,
            ),
          ),
        );
        const failedPhotoCount = uploadResults.filter(
          (result) => result.status === 'rejected',
        ).length;

        setFormSuccess(true);

        if (failedPhotoCount > 0) {
          setFormWarningMessage(
            `Portföy güncellendi. ${newGalleryImages.length} yeni fotoğraftan ${failedPhotoCount} tanesi yüklenemedi. Portföyü düzenleyerek bu fotoğrafları yeniden ekleyebilirsiniz.`,
          );
        } else if (newGalleryImages.length > 0) {
          setFormSuccessMessage(
            `Portföy güncellendi. ${newGalleryImages.length} yeni fotoğrafın tamamı yüklendi.`,
          );
        } else {
          setFormSuccessMessage('Portföy başarıyla güncellendi.');
        }

        try {
          await fetchData();
        } catch {
          // Kayıt tamamlandı; liste yenileme hatası sonucu başarısız gösterilmez.
        }

        window.setTimeout(
          () => closeModalAfterSave(),
          failedPhotoCount > 0 ? 5500 : 2400,
        );
        return;
      }

      const selectedCoverImage = coverImage || galleryImages[0] || null;
      const uploadableImages = galleryImages.filter((image) => image.file);

      if (!selectedCoverImage || uploadableImages.length === 0) {
        setFormError(
          'Portföy girişi başarısız.\nEksik zorunlu alanlar:\n• En az 1 portföy fotoğrafı',
        );
        return;
      }

      let projectId = selectedProjectId;

      if (!selectedProjectId) {
        if (
          !projectForm.name ||
          !projectForm.city ||
          !projectForm.district ||
          !projectForm.address
        ) {
          setFormError(
            'Portföy girişi başarısız.\nEksik zorunlu proje bilgileri:\n• Proje Adı\n• Şehir\n• İlçe\n• Mahalle / Köy / Mevki',
          );
          return;
        }

        const projectRes = await api.post('/projects', {
          ...(projectForm as any),
          latitude: (projectForm as any).latitude ?? null,
          longitude: (projectForm as any).longitude ?? null,
          mapAddress: (projectForm as any).mapAddress ?? null,
          placeId: (projectForm as any).placeId ?? null,
        });

        projectId = projectRes.data.id;
      }

      const unitRes = await api.post(
        `/units/project/${projectId}`,
        unitPayload,
      );
      const createdUnitId = unitRes.data?.id;

      if (!createdUnitId) {
        setFormSuccess(true);
        setFormWarningMessage(
          'Portföy kaydı oluşturuldu ancak fotoğraf yükleme kimliği alınamadı. Sayfayı yenileyip portföyü düzenleyerek fotoğrafları ekleyiniz.',
        );

        try {
          await fetchData();
        } catch {
          // Kayıt tamamlandı; liste yenileme hatası sonucu başarısız gösterilmez.
        }

        window.setTimeout(() => closeModalAfterSave(), 6000);
        return;
      }

      const uploadResults = await Promise.allSettled(
        uploadableImages.map((image, index) =>
          uploadPortfolioImage(
            createdUnitId,
            image.file!,
            image.id === selectedCoverImage.id,
            index,
          ),
        ),
      );
      const failedPhotoCount = uploadResults.filter(
        (result) => result.status === 'rejected',
      ).length;

      setFormSuccess(true);

      if (failedPhotoCount > 0) {
        setFormWarningMessage(
          `Portföy girişi başarılı. ${uploadableImages.length} fotoğraftan ${failedPhotoCount} tanesi yüklenemedi. Portföyü düzenleyerek bu fotoğrafları yeniden ekleyebilirsiniz.`,
        );
      } else {
        setFormSuccessMessage(
          `Portföy girişi başarılı. ${uploadableImages.length} fotoğrafın tamamı yüklendi.`,
        );
      }

      try {
        await fetchData();
      } catch {
        // Kayıt tamamlandı; liste yenileme hatası sonucu başarısız gösterilmez.
      }

      window.setTimeout(
        () => closeModalAfterSave(),
        failedPhotoCount > 0 ? 5500 : 2400,
      );
    } catch (error: any) {
      setFormError(getPortfolioSaveErrorMessage(error, Boolean(editingUnit)));
    } finally {
      setFormLoading(false);
    }
  };

  const getPortfolioShareData = (unit: MapUnit): PortfolioShareData => {
    const title = unit.project?.name || "EPH Portföy";
    const location =
      [unit.project?.city, unit.project?.district, unit.project?.address]
        .filter(Boolean)
        .join(" / ") || "Konum bilgisi yok";

    return {
      id: unit.id,
      title,
      location,
      price: unit.price
        ? formatPrice(unit.price, unit.priceCurrency)
        : "Fiyat bilgisi yok",
      roomCount: unit.roomCount || "—",
      area: unit.area ? `${unit.area} m²` : "—",
      floor: formatFloorInfo(unit),
      authorization:
        unit.yetkiVerified || unit.isVerified ? "Yetkili" : "Kontrol",
      coverImage: getUnitCoverImage(unit) || "/LOGO_EPH.png",
      consultantName:
        [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
        "EPH Üyesi",
      consultantPhone: "Telefon bilgisi",
      portfolioNo: getPortfolioNo(unit),
      score: 86,
      scoreLabel: "Çok İyi",
      shortDescription:
        unit.description ||
        "Yetkili portföy statüsünde paylaşım için hazır gayrimenkul kaydı.",
      longDescription:
        unit.description ||
        "Bu portföy EPH Portföy Merkezi üzerinden hazırlanmıştır.",
      features: [
        {
          icon: "security",
          label:
            unit.yetkiVerified || unit.isVerified
              ? "Yetkili Portföy"
              : "Yetki Kontrol",
        },
        { icon: "smart", label: "Lina Kartı" },
        { icon: "car", label: "Portföy Kaydı" },
        {
          icon: "pool",
          label: statusLabels[unit.status] || unit.status || "Portföy",
        },
      ],
    };
  };

  const handlePortfolioShare = (unit: MapUnit) => {
    setShareData(getPortfolioShareData(unit));
    setShareOpen(true);
  };

  const handleDeleteUnit = async (unit: MapUnit) => {
    if (!confirm("Bu portföyü silmek istiyor musunuz?")) return;

    try {
      setDeletingUnitId(unit.id);
      await api.delete(`/units/${unit.id}`);
      setUnits((current) => current.filter((item) => item.id !== unit.id));
    } catch (error: any) {
      alert(error?.response?.data?.message || "Portföy silinemedi.");
    } finally {
      setDeletingUnitId("");
    }
  };

  const handleSendToPool = async (unit: MapUnit) => {
    if ((unit as any).approvalStatus !== "ONAYLANDI") {
      alert("Sadece onaylanmış portföyler havuza gönderilebilir.");
      return;
    }

    try {
      setPoolActionUnitId(unit.id);
      await api.post(`/units/${unit.id}/send-to-pool`);
      await fetchData();
      alert("Portföy havuza gönderildi.");
    } catch (error: any) {
      alert(error?.response?.data?.message || "Portföy havuza gönderilemedi.");
    } finally {
      setPoolActionUnitId("");
    }
  };

  const handleRemoveFromPool = async (unit: MapUnit) => {
    try {
      setPoolActionUnitId(unit.id);
      await api.post(`/units/${unit.id}/remove-from-pool`);
      await fetchData();
      alert(
        "Portföy havuzdan kaldırıldı. Onaylı durumda kalır, istediğiniz zaman tekrar havuza gönderebilirsiniz.",
      );
    } catch (error: any) {
      alert(
        error?.response?.data?.message || "Portföy havuzdan kaldırılamadı.",
      );
    } finally {
      setPoolActionUnitId("");
    }
  };

  const handleWhatsappLocation = (unit: MapUnit) => {
    const text = encodeURIComponent(makeWhatsappLocationText(unit));
    window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
  };

  const focusPortfolioCard = (unitId: string) => {
    setMapSelectedUnitId(unitId);

    window.setTimeout(() => {
      const card = document.getElementById(`portfolio-card-${unitId}`);

      card?.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "nearest",
      });
    }, 100);
  };

  if (!hydrated || loading) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center overflow-y-auto bg-[#F7F5FF] text-[#2E1065]">
        <div className="text-center">
          <Loader2 className="mx-auto animate-spin text-[#7C3AED]" size={32} />
          <p className="mt-3 text-[12px] font-black text-[#64748B]">
            Portföy merkezi yükleniyor...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[100dvh] overflow-x-hidden overflow-y-auto bg-[#F7F5FF] pb-[calc(144px+env(safe-area-inset-bottom))] text-[#2E1065]">
      <div className="mx-auto w-full max-w-[430px] overflow-x-hidden px-3 pt-3">
        <section className="rounded-[28px] border border-[#DDD6FE] bg-[linear-gradient(180deg,#FFFFFF_0%,#FBFAFF_100%)] p-3 shadow-[0_16px_38px_rgba(76,29,149,0.08)]">

          <div className="mt-3 flex items-center gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-[18px] border border-[#DDD6FE] bg-[#FBFAFF] px-3 py-2">
              <Search size={17} className="shrink-0 text-[#64748B]" />
              <input
                ref={searchInputRef}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Portföy, il, ilçe, mahalle ara"
                className="h-8 min-w-0 flex-1 bg-transparent text-[12.5px] font-bold outline-none placeholder:text-[#8B83A8]"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  aria-label="Aramayı temizle"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setFilterOpen(true)}
              className={`relative flex h-12 min-w-[104px] items-center justify-center gap-2 rounded-[18px] border px-3 text-[12px] font-black active:scale-[0.98] ${
                filterOpen || activeFilterCount > 0
                  ? "border-[#7C3AED] bg-[#7C3AED] text-white"
                  : "border-[#DDD6FE] bg-white text-[#2E1065]"
              }`}
            >
              <SlidersHorizontal size={17} />
              Filtrele
              {activeFilterCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-[10px] font-black text-[#7C3AED]">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          {activeFilterChips.length > 0 && (
            <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
              {activeFilterChips.slice(0, 12).map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() =>
                    setPortfolioFilters((current) =>
                      removePortfolioFilterChip(current, chip),
                    )
                  }
                  className="flex shrink-0 items-center gap-1 rounded-full border border-[#C4B5FD] bg-[#F5F3FF] px-2.5 py-1 text-[9.5px] font-black text-[#6D28D9] active:scale-[0.98]"
                  aria-label={`${chip.label} filtresini kaldır`}
                >
                  <span>{chip.label}</span>
                  <X size={11} strokeWidth={2.6} />
                </button>
              ))}

              {activeFilterChips.length > 12 && (
                <span className="shrink-0 rounded-full border border-[#C4B5FD] bg-white px-2.5 py-1 text-[9.5px] font-black text-[#64748B]">
                  +{activeFilterChips.length - 12}
                </span>
              )}

              <button
                type="button"
                onClick={() =>
                  setPortfolioFilters(createEmptyPortfolioFilters())
                }
                className="shrink-0 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[9.5px] font-black text-rose-700"
              >
                Temizle
              </button>
            </div>
          )}

          <div className="mt-2 flex items-center justify-between rounded-[16px] border border-[#DDD6FE] bg-[#FBFAFF] px-3 py-2">
            <span className="text-[10px] font-black text-[#64748B]">
              Aktif filtre sonucu
            </span>
            <strong className="text-[14px] font-black text-[#7C3AED]">
              {filteredUnits.length} Portföy
            </strong>
          </div>

          <div className="mt-3 grid grid-cols-4 overflow-hidden rounded-[18px] border border-[#EDE9FE] bg-white text-center">
            <MiniMetric label="Portföy" value={units.length} />
            <MiniMetric
              label="Ort. Fiyat"
              value={averageValue ? formatCompactPrice(averageValue) : "0"}
              tone="green"
            />
            <MiniMetric label="Satılık" value={saleCount} tone="blue" />
            <MiniMetric label="Kiralık" value={rentCount} tone="orange" />
          </div>

        </section>

        <button
          type="button"
          onClick={() => setMapOpen((current) => !current)}
          className="mt-3 flex h-13 min-h-[52px] w-full items-center justify-center gap-2 rounded-[22px] border border-[#C4B5FD] bg-[linear-gradient(90deg,#FFFFFF_0%,#F5F3FF_50%,#FFFFFF_100%)] px-4 text-[14px] font-black text-[#2E1065] shadow-[0_12px_28px_rgba(76,29,149,0.07)]"
        >
          <span className="inline-flex items-center gap-2">
            <MapIcon size={19} className="text-[#7C3AED]" />{" "}
            {mapOpen ? "Haritayı Kapat" : "Haritayı Göster"}
          </span>
          <ChevronDown
            size={19}
            className={mapOpen ? "rotate-180 text-[#7C3AED] transition" : "text-[#7C3AED] transition"}
          />
        </button>

        {mapOpen && (
          <section className="mt-3 overflow-hidden rounded-[26px] border border-[#DDD6FE] bg-white shadow-[0_18px_42px_rgba(15,23,42,0.08)]">
            <PortfolioMap
              units={mapUnits}
              selectedUnitId={selectedMapUnit?.id || ""}
              showPins={showMapPins}
              onSelectUnit={(unitId) => setMapSelectedUnitId(unitId)}
              onNavigateToCard={focusPortfolioCard}
            />

            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 py-2 text-[12px] font-black text-[#64748B]">
              <span>
                {showMapPins
                  ? `${mapUnits.length} pinli portföy`
                  : "Pinler gizli"}
              </span>
              <button
                type="button"
                onClick={() => setShowMapPins((current) => !current)}
                className="min-h-[34px] rounded-[14px] border border-[#DDD6FE] bg-[#FBFAFF] px-3 text-[11px] font-black text-[#7C3AED] shadow-sm active:scale-[0.98]"
              >
                {showMapPins ? "Pinleri Gizle" : "Pinleri Göster"}
              </button>
              <span className="text-right">
                {missingLocationCount} konumsuz kayıt
              </span>
            </div>

            {selectedMapUnit ? (
              <div className="border-t border-[#EDE9FE] bg-[#FBFAFF] p-3">
                <div className="rounded-[22px] border border-[#DDD6FE] bg-white p-3 text-center shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
                  <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-[16px] bg-[#EDE9FE] text-[#7C3AED]">
                    <MapPin size={19} />
                  </div>
                  <h3 className="text-[14px] font-black leading-5 text-[#2E1065]">
                    {selectedMapUnit.project?.name || "Seçili Portföy"}
                  </h3>
                  <p className="mt-1 text-[11px] font-bold leading-4 text-[#64748B]">
                    {[
                      selectedMapUnit.project?.address,
                      selectedMapUnit.project?.district,
                      selectedMapUnit.project?.city,
                    ]
                      .filter(Boolean)
                      .join(" / ") || "Konum bilgisi yok"}
                  </p>

                  <div className="mt-3 grid grid-cols-3 overflow-hidden rounded-[18px] border border-[#EDE9FE] bg-[#FBFAFF]">
                    <MiniMetric
                      label="Fiyat"
                      value={formatCompactPrice(
                        selectedMapUnit.price,
                        selectedMapUnit.priceCurrency,
                      )}
                      tone="green"
                    />
                    <MiniMetric
                      label="Oda"
                      value={selectedMapUnit.roomCount || "—"}
                      tone="blue"
                    />
                    <MiniMetric
                      label="Alan"
                      value={
                        selectedMapUnit.area
                          ? `${selectedMapUnit.area} m²`
                          : "—"
                      }
                      tone="orange"
                    />
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleWhatsappLocation(selectedMapUnit)}
                      className="min-h-[44px] rounded-[18px] border border-emerald-100 bg-emerald-50 px-3 text-[12px] font-black text-emerald-700 active:scale-[0.98]"
                    >
                      Konumu Paylaş
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        router.push(`/portfoy/${selectedMapUnit.id}`)
                      }
                      className="min-h-[44px] rounded-[18px] bg-[#7C3AED] px-3 text-[12px] font-black text-white active:scale-[0.98]"
                    >
                      Portföyü Aç
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="border-t border-[#EDE9FE] bg-[#FBFAFF] p-4 text-center">
                <MapPin className="mx-auto text-[#7C3AED]" size={26} />
                <p className="mt-2 text-[12px] font-black text-[#2E1065]">
                  Pinli gösterilecek konumlu portföy yok.
                </p>
                <p className="mt-1 text-[11px] font-bold leading-4 text-[#64748B]">
                  Portföy güncelleme ekranından harita konumu seçildiğinde
                  burada pin olarak görünür.
                </p>
              </div>
            )}

            {missingLocationCount > 0 && (
              <div className="border-t border-[#EDE9FE] bg-amber-50 px-3 py-2 text-center text-[11px] font-black leading-4 text-amber-700">
                {missingLocationCount} portföyde harita konumu yok. Güncelle
                ekranından konum seçilirse pinli haritada görünür.
              </div>
            )}
          </section>
        )}

        <section className="mt-3 space-y-2">
          <div className="flex items-center justify-between gap-3 px-1">
            <p className="min-w-0 text-[13px] font-black leading-4 text-[#64748B]">
              {filteredUnits.length} portföy listeleniyor
            </p>
            <button
              type="button"
              onClick={openCreateModal}
              disabled={!canAddUnit && user?.role !== "ADMIN"}
              className="inline-flex h-10 shrink-0 items-center gap-1 rounded-[18px] bg-[linear-gradient(135deg,#7C3AED_0%,#5B21B6_100%)] px-3 text-[12px] font-black text-white shadow-[0_10px_24px_rgba(124,58,237,0.24)] disabled:opacity-50"
            >
              <Plus size={17} /> Yeni Portföy
            </button>
          </div>

          {filteredUnits.length === 0 ? (
            <div className="rounded-[26px] border border-[#DDD6FE] bg-white p-6 text-center shadow-[0_14px_34px_rgba(15,23,42,0.05)]">
              <Building2 className="mx-auto text-[#7C3AED]" size={34} />
              <h2 className="mt-3 text-[20px] font-black">
                Portföy bulunamadı
              </h2>
              <p className="mt-2 text-[13px] font-bold leading-5 text-[#64748B]">
                Filtreleri temizleyin veya yeni portföy ekleyin.
              </p>
            </div>
          ) : (
            filteredUnits.map((unit, index) => (
              <CompactPortfolioCard
                key={unit.id}
                index={index}
                unit={unit}
                selected={mapSelectedUnitId === unit.id}
                deleting={deletingUnitId === unit.id}
                poolBusy={poolActionUnitId === unit.id}
                onOpen={() => router.push(`/portfoy/${unit.id}`)}
                onUpdate={() => openEditModal(unit)}
                onShare={() => handlePortfolioShare(unit)}
                onDelete={() => handleDeleteUnit(unit)}
                onSendToPool={() => handleSendToPool(unit)}
                onRemoveFromPool={() => handleRemoveFromPool(unit)}
                onWhatsappLocation={() => handleWhatsappLocation(unit)}
              />
            ))
          )}
        </section>

      </div>

      <PortfolioFilterCenter
        open={filterOpen}
        units={units}
        filters={portfolioFilters}
        resultCount={filteredUnits.length}
        onChange={setPortfolioFilters}
        onClose={() => setFilterOpen(false)}
      />

      <StokCreateModal
        open={showModal}
        onClose={closeModal}
        projects={projects}
        crmCustomers={crmCustomers}
        selectedProjectId={selectedProjectId}
        setSelectedProjectId={setSelectedProjectId}
        projectForm={projectForm}
        setProjectForm={setProjectForm}
        unitForm={unitForm}
        setUnitForm={setUnitForm}
        formError={formError}
        formSuccess={formSuccess}
        formSuccessMessage={formSuccessMessage}
        formWarningMessage={formWarningMessage}
        formLoading={formLoading}
        coverImage={coverImage}
        setCoverImage={setCoverImage}
        galleryImages={galleryImages}
        setGalleryImages={setGalleryImages}
        onSubmit={handleSubmit}
      />

      <PortfolioShareModal
        open={shareOpen}
        data={shareData}
        onClose={() => setShareOpen(false)}
      />
    </main>
  );
}

function MiniMetric({
  label,
  value,
  tone = "slate",
}: {
  label: string;
  value: string | number;
  tone?: "slate" | "green" | "blue" | "orange";
}) {
  const color =
    tone === "green"
      ? "text-emerald-600"
      : tone === "blue"
        ? "text-[#7C3AED]"
        : tone === "orange"
          ? "text-orange-600"
          : "text-[#2E1065]";

  return (
    <div className="border-r border-[#EDE9FE] px-1.5 py-2 last:border-r-0">
      <p className={`text-[15px] font-black leading-none ${color}`}>{value}</p>
      <p className="mt-1 text-[9px] font-black text-[#64748B]">{label}</p>
    </div>
  );
}

function getPortfolioTypeChip(unit: MapUnit) {
  const label = formatEnumLabel(unit.type).toLocaleUpperCase("tr-TR");

  if (label.includes("ARSA")) return "ARSA";
  if (label.includes("VİLLA") || label.includes("VILLA")) return "VİLLA";
  if (
    label.includes("DÜKKAN") ||
    label.includes("TİCAR") ||
    label.includes("MAĞAZA") ||
    label.includes("MAGAZA")
  )
    return "TİCARİ";
  if (label.includes("PROJE")) return "PROJE";

  return label.length > 16 ? "PORTFÖY" : label || "PORTFÖY";
}

function getPortfolioPrimarySpecs(unit: MapUnit) {
  const specs: string[] = [];

  if (unit.roomCount) specs.push(unit.roomCount);
  if (unit.area)
    specs.push(`${Number(unit.area).toLocaleString("tr-TR")} m²`);
  specs.push(formatFloorInfo(unit));

  return specs.slice(0, 3);
}

function getPortfolioHighlight(unit: MapUnit) {
  const text = [
    unit.type,
    unit.status,
    unit.roomCount,
    unit.description,
    unit.project?.name,
    unit.project?.address,
  ]
    .join(" ")
    .toLocaleLowerCase("tr-TR");

  if (text.includes("deniz")) return "Deniz Manzaralı";
  if (text.includes("havuz")) return "Yüzme Havuzu";
  if (text.includes("bahçe") || text.includes("bahce")) return "Geniş Bahçe";
  if (text.includes("otopark") || text.includes("garaj")) return "Otopark";
  if (text.includes("site")) return "Site İçerisinde";
  if (text.includes("yatırım") || text.includes("yatirim"))
    return "Yatırıma Uygun";

  return "Portföy Detayı";
}

type PortfolioVisualTheme = {
  frameGradient: string;
  frameShadow: string;
  transactionLabel: string;
  typeColor: string;
  typeSoft: string;
  typeBorder: string;
};

type PortfolioStatusTone = {
  label: string;
  borderColor: string;
  backgroundColor: string;
  color: string;
};

function normalizePortfolioVisualValue(value?: string | null) {
  return String(value || "")
    .toLocaleUpperCase("tr-TR")
    .replaceAll("İ", "I")
    .replaceAll("Ü", "U")
    .replaceAll("Ş", "S")
    .replaceAll("Ö", "O")
    .replaceAll("Ç", "C")
    .replaceAll("Ğ", "G");
}

function getPortfolioStatusTone(status?: string | null): PortfolioStatusTone {
  const normalized = normalizePortfolioVisualValue(status);
  const label = statusLabels[status || ""] || status || "Portföy";

  if (["KIRALIK", "GUNLUK_KIRALIK", "DEVREN_KIRALIK", "KIRALANDI"].includes(normalized)) {
    return {
      label,
      borderColor: "#B8C2D1",
      backgroundColor: "#F8FAFC",
      color: "#475569",
    };
  }

  if (["SATILIK", "DEVREN_SATILIK", "ON_SATIS", "YAKINDA_SATISTA", "HEMEN_TESLIM", "SATILDI"].includes(normalized)) {
    return {
      label,
      borderColor: "#E7C766",
      backgroundColor: "#FFF8DB",
      color: "#A16207",
    };
  }

  return {
    label,
    borderColor: "#DDD6FE",
    backgroundColor: "#F5F3FF",
    color: "#6D28D9",
  };
}

function getPortfolioVisualTheme(unit: MapUnit): PortfolioVisualTheme {
  const status = normalizePortfolioVisualValue(unit.status);
  const type = normalizePortfolioVisualValue(unit.type);
  const source = normalizePortfolioVisualValue(
    [unit.type, unit.project?.name, unit.description].filter(Boolean).join(" "),
  );

  const rentalStatuses = [
    "KIRALIK",
    "GUNLUK_KIRALIK",
    "DEVREN_KIRALIK",
    "KIRALANDI",
  ];
  const saleStatuses = [
    "SATILIK",
    "DEVREN_SATILIK",
    "ON_SATIS",
    "YAKINDA_SATISTA",
    "HEMEN_TESLIM",
    "SATILDI",
  ];

  let frameGradient =
    "linear-gradient(135deg,#5B21B6 0%,#C4B5FD 22%,#7C3AED 48%,#EDE9FE 70%,#4C1D95 100%)";
  let frameShadow = "0 14px 30px rgba(91,33,182,0.16)";
  let transactionLabel = "Portföy";

  if (rentalStatuses.includes(status)) {
    frameGradient =
      "linear-gradient(135deg,#64748B 0%,#F8FAFC 18%,#A8B3C5 42%,#FFFFFF 62%,#7C8798 100%)";
    frameShadow = "0 14px 30px rgba(100,116,139,0.22)";
    transactionLabel = "Gümüş Varak";
  } else if (saleStatuses.includes(status)) {
    frameGradient =
      "linear-gradient(135deg,#7A5A10 0%,#F9E7A4 18%,#B88922 42%,#FFF5C7 62%,#8A6617 100%)";
    frameShadow = "0 14px 32px rgba(184,137,34,0.24)";
    transactionLabel = "Altın Varak";
  }

  let typeColor = "#6D28D9";
  let typeSoft = "#F5F3FF";
  let typeBorder = "#DDD6FE";

  if (
    ["ARSA"].includes(type) ||
    source.includes(" ARSA") ||
    source.startsWith("ARSA")
  ) {
    typeColor = "#B45309";
    typeSoft = "#FFF7ED";
    typeBorder = "#FED7AA";
  } else if (
    ["TARLA", "BAG", "BAHCE", "ZEYTINLIK"].some((item) =>
      source.includes(item),
    )
  ) {
    typeColor = "#4D7C0F";
    typeSoft = "#F7FEE7";
    typeBorder = "#D9F99D";
  } else if (
    ["VILLA", "MUSTAKIL", "YALI", "KONAK"].some((item) =>
      source.includes(item),
    )
  ) {
    typeColor = "#047857";
    typeSoft = "#ECFDF5";
    typeBorder = "#A7F3D0";
  } else if (
    ["DUKKAN", "MAGAZA", "OFIS", "PLAZA", "SHOWROOM", "ISYERI"].some(
      (item) => source.includes(item),
    )
  ) {
    typeColor = "#0369A1";
    typeSoft = "#F0F9FF";
    typeBorder = "#BAE6FD";
  } else if (
    ["FABRIKA", "DEPO", "ATOLYE", "SANAYI", "ANTREPO"].some((item) =>
      source.includes(item),
    )
  ) {
    typeColor = "#475569";
    typeSoft = "#F1F5F9";
    typeBorder = "#CBD5E1";
  } else if (
    ["OTEL", "PANSIYON", "MOTEL", "TURISTIK"].some((item) =>
      source.includes(item),
    )
  ) {
    typeColor = "#BE123C";
    typeSoft = "#FFF1F2";
    typeBorder = "#FECDD3";
  } else if (
    ["DAIRE", "REZIDANS", "APART"].some((item) => source.includes(item))
  ) {
    typeColor = "#6D28D9";
    typeSoft = "#F5F3FF";
    typeBorder = "#DDD6FE";
  }

  return {
    frameGradient,
    frameShadow,
    transactionLabel,
    typeColor,
    typeSoft,
    typeBorder,
  };
}

function CompactPortfolioCard({
  index,
  unit,
  selected,
  deleting,
  poolBusy,
  onOpen,
  onUpdate,
  onShare,
  onDelete,
  onSendToPool,
  onRemoveFromPool,
  onWhatsappLocation,
}: {
  index: number;
  unit: MapUnit;
  selected: boolean;
  deleting: boolean;
  poolBusy: boolean;
  onOpen: () => void;
  onUpdate: () => void;
  onShare: () => void;
  onDelete: () => void;
  onSendToPool: () => void;
  onRemoveFromPool: () => void;
  onWhatsappLocation: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [favorite, setFavorite] = useState(false);

  const image = getUnitCoverImage(unit);
  const imageCount = getUnitImages(unit).length;
  const status = statusLabels[unit.status] || unit.status || "Portföy";
  const typeChip = getPortfolioTypeChip(unit);
  const specs = getPortfolioPrimarySpecs(unit);
  const highlight = getPortfolioHighlight(unit);
  const location =
    [unit.project?.city, unit.project?.district, unit.project?.address]
      .filter(Boolean)
      .join(" / ") || "Konum yok";
  const hasLocation = Boolean(
    Number(unit.project?.latitude) && Number(unit.project?.longitude),
  );
  const approvalStatus = String((unit as any).approvalStatus || "");
  const isPoolVisible = Boolean(
    (unit as any).isPoolVisible || approvalStatus === "HAVUZDA",
  );
  const canSendToPool = approvalStatus === "ONAYLANDI" && !isPoolVisible;
  const canRemoveFromPool = approvalStatus === "HAVUZDA" || isPoolVisible;
  const isVerified = isUnitVerified(unit);
  const text = [unit.type, unit.description, unit.project?.name]
    .join(" ")
    .toLocaleLowerCase("tr-TR");
  const isLand =
    typeChip.includes("ARSA") ||
    text.includes("arsa") ||
    text.includes("tarla") ||
    text.includes("bağ") ||
    text.includes("bag");
  const visualTheme = getPortfolioVisualTheme(unit);
  const statusTone = getPortfolioStatusTone(unit.status);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("eph-favorite-portfolios-v1");
      const ids = raw ? (JSON.parse(raw) as string[]) : [];
      setFavorite(ids.includes(String(unit.id)));
    } catch {
      setFavorite(false);
    }
  }, [unit.id]);

  useEffect(() => {
    if (selected) setExpanded(true);
  }, [selected]);

  const toggleFavorite = () => {
    setFavorite((current) => {
      const next = !current;

      try {
        const raw = window.localStorage.getItem("eph-favorite-portfolios-v1");
        const ids = raw ? (JSON.parse(raw) as string[]) : [];
        const nextIds = next
          ? Array.from(new Set([...ids, String(unit.id)]))
          : ids.filter((id) => id !== String(unit.id));

        window.localStorage.setItem(
          "eph-favorite-portfolios-v1",
          JSON.stringify(nextIds),
        );
      } catch {}

      return next;
    });
  };

  const quickSpecs = isLand
    ? [
        {
          icon: "□",
          label: unit.area
            ? `${Number(unit.area).toLocaleString("tr-TR")} m²`
            : "Alan",
        },
        {
          icon: "⌗",
          label:
            (unit as any).adaNo || (unit as any).parselNo
              ? "Ada / Parsel"
              : "Parsel Bilgisi",
        },
        {
          icon: "⌖",
          label: hasLocation ? "Konumlu" : "Konumsuz",
        },
        {
          icon: "✓",
          label: isVerified ? "Yetkili" : "Kontrol",
        },
      ]
    : [
        {
          icon: "▦",
          label: unit.roomCount || "Oda",
        },
        {
          icon: "↕",
          label: formatFloorInfo(unit),
        },
        {
          icon: "□",
          label: unit.area
            ? `${Number(unit.area).toLocaleString("tr-TR")} m²`
            : "Alan",
        },
        {
          icon: "✓",
          label: isVerified ? "Yetkili" : "Kontrol",
        },
      ];

  const detailSpecs = isLand
    ? [
        { label: "Durum", value: status },
        {
          label: "Ada / Parsel",
          value:
            [(unit as any).adaNo, (unit as any).parselNo]
              .filter(Boolean)
              .join(" / ") || "Belirtilmedi",
        },
        {
          label: "Tapu",
          value:
            unit.tapuVerified || unit.isVerified ? "Doğrulandı" : "Kontrol",
        },
        {
          label: "Fotoğraf",
          value: `${imageCount} adet`,
        },
        {
          label: "Havuz",
          value: isPoolVisible ? "Havuzda" : "Havuz Dışı",
        },
      ]
    : [
        { label: "Durum", value: status },
        { label: "Kat", value: formatFloorInfo(unit) },
        {
          label: "Tapu",
          value:
            unit.tapuVerified || unit.isVerified ? "Doğrulandı" : "Kontrol",
        },
        { label: "Fotoğraf", value: `${imageCount} adet` },
        {
          label: "Kredi",
          value: (unit as any).availableCreditAmount
            ? formatCompactPrice(
                (unit as any).availableCreditAmount,
                unit.priceCurrency,
              )
            : "Belirtilmedi",
        },
        {
          label: "Havuz",
          value: isPoolVisible ? "Havuzda" : "Havuz Dışı",
        },
      ];

  const summarySpecs = specs.slice(0, 3);
  const description = String(unit.description || "").trim();

  return (
    <article
      id={`portfolio-card-${unit.id}`}
      data-card-index={index}
      data-unit-id={unit.id}
      className={`relative scroll-mt-24 w-full max-w-full overflow-hidden rounded-[22px] border-[3px] border-transparent bg-white transition-all duration-300 ${
        selected ? "ring-4 ring-[#DDD6FE]" : ""
      }`}
      style={{
        background: `linear-gradient(#FFFFFF,#FFFFFF) padding-box, ${visualTheme.frameGradient} border-box`,
        boxShadow: `${visualTheme.frameShadow}, inset 6px 0 0 ${visualTheme.typeColor}`,
        fontFamily:
          '"Segoe UI Variable", "Segoe UI", Inter, ui-sans-serif, system-ui, sans-serif',
      }}
      title={`${visualTheme.transactionLabel} · ${typeChip}`}
    >
      <button
        type="button"
        onClick={() => setExpanded((current) => !current)}
        aria-expanded={expanded}
        className="block w-full text-left active:bg-[#FBFAFF]"
      >
        <div
          className="relative aspect-[16/10] min-h-[190px] w-full overflow-hidden bg-[#F3F0FF]"
          style={{ borderBottom: `2px solid ${visualTheme.typeBorder}` }}
        >
          {image ? (
            <>
              <img
                src={image}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 h-full w-full scale-110 object-cover object-center blur-xl opacity-55"
              />
              <img
                src={image}
                alt={unit.project?.name || "Portföy"}
                className="absolute inset-0 h-full w-full object-contain object-center"
              />
            </>
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[#7C3AED]">
              <Building2 size={42} />
            </div>
          )}

          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.08)_0%,transparent_45%,rgba(15,23,42,0.48)_100%)]" />

          <div className="absolute left-2.5 right-2.5 top-2.5 flex items-start justify-between gap-2">
            <span
              className={`rounded-full border border-white/80 px-2.5 py-1 text-[10px] font-extrabold text-white shadow-[0_6px_16px_rgba(15,23,42,0.22)] backdrop-blur-md ${
                isVerified ? "bg-emerald-600/90" : "bg-amber-500/90"
              }`}
            >
              {isVerified ? "EPH Onaylı" : "Onay Bekliyor"}
            </span>

            <span className="rounded-full border border-white/80 bg-slate-950/60 px-2.5 py-1 text-[10px] font-extrabold text-white shadow-[0_6px_16px_rgba(15,23,42,0.22)] backdrop-blur-md">
              {imageCount} Fotoğraf
            </span>
          </div>

          <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-end justify-between gap-2">
            <span
              className="rounded-full border-2 bg-white/95 px-3 py-1 text-[11px] font-extrabold shadow-md backdrop-blur-md"
              style={{
                borderColor: statusTone.borderColor,
                color: statusTone.color,
              }}
            >
              {statusTone.label}
            </span>

            <span
              className="rounded-full border-2 bg-white/95 px-3 py-1 text-[11px] font-extrabold shadow-md backdrop-blur-md"
              style={{
                borderColor: visualTheme.typeBorder,
                color: visualTheme.typeColor,
              }}
            >
              {status}
            </span>
          </div>
        </div>

        <div className="p-3.5">
          <div className="flex min-w-0 items-center gap-2">
            <p
              className="min-w-0 flex-1 truncate rounded-full border-2 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-[0.08em]"
              style={{
                backgroundColor: visualTheme.typeSoft,
                borderColor: visualTheme.typeBorder,
                color: visualTheme.typeColor,
              }}
            >
              {typeChip}
            </p>

            <span
              className={`shrink-0 rounded-full px-2.5 py-1 text-[10.5px] font-extrabold ${
                isPoolVisible
                  ? "bg-violet-50 text-violet-700"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {isPoolVisible ? "Havuzda" : "Havuz Dışı"}
            </span>

            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
              style={{
                backgroundColor: visualTheme.typeSoft,
                color: visualTheme.typeColor,
              }}
            >
              {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </span>
          </div>

          <h3 className="mt-2 line-clamp-2 min-w-0 break-words text-[17px] font-extrabold leading-[1.2] tracking-[-0.02em] text-[#111827] [overflow-wrap:anywhere]">
            {unit.project?.name || "EPH Portföy"}
          </h3>

          <p className="mt-2 flex min-w-0 items-start gap-1.5 text-[12px] font-semibold leading-4 text-[#64748B]">
            <MapPin size={15} className="mt-0.5 shrink-0" />
            <span className="min-w-0 line-clamp-2">{location}</span>
          </p>

          <div className="mt-2 flex min-w-0 items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-1.5">
              <span className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#64748B]">
                Durum
              </span>
              <span
                className="inline-flex min-h-[24px] items-center rounded-full border px-2.5 py-1 text-[10.5px] font-extrabold"
                style={{
                  borderColor: statusTone.borderColor,
                  backgroundColor: statusTone.backgroundColor,
                  color: statusTone.color,
                }}
              >
                {statusTone.label}
              </span>
            </div>

            <span
              className={`shrink-0 rounded-full px-2.5 py-1 text-[10.5px] font-extrabold ${
                isVerified
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-amber-50 text-amber-700"
              }`}
            >
              {isVerified ? "Yetkili" : "Kontrol"}
            </span>
          </div>

          <p className="mt-2.5 min-w-0 truncate text-[22px] font-extrabold leading-none tracking-[-0.035em] text-[#111827]">
            {formatCompactPrice(unit.price, unit.priceCurrency)}
          </p>

          <div className="mt-3 grid min-w-0 grid-cols-3 gap-1.5">
            {summarySpecs.map((spec) => (
              <span
                key={spec}
                className="flex min-h-[38px] min-w-0 items-center justify-center rounded-[11px] border-2 px-1.5 text-center text-[10px] font-extrabold leading-[1.15] [overflow-wrap:anywhere]"
                style={{
                  backgroundColor: visualTheme.typeSoft,
                  borderColor: visualTheme.typeBorder,
                  color: visualTheme.typeColor,
                }}
              >
                {spec}
              </span>
            ))}
          </div>
        </div>
      </button>

      <div className="grid grid-cols-4 gap-1.5 border-t border-[#EDE9FE] bg-[#FBFAFF] p-2">
        <button
          type="button"
          onClick={onOpen}
          className="flex min-h-[42px] items-center justify-center gap-1.5 rounded-[12px] bg-[#F5F3FF] px-1.5 text-[11px] font-extrabold text-[#6D28D9] active:scale-[0.98]"
        >
          <Eye size={15} />
          Aç
        </button>

        <button
          type="button"
          onClick={hasLocation ? onWhatsappLocation : onShare}
          className="flex min-h-[42px] items-center justify-center gap-1.5 rounded-[12px] bg-emerald-50 px-1.5 text-[11px] font-extrabold text-emerald-700 active:scale-[0.98]"
        >
          {hasLocation ? <Navigation size={15} /> : <Share2 size={15} />}
          {hasLocation ? "Konum" : "Paylaş"}
        </button>

        <button
          type="button"
          onClick={toggleFavorite}
          aria-pressed={favorite}
          className={`flex min-h-[42px] items-center justify-center gap-1.5 rounded-[12px] px-1.5 text-[11px] font-extrabold active:scale-[0.98] ${
            favorite
              ? "bg-rose-50 text-rose-600"
              : "bg-white text-[#64748B]"
          }`}
        >
          <Heart size={15} fill={favorite ? "currentColor" : "none"} />
          Favori
        </button>

        <button
          type="button"
          onClick={() => setMenuOpen((current) => !current)}
          aria-expanded={menuOpen}
          className="flex min-h-[42px] items-center justify-center gap-1.5 rounded-[12px] bg-white px-1.5 text-[11px] font-extrabold text-[#475569] active:scale-[0.98]"
        >
          <MoreVertical size={16} />
          Menü
        </button>
      </div>

      {menuOpen && (
        <div className="grid grid-cols-3 gap-2 border-t border-[#EDE9FE] bg-white p-2.5">
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              onUpdate();
            }}
            className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-[12px] bg-[#F5F3FF] px-2 text-[11.5px] font-extrabold text-[#6D28D9] active:scale-[0.98]"
          >
            <Edit3 size={15} />
            Güncelle
          </button>

          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              onShare();
            }}
            className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-[12px] bg-sky-50 px-2 text-[11.5px] font-extrabold text-sky-700 active:scale-[0.98]"
          >
            <Share2 size={15} />
            Paylaş
          </button>

          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              onDelete();
            }}
            disabled={deleting}
            className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-[12px] bg-red-50 px-2 text-[11.5px] font-extrabold text-red-600 disabled:opacity-50"
          >
            {deleting ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Trash2 size={15} />
            )}
            Sil
          </button>
        </div>
      )}

      {expanded && (
        <div className="border-t border-[#EDE9FE] bg-white p-3">
          <div className="grid grid-cols-4 gap-1.5">
            {quickSpecs.map((item) => (
              <div
                key={`${item.icon}-${item.label}`}
                className="flex min-h-[58px] min-w-0 flex-col items-center justify-center rounded-[12px] bg-[#F8FAFC] px-1.5 text-center"
              >
                <span
                  className="text-[14px] font-extrabold leading-none"
                  style={{ color: visualTheme.typeColor }}
                >
                  {item.icon}
                </span>
                <span className="mt-1.5 line-clamp-2 min-w-0 text-[10px] font-extrabold leading-[1.15] text-[#334155] [overflow-wrap:anywhere]">
                  {item.label}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-2 grid grid-cols-3 gap-1.5">
            {detailSpecs.map((item) => (
              <div
                key={item.label}
                className="flex min-h-[64px] min-w-0 flex-col items-center justify-center rounded-[12px] border border-[#EDE9FE] bg-[#FBFAFF] px-1.5 py-1.5 text-center"
              >
                <span className="text-[9px] font-extrabold uppercase tracking-[0.05em] text-[#64748B]">
                  {item.label}
                </span>
                <span className="mt-1 line-clamp-2 min-w-0 text-[10.5px] font-extrabold leading-[1.15] text-[#1F2937] [overflow-wrap:anywhere]">
                  {item.value}
                </span>
              </div>
            ))}
          </div>

          {description && (
            <p className="mt-2 rounded-[12px] bg-[#F8FAFC] px-3 py-2.5 text-[11.5px] font-semibold leading-[1.55] text-[#475569]">
              {description}
            </p>
          )}

          <div
            className="mt-2 flex min-h-[38px] items-center justify-center rounded-[12px] border px-3 text-center text-[11px] font-extrabold"
            style={{
              backgroundColor: visualTheme.typeSoft,
              borderColor: visualTheme.typeBorder,
              color: visualTheme.typeColor,
            }}
          >
            ✦ {highlight}
          </div>

          {(canSendToPool || canRemoveFromPool) && (
            <div className="mt-2.5">
              {canSendToPool ? (
                <button
                  type="button"
                  onClick={onSendToPool}
                  disabled={poolBusy}
                  className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-[13px] bg-emerald-600 px-3 text-[12px] font-extrabold text-white shadow-[0_8px_18px_rgba(5,150,105,0.16)] disabled:opacity-60"
                >
                  {poolBusy ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <Send size={15} />
                  )}
                  Havuza Gönder
                </button>
              ) : null}

              {canRemoveFromPool ? (
                <button
                  type="button"
                  onClick={onRemoveFromPool}
                  disabled={poolBusy}
                  className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-[13px] border border-amber-200 bg-amber-50 px-3 text-[12px] font-extrabold text-amber-800 disabled:opacity-60"
                >
                  {poolBusy ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <X size={15} />
                  )}
                  Havuzdan Kaldır
                </button>
              ) : null}
            </div>
          )}
        </div>
      )}
    </article>
  );
}

function PortfolioMap({
  units,
  selectedUnitId,
  showPins,
  onSelectUnit,
  onNavigateToCard,
}: {
  units: MapUnit[];
  selectedUnitId: string;
  showPins: boolean;
  onSelectUnit: (unitId: string) => void;
  onNavigateToCard: (unitId: string) => void;
}) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const googleMapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const infoWindowRef = useRef<any>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    let alive = true;

    setLoading(true);
    setError("");
    setMapReady(false);

    loadGoogleMapsScript()
      .then(() => {
        if (!alive || !window.google?.maps || !mapRef.current) return;

        const firstUnit = units[0];
        const center =
          firstUnit?.project?.latitude && firstUnit?.project?.longitude
            ? {
                lat: Number(firstUnit.project.latitude),
                lng: Number(firstUnit.project.longitude),
              }
            : DEFAULT_CENTER;

        googleMapRef.current = new window.google.maps.Map(mapRef.current, {
          center,
          zoom: 12,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          gestureHandling: "greedy",
        });

        setMapReady(true);
      })
      .catch((err: Error) => setError(err.message || "Harita yüklenemedi."))
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
      markersRef.current.forEach((marker) => marker.setMap?.(null));
      markersRef.current = [];
      infoWindowRef.current?.close?.();
      infoWindowRef.current = null;
      googleMapRef.current = null;
      setMapReady(false);
    };
  }, []);

  useEffect(() => {
    if (!mapReady || !googleMapRef.current || !window.google?.maps) return;

    markersRef.current.forEach((marker) => marker.setMap?.(null));
    markersRef.current = [];

    const bounds = new window.google.maps.LatLngBounds();

    units.forEach((unit) => {
      const lat = Number(unit.project?.latitude || 0);
      const lng = Number(unit.project?.longitude || 0);
      if (lat && lng) bounds.extend({ lat, lng });
    });

    if (!showPins) {
      if (!bounds.isEmpty()) googleMapRef.current.fitBounds(bounds, 56);
      return;
    }

    units.forEach((unit) => {
      const lat = Number(unit.project?.latitude || 0);
      const lng = Number(unit.project?.longitude || 0);

      if (!lat || !lng) return;

      const isSelected = selectedUnitId === unit.id;
      const svg = createEphMapPinSvg("#0D47A1", isSelected);
      const marker = new window.google.maps.Marker({
        position: { lat, lng },
        map: googleMapRef.current,
        title: `${unit.project?.name || "EPH Portföy"} • ${formatCompactPrice(
          unit.price,
          unit.priceCurrency,
        )}`,
        optimized: false,
        icon: {
          url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
          scaledSize: new window.google.maps.Size(
            isSelected ? 54 : 46,
            isSelected ? 66 : 57,
          ),
          anchor: new window.google.maps.Point(
            isSelected ? 27 : 23,
            isSelected ? 66 : 57,
          ),
        },
        zIndex: isSelected ? 40 : 20,
      });

      if (!infoWindowRef.current) {
        infoWindowRef.current = new window.google.maps.InfoWindow({
          disableAutoPan: true,
        });
      }

      const location =
        [unit.project?.city, unit.project?.district, unit.project?.address]
          .filter(Boolean)
          .join(" / ") || "Konum bilgisi yok";
      const infoHtml = `
        <div style="width:220px;padding:4px 2px;font-family:Arial,sans-serif;color:#0F172A">
          <div style="font-size:10px;font-weight:900;letter-spacing:.08em;color:#7C3AED;text-transform:uppercase">
            EPH Portföy
          </div>
          <div style="margin-top:4px;font-size:14px;font-weight:900;line-height:1.2">
            ${escapeMapHtml(unit.project?.name || "EPH Portföy")}
          </div>
          <div style="margin-top:5px;font-size:11px;font-weight:700;line-height:1.35;color:#64748B">
            ${escapeMapHtml(location)}
          </div>
          <div style="margin-top:7px;font-size:15px;font-weight:900;color:#2E1065">
            ${escapeMapHtml(formatCompactPrice(unit.price, unit.priceCurrency))}
          </div>
          <div style="margin-top:4px;font-size:10px;font-weight:800;color:#475569">
            ${escapeMapHtml(formatEnumLabel(unit.type))} • ${escapeMapHtml(
              statusLabels[unit.status] || unit.status || "Portföy",
            )}
          </div>
          <div style="margin-top:7px;border-top:1px solid #DCE8F7;padding-top:6px;font-size:10px;font-weight:900;color:#7C3AED">
            Kartı görmek için pine tıklayın
          </div>
        </div>
      `;

      marker.addListener("mouseover", () => {
        infoWindowRef.current?.setContent(infoHtml);
        infoWindowRef.current?.open(googleMapRef.current, marker);
      });

      marker.addListener("mouseout", () => {
        window.setTimeout(() => infoWindowRef.current?.close(), 120);
      });

      marker.addListener("click", () => {
        infoWindowRef.current?.close();
        onSelectUnit(unit.id);
        onNavigateToCard(unit.id);
      });

      markersRef.current.push(marker);
    });

    if (!bounds.isEmpty()) googleMapRef.current.fitBounds(bounds, 56);
  }, [
    mapReady,
    onNavigateToCard,
    onSelectUnit,
    selectedUnitId,
    showPins,
    units,
  ]);

  return (
    <div className="relative h-[360px] bg-[#F3F0FF]">
      <div ref={mapRef} className="h-full w-full" />
      {(loading || error) && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/76 backdrop-blur-sm">
          <div className="max-w-[260px] text-center">
            {loading && (
              <Loader2
                className="mx-auto animate-spin text-[#7C3AED]"
                size={28}
              />
            )}
            <p className="mt-2 text-[12px] font-black text-[#64748B]">
              {error || "Google Maps yükleniyor..."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function StokPage() {
  return (
    <Suspense fallback={null}>
      <StokPageInner />
    </Suspense>
  );
}


