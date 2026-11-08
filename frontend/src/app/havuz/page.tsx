"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BadgeCheck,
  Building2,
  CheckCircle2,
  Crosshair,
  ChevronLeft,
  ChevronRight,
  Eye,
  List,
  Map as MapIcon,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  Search,
  Share2,
  SlidersHorizontal,
  Sparkles,
  Target,
  Users,
  WalletCards,
  MessageSquareText,
  X,
} from "lucide-react";

import api from "@/lib/api";
import {
  playKontorHarcamaSound,
  registerKontorSoundUnlock,
} from "@/lib/kontorFeedback";
import { useAuthStore } from "@/store/auth.store";
import HavuzFilterCenter, {
  applyHavuzFilters,
  countHavuzFilters,
  createEmptyHavuzFilters,
  getHavuzFilterChips,
  type HavuzFilterState,
} from "@/components/havuz/HavuzFilterCenter";
import PremiumPropertyImage from "@/components/media/PremiumPropertyImage";
import CustomerPresentationSheet from "@/components/presentation/CustomerPresentationSheet";
import PoolProjectCenter from "@/components/havuz/PoolProjectCenter";
import EphHavuzStandartKart from "@/components/havuz/EphHavuzStandartKart";
import { buildEphPremiumCardData } from "@/components/portfolio/ephPremiumCardStandard";
import { getPropertyPresentationCards } from "@/components/presentation/propertyPresentation";
import {
  decodePortfolioMetadataState,
  getFeatureLabels,
  getMetadataLabel,
} from "@/components/stok/portfolioFeatureMetadata";

type Unit = {
  id: string;
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
  price?: number | null;
  availableCreditAmount?: number | null;
  priceCurrency?: string | null;
  description?: string | null;
  phoneCallAllowed?: boolean;
  whatsappAllowed?: boolean;
  isVerified?: boolean;
  isPoolVisible?: boolean;
  approvalStatus?: string | null;
  tapuVerified?: boolean;
  photoVerified?: boolean;
  yetkiVerified?: boolean;
  createdAt?: string;
  images?: Array<{ url?: string; supabaseUrl?: string; isCover?: boolean }>;
  poolMatch?: {
    score: number;
    customerId?: string | null;
    budgetDiff?: number;
    reasons?: string[];
  };
  project?: {
    id?: string | null;
    name?: string | null;
    city?: string | null;
    district?: string | null;
    address?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    mapAddress?: string | null;
    placeId?: string | null;
    ownerRole?: string | null;
    isOwnPortfolio?: boolean;
    hasLocation?: boolean;
    locationUnlocked?: boolean;
    locationPrecision?: "EXACT" | "APPROXIMATE" | "NONE";
  };
};

type Customer = {
  id: string;
  firstName: string;
  lastName: string;
  city?: string | null;
  interestedArea?: string | null;
  interestedType?: string | null;
  budget?: number | null;
  notes?: string | null;
  interests?: Array<{
    id?: string;
    title?: string | null;
    city?: string | null;
    district?: string | null;
    neighborhood?: string | null;
    propertyTypes?: string[] | null;
    statuses?: string[] | null;
    minBudget?: number | null;
    maxBudget?: number | null;
    roomCounts?: string[] | null;
    features?: string[] | null;
    notes?: string | null;
    isActive?: boolean;
  }> | null;
};

type PoolAction = "INTEREST" | "LEAD";

type SelectedAction = {
  type: PoolAction;
  unit: Unit;
  score: number;
};

type DetailSelection = {
  unit: Unit;
  match: { score: number; customer: Customer | null; budgetDiff: number };
};

type PoolMembershipAccess = {
  allowed: boolean;
  code:
    | "ACTIVE"
    | "SUPER_ADMIN"
    | "NO_MEMBERSHIP"
    | "NOT_STARTED"
    | "EXPIRED"
    | "PASSIVE"
    | "CANCELLED"
    | "PACKAGE_INACTIVE";
  message: string;
  packageCode?: string | null;
  packageName?: string | null;
  expiresAt?: string | null;
};

type PoolWallet = {
  balance?: number;
  bakiye?: number;
  aktifMi?: boolean;
  membershipAccess?: PoolMembershipAccess | null;
};

type SuccessToast = {
  title: string;
  message: string;
  spent: number;
  balance: number | null;
};

type PoolLocationData = {
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
  mapAddress?: string | null;
  placeId?: string | null;
  directionsUrl?: string | null;
};

type ViewMode = "LIST" | "MAP";

type PoolMapItem = {
  unit: Unit;
  match: { score: number; customer: Customer | null; budgetDiff: number };
  lat: number;
  lng: number;
  isApprox: boolean;
  locationLabel: string;
  distanceKm?: number | null;
};

type UserLocation = {
  lat: number;
  lng: number;
  accuracy: number;
};

type NearbyPoolItem = {
  unit: Unit;
  match: { score: number; customer: Customer | null; budgetDiff: number };
  distanceKm: number | null;
};

declare global {
  interface Window {
    google?: any;
    ephHavuzGoogleMapsReady?: Promise<void>;
  }
}

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
const DEFAULT_MAP_CENTER = { lat: 39.0, lng: 35.0 };
const NEARBY_RADIUS_OPTIONS = [1, 5, 10, 25] as const;
const EPH_HAVUZ_PREMIUM_V1_YAKINIMDA = true;

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function calculateDistanceKm(
  origin: Pick<UserLocation, "lat" | "lng">,
  target: { lat: number; lng: number },
) {
  const earthRadiusKm = 6371;
  const latDifference = toRadians(target.lat - origin.lat);
  const lngDifference = toRadians(target.lng - origin.lng);
  const originLat = toRadians(origin.lat);
  const targetLat = toRadians(target.lat);

  const value =
    Math.sin(latDifference / 2) ** 2 +
    Math.cos(originLat) *
      Math.cos(targetLat) *
      Math.sin(lngDifference / 2) ** 2;

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function formatNearbyDistance(distanceKm?: number | null) {
  if (distanceKm === null || distanceKm === undefined) return "";

  if (distanceKm < 1) {
    return `${Math.max(1, Math.round(distanceKm * 1000))} metre uzaklıkta`;
  }

  return `${distanceKm.toLocaleString("tr-TR", {
    minimumFractionDigits: distanceKm < 10 ? 1 : 0,
    maximumFractionDigits: 1,
  })} km uzaklıkta`;
}


const POOL_CARD_STYLES = [
  {
    frame:
      "border-[#2563EB] bg-gradient-to-br from-white via-[#F8FBFF] to-[#EFF6FF] shadow-[0_16px_34px_rgba(37,99,235,0.16)]",
    strip: "bg-[#2563EB]",
    imageBg: "bg-[#EFF6FF]",
    soft: "bg-[#F8FBFF]",
  },
  {
    frame:
      "border-emerald-400 bg-gradient-to-br from-white via-[#F8FFFB] to-emerald-50 shadow-[0_16px_34px_rgba(16,185,129,0.15)]",
    strip: "bg-emerald-500",
    imageBg: "bg-emerald-50",
    soft: "bg-[#F7FFFB]",
  },
  {
    frame:
      "border-amber-400 bg-gradient-to-br from-white via-[#FFFDF7] to-amber-50 shadow-[0_16px_34px_rgba(245,158,11,0.16)]",
    strip: "bg-amber-500",
    imageBg: "bg-amber-50",
    soft: "bg-[#FFFDF7]",
  },
  {
    frame:
      "border-violet-400 bg-gradient-to-br from-white via-[#FBFAFF] to-violet-50 shadow-[0_16px_34px_rgba(139,92,246,0.14)]",
    strip: "bg-violet-500",
    imageBg: "bg-violet-50",
    soft: "bg-[#FBFAFF]",
  },
];

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

function normalizeRole(role?: string | null) {
  return String(role || "")
    .toLocaleUpperCase("tr-TR")
    .trim();
}

function isBuilderRole(role?: string | null) {
  const normalized = normalizeRole(role);
  return [
    "MUTEAHHIT",
    "MÜTEAHHİT",
    "MÜTAHHİT",
    "INSAAT_FIRMASI",
    "İNŞAAT_FİRMASI",
  ].includes(normalized);
}

function isConstructionCompanyRole(role?: string | null) {
  const normalized = normalizeRole(role);
  return ["INSAAT_FIRMASI", "İNŞAAT_FİRMASI"].includes(normalized);
}

function getPortfolioSourceLabel(unit: Unit) {
  const role = unit.project?.ownerRole;
  if (isConstructionCompanyRole(role)) return "İnşaat Firması Portföyü";
  if (isBuilderRole(role)) return "Müteahhit Portföyü";
  return "Emlakçı Yetkili Portföyü";
}

function getPortfolioSourceBadgeLabel(unit: Unit) {
  const role = unit.project?.ownerRole;
  if (isConstructionCompanyRole(role)) return "İnşaat Firması";
  if (isBuilderRole(role)) return "Müteahhit";
  return "Emlakçı Yetkili";
}

function isVerified(unit: Unit) {
  const approvalStatus = String(
    unit.approvalStatus || "",
  ).toUpperCase();

  return Boolean(
    unit.isPoolVisible ||
      approvalStatus === "HAVUZDA" ||
      unit.isVerified ||
      unit.yetkiVerified ||
      (unit.tapuVerified &&
        unit.photoVerified &&
        unit.yetkiVerified),
  );
}

function getCover(unit: Unit) {
  const images = Array.isArray(unit.images) ? unit.images : [];
  const image = images.find((item) => item.isCover) || images[0];
  return image?.supabaseUrl || image?.url || "";
}

function getUnitImages(unit: Unit) {
  const images = Array.isArray(unit.images) ? unit.images : [];
  const normalized = images
    .map((item) => item.supabaseUrl || item.url || "")
    .filter(Boolean);

  return Array.from(new Set(normalized));
}

function compactMoney(value?: number | null, currency?: string | null) {
  const numeric = Number(value || 0);
  if (!numeric) return "Fiyat yok";
  const symbol = CURRENCY_SYMBOLS[currency || "TRY"] || "₺";

  return `${numeric.toLocaleString("tr-TR")} ${symbol}`;
}

function typeLabel(type?: string | null) {
  if (!type) return "Portföy";
  return String(type).replaceAll("_", " ");
}

function limitText(value?: string | number | null, _max = 60) {
  return String(value ?? "").trim();
}

function getStableJitter(seed: string, index: number) {
  const source = `${seed || "EPH"}-${index}`;
  let hash = 0;

  for (let i = 0; i < source.length; i += 1) {
    hash = (hash * 31 + source.charCodeAt(i)) % 9973;
  }

  const latOffset = ((hash % 19) - 9) * 0.0028;
  const lngOffset = ((Math.floor(hash / 19) % 19) - 9) * 0.0032;

  return { latOffset, lngOffset };
}

function getPoolMapPoint(input: {
  unit: Unit;
  match: { score: number; customer: Customer | null; budgetDiff: number };
}): PoolMapItem | null {
  const directLat = Number(input.unit.project?.latitude || 0);
  const directLng = Number(input.unit.project?.longitude || 0);

  if (!Number.isFinite(directLat) || !Number.isFinite(directLng)) return null;
  if (!directLat || !directLng) return null;

  return {
    unit: input.unit,
    match: input.match,
    lat: directLat,
    lng: directLng,
    isApprox: input.unit.project?.locationPrecision !== "EXACT",
    locationLabel: getLocation(input.unit),
  };
}

function getOverlayPinPosition(item: PoolMapItem, items: PoolMapItem[]) {
  if (!items.length) return { left: 50, top: 50 };

  const lats = items
    .map((entry) => entry.lat)
    .filter((value) => Number.isFinite(value));
  const lngs = items
    .map((entry) => entry.lng)
    .filter((value) => Number.isFinite(value));
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const latRange = Math.max(maxLat - minLat, 0.02);
  const lngRange = Math.max(maxLng - minLng, 0.02);
  const seed = getStableJitter(item.unit.id, 1);

  const left = 7 + ((item.lng - minLng) / lngRange) * 86 + seed.lngOffset * 24;
  const top = 12 + ((maxLat - item.lat) / latRange) * 76 + seed.latOffset * 24;

  return {
    left: Math.max(5, Math.min(95, left)),
    top: Math.max(8, Math.min(88, top)),
  };
}

function loadHavuzGoogleMapsScript() {
  if (typeof window === "undefined")
    return Promise.reject(new Error("Tarayıcı ortamı bulunamadı."));
  if (window.google?.maps) return Promise.resolve();
  if (window.ephHavuzGoogleMapsReady) return window.ephHavuzGoogleMapsReady;

  if (!GOOGLE_MAPS_API_KEY) {
    return Promise.reject(new Error("Google Maps API anahtarı tanımlı değil."));
  }

  window.ephHavuzGoogleMapsReady = new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[data-eph-havuz-google-maps="true"], script[data-eph-portfolio-google-maps="true"]',
    );

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve());
      existingScript.addEventListener("error", () =>
        reject(new Error("Google Maps yüklenemedi.")),
      );
      if (window.google?.maps) resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&language=tr&region=TR`;
    script.async = true;
    script.defer = true;
    script.dataset.ephHavuzGoogleMaps = "true";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Google Maps yüklenemedi."));
    document.head.appendChild(script);
  });

  return window.ephHavuzGoogleMapsReady;
}

function getLocation(unit: Unit) {
  return (
    [unit.project?.city, unit.project?.district, unit.project?.address]
      .filter(Boolean)
      .join(" / ") || "Konum yok"
  );
}

function getPoolLocationButtonLabel(unit: Unit) {
  if (!unit.project?.hasLocation) return "Konum Eklenmemiş";
  return unit.project?.locationUnlocked ? "Konuma Git" : "Konuma Git 10K";
}

function buildGoogleMapsDirectionsUrl(
  project?: Unit["project"] | PoolLocationData | null,
) {
  if (!project) return "";

  const latitude = Number(project.latitude || 0);
  const longitude = Number(project.longitude || 0);
  const hasCoordinates =
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    Boolean(latitude && longitude);

  const destination = hasCoordinates
    ? `${latitude},${longitude}`
    : String(project.mapAddress || project.address || "").trim();

  if (!destination) return "";

  const params = new URLSearchParams({
    api: "1",
    destination,
  });
  const placeId = String(project.placeId || "").trim();

  if (placeId) {
    params.set("destination_place_id", placeId);
  }

  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

function getMahalle(unit: Unit) {
  return unit.project?.address || unit.project?.district || unit.project?.city || "Mahalle bilgisi yok";
}

function getEphId(id: string) {
  const cleaned = String(id || "")
    .replaceAll("-", "")
    .slice(0, 6)
    .toUpperCase();
  return `EPH-${cleaned || "000000"}`;
}

function getConversationId(data: any) {
  return (
    data?.conversationId ||
    data?.conversation?.id ||
    data?.id ||
    data?.data?.conversationId ||
    data?.data?.id ||
    ""
  );
}

function getErrorMessage(error: unknown) {
  const anyError = error as any;
  return (
    anyError?.response?.data?.message ||
    anyError?.response?.data?.error ||
    anyError?.message ||
    "İşlem tamamlanamadı."
  );
}

function getNumericValue(data: any, keys: string[]) {
  for (const key of keys) {
    const value = data?.[key];

    if (Number.isFinite(Number(value))) {
      return Number(value);
    }
  }

  return null;
}

function getBalanceFromResponse(data: any) {
  return getNumericValue(data, [
    "remainingBalance",
    "balance",
    "bakiye",
    "kalanBakiye",
    "sonrakiBakiye",
  ]);
}

function getSpentFromResponse(data: any, fallback: number) {
  return (
    getNumericValue(data, ["spent", "cost", "miktar", "harcananKontor"]) ??
    fallback
  );
}


function calculatePoolQualityScore(unit: Unit) {
  const imageCount = Array.isArray(unit.images) ? unit.images.length : 0;
  const hasPhoto = imageCount > 0 || Boolean(unit.photoVerified);
  const hasDocument = Boolean(
    unit.tapuVerified || unit.yetkiVerified || unit.isVerified,
  );
  const hasLocation = Boolean(unit.project?.city && unit.project?.district);
  const hasAuthorization = Boolean(unit.yetkiVerified || unit.isVerified);
  const approvalStatus = String(unit.approvalStatus || "").toUpperCase();
  const isPoolReady =
    Boolean(unit.isPoolVisible) ||
    approvalStatus === "HAVUZDA" ||
    approvalStatus === "ONAYLANDI" ||
    (hasPhoto && hasDocument && hasLocation && hasAuthorization);

  const score =
    (hasPhoto ? 25 : 0) +
    (hasDocument ? 25 : 0) +
    (hasLocation ? 20 : 0) +
    (hasAuthorization ? 15 : 0) +
    (isPoolReady ? 15 : 0);

  return Math.max(0, Math.min(100, score));
}

function getPoolQualityLabel(score: number) {
  if (score >= 90) return "Mükemmel";
  if (score >= 75) return "Çok İyi";
  if (score >= 60) return "İyi";
  if (score >= 40) return "Geliştirilmeli";
  return "Riskli";
}

function getPoolQualityTone(score: number) {
  if (score >= 90) return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (score >= 75) return "border-blue-200 bg-blue-50 text-blue-700";
  if (score >= 60) return "border-cyan-200 bg-cyan-50 text-cyan-700";
  if (score >= 40) return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-red-200 bg-red-50 text-red-700";
}


function hasEphApproval(unit: Unit) {
  return isVerified(unit);
}

function getTrustBadges(unit: Unit, matchScore: number) {
  const qualityScore = calculatePoolQualityScore(unit);
  const badges: Array<{ label: string; className: string }> = [];

  if (hasEphApproval(unit)) {
    badges.push({
      label: "EPH Onaylı",
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    });
  }

  if (matchScore >= 80) {
    badges.push({
      label: "Güçlü Müşteri Eşleşmesi",
      className: "border-blue-200 bg-blue-50 text-blue-700",
    });
  }

  badges.push({
    label: getPoolQualityLabel(qualityScore),
    className: getPoolQualityTone(qualityScore),
  });

  return badges.slice(0, 3);
}

function getCustomerMatchAreas(
  customer: Customer,
) {
  const relationalAreas =
    Array.isArray(customer.interests)
      ? customer.interests
          .filter(
            (interest) =>
              interest.isActive !== false,
          )
          .map((interest) => ({
            city: String(
              interest.city || "",
            )
              .toLocaleLowerCase("tr-TR")
              .trim(),
            district: String(
              interest.district || "",
            )
              .toLocaleLowerCase("tr-TR")
              .trim(),
            neighborhood: String(
              interest.neighborhood || "",
            )
              .toLocaleLowerCase("tr-TR")
              .trim(),
          }))
          .filter(
            (area) =>
              area.city ||
              area.district ||
              area.neighborhood,
          )
      : [];

  if (relationalAreas.length > 0) {
    return relationalAreas;
  }

  const legacyAreas = String(
    customer.interestedArea || "",
  )
    .split("|")
    .map((value) =>
      value
        .toLocaleLowerCase("tr-TR")
        .trim(),
    )
    .filter(Boolean)
    .map((value) => {
      const parts = value
        .split("/")
        .map((part) => part.trim());

      return {
        city: parts[0] || "",
        district: parts[1] || "",
        neighborhood: parts[2] || "",
      };
    });

  if (legacyAreas.length > 0) {
    return legacyAreas;
  }

  const fallbackCity = String(
    customer.city || "",
  )
    .toLocaleLowerCase("tr-TR")
    .trim();

  return fallbackCity
    ? [
        {
          city: fallbackCity,
          district: "",
          neighborhood: "",
        },
      ]
    : [];
}

function calculateMatch(
  unit: Unit,
  customers: Customer[],
): {
  score: number;
  customer: Customer | null;
  budgetDiff: number;
} {
  if (unit.poolMatch) {
    const customer =
      customers.find((item) => item.id === unit.poolMatch?.customerId) || null;

    return {
      score: Number(unit.poolMatch.score || 0),
      customer,
      budgetDiff: Number(unit.poolMatch.budgetDiff || 0),
    };
  }

  const unitCity = String(
    unit.project?.city || "",
  ).toLocaleLowerCase("tr-TR");

  const unitDistrict = String(
    unit.project?.district || "",
  ).toLocaleLowerCase("tr-TR");

  const unitText = [
    unit.project?.name,
    unit.project?.city,
    unit.project?.district,
    unit.project?.address,
    unit.project?.mapAddress,
    unit.type,
    unit.roomCount,
    unit.description,
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase("tr-TR");

  let bestScore = 0;
  let bestCustomer: Customer | null = null;
  let bestBudgetDiff = 0;

  customers.forEach((customer) => {
    let score = 0;
    let customerBudgetDiff = 0;

    const customerAreas =
      getCustomerMatchAreas(customer);

    const interestedType = String(
      customer.interestedType || "",
    ).toLocaleLowerCase("tr-TR");

    const notes = String(
      customer.notes || "",
    ).toLocaleLowerCase("tr-TR");

    const areaScore =
      customerAreas.reduce(
        (highestScore, area) => {
          let currentScore = 0;

          const cityMatches =
            !area.city ||
            Boolean(
              unitCity &&
                area.city === unitCity,
            );

          if (
            area.city &&
            unitCity &&
            area.city === unitCity
          ) {
            currentScore += 30;
          }

          if (
            cityMatches &&
            area.district &&
            (unitDistrict === area.district ||
              unitText.includes(
                area.district,
              ))
          ) {
            currentScore += 30;
          }

          if (
            cityMatches &&
            area.neighborhood &&
            unitText.includes(
              area.neighborhood,
            )
          ) {
            currentScore += 15;
          }

          return Math.max(
            highestScore,
            currentScore,
          );
        },
        0,
      );

    score += areaScore;

    if (
      interestedType &&
      unitText.includes(interestedType)
    ) {
      score += 15;
    }

    if (customer.budget && unit.price) {
      const customerBudget =
        Number(customer.budget);

      const unitPrice =
        Number(unit.price);

      const difference = Math.abs(
        customerBudget - unitPrice,
      );

      const ratio =
        difference /
        Math.max(customerBudget, unitPrice);

      customerBudgetDiff =
        Math.round(ratio * 100);

      if (ratio <= 0.1) {
        score += 15;
      } else if (ratio <= 0.2) {
        score += 10;
      } else if (ratio <= 0.35) {
        score += 5;
      }
    }

    if (
      notes &&
      unitText
        .split(/\s+/)
        .some(
          (word) =>
            word.length > 3 &&
            notes.includes(word),
        )
    ) {
      score += 10;
    }

    if (score > bestScore) {
      bestScore = score;
      bestCustomer = customer;
      bestBudgetDiff = customerBudgetDiff;
    }
  });

  return {
    score: Math.min(bestScore, 96),
    customer: bestCustomer,
    budgetDiff: bestBudgetDiff,
  };
}

export default function HavuzPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [units, setUnits] = useState<Unit[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState<HavuzFilterState>(() =>
    createEmptyHavuzFilters(),
  );
  const [selectedAction, setSelectedAction] = useState<SelectedAction | null>(
    null,
  );
  const [detailSelection, setDetailSelection] =
    useState<DetailSelection | null>(null);
  const [presentationUnit, setPresentationUnit] = useState<Unit | null>(null);
  const [locationUnit, setLocationUnit] = useState<Unit | null>(null);
  const [contactUnit, setContactUnit] = useState<Unit | null>(null);
  const [projectCount, setProjectCount] = useState(0);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [membershipAccess, setMembershipAccess] =
    useState<PoolMembershipAccess | null>(null);
  const [successToast, setSuccessToast] = useState<SuccessToast | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("LIST");
  const [selectedMapUnitId, setSelectedMapUnitId] = useState("");
  const [requestedDetailUnitId, setRequestedDetailUnitId] = useState("");
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [nearbyActive, setNearbyActive] = useState(false);
  const [nearbyRadiusKm, setNearbyRadiusKm] = useState<number>(1);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [nearbyError, setNearbyError] = useState("");

  const canUsePoolActions = membershipAccess?.allowed === true;
  const poolActionLockMessage =
    membershipAccess?.message ||
    "Havuz işlem erişiminiz doğrulanamadı. Üyelik durumunuzu kontrol ediniz.";

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setRequestedDetailUnitId(params.get("detail")?.trim() || "");
  }, []);

  useEffect(() => {
    return registerKontorSoundUnlock();
  }, []);
  useEffect(() => {
    if (!successToast) return;

    const timer = window.setTimeout(() => {
      setSuccessToast(null);
    }, 5000);

    return () => window.clearTimeout(timer);
  }, [successToast]);

  const fetchData = async () => {
    try {
      const [unitsRes, customersRes, walletRes] = await Promise.allSettled([
        api.get("/pool-experience/units"),
        api.get("/crm/customers"),
        api.get("/units/pool/wallet"),
      ]);

      setUnits(
        unitsRes.status === "fulfilled" && Array.isArray(unitsRes.value.data)
          ? unitsRes.value.data
          : [],
      );
      setCustomers(
        customersRes.status === "fulfilled" &&
          Array.isArray(customersRes.value.data)
          ? customersRes.value.data
          : [],
      );

      if (walletRes.status === "fulfilled") {
        const wallet = walletRes.value.data as PoolWallet;
        const balance = Number(wallet?.balance ?? wallet?.bakiye ?? 0);
        const access = wallet?.membershipAccess;

        setWalletBalance(Number.isFinite(balance) ? balance : 0);
        setMembershipAccess(
          access && typeof access.allowed === "boolean" ? access : null,
        );
      } else {
        setMembershipAccess(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const eligibleUnits = units;

  const matchedUnits = useMemo(() => {
    return eligibleUnits
      .map((unit) => ({ unit, match: calculateMatch(unit, customers) }))
      .sort((a, b) => b.match.score - a.match.score);
  }, [customers, eligibleUnits]);

  useEffect(() => {
    if (!requestedDetailUnitId || loading || detailSelection) {
      return;
    }

    const requestedItem = matchedUnits.find(
      ({ unit }) => unit.id === requestedDetailUnitId,
    );

    if (!requestedItem) {
      setErrorMessage("İstenen Havuz portföyü bulunamadı veya görüntüleme yetkiniz yok.");
      setRequestedDetailUnitId("");
      return;
    }

    setSelectedMapUnitId(requestedItem.unit.id);
    setDetailSelection(requestedItem);
    setRequestedDetailUnitId("");
  }, [detailSelection, loading, matchedUnits, requestedDetailUnitId]);

  const closeDetailSelection = () => {
    setDetailSelection(null);

    const url = new URL(window.location.href);
    url.searchParams.delete("detail");
    window.history.replaceState(
      {},
      "",
      `${url.pathname}${url.search}${url.hash}`,
    );
  };

  const baseFilteredPoolItems = useMemo(
    () => applyHavuzFilters(matchedUnits, filters, search),
    [filters, matchedUnits, search],
  );

  const filteredPoolItems = useMemo<NearbyPoolItem[]>(() => {
    const items = baseFilteredPoolItems.map(({ unit, match }) => {
      const lat = Number(unit.project?.latitude || 0);
      const lng = Number(unit.project?.longitude || 0);
      const hasCoordinates =
        Number.isFinite(lat) && Number.isFinite(lng) && Boolean(lat && lng);

      return {
        unit,
        match,
        distanceKm:
          userLocation && hasCoordinates
            ? calculateDistanceKm(userLocation, { lat, lng })
            : null,
      };
    });

    if (!nearbyActive || !userLocation) return items;

    return items
      .filter(
        (item) =>
          item.distanceKm !== null && item.distanceKm <= nearbyRadiusKm,
      )
      .sort(
        (first, second) =>
          Number(first.distanceKm ?? Number.MAX_SAFE_INTEGER) -
          Number(second.distanceKm ?? Number.MAX_SAFE_INTEGER),
      );
  }, [
    baseFilteredPoolItems,
    nearbyActive,
    nearbyRadiusKm,
    userLocation,
  ]);

  const activeFilterCount = countHavuzFilters(filters);
  const activeFilterChips = getHavuzFilterChips(filters);

  const displayedUnits = useMemo(
    () => filteredPoolItems,
    [filteredPoolItems],
  );

  const poolMapItems = useMemo(() => {
    return filteredPoolItems
      .map(({ unit, match, distanceKm }) => {
        const point = getPoolMapPoint({ unit, match });
        return point ? { ...point, distanceKm } : null;
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));
  }, [filteredPoolItems]);

  const verifiedPoolCount = useMemo(
    () => eligibleUnits.filter((unit) => hasEphApproval(unit)).length,
    [eligibleUnits],
  );

  const strongMatchCount = useMemo(
    () => matchedUnits.filter((item) => item.match.score >= 80).length,
    [matchedUnits],
  );

  const matchedCustomerCount = useMemo(
    () =>
      new Set(
        matchedUnits.flatMap((item) =>
          item.match.customer?.id ? [item.match.customer.id] : [],
        ),
      ).size,
    [matchedUnits],
  );

  const bestMatchScore = useMemo(
    () =>
      matchedUnits.reduce(
        (highest, item) => Math.max(highest, item.match.score),
        0,
      ),
    [matchedUnits],
  );

  const requestNearbySearch = (radius = nearbyRadiusKm) => {
    setNearbyRadiusKm(radius);
    setNearbyError("");

    if (!navigator.geolocation) {
      setNearbyError("Bu cihaz konum özelliğini desteklemiyor.");
      return;
    }

    setNearbyLoading(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };

        setUserLocation(nextLocation);
        setNearbyActive(true);
        setNearbyLoading(false);
        setViewMode("MAP");
        setErrorMessage("");

        window.setTimeout(() => {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }, 80);
      },
      (error) => {
        setNearbyLoading(false);

        if (error.code === error.PERMISSION_DENIED) {
          setNearbyError(
            "Konum izni verilmedi. Tarayıcı ayarlarından konum iznini açabilirsiniz.",
          );
          return;
        }

        if (error.code === error.TIMEOUT) {
          setNearbyError("Konum alınamadı. Lütfen tekrar deneyin.");
          return;
        }

        setNearbyError("Mevcut konum belirlenemedi.");
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 60000,
      },
    );
  };

  const changeNearbyRadius = (radius: number) => {
    if (!userLocation) {
      requestNearbySearch(radius);
      return;
    }

    setNearbyRadiusKm(radius);
    setNearbyActive(true);
    setNearbyError("");
    setViewMode("MAP");
  };

  const clearNearbySearch = () => {
    setNearbyActive(false);
    setNearbyError("");
  };

  const showKontorSuccess = (input: {
    title: string;
    data: any;
    fallbackSpent: number;
    message?: string;
  }) => {
    const spent = getSpentFromResponse(input.data, input.fallbackSpent);
    const responseBalance = getBalanceFromResponse(input.data);
    const nextBalance =
      responseBalance ??
      (walletBalance === null ? null : Math.max(walletBalance - spent, 0));

    if (nextBalance !== null) {
      setWalletBalance(nextBalance);
    }

    if (spent > 0) {
      void playKontorHarcamaSound();
    }

    const backendMessage =
      typeof input.data?.message === "string" ? input.data.message : "";

    setSuccessToast({
      title: input.title,
      message:
        input.message ||
        (spent === 0 && backendMessage
          ? backendMessage
          : nextBalance === null
            ? `${spent} kontör harcandı.`
            : `${spent} kontör harcandı. Kalan bakiyen ${nextBalance} kontör.`),
      spent,
      balance: nextBalance,
    });
  };

  const openPoolLocation = (unit: Unit) => {
    if (!unit.project?.hasLocation) {
      setErrorMessage("Bu gayrimenkul için konum bilgisi eklenmemiş.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (unit.project.locationUnlocked) {
      const directionsUrl = buildGoogleMapsDirectionsUrl(unit.project);

      if (!directionsUrl) {
        setErrorMessage("Bu gayrimenkul için kullanılabilir yol tarifi bulunamadı.");
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      window.location.assign(directionsUrl);
      return;
    }

    if (!canUsePoolActions) {
      setErrorMessage(poolActionLockMessage);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (walletBalance !== null && walletBalance < 10) {
      setErrorMessage(
        `Bu işlem için 10 kontör gerekir. Mevcut bakiyeniz ${walletBalance} kontör.`,
      );
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setErrorMessage("");
    setLocationUnit(unit);
  };

  const confirmPoolLocation = async () => {
    const unit = locationUnit;

    if (!unit || busyAction) return;

    if (!canUsePoolActions && !unit.project?.isOwnPortfolio) {
      setLocationUnit(null);
      setErrorMessage(poolActionLockMessage);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (
      !unit.project?.isOwnPortfolio &&
      walletBalance !== null &&
      walletBalance < 10
    ) {
      setLocationUnit(null);
      setErrorMessage(
        `Bu işlem için 10 kontör gerekir. Mevcut bakiyeniz ${walletBalance} kontör.`,
      );
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setBusyAction(`LOCATION_${unit.id}`);
    setErrorMessage("");

    try {
      const response = await api.post(`/units/pool/${unit.id}/location`);
      const location = (response.data?.location || {}) as PoolLocationData;
      const directionsUrl =
        String(location.directionsUrl || "").trim() ||
        buildGoogleMapsDirectionsUrl(location);

      const updatedUnit: Unit = {
        ...unit,
        project: {
          ...unit.project,
          latitude: location.latitude ?? unit.project?.latitude ?? null,
          longitude: location.longitude ?? unit.project?.longitude ?? null,
          address: location.address ?? unit.project?.address ?? null,
          mapAddress: location.mapAddress ?? unit.project?.mapAddress ?? null,
          placeId: location.placeId ?? unit.project?.placeId ?? null,
          hasLocation: true,
          locationUnlocked: true,
          locationPrecision: "EXACT",
        },
      };

      setUnits((current) =>
        current.map((item) => (item.id === unit.id ? updatedUnit : item)),
      );

      setDetailSelection((current) =>
        current?.unit.id === unit.id
          ? {
              ...current,
              unit: updatedUnit,
            }
          : current,
      );

      showKontorSuccess({
        title: "Konum Açıldı",
        data: response.data,
        fallbackSpent: unit.project?.isOwnPortfolio ? 0 : 10,
      });

      setLocationUnit(null);

      if (!directionsUrl) {
        setErrorMessage("Konum açıldı ancak yol tarifi bağlantısı oluşturulamadı.");
        return;
      }

      window.setTimeout(() => {
        window.location.assign(directionsUrl);
      }, 350);
    } catch (error) {
      setLocationUnit(null);
      setErrorMessage(getErrorMessage(error));
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setBusyAction(null);
    }
  };

  const startPoolMessage = async (unit: Unit, score: number) => {
    if (busyAction) return;

    if (!canUsePoolActions) {
      setErrorMessage(poolActionLockMessage);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (
      walletBalance !== null &&
      walletBalance < 3
    ) {
      setErrorMessage(
        `Bu işlem için 3 kontör gerekir. Mevcut bakiyeniz ${walletBalance} kontör.`,
      );
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setErrorMessage("");
    setBusyAction(`MESSAGE_${unit.id}`);

    try {
      const message = `Merhaba, ${getEphId(unit.id)} numaralı Havuz portföyünün sahibiyle iletişime geçmek istiyorum.`;

      const response = await api.post(`/units/pool/${unit.id}/message`, {
        message,
        matchScore: score,
      });

      const conversationId = getConversationId(response.data);

      showKontorSuccess({
        title: "İletişim Başlatıldı",
        data: response.data,
        fallbackSpent: 3,
      });

      window.setTimeout(() => {
        router.push(
          conversationId ? `/messages/${conversationId}` : "/messages",
        );
      }, 2200);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setBusyAction(null);
    }
  };

  const startPoolExternalContact = async (
    unit: Unit,
    channel: "CALL" | "WHATSAPP",
  ) => {
    if (busyAction) return;

    if (!canUsePoolActions && !unit.project?.isOwnPortfolio) {
      setContactUnit(null);
      setErrorMessage(poolActionLockMessage);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setBusyAction(`CONTACT_${channel}_${unit.id}`);
    setErrorMessage("");

    try {
      const response = await api.post(
        `/units/pool/${unit.id}/contact/${channel}`,
      );
      const url = String(response.data?.url || "").trim();
      const phone = String(response.data?.phone || "").trim();
      const spent = getSpentFromResponse(response.data, 10);
      const remainingBalance = getBalanceFromResponse(response.data);
      const contactLabel =
        channel === "CALL" ? "Telefon numarası" : "WhatsApp numarası";

      const contactMessage = phone
        ? spent === 0
          ? `${contactLabel}: ${phone} · Daha önce açıldığı için tekrar kontör düşülmedi.`
          : remainingBalance === null
            ? `${contactLabel}: ${phone} · 10 kontör harcandı.`
            : `${contactLabel}: ${phone} · 10 kontör harcandı. Kalan bakiye: ${remainingBalance} kontör.`
        : undefined;

      showKontorSuccess({
        title:
          channel === "CALL"
            ? "Telefon İletişimi Açıldı"
            : "WhatsApp İletişimi Açıldı",
        data: response.data,
        fallbackSpent: 10,
        message: contactMessage,
      });
      setContactUnit(null);

      if (!url) {
        throw new Error("İletişim bağlantısı oluşturulamadı.");
      }

      window.setTimeout(() => {
        window.location.assign(url);
      }, 350);
    } catch (error) {
      setContactUnit(null);
      setErrorMessage(getErrorMessage(error));
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setBusyAction(null);
    }
  };

  const confirmPoolAction = async (action: SelectedAction) => {
    if (busyAction) return;

    if (!canUsePoolActions) {
      setSelectedAction(null);
      setErrorMessage(poolActionLockMessage);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const requiredCredit =
      action.type === "LEAD" ? 20 : 10;

    if (
      walletBalance !== null &&
      walletBalance < requiredCredit
    ) {
      setSelectedAction(null);
      setErrorMessage(
        `Bu işlem için ${requiredCredit} kontör gerekir. Mevcut bakiyeniz ${walletBalance} kontör.`,
      );
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const endpoint =
      action.type === "LEAD"
        ? "matching-customer"
        : "interest";
    const busyKey = `${action.type}_${action.unit.id}`;

    setErrorMessage("");
    setBusyAction(busyKey);

    try {
      const response = await api.post(
        `/units/pool/${action.unit.id}/${endpoint}`,
        {
          matchScore: action.score,
          note:
            action.type === "LEAD"
              ? `${getEphId(action.unit.id)} portföyü için eşleşen müşterim var.`
              : `${getEphId(action.unit.id)} portföyü ile ilgileniyorum.`,
        },
      );

      showKontorSuccess({
        title:
          action.type === "LEAD"
            ? "Müşterim Var Bildirildi"
            : "İlgileniyorum Bildirildi",
        data: response.data,
        fallbackSpent: action.type === "LEAD" ? 20 : 10,
      });

      setSelectedAction(null);
    } catch (error) {
      setSelectedAction(null);
      setErrorMessage(getErrorMessage(error));
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setBusyAction(null);
    }
  };

  const withdrawOwnPoolPortfolio = async (unit: Unit) => {
    if (busyAction) return;

    const confirmed = window.confirm(
      "Bu portföy Havuzdan geri çekilecek ve Taslak durumuna alınacaktır. Güncelleme yaptıktan sonra yeniden Havuza Gönder butonunu kullanabilirsiniz. Devam edilsin mi?",
    );

    if (!confirmed) return;

    setErrorMessage("");
    setBusyAction(`WITHDRAW_${unit.id}`);

    try {
      await api.post(`/units/${unit.id}/remove-from-pool`);

      setUnits((current) =>
        current.filter((item) => item.id !== unit.id),
      );

      setDetailSelection(null);

      setSuccessToast({
        title: "Portföy Havuzdan Geri Çekildi",
        message:
          "Portföy Taslak durumuna alındı. Şimdi bilgilerini güncelleyebilirsiniz.",
        spent: 0,
        balance: walletBalance,
      });

      router.push(`/portfoy?edit=${unit.id}`);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setBusyAction(null);
    }
  };


  const focusPoolCard = (unitId: string) => {
    setSelectedMapUnitId(unitId);

    window.setTimeout(() => {
      const card = document.getElementById(`pool-card-${unitId}`);

      card?.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "nearest",
      });
    }, 100);
  };

  if (loading) {
    return (
      <main className="flex min-h-[calc(100dvh-64px)] items-center justify-center bg-[#F4F8FF] px-4 text-[#1F2937]">
        <div className="text-center">
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-[#2563EB] border-t-transparent" />
          <p className="mt-3 text-xs font-black text-[#64748B]">
            Havuz hazırlanıyor...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100dvh-64px)] overflow-y-auto bg-[#F4F8FF] px-3 pb-[calc(104px+env(safe-area-inset-bottom,0px))] pt-2 text-[#1F2937]">
      {successToast && <KontorSuccessToast toast={successToast} />}

      <div className="mx-auto w-full max-w-[430px] space-y-3">
        <section className="overflow-hidden rounded-[28px] border border-[#B8E5E2] bg-[linear-gradient(145deg,#FFFFFF_0%,#F0FDFA_48%,#EFF6FF_100%)] p-3 shadow-[0_18px_42px_rgba(8,145,178,0.10)]">
          <div className="grid grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex h-11 w-11 items-center justify-center rounded-[18px] border border-[#C7E8E5] bg-white/90 text-[#0F766E] shadow-sm active:scale-[0.98]"
              aria-label="Geri dön"
            >
              <ChevronLeft size={20} />
            </button>

            <div className="min-w-0 text-center">
              <div className="flex items-center justify-center gap-2">
                <span className="text-[12px] text-[#14B8A6]" aria-hidden="true">
                  ✦
                </span>
                <h1 className="text-[22px] font-black tracking-[-0.05em] text-[#083344]">
                  HAVUZ
                </h1>
                <span className="text-[12px] text-[#14B8A6]" aria-hidden="true">
                  ✦
                </span>
              </div>
              <p className="mt-0.5 text-[9.5px] font-black text-[#64748B]">
                Yetkili portföy ve CRM eşleşme merkezi
              </p>
            </div>

            <button
              type="button"
              onClick={() => router.push("/messages")}
              className="flex h-11 w-11 items-center justify-center rounded-[18px] border border-[#C7E8E5] bg-white/90 text-[#0F766E] shadow-sm active:scale-[0.98]"
              aria-label="Mesajlar"
            >
              <MessageCircle size={20} />
            </button>
          </div>

          <div className="mt-3 flex items-center justify-between gap-3 rounded-[18px] border border-[#B8E5E2] bg-white/85 px-3 py-2">
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[14px] bg-[#CCFBF1] text-[#0F766E]">
                <WalletCards size={18} />
              </span>
              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase tracking-[0.12em] text-[#64748B]">
                  Kontör Bakiyesi
                </p>
                <p className="truncate text-[14px] font-black text-[#083344]">
                  {walletBalance === null
                    ? "Kontrol ediliyor"
                    : `${walletBalance.toLocaleString("tr-TR")} kontör`}
                </p>
              </div>
            </div>

            <span className="shrink-0 rounded-full bg-[#0F766E] px-3 py-1.5 text-[9.5px] font-black text-white">
              İş fırsatı merkezi
            </span>
          </div>

          <section
            className={`mt-2 rounded-[16px] border px-3 py-2.5 text-center ${
              canUsePoolActions
                ? "border-emerald-200 bg-emerald-50"
                : "border-amber-200 bg-amber-50"
            }`}
          >
            <div
              className={`flex items-center justify-center gap-1.5 text-[10.5px] font-black ${
                canUsePoolActions ? "text-emerald-800" : "text-amber-800"
              }`}
            >
              <BadgeCheck size={15} />
              <span>
                {canUsePoolActions
                  ? `${membershipAccess?.packageName || "Aktif üyelik"} · Havuz işlemleri açık`
                  : "Havuz işlemleri kilitli"}
              </span>
            </div>

            {!canUsePoolActions && (
              <>
                <p className="mt-1 text-[9.5px] font-bold leading-4 text-amber-800">
                  {poolActionLockMessage}
                </p>
                <Link
                  href="/uyelik"
                  className="mt-1.5 inline-flex min-h-[30px] items-center justify-center rounded-full border border-amber-300 bg-white px-3 text-[9.5px] font-black text-amber-800"
                >
                  Üyelik Merkezi
                </Link>
              </>
            )}
          </section>

          <div className="mt-3 grid grid-cols-4 overflow-hidden rounded-[18px] border border-[#D7E9E7] bg-white text-center">
            <PoolMetric label="Havuz" value={eligibleUnits.length + projectCount} tone="teal" />
            <PoolMetric label="Güçlü Eşleşme" value={strongMatchCount} tone="blue" />
            <PoolMetric label="EPH Onaylı" value={verifiedPoolCount} tone="green" />
            <PoolMetric label="Haritada" value={poolMapItems.length} tone="orange" />
          </div>

          <div className="mt-3 rounded-[18px] border border-[#B8E5E2] bg-[#F0FDFA] px-3 py-2.5 text-center">
            <div className="flex items-center justify-center gap-2 text-[#0F766E]">
              <Target size={16} />
              <p className="text-[11px] font-black">
                CRM kayıtlarınla {strongMatchCount} güçlü portföy eşleşmesi
              </p>
            </div>
            <p className="mt-1 text-[9.5px] font-bold leading-4 text-[#64748B]">
              En yüksek uyum %{bestMatchScore} · {matchedCustomerCount} uygun müşteri
            </p>
          </div>
        </section>

        <section className="rounded-[24px] border-2 border-[#C7D6E8] bg-white p-2.5 shadow-[0_10px_24px_rgba(15,23,42,0.045)]">
          <div className="flex items-center gap-2 rounded-[17px] border-2 border-[#C7D6E8] bg-[#EEF3F8] px-3 py-2">
            <Search size={16} className="text-[#64748B]" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="h-8 min-w-0 flex-1 bg-transparent text-[12px] font-bold text-[#1F2937] outline-none placeholder:text-[#64748B]"
              placeholder="Portföy, şehir, ilçe, mahalle ara..."
            />
          </div>

          <div className="mt-2 rounded-[18px] border-2 border-[#B8E5E2] bg-[#F0FDFA] p-2">
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <button
                type="button"
                onClick={() => requestNearbySearch()}
                disabled={nearbyLoading}
                className={`flex min-h-[44px] items-center justify-center gap-2 rounded-[15px] px-3 text-[12px] font-black transition active:scale-[0.98] disabled:opacity-60 ${
                  nearbyActive
                    ? "bg-[#0F766E] text-white"
                    : "border-2 border-[#14B8A6] bg-white text-[#0F766E]"
                }`}
              >
                {nearbyLoading ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  <Crosshair size={17} />
                )}
                {nearbyActive ? "Konumum Aktif" : "Yakınımda Ara"}
              </button>

              {nearbyActive && (
                <button
                  type="button"
                  onClick={clearNearbySearch}
                  className="flex h-11 w-11 items-center justify-center rounded-[15px] border-2 border-rose-200 bg-white text-rose-600"
                  aria-label="Yakınlık filtresini kaldır"
                >
                  <X size={17} />
                </button>
              )}
            </div>

            <div className="mt-2 grid grid-cols-4 gap-1.5">
              {NEARBY_RADIUS_OPTIONS.map((radius) => {
                const active = nearbyActive && nearbyRadiusKm === radius;

                return (
                  <button
                    key={radius}
                    type="button"
                    onClick={() => changeNearbyRadius(radius)}
                    className={`min-h-[35px] rounded-[13px] border text-[10.5px] font-black ${
                      active
                        ? "border-[#0F766E] bg-[#0F766E] text-white"
                        : "border-[#B8E5E2] bg-white text-[#0F766E]"
                    }`}
                  >
                    {radius} km
                  </button>
                );
              })}
            </div>

            {nearbyActive && (
              <div className="mt-2 flex items-center justify-between gap-2 rounded-[13px] bg-white px-2.5 py-2">
                <span className="min-w-0 text-[9.5px] font-black text-[#0F766E]">
                  📍 Yakınımda · {nearbyRadiusKm} km
                </span>
                <strong className="shrink-0 text-[10px] font-black text-[#083344]">
                  {filteredPoolItems.length} sonuç
                </strong>
              </div>
            )}

            {nearbyError && (
              <p className="mt-2 rounded-[13px] border border-amber-200 bg-amber-50 px-2.5 py-2 text-center text-[9.5px] font-black leading-4 text-amber-700">
                {nearbyError}
              </p>
            )}
          </div>

          <div className="mt-2 grid grid-cols-[1fr_auto] gap-2">
            <button
              type="button"
              onClick={() => setFilterOpen(true)}
              className="flex min-h-[44px] items-center justify-center gap-2 rounded-[16px] border-2 border-[#2563EB] bg-[#EFF6FF] px-3 text-[12px] font-black text-[#1D4ED8]"
            >
              <SlidersHorizontal size={16} />
              Gelişmiş Filtreler
              {activeFilterCount > 0 && (
                <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-[#2563EB] px-1.5 text-[10px] font-black text-white">
                  {activeFilterCount}
                </span>
              )}
            </button>

            <div className="flex min-w-[82px] flex-col items-center justify-center rounded-[16px] border-2 border-[#C7D6E8] bg-white px-2 text-center">
              <strong className="text-[16px] font-black leading-none text-[#2563EB]">
                {filteredPoolItems.length}
              </strong>
              <span className="mt-1 text-[8.5px] font-black text-[#64748B]">
                Sonuç
              </span>
            </div>
          </div>

          {(activeFilterChips.length > 0 || nearbyActive) && (
            <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
              {nearbyActive && (
                <button
                  type="button"
                  onClick={clearNearbySearch}
                  className="flex shrink-0 items-center gap-1 rounded-full border border-[#99F6E4] bg-[#F0FDFA] px-2.5 py-1 text-[9.5px] font-black text-[#0F766E]"
                >
                  <span>📍 Yakınımda · {nearbyRadiusKm} km</span>
                  <X size={11} />
                </button>
              )}

              {activeFilterChips.slice(0, 12).map((chip, index) => (
                <span
                  key={`${chip}-${index}`}
                  className="shrink-0 rounded-full border border-[#BFDBFE] bg-[#EFF6FF] px-2.5 py-1 text-[9.5px] font-black text-[#1D4ED8]"
                >
                  {chip}
                </span>
              ))}

              {activeFilterChips.length > 12 && (
                <span className="shrink-0 rounded-full border border-[#C7D6E8] bg-white px-2.5 py-1 text-[9.5px] font-black text-[#64748B]">
                  +{activeFilterChips.length - 12}
                </span>
              )}

              <button
                type="button"
                onClick={() => setFilters(createEmptyHavuzFilters())}
                className="shrink-0 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[9.5px] font-black text-rose-700"
              >
                Temizle
              </button>
            </div>
          )}
        </section>

        <section className="rounded-[22px] border-2 border-[#C7D6E8] bg-white p-2 shadow-[0_10px_24px_rgba(15,23,42,0.045)]">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setViewMode("LIST")}
              className={`flex min-h-[42px] items-center justify-center gap-2 rounded-[16px] border-2 text-[12px] font-black ${
                viewMode === "LIST"
                  ? "border-[#2563EB] bg-[#2563EB] text-white"
                  : "border-[#C7D6E8] bg-[#F8FAFC] text-[#64748B]"
              }`}
            >
              <List size={15} /> Liste
            </button>
            <button
              type="button"
              onClick={() => setViewMode("MAP")}
              className={`flex min-h-[42px] items-center justify-center gap-2 rounded-[16px] border-2 text-[12px] font-black ${
                viewMode === "MAP"
                  ? "border-[#2563EB] bg-[#2563EB] text-white"
                  : "border-[#C7D6E8] bg-[#F8FAFC] text-[#64748B]"
              }`}
            >
              <MapIcon size={15} /> Harita
            </button>
          </div>
        </section>

        {viewMode === "MAP" && (
          <PoolMapSection
            items={poolMapItems}
            userLocation={nearbyActive ? userLocation : null}
            nearbyRadiusKm={nearbyActive ? nearbyRadiusKm : null}
            selectedUnitId={selectedMapUnitId}
            onSelectUnit={setSelectedMapUnitId}
            onNavigateToCard={focusPoolCard}
            busyAction={busyAction}
            canUsePoolActions={canUsePoolActions}
            onDetail={(unit, match) => setDetailSelection({ unit, match })}
            onMessage={(unit) => setContactUnit(unit)}
            onAction={(type, unit, match) =>
              setSelectedAction({ type, unit, score: match.score })
            }
            onLocation={openPoolLocation}
          />
        )}

        {errorMessage && (
          <section className="rounded-[18px] border-2 border-red-300 bg-red-50 p-3 text-center text-[12px] font-black leading-5 text-red-700 shadow-[0_10px_22px_rgba(220,38,38,0.10)] break-words [overflow-wrap:anywhere]">
            {limitText(errorMessage, 180)}
          </section>
        )}

        <PoolProjectCenter
          search={search}
          viewMode={viewMode}
          canUsePoolActions={canUsePoolActions}
          actionLockMessage={poolActionLockMessage}
          onCountChange={setProjectCount}
        />

        <section className="space-y-3">
          {displayedUnits.length > 0 ? (
            displayedUnits.map(({ unit, match, distanceKm }, index) => (
              <div key={unit.id} className="space-y-2">
                {nearbyActive && distanceKm !== null && (
                  <div className="flex items-center justify-between gap-2 rounded-[16px] border border-[#99F6E4] bg-[#F0FDFA] px-3 py-2 text-[#0F766E]">
                    <span className="flex min-w-0 items-center gap-1.5 text-[10.5px] font-black">
                      <Crosshair size={14} className="shrink-0" />
                      {formatNearbyDistance(distanceKm)}
                    </span>
                    <span className="shrink-0 rounded-full bg-white px-2 py-1 text-[9px] font-black text-[#64748B]">
                      {nearbyRadiusKm} km alanı
                    </span>
                  </div>
                )}

                <PoolUnitCard
                  index={index}
                  unit={unit}
                  match={match}
                  isOwnPortfolio={Boolean(unit.project?.isOwnPortfolio)}
                  selected={selectedMapUnitId === unit.id}
                  busyAction={busyAction}
                  canUsePoolActions={canUsePoolActions}
                  onWithdraw={() => withdrawOwnPoolPortfolio(unit)}
                  onDetail={() => setDetailSelection({ unit, match })}
                  onMessage={() => setContactUnit(unit)}
                  onLocation={() => openPoolLocation(unit)}
                />
              </div>
            ))
          ) : projectCount === 0 ? (
            <section className="rounded-[24px] border-2 border-dashed border-[#C7D6E8] bg-white p-6 text-center">
              <Building2 className="mx-auto text-[#2563EB]" size={26} />
              <h2 className="mt-3 text-[17px] font-black text-[#1F2937]">
                Havuza uygun portföy yok
              </h2>
              <p className="mt-1 text-[12px] font-bold leading-5 text-[#64748B]">
                Yetki belgesi tamamlanan portföyler burada görünür.
              </p>
              <Link
                href="/stok"
                className="mt-4 inline-flex min-h-[40px] items-center justify-center rounded-[16px] bg-[#2563EB] px-4 text-[12px] font-black text-white"
              >
                Portföy Merkezi
              </Link>
            </section>
          ) : null}
        </section>
      </div>

      <HavuzFilterCenter
        open={filterOpen}
        items={matchedUnits}
        filters={filters}
        resultCount={filteredPoolItems.length}
        onChange={setFilters}
        onClose={() => setFilterOpen(false)}
      />

      {detailSelection && (
        <PoolDetailModal
          unit={detailSelection.unit}
          busyAction={busyAction}
          isOwnPortfolio={Boolean(
            detailSelection.unit.project?.isOwnPortfolio,
          )}
          canUsePoolActions={canUsePoolActions}
          onPresentation={() => setPresentationUnit(detailSelection.unit)}
          onClose={closeDetailSelection}
          onLocation={() => openPoolLocation(detailSelection.unit)}
        />
      )}

      <CustomerPresentationSheet
        open={Boolean(presentationUnit)}
        unitId={presentationUnit?.id || ""}
        ephId={presentationUnit ? getEphId(presentationUnit.id) : ""}
        source="POOL"
        onClose={() => setPresentationUnit(null)}
      />

      {selectedAction && (
        <PoolActionModal
          action={selectedAction}
          busy={
            busyAction === `${selectedAction.type}_${selectedAction.unit.id}`
          }
          onClose={() => setSelectedAction(null)}
          onConfirm={() => confirmPoolAction(selectedAction)}
        />
      )}

      {locationUnit && (
        <PoolLocationModal
          unit={locationUnit}
          balance={walletBalance}
          busy={busyAction === `LOCATION_${locationUnit.id}`}
          onClose={() => setLocationUnit(null)}
          onConfirm={confirmPoolLocation}
        />
      )}

      {contactUnit && (
        <PoolContactModal
          unit={contactUnit}
          balance={walletBalance}
          busyAction={busyAction}
          onClose={() => setContactUnit(null)}
          onInternalMessage={() => {
            const match = calculateMatch(contactUnit, customers);
            setContactUnit(null);
            void startPoolMessage(contactUnit, match.score);
          }}
          onChannel={(channel) =>
            void startPoolExternalContact(contactUnit, channel)
          }
        />
      )}
    </main>
  );
}

function PoolMetric({
  label,
  value,
  tone = "teal",
}: {
  label: string;
  value: string | number;
  tone?: "teal" | "blue" | "green" | "orange";
}) {
  const color =
    tone === "blue"
      ? "text-[#2563EB]"
      : tone === "green"
        ? "text-emerald-600"
        : tone === "orange"
          ? "text-orange-600"
          : "text-[#0F766E]";

  return (
    <div className="border-r border-[#E2F1EF] px-1 py-2 last:border-r-0">
      <p className={`text-[15px] font-black leading-none ${color}`}>{value}</p>
      <p className="mt-1 break-words text-[8px] font-black leading-3 text-[#64748B]">
        {label}
      </p>
    </div>
  );
}

function PoolMapSection({
  items,
  userLocation,
  nearbyRadiusKm,
  selectedUnitId,
  busyAction,
  canUsePoolActions,
  onSelectUnit,
  onNavigateToCard,
  onDetail,
  onMessage,
  onAction,
  onLocation,
}: {
  items: PoolMapItem[];
  userLocation: UserLocation | null;
  nearbyRadiusKm: number | null;
  selectedUnitId: string;
  busyAction: string | null;
  canUsePoolActions: boolean;
  onSelectUnit: (unitId: string) => void;
  onNavigateToCard: (unitId: string) => void;
  onDetail: (
    unit: Unit,
    match: { score: number; customer: Customer | null; budgetDiff: number },
  ) => void;
  onMessage: (
    unit: Unit,
    match: { score: number; customer: Customer | null; budgetDiff: number },
  ) => void;
  onAction: (
    type: PoolAction,
    unit: Unit,
    match: { score: number; customer: Customer | null; budgetDiff: number },
  ) => void;
  onLocation: (unit: Unit) => void;
}) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRefs = useRef<any[]>([]);
  const userMarkerRef = useRef<any>(null);
  const radiusCircleRef = useRef<any>(null);
  const infoWindowRef = useRef<any>(null);
  const [mapError, setMapError] = useState("");
  const [mapReady, setMapReady] = useState(false);
  const selectedItem =
    items.find((item) => item.unit.id === selectedUnitId) || items[0] || null;
  const exactCount = items.filter((item) => !item.isApprox).length;
  const approximateCount = items.length - exactCount;
  const selectedActionsDisabled =
    Boolean(busyAction) ||
    !canUsePoolActions ||
    Boolean(selectedItem?.unit.project?.isOwnPortfolio);
  const selectedLocationDisabled =
    Boolean(busyAction) ||
    !selectedItem?.unit.project?.hasLocation ||
    (!selectedItem?.unit.project?.locationUnlocked &&
      !selectedItem?.unit.project?.isOwnPortfolio &&
      !canUsePoolActions);

  useEffect(() => {
    let alive = true;

    setMapError("");
    setMapReady(false);

    loadHavuzGoogleMapsScript()
      .then(() => {
        if (!alive || !mapRef.current || !window.google?.maps) return;

        const center = items[0]
          ? { lat: items[0].lat, lng: items[0].lng }
          : DEFAULT_MAP_CENTER;

        if (!mapInstanceRef.current) {
          mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
            center,
            zoom: items.length > 1 ? 10 : 12,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
            clickableIcons: false,
            gestureHandling: "greedy",
          });
        }

        setMapReady(true);
      })
      .catch((error) => {
        if (!alive) return;
        setMapError(error?.message || "Harita yüklenemedi.");
      });

    return () => {
      alive = false;
    };
  }, [items.length]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    const googleMaps = window.google?.maps;

    if (!map || !googleMaps) return;

    markerRefs.current.forEach((marker) => marker.setMap(null));
    markerRefs.current = [];
    userMarkerRef.current?.setMap?.(null);
    radiusCircleRef.current?.setMap?.(null);
    userMarkerRef.current = null;
    radiusCircleRef.current = null;
    infoWindowRef.current?.close?.();

    const bounds = new googleMaps.LatLngBounds();

    items.forEach((item) => {
      const isSelected = selectedUnitId === item.unit.id;
      const svg = createEphMapPinSvg("#00AFA5", isSelected);
      const marker = new googleMaps.Marker({
        position: { lat: item.lat, lng: item.lng },
        map,
        title: `${item.unit.project?.name || "EPH Portföy"} • ${compactMoney(
          item.unit.price,
          item.unit.priceCurrency,
        )}`,
        optimized: false,
        zIndex: isSelected ? 40 : 20,
        icon: {
          url:
            "data:image/svg+xml;charset=UTF-8," +
            encodeURIComponent(svg),
          scaledSize: new googleMaps.Size(
            isSelected ? 54 : 46,
            isSelected ? 66 : 57,
          ),
          anchor: new googleMaps.Point(
            isSelected ? 27 : 23,
            isSelected ? 66 : 57,
          ),
        },
      });

      if (!infoWindowRef.current) {
        infoWindowRef.current = new googleMaps.InfoWindow({
          disableAutoPan: true,
        });
      }

      const infoHtml = `
        <div style="width:220px;padding:4px 2px;font-family:Arial,sans-serif;color:#0F172A">
          <div style="font-size:10px;font-weight:900;letter-spacing:.08em;color:#008C84;text-transform:uppercase">
            EPH Havuz
          </div>
          <div style="margin-top:4px;font-size:14px;font-weight:900;line-height:1.2">
            ${escapeMapHtml(item.unit.project?.name || "EPH Portföy")}
          </div>
          <div style="margin-top:5px;font-size:11px;font-weight:700;line-height:1.35;color:#64748B">
            ${escapeMapHtml(item.locationLabel)}
          </div>
          <div style="margin-top:7px;font-size:15px;font-weight:900;color:#06194A">
            ${escapeMapHtml(
              compactMoney(item.unit.price, item.unit.priceCurrency),
            )}
          </div>
          <div style="margin-top:4px;font-size:10px;font-weight:800;color:#475569">
            ${escapeMapHtml(typeLabel(item.unit.type))} • ${escapeMapHtml(
              item.unit.status || "Portföy",
            )} • CRM uyumu %${escapeMapHtml(item.match.score)}
          </div>
          <div style="margin-top:7px;border-top:1px solid #DCE8F7;padding-top:6px;font-size:10px;font-weight:900;color:#008C84">
            Kartı görmek için pine tıklayın
          </div>
        </div>
      `;

      marker.addListener("mouseover", () => {
        infoWindowRef.current?.setContent(infoHtml);
        infoWindowRef.current?.open(map, marker);
      });

      marker.addListener("mouseout", () => {
        window.setTimeout(() => infoWindowRef.current?.close(), 120);
      });

      marker.addListener("click", () => {
        infoWindowRef.current?.close();
        onSelectUnit(item.unit.id);
        map.panTo({ lat: item.lat, lng: item.lng });
        map.setZoom(Math.max(map.getZoom() || 11, 12));
        onNavigateToCard(item.unit.id);
      });

      markerRefs.current.push(marker);
      bounds.extend({ lat: item.lat, lng: item.lng });
    });

    if (userLocation) {
      const currentPosition = {
        lat: userLocation.lat,
        lng: userLocation.lng,
      };

      userMarkerRef.current = new googleMaps.Marker({
        position: currentPosition,
        map,
        title: "Buradasınız",
        zIndex: 120,
        icon: {
          path: googleMaps.SymbolPath.CIRCLE,
          scale: 9,
          fillColor: "#0F766E",
          fillOpacity: 1,
          strokeColor: "#FFFFFF",
          strokeWeight: 4,
        },
      });

      if (nearbyRadiusKm) {
        radiusCircleRef.current = new googleMaps.Circle({
          map,
          center: currentPosition,
          radius: nearbyRadiusKm * 1000,
          fillColor: "#14B8A6",
          fillOpacity: 0.09,
          strokeColor: "#0F766E",
          strokeOpacity: 0.8,
          strokeWeight: 2,
          clickable: false,
        });
      }

      bounds.extend(currentPosition);
    }

    if (
      items.length > 1 ||
      (items.length > 0 && Boolean(userLocation))
    ) {
      map.fitBounds(bounds, 44);
    } else if (items.length === 1) {
      map.setCenter({ lat: items[0].lat, lng: items[0].lng });
      map.setZoom(13);
    } else if (userLocation) {
      map.setCenter({ lat: userLocation.lat, lng: userLocation.lng });
      map.setZoom(15);
    } else {
      map.setCenter(DEFAULT_MAP_CENTER);
      map.setZoom(6);
    }
  }, [
    items,
    mapReady,
    nearbyRadiusKm,
    onNavigateToCard,
    onSelectUnit,
    selectedUnitId,
    userLocation?.lat,
    userLocation?.lng,
  ]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedItem) return;
    map.panTo({ lat: selectedItem.lat, lng: selectedItem.lng });
  }, [selectedItem?.unit.id]);

  return (
    <section className="overflow-hidden rounded-[24px] border-2 border-[#C7D6E8] bg-white shadow-[0_12px_30px_rgba(15,23,42,0.07)]">
      <div className="flex items-center justify-between gap-2 border-b-2 border-[#C7D6E8] bg-[#F8FAFC] px-3 py-2">
        <div className="min-w-0">
          <h2 className="text-[15px] font-black tracking-[-0.03em] text-[#1F2937]">
            Havuz Haritası
          </h2>
          <p className="mt-0.5 text-[10px] font-bold leading-4 text-[#64748B]">
            {userLocation
              ? `Konumunuz ve ${nearbyRadiusKm || 1} km yarıçapındaki yaklaşık veya açılmış konumlar.`
              : "Ödeme öncesi yaklaşık, erişim sonrası gerçek konum gösterilir."}
          </p>
        </div>
        <div className="shrink-0 rounded-[15px] border-2 border-[#C7D6E8] bg-white px-2.5 py-1.5 text-center">
          <p className="text-[15px] font-black leading-none text-[#2563EB]">
            {items.length}
          </p>
          <p className="mt-0.5 text-[8px] font-black text-[#64748B]">Pin</p>
        </div>
      </div>

      <div className="relative h-[360px] w-full overflow-hidden bg-[#EEF3F8]">
        <div ref={mapRef} className="h-full w-full" />

        {!mapReady && !mapError && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#EEF3F8] text-center">
            <div>
              <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-[#2563EB] border-t-transparent" />
              <p className="mt-3 text-[12px] font-black text-[#64748B]">
                Havuz haritası yükleniyor...
              </p>
            </div>
          </div>
        )}

        {mapError && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#EEF3F8] px-4 text-center">
            <div className="rounded-[22px] border-2 border-amber-200 bg-amber-50 p-4 text-[12px] font-black leading-5 text-amber-700">
              {mapError}
            </div>
          </div>
        )}
      </div>

      <div className="border-t-2 border-[#C7D6E8] bg-white px-2 py-2 text-center text-[11px] font-black text-[#64748B]">
        <span className="text-emerald-600">{exactCount}</span> gerçek ·{" "}
        <span className="text-[#2563EB]">{approximateCount}</span> yaklaşık konum
      </div>

      {selectedItem ? (
        <div className="border-t-2 border-[#C7D6E8] bg-[#F8FAFC] p-2.5">
          <div className="rounded-[20px] border-2 border-[#C7D6E8] bg-white p-2.5 shadow-[0_8px_18px_rgba(15,23,42,0.04)]">
            <div className="text-center">
              <div className="min-w-0 text-center">
                <p className="text-[9px] font-black uppercase tracking-[0.12em] text-[#2563EB]">
                  {selectedItem.isApprox ? "Yaklaşık Konum" : "Gerçek Konum"} •{" "}
                  {getEphId(selectedItem.unit.id)}
                </p>
                <h3 className="mt-1 text-[15px] font-black leading-[1.12] text-[#1F2937] break-words [overflow-wrap:anywhere]">
                  {limitText(
                    selectedItem.unit.project?.name || "EPH Portföy",
                    70,
                  )}
                </h3>
                <p className="mt-1 flex min-w-0 items-start justify-center gap-1 text-[11px] font-bold leading-4 text-[#64748B]">
                  <MapPin size={12} className="mt-0.5 shrink-0" />
                  <span className="min-w-0 break-words [overflow-wrap:anywhere]">
                    {limitText(selectedItem.locationLabel, 48)}
                  </span>
                </p>
              </div>
              <span className="mt-2 inline-flex items-center justify-center rounded-full bg-[#2563EB] px-2.5 py-1 text-center text-[11px] font-black text-white">
                {compactMoney(
                  selectedItem.unit.price,
                  selectedItem.unit.priceCurrency,
                )}
              </span>
            </div>

            <div className="mt-2 grid grid-cols-3 gap-2">
              <SmallInfo
                label="Tip"
                value={typeLabel(selectedItem.unit.type)}
              />
              <SmallInfo
                label="Oda"
                value={selectedItem.unit.roomCount || "—"}
              />
              <SmallInfo
                label="EPH ID"
                value={getEphId(selectedItem.unit.id)}
              />
            </div>

            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onDetail(selectedItem.unit, selectedItem.match)}
                className="flex min-h-[36px] items-center justify-center gap-1 rounded-[14px] border-2 border-[#C7D6E8] bg-white text-[11px] font-black text-[#1F2937]"
              >
                <Navigation size={13} className="text-[#2563EB]" /> Havuz Detay
              </button>
              <button
                type="button"
                onClick={() => onMessage(selectedItem.unit, selectedItem.match)}
                disabled={selectedActionsDisabled}
                className="flex min-h-[36px] items-center justify-center gap-1 rounded-[14px] border-2 border-[#C7D6E8] bg-white text-[11px] font-black text-[#1F2937] disabled:opacity-60"
              >
                <MessageCircle size={13} className="text-[#2563EB]" /> İletişime Geç 3K
              </button>
              <button
                type="button"
                onClick={() =>
                  onAction("LEAD", selectedItem.unit, selectedItem.match)
                }
                disabled={selectedActionsDisabled}
                className="col-span-2 min-h-[36px] rounded-[14px] border-2 border-[#2563EB] bg-[#2563EB] text-[11px] font-black text-white disabled:opacity-60"
              >
                Müşterim Var 20K
              </button>
              <button
                type="button"
                onClick={() => onLocation(selectedItem.unit)}
                disabled={selectedLocationDisabled}
                className={`col-span-2 flex min-h-[40px] items-center justify-center gap-1 rounded-[14px] border-2 text-[11px] font-black disabled:opacity-60 ${
                  selectedItem.unit.project?.locationUnlocked
                    ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                    : "border-[#2563EB] bg-[#EFF6FF] text-[#1D4ED8]"
                }`}
              >
                <Navigation size={14} />
                {getPoolLocationButtonLabel(selectedItem.unit)}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="border-t-2 border-[#C7D6E8] bg-[#F8FAFC] p-4 text-center text-[12px] font-black text-[#64748B]">
          Haritada gösterilecek havuz portföyü bulunamadı.
        </div>
      )}
    </section>
  );
}

function KontorSuccessToast({ toast }: { toast: SuccessToast }) {
  return (
    <div role="status" aria-live="assertive" aria-atomic="true" className="fixed left-1/2 top-[78px] z-[90] w-[calc(100%-24px)] max-w-[410px] -translate-x-1/2">
      <section className="relative overflow-hidden rounded-[22px] border-2 border-[#35FF8A] bg-[#021B18] p-3 text-center text-white shadow-[0_0_0_1px_rgba(53,255,138,0.25),0_0_26px_rgba(53,255,138,0.52),0_18px_44px_rgba(15,23,42,0.32)]">
        <div className="pointer-events-none absolute -left-10 -top-12 h-28 w-28 rounded-full bg-[#35FF8A]/25 blur-2xl" />
        <div className="pointer-events-none absolute -right-8 -bottom-14 h-32 w-32 rounded-full bg-[#00E5FF]/18 blur-2xl" />
        <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-[#35FF8A] to-transparent" />

        <div className="relative mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-[#8DFFB5] bg-[#052E26] text-[#8DFFB5] shadow-[0_0_20px_rgba(53,255,138,0.72)]">
          <CheckCircle2 size={22} />
        </div>

        <p className="relative mt-2 text-[10px] font-black uppercase tracking-[0.16em] text-[#8DFFB5] drop-shadow-[0_0_8px_rgba(53,255,138,0.85)]">
          İşlem Başarılı
        </p>
        <h3 className="relative mt-0.5 text-[15px] font-black tracking-[-0.02em] text-white">
          {toast.title}
        </h3>
        <p className="relative mt-1 text-[12px] font-black leading-5 text-[#D9FFE8] break-words [overflow-wrap:anywhere]">
          {limitText(toast.message, 120)}
        </p>
      </section>
    </div>
  );
}

function getHighlightFeatures(unit: Unit) {
  return getFeatureLabels(unit.features).slice(0, 3);
}

type PremiumHighlight = {
  icon: string;
  title: string;
  text: string;
};

function getPremiumPortfolioHighlights(unit: Unit): PremiumHighlight[] {
  const highlights: PremiumHighlight[] = [];

  if (unit.project?.district || unit.project?.city) {
    highlights.push({
      icon: "📍",
      title: "Konum",
      text: getLocation(unit),
    });
  }

  if (unit.area) {
    highlights.push({
      icon: "📐",
      title: "Alan",
      text: `${Number(unit.area).toLocaleString("tr-TR")} m²`,
    });
  }

  if (unit.netArea) {
    highlights.push({
      icon: "📏",
      title: "Net Alan",
      text: `${Number(unit.netArea).toLocaleString("tr-TR")} m²`,
    });
  }

  if (unit.roomCount) {
    highlights.push({
      icon: "🏡",
      title: "Oda Planı",
      text: unit.roomCount,
    });
  }

  if (unit.floorLabel || (unit.floor !== null && unit.floor !== undefined)) {
    highlights.push({
      icon: "🏢",
      title: "Kat",
      text: unit.floorLabel || String(unit.floor),
    });
  }

  if (unit.totalFloors) {
    highlights.push({
      icon: "🏗️",
      title: "Toplam Kat",
      text: String(unit.totalFloors),
    });
  }

  if (unit.conceptLabel) {
    highlights.push({
      icon: "✨",
      title: "Konsept",
      text: unit.conceptLabel,
    });
  }

  if (Array.isArray(unit.facades) && unit.facades.length > 0) {
    highlights.push({
      icon: "🧭",
      title: "Cephe",
      text: unit.facades.join(", "),
    });
  }

  const metadata = decodePortfolioMetadataState(unit.features);
  Object.entries(metadata).forEach(([key, value]) => {
    highlights.push({ icon: "🏷️", title: getMetadataLabel(key), text: value });
  });

  getFeatureLabels(unit.features).forEach((feature) => {
    highlights.push({ icon: "✅", title: feature, text: "Bu portföyde mevcut" });
  });

  const fallback: PremiumHighlight[] = [
    {
      icon: "🔑",
      title: "Satışa Hazır Sunum",
      text: "Havuz görüşmesi için sade ve net bilgi",
    },
  ];

  return Array.from(
    new Map(
      [...highlights, ...fallback].map((item) => [item.title, item]),
    ).values(),
  ).slice(0, 9);
}

function getVisiblePortfolioDetails(unit: Unit): PremiumHighlight[] {
  const imageCount = Array.isArray(unit.images) ? unit.images.length : 0;
  const details: PremiumHighlight[] = [];

  details.push({
    icon: "🏷️",
    title: "Portföy Tipi",
    text: typeLabel(unit.type),
  });

  if (unit.status) {
    details.push({
      icon: "📌",
      title: "İşlem Türü",
      text: String(unit.status).replaceAll("_", " "),
    });
  }

  if (unit.roomCount)
    details.push({ icon: "🏠", title: "Oda Planı", text: unit.roomCount });
  if (unit.area)
    details.push({
      icon: "📐",
      title: "Alan",
      text: `${Number(unit.area).toLocaleString("tr-TR")} m²`,
    });
  if (unit.price)
    details.push({
      icon: "💎",
      title: "Fiyat",
      text: compactMoney(unit.price, unit.priceCurrency),
    });

  details.push({ icon: "📍", title: "İl / İlçe / Mahalle", text: getLocation(unit) });

  if (unit.project?.city)
    details.push({ icon: "🗺️", title: "Şehir", text: unit.project.city });
  if (unit.project?.district)
    details.push({ icon: "📌", title: "Bölge", text: unit.project.district });

  details.push({
    icon: "🖼️",
    title: "Galeri",
    text: imageCount ? `${imageCount} fotoğraf` : "Fotoğraf bekleniyor",
  });
  details.push({ icon: "🧾", title: "EPH ID", text: getEphId(unit.id) });

  return Array.from(
    new Map(details.map((item) => [item.title, item])).values(),
  ).slice(0, 9);
}

type PremiumSpec = {
  label: string;
  value: string;
  icon: string;
};

function getPrimarySpecs(unit: Unit) {
  const specs: string[] = [];

  if (unit.roomCount) specs.push(unit.roomCount);
  if (unit.area) specs.push(`${Number(unit.area).toLocaleString("tr-TR")} m²`);

  const feature = getFeatureLabels(unit.features)[0];
  specs.push(feature || typeLabel(unit.type));

  return specs.slice(0, 3);
}

type ApartmentCardSpec = {
  label: string;
  value: string;
};

function isApartmentUnit(unit: Unit) {
  const normalizedType = normalizePoolCardValue(unit.type);
  const source = normalizePoolCardValue(
    [unit.type, unit.description, unit.project?.name]
      .filter(Boolean)
      .join(" "),
  );

  if (
    ["VILLA", "MUSTAKIL", "YALI", "KONAK"].some((item) =>
      source.includes(item),
    )
  ) {
    return false;
  }

  return (
    normalizedType === "KONUT" ||
    normalizedType.includes("DAIRE") ||
    source.includes("APARTMAN DAIRESI") ||
    source.includes("REZIDANS DAIRESI")
  );
}

function formatCardArea(value?: number | null) {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric) || numeric <= 0) return "—";

  return `${numeric.toLocaleString("tr-TR", {
    maximumFractionDigits: 1,
  })} m²`;
}

function getPresentationValue(unit: Unit, labels: string[]) {
  const normalizedLabels = labels.map((label) => normalizePoolCardValue(label));
  const presentationCards = getPropertyPresentationCards(unit);

  const presentationMatch = presentationCards.find((item) => {
    const itemLabel = normalizePoolCardValue(item.label);
    return normalizedLabels.some(
      (label) => itemLabel === label || itemLabel.includes(label),
    );
  });

  if (presentationMatch?.value) {
    return String(presentationMatch.value).trim();
  }

  const metadata = decodePortfolioMetadataState(unit.features);
  const metadataMatch = Object.entries(metadata).find(([key]) => {
    const metadataLabel = normalizePoolCardValue(getMetadataLabel(key));
    return normalizedLabels.some(
      (label) => metadataLabel === label || metadataLabel.includes(label),
    );
  });

  return metadataMatch?.[1] ? String(metadataMatch[1]).trim() : "";
}

function getApartmentFloorValue(unit: Unit) {
  const floor =
    unit.floor !== null && unit.floor !== undefined
      ? String(unit.floor).trim()
      : "";
  const floorLabel = String(unit.floorLabel || "").trim();
  const totalFloors = Number(unit.totalFloors || 0);

  if (floorLabel.includes("/")) return floorLabel;

  const selectedFloor = floor || floorLabel;
  if (!selectedFloor) return totalFloors > 0 ? `—/${totalFloors}` : "—";

  return totalFloors > 0 ? `${selectedFloor}/${totalFloors}` : selectedFloor;
}

function getApartmentParkingValue(unit: Unit) {
  const presentationValue = getPresentationValue(unit, [
    "Otopark",
    "Park Yeri",
  ]);
  if (presentationValue) return presentationValue;

  const parkingFeature = getFeatureLabels(unit.features).find((feature) =>
    normalizePoolCardValue(feature).includes("OTOPARK"),
  );

  return parkingFeature || "—";
}

function getApartmentCardSpecs(unit: Unit): ApartmentCardSpec[] {
  const grossArea = Number(unit.grossArea || unit.area || 0);
  const netArea = Number(unit.netArea || 0);
  const facade =
    Array.isArray(unit.facades) && unit.facades.length > 0
      ? unit.facades.join(", ")
      : getPresentationValue(unit, ["Cephe", "Cepheler"]);

  return [
    {
      label: "Oda Sayısı",
      value:
        String(unit.roomCount || "").trim() ||
        getPresentationValue(unit, ["Oda Sayısı", "Oda Planı"]) ||
        "—",
    },
    {
      label: "Brüt m²",
      value:
        grossArea > 0
          ? formatCardArea(grossArea)
          : getPresentationValue(unit, ["Brüt Alan", "Brüt m²", "Alan"]) ||
            "—",
    },
    {
      label: "Net m²",
      value:
        netArea > 0
          ? formatCardArea(netArea)
          : getPresentationValue(unit, ["Net Alan", "Net m²"]) || "—",
    },
    {
      label: "Bulunduğu Kat",
      value: getApartmentFloorValue(unit),
    },
    {
      label: "Bina Yaşı",
      value: getPresentationValue(unit, ["Bina Yaşı", "Yapı Yaşı"]) || "—",
    },
    {
      label: "Isınma Türü",
      value:
        getPresentationValue(unit, [
          "Isınma Türü",
          "Isıtma Türü",
          "Isınma",
          "Isıtma",
        ]) || "—",
    },
    {
      label: "Otopark",
      value: getApartmentParkingValue(unit),
    },
    {
      label: "Cephe",
      value: facade || "—",
    },
  ];
}

function getTypeChip(unit: Unit) {
  const label = typeLabel(unit.type).toLocaleUpperCase("tr-TR");
  if (label.includes("ARSA")) return "ARSA";
  if (label.includes("VİLLA") || label.includes("VILLA")) return "VİLLA";
  if (
    label.includes("DÜKKAN") ||
    label.includes("TİCAR") ||
    label.includes("MAGAZA")
  )
    return "TİCARİ";
  if (label.includes("PROJE")) return "PROJE";
  if (label.includes("KİRA")) return "KİRALIK";
  return label.length > 16 ? "PORTFÖY" : label || "PORTFÖY";
}

function isLandUnit(unit: Unit) {
  const chip = getTypeChip(unit);
  const text = [unit.type, unit.status, unit.description, unit.project?.name]
    .join(" ")
    .toLocaleLowerCase("tr-TR");

  return (
    chip.includes("ARSA") ||
    text.includes("arsa") ||
    text.includes("tarla") ||
    text.includes("bağ") ||
    text.includes("bag")
  );
}

function getAvailableCreditAmount(unit: Unit): number | null {
  const amount = Number(unit.availableCreditAmount || 0);

  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  return amount;
}

function CompactFeaturePill({ text }: { text: string }) {
  return (
    <div className="flex min-h-[25px] min-w-0 items-center justify-center gap-1 rounded-[10px] bg-[#EFF6FF] px-2 text-center text-[9px] font-black leading-[1.05] text-[#1D4ED8]">
      <Sparkles size={10} className="shrink-0" />
      <span className="min-w-0 break-words [overflow-wrap:anywhere]">
        {limitText(text, 24)}
      </span>
    </div>
  );
}

function PremiumHighlightCard({
  item,
  compact = false,
  dense = false,
}: {
  item: PremiumHighlight;
  compact?: boolean;
  dense?: boolean;
}) {
  return (
    <div
      className={`flex min-w-0 items-center gap-2 rounded-[17px] border-2 border-[#D7E3F2] bg-white p-2 text-center shadow-[0_7px_16px_rgba(15,23,42,0.035)] ${
        compact
          ? "min-h-[58px] text-left"
          : dense
            ? "min-h-[92px] flex-col justify-center"
            : "min-h-[78px] flex-col justify-center"
      }`}
    >
      <span
        className={`flex shrink-0 items-center justify-center rounded-[14px] bg-[#EFF6FF] text-center ${
          compact
            ? "h-9 w-9 text-[18px]"
            : dense
              ? "h-9 w-9 text-[18px]"
              : "h-10 w-10 text-[20px]"
        }`}
      >
        {item.icon}
      </span>
      <div className="min-w-0 text-center">
        <p
          className={`${dense ? "text-[9.5px]" : "text-[11px]"} font-black leading-[1.12] tracking-[-0.02em] text-[#1F2937] break-words [overflow-wrap:anywhere]`}
        >
          {limitText(item.title, dense ? 24 : 36)}
        </p>
        <p
          className={`${dense ? "mt-1 text-[8.5px] leading-3" : "mt-0.5 text-[9.5px] leading-4"} font-bold text-[#64748B] break-words [overflow-wrap:anywhere]`}
        >
          {limitText(item.text, dense ? 42 : 54)}
        </p>
      </div>
    </div>
  );
}

type PoolCardVisualTheme = {
  frameGradient: string;
  frameShadow: string;
  typeColor: string;
  typeSoft: string;
  typeBorder: string;
};

type PoolCardStatusTone = {
  label: string;
  borderColor: string;
  backgroundColor: string;
  color: string;
};

function normalizePoolCardValue(value?: string | null) {
  return String(value || "")
    .toLocaleUpperCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/İ/g, "I")
    .trim();
}

function getPoolCardStatusTone(status?: string | null): PoolCardStatusTone {
  const normalized = normalizePoolCardValue(status);

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

  const label =
    labels[normalized] ||
    normalized
      .split("_")
      .filter(Boolean)
      .map(
        (part) =>
          part.charAt(0).toLocaleUpperCase("tr-TR") +
          part.slice(1).toLocaleLowerCase("tr-TR"),
      )
      .join(" ") ||
    "Portföy";

  if (
    ["KIRALIK", "GUNLUK_KIRALIK", "DEVREN_KIRALIK", "KIRALANDI"].includes(
      normalized,
    )
  ) {
    return {
      label,
      borderColor: "#B8C2D1",
      backgroundColor: "#F8FAFC",
      color: "#475569",
    };
  }

  if (
    [
      "SATILIK",
      "DEVREN_SATILIK",
      "ON_SATIS",
      "YAKINDA_SATISTA",
      "HEMEN_TESLIM",
      "SATILDI",
    ].includes(normalized)
  ) {
    return {
      label,
      borderColor: "#E7C766",
      backgroundColor: "#FFF8DB",
      color: "#A16207",
    };
  }

  return {
    label,
    borderColor: "#BFDBFE",
    backgroundColor: "#EFF6FF",
    color: "#1D4ED8",
  };
}

function getPoolCardVisualTheme(unit: Unit): PoolCardVisualTheme {
  const status = normalizePoolCardValue(unit.status);
  const type = normalizePoolCardValue(unit.type);
  const source = normalizePoolCardValue(
    [unit.type, unit.project?.name, unit.description]
      .filter(Boolean)
      .join(" "),
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
    "linear-gradient(135deg,#1D4ED8 0%,#BFDBFE 22%,#2563EB 48%,#EFF6FF 70%,#1E40AF 100%)";
  let frameShadow = "0 14px 30px rgba(37,99,235,0.17)";

  if (rentalStatuses.includes(status)) {
    frameGradient =
      "linear-gradient(135deg,#64748B 0%,#F8FAFC 18%,#A8B3C5 42%,#FFFFFF 62%,#7C8798 100%)";
    frameShadow = "0 14px 30px rgba(100,116,139,0.22)";
  } else if (saleStatuses.includes(status)) {
    frameGradient =
      "linear-gradient(135deg,#7A5A10 0%,#F9E7A4 18%,#B88922 42%,#FFF5C7 62%,#8A6617 100%)";
    frameShadow = "0 14px 32px rgba(184,137,34,0.24)";
  }

  let typeColor = "#6D28D9";
  let typeSoft = "#F5F3FF";
  let typeBorder = "#DDD6FE";

  if (type === "ARSA" || source.includes("ARSA")) {
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
  }

  return {
    frameGradient,
    frameShadow,
    typeColor,
    typeSoft,
    typeBorder,
  };
}

function getCompletePoolDetails(unit: Unit): PremiumHighlight[] {
  const details: PremiumHighlight[] = [];
  const addDetail = (
    icon: string,
    title: string,
    value?: string | number | null,
  ) => {
    const text = String(value ?? "").trim();
    if (!text || text === "Belirtilmedi") return;
    details.push({ icon, title, text });
  };

  addDetail("🏷️", "Portföy Tipi", typeLabel(unit.type));
  addDetail(
    "📌",
    "İşlem Türü",
    unit.status ? String(unit.status).replaceAll("_", " ") : null,
  );
  addDetail(
    "💎",
    "Fiyat",
    unit.price ? compactMoney(unit.price, unit.priceCurrency) : null,
  );
  addDetail("📍", "Konum", getLocation(unit));
  addDetail("🛋️", "Oda Planı", unit.roomCount);
  addDetail(
    "📐",
    "Net Alan",
    unit.netArea ? `${Number(unit.netArea).toLocaleString("tr-TR")} m²` : null,
  );
  addDetail(
    "📐",
    "Brüt Alan",
    unit.grossArea ? `${Number(unit.grossArea).toLocaleString("tr-TR")} m²` : null,
  );
  addDetail(
    "📐",
    "Toplam Alan",
    unit.area ? `${Number(unit.area).toLocaleString("tr-TR")} m²` : null,
  );
  addDetail("🏢", "Bulunduğu Kat", unit.floorLabel ?? unit.floor);
  addDetail("🏗️", "Toplam Kat", unit.totalFloors);
  addDetail("✨", "Konsept", unit.conceptLabel);
  addDetail(
    "🧭",
    "Cepheler",
    Array.isArray(unit.facades) && unit.facades.length > 0
      ? unit.facades.join(", ")
      : null,
  );
  addDetail("🧭", "Ada No", unit.adaNo);
  addDetail("🧭", "Parsel No", unit.parselNo);
  addDetail("🗺️", "İl", unit.project?.city);
  addDetail("📌", "İlçe", unit.project?.district);
  addDetail("🧾", "EPH ID", getEphId(unit.id));
  addDetail(
    "☎️",
    "Telefonla İletişim",
    unit.phoneCallAllowed ? "İzin verildi" : "İzin verilmedi",
  );
  addDetail(
    "💬",
    "WhatsApp İletişimi",
    unit.whatsappAllowed ? "İzin verildi" : "İzin verilmedi",
  );
  addDetail(
    "🖼️",
    "Fotoğraflar",
    Array.isArray(unit.images) && unit.images.length > 0
      ? `${unit.images.length} fotoğraf`
      : null,
  );

  const metadata = decodePortfolioMetadataState(unit.features);
  Object.entries(metadata).forEach(([key, value]) => {
    addDetail("🏷️", getMetadataLabel(key), value);
  });

  getFeatureLabels(unit.features).forEach((feature) => {
    addDetail("✓", "Portföy Özelliği", feature);
  });

  return Array.from(
    new Map(
      details.map((item) => [
        `${item.title.toLocaleUpperCase("tr-TR")}:${item.text.toLocaleUpperCase("tr-TR")}`,
        item,
      ]),
    ).values(),
  );
}

function PoolUnitCard({
  index,
  unit,
  match,
  isOwnPortfolio,
  selected,
  busyAction,
  canUsePoolActions,
  onWithdraw,
  onDetail,
  onMessage,
  onLocation,
}: {
  index: number;
  unit: Unit;
  match: { score: number; customer: Customer | null; budgetDiff: number };
  isOwnPortfolio: boolean;
  selected: boolean;
  busyAction: string | null;
  canUsePoolActions: boolean;
  onWithdraw: () => void;
  onDetail: () => void;
  onMessage: () => void;
  onLocation: () => void;
}) {
  const image = getCover(unit);
  const imageCount = Array.isArray(unit.images) ? unit.images.length : 0;
  const availableCreditAmount = getAvailableCreditAmount(unit);
  const statusTone = getPoolCardStatusTone(unit.status);
  const busy = Boolean(busyAction);
  const messageBusy = busyAction === `MESSAGE_${unit.id}`;
  const premiumCardData = buildEphPremiumCardData(unit, {
    id: unit.id,
    title: unit.project?.name || "EPH Portföy",
    location: getLocation(unit),
    status: statusTone.label,
    price: compactMoney(unit.price, unit.priceCurrency),
    roomCount: String(unit.roomCount || ""),
    area: String(unit.netArea || unit.area || unit.grossArea || ""),
    coverImage: image || "/showcase/stock.jpg",
    portfolioNo: getEphId(unit.id),
    consultantName: "EPH Havuz Portföyü",
    consultantPhone: "Güvenli iletişim",
    shortDescription:
      unit.description || "Bu Havuz portföyü için açıklama girilmemiş.",
    features: [],
  });

  return (
    <div
      id={`pool-card-${unit.id}`}
      data-card-index={index}
      data-unit-id={unit.id}
      className="w-full max-w-full scroll-mt-24"
    >
      <EphHavuzStandartKart
        data={premiumCardData}
        photoCount={imageCount}
        matchScore={match.score}
        availableCreditLabel={
          availableCreditAmount !== null
            ? compactMoney(availableCreditAmount, unit.priceCurrency)
            : null
        }
        isOwnPortfolio={isOwnPortfolio}
        selected={selected}
        busy={busy}
        messageBusy={messageBusy}
        canUsePoolActions={canUsePoolActions}
        onWithdraw={onWithdraw}
        onDetail={onDetail}
        onMessage={onMessage}
        onLocation={onLocation}
      />
    </div>
  );
}

function PoolDetailModal({
  unit,
  busyAction,
  isOwnPortfolio,
  canUsePoolActions,
  onPresentation,
  onClose,
  onLocation,
}: {
  unit: Unit;
  busyAction: string | null;
  isOwnPortfolio: boolean;
  canUsePoolActions: boolean;
  onPresentation: () => void;
  onClose: () => void;
  onLocation: () => void;
}) {
  const images = getUnitImages(unit);
  const fallbackImage = getCover(unit);
  const galleryImages = images.length
    ? images
    : fallbackImage
      ? [fallbackImage]
      : [];
  const [galleryIndex, setGalleryIndex] = useState(0);
  const image = galleryImages[galleryIndex] || galleryImages[0] || "";
  const statusTone = getPoolCardStatusTone(unit.status);
  const detailCardData = buildEphPremiumCardData(unit, {
    id: unit.id,
    title: unit.project?.name || "EPH Portföy",
    location: getLocation(unit),
    status: statusTone.label,
    price: compactMoney(unit.price, unit.priceCurrency),
    roomCount: String(unit.roomCount || ""),
    area: String(unit.netArea || unit.area || unit.grossArea || ""),
    coverImage: image || "/showcase/stock.jpg",
    portfolioNo: getEphId(unit.id),
    consultantName: "EPH Havuz Portföyü",
    consultantPhone: "Güvenli iletişim",
    shortDescription:
      unit.description || "Bu Havuz portföyü için açıklama girilmemiş.",
    features: [],
  });
  const specs: PremiumSpec[] = detailCardData.facts.map((fact) => ({
    label: fact.label,
    value: fact.value || "—",
    icon: "◆",
  }));
  const availableCreditAmount = getAvailableCreditAmount(unit);
  const completeDetails = getCompletePoolDetails(unit);
  const imageCount =
    galleryImages.length ||
    (Array.isArray(unit.images) ? unit.images.length : 0) ||
    0;
  const locationBusy = busyAction === `LOCATION_${unit.id}`;
  const locationDisabled =
    Boolean(busyAction) ||
    !unit.project?.hasLocation ||
    (!unit.project?.locationUnlocked &&
      !isOwnPortfolio &&
      !canUsePoolActions);
  const goPrevImage = () => {
    if (galleryImages.length <= 1) return;
    setGalleryIndex((current) =>
      current === 0 ? galleryImages.length - 1 : current - 1,
    );
  };

  const goNextImage = () => {
    if (galleryImages.length <= 1) return;
    setGalleryIndex((current) =>
      current === galleryImages.length - 1 ? 0 : current + 1,
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/55 px-[max(8px,env(safe-area-inset-left))] pt-[max(10px,env(safe-area-inset-top))] pb-0">
      <section className="flex max-h-[min(94dvh,820px)] w-[min(96vw,430px)] flex-col overflow-hidden rounded-t-[30px] border-2 border-b-0 border-[#C7D6E8] bg-white shadow-[0_24px_60px_rgba(15,23,42,0.28)]">
        <div className="relative shrink-0 bg-white">
          <div className="mx-auto mt-2 h-1.5 w-11 rounded-full bg-[#CBD5E1]" />

          <div className="relative mt-2 h-[320px] overflow-hidden bg-gradient-to-br from-[#EAF1FB] via-white to-[#EEF3F8] sm:h-[340px]">
            <PremiumPropertyImage
              src={image}
              alt={unit.project?.name || "Portföy"}
              className="h-full w-full"
              loading="eager"
              fallback={<Building2 size={40} />}
              fallbackClassName="text-[#2563EB]"
            />

            <div className="pointer-events-none absolute inset-0 z-[2] bg-gradient-to-b from-slate-950/20 via-transparent to-slate-950/35" />

            <div className="absolute left-3 top-3 rounded-full bg-slate-950/82 px-3 py-1.5 text-[11px] font-black text-white shadow-[0_8px_18px_rgba(15,23,42,0.22)]">
              {imageCount || 1} Fotoğraf
            </div>

            {galleryImages.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={goPrevImage}
                  className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white/80 bg-white/92 text-[#1F2937] shadow-[0_10px_22px_rgba(15,23,42,0.20)]"
                  aria-label="Önceki fotoğraf"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  type="button"
                  onClick={goNextImage}
                  className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white/80 bg-white/92 text-[#1F2937] shadow-[0_10px_22px_rgba(15,23,42,0.20)]"
                  aria-label="Sonraki fotoğraf"
                >
                  <ChevronRight size={20} />
                </button>
              </>
            )}

            {galleryImages.length > 1 && (
              <div className="absolute inset-x-3 bottom-3 z-[4] flex items-center justify-center gap-2 overflow-hidden">
                {galleryImages.slice(0, 4).map((item, index) => (
                  <button
                    key={`${item}-${index}`}
                    type="button"
                    onClick={() => setGalleryIndex(index)}
                    className={`relative flex-none overflow-hidden rounded-[12px] border-2 bg-white shadow-[0_8px_18px_rgba(15,23,42,0.24)] transition ${
                      galleryIndex === index
                        ? "border-[#2563EB] ring-2 ring-white/90"
                        : "border-white/85"
                    }`}
                    style={{
                      width: "68px",
                      minWidth: "68px",
                      height: "52px",
                      flex: "0 0 68px",
                    }}
                    aria-label={`${index + 1}. fotoğraf`}
                  >
                    <PremiumPropertyImage
                      src={item}
                      alt={`${unit.project?.name || "Portföy"} ${index + 1}`}
                      className="h-full w-full"
                    />
                    <span className="absolute bottom-1 right-1 z-[2] flex h-4 min-w-4 items-center justify-center rounded-full bg-slate-950/75 px-1 text-[8px] font-black text-white">
                      {index + 1}
                    </span>
                  </button>
                ))}

                {galleryImages.length > 4 && (
                  <button
                    type="button"
                    onClick={() => setGalleryIndex(4)}
                    className={`flex flex-none flex-col items-center justify-center rounded-[12px] border-2 text-center text-white shadow-[0_8px_18px_rgba(15,23,42,0.24)] transition ${
                      galleryIndex >= 4
                        ? "border-[#2563EB] bg-[#1D4ED8] ring-2 ring-white/90"
                        : "border-white/85 bg-slate-950/82"
                    }`}
                    style={{
                      width: "60px",
                      minWidth: "60px",
                      height: "52px",
                      flex: "0 0 60px",
                    }}
                    aria-label="Diğer fotoğraflar"
                  >
                    <span className="text-[14px] font-black leading-none">
                      +{galleryImages.length - 4}
                    </span>
                    <span className="mt-0.5 text-[9px] font-black">Daha</span>
                  </button>
                )}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-5 flex h-11 w-11 items-center justify-center rounded-[16px] border-2 border-white/70 bg-white/95 text-[#2563EB] shadow-[0_8px_18px_rgba(15,23,42,0.15)]"
            aria-label="Kapat"
          >
            <X size={19} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-3 pt-2 [-webkit-overflow-scrolling:touch]">
          <div className="overflow-hidden rounded-[22px] border-2 border-[#C7D6E8] bg-[#F8FAFC] text-center shadow-[0_10px_22px_rgba(15,23,42,0.045)]">
            <div className="px-3 pb-3 pt-3">
              <p className="text-center text-[10px] font-black uppercase tracking-[0.12em] text-[#2563EB]">
                {getTypeChip(unit)} • {getEphId(unit.id)}
              </p>
              <h2 className="mx-auto mt-1 max-w-[340px] text-center text-[19px] font-black leading-[1.08] tracking-[-0.045em] text-[#0F172A] break-words [overflow-wrap:anywhere]">
                {limitText(unit.project?.name || "EPH Portföy", 72)}
              </h2>
              <p className="mt-1.5 flex min-w-0 items-start justify-center gap-1.5 text-center text-[12px] font-bold leading-4 text-[#64748B]">
                <MapPin size={14} className="mt-0.5 shrink-0" />
                <span className="min-w-0 break-words [overflow-wrap:anywhere]">
                  {getLocation(unit)}
                </span>
              </p>
              <p className="mx-auto mt-2 inline-flex min-h-[34px] items-center justify-center rounded-full bg-[#2563EB] px-5 text-center text-[16px] font-black leading-none tracking-[-0.04em] text-white shadow-[0_10px_22px_rgba(37,99,235,0.22)]">
                {compactMoney(unit.price, unit.priceCurrency)}
              </p>
            </div>

            <div className="grid grid-cols-4 gap-1.5 border-t-2 border-[#E2EAF5] bg-white p-2.5">
              {specs.map((spec) => (
                <PremiumSpecCard key={spec.label} spec={spec} />
              ))}
            </div>
          </div>

          <section className="mt-3 overflow-hidden rounded-[22px] border-2 border-[#C7D6E8] bg-white text-center shadow-[0_10px_22px_rgba(15,23,42,0.045)]">
            <div className="border-b-2 border-[#E2EAF5] bg-[#F8FAFC] px-3 py-2.5 text-center">
              <p className="text-center text-[10px] font-black uppercase tracking-[0.12em] text-[#2563EB]">
                Portföy Sahibinin Notu
              </p>
              <p className="mt-1 text-[11px] font-bold leading-4 text-[#64748B]">
                Kullanıcının portföy için yazdığı açıklama
              </p>
            </div>
            <p className="mx-auto max-w-[370px] px-3 py-3 text-center text-[12.5px] font-bold leading-5 text-[#475569] break-words [overflow-wrap:anywhere]">
              {unit.description ||
                "Bu Havuz portföyü için açıklama girilmemiş."}
            </p>
          </section>

          <section className="mt-3 overflow-hidden rounded-[22px] border-2 border-[#C7D6E8] bg-white shadow-[0_10px_22px_rgba(15,23,42,0.045)]">
            <div className="border-b-2 border-[#E2EAF5] bg-[#F8FAFC] px-3 py-2.5 text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#2563EB]">
                Havuz Bilgi Merkezi
              </p>
              <p className="mt-1 text-[11px] font-bold leading-4 text-[#64748B]">
                {availableCreditAmount !== null
                  ? "Kredi ve güvenli iletişim özeti"
                  : "Güvenli iletişim özeti"}
              </p>
            </div>

            <div
              className={`grid gap-1.5 p-2.5 ${
                availableCreditAmount !== null
                  ? "grid-cols-2"
                  : "grid-cols-1"
              }`}
            >
              {availableCreditAmount !== null && (
                <div className="flex min-h-[78px] min-w-0 flex-col items-center justify-center rounded-[15px] border-2 border-emerald-100 bg-emerald-50 px-2 py-2 text-center">
                  <WalletCards
                    size={18}
                    className="shrink-0 text-emerald-700"
                  />
                  <p className="mt-1 text-[9px] font-black uppercase tracking-[0.06em] text-[#64748B]">
                    Kullanılabilir Kredi
                  </p>
                  <p className="mt-1 line-clamp-2 min-w-0 text-[10.5px] font-black leading-[1.2] text-emerald-900 [overflow-wrap:anywhere]">
                    {compactMoney(
                      availableCreditAmount,
                      unit.priceCurrency,
                    )}
                  </p>
                </div>
              )}

              <div className="flex min-h-[78px] min-w-0 flex-col items-center justify-center rounded-[15px] border-2 border-violet-100 bg-violet-50 px-2 py-2 text-center">
                <MessageCircle
                  size={18}
                  className="shrink-0 text-violet-700"
                />
                <p className="mt-1 text-[9px] font-black uppercase tracking-[0.06em] text-[#64748B]">
                  Güvenli İletişim
                </p>
                <p className="mt-1 line-clamp-2 min-w-0 text-[10.5px] font-black leading-[1.2] text-violet-900 [overflow-wrap:anywhere]">
                  EPH üzerinden
                </p>
              </div>
            </div>

            <p className="border-t border-[#E2EAF5] bg-[#FBFDFF] px-3 py-2 text-center text-[10px] font-bold leading-4 text-[#64748B]">
              Portföy sahibinin telefon, e-posta ve özel kullanıcı bilgileri
              paylaşılmaz.
            </p>
          </section>

          <section className="mt-3 overflow-hidden rounded-[22px] border-2 border-[#C7D6E8] bg-white shadow-[0_10px_22px_rgba(15,23,42,0.045)]">
            <div className="border-b-2 border-[#E2EAF5] bg-[#F8FAFC] px-3 py-2.5 text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#2563EB]">
                Tüm Portföy Bilgileri
              </p>
              <p className="mt-1 text-[11px] font-bold leading-4 text-[#64748B]">
                Kullanıcının ilan oluştururken girdiği tüm bilgiler
              </p>
            </div>
            <div className="grid grid-cols-2 gap-1.5 p-2.5">
              {completeDetails.map((item) => (
                <PremiumHighlightCard
                  key={`${item.title}-${item.text}`}
                  item={item}
                  dense
                />
              ))}
            </div>
          </section>
        </div>

        <div className="grid shrink-0 grid-cols-2 gap-2 border-t-2 border-[#C7D6E8] bg-white/95 p-2.5 pb-[max(12px,env(safe-area-inset-bottom))] shadow-[0_-12px_28px_rgba(15,23,42,0.08)]">
          <button
            type="button"
            onClick={onLocation}
            disabled={locationDisabled}
            className={`flex min-h-[46px] w-full items-center justify-center gap-1.5 rounded-[15px] border-2 px-2 text-[11px] font-black disabled:opacity-60 ${
              unit.project?.locationUnlocked
                ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                : "border-[#2563EB] bg-[#EFF6FF] text-[#1D4ED8]"
            }`}
          >
            <Navigation size={14} />
            {locationBusy ? "Konum Açılıyor..." : getPoolLocationButtonLabel(unit)}
          </button>

          <button
            type="button"
            onClick={onPresentation}
            disabled={!canUsePoolActions}
            className="flex min-h-[46px] w-full items-center justify-center gap-1.5 rounded-[15px] border-2 border-[#16A34A] bg-[#F0FDF4] px-2 text-[11px] font-black text-[#15803D] disabled:opacity-60"
          >
            <Share2 size={14} />
            {canUsePoolActions ? "Müşteri Sunumu" : "Üyelik Gerekli"}
          </button>
        </div>
      </section>
    </div>
  );
}

function PremiumSpecCard({ spec }: { spec: PremiumSpec }) {
  return (
    <div className="flex min-h-[66px] min-w-0 flex-col items-center justify-center rounded-[16px] border-2 border-[#C7D6E8] bg-[#F8FAFC] px-1.5 text-center shadow-[0_6px_12px_rgba(15,23,42,0.035)]">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[11px] bg-white text-[13px] font-black text-[#2563EB] shadow-[0_6px_12px_rgba(15,23,42,0.05)]">
        {spec.icon}
      </div>
      <p className="mt-1 text-[7.5px] font-black uppercase tracking-[0.06em] text-[#64748B]">
        {spec.label}
      </p>
      <p className="mt-0.5 text-[10px] font-black leading-[1.08] text-[#0F172A] break-words [overflow-wrap:anywhere]">
        {limitText(spec.value, 24)}
      </p>
    </div>
  );
}

function PoolContactModal({
  unit,
  balance,
  busyAction,
  onClose,
  onInternalMessage,
  onChannel,
}: {
  unit: Unit;
  balance: number | null;
  busyAction: string | null;
  onClose: () => void;
  onInternalMessage: () => void;
  onChannel: (channel: "CALL" | "WHATSAPP") => void;
}) {
  const busy = Boolean(busyAction);
  const phoneAllowed = Boolean(unit.phoneCallAllowed);
  const whatsappAllowed = Boolean(unit.whatsappAllowed);
  const noExternalPermission = !phoneAllowed && !whatsappAllowed;

  return (
    <div className="fixed inset-0 z-[85] flex h-[100dvh] items-end justify-center bg-slate-950/55 px-[max(10px,env(safe-area-inset-left))] pt-[max(12px,env(safe-area-inset-top))] pb-[max(10px,env(safe-area-inset-bottom))] sm:items-center">
      <section className="w-full max-w-[430px] overflow-hidden rounded-t-[28px] border-2 border-[#C7D6E8] bg-white shadow-[0_24px_60px_rgba(15,23,42,0.28)] sm:rounded-[28px]">
        <div className="relative border-b border-[#D7E3F2] bg-[#F8FAFC] px-14 pb-3 pt-4 text-center">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-[16px] border-2 border-[#BFDBFE] bg-[#EFF6FF] text-[#2563EB]">
            <MessageCircle size={22} />
          </div>
          <p className="mt-2 text-[9px] font-black uppercase tracking-[0.14em] text-[#2563EB]">
            Havuz İletişim Merkezi
          </p>
          <h2 className="mt-1 text-[20px] font-black text-[#1F2937]">
            İletişim Yöntemi Seç
          </h2>

          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-[15px] border-2 border-[#C7D6E8] bg-white text-[#2563EB] disabled:opacity-60"
            aria-label="Kapat"
          >
            <X size={19} />
          </button>
        </div>

        <div className="p-3">
          <div className="rounded-[18px] border-2 border-[#C7D6E8] bg-[#F8FAFC] p-3 text-center">
            <p className="text-[9px] font-black uppercase tracking-[0.1em] text-[#64748B]">
              Portföy
            </p>
            <p className="mt-1 text-[12px] font-black text-[#1F2937]">
              {getEphId(unit.id)} • {unit.project?.name || "EPH Portföy"}
            </p>
            <p className="mt-1 text-[10px] font-bold text-[#64748B]">
              Mevcut bakiye: {balance ?? "—"} kontör
            </p>
          </div>

          {noExternalPermission && (
            <p className="mt-2 rounded-[16px] border border-slate-200 bg-slate-50 px-3 py-2.5 text-center text-[10.5px] font-bold leading-4 text-[#64748B]">
              İlan sahibi telefonla arama veya WhatsApp üzerinden iletişim izni vermemiştir.
            </p>
          )}

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onChannel("CALL")}
              disabled={busy || !phoneAllowed}
              className="flex min-h-[52px] items-center justify-center gap-2 rounded-[16px] border-2 border-[#2563EB] bg-[#EFF6FF] px-2 text-[12px] font-black text-[#1D4ED8] disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none"
            >
              <Phone size={17} />
              Ara 10K
            </button>

            <button
              type="button"
              onClick={() => onChannel("WHATSAPP")}
              disabled={busy || !whatsappAllowed}
              className="flex min-h-[52px] items-center justify-center gap-2 rounded-[16px] border-2 border-emerald-500 bg-emerald-50 px-2 text-[12px] font-black text-emerald-700 disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none"
            >
              <MessageSquareText size={17} />
              WhatsApp 10K
            </button>
          </div>

          <button
            type="button"
            onClick={onInternalMessage}
            disabled={busy}
            className="mt-2 flex min-h-[50px] w-full items-center justify-center gap-2 rounded-[16px] bg-[#2563EB] px-3 text-[12px] font-black text-white shadow-[0_10px_22px_rgba(37,99,235,0.22)] disabled:opacity-60"
          >
            <MessageCircle size={17} />
            EPH Üzerinden İletişim 3K
          </button>
        </div>
      </section>
    </div>
  );
}

function PoolLocationModal({
  unit,
  balance,
  busy,
  onClose,
  onConfirm,
}: {
  unit: Unit;
  balance: number | null;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const ephId = getEphId(unit.id);
  const location = getLocation(unit);

  return (
    <div className="fixed inset-0 z-[80] flex h-[100dvh] items-end justify-center overflow-y-auto overscroll-contain bg-slate-950/55 px-[max(10px,env(safe-area-inset-left))] pt-[max(12px,env(safe-area-inset-top))] pb-[max(10px,env(safe-area-inset-bottom))] sm:items-center">
      <section className="flex max-h-[min(88dvh,640px)] w-full max-w-[430px] flex-col overflow-hidden rounded-t-[26px] border-2 border-[#C7D6E8] bg-white shadow-[0_24px_60px_rgba(15,23,42,0.28)] sm:rounded-[26px]">
        <div className="relative shrink-0 border-b border-[#D7E3F2] bg-[#F8FAFC] px-14 pb-3 pt-4 text-center">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-[16px] border-2 border-[#BFDBFE] bg-[#EFF6FF] text-[#2563EB]">
            <Navigation size={22} />
          </div>
          <p className="mt-2 text-[9px] font-black uppercase tracking-[0.14em] text-[#2563EB]">
            Havuz Konum Erişimi
          </p>
          <h2 className="mt-1 text-[20px] font-black leading-[1.08] tracking-[-0.04em] text-[#1F2937]">
            Konuma Git
          </h2>

          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-[15px] border-2 border-[#C7D6E8] bg-white text-[#2563EB] disabled:opacity-60"
            aria-label="Kapat"
          >
            <X size={19} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3 [-webkit-overflow-scrolling:touch]">
          <div className="grid grid-cols-2 gap-2">
            <SmallInfo
              label="Portföy"
              value={unit.project?.name || "EPH Portföy"}
            />
            <SmallInfo label="EPH ID" value={ephId} />
            <SmallInfo label="Yaklaşık Bölge" value={location} />
            <SmallInfo
              label="Mevcut Bakiye"
              value={balance === null ? "Kontrol ediliyor" : `${balance} kontör`}
            />
          </div>

          <div className="mt-3 rounded-[18px] border-2 border-[#BFDBFE] bg-[#EFF6FF] p-3 text-center">
            <MapPin size={20} className="mx-auto text-[#2563EB]" />
            <p className="mt-1.5 text-[12px] font-black leading-5 text-[#1E3A8A]">
              Bu gayrimenkulün gerçek konumu ve yol tarifi 10 kontör karşılığında
              açılacaktır.
            </p>
          </div>

          <div className="mt-2 rounded-[18px] border-2 border-emerald-200 bg-emerald-50 p-3 text-center">
            <WalletCards size={20} className="mx-auto text-emerald-700" />
            <p className="mt-1.5 text-[11px] font-black leading-5 text-emerald-800">
              Aynı ilan için yalnızca ilk erişimde 10 kontör alınır. Sonraki
              açılışlarda tekrar kontör düşülmez.
            </p>
          </div>

          <p className="mt-2 px-2 text-center text-[10px] font-bold leading-4 text-[#64748B]">
            Onay sonrası cihazınızın Google Maps yol tarifi ekranı açılır.
          </p>
        </div>

        <div className="grid shrink-0 grid-cols-2 gap-2 border-t border-[#D7E3F2] bg-white p-3 pb-[max(12px,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="min-h-[46px] rounded-[16px] border-2 border-[#C7D6E8] bg-white px-2 text-[12px] font-black text-[#2563EB] disabled:opacity-60"
          >
            Vazgeç
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="min-h-[46px] rounded-[16px] bg-[#2563EB] px-2 text-[11px] font-black leading-4 text-white shadow-[0_8px_18px_rgba(37,99,235,0.22)] disabled:opacity-60"
          >
            {busy ? "Konum Açılıyor..." : "10 Kontör Harca ve Aç"}
          </button>
        </div>
      </section>
    </div>
  );
}

function PoolActionModal({
  action,
  busy,
  onClose,
  onConfirm,
}: {
  action: SelectedAction;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const isLead = action.type === "LEAD";
  const title = isLead ? "Müşterim Var Bildirimi" : "İlgileniyorum Bildirimi";
  const creditAmount = isLead ? 20 : 10;
  const confirmText = isLead
    ? "20 Kontör Harca ve Bildir"
    : "10 Kontör Harca ve İlgilen";
  const ephId = getEphId(action.unit.id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-[max(10px,env(safe-area-inset-left))] py-[max(12px,env(safe-area-inset-top))] pb-[max(12px,env(safe-area-inset-bottom))]">
      <section className="flex max-h-[min(86dvh,620px)] w-[min(94vw,430px)] flex-col overflow-hidden rounded-[clamp(20px,6vw,28px)] border-2 border-[#C7D6E8] bg-white shadow-[0_24px_60px_rgba(15,23,42,0.25)]">
        <div className="relative shrink-0 px-[clamp(12px,3.5vw,16px)] pb-2 pt-[clamp(12px,3.5vw,16px)]">
          <div className="mx-auto w-[min(68vw,270px)] text-center">
            <p className="text-[clamp(9px,2.4vw,10px)] font-black uppercase tracking-[0.12em] text-[#2563EB]">
              Havuz Kontör İşlemi
            </p>
            <h2 className="mt-1 text-[clamp(17px,5vw,21px)] font-black leading-[1.05] tracking-[-0.045em] text-[#1F2937] break-words [overflow-wrap:anywhere]">
              {limitText(title, 56)}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="absolute right-[clamp(10px,3vw,14px)] top-[clamp(10px,3vw,14px)] z-10 flex h-[clamp(40px,10vw,46px)] w-[clamp(40px,10vw,46px)] shrink-0 items-center justify-center rounded-[16px] border-2 border-[#C7D6E8] bg-[#F8FAFC] text-[#2563EB] shadow-[0_8px_18px_rgba(15,23,42,0.08)] disabled:opacity-60"
            aria-label="Kapat"
          >
            <X size={19} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-[clamp(10px,3vw,14px)] pb-[clamp(10px,3vw,14px)] [-webkit-overflow-scrolling:touch]">
          <div className="grid grid-cols-2 gap-2">
            <SmallInfo
              label="Portföy"
              value={action.unit.project?.name || "EPH Portföy"}
            />
            <SmallInfo label="EPH ID" value={ephId} />
            <SmallInfo label="Konum" value={getLocation(action.unit)} />
            <SmallInfo
              label="İşlem"
              value={isLead ? "Müşterim Var" : "İlgileniyorum"}
            />
          </div>

          <div className="mt-[clamp(8px,2.5vw,12px)] rounded-[clamp(16px,5vw,20px)] border-2 border-[#C7D6E8] bg-[#F8FAFC] p-[clamp(10px,3vw,14px)]">
            <p className="text-[clamp(9px,2.5vw,10px)] font-black uppercase tracking-[0.08em] text-[#2563EB]">
              İşlem Özeti
            </p>
            <p className="mt-1.5 text-[clamp(11px,3.1vw,12px)] font-bold leading-5 text-[#475569] break-words [overflow-wrap:anywhere]">
              Bu işlem {creditAmount} kontör harcar. Onay sonrası portföy
              sahibine bildirim gönderilir ve işlem kaydı oluşturulur.
            </p>
          </div>
        </div>

        <div className="grid shrink-0 grid-cols-2 gap-[clamp(6px,2vw,10px)] border-t border-[#D7E3F2] bg-white/95 p-[clamp(10px,3vw,14px)] pb-[max(clamp(12px,3.2vw,16px),env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="min-h-[clamp(42px,11vw,48px)] rounded-[16px] border-2 border-[#C7D6E8] bg-white px-2 text-[clamp(11px,3vw,12px)] font-black text-[#2563EB] disabled:opacity-60"
          >
            Vazgeç
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="min-h-[clamp(42px,11vw,48px)] rounded-[16px] bg-[#2563EB] px-2 text-[clamp(11px,3vw,12px)] font-black leading-4 text-white disabled:opacity-60"
          >
            {busy ? "İşleniyor..." : confirmText}
          </button>
        </div>
      </section>
    </div>
  );
}

function SmallInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-[14px] border-2 border-[#C7D6E8] bg-[#F8FAFC] px-2.5 py-2 text-center">
      <p className="text-center text-[8px] font-black uppercase tracking-[0.05em] text-[#64748B] break-words [overflow-wrap:anywhere]">
        {limitText(label, 22)}
      </p>
      <p className="mt-0.5 text-center text-[10px] font-black leading-[1.2] text-[#1F2937] break-words [overflow-wrap:anywhere]">
        {limitText(value, 46)}
      </p>
    </div>
  );
}

function TrustPill({ active, text }: { active: boolean; text: string }) {
  return (
    <div
      className={`flex min-h-[28px] min-w-0 items-center justify-center gap-1 rounded-full border px-2 text-center text-[9px] font-black leading-[1.05] ${
        active
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-amber-200 bg-amber-50 text-amber-700"
      }`}
    >
      <CheckCircle2 size={10} className="shrink-0" />
      <span className="min-w-0 break-words [overflow-wrap:anywhere]">
        {active ? text : `${text} Eksik`}
      </span>
    </div>
  );
}

function TrustIndexPill({ active, text }: { active: boolean; text: string }) {
  return (
    <div
      className={`flex min-h-[30px] min-w-0 items-center justify-center gap-1 rounded-full border px-1.5 text-center text-[8.5px] font-black leading-[1.05] ${
        active
          ? "border-emerald-200 bg-white text-emerald-700"
          : "border-amber-200 bg-white text-amber-700"
      }`}
    >
      {active ? (
        <CheckCircle2 size={10} className="shrink-0" />
      ) : (
        <X size={10} className="shrink-0" />
      )}
      <span className="min-w-0 break-words [overflow-wrap:anywhere]">
        {text}
      </span>
    </div>
  );
}

function MatchPill({ text }: { text: string }) {
  return (
    <div className="flex min-h-[30px] min-w-0 items-center justify-center gap-1 rounded-full border border-[#C7D6E8] bg-white px-2 text-center text-[9px] font-black leading-[1.05] text-[#1F2937]">
      <CheckCircle2 size={10} className="shrink-0 text-emerald-600" />
      <span className="min-w-0 break-words [overflow-wrap:anywhere]">
        {limitText(text, 34)}
      </span>
    </div>
  );
}
