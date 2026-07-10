"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  Award,
  BarChart3,
  ArrowRight,
  Bell,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  HelpCircle,
  Home,
  Loader2,
  LogOut,
  Megaphone,
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

type RecentAction = {
  id: string;
  action?: string | null;
  entityType?: string | null;
  description?: string | null;
  createdAt?: string | null;
  actor?: {
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    role?: string | null;
  } | null;
  targetUser?: {
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    role?: string | null;
  } | null;
};

type DashboardSummary = {
  auditSummary?: {
    canView?: boolean;
    totalLogs?: number;
    todayLogs?: number;
    lastActionAt?: string | null;
    topAction?: string | null;
  };
  recentActions?: RecentAction[];
  announcementCount?: number;
  announcementSummary?: {
    total?: number;
    active?: number;
    passive?: number;
  };
  systemMessageCount?: number;
  systemMessageSummary?: {
    total?: number;
    today?: number;
    recipientTotal?: number;
  };
};

type CrmAdminSummary = {
  totalCustomers?: number;
  activeCustomers?: number;
  closedDeals?: number;
  lostDeals?: number;
  pendingTasks?: number;
  totalTasks?: number;
  totalActivities?: number;
  totalInterests?: number;
  totalCustomerProperties?: number;
};

type CrmPerformanceRow = {
  id: string;
  name: string;
  location?: string;
  officeName?: string;
  leaderName?: string;
  teamName?: string;
  advisorCount?: number;
  teamCount?: number;
  memberCount?: number;
  customerCount?: number;
  closedCount?: number;
  pendingTaskCount?: number;
  activityCount?: number;
  portfolioCount?: number;
  poolPortfolioCount?: number;
  performanceScore?: number;
};

type CrmAdminPerformance = {
  officePerformance?: CrmPerformanceRow[];
  teamPerformance?: CrmPerformanceRow[];
  advisorPerformance?: CrmPerformanceRow[];
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

function formatDateTime(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("tr-TR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function actionLabel(value?: string | null) {
  const map: Record<string, string> = {
    USER_APPROVED: "Kullanıcı onaylandı",
    USER_DELETED: "Kullanıcı silindi",
    USER_ROLE_CHANGED: "Rol değiştirildi",
    USER_CREATED: "Kullanıcı oluşturuldu",
    USER_SUSPENDED_BY_ADMIN: "Admin askıya aldı",
    USER_SUSPENDED_BY_SOFTWARE_TEAM: "Yazılım Ekibi askıya aldı",
    APPLICATION_DELETED: "Başvuru silindi",
    REFERRAL_INVITATION_CREATED: "Referans daveti oluşturuldu",
    REFERRAL_INVITATION_DELETED: "Referans daveti silindi",
    USER_MEMBER_CODE_ASSIGNED: "Üye numarası atandı",
    MISSING_MEMBER_CODES_ASSIGNED: "Toplu üye numarası atandı",
    ANNOUNCEMENT_CREATED: "Duyuru oluşturuldu",
    ANNOUNCEMENT_UPDATED: "Duyuru güncellendi",
    ANNOUNCEMENT_DELETED: "Duyuru silindi",
  };

  const clean = String(value || "").trim();

  return map[clean] || clean || "İşlem";
}

function fullName(user?: RecentAction["actor"]) {
  if (!user) return "Sistem";
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return name || user.email || "Sistem";
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
  const [dashboardSummary, setDashboardSummary] = useState<DashboardSummary | null>(null);
  const [crmAdminSummary, setCrmAdminSummary] = useState<CrmAdminSummary | null>(null);
  const [crmAdminPerformance, setCrmAdminPerformance] = useState<CrmAdminPerformance | null>(null);
  const [loading, setLoading] = useState(true);

  const role = String(user?.role || "").toUpperCase();
  const isSuperAdmin = role === "SUPER_ADMIN";
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasHydrated, user?.id, user?.role]);

  const fetchDashboard = async () => {
    setLoading(true);

    try {
      const [statsResult, approvalsResult, applicationsResult, visitsResult, summaryResult, crmSummaryResult, crmPerformanceResult] =
        await Promise.allSettled([
          api.get("/admin/stats"),
          api.get("/units/admin/portfolio-approvals?status=ALL"),
          api.get("/admin/applications?status=all"),
          api.get("/visits"),
          api.get("/admin/dashboard-summary"),
          api.get("/crm/admin-summary"),
          api.get("/crm/admin-performance"),
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

      if (summaryResult.status === "fulfilled") {
        setDashboardSummary(summaryResult.value.data || null);
      }

      if (crmSummaryResult.status === "fulfilled") {
        setCrmAdminSummary(crmSummaryResult.value.data || null);
      } else {
        setCrmAdminSummary(null);
      }

      if (crmPerformanceResult.status === "fulfilled") {
        setCrmAdminPerformance(crmPerformanceResult.value.data || null);
      } else {
        setCrmAdminPerformance(null);
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
      title: "Organizasyon Yönetimi",
      desc: "Ofisleri, takımları, liderleri ve üyeleri yönetin",
      href: "/admin/organization",
      icon: <Building2 size={30} />,
      tone: "green",
      count: "V1",
      countTone: "green",
      isNew: true,
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
      count: dashboardSummary?.systemMessageCount || 0,
      countTone: "purple",
    },
    {
      title: "Duyurular",
      desc: "Platform duyurularını hazırlayın ve yayınlayın",
      href: "/admin/announcements",
      icon: <Megaphone size={30} />,
      tone: "rose",
      count: dashboardSummary?.announcementCount || 0,
      countTone: "rose",
      isNew: true,
    },
    ...(isSuperAdmin
      ? [
          {
            title: "Turan Yönetimi",
            desc: "Gizli Turan sözleri ve banner yönetimi",
            href: "/admin/turan",
            icon: <Sparkles size={30} />,
            tone: "rose" as StatTone,
            count: 0,
            countTone: "rose" as StatTone,
            isNew: true,
          },
        ]
      : []),
    {
      title: "Belge Doğrulama Merkezi",
      desc: "Mesleki belgeleri resmî kurum servislerinden kontrol edin",
      href: "/admin/document-verification",
      icon: <ClipboardCheck size={30} />,
      tone: "blue",
      count: 7,
      countTone: "green",
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
      count: dashboardSummary?.auditSummary?.totalLogs || 0,
      countTone: "orange",
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
      title: "Duyuru",
      value: dashboardSummary?.announcementSummary?.active || 0,
      sub: "Aktif duyuru",
      tone: "rose" as StatTone,
      icon: <Megaphone size={22} />,
    },
    {
      title: "Sistem Mesajı",
      value: dashboardSummary?.systemMessageSummary?.total || 0,
      sub: "Toplam mesaj",
      tone: "green" as StatTone,
      icon: <MessageCircle size={22} />,
    },
  ];

  const auditMiniCards: StatCardItem[] = [
    {
      label: "Bugün",
      value: dashboardSummary?.auditSummary?.todayLogs || 0,
      sub: "İşlem",
      tone: "orange",
      icon: <Activity size={20} />,
    },
    {
      label: "Toplam",
      value: dashboardSummary?.auditSummary?.totalLogs || 0,
      sub: "Audit Log",
      tone: "blue",
      icon: <FileText size={20} />,
    },
    {
      label: "En Sık",
      value: actionLabel(dashboardSummary?.auditSummary?.topAction).slice(0, 13),
      sub: "İşlem tipi",
      tone: "purple",
      icon: <ShieldCheck size={20} />,
    },
    {
      label: "Son",
      value: formatDateTime(dashboardSummary?.auditSummary?.lastActionAt),
      sub: "İşlem",
      tone: "green",
      icon: <CalendarDays size={20} />,
    },
  ];

  const crmAdminCards: StatCardItem[] = [
    {
      label: "Toplam CRM",
      value: crmAdminSummary?.totalCustomers || 0,
      sub: "Müşteri kaydı",
      tone: "blue",
      icon: <UsersRound size={20} />,
    },
    {
      label: "Aktif CRM",
      value: crmAdminSummary?.activeCustomers || 0,
      sub: "Devam eden",
      tone: "green",
      icon: <Activity size={20} />,
    },
    {
      label: "Kapalı",
      value: crmAdminSummary?.closedDeals || 0,
      sub: "Tamamlanan iş",
      tone: "purple",
      icon: <CheckCircle2 size={20} />,
    },
    {
      label: "Kaybedilen",
      value: crmAdminSummary?.lostDeals || 0,
      sub: "Sonlanan kayıt",
      tone: "gray",
      icon: <X size={20} />,
    },
    {
      label: "Bekleyen",
      value: crmAdminSummary?.pendingTasks || 0,
      sub: "Görev",
      tone: "orange",
      icon: <CalendarDays size={20} />,
    },
    {
      label: "Aktivite",
      value: crmAdminSummary?.totalActivities || 0,
      sub: "Görüşme notu",
      tone: "cyan",
      icon: <MessageCircle size={20} />,
    },
    {
      label: "İlgi Kaydı",
      value: crmAdminSummary?.totalInterests || 0,
      sub: "Talep profili",
      tone: "rose",
      icon: <Sparkles size={20} />,
    },
    {
      label: "Bağlantı",
      value: crmAdminSummary?.totalCustomerProperties || 0,
      sub: "Portföy ilişkisi",
      tone: "purple",
      icon: <Building2 size={20} />,
    },
  ];



  if (!hasHydrated || loading) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-[#F4F8FF] text-[#06194A]">
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
    <main className="min-h-[100dvh] overflow-y-auto bg-[#F4F8FF] pb-[env(safe-area-inset-bottom)] text-[#06194A]">
      <div className="lg:flex">
        <aside className="hidden min-h-screen w-[250px] shrink-0 bg-[#071A39] p-4 text-white lg:sticky lg:top-0 lg:block">
          <AdminBrand />
          <SideNav
            portfolioCount={portfolioCounts.waiting}
            pendingApplications={pendingApplications}
            isSuperAdmin={isSuperAdmin}
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
                <p className="break-words text-[13px] font-black leading-4">
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
          <header className="sticky top-0 z-40 border-b-2 border-[#C7D6E8] bg-white/95 px-3 py-2.5 backdrop-blur-xl lg:px-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="hidden min-w-0 lg:block">
                  <h1 className="break-words text-[23px] font-black tracking-[-0.04em]">
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

            <section className="flex flex-wrap justify-center gap-2">
              {moduleCards.map((item) => (
                <AdminModuleCard key={item.title} item={item} />
              ))}
            </section>

            <section className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
              {systemCards.map((item) => (
                <SystemMiniCard key={item.title} item={item} />
              ))}
            </section>

            <section className="mt-3 rounded-2xl border-2 border-[#C7D6E8] bg-white p-3 shadow-sm">
              <div className="mb-3 text-center">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-700">
                  CRM-ADMIN V1
                </p>
                <h2 className="mt-1 text-center text-[17px] font-black tracking-[-0.04em] text-[#06194A]">
                  CRM Yönetim Merkezi
                </h2>
                <p className="mt-1 text-center text-[11px] font-semibold leading-4 text-slate-500">
                  Yönetici yalnızca genel CRM özetini görür; müşteri detayları gizli kalır.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                {crmAdminCards.map((item) => (
                  <AdminStatCard key={item.label} item={item} compact />
                ))}
              </div>
            </section>

            <CrmAdminPerformanceSection data={crmAdminPerformance} />

            <section className="mt-3 grid gap-2 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="rounded-2xl bg-white p-3 shadow-sm border-2 border-[#C7D6E8]">
                <div className="mb-3 text-center">
                  <h2 className="text-center text-[15px] font-black tracking-[-0.03em] text-[#06194A]">
                    Audit Log Özeti
                  </h2>
                  <p className="mt-1 text-center text-[11px] font-semibold text-slate-500">
                    Yönetici işlem yoğunluğu
                  </p>
                  <Link
                    href="/admin/audit-log"
                    className="mt-2 inline-flex min-h-[28px] items-center justify-center rounded-full bg-orange-100 px-3 py-1 text-center text-[11px] font-black text-orange-700"
                  >
                    İncele
                  </Link>
                </div>

                {dashboardSummary?.auditSummary?.canView === false ? (
                  <div className="rounded-2xl bg-slate-50 p-4 text-center">
                    <p className="text-[13px] font-black text-slate-700">
                      Audit Log görünümü yalnızca Yazılım Ekibi içindir.
                    </p>
                    <p className="mt-1 text-[11px] font-semibold text-slate-500">
                      Admin ve Moderatör rolleri için kayıt özeti gizlenir.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {auditMiniCards.map((item) => (
                      <AdminStatCard key={item.label} item={item} compact />
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-2xl bg-white p-3 shadow-sm border-2 border-[#C7D6E8]">
                <div className="mb-3 text-center">
                  <h2 className="text-center text-[15px] font-black tracking-[-0.03em] text-[#06194A]">
                    Son İşlemler
                  </h2>
                  <p className="mt-1 text-center text-[11px] font-semibold text-slate-500">
                    En güncel yönetim hareketleri
                  </p>
                  <span className="mt-2 inline-flex min-h-[28px] items-center justify-center rounded-full bg-blue-100 px-3 py-1 text-center text-[11px] font-black text-blue-700">
                    {dashboardSummary?.recentActions?.length || 0} kayıt
                  </span>
                </div>

                {dashboardSummary?.auditSummary?.canView === false ? (
                  <div className="rounded-2xl bg-slate-50 p-4 text-center">
                    <p className="text-[13px] font-black text-slate-700">
                      Son işlemler yalnızca Yazılım Ekibi tarafından görüntülenebilir.
                    </p>
                  </div>
                ) : dashboardSummary?.recentActions?.length ? (
                  <div className="space-y-2">
                    {dashboardSummary.recentActions.slice(0, 6).map((item) => (
                      <div
                        key={item.id}
                        className="grid min-h-[72px] grid-cols-[40px_1fr] gap-3 rounded-2xl bg-slate-50 px-3 py-2 text-center md:grid-cols-[40px_1fr_86px] md:text-left"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
                          <FileText size={17} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="break-words text-center text-[13px] font-black leading-4 text-[#06194A] md:text-left">
                            {actionLabel(item.action)}
                          </p>
                          <p className="mt-0.5 break-words text-center text-[11px] font-semibold leading-4 text-slate-500 md:text-left">
                            {item.description || `${fullName(item.actor)} işlem yaptı`}
                          </p>
                        </div>
                        <div className="col-span-2 text-center md:col-span-1 md:text-right">
                          <p className="text-[10px] font-black text-slate-500">
                            {formatDateTime(item.createdAt)}
                          </p>
                          <p className="text-[10px] font-semibold text-slate-400">
                            {item.entityType || "Kayıt"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl bg-slate-50 p-4 text-center">
                    <p className="text-[13px] font-black text-slate-700">
                      Henüz işlem kaydı yok.
                    </p>
                  </div>
                )}
              </div>
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
  isSuperAdmin,
}: {
  portfolioCount: number;
  pendingApplications: number;
  isSuperAdmin: boolean;
}) {
  return (
    <nav className="mt-8 space-y-1">
      <SideNavItem href="/admin" icon={<Home size={19} />} label="Yönetim Paneli" active />

      <SideLabel label="Yönetim" />
      <SideNavItem href="/admin/users" icon={<UsersRound size={19} />} label="Kullanıcı Yönetimi" />
      <SideNavItem href="/admin/organization" icon={<Building2 size={19} />} label="Organizasyon Yönetimi" />
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
      {isSuperAdmin ? (
        <SideNavItem href="/admin/turan" icon={<Sparkles size={19} />} label="Turan Yönetimi" />
      ) : null}
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
      <span className="min-w-0 flex-1 break-words leading-4">{label}</span>
      {Boolean(badge) && (
        <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-blue-600 px-2 text-[11px] font-black text-white">
          {badge}
        </span>
      )}
    </Link>
  );
}

function AdminStatCard({
  item,
  compact = false,
}: {
  item: StatCardItem;
  compact?: boolean;
}) {
  const tone = toneClasses(item.tone);

  return (
    <div className={`${compact ? "min-h-[86px] p-2.5" : "min-h-[86px] p-2.5 lg:min-h-[116px] lg:p-4"} rounded-2xl bg-white text-center shadow-sm border-2 border-[#C7D6E8]`}>
      <div className={`${compact ? "h-9 w-9" : "h-10 w-10 lg:h-12 lg:w-12"} mx-auto flex items-center justify-center rounded-2xl ${tone.box}`}>
        {item.icon}
      </div>
      <p className={`${compact ? "text-[10px]" : "text-[10px] lg:text-[12px]"} mt-2 font-black uppercase leading-tight ${tone.text}`}>
        {item.label}
      </p>
      <p className={`${compact ? "text-[18px]" : "text-[23px] lg:text-[31px]"} mt-1 break-words font-black leading-tight text-[#06194A]`}>
        {item.value}
      </p>
      <p className={`${compact ? "text-[10px]" : "text-[10px] lg:text-[13px]"} mt-1 break-words font-semibold leading-tight text-slate-600`}>
        {item.sub}
      </p>
    </div>
  );
}

function AdminModuleCard({ item }: { item: ModuleCardItem }) {
  const tone = toneClasses(item.tone);
  const countTone = item.countTone ? toneClasses(item.countTone) : null;

  return (
    <Link
      href={item.href}
      className="relative flex min-h-[122px] w-[calc(50%_-_4px)] items-center gap-3 rounded-2xl bg-white p-3 text-center shadow-sm border-2 border-[#C7D6E8] transition active:scale-[0.99] md:w-[calc(25%_-_6px)] lg:min-h-[138px] lg:p-4 xl:w-[calc(20%_-_7px)]"
    >
      <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${tone.box} lg:h-16 lg:w-16`}>
        {item.icon}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-col items-center justify-center gap-1 text-center">
          <h3 className="break-words text-center text-[14px] font-black leading-tight tracking-[-0.03em] text-[#06194A] lg:text-[16px]">
            {item.title}
          </h3>
          {item.isNew && (
            <span className="rounded-full bg-yellow-400 px-1.5 py-0.5 text-[9px] font-black text-[#06194A]">
              YENİ
            </span>
          )}
        </div>
        <p className="mt-1 break-words text-center text-[11px] font-semibold leading-4 text-slate-600 lg:text-[13px] lg:leading-5">
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
    <div className="flex min-h-[78px] items-center gap-3 rounded-2xl bg-white p-3 shadow-sm border-2 border-[#C7D6E8]">
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${tone.box}`}>
        {item.icon}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold text-slate-500">{item.title}</p>
        <p className={`break-words text-[17px] font-black leading-tight ${item.title === "Sistem Durumu" ? "text-green-700" : "text-[#06194A]"}`}>
          {item.value}
        </p>
        <p className={`break-words text-[11px] font-semibold leading-4 ${item.title === "Sistem Durumu" ? "text-green-600" : "text-slate-500"}`}>
          {item.sub}
        </p>
      </div>
    </div>
  );
}


function CrmAdminPerformanceSection({ data }: { data: CrmAdminPerformance | null }) {
  const officeRows = data?.officePerformance || [];
  const teamRows = data?.teamPerformance || [];
  const advisorRows = data?.advisorPerformance || [];

  return (
    <section className="mt-3 rounded-2xl border-2 border-[#C7D6E8] bg-white p-3 shadow-sm">
      <div className="mb-3 text-center">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-violet-700">
          CRM-ADMIN V2
        </p>
        <h2 className="mt-1 text-center text-[17px] font-black tracking-[-0.04em] text-[#06194A]">
          Performans Merkezi
        </h2>
        <p className="mt-1 text-center text-[11px] font-semibold leading-4 text-slate-500">
          Ofis, takım ve danışman performansı genel özet olarak gösterilir.
        </p>
      </div>

      <div className="grid gap-2 lg:grid-cols-3">
        <PerformancePanel
          title="Ofis Performansı"
          subtitle="En aktif ofisler"
          icon={<Building2 size={18} />}
          rows={officeRows}
          empty="Ofis performansı bulunamadı."
          meta={(row) => `${row.advisorCount || 0} danışman • ${row.teamCount || 0} takım`}
        />
        <PerformancePanel
          title="Takım Performansı"
          subtitle="En aktif takımlar"
          icon={<UsersRound size={18} />}
          rows={teamRows}
          empty="Takım performansı bulunamadı."
          meta={(row) => `${row.officeName || 'Ofis yok'} • ${row.memberCount || 0} üye`}
        />
        <PerformancePanel
          title="En Aktif Danışmanlar"
          subtitle="CRM + portföy aktivitesi"
          icon={<Award size={18} />}
          rows={advisorRows}
          empty="Danışman aktivitesi bulunamadı."
          meta={(row) => `${row.officeName || 'Ofis yok'} • ${row.teamName || 'Takım yok'}`}
          limit={6}
        />
      </div>
    </section>
  );
}

function PerformancePanel({
  title,
  subtitle,
  icon,
  rows,
  empty,
  meta,
  limit = 5,
}: {
  title: string;
  subtitle: string;
  icon: ReactNode;
  rows: CrmPerformanceRow[];
  empty: string;
  meta: (row: CrmPerformanceRow) => string;
  limit?: number;
}) {
  return (
    <div className="rounded-2xl border-2 border-[#C7D6E8] bg-[#F8FAFC] p-2.5">
      <div className="mb-2 flex items-center justify-center gap-2 text-center">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
          {icon}
        </span>
        <div className="min-w-0 text-center">
          <h3 className="break-words text-center text-[13px] font-black leading-4 text-[#06194A]">
            {title}
          </h3>
          <p className="text-center text-[10px] font-semibold text-slate-500">
            {subtitle}
          </p>
        </div>
      </div>

      {rows.length ? (
        <div className="space-y-2">
          {rows.slice(0, limit).map((row, index) => (
            <div
              key={row.id}
              className="rounded-2xl border-2 border-[#D7E3F2] bg-white p-2 text-center shadow-[0_6px_16px_rgba(15,23,42,0.035)]"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#06194A] text-[11px] font-black text-white">
                  {index + 1}
                </div>
                <div className="min-w-0 flex-1 text-center">
                  <p className="break-words text-center text-[12px] font-black leading-4 text-[#06194A]">
                    {row.name}
                  </p>
                  <p className="mt-0.5 break-words text-center text-[9.5px] font-semibold leading-3 text-slate-500">
                    {meta(row)}
                  </p>
                </div>
                <div className="flex h-8 min-w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 px-2 text-[11px] font-black text-white">
                  %{row.performanceScore || 0}
                </div>
              </div>

              <div className="mt-2 grid grid-cols-3 gap-1 text-center">
                <MiniMetric label="CRM" value={row.customerCount || 0} />
                <MiniMetric label="Kapalı" value={row.closedCount || 0} />
                <MiniMetric label="Portföy" value={row.portfolioCount || 0} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl bg-white p-4 text-center">
          <BarChart3 className="mx-auto text-slate-400" size={22} />
          <p className="mt-2 text-[12px] font-black text-slate-600">{empty}</p>
        </div>
      )}
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl bg-[#EFF6FF] px-1.5 py-1 text-center">
      <p className="text-[10px] font-black leading-3 text-[#06194A]">{value}</p>
      <p className="text-[8px] font-black uppercase leading-3 text-blue-700">{label}</p>
    </div>
  );
}

function InfoPill({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-white px-3 shadow-sm border-2 border-[#C7D6E8]">
      {icon}
      <span>{label}</span>
    </div>
  );
}