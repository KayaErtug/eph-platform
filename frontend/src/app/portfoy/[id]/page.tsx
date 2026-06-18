"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  Camera,
  CheckCircle2,
  FileWarning,
  Home,
  Loader2,
  MapPin,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  XCircle,
} from "lucide-react";

import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";

type QualityMissingFlags = {
  photo?: boolean;
  document?: boolean;
  location?: boolean;
};

type QualityPortfolio = {
  id: string;
  portfolioNo?: string | null;
  title?: string | null;
  city?: string | null;
  district?: string | null;
  status?: string | null;
  approvalStatus?: string | null;
  isPoolVisible?: boolean;
  qualityScore?: number;
  qualityLevel?: string | null;
  hasPhoto?: boolean;
  hasDocument?: boolean;
  hasLocation?: boolean;
  isPoolReady?: boolean;
  missing?: QualityMissingFlags;
};

type QualitySummary = {
  totalPortfolioCount?: number;
  qualityPortfolioCount?: number;
  riskyPortfolioCount?: number;
  poolReadyCount?: number;
  averageQualityScore?: number;
  missingPhotoCount?: number;
  missingDocumentCount?: number;
  missingLocationCount?: number;
  unauthorizedPortfolioCount?: number;
  lists?: {
    topQuality?: QualityPortfolio[];
    risky?: QualityPortfolio[];
    missingPhotos?: QualityPortfolio[];
    missingDocuments?: QualityPortfolio[];
    missingLocations?: QualityPortfolio[];
    poolReady?: QualityPortfolio[];
  };
};

const EMPTY_SUMMARY: QualitySummary = {
  totalPortfolioCount: 0,
  qualityPortfolioCount: 0,
  riskyPortfolioCount: 0,
  poolReadyCount: 0,
  averageQualityScore: 0,
  missingPhotoCount: 0,
  missingDocumentCount: 0,
  missingLocationCount: 0,
  unauthorizedPortfolioCount: 0,
  lists: {
    topQuality: [],
    risky: [],
    missingPhotos: [],
    missingDocuments: [],
    missingLocations: [],
    poolReady: [],
  },
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

function asNumber(value: unknown) {
  const numeric = Number(value || 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

function normalizeList(value?: QualityPortfolio[]) {
  return Array.isArray(value) ? value : [];
}

function qualityLevel(score: number, fallback?: string | null) {
  if (fallback) return fallback;
  if (score >= 90) return "Mükemmel";
  if (score >= 75) return "Çok İyi";
  if (score >= 60) return "İyi";
  if (score >= 40) return "Geliştirilmeli";
  return "Riskli";
}

function qualityTone(score: number) {
  if (score >= 75) return "emerald";
  if (score >= 60) return "blue";
  if (score >= 40) return "amber";
  return "red";
}

function statusLabel(status?: string | null) {
  const key = String(status || "").toUpperCase();
  return statusLabels[key] || key || "Portföy";
}

function locationText(item: QualityPortfolio) {
  return [item.district, item.city].filter(Boolean).join(" / ") || "Konum bilgisi yok";
}

export default function PortfolioQualityPage() {
  const router = useRouter();
  const { user, hasHydrated } = useAuthStore();

  const [summary, setSummary] = useState<QualitySummary>(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const lists = summary.lists || EMPTY_SUMMARY.lists!;
  const topQuality = normalizeList(lists.topQuality);
  const risky = normalizeList(lists.risky);
  const missingPhotos = normalizeList(lists.missingPhotos);
  const missingDocuments = normalizeList(lists.missingDocuments);
  const missingLocations = normalizeList(lists.missingLocations);
  const poolReady = normalizeList(lists.poolReady);

  const riskTotal = useMemo(
    () =>
      asNumber(summary.missingPhotoCount) +
      asNumber(summary.missingDocumentCount) +
      asNumber(summary.missingLocationCount) +
      asNumber(summary.unauthorizedPortfolioCount),
    [summary],
  );

  useEffect(() => {
    if (!hasHydrated) return;

    if (!user) {
      router.push("/giris");
      return;
    }

    loadSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasHydrated, user?.id]);

  async function loadSummary() {
    setError("");
    setRefreshing(true);

    try {
      const response = await api.get(`/units/quality-summary?t=${Date.now()}`);
      setSummary({ ...EMPTY_SUMMARY, ...(response.data || {}) });
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Portföy kalite özeti yüklenemedi.");
      setSummary(EMPTY_SUMMARY);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  if (!hasHydrated || loading) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center overflow-y-auto bg-[#F7FBFF] px-4 text-[#06194A]">
        <div className="text-center">
          <Loader2 className="mx-auto animate-spin text-[#1557D6]" size={30} />
          <p className="mt-3 text-[12px] font-black text-[#64748B]">Portföy Kalite Merkezi yükleniyor...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[100dvh] overflow-x-hidden overflow-y-auto bg-[#F7FBFF] pb-[calc(96px+env(safe-area-inset-bottom))] text-[#06194A]">
      <header className="sticky top-0 z-40 border-b border-[#DDE7F3] bg-white/95 px-3 py-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[980px] items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <Link
              href="/portfoy"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[18px] border border-[#DDE7F3] bg-white text-[#06194A] shadow-sm"
              aria-label="Portföy ekranına dön"
            >
              <ArrowLeft size={19} />
            </Link>
            <div className="min-w-0">
              <h1 className="break-words text-center text-[20px] font-black leading-[24px] tracking-[-0.04em] text-[#06194A]">
                Portföy Kalite Merkezi
              </h1>
              <p className="break-words text-center text-[11px] font-bold leading-4 text-[#64748B]">
                Fotoğraf, belge, konum ve havuz hazırlığı
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={loadSummary}
            disabled={refreshing}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[18px] border border-[#DDE7F3] bg-white text-[#06194A] shadow-sm disabled:opacity-60"
            aria-label="Yenile"
          >
            {refreshing ? <Loader2 className="animate-spin" size={17} /> : <RefreshCw size={17} />}
          </button>
        </div>
      </header>

      <section className="mx-auto flex w-full max-w-[980px] flex-col gap-3 px-3 py-3">
        {error ? (
          <div className="rounded-[20px] border border-red-100 bg-red-50 p-3 text-center text-[12px] font-black text-red-700">
            {error}
          </div>
        ) : null}

        <section className="overflow-hidden rounded-[28px] border border-[#DDE7F3] bg-white shadow-[0_16px_38px_rgba(15,23,42,0.06)]">
          <div className="bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-4 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[24px] bg-[#1557D6] text-white shadow-sm">
              <Sparkles size={26} />
            </div>
            <p className="mt-3 text-[11px] font-black uppercase tracking-[0.16em] text-[#64748B]">Lina Kalite Koçu</p>
            <h2 className="mt-1 text-[24px] font-black tracking-[-0.05em] text-[#06194A]">
              {asNumber(summary.averageQualityScore)}/100
            </h2>
            <p className="mx-auto mt-2 max-w-[520px] text-[13px] font-bold leading-6 text-[#64748B]">
              Portföylerin havuza hazır olma seviyesini, eksik belge/fotoğraf/konum risklerini ve en güçlü kayıtları tek merkezden takip et.
            </p>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <SummaryCard label="Toplam Portföy" value={asNumber(summary.totalPortfolioCount)} icon={<Home size={19} />} tone="blue" />
          <SummaryCard label="Kaliteli" value={asNumber(summary.qualityPortfolioCount)} icon={<CheckCircle2 size={19} />} tone="green" />
          <SummaryCard label="Riskli" value={asNumber(summary.riskyPortfolioCount)} icon={<FileWarning size={19} />} tone="orange" />
          <SummaryCard label="Havuza Hazır" value={asNumber(summary.poolReadyCount)} icon={<ShieldCheck size={19} />} tone="slate" />
        </section>

        <section className="grid gap-3 lg:grid-cols-[0.9fr_1.1fr]">
          <Panel title="Eksik Kontrol Merkezi" actionText={`${riskTotal} uyarı`}>
            <div className="grid grid-cols-2 gap-2">
              <RiskCard label="Eksik Fotoğraf" value={asNumber(summary.missingPhotoCount)} icon={<Camera size={18} />} />
              <RiskCard label="Eksik Belge" value={asNumber(summary.missingDocumentCount)} icon={<FileWarning size={18} />} />
              <RiskCard label="Eksik Konum" value={asNumber(summary.missingLocationCount)} icon={<MapPin size={18} />} />
              <RiskCard label="Yetkisiz" value={asNumber(summary.unauthorizedPortfolioCount)} icon={<XCircle size={18} />} />
            </div>
          </Panel>

          <Panel title="Havuza Hazır Portföyler" actionText={`${poolReady.length} kayıt`}>
            <PortfolioList items={poolReady} emptyText="Havuza hazır portföy bulunamadı." />
          </Panel>
        </section>

        <section className="grid gap-3 lg:grid-cols-2">
          <Panel title="En Kaliteli Portföyler" actionText="80+ hedef">
            <PortfolioList items={topQuality} emptyText="Kalite skoru hesaplanacak portföy bekleniyor." />
          </Panel>

          <Panel title="Riskli Portföyler" actionText="Öncelik">
            <PortfolioList items={risky} emptyText="Riskli portföy bulunamadı." />
          </Panel>
        </section>

        <section className="grid gap-3 lg:grid-cols-3">
          <Panel title="Eksik Fotoğraflılar" actionText={`${missingPhotos.length} kayıt`}>
            <PortfolioList items={missingPhotos} emptyText="Eksik fotoğraflı kayıt yok." compact />
          </Panel>

          <Panel title="Eksik Belgeler" actionText={`${missingDocuments.length} kayıt`}>
            <PortfolioList items={missingDocuments} emptyText="Eksik belgeli kayıt yok." compact />
          </Panel>

          <Panel title="Eksik Konumlar" actionText={`${missingLocations.length} kayıt`}>
            <PortfolioList items={missingLocations} emptyText="Eksik konumlu kayıt yok." compact />
          </Panel>
        </section>
      </section>
    </main>
  );
}

function Panel({ title, actionText, children }: { title: string; actionText?: string; children: ReactNode }) {
  return (
    <section className="rounded-[26px] border border-[#DDE7F3] bg-white p-3 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
      <div className="mb-3 flex flex-col items-center justify-center gap-2 text-center">
        <h2 className="text-center text-[15px] font-black text-[#06194A]">{title}</h2>
        {actionText ? (
          <span className="shrink-0 rounded-full bg-[#EFF6FF] px-2.5 py-1 text-[10px] font-black text-[#1557D6]">
            {actionText}
          </span>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function SummaryCard({ label, value, icon, tone }: { label: string; value: number | string; icon: ReactNode; tone: "blue" | "green" | "orange" | "slate" }) {
  const toneClass =
    tone === "green"
      ? "bg-emerald-50 text-emerald-700"
      : tone === "orange"
        ? "bg-orange-50 text-orange-700"
        : tone === "slate"
          ? "bg-slate-50 text-slate-700"
          : "bg-blue-50 text-[#1557D6]";

  return (
    <article className="min-h-[104px] rounded-[24px] border border-[#DDE7F3] bg-white p-3 text-center shadow-[0_10px_26px_rgba(15,23,42,0.045)]">
      <span className={`mx-auto flex h-10 w-10 items-center justify-center rounded-[16px] ${toneClass}`}>{icon}</span>
      <p className="mt-2 text-[11px] font-black leading-tight text-[#64748B]">{label}</p>
      <p className="mt-1 text-[21px] font-black tracking-[-0.04em] text-[#06194A]">{value}</p>
    </article>
  );
}

function RiskCard({ label, value, icon }: { label: string; value: number; icon: ReactNode }) {
  const clean = value === 0;

  return (
    <article className={`min-h-[94px] rounded-[22px] border p-3 text-center ${clean ? "border-emerald-100 bg-emerald-50" : "border-orange-100 bg-orange-50"}`}>
      <span className={`mx-auto flex h-9 w-9 items-center justify-center rounded-[15px] bg-white shadow-sm ${clean ? "text-emerald-700" : "text-orange-700"}`}>
        {icon}
      </span>
      <p className={`mt-2 text-[18px] font-black ${clean ? "text-emerald-700" : "text-orange-700"}`}>{value}</p>
      <p className={`mt-0.5 text-[10px] font-black leading-tight ${clean ? "text-emerald-700" : "text-orange-700"}`}>{label}</p>
    </article>
  );
}

function PortfolioList({ items, emptyText, compact = false }: { items: QualityPortfolio[]; emptyText: string; compact?: boolean }) {
  if (!items.length) {
    return (
      <div className="rounded-[22px] border border-dashed border-[#DDE7F3] bg-[#F8FBFF] p-5 text-center">
        <Building2 className="mx-auto text-[#94A3B8]" size={28} />
        <p className="mt-2 text-[12px] font-black leading-5 text-[#64748B]">{emptyText}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <PortfolioRow key={item.id} item={item} compact={compact} />
      ))}
    </div>
  );
}

function PortfolioRow({ item, compact }: { item: QualityPortfolio; compact?: boolean }) {
  const score = asNumber(item.qualityScore);
  const tone = qualityTone(score);
  const scoreClass =
    tone === "emerald"
      ? "bg-emerald-50 text-emerald-700"
      : tone === "blue"
        ? "bg-blue-50 text-[#1557D6]"
        : tone === "amber"
          ? "bg-amber-50 text-amber-700"
          : "bg-red-50 text-red-700";

  return (
    <Link
      href={`/portfoy/${item.id}`}
      className="block rounded-[22px] border border-[#DDE7F3] bg-[#F8FBFF] p-3 shadow-sm active:scale-[0.99]"
    >
      <div className="flex items-start gap-2">
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] text-[12px] font-black ${scoreClass}`}>
          {score}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block break-words text-[13px] font-black leading-5 text-[#06194A]">
            {item.title || "EPH Portföy"}
          </span>
          <span className="mt-0.5 block break-words text-[10px] font-bold leading-4 text-[#64748B]">
            {item.portfolioNo || "EPH"} • {locationText(item)}
          </span>
          {!compact ? (
            <span className="mt-2 grid grid-cols-3 gap-1.5">
              <FlagBadge ok={Boolean(item.hasPhoto)} label="Foto" />
              <FlagBadge ok={Boolean(item.hasDocument)} label="Belge" />
              <FlagBadge ok={Boolean(item.hasLocation)} label="Konum" />
            </span>
          ) : null}
        </span>
        <span className="shrink-0 text-right">
          <span className={`block rounded-full px-2 py-1 text-[10px] font-black ${scoreClass}`}>
            {qualityLevel(score, item.qualityLevel)}
          </span>
          <span className="mt-1 block text-[10px] font-black text-[#64748B]">
            {statusLabel(item.status)}
          </span>
        </span>
      </div>
    </Link>
  );
}

function FlagBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`rounded-full px-2 py-1 text-center text-[9.5px] font-black ${ok ? "bg-emerald-50 text-emerald-700" : "bg-orange-50 text-orange-700"}`}>
      {ok ? "✓" : "!"} {label}
    </span>
  );
}
