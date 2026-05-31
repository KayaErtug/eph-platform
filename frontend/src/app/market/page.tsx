"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BarChart3,
  Building2,
  CircleUserRound,
  Crown,
  Eye,
  Flame,
  Home,
  LineChart,
  Loader2,
  LogOut,
  MapPin,
  MessageCircle,
  Radar,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UsersRound,
  WalletCards,
  Zap,
} from "lucide-react";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";

type Project = {
  id?: string;
  name?: string;
  city?: string;
  district?: string;
  address?: string;
  owner?: {
    firstName?: string;
    lastName?: string;
    role?: string;
  } | null;
};

type Unit = {
  id: string;
  type: string;
  floor?: number | null;
  number?: string | null;
  roomCount?: string | null;
  area?: number | null;
  price?: number | null;
  status: string;
  isVerified?: boolean;
  isOffMarket?: boolean;
  tapuVerified?: boolean;
  photoVerified?: boolean;
  yetkiVerified?: boolean;
  description?: string | null;
  createdAt?: string;
  project?: Project | null;
};

type DashboardSummary = {
  stats?: {
    totalUnits?: number;
    totalCustomers?: number;
    totalVisits?: number;
    totalProjects?: number;
  };
};

const TYPE_LABELS: Record<string, string> = {
  DAIRE: "Daire",
  VILLA: "Villa",
  REZIDANS: "Rezidans",
  MUSTAK_EV: "Müstakil Ev",
  ARSA: "Arsa",
  TARLA: "Tarla",
  OFIS_BURO: "Ofis/Büro",
  DUKKAN_MAGAZA: "Dükkan/Mağaza",
};

const STATUS_LABELS: Record<string, string> = {
  SATILIK: "Satılık",
  KIRALIK: "Kiralık",
  GUNLUK_KIRALIK: "Günlük Kiralık",
  DEVREN_SATILIK: "Devren Satılık",
  DEVREN_KIRALIK: "Devren Kiralık",
  INSAAT_PROJESI: "İnşaat Projesi",
  KAT_KARSILIGI: "Kat Karşılığı",
  REZERVE: "Rezerve",
  SATILDI: "Satıldı",
  KIRALANDII: "Kiralandı",
  PASIF: "Pasif",
};

const statusOptions = [
  { value: "", label: "Tüm Durumlar" },
  { value: "SATILIK", label: "Satılık" },
  { value: "KIRALIK", label: "Kiralık" },
  { value: "INSAAT_PROJESI", label: "İnşaat Projesi" },
  { value: "KAT_KARSILIGI", label: "Kat Karşılığı" },
  { value: "SATILDI", label: "Satıldı" },
  { value: "PASIF", label: "Pasif" },
];

const typeOptions = [
  { value: "", label: "Tüm Tipler" },
  { value: "DAIRE", label: "Daire" },
  { value: "VILLA", label: "Villa" },
  { value: "REZIDANS", label: "Rezidans" },
  { value: "ARSA", label: "Arsa" },
  { value: "TARLA", label: "Tarla" },
  { value: "OFIS_BURO", label: "Ofis/Büro" },
  { value: "DUKKAN_MAGAZA", label: "Dükkan/Mağaza" },
];

function money(value?: number | null) {
  if (!value) return "—";
  return `${value.toLocaleString("tr-TR")} ₺`;
}

function shortMoney(value: number) {
  if (!value) return "0 ₺";
  if (value >= 1000000000) return `${(value / 1000000000).toFixed(1)}B ₺`;
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M ₺`;
  return `${value.toLocaleString("tr-TR")} ₺`;
}

function unitTitle(unit: Unit) {
  return unit.project?.name || `${TYPE_LABELS[unit.type] || unit.type} Portföy`;
}

function unitLocation(unit: Unit) {
  return [unit.project?.district, unit.project?.city].filter(Boolean).join(" / ") || "Konum belirtilmedi";
}

function unitMeta(unit: Unit) {
  return [
    TYPE_LABELS[unit.type] || unit.type,
    unit.roomCount,
    unit.area ? `${unit.area} m²` : null,
    unit.floor != null ? `${unit.floor}. Kat` : null,
  ]
    .filter(Boolean)
    .join(" • ");
}

function statusLabel(value?: string) {
  return STATUS_LABELS[value || ""] || value || "Durum yok";
}

function statusTone(value?: string) {
  if (value === "SATILDI" || value === "KIRALANDII") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (value === "PASIF") {
    return "border-slate-200 bg-slate-50 text-slate-500";
  }

  if (value === "INSAAT_PROJESI" || value === "KAT_KARSILIGI") {
    return "border-violet-200 bg-violet-50 text-violet-700";
  }

  return "border-blue-200 bg-blue-50 text-blue-700";
}

function getAveragePrice(units: Unit[]) {
  const prices = units.map((unit) => Number(unit.price || 0)).filter((value) => value > 0);
  if (prices.length === 0) return 0;
  return Math.round(prices.reduce((sum, item) => sum + item, 0) / prices.length);
}

function getVerifiedCount(units: Unit[]) {
  return units.filter((unit) => unit.isVerified || (unit.tapuVerified && unit.photoVerified && unit.yetkiVerified)).length;
}

function getCityStats(units: Unit[]) {
  const map = units.reduce<Record<string, { count: number; value: number }>>((acc, unit) => {
    const city = unit.project?.city || "Bilinmeyen";
    if (!acc[city]) acc[city] = { count: 0, value: 0 };
    acc[city].count += 1;
    acc[city].value += Number(unit.price || 0);
    return acc;
  }, {});

  return Object.entries(map)
    .map(([city, data]) => ({ city, ...data }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
}

function getTypeStats(units: Unit[]) {
  const map = units.reduce<Record<string, number>>((acc, unit) => {
    const label = TYPE_LABELS[unit.type] || unit.type || "Diğer";
    acc[label] = (acc[label] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(map)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
}

export default function MarketPage() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [units, setUnits] = useState<Unit[]>([]);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

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

  const fetchData = async () => {
    setLoading(true);

    try {
      const [unitsRes, summaryRes] = await Promise.allSettled([
        api.get("/units"),
        api.get("/dashboard/summary"),
      ]);

      if (unitsRes.status === "fulfilled") {
        setUnits(Array.isArray(unitsRes.value.data) ? unitsRes.value.data : []);
      }

      if (summaryRes.status === "fulfilled") {
        setSummary(summaryRes.value.data || null);
      }
    } catch (error) {
      console.error(error);
      setUnits([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  const filteredUnits = useMemo(() => {
    const q = search.trim().toLocaleLowerCase("tr-TR");

    return units.filter((unit) => {
      const matchesSearch =
        !q ||
        [
          unit.project?.name,
          unit.project?.city,
          unit.project?.district,
          unit.project?.address,
          unit.type,
          unit.status,
          unit.roomCount,
          unit.number,
          unit.description,
        ]
          .filter(Boolean)
          .join(" ")
          .toLocaleLowerCase("tr-TR")
          .includes(q);

      const matchesStatus = !statusFilter || unit.status === statusFilter;
      const matchesType = !typeFilter || unit.type === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [units, search, statusFilter, typeFilter]);

  const stats = useMemo(() => {
    const totalValue = units.reduce((sum, unit) => sum + Number(unit.price || 0), 0);
    const activeUnits = units.filter((unit) => !["SATILDI", "KIRALANDII", "PASIF"].includes(unit.status)).length;
    const verifiedUnits = getVerifiedCount(units);
    const offMarketUnits = units.filter((unit) => unit.isOffMarket).length;

    return {
      totalValue,
      activeUnits,
      verifiedUnits,
      offMarketUnits,
      averagePrice: getAveragePrice(units),
      cities: getCityStats(units),
      types: getTypeStats(units),
      totalVisits: summary?.stats?.totalVisits || 0,
      totalCustomers: summary?.stats?.totalCustomers || 0,
    };
  }, [units, summary]);

  const handleLogout = () => {
    logout();
    router.push("/giris");
  };

  if (!hydrated || loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#020617]">
        <div className="flex flex-col items-center gap-4 text-white">
          <Loader2 className="animate-spin text-cyan-200" size={34} />
          <p className="text-xs font-black uppercase tracking-[0.28em] text-cyan-100">
            Piyasa verileri yükleniyor
          </p>
        </div>
      </main>
    );
  }

  if (user?.role === "ADMIN" || user?.role === "SUPER_ADMIN") {
    return (
      <AdminMarketIntelligenceCenter
        units={units}
        filteredUnits={filteredUnits}
        stats={stats}
        search={search}
        setSearch={setSearch}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        typeFilter={typeFilter}
        setTypeFilter={setTypeFilter}
        onRefresh={fetchData}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <main className="min-h-screen bg-[#F4F7FB] pb-28 text-[#111827]">
      <header className="sticky top-0 z-40 border-b border-white/60 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <Link href="/dashboard" className="flex items-center justify-center gap-3 no-underline lg:justify-start">
            <img src="/LOGO_EPH.png" alt="EPH" className="h-11 w-11 object-contain" />
            <div className="text-center lg:text-left">
              <p className="text-lg font-black text-[#0B1F44]">EPH Platform</p>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#C9A84C]">
                Piyasa Merkezi
              </p>
            </div>
          </Link>

          <nav className="flex flex-wrap items-center justify-center gap-2">
            {[
              ["/dashboard", "Ana Sayfa"],
              ["/network", "Network"],
              ["/stok", "Stok"],
              ["/crm", "CRM"],
              ["/market", "Piyasa"],
              ["/profil", "Profil"],
            ].map(([href, label]) => (
              <Link
                key={href}
                href={href}
                className={`rounded-full px-4 py-2 text-xs font-black no-underline transition ${
                  href === "/market"
                    ? "bg-[#0B1F44] text-white"
                    : "bg-white text-slate-500 hover:text-[#0B1F44]"
                }`}
              >
                {label}
              </Link>
            ))}

            <button
              onClick={handleLogout}
              className="rounded-full border border-red-100 bg-red-50 px-4 py-2 text-xs font-black text-red-600"
            >
              Çıkış
            </button>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-7">
        <section className="overflow-hidden rounded-[36px] bg-gradient-to-br from-[#0B1F44] via-[#123B7A] to-[#1D4ED8] p-7 text-white shadow-2xl shadow-[#1D4ED8]/20">
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-blue-100">
                <TrendingUp size={16} />
                Piyasa Nabzı
              </div>

              <h1 className="mt-5 text-[42px] font-black leading-tight tracking-tight md:text-[56px]">
                Gayrimenkul
                <span className="block text-[#F7DFA3]">Piyasa Merkezi</span>
              </h1>

              <p className="mt-4 max-w-2xl text-sm font-semibold leading-7 text-white/75">
                Portföy, şehir, değer ve aktif stok sinyallerini tek ekrandan takip et.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <MarketHeroMini label="Toplam Stok" value={String(units.length)} />
              <MarketHeroMini label="Aktif İlan" value={String(stats.activeUnits)} />
              <MarketHeroMini label="Ortalama" value={shortMoney(stats.averagePrice)} />
              <MarketHeroMini label="Değer" value={shortMoney(stats.totalValue)} />
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MarketStatCard icon={<Building2 size={20} />} title="Toplam Portföy" value={String(units.length)} note="EPH stok havuzu" />
          <MarketStatCard icon={<Flame size={20} />} title="Aktif Fırsat" value={String(stats.activeUnits)} note="Satış/kiralama açık" />
          <MarketStatCard icon={<ShieldCheck size={20} />} title="Doğrulanmış" value={String(stats.verifiedUnits)} note="Güvenli kayıt" />
          <MarketStatCard icon={<Eye size={20} />} title="Ziyaret" value={String(stats.totalVisits)} note="Platform trafiği" />
        </section>

        <section className="mt-6 rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-3 lg:grid-cols-[1fr_190px_190px_auto]">
            <div className="relative">
              <Search className="absolute left-4 top-3.5 text-slate-400" size={18} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Şehir, bölge, proje veya portföy ara..."
                className="h-12 w-full rounded-2xl border border-slate-200 bg-[#F8FAFC] pl-11 pr-4 text-sm font-bold outline-none focus:border-[#1D4ED8]"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="h-12 rounded-2xl border border-slate-200 bg-[#F8FAFC] px-4 text-sm font-bold outline-none focus:border-[#1D4ED8]"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
              className="h-12 rounded-2xl border border-slate-200 bg-[#F8FAFC] px-4 text-sm font-bold outline-none focus:border-[#1D4ED8]"
            >
              {typeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <button
              onClick={fetchData}
              className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#0B1F44] px-5 text-sm font-black text-white"
            >
              <RefreshCw size={17} />
              Yenile
            </button>
          </div>
        </section>

        <section className="mt-6 grid gap-5 lg:grid-cols-[1fr_360px]">
          <div className="space-y-4">
            {filteredUnits.length === 0 ? (
              <div className="rounded-[32px] border border-dashed border-slate-300 bg-white p-12 text-center">
                <p className="text-xl font-black text-slate-500">Piyasa verisi bulunamadı.</p>
                <p className="mt-2 text-sm font-semibold text-slate-400">
                  Filtreleri temizleyerek tekrar deneyebilirsin.
                </p>
              </div>
            ) : (
              filteredUnits.map((unit) => <MarketUnitCard key={unit.id} unit={unit} />)
            )}
          </div>

          <aside className="space-y-5">
            <MarketSidePanel title="Şehir Yoğunluğu" icon={<MapPin size={20} />}>
              {stats.cities.length === 0 ? (
                <p className="text-sm font-semibold text-slate-400">Şehir verisi yok.</p>
              ) : (
                <div className="space-y-3">
                  {stats.cities.map((city) => (
                    <MarketProgress
                      key={city.city}
                      label={city.city}
                      value={city.count}
                      max={Math.max(...stats.cities.map((item) => item.count), 1)}
                    />
                  ))}
                </div>
              )}
            </MarketSidePanel>

            <MarketSidePanel title="Portföy Tipleri" icon={<BarChart3 size={20} />}>
              {stats.types.length === 0 ? (
                <p className="text-sm font-semibold text-slate-400">Tip verisi yok.</p>
              ) : (
                <div className="space-y-3">
                  {stats.types.map((type) => (
                    <MarketProgress
                      key={type.label}
                      label={type.label}
                      value={type.count}
                      max={Math.max(...stats.types.map((item) => item.count), 1)}
                    />
                  ))}
                </div>
              )}
            </MarketSidePanel>
          </aside>
        </section>
      </section>

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white/95 px-5 pb-6 pt-3 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center justify-between">
          <BottomItem href="/dashboard" icon={<Home size={21} />} label="Ana Sayfa" />
          <BottomItem href="/stok" icon={<Building2 size={21} />} label="Stok" />
          <BottomItem href="/network" icon={<MessageCircle size={21} />} label="Network" />
          <BottomItem href="/crm" icon={<UsersRound size={21} />} label="CRM" />
          <BottomItem active href="/market" icon={<WalletCards size={21} />} label="Piyasa" />
          {(user?.role === "ADMIN" || user?.role === "SUPER_ADMIN") && (
            <BottomItem href="/admin" icon={<Crown size={21} />} label="Admin" />
          )}
        </div>
      </nav>
    </main>
  );
}

function AdminMarketIntelligenceCenter({
  units,
  filteredUnits,
  stats,
  search,
  setSearch,
  statusFilter,
  setStatusFilter,
  typeFilter,
  setTypeFilter,
  onRefresh,
  onLogout,
}: {
  units: Unit[];
  filteredUnits: Unit[];
  stats: {
    totalValue: number;
    activeUnits: number;
    verifiedUnits: number;
    offMarketUnits: number;
    averagePrice: number;
    cities: { city: string; count: number; value: number }[];
    types: { label: string; count: number }[];
    totalVisits: number;
    totalCustomers: number;
  };
  search: string;
  setSearch: (value: string) => void;
  statusFilter: string;
  setStatusFilter: (value: string) => void;
  typeFilter: string;
  setTypeFilter: (value: string) => void;
  onRefresh: () => void;
  onLogout: () => void;
}) {
  const router = useRouter();

  const liveSignals = [
    { label: "Toplam Değer", value: shortMoney(stats.totalValue), tone: "gold" },
    { label: "Aktif Stok", value: String(stats.activeUnits), tone: "cyan" },
    { label: "Ortalama Fiyat", value: shortMoney(stats.averagePrice), tone: "violet" },
    { label: "Doğrulanmış", value: String(stats.verifiedUnits), tone: "green" },
  ];

  return (
    <main className="min-h-screen overflow-hidden bg-[#020617] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_12%_10%,rgba(34,211,238,0.20),transparent_30%),radial-gradient(circle_at_86%_16%,rgba(201,168,76,0.20),transparent_26%),radial-gradient(circle_at_48%_94%,rgba(124,58,237,0.24),transparent_36%)]" />
      <div className="pointer-events-none fixed inset-0 opacity-[0.07] [background-image:linear-gradient(rgba(255,255,255,.35)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.35)_1px,transparent_1px)] [background-size:48px_48px]" />

      <header className="sticky top-0 z-50 border-b border-cyan-300/15 bg-[#020617]/85 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/dashboard")}
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-300/20 bg-white/5 text-cyan-100 transition hover:border-[#C9A84C] hover:text-[#F7DFA3]"
              title="Geri Dön"
            >
              <ArrowLeft size={19} />
            </button>

            <Link href="/dashboard" className="flex items-center gap-3 no-underline">
              <div className="relative">
                <div className="absolute inset-0 rounded-2xl bg-cyan-400/30 blur-xl" />
                <img src="/LOGO_EPH.png" alt="EPH" className="relative h-11 w-11 object-contain" />
              </div>

              <div>
                <div className="font-serif text-xl font-semibold text-white">EPH Market Core</div>
                <div className="text-[10px] font-black uppercase tracking-[0.28em] text-[#C9A84C]">
                  Intelligence Center
                </div>
              </div>
            </Link>
          </div>

          <nav className="flex flex-wrap items-center justify-center gap-2">
            {[
              ["/dashboard", "Mission"],
              ["/admin", "Admin"],
              ["/network", "Network"],
              ["/stok", "Stok"],
              ["/crm", "CRM"],
              ["/profil", "Profil"],
            ].map(([href, label]) => (
              <Link
                key={href}
                href={href}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-black text-slate-300 no-underline transition hover:border-cyan-300/40 hover:bg-cyan-300/10 hover:text-white"
              >
                {label}
              </Link>
            ))}

            <button
              onClick={onLogout}
              className="rounded-full border border-rose-400/25 bg-rose-500/10 px-4 py-2 text-xs font-black text-rose-200 transition hover:bg-rose-500/20"
            >
              Çıkış
            </button>
          </nav>
        </div>
      </header>

      <section className="relative z-10 mx-auto max-w-7xl px-5 py-8 pb-24">
        <section className="relative overflow-hidden rounded-[44px] border border-cyan-300/20 bg-[#061126]/90 p-6 shadow-2xl shadow-cyan-950/50 lg:p-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(34,211,238,0.25),transparent_28%),radial-gradient(circle_at_88%_12%,rgba(201,168,76,0.22),transparent_26%),radial-gradient(circle_at_50%_95%,rgba(124,58,237,0.28),transparent_38%)]" />
          <div className="absolute left-8 top-8 h-40 w-40 rounded-full border border-cyan-300/10" />
          <div className="absolute right-8 top-10 h-28 w-28 rounded-full border border-[#C9A84C]/10" />

          <div className="relative grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
            <div className="rounded-[34px] border border-white/10 bg-white/[0.06] p-6 backdrop-blur-xl">
              <div className="mb-6 flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-300/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-cyan-100">
                  <Radar size={15} />
                  Market Intelligence
                </span>

                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/25 bg-emerald-400/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-emerald-100">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-300" />
                  Canlı Veri
                </span>
              </div>

              <h1 className="font-serif text-4xl font-semibold leading-tight md:text-6xl">
                Piyasa
                <span className="block bg-gradient-to-r from-[#F7DFA3] via-cyan-100 to-white bg-clip-text text-transparent">
                  İstihbarat Merkezi
                </span>
              </h1>

              <p className="mt-4 max-w-2xl text-sm font-medium leading-7 text-slate-300">
                EPH stok havuzundaki fiyat, bölge, talep, doğrulama ve yoğunluk sinyalleri admin katmanında analiz edilir. Burası normal kullanıcı piyasası değil; operasyon karar ekranıdır.
              </p>

              <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {liveSignals.map((item) => (
                  <AdminSignal key={item.label} title={item.label} value={item.value} tone={item.tone} />
                ))}
              </div>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={onRefresh}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#C9A84C] px-5 py-3 text-sm font-black text-[#061126] shadow-xl shadow-[#C9A84C]/20 transition hover:scale-[1.02]"
                >
                  <RefreshCw size={17} />
                  Verileri Yenile
                </button>

                <Link
                  href="/stok"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-cyan-300/25 bg-cyan-300/10 px-5 py-3 text-sm font-black text-cyan-100 no-underline transition hover:bg-cyan-300/15"
                >
                  <Building2 size={17} />
                  Stok Komutası
                </Link>
              </div>
            </div>

            <div className="grid gap-4">
              <div className="rounded-[34px] border border-white/10 bg-black/20 p-5 backdrop-blur-xl">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-200/80">
                      Piyasa Radarı
                    </p>
                    <h2 className="mt-2 text-2xl font-black text-white">Bölgesel Sinyaller</h2>
                  </div>

                  <div className="flex h-14 w-14 items-center justify-center rounded-[22px] border border-[#C9A84C]/25 bg-[#C9A84C]/10 text-[#F7DFA3]">
                    <LineChart size={25} />
                  </div>
                </div>

                <div className="mt-5 grid gap-3">
                  {stats.cities.length === 0 ? (
                    <div className="rounded-[22px] border border-white/10 bg-white/[0.06] p-4 text-sm font-bold text-slate-400">
                      Bölgesel sinyal yok.
                    </div>
                  ) : (
                    stats.cities.slice(0, 4).map((city) => (
                      <AdminRadarLine
                        key={city.city}
                        label={city.city}
                        value={city.count}
                        total={Math.max(...stats.cities.map((item) => item.count), 1)}
                        tone="cyan"
                      />
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-[34px] border border-white/10 bg-white/[0.06] p-5 backdrop-blur-xl">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#C9A84C]">
                  AI Market Yorumu
                </p>
                <p className="mt-3 text-sm font-semibold leading-7 text-slate-300">
                  Envanter yoğunluğu, doğrulama oranı ve ortalama fiyat birlikte takip edilmeli. Off-market kayıtlar ayrı operasyon fırsatı olarak izlenir.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <AdminMetric label="Toplam Portföy" value={units.length} note="EPH piyasa havuzu" tone="cyan" />
          <AdminMetric label="Aktif Stok" value={stats.activeUnits} note="Pazara açık kayıt" tone="gold" />
          <AdminMetric label="Doğrulanmış" value={stats.verifiedUnits} note="Güvenli piyasa verisi" tone="green" />
          <AdminMetric label="Off-Market" value={stats.offMarketUnits} note="Gizli fırsat sinyali" tone="violet" />
        </section>

        <section className="mt-6 rounded-[34px] border border-cyan-300/15 bg-[#061126]/85 p-5 shadow-2xl shadow-cyan-950/30 backdrop-blur-xl">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#C9A84C]">
                Market Grid
              </p>
              <h2 className="mt-2 font-serif text-3xl font-semibold text-white">
                Canlı Piyasa Akışı
              </h2>
            </div>

            <div className="flex flex-col gap-2 lg:flex-row">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Bölge, proje, tip veya durum ara..."
                className="h-12 min-w-[260px] rounded-2xl border border-cyan-300/15 bg-white/10 px-4 text-sm font-bold text-white outline-none placeholder:text-slate-500 focus:border-cyan-300/40"
              />

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="h-12 rounded-2xl border border-cyan-300/15 bg-[#08172D] px-4 text-sm font-bold text-white outline-none focus:border-cyan-300/40"
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <select
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value)}
                className="h-12 rounded-2xl border border-cyan-300/15 bg-[#08172D] px-4 text-sm font-bold text-white outline-none focus:border-cyan-300/40"
              >
                {typeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            {filteredUnits.length === 0 ? (
              <div className="rounded-[28px] border border-dashed border-cyan-300/20 bg-white/[0.04] p-10 text-center text-sm font-bold text-slate-400 xl:col-span-2">
                Piyasa kaydı bulunamadı.
              </div>
            ) : (
              filteredUnits.slice(0, 30).map((unit) => <AdminMarketUnitCard key={unit.id} unit={unit} />)
            )}
          </div>
        </section>
      </section>
    </main>
  );
}

function MarketHeroMini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/10 p-4 text-center backdrop-blur">
      <p className="text-[22px] font-black leading-none">{value}</p>
      <p className="mt-2 text-[10px] font-bold uppercase tracking-wide text-white/60">{label}</p>
    </div>
  );
}

function MarketStatCard({ icon, title, value, note }: { icon: ReactNode; title: string; value: string; note: string }) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#EEF4FF] text-[#1D4ED8]">
        {icon}
      </div>
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">{title}</p>
      <p className="mt-2 text-[32px] font-black text-[#0B1F44]">{value}</p>
      <p className="mt-2 text-xs font-bold text-slate-500">{note}</p>
    </div>
  );
}

function MarketUnitCard({ unit }: { unit: Unit }) {
  return (
    <article className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex flex-wrap gap-2">
            <span className={`rounded-full border px-3 py-1 text-[11px] font-black ${statusTone(unit.status)}`}>
              {statusLabel(unit.status)}
            </span>
            {unit.isOffMarket && (
              <span className="rounded-full border border-[#C9A84C]/40 bg-[#FFF8E1] px-3 py-1 text-[11px] font-black text-[#8A671F]">
                Off-Market
              </span>
            )}
          </div>

          <h3 className="mt-4 text-xl font-black text-[#0B1F44]">{unitTitle(unit)}</h3>
          <p className="mt-1 text-sm font-semibold text-slate-500">{unitMeta(unit)}</p>
          <p className="mt-2 flex items-center gap-1 text-sm font-semibold text-slate-400">
            <MapPin size={14} />
            {unitLocation(unit)}
          </p>
        </div>

        <div className="rounded-2xl bg-[#F8FAFC] px-5 py-4 text-right">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Fiyat</p>
          <p className="mt-1 text-2xl font-black text-[#0B1F44]">{money(unit.price)}</p>
        </div>
      </div>
    </article>
  );
}

function MarketSidePanel({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#EEF4FF] text-[#1D4ED8]">
          {icon}
        </div>
        <h2 className="text-lg font-black text-[#0B1F44]">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function MarketProgress({ label, value, max }: { label: string; value: number; max: number }) {
  const width = Math.min(100, Math.round((value / max) * 100));
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-black text-[#0B1F44]">{label}</span>
        <span className="text-xs font-black text-slate-400">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-[#1D4ED8]" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

function BottomItem({ icon, label, active, href }: { icon: ReactNode; label: string; active?: boolean; href: string }) {
  return (
    <Link href={href} className={`flex w-14 flex-col items-center gap-1 no-underline ${active ? "text-[#1D4ED8]" : "text-slate-500"}`}>
      {icon}
      <span className="text-[10px] font-bold">{label}</span>
    </Link>
  );
}

function AdminSignal({ title, value, tone }: { title: string; value: string; tone: string }) {
  const tones: Record<string, string> = {
    cyan: "border-cyan-300/15 bg-cyan-300/10 text-cyan-100",
    gold: "border-[#C9A84C]/25 bg-[#C9A84C]/10 text-[#F7DFA3]",
    green: "border-emerald-300/20 bg-emerald-400/10 text-emerald-100",
    violet: "border-violet-300/20 bg-violet-400/10 text-violet-100",
  };

  return (
    <div className={`rounded-[24px] border p-4 backdrop-blur ${tones[tone] || tones.cyan}`}>
      <p className="text-[9px] font-black uppercase tracking-[0.22em] opacity-75">{title}</p>
      <p className="mt-2 text-xl font-black">{value}</p>
    </div>
  );
}

function AdminMetric({ label, value, note, tone }: { label: string; value: number; note: string; tone: string }) {
  const colors: Record<string, string> = {
    cyan: "border-cyan-300/20 bg-cyan-300/10 text-cyan-100",
    gold: "border-[#C9A84C]/25 bg-[#C9A84C]/10 text-[#F7DFA3]",
    green: "border-emerald-300/20 bg-emerald-400/10 text-emerald-100",
    violet: "border-violet-300/20 bg-violet-400/10 text-violet-100",
  };

  return (
    <div className={`rounded-[30px] border p-5 shadow-xl shadow-black/20 ${colors[tone] || colors.cyan}`}>
      <p className="text-[10px] font-black uppercase tracking-[0.22em] opacity-75">{label}</p>
      <p className="mt-3 font-serif text-5xl font-semibold">{value}</p>
      <p className="mt-3 text-xs font-bold opacity-70">{note}</p>
    </div>
  );
}

function AdminRadarLine({
  label,
  value,
  total,
  tone,
}: {
  label: string;
  value: number;
  total: number;
  tone: "cyan" | "gold" | "rose";
}) {
  const width = Math.min(100, Math.round((value / total) * 100));
  const bar = tone === "gold" ? "bg-[#C9A84C]" : tone === "rose" ? "bg-rose-400" : "bg-cyan-300";

  return (
    <div className="rounded-[22px] border border-white/10 bg-white/[0.06] p-4">
      <div className="mb-3 flex items-center justify-between gap-4">
        <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-300">{label}</span>
        <span className="text-sm font-black text-white">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div className={`h-full rounded-full ${bar}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

function AdminMarketUnitCard({ unit }: { unit: Unit }) {
  const verified = unit.isVerified || (unit.tapuVerified && unit.photoVerified && unit.yetkiVerified);
  const price = Number(unit.price || 0);

  return (
    <article className="group relative overflow-hidden rounded-[30px] border border-cyan-300/15 bg-white/[0.06] p-5 backdrop-blur-xl transition hover:-translate-y-1 hover:border-cyan-300/35 hover:bg-white/[0.09]">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/70 to-transparent opacity-0 transition group-hover:opacity-100" />

      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100">
              {statusLabel(unit.status)}
            </span>

            {unit.isOffMarket && (
              <span className="rounded-full border border-[#C9A84C]/25 bg-[#C9A84C]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#F7DFA3]">
                Off-Market
              </span>
            )}

            <span
              className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${
                verified
                  ? "border-emerald-300/25 bg-emerald-400/10 text-emerald-100"
                  : "border-rose-300/25 bg-rose-400/10 text-rose-100"
              }`}
            >
              {verified ? "Doğrulandı" : "Kontrol"}
            </span>
          </div>

          <h3 className="mt-4 font-serif text-2xl font-semibold text-white">{unitTitle(unit)}</h3>
          <p className="mt-1 text-sm font-semibold text-slate-400">
            {unitLocation(unit)} · No {unit.number || "—"}
          </p>
        </div>

        <div className="rounded-[22px] border border-[#C9A84C]/20 bg-[#C9A84C]/10 px-5 py-4 text-right">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#F7DFA3]/70">Piyasa Değeri</p>
          <p className="mt-1 font-serif text-2xl font-semibold text-[#F7DFA3]">
            {price ? `${price.toLocaleString("tr-TR")} ₺` : "—"}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-4">
        <AdminUnitMini label="Tip" value={TYPE_LABELS[unit.type] || unit.type || "—"} />
        <AdminUnitMini label="Oda" value={unit.roomCount || "—"} />
        <AdminUnitMini label="Alan" value={unit.area ? `${unit.area} m²` : "—"} />
        <AdminUnitMini label="Kat" value={unit.floor != null ? String(unit.floor) : "—"} />
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-3">
        <AdminCheck label="Tapu" active={Boolean(unit.tapuVerified)} />
        <AdminCheck label="Fotoğraf" active={Boolean(unit.photoVerified)} />
        <AdminCheck label="Yetki" active={Boolean(unit.yetkiVerified)} />
      </div>
    </article>
  );
}

function AdminUnitMini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-3">
      <p className="text-[9px] font-black uppercase tracking-[0.22em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-black text-slate-100">{value}</p>
    </div>
  );
}

function AdminCheck({ label, active }: { label: string; active: boolean }) {
  return (
    <div
      className={`rounded-2xl border px-4 py-3 text-center text-xs font-black uppercase tracking-[0.16em] ${
        active
          ? "border-emerald-300/25 bg-emerald-400/10 text-emerald-100"
          : "border-rose-300/25 bg-rose-400/10 text-rose-100"
      }`}
    >
      {active ? "✓" : "!"} {label}
    </div>
  );
}

