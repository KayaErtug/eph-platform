"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bell,
  CheckCircle2,
  ClipboardCheck,
  Database,
  Eye,
  FileText,
  Gauge,
  Home,
  LogOut,
  Menu,
  MessageSquareText,
  Palette,
  RefreshCw,
  Settings,
  ShieldCheck,
  Sparkles,
  UserCheck,
  X,
} from "lucide-react";

import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";

type Stats = {
  totalUsers?: number;
  pendingUsers?: number;
  approvedUsers?: number;
  totalInvitations?: number;
  pendingDocuments?: number;
  pendingNominations?: number;
  pendingApplications?: number;
  byRole?: { role: string; count: number }[];
};

type VisitItem = {
  id?: string;
  userId?: string;
  page?: string;
  createdAt?: string;
  user?: {
    id?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    role?: string;
  };
};

type UnitItem = {
  id: string;
  approvalStatus?: string | null;
  isPoolVisible?: boolean;
};

type ApplicationItem = {
  id: string;
  status: string;
};

type AdminCard = {
  title: string;
  desc: string;
  href: string;
  icon: ReactNode;
  stat?: string | number;
  badge?: string;
  tone: "blue" | "emerald" | "amber" | "purple" | "rose" | "slate";
};

function getRoleLabel(role?: string | null) {
  const value = String(role || "").toUpperCase();

  const labels: Record<string, string> = {
    SUPER_ADMIN: "Süper Admin",
    ADMIN: "Admin",
    MODERATOR: "Moderatör",
    EMLAKCI: "Emlakçı",
    MUTEAHHIT: "Müteahhit",
    INSAAT_FIRMASI: "İnşaat Firması",
  };

  return labels[value] || value || "Yönetici";
}

function getInitials(firstName?: string | null, lastName?: string | null) {
  const first = String(firstName || "").trim().charAt(0);
  const last = String(lastName || "").trim().charAt(0);
  return `${first}${last}`.toLocaleUpperCase("tr-TR") || "EP";
}

function formatDate(value?: string | null) {
  if (!value) return "Tarih yok";

  return new Date(value).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toneClasses(tone: AdminCard["tone"]) {
  const map: Record<AdminCard["tone"], string> = {
    blue: "from-blue-600 to-indigo-700 text-white shadow-blue-950/20",
    emerald: "from-emerald-600 to-teal-700 text-white shadow-emerald-950/20",
    amber: "from-amber-500 to-orange-700 text-white shadow-amber-950/20",
    purple: "from-violet-600 to-fuchsia-700 text-white shadow-purple-950/20",
    rose: "from-rose-600 to-red-700 text-white shadow-rose-950/20",
    slate: "from-slate-800 to-slate-950 text-white shadow-slate-950/20",
  };

  return map[tone];
}

function presenceLabel(value?: string | null) {
  if (!value) return "Offline";

  const diff = Date.now() - new Date(value).getTime();

  if (diff < 1000 * 60 * 5) return "Online";
  if (diff < 1000 * 60 * 20) return "Away";

  return "Offline";
}

export default function AdminPage() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [units, setUnits] = useState<UnitItem[]>([]);
  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const [visits, setVisits] = useState<VisitItem[]>([]);
  const [error, setError] = useState("");

  const role = String(user?.role || "").toUpperCase();
  const canAccess = ["ADMIN", "SUPER_ADMIN", "MODERATOR"].includes(role);
  const isSuperAdmin = role === "SUPER_ADMIN";

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    if (!user) {
      router.push("/giris");
      return;
    }

    if (!canAccess) {
      router.push("/dashboard");
      return;
    }

    fetchDashboard();
  }, [hydrated, user?.id, user?.role]);

  const fetchDashboard = async () => {
    setLoading(true);
    setError("");

    try {
      const [statsResult, unitsResult, applicationsResult, visitsResult] =
        await Promise.allSettled([
          api.get("/admin/stats"),
          api.get("/units/admin/portfolio-approvals?status=ALL"),
          api.get("/admin/applications?status=all"),
          api.get("/visits"),
        ]);

      if (statsResult.status === "fulfilled") setStats(statsResult.value.data || null);
      if (unitsResult.status === "fulfilled") setUnits(Array.isArray(unitsResult.value.data) ? unitsResult.value.data : []);
      if (applicationsResult.status === "fulfilled") setApplications(Array.isArray(applicationsResult.value.data) ? applicationsResult.value.data : []);
      if (visitsResult.status === "fulfilled") setVisits(Array.isArray(visitsResult.value.data) ? visitsResult.value.data : []);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Yönetim merkezi bilgileri yüklenemedi.");
    } finally {
      setLoading(false);
    }
  };

  const portfolioCounts = useMemo(() => {
    const waiting = units.filter((item) =>
      ["BELGE_BEKLENIYOR", "INCELEMEYE_GONDERILDI"].includes(String(item.approvalStatus || "")),
    ).length;

    const reviewing = units.filter((item) => item.approvalStatus === "INCELEMEDE").length;
    const approved = units.filter((item) => item.approvalStatus === "ONAYLANDI").length;
    const pool = units.filter((item) => item.approvalStatus === "HAVUZDA" || item.isPoolVisible).length;

    return { total: units.length, waiting, reviewing, approved, pool };
  }, [units]);

  const pendingApplications = useMemo(() => {
    return applications.filter((item) => String(item.status || "").toUpperCase() === "PENDING").length;
  }, [applications]);

  const trafficCounts = useMemo(() => {
    const latestByUser = new Map<string, VisitItem>();

    for (const visit of visits) {
      const id = visit.user?.id || visit.userId;
      if (!id) continue;

      const current = latestByUser.get(id);
      const currentTime = new Date(current?.createdAt || 0).getTime();
      const nextTime = new Date(visit.createdAt || 0).getTime();

      if (!current || nextTime > currentTime) latestByUser.set(id, visit);
    }

    const rows = Array.from(latestByUser.values());

    return {
      total: rows.length,
      online: rows.filter((item) => presenceLabel(item.createdAt) === "Online").length,
      away: rows.filter((item) => presenceLabel(item.createdAt) === "Away").length,
    };
  }, [visits]);

  const cards: AdminCard[] = [
    {
      title: "Portföy Onayları",
      desc: "Belgeli portföyleri incele, onayla ve havuza al.",
      href: "/admin/portfolio-approvals",
      icon: <ClipboardCheck size={24} />,
      stat: portfolioCounts.waiting,
      badge: "Bekleyen",
      tone: "blue",
    },
    {
      title: "Katılım Talepleri",
      desc: "Yeni üyelik başvurularını ve referanslı talepleri yönet.",
      href: "/admin/katilim-talepleri",
      icon: <UserCheck size={24} />,
      stat: pendingApplications || stats?.pendingApplications || 0,
      badge: "Başvuru",
      tone: "emerald",
    },
    {
      title: "Sistem Mesajları",
      desc: "Üyelere duyuru, uyarı ve bilgilendirme gönder.",
      href: "/admin/system-messages",
      icon: <MessageSquareText size={24} />,
      stat: "Aktif",
      badge: "Mesaj",
      tone: "purple",
    },
    {
      title: "Kullanıcı Yönetimi",
      desc: "Üyeleri, rollerini ve onay durumlarını kontrol et.",
      href: "/admin#users",
      icon: <ShieldCheck size={24} />,
      stat: stats?.pendingUsers || 0,
      badge: "Bekleyen Üye",
      tone: "amber",
    },
    {
      title: "Trafik Merkezi",
      desc: "Online kullanıcıları, ziyaretleri ve canlı hareketi izle.",
      href: "/admin#traffic",
      icon: <Activity size={24} />,
      stat: trafficCounts.online,
      badge: "Online",
      tone: "slate",
    },
    {
      title: "Lina Merkezi",
      desc: "Lina AI durumunu, talepleri ve yönlendirmeleri takip et.",
      href: "/lina",
      icon: <Sparkles size={24} />,
      stat: "AI",
      badge: "Asistan",
      tone: "rose",
    },
    {
      title: "Tema Yönetimi",
      desc: "Turan Theme ve ilerideki tema ayarlarını yönet.",
      href: isSuperAdmin ? "/admin/themes" : "/admin",
      icon: <Palette size={24} />,
      stat: isSuperAdmin ? "Açık" : "Kilitli",
      badge: "SUPER_ADMIN",
      tone: "slate",
    },
    {
      title: "Sistem Ayarları",
      desc: "Platform ayarları, güvenlik ve bakım notları.",
      href: isSuperAdmin ? "/admin/settings" : "/admin",
      icon: <Settings size={24} />,
      stat: isSuperAdmin ? "Yetkili" : "Sınırlı",
      badge: "Ayar",
      tone: "blue",
    },
  ];

  const latestVisits = useMemo(() => {
    return [...visits]
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .slice(0, 5);
  }, [visits]);

  if (!hydrated || loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#071427] text-white">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-white/20 border-t-white" />
          <p className="mt-5 text-[12px] font-black uppercase tracking-[0.24em] text-white/60">EPH Yönetim Merkezi Açılıyor</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#071427] text-white">
      {menuOpen && (
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm lg:hidden" onClick={() => setMenuOpen(false)}>
          <aside className="h-full w-[84%] max-w-[340px] bg-[#0B1B33] p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between">
              <AdminBrand />
              <button onClick={() => setMenuOpen(false)} className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white">
                <X size={18} />
              </button>
            </div>

            <div className="mt-6 space-y-2">
              <SideLink href="/admin" icon={<Gauge size={18} />} label="Yönetim Merkezi" active />
              <SideLink href="/admin/portfolio-approvals" icon={<ClipboardCheck size={18} />} label="Portföy Onayları" />
              <SideLink href="/admin/katilim-talepleri" icon={<UserCheck size={18} />} label="Katılım Talepleri" />
              <SideLink href="/admin/system-messages" icon={<MessageSquareText size={18} />} label="Sistem Mesajları" />
              <SideLink href="/dashboard" icon={<Home size={18} />} label="Ana Sayfa" />
            </div>
          </aside>
        </div>
      )}

      <div className="lg:flex">
        <aside className="hidden min-h-screen w-[280px] shrink-0 border-r border-white/10 bg-[#061225] p-5 lg:sticky lg:top-0 lg:block">
          <AdminBrand />

          <nav className="mt-8 space-y-2">
            <SideLink href="/admin" icon={<Gauge size={18} />} label="Yönetim Merkezi" active />
            <SideLink href="/admin/portfolio-approvals" icon={<ClipboardCheck size={18} />} label="Portföy Onayları" badge={portfolioCounts.waiting} />
            <SideLink href="/admin/katilim-talepleri" icon={<UserCheck size={18} />} label="Katılım Talepleri" badge={pendingApplications || stats?.pendingApplications || 0} />
            <SideLink href="/admin/system-messages" icon={<MessageSquareText size={18} />} label="Sistem Mesajları" />
            <SideLink href="/admin#traffic" icon={<Activity size={18} />} label="Trafik Merkezi" />
            <SideLink href="/lina" icon={<Sparkles size={18} />} label="Lina Merkezi" />
            <SideLink href="/dashboard" icon={<Home size={18} />} label="Ana Sayfa" />
          </nav>

          <div className="mt-8 rounded-[26px] border border-white/10 bg-white/[0.04] p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/40">Sistem Durumu</p>
            <div className="mt-3 flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
              <span className="text-[13px] font-black text-white">Aktif</span>
            </div>
            <p className="mt-2 text-[12px] font-semibold leading-5 text-white/50">Backend, frontend ve PWA canlı ortamda çalışıyor.</p>
          </div>
        </aside>

        <section className="min-w-0 flex-1">
          <header className="sticky top-0 z-40 border-b border-white/10 bg-[#071427]/92 px-4 py-3 backdrop-blur-xl lg:px-7">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <button onClick={() => setMenuOpen(true)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white lg:hidden">
                  <Menu size={20} />
                </button>

                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-sky-300">Admin V2</p>
                  <h1 className="truncate text-[20px] font-black tracking-[-0.04em] text-white sm:text-[24px]">Yönetim Merkezi</h1>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button onClick={fetchDashboard} className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white">
                  <RefreshCw size={18} />
                </button>

                <button className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white">
                  <Bell size={18} />
                  {portfolioCounts.waiting > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-black text-white">{portfolioCounts.waiting}</span>
                  )}
                </button>

                <button onClick={() => { logout(); router.push("/giris"); }} className="flex h-11 w-11 items-center justify-center rounded-2xl border border-rose-400/30 bg-rose-500/10 text-rose-200">
                  <LogOut size={18} />
                </button>
              </div>
            </div>
          </header>

          <div className="px-3 py-4 pb-28 lg:px-7 lg:py-7">
            {error && <div className="mb-4 rounded-[22px] border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-center text-[13px] font-black text-rose-100">{error}</div>}

            <section className="relative overflow-hidden rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_20%_15%,rgba(59,130,246,0.28),transparent_30%),linear-gradient(135deg,#0B1B33,#071427_55%,#020617)] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.24)] lg:p-7">
              <div className="absolute -right-12 -top-16 h-48 w-48 rounded-full bg-blue-500/20 blur-3xl" />
              <div className="absolute -bottom-24 left-16 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl" />

              <div className="relative grid gap-5 lg:grid-cols-[1fr_320px] lg:items-center">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                    <ShieldCheck size={15} className="text-emerald-300" />
                    <span className="text-[11px] font-black uppercase tracking-[0.16em] text-white/70">Premium Yönetim Paneli</span>
                  </div>

                  <h2 className="mt-4 max-w-3xl text-[28px] font-black leading-none tracking-[-0.06em] text-white sm:text-[38px] lg:text-[48px]">EPH yönetimi artık daha sade, hızlı ve kontrollü.</h2>

                  <p className="mt-4 max-w-2xl text-[14px] font-semibold leading-6 text-white/62">Portföy onayları, katılım talepleri, sistem mesajları ve canlı trafik tek merkezden yönetilir.</p>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <Link href="/admin/portfolio-approvals" className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl bg-white px-4 text-[13px] font-black text-[#071427]">
                      Portföy Onaylarına Git <ArrowRight size={17} />
                    </Link>

                    <Link href="/dashboard" className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 text-[13px] font-black text-white">Ana Sayfa</Link>
                  </div>
                </div>

                <div className="rounded-[28px] border border-white/10 bg-white/[0.06] p-4 backdrop-blur">
                  <div className="flex items-center gap-3">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-[#071427] text-[17px] font-black">{getInitials(user?.firstName, user?.lastName)}</div>
                    <div className="min-w-0">
                      <p className="truncate text-[16px] font-black text-white">{[user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Yönetici"}</p>
                      <p className="mt-0.5 text-[12px] font-bold text-white/50">{getRoleLabel(user?.role)}</p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <MiniMetric label="Bekleyen Portföy" value={portfolioCounts.waiting} />
                    <MiniMetric label="Online" value={trafficCounts.online} />
                    <MiniMetric label="Başvuru" value={pendingApplications || stats?.pendingApplications || 0} />
                    <MiniMetric label="Toplam Üye" value={stats?.totalUsers || 0} />
                  </div>
                </div>
              </div>
            </section>

            <section className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:mt-6">
              <QuickStat icon={<ClipboardCheck size={19} />} label="Portföy" value={portfolioCounts.total} />
              <QuickStat icon={<AlertTriangle size={19} />} label="Bekleyen" value={portfolioCounts.waiting} />
              <QuickStat icon={<CheckCircle2 size={19} />} label="Onaylı" value={portfolioCounts.approved} />
              <QuickStat icon={<Database size={19} />} label="Havuz" value={portfolioCounts.pool} />
            </section>

            <section className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {cards.map((card) => <AdminActionCard key={card.title} card={card} />)}
            </section>

            <section className="mt-4 grid gap-3 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-[28px] border border-white/10 bg-white/[0.06] p-4 backdrop-blur">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-sky-300">Approval</p>
                    <h2 className="mt-1 text-[18px] font-black text-white">Portföy Onay Özeti</h2>
                  </div>

                  <Link href="/admin/portfolio-approvals" className="inline-flex h-10 items-center justify-center rounded-2xl bg-white px-3 text-[12px] font-black text-[#071427]">Aç</Link>
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-5">
                  <StatusBox label="Toplam" value={portfolioCounts.total} />
                  <StatusBox label="Bekleyen" value={portfolioCounts.waiting} />
                  <StatusBox label="İnceleme" value={portfolioCounts.reviewing} />
                  <StatusBox label="Onay" value={portfolioCounts.approved} />
                  <StatusBox label="Havuz" value={portfolioCounts.pool} />
                </div>
              </div>

              <div className="rounded-[28px] border border-white/10 bg-white/[0.06] p-4 backdrop-blur">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300">Canlı Trafik</p>
                    <h2 className="mt-1 text-[18px] font-black text-white">Son Hareketler</h2>
                  </div>
                  <Eye size={20} className="text-white/50" />
                </div>

                <div className="mt-4 space-y-2">
                  {latestVisits.length === 0 ? (
                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-4 text-center text-[12px] font-bold text-white/50">Henüz trafik kaydı görünmüyor.</div>
                  ) : (
                    latestVisits.map((visit, index) => (
                      <div key={`${visit.id || visit.userId || "visit"}-${index}`} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5">
                        <div className="min-w-0">
                          <p className="truncate text-[12px] font-black text-white">{[visit.user?.firstName, visit.user?.lastName].filter(Boolean).join(" ") || "Ziyaretçi"}</p>
                          <p className="mt-0.5 truncate text-[11px] font-semibold text-white/42">{visit.page || "Sayfa bilgisi yok"}</p>
                        </div>
                        <span className="shrink-0 text-[10px] font-bold text-white/40">{formatDate(visit.createdAt)}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </section>
          </div>

          <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-[#071427]/95 px-2 py-2 backdrop-blur-xl lg:hidden">
            <div className="grid grid-cols-5 gap-1">
              <MobileNav href="/admin" icon={<Gauge size={20} />} label="Panel" active />
              <MobileNav href="/admin/portfolio-approvals" icon={<ClipboardCheck size={20} />} label="Onay" />
              <MobileNav href="/admin/katilim-talepleri" icon={<UserCheck size={20} />} label="Katılım" />
              <MobileNav href="/admin/system-messages" icon={<FileText size={20} />} label="Mesaj" />
              <MobileNav href="/dashboard" icon={<Home size={20} />} label="Ana" />
            </div>
          </nav>
        </section>
      </div>
    </main>
  );
}

function AdminBrand() {
  return (
    <Link href="/admin" className="flex items-center gap-3">
      <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-white text-[16px] font-black text-[#071427] shadow-lg shadow-black/20">EPH</div>
      <div>
        <p className="text-[16px] font-black tracking-[-0.04em] text-white">EPH Admin</p>
        <p className="text-[11px] font-bold text-white/42">Yönetim Merkezi</p>
      </div>
    </Link>
  );
}

function SideLink({ href, icon, label, active, badge }: { href: string; icon: ReactNode; label: string; active?: boolean; badge?: number }) {
  return (
    <Link href={href} className={`flex min-h-[46px] items-center justify-between gap-3 rounded-2xl px-3 text-[13px] font-black transition ${active ? "bg-white text-[#071427]" : "text-white/66 hover:bg-white/10 hover:text-white"}`}>
      <span className="flex items-center gap-3">{icon}{label}</span>
      {Boolean(badge) && <span className={`flex h-6 min-w-6 items-center justify-center rounded-full px-2 text-[10px] font-black ${active ? "bg-[#071427] text-white" : "bg-rose-600 text-white"}`}>{badge}</span>}
    </Link>
  );
}

function MiniMetric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.05] px-3 py-3 text-center">
      <p className="text-[19px] font-black text-white">{value}</p>
      <p className="mt-1 text-[10px] font-black uppercase tracking-[0.12em] text-white/42">{label}</p>
    </div>
  );
}

function QuickStat({ icon, label, value }: { icon: ReactNode; label: string; value: number | string }) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-white/[0.06] p-3 backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-[#071427]">{icon}</div>
        <p className="text-[26px] font-black tracking-[-0.05em] text-white">{value}</p>
      </div>
      <p className="mt-2 text-center text-[11px] font-black uppercase tracking-[0.14em] text-white/45">{label}</p>
    </div>
  );
}

function AdminActionCard({ card }: { card: AdminCard }) {
  return (
    <Link href={card.href} className={`group relative overflow-hidden rounded-[28px] bg-gradient-to-br ${toneClasses(card.tone)} p-4 shadow-[0_18px_46px_rgba(0,0,0,0.22)] transition hover:-translate-y-0.5`}>
      <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-white/16 blur-2xl transition group-hover:bg-white/24" />
      <div className="relative flex items-start justify-between gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/18 ring-1 ring-white/18">{card.icon}</div>
        <div className="rounded-full bg-black/18 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-white/80">{card.badge}</div>
      </div>
      <div className="relative mt-6">
        <div className="flex items-end justify-between gap-3">
          <h3 className="text-[18px] font-black leading-tight tracking-[-0.04em]">{card.title}</h3>
          <span className="text-[25px] font-black leading-none tracking-[-0.05em]">{card.stat}</span>
        </div>
        <p className="mt-2 min-h-[42px] text-[12px] font-semibold leading-5 text-white/72">{card.desc}</p>
        <div className="mt-4 flex items-center justify-between">
          <span className="text-[12px] font-black text-white">Aç</span>
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#071427] transition group-hover:translate-x-1"><ArrowRight size={17} /></span>
        </div>
      </div>
    </Link>
  );
}

function StatusBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3 text-center">
      <p className="text-[24px] font-black tracking-[-0.05em] text-white">{value}</p>
      <p className="mt-1 text-[10px] font-black uppercase tracking-[0.12em] text-white/42">{label}</p>
    </div>
  );
}

function MobileNav({ href, icon, label, active }: { href: string; icon: ReactNode; label: string; active?: boolean }) {
  return (
    <Link href={href} className={`flex min-h-[54px] flex-col items-center justify-center gap-1 rounded-2xl text-[10px] font-black ${active ? "bg-white text-[#071427]" : "text-white/55 hover:bg-white/10 hover:text-white"}`}>
      {icon}
      {label}
    </Link>
  );
}
