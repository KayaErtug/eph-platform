"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode, type TouchEvent } from "react";
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
  Copy,
  Edit3,
  ExternalLink,
  FileText,
  Home,
  Image as ImageIcon,
  MapPin,
  Maximize2,
  MessageCircle,
  Send,
  Share2,
  ShieldCheck,
  Trash2,
  Upload,
  X,
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
  return images.find((image) => image.isCover)?.displayUrl || images[0]?.displayUrl || "";
}

function formatMoney(value?: number, currency?: string) {
  const numeric = Number(value || 0);
  if (!numeric) return "Fiyat belirtilmedi";
  const symbol = CURRENCY_SYMBOLS[currency || "TRY"] || "₺";
  return `${numeric.toLocaleString("tr-TR")} ${symbol}`;
}

function formatFloorInfo(unit?: Pick<DetailUnit, "floor" | "floorLabel" | "totalFloors"> | null) {
  if (!unit) return "Kat bilgisi yok";
  const floorText = unit.floorLabel || (unit.floor != null ? `${unit.floor}. Kat` : "Kat bilgisi yok");
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
  return Boolean(unit?.isVerified || (unit?.tapuVerified && unit?.photoVerified && unit?.yetkiVerified));
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
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/stok/${unitId || ""}`;
}


function canEditDetailUnit(unit?: DetailUnit | null, user?: { id?: string | null; role?: string | null } | null) {
  const role = String(user?.role || "").toUpperCase();

  if (!unit || !user?.id) return false;
  if (role === "ADMIN" || role === "SUPER_ADMIN") return true;

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

function makeShareText(unit: DetailUnit) {
  const location = [unit.project?.district, unit.project?.city].filter(Boolean).join(" / ");
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
  const [shareData, setShareData] = useState<PortfolioShareData | null>(null);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");
  const [imageUploadLoading, setImageUploadLoading] = useState("");
  const [imageActionLoading, setImageActionLoading] = useState("");
  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!unitId) return;
    fetchUnit();
  }, [unitId]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (galleryOpen || shareOpen || deleteOpen) {
      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = previousOverflow;
      };
    }
    document.body.style.overflow = "";
  }, [galleryOpen, shareOpen, deleteOpen]);

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

  const galleryImages = useMemo(() => getUnitImages(unit), [unit]);
  const coverImage = useMemo(() => getUnitCoverImage(unit), [unit]);
  const activeGalleryImage = galleryImages[activePhoto]?.displayUrl || coverImage || "";
  const verified = isUnitVerified(unit);
  const portfolioScore = useMemo(() => calculatePortfolioScore(unit), [unit]);
  const portfolioScoreLabel = useMemo(() => getPortfolioScoreLabel(portfolioScore), [portfolioScore]);
  const ownerName = [unit?.project?.owner?.firstName, unit?.project?.owner?.lastName].filter(Boolean).join(" ");

  useEffect(() => {
    setActivePhoto(0);
  }, [unit?.id]);

  useEffect(() => {
    if (galleryImages.length === 0) {
      setActivePhoto(0);
      return;
    }
    if (activePhoto > galleryImages.length - 1) setActivePhoto(galleryImages.length - 1);
  }, [galleryImages.length, activePhoto]);

  const calculatedSquareMeterPrice = useMemo(() => {
    const price = Number(unit?.price || 0);
    const area = Number(unit?.area || 0);
    if (!price || !area) return "—";
    return `${Math.round(price / area).toLocaleString("tr-TR")} ₺/m²`;
  }, [unit]);

  const locationText = [unit?.project?.district, unit?.project?.city].filter(Boolean).join(" / ") || "Konum bilgisi yok";
  const fullAddress = [unit?.project?.address, unit?.project?.district, unit?.project?.city].filter(Boolean).join(" / ") || "Adres bilgisi yok";
  const projectLatitude = Number((unit?.project as any)?.latitude || 0);
  const projectLongitude = Number((unit?.project as any)?.longitude || 0);
  const hasProjectCoordinates = Number.isFinite(projectLatitude) && Number.isFinite(projectLongitude) && Boolean(projectLatitude) && Boolean(projectLongitude);
  const mapQuery = encodeURIComponent(hasProjectCoordinates ? `${projectLatitude},${projectLongitude}` : fullAddress);
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

  const uploadPortfolioImage = async (file: File, isCover: boolean, sortOrder: number) => {
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

  const handleCoverUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    event.target.value = "";

    if (!file) return;

    await uploadPortfolioImage(file, true, 0);
  };

  const handleGalleryUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);

    event.target.value = "";

    if (!files.length || !unit) return;

    const remaining = Math.max(0, MAX_GALLERY_COUNT - galleryImages.length);

    if (remaining <= 0) {
      setActionError(`En fazla ${MAX_GALLERY_COUNT} galeri fotoğrafı yükleyebilirsiniz.`);
      return;
    }

    const selectedFiles = files.slice(0, remaining);

    for (let index = 0; index < selectedFiles.length; index += 1) {
      await uploadPortfolioImage(selectedFiles[index], false, galleryImages.length + index + 1);
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
      setActionError(err?.response?.data?.message || "Kapak fotoğrafı değiştirilemedi.");
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

  const handleMoveImage = async (imageId?: string, direction?: "up" | "down") => {
    if (!unit || !imageId || !direction) return;

    const currentIndex = galleryImages.findIndex((image) => image.id === imageId);
    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= galleryImages.length) return;

    const nextImages = [...galleryImages];
    const current = nextImages[currentIndex];
    const target = nextImages[targetIndex];

    nextImages[currentIndex] = target;
    nextImages[targetIndex] = current;

    const imageIds = nextImages.map((image) => image.id).filter(Boolean) as string[];

    try {
      setActionError("");
      setImageActionLoading(`move-${imageId}`);
      await api.put(`/portfolio-images/reorder/${unit.id}`, { imageIds });
      await fetchUnit();
    } catch (err: any) {
      setActionError(err?.response?.data?.message || "Fotoğraf sıralaması güncellenemedi.");
    } finally {
      setImageActionLoading("");
    }
  };

  const getPortfolioShareData = (item: DetailUnit): PortfolioShareData => ({
    id: item.id,
    title: item.project?.name || "EPH Portföy",
    location: locationText,
    price: item.price ? formatMoney(item.price, item.priceCurrency) : "Fiyat bilgisi yok",
    roomCount: item.roomCount || "—",
    area: item.area ? `${item.area} m²` : "—",
    floor: formatFloorInfo(item),
    authorization: item.yetkiVerified || item.isVerified ? "Yetkili" : "Kontrol",
    coverImage: activeGalleryImage || "/LOGO_EPH.png",
    consultantName: [user?.firstName, user?.lastName].filter(Boolean).join(" ") || ownerName || "EPH Üyesi",
    consultantPhone: "Telefon bilgisi",
    portfolioNo: getPortfolioNo(item),
    score: portfolioScore,
    scoreLabel: portfolioScoreLabel,
    shortDescription: item.description || "Bu portföy için açıklama henüz eklenmedi.",
    longDescription: item.description || "Bu portföy için detaylı açıklama henüz eklenmedi.",
    features: [
      { icon: "security", label: item.yetkiVerified || item.isVerified ? "Yetkili Portföy" : "Yetki Kontrol" },
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
      router.push("/stok");
    } catch (err: any) {
      setActionError(err?.response?.data?.message || "Portföy silinemedi.");
      setActionLoading(false);
    }
  };

  const handleGalleryTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    if (touchStartX == null || galleryImages.length <= 1) return;
    const touchEndX = event.changedTouches[0]?.clientX || 0;
    const diff = touchStartX - touchEndX;
    if (Math.abs(diff) > 55) {
      if (diff > 0) setActivePhoto((current) => (current === galleryImages.length - 1 ? 0 : current + 1));
      else setActivePhoto((current) => (current === 0 ? galleryImages.length - 1 : current - 1));
    }
    setTouchStartX(null);
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F7FBFF] text-[#06194A]">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[#1557D6] border-t-transparent" />
          <p className="mt-4 text-xs font-black uppercase tracking-[0.26em] text-[#64748B]">Portföy detayı yükleniyor</p>
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
          <p className="mt-2 text-sm font-semibold leading-6 text-[#64748B]">{error || "Bu portföye ait detay bilgisi alınamadı."}</p>
          <button onClick={() => router.push("/stok")} className="mt-5 rounded-2xl bg-[#1557D6] px-5 py-3 text-sm font-black text-white">Portföy Merkezine Dön</button>
        </section>
      </main>
    );
  }

  const style = statusStyle(unit.status);
  const canEditPortfolio = canEditDetailUnit(unit, user);
  const encodedShareText = encodeURIComponent(makeShareText(unit));
  const encodedShareUrl = encodeURIComponent(shareUrl);

  return (
    <main className="min-h-screen bg-[#F7FBFF] pb-28 text-[#27364F]">
      <input ref={coverInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleCoverUpload} />
      <input ref={galleryInputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={handleGalleryUpload} />

      <section className="mx-auto max-w-7xl px-4 py-4 md:py-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <button onClick={() => router.push("/stok")} className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-[18px] border border-[#DDE7F3] bg-white px-4 text-sm font-black text-[#06194A] shadow-[0_12px_28px_rgba(15,23,42,0.06)]">
            <ArrowLeft size={18} />
            Geri
          </button>
          <div className="flex items-center gap-2">
            {canEditPortfolio && (
              <button onClick={() => router.push(`/stok?edit=${unit.id}`)} className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-[18px] border border-[#DDE7F3] bg-white px-4 text-sm font-black text-[#1557D6] shadow-[0_12px_28px_rgba(15,23,42,0.06)]">
                <Edit3 size={17} />
                Güncelle
              </button>
            )}
            <button onClick={handleCopyLink} className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-[18px] border border-[#DDE7F3] bg-white px-4 text-sm font-black text-[#475569] shadow-[0_12px_28px_rgba(15,23,42,0.06)]">
              <Copy size={17} />
              {copied ? "Kopyalandı" : "Link"}
            </button>
            <button onClick={handleOpenShareModal} className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-[18px] bg-[#1557D6] px-4 text-sm font-black text-white shadow-[0_14px_30px_rgba(21,87,214,0.22)]">
              <Share2 size={17} />
              Paylaş
            </button>
          </div>
        </div>

        {actionError && (
          <div className="mb-4 rounded-[24px] border border-rose-100 bg-rose-50 px-4 py-3 text-center text-sm font-black leading-6 text-rose-700">
            {actionError}
          </div>
        )}

        <section className="overflow-hidden rounded-[34px] border border-[#DDE7F3] bg-white shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
          <div className="grid lg:grid-cols-[1.2fr_0.8fr]">
            <button type="button" onClick={() => galleryImages.length > 0 && setGalleryOpen(true)} className="group relative min-h-[370px] overflow-hidden bg-[#06194A] text-left md:min-h-[560px]">
              {activeGalleryImage ? (
                <img src={activeGalleryImage} alt={unitTitle(unit)} className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.18),transparent_28%),linear-gradient(135deg,#06194A,#1557D6)]">
                  <div className="rounded-[28px] border border-white/18 bg-white/12 px-6 py-5 text-center backdrop-blur">
                    <p className="text-xs font-black uppercase tracking-[0.24em] text-white/70">Fotoğraf Eklenmedi</p>
                    <p className="mt-2 text-sm font-bold text-white/85">Bu portföy için kapak görseli bekleniyor.</p>
                  </div>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#06194A]/72 via-[#06194A]/18 to-transparent" />
              <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-black shadow-lg" style={{ color: style.color, background: style.bg, borderColor: style.border }}>
                  <span className="h-2 w-2 rounded-full" style={{ background: style.dot }} />
                  {statusLabel(unit.status)}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/18 bg-white/14 px-4 py-2 text-xs font-black text-white backdrop-blur">
                  <Camera size={15} />
                  {galleryImages.length}/{MAX_GALLERY_COUNT} Fotoğraf
                </span>
              </div>
              <div className="absolute bottom-5 left-5 right-5">
                <p className="text-xs font-black uppercase tracking-[0.24em] text-white/72">EPH Portföy Detayı</p>
                <h1 className="mt-3 max-w-4xl text-3xl font-black leading-tight tracking-[-0.055em] text-white md:text-5xl">{unitTitle(unit)}</h1>
                <div className="mt-4 flex items-center gap-2 text-sm font-bold leading-7 text-white/86">
                  <MapPin size={18} />
                  <span>{fullAddress}</span>
                </div>
              </div>
            </button>

            <aside className="flex flex-col justify-between gap-5 bg-white p-5 md:p-6">
              <div>
                <div className="rounded-[30px] border border-[#DDE7F3] bg-[#F7FBFF] p-5">
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-[#64748B]">Fiyat</p>
                  <p className="mt-2 text-4xl font-black tracking-[-0.055em] text-[#06194A] md:text-5xl">{formatMoney(unit.price, unit.priceCurrency)}</p>
                  <p className="mt-3 text-sm font-black text-[#1557D6]">{calculatedSquareMeterPrice}</p>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <InfoBox icon={<Home size={19} />} label="Oda" value={unit.roomCount || "—"} />
                  <InfoBox icon={<Maximize2 size={19} />} label="Alan" value={unit.area ? `${unit.area} m²` : "—"} />
                  <InfoBox icon={<Building2 size={19} />} label="Kat" value={formatFloorInfo(unit)} />
                  <InfoBox icon={<ShieldCheck size={19} />} label="Yetki" value={verified ? "Yetkili" : "Kontrol"} />
                </div>
                <div className="mt-4 rounded-[26px] border border-[#DDE7F3] bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-[#64748B]">Portföy No</p>
                      <p className="mt-1 text-sm font-black text-[#06194A]">{getPortfolioNo(unit)}</p>
                    </div>
                    <div className="rounded-[18px] bg-[#EFF6FF] px-4 py-3 text-center text-[#1557D6]">
                      <p className="text-2xl font-black leading-none">{portfolioScore}</p>
                      <p className="text-[10px] font-black uppercase tracking-[0.14em]">{portfolioScoreLabel}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 rounded-[26px] border border-[#DDE7F3] bg-[#F7FBFF] p-4">
                  <p className="text-center text-xs font-black uppercase tracking-[0.18em] text-[#64748B]">Fotoğraf Yönetimi</p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => coverInputRef.current?.click()}
                      disabled={imageUploadLoading === "cover"}
                      className="inline-flex min-h-[50px] items-center justify-center gap-2 rounded-[18px] bg-[#1557D6] px-4 text-sm font-black text-white disabled:opacity-60"
                    >
                      <Camera size={17} />
                      {imageUploadLoading === "cover" ? "Yükleniyor..." : "Kapak Ekle / Değiştir"}
                    </button>
                    <button
                      type="button"
                      onClick={() => galleryInputRef.current?.click()}
                      disabled={imageUploadLoading === "gallery" || galleryImages.length >= MAX_GALLERY_COUNT}
                      className="inline-flex min-h-[50px] items-center justify-center gap-2 rounded-[18px] border border-[#DDE7F3] bg-white px-4 text-sm font-black text-[#1557D6] disabled:opacity-60"
                    >
                      <Upload size={17} />
                      {imageUploadLoading === "gallery" ? "Yükleniyor..." : "Galeriye Foto Ekle"}
                    </button>
                  </div>
                  <p className="mt-3 text-center text-xs font-bold leading-5 text-[#64748B]">
                    JPG, PNG, WEBP · En fazla 15 MB · Galeri sınırı {MAX_GALLERY_COUNT} fotoğraf.
                  </p>
                </div>
              </div>
              <div className="grid gap-2">
                <button onClick={handleOpenShareModal} className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-[20px] bg-[#1557D6] px-5 py-3 text-sm font-black text-white shadow-[0_18px_38px_rgba(21,87,214,0.22)] transition hover:bg-[#0F49BD]">
                  <Share2 size={18} />
                  Paylaşım Kartı Hazırla
                </button>
                <button onClick={handleNativeShare} className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-[20px] border border-[#DDE7F3] bg-white px-5 py-3 text-sm font-black text-[#1557D6] transition hover:bg-[#EFF6FF]">
                  <Send size={18} />
                  Cihazdan Paylaş
                </button>
              </div>
            </aside>
          </div>
        </section>

        <section className="mt-5 grid gap-5 lg:grid-cols-[1.35fr_0.75fr]">
          <div className="space-y-5">
            <section className="rounded-[30px] border border-[#DDE7F3] bg-white p-5 shadow-[0_20px_55px_rgba(15,23,42,0.07)]">
              <SectionTitle icon={<FileText size={21} />} title="Açıklama" description="Portföyün kullanıcıya anlatılan ana metni" />
              <div className="mt-4 rounded-[24px] bg-[#F7FBFF] p-5 text-center text-base font-semibold leading-8 text-[#475569] md:text-left">
                {unit.description || "Bu portföy için açıklama henüz eklenmedi."}
              </div>
            </section>

            <section className="rounded-[30px] border border-[#DDE7F3] bg-white p-5 shadow-[0_20px_55px_rgba(15,23,42,0.07)]">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <SectionTitle icon={<ImageIcon size={21} />} title="Galeri" description="Kapak, detay görselleri ve fotoğraf sıralaması" />
                <div className="grid gap-2 sm:grid-cols-2 md:min-w-[360px]">
                  <button
                    type="button"
                    onClick={() => coverInputRef.current?.click()}
                    disabled={imageUploadLoading === "cover"}
                    className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-[18px] bg-[#1557D6] px-4 text-sm font-black text-white disabled:opacity-60"
                  >
                    <Camera size={17} />
                    {imageUploadLoading === "cover" ? "Yükleniyor..." : "Kapak Fotoğrafı"}
                  </button>
                  <button
                    type="button"
                    onClick={() => galleryInputRef.current?.click()}
                    disabled={imageUploadLoading === "gallery" || galleryImages.length >= MAX_GALLERY_COUNT}
                    className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-[18px] border border-[#DDE7F3] bg-white px-4 text-sm font-black text-[#1557D6] disabled:opacity-60"
                  >
                    <Upload size={17} />
                    {imageUploadLoading === "gallery" ? "Yükleniyor..." : "Galeri Ekle"}
                  </button>
                </div>
              </div>

              {galleryImages.length > 0 ? (
                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {galleryImages.map((photo, index) => (
                    <article key={photo.id || photo.displayUrl} className="overflow-hidden rounded-[24px] border border-[#DDE7F3] bg-[#F7FBFF]">
                      <button
                        type="button"
                        onClick={() => {
                          setActivePhoto(index);
                          setGalleryOpen(true);
                        }}
                        className="group relative h-44 w-full overflow-hidden bg-[#F7FBFF]"
                      >
                        <img src={photo.displayUrl} alt={`Portföy fotoğrafı ${index + 1}`} className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]" />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#06194A]/54 to-transparent opacity-80" />
                        <span className="absolute bottom-3 right-3 rounded-full bg-white/92 px-3 py-1 text-[11px] font-black text-[#06194A]">{index + 1}</span>
                        {photo.isCover && <span className="absolute left-3 top-3 rounded-full bg-[#1557D6] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-white">Kapak</span>}
                      </button>

                      <div className="grid gap-2 p-3">
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => handleSetCoverImage(photo.id)}
                            disabled={Boolean(photo.isCover) || imageActionLoading === `cover-${photo.id}`}
                            className="min-h-[42px] rounded-[16px] border border-[#DDE7F3] bg-white px-3 text-xs font-black text-[#1557D6] disabled:opacity-50"
                          >
                            {photo.isCover ? "Kapak Fotoğrafı" : imageActionLoading === `cover-${photo.id}` ? "İşleniyor..." : "Kapak Yap"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteImage(photo.id)}
                            disabled={imageActionLoading === `delete-${photo.id}`}
                            className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-[16px] bg-rose-50 px-3 text-xs font-black text-rose-700 disabled:opacity-50"
                          >
                            <Trash2 size={15} />
                            {imageActionLoading === `delete-${photo.id}` ? "Siliniyor..." : "Sil"}
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => handleMoveImage(photo.id, "up")}
                            disabled={index === 0 || imageActionLoading === `move-${photo.id}`}
                            className="inline-flex min-h-[40px] items-center justify-center gap-1 rounded-[16px] border border-[#DDE7F3] bg-white px-3 text-xs font-black text-[#64748B] disabled:opacity-40"
                          >
                            <ChevronLeft size={15} />
                            Öne Al
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveImage(photo.id, "down")}
                            disabled={index === galleryImages.length - 1 || imageActionLoading === `move-${photo.id}`}
                            className="inline-flex min-h-[40px] items-center justify-center gap-1 rounded-[16px] border border-[#DDE7F3] bg-white px-3 text-xs font-black text-[#64748B] disabled:opacity-40"
                          >
                            Sona Al
                            <ChevronRight size={15} />
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="mt-4 rounded-[24px] border border-dashed border-[#DDE7F3] bg-[#F7FBFF] p-8 text-center">
                  <Camera className="mx-auto text-[#1557D6]" size={28} />
                  <p className="mt-3 text-sm font-bold text-[#64748B]">Bu portföy için galeri fotoğrafı henüz yüklenmemiş.</p>
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => coverInputRef.current?.click()}
                      className="min-h-[48px] rounded-[18px] bg-[#1557D6] px-4 text-sm font-black text-white"
                    >
                      Kapak Fotoğrafı Ekle
                    </button>
                    <button
                      type="button"
                      onClick={() => galleryInputRef.current?.click()}
                      className="min-h-[48px] rounded-[18px] border border-[#DDE7F3] bg-white px-4 text-sm font-black text-[#1557D6]"
                    >
                      Galeri Fotoğrafı Ekle
                    </button>
                  </div>
                </div>
              )}
            </section>

            <section className="rounded-[30px] border border-[#DDE7F3] bg-white p-5 shadow-[0_20px_55px_rgba(15,23,42,0.07)]">
              <SectionTitle icon={<MapPin size={21} />} title="Konum / Harita" description="Portföyün şehir, ilçe ve adres bilgisi" />
              <div className="mt-4 overflow-hidden rounded-[26px] border border-[#DDE7F3] bg-[#F7FBFF]">
                <div className="grid gap-3 p-4 md:grid-cols-3">
                  <InfoRow label="Şehir" value={unit.project?.city || "—"} />
                  <InfoRow label="İlçe" value={unit.project?.district || "—"} />
                  <InfoRow label="Adres" value={unit.project?.address || "—"} />
                </div>
                <iframe
                  title="Portföy haritası"
                  src={`https://www.google.com/maps?q=${mapQuery}&z=${hasProjectCoordinates ? 17 : 14}&output=embed`}
                  className="h-72 w-full border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            </section>

            <section className="rounded-[30px] border border-[#DDE7F3] bg-white p-5 shadow-[0_20px_55px_rgba(15,23,42,0.07)]">
              <SectionTitle icon={<Share2 size={21} />} title="Paylaşım Merkezi" description="Portföy linkini ve kartını hızlı paylaş" />
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <ShareLink href={`https://wa.me/?text=${encodedShareText}`} label="WhatsApp" icon={<MessageCircle size={19} />} />
                <ShareLink href={`https://t.me/share/url?url=${encodedShareUrl}&text=${encodedShareText}`} label="Telegram" icon={<Send size={19} />} />
                <ShareLink href={`https://www.facebook.com/sharer/sharer.php?u=${encodedShareUrl}`} label="Facebook" icon={<Share2 size={19} />} />
                <ShareLink href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodedShareUrl}`} label="LinkedIn" icon={<ExternalLink size={19} />} />
                <button onClick={handleCopyLink} className="inline-flex min-h-[54px] items-center justify-center gap-2 rounded-[20px] border border-[#DDE7F3] bg-white px-4 text-sm font-black text-[#475569] transition hover:bg-[#EFF6FF] hover:text-[#1557D6]">
                  <Copy size={19} />
                  {copied ? "Kopyalandı" : "Kopyala"}
                </button>
                <button onClick={handleOpenShareModal} className="inline-flex min-h-[54px] items-center justify-center gap-2 rounded-[20px] bg-[#1557D6] px-4 text-sm font-black text-white transition hover:bg-[#0F49BD]">
                  <Share2 size={19} />
                  Kart / QR
                </button>
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
                <div className="rounded-[22px] border border-[#DDE7F3] bg-[#F7FBFF] px-4 py-3 text-center text-xs font-bold text-[#64748B] md:text-left">{shareUrl}</div>
                <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-[24px] border border-[#DDE7F3] bg-white p-2 shadow-[0_12px_28px_rgba(15,23,42,0.06)]">
                  <img src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodedShareUrl}`} alt="Portföy QR kodu" className="h-full w-full" />
                </div>
              </div>
            </section>
          </div>

          <aside className="space-y-5">
            <section className="rounded-[30px] border border-[#DDE7F3] bg-white p-5 text-center shadow-[0_20px_55px_rgba(15,23,42,0.07)]">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EFF6FF] text-[#1557D6]"><Building2 size={25} /></div>
              <h2 className="mt-4 text-xl font-black text-[#06194A]">Temel Bilgiler</h2>
              <div className="mt-4 space-y-3 text-left">
                <InfoRow label="Portföy" value={unit.project?.name || "—"} />
                <InfoRow label="Mülk Tipi" value={typeLabel(unit.type)} />
                <InfoRow label="Durum" value={statusLabel(unit.status)} />
                <InfoRow label="Oda" value={unit.roomCount || "—"} />
                <InfoRow label="Alan" value={unit.area ? `${unit.area} m²` : "—"} />
                <InfoRow label="Kat" value={formatFloorInfo(unit)} />
                <InfoRow label="Bağımsız Bölüm" value={unit.number || "—"} />
                <InfoRow label="Kayıt Tarihi" value={formatDate(unit.createdAt)} />
              </div>
            </section>

            <section className="rounded-[30px] border border-[#DDE7F3] bg-white p-5 text-center shadow-[0_20px_55px_rgba(15,23,42,0.07)]">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700"><CircleUserRound size={25} /></div>
              <h2 className="mt-4 text-xl font-black text-[#06194A]">Danışman / Sahip</h2>
              <p className="mt-2 text-sm font-semibold text-[#64748B]">{ownerName || "Kullanıcı bilgisi yok"}</p>
              {unit.project?.owner?.role && <span className="mt-3 inline-flex rounded-full bg-[#F7FBFF] px-3 py-2 text-xs font-black text-[#64748B]">{unit.project.owner.role}</span>}
              <div className="mt-4 grid gap-2">
                <Link href="/messages" className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#06194A] text-sm font-black text-white"><MessageCircle size={18} /> Mesaj Gönder</Link>
                <button onClick={handleOpenShareModal} className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-[#DDE7F3] bg-white text-sm font-black text-[#1557D6]"><Share2 size={18} /> Kart Hazırla</button>
              </div>
            </section>

            <section className="rounded-[30px] border border-[#DDE7F3] bg-white p-5 text-center shadow-[0_20px_55px_rgba(15,23,42,0.07)]">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EFF6FF] text-[#1557D6]"><BadgeCheck size={25} /></div>
              <h2 className="mt-4 text-xl font-black text-[#06194A]">Güven Durumu</h2>
              <div className="mt-4 grid gap-2">
                <TrustRow label="Tapu" active={Boolean(unit.tapuVerified)} />
                <TrustRow label="Fotoğraf" active={Boolean(unit.photoVerified || galleryImages.length > 0)} />
                <TrustRow label="Yetki" active={Boolean(unit.yetkiVerified || unit.isVerified)} />
              </div>
            </section>

            <section className="rounded-[30px] border border-[#DDE7F3] bg-white p-5 text-center shadow-[0_20px_55px_rgba(15,23,42,0.07)]">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-700"><Trash2 size={24} /></div>
              <h2 className="mt-4 text-lg font-black text-[#06194A]">Yönetim</h2>
              <div className="mt-4 grid gap-2">
                {canEditPortfolio && (
                  <button onClick={() => router.push(`/stok?edit=${unit.id}`)} className="h-12 w-full rounded-2xl bg-[#EFF6FF] text-sm font-black text-[#1557D6]">
                    Portföyü Güncelle
                  </button>
                )}
                <button onClick={() => { setActionError(""); setDeleteOpen(true); }} className="h-12 w-full rounded-2xl bg-rose-50 text-sm font-black text-rose-700">Portföyü Sil</button>
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
                <p className="text-xs font-black uppercase tracking-[0.22em] text-white/60">Portföy Galerisi</p>
                <h2 className="mt-1 text-xl font-black text-white">Fotoğraf {activePhoto + 1} / {galleryImages.length}</h2>
              </div>
              <button onClick={() => setGalleryOpen(false)} className="flex h-12 w-12 items-center justify-center rounded-[20px] border border-white/20 bg-white/10 text-white" aria-label="Galeriyi kapat"><X size={21} /></button>
            </div>
            <div className="relative min-h-0 flex-1 overflow-hidden rounded-[32px] bg-black" onTouchStart={(event) => setTouchStartX(event.touches[0]?.clientX || null)} onTouchEnd={handleGalleryTouchEnd}>
              <img src={activeGalleryImage} alt="Büyük portföy fotoğrafı" className="h-full w-full object-contain" />
              {galleryImages.length > 1 && (
                <>
                  <button onClick={() => setActivePhoto((current) => (current === 0 ? galleryImages.length - 1 : current - 1))} className="absolute left-4 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[#06194A]" aria-label="Önceki fotoğraf"><ChevronLeft size={24} /></button>
                  <button onClick={() => setActivePhoto((current) => (current === galleryImages.length - 1 ? 0 : current + 1))} className="absolute right-4 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[#06194A]" aria-label="Sonraki fotoğraf"><ChevronRight size={24} /></button>
                </>
              )}
            </div>
            <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
              {galleryImages.map((photo, index) => (
                <button key={photo.id || photo.displayUrl} onClick={() => setActivePhoto(index)} className={`relative h-20 w-24 shrink-0 overflow-hidden rounded-[18px] border ${activePhoto === index ? "border-white" : "border-white/20 opacity-70"}`}>
                  <img src={photo.displayUrl} alt={`Küçük fotoğraf ${index + 1}`} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {deleteOpen && (
        <div className="fixed inset-0 z-[10003] flex items-center justify-center bg-[#06194A]/70 p-4 backdrop-blur-xl">
          <div className="w-full max-w-lg rounded-[34px] border border-[#DDE7F3] bg-white p-6 text-center shadow-[0_30px_90px_rgba(15,23,42,0.22)]">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[22px] bg-rose-50 text-rose-700"><FileText size={24} /></div>
            <h2 className="mt-4 text-2xl font-black tracking-[-0.04em] text-[#06194A]">Portföyü silmek istiyor musunuz?</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-[#64748B]">Bu portföy kalıcı olarak silinecek. Bu işlem geri alınamaz.</p>
            {actionError && <div className="mt-4 rounded-[22px] border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-black text-rose-700">{actionError}</div>}
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <button onClick={() => setDeleteOpen(false)} className="min-h-[52px] rounded-[20px] border border-[#DDE7F3] bg-white px-5 py-3 text-sm font-black text-[#475569]" disabled={actionLoading}>Vazgeç</button>
              <button onClick={handleDeleteUnit} className="min-h-[52px] rounded-[20px] bg-rose-600 px-5 py-3 text-sm font-black text-white disabled:opacity-60" disabled={actionLoading}>{actionLoading ? "Siliniyor..." : "Evet, Portföyü Sil"}</button>
            </div>
          </div>
        </div>
      )}

      <PortfolioShareModal open={shareOpen} onClose={() => setShareOpen(false)} data={shareData} />

    </main>
  );
}

function InfoBox({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex min-h-[92px] flex-col items-center justify-center rounded-[24px] border border-[#DDE7F3] bg-white p-3 text-center">
      <div className="text-[#1557D6]">{icon}</div>
      <p className="mt-2 text-[10px] font-black uppercase tracking-[0.16em] text-[#64748B]">{label}</p>
      <p className="mt-1 line-clamp-2 text-sm font-black text-[#06194A]">{value}</p>
    </div>
  );
}

function SectionTitle({ icon, title, description }: { icon: ReactNode; title: string; description: string }) {
  return (
    <div className="text-center md:text-left">
      <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[#EFF6FF] text-[#1557D6] md:mx-0">{icon}</div>
      <h2 className="text-xl font-black text-[#06194A]">{title}</h2>
      <p className="mt-1 text-sm font-semibold leading-6 text-[#64748B]">{description}</p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-2xl bg-[#F7FBFF] px-4 py-3">
      <span className="text-xs font-black uppercase tracking-wide text-[#64748B]">{label}</span>
      <span className="text-right text-sm font-black text-[#06194A]">{value}</span>
    </div>
  );
}

function TrustRow({ label, active }: { label: string; active: boolean }) {
  return (
    <div className={`flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-black ${active ? "bg-emerald-50 text-emerald-700" : "bg-[#F7FBFF] text-[#64748B]"}`}>
      <span>{label}</span>
      {active ? <CheckCircle2 size={18} /> : <BadgeCheck size={18} />}
    </div>
  );
}

function ShareLink({ href, label, icon }: { href: string; label: string; icon: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="inline-flex min-h-[54px] items-center justify-center gap-2 rounded-[20px] border border-[#DDE7F3] bg-white px-4 text-sm font-black text-[#475569] transition hover:bg-[#EFF6FF] hover:text-[#1557D6]">
      {icon}
      {label}
      <ExternalLink size={14} />
    </a>
  );
}

