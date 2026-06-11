"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bell,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Eye,
  FileText,
  FileWarning,
  Filter,
  FolderOpen,
  Home,
  Loader2,
  LogOut,
  Menu,
  MoreVertical,
  RefreshCw,
  Search,
  Send,
  Settings,
  ShieldCheck,
  UsersRound,
  XCircle,
} from "lucide-react";

import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import AdminFlagBanner from "@/components/admin/AdminFlagBanner";

type PortfolioApprovalStatus =
  | "BELGE_BEKLENIYOR"
  | "INCELEMEYE_GONDERILDI"
  | "INCELEMEDE"
  | "EKSIK_BILGI_BEKLENIYOR"
  | "ONAYLANDI"
  | "HAVUZDA"
  | "REDDEDILDI";

type ApprovalUnit = {
  id: string;
  type: string;
  number: string;
  roomCount?: string | null;
  area?: number | null;
  price?: number | null;
  priceCurrency?: string | null;
  status: string;
  approvalStatus?: PortfolioApprovalStatus | string | null;
  approvalNote?: string | null;
  submittedForApprovalAt?: string | null;
  approvedAt?: string | null;
  rejectedAt?: string | null;
  isPoolVisible?: boolean;
  poolPublishedAt?: string | null;
  tapuVerified?: boolean;
  photoVerified?: boolean;
  yetkiVerified?: boolean;
  isVerified?: boolean;
  createdAt?: string;
  updatedAt?: string;
  project?: {
    id: string;
    name: string;
    city: string;
    district: string;
    address?: string | null;
    owner?: {
      id?: string;
      firstName?: string;
      lastName?: string;
      role?: string;
      memberCode?: string | null;
    };
  };
  images?: {
    id?: string;
    url?: string;
    supabaseUrl?: string;
    isCover?: boolean;
    sortOrder?: number;
  }[];
};

const STATUS_LABELS: Record<string, string> = {
  ALL: "Tümü",
  BELGE_BEKLENIYOR: "Belge Bekliyor",
  INCELEMEYE_GONDERILDI: "Gönderildi",
  INCELEMEDE: "İncelemede",
  EKSIK_BILGI_BEKLENIYOR: "Eksik Bilgi",
  ONAYLANDI: "Onaylandı",
  HAVUZDA: "Havuza Alındı",
  REDDEDILDI: "Reddedildi",
};

const FILTERS = [
  "ALL",
  "BELGE_BEKLENIYOR",
  "INCELEMEYE_GONDERILDI",
  "INCELEMEDE",
  "EKSIK_BILGI_BEKLENIYOR",
  "ONAYLANDI",
  "REDDEDILDI",
  "HAVUZDA",
];

const HEADER_THEMES = [
  {
    title: "Turan",
    quote:
      "Vatan ne Türkiye'dir Türklere, ne Türkistan; Vatan büyük ve müebbet bir ülkedir: Türklere Turan.",
    image: "/admin-themes/ziya-gokalp.jpg",
    bg: "from-[#061021] via-[#4B0F18] to-[#0B1325]",
    accent: "bg-red-700",
  },
  {
    title: "Cumhuriyet",
    quote:
      "Ey Türk istikbalinin evladı! İşte, bu ahval ve şerait içinde dahi vazifen, Türk istiklal ve cumhuriyetini kurtarmaktır! Muhtaç olduğun kudret, damarlarındaki asil kanda mevcuttur!",
    image: "/admin-themes/ataturk.jpg",
    bg: "from-[#0B1325] via-[#7F1D1D] to-[#111827]",
    accent: "bg-red-700",
  },
  {
    title: "İstiklal",
    quote:
      "Hakkıdır hür yaşamış bayrağımın hürriyet; Hakkıdır Hakk'a tapan milletimin istiklal!",
    image: "/admin-themes/mehmet-akif.jpg",
    bg: "from-[#111827] via-[#991B1B] to-[#1E3A8A]",
    accent: "bg-blue-700",
  },
  {
    title: "Orhun",
    quote:
      "Ey Türk! Üstte mavi gök çökmedikçe, altta yağız yer delinmedikçe, senin ilini ve töreni kim bozabilir?",
    image: "/admin-themes/bilge-kagan.jpg",
    bg: "from-[#0F172A] via-[#0F766E] to-[#1E3A8A]",
    accent: "bg-emerald-700",
  },
];

function getThemeOfHour() {
  const hour = new Date().getHours();
  return HEADER_THEMES[hour % HEADER_THEMES.length];
}

function money(value?: number | null, currency?: string | null) {
  if (!value) return "Fiyat yok";
  const symbol =
    currency === "USD"
      ? "$"
      : currency === "EUR"
        ? "€"
        : currency === "GBP"
          ? "£"
          : "₺";
  return `${Number(value).toLocaleString("tr-TR")} ${symbol}`;
}

function dateText(value?: string | null) {
  if (!value) return "Tarih yok";
  return new Date(value).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ownerName(item: ApprovalUnit) {
  return (
    [item.project?.owner?.firstName, item.project?.owner?.lastName]
      .filter(Boolean)
      .join(" ") || "Sahip bilgisi yok"
  );
}

function statusClass(status?: string | null) {
  if (status === "HAVUZDA") return "bg-emerald-50 text-emerald-700";
  if (status === "ONAYLANDI") return "bg-green-50 text-green-700";
  if (status === "REDDEDILDI") return "bg-rose-50 text-rose-700";
  if (status === "EKSIK_BILGI_BEKLENIYOR") return "bg-orange-50 text-orange-700";
  if (status === "INCELEMEDE") return "bg-blue-50 text-blue-700";
  if (status === "INCELEMEYE_GONDERILDI") return "bg-indigo-50 text-indigo-700";
  return "bg-amber-50 text-amber-700";
}

function portfolioCode(id: string) {
  const raw = String(id || "EPH").replace(/[^a-zA-Z0-9]/g, "");
  return `EPH-${raw.slice(0, 4).toUpperCase()}-${raw.slice(-4).toUpperCase()}`;
}

function coverImage(item: ApprovalUnit) {
  const images = Array.isArray(item.images) ? item.images : [];
  const sorted = [...images].sort((a, b) => {
    if (a.isCover !== b.isCover) return a.isCover ? -1 : 1;
    return Number(a.sortOrder || 0) - Number(b.sortOrder || 0);
  });
  return sorted[0]?.supabaseUrl || sorted[0]?.url || "";
}

function unitKind(item: ApprovalUnit) {
  const value = String(item.type || "").replaceAll("_", " ").toLocaleLowerCase("tr-TR");
  if (!value) return "Portföy";
  return value
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toLocaleUpperCase("tr-TR") + part.slice(1))
    .join(" ");
}

export default function PortfolioApprovalsPage() {
  const router = useRouter();
  const { user, hasHydrated, logout } = useAuthStore();
  const [items, setItems] = useState<ApprovalUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [query, setQuery] = useState("");
  const [actionLoading, setActionLoading] = useState("");
  const [error, setError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const theme = getThemeOfHour();

  const canAccess = ["MODERATOR", "ADMIN", "SUPER_ADMIN"].includes(
    String(user?.role || "").toUpperCase(),
  );

  useEffect(() => {
    if (!hasHydrated) return;

    if (!user) {
      router.push("/giris");
      return;
    }

    if (!canAccess) {
      router.push("/dashboard");
      return;
    }

    fetchItems();
  }, [hasHydrated, user?.id, user?.role]);

  const fetchItems = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/units/admin/portfolio-approvals?status=ALL");
      setItems(Array.isArray(response.data) ? response.data : []);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          "Portföy onay kayıtları yüklenemedi.",
      );
    } finally {
      setLoading(false);
    }
  };

  const counts = useMemo(() => {
    return {
      total: items.length,
      waiting: items.filter((x) =>
        ["BELGE_BEKLENIYOR", "INCELEMEYE_GONDERILDI"].includes(
          String(x.approvalStatus || ""),
        ),
      ).length,
      reviewing: items.filter((x) => x.approvalStatus === "INCELEMEDE").length,
      approved: items.filter((x) => x.approvalStatus === "ONAYLANDI").length,
      pool: items.filter((x) => x.approvalStatus === "HAVUZDA").length,
    };
  }, [items]);

  const filteredItems = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("tr-TR");

    return items.filter((item) => {
      const status = String(item.approvalStatus || "");
      const statusMatch = filter === "ALL" || status === filter;
      const waitingMatch =
        filter !== "BELGE_BEKLENIYOR" ||
        status === "BELGE_BEKLENIYOR";

      const haystack = [
        portfolioCode(item.id),
        item.project?.name,
        item.project?.city,
        item.project?.district,
        ownerName(item),
        unitKind(item),
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("tr-TR");

      return statusMatch && waitingMatch && (!q || haystack.includes(q));
    });
  }, [items, filter, query]);

  const act = async (id: string, action: string) => {
    setActionLoading(`${id}-${action}`);
    setError("");

    try {
      if (action === "review") {
        await api.post(`/units/${id}/mark-reviewing`, {
          note: "Portföy admin onay merkezinde incelemeye alındı.",
        });
      }

      if (action === "missing") {
        await api.post(`/units/${id}/request-missing-info`, {
          note: "Portföy için ek bilgi veya belge bekleniyor.",
        });
      }

      if (action === "approve") {
        await api.post(`/units/${id}/approve`, {
          note: "Portföy admin onay merkezinden onaylandı.",
        });
      }

      if (action === "reject") {
        await api.post(`/units/${id}/reject`, {
          note: "Portföy admin onay merkezinden reddedildi.",
        });
      }

      if (action === "pool") {
        await api.post(`/units/${id}/send-to-pool`);
      }

      await fetchItems();
    } catch (err: any) {
      setError(err?.response?.data?.message || "İşlem tamamlanamadı.");
    } finally {
      setActionLoading("");
    }
  };

  if (!hasHydrated || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F7FBFF]">
        <Loader2 className="animate-spin text-[#1557D6]" size={32} />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F5F7FB] text-[#111827]">
      <div className="lg:flex">
        <aside className="hidden min-h-screen w-[270px] shrink-0 bg-[#071427] text-white lg:sticky lg:top-0 lg:block">
          <SidebarContent
            counts={counts}
            onLogout={() => {
              logout();
              router.push("/giris");
            }}
          />
        </aside>

        {menuOpen && (
          <div
            className="fixed inset-0 z-[100] bg-slate-950/70 backdrop-blur-sm lg:hidden"
            onClick={() => setMenuOpen(false)}
          >
            <aside
              className="h-full w-[84%] max-w-[340px] bg-[#071427] text-white shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <SidebarContent
                counts={counts}
                onLogout={() => {
                  logout();
                  router.push("/giris");
                }}
              />
            </aside>
          </div>
        )}

        <section className="min-w-0 flex-1">
          <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur-xl lg:px-8">
            <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setMenuOpen(true)}
                  className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm lg:hidden"
                  aria-label="Menüyü aç"
                >
                  <Menu size={20} />
                </button>
                <div>
                  <h1 className="text-[20px] font-black tracking-[-0.04em] text-[#111827] lg:text-[26px]">
                    Portföy Onay Merkezi
                  </h1>
                  <p className="hidden text-[13px] font-semibold text-slate-500 sm:block">
                    Portföy başvurularını inceleyin, onaylayın ve yönetin.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm">
                  <Bell size={18} />
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-black text-white">
                    3
                  </span>
                </button>

                <div className="hidden items-center gap-2 rounded-2xl bg-white px-3 py-2 shadow-sm ring-1 ring-slate-200 sm:flex">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#4C1D95] text-[12px] font-black text-white">
                    {String(user?.firstName?.[0] || "Y").toUpperCase()}
                    {String(user?.lastName?.[0] || "K").toUpperCase()}
                  </span>
                  <div className="leading-tight">
                    <p className="text-[12px] font-black text-slate-900">
                      {[user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Yönetici"}
                    </p>
                    <p className="text-[11px] font-bold text-slate-500">
                      {user?.role || "Admin"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </header>

          <div className="mx-auto w-full max-w-[1180px] px-3 py-4 pb-28 lg:px-6 lg:py-7">
            <AdminFlagBanner className="rounded-[10px]" />

            <section className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <StatCard icon={<ClipboardCheck size={22} />} label="Toplam" value={counts.total} sub="Portföy" tone="slate" />
              <StatCard icon={<FileWarning size={22} />} label="Bekleyen" value={counts.waiting} sub="Portföy" tone="amber" />
              <StatCard icon={<ShieldCheck size={22} />} label="İnceleme" value={counts.reviewing} sub="Portföy" tone="blue" />
              <StatCard icon={<CheckCircle2 size={22} />} label="Onay" value={counts.approved} sub="Portföy" tone="green" />
              <StatCard icon={<Send size={22} />} label="Havuz" value={counts.pool} sub="Portföy" tone="purple" />
            </section>

            <section className="mt-5 rounded-[24px] border border-slate-200 bg-white p-3 shadow-[0_10px_32px_rgba(15,23,42,0.045)]">
              <div className="flex gap-2 overflow-x-auto pb-2">
                {FILTERS.map((key) => (
                  <button
                    key={key}
                    onClick={() => setFilter(key)}
                    className={`h-10 shrink-0 rounded-xl px-3 text-[12px] font-black ${
                      filter === key
                        ? "bg-[#071427] text-white shadow-lg shadow-slate-200"
                        : "border border-slate-200 bg-white text-slate-700"
                    }`}
                  >
                    {STATUS_LABELS[key]}
                  </button>
                ))}
              </div>

              <div className="grid gap-2 lg:grid-cols-[1fr_210px_210px_130px]">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Portföy adı, sahip veya kod ara..."
                    className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-center text-[13px] font-bold outline-none focus:border-slate-400 lg:text-left"
                  />
                </div>

                <select
                  value={filter}
                  onChange={(event) => setFilter(event.target.value)}
                  className="h-12 rounded-xl border border-slate-200 bg-white px-4 text-center text-[13px] font-black text-slate-700 outline-none focus:border-slate-400"
                >
                  {FILTERS.map((key) => (
                    <option key={key} value={key}>
                      {STATUS_LABELS[key]}
                    </option>
                  ))}
                </select>

                <select
                  className="h-12 rounded-xl border border-slate-200 bg-white px-4 text-center text-[13px] font-black text-slate-700 outline-none focus:border-slate-400"
                  defaultValue="all"
                >
                  <option value="all">Tüm Türler</option>
                  <option value="arsa">Arsa</option>
                  <option value="daire">Daire</option>
                  <option value="villa">Villa</option>
                </select>

                <button
                  onClick={fetchItems}
                  className="flex h-12 items-center justify-center gap-2 rounded-xl bg-[#071427] px-4 text-[13px] font-black text-white"
                >
                  <Filter size={17} />
                  Filtrele
                </button>
              </div>
            </section>

            {error && (
              <div className="mt-4 rounded-[20px] border border-rose-100 bg-rose-50 p-3 text-center text-[13px] font-black text-rose-700">
                {error}
              </div>
            )}

            {loading ? (
              <div className="mt-5 rounded-[28px] border border-slate-200 bg-white p-10 text-center shadow-sm">
                <Loader2 className="mx-auto animate-spin text-[#1557D6]" size={34} />
                <p className="mt-3 text-[13px] font-black text-slate-500">
                  Portföyler yükleniyor
                </p>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="mt-5 rounded-[28px] border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
                <ShieldCheck className="mx-auto text-emerald-600" size={38} />
                <p className="mt-3 text-[16px] font-black text-[#06194A]">
                  Bu filtrede portföy yok.
                </p>
              </div>
            ) : (
              <div className="mt-5 space-y-4">
                {filteredItems.map((item) => (
                  <PortfolioCard
                    key={item.id}
                    item={item}
                    actionLoading={actionLoading}
                    onAction={act}
                  />
                ))}
              </div>
            )}

            <div className="mt-6 flex flex-col items-center justify-between gap-3 text-[13px] font-bold text-slate-500 sm:flex-row">
              <span>Toplam {filteredItems.length} kayıt</span>
              <div className="flex items-center gap-2">
                <button className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500">
                  <ChevronLeft size={18} />
                </button>
                <button className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#071427] text-white">
                  1
                </button>
                <button className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500">
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </div>

          <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 px-2 py-2 backdrop-blur-xl lg:hidden">
            <div className="grid grid-cols-5 gap-1">
              <MobileNav href="/admin" icon={<Home size={21} />} label="Panel" />
              <MobileNav href="/admin/portfolio-approvals" icon={<CheckCircle2 size={21} />} label="Onaylar" active />
              <MobileNav href="/admin/system-messages" icon={<FileText size={21} />} label="Mesajlar" />
              <MobileNav href="/admin" icon={<Settings size={21} />} label="Sistem" />
              <MobileNav href="/profil" icon={<UsersRound size={21} />} label="Profil" />
            </div>
          </nav>
        </section>
      </div>
    </main>
  );
}

function SidebarContent({
  counts,
  onLogout,
}: {
  counts: { total: number; waiting: number; reviewing: number; approved: number; pool: number };
  onLogout: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col p-5">
      <Link href="/admin" className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-red-500/40 bg-red-600/10 text-red-400">
          <Home size={25} />
        </div>
        <div>
          <p className="text-[26px] font-black leading-none">EPH</p>
          <p className="mt-1 text-[12px] font-black uppercase tracking-[0.16em] text-slate-400">
            Yönetim Merkezi
          </p>
        </div>
      </Link>

      <nav className="mt-9 space-y-2">
        <SidebarItem href="/admin" icon={<Home size={19} />} label="Yönetim Paneli" />
        <SidebarSection label="Yönetim" />
        <SidebarItem href="/admin" icon={<UsersRound size={19} />} label="Kullanıcı Yönetimi" />
        <SidebarItem href="/admin/katilim-talepleri" icon={<ClipboardCheck size={19} />} label="Katılım Talepleri" />
        <SidebarItem href="/admin/portfolio-approvals" icon={<CheckCircle2 size={19} />} label="Portföy Onayları" active badge={counts.waiting || counts.total} />
        <SidebarItem href="/admin/referrals" icon={<UsersRound size={19} />} label="Referans Yönetimi" />
        <SidebarItem href="/admin/system-messages" icon={<FileText size={19} />} label="Sistem Mesajları" />
        <SidebarSection label="İçerik Yönetimi" />
        <SidebarItem href="/admin" icon={<Send size={19} />} label="Duyurular" />
        <SidebarItem href="/admin" icon={<Building2 size={19} />} label="Raporlar" />
        <SidebarSection label="Sistem" />
        <SidebarItem href="/admin" icon={<Settings size={19} />} label="Ayarlar" />
        <SidebarItem href="/admin" icon={<FileText size={19} />} label="Audit Log" />
      </nav>

      <button
        onClick={onLogout}
        className="mt-auto flex min-h-[50px] items-center gap-3 rounded-2xl border border-white/10 px-4 text-[14px] font-black text-red-300 transition hover:bg-red-500/10"
      >
        <LogOut size={19} />
        Çıkış Yap
      </button>
    </div>
  );
}

function SidebarSection({ label }: { label: string }) {
  return (
    <p className="px-2 pt-6 text-[12px] font-black uppercase tracking-[0.18em] text-slate-500">
      {label}
    </p>
  );
}

function SidebarItem({
  href,
  icon,
  label,
  active,
  badge,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      className={`flex min-h-[50px] items-center justify-between rounded-2xl px-4 text-[14px] font-black transition ${
        active
          ? "bg-red-700 text-white shadow-lg shadow-red-950/20"
          : "text-slate-200 hover:bg-white/8"
      }`}
    >
      <span className="flex items-center gap-3">
        {icon}
        {label}
      </span>
      {Boolean(badge) && (
        <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[11px] font-black text-white">
          {badge}
        </span>
      )}
    </Link>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  sub: string;
  tone: "slate" | "amber" | "blue" | "green" | "purple";
}) {
  const toneClass =
    tone === "amber"
      ? "bg-amber-500 text-white"
      : tone === "blue"
        ? "bg-blue-600 text-white"
        : tone === "green"
          ? "bg-emerald-600 text-white"
          : tone === "purple"
            ? "bg-purple-600 text-white"
            : "bg-[#071427] text-white";

  return (
    <div className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_10px_32px_rgba(15,23,42,0.055)]">
      <div className="flex items-center gap-3">
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${toneClass}`}>
          {icon}
        </div>
        <div>
          <p className="text-[12px] font-black uppercase text-slate-500">
            {label}
          </p>
          <p className="mt-1 text-[31px] font-black leading-none text-slate-950">
            {value}
          </p>
          <p className="mt-1 text-[13px] font-semibold text-slate-500">{sub}</p>
        </div>
      </div>
    </div>
  );
}

function PortfolioCard({
  item,
  actionLoading,
  onAction,
}: {
  item: ApprovalUnit;
  actionLoading: string;
  onAction: (id: string, action: string) => void;
}) {
  const image = coverImage(item);

  return (
    <article className="rounded-[26px] border border-slate-200 bg-white p-4 shadow-[0_10px_32px_rgba(15,23,42,0.045)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3">
          <div className="hidden h-[84px] w-[104px] shrink-0 overflow-hidden rounded-[18px] bg-slate-100 sm:block">
            {image ? (
              <img src={image} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-slate-400">
                <FolderOpen size={28} />
              </div>
            )}
          </div>

          <div className="min-w-0">
            <p className="text-[13px] font-black uppercase tracking-[0.16em] text-slate-400">
              {portfolioCode(item.id)}
            </p>
            <h2 className="mt-1 text-[22px] font-black leading-tight tracking-[-0.04em] text-slate-950">
              {item.project?.name || unitKind(item)}
            </h2>
            <p className="mt-1 text-[15px] font-semibold text-slate-600">
              {item.project?.district || "İlçe yok"} / {item.project?.city || "Şehir yok"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`shrink-0 rounded-full px-3 py-1.5 text-[12px] font-black ${statusClass(
              item.approvalStatus,
            )}`}
          >
            {STATUS_LABELS[String(item.approvalStatus || "")] || "Durum Yok"}
          </span>
          <button className="hidden h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-50 sm:flex">
            <MoreVertical size={18} />
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <InfoCard icon={<UsersRound size={18} />} label="Sahip" value={ownerName(item)} />
        <InfoCard icon={<span className="text-[17px] font-black">₺</span>} label="Fiyat" value={money(item.price, item.priceCurrency)} />
        <InfoCard icon={<CalendarDays size={18} />} label="Gönderim" value={dateText(item.submittedForApprovalAt || item.updatedAt)} />
        <InfoCard icon={<FolderOpen size={18} />} label="Tür" value={unitKind(item)} />
      </div>

      <div className="mt-3 grid grid-cols-4 gap-3">
        <DocumentStatus label="Yetki Belgesi" active={Boolean(item.yetkiVerified || item.isVerified)} />
        <DocumentStatus label="Tapu" active={Boolean(item.tapuVerified)} />
        <DocumentStatus label="Fotoğraf" active={Boolean(item.photoVerified)} />
        <DocumentStatus label="Havuz" active={Boolean(item.isPoolVisible || item.approvalStatus === "HAVUZDA")} />
      </div>

      {item.approvalNote && (
        <p className="mt-4 rounded-[18px] bg-amber-50 p-4 text-center text-[15px] font-semibold leading-6 text-amber-900">
          {item.approvalNote}
        </p>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <ActionButton
          label="İncele"
          icon={<Eye size={19} />}
          loading={actionLoading === `${item.id}-review`}
          onClick={() => onAction(item.id, "review")}
          className="bg-blue-50 text-blue-700"
        />
        <ActionButton
          label="Eksik Bilgi"
          icon={<FileWarning size={19} />}
          loading={actionLoading === `${item.id}-missing`}
          onClick={() => onAction(item.id, "missing")}
          className="bg-amber-50 text-amber-700"
        />
        <ActionButton
          label="Onayla"
          icon={<CheckCircle2 size={19} />}
          loading={actionLoading === `${item.id}-approve`}
          onClick={() => onAction(item.id, "approve")}
          className="bg-emerald-50 text-emerald-700"
        />
        <ActionButton
          label="Reddet"
          icon={<XCircle size={19} />}
          loading={actionLoading === `${item.id}-reject`}
          onClick={() => onAction(item.id, "reject")}
          className="bg-rose-50 text-rose-700"
        />
        <ActionButton
          label="Havuza Al"
          icon={<Send size={19} />}
          loading={actionLoading === `${item.id}-pool`}
          onClick={() => onAction(item.id, "pool")}
          className="bg-purple-50 text-purple-700"
        />
        <Link
          href={`/stok/${item.id}`}
          className="flex min-h-[62px] items-center justify-center gap-2 rounded-[18px] border border-slate-200 bg-white px-3 text-[16px] font-black text-slate-900"
        >
          <FileText size={19} />
          Detay
        </Link>
      </div>
    </article>
  );
}

function InfoCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[18px] border border-slate-100 bg-white p-4 shadow-[0_8px_22px_rgba(15,23,42,0.035)]">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-50 text-slate-800">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">
            {label}
          </p>
          <p className="mt-1 line-clamp-2 text-[14px] font-black leading-tight text-slate-950">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

function DocumentStatus({ label, active }: { label: string; active: boolean }) {
  return (
    <div className="rounded-[16px] border border-slate-100 bg-white p-3 text-center shadow-[0_8px_20px_rgba(15,23,42,0.03)]">
      <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">
        {label}
      </p>
      <span
        className={`mt-2 inline-flex min-w-[42px] items-center justify-center rounded-full px-3 py-1 text-[13px] font-black ${
          active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
        }`}
      >
        {active ? "✓" : "—"}
      </span>
    </div>
  );
}

function ActionButton({
  label,
  icon,
  loading,
  onClick,
  className,
}: {
  label: string;
  icon: React.ReactNode;
  loading: boolean;
  onClick: () => void;
  className: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className={`flex min-h-[62px] items-center justify-center gap-2 rounded-[18px] px-3 text-[16px] font-black disabled:opacity-60 ${className}`}
    >
      {loading ? <Loader2 className="animate-spin" size={19} /> : icon}
      {loading ? "İşleniyor" : label}
    </button>
  );
}

function MobileNav({
  href,
  icon,
  label,
  active,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex flex-col items-center justify-center rounded-2xl px-1 py-2 text-[10px] font-black ${
        active ? "bg-[#071427] text-white" : "text-slate-500"
      }`}
    >
      {icon}
      <span className="mt-1 truncate">{label}</span>
    </Link>
  );
}
