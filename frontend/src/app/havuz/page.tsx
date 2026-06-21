"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BadgeCheck,
  Building2,
  CheckCircle2,
  Eye,
  List,
  Map as MapIcon,
  MapPin,
  MessageCircle,
  Navigation,
  Search,
  Sparkles,
  Users,
  X,
} from "lucide-react";

import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";

type Unit = {
  id: string;
  type?: string | null;
  status?: string | null;
  roomCount?: string | null;
  area?: number | null;
  price?: number | null;
  priceCurrency?: string | null;
  description?: string | null;
  isVerified?: boolean;
  isPoolVisible?: boolean;
  approvalStatus?: string | null;
  tapuVerified?: boolean;
  photoVerified?: boolean;
  yetkiVerified?: boolean;
  createdAt?: string;
  images?: Array<{ url?: string; supabaseUrl?: string; isCover?: boolean }>;
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
    ownerId?: string | null;
    owner?: {
      id?: string | null;
      firstName?: string | null;
      lastName?: string | null;
      role?: string | null;
      memberCode?: string | null;
    } | null;
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

type PoolWallet = {
  balance?: number;
  bakiye?: number;
  aktifMi?: boolean;
};

type SuccessToast = {
  title: string;
  message: string;
  spent: number;
  balance: number | null;
};

type ViewMode = "LIST" | "MAP";

type PoolMapItem = {
  unit: Unit;
  match: { score: number; customer: Customer | null; budgetDiff: number };
  lat: number;
  lng: number;
  isApprox: boolean;
  locationLabel: string;
};

declare global {
  interface Window {
    google?: any;
    ephHavuzGoogleMapsReady?: Promise<void>;
  }
}

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
const DEFAULT_MAP_CENTER = { lat: 39.0, lng: 35.0 };

const categories = [
  "Tümü",
  "Satılık",
  "Kiralık",
  "Kat Karşılığı",
  "Proje",
  "Ticari",
  "Özel",
];

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

function isVerified(unit: Unit) {
  return Boolean(
    unit.isVerified ||
    unit.yetkiVerified ||
    (unit.tapuVerified && unit.photoVerified && unit.yetkiVerified),
  );
}

function getCover(unit: Unit) {
  const images = Array.isArray(unit.images) ? unit.images : [];
  const image = images.find((item) => item.isCover) || images[0];
  return image?.supabaseUrl || image?.url || "";
}

function compactMoney(value?: number | null, currency?: string | null) {
  const numeric = Number(value || 0);
  if (!numeric) return "Fiyat yok";
  const symbol = CURRENCY_SYMBOLS[currency || "TRY"] || "₺";

  if (numeric >= 1000000) {
    return `${(numeric / 1000000).toLocaleString("tr-TR", { maximumFractionDigits: 1 })}M ${symbol}`;
  }

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
    isApprox: false,
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
    [unit.project?.city, unit.project?.district].filter(Boolean).join(" / ") ||
    "Konum yok"
  );
}

function getMahalle(unit: Unit) {
  return unit.project?.district || unit.project?.city || "Mahalle bilgisi yok";
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

function playKontorHarcamaSound() {
  if (typeof window === "undefined") return;

  const audio = new Audio("/sounds/kontor_harcama.mp3");
  audio.volume = 0.82;
  audio.play().catch(() => {});
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

function calculateHavuzTrustIndex(unit: Unit, matchScore: number) {
  const hasTapu = Boolean(unit.tapuVerified || unit.isVerified);
  const hasYetki = Boolean(unit.yetkiVerified || unit.isVerified);
  const hasPhoto = Boolean(
    unit.photoVerified ||
    (Array.isArray(unit.images) && unit.images.length > 0),
  );
  const crmMatch = Math.max(0, Math.min(100, Number(matchScore || 0))) >= 75;

  const score =
    (hasTapu ? 25 : 0) +
    (hasYetki ? 25 : 0) +
    (hasPhoto ? 25 : 0) +
    Math.round(
      (Math.max(0, Math.min(100, Number(matchScore || 0))) / 100) * 25,
    );

  return {
    score: Math.max(0, Math.min(100, score)),
    checks: [
      { label: "Tapu", active: hasTapu },
      { label: "Yetki", active: hasYetki },
      { label: "Fotoğraf", active: hasPhoto },
      { label: "CRM Uyum", active: crmMatch },
    ],
  };
}

function getTrustIndexLabel(score: number) {
  if (score >= 90) return "Çok Güvenli";
  if (score >= 75) return "Güvenli";
  if (score >= 60) return "Takip Edilebilir";
  if (score >= 40) return "Kontrol Gerekli";
  return "Riskli";
}

function getTrustIndexTone(score: number) {
  if (score >= 90) return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (score >= 75) return "border-blue-200 bg-blue-50 text-blue-700";
  if (score >= 60) return "border-cyan-200 bg-cyan-50 text-cyan-700";
  if (score >= 40) return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-red-200 bg-red-50 text-red-700";
}

function hasEphApproval(unit: Unit) {
  return Boolean(unit.isVerified || (unit.tapuVerified && unit.yetkiVerified));
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
      label: "Havuza Hazır",
      className: "border-blue-200 bg-blue-50 text-blue-700",
    });
  }

  badges.push({
    label: getPoolQualityLabel(qualityScore),
    className: getPoolQualityTone(qualityScore),
  });

  return badges.slice(0, 3);
}

function calculateMatch(unit: Unit, customers: Customer[]) {
  const unitCity = String(unit.project?.city || "").toLocaleLowerCase("tr-TR");
  const unitDistrict = String(unit.project?.district || "").toLocaleLowerCase(
    "tr-TR",
  );
  const unitText = [
    unit.project?.name,
    unit.project?.city,
    unit.project?.district,
    unit.type,
    unit.roomCount,
    unit.description,
  ]
    .join(" ")
    .toLocaleLowerCase("tr-TR");

  let bestScore = 0;
  let bestCustomer: Customer | null = null;
  let budgetDiff = 0;

  customers.forEach((customer) => {
    let score = 0;
    const customerCity = String(customer.city || "").toLocaleLowerCase("tr-TR");
    const interestedArea = String(
      customer.interestedArea || "",
    ).toLocaleLowerCase("tr-TR");
    const interestedType = String(
      customer.interestedType || "",
    ).toLocaleLowerCase("tr-TR");
    const notes = String(customer.notes || "").toLocaleLowerCase("tr-TR");

    if (customerCity && unitCity && customerCity === unitCity) score += 30;
    if (
      interestedArea &&
      (unitDistrict.includes(interestedArea) ||
        unitText.includes(interestedArea))
    )
      score += 30;
    if (interestedType && unitText.includes(interestedType)) score += 15;

    if (customer.budget && unit.price) {
      const diff = Math.abs(Number(customer.budget) - Number(unit.price));
      const ratio =
        diff / Math.max(Number(customer.budget), Number(unit.price));
      budgetDiff = Math.round(ratio * 100);

      if (ratio <= 0.1) score += 15;
      else if (ratio <= 0.2) score += 10;
      else if (ratio <= 0.35) score += 5;
    }

    if (
      notes &&
      unitText
        .split(" ")
        .some((word) => word.length > 3 && notes.includes(word))
    )
      score += 10;

    if (score > bestScore) {
      bestScore = score;
      bestCustomer = customer;
    }
  });

  return {
    score: Math.min(bestScore || 64, 96),
    customer: bestCustomer,
    budgetDiff,
  };
}

export default function HavuzPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [units, setUnits] = useState<Unit[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("Tümü");
  const [search, setSearch] = useState("");
  const [selectedAction, setSelectedAction] = useState<SelectedAction | null>(
    null,
  );
  const [detailSelection, setDetailSelection] =
    useState<DetailSelection | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [successToast, setSuccessToast] = useState<SuccessToast | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("LIST");
  const [selectedMapUnitId, setSelectedMapUnitId] = useState("");

  const builder = isBuilderRole(user?.role);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!successToast) return;

    const timer = window.setTimeout(() => {
      setSuccessToast(null);
    }, 3000);

    return () => window.clearTimeout(timer);
  }, [successToast]);

  const fetchData = async () => {
    try {
      const [unitsRes, customersRes, walletRes] = await Promise.allSettled([
        api.get("/units/pool"),
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
        setWalletBalance(Number.isFinite(balance) ? balance : 0);
      }
    } finally {
      setLoading(false);
    }
  };

  const eligibleUnits = useMemo(() => {
    return units.filter((unit) => builder || isVerified(unit));
  }, [builder, units]);

  const matchedUnits = useMemo(() => {
    return eligibleUnits
      .map((unit) => ({ unit, match: calculateMatch(unit, customers) }))
      .sort((a, b) => b.match.score - a.match.score);
  }, [customers, eligibleUnits]);

  const filteredPoolItems = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase("tr-TR");

    return matchedUnits
      .filter(({ unit }) => {
        if (category === "Tümü") return true;

        const text = [
          unit.status,
          unit.type,
          unit.project?.name,
          unit.description,
        ]
          .join(" ")
          .toLocaleLowerCase("tr-TR");

        if (category === "Kat Karşılığı")
          return text.includes("kat") || text.includes("arsa");
        if (category === "Proje") return text.includes("proje") || builder;
        if (category === "Ticari")
          return (
            text.includes("dukkan") ||
            text.includes("dükkan") ||
            text.includes("magaza") ||
            text.includes("mağaza")
          );
        if (category === "Özel")
          return (
            text.includes("villa") ||
            text.includes("turistik") ||
            text.includes("özel")
          );

        return text.includes(category.toLocaleLowerCase("tr-TR"));
      })
      .filter(({ unit }) => {
        if (!keyword) return true;

        return [
          unit.project?.name,
          unit.project?.city,
          unit.project?.district,
          unit.project?.address,
          unit.type,
          unit.status,
          unit.roomCount,
          unit.description,
        ]
          .join(" ")
          .toLocaleLowerCase("tr-TR")
          .includes(keyword);
      });
  }, [builder, category, matchedUnits, search]);

  const displayedUnits = useMemo(
    () => filteredPoolItems.slice(0, 12),
    [filteredPoolItems],
  );

  const poolMapItems = useMemo(() => {
    return filteredPoolItems
      .map(({ unit, match }) => getPoolMapPoint({ unit, match }))
      .filter((item): item is PoolMapItem => Boolean(item));
  }, [filteredPoolItems]);

  const showKontorSuccess = (input: {
    title: string;
    data: any;
    fallbackSpent: number;
  }) => {
    const spent = getSpentFromResponse(input.data, input.fallbackSpent);
    const responseBalance = getBalanceFromResponse(input.data);
    const nextBalance =
      responseBalance ??
      (walletBalance === null ? null : Math.max(walletBalance - spent, 0));

    if (nextBalance !== null) {
      setWalletBalance(nextBalance);
    }

    playKontorHarcamaSound();

    setSuccessToast({
      title: input.title,
      message:
        nextBalance === null
          ? `${spent} kontör harcandı.`
          : `${spent} kontör harcandı. Kalan bakiyen ${nextBalance} kontör.`,
      spent,
      balance: nextBalance,
    });
  };

  const startPoolMessage = async (unit: Unit, score: number) => {
    if (busyAction) return;

    setErrorMessage("");
    setBusyAction(`MESSAGE_${unit.id}`);

    try {
      const message = `Merhaba, ${getEphId(unit.id)} numaralı Havuz portföyü için görüşmek istiyorum.`;
      let conversationId = "";

      try {
        const response = await api.post(`/units/pool/${unit.id}/message`, {
          message,
          matchScore: score,
        });
        conversationId = getConversationId(response.data);
        showKontorSuccess({
          title: "Mesaj Başlatıldı",
          data: response.data,
          fallbackSpent: 3,
        });
      } catch (poolError) {
        const participantId = unit.project?.owner?.id || unit.project?.ownerId;

        if (!participantId) throw poolError;

        const conversationResponse = await api.post("/conversations/start", {
          participantId,
          title: `${getEphId(unit.id)} Havuz Görüşmesi`,
        });

        conversationId = getConversationId(conversationResponse.data);

        if (conversationId) {
          await api.post(`/conversations/${conversationId}/messages`, {
            body: message,
          });
        }
      }

      window.setTimeout(() => {
        router.push(
          conversationId ? `/messages/${conversationId}` : "/messages",
        );
      }, 900);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setBusyAction(null);
    }
  };

  const confirmPoolAction = async (action: SelectedAction) => {
    if (busyAction) return;

    const endpoint = action.type === "LEAD" ? "matching-customer" : "interest";
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

      <div className="mx-auto w-full max-w-[430px] space-y-2">
        <section className="rounded-[22px] border-2 border-[#C7D6E8] bg-white p-2.5 shadow-[0_10px_24px_rgba(15,23,42,0.045)]">
          <div className="flex items-center gap-2 rounded-[17px] border-2 border-[#C7D6E8] bg-[#EEF3F8] px-3 py-2">
            <Search size={16} className="text-[#64748B]" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="h-8 min-w-0 flex-1 bg-transparent text-[12px] font-bold text-[#1F2937] outline-none placeholder:text-[#64748B]"
              placeholder="Portföy, şehir, ilçe ara..."
            />
          </div>

          <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
            {categories.map((item) => (
              <button
                key={item}
                onClick={() => setCategory(item)}
                className={`shrink-0 rounded-full border-2 px-3 py-1.5 text-[11px] font-black ${
                  category === item
                    ? "border-[#2563EB] bg-[#2563EB] text-white"
                    : "border-[#C7D6E8] bg-white text-[#64748B]"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
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
            selectedUnitId={selectedMapUnitId}
            onSelectUnit={setSelectedMapUnitId}
            busyAction={busyAction}
            onDetail={(unit, match) => setDetailSelection({ unit, match })}
            onMessage={(unit, match) => startPoolMessage(unit, match.score)}
            onAction={(type, unit, match) =>
              setSelectedAction({ type, unit, score: match.score })
            }
          />
        )}

        {errorMessage && (
          <section className="rounded-[18px] border-2 border-red-300 bg-red-50 p-3 text-center text-[12px] font-black leading-5 text-red-700 shadow-[0_10px_22px_rgba(220,38,38,0.10)] break-words [overflow-wrap:anywhere]">
            {limitText(errorMessage, 180)}
          </section>
        )}

        <section className="space-y-3">
          {displayedUnits.length > 0 ? (
            displayedUnits.map(({ unit, match }, index) => (
              <PoolUnitCard
                key={unit.id}
                index={index}
                unit={unit}
                match={match}
                busyAction={busyAction}
                onDetail={() => setDetailSelection({ unit, match })}
                onMessage={() => startPoolMessage(unit, match.score)}
                onAction={(type) =>
                  setSelectedAction({ type, unit, score: match.score })
                }
              />
            ))
          ) : (
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
          )}
        </section>
      </div>

      {detailSelection && (
        <PoolDetailModal
          unit={detailSelection.unit}
          match={detailSelection.match}
          busyAction={busyAction}
          onClose={() => setDetailSelection(null)}
          onMessage={() =>
            startPoolMessage(detailSelection.unit, detailSelection.match.score)
          }
          onAction={(type) =>
            setSelectedAction({
              type,
              unit: detailSelection.unit,
              score: detailSelection.match.score,
            })
          }
        />
      )}

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
    </main>
  );
}

function PoolMapSection({
  items,
  selectedUnitId,
  busyAction,
  onSelectUnit,
  onDetail,
  onMessage,
  onAction,
}: {
  items: PoolMapItem[];
  selectedUnitId: string;
  busyAction: string | null;
  onSelectUnit: (unitId: string) => void;
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
}) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRefs = useRef<any[]>([]);
  const [mapError, setMapError] = useState("");
  const [mapReady, setMapReady] = useState(false);
  const selectedItem =
    items.find((item) => item.unit.id === selectedUnitId) || items[0] || null;
  const exactCount = items.filter((item) => !item.isApprox).length;

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

    const bounds = new googleMaps.LatLngBounds();

    items.forEach((item) => {
      const priceText = compactMoney(item.unit.price, item.unit.priceCurrency);



      const marker = new googleMaps.Marker({
  position: { lat: item.lat, lng: item.lng },
  map,
  title: `${item.unit.project?.name || "EPH Portföy"} • ${priceText}`,
  optimized: false,
  zIndex: 9999,
  icon: {
    url: "https://maps.google.com/mapfiles/ms/icons/red-dot.png",
    scaledSize: new googleMaps.Size(40, 40),
  },
});




      marker.addListener("click", () => {
        onSelectUnit(item.unit.id);
        map.panTo({ lat: item.lat, lng: item.lng });
        map.setZoom(Math.max(map.getZoom() || 11, 12));
      });

      markerRefs.current.push(marker);
      bounds.extend({ lat: item.lat, lng: item.lng });
    });

    if (items.length > 1) {
      map.fitBounds(bounds, 44);
    } else if (items.length === 1) {
      map.setCenter({ lat: items[0].lat, lng: items[0].lng });
      map.setZoom(13);
    } else {
      map.setCenter(DEFAULT_MAP_CENTER);
      map.setZoom(6);
    }
  }, [items, onSelectUnit, selectedUnitId, mapReady]);

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
            Sadece gerçek konumu olan portföyler gösterilir.
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

      <div className="grid grid-cols-2 border-t-2 border-[#C7D6E8] bg-white text-center text-[11px] font-black text-[#64748B]">
        <div className="border-r border-[#E2EAF5] px-2 py-2">
          <span className="text-[#2563EB]">{exactCount}</span> gerçek konum
        </div>
        <div className="px-2 py-2">
          <span className="text-emerald-600">0</span> yaklaşık konum
        </div>
      </div>

      {selectedItem ? (
        <div className="border-t-2 border-[#C7D6E8] bg-[#F8FAFC] p-2.5">
          <div className="rounded-[20px] border-2 border-[#C7D6E8] bg-white p-2.5 shadow-[0_8px_18px_rgba(15,23,42,0.04)]">
            <div className="text-center">
              <div className="min-w-0 text-center">
                <p className="text-[9px] font-black uppercase tracking-[0.12em] text-[#2563EB]">
                  {selectedItem.isApprox ? "Yaklaşık Pin" : "Gerçek Pin"} •{" "}
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
                disabled={Boolean(busyAction)}
                className="flex min-h-[36px] items-center justify-center gap-1 rounded-[14px] border-2 border-[#C7D6E8] bg-white text-[11px] font-black text-[#1F2937] disabled:opacity-60"
              >
                <MessageCircle size={13} className="text-[#2563EB]" /> Mesaj 3K
              </button>
              <button
                type="button"
                onClick={() =>
                  onAction("INTEREST", selectedItem.unit, selectedItem.match)
                }
                disabled={Boolean(busyAction)}
                className="min-h-[36px] rounded-[14px] border-2 border-[#2563EB] bg-[#EFF6FF] text-[11px] font-black text-[#1D4ED8] disabled:opacity-60"
              >
                İlgilen 10K
              </button>
              <button
                type="button"
                onClick={() =>
                  onAction("LEAD", selectedItem.unit, selectedItem.match)
                }
                disabled={Boolean(busyAction)}
                className="min-h-[36px] rounded-[14px] border-2 border-[#2563EB] bg-[#2563EB] text-[11px] font-black text-white disabled:opacity-60"
              >
                Müşterim Var 20K
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
    <div className="fixed left-1/2 top-[78px] z-[90] w-[calc(100%-24px)] max-w-[410px] -translate-x-1/2">
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

  const features: string[] = [];

  if (text.includes("deniz")) features.push("Deniz Manzaralı");
  if (text.includes("havuz")) features.push("Yüzme Havuzu");
  if (text.includes("bahçe") || text.includes("bahce"))
    features.push("Geniş Bahçe");
  if (text.includes("otopark") || text.includes("garaj"))
    features.push("Otopark");
  if (text.includes("güvenlik") || text.includes("guvenlik"))
    features.push("Güvenlikli");
  if (text.includes("site")) features.push("Site İçerisinde");
  if (text.includes("yatırım") || text.includes("yatirim"))
    features.push("Yatırıma Uygun");
  if (text.includes("merkez") || unit.project?.district)
    features.push("Merkezi Konum");

  return Array.from(new Set(features)).slice(0, 3).length
    ? Array.from(new Set(features)).slice(0, 3)
    : ["Merkezi Konum", "Yatırıma Uygun", "Ortak Çalışmaya Uygun"];
}

function getPrimarySpecs(unit: Unit) {
  const specs: string[] = [];

  if (unit.roomCount) specs.push(unit.roomCount);
  if (unit.area) specs.push(`${Number(unit.area).toLocaleString("tr-TR")} m²`);

  const text = [unit.description, unit.type, unit.project?.name]
    .join(" ")
    .toLocaleLowerCase("tr-TR");

  if (text.includes("otopark")) specs.push("Otopark");
  else if (text.includes("arsa")) specs.push("İmarlı");
  else specs.push("Portföy");

  return specs.slice(0, 3);
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

function PoolUnitCard({
  index,
  unit,
  match,
  busyAction,
  onDetail,
  onMessage,
  onAction,
}: {
  index: number;
  unit: Unit;
  match: { score: number; customer: Customer | null; budgetDiff: number };
  busyAction: string | null;
  onDetail: () => void;
  onMessage: () => void;
  onAction: (type: PoolAction) => void;
}) {
  const image = getCover(unit);
  const ephId = getEphId(unit.id);
  const features = getHighlightFeatures(unit);
  const specs = getPrimarySpecs(unit);
  const imageCount = (Array.isArray(unit.images) ? unit.images.length : 0) || 1;

  return (
    <article
      onClick={onDetail}
      className="grid h-[156px] cursor-pointer grid-cols-[42%_58%] overflow-hidden rounded-[18px] border-2 border-[#C7D6E8] bg-white shadow-[0_10px_22px_rgba(15,23,42,0.06)] active:scale-[0.995]"
    >
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onDetail();
        }}
        className="relative h-[156px] overflow-hidden bg-[#EEF3F8] text-left"
      >
        {image ? (
          <img
            src={image}
            alt={unit.project?.name || "Portföy"}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[#2563EB]">
            <Building2 size={28} />
          </div>
        )}

        <div className="absolute left-2 top-2 rounded-full bg-white/95 px-2 py-0.5 text-[7.5px] font-black text-emerald-700 shadow-sm">
          EPH Onaylı
        </div>

        <div className="absolute bottom-2 left-2 rounded-full bg-slate-950/72 px-2 py-1 text-[8.5px] font-black text-white">
          {imageCount} Fotoğraf
        </div>
      </button>

      <div className="flex min-w-0 flex-col p-2">
        <p className="text-[9px] font-black uppercase tracking-[0.08em] text-[#2563EB]">
          {getTypeChip(unit)}
        </p>

        <h3 className="mt-0.5 line-clamp-2 text-[13px] font-black leading-[1.05] tracking-[-0.035em] text-[#0F172A] break-words [overflow-wrap:anywhere]">
          {limitText(unit.project?.name || "EPH Portföy", 54)}
        </h3>

        <p className="mt-1 flex min-w-0 items-center gap-1 text-[9px] font-bold leading-3 text-[#64748B]">
          <MapPin size={10} className="shrink-0" />
          <span className="min-w-0 truncate">{getLocation(unit)}</span>
        </p>

        <p className="mt-1.5 text-[16px] font-black leading-none tracking-[-0.04em] text-[#0F172A]">
          {compactMoney(unit.price, unit.priceCurrency)}
        </p>

        <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-1 text-[8.5px] font-black text-[#1F2937]">
          {specs.slice(0, 3).map((spec) => (
            <span
              key={spec}
              className="rounded-full bg-[#F8FAFC] px-1.5 py-0.5"
            >
              {limitText(spec, 14)}
            </span>
          ))}
        </div>

        <div className="mt-1.5 grid grid-cols-1 gap-1">
          {features.slice(0, 1).map((item) => (
            <CompactFeaturePill key={item} text={item} />
          ))}
        </div>

        <div className="mt-auto flex items-end justify-between gap-2 pt-1">
          <div className="min-w-0">
            <p className="text-[7px] font-black uppercase tracking-[0.06em] text-[#94A3B8]">
              EPH ID
            </p>
            <p className="truncate text-[9px] font-black text-[#475569]">
              {ephId}
            </p>
          </div>

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onDetail();
            }}
            className="flex min-h-[30px] min-w-[74px] items-center justify-center gap-1 rounded-[12px] bg-[#2563EB] px-2 text-[10px] font-black text-white shadow-[0_8px_18px_rgba(37,99,235,0.16)]"
          >
            <Eye size={12} />
            Detay
          </button>
        </div>
      </div>
    </article>
  );
}

function PoolDetailModal({
  unit,
  match,
  busyAction,
  onClose,
  onMessage,
  onAction,
}: {
  unit: Unit;
  match: { score: number; customer: Customer | null; budgetDiff: number };
  busyAction: string | null;
  onClose: () => void;
  onMessage: () => void;
  onAction: (type: PoolAction) => void;
}) {
  const image = getCover(unit);
  const features = getHighlightFeatures(unit);
  const specs = getPrimarySpecs(unit);
  const imageCount = (Array.isArray(unit.images) ? unit.images.length : 0) || 1;
  const messageBusy = busyAction === `MESSAGE_${unit.id}`;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/55 px-[max(8px,env(safe-area-inset-left))] pt-[max(10px,env(safe-area-inset-top))] pb-0">
      <section className="flex max-h-[min(92dvh,720px)] w-[min(96vw,430px)] flex-col overflow-hidden rounded-t-[30px] border-2 border-b-0 border-[#C7D6E8] bg-white shadow-[0_24px_60px_rgba(15,23,42,0.28)]">
        <div className="relative shrink-0">
          <div className="mx-auto mt-2 h-1.5 w-11 rounded-full bg-[#CBD5E1]" />

          <div className="relative mt-2 h-[150px] overflow-hidden bg-[#EEF3F8]">
            {image ? (
              <img
                src={image}
                alt={unit.project?.name || "Portföy"}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[#2563EB]">
                <Building2 size={34} />
              </div>
            )}

            <div className="absolute bottom-2 left-2 rounded-full bg-slate-950/75 px-2.5 py-1 text-[10px] font-black text-white">
              {imageCount} Fotoğraf
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-5 flex h-10 w-10 items-center justify-center rounded-[15px] border-2 border-white/70 bg-white/95 text-[#2563EB] shadow-[0_8px_18px_rgba(15,23,42,0.15)]"
            aria-label="Kapat"
          >
            <X size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-3 pt-2 [-webkit-overflow-scrolling:touch]">
          <div className="rounded-[22px] border-2 border-[#C7D6E8] bg-[#F8FAFC] p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.1em] text-[#2563EB]">
                  {getTypeChip(unit)} • {getEphId(unit.id)}
                </p>
                <h2 className="mt-1 text-[18px] font-black leading-[1.08] tracking-[-0.045em] text-[#0F172A] break-words [overflow-wrap:anywhere]">
                  {limitText(unit.project?.name || "EPH Portföy", 72)}
                </h2>
                <p className="mt-1.5 flex min-w-0 items-start gap-1.5 text-[12px] font-bold leading-4 text-[#64748B]">
                  <MapPin size={14} className="mt-0.5 shrink-0" />
                  <span className="min-w-0 break-words [overflow-wrap:anywhere]">
                    {getLocation(unit)}
                  </span>
                </p>
              </div>

              <p className="shrink-0 rounded-[16px] bg-[#2563EB] px-3 py-2 text-[15px] font-black leading-none tracking-[-0.04em] text-white">
                {compactMoney(unit.price, unit.priceCurrency)}
              </p>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              {specs.slice(0, 3).map((spec) => (
                <SmallInfo key={spec} label="Özellik" value={spec} />
              ))}
            </div>
          </div>

          <section className="mt-3 rounded-[20px] border-2 border-[#C7D6E8] bg-white p-3">
            <p className="text-center text-[10px] font-black uppercase tracking-[0.08em] text-[#2563EB]">
              Dikkat Çeken Özellikler
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {features.slice(0, 4).map((item) => (
                <CompactFeaturePill key={item} text={item} />
              ))}
            </div>
          </section>

          <section className="mt-3 rounded-[20px] border-2 border-[#C7D6E8] bg-[#F8FAFC] p-3">
            <p className="text-center text-[10px] font-black uppercase tracking-[0.08em] text-[#2563EB]">
              Meslektaş Havuzu
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <MatchPill text="Paylaşıma Açık" />
              <MatchPill text="Ortak Çalışmaya Uygun" />
            </div>
          </section>

          <section className="mt-3 rounded-[20px] border-2 border-[#C7D6E8] bg-white p-3">
            <p className="text-[10px] font-black uppercase tracking-[0.08em] text-[#2563EB]">
              Açıklama
            </p>
            <p className="mt-1.5 text-[12px] font-bold leading-5 text-[#475569] break-words [overflow-wrap:anywhere]">
              {unit.description ||
                "Bu Havuz portföyü için açıklama girilmemiş."}
            </p>
          </section>

          <section className="mt-3 rounded-[20px] border-2 border-[#C7D6E8] bg-[#F8FAFC] p-3">
            <p className="text-[10px] font-black uppercase tracking-[0.08em] text-[#2563EB]">
              Mahremiyet
            </p>
            <p className="mt-1.5 text-[12px] font-bold leading-5 text-[#475569] break-words [overflow-wrap:anywhere]">
              Telefon, e-posta, tapu sahibi ve tam adres bilgileri Havuz
              detayında gösterilmez.
            </p>
          </section>
        </div>

        <div className="shrink-0 border-t-2 border-[#C7D6E8] bg-white/95 p-2.5 pb-[max(12px,env(safe-area-inset-bottom))] shadow-[0_-12px_28px_rgba(15,23,42,0.08)]">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onMessage}
              disabled={Boolean(busyAction)}
              className="flex min-h-[42px] items-center justify-center gap-1 rounded-[15px] border-2 border-[#C7D6E8] bg-white text-[12px] font-black text-[#1F2937] disabled:opacity-60"
            >
              <MessageCircle size={14} className="text-[#2563EB]" />
              {messageBusy ? "Açılıyor" : "Mesaj 3K"}
            </button>

            <button
              type="button"
              onClick={() => onAction("INTEREST")}
              disabled={Boolean(busyAction)}
              className="min-h-[42px] rounded-[15px] border-2 border-[#2563EB] bg-[#EFF6FF] text-[12px] font-black text-[#1D4ED8] disabled:opacity-60"
            >
              İlgilen 10K
            </button>

            <button
              type="button"
              onClick={() => onAction("LEAD")}
              disabled={Boolean(busyAction)}
              className="col-span-2 flex min-h-[44px] items-center justify-center gap-1 rounded-[15px] border-2 border-[#2563EB] bg-[#2563EB] text-[12px] font-black text-white disabled:opacity-60"
            >
              <Users size={14} />
              Müşterim Var 20K
            </button>
          </div>
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
