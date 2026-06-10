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

function isLandDetailType(type?: string) {
  const value = String(type || "").toLocaleUpperCase("tr-TR");
  return (
    ["ARSA", "TARLA", "BAG", "BAHCE", "ZEYTINLIK"].includes(value) ||
    value.includes("ARSA")
  );
}

function getPrimaryInfoBoxes(unit: DetailUnit, verified: boolean) {
  if (isLandDetailType(unit.type)) {
    return [
      { icon: <Home size={18} />, label: "Parsel", value: unit.number || "—" },
      {
        icon: <Maximize2 size={18} />,
        label: "Alan",
        value: unit.area ? `${unit.area} m²` : "—",
      },
      { icon: <Building2 size={18} />, label: "Emsal", value: "1.50" },
      { icon: <ShieldCheck size={18} />, label: "İmar", value: "Konut" },
    ];
  }

  return [
    { icon: <Home size={18} />, label: "Oda", value: unit.roomCount || "—" },
    {
      icon: <Maximize2 size={18} />,
      label: "Alan",
      value: unit.area ? `${unit.area} m²` : "—",
    },
    {
      icon: <Building2 size={18} />,
      label: "Kat",
      value: formatFloorInfo(unit),
    },
    {
      icon: <ShieldCheck size={18} />,
      label: "Yetki",
      value: verified ? "Yetkili" : "Kontrol",
    },
  ];
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
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/stok/${unitId || ""}`;
}

function canEditDetailUnit(
  unit?: DetailUnit | null,
  user?: { id?: string | null; role?: string | null } | null,
) {
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
  const [shareData, setShareData] = useState<PortfolioShareData | null>(null);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
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
  const activeGalleryImage =
    galleryImages[activePhoto]?.displayUrl || coverImage || "";
  const verified = isUnitVerified(unit);
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
  }, [unit?.id]);

  useEffect(() => {
    if (galleryImages.length === 0) {
      setActivePhoto(0);
      return;
    }
    if (activePhoto > galleryImages.length - 1)
      setActivePhoto(galleryImages.length - 1);
  }, [galleryImages.length, activePhoto]);

  const calculatedSquareMeterPrice = useMemo(() => {
    const price = Number(unit?.price || 0);
    const area = Number(unit?.area || 0);
    if (!price || !area) return "—";
    return `${Math.round(price / area).toLocaleString("tr-TR")} ₺/m²`;
  }, [unit]);

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

  const handleCoverUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];

    event.target.value = "";

    if (!file) return;

    await uploadPortfolioImage(file, true, 0);
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
  const canEditPortfolio = canEditDetailUnit(unit, user);
  const primaryInfoBoxes = getPrimaryInfoBoxes(unit, verified);
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
    <main className="min-h-screen bg-[#F7FBFF] pb-28 text-[#27364F]">
      <input
        ref={coverInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleCoverUpload}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={handleGalleryUpload}
      />

      <section className="mx-auto w-full max-w-[430px] px-3 py-3">
        <div className="mb-2 flex items-center gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => router.push("/stok")}
            className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-[16px] border border-[#DDE7F3] bg-white px-3 text-[12px] font-black text-[#06194A] shadow-[0_8px_18px_rgba(15,23,42,0.05)]"
          >
            <ArrowLeft size={16} />
            Geri
          </button>
          {canEditPortfolio && (
            <button
              onClick={() => router.push(`/stok?edit=${unit.id}`)}
              className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-[16px] border border-[#DDE7F3] bg-white px-3 text-[12px] font-black text-[#1557D6] shadow-[0_8px_18px_rgba(15,23,42,0.05)]"
            >
              <Edit3 size={15} />
              Güncelle
            </button>
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
            className="group relative block h-[190px] w-full overflow-hidden bg-[#06194A] text-left"
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
            <div className="absolute bottom-2 left-2 right-2">
              <p className="line-clamp-2 text-[18px] font-black leading-tight tracking-[-0.04em] text-white drop-shadow">
                {unitTitle(unit)}
              </p>
              <div className="mt-1 flex items-center gap-1.5 text-[11px] font-bold text-white/90">
                <MapPin size={13} />
                <span className="truncate">{fullAddress}</span>
              </div>
            </div>
          </button>

          {galleryImages.length > 0 && (
            <div className="border-b border-[#E8F0FA] bg-white px-2.5 py-2">
              <div className="flex gap-2 overflow-x-auto pb-0.5">
                {galleryImages.slice(0, 8).map((photo, index) => (
                  <button
                    key={photo.id || photo.displayUrl}
                    type="button"
                    onClick={() => setActivePhoto(index)}
                    className={`relative h-[46px] w-[58px] shrink-0 overflow-hidden rounded-[12px] border ${activePhoto === index ? "border-[#1557D6] ring-2 ring-blue-100" : "border-[#DDE7F3]"}`}
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
                    className="flex h-[46px] w-[58px] shrink-0 items-center justify-center rounded-[12px] border border-[#DDE7F3] bg-[#06194A] text-[12px] font-black text-white"
                  >
                    +{galleryImages.length - 8}
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="p-3">
            <div className="text-center">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#64748B]">
                  Fiyat
                </p>
                <p className="mt-0.5 text-[30px] font-black leading-none tracking-[-0.06em] text-[#06194A]">
                  {formatMoney(unit.price, unit.priceCurrency)}
                </p>
              </div>
            </div>

            <div className="mt-2 flex items-center justify-center gap-1.5 text-[12px] font-black text-[#27364F]">
              <MapPin size={15} className="shrink-0 text-[#1557D6]" />
              <span className="min-w-0 truncate">{locationText}</span>
            </div>

            <div className="mt-3 grid grid-cols-4 overflow-hidden rounded-[18px] border border-[#DDE7F3] bg-[#FBFDFF]">
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
              <span className="min-w-0 truncate text-[#64748B]">
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

        <section className="mt-3 rounded-[22px] border border-[#DDE7F3] bg-white p-3 shadow-[0_10px_24px_rgba(15,23,42,0.045)]">
          <div className="flex items-center justify-center gap-2 text-[#1557D6]">
            <FileText size={17} />
            <h2 className="text-center text-[16px] font-black text-[#06194A]">
              Açıklama
            </h2>
          </div>
          <p className="mt-2 whitespace-pre-line text-left text-[12px] font-semibold leading-5 text-[#475569]">
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

        <section className="mt-3 overflow-hidden rounded-[22px] border border-[#DDE7F3] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.045)]">
          <button
            type="button"
            onClick={() =>
              hasProjectCoordinates &&
              window.open(
                `https://www.google.com/maps?q=${mapQuery}`,
                "_blank",
                "noopener,noreferrer",
              )
            }
            className="flex w-full items-center justify-between gap-3 border-b border-[#E8F0FA] px-3 py-2.5 text-left"
          >
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#64748B]">
                Konum
              </p>
              <p className="mt-0.5 truncate text-[13px] font-black text-[#06194A]">
                {locationText}
              </p>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1 rounded-[14px] bg-[#EFF6FF] px-2.5 py-1.5 text-[11px] font-black text-[#1557D6]">
              Haritada Aç <ExternalLink size={12} />
            </span>
          </button>
          <iframe
            title="Portföy haritası"
            src={`https://www.google.com/maps?q=${mapQuery}&z=${hasProjectCoordinates ? 17 : 14}&output=embed`}
            className="h-[135px] w-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </section>

        <section className="mt-3 rounded-[22px] border border-[#DDE7F3] bg-white p-3 text-center shadow-[0_10px_24px_rgba(15,23,42,0.045)]">
          <div className="flex items-center justify-center gap-2 text-[#1557D6]">
            <Share2 size={17} />
            <h2 className="text-center text-[16px] font-black text-[#06194A]">
              Paylaş
            </h2>
          </div>
          <button
            onClick={handleNativeShare}
            className="mx-auto mt-2 block rounded-[14px] bg-[#EFF6FF] px-3 py-1.5 text-[11px] font-black text-[#1557D6]"
          >
            Cihazdan
          </button>
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
        </section>

        <section className="mt-3 rounded-[22px] border border-[#DDE7F3] bg-white p-3 shadow-[0_10px_24px_rgba(15,23,42,0.045)]">
          <div className="flex items-center gap-2 text-[#1557D6]">
            <Building2 size={17} />
            <h2 className="text-[16px] font-black text-[#06194A]">Detaylar</h2>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <InfoRow label="Portföy" value={unit.project?.name || "—"} />
            <InfoRow label="Mülk Tipi" value={typeLabel(unit.type)} />
            <InfoRow label="Durum" value={statusLabel(unit.status)} />
            <InfoRow
              label={
                isLandDetailType(unit.type) ? "Ada / Parsel" : "Bağımsız Bölüm"
              }
              value={unit.number || "—"}
            />
            <InfoRow label="Kayıt" value={formatDate(unit.createdAt)} />
          </div>
        </section>

        <section className="mt-3 rounded-[22px] border border-[#DDE7F3] bg-white p-3 shadow-[0_10px_24px_rgba(15,23,42,0.045)]">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] bg-[#EFF6FF] text-[#1557D6]">
              <CircleUserRound size={22} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-black text-[#06194A]">
                {ownerName || "Kullanıcı bilgisi yok"}
              </p>
              <p className="mt-0.5 truncate text-[11px] font-bold text-[#64748B]">
                {unit.project?.owner?.role || "Danışman / Sahip"}
              </p>
            </div>
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black text-emerald-700">
              Güven
            </span>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            <TrustRow label="Tapu" active={Boolean(unit.tapuVerified)} />
            <TrustRow
              label="Fotoğraf"
              active={Boolean(unit.photoVerified || galleryImages.length > 0)}
            />
            <TrustRow
              label="Yetki"
              active={Boolean(unit.yetkiVerified || unit.isVerified)}
            />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <Link
              href="/messages"
              className="flex h-10 items-center justify-center gap-2 rounded-[16px] bg-[#06194A] text-[12px] font-black text-white"
            >
              <MessageCircle size={16} /> Mesaj
            </Link>
            <button
              onClick={handleOpenShareModal}
              className="flex h-10 items-center justify-center gap-2 rounded-[16px] border border-[#DDE7F3] bg-white text-[12px] font-black text-[#1557D6]"
            >
              <Share2 size={16} /> Kart
            </button>
          </div>
        </section>

        {canEditPortfolio && (
          <section className="mt-3 rounded-[22px] border border-[#DDE7F3] bg-white p-3 text-center shadow-[0_10px_24px_rgba(15,23,42,0.045)]">
            <div className="flex items-center justify-center gap-2 text-[#1557D6]">
              <Camera size={17} />
              <h2 className="text-[16px] font-black text-[#06194A]">
                Fotoğraf Yönetimi
              </h2>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => coverInputRef.current?.click()}
                disabled={imageUploadLoading === "cover"}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-[16px] bg-[#1557D6] px-3 text-[12px] font-black text-white disabled:opacity-60"
              >
                <Camera size={16} />
                {imageUploadLoading === "cover" ? "Yükleniyor..." : "Kapak"}
              </button>
              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                disabled={
                  imageUploadLoading === "gallery" ||
                  galleryImages.length >= MAX_GALLERY_COUNT
                }
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-[16px] border border-[#DDE7F3] bg-white px-3 text-[12px] font-black text-[#1557D6] disabled:opacity-60"
              >
                <Upload size={16} />
                {imageUploadLoading === "gallery" ? "Yükleniyor..." : "Galeri"}
              </button>
            </div>
          </section>
        )}

        {canEditPortfolio && (
          <section className="mt-3 rounded-[22px] border border-rose-100 bg-white p-3 text-center shadow-[0_10px_24px_rgba(15,23,42,0.045)]">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => router.push(`/stok?edit=${unit.id}`)}
                className="h-10 w-full rounded-[16px] bg-[#EFF6FF] text-[12px] font-black text-[#1557D6]"
              >
                Güncelle
              </button>
              <button
                onClick={() => {
                  setActionError("");
                  setDeleteOpen(true);
                }}
                className="h-10 w-full rounded-[16px] bg-rose-50 text-[12px] font-black text-rose-700"
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
              className="relative min-h-0 flex-1 overflow-hidden rounded-[32px] bg-black"
              onTouchStart={(event) =>
                setTouchStartX(event.touches[0]?.clientX || null)
              }
              onTouchEnd={handleGalleryTouchEnd}
            >
              <img
                src={activeGalleryImage}
                alt="Büyük portföy fotoğrafı"
                className="h-full w-full object-contain"
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

      <PortfolioShareModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        data={shareData}
      />
    </main>
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
    <div className="flex min-h-[62px] flex-col items-center justify-center border-r border-[#DDE7F3] px-1.5 py-2 text-center last:border-r-0">
      <div className="text-[#1557D6]">{icon}</div>
      <p className="mt-1 text-[8px] font-black uppercase tracking-[0.12em] text-[#64748B]">
        {label}
      </p>
      <p className="mt-0.5 line-clamp-2 text-[12px] font-black leading-tight text-[#06194A]">
        {value}
      </p>
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
      <span className="mt-1 line-clamp-2 text-[12px] font-black leading-tight text-[#06194A]">
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
