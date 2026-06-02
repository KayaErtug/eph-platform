"use client";

import { useEffect, useMemo, useState, type ReactNode, type TouchEvent } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  BadgeCheck,
  BarChart3,
  Building2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  CircleUserRound,
  FileText,
  Camera,
  Flame,
  Home,
  MessageCircle,
  Phone,
  MapPin,
  ShieldCheck,
  Share2,
  Sparkles,
  Star,
  TrendingUp,
  Trophy,
  UsersRound,
  WalletCards,
  X,
  Waves,
  Car,
  Dumbbell,
  Baby,
  Coffee,
  GripVertical,
  Image as ImageIcon,
  Trash2,
} from "lucide-react";

import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import {
  STATUS_COLORS,
  STATUS_LABELS,
  TYPE_LABELS,
} from "@/components/stok/stokConstants";
import type { Unit } from "@/components/stok/stokTypes";
import PortfolioShareModal from "@/components/portfolio/PortfolioShareModal";
import type { PortfolioShareData } from "@/components/portfolio/PortfolioShareCard";

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
  return images.find((image) => image.isCover)?.displayUrl || images[0]?.displayUrl || "";
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  TRY: "₺",
  USD: "$",
  EUR: "€",
  GBP: "£",
};

function formatMoney(value?: number, currency?: string) {
  const numeric = Number(value || 0);
  if (!numeric) return "Fiyat belirtilmedi";
  const symbol = CURRENCY_SYMBOLS[currency || "TRY"] || "₺";
  return `${numeric.toLocaleString("tr-TR")} ${symbol}`;
}

function formatFloorInfo(unit?: Pick<DetailUnit, "floor" | "floorLabel" | "totalFloors"> | null) {
  if (!unit) return "Kat yok";

  const floorText =
    unit.floorLabel ||
    (unit.floor != null ? `${unit.floor}. Kat` : "Kat yok");

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

function getImageQualityScore(images: DetailImage[]) {
  const count = images.length;

  if (count <= 0) return 0;
  if (count === 1) return 60;
  if (count <= 4) return 70;
  if (count <= 7) return 80;
  if (count <= 11) return 90;
  return 100;
}

function getImageQualityLabel(score: number) {
  if (score >= 95) return "Vitrin Hazır";
  if (score >= 85) return "Çok Güçlü";
  if (score >= 75) return "Güçlü";
  if (score >= 60) return "Başlangıç";
  return "Görsel Eksik";
}

function formatFileSize(value?: number) {
  const size = Number(value || 0);
  if (!size) return "Boyut yok";
  if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(size / 1024))} KB`;
}

function calculatePortfolioScore(unit?: DetailUnit | null) {
  if (!unit) return 0;

  let score = 0;
  const imageQualityScore = getImageQualityScore(getUnitImages(unit));

  if (unit.project?.name) score += 15;
  if (unit.project?.city && unit.project?.district) score += 15;
  if (unit.price) score += 12;
  if (unit.area) score += 10;
  if (unit.roomCount) score += 10;
  if (unit.description) score += 10;
  if (unit.tapuVerified) score += 8;
  if (unit.photoVerified) score += 4;
  if (imageQualityScore) score += Math.round(imageQualityScore * 0.12);
  if (unit.yetkiVerified || unit.isVerified) score += 12;

  return Math.min(score || 72, 100);
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
  return `EPH-${raw.slice(0, 4).toLocaleUpperCase("tr-TR") || "PORT"}-${raw
    .slice(-4)
    .toLocaleUpperCase("tr-TR") || "0001"}`;
}

export default function StokDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();

  const [unit, setUnit] = useState<DetailUnit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isFollowing, setIsFollowing] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareData, setShareData] = useState<PortfolioShareData | null>(null);
  const [activePhoto, setActivePhoto] = useState(0);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryManageMode, setGalleryManageMode] = useState(false);
  const [imageActionLoading, setImageActionLoading] = useState("");
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");
  const [editForm, setEditForm] = useState({
    type: "DAIRE",
    floor: "",
    number: "",
    roomCount: "",
    area: "",
    price: "",
    status: "SATILIK",
    description: "",
  });

  const unitId = params?.id;

  useEffect(() => {
    if (!unitId) return;
    fetchUnit();
  }, [unitId]);

  useEffect(() => {
    if (!unitId || typeof window === "undefined") return;
    setIsFollowing(localStorage.getItem(`eph-stock-follow-${unitId}`) === "true");
  }, [unitId]);

  useEffect(() => {
    if (typeof document === "undefined") return;

    const shouldLockBody = galleryOpen || editOpen || deleteOpen || shareOpen;

    if (shouldLockBody) {
      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";

      return () => {
        document.body.style.overflow = previousOverflow;
      };
    }

    document.body.style.overflow = "";
  }, [galleryOpen, editOpen, deleteOpen, shareOpen]);

  useEffect(() => {
    if (!unit) return;

    setEditForm({
      type: unit.type || "DAIRE",
      floor: unit.floor != null ? String(unit.floor) : "",
      number: unit.number || "",
      roomCount: unit.roomCount || "",
      area: unit.area != null ? String(unit.area) : "",
      price: unit.price != null ? String(unit.price) : "",
      status: unit.status || "SATILIK",
      description: unit.description || "",
    });
  }, [unit]);

  const fetchUnit = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get(`/units/${unitId}`);
      setUnit(response.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Portföy detayı yüklenemedi.");
    } finally {
      setLoading(false);
    }
  };

  const toggleFollow = () => {
    if (!unitId || typeof window === "undefined") return;
    const next = !isFollowing;
    setIsFollowing(next);
    localStorage.setItem(`eph-stock-follow-${unitId}`, String(next));
  };

  const openEditModal = () => {
    setActionError("");
    setEditOpen(true);
  };

  const handleUpdateUnit = async () => {
    if (!unit) return;

    setActionError("");

    if (!editForm.number.trim() || !editForm.area.trim() || !editForm.price.trim()) {
      setActionError("Birim numarası, alan ve fiyat zorunludur.");
      return;
    }

    try {
      setActionLoading(true);

      await api.patch(`/units/${unit.id}`, {
        type: editForm.type,
        floor: editForm.floor ? parseInt(editForm.floor, 10) : null,
        number: editForm.number.trim(),
        roomCount: editForm.roomCount.trim() || null,
        area: parseFloat(editForm.area),
        price: parseFloat(editForm.price),
        status: editForm.status,
        description: editForm.description.trim() || null,
      });

      await fetchUnit();
      setEditOpen(false);
    } catch (err: any) {
      setActionError(err?.response?.data?.message || "Portföy güncellenemedi.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUnit = async () => {
    if (!unit) return;

    setActionError("");

    try {
      setActionLoading(true);
      await api.delete(`/units/${unit.id}`);
      router.push("/stok");
    } catch (err: any) {
      setActionError(err?.response?.data?.message || "Portföy silinemedi.");
      setActionLoading(false);
    }
  };

  const refreshPortfolioImages = async () => {
    if (!unit?.id) return;

    const response = await api.get(`/portfolio-images/${unit.id}`);
    const nextImages = response.data || [];

    setUnit((current) =>
      current
        ? {
            ...current,
            images: nextImages,
          }
        : current,
    );
  };

  const updatePortfolioImagesFromResponse = (nextImages: DetailUnit["images"]) => {
    setUnit((current) =>
      current
        ? {
            ...current,
            images: nextImages || [],
          }
        : current,
    );
  };

  const handleSetCoverImage = async (imageId: string) => {
    if (!unit) return;

    setActionError("");
    setImageActionLoading(`cover-${imageId}`);

    try {
      const response = await api.put(`/portfolio-images/${imageId}/cover`);
      updatePortfolioImagesFromResponse(response.data || []);
      setActivePhoto(0);
    } catch (err: any) {
      setActionError(err?.response?.data?.message || "Kapak görseli değiştirilemedi.");
    } finally {
      setImageActionLoading("");
    }
  };

  const handleDeletePortfolioImage = async (imageId: string, isCover: boolean) => {
    if (!unit) return;

    if (isCover && galleryImages.length > 1) {
      setActionError("Kapak görselini silmeden önce galeriden başka bir görseli kapak yapın.");
      return;
    }

    const approved =
      typeof window === "undefined" ||
      window.confirm("Bu görseli portföy galerisinden silmek istiyor musunuz?");

    if (!approved) return;

    setActionError("");
    setImageActionLoading(`delete-${imageId}`);

    try {
      const response = await api.delete(`/portfolio-images/${imageId}`);
      updatePortfolioImagesFromResponse(response.data || []);
      setActivePhoto(0);
    } catch (err: any) {
      setActionError(err?.response?.data?.message || "Görsel silinemedi.");
    } finally {
      setImageActionLoading("");
    }
  };

  const handleReorderPortfolioImages = async (imageId: string, direction: "up" | "down") => {
    if (!unit) return;

    const currentIndex = galleryImages.findIndex((image) => image.id === imageId);
    if (currentIndex < 0) return;

    const nextIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (nextIndex < 0 || nextIndex >= galleryImages.length) return;

    const reorderedImages = [...galleryImages];
    const [selectedImage] = reorderedImages.splice(currentIndex, 1);
    reorderedImages.splice(nextIndex, 0, selectedImage);

    setImageActionLoading(`reorder-${imageId}`);
    setActionError("");

    try {
      const response = await api.put(`/portfolio-images/reorder/${unit.id}`, {
        imageIds: reorderedImages.map((image) => image.id),
      });

      updatePortfolioImagesFromResponse(response.data || []);
      setActivePhoto(nextIndex);
    } catch (err: any) {
      setActionError(err?.response?.data?.message || "Görsel sıralaması güncellenemedi.");
    } finally {
      setImageActionLoading("");
    }
  };

  const handleGalleryTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    if (touchStartX == null || galleryImages.length <= 1) return;

    const touchEndX = event.changedTouches[0]?.clientX || 0;
    const diff = touchStartX - touchEndX;

    if (Math.abs(diff) > 55) {
      if (diff > 0) {
        setActivePhoto((current) =>
          current === galleryImages.length - 1 ? 0 : current + 1,
        );
      } else {
        setActivePhoto((current) =>
          current === 0 ? galleryImages.length - 1 : current - 1,
        );
      }
    }

    setTouchStartX(null);
  };

  const calculatedSquareMeterPrice = useMemo(() => {
    const price = Number(unit?.price || 0);
    const area = Number(unit?.area || 0);
    if (!price || !area) return "—";
    return `${Math.round(price / area).toLocaleString("tr-TR")} ₺/m²`;
  }, [unit]);

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

  const galleryImages = useMemo(() => getUnitImages(unit), [unit]);
  const coverImage = useMemo(() => getUnitCoverImage(unit), [unit]);
  const activeGalleryImage = galleryImages[activePhoto]?.displayUrl || coverImage || "";
  const imageQualityScore = useMemo(
    () => getImageQualityScore(galleryImages),
    [galleryImages],
  );
  const imageQualityLabel = useMemo(
    () => getImageQualityLabel(imageQualityScore),
    [imageQualityScore],
  );
  const imageProgress = Math.min(
    100,
    Math.round((galleryImages.length / MAX_GALLERY_COUNT) * 100),
  );

  useEffect(() => {
    setActivePhoto(0);
  }, [unit?.id]);

  useEffect(() => {
    if (galleryImages.length === 0) {
      setActivePhoto(0);
      return;
    }

    if (activePhoto > galleryImages.length - 1) {
      setActivePhoto(galleryImages.length - 1);
    }
  }, [galleryImages.length, activePhoto]);

  const verificationItems = [
    {
      label: "Tapu",
      active: Boolean(unit?.tapuVerified),
      description: "Tapu evrakı kontrol durumu",
    },
    {
      label: "Fotoğraf",
      active: Boolean(unit?.photoVerified),
      description: "Görsel doğrulama durumu",
    },
    {
      label: "Yetki",
      active: Boolean(unit?.yetkiVerified || unit?.isVerified),
      description: "Portföy yetki kontrolü",
    },
  ];

  const linaAdvice = useMemo(() => {
    if (!unit) return "Portföy bilgisi bekleniyor.";
    if (!unit.description) {
      return "Açıklama alanı eksik. Lina ile güçlü bir açıklama hazırlanırsa karne puanı yükselir.";
    }
    if (!unit.yetkiVerified && !unit.isVerified) {
      return "Yetki bilgisi eksik. Yetki durumu tamamlanırsa paylaşım kartında güven rozeti daha güçlü görünür.";
    }
    if (!unit.project?.city || !unit.project?.district) {
      return "Konum bilgisi eksik. İl ve ilçe bilgisi tamamlandığında kart paylaşımı daha profesyonel görünür.";
    }
    return "Bu portföy paylaşım kartı, Instagram hikâye ve PDF broşür için hazır görünüyor.";
  }, [unit]);

  const getPortfolioShareData = (item: DetailUnit): PortfolioShareData => {
    const price = Number(item.price || 0);
    const location =
      [item.project?.district, item.project?.city].filter(Boolean).join(" / ") ||
      "Konum bilgisi yok";

    return {
      id: item.id,
      title: item.project?.name || "EPH Portföy",
      location,
      price: price ? formatMoney(price, item.priceCurrency) : "Fiyat bilgisi yok",
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
        item.description ||
        "Bu portföy için açıklama henüz eklenmedi.",
      longDescription:
        item.description ||
        "Bu portföy için detaylı açıklama henüz eklenmedi. Portföy sahibi açıklama eklediğinde paylaşım kartı ve detay sayfasında burada görünecek.",
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
        {
          icon: "pool",
          label: statusLabel(item.status),
        },
      ],
    };
  };

  const handleOpenShareModal = () => {
    if (!unit) return;
    setShareData(getPortfolioShareData(unit));
    setShareOpen(true);
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F7FBFF] text-[#06194A]">
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
      <main className="flex min-h-screen items-center justify-center bg-[#F7FBFF] px-4 text-[#06194A]">
        <section className="w-full max-w-lg rounded-[32px] border border-[#DDE7F3] bg-white p-6 text-center shadow-[0_20px_55px_rgba(15,23,42,0.07)]">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
            <FileText size={26} />
          </div>
          <h1 className="mt-4 text-2xl font-black">Portföy bulunamadı</h1>
          <p className="mt-2 text-sm font-semibold leading-6 text-[#64748B]">
            {error || "Bu portföye ait detay bilgisi alınamadı."}
          </p>
          <button
            onClick={() => router.push("/stok")}
            className="mt-5 rounded-2xl bg-[#1557D6] px-5 py-3 text-sm font-black text-white"
          >
            Portföy Merkezine Dön
          </button>
        </section>
      </main>
    );
  }

  const style = statusStyle(unit.status);
  const verified = isUnitVerified(unit);

  return (
    <main className="min-h-screen bg-[#F7FBFF] pb-28 text-[#27364F]">
      <section className="mx-auto max-w-7xl px-4 py-5">
        <section className="overflow-hidden rounded-[38px] border border-[#DDE7F3] bg-white shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
          <div className="relative min-h-[620px] bg-[#06194A] text-white">
            {activeGalleryImage ? (
              <div
                className="absolute inset-0 bg-cover bg-center opacity-100"
                style={{ backgroundImage: `url("${activeGalleryImage}")` }}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.18),transparent_28%),linear-gradient(135deg,#06194A,#1557D6)]">
                <div className="rounded-[28px] border border-white/18 bg-white/12 px-6 py-5 text-center backdrop-blur">
                  <p className="text-xs font-black uppercase tracking-[0.24em] text-white/70">
                    Fotoğraf Eklenmedi
                  </p>
                  <p className="mt-2 text-sm font-bold text-white/85">
                    Bu portföy için kapak görseli bekleniyor.
                  </p>
                </div>
              </div>
            )}
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(6,25,74,0.72),rgba(6,25,74,0.46)_42%,rgba(6,25,74,0.05)),linear-gradient(180deg,rgba(6,25,74,0.04),rgba(6,25,74,0.58))]" />

            <div className="relative z-10 flex min-h-[620px] flex-col justify-between p-5 lg:p-8">
              <div className="flex items-center justify-between gap-4">
                <button
                  onClick={() => router.push("/stok")}
                  className="flex h-12 w-12 items-center justify-center rounded-[20px] border border-white/18 bg-white/12 text-white backdrop-blur transition hover:bg-white/20"
                  aria-label="Portföy merkezine dön"
                >
                  <ArrowLeft size={20} />
                </button>

                <div className="flex flex-wrap justify-end gap-2">
                  <div
                    className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-black shadow-lg"
                    style={{
                      color: style.color,
                      background: style.bg,
                      borderColor: style.border,
                    }}
                  >
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ background: style.dot }}
                    />
                    {statusLabel(unit.status)}
                  </div>

                  <span className="inline-flex items-center gap-2 rounded-full border border-white/18 bg-white/12 px-4 py-2 text-xs font-black text-white backdrop-blur">
                    <ShieldCheck size={15} />
                    {verified ? "Yetkili Portföy" : "Yetki Kontrol"}
                  </span>
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.24em] text-white/72">
                    🏘️ Portföy Vitrini
                  </p>

                  <h1 className="mt-4 max-w-4xl text-4xl font-black leading-tight tracking-[-0.055em] md:text-6xl">
                    {unitTitle(unit)}
                  </h1>

                  <div className="mt-5 flex items-center gap-2 text-sm font-bold leading-7 text-white/82">
                    <MapPin size={18} />
                    <span>
                      {[unit.project?.district, unit.project?.city, unit.project?.address]
                        .filter(Boolean)
                        .join(" / ") || "Konum bilgisi yok"}
                    </span>
                  </div>

                  <div className="mt-7 flex flex-wrap gap-3">
                    <SummaryChip icon={<Home size={17} />} label={unit.roomCount || "—"} />
                    <SummaryChip icon={<Sparkles size={17} />} label={unit.area ? `${unit.area} m²` : "—"} />
                    <SummaryChip icon={<Building2 size={17} />} label={formatFloorInfo(unit)} />
                    <SummaryChip icon={<Camera size={17} />} label={`${galleryImages.length}/${MAX_GALLERY_COUNT} Fotoğraf`} />
                    <SummaryChip icon={<TrendingUp size={17} />} label={calculatedSquareMeterPrice} />
                  </div>
                </div>

                <div className="rounded-[32px] border border-white/24 bg-[#06194A]/55 p-5 text-white shadow-[0_26px_70px_rgba(0,0,0,0.22)] backdrop-blur-md">
                  <p className="text-[11px] font-black uppercase tracking-[0.22em] text-white/70">
                    Satış Değeri
                  </p>

                  <p className="mt-2 text-5xl font-black tracking-[-0.065em] text-white">
                    {formatMoney(unit.price, unit.priceCurrency)}
                  </p>

                  <div className="mt-5 grid gap-2 sm:grid-cols-2">
                    <button
                      onClick={handleOpenShareModal}
                      className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-[22px] bg-white px-5 py-4 text-sm font-black text-[#1557D6] shadow-[0_18px_38px_rgba(255,255,255,0.16)] transition hover:scale-[1.01]"
                    >
                      <Share2 size={18} />
                      Kart Hazırla
                    </button>

                    <button
                      onClick={toggleFollow}
                      className={`inline-flex min-h-[52px] items-center justify-center gap-2 rounded-[22px] px-5 py-4 text-sm font-black transition ${
                        isFollowing
                          ? "bg-amber-100 text-amber-800"
                          : "border border-white/18 bg-white/12 text-white backdrop-blur hover:bg-white/18"
                      }`}
                    >
                      <Star
                        size={18}
                        fill={isFollowing ? "currentColor" : "none"}
                      />
                      {isFollowing ? "Takipte" : "Takibe Al"}
                    </button>
                  </div>

                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <button
                      onClick={openEditModal}
                      className="inline-flex min-h-[48px] items-center justify-center rounded-[20px] border border-white/18 bg-white/12 px-5 py-3 text-sm font-black text-white backdrop-blur transition hover:bg-white/18"
                    >
                      İlanı Güncelle
                    </button>

                    <button
                      onClick={() => {
                        setActionError("");
                        setDeleteOpen(true);
                      }}
                      className="inline-flex min-h-[48px] items-center justify-center rounded-[20px] bg-rose-50 px-5 py-3 text-sm font-black text-rose-700 transition hover:bg-rose-100"
                    >
                      İlanı Sil
                    </button>
                  </div>

                  <div className="mt-5 grid gap-3">
                    <div className="rounded-[24px] bg-white/10 p-4">
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-xs font-black uppercase tracking-[0.18em] text-white/70">
                          Portföy No
                        </span>
                        <span className="text-sm font-black text-white">
                          {getPortfolioNo(unit)}
                        </span>
                      </div>
                    </div>

                    <div className="rounded-[24px] border border-white/18 bg-white/16 p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-xs font-black uppercase tracking-[0.18em] text-white/70">
                            Portföy Rozeti
                          </p>
                          <p className="mt-1 text-lg font-black text-white">
                            ★★★★★ {portfolioScoreLabel}
                          </p>
                        </div>

                        <div className="rounded-[18px] bg-white px-4 py-3 text-center text-[#1557D6]">
                          <p className="text-2xl font-black leading-none">
                            {portfolioScore}
                          </p>
                          <p className="text-[10px] font-black uppercase tracking-[0.14em]">
                            /100
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <MetricCard
            icon={<WalletCards size={22} />}
            label="Fiyat"
            value={formatMoney(unit.price, unit.priceCurrency)}
            tone="blue"
          />
          <MetricCard
            icon={<Home size={22} />}
            label="Oda / Plan"
            value={unit.roomCount || "—"}
            tone="green"
          />
          <MetricCard
            icon={<Sparkles size={22} />}
            label="Alan"
            value={unit.area ? `${unit.area} m²` : "—"}
            tone="amber"
          />
          <MetricCard
            icon={<Camera size={22} />}
            label="Fotoğraf"
            value={`${galleryImages.length}/${MAX_GALLERY_COUNT}`}
            tone="slate"
          />
          <MetricCard
            icon={<TrendingUp size={22} />}
            label="m² Değeri"
            value={calculatedSquareMeterPrice}
            tone="blue"
          />
        </section>

        <section className="mt-5 rounded-[34px] border border-[#DDE7F3] bg-white p-5 shadow-[0_20px_55px_rgba(15,23,42,0.07)]">
          <div className="flex flex-col gap-4 text-center lg:flex-row lg:items-center lg:justify-between lg:text-left">
            <div>
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-[18px] bg-[#EFF6FF] text-[#1557D6]">
                <ImageIcon size={21} />
              </div>

              <h2 className="mt-3 text-2xl font-black tracking-[-0.04em] text-[#06194A]">
                Portföy Görsel Yönetim Merkezi
              </h2>

              <p className="mt-1 text-sm font-semibold leading-6 text-[#64748B]">
                Kapak seçimi, galeri sıralaması, görsel silme ve kalite puanı bu merkezden yönetilir.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row lg:justify-end">
              <button
                onClick={() => refreshPortfolioImages()}
                disabled={Boolean(imageActionLoading)}
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-[20px] border border-[#DDE7F3] bg-white px-5 py-3 text-sm font-black text-[#475569] transition hover:bg-[#EFF6FF] hover:text-[#1557D6] disabled:opacity-60"
              >
                <Camera size={17} />
                Görselleri Yenile
              </button>

              <button
                onClick={() => setGalleryManageMode((current) => !current)}
                disabled={galleryImages.length === 0}
                className={`inline-flex min-h-[48px] items-center justify-center gap-2 rounded-[20px] px-5 py-3 text-sm font-black transition ${
                  galleryManageMode
                    ? "bg-[#06194A] text-white"
                    : galleryImages.length > 0
                      ? "bg-[#1557D6] text-white hover:bg-[#0F49BD]"
                      : "cursor-not-allowed bg-slate-100 text-slate-400"
                }`}
              >
                <GripVertical size={17} />
                {galleryManageMode ? "Yönetimi Kapat" : "Görselleri Yönet"}
              </button>

              <button
                onClick={() => galleryImages.length > 0 && setGalleryOpen(true)}
                disabled={galleryImages.length === 0}
                className={`inline-flex min-h-[48px] items-center justify-center gap-2 rounded-[20px] px-5 py-3 text-sm font-black transition ${
                  galleryImages.length > 0
                    ? "bg-[#1557D6] text-white hover:bg-[#0F49BD]"
                    : "cursor-not-allowed bg-slate-100 text-slate-400"
                }`}
              >
                <FileText size={17} />
                {galleryImages.length > 0 ? "Galeriyi Aç" : "Galeri Yok"}
              </button>
            </div>
          </div>

          {actionError && (
            <div className="mt-4 rounded-[22px] border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-black text-rose-700">
              {actionError}
            </div>
          )}

          <div className="mt-5 grid gap-3 md:grid-cols-4">
            <GalleryStatCard
              icon={<Camera size={21} />}
              label="Fotoğraf"
              value={`${galleryImages.length}/${MAX_GALLERY_COUNT}`}
              note="Kapak dahil toplam"
            />
            <GalleryStatCard
              icon={<Star size={21} />}
              label="Kalite"
              value={`${imageQualityScore}/100`}
              note={imageQualityLabel}
            />
            <GalleryStatCard
              icon={<ImageIcon size={21} />}
              label="Kapak"
              value={galleryImages.some((image) => image.isCover) ? "Seçili" : "Yok"}
              note={galleryImages.find((image) => image.isCover)?.originalName || "Kapak bekleniyor"}
            />
            <GalleryStatCard
              icon={<CalendarDays size={21} />}
              label="Son İşlem"
              value={formatDate(unit.updatedAt || unit.createdAt)}
              note="Portföy güncellemesi"
            />
          </div>

          <div className="mt-5 overflow-hidden rounded-full bg-[#DBEAFE]">
            <div
              className="h-3 rounded-full bg-[#1557D6] transition-all"
              style={{ width: `${imageProgress}%` }}
            />
          </div>

          {galleryImages.length > 0 ? (
            <div className="mt-5 grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
              <button
                type="button"
                onClick={() => setGalleryOpen(true)}
                className="group relative min-h-[380px] overflow-hidden rounded-[30px] bg-[#06194A] text-left"
              >
                <img
                  src={activeGalleryImage}
                  alt="Portföy galerisi kapak fotoğrafı"
                  className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-[#06194A]/72 via-[#06194A]/10 to-transparent" />

                <div className="absolute left-5 top-5 flex flex-wrap gap-2">
                  {galleryImages[activePhoto]?.isCover && (
                    <span className="rounded-full bg-white/92 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-[#1557D6]">
                      Kapak
                    </span>
                  )}
                  <span className="rounded-full bg-white/92 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-[#06194A]">
                    {galleryImages.length} Fotoğraf
                  </span>
                </div>

                <div className="absolute bottom-5 left-5 right-5">
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-white/72">
                    Fotoğraf {activePhoto + 1} / {galleryImages.length}
                  </p>

                  <h3 className="mt-2 text-2xl font-black tracking-[-0.04em] text-white">
                    Büyük Görsel Önizleme
                  </h3>

                  <p className="mt-2 text-sm font-bold text-white/78">
                    {galleryImages[activePhoto]?.originalName || "EPH portföy görseli"} · {formatFileSize(galleryImages[activePhoto]?.size)}
                  </p>
                </div>
              </button>

              <div className="max-h-[420px] overflow-y-auto rounded-[28px] bg-[#F7FBFF] p-2">
                <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
                  {galleryImages.map((photo, index) => (
                    <div
                      key={photo.id || photo.displayUrl}
                      className={`relative overflow-hidden rounded-[22px] border bg-white transition ${
                        activePhoto === index
                          ? "border-[#1557D6] ring-2 ring-[#1557D6]/20"
                          : "border-[#DDE7F3]"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setActivePhoto(index)}
                        className="relative block h-28 w-full overflow-hidden"
                      >
                        <img
                          src={photo.displayUrl}
                          alt={`Portföy fotoğrafı ${index + 1}`}
                          className="absolute inset-0 h-full w-full object-cover"
                        />

                        <span className="absolute bottom-2 right-2 rounded-full bg-white/92 px-2 py-1 text-[10px] font-black text-[#06194A]">
                          {index + 1}
                        </span>

                        {photo.isCover && (
                          <span className="absolute left-2 top-2 rounded-full bg-[#1557D6] px-2 py-1 text-[10px] font-black text-white">
                            Kapak
                          </span>
                        )}
                      </button>

                      {galleryManageMode && (
                        <div className="grid gap-2 p-2">
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => handleReorderPortfolioImages(photo.id, "up")}
                              disabled={index === 0 || Boolean(imageActionLoading)}
                              className="inline-flex min-h-[34px] items-center justify-center rounded-xl border border-[#DDE7F3] bg-[#F7FBFF] text-[#475569] disabled:opacity-40"
                              aria-label="Görseli yukarı taşı"
                            >
                              <ArrowUp size={15} />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleReorderPortfolioImages(photo.id, "down")}
                              disabled={index === galleryImages.length - 1 || Boolean(imageActionLoading)}
                              className="inline-flex min-h-[34px] items-center justify-center rounded-xl border border-[#DDE7F3] bg-[#F7FBFF] text-[#475569] disabled:opacity-40"
                              aria-label="Görseli aşağı taşı"
                            >
                              <ArrowDown size={15} />
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleSetCoverImage(photo.id)}
                            disabled={photo.isCover || Boolean(imageActionLoading)}
                            className={`min-h-[36px] rounded-xl px-3 py-2 text-xs font-black ${
                              photo.isCover
                                ? "bg-[#EFF6FF] text-[#1557D6]"
                                : "bg-[#1557D6] text-white disabled:opacity-50"
                            }`}
                          >
                            {photo.isCover ? "Kapak Seçili" : "Kapak Yap"}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeletePortfolioImage(photo.id, photo.isCover)}
                            disabled={Boolean(imageActionLoading)}
                            className="inline-flex min-h-[36px] items-center justify-center gap-2 rounded-xl bg-rose-50 px-3 py-2 text-xs font-black text-rose-700 disabled:opacity-50"
                          >
                            <Trash2 size={14} />
                            Sil
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-5 rounded-[30px] border border-dashed border-[#DDE7F3] bg-[#F7FBFF] p-10 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[24px] bg-white text-[#1557D6] shadow-[0_14px_34px_rgba(15,23,42,0.06)]">
                <FileText size={25} />
              </div>
              <h3 className="mt-4 text-2xl font-black tracking-[-0.04em] text-[#06194A]">
                Fotoğraf Eklenmedi
              </h3>
              <p className="mx-auto mt-2 max-w-xl text-sm font-semibold leading-7 text-[#64748B]">
                Bu portföy için kapak veya galeri fotoğrafı henüz yüklenmemiş. Görseller eklendiğinde burada görünecek.
              </p>
            </div>
          )}
        </section>

        <section className="mt-5 grid gap-5 lg:grid-cols-[1.35fr_0.95fr]">
          <div className="space-y-5">
            <section className="rounded-[34px] border border-[#DDE7F3] bg-white p-5 shadow-[0_20px_55px_rgba(15,23,42,0.07)]">
              <SectionTitle
                icon={<Sparkles size={21} />}
                title="Portföy Özellikleri"
                description="Gayrimenkulü ilk bakışta anlatan vitrin özellikleri"
              />

              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <FeatureCard icon={<Waves size={21} />} title="Havuz" />
                <FeatureCard icon={<Car size={21} />} title="Kapalı Otopark" />
                <FeatureCard icon={<Flame size={21} />} title="Yerden Isıtma" />
                <FeatureCard icon={<ShieldCheck size={21} />} title="7/24 Güvenlik" />
                <FeatureCard icon={<Coffee size={21} />} title="Kafeterya" />
                <FeatureCard icon={<Dumbbell size={21} />} title="Spor Salonu" />
                <FeatureCard icon={<Baby size={21} />} title="Çocuk Alanı" />
                <FeatureCard icon={<Sparkles size={21} />} title="Akıllı Ev" />
              </div>
            </section>

            <section className="rounded-[34px] border border-[#DDE7F3] bg-white p-5 shadow-[0_20px_55px_rgba(15,23,42,0.07)]">
              <SectionTitle
                icon={<FileText size={21} />}
                title="Portföy Açıklaması"
                description="Detaylı açıklama, paylaşım kartı ve PDF broşürde kullanılacak ana metindir"
              />
              <div className="mt-4 rounded-[26px] bg-[#F7FBFF] p-6 text-center text-base font-semibold leading-8 text-[#475569] md:text-left">
                {unit.description ||
                  "Bu portföy için açıklama henüz eklenmedi."}
              </div>
            </section>

            <section className="rounded-[34px] border border-[#DDE7F3] bg-white p-5 shadow-[0_20px_55px_rgba(15,23,42,0.07)]">
              <SectionTitle
                icon={<ShieldCheck size={21} />}
                title="Doğrulama ve Güven"
                description="Tapu, fotoğraf ve yetki kontrolleri"
              />
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {verificationItems.map((item) => (
                  <VerificationCard key={item.label} {...item} />
                ))}
              </div>
            </section>

            <section className="rounded-[34px] border border-[#DDE7F3] bg-white p-5 shadow-[0_20px_55px_rgba(15,23,42,0.07)]">
              <SectionTitle
                icon={<CalendarDays size={21} />}
                title="Portföy Geçmişi"
                description="Portföy operasyon kayıtları"
              />
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <TimelineCard
                  title="Portföy oluşturuldu"
                  description="Kayıt portföy sistemine eklendi."
                  date={formatDate(unit.createdAt)}
                />
                <TimelineCard
                  title="Son güncelleme"
                  description="Portföy bilgileri son kez işlendi."
                  date={formatDate(unit.updatedAt || unit.createdAt)}
                />
              </div>
            </section>

            <section className="grid gap-5 lg:grid-cols-2">
              <PortfolioReportV2
                score={portfolioScore}
                label={portfolioScoreLabel}
                unit={unit}
              />

              <section className="rounded-[30px] border border-[#DDE7F3] bg-white p-5 shadow-[0_20px_55px_rgba(15,23,42,0.07)]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.22em] text-[#1557D6]">
                      Lina Analizi
                    </p>
                    <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-[#06194A]">
                      Paylaşım hazırlığı
                    </h2>
                  </div>

                  <div className="flex h-14 w-14 items-center justify-center rounded-[22px] bg-[#EFF6FF] text-[#1557D6]">
                    <Sparkles size={22} />
                  </div>
                </div>

                <p className="mt-4 text-sm font-bold leading-7 text-[#475569]">
                  {linaAdvice}
                </p>
              </section>
            </section>
          </div>

          <aside className="space-y-5">
            <section className="rounded-[30px] border border-[#DDE7F3] bg-white p-5 text-center shadow-[0_20px_55px_rgba(15,23,42,0.07)]">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EFF6FF] text-[#1557D6]">
                <Building2 size={25} />
              </div>
              <h2 className="mt-4 text-xl font-black text-[#06194A]">
                Portföy Bilgileri
              </h2>
              <div className="mt-4 space-y-3 text-left">
                <InfoRow label="Portföy" value={unit.project?.name || "—"} />
                <InfoRow label="Şehir" value={unit.project?.city || "—"} />
                <InfoRow label="İlçe" value={unit.project?.district || "—"} />
                <InfoRow label="Adres" value={unit.project?.address || "—"} />
                <InfoRow label="Bağımsız Bölüm No" value={unit.number || "—"} />
                <InfoRow
                  label="Kat"
                  value={formatFloorInfo(unit)}
                />
                <InfoRow label="Mülk Tipi" value={typeLabel(unit.type)} />
                <InfoRow label="Portföy No" value={getPortfolioNo(unit)} />
              </div>
            </section>

            <section className="rounded-[30px] border border-[#DDE7F3] bg-white p-5 text-center shadow-[0_20px_55px_rgba(15,23,42,0.07)]">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                <CircleUserRound size={25} />
              </div>
              <h2 className="mt-4 text-xl font-black text-[#06194A]">
                Portföy Sahibi
              </h2>
              <p className="mt-2 text-sm font-semibold text-[#64748B]">
                {ownerName || "Kullanıcı bilgisi yok"}
              </p>
              {unit.project?.owner?.role && (
                <span className="mt-3 inline-flex rounded-full bg-[#F7FBFF] px-3 py-2 text-xs font-black text-[#64748B]">
                  {unit.project.owner.role}
                </span>
              )}
              <div className="mt-4 grid gap-2">
                <Link
                  href="/messages"
                  className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#06194A] text-sm font-black text-white"
                >
                  <MessageCircle size={18} /> Mesaj Gönder
                </Link>
                <button
                  onClick={handleOpenShareModal}
                  className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-[#DDE7F3] bg-white text-sm font-black text-[#1557D6]"
                >
                  <Share2 size={18} /> Kart Hazırla
                </button>
              </div>
            </section>

            <section className="rounded-[30px] border border-[#DDE7F3] bg-white p-5 text-center shadow-[0_20px_55px_rgba(15,23,42,0.07)]">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
                <Star size={25} />
              </div>
              <h2 className="mt-4 text-xl font-black text-[#06194A]">
                Takip Bilgisi
              </h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-[#64748B]">
                Bu ilk sürümde takip bilgisi cihaz bazlı tutulur. Backend takip listesi eklendiğinde burada takip eden kullanıcılar görünecek.
              </p>
              <button
                onClick={toggleFollow}
                className={`mt-4 h-12 w-full rounded-2xl text-sm font-black ${
                  isFollowing
                    ? "bg-amber-100 text-amber-700"
                    : "bg-[#1557D6] text-white"
                }`}
              >
                {isFollowing ? "Takipten Çıkar" : "Portföyü Takibe Al"}
              </button>
            </section>

            <section className="rounded-[30px] border border-[#DDE7F3] bg-white p-5 text-center shadow-[0_20px_55px_rgba(15,23,42,0.07)]">
              <SectionTitle
                centered
                icon={<Phone size={21} />}
                title="Hızlı Aksiyon"
                description="Bu portföyü iş akışına bağla"
              />
              <div className="mt-4 grid gap-2">
                <Link
                  href="/crm"
                  className="rounded-2xl bg-[#1557D6] px-4 py-3 text-sm font-black text-white"
                >
                  CRM’e Müşteri Ekle
                </Link>
                <Link
                  href="/network"
                  className="rounded-2xl border border-[#DDE7F3] bg-white px-4 py-3 text-sm font-black text-[#475569]"
                >
                  Forumda Talep Oluştur
                </Link>
              </div>
            </section>
          </aside>
        </section>
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

              <div className="flex items-center gap-2">
                {galleryImages[activePhoto] && !galleryImages[activePhoto].isCover && (
                  <button
                    onClick={() => handleSetCoverImage(galleryImages[activePhoto].id)}
                    disabled={Boolean(imageActionLoading)}
                    className="hidden rounded-[18px] bg-white px-4 py-3 text-xs font-black text-[#1557D6] sm:inline-flex"
                  >
                    Kapak Yap
                  </button>
                )}

                <button
                  onClick={() => setGalleryOpen(false)}
                  className="flex h-12 w-12 items-center justify-center rounded-[20px] border border-white/20 bg-white/10 text-white"
                  aria-label="Galeriyi kapat"
                >
                  <X size={21} />
                </button>
              </div>
            </div>

            <div
              className="relative min-h-0 flex-1 overflow-hidden rounded-[32px] bg-black"
              onTouchStart={(event) => setTouchStartX(event.touches[0]?.clientX || null)}
              onTouchEnd={handleGalleryTouchEnd}
            >
              <img
                src={activeGalleryImage}
                alt="Büyük portföy fotoğrafı"
                className="h-full w-full object-contain"
              />

              <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                {galleryImages[activePhoto]?.isCover && (
                  <span className="rounded-full bg-white/92 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-[#1557D6]">
                    Kapak
                  </span>
                )}
                <span className="rounded-full bg-white/92 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-[#06194A]">
                  Kaydırarak gez
                </span>
              </div>

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
                  className={`relative h-20 w-24 shrink-0 overflow-hidden rounded-[18px] border ${
                    activePhoto === index
                      ? "border-white"
                      : "border-white/20 opacity-70"
                  }`}
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

      {editOpen && (
        <div className="fixed inset-0 z-[10002] flex items-center justify-center bg-[#06194A]/70 p-4 backdrop-blur-xl">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[34px] border border-[#DDE7F3] bg-white p-5 shadow-[0_30px_90px_rgba(15,23,42,0.22)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-[#1557D6]">
                  Portföy Güncelle
                </p>
                <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-[#06194A]">
                  İlan bilgilerini düzenle
                </h2>
                <p className="mt-2 text-sm font-semibold leading-6 text-[#64748B]">
                  Temel portföy bilgilerini güncelleyip kaydedebilirsiniz.
                </p>
              </div>

              <button
                onClick={() => setEditOpen(false)}
                className="flex h-11 w-11 items-center justify-center rounded-[18px] border border-[#DDE7F3] bg-[#F7FBFF] text-[#06194A]"
                aria-label="Güncelleme penceresini kapat"
              >
                <X size={20} />
              </button>
            </div>

            {actionError && (
              <div className="mt-4 rounded-[22px] border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-black text-rose-700">
                {actionError}
              </div>
            )}

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <EditField label="Mülk Tipi">
                <select
                  value={editForm.type}
                  onChange={(event) =>
                    setEditForm((current) => ({ ...current, type: event.target.value }))
                  }
                  className="h-12 w-full rounded-2xl border border-[#DDE7F3] bg-[#F7FBFF] px-4 text-sm font-bold text-[#06194A] outline-none"
                >
                  {Object.entries(TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </EditField>

              <EditField label="Durum">
                <select
                  value={editForm.status}
                  onChange={(event) =>
                    setEditForm((current) => ({ ...current, status: event.target.value }))
                  }
                  className="h-12 w-full rounded-2xl border border-[#DDE7F3] bg-[#F7FBFF] px-4 text-sm font-bold text-[#06194A] outline-none"
                >
                  {Object.entries(STATUS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </EditField>

              <EditField label="Daire / Bölüm No *">
                <input
                  value={editForm.number}
                  onChange={(event) =>
                    setEditForm((current) => ({ ...current, number: event.target.value }))
                  }
                  className="h-12 w-full rounded-2xl border border-[#DDE7F3] bg-[#F7FBFF] px-4 text-sm font-bold text-[#06194A] outline-none"
                />
              </EditField>

              <EditField label="Oda / Plan Tipi">
                <input
                  value={editForm.roomCount}
                  onChange={(event) =>
                    setEditForm((current) => ({ ...current, roomCount: event.target.value }))
                  }
                  className="h-12 w-full rounded-2xl border border-[#DDE7F3] bg-[#F7FBFF] px-4 text-sm font-bold text-[#06194A] outline-none"
                />
              </EditField>

              <EditField label="Alan m² *">
                <input
                  type="number"
                  value={editForm.area}
                  onChange={(event) =>
                    setEditForm((current) => ({ ...current, area: event.target.value }))
                  }
                  className="h-12 w-full rounded-2xl border border-[#DDE7F3] bg-[#F7FBFF] px-4 text-sm font-bold text-[#06194A] outline-none"
                />
              </EditField>

              <EditField label="Fiyat TL *">
                <input
                  type="number"
                  value={editForm.price}
                  onChange={(event) =>
                    setEditForm((current) => ({ ...current, price: event.target.value }))
                  }
                  className="h-12 w-full rounded-2xl border border-[#DDE7F3] bg-[#F7FBFF] px-4 text-sm font-bold text-[#06194A] outline-none"
                />
              </EditField>

              <EditField label="Kat">
                <input
                  type="number"
                  value={editForm.floor}
                  onChange={(event) =>
                    setEditForm((current) => ({ ...current, floor: event.target.value }))
                  }
                  className="h-12 w-full rounded-2xl border border-[#DDE7F3] bg-[#F7FBFF] px-4 text-sm font-bold text-[#06194A] outline-none"
                />
              </EditField>

              <div className="md:col-span-2">
                <EditField label="Açıklama">
                  <textarea
                    value={editForm.description}
                    onChange={(event) =>
                      setEditForm((current) => ({ ...current, description: event.target.value }))
                    }
                    rows={5}
                    className="w-full rounded-2xl border border-[#DDE7F3] bg-[#F7FBFF] px-4 py-3 text-sm font-bold leading-6 text-[#06194A] outline-none"
                  />
                </EditField>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <button
                onClick={() => setEditOpen(false)}
                className="min-h-[52px] rounded-[20px] border border-[#DDE7F3] bg-white px-5 py-3 text-sm font-black text-[#475569]"
                disabled={actionLoading}
              >
                Vazgeç
              </button>

              <button
                onClick={handleUpdateUnit}
                className="min-h-[52px] rounded-[20px] bg-[#1557D6] px-5 py-3 text-sm font-black text-white disabled:opacity-60"
                disabled={actionLoading}
              >
                {actionLoading ? "Kaydediliyor..." : "Güncellemeyi Kaydet"}
              </button>
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
              İlanı silmek istiyor musunuz?
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
                {actionLoading ? "Siliniyor..." : "Evet, İlanı Sil"}
              </button>
            </div>
          </div>
        </div>
      )}

      <PortfolioShareModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        data={shareData}
      />

      <nav className="fixed bottom-0 left-0 right-0 border-t border-[#DDE7F3] bg-white/95 px-5 pb-6 pt-3 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center justify-between">
          <BottomItem href="/dashboard" icon={<Home size={21} />} label="Ana Sayfa" />
          <BottomItem active href="/stok" icon={<Building2 size={21} />} label="Portföy" />
          <BottomItem href="/crm" icon={<UsersRound size={21} />} label="CRM" />
          <BottomItem href="/network" icon={<MessageCircle size={21} />} label="Forum" />
          <BottomItem href="/lina" icon={<Sparkles size={21} />} label="Yapay Zeka" />
        </div>
      </nav>
    </main>
  );
}

function SummaryChip({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="inline-flex min-h-[46px] items-center gap-2 rounded-[18px] border border-white/18 bg-white/14 px-4 text-sm font-black text-white backdrop-blur">
      {icon}
      {label}
    </div>
  );
}

function FeatureCard({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <div className="flex min-h-[92px] flex-col items-center justify-center rounded-[24px] border border-[#DDE7F3] bg-[#F7FBFF] p-4 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-white text-[#1557D6] shadow-[0_12px_28px_rgba(15,23,42,0.06)]">
        {icon}
      </div>
      <p className="mt-3 text-xs font-black uppercase tracking-[0.12em] text-[#06194A]">
        {title}
      </p>
    </div>
  );
}

function PortfolioReportV2({
  score,
  label,
  unit,
}: {
  score: number;
  label: string;
  unit: DetailUnit;
}) {
  const imageCount = getUnitImages(unit).length;
  const imageQualityScore = getImageQualityScore(getUnitImages(unit));

  const items = [
    {
      label: "Fotoğraf Kalitesi",
      value: imageQualityScore,
      note:
        imageCount > 0
          ? `${imageCount} fotoğraf · ${getImageQualityLabel(imageQualityScore)}`
          : "Görsel eklenmeli",
    },
    {
      label: "Yetki Durumu",
      value: unit.yetkiVerified || unit.isVerified ? 100 : 55,
      note: unit.yetkiVerified || unit.isVerified ? "Yetkili portföy" : "Yetki bilgisi tamamlanmalı",
    },
    {
      label: "Açıklama Kalitesi",
      value: unit.description ? 95 : 45,
      note: unit.description ? "Paylaşım için yeterli" : "Açıklama eksik",
    },
    {
      label: "Konum Bilgisi",
      value: unit.project?.city && unit.project?.district ? 95 : 50,
      note: unit.project?.city && unit.project?.district ? "Konum net" : "Konum tamamlanmalı",
    },
    {
      label: "Fiyat Bilgisi",
      value: unit.price ? 100 : 40,
      note: unit.price ? "Fiyat bilgisi girilmiş" : "Fiyat eksik",
    },
  ];

  return (
    <section className="rounded-[30px] border border-[#DDE7F3] bg-white p-5 shadow-[0_20px_55px_rgba(15,23,42,0.07)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#1557D6]">
            Portföy Karnesi 2.0
          </p>
          <h2 className="mt-2 text-4xl font-black tracking-[-0.06em] text-[#06194A]">
            {score}/100
          </h2>
          <p className="mt-2 inline-flex rounded-full bg-[#EFF6FF] px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#1557D6]">
            ★★★★★ {label}
          </p>
        </div>

        <div className="flex h-14 w-14 items-center justify-center rounded-[22px] bg-[#EFF6FF] text-[#1557D6]">
          <Trophy size={22} />
        </div>
      </div>

      <div className="mt-5 grid gap-3">
        {items.map((item) => (
          <div
            key={item.label}
            className="rounded-[22px] border border-[#DDE7F3] bg-[#F7FBFF] p-4"
          >
            <div className="mb-3 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-black text-[#06194A]">
                  {item.label}
                </p>
                <p className="mt-1 text-xs font-bold text-[#64748B]">
                  {item.note}
                </p>
              </div>

              <span className="text-sm font-black text-[#1557D6]">
                {item.value}
              </span>
            </div>

            <div className="h-2 overflow-hidden rounded-full bg-[#DBEAFE]">
              <div
                className="h-full rounded-full bg-[#1557D6]"
                style={{ width: `${item.value}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ReportCard({
  icon,
  title,
  value,
  label,
  progress,
}: {
  icon: ReactNode;
  title: string;
  value: string;
  label: string;
  progress: number;
}) {
  return (
    <section className="rounded-[30px] border border-[#DDE7F3] bg-[#F7FBFF] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#1557D6]">
            {title}
          </p>
          <h2 className="mt-2 text-4xl font-black tracking-[-0.06em] text-[#06194A]">
            {value}
          </h2>
        </div>

        <div className="flex h-14 w-14 items-center justify-center rounded-[22px] bg-white text-[#1557D6]">
          {icon}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-4">
        <span className="rounded-full bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#1557D6]">
          {label}
        </span>
        <span className="text-sm font-black text-[#64748B]">
          {Math.round(progress)}%
        </span>
      </div>

      <div className="mt-4 h-3 overflow-hidden rounded-full bg-[#DBEAFE]">
        <div
          className="h-full rounded-full bg-[#1557D6]"
          style={{ width: `${Math.max(0, Math.min(progress, 100))}%` }}
        />
      </div>
    </section>
  );
}

function GalleryStatCard({
  icon,
  label,
  value,
  note,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="flex min-h-[138px] flex-col justify-between rounded-[26px] border border-[#DDE7F3] bg-[#F7FBFF] p-4 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-[18px] bg-white text-[#1557D6] shadow-[0_12px_28px_rgba(15,23,42,0.06)]">
        {icon}
      </div>
      <div>
        <p className="mt-3 text-[10px] font-black uppercase tracking-[0.18em] text-[#64748B]">
          {label}
        </p>
        <p className="mt-2 line-clamp-1 text-xl font-black text-[#06194A]">
          {value}
        </p>
        <p className="mt-1 line-clamp-1 text-xs font-bold text-[#64748B]">
          {note}
        </p>
      </div>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  tone: "blue" | "green" | "amber" | "slate";
}) {
  const styles = {
    blue: "bg-[#EFF6FF] text-[#1557D6]",
    green: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    slate: "bg-slate-100 text-slate-700",
  };

  return (
    <div className="rounded-[24px] border border-[#DDE7F3] bg-white p-4 text-center">
      <div
        className={`mx-auto flex h-12 w-12 items-center justify-center rounded-2xl ${styles[tone]}`}
      >
        {icon}
      </div>
      <p className="mt-3 text-[10px] font-black uppercase tracking-wide text-[#64748B]">
        {label}
      </p>
      <p className="mt-2 text-base font-black text-[#06194A]">{value}</p>
    </div>
  );
}

function SectionTitle({
  icon,
  title,
  description,
  centered,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  centered?: boolean;
}) {
  return (
    <div className={centered ? "text-center" : "text-center md:text-left"}>
      <div
        className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[#EFF6FF] text-[#1557D6] ${
          centered ? "" : "md:mx-0"
        }`}
      >
        {icon}
      </div>
      <h2 className="text-xl font-black text-[#06194A]">{title}</h2>
      <p className="mt-1 text-sm font-semibold leading-6 text-[#64748B]">
        {description}
      </p>
    </div>
  );
}

function VerificationCard({
  label,
  active,
  description,
}: {
  label: string;
  active: boolean;
  description: string;
}) {
  return (
    <div
      className={`rounded-[24px] border p-4 text-center ${
        active
          ? "border-emerald-200 bg-emerald-50"
          : "border-[#DDE7F3] bg-[#F7FBFF]"
      }`}
    >
      <div
        className={`mx-auto flex h-12 w-12 items-center justify-center rounded-2xl ${
          active ? "bg-white text-emerald-700" : "bg-white text-[#64748B]"
        }`}
      >
        {active ? <CheckCircle2 size={24} /> : <BadgeCheck size={24} />}
      </div>
      <h3
        className={`mt-3 text-sm font-black ${
          active ? "text-emerald-800" : "text-[#475569]"
        }`}
      >
        {label}
      </h3>
      <p className="mt-2 text-xs font-semibold leading-5 text-[#64748B]">
        {description}
      </p>
      <p
        className={`mt-3 text-[10px] font-black uppercase tracking-wide ${
          active ? "text-emerald-700" : "text-[#64748B]"
        }`}
      >
        {active ? "Doğrulandı" : "Bekliyor"}
      </p>
    </div>
  );
}

function TimelineCard({
  title,
  description,
  date,
}: {
  title: string;
  description: string;
  date: string;
}) {
  return (
    <div className="rounded-[24px] border border-[#DDE7F3] bg-[#F7FBFF] p-4 text-center md:text-left">
      <p className="text-[11px] font-black uppercase tracking-wide text-[#1557D6]">
        {date}
      </p>
      <h3 className="mt-2 text-sm font-black text-[#06194A]">{title}</h3>
      <p className="mt-1 text-xs font-semibold leading-5 text-[#64748B]">
        {description}
      </p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-2xl bg-[#F7FBFF] px-4 py-3">
      <span className="text-xs font-black uppercase tracking-wide text-[#64748B]">
        {label}
      </span>
      <span className="text-right text-sm font-black text-[#06194A]">
        {value}
      </span>
    </div>
  );
}

function EditField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-[#64748B]">
        {label}
      </span>
      {children}
    </label>
  );
}

function BottomItem({
  icon,
  label,
  active,
  href,
}: {
  icon: ReactNode;
  label: string;
  active?: boolean;
  href: string;
}) {
  return (
    <Link
      href={href}
      className={`flex w-16 flex-col items-center gap-1 ${
        active ? "text-[#1557D6]" : "text-[#64748B]"
      }`}
    >
      {icon}
      <span className="text-[11px] font-bold">{label}</span>
    </Link>
  );
}
