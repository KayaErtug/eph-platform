"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Bell,
  Building2,
  ChevronDown,
  Edit3,
  Eye,
  Heart,
  Loader2,
  Map as MapIcon,
  MapPin,
  Navigation,
  Plus,
  Send,
  Search,
  Share2,
  Trash2,
  X,
} from "lucide-react";

import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import StokCreateModal from "@/components/stok/StokCreateModal";
import PortfolioShareModal from "@/components/portfolio/PortfolioShareModal";
import type { PortfolioShareData } from "@/components/portfolio/PortfolioShareCard";
import type {
  LocalPortfolioImage,
  Project,
  ProjectFormState,
  Unit,
  UnitFormState,
} from "@/components/stok/stokTypes";

type SortMode = "newest" | "priceDesc" | "priceAsc";
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

const hotStatuses = [
  "SATILIK",
  "KIRALIK",
  "GUNLUK_KIRALIK",
  "DEVREN_SATILIK",
  "DEVREN_KIRALIK",
  "ON_SATIS",
  "PROJE_ASAMASI",
  "YAKINDA_SATISTA",
  "INSAAT_PROJESI",
  "HEMEN_TESLIM",
];

const CURRENCY_SYMBOLS: Record<string, string> = {
  TRY: "₺",
  USD: "$",
  EUR: "€",
  GBP: "£",
};

const PORTFOLIO_CARD_STYLES = [
  {
    frame:
      "border-[#2563EB] bg-gradient-to-br from-white via-[#F8FBFF] to-[#EFF6FF] shadow-[0_16px_34px_rgba(37,99,235,0.16)]",
    imageBg: "bg-[#EFF6FF]",
    soft: "bg-[#F8FBFF]",
    strip: "bg-[#2563EB]",
  },
  {
    frame:
      "border-emerald-400 bg-gradient-to-br from-white via-[#F8FFFB] to-emerald-50 shadow-[0_16px_34px_rgba(16,185,129,0.15)]",
    imageBg: "bg-emerald-50",
    soft: "bg-[#F7FFFB]",
    strip: "bg-emerald-500",
  },
  {
    frame:
      "border-amber-400 bg-gradient-to-br from-white via-[#FFFDF7] to-amber-50 shadow-[0_16px_34px_rgba(245,158,11,0.16)]",
    imageBg: "bg-amber-50",
    soft: "bg-[#FFFDF7]",
    strip: "bg-amber-500",
  },
  {
    frame:
      "border-violet-400 bg-gradient-to-br from-white via-[#FBFAFF] to-violet-50 shadow-[0_16px_34px_rgba(139,92,246,0.14)]",
    imageBg: "bg-violet-50",
    soft: "bg-[#FBFAFF]",
    strip: "bg-violet-500",
  },
];

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

  if (numeric >= 1000000) {
    const compact = numeric / 1000000;
    return `${compact.toLocaleString("tr-TR", { maximumFractionDigits: compact >= 10 ? 0 : 1 })}M ${symbol}`;
  }

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

function getAuthorityDocuments(unit?: Unit | null) {
  return Array.isArray((unit as any)?.authorityDocuments)
    ? ((unit as any).authorityDocuments as any[])
    : [];
}

function hasAuthorityDocument(
  unit: Unit | null | undefined,
  authorityType: string,
  documentSide?: string,
) {
  return getAuthorityDocuments(unit).some((document) => {
    const typeMatch = String(document?.authorityType || "") === authorityType;
    const sideMatch = documentSide
      ? String(document?.documentSide || "").toLocaleUpperCase("tr-TR") === documentSide
      : true;
    return typeMatch && sideMatch;
  });
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
  const location = [unit.project?.district, unit.project?.city]
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
  const [statusFilter, setStatusFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [shareOpen, setShareOpen] = useState(false);
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

  const canAddUnit =
    user?.role === "MUTEAHHIT" ||
    user?.role === "INSAAT_FIRMASI" ||
    user?.role === "ADMIN" ||
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

  const filteredUnits = useMemo(() => {
    const q = search.trim().toLocaleLowerCase("tr-TR");

    let list = units.filter((unit) => {
      if (statusFilter && unit.status !== statusFilter) return false;
      if (cityFilter && unit.project?.city !== cityFilter) return false;
      if (!q) return true;

      const text = [
        unit.project?.name,
        unit.project?.city,
        unit.project?.district,
        unit.project?.address,
        unit.number,
        unit.type,
        unit.status,
        unit.roomCount,
        unit.description,
      ]
        .join(" ")
        .toLocaleLowerCase("tr-TR");

      return text.includes(q);
    });

    list = [...list].sort((a, b) => {
      if (sortMode === "priceDesc")
        return Number(b.price || 0) - Number(a.price || 0);
      if (sortMode === "priceAsc")
        return Number(a.price || 0) - Number(b.price || 0);
      return String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
    });

    return list;
  }, [cityFilter, search, sortMode, statusFilter, units]);

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

  const activeCount = useMemo(
    () => units.filter((unit) => hotStatuses.includes(unit.status)).length,
    [units],
  );
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
  const uniqueCities = useMemo(
    () =>
      Array.from(
        new Set(
          units
            .map((unit) => unit.project?.city)
            .filter((city): city is string => Boolean(city)),
        ),
      ).sort((a, b) => a.localeCompare(b, "tr")),
    [units],
  );


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
    resetSelectedImages();
  };

  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (unit: MapUnit) => {
    resetSelectedImages();
    const existingGalleryImages = makeExistingGalleryImages(unit);
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
      features: Array.isArray((unit as any).features)
        ? (unit as any).features
        : [],
      availableCreditAmount:
        (unit as any).availableCreditAmount != null
          ? String(Math.round(Number((unit as any).availableCreditAmount)))
          : "",
      doorAccessInfo: (unit as any).doorAccessInfo || "",
    } as UnitFormState);
    setFormError("");
    setFormSuccess(false);
    setShowModal(true);
  };

  const closeModal = () => {
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


  const uploadPortfolioDocument = async (
    unitId: string,
    file: File,
    authorityType: string,
    documentSide?: string,
  ) => {
    const payload = new FormData();
    payload.append("portfolioId", unitId);
    payload.append("authorityType", authorityType);
    if (documentSide) payload.append("documentSide", documentSide);
    payload.append("file", file);

    return api.post("/portfolio-documents/upload", payload, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  };

  const uploadPortfolioFormDocuments = async (unitId: string) => {
    const propertyDeedFile = (unitForm as any).propertyDeedFile as File | null | undefined;
    const deedOwnerIdFrontFile = (unitForm as any).deedOwnerIdFrontFile as File | null | undefined;
    const deedOwnerIdBackFile = (unitForm as any).deedOwnerIdBackFile as File | null | undefined;

    const uploads: Promise<unknown>[] = [];

    if (propertyDeedFile) {
      uploads.push(uploadPortfolioDocument(unitId, propertyDeedFile, "TAPU"));
    }

    if (deedOwnerIdFrontFile) {
      uploads.push(uploadPortfolioDocument(unitId, deedOwnerIdFrontFile, "TAPU_SAHIBI_KIMLIK", "FRONT"));
    }

    if (deedOwnerIdBackFile) {
      uploads.push(uploadPortfolioDocument(unitId, deedOwnerIdBackFile, "TAPU_SAHIBI_KIMLIK", "BACK"));
    }

    if (uploads.length > 0) await Promise.all(uploads);
  };

  const handleSubmit = async () => {
    setFormError("");
    setFormLoading(true);

    try {
      const numericPrice = parseFormattedNumber(unitForm.price);

      if (!unitForm.area || !numericPrice) {
        setFormError("Alan ve fiyat zorunludur.");
        setFormLoading(false);
        return;
      }

      const numericAvailableCreditAmount = parseFormattedNumber(
        String((unitForm as any).availableCreditAmount || ""),
      );

      const unitPayload = {
        type: unitForm.type,
        floor: unitForm.floor ? parseInt(unitForm.floor, 10) : undefined,
        floorLabel: unitForm.floorLabel || undefined,
        totalFloors: unitForm.totalFloors
          ? parseInt(unitForm.totalFloors, 10)
          : undefined,
        number: unitForm.number,
        adaNo: String((unitForm as any).adaNo || "").trim() || undefined,
        parselNo: String((unitForm as any).parselNo || "").trim() || undefined,
        roomCount: unitForm.roomCount || undefined,
        area: parseFloat(unitForm.area),
        price: numericPrice,
        priceCurrency: unitForm.priceCurrency || "TRY",
        status: unitForm.status,
        description: unitForm.description || undefined,
        deedOwnerFullName:
          String((unitForm as any).deedOwnerFullName || "").trim() || undefined,
        deedOwnerPhone:
          String((unitForm as any).deedOwnerPhone || "").trim() || undefined,
        deedOwnerEmail:
          String((unitForm as any).deedOwnerEmail || "").trim() || undefined,
        availableCreditAmount: numericAvailableCreditAmount || undefined,
        doorAccessInfo:
          String((unitForm as any).doorAccessInfo || "").trim() || undefined,
        features: Array.isArray((unitForm as any).features)
          ? (unitForm as any).features
          : [],
      };

      if (editingUnit) {
        await api.patch(`/units/${editingUnit.id}`, unitPayload);

        const selectedCoverImage = coverImage || galleryImages[0] || null;
        const newGalleryImages = galleryImages.filter((image) => image.file);
        const existingImageCount = galleryImages.filter((image) => image.existing).length;

        if (newGalleryImages.length > 0) {
          await Promise.all(
            newGalleryImages.map((image, index) =>
              uploadPortfolioImage(
                editingUnit.id,
                image.file!,
                image.id === selectedCoverImage?.id,
                existingImageCount + index,
              ),
            ),
          );
        }

        await uploadPortfolioFormDocuments(editingUnit.id);

        setFormSuccess(true);
        await fetchData();

        setTimeout(() => {
          closeModal();
        }, 500);
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
          setFormError("Proje bilgilerini eksiksiz doldurun.");
          setFormLoading(false);
          return;
        }

        const projectRes = await api.post("/projects", {
          ...(projectForm as any),
          latitude: (projectForm as any).latitude ?? null,
          longitude: (projectForm as any).longitude ?? null,
          mapAddress: (projectForm as any).mapAddress ?? null,
          placeId: (projectForm as any).placeId ?? null,
        });

        projectId = projectRes.data.id;
      }

      const selectedCoverImage = coverImage || galleryImages[0] || null;

      if (!selectedCoverImage || galleryImages.length === 0) {
        setFormError("En az 1 galeri fotoğrafı ekleyiniz.");
        setFormLoading(false);
        return;
      }

      const unitRes = await api.post(
        `/units/project/${projectId}`,
        unitPayload,
      );
      const createdUnitId = unitRes.data?.id;

      if (!createdUnitId) {
        setFormError(
          "Portföy oluşturuldu ancak görsel yükleme için unitId alınamadı.",
        );
        setFormLoading(false);
        return;
      }

      await Promise.all(
        galleryImages
          .filter((image) => image.file)
          .map((image, index) =>
            uploadPortfolioImage(
              createdUnitId,
              image.file!,
              image.id === selectedCoverImage.id,
              index,
            ),
          ),
      );

      await uploadPortfolioFormDocuments(createdUnitId);

      setFormSuccess(true);
      await fetchData();

      setTimeout(() => {
        closeModal();
      }, 700);
    } catch (e: any) {
      setFormError(e?.response?.data?.message || "Bir hata oluştu.");
    } finally {
      setFormLoading(false);
    }
  };

  const getPortfolioShareData = (unit: MapUnit): PortfolioShareData => {
    const title = unit.project?.name || "EPH Portföy";
    const location =
      [unit.project?.district, unit.project?.city]
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

  if (!hydrated || loading) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center overflow-y-auto bg-[#F7FBFF] text-[#06194A]">
        <div className="text-center">
          <Loader2 className="mx-auto animate-spin text-[#1557D6]" size={32} />
          <p className="mt-3 text-[12px] font-black text-[#64748B]">
            Portföy merkezi yükleniyor...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[100dvh] overflow-x-hidden overflow-y-auto bg-[#F7FBFF] pb-[calc(144px+env(safe-area-inset-bottom))] text-[#06194A]">
      <div className="mx-auto w-full max-w-[430px] overflow-x-hidden px-3 pt-3">
        <section className="rounded-[28px] border border-[#DDE7F3] bg-white p-3 shadow-[0_16px_38px_rgba(15,23,42,0.06)]">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-[#F8FBFF] text-[#06194A] active:scale-[0.98]"
              aria-label="Geri dön"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="text-center">
              <h1 className="text-[22px] font-black tracking-[-0.05em] text-[#06194A]">
                PORTFÖY
              </h1>
              <p className="text-[10px] font-bold text-[#64748B]">
                Harita + ultra compact liste
              </p>
            </div>
            <button
              type="button"
              onClick={() => router.push("/messages")}
              className="relative flex h-11 w-11 items-center justify-center rounded-[18px] bg-[#F8FBFF] text-[#06194A] active:scale-[0.98]"
              aria-label="Mesajlar"
            >
              <Bell size={20} />
              {unreadMessages > 0 && (
                <span className="absolute right-2 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-black text-white">
                  {unreadMessages > 99 ? "99+" : unreadMessages}
                </span>
              )}
            </button>
          </div>

          <div className="mt-3 grid grid-cols-[1fr_1fr_72px] gap-2">
            <select
              value={cityFilter}
              onChange={(event) => setCityFilter(event.target.value)}
              className="h-10 rounded-[16px] border border-[#DDE7F3] bg-white px-2 text-center text-[12px] font-black outline-none"
            >
              <option value="">Tüm Şehirler</option>
              {uniqueCities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="h-10 rounded-[16px] border border-[#DDE7F3] bg-white px-2 text-center text-[12px] font-black outline-none"
            >
              <option value="">Tümü</option>
              <option value="SATILIK">Satılık</option>
              <option value="KIRALIK">Kiralık</option>
            </select>
            <button
              type="button"
              onClick={() =>
                setSortMode((current) =>
                  current === "newest"
                    ? "priceDesc"
                    : current === "priceDesc"
                      ? "priceAsc"
                      : "newest",
                )
              }
              className="h-10 rounded-[16px] border border-[#DDE7F3] bg-white text-[12px] font-black"
            >
              Sırala
            </button>
          </div>

          <div className="mt-3 flex items-center gap-2 rounded-[18px] border border-[#DDE7F3] bg-[#F8FBFF] px-3 py-2">
            <Search size={17} className="text-[#64748B]" />
            <input
              ref={searchInputRef}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Portföy, şehir, ilçe ara..."
              className="h-8 min-w-0 flex-1 bg-transparent text-[13px] font-bold outline-none placeholder:text-[#94A3B8]"
            />
            {search && (
              <button type="button" onClick={() => setSearch("")}>
                <X size={16} />
              </button>
            )}
          </div>

          <div className="mt-3 grid grid-cols-4 overflow-hidden rounded-[18px] border border-[#E2EAF5] bg-white text-center">
            <MiniMetric label="Portföy" value={units.length} />
            <MiniMetric
              label="Ort. Fiyat"
              value={averageValue ? formatCompactPrice(averageValue) : "0"}
              tone="green"
            />
            <MiniMetric label="Satılık" value={saleCount} tone="blue" />
            <MiniMetric label="Kiralık" value={rentCount} tone="orange" />
          </div>

        <PortfolioDocumentCenterEntry
          totalCount={units.length}
          activeCount={activeCount}
          verifiedCount={units.filter((unit) => isUnitVerified(unit)).length}
          onOpen={() => {
  		window.location.href = "/portfoy/quality";
	}}
        />


        </section>

        <button
          type="button"
          onClick={() => setMapOpen((current) => !current)}
          className="mt-3 flex h-13 min-h-[52px] w-full items-center justify-between rounded-[22px] border border-[#DDE7F3] bg-white px-4 text-[14px] font-black shadow-[0_12px_28px_rgba(15,23,42,0.05)]"
        >
          <span className="inline-flex items-center gap-2">
            <MapIcon size={19} className="text-[#1557D6]" />{" "}
            {mapOpen ? "Haritayı Kapat" : "Haritayı Göster"}
          </span>
          <ChevronDown
            size={19}
            className={mapOpen ? "rotate-180 transition" : "transition"}
          />
        </button>

        {mapOpen && (
          <section className="mt-3 overflow-hidden rounded-[26px] border border-[#DDE7F3] bg-white shadow-[0_18px_42px_rgba(15,23,42,0.08)]">
            <PortfolioMap
              units={mapUnits}
              selectedUnitId={selectedMapUnit?.id || ""}
              showPins={showMapPins}
              onSelectUnit={(unitId) => setMapSelectedUnitId(unitId)}
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
                className="min-h-[34px] rounded-[14px] border border-[#DDE7F3] bg-[#F8FBFF] px-3 text-[11px] font-black text-[#1557D6] shadow-sm active:scale-[0.98]"
              >
                {showMapPins ? "Pinleri Gizle" : "Pinleri Göster"}
              </button>
              <span className="text-right">
                {missingLocationCount} konumsuz kayıt
              </span>
            </div>

            {selectedMapUnit ? (
              <div className="border-t border-[#E2EAF5] bg-[#F8FBFF] p-3">
                <div className="rounded-[22px] border border-[#DDE7F3] bg-white p-3 text-center shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
                  <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-[16px] bg-[#EAF2FF] text-[#1557D6]">
                    <MapPin size={19} />
                  </div>
                  <h3 className="text-[14px] font-black leading-5 text-[#06194A]">
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

                  <div className="mt-3 grid grid-cols-3 overflow-hidden rounded-[18px] border border-[#E2EAF5] bg-[#F8FBFF]">
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
                      className="min-h-[44px] rounded-[18px] bg-[#1557D6] px-3 text-[12px] font-black text-white active:scale-[0.98]"
                    >
                      Portföyü Aç
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="border-t border-[#E2EAF5] bg-[#F8FBFF] p-4 text-center">
                <MapPin className="mx-auto text-[#1557D6]" size={26} />
                <p className="mt-2 text-[12px] font-black text-[#06194A]">
                  Pinli gösterilecek konumlu portföy yok.
                </p>
                <p className="mt-1 text-[11px] font-bold leading-4 text-[#64748B]">
                  Portföy güncelleme ekranından harita konumu seçildiğinde
                  burada pin olarak görünür.
                </p>
              </div>
            )}

            {missingLocationCount > 0 && (
              <div className="border-t border-[#E2EAF5] bg-amber-50 px-3 py-2 text-center text-[11px] font-black leading-4 text-amber-700">
                {missingLocationCount} portföyde harita konumu yok. Güncelle
                ekranından konum seçilirse pinli haritada görünür.
              </div>
            )}
          </section>
        )}

        <section className="mt-4 space-y-4">
          <div className="flex items-center justify-between px-1">
            <p className="text-[13px] font-black text-[#64748B]">
              {filteredUnits.length} portföy listeleniyor
            </p>
            <button
              type="button"
              onClick={openCreateModal}
              disabled={!canAddUnit}
              className="inline-flex h-10 items-center gap-1 rounded-[18px] bg-[#1557D6] px-3 text-[12px] font-black text-white disabled:opacity-50"
            >
              <Plus size={17} /> Yeni Portföy
            </button>
          </div>

          {filteredUnits.length === 0 ? (
            <div className="rounded-[26px] border border-[#DDE7F3] bg-white p-6 text-center shadow-[0_14px_34px_rgba(15,23,42,0.05)]">
              <Building2 className="mx-auto text-[#1557D6]" size={34} />
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

      <button
        type="button"
        onClick={openCreateModal}
        className="fixed bottom-[86px] right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#1557D6] text-white shadow-[0_18px_38px_rgba(21,87,214,0.34)]"
      >
        <Plus size={28} />
      </button>

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
        formLoading={formLoading}
        coverImage={coverImage}
        setCoverImage={setCoverImage}
        galleryImages={galleryImages}
        setGalleryImages={setGalleryImages}
        existingDocumentStatus={{
          propertyDeed: hasAuthorityDocument(editingUnit, "TAPU") || Boolean(editingUnit?.tapuVerified),
          deedOwnerIdFront: hasAuthorityDocument(editingUnit, "TAPU_SAHIBI_KIMLIK", "FRONT"),
          deedOwnerIdBack: hasAuthorityDocument(editingUnit, "TAPU_SAHIBI_KIMLIK", "BACK"),
        }}
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
        ? "text-[#1557D6]"
        : tone === "orange"
          ? "text-orange-600"
          : "text-[#06194A]";

  return (
    <div className="border-r border-[#E2EAF5] px-1.5 py-2 last:border-r-0">
      <p className={`text-[15px] font-black leading-none ${color}`}>{value}</p>
      <p className="mt-1 text-[9px] font-black text-[#64748B]">{label}</p>
    </div>
  );
}

function PortfolioDocumentCenterEntry({
  totalCount,
  activeCount,
  verifiedCount,
  onOpen,
}: {
  totalCount: number;
  activeCount: number;
  verifiedCount: number;
  onOpen: () => void;
}) {
  const waitingCount = Math.max(0, totalCount - verifiedCount);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="mt-3 w-full rounded-[24px] border border-[#C7D6E8] bg-gradient-to-br from-white via-[#F8FBFF] to-[#EFF6FF] p-3 text-center shadow-[0_14px_32px_rgba(37,99,235,0.12)] active:scale-[0.99]"
    >
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-[18px] bg-[#1557D6] text-white shadow-[0_10px_22px_rgba(21,87,214,0.24)]">
        <Building2 size={23} />
      </div>

      <h2 className="mt-2 text-[17px] font-black tracking-[-0.03em] text-[#06194A]">
        Belge Yükleme Merkezi
      </h2>
      <p className="mx-auto mt-1 max-w-[320px] text-[11px] font-bold leading-[1.45] text-[#64748B]">
        Yetki belgesi, tapu ve portföy evraklarını tek merkezden yükle, yenile ve incelemeye hazırla.
      </p>

      <div className="mt-3 grid grid-cols-3 overflow-hidden rounded-[18px] border border-[#DDE7F3] bg-white">
        <MiniMetric label="Toplam" value={totalCount} />
        <MiniMetric label="Aktif" value={activeCount} tone="blue" />
        <MiniMetric label="Bekleyen" value={waitingCount} tone="orange" />
      </div>

      <div className="mt-3 flex min-h-[42px] items-center justify-center rounded-[16px] bg-[#1557D6] px-4 text-[13px] font-black text-white shadow-[0_10px_22px_rgba(21,87,214,0.22)]">
        Belge Merkezini Aç
      </div>
    </button>
  );
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
  const image = getUnitCoverImage(unit) || "/LOGO_EPH.png";
  const status = statusLabels[unit.status] || unit.status || "Portföy";
  const location =
    [unit.project?.address, unit.project?.district]
      .filter(Boolean)
      .join(" · ") ||
    unit.project?.city ||
    "Konum yok";
  const hasLocation = Boolean(
    unit.project?.latitude && unit.project?.longitude,
  );
  const approvalStatus = String((unit as any).approvalStatus || "");
  const isPoolVisible = Boolean((unit as any).isPoolVisible);
  const canSendToPool = approvalStatus === "ONAYLANDI" && !isPoolVisible;
  const canRemoveFromPool = approvalStatus === "HAVUZDA" || isPoolVisible;
  const cardStyle = PORTFOLIO_CARD_STYLES[index % PORTFOLIO_CARD_STYLES.length];

  return (
    <article
      className={`relative grid min-h-[112px] w-full max-w-full grid-cols-[82px_minmax(0,1fr)_34px] gap-2 overflow-hidden rounded-[26px] border-[3px] p-2 ${selected ? "border-[#1557D6] ring-4 ring-blue-100" : cardStyle.frame}`}
    >
      <div className={`absolute inset-x-0 top-0 h-1.5 ${cardStyle.strip}`} />
      <button
        type="button"
        onClick={onOpen}
        className={`relative h-[96px] overflow-hidden rounded-[18px] ${cardStyle.imageBg}`}
      >
        <img
          src={image}
          alt={unit.project?.name || "Portföy"}
          className="h-full w-full object-cover"
        />
        <span
          className={`absolute left-1.5 top-1.5 rounded-full px-2 py-0.5 text-[8.5px] font-black text-white ${unit.status === "KIRALIK" ? "bg-[#1557D6]" : "bg-emerald-600"}`}
        >
          {status}
        </span>
        <span className="absolute bottom-1.5 right-1.5 rounded-full bg-black/62 px-1.5 py-0.5 text-[9px] font-black text-white">
          📷 {getUnitImages(unit).length}
        </span>
      </button>

      <button type="button" onClick={onOpen} className="min-w-0 text-center">
        <div className="flex items-start justify-center gap-2 text-center">
          <div className="min-w-0 flex-1 text-center">
            <h2 className="break-words text-center text-[15px] font-black leading-[18px] tracking-[-0.03em] text-[#06194A]">
              {unit.project?.name || "EPH Portföy"}
            </h2>
            <p className="mt-0.5 break-words text-center text-[11px] font-bold leading-4 text-[#64748B]">
              {location}
            </p>
          </div>
          <Heart size={18} className="shrink-0 text-[#94A3B8]" />
        </div>

        <div className="mt-1 flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 text-center text-[11px] font-black text-[#06194A]">
          {unit.roomCount && <span>{unit.roomCount}</span>}
          {unit.area && <span>{unit.area} m²</span>}
          <span>{formatFloorInfo(unit)}</span>
        </div>

        <div className="mt-1 flex flex-wrap items-center justify-center gap-2 text-center">
          <p
            className={`text-[15px] font-black ${unit.status === "KIRALIK" ? "text-[#1557D6]" : "text-emerald-600"}`}
          >
            {formatPrice(unit.price, unit.priceCurrency)}
          </p>
          {isUnitVerified(unit) && (
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-black text-emerald-700">
              Yetkili
            </span>
          )}
        </div>


        {(unit as any).availableCreditAmount ? (
          <div className="mt-1 rounded-[12px] border border-blue-100 bg-[#EFF6FF] px-2 py-1 text-center">
            <p className="text-[8.5px] font-black uppercase tracking-[0.08em] text-[#1557D6]">
              Kullanılabilir Kredi
            </p>
            <p className="mt-0.5 break-words text-[11px] font-black leading-tight text-[#06194A]">
              {formatPrice(
                (unit as any).availableCreditAmount,
                unit.priceCurrency,
              )}
            </p>
          </div>
        ) : null}

        <div className="mt-1 flex flex-wrap items-center justify-center gap-2 text-center text-[10px] font-bold text-[#64748B]">
          <span className="inline-flex items-center gap-1">
            <Eye size={12} /> Aç
          </span>
          <span className="inline-flex items-center gap-1">
            <Edit3 size={12} /> Güncelle
          </span>
          {hasLocation && (
            <span className="inline-flex items-center gap-1 text-emerald-700">
              <MapPin size={12} /> Konumlu
            </span>
          )}
        </div>
      </button>

      <div className="flex flex-col items-center justify-between gap-1">
        <button
          type="button"
          onClick={onOpen}
          className="flex h-7 w-7 items-center justify-center rounded-full bg-[#EFF6FF] text-[#1557D6]"
        >
          <Eye size={15} />
        </button>
        <button
          type="button"
          onClick={onUpdate}
          className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-50 text-[#1557D6]"
        >
          <Edit3 size={15} />
        </button>
        <button
          type="button"
          onClick={hasLocation ? onWhatsappLocation : onShare}
          className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-50 text-emerald-700"
        >
          {hasLocation ? <Navigation size={15} /> : <Share2 size={15} />}
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={deleting}
          className="flex h-7 w-7 items-center justify-center rounded-full bg-red-50 text-red-600 disabled:opacity-50"
        >
          {deleting ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Trash2 size={14} />
          )}
        </button>
      </div>
      {(canSendToPool || canRemoveFromPool) && (
        <div className="col-span-3 grid grid-cols-1 gap-1.5 border-t border-[#E7EEF8] pt-2">
          {canSendToPool ? (
            <button
              type="button"
              onClick={onSendToPool}
              disabled={poolBusy}
              className="flex min-h-[38px] items-center justify-center gap-2 rounded-[16px] bg-emerald-600 px-3 text-[11px] font-black text-white shadow-[0_10px_22px_rgba(5,150,105,0.18)] disabled:opacity-60"
            >
              {poolBusy ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Send size={14} />
              )}
              Havuza Gönder
            </button>
          ) : null}

          {canRemoveFromPool ? (
            <button
              type="button"
              onClick={onRemoveFromPool}
              disabled={poolBusy}
              className="flex min-h-[38px] items-center justify-center gap-2 rounded-[16px] border border-amber-200 bg-amber-50 px-3 text-[11px] font-black text-amber-800 disabled:opacity-60"
            >
              {poolBusy ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <X size={14} />
              )}
              Havuzdan Kaldır
            </button>
          ) : null}
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
}: {
  units: MapUnit[];
  selectedUnitId: string;
  showPins: boolean;
  onSelectUnit: (unitId: string) => void;
}) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const googleMapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
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
      const fill = isSelected ? "#0B3FB3" : "#1557D6";
      const svg = `
        <svg width="48" height="58" viewBox="0 0 48 58" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M24 56C24 56 43 35.6 43 20.5C43 9.73 34.49 1 24 1C13.51 1 5 9.73 5 20.5C5 35.6 24 56 24 56Z" fill="${fill}" stroke="white" stroke-width="3"/>
          <circle cx="24" cy="21" r="12.5" fill="white"/>
          <path d="M15.8 22.2L24 15.5L32.2 22.2" stroke="#1557D6" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M18.6 21.4V30.2H29.4V21.4" stroke="#1557D6" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M22 30.2V25.2H26V30.2" stroke="#1557D6" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      `;

      const marker = new window.google.maps.Marker({
        position: { lat, lng },
        map: googleMapRef.current,
        title: unit.project?.name || "EPH Portföy",
        icon: {
          url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
          scaledSize: new window.google.maps.Size(
            isSelected ? 52 : 44,
            isSelected ? 62 : 54,
          ),
          anchor: new window.google.maps.Point(
            isSelected ? 26 : 22,
            isSelected ? 62 : 54,
          ),
        },
        zIndex: isSelected ? 30 : 20,
      });

      marker.addListener("click", () => onSelectUnit(unit.id));
      markersRef.current.push(marker);
    });

    if (!bounds.isEmpty()) googleMapRef.current.fitBounds(bounds, 56);
  }, [mapReady, onSelectUnit, selectedUnitId, showPins, units]);

  return (
    <div className="relative h-[360px] bg-[#EEF5FF]">
      <div ref={mapRef} className="h-full w-full" />
      {(loading || error) && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/76 backdrop-blur-sm">
          <div className="max-w-[260px] text-center">
            {loading && (
              <Loader2
                className="mx-auto animate-spin text-[#1557D6]"
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
