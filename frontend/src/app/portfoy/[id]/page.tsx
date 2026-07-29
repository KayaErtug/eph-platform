"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type TouchEvent,
} from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  Camera,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  CircleUserRound,
  Loader2,
  Copy,
  Edit3,
  ExternalLink,
  FileText,
  BedDouble,
  Car,
  Flame,
  Factory,
  Home,
  Image as ImageIcon,
  Landmark,
  MapPin,
  Maximize2,
  MessageCircle,
  RotateCcw,
  Ruler,
  Star,
  Truck,
  Utensils,
  Waves,
  Zap,
  Send,
  Share2,
  ShieldCheck,
  Trash2,
  Upload,
  X,
  XCircle,
} from "lucide-react";

import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import {
  STATUS_COLORS,
  STATUS_LABELS,
  TYPE_LABELS,
} from "@/components/stok/stokConstants";
import type {
  PortfolioAuthorityDocument,
  PortfolioAuthorityType,
  Unit,
} from "@/components/stok/stokTypes";
import PortfolioShareModal from "@/components/portfolio/PortfolioShareModal";
import EphAuthorityLetterModal from "@/components/authority-letters/EphAuthorityLetterModal";
import type { PortfolioShareData } from "@/components/portfolio/PortfolioShareCard";
import LinaDocumentPrecheckPanel from "@/components/lina/LinaDocumentPrecheckPanel";
import { decodePortfolioMetadataState } from "@/components/stok/portfolioFeatureMetadata";

type DetailUnit = Unit & {
  createdAt?: string;
  updatedAt?: string;
  project?: Unit["project"] & {
    owner?: {
      firstName?: string;
      lastName?: string;
      role?: string;
    };
  };
};

type DetailImage = NonNullable<DetailUnit["images"]>[number] & {
  displayUrl: string;
};

const MAX_GALLERY_COUNT = 15;
const DOCUMENT_LABELS: Record<PortfolioAuthorityType, string> = {
  YETKI_BELGESI: "Yetki Belgesi",
  TAPU: "Tapu",
  TAPU_SAHIBI_KIMLIK: "Tapu Sahibi Kimlik Belgesi",
  KAT_KARSILIGI_SOZLESMESI: "Kat Karşılığı Sözleşmesi",
  DIGER_DOGRULAMA_EVRAKI: "Diğer Evrak",
};

const DOCUMENT_ACCEPT = "application/pdf,image/jpeg,image/png,image/webp";
const DOCUMENT_REJECT_PREFIX = "[BELGE_REDDEDILDI]";
const DOCUMENT_REUPLOAD_PREFIX = "[YENIDEN_BELGE_ISTENDI]";

type DocumentReviewAction = "APPROVE" | "REJECT" | "REQUEST_REUPLOAD";

type DocumentReviewDialogState = {
  document: PortfolioAuthorityDocument;
  label: string;
  action: DocumentReviewAction;
};

type DocumentReviewState =
  | "MISSING"
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "REUPLOAD_REQUESTED";


const FEATURE_LABELS: Record<string, string> = {
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
  SOMINE: " ?ömine",
  KLIMA: "Klima",
  ISI_YALITIMI: "Isı Yalıtımı",
  SES_YALITIMI: "Ses Yalıtımı",
  DENIZ_MANZARASI: "Deniz Manzarası",
  DOGA_MANZARASI: "Doğa Manzarası",
  SEHIR_MANZARASI: " ?ehir Manzarası",
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

function getFeatureLabels(features?: string[] | null) {
  if (!Array.isArray(features)) return [];

  return features
    .filter((feature) => !String(feature || "").startsWith("__EPH_META__:"))
    .map((feature) => FEATURE_LABELS[feature] || feature)
    .filter(Boolean);
}

function unitHasFeature(unit: DetailUnit, codes: string[]) {
  const features = Array.isArray((unit as any)?.features)
    ? ((unit as any).features as string[])
    : [];

  return codes.some((code) => features.includes(code));
}


const CURRENCY_SYMBOLS: Record<string, string> = {
  TRY: "₺",
  USD: "$",
  EUR: "€",
  GBP: "£",
};

function getUnitImages(unit?: DetailUnit | null) {
  const images = Array.isArray(unit?.images) ? unit.images : [];

  return images
    .filter((image) => image?.url || image?.supabaseUrl)
    .map((image) => ({
      ...image,
      displayUrl: image.supabaseUrl || image.url || "",
    }))
    .sort((a, b) => {
      if (a.isCover !== b.isCover) return a.isCover ? -1 : 1;
      if ((a.sortOrder || 0) !== (b.sortOrder || 0)) {
        return (a.sortOrder || 0) - (b.sortOrder || 0);
      }
      return String(a.createdAt || "").localeCompare(String(b.createdAt || ""));
    });
}

function getUnitCoverImage(unit?: DetailUnit | null) {
  const images = getUnitImages(unit);
  return (
    images.find((image) => image.isCover)?.displayUrl ||
    images[0]?.displayUrl ||
    ""
  );
}

function formatMoney(value?: number, currency?: string) {
  const numeric = Number(value || 0);
  if (!numeric) return "Fiyat belirtilmedi";
  const symbol = CURRENCY_SYMBOLS[currency || "TRY"] || "₺";
  return `${numeric.toLocaleString("tr-TR")} ${symbol}`;
}

function formatFloorInfo(
  unit?: Pick<DetailUnit, "floor" | "floorLabel" | "totalFloors"> | null,
) {
  if (!unit) return "Kat bilgisi yok";
  const floorText =
    unit.floorLabel ||
    (unit.floor != null ? `${unit.floor}. Kat` : "Kat bilgisi yok");
  const totalText = unit.totalFloors ? `${unit.totalFloors} Katlı` : "";
  return totalText ? `${floorText} / ${totalText}` : floorText;
}

function formatDate(value?: string) {
  if (!value) return "Tarih yok";
  return new Date(value).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function statusStyle(status?: string) {
  return (
    STATUS_COLORS[status || ""] || {
      color: "#1557D6",
      bg: "#EFF6FF",
      border: "#DBEAFE",
      dot: "#1557D6",
    }
  );
}

function statusLabel(status?: string) {
  return STATUS_LABELS[status || ""] || status || "Durum yok";
}

function typeLabel(type?: string) {
  return TYPE_LABELS[type || ""] || type || "Mülk tipi yok";
}

function normalizeDetailType(value?: string) {
  return String(value || "")
    .toLocaleUpperCase("tr-TR")
    .replaceAll("İ", "I")
    .replaceAll(" ?", "G")
    .replaceAll("Ü", "U")
    .replaceAll(" ?", "S")
    .replaceAll("Ö", "O")
    .replaceAll("Ç", "C");
}

function detailTypeHasKeyword(type: string | undefined, keywords: string[]) {
  const value = normalizeDetailType(type);
  return keywords.some((keyword) => value.includes(keyword));
}

function isLandDetailType(type?: string) {
  const value = normalizeDetailType(type);
  return (
    ["ARSA", "TARLA", "BAG", "BAHCE", "ZEYTINLIK"].includes(value) ||
    value.includes("ARSA")
  );
}

function isIndustrialDetailType(type?: string) {
  return detailTypeHasKeyword(type, [
    "FABRIKA",
    "ATOLYE",
    "URETIM",
    "SANAYI",
    "DEPO",
    "ANTREPO",
    "LOJISTIK",
  ]);
}

function isTouristicDetailType(type?: string) {
  return detailTypeHasKeyword(type, [
    "OTEL",
    "PANSIYON",
    "MOTEL",
    "TURISTIK",
    "TATIL",
    "KAMP",
  ]);
}

function isCommercialDetailType(type?: string) {
  return detailTypeHasKeyword(type, [
    "DUKKAN",
    "MAGAZA",
    "OFIS",
    "BURO",
    "PLAZA",
    "SHOWROOM",
    "RESTAURANT",
    "RESTORAN",
    "KAFE",
    "HOME_OFFICE",
  ]);
}

function getDetailValue(unit: DetailUnit, keys: string[], fallback = "—") {
  const source = unit as any;
  const storedFeatures = Array.isArray(source?.features)
    ? (source.features as string[])
    : [];
  const metadata = decodePortfolioMetadataState(storedFeatures) as Record<
    string,
    unknown
  >;

  for (const key of keys) {
    const directValue = source?.[key];

    if (
      directValue !== undefined &&
      directValue !== null &&
      String(directValue).trim() !== ""
    ) {
      return String(directValue);
    }

    const metadataValue = metadata?.[key];

    if (
      metadataValue !== undefined &&
      metadataValue !== null &&
      String(metadataValue).trim() !== ""
    ) {
      return String(metadataValue);
    }
  }

  return fallback;
}

function formatAdaParselValue(unit?: DetailUnit | null) {
  const adaNo = String((unit as any)?.adaNo || "").trim();
  const parselNo = String((unit as any)?.parselNo || "").trim();
  const legacyNumber = String((unit as any)?.number || "").trim();

  if (adaNo && parselNo) return `${adaNo} / ${parselNo}`;
  if (adaNo) return `Ada ${adaNo}`;
  if (parselNo) return `Parsel ${parselNo}`;
  if (legacyNumber) return legacyNumber;

  return "—";
}

function formatAreaValue(value?: number | string | null, fallback = "—") {
  const numeric = Number(value || 0);
  if (!numeric) return fallback;
  return `${numeric.toLocaleString("tr-TR")} m²`;
}

function getAuthorityKind(unit: DetailUnit, documents: PortfolioAuthorityDocument[]) {
  const approvedDocument = documents.find((document) => document.approved) || documents[0];

  if (approvedDocument?.authorityType === "YETKI_BELGESI") return "Yetki Belgesi";
  if (approvedDocument?.authorityType === "TAPU") return "Tapu Sahibi";
  if (approvedDocument?.authorityType === "TAPU_SAHIBI_KIMLIK") return "Kimlik Evrakı";
  if (approvedDocument?.authorityType === "KAT_KARSILIGI_SOZLESMESI") return "Kat Karşılığı";
  if (approvedDocument?.authorityType === "DIGER_DOGRULAMA_EVRAKI") return "Diğer Evrak";

  if (unit.yetkiVerified || unit.isVerified) return "Yetki Belgesi";
  if (unit.tapuVerified) return "Tapu Sahibi";

  return "Kontrol";
}

type PrimaryInfoBox = {
  icon: ReactNode;
  label: string;
  value: string;
};

function isDisplayableDetailValue(value?: string | number | null) {
  const normalized = String(value ?? "").trim();

  if (!normalized) return false;

  const blockedValues = [
    "—",
    "-",
    "Eklenmedi",
    "Kontrol",
    "Belirsiz",
    "Bilgi yok",
    "Bilgi girilmedi",
    "Kat bilgisi yok",
  ];

  return !blockedValues.some(
    (blocked) =>
      normalized.toLocaleLowerCase("tr-TR") ===
      blocked.toLocaleLowerCase("tr-TR"),
  );
}

function cleanInfoBoxes(items: PrimaryInfoBox[]) {
  return items.filter((item) => isDisplayableDetailValue(item.value));
}

function getAuthorityDisplayValue(
  unit: DetailUnit,
  verified: boolean,
  documents: PortfolioAuthorityDocument[],
) {
  if (!verified && !documents.length) return "";
  const authorityKind = getAuthorityKind(unit, documents);
  return isDisplayableDetailValue(authorityKind) ? authorityKind : "";
}

function getPrimaryInfoBoxes(
  unit: DetailUnit,
  verified: boolean,
  documents: PortfolioAuthorityDocument[],
) {
  const authorityValue = getAuthorityDisplayValue(unit, verified, documents);
  const heatingValue = getDetailValue(unit, ["heating", "heatingType", "isinma", "heatingSystem"], "");
  const parkingValue = getDetailValue(unit, ["parking", "parkingType", "otopark"], "");
  const buildingAgeValue = getDetailValue(unit, ["buildingAge", "buildingAgeLabel", "age"], "");
  const totalFloorsValue = unit.totalFloors ? `${unit.totalFloors} Kat` : "";
  const floorValue = unit.floorLabel || (unit.floor != null ? `${unit.floor}. Kat` : "");

  if (isIndustrialDetailType(unit.type)) {
    return cleanInfoBoxes([
      { icon: <Factory size={18} />, label: "Kapalı Alan", value: formatAreaValue(unit.area, "") },
      { icon: <Ruler size={18} />, label: "Açık Alan", value: getDetailValue(unit, ["openArea"], "") },
      { icon: <Factory size={18} />, label: "Üretim", value: getDetailValue(unit, ["productionArea", "usageType"], "") },
      { icon: <Zap size={18} />, label: "Trafo", value: getDetailValue(unit, ["transformerPower", "electricPower"], "") },
      { icon: <Truck size={18} />, label: "Yükleme", value: getDetailValue(unit, ["loadingArea", "truckEntrance"], "") },
      { icon: <Building2 size={18} />, label: "Tavan", value: getDetailValue(unit, ["ceilingHeight"], "") },
      { icon: <Flame size={18} />, label: "Isıtma", value: heatingValue },
      { icon: <ShieldCheck size={18} />, label: "Yetki Türü", value: authorityValue },
    ]);
  }

  if (isTouristicDetailType(unit.type)) {
    return cleanInfoBoxes([
      { icon: <BedDouble size={18} />, label: "Oda", value: unit.roomCount || getDetailValue(unit, ["roomTotal"], "") },
      { icon: <BedDouble size={18} />, label: "Yatak", value: getDetailValue(unit, ["bedCount"], "") },
      { icon: <Waves size={18} />, label: "Havuz", value: getDetailValue(unit, ["pool", "hasPool"], "") },
      { icon: <Star size={18} />, label: "Sınıf", value: getDetailValue(unit, ["hotelClass", "starRating"], "") },
      { icon: <Utensils size={18} />, label: "Restoran", value: getDetailValue(unit, ["restaurant", "hasRestaurant"], "") },
      { icon: <Car size={18} />, label: "Otopark", value: parkingValue },
      { icon: <Maximize2 size={18} />, label: "Alan", value: formatAreaValue(unit.area, "") },
      { icon: <ShieldCheck size={18} />, label: "Yetki Türü", value: authorityValue },
    ]);
  }

  if (isLandDetailType(unit.type)) {
    return cleanInfoBoxes([
      { icon: <Maximize2 size={18} />, label: "Alan", value: formatAreaValue(unit.area, "") },
      { icon: <Landmark size={18} />, label: "İmar", value: getDetailValue(unit, ["zoningStatus", "imarDurumu"], "") },
      { icon: <Home size={18} />, label: "Ada / Parsel", value: formatAdaParselValue(unit) },
      { icon: <Ruler size={18} />, label: "Emsal", value: getDetailValue(unit, ["kaks", "emsal"], "") },
      { icon: <Building2 size={18} />, label: "Kat İzni", value: getDetailValue(unit, ["allowedFloors", "katIzni"], "") },
      { icon: <MapPin size={18} />, label: "Cephe", value: getDetailValue(unit, ["frontage", "yolaCephe"], "") },
      { icon: <Zap size={18} />, label: "Altyapı", value: getDetailValue(unit, ["infrastructure", "altyapi"], "") },
      { icon: <ShieldCheck size={18} />, label: "Yetki Türü", value: authorityValue },
    ]);
  }

  if (isCommercialDetailType(unit.type)) {
    return cleanInfoBoxes([
      { icon: <Maximize2 size={18} />, label: "m²", value: formatAreaValue(unit.area, "") },
      { icon: <Building2 size={18} />, label: "Kat", value: floorValue },
      { icon: <Home size={18} />, label: "Cephe", value: getDetailValue(unit, ["frontage", "cephe"], "") },
      { icon: <MapPin size={18} />, label: "Cadde", value: getDetailValue(unit, ["streetStatus", "cadde"], "") },
      { icon: <Car size={18} />, label: "Otopark", value: parkingValue },
      { icon: <Flame size={18} />, label: "Isınma", value: heatingValue },
      { icon: <Building2 size={18} />, label: "Depo", value: getDetailValue(unit, ["warehouse", "storageArea"], "") },
      { icon: <ShieldCheck size={18} />, label: "Yetki Türü", value: authorityValue },
    ]);
  }

  const balconyValue = unitHasFeature(unit, ["BALKON", "TERAS"])
    ? unitHasFeature(unit, ["TERAS"])
      ? "Teras"
      : "Var"
    : "";
  const smartParkingValue =
    parkingValue ||
    (unitHasFeature(unit, ["KAPALI_OTOPARK"])
      ? "Kapalı"
      : unitHasFeature(unit, ["ACIK_OTOPARK"])
        ? "Açık"
        : "");
  const bathroomValue = getDetailValue(
    unit,
    ["bathroomCount", "bathrooms", "banyo", "bathroom"],
    "",
  );

  return cleanInfoBoxes([
    { icon: <BedDouble size={20} />, label: "Oda Sayısı", value: unit.roomCount || "" },
    { icon: <Maximize2 size={20} />, label: "Brüt Alan", value: formatAreaValue(unit.area, "") },
    { icon: <Building2 size={20} />, label: "Bulunduğu Kat", value: floorValue },
    { icon: <Building2 size={20} />, label: "Bina Yaşı", value: buildingAgeValue },
    { icon: <Waves size={20} />, label: "Banyo", value: bathroomValue },
    { icon: <Home size={20} />, label: "Balkon", value: balconyValue },
    { icon: <Car size={20} />, label: "Otopark", value: smartParkingValue },
    { icon: <Flame size={20} />, label: "Isınma", value: heatingValue },
    { icon: <Building2 size={20} />, label: "Toplam Kat", value: totalFloorsValue },
    { icon: <ShieldCheck size={20} />, label: "Yetki Türü", value: authorityValue },
  ]).slice(0, 8);
}

function unitTitle(unit?: DetailUnit | null) {
  if (!unit) return "Portföy Detayı";
  const projectName = unit.project?.name || "EPH Portföy";
  const room = unit.roomCount ? `${unit.roomCount} ` : "";
  const type = typeLabel(unit.type);
  return `${projectName} · ${room}${type}`;
}

function isUnitVerified(unit?: DetailUnit | null) {
  return Boolean(
    unit?.isVerified ||
    (unit?.tapuVerified && unit?.photoVerified && unit?.yetkiVerified),
  );
}

function calculatePortfolioScore(unit?: DetailUnit | null) {
  if (!unit) return 0;
  let score = 0;
  const imageCount = getUnitImages(unit).length;
  if (unit.project?.name) score += 14;
  if (unit.project?.city && unit.project?.district) score += 14;
  if (unit.price) score += 14;
  if (unit.area) score += 12;
  if (unit.roomCount) score += 10;
  if (unit.description) score += 12;
  if (unit.tapuVerified) score += 7;
  if (unit.photoVerified || imageCount > 0) score += 7;
  if (unit.yetkiVerified || unit.isVerified) score += 10;
  return Math.min(score || 70, 100);
}

function getPortfolioScoreLabel(score: number) {
  if (score >= 90) return "Pekiyi";
  if (score >= 80) return "Çok İyi";
  if (score >= 70) return "İyi";
  if (score >= 60) return "Geliştirilebilir";
  return "Eksik";
}

function getPortfolioNo(unit: DetailUnit) {
  const raw = String(unit.id || "EPH").replace(/[^a-zA-Z0-9]/g, "");
  return `EPH-${raw.slice(0, 4).toLocaleUpperCase("tr-TR") || "PORT"}-${raw.slice(-4).toLocaleUpperCase("tr-TR") || "0001"}`;
}

function getCurrentShareUrl(unitId?: string) {
  return `https://emlakportfoyhavuzu.com/portfoy/${unitId || ""}`;
}

function findPortfolioDocument(
  documents: PortfolioAuthorityDocument[],
  authorityType: PortfolioAuthorityType,
) {
  return documents.find((document) => document.authorityType === authorityType);
}

function getRequiredDocumentApprovalState(
  documents: PortfolioAuthorityDocument[],
) {
  const tapuDocuments = documents.filter(
    (document) => document.authorityType === "TAPU",
  );
  const yetkiDocuments = documents.filter(
    (document) => document.authorityType === "YETKI_BELGESI",
  );

  const tapuDocument =
    tapuDocuments.find((document) => document.approved) || tapuDocuments[0];
  const yetkiDocument =
    yetkiDocuments.find((document) => document.approved) || yetkiDocuments[0];
  const hasApprovedTapu = tapuDocuments.some(
    (document) => document.approved,
  );
  const hasApprovedYetki = yetkiDocuments.some(
    (document) => document.approved,
  );

  return {
    tapuDocument,
    yetkiDocument,
    hasApprovedTapu,
    hasApprovedYetki,
    allRequiredApproved: hasApprovedTapu && hasApprovedYetki,
  };
}

function formatFileSize(size?: number | null) {
  const numeric = Number(size || 0);
  if (!numeric) return "Boyut yok";
  if (numeric < 1024 * 1024) return `${Math.max(1, Math.round(numeric / 1024))} KB`;
  return `${(numeric / (1024 * 1024)).toFixed(1)} MB`;
}

function getDocumentReviewState(
  document?: PortfolioAuthorityDocument,
): DocumentReviewState {
  if (!document?.fileUrl) return "MISSING";
  if (document.approved) return "APPROVED";

  const reason = String(document.rejectReason || "").trim();

  if (reason.startsWith(DOCUMENT_REJECT_PREFIX)) return "REJECTED";
  if (reason.startsWith(DOCUMENT_REUPLOAD_PREFIX)) {
    return "REUPLOAD_REQUESTED";
  }
  if (reason) return "REUPLOAD_REQUESTED";

  return "PENDING";
}

function getDocumentReviewNote(document?: PortfolioAuthorityDocument) {
  const reason = String(document?.rejectReason || "").trim();

  if (!reason) return "";

  return reason
    .replace(DOCUMENT_REJECT_PREFIX, "")
    .replace(DOCUMENT_REUPLOAD_PREFIX, "")
    .trim();
}


function canEditDetailUnit(
  unit?: DetailUnit | null,
  user?: { id?: string | null; role?: string | null } | null,
) {
  const role = String(user?.role || "").toUpperCase();

  if (!unit || !user?.id) return false;
  if (role === "SUPER_ADMIN") return true;

  const approvalStatus = String(
    unit.approvalStatus || "TASLAK",
  ).toUpperCase();

  const contentLocked = [
    "INCELEMEYE_GONDERILDI",
    "INCELEMEDE",
    "ONAYLANDI",
    "HAVUZDA",
  ].includes(approvalStatus);

  if (contentLocked) return false;

  const possibleOwnerIds = [
    (unit as any)?.userId,
    (unit as any)?.ownerId,
    (unit as any)?.createdById,
    (unit as any)?.project?.userId,
    (unit as any)?.project?.ownerId,
    (unit as any)?.project?.createdById,
    (unit as any)?.project?.owner?.id,
  ]
    .filter(Boolean)
    .map((value) => String(value));

  return possibleOwnerIds.includes(String(user.id));
}

function canViewDoorAccessInfo(
  unit?: DetailUnit | null,
  user?: { id?: string | null; role?: string | null } | null,
) {
  const role = String(user?.role || "").toUpperCase();

  if (!unit || !user?.id) return false;
  if (role === "SUPER_ADMIN") return true;

  const possibleOwnerIds = [
    (unit as any)?.userId,
    (unit as any)?.ownerId,
    (unit as any)?.createdById,
    (unit as any)?.project?.userId,
    (unit as any)?.project?.ownerId,
    (unit as any)?.project?.createdById,
    (unit as any)?.project?.owner?.id,
  ]
    .filter(Boolean)
    .map((value) => String(value));

  return possibleOwnerIds.includes(String(user.id));
}

function canReviewDetailUnit(user?: { role?: string | null } | null) {
  const role = String(user?.role || "").toUpperCase();
  return ["MODERATOR", "ADMIN", "SUPER_ADMIN"].includes(role);
}

function isDirectPoolPublisherRole(role?: string | null) {
  return ["MUTEAHHIT", "INSAAT_FIRMASI"].includes(
    String(role || "").toUpperCase(),
  );
}

function isApprovalFinal(status?: string) {
  return ["ONAYLANDI", "HAVUZDA", "REDDEDILDI"].includes(
    String(status || "").toUpperCase(),
  );
}

function makeShareText(unit: DetailUnit) {
  const location = [unit.project?.district, unit.project?.city]
    .filter(Boolean)
    .join(" / ");
  return [
    unitTitle(unit),
    location,
    unit.area ? `${unit.area} m²` : "",
    unit.roomCount || "",
    formatMoney(unit.price, unit.priceCurrency),
    getCurrentShareUrl(unit.id),
  ]
    .filter(Boolean)
    .join(" · ");
}

export default function StokDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const unitId = params?.id;

  const [unit, setUnit] = useState<DetailUnit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [activePhoto, setActivePhoto] = useState(0);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [linkShareBusy, setLinkShareBusy] = useState(false);
  const [authorityLetterOpen, setAuthorityLetterOpen] = useState(false);
  const [shareData, setShareData] = useState<PortfolioShareData | null>(null);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [doorAccessVisible, setDoorAccessVisible] = useState(false);
  const [managementOpen, setManagementOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");
  const [imageUploadLoading, setImageUploadLoading] = useState("");
  const [imageActionLoading, setImageActionLoading] = useState("");
  const [approvalActionLoading, setApprovalActionLoading] = useState("");
  const [portfolioDocuments, setPortfolioDocuments] = useState<
    PortfolioAuthorityDocument[]
  >([]);
  const [documentUploadLoading, setDocumentUploadLoading] = useState("");
  const [documentDeleteLoading, setDocumentDeleteLoading] = useState("");
  const [documentReviewLoading, setDocumentReviewLoading] = useState("");
  const [documentReviewDialog, setDocumentReviewDialog] =
    useState<DocumentReviewDialogState | null>(null);
  const [documentReviewNote, setDocumentReviewNote] = useState("");
  const [documentReviewError, setDocumentReviewError] = useState("");
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const yetkiDocumentInputRef = useRef<HTMLInputElement | null>(null);
  const tapuDocumentInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!unitId) return;
    fetchUnit();
  }, [unitId]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (
      galleryOpen ||
      shareOpen ||
      deleteOpen ||
      authorityLetterOpen ||
      documentReviewDialog
    ) {
      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = previousOverflow;
      };
    }
    document.body.style.overflow = "";
  }, [
    galleryOpen,
    shareOpen,
    deleteOpen,
    authorityLetterOpen,
    documentReviewDialog,
  ]);

  const fetchUnit = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get(`/units/${unitId}`);
      setUnit(response.data);
      await fetchPortfolioDocuments(String(unitId));
    } catch (err: any) {
      setError(err?.response?.data?.message || "Portföy detayı yüklenemedi.");
    } finally {
      setLoading(false);
    }
  };

  const fetchPortfolioDocuments = async (portfolioId?: string) => {
    const safePortfolioId = portfolioId || unitId;

    if (!safePortfolioId) return;

    try {
      const response = await api.get(`/portfolio-documents/${safePortfolioId}`);
      setPortfolioDocuments(Array.isArray(response.data) ? response.data : []);
    } catch {
      setPortfolioDocuments([]);
    }
  };

  const galleryImages = useMemo(() => getUnitImages(unit), [unit]);
  const coverImage = useMemo(() => getUnitCoverImage(unit), [unit]);
  const activeGalleryImage =
    galleryImages[activePhoto]?.displayUrl || coverImage || "";
  const verified = isUnitVerified(unit);
  const featureLabels = useMemo(() => getFeatureLabels((unit as any)?.features), [unit]);
  const portfolioScore = useMemo(() => calculatePortfolioScore(unit), [unit]);
  const portfolioScoreLabel = useMemo(
    () => getPortfolioScoreLabel(portfolioScore),
    [portfolioScore],
  );
  const ownerName = [
    unit?.project?.owner?.firstName,
    unit?.project?.owner?.lastName,
  ]
    .filter(Boolean)
    .join(" ");

  useEffect(() => {
    setActivePhoto(0);
    setDoorAccessVisible(false);
    setManagementOpen(false);
  }, [unit?.id]);

  useEffect(() => {
    if (galleryImages.length === 0) {
      setActivePhoto(0);
      return;
    }
    if (activePhoto > galleryImages.length - 1)
      setActivePhoto(galleryImages.length - 1);
  }, [galleryImages.length, activePhoto]);

  const locationText =
    [unit?.project?.district, unit?.project?.city]
      .filter(Boolean)
      .join(" / ") || "Konum bilgisi yok";
  const fullAddress =
    [unit?.project?.address, unit?.project?.district, unit?.project?.city]
      .filter(Boolean)
      .join(" / ") || "Adres bilgisi yok";
  const projectLatitude = Number((unit?.project as any)?.latitude || 0);
  const projectLongitude = Number((unit?.project as any)?.longitude || 0);
  const hasProjectCoordinates =
    Number.isFinite(projectLatitude) &&
    Number.isFinite(projectLongitude) &&
    Boolean(projectLatitude) &&
    Boolean(projectLongitude);
  const mapQuery = encodeURIComponent(
    hasProjectCoordinates
      ? `${projectLatitude},${projectLongitude}`
      : fullAddress,
  );
  const shareUrl = unit ? getCurrentShareUrl(unit.id) : "";

  const validateImageFile = (file: File) => {
    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "image/heic",
      "image/heif",
      "application/octet-stream",
      "",
    ];

    const fileType = String(file.type || "").toLowerCase();
    const fileName = String(file.name || "").toLowerCase();
    const isAllowedType =
      allowedTypes.includes(fileType) ||
      /\.(jpg|jpeg|png|webp|heic|heif)$/i.test(fileName);

    if (!isAllowedType) {
      return "Sadece JPG, PNG veya WEBP formatında görsel yükleyebilirsiniz.";
    }

    if (file.size > 15 * 1024 * 1024) {
      return `Yüklediğiniz görsel dosyası çok büyük. Her bir görsel en fazla 15 MB olabilir. Seçilen görsel: ${(file.size / (1024 * 1024)).toFixed(1)} MB.`;
    }

    if (file.size < 20 * 1024) {
      return "Seçtiğiniz görsel çok küçük görünüyor. Lütfen daha kaliteli bir görsel yükleyiniz.";
    }

    return "";
  };

  const uploadPortfolioImage = async (
    file: File,
    isCover: boolean,
    sortOrder: number,
  ) => {
    if (!unit) return;

    const validationError = validateImageFile(file);

    if (validationError) {
      setActionError(validationError);
      return;
    }

    const payload = new FormData();

    payload.append("portfolioId", unit.id);
    payload.append("isCover", isCover ? "true" : "false");
    payload.append("sortOrder", String(sortOrder));
    payload.append("file", file);

    setImageUploadLoading(isCover ? "cover" : "gallery");
    setActionError("");

    try {
      await api.post("/portfolio-images/upload", payload, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      await fetchUnit();
    } catch (err: any) {
      setActionError(
        err?.response?.data?.message ||
          "Görsel yüklenemedi. Lütfen dosya formatını ve boyutunu kontrol ediniz.",
      );
    } finally {
      setImageUploadLoading("");
    }
  };

  const handleGalleryUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = Array.from(event.target.files || []);

    event.target.value = "";

    if (!files.length || !unit) return;

    const remaining = Math.max(0, MAX_GALLERY_COUNT - galleryImages.length);

    if (remaining <= 0) {
      setActionError(
        `En fazla ${MAX_GALLERY_COUNT} galeri fotoğrafı yükleyebilirsiniz.`,
      );
      return;
    }

    const selectedFiles = files.slice(0, remaining);

    for (let index = 0; index < selectedFiles.length; index += 1) {
      await uploadPortfolioImage(
        selectedFiles[index],
        false,
        galleryImages.length + index + 1,
      );
    }

    if (files.length > remaining) {
      setActionError(
        `En fazla ${MAX_GALLERY_COUNT} galeri fotoğrafı yükleyebilirsiniz. Fazla seçilen görseller eklenmedi.`,
      );
    }
  };

  const handleSetCoverImage = async (imageId?: string) => {
    if (!imageId) return;

    try {
      setActionError("");
      setImageActionLoading(`cover-${imageId}`);
      await api.put(`/portfolio-images/${imageId}/cover`);
      await fetchUnit();
    } catch (err: any) {
      setActionError(
        err?.response?.data?.message || "Kapak fotoğrafı değiştirilemedi.",
      );
    } finally {
      setImageActionLoading("");
    }
  };

  const handleDeleteImage = async (imageId?: string) => {
    if (!imageId) return;

    try {
      setActionError("");
      setImageActionLoading(`delete-${imageId}`);
      await api.delete(`/portfolio-images/${imageId}`);
      await fetchUnit();
    } catch (err: any) {
      setActionError(err?.response?.data?.message || "Fotoğraf silinemedi.");
    } finally {
      setImageActionLoading("");
    }
  };

  const handleMoveImage = async (
    imageId?: string,
    direction?: "up" | "down",
  ) => {
    if (!unit || !imageId || !direction) return;

    const currentIndex = galleryImages.findIndex(
      (image) => image.id === imageId,
    );
    const targetIndex =
      direction === "up" ? currentIndex - 1 : currentIndex + 1;

    if (
      currentIndex < 0 ||
      targetIndex < 0 ||
      targetIndex >= galleryImages.length
    )
      return;

    const nextImages = [...galleryImages];
    const current = nextImages[currentIndex];
    const target = nextImages[targetIndex];

    nextImages[currentIndex] = target;
    nextImages[targetIndex] = current;

    const imageIds = nextImages
      .map((image) => image.id)
      .filter(Boolean) as string[];

    try {
      setActionError("");
      setImageActionLoading(`move-${imageId}`);
      await api.put(`/portfolio-images/reorder/${unit.id}`, { imageIds });
      await fetchUnit();
    } catch (err: any) {
      setActionError(
        err?.response?.data?.message || "Fotoğraf sıralaması güncellenemedi.",
      );
    } finally {
      setImageActionLoading("");
    }
  };

  const validateDocumentFile = (file: File) => {
    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "application/octet-stream",
      "",
    ];

    const fileType = String(file.type || "").toLowerCase();
    const fileName = String(file.name || "").toLowerCase();
    const isAllowedType =
      allowedTypes.includes(fileType) ||
      /\.(pdf|jpg|jpeg|png|webp)$/i.test(fileName);

    if (!isAllowedType) {
      return "Sadece PDF, JPG, PNG veya WEBP formatında belge yükleyebilirsiniz.";
    }

    if (file.size > 15 * 1024 * 1024) {
      return `Yüklediğiniz belge çok büyük. Her belge en fazla 15 MB olabilir. Seçilen belge: ${(file.size / (1024 * 1024)).toFixed(1)} MB.`;
    }

    if (file.size < 2 * 1024) {
      return "Seçtiğiniz belge çok küçük görünüyor. Lütfen geçerli bir dosya yükleyiniz.";
    }

    return "";
  };

  const uploadPortfolioDocument = async (
    file: File,
    authorityType: PortfolioAuthorityType,
  ) => {
    if (!unit) return;

    const validationError = validateDocumentFile(file);

    if (validationError) {
      setActionError(validationError);
      return;
    }

    const payload = new FormData();

    payload.append("portfolioId", unit.id);
    payload.append("authorityType", authorityType);
    payload.append("file", file);

    setDocumentUploadLoading(authorityType);
    setActionError("");

    try {
      await api.post("/portfolio-documents/upload", payload, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      await fetchPortfolioDocuments(unit.id);
      await fetchUnit();
    } catch (err: any) {
      setActionError(
        err?.response?.data?.message ||
          "Belge yüklenemedi. Lütfen dosya formatını ve boyutunu kontrol ediniz.",
      );
    } finally {
      setDocumentUploadLoading("");
    }
  };

  const handleDocumentUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    authorityType: PortfolioAuthorityType,
  ) => {
    const file = event.target.files?.[0];

    event.target.value = "";

    if (!file) return;

    await uploadPortfolioDocument(file, authorityType);
  };

  const handleDeleteDocument = async (documentId?: string) => {
    if (!unit || !documentId) return;

    setDocumentDeleteLoading(documentId);
    setActionError("");

    try {
      await api.delete(`/portfolio-documents/${documentId}`);
      await fetchPortfolioDocuments(unit.id);
      await fetchUnit();
    } catch (err: any) {
      setActionError(err?.response?.data?.message || "Belge silinemedi.");
    } finally {
      setDocumentDeleteLoading("");
    }
  };

  const openDocumentReviewDialog = (
    document: PortfolioAuthorityDocument,
    label: string,
    action: DocumentReviewAction,
  ) => {
    setDocumentReviewDialog({ document, label, action });
    setDocumentReviewNote("");
    setDocumentReviewError("");
  };

  const closeDocumentReviewDialog = () => {
    if (documentReviewLoading) return;
    setDocumentReviewDialog(null);
    setDocumentReviewNote("");
    setDocumentReviewError("");
  };

  const handleDocumentReviewSubmit = async () => {
    if (!unit || !documentReviewDialog) return;

    const note = documentReviewNote.trim();
    const requiresNote = documentReviewDialog.action !== "APPROVE";

    if (requiresNote && note.length < 3) {
      setDocumentReviewError(
        "Red veya yeniden belge isteme işleminde en az 3 karakterlik açıklama yazılmalıdır.",
      );
      return;
    }

    const endpointMap: Record<DocumentReviewAction, string> = {
      APPROVE: "approve",
      REJECT: "reject",
      REQUEST_REUPLOAD: "request-reupload",
    };

    const loadingKey = `${documentReviewDialog.document.id}-${documentReviewDialog.action}`;

    setDocumentReviewLoading(loadingKey);
    setDocumentReviewError("");
    setActionError("");

    try {
      await api.patch(
        `/portfolio-documents/${documentReviewDialog.document.id}/${endpointMap[documentReviewDialog.action]}`,
        { note },
      );

      await fetchPortfolioDocuments(unit.id);
      await fetchUnit();
      setDocumentReviewDialog(null);
      setDocumentReviewNote("");
    } catch (err: any) {
      setDocumentReviewError(
        err?.response?.data?.message || "Belge inceleme işlemi tamamlanamadı.",
      );
    } finally {
      setDocumentReviewLoading("");
    }
  };

  const handleSubmitApproval = async () => {
    if (!unit) return;

    const ownerRole = String(
      unit.project?.owner?.role || user?.role || "",
    ).toUpperCase();
    const isDirectPoolPublisher = isDirectPoolPublisherRole(ownerRole);

    setApprovalActionLoading(
      isDirectPoolPublisher ? "DIRECT_POOL" : "INCELEMEYE_GONDERILDI",
    );
    setActionError("");

    try {
      if (isDirectPoolPublisher) {
        await api.post(`/units/${unit.id}/submit-approval`);
      } else {
        await api.post(`/portfolio-documents/${unit.id}/submit-review`);
        await fetchPortfolioDocuments(unit.id);
      }

      await fetchUnit();
    } catch (err: any) {
      setActionError(
        err?.response?.data?.message ||
          (isDirectPoolPublisher
            ? "Portföy doğrudan havuzda yayınlanamadı. Üyelik ve portföy durumunu kontrol ediniz."
            : "Portföy incelemeye gönderilemedi. Tapu ve Yetki Belgesi durumunu kontrol ediniz."),
      );
    } finally {
      setApprovalActionLoading("");
    }
  };

  const getPortfolioShareData = (item: DetailUnit): PortfolioShareData => ({
    id: item.id,
    title: item.project?.name || "EPH Portföy",
    location: locationText,
    price: item.price
      ? formatMoney(item.price, item.priceCurrency)
      : "Fiyat bilgisi yok",
    roomCount: item.roomCount || "—",
    area: item.area ? `${item.area} m²` : "—",
    floor: formatFloorInfo(item),
    authorization:
      item.yetkiVerified || item.isVerified ? "Yetkili" : "Kontrol",
    coverImage: activeGalleryImage || "/LOGO_EPH.png",
    consultantName:
      [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
      ownerName ||
      "EPH Üyesi",
    consultantPhone: "Telefon bilgisi",
    portfolioNo: getPortfolioNo(item),
    score: portfolioScore,
    scoreLabel: portfolioScoreLabel,
    shortDescription:
      item.description || "Bu portföy için açıklama henüz eklenmedi.",
    longDescription:
      item.description || "Bu portföy için detaylı açıklama henüz eklenmedi.",
    features: [
      {
        icon: "security",
        label:
          item.yetkiVerified || item.isVerified
            ? "Yetkili Portföy"
            : "Yetki Kontrol",
      },
      { icon: "smart", label: "Lina Kartı" },
      { icon: "car", label: "Portföy Kaydı" },
      { icon: "pool", label: statusLabel(item.status) },
    ],
  });

  const handleOpenShareModal = () => {
    if (!unit) return;
    setShareData(getPortfolioShareData(unit));
    setShareOpen(true);
  };

  const handleShareLink = async () => {
    if (!unit || linkShareBusy) return;
    setLinkShareBusy(true);
    try {
      const response = await api.post(`/units/portfolio/${unit.id}/share`);
      const url = String(response.data?.url || "").trim();
      if (!url) throw new Error("Paylaşım bağlantısı oluşturulamadı.");
      const message = `Merhaba, "${unitTitle(unit)}" portföyünü sizinle paylaşmak istiyorum: ${url}`;
      window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || "Paylaşım bağlantısı oluşturulamadı.");
    } finally {
      setLinkShareBusy(false);
    }
  };

  const handleCopyLink = async () => {
    if (!unit) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      alert("Link kopyalanamadı.");
    }
  };

  const handleNativeShare = async () => {
    if (!unit) return;
    const text = makeShareText(unit);
    if (navigator.share) {
      await navigator.share({ title: unitTitle(unit), text, url: shareUrl });
      return;
    }
    await handleCopyLink();
  };

  const handleDeleteUnit = async () => {
    if (!unit) return;
    setActionError("");
    try {
      setActionLoading(true);
      await api.delete(`/units/${unit.id}`);
      router.push("/portfoy");
    } catch (err: any) {
      setActionError(err?.response?.data?.message || "Portföy silinemedi.");
      setActionLoading(false);
    }
  };

  const handleApprovalAction = async (
    nextStatus:
      | "INCELEMEDE"
      | "EKSIK_BILGI_BEKLENIYOR"
      | "ONAYLANDI"
      | "REDDEDILDI",
  ) => {
    if (!unit) return;

    if (nextStatus === "ONAYLANDI") {
      const requiredDocuments =
        getRequiredDocumentApprovalState(portfolioDocuments);

      if (!requiredDocuments.allRequiredApproved) {
        setActionError(
          "Portföyü onaylayıp yayınlamak için Tapu ve Yetki Belgesinin ikisi de ayrı ayrı onaylanmalıdır.",
        );
        return;
      }
    }

    const endpointMap: Record<typeof nextStatus, string> = {
      INCELEMEDE: "mark-reviewing",
      EKSIK_BILGI_BEKLENIYOR: "request-missing-info",
      ONAYLANDI: "approve",
      REDDEDILDI: "reject",
    };

    const defaultNotes: Record<typeof nextStatus, string> = {
      INCELEMEDE: "Portföy incelemeye alındı.",
      EKSIK_BILGI_BEKLENIYOR:
        "EPH inceleme ekibi bu portföy için ek bilgi veya belge bekliyor.",
      ONAYLANDI:
        "Tapu ve Yetki Belgesi onayları doğrulandı. Portföy onaylandı ve havuzda yayınlandı.",
      REDDEDILDI: "Portföy doğrulama sürecinde reddedildi.",
    };

    setActionError("");
    setApprovalActionLoading(nextStatus);

    try {
      await api.post(`/units/${unit.id}/${endpointMap[nextStatus]}`, {
        note: defaultNotes[nextStatus],
      });

      await fetchUnit();
    } catch (err: any) {
      setActionError(
        err?.response?.data?.message ||
          "Onay işlemi tamamlanamadı. Lütfen belge onaylarını ve portföy durumunu kontrol ediniz.",
      );
    } finally {
      setApprovalActionLoading("");
    }
  };

  const handleGalleryTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    if (touchStartX == null || galleryImages.length <= 1) return;
    const touchEndX = event.changedTouches[0]?.clientX || 0;
    const diff = touchStartX - touchEndX;
    if (Math.abs(diff) > 55) {
      if (diff > 0)
        setActivePhoto((current) =>
          current === galleryImages.length - 1 ? 0 : current + 1,
        );
      else
        setActivePhoto((current) =>
          current === 0 ? galleryImages.length - 1 : current - 1,
        );
    }
    setTouchStartX(null);
  };

  if (loading) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center overflow-y-auto bg-[#F7FBFF] text-[#06194A]">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[#1557D6] border-t-transparent" />
          <p className="mt-4 text-xs font-black uppercase tracking-[0.26em] text-[#64748B]">
            Portföy detayı yükleniyor
          </p>
        </div>
      </main>
    );
  }

  if (error || !unit) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center overflow-y-auto bg-[#F7FBFF] px-4 text-[#06194A]">
        <section className="w-full max-w-lg rounded-[32px] border border-[#DDE7F3] bg-white p-6 text-center shadow-[0_20px_55px_rgba(15,23,42,0.07)]">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
            <FileText size={26} />
          </div>
          <h1 className="mt-4 text-2xl font-black">Portföy bulunamadı</h1>
          <p className="mt-2 text-sm font-semibold leading-6 text-[#64748B]">
            {error || "Bu portföye ait detay bilgisi alınamadı."}
          </p>
          <button
            onClick={() => router.push("/portfoy")}
            className="mt-5 rounded-2xl bg-[#1557D6] px-5 py-3 text-sm font-black text-white"
          >
            Portföy Merkezine Dön
          </button>
        </section>
      </main>
    );
  }

  const style = statusStyle(unit.status);
  const canEditPortfolio = canEditDetailUnit(unit, user);
  const canReviewPortfolio = canReviewDetailUnit(user);
  const portfolioOwnerRole = String(
    unit.project?.owner?.role || user?.role || "",
  ).toUpperCase();
  const isDirectPoolPublisher =
    isDirectPoolPublisherRole(portfolioOwnerRole);
  const canSeeDoorAccessInfo = canViewDoorAccessInfo(unit, user);
  const availableCreditAmount = Number((unit as any)?.availableCreditAmount || 0);
  const doorAccessInfo = String((unit as any)?.doorAccessInfo || "").trim();
  const primaryInfoBoxes = getPrimaryInfoBoxes(unit, verified, portfolioDocuments);
  const safeDescription =
    unit.description || "Bu portföy için açıklama henüz eklenmedi.";
  const shortDescription =
    safeDescription.length > 140
      ? `${safeDescription.slice(0, 140).trim()}...`
      : safeDescription;
  const visibleDescription = descriptionExpanded
    ? safeDescription
    : shortDescription;
  const encodedShareText = encodeURIComponent(makeShareText(unit));
  const encodedShareUrl = encodeURIComponent(shareUrl);

  return (
    <main className="min-h-[100dvh] overflow-y-auto bg-[#F7FBFF] pb-[calc(112px+env(safe-area-inset-bottom))] text-[#27364F]">
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={handleGalleryUpload}
      />

      <input
        ref={yetkiDocumentInputRef}
        type="file"
        accept={DOCUMENT_ACCEPT}
        className="hidden"
        onChange={(event) => handleDocumentUpload(event, "YETKI_BELGESI")}
      />
      <input
        ref={tapuDocumentInputRef}
        type="file"
        accept={DOCUMENT_ACCEPT}
        className="hidden"
        onChange={(event) => handleDocumentUpload(event, "TAPU")}
      />

      <section className="mx-auto w-full max-w-[430px] px-3 py-3">
        <div className="mb-2 flex items-center gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => router.push("/portfoy")}
            className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-[16px] border border-[#DDE7F3] bg-white px-3 text-[12px] font-black text-[#06194A] shadow-[0_8px_18px_rgba(15,23,42,0.05)]"
          >
            <ArrowLeft size={16} />
            Geri
          </button>
          {canEditPortfolio && (
            <>
              <button
                type="button"
                onClick={() => router.push(`/portfoy?edit=${unit.id}`)}
                className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-[16px] border border-[#DDE7F3] bg-white px-3 text-[12px] font-black text-[#1557D6] shadow-[0_8px_18px_rgba(15,23,42,0.05)]"
              >
                <Edit3 size={15} />
                Güncelle
              </button>
              <button
                type="button"
                onClick={() => setManagementOpen((current) => !current)}
                className={`inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-[16px] border px-3 text-[12px] font-black shadow-[0_8px_18px_rgba(15,23,42,0.05)] ${
                  managementOpen
                    ? "border-[#1557D6] bg-[#1557D6] text-white"
                    : "border-[#DDE7F3] bg-white text-[#1557D6]"
                }`}
              >
                <Camera size={15} />
                {managementOpen ? "Medya Kapat" : "Medya"}
              </button>
            </>
          )}
          <button
            onClick={handleCopyLink}
            className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-[16px] border border-[#DDE7F3] bg-white px-3 text-[12px] font-black text-[#475569] shadow-[0_8px_18px_rgba(15,23,42,0.05)]"
          >
            <Copy size={15} />
            {copied ? "Kopyalandı" : "Link"}
          </button>
          <button
            onClick={handleOpenShareModal}
            className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-[16px] bg-[#1557D6] px-3 text-[12px] font-black text-white shadow-[0_12px_24px_rgba(21,87,214,0.22)]"
          >
            <Share2 size={15} />
            Paylaş
          </button>
        </div>

        {actionError && (
          <div className="mb-2 rounded-[18px] border border-rose-100 bg-rose-50 px-3 py-2 text-center text-[12px] font-black leading-5 text-rose-700">
            {actionError}
          </div>
        )}

        <section className="overflow-hidden rounded-[24px] border border-[#DDE7F3] bg-white shadow-[0_14px_34px_rgba(15,23,42,0.07)]">
          <button
            type="button"
            onClick={() => galleryImages.length > 0 && setGalleryOpen(true)}
            className="group relative block h-[360px] w-full overflow-hidden bg-[#06194A] text-left"
          >
            {activeGalleryImage ? (
              <img
                src={activeGalleryImage}
                alt={unitTitle(unit)}
                className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.18),transparent_28%),linear-gradient(135deg,#06194A,#1557D6)]">
                <div className="rounded-[20px] border border-white/18 bg-white/12 px-4 py-3 text-center backdrop-blur">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/70">
                    Fotoğraf Eklenmedi
                  </p>
                  <p className="mt-1 text-[11px] font-bold text-white/85">
                    Kapak görseli bekleniyor.
                  </p>
                </div>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#06194A]/72 via-[#06194A]/10 to-[#06194A]/10" />
            <div className="absolute left-2 top-2 flex items-center gap-1.5">
              <span
                className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-black shadow-lg"
                style={{
                  color: style.color,
                  background: style.bg,
                  borderColor: style.border,
                }}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: style.dot }}
                />
                {statusLabel(unit.status)}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-white/18 bg-black/35 px-2.5 py-1 text-[10px] font-black text-white backdrop-blur">
                <Camera size={12} />
                {galleryImages.length}/{MAX_GALLERY_COUNT}
              </span>
            </div>
            <div className="absolute bottom-[78px] left-4 right-4">
              <p className="break-words text-center text-[26px] font-black leading-tight tracking-[-0.04em] text-white drop-shadow">
                {unitTitle(unit)}
              </p>
              <div className="mt-2 flex items-center justify-center gap-1.5 text-center text-[13px] font-bold text-white/92">
                <MapPin size={13} />
                <span className="break-words">{fullAddress}</span>
              </div>
            </div>
          </button>

          {galleryImages.length > 0 && (
            <div className="relative z-10 border-b border-[#E8F0FA] bg-white px-2.5 py-2">
              <div className="flex gap-2 overflow-x-auto pb-1">
                {galleryImages.slice(0, 8).map((photo, index) => (
                  <button
                    key={photo.id || photo.displayUrl}
                    type="button"
                    onClick={() => setActivePhoto(index)}
                    className={`relative h-[54px] w-[68px] shrink-0 overflow-hidden rounded-[14px] border bg-white ${activePhoto === index ? "border-[#1557D6] ring-2 ring-blue-100" : "border-[#DDE7F3]"}`}
                  >
                    <img
                      src={photo.displayUrl}
                      alt={`Portföy fotoğrafı ${index + 1}`}
                      className="h-full w-full object-cover"
                    />
                    {photo.isCover && (
                      <span className="absolute left-1 top-1 rounded-full bg-[#1557D6] px-1.5 py-0.5 text-[8px] font-black text-white">
                        Kapak
                      </span>
                    )}
                  </button>
                ))}
                {galleryImages.length > 8 && (
                  <button
                    type="button"
                    onClick={() => setGalleryOpen(true)}
                    className="flex h-[54px] w-[68px] shrink-0 items-center justify-center rounded-[14px] border border-[#DDE7F3] bg-[#06194A] text-[12px] font-black text-white"
                  >
                    +{galleryImages.length - 8}
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="relative p-3 pt-3">
            <div className="flex flex-wrap justify-center gap-1.5 rounded-[24px] border border-[#D7E3F2] bg-white/95 p-2 shadow-[0_22px_46px_rgba(15,23,42,0.16)] backdrop-blur">
              {primaryInfoBoxes.map((item) => (
                <InfoBox
                  key={item.label}
                  icon={item.icon}
                  label={item.label}
                  value={item.value}
                />
              ))}
            </div>

            <div className="mt-2 flex items-center justify-between gap-2 rounded-[16px] border border-[#DDE7F3] bg-white px-3 py-2 text-[11px] font-black">
              <span className="min-w-0 break-words text-[#64748B]">
                {getPortfolioNo(unit)}
              </span>
              <span
                className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 ${verified ? "bg-emerald-50 text-emerald-700" : "bg-[#F7FBFF] text-[#64748B]"}`}
              >
                <ShieldCheck size={13} />
                {verified ? "Doğrulanmış" : "Kontrol"}
              </span>
            </div>
          </div>
        </section>

        <PortfolioDetailInfoCenter
          unit={unit}
          canSeeDoorAccessInfo={canSeeDoorAccessInfo}
          doorAccessInfo={doorAccessInfo}
          availableCreditAmount={availableCreditAmount}
        />

<section className="mt-2 rounded-[22px] border border-[#DDE7F3] bg-white p-3 text-center shadow-[0_14px_30px_rgba(15,23,42,0.06)]">
          <PremiumSectionHeading icon={<Home size={18} />} title="Açıklama" />
          <p className="mx-auto mt-2 max-w-[350px] whitespace-pre-line break-words text-center text-[12px] font-semibold leading-5 text-[#27364F]">
            {visibleDescription}
            {safeDescription.length > 140 && (
              <button
                type="button"
                onClick={() => setDescriptionExpanded((current) => !current)}
                className="ml-1 inline font-black text-[#1557D6]"
              >
                {descriptionExpanded ? "Daha Az" : "Devamı"}
              </button>
            )}
          </p>
        </section>

        <section className="mt-2 overflow-hidden rounded-[22px] border border-[#DDE7F3] bg-white text-center shadow-[0_10px_22px_rgba(15,23,42,0.045)]">
          <div className="relative">
            <iframe
              title="Portföy haritası"
              src={`https://www.google.com/maps?q=${mapQuery}&z=${hasProjectCoordinates ? 17 : 14}&output=embed`}
              className="h-[205px] w-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
            {hasProjectCoordinates && (
              <button
                type="button"
                onClick={() =>
                  window.open(
                    `https://www.google.com/maps?q=${mapQuery}`,
                    "_blank",
                    "noopener,noreferrer",
                  )
                }
                className="absolute right-3 top-3 inline-flex min-h-[32px] items-center justify-center gap-1 rounded-full bg-white/95 px-3 text-[10px] font-black text-[#1557D6] shadow-[0_10px_20px_rgba(15,23,42,0.16)] backdrop-blur"
              >
                Konuma Git <ExternalLink size={11} />
              </button>
            )}
          </div>
        </section>

        {canReviewPortfolio && (
          <PortfolioApprovalCenter
            unit={unit}
            documents={portfolioDocuments}
            galleryImageCount={galleryImages.length}
            canReviewPortfolio={canReviewPortfolio}
            approvalActionLoading={approvalActionLoading}
            onApprovalAction={handleApprovalAction}
          />
        )}

        

        <section className="mt-2 rounded-[22px] border border-[#DDE7F3] bg-white p-3 text-center shadow-[0_14px_30px_rgba(15,23,42,0.06)]">
          <PremiumSectionHeading icon={<Share2 size={18} />} title="Paylaş" compact />
          <div className="mt-3 grid grid-cols-4 gap-2">
            <ShareLink
              href={`https://wa.me/?text=${encodedShareText}`}
              label="WhatsApp"
              icon={<MessageCircle size={17} />}
            />
            <ShareLink
              href={`https://t.me/share/url?url=${encodedShareUrl}&text=${encodedShareText}`}
              label="Telegram"
              icon={<Send size={17} />}
            />
            <button
              onClick={handleCopyLink}
              className="inline-flex min-h-[48px] flex-col items-center justify-center gap-1 rounded-[16px] border border-[#DDE7F3] bg-white px-2 text-[10px] font-black text-[#475569]"
            >
              <Copy size={17} />
              {copied ? "Kopyalandı" : "Link"}
            </button>
            <button
              onClick={handleOpenShareModal}
              className="inline-flex min-h-[48px] flex-col items-center justify-center gap-1 rounded-[16px] bg-[#1557D6] px-2 text-[10px] font-black text-white"
            >
              <Share2 size={17} />
              Kart / QR
            </button>
          </div>
          <button
            type="button"
            onClick={handleShareLink}
            disabled={linkShareBusy}
            className="mt-2 flex min-h-[46px] w-full items-center justify-center gap-2 rounded-[16px] bg-[#7C3AED] px-3 text-[12px] font-black text-white shadow-[0_12px_24px_rgba(124,58,237,0.22)] disabled:opacity-60"
          >
            <Share2 size={15} />
            {linkShareBusy ? "Bağlantı Oluşturuluyor..." : "Müşterime Paylaş"}
          </button>
        </section>


        {featureLabels.length > 0 && (
          <section className="mt-2 rounded-[22px] border border-[#DDE7F3] bg-white p-3 shadow-[0_14px_30px_rgba(15,23,42,0.06)]">
            <PremiumSectionHeading icon={<Star size={18} />} title="Öne Çıkan Özellikler" />
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {featureLabels.map((feature) => (
                <span
                  key={feature}
                  className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-[11px] font-black text-emerald-700 shadow-[0_8px_18px_rgba(5,150,105,0.08)]"
                >
                  ✓ {feature}
                </span>
              ))}
            </div>
          </section>
        )}



        <section className="mt-2 rounded-[22px] border border-[#DDE7F3] bg-white p-3 text-center shadow-[0_14px_30px_rgba(15,23,42,0.06)]">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#EFF6FF] text-[#1557D6] shadow-[0_12px_24px_rgba(21,87,214,0.12)]">
            <CircleUserRound size={26} />
          </div>
          <div className="mt-2 flex items-center justify-center gap-1.5">
            <h2 className="break-words text-center text-[15px] font-black leading-5 text-[#06194A]">
              {ownerName || "EPH Danışmanı"}
            </h2>
            <BadgeCheck size={17} className="shrink-0 text-[#1557D6]" />
          </div>
          <p className="mt-0.5 text-center text-[10px] font-black uppercase tracking-[0.12em] text-[#64748B]">
            {unit.project?.owner?.role || "Gayrimenkul Danışmanı"}
          </p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <Link
              href="/messages"
              className="flex min-h-[48px] flex-col items-center justify-center gap-1 rounded-[16px] bg-[#EFF6FF] text-[11px] font-black text-[#1557D6]"
            >
              <MessageCircle size={18} />
              Mesaj
            </Link>
            <button
              type="button"
              onClick={handleNativeShare}
              className="flex min-h-[48px] flex-col items-center justify-center gap-1 rounded-[16px] bg-[#EFF6FF] text-[11px] font-black text-[#1557D6]"
            >
              <ExternalLink size={18} />
              Ara
            </button>
            <button
              type="button"
              onClick={handleOpenShareModal}
              className="flex min-h-[48px] flex-col items-center justify-center gap-1 rounded-[16px] bg-emerald-500 text-[11px] font-black text-white shadow-[0_12px_22px_rgba(16,185,129,0.22)]"
            >
              <Share2 size={18} />
              WhatsApp
            </button>
          </div>
        </section>

        {canEditPortfolio && managementOpen && (
          <section className="mt-3 rounded-[22px] border border-[#DDE7F3] bg-white p-3 text-center shadow-[0_10px_24px_rgba(15,23,42,0.045)]">
            <div className="flex items-center justify-center gap-2 text-[#1557D6]">
              <Camera size={17} />
              <h2 className="text-[16px] font-black text-[#06194A]">
                Fotoğraf Yönetimi
              </h2>
            </div>

            <button
              type="button"
              onClick={() => galleryInputRef.current?.click()}
              disabled={
                imageUploadLoading === "gallery" ||
                galleryImages.length >= MAX_GALLERY_COUNT
              }
              className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-[16px] bg-[#1557D6] px-3 text-[12px] font-black text-white disabled:opacity-60"
            >
              <Upload size={16} />
              {imageUploadLoading === "gallery"
                ? "Fotoğraf yükleniyor..."
                : `Fotoğraf Ekle (${galleryImages.length}/${MAX_GALLERY_COUNT})`}
            </button>

            {galleryImages.length === 0 ? (
              <div className="mt-3 rounded-[18px] border border-dashed border-[#DDE7F3] bg-[#F7FBFF] px-3 py-4 text-center text-[11px] font-bold leading-5 text-[#64748B]">
                Bu portföyde henüz fotoğraf yok. İlk eklenen fotoğraf otomatik kapak görseli olarak kullanılacaktır.
              </div>
            ) : (
              <div className="mt-3 grid grid-cols-2 gap-2">
                {galleryImages.map((photo, index) => {
                  const loadingCover = imageActionLoading === `cover-${photo.id}`;
                  const loadingDelete = imageActionLoading === `delete-${photo.id}`;
                  const loadingMove = imageActionLoading === `move-${photo.id}`;
                  const deleteDisabled = Boolean(
                    loadingDelete ||
                      loadingMove ||
                      loadingCover ||
                      (photo.isCover && galleryImages.length > 1),
                  );

                  return (
                    <div
                      key={photo.id || photo.displayUrl}
                      className={`overflow-hidden rounded-[18px] border bg-[#FBFDFF] text-left ${
                        photo.isCover
                          ? "border-emerald-200 ring-2 ring-emerald-50"
                          : "border-[#DDE7F3]"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setActivePhoto(index)}
                        className="relative h-[104px] w-full overflow-hidden bg-[#EEF5FF]"
                      >
                        <img
                          src={photo.displayUrl}
                          alt={`Portföy fotoğrafı ${index + 1}`}
                          className="h-full w-full object-cover"
                        />
                        <span
                          className={`absolute left-2 top-2 rounded-full px-2 py-1 text-[9px] font-black text-white ${
                            photo.isCover ? "bg-emerald-600" : "bg-[#06194A]/80"
                          }`}
                        >
                          {photo.isCover ? "Kapak" : `Foto ${index + 1}`}
                        </span>
                      </button>

                      <div className="p-2">
                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleSetCoverImage(photo.id)}
                            disabled={Boolean(photo.isCover || loadingCover || loadingMove || loadingDelete)}
                            className="min-h-[34px] rounded-[12px] bg-emerald-50 px-2 text-[10px] font-black text-emerald-700 disabled:bg-slate-100 disabled:text-slate-400"
                          >
                            {loadingCover ? "..." : photo.isCover ? "Kapak" : "Kapak Yap"}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              if (photo.isCover && galleryImages.length > 1) {
                                setActionError("Kapak fotoğrafını silmeden önce başka bir fotoğrafı kapak yapın.");
                                return;
                              }
                              if (confirm("Bu fotoğraf silinsin mi?")) handleDeleteImage(photo.id);
                            }}
                            disabled={deleteDisabled && !(photo.isCover && galleryImages.length > 1)}
                            className="min-h-[34px] rounded-[12px] bg-rose-50 px-2 text-[10px] font-black text-rose-700 disabled:bg-slate-100 disabled:text-slate-400"
                          >
                            {loadingDelete ? "..." : "Sil"}
                          </button>
                        </div>

                        <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleMoveImage(photo.id, "up")}
                            disabled={index === 0 || loadingMove}
                            className="min-h-[30px] rounded-[12px] border border-[#DDE7F3] bg-white px-2 text-[10px] font-black text-[#1557D6] disabled:opacity-40"
                          >
                            ↑ Sola
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveImage(photo.id, "down")}
                            disabled={index === galleryImages.length - 1 || loadingMove}
                            className="min-h-[30px] rounded-[12px] border border-[#DDE7F3] bg-white px-2 text-[10px] font-black text-[#1557D6] disabled:opacity-40"
                          >
                            Sağa ↓
                          </button>
                        </div>

                        {photo.isCover && (
                          <p className="mt-1.5 text-center text-[9px] font-black text-emerald-700">
                            Listede ve paylaşım kartında bu görsel kullanılır.
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {canEditPortfolio && isDirectPoolPublisher && (
          <section className="mt-3 rounded-[22px] border border-blue-200 bg-gradient-to-br from-blue-50 via-white to-emerald-50 p-3 text-center shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-[16px] bg-[#1557D6] text-white shadow-[0_10px_22px_rgba(21,87,214,0.22)]">
              <Send size={18} />
            </div>
            <h2 className="mt-2 text-[16px] font-black text-[#06194A]">
              Kurumsal Doğrudan Yayın
            </h2>
            <p className="mx-auto mt-1 max-w-[350px] text-[11px] font-bold leading-5 text-[#64748B]">
              Müteahhit ve İnşaat Firması portföyleri belge ve yönetici onayı beklemeden doğrudan havuzda yayınlanır.
            </p>
            <button
              type="button"
              onClick={handleSubmitApproval}
              disabled={Boolean(approvalActionLoading)}
              className="mt-3 flex min-h-[46px] w-full items-center justify-center gap-2 rounded-[16px] bg-[#1557D6] px-3 text-[12px] font-black text-white shadow-[0_12px_24px_rgba(21,87,214,0.20)] disabled:opacity-60"
            >
              {approvalActionLoading === "DIRECT_POOL" ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                <Send size={16} />
              )}
              {approvalActionLoading === "DIRECT_POOL"
                ? "Havuzda Yayınlanıyor..."
                : "Doğrudan Havuza Yayınla"}
            </button>
          </section>
        )}

        {!isDirectPoolPublisher &&
          (canEditPortfolio || canReviewPortfolio) && (
            <PortfolioDocumentsCenter
              unit={unit}
              documents={portfolioDocuments}
              canEditPortfolio={canEditPortfolio}
              canReviewPortfolio={canReviewPortfolio}
              canSubmitReviewAsSoftwareTeam={
                String(user?.role || "").toUpperCase() === "SUPER_ADMIN"
              }
              documentUploadLoading={documentUploadLoading}
              documentDeleteLoading={documentDeleteLoading}
              documentReviewLoading={documentReviewLoading}
              approvalActionLoading={approvalActionLoading}
              onUploadYetki={() => yetkiDocumentInputRef.current?.click()}
              onUploadTapu={() => tapuDocumentInputRef.current?.click()}
              onDeleteDocument={handleDeleteDocument}
              onReviewDocument={openDocumentReviewDialog}
              onSubmitApproval={handleSubmitApproval}
              onCreateAuthorityLetter={() => setAuthorityLetterOpen(true)}
            />
          )}

        {canEditPortfolio && (
          <section className="mt-2 rounded-[20px] border border-rose-100 bg-white p-2 text-center shadow-[0_10px_24px_rgba(15,23,42,0.045)]">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => router.push(`/portfoy?edit=${unit.id}`)}
                className="h-9 w-full rounded-[14px] bg-[#EFF6FF] text-[12px] font-black text-[#1557D6]"
              >
                Tüm Bilgileri Güncelle
              </button>
              <button
                onClick={() => {
                  setActionError("");
                  setDeleteOpen(true);
                }}
                className="h-9 w-full rounded-[14px] bg-rose-50 text-[12px] font-black text-rose-700"
              >
                Sil
              </button>
            </div>
          </section>
        )}
      </section>

      {galleryOpen && galleryImages.length > 0 && (
        <div className="fixed inset-0 z-[10001] bg-[#06194A]/92 p-4 backdrop-blur-xl">
          <div className="mx-auto flex h-full max-w-7xl flex-col">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-white/60">
                  Portföy Galerisi
                </p>
                <h2 className="mt-1 text-xl font-black text-white">
                  Fotoğraf {activePhoto + 1} / {galleryImages.length}
                </h2>
              </div>
              <button
                onClick={() => setGalleryOpen(false)}
                className="flex h-12 w-12 items-center justify-center rounded-[20px] border border-white/20 bg-white/10 text-white"
                aria-label="Galeriyi kapat"
              >
                <X size={21} />
              </button>
            </div>
            <div
              className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-[32px] bg-transparent"
              onTouchStart={(event) =>
                setTouchStartX(event.touches[0]?.clientX || null)
              }
              onTouchEnd={handleGalleryTouchEnd}
            >
              <img
                src={activeGalleryImage}
                alt="Büyük portföy fotoğrafı"
                className="max-h-[calc(100dvh-190px)] w-full rounded-[24px] object-contain"
              />
              {galleryImages.length > 1 && (
                <>
                  <button
                    onClick={() =>
                      setActivePhoto((current) =>
                        current === 0 ? galleryImages.length - 1 : current - 1,
                      )
                    }
                    className="absolute left-4 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[#06194A]"
                    aria-label="Önceki fotoğraf"
                  >
                    <ChevronLeft size={24} />
                  </button>
                  <button
                    onClick={() =>
                      setActivePhoto((current) =>
                        current === galleryImages.length - 1 ? 0 : current + 1,
                      )
                    }
                    className="absolute right-4 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[#06194A]"
                    aria-label="Sonraki fotoğraf"
                  >
                    <ChevronRight size={24} />
                  </button>
                </>
              )}
            </div>
            <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
              {galleryImages.map((photo, index) => (
                <button
                  key={photo.id || photo.displayUrl}
                  onClick={() => setActivePhoto(index)}
                  className={`relative h-20 w-24 shrink-0 overflow-hidden rounded-[18px] border ${activePhoto === index ? "border-white" : "border-white/20 opacity-70"}`}
                >
                  <img
                    src={photo.displayUrl}
                    alt={`Küçük fotoğraf ${index + 1}`}
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {deleteOpen && (
        <div className="fixed inset-0 z-[10003] flex items-center justify-center bg-[#06194A]/70 p-4 backdrop-blur-xl">
          <div className="w-full max-w-lg rounded-[34px] border border-[#DDE7F3] bg-white p-6 text-center shadow-[0_30px_90px_rgba(15,23,42,0.22)]">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[22px] bg-rose-50 text-rose-700">
              <FileText size={24} />
            </div>
            <h2 className="mt-4 text-2xl font-black tracking-[-0.04em] text-[#06194A]">
              Portföyü silmek istiyor musunuz?
            </h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-[#64748B]">
              Bu portföy kalıcı olarak silinecek. Bu işlem geri alınamaz.
            </p>
            {actionError && (
              <div className="mt-4 rounded-[22px] border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-black text-rose-700">
                {actionError}
              </div>
            )}
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <button
                onClick={() => setDeleteOpen(false)}
                className="min-h-[52px] rounded-[20px] border border-[#DDE7F3] bg-white px-5 py-3 text-sm font-black text-[#475569]"
                disabled={actionLoading}
              >
                Vazgeç
              </button>
              <button
                onClick={handleDeleteUnit}
                className="min-h-[52px] rounded-[20px] bg-rose-600 px-5 py-3 text-sm font-black text-white disabled:opacity-60"
                disabled={actionLoading}
              >
                {actionLoading ? "Siliniyor..." : "Evet, Portföyü Sil"}
              </button>
            </div>
          </div>
        </div>
      )}

      {documentReviewDialog && (
        <DocumentReviewModal
          dialog={documentReviewDialog}
          note={documentReviewNote}
          error={documentReviewError}
          loading={Boolean(documentReviewLoading)}
          onNoteChange={setDocumentReviewNote}
          onClose={closeDocumentReviewDialog}
          onSubmit={handleDocumentReviewSubmit}
        />
      )}

      <PortfolioShareModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        data={shareData}
      />






      <EphAuthorityLetterModal
  	open={authorityLetterOpen}
  	unitId={unit.id}
  	defaultOwnerName={(unit as any)?.deedOwnerFullName || ""}
  	defaultOwnerPhone={(unit as any)?.deedOwnerPhone || ""}
  	defaultOwnerEmail={(unit as any)?.deedOwnerEmail || ""}
  	onClose={() => setAuthorityLetterOpen(false)}
  	onCreated={() => fetchPortfolioDocuments(unit.id)}
	/>






    </main>
  );
}



function DocumentReviewModal({
  dialog,
  note,
  error,
  loading,
  onNoteChange,
  onClose,
  onSubmit,
}: {
  dialog: DocumentReviewDialogState;
  note: string;
  error: string;
  loading: boolean;
  onNoteChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const config: Record<
    DocumentReviewAction,
    {
      title: string;
      description: string;
      buttonLabel: string;
      buttonClass: string;
      noteRequired: boolean;
    }
  > = {
    APPROVE: {
      title: `${dialog.label} Onayı`,
      description:
        "Belgeyi okunabilirlik, kişi/taşınmaz bilgileri ve geçerlilik açısından kontrol ettiğinizi doğrulayın.",
      buttonLabel: "Belgeyi Onayla",
      buttonClass: "bg-emerald-600 text-white",
      noteRequired: false,
    },
    REJECT: {
      title: `${dialog.label} Reddi`,
      description:
        "Belge uygun değilse açık ve kullanıcı tarafından anlaşılabilir bir red gerekçesi yazın.",
      buttonLabel: "Belgeyi Reddet",
      buttonClass: "bg-rose-600 text-white",
      noteRequired: true,
    },
    REQUEST_REUPLOAD: {
      title: "Yeniden Belge İste",
      description:
        "Eksik, okunmayan veya yanlış belge için kullanıcıdan yeni dosya isteme nedenini yazın.",
      buttonLabel: "Yeniden Yükleme İste",
      buttonClass: "bg-orange-600 text-white",
      noteRequired: true,
    },
  };

  const current = config[dialog.action];

  return (
    <div className="fixed inset-0 z-[10020] flex items-end justify-center bg-[#06194A]/72 px-3 pt-3 backdrop-blur-md sm:items-center sm:p-4">
      <section
        className="max-h-[calc(100dvh-16px)] w-full max-w-lg overflow-y-auto rounded-t-[28px] border border-[#DDE7F3] bg-white px-4 pt-4 shadow-[0_30px_90px_rgba(15,23,42,0.28)] sm:max-h-[calc(100dvh-32px)] sm:rounded-[30px] sm:p-5"
        style={{
          paddingBottom: "max(16px, env(safe-area-inset-bottom))",
        }}
      >
        <div className="mx-auto h-1.5 w-14 rounded-full bg-slate-200 sm:hidden" />

        <div className="mt-3 flex items-start justify-between gap-3 sm:mt-0">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#1557D6]">
              Belge Kararı
            </p>
            <h2 className="mt-1 break-words text-[20px] font-black leading-6 text-[#06194A]">
              {current.title}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 disabled:opacity-50"
            aria-label="Belge karar penceresini kapat"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-3 rounded-[18px] border border-[#DDE7F3] bg-[#F8FAFC] px-3 py-3 text-center">
          <p className="break-words text-[12px] font-black text-[#06194A]">
            {dialog.document.fileName || dialog.label}
          </p>
          <p className="mt-1 text-[10px] font-bold leading-4 text-[#64748B]">
            {current.description}
          </p>
        </div>

        <label className="mt-3 block">
          <span className="block text-center text-[11px] font-black text-[#27364F]">
            İnceleme Notu {current.noteRequired ? "· Zorunlu" : "· İsteğe Bağlı"}
          </span>
          <textarea
            value={note}
            onChange={(event) => onNoteChange(event.target.value)}
            maxLength={1000}
            rows={5}
            placeholder={
              current.noteRequired
                ? "Kullanıcının neyi düzeltmesi gerektiğini açıkça yazın..."
                : "İsterseniz onay notu ekleyin..."
            }
            className="mt-2 min-h-[120px] w-full resize-none rounded-[18px] border border-[#C7D6E8] bg-[#EEF3F8] px-3 py-3 text-[13px] font-semibold leading-5 text-[#27364F] outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-blue-100"
          />
          <span className="mt-1 block text-right text-[9px] font-bold text-slate-400">
            {note.length}/1000
          </span>
        </label>

        {error && (
          <div className="mt-2 rounded-[16px] border border-rose-100 bg-rose-50 px-3 py-2 text-center text-[11px] font-black leading-4 text-rose-700">
            {error}
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="min-h-[48px] rounded-[16px] border border-[#DDE7F3] bg-white px-3 text-[12px] font-black text-[#475569] disabled:opacity-50"
          >
            Vazgeç
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={loading}
            className={`flex min-h-[48px] items-center justify-center gap-2 rounded-[16px] px-3 text-[12px] font-black shadow-sm disabled:opacity-60 ${current.buttonClass}`}
          >
            {loading && <Loader2 className="animate-spin" size={16} />}
            {loading ? "İşleniyor..." : current.buttonLabel}
          </button>
        </div>
      </section>
    </div>
  );
}


function PortfolioDetailInfoCenter({
  unit,
  canSeeDoorAccessInfo,
  doorAccessInfo,
  availableCreditAmount,
}: {
  unit: DetailUnit;
  canSeeDoorAccessInfo: boolean;
  doorAccessInfo: string;
  availableCreditAmount: number;
}) {
  const isLand = isLandDetailType(unit.type);
  const deedOwnerFullName = String((unit as any)?.deedOwnerFullName || "").trim();
  const deedOwnerPhone = String((unit as any)?.deedOwnerPhone || "").trim();
  const deedOwnerEmail = String((unit as any)?.deedOwnerEmail || "").trim();
  const netArea = getDetailValue(unit, ["netArea", "netM2", "netMetrekare"], "");
  const buildingAge = getDetailValue(unit, ["buildingAge", "buildingAgeLabel", "age"], "");
  const heating = getDetailValue(unit, ["heating", "heatingType", "isinma", "heatingSystem"], "");
  const parking = getDetailValue(unit, ["parking", "parkingType", "otopark"], "");
  const frontage = getDetailValue(unit, ["frontage", "cephe", "yolaCephe"], "");
  const zoningStatus = getDetailValue(unit, ["zoningStatus", "imarDurumu"], "");
  const kaks = getDetailValue(unit, ["kaks", "emsal"], "");
  const allowedFloors = getDetailValue(unit, ["allowedFloors", "katIzni"], "");
  const infrastructure = getDetailValue(unit, ["infrastructure", "altyapi"], "");
  const blockNo = getDetailValue(unit, ["blockNo", "blokNo"], "");
  const siteName = getDetailValue(unit, ["siteName", "siteAdi"], "");

  const baseRows = [
    { label: "Portföy Tipi", value: typeLabel(unit.type) },
    { label: "Durum", value: statusLabel(unit.status) },
    { label: "Fiyat", value: formatMoney(unit.price, unit.priceCurrency) },
    { label: "Bina Yaşı", value: buildingAge },
    { label: "Brüt Alan", value: formatAreaValue(unit.area) },
    { label: "Net Alan", value: netArea },
    { label: "Oda", value: unit.roomCount || "" },
    { label: "Kat", value: formatFloorInfo(unit) },
    { label: "Isınma", value: heating },
    { label: "Otopark", value: parking },
    { label: "Kayıt Tarihi", value: formatDate(unit.createdAt) },
  ].filter((item) => isDisplayableDetailValue(item.value));

  const landRows = [
    { label: "Ada / Parsel", value: formatAdaParselValue(unit) },
    { label: "Ada No", value: String((unit as any)?.adaNo || "").trim() },
    { label: "Parsel No", value: String((unit as any)?.parselNo || "").trim() },
    { label: "İmar Durumu", value: zoningStatus },
    { label: "Emsal", value: kaks },
    { label: "Kat İzni", value: allowedFloors },
    { label: "Cephe", value: frontage },
    { label: "Altyapı", value: infrastructure },
  ].filter((item) => isDisplayableDetailValue(item.value));

  const residenceRows = [
    { label: "Ada / Parsel", value: formatAdaParselValue(unit) },
    { label: "Blok", value: blockNo },
    { label: "Site", value: siteName },
    { label: "Bulunduğu Kat", value: unit.floorLabel || (unit.floor != null ? `${unit.floor}. Kat` : "") },
    { label: "Toplam Kat", value: unit.totalFloors ? `${unit.totalFloors} Kat` : "" },
    { label: "Cephe", value: frontage },
  ].filter((item) => isDisplayableDetailValue(item.value));

  const deedRows = [
    { label: "Malik", value: deedOwnerFullName },
    { label: "Telefon", value: deedOwnerPhone },
    { label: "E-posta", value: deedOwnerEmail },
    {
      label: "Krediye Uygun Tutar",
      value: availableCreditAmount
        ? `${availableCreditAmount.toLocaleString("tr-TR")} ₺`
        : "",
    },
    {
      label: "Kapı / Anahtar Notu",
      value: canSeeDoorAccessInfo ? doorAccessInfo : "",
    },
  ].filter((item) => isDisplayableDetailValue(item.value));

  return (
    <section className="mt-2 rounded-[22px] border border-[#DDE7F3] bg-white p-3 text-center shadow-[0_14px_30px_rgba(15,23,42,0.06)]">
      <PremiumSectionHeading icon={<FileText size={18} />} title="Portföy Bilgileri" />

      <div className="mt-3 grid grid-cols-2 gap-2">
        {baseRows.map((item) => (
          <InfoRow key={`${item.label}-${item.value}`} label={item.label} value={item.value} />
        ))}
      </div>

      <div className="mt-3 rounded-[20px] border border-[#E8F0FA] bg-[#FBFDFF] p-2.5">
        <p className="text-center text-[12px] font-black text-[#06194A]">
          {isLand ? "Ada / Parsel ve İmar Bilgileri" : "Konum / Kat / Blok Bilgileri"}
        </p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {(isLand ? landRows : residenceRows).map((item, index, array) => {
            const isLastOdd = array.length % 2 === 1 && index === array.length - 1;

            return (
              <div
                key={`${item.label}-${item.value}`}
                className={isLastOdd ? "col-span-2 flex justify-center" : ""}
              >
                <div className={isLastOdd ? "w-[48%] min-w-[150px] max-w-[210px]" : "w-full"}>
                  <InfoRow label={item.label} value={item.value} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {deedRows.length > 0 && (
        <div className="mt-3 rounded-[20px] border border-[#E8F0FA] bg-[#F8FAFC] p-2.5">
          <p className="text-center text-[12px] font-black text-[#06194A]">
            Malik / Erişim Bilgileri
          </p>
          <div className="mt-2 grid grid-cols-1 gap-2">
            {deedRows.map((item) => (
              <InfoRow key={`${item.label}-${item.value}`} label={item.label} value={item.value} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}


function PortfolioDocumentsCenter({
  unit,
  documents,
  canEditPortfolio,
  canReviewPortfolio,
  canSubmitReviewAsSoftwareTeam,
  documentUploadLoading,
  documentDeleteLoading,
  documentReviewLoading,
  approvalActionLoading,
  onUploadYetki,
  onUploadTapu,
  onDeleteDocument,
  onReviewDocument,
  onSubmitApproval,
  onCreateAuthorityLetter,
}: {
  unit: DetailUnit;
  documents: PortfolioAuthorityDocument[];
  canEditPortfolio: boolean;
  canReviewPortfolio: boolean;
  canSubmitReviewAsSoftwareTeam: boolean;
  documentUploadLoading: string;
  documentDeleteLoading: string;
  documentReviewLoading: string;
  approvalActionLoading: string;
  onUploadYetki: () => void;
  onUploadTapu: () => void;
  onDeleteDocument: (documentId?: string) => void;
  onReviewDocument: (
    document: PortfolioAuthorityDocument,
    label: string,
    action: DocumentReviewAction,
  ) => void;
  onSubmitApproval: () => void;
  onCreateAuthorityLetter: () => void;
}) {
  const yetkiDocument = findPortfolioDocument(documents, "YETKI_BELGESI");
  const tapuDocument = findPortfolioDocument(documents, "TAPU");
  const hasRequiredDocuments = Boolean(yetkiDocument && tapuDocument);
  const approvalStatus = String(unit.approvalStatus || "TASLAK").toUpperCase();
  const isSubmittedForApproval = [
    "INCELEMEYE_GONDERILDI",
    "INCELEMEDE",
  ].includes(approvalStatus);
  const isApprovedForPool = approvalStatus === "ONAYLANDI";
  const isInPool = approvalStatus === "HAVUZDA";
  const isReviewerMode = canReviewPortfolio;
  const canSoftwareTeamSubmitReview =
    canSubmitReviewAsSoftwareTeam &&
    !isSubmittedForApproval &&
    !isApprovedForPool &&
    !isInPool;
  const submitDisabled =
    !hasRequiredDocuments ||
    Boolean(approvalActionLoading) ||
    isSubmittedForApproval ||
    isApprovedForPool ||
    isInPool;

  return (
    <section className="mt-3 rounded-[22px] border border-[#DDE7F3] bg-white p-3 shadow-[0_10px_24px_rgba(15,23,42,0.045)]">
      <div className="flex items-center justify-center gap-2 text-[#1557D6]">
        <FileText size={17} />
        <h2 className="text-center text-[16px] font-black text-[#06194A]">
          {isReviewerMode ? "Belge İnceleme Merkezi" : "Belge Yükleme Merkezi"}
        </h2>
      </div>

      <p className="mx-auto mt-1 max-w-[360px] text-center text-[11px] font-bold leading-5 text-[#64748B]">
        {isReviewerMode
          ? isSubmittedForApproval
            ? "Tapu ve Yetki Belgesini ayrı ayrı inceleyin; onaylayın, reddedin veya yeniden yükleme isteyin."
            : "Belge kararları yalnız portföy incelemeye gönderildiğinde verilebilir."
          : isSubmittedForApproval
            ? "Portföy incelemeye gönderildi. Yönetici belge incelemesi bekleniyor."
            : isApprovedForPool
              ? "Portföy onaylandı ve yayın işlemi için hazır."
              : isInPool
                ? "Portföy havuzda yayında."
                : "İncelemeye göndermek için Tapu ve Yetki Belgesi birlikte yüklenmelidir."}
      </p>

      {isReviewerMode && (
        <div className="mt-3 rounded-[16px] border border-blue-100 bg-blue-50 px-3 py-2 text-center text-[10px] font-black leading-4 text-blue-800">
          YÖNETİCİ İNCELEME MODU · Admin ve Moderatör belgeyi değiştiremez veya silemez.
        </div>
      )}

      {canEditPortfolio && !isReviewerMode && (
        <button
          type="button"
          onClick={onCreateAuthorityLetter}
          className="mt-3 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-[16px] bg-[#2563EB] px-3 text-[12px] font-black text-white shadow-[0_12px_24px_rgba(37,99,235,0.18)]"
        >
          <FileText size={16} />
          EPH Yetki Belgesi Oluştur
        </button>
      )}

      <div className="mt-3 grid gap-2">
        <PortfolioDocumentRow
          label={DOCUMENT_LABELS.YETKI_BELGESI}
          description="Emlakçı portföyü için zorunlu yetkilendirme evrakı"
          document={yetkiDocument}
          canEditPortfolio={canEditPortfolio}
          canReviewPortfolio={canReviewPortfolio}
          reviewEnabled={isSubmittedForApproval}
          reviewLoading={documentReviewLoading}
          uploadLoading={documentUploadLoading === "YETKI_BELGESI"}
          deleteLoading={documentDeleteLoading === yetkiDocument?.id}
          onUpload={onUploadYetki}
          onDelete={() => onDeleteDocument(yetkiDocument?.id)}
          onReview={onReviewDocument}
        />

        <PortfolioDocumentRow
          label={DOCUMENT_LABELS.TAPU}
          description="Emlakçı portföyü için zorunlu mülkiyet evrakı"
          document={tapuDocument}
          canEditPortfolio={canEditPortfolio}
          canReviewPortfolio={canReviewPortfolio}
          reviewEnabled={isSubmittedForApproval}
          reviewLoading={documentReviewLoading}
          uploadLoading={documentUploadLoading === "TAPU"}
          deleteLoading={documentDeleteLoading === tapuDocument?.id}
          onUpload={onUploadTapu}
          onDelete={() => onDeleteDocument(tapuDocument?.id)}
          onReview={onReviewDocument}
        />
      </div>

      {canEditPortfolio && !isReviewerMode && (
        <button
          type="button"
          onClick={onSubmitApproval}
          disabled={submitDisabled}
          className="mt-3 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-[16px] bg-[#06194A] px-3 text-[12px] font-black text-white disabled:bg-slate-200 disabled:text-slate-500"
        >
          <Send size={16} />
          {approvalActionLoading === "SUBMIT" ||
          approvalActionLoading === "INCELEMEYE_GONDERILDI"
            ? "Gönderiliyor..."
            : "İncelemeye Gönder"}
        </button>
      )}

      {isReviewerMode && canSoftwareTeamSubmitReview && (
        <button
          type="button"
          onClick={onSubmitApproval}
          disabled={submitDisabled}
          className="mt-3 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-[16px] bg-[#06194A] px-3 text-[12px] font-black text-white disabled:bg-slate-200 disabled:text-slate-500"
        >
          <Send size={16} />
          {approvalActionLoading === "SUBMIT" ||
          approvalActionLoading === "INCELEMEYE_GONDERILDI"
            ? "Gönderiliyor..."
            : "Yazılım Ekibi Olarak İncelemeye Gönder"}
        </button>
      )}

      {isReviewerMode && canSoftwareTeamSubmitReview && !hasRequiredDocuments && (
        <div className="mt-2 rounded-[14px] bg-amber-50 px-3 py-2 text-center text-[10px] font-black leading-4 text-amber-800">
          Yazılım Ekibi inceleme akışını başlatmadan önce Tapu ve Yetki Belgesinin ikisi de yüklenmiş olmalıdır.
        </div>
      )}

      {canEditPortfolio && !isReviewerMode && !hasRequiredDocuments && (
        <div className="mt-2 rounded-[14px] bg-amber-50 px-3 py-2 text-center text-[10px] font-black leading-4 text-amber-800">
          İnceleme için Tapu ve Yetki Belgesinin ikisi de yüklenmelidir.
        </div>
      )}
    </section>
  );
}

function PortfolioDocumentRow({
  label,
  description,
  document,
  canEditPortfolio,
  canReviewPortfolio,
  reviewEnabled,
  reviewLoading,
  uploadLoading,
  deleteLoading,
  onUpload,
  onDelete,
  onReview,
}: {
  label: string;
  description: string;
  document?: PortfolioAuthorityDocument;
  canEditPortfolio: boolean;
  canReviewPortfolio: boolean;
  reviewEnabled: boolean;
  reviewLoading: string;
  uploadLoading: boolean;
  deleteLoading: boolean;
  onUpload: () => void;
  onDelete: () => void;
  onReview: (
    document: PortfolioAuthorityDocument,
    label: string,
    action: DocumentReviewAction,
  ) => void;
}) {
  const hasDocument = Boolean(document?.fileUrl);
  const mimeType = String(document?.mimeType || "").toLowerCase();
  const fileName = String(document?.fileName || "").toLowerCase();
  const isPdf = mimeType === "application/pdf" || fileName.endsWith(".pdf");
  const isImage =
    mimeType.startsWith("image/") || /\.(jpg|jpeg|png|webp)$/i.test(fileName);
  const reviewState = getDocumentReviewState(document);
  const reviewNote = getDocumentReviewNote(document);
  const documentStatus =
    reviewState === "MISSING"
      ? "Bekliyor"
      : reviewState === "APPROVED"
        ? "Onaylandı"
        : reviewState === "REJECTED"
          ? "Reddedildi"
          : reviewState === "REUPLOAD_REQUESTED"
            ? "Yeniden Belge İstendi"
            : "İnceleme Bekliyor";
  const statusClass =
    reviewState === "MISSING"
      ? "bg-amber-50 text-amber-700"
      : reviewState === "APPROVED"
        ? "bg-emerald-50 text-emerald-700"
        : reviewState === "REJECTED"
          ? "bg-rose-100 text-rose-800"
          : reviewState === "REUPLOAD_REQUESTED"
            ? "bg-orange-50 text-orange-700"
            : "bg-blue-50 text-blue-700";
  const showReviewerPreview = canReviewPortfolio && hasDocument;
  const activeReviewLoading = Boolean(
    document?.id && reviewLoading.startsWith(`${document.id}-`),
  );

  return (
    <div className="rounded-[18px] border border-[#E8F0FA] bg-[#FBFDFF] p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[13px] font-black text-[#06194A]">{label}</p>
          <p className="mt-0.5 text-[10px] font-bold leading-4 text-[#64748B]">
            {description}
          </p>
        </div>

        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-[9px] font-black ${statusClass}`}
        >
          {documentStatus}
        </span>
      </div>

      {hasDocument && (
        <div className="mt-2 rounded-[14px] border border-[#E8F0FA] bg-white px-3 py-2 text-center">
          <p className="break-words text-[11px] font-black leading-4 text-[#06194A]">
            {document?.fileName || label}
          </p>
          <p className="mt-0.5 text-[10px] font-bold text-[#64748B]">
            {formatFileSize(document?.sizeBytes)}
          </p>
        </div>
      )}

      {reviewNote && (
        <div
          className={`mt-2 rounded-[14px] border px-3 py-2 text-center text-[10px] font-bold leading-4 ${
            reviewState === "REJECTED"
              ? "border-rose-100 bg-rose-50 text-rose-700"
              : "border-orange-100 bg-orange-50 text-orange-700"
          }`}
        >
          İnceleme notu: {reviewNote}
        </div>
      )}

      {hasDocument && <LinaDocumentPrecheckPanel document={document} />}

      {showReviewerPreview && (
        <div className="mt-2 overflow-hidden rounded-[16px] border border-[#DDE7F3] bg-white">
          <div className="border-b border-[#E8F0FA] bg-[#F8FAFC] px-3 py-2 text-center text-[10px] font-black text-[#475569]">
            SALT OKUNUR BELGE ÖNİZLEMESİ
          </div>

          {isImage ? (
            <div className="flex max-h-[360px] min-h-[220px] items-center justify-center overflow-auto bg-[#EEF3F8] p-2">
              <img
                src={document?.fileUrl}
                alt={`${label} önizlemesi`}
                className="max-h-[340px] w-full rounded-[12px] object-contain"
              />
            </div>
          ) : isPdf ? (
            <iframe
              title={`${label} PDF önizlemesi`}
              src={`${document?.fileUrl}#toolbar=0&navpanes=0`}
              className="h-[360px] w-full border-0 bg-white"
            />
          ) : (
            <div className="flex min-h-[120px] items-center justify-center px-4 py-6 text-center text-[11px] font-bold leading-5 text-[#64748B]">
              Bu dosya türü tarayıcı içinde önizlenemiyor. Belgeyi yeni sekmede açın.
            </div>
          )}
        </div>
      )}

      <div
        className={`mt-2 grid gap-2 ${
          canEditPortfolio && !canReviewPortfolio ? "grid-cols-3" : "grid-cols-1"
        }`}
      >
        {canEditPortfolio && !canReviewPortfolio && (
          <button
            type="button"
            onClick={onUpload}
            disabled={uploadLoading}
            className="flex min-h-[38px] items-center justify-center gap-1 rounded-[14px] bg-[#1557D6] px-2 text-[10px] font-black text-white disabled:opacity-60"
          >
            <Upload size={14} />
            {uploadLoading ? "..." : hasDocument ? "Yenile" : "Yükle"}
          </button>
        )}

        {hasDocument && (
          <a
            href={document?.fileUrl}
            target="_blank"
            rel="noreferrer"
            className="flex min-h-[38px] items-center justify-center gap-1 rounded-[14px] border border-[#DDE7F3] bg-white px-2 text-center text-[10px] font-black text-[#1557D6]"
          >
            <ExternalLink size={14} />
            Belgeyi Yeni Sekmede Aç
          </a>
        )}

        {canEditPortfolio && !canReviewPortfolio && hasDocument && (
          <button
            type="button"
            onClick={onDelete}
            disabled={deleteLoading}
            className="flex min-h-[38px] items-center justify-center gap-1 rounded-[14px] bg-rose-50 px-2 text-[10px] font-black text-rose-700 disabled:opacity-60"
          >
            <Trash2 size={14} />
            {deleteLoading ? "..." : "Sil"}
          </button>
        )}

        {!hasDocument && !canEditPortfolio && (
          <div className="flex min-h-[38px] items-center justify-center rounded-[14px] bg-white px-2 text-[10px] font-black text-[#64748B]">
            Belge yüklenmemiş
          </div>
        )}
      </div>

      {canReviewPortfolio && hasDocument && document && (
        <div className="mt-2 grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={() => onReview(document, label, "APPROVE")}
            disabled={
              !reviewEnabled ||
              activeReviewLoading ||
              reviewState === "APPROVED"
            }
            className="flex min-h-[40px] items-center justify-center gap-1 rounded-[14px] bg-emerald-50 px-1.5 text-[10px] font-black text-emerald-700 disabled:opacity-45"
          >
            {activeReviewLoading ? (
              <Loader2 className="animate-spin" size={14} />
            ) : (
              <CheckCircle2 size={14} />
            )}
            Onayla
          </button>

          <button
            type="button"
            onClick={() => onReview(document, label, "REJECT")}
            disabled={!reviewEnabled || activeReviewLoading}
            className="flex min-h-[40px] items-center justify-center gap-1 rounded-[14px] bg-rose-50 px-1.5 text-[10px] font-black text-rose-700 disabled:opacity-45"
          >
            <XCircle size={14} />
            Reddet
          </button>

          <button
            type="button"
            onClick={() => onReview(document, label, "REQUEST_REUPLOAD")}
            disabled={!reviewEnabled || activeReviewLoading}
            className="flex min-h-[40px] items-center justify-center gap-1 rounded-[14px] bg-orange-50 px-1 text-[9px] font-black text-orange-700 disabled:opacity-45"
          >
            <RotateCcw size={13} />
            Yeniden İste
          </button>
        </div>
      )}

      {canReviewPortfolio && hasDocument && !reviewEnabled && (
        <div className="mt-2 rounded-[14px] bg-slate-100 px-3 py-2 text-center text-[9px] font-black leading-4 text-slate-500">
          Karar butonları, portföy incelemeye gönderildiğinde aktif olur.
        </div>
      )}
    </div>
  );
}


function PortfolioApprovalCenter({
  unit,
  documents,
  galleryImageCount,
  canReviewPortfolio,
  approvalActionLoading,
  onApprovalAction,
}: {
  unit: DetailUnit;
  documents: PortfolioAuthorityDocument[];
  galleryImageCount: number;
  canReviewPortfolio: boolean;
  approvalActionLoading: string;
  onApprovalAction: (
    nextStatus:
      | "INCELEMEDE"
      | "EKSIK_BILGI_BEKLENIYOR"
      | "ONAYLANDI"
      | "REDDEDILDI",
  ) => void;
}) {
  const approvalStatus = String(
    unit.approvalStatus || "TASLAK",
  ).toUpperCase();
  const poolVisible = Boolean(
    unit.isPoolVisible || approvalStatus === "HAVUZDA",
  );
  const score = calculatePortfolioScore(unit);
  const scoreLabel = getPortfolioScoreLabel(score);
  const requiredDocuments = getRequiredDocumentApprovalState(documents);
  const isReviewable = [
    "INCELEMEYE_GONDERILDI",
    "INCELEMEDE",
  ].includes(approvalStatus);
  const canApproveAndPublish =
    isReviewable && requiredDocuments.allRequiredApproved;
  const isPublished = poolVisible || approvalStatus === "HAVUZDA";

  const statusConfig: Record<
    string,
    {
      label: string;
      className: string;
    }
  > = {
    TASLAK: {
      label: "Taslak",
      className: "bg-slate-100 text-slate-700",
    },
    BELGE_BEKLENIYOR: {
      label: "Belge Bekleniyor",
      className: "bg-amber-100 text-amber-700",
    },
    INCELEMEYE_GONDERILDI: {
      label: "İncelemeye Gönderildi",
      className: "bg-blue-100 text-blue-700",
    },
    INCELEMEDE: {
      label: "İncelemede",
      className: "bg-indigo-100 text-indigo-700",
    },
    EKSIK_BILGI_BEKLENIYOR: {
      label: "Eksik Bilgi",
      className: "bg-orange-100 text-orange-700",
    },
    ONAYLANDI: {
      label: "Onaylandı",
      className: "bg-emerald-100 text-emerald-700",
    },
    HAVUZDA: {
      label: "Havuzda",
      className: "bg-green-100 text-green-700",
    },
    REDDEDILDI: {
      label: "Reddedildi",
      className: "bg-rose-100 text-rose-700",
    },
  };

  const summaryItems = [
    {
      label: "Yetki",
      active: requiredDocuments.hasApprovedYetki,
    },
    {
      label: "Tapu",
      active: requiredDocuments.hasApprovedTapu,
    },
    {
      label: "Fotoğraf",
      active: Boolean(unit.photoVerified || galleryImageCount > 0),
    },
    {
      label: "Havuz",
      active: poolVisible,
    },
  ];

  const currentStatusConfig =
    statusConfig[approvalStatus] || statusConfig["TASLAK"];

  const buttonBase =
    "min-h-[42px] rounded-[14px] px-2 text-[10px] font-black disabled:cursor-not-allowed disabled:opacity-45";

  return (
    <section className="mt-3 rounded-[22px] border border-[#C7D6E8] bg-white p-3 text-center shadow-[0_10px_24px_rgba(15,23,42,0.055)]">
      <div className="flex flex-col items-center justify-center gap-1 text-center">
        <p className="text-center text-[10px] font-black uppercase tracking-[0.20em] text-[#1557D6]">
          Portföy Kalitesi
        </p>
        <h2 className="break-words text-center text-[18px] font-black leading-[22px] text-[#06194A]">
          {score}/100 · {scoreLabel}
        </h2>
        <span
          className={`mt-1 inline-flex shrink-0 items-center justify-center rounded-full px-3 py-1.5 text-center text-[10px] font-black ${currentStatusConfig.className}`}
        >
          {currentStatusConfig.label}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-4 gap-1.5">
        {summaryItems.map((item) => (
          <div
            key={item.label}
            className={`rounded-[14px] border px-1.5 py-2 text-center ${
              item.active
                ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                : "border-[#E8F0FA] bg-[#F7FBFF] text-[#64748B]"
            }`}
          >
            <p className="text-[9px] font-black">{item.label}</p>
            <p className="mt-0.5 text-[10px] font-black">
              {item.active ? "Onaylı" : "Bekliyor"}
            </p>
          </div>
        ))}
      </div>

      {unit.approvalNote && (
        <div className="mt-2 rounded-[14px] bg-amber-50 px-3 py-2 text-[11px] font-bold leading-5 text-amber-800">
          {unit.approvalNote}
        </div>
      )}

      {canReviewPortfolio &&
        isReviewable &&
        !requiredDocuments.allRequiredApproved && (
          <div className="mt-2 rounded-[14px] border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] font-black leading-4 text-amber-800">
            Onayla ve Yayınla kilitli · Tapu ve Yetki Belgesinin ikisi de
            ayrı ayrı onaylanmalıdır.
          </div>
        )}

      {canReviewPortfolio && (
        <div className="mt-3 grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => onApprovalAction("INCELEMEDE")}
            disabled={
              Boolean(approvalActionLoading) ||
              !isReviewable ||
              approvalStatus === "INCELEMEDE"
            }
            className={`${buttonBase} bg-[#EFF6FF] text-[#1557D6]`}
          >
            {approvalActionLoading === "INCELEMEDE" ? "..." : "İncele"}
          </button>

          <button
            type="button"
            onClick={() =>
              onApprovalAction("EKSIK_BILGI_BEKLENIYOR")
            }
            disabled={Boolean(approvalActionLoading) || !isReviewable}
            className={`${buttonBase} bg-amber-50 text-amber-700`}
          >
            {approvalActionLoading === "EKSIK_BILGI_BEKLENIYOR"
              ? "..."
              : "Eksik Bilgi İste"}
          </button>

          <button
            type="button"
            onClick={() => onApprovalAction("ONAYLANDI")}
            disabled={
              Boolean(approvalActionLoading) ||
              !canApproveAndPublish ||
              isPublished
            }
            className={`${buttonBase} bg-emerald-600 text-white`}
          >
            {approvalActionLoading === "ONAYLANDI"
              ? "Yayınlanıyor..."
              : isPublished
                ? "Yayınlandı"
                : "Onayla ve Yayınla"}
          </button>

          <button
            type="button"
            onClick={() => onApprovalAction("REDDEDILDI")}
            disabled={Boolean(approvalActionLoading) || !isReviewable}
            className={`${buttonBase} bg-rose-50 text-rose-700`}
          >
            {approvalActionLoading === "REDDEDILDI" ? "..." : "Portföyü Reddet"}
          </button>
        </div>
      )}
    </section>
  );
}

function InfoBox({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-h-[86px] w-[calc(25%_-_5px)] min-w-[72px] flex-col items-center justify-center rounded-[18px] border border-[#D9E5F3] bg-[#F8FBFF] px-1.5 py-2 text-center text-[#06194A] shadow-[0_8px_18px_rgba(15,23,42,0.055)]">
      <div className="text-[#1557D6]">{icon}</div>
      <p className="mt-1 break-words text-[16px] font-black leading-tight tracking-[-0.04em]">
        {value}
      </p>
      <p className="mt-0.5 text-[8px] font-black uppercase leading-3 tracking-[0.08em] text-[#64748B]">
        {label}
      </p>
    </div>
  );
}

function PremiumSectionHeading({
  title,
  compact = false,
}: {
  icon?: ReactNode;
  title: string;
  compact?: boolean;
}) {
  return (
    <div className={`flex w-full items-center justify-center gap-2 text-center ${compact ? "" : "mb-0.5"}`}>
      <span className="h-px min-w-7 flex-1 bg-[#DDE7F3]" />
      <h2 className="shrink-0 text-center text-[14px] font-black uppercase leading-5 tracking-[0.02em] text-[#06194A]">
        {title}
      </h2>
      <span className="h-px min-w-7 flex-1 bg-[#DDE7F3]" />
    </div>
  );
}

function SectionTitle({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center md:text-left">
      <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[#EFF6FF] text-[#1557D6] md:mx-0">
        {icon}
      </div>
      <h2 className="text-xl font-black text-[#06194A]">{title}</h2>
      <p className="mt-1 text-sm font-semibold leading-6 text-[#64748B]">
        {description}
      </p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-h-[48px] flex-col justify-center rounded-[16px] bg-[#F7FBFF] px-3 py-2 text-center">
      <span className="text-[9px] font-black uppercase tracking-wide text-[#64748B]">
        {label}
      </span>
      <span className="mt-1 break-words text-[12px] font-black leading-tight text-[#06194A]">
        {value}
      </span>
    </div>
  );
}

function TrustRow({ label, active }: { label: string; active: boolean }) {
  return (
    <div
      className={`flex min-h-[38px] items-center justify-center gap-1 rounded-[14px] px-2 py-2 text-[10px] font-black ${active ? "bg-emerald-50 text-emerald-700" : "bg-[#F7FBFF] text-[#64748B]"}`}
    >
      <span>{label}</span>
      {active ? <CheckCircle2 size={18} /> : <BadgeCheck size={18} />}
    </div>
  );
}

function ShareLink({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon: ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex min-h-[48px] flex-col items-center justify-center gap-1 rounded-[16px] border border-[#DDE7F3] bg-white px-2 text-[10px] font-black text-[#475569] transition hover:bg-[#EFF6FF] hover:text-[#1557D6]"
    >
      {icon}
      {label}
    </a>
  );
}

