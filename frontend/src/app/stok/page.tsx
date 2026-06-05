"use client";

import LinaPanel from "../../components/LinaPanel";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import api from "@/lib/api";
import Link from "next/link";
import {
  ArrowUpDown,
  Building2,
  Camera,
  CheckSquare,
  Eye,
  Grid2X2,
  Home,
  List,
  Map,
  MapPin,
  Plus,
  Search,
  Share2,
  SlidersHorizontal,
  Sparkles,
  Square,
  Star,
  TrendingUp,
  UsersRound,
} from "lucide-react";
import StokPremiumStyles from "@/components/stok/StokPremiumStyles";
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

type ViewMode = "cards" | "list";

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

  if (!numeric) return "Fiyat yok";

  if (numeric >= 1000000) {
    const compact = numeric / 1000000;
    return `${compact.toLocaleString("tr-TR", {
      maximumFractionDigits: compact >= 10 ? 0 : 1,
    })}M ${symbol}`;
  }

  return `${numeric.toLocaleString("tr-TR")} ${symbol}`;
}

function formatShortDate(value?: string) {
  if (!value) return "Tarih yok";

  try {
    return new Date(value).toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "Tarih yok";
  }
}

function formatFloorInfo(unit: Pick<Unit, "floor" | "floorLabel" | "totalFloors">) {
  const floorText =
    unit.floorLabel ||
    (unit.floor != null ? `${unit.floor}. Kat` : "Kat yok");

  const totalText = unit.totalFloors ? `${unit.totalFloors} Katlı` : "";

  return totalText ? `${floorText} / ${totalText}` : floorText;
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
      if ((a.sortOrder || 0) !== (b.sortOrder || 0)) {
        return (a.sortOrder || 0) - (b.sortOrder || 0);
      }

      return String(a.createdAt || "").localeCompare(String(b.createdAt || ""));
    });
}

function getUnitCoverImage(unit?: Unit | null) {
  const images = getUnitImages(unit);

  return images.find((image) => image.isCover)?.displayUrl || images[0]?.displayUrl || "";
}

function isUnitVerified(unit?: Unit | null) {
  return Boolean(
    unit?.isVerified ||
      (unit?.tapuVerified && unit?.photoVerified && unit?.yetkiVerified),
  );
}

function calculatePortfolioScore(unit?: Unit | null) {
  if (!unit) return 0;

  let score = 0;
  const imageCount = getUnitImages(unit).length;

  if (unit.project?.name) score += 15;
  if (unit.project?.city && unit.project?.district) score += 15;
  if (unit.price) score += 15;
  if (unit.area) score += 12;
  if (unit.roomCount) score += 10;
  if (unit.description) score += 12;
  if (imageCount > 0 || unit.photoVerified) score += 9;
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

export default function StokPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const [projects, setProjects] = useState<Project[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [linaOpen, setLinaOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [showAllPortfolios, setShowAllPortfolios] = useState(false);
  const [sortMode, setSortMode] = useState<"newest" | "priceDesc" | "priceAsc">("newest");
  const [selectedUnitIds, setSelectedUnitIds] = useState<string[]>([]);
  const [copiedUnitId, setCopiedUnitId] = useState("");
  const [shareOpen, setShareOpen] = useState(false);
  const [shareData, setShareData] = useState<PortfolioShareData | null>(null);

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
    roomCount: "3+1",
    area: "",
    price: "",
    priceCurrency: "TRY",
    status: "SATILIK",
    description: "",
  });

  const [coverImage, setCoverImage] = useState<LocalPortfolioImage | null>(null);
  const [galleryImages, setGalleryImages] = useState<LocalPortfolioImage[]>([]);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState(false);

  const canAddUnit =
    user?.role === "MUTEAHHIT" ||
    user?.role === "INSAAT_FIRMASI" ||
    user?.role === "ADMIN" ||
    user?.role === "EMLAKCI";

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    if (!user) {
      router.push("/giris");
      return;
    }

    fetchData();
  }, [hydrated, user, router]);

  useEffect(() => {
    if (!hydrated || !user) return;

    fetchUnits();
  }, [statusFilter, cityFilter, hydrated, user]);

  useEffect(() => {
    setShowAllPortfolios(false);
  }, [statusFilter, cityFilter, search, viewMode]);

  const fetchData = async () => {
    try {
      const [projectRes, unitRes] = await Promise.all([
        api.get("/projects"),
        api.get("/units"),
      ]);

      setProjects(projectRes.data || []);
      setUnits(unitRes.data || []);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnits = async () => {
    const params = new URLSearchParams();

    if (statusFilter) params.append("status", statusFilter);
    if (cityFilter) params.append("city", cityFilter);

    const res = await api.get(`/units?${params.toString()}`);

    setUnits(res.data || []);
  };

  const filteredUnits = useMemo(() => {
    const q = search.trim().toLocaleLowerCase("tr-TR");

    let list = units.filter((unit) => {
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
      if (sortMode === "priceDesc") return Number(b.price || 0) - Number(a.price || 0);
      if (sortMode === "priceAsc") return Number(a.price || 0) - Number(b.price || 0);

      return String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
    });

    return list;
  }, [units, search, sortMode]);

  const cardVisibleUnits = useMemo(() => {
    return showAllPortfolios ? filteredUnits : filteredUnits.slice(0, 5);
  }, [filteredUnits, showAllPortfolios]);

  const listVisibleUnits = useMemo(() => {
    return showAllPortfolios ? filteredUnits : filteredUnits.slice(0, 10);
  }, [filteredUnits, showAllPortfolios]);

  const totalValue = useMemo(() => {
    return units.reduce((sum, unit) => sum + (Number(unit.price) || 0), 0);
  }, [units]);

  const activeCount = useMemo(() => {
    return units.filter((unit) => hotStatuses.includes(unit.status)).length;
  }, [units]);

  const selectedCount = useMemo(() => {
    return Math.max(0, selectedUnitIds.length);
  }, [selectedUnitIds.length]);

  const pendingControlCount = useMemo(() => {
    return units.filter((unit) => !isUnitVerified(unit)).length;
  }, [units]);

  const uniqueCities = useMemo(() => {
    return Array.from(
      new Set(
        units
          .map((unit) => unit.project?.city)
          .filter((city): city is string => Boolean(city)),
      ),
    ).sort((a, b) => a.localeCompare(b, "tr"));
  }, [units]);

  const statusDistribution = useMemo(() => {
    return Object.entries(
      units.reduce<Record<string, number>>((acc, unit) => {
        const key = statusLabels[unit.status] || unit.status || "Durum Yok";
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {}),
    )
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);
  }, [units]);

  const cityDistribution = useMemo(() => {
    return Object.entries(
      units.reduce<Record<string, number>>((acc, unit) => {
        const key = unit.project?.city || "Şehir Yok";
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {}),
    )
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);
  }, [units]);

  const verifiedCount = useMemo(() => units.filter((unit) => isUnitVerified(unit)).length, [units]);
  const photoReadyCount = useMemo(() => units.filter((unit) => getUnitImages(unit).length > 0).length, [units]);
  const missingPhotoCount = useMemo(() => units.filter((unit) => getUnitImages(unit).length === 0).length, [units]);

  const selectedValue = useMemo(() => {
    return units
      .filter((unit) => selectedUnitIds.includes(unit.id))
      .reduce((sum, unit) => sum + (Number(unit.price) || 0), 0);
  }, [selectedUnitIds, units]);

  const averageValue = useMemo(() => {
    if (!units.length) return 0;
    return Math.round(totalValue / units.length);
  }, [totalValue, units.length]);

  const revokePortfolioPreviews = (
    cover: LocalPortfolioImage | null,
    gallery: LocalPortfolioImage[],
  ) => {
    if (cover?.previewUrl) URL.revokeObjectURL(cover.previewUrl);
    gallery.forEach((image) => {
      if (image.previewUrl) URL.revokeObjectURL(image.previewUrl);
    });
  };

  const resetSelectedImages = () => {
    revokePortfolioPreviews(coverImage, galleryImages);
    setCoverImage(null);
    setGalleryImages([]);
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

  const resetForm = () => {
    setSelectedProjectId("");

    setProjectForm({
      name: "",
      city: "Denizli",
      district: "",
      address: "",
    });

    setUnitForm({
      type: "DAIRE",
      floor: "",
      floorLabel: "",
      totalFloors: "",
      number: "",
      roomCount: "3+1",
      area: "",
      price: "",
      priceCurrency: "TRY",
      status: "SATILIK",
      description: "",
    });

    setFormError("");
    setFormSuccess(false);
    resetSelectedImages();
  };

  const handleSubmit = async () => {
    setFormError("");
    setFormLoading(true);

    try {
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

        const projectRes = await api.post("/projects", projectForm);

        projectId = projectRes.data.id;
      }

      const numericPrice = parseFormattedNumber(unitForm.price);

      if (!unitForm.number || !unitForm.area || !numericPrice) {
        setFormError("Birim numarası, alan ve fiyat zorunludur.");
        setFormLoading(false);
        return;
      }

      if (!coverImage) {
        setFormError("Kapak fotoğrafı zorunludur.");
        setFormLoading(false);
        return;
      }

      const unitRes = await api.post(`/units/project/${projectId}`, {
        type: unitForm.type,
        floor: unitForm.floor ? parseInt(unitForm.floor, 10) : undefined,
        floorLabel: unitForm.floorLabel || undefined,
        totalFloors: unitForm.totalFloors ? parseInt(unitForm.totalFloors, 10) : undefined,
        number: unitForm.number,
        roomCount: unitForm.roomCount || undefined,
        area: parseFloat(unitForm.area),
        price: numericPrice,
        priceCurrency: unitForm.priceCurrency || "TRY",
        status: unitForm.status,
        description: unitForm.description || undefined,
      });

      const createdUnitId = unitRes.data?.id;

      if (!createdUnitId) {
        setFormError("Portföy oluşturuldu ancak görsel yükleme için unitId alınamadı.");
        setFormLoading(false);
        return;
      }

      await uploadPortfolioImage(createdUnitId, coverImage.file, true, 0);

      if (galleryImages.length > 0) {
        await Promise.all(
          galleryImages.map((image, index) =>
            uploadPortfolioImage(createdUnitId, image.file, false, index + 1),
          ),
        );
      }

      setFormSuccess(true);
      await fetchData();

      setTimeout(() => {
        setShowModal(false);
        resetForm();
      }, 900);
    } catch (e: any) {
      setFormError(e?.response?.data?.message || "Bir hata oluştu.");
    } finally {
      setFormLoading(false);
    }
  };

  const getShareUrl = (unit: Unit) => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/stok/${unit.id}`;
  };

  const getShareText = (unit: Unit) => {
    const price = Number(unit.price || 0);
    const location = [unit.project?.district, unit.project?.city]
      .filter(Boolean)
      .join(" / ");

    return [
      unit.project?.name || "EPH Portföy",
      location,
      unit.roomCount ? `${unit.roomCount}` : "",
      unit.area ? `${unit.area} m²` : "",
      unit.status ? statusLabels[unit.status] || unit.status : "",
      price ? formatPrice(price, unit.priceCurrency) : "",
    ]
      .filter(Boolean)
      .join(" · ");
  };

  const handleCopyShare = async (unit: Unit) => {
    const text = `${getShareText(unit)}\n${getShareUrl(unit)}`;

    try {
      await navigator.clipboard.writeText(text);
      setCopiedUnitId(unit.id);
      setTimeout(() => setCopiedUnitId(""), 1600);
    } catch {
      alert("Paylaşım metni kopyalanamadı.");
    }
  };

  const getPortfolioNo = (unit: Unit) => {
    const raw = String(unit.id || "EPH").replace(/[^a-zA-Z0-9]/g, "");
    return `EPH-${raw.slice(0, 4).toLocaleUpperCase("tr-TR") || "PORT"}-${raw
      .slice(-4)
      .toLocaleUpperCase("tr-TR") || "0001"}`;
  };

  const getPortfolioShareData = (unit: Unit): PortfolioShareData => {
    const price = Number(unit.price || 0);
    const score = calculatePortfolioScore(unit);
    const title = unit.project?.name || "EPH Portföy";
    const location =
      [unit.project?.district, unit.project?.city].filter(Boolean).join(" / ") ||
      "Konum bilgisi yok";

    return {
      id: unit.id,
      title,
      location,
      price: price ? formatPrice(price, unit.priceCurrency) : "Fiyat bilgisi yok",
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
      score,
      scoreLabel: getPortfolioScoreLabel(score),
      shortDescription:
        unit.description ||
        "Yetkili portföy statüsünde, paylaşım için hazır profesyonel gayrimenkul kaydı.",
      longDescription:
        unit.description ||
        "Bu portföy EPH Portföy Merkezi üzerinden hazırlanmıştır. Konum, fiyat, oda sayısı, alan bilgisi ve yetki durumu tek kart üzerinde paylaşılabilir formatta sunulur.",
      features: [
        { icon: "security", label: unit.yetkiVerified || unit.isVerified ? "Yetkili Portföy" : "Yetki Kontrol" },
        { icon: "smart", label: "Lina Kartı" },
        { icon: "car", label: "Portföy Kaydı" },
        { icon: "pool", label: statusLabels[unit.status] || unit.status || "Portföy" },
      ],
    };
  };

  const handlePortfolioShare = (unit: Unit) => {
    setShareData(getPortfolioShareData(unit));
    setShareOpen(true);
  };

  const toggleUnitSelection = (unitId: string) => {
    setSelectedUnitIds((current) =>
      current.includes(unitId)
        ? current.filter((id) => id !== unitId)
        : [...current, unitId],
    );
  };

  if (!hydrated || loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#F7FBFF",
        }}
      >
        <StokPremiumStyles />

        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: "50%",
            border: "3px solid #1557D6",
            borderTopColor: "transparent",
            animation: "spin .8s linear infinite",
          }}
        />

        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7FBFF] text-[#27364F]">
      <StokPremiumStyles />

      <main className="mx-auto min-h-screen w-full max-w-[1180px] px-4 pb-8 pt-5 md:px-6 lg:px-8">
        <section className="eph-mobile-stock-head">
          <div className="rounded-[30px] border border-[#DDE7F3] bg-white px-4 py-5 text-center shadow-[0_18px_42px_rgba(15,23,42,0.075)]">
            <p className="mx-auto inline-flex min-h-[30px] items-center justify-center rounded-full bg-[#EFF6FF] px-4 text-[12px] font-black text-[#1557D6]">
              Portföy Yönetimi
            </p>

            <h1 className="mx-auto mt-3 max-w-[360px] text-center text-[28px] font-black leading-[0.98] tracking-[-0.055em] text-[#06194A]">
              Portföy Merkezi
            </h1>

            <p className="mx-auto mt-3 max-w-[340px] text-center text-[13px] font-extrabold leading-5 text-[#64748B]">
              Portföylerinizi yönetin, paylaşın ve takip edin.
            </p>

            <div className="mt-5 grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => searchInputRef.current?.focus()}
                className="flex min-h-[54px] flex-col items-center justify-center gap-1 rounded-[18px] border border-[#DDE7F3] bg-[#FBFDFF] text-[11px] font-black text-[#06194A]"
              >
                <Search size={19} />
                Ara
              </button>

              <button
                type="button"
                onClick={() => setLinaOpen(true)}
                className="flex min-h-[54px] flex-col items-center justify-center gap-1 rounded-[18px] border border-[#DDE7F3] bg-[#FBFDFF] text-[11px] font-black text-[#1557D6]"
              >
                <Sparkles size={19} />
                Lina
              </button>

              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setShowModal(true);
                }}
                disabled={!canAddUnit}
                className="flex min-h-[54px] flex-col items-center justify-center gap-1 rounded-[18px] bg-[#1557D6] text-[11px] font-black text-white disabled:opacity-50"
              >
                <Plus size={20} />
                Ekle
              </button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-5 overflow-hidden rounded-[20px] border border-[#DDE7F3] bg-white shadow-[0_14px_34px_rgba(15,23,42,0.06)]">
            <MiniStat icon={<Home size={16} />} value={units.length} label="Toplam" />
            <MiniStat icon={<Eye size={16} />} value={activeCount} label="Aktif" tone="green" />
            <MiniStat icon={<Star size={16} />} value={selectedCount} label="Seçili" tone="orange" />
            <MiniStat icon={<UsersRound size={16} />} value={pendingControlCount} label="Onay" tone="purple" />
            <MiniStat
              icon={<TrendingUp size={16} />}
              value={totalValue ? `${(totalValue / 1000000).toFixed(1)}M` : "0"}
              label="Değer"
              tone="blue"
            />
          </div>

          <div className="mt-4 grid grid-cols-2 overflow-hidden rounded-[18px] border border-[#DDE7F3] bg-white shadow-[0_14px_34px_rgba(15,23,42,0.06)] sm:grid-cols-4">
            <button
              onClick={() => setStatusFilter((current) => (current ? "" : "SATILIK"))}
              className={`flex min-h-[48px] items-center justify-center gap-1.5 border-r border-[#DDE7F3] text-xs font-black ${
                statusFilter ? "text-[#1557D6]" : "text-[#27364F]"
              }`}
            >
              <SlidersHorizontal size={16} />
              {statusFilter ? "Satılık" : "Filtre"}
            </button>

            <button
              onClick={() =>
                setSortMode((current) =>
                  current === "newest"
                    ? "priceDesc"
                    : current === "priceDesc"
                      ? "priceAsc"
                      : "newest",
                )
              }
              className="flex min-h-[48px] items-center justify-center gap-1.5 border-r border-[#DDE7F3] text-xs font-black text-[#27364F]"
            >
              <ArrowUpDown size={16} />
              Sırala
            </button>

            <button
              onClick={() => {
                if (uniqueCities.length === 0) return;

                setCityFilter((current) => {
                  if (!current) return uniqueCities[0] || "";

                  const currentIndex = uniqueCities.indexOf(current);
                  const nextCity = uniqueCities[currentIndex + 1];

                  return nextCity || "";
                });
              }}
              className={`flex min-h-[48px] items-center justify-center gap-1.5 border-r border-[#DDE7F3] text-xs font-black ${
                cityFilter ? "text-[#1557D6]" : "text-[#27364F]"
              }`}
            >
              <Map size={16} />
              {cityFilter || "Şehir"}
            </button>

            <button
              onClick={() => setViewMode((current) => (current === "cards" ? "list" : "cards"))}
              className="flex min-h-[48px] items-center justify-center gap-1.5 bg-[#EFF6FF] text-xs font-black text-[#1557D6]"
            >
              {viewMode === "cards" ? <List size={16} /> : <Grid2X2 size={16} />}
              {viewMode === "cards" ? "Liste" : "Kartlı"}
            </button>
          </div>

          <div className="mt-3 rounded-[18px] border border-[#DDE7F3] bg-white px-3 py-2 shadow-[0_12px_28px_rgba(15,23,42,0.04)]">
            <div className="flex items-center gap-2">
              <Search size={15} className="text-[#64748B]" />
              <input
                ref={searchInputRef}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Portföy, şehir, ilçe ara..."
                className="h-8 flex-1 bg-transparent text-sm font-bold text-[#06194A] outline-none placeholder:text-[#94A3B8]"
              />
            </div>
          </div>
        </section>

        <section className="mt-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-lg font-black tracking-[-0.03em] text-[#06194A]">
              Canlı Portföy Listesi
            </h2>

            <button
              onClick={() => setShowAllPortfolios((current) => !current)}
              className="inline-flex min-h-[38px] items-center gap-1 rounded-2xl bg-[#EFF6FF] px-3 text-sm font-black text-[#1557D6]"
            >
              {showAllPortfolios ? "Kısalt" : "Tümünü Gör"}
              <span>›</span>
            </button>
          </div>

          {filteredUnits.length > 0 && (
            <div className="mb-3 rounded-[18px] border border-[#DDE7F3] bg-white px-4 py-3 text-center text-xs font-black text-[#64748B] shadow-[0_12px_28px_rgba(15,23,42,0.04)]">
              {showAllPortfolios
                ? `${filteredUnits.length} portföyün tamamı gösteriliyor.`
                : viewMode === "cards"
                  ? "İlk 5 portföy gösteriliyor. Tümünü görmek için Tümünü Gör butonuna bas."
                  : "İlk 10 portföy gösteriliyor. Tümünü görmek için Tümünü Gör butonuna bas."}
            </div>
          )}

          {filteredUnits.length === 0 ? (
            <EmptyMobileState
              canAddUnit={canAddUnit}
              onAdd={() => {
                resetForm();
                setShowModal(true);
              }}
            />
          ) : viewMode === "cards" ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {cardVisibleUnits.map((unit) => (
                <MobilePortfolioCard
                  key={unit.id}
                  unit={unit}
                  selected={selectedUnitIds.includes(unit.id)}
                  copied={copiedUnitId === unit.id}
                  onOpen={() => router.push(`/stok/${unit.id}`)}
                  onToggleSelect={() => toggleUnitSelection(unit.id)}
                  onShare={() => handlePortfolioShare(unit)}
                  onCopy={() => handleCopyShare(unit)}
                />
              ))}
            </div>
          ) : (
            <div className="overflow-hidden rounded-[24px] border border-[#DDE7F3] bg-white shadow-[0_16px_38px_rgba(15,23,42,0.06)]">
              {listVisibleUnits.map((unit, index) => (
                <MobilePortfolioListRow
                  key={unit.id}
                  index={index + 1}
                  unit={unit}
                  selected={selectedUnitIds.includes(unit.id)}
                  copied={copiedUnitId === unit.id}
                  onOpen={() => router.push(`/stok/${unit.id}`)}
                  onToggleSelect={() => toggleUnitSelection(unit.id)}
                  onShare={() => handlePortfolioShare(unit)}
                  onCopy={() => handleCopyShare(unit)}
                />
              ))}
            </div>
          )}
        </section>

        {units.length > 0 && (
          <section className="mt-5 grid gap-4">
            <div className="rounded-[26px] border border-[#DDE7F3] bg-white p-4 shadow-[0_16px_38px_rgba(15,23,42,0.06)]">
              <div className="mb-3 text-center">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[#1557D6]">
                  Portföy Yönetim Merkezi
                </p>
                <h2 className="mt-1 text-lg font-black tracking-[-0.03em] text-[#06194A]">
                  Seçili portföylerle hızlı işlem
                </h2>
              </div>

              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <PremiumActionCard
                  title="Seçili Portföy"
                  value={selectedUnitIds.length}
                  note={selectedUnitIds.length ? `${formatCompactPrice(selectedValue)} değer` : "Kartlardan seçim yap"}
                  icon={<CheckSquare size={19} />}
                />
                <PremiumActionCard
                  title="Fotoğraf Hazır"
                  value={photoReadyCount}
                  note={`${missingPhotoCount} portföy fotoğraf bekliyor`}
                  icon={<Camera size={19} />}
                />
                <PremiumActionCard
                  title="Yetki Kontrol"
                  value={verifiedCount}
                  note={`${Math.max(0, units.length - verifiedCount)} kayıt kontrol bekliyor`}
                  icon={<Eye size={19} />}
                />
                <PremiumActionCard
                  title="Ortalama Değer"
                  value={averageValue ? formatCompactPrice(averageValue) : "0"}
                  note="Portföy başına ortalama"
                  icon={<TrendingUp size={19} />}
                />
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={() => setSelectedUnitIds([])}
                  disabled={selectedUnitIds.length === 0}
                  className="min-h-[44px] rounded-[18px] border border-[#DDE7F3] bg-white px-3 text-xs font-black text-[#475569] disabled:opacity-45"
                >
                  Seçimi Temizle
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setStatusFilter("");
                    setCityFilter("");
                    setShowAllPortfolios(true);
                    setViewMode("list");
                  }}
                  className="min-h-[44px] rounded-[18px] border border-[#DDE7F3] bg-white px-3 text-xs font-black text-[#1557D6]"
                >
                  Tüm Portföyleri Aç
                </button>
                <button
                  type="button"
                  onClick={() => setLinaOpen(true)}
                  className="min-h-[44px] rounded-[18px] bg-[#1557D6] px-3 text-xs font-black text-white"
                >
                  Lina ile Hazırla
                </button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[26px] border border-[#DDE7F3] bg-white p-4 shadow-[0_16px_38px_rgba(15,23,42,0.06)]">
                <p className="text-center text-xs font-black uppercase tracking-[0.16em] text-[#1557D6]">
                  Şehir Dağılımı
                </p>
                <div className="mt-3 grid gap-2">
                  {cityDistribution.length > 0 ? (
                    cityDistribution.map(([label, value]) => (
                      <InsightRow key={label} label={label} value={value} total={units.length} />
                    ))
                  ) : (
                    <p className="rounded-[18px] bg-[#F7FBFF] px-4 py-3 text-center text-xs font-bold text-[#64748B]">
                      Şehir verisi bulunamadı.
                    </p>
                  )}
                </div>
              </div>

              <div className="rounded-[26px] border border-[#DDE7F3] bg-white p-4 shadow-[0_16px_38px_rgba(15,23,42,0.06)]">
                <p className="text-center text-xs font-black uppercase tracking-[0.16em] text-[#1557D6]">
                  Durum Dağılımı
                </p>
                <div className="mt-3 grid gap-2">
                  {statusDistribution.length > 0 ? (
                    statusDistribution.map(([label, value]) => (
                      <InsightRow key={label} label={label} value={value} total={units.length} />
                    ))
                  ) : (
                    <p className="rounded-[18px] bg-[#F7FBFF] px-4 py-3 text-center text-xs font-bold text-[#64748B]">
                      Durum verisi bulunamadı.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {user?.role === "ADMIN" && units.length > 0 && (
          <section className="mt-5 rounded-[24px] border border-[#DDE7F3] bg-white p-4 shadow-[0_16px_38px_rgba(15,23,42,0.06)]">
            <p className="text-center text-xs font-black uppercase tracking-[0.16em] text-[#1557D6]">
              Admin Kısa Özet
            </p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <AdminMini label="Toplam" value={units.length} />
              <AdminMini label="Aktif" value={activeCount} />
              <AdminMini label="Onay" value={pendingControlCount} />
            </div>
          </section>
        )}
      </main>

      <LinaPanel open={linaOpen} onClose={() => setLinaOpen(false)} />

      <StokCreateModal
        open={showModal}
        onClose={() => setShowModal(false)}
        projects={projects}
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
        onSubmit={handleSubmit}
      />

      <PortfolioShareModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        data={shareData}
      />
    </div>
  );
}

function MiniStat({
  icon,
  value,
  label,
  tone = "blue",
}: {
  icon: ReactNode;
  value: string | number;
  label: string;
  tone?: "blue" | "green" | "orange" | "purple";
}) {
  const tones = {
    blue: "bg-[#EFF6FF] text-[#1557D6]",
    green: "bg-emerald-50 text-emerald-700",
    orange: "bg-orange-50 text-orange-600",
    purple: "bg-violet-50 text-violet-700",
  };

  return (
    <div className="flex min-h-[70px] flex-col items-center justify-center border-r border-[#DDE7F3] px-1 text-center last:border-r-0">
      <div className={`mb-1 flex h-8 w-8 items-center justify-center rounded-full ${tones[tone]}`}>
        {icon}
      </div>
      <p className="text-sm font-black leading-none text-[#06194A]">{value}</p>
      <p className="mt-1 text-[10px] font-bold leading-none text-[#475569]">{label}</p>
    </div>
  );
}

function getBadgeTone(index: number) {
  const tones = [
    "bg-emerald-600 text-white",
    "bg-[#1557D6] text-white",
    "bg-violet-600 text-white",
    "bg-emerald-600 text-white",
    "bg-orange-500 text-white",
  ];

  return tones[index % tones.length];
}

function MobilePortfolioCard({
  unit,
  selected,
  copied,
  onOpen,
  onToggleSelect,
  onShare,
  onCopy,
}: {
  unit: Unit;
  selected: boolean;
  copied: boolean;
  onOpen: () => void;
  onToggleSelect: () => void;
  onShare: () => void;
  onCopy: () => void;
}) {
  const image = getUnitCoverImage(unit);
  const images = getUnitImages(unit);
  const location = [unit.project?.district, unit.project?.city].filter(Boolean).join(", ") || "Konum yok";
  const price = Number(unit.price || 0);
  const badgeLabel = statusLabels[unit.status] || unit.status || "Portföy";

  return (
    <article className="grid min-h-[174px] grid-cols-[44%_1fr] overflow-hidden rounded-[24px] border border-[#DDE7F3] bg-white shadow-[0_16px_38px_rgba(15,23,42,0.065)]">
      <button onClick={onOpen} className="relative min-h-[166px] overflow-hidden bg-[#EFF6FF] text-left">
        {image ? (
          <img src={image} alt={unit.project?.name || "Portföy"} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[#1557D6]">
            <Building2 size={34} />
          </div>
        )}

        <span className={`absolute left-3 top-3 rounded-full px-3 py-1 text-[10px] font-black ${getBadgeTone(images.length)}`}>
          {badgeLabel}
        </span>

        <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-full bg-black/58 px-2 py-1 text-[10px] font-black text-white backdrop-blur">
          {images.length || 0}
          <Camera size={12} />
        </span>
      </button>

      <div className="flex min-w-0 flex-col justify-between p-4">
        <div>
          <div className="flex items-start justify-between gap-2">
            <button onClick={onOpen} className="min-w-0 text-left">
              <h3 className="line-clamp-1 text-base font-black tracking-[-0.03em] text-[#06194A]">
                {unit.project?.name || "EPH Portföy"}
              </h3>
            </button>

            <button
              type="button"
              onClick={onToggleSelect}
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                selected ? "bg-[#1557D6] text-white" : "bg-[#F7FBFF] text-[#06194A]"
              }`}
              aria-label={selected ? "Seçili" : "Seç"}
            >
              {selected ? <CheckSquare size={18} /> : <Square size={18} />}
            </button>
          </div>

          <p className="mt-1 flex items-center gap-1 text-xs font-bold text-[#475569]">
            <MapPin size={13} />
            <span className="line-clamp-1">{location}</span>
          </p>

          <div className="mt-3 grid grid-cols-3 gap-1 text-[11px] font-black text-[#27364F]">
            <span>{unit.roomCount || "—"}</span>
            <span>{unit.area ? `${unit.area} m²` : "—"}</span>
            <span className="line-clamp-1">{formatFloorInfo(unit)}</span>
          </div>

          <p className="mt-3 text-lg font-black tracking-[-0.04em] text-[#1557D6]">
            {price ? formatPrice(price, unit.priceCurrency) : "Fiyat yok"}
          </p>
        </div>

        <div className="mt-2 flex items-center justify-between">
          <p className="text-xs font-bold text-[#64748B]">
            {copied ? "Kopyalandı" : formatShortDate(unit.createdAt)}
          </p>

          <div className="flex items-center gap-1">
            <button
              onClick={onCopy}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F7FBFF] text-[#1557D6]"
              aria-label="Kopyala"
            >
              <Share2 size={15} />
            </button>
            <button
              onClick={onShare}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[#EFF6FF] text-[#1557D6]"
              aria-label="Paylaş"
            >
              <Sparkles size={15} />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

function MobilePortfolioListRow({
  unit,
  index,
  selected,
  copied,
  onOpen,
  onToggleSelect,
  onShare,
  onCopy,
}: {
  unit: Unit;
  index: number;
  selected: boolean;
  copied: boolean;
  onOpen: () => void;
  onToggleSelect: () => void;
  onShare: () => void;
  onCopy: () => void;
}) {
  const image = getUnitCoverImage(unit);
  const images = getUnitImages(unit);
  const location = [unit.project?.district, unit.project?.city].filter(Boolean).join(", ") || "Konum yok";
  const price = Number(unit.price || 0);

  return (
    <article className="grid grid-cols-[86px_1fr_38px] gap-3 border-b border-[#DDE7F3] bg-white p-3 last:border-b-0">
      <button onClick={onOpen} className="relative h-[86px] overflow-hidden rounded-[16px] bg-[#EFF6FF]">
        {image ? (
          <img src={image} alt={unit.project?.name || "Portföy"} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[#1557D6]">
            <Building2 size={24} />
          </div>
        )}

        <span className="absolute left-1.5 top-1.5 rounded-full bg-[#1557D6] px-2 py-0.5 text-[9px] font-black text-white">
          {index}
        </span>

        <span className="absolute bottom-1.5 right-1.5 inline-flex items-center gap-1 rounded-full bg-black/58 px-1.5 py-0.5 text-[9px] font-black text-white">
          {images.length || 0}
          <Camera size={10} />
        </span>
      </button>

      <button onClick={onOpen} className="min-w-0 text-left">
        <h3 className="line-clamp-1 text-sm font-black text-[#06194A]">
          {unit.project?.name || "EPH Portföy"}
        </h3>
        <p className="mt-1 flex items-center gap-1 text-[11px] font-bold text-[#475569]">
          <MapPin size={12} />
          <span className="line-clamp-1">{location}</span>
        </p>

        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-black text-[#27364F]">
          <span>{unit.roomCount || "—"}</span>
          <span>{unit.area ? `${unit.area} m²` : "—"}</span>
          <span>{formatFloorInfo(unit)}</span>
        </div>

        <p className="mt-2 text-sm font-black text-[#1557D6]">
          {price ? formatCompactPrice(price, unit.priceCurrency) : "Fiyat yok"}
        </p>
        <p className="mt-1 text-[10px] font-bold text-[#64748B]">
          {copied ? "Kopyalandı" : formatShortDate(unit.createdAt)}
        </p>
      </button>

      <div className="flex flex-col items-center justify-between gap-1">
        <button
          type="button"
          onClick={onToggleSelect}
          className={`flex h-8 w-8 items-center justify-center rounded-full ${
            selected ? "bg-[#1557D6] text-white" : "bg-[#F7FBFF] text-[#06194A]"
          }`}
          aria-label={selected ? "Seçili" : "Seç"}
        >
          {selected ? <CheckSquare size={17} /> : <Square size={17} />}
        </button>

        <button
          onClick={onShare}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-[#EFF6FF] text-[#1557D6]"
          aria-label="Paylaş"
        >
          <Sparkles size={15} />
        </button>

        <button
          onClick={onCopy}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F7FBFF] text-[#1557D6]"
          aria-label="Kopyala"
        >
          <Share2 size={15} />
        </button>
      </div>
    </article>
  );
}

function EmptyMobileState({
  canAddUnit,
  onAdd,
}: {
  canAddUnit: boolean;
  onAdd: () => void;
}) {
  return (
    <section className="rounded-[28px] border border-dashed border-[#DDE7F3] bg-white p-8 text-center shadow-[0_16px_38px_rgba(15,23,42,0.05)]">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[24px] bg-[#EFF6FF] text-[#1557D6]">
        <Building2 size={28} />
      </div>
      <h2 className="mt-4 text-xl font-black text-[#06194A]">Henüz portföy yok</h2>
      <p className="mt-2 text-sm font-semibold leading-6 text-[#64748B]">
        İlk portföyünüzü ekleyerek liste görünümünü doldurun.
      </p>
      {canAddUnit && (
        <button
          onClick={onAdd}
          className="mt-5 inline-flex min-h-[48px] items-center justify-center rounded-[20px] bg-[#1557D6] px-6 text-sm font-black text-white"
        >
          Portföy Ekle
        </button>
      )}
    </section>
  );
}

function PremiumActionCard({
  title,
  value,
  note,
  icon,
}: {
  title: string;
  value: string | number;
  note: string;
  icon: ReactNode;
}) {
  return (
    <div className="min-h-[118px] rounded-[22px] border border-[#DDE7F3] bg-[#F7FBFF] p-4 text-center">
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-[#1557D6] shadow-[0_10px_22px_rgba(15,23,42,0.05)]">
        {icon}
      </div>
      <p className="mt-3 text-[10px] font-black uppercase tracking-[0.12em] text-[#64748B]">
        {title}
      </p>
      <p className="mt-1 text-lg font-black tracking-[-0.04em] text-[#06194A]">
        {value}
      </p>
      <p className="mt-1 line-clamp-2 text-[11px] font-bold leading-4 text-[#64748B]">
        {note}
      </p>
    </div>
  );
}

function InsightRow({ label, value, total }: { label: string; value: number; total: number }) {
  const percent = total ? Math.round((value / total) * 100) : 0;

  return (
    <div className="rounded-[18px] bg-[#F7FBFF] px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <span className="min-w-0 truncate text-sm font-black text-[#06194A]">{label}</span>
        <span className="text-xs font-black text-[#1557D6]">{value}</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
        <div className="h-full rounded-full bg-[#1557D6]" style={{ width: `${percent}%` }} />
      </div>
      <p className="mt-1 text-[10px] font-bold text-[#64748B]">%{percent}</p>
    </div>
  );
}

function AdminMini({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[18px] bg-[#F7FBFF] px-3 py-3 text-center">
      <p className="text-[10px] font-black uppercase tracking-wide text-[#64748B]">
        {label}
      </p>
      <p className="mt-1 text-lg font-black text-[#06194A]">{value}</p>
    </div>
  );
}