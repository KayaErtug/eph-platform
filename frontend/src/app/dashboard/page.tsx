"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  Bot,
  BriefcaseBusiness,
  Building2,
  CalendarCheck,
  CheckSquare,
  Clock3,
  FileText,
  Home,
  Loader2,
  MessageCircle,
  Plus,
  Store,
  TrendingUp,
  UsersRound,
  WalletCards,
} from "lucide-react";

import EphAppShell from "@/components/EphAppShell";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";

type RoleType = "realtor" | "contractor" | "construction" | "admin";
type ToneType = "blue" | "orange" | "amber" | "slate";

type Conversation = {
  id: string;
  unreadCount?: number;
};

type NetworkNotification = {
  id: string;
  userId: string;
  postId?: string | null;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
};

type NetworkNotificationResponse = {
  unreadCount: number;
  items: NetworkNotification[];
};

type FeaturedNetworkPost = {
  id: string;
  title: string;
  type: string;
  city?: string | null;
  district?: string | null;
  budget?: number | null;
  score: number;
  viewCount: number;
  followerCount: number;
  requestCount: number;
  user?: {
    firstName: string;
    lastName: string;
    role: string;
  };
};



type CrmDashboardCustomer = {
  id: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  city?: string | null;
  status: string;
  activities?: Array<{
    id: string;
    type: string;
    note: string;
    createdAt: string;
  }>;
  tasks?: Array<{
    id: string;
    title: string;
    dueDate?: string | null;
    status: string;
  }>;
  _count?: {
    activities?: number;
    tasks?: number;
  };
};

type DashboardActivityItem = {
  id: string;
  type: string;
  note: string;
  createdAt: string;
  customerId: string;
  customerName: string;
  customerPhone?: string | null;
};

type DashboardTaskItem = {
  id: string;
  title: string;
  dueDate?: string | null;
  status: string;
  customerId: string;
  customerName: string;
  customerPhone?: string | null;
};

type DashboardSummary = {
  stats?: {
    totalUnits?: number;
    totalCustomers?: number;
    totalVisits?: number;
    totalProjects?: number;
  };
  pendingTasks?: Array<{
    id: string;
    title: string;
    dueDate?: string | null;
    status: string;
  }>;
};

function normalizeRole(role?: string | null) {
  return String(role || "").toLocaleUpperCase("tr-TR").trim();
}

function getRoleType(role?: string | null): RoleType {
  const normalizedRole = normalizeRole(role);

  if (
    normalizedRole === "INSAAT_FIRMASI" ||
    normalizedRole === "İNŞAAT_FİRMASI"
  ) {
    return "construction";
  }

  if (
    normalizedRole === "MUTEAHHIT" ||
    normalizedRole === "MÜTEAHHİT" ||
    normalizedRole === "MÜTAHHİT"
  ) {
    return "contractor";
  }

  if (normalizedRole === "ADMIN" || normalizedRole === "DENETCI_ADMIN") {
    return "admin";
  }

  return "realtor";
}

function getGreeting() {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 12) return "Günaydın";
  if (hour >= 12 && hour < 17) return "Tünaydın";
  if (hour >= 17 && hour < 22) return "İyi akşamlar";

  return "İyi geceler";
}

function RoleBadge({ roleType }: { roleType: RoleType }) {
  const config: Record<RoleType, { label: string; className: string }> = {
    realtor: {
      label: "Emlakçı Paneli",
      className: "bg-blue-50 text-blue-700 border-blue-100",
    },
    contractor: {
      label: "Müteahhit Paneli",
      className: "bg-orange-50 text-orange-700 border-orange-100",
    },
    construction: {
      label: "İnşaat Firması Paneli",
      className: "bg-amber-50 text-amber-700 border-amber-100",
    },
    admin: {
      label: "Admin Paneli",
      className: "bg-slate-900 text-white border-slate-700",
    },
  };

  return (
    <div
      className={`mx-auto inline-flex rounded-full border px-4 py-2 text-xs font-black ${config[roleType].className}`}
    >
      {config[roleType].label}
    </div>
  );
}

function StatCard({
  icon,
  title,
  value,
  description,
  tone,
}: {
  icon: ReactNode;
  title: string;
  value: string;
  description: string;
  tone: ToneType;
}) {
  const toneClass: Record<ToneType, string> = {
    blue: "bg-blue-50 text-blue-700",
    orange: "bg-orange-50 text-orange-700",
    amber: "bg-amber-50 text-amber-700",
    slate: "bg-slate-100 text-slate-700",
  };

  return (
    <div className="rounded-[26px] border border-slate-200 bg-white p-5 text-center shadow-sm">
      <div
        className={`mx-auto flex h-12 w-12 items-center justify-center rounded-2xl ${toneClass[tone]}`}
      >
        {icon}
      </div>

      <p className="mt-4 text-[12px] font-black uppercase tracking-wide text-slate-400">
        {title}
      </p>

      <p className="mt-2 text-3xl font-black text-slate-900">{value}</p>

      <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
        {description}
      </p>
    </div>
  );
}


function CrmTaskSummaryCard({
  icon,
  title,
  value,
  description,
  tone,
}: {
  icon: ReactNode;
  title: string;
  value: string;
  description: string;
  tone: "blue" | "red" | "amber";
}) {
  const toneClass = {
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    red: "bg-red-50 text-red-700 border-red-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
  }[tone];

  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-4 text-center shadow-sm">
      <div
        className={`mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border ${toneClass}`}
      >
        {icon}
      </div>
      <p className="mt-3 text-[11px] font-black uppercase tracking-wide text-slate-400">
        {title}
      </p>
      <p className="mt-2 text-3xl font-black text-slate-900">{value}</p>
      <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">
        {description}
      </p>
    </div>
  );
}

function DashboardTaskRow({ task }: { task: DashboardTaskItem }) {
  return (
    <Link
      href="/crm"
      className="block rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-center transition hover:bg-white"
    >
      <div className="text-sm font-black text-slate-900">{task.title}</div>
      <div className="mt-1 text-xs font-semibold text-slate-500">
        {task.customerName}
        {task.customerPhone ? ` · ${task.customerPhone}` : ""}
      </div>
      <div className="mt-2 text-[11px] font-black text-blue-700">
        {formatTaskTime(task.dueDate)}
      </div>
    </Link>
  );
}

function CrmActivitySummaryCard({
  icon,
  title,
  value,
  description,
  tone,
}: {
  icon: ReactNode;
  title: string;
  value: string;
  description: string;
  tone: "blue" | "green" | "slate";
}) {
  const toneClass = {
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    green: "bg-emerald-50 text-emerald-700 border-emerald-100",
    slate: "bg-slate-100 text-slate-700 border-slate-200",
  }[tone];

  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-4 text-center shadow-sm">
      <div
        className={`mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border ${toneClass}`}
      >
        {icon}
      </div>
      <p className="mt-3 text-[11px] font-black uppercase tracking-wide text-slate-400">
        {title}
      </p>
      <p className="mt-2 text-3xl font-black text-slate-900">{value}</p>
      <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">
        {description}
      </p>
    </div>
  );
}

function DashboardActivityRow({ activity }: { activity: DashboardActivityItem }) {
  return (
    <Link
      href="/crm"
      className="block rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-center transition hover:bg-white"
    >
      <div className="text-[11px] font-black uppercase tracking-wide text-blue-700">
        {activityTypeLabel(activity.type)}
      </div>
      <div className="mt-1 text-sm font-black text-slate-900">
        {activity.customerName}
      </div>
      <div className="mt-1 line-clamp-2 text-xs font-semibold leading-5 text-slate-500">
        {activity.note}
      </div>
      <div className="mt-2 text-[11px] font-black text-slate-400">
        {formatActivityTime(activity.createdAt)}
      </div>
    </Link>
  );
}

function QuickAction({
  href,
  icon,
  label,
  tone,
}: {
  href: string;
  icon: ReactNode;
  label: string;
  tone: ToneType;
}) {
  const toneClass: Record<ToneType, string> = {
    blue: "bg-blue-600 shadow-blue-600/20",
    orange: "bg-orange-600 shadow-orange-600/20",
    amber: "bg-[#C9A84C] shadow-[#C9A84C]/20",
    slate: "bg-slate-900 shadow-slate-900/20",
  };

  return (
    <Link
      href={href}
      className="rounded-[24px] border border-slate-200 bg-white p-4 text-center shadow-sm transition hover:-translate-y-1"
    >
      <div
        className={`mx-auto flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-lg ${toneClass[tone]}`}
      >
        {icon}
      </div>

      <span className="mt-3 block text-sm font-black text-slate-800">
        {label}
      </span>
    </Link>
  );
}


function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfToday() {
  const date = new Date();
  date.setHours(23, 59, 59, 999);
  return date;
}

function formatTaskTime(value?: string | null) {
  if (!value) return "Saat yok";
  const date = new Date(value);
  return `${date.toLocaleDateString("tr-TR")} · ${date.toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

function flattenCustomerTasks(customers: CrmDashboardCustomer[]) {
  return customers
    .flatMap((customer) =>
      (customer.tasks || [])
        .filter((task) => task.status === "BEKLIYOR")
        .map((task) => ({
          ...task,
          customerId: customer.id,
          customerName: `${customer.firstName} ${customer.lastName}`.trim(),
          customerPhone: customer.phone,
        })),
    )
    .sort((a, b) => {
      const aTime = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
      const bTime = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
      return aTime - bTime;
    });
}

function flattenCustomerActivities(customers: CrmDashboardCustomer[]) {
  return customers
    .flatMap((customer) =>
      (customer.activities || []).map((activity) => ({
        ...activity,
        customerId: customer.id,
        customerName: `${customer.firstName} ${customer.lastName}`.trim(),
        customerPhone: customer.phone,
      })),
    )
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
}

function activityTypeLabel(type?: string) {
  const labels: Record<string, string> = {
    TELEFON: "Telefon",
    WHATSAPP: "WhatsApp",
    EMAIL: "E-posta",
    YER_GOSTERIMI: "Yer Gösterimi",
    TEKLIF: "Teklif",
    NOT: "Not",
    DIGER: "Diğer",
  };

  return labels[String(type || "")] || "Aktivite";
}

function formatActivityTime(value?: string | null) {
  if (!value) return "Tarih yok";

  const date = new Date(value);

  return `${date.toLocaleDateString("tr-TR")} · ${date.toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

function isThisWeek(value?: string | null) {
  if (!value) return false;

  const date = new Date(value);
  const now = new Date();
  const day = now.getDay() || 7;
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - day + 1);
  weekStart.setHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  return date >= weekStart && date <= weekEnd;
}


export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [hydrated, setHydrated] = useState(false);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [networkNotifications, setNetworkNotifications] =
    useState<NetworkNotificationResponse>({ unreadCount: 0, items: [] });
  const [featuredPosts, setFeaturedPosts] = useState<FeaturedNetworkPost[]>([]);
  const [crmCustomers, setCrmCustomers] = useState<CrmDashboardCustomer[]>([]);
  const [loading, setLoading] = useState(true);

  const roleType = getRoleType(user?.role);

  const firstName =
    user?.firstName?.trim() || user?.email?.split("@")[0] || "EPH Üyesi";

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    if (!user) {
      router.push("/giris");
      return;
    }

    fetchDashboardData();
  }, [hydrated, user, router]);

  const fetchDashboardData = async () => {
    setLoading(true);

    try {
      const [summaryRes, conversationsRes, notificationsRes, featuredRes, crmCustomersRes] = await Promise.all([
        api.get("/dashboard/summary"),
        user?.id
          ? api.get(`/conversations?userId=${user.id}`)
          : Promise.resolve({ data: [] }),
        user?.id
          ? api.get(`/network/notifications?userId=${user.id}`)
          : Promise.resolve({ data: { unreadCount: 0, items: [] } }),
        api.get("/network/posts/featured"),
        api.get("/crm/customers"),
      ]);

      setSummary(summaryRes.data);

      const conversations = Array.isArray(conversationsRes.data)
        ? (conversationsRes.data as Conversation[])
        : [];

      const unreadTotal = conversations.reduce(
        (sum, item) => sum + (item.unreadCount || 0),
        0,
      );

      setUnreadMessages(unreadTotal);
      setNetworkNotifications(
        notificationsRes.data || { unreadCount: 0, items: [] },
      );
      setFeaturedPosts(Array.isArray(featuredRes.data) ? featuredRes.data : []);
      setCrmCustomers(
        Array.isArray(crmCustomersRes.data)
          ? (crmCustomersRes.data as CrmDashboardCustomer[])
          : [],
      );
    } catch {
      setSummary(null);
      setUnreadMessages(0);
      setNetworkNotifications({ unreadCount: 0, items: [] });
      setFeaturedPosts([]);
      setCrmCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  const markNetworkNotificationsRead = async () => {
    if (!user?.id || networkNotifications.unreadCount === 0) return;

    try {
      await api.post("/network/notifications/read", {
        userId: user.id,
      });

      setNetworkNotifications((current) => ({
        ...current,
        unreadCount: 0,
        items: current.items.map((item) => ({
          ...item,
          isRead: true,
        })),
      }));
    } catch {}
  };

  const stats = summary?.stats || {
    totalUnits: 0,
    totalCustomers: 0,
    totalVisits: 0,
    totalProjects: 0,
  };

  const pendingTaskCount = summary?.pendingTasks?.length || 0;
  const crmTasks = useMemo(() => flattenCustomerTasks(crmCustomers), [crmCustomers]);

  const todayStart = startOfToday();
  const todayEnd = endOfToday();

  const overdueTasks = crmTasks.filter((task) => {
    if (!task.dueDate) return false;
    return new Date(task.dueDate).getTime() < todayStart.getTime();
  });

  const todayTasks = crmTasks.filter((task) => {
    if (!task.dueDate) return false;
    const dueDate = new Date(task.dueDate);
    return dueDate >= todayStart && dueDate <= todayEnd;
  });

  const upcomingTasks = crmTasks.filter((task) => {
    if (!task.dueDate) return false;
    return new Date(task.dueDate).getTime() > todayEnd.getTime();
  });

  const crmActivities = useMemo(
    () => flattenCustomerActivities(crmCustomers),
    [crmCustomers],
  );

  const totalCrmActivityCount = crmCustomers.reduce(
    (sum, customer) => sum + (customer._count?.activities || 0),
    0,
  );

  const thisWeekActivities = crmActivities.filter((activity) =>
    isThisWeek(activity.createdAt),
  );

  const latestActivities = crmActivities.slice(0, 5);


  const pageConfig = useMemo(() => {
    if (roleType === "construction") {
      return {
        title: "Ana Sayfa",
        tone: "amber" as ToneType,
        heroClass:
          "from-[#0B1F44] via-[#172554] to-[#C9A84C] shadow-[#C9A84C]/20",
        subtitle:
          "Projeler, stok durumu, tahsilatlar ve satış performansı tek ekranda.",
        stats: [
          {
            title: "Aktif Projeler",
            value: String(stats.totalProjects || 0),
            description: "Devam eden proje sayısı",
            icon: <Building2 size={22} />,
          },
          {
            title: "Toplam Stok",
            value: String(stats.totalUnits || 0),
            description: "Satıştaki bağımsız bölümler",
            icon: <Home size={22} />,
          },
          {
            title: "Bu Ay Tahsilat",
            value: "0 TL",
            description: "Tahsilat modülüyle dolacak",
            icon: <WalletCards size={22} />,
          },
          {
            title: "Satış Performansı",
            value: "%0",
            description: "Satış oranı takibi",
            icon: <TrendingUp size={22} />,
          },
        ],
        actions: [
          { label: "Projeler", href: "/stok", icon: <Building2 size={21} /> },
          {
            label: "Tahsilatlar",
            href: "/market",
            icon: <WalletCards size={21} />,
          },
          { label: "Pazaryeri", href: "/network", icon: <Store size={21} /> },
          { label: "Lina", href: "/lina", icon: <Bot size={21} /> },
        ],
      };
    }

    if (roleType === "contractor") {
      return {
        title: "Ana Sayfa",
        tone: "orange" as ToneType,
        heroClass:
          "from-orange-700 via-orange-600 to-amber-500 shadow-orange-600/20",
        subtitle:
          "Projelerini, iş ortaklarını ve pazaryeri fırsatlarını hızlıca takip et.",
        stats: [
          {
            title: "Aktif Projeler",
            value: String(stats.totalProjects || 0),
            description: "Devam eden projelerin",
            icon: <Building2 size={22} />,
          },
          {
            title: "Satılık Bölümler",
            value: String(stats.totalUnits || 0),
            description: "Satıştaki portföylerin",
            icon: <Home size={22} />,
          },
          {
            title: "İş Ortakları",
            value: String(stats.totalCustomers || 0),
            description: "Kayıtlı bağlantıların",
            icon: <BriefcaseBusiness size={22} />,
          },
          {
            title: "Mesajlar",
            value: String(unreadMessages),
            description: "Okunmamış görüşmeler",
            icon: <MessageCircle size={22} />,
          },
        ],
        actions: [
          { label: "Projelerim", href: "/stok", icon: <Building2 size={21} /> },
          {
            label: "İş Ortaklarım",
            href: "/crm",
            icon: <BriefcaseBusiness size={21} />,
          },
          { label: "Pazaryeri", href: "/network", icon: <Store size={21} /> },
          { label: "Lina", href: "/lina", icon: <Bot size={21} /> },
        ],
      };
    }

    if (roleType === "admin") {
      return {
        title: "Admin",
        tone: "slate" as ToneType,
        heroClass:
          "from-slate-950 via-slate-900 to-blue-950 shadow-slate-900/20",
        subtitle:
          "Kullanıcı, başvuru, stok ve platform yönetimi için komuta ekranı.",
        stats: [
          {
            title: "Kullanıcılar",
            value: String(stats.totalCustomers || 0),
            description: "Sistem kayıtları",
            icon: <UsersRound size={22} />,
          },
          {
            title: "Stok",
            value: String(stats.totalUnits || 0),
            description: "Toplam kayıt",
            icon: <Building2 size={22} />,
          },
          {
            title: "Ziyaret",
            value: String(stats.totalVisits || 0),
            description: "Platform trafiği",
            icon: <TrendingUp size={22} />,
          },
          {
            title: "Mesajlar",
            value: String(unreadMessages),
            description: "Okunmamış mesaj",
            icon: <MessageCircle size={22} />,
          },
        ],
        actions: [
          { label: "Admin", href: "/admin", icon: <CheckSquare size={21} /> },
          { label: "Stok", href: "/stok", icon: <Building2 size={21} /> },
          { label: "Pazaryeri", href: "/network", icon: <Store size={21} /> },
          {
            label: "Mesajlar",
            href: "/messages",
            icon: <MessageCircle size={21} />,
          },
        ],
      };
    }

    return {
      title: "Ana Sayfa",
      tone: "blue" as ToneType,
      heroClass: "from-[#0B1F44] via-[#123B7A] to-[#2563EB] shadow-blue-600/20",
      subtitle:
        "İlanlarını, müşterilerini, görevlerini ve pazaryeri fırsatlarını takip et.",
      stats: [
        {
          title: "Toplam İlan",
          value: String(stats.totalUnits || 0),
          description: "Aktif portföy kayıtların",
          icon: <Building2 size={22} />,
        },
        {
          title: "Müşterilerim",
          value: String(stats.totalCustomers || 0),
          description: "CRM müşteri kayıtların",
          icon: <UsersRound size={22} />,
        },
        {
          title: "Görevler",
          value: String(pendingTaskCount),
          description: "Bekleyen işlerin",
          icon: <CalendarCheck size={22} />,
        },
        {
          title: "Mesajlar",
          value: String(unreadMessages),
          description: "Okunmamış görüşmeler",
          icon: <MessageCircle size={22} />,
        },
      ],
      actions: [
        { label: "İlan Ekle", href: "/stok", icon: <Plus size={21} /> },
        {
          label: "Müşteri Ekle",
          href: "/crm",
          icon: <UsersRound size={21} />,
        },
        { label: "Pazaryeri", href: "/network", icon: <Store size={21} /> },
        { label: "Lina", href: "/lina", icon: <Bot size={21} /> },
      ],
    };
  }, [roleType, stats, pendingTaskCount, unreadMessages]);

  if (!hydrated || loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F8FAFC]">
        <div className="flex flex-col items-center gap-4 text-slate-700">
          <Loader2 className="animate-spin" size={34} />
          <p className="text-sm font-black">Dashboard yükleniyor...</p>
        </div>
      </main>
    );
  }

  return (
    <EphAppShell title={pageConfig.title}>
      <div className="mx-auto w-full max-w-6xl">
        <section
          className={`overflow-hidden rounded-[32px] bg-gradient-to-br ${pageConfig.heroClass} p-6 text-center text-white shadow-2xl md:p-8`}
        >
          <RoleBadge roleType={roleType} />

          <h1 className="mt-5 text-3xl font-black tracking-tight md:text-5xl">
            {getGreeting()} {firstName}
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-sm font-semibold leading-7 text-white/75 md:text-base">
            {pageConfig.subtitle}
          </p>

          <div className="mt-6 inline-flex rounded-full bg-white/12 px-4 py-2 text-xs font-black text-white backdrop-blur">
            EPH Platform · Rol bazlı panel
          </div>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {pageConfig.stats.map((item) => (
            <StatCard
              key={item.title}
              icon={item.icon}
              title={item.title}
              value={item.value}
              description={item.description}
              tone={pageConfig.tone}
            />
          ))}
        </section>



        <section className="mt-6 rounded-[30px] border border-slate-200 bg-white p-5 text-center shadow-sm md:p-6">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
            <CalendarCheck size={24} />
          </div>

          <h2 className="mt-4 text-2xl font-black text-slate-900">
            CRM Görev Alarm Merkezi
          </h2>

          <p className="mx-auto mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-500">
            Bugünkü, geciken ve yaklaşan müşteri görevlerini tek ekrandan takip et.
          </p>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <CrmTaskSummaryCard
              icon={<CalendarCheck size={22} />}
              title="Bugünkü Görev"
              value={String(todayTasks.length)}
              description="Bugün tamamlanması gereken CRM işleri"
              tone="blue"
            />
            <CrmTaskSummaryCard
              icon={<Clock3 size={22} />}
              title="Geciken Görev"
              value={String(overdueTasks.length)}
              description="Tarihi geçmiş ve tamamlanmamış işler"
              tone="red"
            />
            <CrmTaskSummaryCard
              icon={<CheckSquare size={22} />}
              title="Yaklaşan Görev"
              value={String(upcomingTasks.length)}
              description="Bugünden sonraki planlı müşteri işleri"
              tone="amber"
            />
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <div className="rounded-[24px] border border-slate-100 bg-white p-4">
              <h3 className="text-sm font-black text-slate-900">Bugünkü İşlerim</h3>
              <div className="mt-3 space-y-2">
                {todayTasks.length > 0 ? (
                  todayTasks.slice(0, 3).map((task) => (
                    <DashboardTaskRow key={task.id} task={task} />
                  ))
                ) : (
                  <div className="rounded-2xl bg-slate-50 px-4 py-4 text-xs font-semibold text-slate-500">
                    Bugün için planlı görev yok.
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-[24px] border border-red-100 bg-red-50/50 p-4">
              <h3 className="text-sm font-black text-red-700">Geciken Görevler</h3>
              <div className="mt-3 space-y-2">
                {overdueTasks.length > 0 ? (
                  overdueTasks.slice(0, 3).map((task) => (
                    <DashboardTaskRow key={task.id} task={task} />
                  ))
                ) : (
                  <div className="rounded-2xl bg-white px-4 py-4 text-xs font-semibold text-slate-500">
                    Geciken görev yok.
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-[24px] border border-amber-100 bg-amber-50/50 p-4">
              <h3 className="text-sm font-black text-amber-700">Yaklaşan Görevler</h3>
              <div className="mt-3 space-y-2">
                {upcomingTasks.length > 0 ? (
                  upcomingTasks.slice(0, 3).map((task) => (
                    <DashboardTaskRow key={task.id} task={task} />
                  ))
                ) : (
                  <div className="rounded-2xl bg-white px-4 py-4 text-xs font-semibold text-slate-500">
                    Yaklaşan görev yok.
                  </div>
                )}
              </div>
            </div>
          </div>

          <Link
            href="/crm"
            className="mt-5 inline-flex rounded-2xl bg-slate-900 px-5 py-3 text-sm font-black text-white"
          >
            CRM Görevlerini Aç
          </Link>
        </section>

        <section className="mt-6 rounded-[30px] border border-slate-200 bg-white p-5 text-center shadow-sm md:p-6">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
            <FileText size={24} />
          </div>

          <h2 className="mt-4 text-2xl font-black text-slate-900">
            CRM Aktivite Özeti
          </h2>

          <p className="mx-auto mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-500">
            Müşteri görüşmeleri, notlar ve saha hareketlerini tek ekrandan izle.
          </p>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <CrmActivitySummaryCard
              icon={<UsersRound size={22} />}
              title="Toplam Müşteri"
              value={String(crmCustomers.length)}
              description="CRM içinde kayıtlı müşteri sayısı"
              tone="blue"
            />
            <CrmActivitySummaryCard
              icon={<FileText size={22} />}
              title="Toplam Aktivite"
              value={String(totalCrmActivityCount)}
              description="Tüm müşteri kayıtlarındaki aktivite sayısı"
              tone="green"
            />
            <CrmActivitySummaryCard
              icon={<TrendingUp size={22} />}
              title="Bu Hafta Aktivite"
              value={String(thisWeekActivities.length)}
              description="Bu hafta işlenen son müşteri aktiviteleri"
              tone="slate"
            />
          </div>

          <div className="mt-5 rounded-[24px] border border-slate-100 bg-white p-4">
            <h3 className="text-sm font-black text-slate-900">Son Aktiviteler</h3>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {latestActivities.length > 0 ? (
                latestActivities.map((activity) => (
                  <DashboardActivityRow key={activity.id} activity={activity} />
                ))
              ) : (
                <div className="rounded-2xl bg-slate-50 px-4 py-5 text-xs font-semibold text-slate-500 md:col-span-2">
                  Henüz CRM aktivitesi yok. Müşteri detayından telefon, WhatsApp, not veya yer gösterimi ekleyebilirsin.
                </div>
              )}
            </div>
          </div>

          <Link
            href="/crm"
            className="mt-5 inline-flex rounded-2xl bg-slate-900 px-5 py-3 text-sm font-black text-white"
          >
            CRM Aktivitelerini Aç
          </Link>
        </section>

        <section className="mt-6 rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div className="text-center">
            <h2 className="text-2xl font-black text-slate-900">
              Hızlı İşlemler
            </h2>

            <p className="mx-auto mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-500">
              En sık kullanacağın işlemlere buradan hızlıca ulaşabilirsin.
            </p>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
            {pageConfig.actions.map((item) => (
              <QuickAction
                key={item.label}
                href={item.href}
                icon={item.icon}
                label={item.label}
                tone={pageConfig.tone}
              />
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-[30px] border border-slate-200 bg-white p-5 text-center shadow-sm md:p-6">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
            <TrendingUp size={24} />
          </div>

          <h2 className="mt-4 text-2xl font-black text-slate-900">
            Öne Çıkan Pazaryeri İlanları
          </h2>

          <p className="mx-auto mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-500">
            Görüntülenme, takip ve gelen talep verilerine göre en hareketli paylaşımlar.
          </p>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {featuredPosts.length > 0 ? (
              featuredPosts.slice(0, 6).map((post) => (
                <button
                  key={post.id}
                  onClick={() => router.push(`/network/${post.id}`)}
                  className="rounded-[24px] border border-slate-100 bg-slate-50 p-4 text-center transition hover:bg-white"
                >
                  <div className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                    {post.type}
                  </div>

                  <h3 className="mt-2 line-clamp-2 text-sm font-black text-slate-900">
                    {post.title}
                  </h3>

                  <p className="mt-2 text-xs font-semibold text-slate-500">
                    {[post.city, post.district].filter(Boolean).join(" / ") ||
                      "Lokasyon belirtilmedi"}
                  </p>

                  <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-2xl bg-white px-2 py-2">
                      <div className="text-sm font-black text-slate-900">
                        {post.viewCount}
                      </div>
                      <div className="text-[9px] font-black uppercase text-slate-400">
                        Görüntü
                      </div>
                    </div>

                    <div className="rounded-2xl bg-white px-2 py-2">
                      <div className="text-sm font-black text-slate-900">
                        {post.followerCount}
                      </div>
                      <div className="text-[9px] font-black uppercase text-slate-400">
                        Takip
                      </div>
                    </div>

                    <div className="rounded-2xl bg-white px-2 py-2">
                      <div className="text-sm font-black text-slate-900">
                        {post.requestCount}
                      </div>
                      <div className="text-[9px] font-black uppercase text-slate-400">
                        Talep
                      </div>
                    </div>
                  </div>
                </button>
              ))
            ) : (
              <div className="rounded-2xl bg-slate-50 px-4 py-5 text-sm font-semibold text-slate-500 md:col-span-3">
                Öne çıkan ilan verisi oluşması için pazaryerinde biraz etkileşim gerekiyor.
              </div>
            )}
          </div>
        </section>

        <section className="mt-6 rounded-[30px] border border-slate-200 bg-white p-5 text-center shadow-sm md:p-6">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
            <Bell size={24} />
          </div>

          <h2 className="mt-4 text-2xl font-black text-slate-900">
            Bildirimlerim
          </h2>

          <p className="mx-auto mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-500">
            Takip ettiğin pazaryeri paylaşımlarındaki güncellemeler burada görünür.
          </p>

          <div className="mt-5 grid gap-3">
            {networkNotifications.items.length > 0 ? (
              networkNotifications.items.slice(0, 4).map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    markNetworkNotificationsRead();
                    if (item.postId) router.push(`/network/${item.postId}`);
                  }}
                  className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4 text-center transition hover:bg-white"
                >
                  <div className="flex flex-col items-center justify-center gap-2 md:flex-row">
                    {!item.isRead && (
                      <span className="rounded-full bg-red-600 px-2 py-1 text-[10px] font-black text-white">
                        YENİ
                      </span>
                    )}

                    <span className="text-sm font-black text-slate-900">
                      {item.title}
                    </span>
                  </div>

                  <p className="mx-auto mt-2 max-w-3xl whitespace-pre-line text-xs font-semibold leading-6 text-slate-500">
                    {item.message}
                  </p>
                </button>
              ))
            ) : (
              <div className="rounded-2xl bg-slate-50 px-4 py-5 text-sm font-semibold text-slate-500">
                Henüz bildirimin yok. Takip ettiğin ilanlar güncellendiğinde burada görünür.
              </div>
            )}
          </div>

          {networkNotifications.unreadCount > 0 && (
            <button
              onClick={markNetworkNotificationsRead}
              className="mt-5 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-black text-white"
            >
              {networkNotifications.unreadCount} bildirimi okundu yap
            </button>
          )}
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-[30px] border border-slate-200 bg-white p-5 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
              <CalendarCheck size={24} />
            </div>

            <h3 className="mt-4 text-xl font-black text-slate-900">
              CRM Merkezi
            </h3>

            <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
              Müşteri kayıtları, görevler ve satış aşamalarını yönet.
            </p>

            <Link
              href="/crm"
              className="mt-4 inline-flex rounded-2xl bg-slate-900 px-5 py-3 text-sm font-black text-white"
            >
              Görevleri Aç
            </Link>
          </div>

          <div className="rounded-[30px] border border-slate-200 bg-white p-5 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
              <Bot size={24} />
            </div>

            <h3 className="mt-4 text-xl font-black text-slate-900">Lina AI</h3>

            <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
              İlan, proje, müşteri ve pazaryeri işlemlerinde Lina’dan destek al.
            </p>

            <Link
              href="/lina"
              className="mt-4 inline-flex rounded-2xl bg-slate-900 px-5 py-3 text-sm font-black text-white"
            >
              Lina’yı Aç
            </Link>
          </div>
        </section>
      </div>
    </EphAppShell>
  );
}