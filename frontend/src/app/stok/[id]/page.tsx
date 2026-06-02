"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  BarChart3,
  Building2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  CircleUserRound,
  FileText,
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

const CINKAYA_GALLERY = Array.from({ length: 17 }, (_, index) => {
  const photoNo = index + 1;

  return `/portfolio-images/cinkaya-bulvari/${photoNo}.jpg`;
});

const CINKAYA_DESCRIPTION =
  "Çınkaya Bulvarı’nda, Sosyete Pazarı’na 100 metre mesafede yer alan ultra lüks 3+1 daire; 190 m² kullanım alanı, ebeveyn banyosu, giyinme odası, çift balkon, otomatik panjur, açık yüzme havuzu, açık otopark, çocuk oyun parkı, kamelya alanı, müştemilat bölümü ve toplantı salonu gibi güçlü sosyal donatılarla öne çıkar. 8 katlı binanın 3. katında bulunan, düz girişli asansörlü ve her katta yalnızca 2 daireden oluşan bu portföy; modern mimari, kaliteli malzeme ve merkezi konumuyla konforlu bir yaşam sunar.";

function formatMoney(value?: number) {
  const numeric = Number(value || 0);
  if (!numeric) return "Fiyat belirtilmedi";
  return `${numeric.toLocaleString("tr-TR")} ₺`;
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

function calculatePortfolioScore(unit?: DetailUnit | null) {
  if (!unit) return 0;

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

  const unitId = params?.id;

  useEffect(() => {
    if (!unitId) return;
    fetchUnit();
  }, [unitId]);

  useEffect(() => {
    if (!unitId || typeof window === "undefined") return;
    setIsFollowing(localStorage.getItem(`eph-stock-follow-${unitId}`) === "true");
  }, [unitId]);

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
      price: price ? `${price.toLocaleString("tr-TR")} TL` : "Fiyat bilgisi yok",
      roomCount: item.roomCount || "—",
      area: item.area ? `${item.area} m²` : "—",
      floor: item.floor != null ? `${item.floor}. Kat` : "—",
      authorization:
        item.yetkiVerified || item.isVerified ? "Yetkili" : "Kontrol",
      coverImage: CINKAYA_GALLERY[activePhoto] || CINKAYA_GALLERY[0],
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
        "Çınkaya Bulvarı’nda sosyal donatıları güçlü, 190 m² ultra lüks 3+1 portföy.",
      longDescription:
        item.description ||
        CINKAYA_DESCRIPTION,
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
            <div
              className="absolute inset-0 bg-cover bg-center opacity-100"
              style={{ backgroundImage: `url("${CINKAYA_GALLERY[activePhoto] || CINKAYA_GALLERY[0]}")` }}
            />
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
                    <SummaryChip icon={<Building2 size={17} />} label={unit.floor != null ? `${unit.floor}. Kat` : "Kat yok"} />
                    <SummaryChip icon={<TrendingUp size={17} />} label={calculatedSquareMeterPrice} />
                  </div>
                </div>

                <div className="rounded-[32px] border border-white/24 bg-[#06194A]/55 p-5 text-white shadow-[0_26px_70px_rgba(0,0,0,0.22)] backdrop-blur-md">
                  <p className="text-[11px] font-black uppercase tracking-[0.22em] text-white/70">
                    Satış Değeri
                  </p>

                  <p className="mt-2 text-5xl font-black tracking-[-0.065em] text-white">
                    {formatMoney(unit.price)}
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

        <section className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            icon={<WalletCards size={22} />}
            label="Fiyat"
            value={formatMoney(unit.price)}
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
            icon={<TrendingUp size={22} />}
            label="m² Değeri"
            value={calculatedSquareMeterPrice}
            tone="slate"
          />
        </section>

        <section className="mt-5 rounded-[34px] border border-[#DDE7F3] bg-white p-5 shadow-[0_20px_55px_rgba(15,23,42,0.07)]">
          <div className="flex flex-col gap-4 text-center lg:flex-row lg:items-center lg:justify-between lg:text-left">
            <div>
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-[18px] bg-[#EFF6FF] text-[#1557D6]">
                <FileText size={21} />
              </div>

              <h2 className="mt-3 text-2xl font-black tracking-[-0.04em] text-[#06194A]">
                Portföy Galerisi
              </h2>

              <p className="mt-1 text-sm font-semibold leading-6 text-[#64748B]">
                Çınkaya Bulvarı portföyüne ait gerçek fotoğraf vitrini.
              </p>
            </div>

            <button
              onClick={() => setGalleryOpen(true)}
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-[20px] bg-[#1557D6] px-5 py-3 text-sm font-black text-white transition hover:bg-[#0F49BD]"
            >
              <FileText size={17} />
              Galeriyi Aç
            </button>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
            <button
              type="button"
              onClick={() => setGalleryOpen(true)}
              className="group relative min-h-[360px] overflow-hidden rounded-[30px] bg-[#06194A] text-left"
            >
              <img
                src={CINKAYA_GALLERY[activePhoto] || CINKAYA_GALLERY[0]}
                alt="Portföy galerisi kapak fotoğrafı"
                className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-[#06194A]/72 via-[#06194A]/10 to-transparent" />

              <div className="absolute bottom-5 left-5 right-5">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-white/72">
                  Fotoğraf {activePhoto + 1} / {CINKAYA_GALLERY.length}
                </p>

                <h3 className="mt-2 text-2xl font-black tracking-[-0.04em] text-white">
                  Büyük Görsel Önizleme
                </h3>
              </div>
            </button>

            <div className="grid max-h-[360px] grid-cols-3 gap-2 overflow-y-auto rounded-[28px] bg-[#F7FBFF] p-2">
              {CINKAYA_GALLERY.map((photo, index) => (
                <button
                  key={photo}
                  type="button"
                  onClick={() => setActivePhoto(index)}
                  className={`relative min-h-[92px] overflow-hidden rounded-[20px] border transition ${
                    activePhoto === index
                      ? "border-[#1557D6] ring-2 ring-[#1557D6]/20"
                      : "border-[#DDE7F3]"
                  }`}
                >
                  <img
                    src={photo}
                    alt={`Portföy fotoğrafı ${index + 1}`}
                    className="absolute inset-0 h-full w-full object-cover"
                  />

                  <span className="absolute bottom-2 right-2 rounded-full bg-white/92 px-2 py-1 text-[10px] font-black text-[#06194A]">
                    {index + 1}
                  </span>
                </button>
              ))}
            </div>
          </div>
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
                  CINKAYA_DESCRIPTION}
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
                  value={unit.floor != null ? String(unit.floor) : "—"}
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

      {galleryOpen && (
        <div className="fixed inset-0 z-[10001] bg-[#06194A]/92 p-4 backdrop-blur-xl">
          <div className="mx-auto flex h-full max-w-7xl flex-col">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-white/60">
                  Portföy Galerisi
                </p>
                <h2 className="mt-1 text-xl font-black text-white">
                  Fotoğraf {activePhoto + 1} / {CINKAYA_GALLERY.length}
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

            <div className="relative min-h-0 flex-1 overflow-hidden rounded-[32px] bg-black">
              <img
                src={CINKAYA_GALLERY[activePhoto] || CINKAYA_GALLERY[0]}
                alt="Büyük portföy fotoğrafı"
                className="h-full w-full object-contain"
              />

              <button
                onClick={() =>
                  setActivePhoto((current) =>
                    current === 0 ? CINKAYA_GALLERY.length - 1 : current - 1,
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
                    current === CINKAYA_GALLERY.length - 1 ? 0 : current + 1,
                  )
                }
                className="absolute right-4 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[#06194A]"
                aria-label="Sonraki fotoğraf"
              >
                <ChevronRight size={24} />
              </button>
            </div>

            <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
              {CINKAYA_GALLERY.map((photo, index) => (
                <button
                  key={photo}
                  onClick={() => setActivePhoto(index)}
                  className={`relative h-20 w-24 shrink-0 overflow-hidden rounded-[18px] border ${
                    activePhoto === index
                      ? "border-white"
                      : "border-white/20 opacity-70"
                  }`}
                >
                  <img
                    src={photo}
                    alt={`Küçük fotoğraf ${index + 1}`}
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
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
  const items = [
    {
      label: "Fotoğraf Kalitesi",
      value: unit.photoVerified ? 100 : 80,
      note: unit.photoVerified ? "Fotoğraf kontrolü güçlü" : "Galeri mevcut, doğrulama bekliyor",
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
