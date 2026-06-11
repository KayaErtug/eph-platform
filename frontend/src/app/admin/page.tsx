"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  ArrowRight,
  Bell,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  HelpCircle,
  Home,
  Loader2,
  LogOut,
  Megaphone,
  Menu,
  MessageCircle,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  UserPlus,
  UsersRound,
  X,
} from "lucide-react";

import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import AdminFlagBanner from "@/components/admin/AdminFlagBanner";

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

type ApprovalUnit = {
  id: string;
  approvalStatus?: string | null;
  isPoolVisible?: boolean;
};

type ApplicationItem = {
  id: string;
  status?: string | null;
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

type StatTone = "blue" | "orange" | "green" | "purple" | "cyan" | "rose" | "gray";

type StatCardItem = {
  label: string;
  value: number | string;
  sub: string;
  tone: StatTone;
  icon: ReactNode;
};

type ModuleCardItem = {
  title: string;
  desc: string;
  href: string;
  icon: ReactNode;
  tone: StatTone;
  count?: number | string;
  countTone?: StatTone;
  isNew?: boolean;
};

function getInitials(firstName?: string | null, lastName?: string | null) {
  const first = String(firstName || "").trim().charAt(0);
  const last = String(lastName || "").trim().charAt(0);
  return `${first}${last}`.toLocaleUpperCase("tr-TR") || "EP";
}

function todayText() {
  return new Date().toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function timeText() {
  return new Date().toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toneClasses(tone: StatTone) {
  const map: Record<StatTone, { box: string; text: string; badge: string }> = {
    blue: {
      box: "bg-blue-100 text-blue-700",
      text: "text-blue-700",
      badge: "bg-blue-600 text-white",
    },
    orange: {
      box: "bg-orange-100 text-orange-600",
      text: "text-orange-600",
      badge: "bg-orange-500 text-white",
    },
    green: {
      box: "bg-green-100 text-green-600",
      text: "text-green-600",
      badge: "bg-green-600 text-white",
    },
    purple: {
      box: "bg-violet-100 text-violet-700",
      text: "text-violet-700",
      badge: "bg-violet-600 text-white",
    },
    cyan: {
      box: "bg-cyan-100 text-cyan-600",
      text: "text-cyan-600",
      badge: "bg-cyan-500 text-white",
    },
    rose: {
      box: "bg-rose-100 text-rose-600",
      text: "text-rose-600",
      badge: "bg-rose-500 text-white",
    },
    gray: {
      box: "bg-slate-100 text-slate-600",
      text: "text-slate-600",
      badge: "bg-slate-500 text-white",
    },
  };

  return map[tone];
}

export default function AdminPage() {
  const router = useRouter();
  const { user, hasHydrated, logout } = useAuthStore();

  const [stats, setStats] = useState<Stats | null>(null);
  const [approvalItems, setApprovalItems] = useState<ApprovalUnit[]>([]);
  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const [visits, setVisits] = useState<VisitItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  const role = String(user?.role || "").toUpperCase();
  const canAccess = ["ADMIN", "SUPER_ADMIN", "MODERATOR"].includes(role);

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

    fetchDashboard();
  }, [hasHydrated, user?.id, user?.role]);

  const fetchDashboard = async () => {
    setLoading(true);

    try {
      const [statsResult, approvalsResult, applicationsResult, visitsResult] =
        await Promise.allSettled([
          api.get("/admin/stats"),
          api.get("/units/admin/portfolio-approvals?status=ALL"),
          api.get("/admin/applications?status=all"),
          api.get("/visits"),
        ]);

      if (statsResult.status === "fulfilled") {
        setStats(statsResult.value.data || null);
      }

      if (approvalsResult.status === "fulfilled") {
        setApprovalItems(
          Array.isArray(approvalsResult.value.data)
            ? approvalsResult.value.data
            : [],
        );
      }

      if (applicationsResult.status === "fulfilled") {
        setApplications(
          Array.isArray(applicationsResult.value.data)
            ? applicationsResult.value.data
            : [],
        );
      }

      if (visitsResult.status === "fulfilled") {
        setVisits(Array.isArray(visitsResult.value.data) ? visitsResult.value.data : []);
      }
    } finally {
      setLoading(false);
    }
  };

  const portfolioCounts = useMemo(() => {
    return {
      total: approvalItems.length,
      waiting: approvalItems.filter((item) =>
        ["BELGE_BEKLENIYOR", "INCELEMEYE_GONDERILDI"].includes(
          String(item.approvalStatus || ""),
        ),
      ).length,
      reviewing: approvalItems.filter((item) => item.approvalStatus === "INCELEMEDE").length,
      approved: approvalItems.filter((item) => item.approvalStatus === "ONAYLANDI").length,
      pool: approvalItems.filter(
        (item) => item.approvalStatus === "HAVUZDA" || item.isPoolVisible,
      ).length,
    };
  }, [approvalItems]);

  const pendingApplications = useMemo(() => {
    return applications.filter(
      (item) => String(item.status || "").toUpperCase() === "PENDING",
    ).length;
  }, [applications]);

  const activeUsers = useMemo(() => {
    const latestByUser = new Map<string, VisitItem>();

    visits.forEach((visit) => {
      const id = visit.user?.id || visit.userId;
      if (!id) return;

      const current = latestByUser.get(id);
      const currentTime = new Date(current?.createdAt || 0).getTime();
      const visitTimeValue = new Date(visit.createdAt || 0).getTime();

      if (!current || visitTimeValue > currentTime) latestByUser.set(id, visit);
    });

    return Array.from(latestByUser.values()).filter((visit) => {
      if (!visit.createdAt) return false;
      return Date.now() - new Date(visit.createdAt).getTime() < 1000 * 60 * 20;
    }).length;
  }, [visits]);

  const statCards: StatCardItem[] = [
    {
      label: "Toplam",
      value: portfolioCounts.total,
      sub: "Portföy",
      tone: "blue",
      icon: <ClipboardCheck size={21} />,
    },
    {
      label: "Bekleyen",
      value: portfolioCounts.waiting,
      sub: "Portföy",
      tone: "orange",
      icon: <FileText size={21} />,
    },
    {
      label: "İnceleme",
      value: portfolioCounts.reviewing,
      sub: "Portföy",
      tone: "blue",
      icon: <ShieldCheck size={21} />,
    },
    {
      label: "Onay",
      value: portfolioCounts.approved,
      sub: "Portföy",
      tone: "green",
      icon: <CheckCircle2 size={21} />,
    },
    {
      label: "Havuz",
      value: portfolioCounts.pool,
      sub: "Portföy",
      tone: "purple",
      icon: <ArrowRight size={21} />,
    },
  ];

  const moduleCards: ModuleCardItem[] = [
    {
      title: "Portföy Onayları",
      desc: "Portföy başvurularını inceleyin ve yönetin",
      href: "/admin/portfolio-approvals",
      icon: <ClipboardCheck size={30} />,
      tone: "blue",
      count: portfolioCounts.waiting,
      countTone: "rose",
    },
    {
      title: "Katılım Talepleri",
      desc: "Yeni kayıt ve yetki taleplerini inceleyin",
      href: "/admin/katilim-talepleri",
      icon: <UserPlus size={30} />,
      tone: "orange",
      count: pendingApplications,
      countTone: "gray",
    },
    {
      title: "Kullanıcı Yönetimi",
      desc: "Kullanıcıları görüntüleyin, onaylayın ve yönetin",
      href: "/admin/users",
      icon: <UsersRound size={30} />,
      tone: "purple",
      count: stats?.pendingUsers || 0,
      countTone: "gray",
    },
    {
      title: "Referans Yönetimi",
      desc: "Referans kodlarını oluşturun ve yönetin",
      href: "/admin/referrals",
      icon: <UserPlus size={30} />,
      tone: "cyan",
      count: stats?.totalInvitations || 0,
      countTone: "cyan",
    },
    {
      title: "Sistem Mesajları",
      desc: "Kullanıcı iletişimi ve sistem bildirimleri",
      href: "/admin/system-messages",
      icon: <MessageCircle size={30} />,
      tone: "green",
      count: 0,
      countTone: "purple",
    },
    {
      title: "Duyurular",
      desc: "Platform duyurularını hazırlayın ve yayınlayın",
      href: "/admin/announcements",
      icon: <Megaphone size={30} />,
      tone: "rose",
      isNew: true,
    },
    {
      title: "Raporlar",
      desc: "Trafik, kullanıcı ve işlem raporlarını inceleyin",
      href: "/admin/reports",
      icon: <Activity size={30} />,
      tone: "cyan",
      count: activeUsers,
      countTone: "cyan",
    },
    {
      title: "Ayarlar",
      desc: "Platform yönetim ayarlarını düzenleyin",
      href: "/admin/settings",
      icon: <Settings size={30} />,
      tone: "gray",
      count: 0,
      countTone: "blue",
    },
    {
      title: "Audit Log",
      desc: "Yönetici işlem kayıtlarını görüntüleyin",
      href: "/admin/audit-log",
      icon: <FileText size={30} />,
      tone: "orange",
      isNew: true,
    },
    {
      title: "Yardım Merkezi",
      desc: "Admin kullanım notları ve destek merkezi",
      href: "/admin/help-center",
      icon: <HelpCircle size={30} />,
      tone: "blue",
    },
    {
      title: "Lina Merkezi",
      desc: "Yapay zeka asistanı ve analiz merkezi",
      href: "/lina",
      icon: <Sparkles size={30} />,
      tone: "purple",
      count: 0,
      countTone: "rose",
    },
  ];

  const systemCards = [
    {
      title: "Sistem Durumu",
      value: "Aktif",
      sub: "Tüm sistemler çalışıyor",
      tone: "blue" as StatTone,
      icon: <Activity size={22} />,
    },
    {
      title: "Kullanıcı",
      value: stats?.totalUsers || 0,
      sub: "Toplam kayıt",
      tone: "purple" as StatTone,
      icon: <UsersRound size={22} />,
    },
    {
      title: "Aktif Kullanıcı",
      value: activeUsers,
      sub: "Son 20 dakika",
      tone: "green" as StatTone,
      icon: <UsersRound size={22} />,
    },
    {
      title: "Son Güncelleme",
      value: todayText(),
      sub: timeText(),
      tone: "rose" as StatTone,
      icon: <CalendarDays size={22} />,
    },
  ];

  if (!hasHydrated || loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F8FAFF] text-[#06194A]">
        <div className="text-center">
          <Loader2 className="mx-auto animate-spin text-[#1557D6]" size={30} />
          <p className="mt-4 text-[12px] font-black uppercase tracking-[0.2em] text-slate-400">
            EPH Yönetim Merkezi
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F8FAFF] text-[#06194A]">
      {menuOpen && (
        <div
          className="fixed inset-0 z-[100] bg-slate-950/70 backdrop-blur-sm lg:hidden"
          onClick={() => setMenuOpen(false)}
        >
          <aside
            className="h-full w-[82%] max-w-[330px] bg-[#071A39] p-4 text-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <AdminBrand compact />
              <button
                onClick={() => setMenuOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white/10 text-white"
                aria-label="Menüyü kapat"
              >
                <X size={18} />
              </button>
            </div>

            <SideNav
              portfolioCount={portfolioCounts.waiting}
              pendingApplications={pendingApplications}
            />
          </aside>
        </div>
      )}

      <div className="lg:flex">
        <aside className="hidden min-h-screen w-[250px] shrink-0 bg-[#071A39] p-4 text-white lg:sticky lg:top-0 lg:block">
          <AdminBrand />
          <SideNav
            portfolioCount={portfolioCounts.waiting}
            pendingApplications={pendingApplications}
          />

          <Link
            href="/admin/help-center"
            className="mt-6 flex rounded-2xl border border-white/15 px-4 py-3 transition hover:bg-white/10"
          >
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/30 text-[13px] font-black">
                ?
              </span>
              <span className="text-[13px] font-black">Yardım Merkezi</span>
            </div>
          </Link>

          <div className="mt-auto hidden pt-8 lg:block">
            <div className="flex items-center gap-3 rounded-2xl bg-white/5 p-3">
              <div className="relative flex h-11 w-11 items-center justify-center rounded-full bg-violet-600 text-[13px] font-black text-white">
                {getInitials(user?.firstName, user?.lastName)}
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[#071A39] bg-green-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-black">
                  {[user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Yönetici"}
                </p>
                <p className="text-[11px] font-bold text-white/60">
                  {user?.role || "ADMIN"}
                </p>
              </div>
            </div>
          </div>
        </aside>

        <section className="min-w-0 flex-1">
          <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/95 px-3 py-2.5 backdrop-blur-xl lg:px-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  onClick={() => setMenuOpen(true)}
                  className="flex h-10 w-10 items-center justify-center rounded-2xl text-[#06194A]"
                  aria-label="Menüyü aç"
                >
                  <Menu size={24} />
                </button>

                <div className="hidden min-w-0 lg:block">
                  <h1 className="truncate text-[23px] font-black tracking-[-0.04em]">
                    EPH Yönetim Merkezi
                  </h1>
                </div>

                <div className="flex min-w-0 items-center gap-2 lg:hidden">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-red-600 text-[12px] font-black text-red-600">
                    E
                  </span>
                  <div>
                    <p className="text-[22px] font-black leading-5">EPH</p>
                    <p className="text-[10px] font-black uppercase tracking-[0.08em] text-slate-500">
                      Yönetim Merkezi
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex min-w-0 items-center gap-2">
                <Link
                  href="/admin/portfolio-approvals"
                  className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-[#06194A] shadow-sm ring-1 ring-slate-200"
                  aria-label="Portföy onay bildirimleri"
                >
                  <Bell size={19} />
                  {portfolioCounts.waiting > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-black text-white">
                      {portfolioCounts.waiting}
                    </span>
                  )}
                </Link>

                <Link
                  href="/admin/users"
                  className="hidden h-10 min-w-[260px] items-center gap-2 rounded-2xl bg-white px-3 shadow-sm ring-1 ring-slate-200 md:flex"
                >
                  <Search size={17} className="text-slate-400" />
                  <span className="text-[13px] font-semibold text-slate-400">
                    Kullanıcı ve kayıt ara
                  </span>
                </Link>

                <button
                  onClick={fetchDashboard}
                  className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-[#06194A] shadow-sm ring-1 ring-slate-200 sm:flex"
                  aria-label="Yenile"
                >
                  <RefreshCw size={17} />
                </button>

                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-600 text-[13px] font-black text-white shadow-sm">
                  {getInitials(user?.firstName, user?.lastName)}
                </div>

                <button
                  onClick={() => {
                    logout();
                    router.push("/giris");
                  }}
                  className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-[#06194A] shadow-sm ring-1 ring-slate-200 lg:flex"
                  aria-label="Çıkış yap"
                >
                  <LogOut size={17} />
                </button>
              </div>
            </div>
          </header>

          <div className="mx-auto w-full max-w-[1240px] px-3 py-3 pb-8 lg:px-6 lg:py-5">
            <section className="mb-3 text-center lg:hidden">
              <h1 className="text-[19px] font-black tracking-[-0.04em]">
                Hoş geldiniz, {user?.firstName || "Yönetici"}
              </h1>
              <p className="text-[12px] font-semibold text-slate-500">
                Yönetim merkezine hızlı erişim
              </p>
            </section>

            <AdminFlagBanner className="mb-2 rounded-[8px] md:rounded-[12px]" />

            <section className="mb-3 grid grid-cols-5 gap-2">
              {statCards.map((item) => (
                <AdminStatCard key={item.label} item={item} />
              ))}
            </section>

            <section className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-5">
              {moduleCards.map((item, index) => (
                <AdminModuleCard
                  key={item.title}
                  item={item}
                  centeredLast={moduleCards.length % 2 === 1 && index === moduleCards.length - 1}
                />
              ))}
            </section>

            <section className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
              {systemCards.map((item) => (
                <SystemMiniCard key={item.title} item={item} />
              ))}
            </section>

            <section className="mt-4 hidden grid-cols-5 gap-3 text-center text-[14px] font-black text-blue-700 lg:grid">
              <InfoPill icon={<CheckCircle2 size={19} />} label="Açık & Sade Tasarım" />
              <InfoPill icon={<ClipboardCheck size={19} />} label="Aktif Modül Linkleri" />
              <InfoPill icon={<Home size={19} />} label="Mobil Uyumlu Tek Ekran" />
              <InfoPill icon={<Settings size={19} />} label="Yönetim Merkezi" />
              <InfoPill icon={<ShieldCheck size={19} />} label="Yetki Kontrollü" />
            </section>

            <p className="mt-4 hidden text-center text-[12px] font-semibold text-slate-400 lg:block">
              © 2026 EPH Platform - Tüm hakları saklıdır.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

function AdminBrand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/admin" className="flex items-center gap-3">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-red-600 text-[14px] font-black text-red-500">
        E
      </span>
      <div>
        <p className={`${compact ? "text-[20px]" : "text-[28px]"} font-black leading-none text-white`}>
          EPH
        </p>
        <p className="text-[11px] font-black uppercase tracking-[0.06em] text-white">
          Yönetim Merkezi
        </p>
      </div>
    </Link>
  );
}

function SideNav({
  portfolioCount,
  pendingApplications,
}: {
  portfolioCount: number;
  pendingApplications: number;
}) {
  return (
    <nav className="mt-8 space-y-1">
      <SideNavItem href="/admin" icon={<Home size={19} />} label="Yönetim Paneli" active />

      <SideLabel label="Yönetim" />
      <SideNavItem href="/admin/users" icon={<UsersRound size={19} />} label="Kullanıcı Yönetimi" />
      <SideNavItem
        href="/admin/katilim-talepleri"
        icon={<UserPlus size={19} />}
        label="Katılım Talepleri"
        badge={pendingApplications}
      />
      <SideNavItem
        href="/admin/portfolio-approvals"
        icon={<ClipboardCheck size={19} />}
        label="Portföy Onayları"
        badge={portfolioCount}
        danger
      />
      <SideNavItem href="/admin/referrals" icon={<UsersRound size={19} />} label="Referans Yönetimi" />
      <SideNavItem href="/admin/system-messages" icon={<MessageCircle size={19} />} label="Sistem Mesajları" />

      <SideLabel label="İçerik Yönetimi" />
      <SideNavItem href="/admin/announcements" icon={<Bell size={19} />} label="Duyurular" />
      <SideNavItem href="/admin/reports" icon={<Activity size={19} />} label="Raporlar" />

      <SideLabel label="Sistem" />
      <SideNavItem href="/admin/settings" icon={<Settings size={19} />} label="Ayarlar" />
      <SideNavItem href="/admin/audit-log" icon={<FileText size={19} />} label="Audit Log" />
      <SideNavItem href="/admin/help-center" icon={<HelpCircle size={19} />} label="Yardım Merkezi" />
    </nav>
  );
}

function SideLabel({ label }: { label: string }) {
  return (
    <div className="pt-6 text-[12px] font-semibold uppercase tracking-[0.08em] text-white/55">
      {label}
    </div>
  );
}

function SideNavItem({
  href,
  icon,
  label,
  active,
  badge,
  danger,
}: {
  href: string;
  icon: ReactNode;
  label: string;
  active?: boolean;
  badge?: number;
  danger?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex min-h-[46px] items-center gap-3 rounded-xl px-3 text-[14px] font-black transition ${
        active
          ? "bg-blue-600 text-white"
          : danger
            ? "bg-red-600 text-white"
            : "text-white hover:bg-white/10"
      }`}
    >
      {icon}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {Boolean(badge) && (
        <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-blue-600 px-2 text-[11px] font-black text-white">
          {badge}
        </span>
      )}
    </Link>
  );
}

function AdminStatCard({ item }: { item: StatCardItem }) {
  const tone = toneClasses(item.tone);

  return (
    <div className="min-h-[86px] rounded-2xl bg-white p-2.5 text-center shadow-sm ring-1 ring-slate-200/70 lg:min-h-[116px] lg:p-4">
      <div className={`mx-auto flex h-10 w-10 items-center justify-center rounded-2xl ${tone.box} lg:h-12 lg:w-12`}>
        {item.icon}
      </div>
      <p className={`mt-2 text-[10px] font-black uppercase leading-tight ${tone.text} lg:text-[12px]`}>
        {item.label}
      </p>
      <p className="mt-1 text-[23px] font-black leading-none text-[#06194A] lg:text-[31px]">
        {item.value}
      </p>
      <p className="mt-1 text-[10px] font-semibold text-slate-600 lg:text-[13px]">
        {item.sub}
      </p>
    </div>
  );
}

function AdminModuleCard({
  item,
  centeredLast,
}: {
  item: ModuleCardItem;
  centeredLast?: boolean;
}) {
  const tone = toneClasses(item.tone);
  const countTone = item.countTone ? toneClasses(item.countTone) : null;

  return (
    <Link
      href={item.href}
      className={`relative flex min-h-[112px] items-center gap-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200/70 transition active:scale-[0.99] lg:min-h-[128px] lg:p-4 ${
        centeredLast ? "max-md:col-span-2 max-md:mx-auto max-md:w-[50%]" : ""
      }`}
    >
      <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${tone.box} lg:h-16 lg:w-16`}>
        {item.icon}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <h3 className="text-[14px] font-black leading-tight tracking-[-0.03em] text-[#06194A] lg:text-[16px]">
            {item.title}
          </h3>
          {item.isNew && (
            <span className="rounded-full bg-yellow-400 px-1.5 py-0.5 text-[9px] font-black text-[#06194A]">
              YENİ
            </span>
          )}
        </div>
        <p className="mt-1 line-clamp-2 text-[11px] font-semibold leading-4 text-slate-600 lg:text-[13px] lg:leading-5">
          {item.desc}
        </p>
      </div>

      {item.count !== undefined && (
        <span
          className={`absolute right-3 top-3 flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-black ${
            countTone?.badge || "bg-slate-500 text-white"
          }`}
        >
          {item.count}
        </span>
      )}

      <ArrowRight size={18} className="hidden shrink-0 text-slate-400 lg:block" />
    </Link>
  );
}

function SystemMiniCard({
  item,
}: {
  item: {
    title: string;
    value: number | string;
    sub: string;
    tone: StatTone;
    icon: ReactNode;
  };
}) {
  const tone = toneClasses(item.tone);

  return (
    <div className="flex min-h-[78px] items-center gap-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200/70">
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${tone.box}`}>
        {item.icon}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold text-slate-500">{item.title}</p>
        <p className={`truncate text-[17px] font-black leading-tight ${item.title === "Sistem Durumu" ? "text-green-700" : "text-[#06194A]"}`}>
          {item.value}
        </p>
        <p className={`truncate text-[11px] font-semibold ${item.title === "Sistem Durumu" ? "text-green-600" : "text-slate-500"}`}>
          {item.sub}
        </p>
      </div>
    </div>
  );
}

function InfoPill({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-white px-3 shadow-sm ring-1 ring-slate-200/70">
      {icon}
      <span>{label}</span>
    </div>
  );
}