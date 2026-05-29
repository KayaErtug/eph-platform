"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bot,
  BriefcaseBusiness,
  Building2,
  CalendarCheck,
  CheckSquare,
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

type Conversation = {
  id: string;
  unreadCount?: number;
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
  return String(role || "")
    .toLocaleUpperCase("tr-TR")
    .trim();
}

function getRoleType(role?: string | null) {
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

function RoleBadge({ roleType }: { roleType: string }) {
  const config = {
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
  }[roleType];

  return (
    <div
      className={`mx-auto inline-flex rounded-full border px-4 py-2 text-xs font-black ${config.className}`}
    >
      {config.label}
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
  icon: React.ReactNode;
  title: string;
  value: string;
  description: string;
  tone: "blue" | "orange" | "amber" | "slate";
}) {
  const toneClass = {
    blue: "bg-blue-50 text-blue-700",
    orange: "bg-orange-50 text-orange-700",
    amber: "bg-amber-50 text-amber-700",
    slate: "bg-slate-100 text-slate-700",
  }[tone];

  return (
    <div className="rounded-[26px] border border-slate-200 bg-white p-5 text-center shadow-sm">
      <div
        className={`mx-auto flex h-12 w-12 items-center justify-center rounded-2xl ${toneClass}`}
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

function QuickAction({
  href,
  icon,
  label,
  tone,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  tone: "blue" | "orange" | "amber" | "slate";
}) {
  const toneClass = {
    blue: "bg-blue-600 shadow-blue-600/20",
    orange: "bg-orange-600 shadow-orange-600/20",
    amber: "bg-[#C9A84C] shadow-[#C9A84C]/20",
    slate: "bg-slate-900 shadow-slate-900/20",
  }[tone];

  return (
    <Link
      href={href}
      className="rounded-[24px] border border-slate-200 bg-white p-4 text-center shadow-sm transition hover:-translate-y-1"
    >
      <div
        className={`mx-auto flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-lg ${toneClass}`}
      >
        {icon}
      </div>

      <span className="mt-3 block text-sm font-black text-slate-800">
        {label}
      </span>
    </Link>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [hydrated, setHydrated] = useState(false);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [unreadMessages, setUnreadMessages] = useState(0);
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
      const [summaryRes, conversationsRes] = await Promise.all([
        api.get("/dashboard/summary"),
        user?.id
          ? api.get(`/conversations?userId=${user.id}`)
          : Promise.resolve({ data: [] }),
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
    } catch {
      setSummary(null);
      setUnreadMessages(0);
    } finally {
      setLoading(false);
    }
  };

  const stats = summary?.stats || {
    totalUnits: 0,
    totalCustomers: 0,
    totalVisits: 0,
    totalProjects: 0,
  };

  const pendingTaskCount = summary?.pendingTasks?.length || 0;

  const pageConfig = useMemo(() => {
    if (roleType === "construction") {
      return {
        title: "Ana Sayfa",
        tone: "amber" as const,
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
        tone: "orange" as const,
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
        tone: "slate" as const,
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
          { label: "Mesajlar", href: "/messages", icon: <MessageCircle size={21} /> },
        ],
      };
    }

    return {
      title: "Ana Sayfa",
      tone: "blue" as const,
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

        <section className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-[30px] border border-slate-200 bg-white p-5 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
              <CalendarCheck size={24} />
            </div>

            <h3 className="mt-4 text-xl font-black text-slate-900">
              Bugünkü İşler
            </h3>

            <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
              Bekleyen görev sayısı: {pendingTaskCount}
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

            <h3 className="mt-4 text-xl font-black text-slate-900">
              Lina AI
            </h3>

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