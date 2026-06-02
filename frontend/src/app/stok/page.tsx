"use client";

import LinaPanel from "../../components/LinaPanel";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import api from "@/lib/api";
import Link from "next/link";
import {
  ArrowLeft,
  BarChart3,
  Building2,
  CheckCircle2,
  Copy,
  Eye,
  Grid2X2,
  Home,
  Layers3,
  List,
  MapPin,
  MessageCircle,
  ShieldCheck,
  Trophy,
  Plus,
  Search,
  Share2,
  Sparkles,
  Star,
  TrendingUp,
} from "lucide-react";
import StokPremiumStyles from "@/components/stok/StokPremiumStyles";
import StokKpiCards from "@/components/stok/StokKpiCards";
import StokToolbar from "@/components/stok/StokToolbar";
import StokTable from "@/components/stok/StokTable";
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
  ON_SATIS: "Ön Satış",
  PROJE_ASAMASI: "Proje Aşaması",
  YAKINDA_SATISTA: "Yakında Satışta",
  INSAAT_HALINDE: "İnşaat Halinde",
  HEMEN_TESLIM: "Hemen Teslim",
  INSAAT_PROJESI: "İnşaat Projesi",
  SATILDI: "Satıldı",
  PASIF: "Pasif",
};

const hotStatuses = [
  "SATILIK",
  "KIRALIK",
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
  if (!numeric) return "Fiyat Yok";
  return `${numeric.toLocaleString("tr-TR")} ${symbol}`;
}

function formatFloorInfo(unit: Pick<Unit, "floor" | "floorLabel" | "totalFloors">) {
  const floorText =
    unit.floorLabel ||
    (unit.floor != null ? `${unit.floor}. Kat` : "Kat yok");

  const totalText = unit.totalFloors ? `${unit.totalFloors} Katlı` : "";

  return totalText ? `${floorText} / ${totalText}` : floorText;
}

export default function StokPage() {
  const { user, logout } = useAuthStore();
  const router = useRouter();

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
  const [copiedUnitId, setCopiedUnitId] = useState("");
  const [shareOpen, setShareOpen] = useState(false);
  const [shareData, setShareData] = useState<PortfolioShareData | null>(null);
  const [showAnalysis, setShowAnalysis] = useState(false);

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
  }, [hydrated, user]);

  useEffect(() => {
    if (!hydrated || !user) return;

    fetchUnits();
  }, [statusFilter, cityFilter]);

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

    if (!q) return units;

    return units.filter((unit) => {
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
  }, [units, search]);

  const totalValue = useMemo(() => {
    return units.reduce((sum, unit) => sum + (Number(unit.price) || 0), 0);
  }, [units]);

  const verifiedCount = useMemo(() => {
    return units.filter((unit) => isUnitVerified(unit)).length;
  }, [units]);

  const activeCount = useMemo(() => {
    return units.filter((unit) => hotStatuses.includes(unit.status)).length;
  }, [units]);

  const offMarketCount = useMemo(() => {
    return units.filter((unit) => unit.isOffMarket).length;
  }, [units]);

  const topCity = useMemo(() => {
    const counts = units.reduce<Record<string, number>>((acc, unit) => {
      const city = unit.project?.city || "Bilinmeyen";
      acc[city] = (acc[city] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || "Henüz yok";
  }, [units]);

  const portfolioReport = useMemo(() => {
    const scores = units.map((unit) => calculatePortfolioScore(unit));
    const averageScore = scores.length
      ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
      : 0;

    const premiumCount = scores.filter((score) => score >= 90).length;
    const strongCount = scores.filter((score) => score >= 80).length;
    const missingDescription = units.filter((unit) => !unit.description).length;
    const missingAuthority = units.filter(
      (unit) => !unit.yetkiVerified && !unit.isVerified,
    ).length;
    const missingLocation = units.filter(
      (unit) => !unit.project?.city || !unit.project?.district,
    ).length;

    const nextAdvice =
      missingAuthority > 0
        ? `${missingAuthority} portföyde yetki durumu eksik. Yetki bilgisini tamamlarsanız karne puanı yükselir.`
        : missingDescription > 0
          ? `${missingDescription} portföyde açıklama eksik. Lina ile açıklama hazırlayabilirsiniz.`
          : missingLocation > 0
            ? `${missingLocation} portföyde konum bilgisi eksik. İl ve ilçe bilgilerini tamamlayın.`
            : "Portföy bilgileriniz güçlü görünüyor. Paylaşım kartları için hazır.";

    return {
      averageScore,
      scoreLabel: getPortfolioScoreLabel(averageScore),
      premiumCount,
      strongCount,
      missingDescription,
      missingAuthority,
      missingLocation,
      nextAdvice,
    };
  }, [units]);

  const myProjects = user?.role === "ADMIN" ? projects : [];

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

  const handleAdminVerify = async (
    unitId: string,
    payload: {
      tapuVerified?: boolean;
      photoVerified?: boolean;
      yetkiVerified?: boolean;
      isOffMarket?: boolean;
    },
  ) => {
    try {
      await api.patch(`/units/${unitId}/verify`, payload);
      await fetchData();
    } catch (e: any) {
      alert(e?.response?.data?.message || "Doğrulama işlemi yapılamadı.");
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
      price ? `${price.toLocaleString("tr-TR")} ₺` : "",
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

  const handleNativeShare = async (unit: Unit) => {
    const url = getShareUrl(unit);
    const text = getShareText(unit);

    if (navigator.share) {
      await navigator.share({
        title: unit.project?.name || "EPH Portföy",
        text,
        url,
      });
      return;
    }

    await handleCopyShare(unit);
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

    const shortDescription =
      unit.description ||
      "Yetkili portföy statüsünde, paylaşım için hazır profesyonel gayrimenkul kaydı.";

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
      shortDescription,
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

      <header className="sticky top-0 z-50 border-b border-[#DDE7F3] bg-white/88 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="grid grid-cols-[52px_1fr_52px] items-center gap-3 lg:flex lg:gap-4">
            <button
              onClick={() => router.push("/dashboard")}
              className="flex h-12 w-12 items-center justify-center rounded-[20px] border border-[#DDE7F3] bg-white text-[#06194A] shadow-[0_14px_40px_rgba(15,23,42,0.08)] transition hover:bg-[#EFF6FF]"
              aria-label="Dashboard'a dön"
            >
              <ArrowLeft size={20} />
            </button>

            <Link
              href="/dashboard"
              className="flex min-w-0 items-center justify-center gap-3 rounded-[24px] border border-[#DDE7F3] bg-[#F7FBFF] px-4 py-3 text-center no-underline shadow-[0_14px_40px_rgba(15,23,42,0.06)] lg:justify-start"
            >
              <img src="/LOGO_EPH.png" alt="EPH" className="h-10 w-10 object-contain" />
              <div className="min-w-0">
                <div className="truncate text-sm font-black tracking-[-0.03em] text-[#06194A]">
                  Portföy Merkezi
                </div>
                <div className="truncate text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#64748B]">
                  Portföy Merkezi
                </div>
              </div>
            </Link>

            <button
              onClick={() => setLinaOpen(true)}
              className="flex h-12 w-12 items-center justify-center rounded-[20px] border border-[#DDE7F3] bg-white text-[#1557D6] shadow-[0_14px_40px_rgba(15,23,42,0.08)] transition hover:bg-[#EFF6FF]"
              aria-label="Lina'yı aç"
            >
              <Sparkles size={19} />
            </button>
          </div>

          <nav className="hidden items-center gap-2 lg:flex">
            {[
              ["/dashboard", "Dashboard"],
              ["/stok", "Portföy"],
              ["/network", "Network"],
              ["/crm", "CRM"],
              ["/market", "Piyasa"],
              ["/profil", "Profil"],
            ].map(([href, label]) => (
              <Link
                key={href}
                href={href}
                className={`rounded-full px-4 py-2 text-sm font-extrabold no-underline transition ${
                  href === "/stok"
                    ? "bg-[#1557D6] text-white shadow-[0_16px_34px_rgba(21,87,214,0.24)]"
                    : "text-[#475569] hover:bg-[#EFF6FF] hover:text-[#1557D6]"
                }`}
              >
                {label}
              </Link>
            ))}

            {user?.role === "ADMIN" && (
              <Link
                href="/admin"
                className="rounded-full px-4 py-2 text-sm font-extrabold text-[#475569] no-underline transition hover:bg-[#EFF6FF] hover:text-[#1557D6]"
              >
                Admin
              </Link>
            )}

            <button
              className="rounded-full border border-[#DDE7F3] bg-white px-4 py-2 text-sm font-extrabold text-[#475569] transition hover:text-[#1557D6]"
              onClick={() => {
                logout();
                router.push("/giris");
              }}
            >
              Çıkış
            </button>
          </nav>
        </div>
      </header>

      <LinaPanel open={linaOpen} onClose={() => setLinaOpen(false)} />

      <main className="mx-auto max-w-7xl px-4 pb-24 pt-6">
        <section className="rounded-[34px] border border-[#DDE7F3] bg-white p-4 shadow-[0_24px_70px_rgba(15,23,42,0.07)] lg:p-6">
          <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="text-center lg:text-left">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#1557D6]">
                Premium Portföy Merkezi
              </p>
              <h1 className="mt-2 text-2xl font-black tracking-[-0.05em] text-[#06194A] md:text-4xl">
                Portföy Merkezi
              </h1>
              <p className="mx-auto mt-2 max-w-2xl text-sm font-bold leading-6 text-[#64748B] lg:mx-0">
                Portföylerinizi hızlıca ekleyin, filtreleyin ve paylaşım kartlarını tek merkezden yönetin.
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 lg:min-w-[360px]">
              {canAddUnit && (
                <button
                  onClick={() => {
                    resetForm();
                    setShowModal(true);
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-[22px] bg-[#1557D6] px-5 py-4 text-sm font-black text-white shadow-[0_18px_38px_rgba(21,87,214,0.20)] transition hover:bg-[#0F49BD]"
                >
                  <Plus size={18} />
                  Yeni Portföy Ekle
                </button>
              )}

              <button
                onClick={() => setLinaOpen(true)}
                className="inline-flex items-center justify-center gap-2 rounded-[22px] border border-[#DDE7F3] bg-[#F7FBFF] px-5 py-4 text-sm font-black text-[#1557D6] transition hover:bg-[#EFF6FF]"
              >
                <Sparkles size={18} />
                Lina ile Hazırla
              </button>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <HeroMetric
              icon={<Home size={20} />}
              label="Toplam Kayıt"
              value={units.length.toLocaleString("tr-TR")}
              note="Sistemdeki portföy"
            />

            <HeroMetric
              icon={<TrendingUp size={20} />}
              label="Aktif İlan"
              value={activeCount.toLocaleString("tr-TR")}
              note="Satış / kiralama"
            />

            <HeroMetric
              icon={<CheckCircle2 size={20} />}
              label="Doğrulanmış"
              value={verifiedCount.toLocaleString("tr-TR")}
              note="Güven seviyesi"
            />

            <HeroMetric
              icon={<Star size={20} />}
              label="Toplam Değer"
              value={
                totalValue
                  ? `${(totalValue / 1000000).toFixed(1)}M ₺`
                  : "0 ₺"
              }
              note="Yaklaşık envanter"
            />
          </div>
        </section>

        <section className="mt-4 rounded-[30px] border border-[#DDE7F3] bg-white p-4 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
          <div className="flex flex-col gap-3 text-center lg:flex-row lg:items-center lg:justify-between lg:text-left">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#1557D6]">
                Portföy Analiz Merkezi
              </p>
              <h2 className="mt-1 text-xl font-black tracking-[-0.04em] text-[#06194A]">
                Özet ve portföy sağlığı
              </h2>
            </div>

            <button
              type="button"
              onClick={() => setShowAnalysis((current) => !current)}
              className="rounded-[18px] border border-[#DDE7F3] bg-[#F7FBFF] px-5 py-3 text-sm font-black text-[#1557D6] transition hover:bg-[#EFF6FF]"
            >
              {showAnalysis ? "Analizi Gizle" : "Analizi Göster"}
            </button>
          </div>

          {showAnalysis && (
            <div className="mt-4 grid gap-4 lg:grid-cols-3">
              <PortfolioHealthCard
                title="Portföy Sağlığı"
                value={`${portfolioReport.averageScore}%`}
                label={portfolioReport.scoreLabel}
                icon={<ShieldCheck size={22} />}
                progress={portfolioReport.averageScore}
                note={`${activeCount} aktif portföy · ${portfolioReport.strongCount} güçlü kayıt`}
              />

              <PortfolioHealthCard
                title="Portföy Karnesi"
                value={`${portfolioReport.averageScore}/100`}
                label={portfolioReport.scoreLabel}
                icon={<Trophy size={22} />}
                progress={portfolioReport.averageScore}
                note={`${portfolioReport.premiumCount} portföy pekiyi seviyesinde`}
              />

              <div className="rounded-[32px] border border-[#DDE7F3] bg-white p-5 shadow-[0_20px_55px_rgba(15,23,42,0.07)]">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-[#1557D6]">
                  Lina Analizi
                </p>
                <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-[#06194A]">
                  Portföy önerileri
                </h2>
                <p className="mt-4 text-sm font-bold leading-7 text-[#475569]">
                  {portfolioReport.nextAdvice}
                </p>
                <div className="mt-4 grid gap-2">
                  <ReportMiniLine label="Açıklama eksik" value={portfolioReport.missingDescription} />
                  <ReportMiniLine label="Yetki eksik" value={portfolioReport.missingAuthority} />
                  <ReportMiniLine label="Konum eksik" value={portfolioReport.missingLocation} />
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="mt-6 rounded-[36px] border border-[#DDE7F3] bg-white p-4 shadow-[0_24px_70px_rgba(15,23,42,0.07)] lg:p-6">
          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="text-center lg:text-left">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#1557D6]">
                Filtre Merkezi
              </p>
              <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-[#06194A]">
                Canlı İlan Listesi
              </h2>
              <p className="mt-2 text-sm font-semibold text-[#64748B]">
                Filtreleme akışı korundu. Kartlar tıklanabilir; Paylaş butonu Lina Paylaşım Merkezi'ni açar.
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 rounded-[22px] border border-[#DDE7F3] bg-[#F7FBFF] p-1">
              <button
                onClick={() => setViewMode("cards")}
                className={`inline-flex h-11 items-center gap-2 rounded-[18px] px-4 text-sm font-black transition ${
                  viewMode === "cards"
                    ? "bg-[#1557D6] text-white shadow-[0_14px_30px_rgba(21,87,214,0.22)]"
                    : "text-[#64748B] hover:bg-white hover:text-[#1557D6]"
                }`}
              >
                <Grid2X2 size={17} />
                Kart
              </button>

              <button
                onClick={() => setViewMode("list")}
                className={`inline-flex h-11 items-center gap-2 rounded-[18px] px-4 text-sm font-black transition ${
                  viewMode === "list"
                    ? "bg-[#1557D6] text-white shadow-[0_14px_30px_rgba(21,87,214,0.22)]"
                    : "text-[#64748B] hover:bg-white hover:text-[#1557D6]"
                }`}
              >
                <List size={17} />
                Liste
              </button>
            </div>
          </div>

          <StokToolbar
            search={search}
            setSearch={setSearch}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            cityFilter={cityFilter}
            setCityFilter={setCityFilter}
            visibleCount={filteredUnits.length}
            totalCount={units.length}
            onAdd={() => {
              resetForm();
              setShowModal(true);
            }}
            onLina={() => setLinaOpen(true)}
            canAddUnit={canAddUnit}
          />

          {viewMode === "cards" ? (
            <div className="mt-5 grid auto-rows-fr gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredUnits.length === 0 ? (
                <EmptyInventory />
              ) : (
                filteredUnits.map((unit) => (
                  <PremiumUnitCard
                    key={unit.id}
                    unit={unit}
                    copied={copiedUnitId === unit.id}
                    onOpen={() => router.push(`/stok/${unit.id}`)}
                    onCopy={() => handleCopyShare(unit)}
                    onShare={() => handlePortfolioShare(unit)}
                  />
                ))
              )}
            </div>
          ) : (
            <div className="mt-5 overflow-hidden rounded-[28px] border border-[#DDE7F3] bg-[#F7FBFF]">
              <div className="w-full overflow-x-auto">
                <StokTable units={filteredUnits} />
              </div>
            </div>
          )}
        </section>

        {user?.role === "ADMIN" && (
          <AdminVerificationPanel
            units={filteredUnits}
            allUnits={units}
            projects={projects}
            onVerify={handleAdminVerify}
          />
        )}
      </main>

      <PortfolioShareModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        data={shareData}
      />

      <StokCreateModal
        open={showModal}
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
        projects={myProjects}
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
    </div>
  );
}

function isUnitVerified(unit: Unit) {
  return Boolean(
    unit.isVerified ||
      (unit.tapuVerified && unit.photoVerified && unit.yetkiVerified),
  );
}

function getUnitCoverImage(unit: Unit) {
  const cover = unit.images?.find((image) => image.isCover);
  const first = unit.images?.[0];

  return (
    cover?.supabaseUrl ||
    cover?.url ||
    first?.supabaseUrl ||
    first?.url ||
    ""
  );
}

function HeroMetric({
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
    <div className="flex min-h-[132px] flex-col justify-center rounded-[26px] border border-[#DDE7F3] bg-[#F7FBFF] p-4 text-center shadow-[0_14px_34px_rgba(15,23,42,0.05)]">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-[20px] bg-[#EFF6FF] text-[#1557D6]">
        {icon}
      </div>
      <div>
        <p className="mt-3 text-[11px] font-black uppercase tracking-[0.18em] text-[#64748B]">
          {label}
        </p>
        <p className="mt-2 text-2xl font-black tracking-[-0.04em] text-[#06194A]">
          {value}
        </p>
        <p className="mt-1 text-xs font-bold text-[#64748B]">{note}</p>
      </div>
    </div>
  );
}

function BalanceLine({
  label,
  value,
  total,
}: {
  label: string;
  value: number;
  total: number;
}) {
  const width = Math.min(100, Math.round((value / total) * 100));

  return (
    <div className="rounded-[22px] border border-[#DDE7F3] bg-[#F7FBFF] p-4">
      <div className="mb-3 flex items-center justify-between gap-4">
        <span className="text-xs font-black uppercase tracking-[0.16em] text-[#64748B]">
          {label}
        </span>
        <span className="text-sm font-black text-[#06194A]">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[#DBEAFE]">
        <div
          className="h-full rounded-full bg-[#1557D6]"
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

function VisualTile({ title, image }: { title: string; image: string }) {
  return (
    <div className="relative min-h-[158px] overflow-hidden rounded-[26px] border border-[#DDE7F3] bg-[#EFF6FF]">
      <div
        className="absolute inset-0 bg-cover bg-center transition duration-500 hover:scale-105"
        style={{ backgroundImage: `url('${image}')` }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#06194A]/82 via-[#06194A]/18 to-transparent" />
      <div className="absolute bottom-4 left-4 right-4">
        <p className="text-sm font-black text-white">{title}</p>
      </div>
    </div>
  );
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-h-[62px] items-center justify-between gap-4 rounded-[22px] border border-[#DDE7F3] bg-[#F7FBFF] px-4 py-3">
      <span className="text-sm font-extrabold text-[#64748B]">{label}</span>
      <span className="text-right text-sm font-black text-[#06194A]">{value}</span>
    </div>
  );
}

function calculatePortfolioScore(unit: Unit) {
  let score = 0;

  if (unit.project?.name) score += 15;
  if (unit.project?.city && unit.project?.district) score += 15;
  if (unit.price) score += 12;
  if (unit.area) score += 10;
  if (unit.roomCount) score += 10;
  if (unit.description) score += 10;
  if (unit.tapuVerified) score += 8;
  if (unit.photoVerified) score += 8;
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

function PortfolioHealthCard({
  title,
  value,
  label,
  icon,
  progress,
  note,
}: {
  title: string;
  value: string;
  label: string;
  icon: ReactNode;
  progress: number;
  note: string;
}) {
  return (
    <div className="rounded-[32px] border border-[#DDE7F3] bg-white p-5 shadow-[0_20px_55px_rgba(15,23,42,0.07)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#1557D6]">
            {title}
          </p>
          <h2 className="mt-2 text-4xl font-black tracking-[-0.06em] text-[#06194A]">
            {value}
          </h2>
        </div>

        <div className="flex h-14 w-14 items-center justify-center rounded-[22px] bg-[#EFF6FF] text-[#1557D6]">
          {icon}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-4">
        <span className="rounded-full bg-[#EFF6FF] px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#1557D6]">
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

      <p className="mt-4 text-sm font-bold leading-6 text-[#64748B]">{note}</p>
    </div>
  );
}

function ReportMiniLine({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[18px] border border-[#DDE7F3] bg-[#F7FBFF] px-4 py-3">
      <span className="text-xs font-black uppercase tracking-[0.14em] text-[#64748B]">
        {label}
      </span>
      <span
        className={`rounded-full px-3 py-1 text-xs font-black ${
          value > 0 ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function PremiumUnitCard({
  unit,
  copied,
  onOpen,
  onCopy,
  onShare,
}: {
  unit: Unit;
  copied: boolean;
  onOpen: () => void;
  onCopy: () => void;
  onShare: () => void;
}) {
  const verified = isUnitVerified(unit);
  const price = Number(unit.price || 0);
  const score = calculatePortfolioScore(unit);
  const scoreLabel = getPortfolioScoreLabel(score);
  const location =
    [unit.project?.district, unit.project?.city].filter(Boolean).join(" / ") ||
    "Konum bilgisi yok";
  const coverImage = getUnitCoverImage(unit);

  return (
    <article
      onClick={onOpen}
      className="group flex min-h-[456px] cursor-pointer flex-col justify-between overflow-hidden rounded-[32px] border border-[#DDE7F3] bg-white p-5 shadow-[0_18px_48px_rgba(15,23,42,0.07)] transition hover:-translate-y-1 hover:border-[#1557D6]/35 hover:shadow-[0_28px_70px_rgba(21,87,214,0.14)]"
    >
      <div>
        <div className="relative mb-5 min-h-[138px] overflow-hidden rounded-[26px] bg-[#EFF6FF]">
          {coverImage ? (
            <>
              <div
                className="absolute inset-0 bg-cover bg-center opacity-95 transition duration-500 group-hover:scale-105"
                style={{ backgroundImage: `url('${coverImage}')` }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#06194A]/78 via-[#06194A]/12 to-transparent" />
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[linear-gradient(135deg,#EFF6FF,#FFFFFF)] px-6 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-[22px] border border-[#DDE7F3] bg-white text-[#1557D6] shadow-[0_14px_34px_rgba(15,23,42,0.08)]">
                <Building2 size={24} />
              </div>
              <p className="mt-3 text-xs font-black uppercase tracking-[0.18em] text-[#1557D6]">
                Fotoğraf Eklenmedi
              </p>
              <p className="mt-1 text-[11px] font-bold text-[#64748B]">
                Bu portföy için kapak görseli bekleniyor.
              </p>
            </div>
          )}
          <div className="absolute left-4 top-4 flex flex-wrap gap-2">
            <span className="rounded-full bg-white/92 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-[#1557D6] shadow-sm">
              {statusLabels[unit.status] || unit.status || "Durum Yok"}
            </span>

            {verified && (
              <span className="rounded-full bg-emerald-50/95 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-emerald-700 shadow-sm">
                Onaylı
              </span>
            )}

            <span className="rounded-full bg-white/92 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-[#06194A] shadow-sm">
              {scoreLabel} · {score}
            </span>
          </div>

          <div className="absolute bottom-4 right-4 flex h-11 w-11 items-center justify-center rounded-[18px] bg-white text-[#1557D6] shadow-lg transition group-hover:bg-[#1557D6] group-hover:text-white">
            <Eye size={18} />
          </div>
        </div>

        <h3 className="line-clamp-2 text-2xl font-black leading-tight tracking-[-0.04em] text-[#06194A]">
          {unit.project?.name || "EPH Portföy"}
        </h3>

        <div className="mt-3 flex items-center justify-center gap-2 text-sm font-bold text-[#64748B] lg:justify-start">
          <MapPin size={16} />
          <span className="line-clamp-1">{location}</span>
        </div>

        <div className="mt-5 rounded-[26px] border border-[#DDE7F3] bg-[#F7FBFF] p-4">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#64748B]">
            İlan Değeri
          </p>
          <p className="mt-2 text-2xl font-black tracking-[-0.04em] text-[#06194A]">
            {formatPrice(price, unit.priceCurrency)}
          </p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <UnitInfo label="Tip" value={unit.type || "—"} />
          <UnitInfo label="Oda" value={unit.roomCount || "—"} />
          <UnitInfo label="Alan" value={unit.area ? `${unit.area} m²` : "—"} />
          <UnitInfo label="Kat" value={formatFloorInfo(unit)} />
        </div>
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-3">
        <button
          onClick={(event) => {
            event.stopPropagation();
            onShare();
          }}
          className="inline-flex items-center justify-center gap-2 rounded-[18px] bg-[#1557D6] px-4 py-3 text-sm font-black text-white transition hover:bg-[#0F49BD]"
        >
          <Share2 size={16} />
          Kart Hazırla
        </button>

        <a
          onClick={(event) => event.stopPropagation()}
          href={`https://wa.me/?text=${encodeURIComponent(
            `${unit.project?.name || "EPH Portföy"} - ${location}`,
          )}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-[18px] border border-[#DDE7F3] bg-[#F7FBFF] px-4 py-3 text-sm font-black text-[#1557D6] no-underline transition hover:bg-[#EFF6FF]"
        >
          <MessageCircle size={16} />
          WhatsApp
        </a>

        <button
          onClick={(event) => {
            event.stopPropagation();
            onCopy();
          }}
          className="inline-flex items-center justify-center gap-2 rounded-[18px] border border-[#DDE7F3] bg-white px-4 py-3 text-sm font-black text-[#475569] transition hover:bg-[#EFF6FF] hover:text-[#1557D6]"
        >
          <Copy size={16} />
          {copied ? "Kopyalandı" : "Kopyala"}
        </button>
      </div>
    </article>
  );
}

function UnitInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-h-[76px] rounded-[22px] border border-[#DDE7F3] bg-white p-3 text-center">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#64748B]">
        {label}
      </p>
      <p className="mt-2 line-clamp-1 text-sm font-black text-[#06194A]">
        {value}
      </p>
    </div>
  );
}

function EmptyInventory() {
  return (
    <div className="col-span-full rounded-[30px] border border-dashed border-[#DDE7F3] bg-[#F7FBFF] p-10 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[22px] bg-white text-[#1557D6] shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
        <Search size={22} />
      </div>
      <h3 className="mt-4 text-2xl font-black tracking-[-0.04em] text-[#06194A]">
        Portföy kaydı bulunamadı
      </h3>
      <p className="mx-auto mt-2 max-w-xl text-sm font-semibold leading-7 text-[#64748B]">
        Arama veya filtreleri değiştirerek tekrar deneyin.
      </p>
    </div>
  );
}

function AdminVerificationPanel({
  units,
  allUnits,
  projects,
  onVerify,
}: {
  units: Unit[];
  allUnits: Unit[];
  projects: Project[];
  onVerify: (
    unitId: string,
    payload: {
      tapuVerified?: boolean;
      photoVerified?: boolean;
      yetkiVerified?: boolean;
      isOffMarket?: boolean;
    },
  ) => void;
}) {
  const verifiedUnits = allUnits.filter((unit) => isUnitVerified(unit)).length;
  const offMarketUnits = allUnits.filter((unit) => unit.isOffMarket).length;
  const unverifiedUnits = allUnits.filter((unit) => !isUnitVerified(unit)).length;

  return (
    <section className="mt-6 rounded-[36px] border border-[#DDE7F3] bg-white p-4 shadow-[0_24px_70px_rgba(15,23,42,0.07)] lg:p-6">
      <div className="flex flex-col gap-4 text-center lg:flex-row lg:items-center lg:justify-between lg:text-left">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#1557D6]">
            Admin Doğrulama Merkezi
          </p>
          <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-[#06194A]">
            Portföy kontrol paneli
          </h2>
          <p className="mt-2 text-sm font-semibold text-[#64748B]">
            Eski admin doğrulama fonksiyonu korundu. Tapu, fotoğraf ve yetki onayları buradan yönetilir.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <MiniAdminMetric label="Proje" value={projects.length} />
          <MiniAdminMetric label="Onaylı" value={verifiedUnits} />
          <MiniAdminMetric label="Off-Market" value={offMarketUnits} />
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        {units.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-[#DDE7F3] bg-[#F7FBFF] p-10 text-center text-sm font-bold text-[#64748B] xl:col-span-2">
            Admin kontrolü için portföy kaydı bulunamadı.
          </div>
        ) : (
          units.slice(0, 24).map((unit) => (
            <AdminUnitCard key={unit.id} unit={unit} onVerify={onVerify} />
          ))
        )}
      </div>

      <div className="mt-5 rounded-[28px] border border-[#DDE7F3] bg-[#F7FBFF] p-4 text-center text-sm font-bold text-[#64748B]">
        Onay bekleyen kayıt: {unverifiedUnits}
      </div>
    </section>
  );
}

function MiniAdminMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-[112px] rounded-[22px] border border-[#DDE7F3] bg-[#F7FBFF] px-4 py-3 text-center">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#64748B]">
        {label}
      </p>
      <p className="mt-1 text-2xl font-black text-[#06194A]">{value}</p>
    </div>
  );
}

function AdminUnitCard({
  unit,
  onVerify,
}: {
  unit: Unit;
  onVerify: (
    unitId: string,
    payload: {
      tapuVerified?: boolean;
      photoVerified?: boolean;
      yetkiVerified?: boolean;
      isOffMarket?: boolean;
    },
  ) => void;
}) {
  const verified = isUnitVerified(unit);
  const price = Number(unit.price || 0);

  return (
    <article className="rounded-[30px] border border-[#DDE7F3] bg-[#F7FBFF] p-5 shadow-[0_18px_48px_rgba(15,23,42,0.06)]">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[#EFF6FF] px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#1557D6]">
              {statusLabels[unit.status] || unit.status || "Durum Yok"}
            </span>

            {unit.isOffMarket && (
              <span className="rounded-full bg-amber-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-amber-700">
                Off-Market
              </span>
            )}

            <span
              className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${
                verified
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-rose-50 text-rose-700"
              }`}
            >
              {verified ? "Doğrulandı" : "Kontrol"}
            </span>
          </div>

          <h3 className="mt-4 text-2xl font-black tracking-[-0.04em] text-[#06194A]">
            {unit.project?.name || "EPH Portföy"}
          </h3>

          <p className="mt-1 text-sm font-semibold text-[#64748B]">
            {[unit.project?.district, unit.project?.city].filter(Boolean).join(" / ") || "Konum yok"} · No {unit.number || "—"}
          </p>
        </div>

        <div className="rounded-[22px] border border-[#DDE7F3] bg-white px-5 py-4 text-right">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#64748B]">
            Değer
          </p>
          <p className="mt-1 text-2xl font-black text-[#06194A]">
            {price ? `${price.toLocaleString("tr-TR")} ₺` : "—"}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-4">
        <AdminUnitMini label="Tip" value={unit.type || "—"} />
        <AdminUnitMini label="Oda" value={unit.roomCount || "—"} />
        <AdminUnitMini label="Alan" value={unit.area ? `${unit.area} m²` : "—"} />
        <AdminUnitMini label="Kat" value={formatFloorInfo(unit)} />
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-3">
        <AdminCheck label="Tapu" active={Boolean(unit.tapuVerified)} />
        <AdminCheck label="Fotoğraf" active={Boolean(unit.photoVerified)} />
        <AdminCheck label="Yetki" active={Boolean(unit.yetkiVerified)} />
      </div>

      <div className="mt-5 rounded-[24px] border border-[#DDE7F3] bg-white p-4">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#1557D6]">
          Admin Doğrulama
        </p>

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <button
            onClick={() =>
              onVerify(unit.id, {
                tapuVerified: !unit.tapuVerified,
                photoVerified: unit.photoVerified,
                yetkiVerified: unit.yetkiVerified,
                isOffMarket: unit.isOffMarket,
              })
            }
            className={`rounded-2xl px-4 py-3 text-xs font-black transition ${
              unit.tapuVerified
                ? "bg-emerald-50 text-emerald-700"
                : "bg-[#F7FBFF] text-[#64748B] hover:bg-[#EFF6FF] hover:text-[#1557D6]"
            }`}
          >
            {unit.tapuVerified ? "Tapu Onaylı" : "Tapu Onayla"}
          </button>

          <button
            onClick={() =>
              onVerify(unit.id, {
                tapuVerified: unit.tapuVerified,
                photoVerified: !unit.photoVerified,
                yetkiVerified: unit.yetkiVerified,
                isOffMarket: unit.isOffMarket,
              })
            }
            className={`rounded-2xl px-4 py-3 text-xs font-black transition ${
              unit.photoVerified
                ? "bg-emerald-50 text-emerald-700"
                : "bg-[#F7FBFF] text-[#64748B] hover:bg-[#EFF6FF] hover:text-[#1557D6]"
            }`}
          >
            {unit.photoVerified ? "Fotoğraf Onaylı" : "Fotoğraf Onayla"}
          </button>

          <button
            onClick={() =>
              onVerify(unit.id, {
                tapuVerified: unit.tapuVerified,
                photoVerified: unit.photoVerified,
                yetkiVerified: !unit.yetkiVerified,
                isOffMarket: unit.isOffMarket,
              })
            }
            className={`rounded-2xl px-4 py-3 text-xs font-black transition ${
              unit.yetkiVerified
                ? "bg-emerald-50 text-emerald-700"
                : "bg-[#F7FBFF] text-[#64748B] hover:bg-[#EFF6FF] hover:text-[#1557D6]"
            }`}
          >
            {unit.yetkiVerified ? "Yetki Onaylı" : "Yetki Onayla"}
          </button>

          <button
            onClick={() =>
              onVerify(unit.id, {
                tapuVerified: true,
                photoVerified: true,
                yetkiVerified: true,
                isOffMarket: unit.isOffMarket,
              })
            }
            className="rounded-2xl bg-[#1557D6] px-4 py-3 text-xs font-black text-white transition hover:bg-[#0F49BD]"
          >
            Tümünü Doğrula
          </button>
        </div>
      </div>
    </article>
  );
}

function AdminUnitMini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#DDE7F3] bg-white p-3 text-center">
      <p className="text-[9px] font-black uppercase tracking-[0.22em] text-[#64748B]">
        {label}
      </p>
      <p className="mt-1 text-sm font-black text-[#06194A]">{value}</p>
    </div>
  );
}

function AdminCheck({ label, active }: { label: string; active: boolean }) {
  return (
    <div
      className={`rounded-2xl px-4 py-3 text-center text-xs font-black uppercase tracking-[0.16em] ${
        active ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
      }`}
    >
      {active ? "✓" : "!"} {label}
    </div>
  );
}
