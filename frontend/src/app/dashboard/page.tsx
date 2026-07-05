"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  Bell,
  Bot,
  Building2,
  CalendarDays,
  ClipboardCheck,
  Clock3,
  FileText,
  Filter,
  Headphones,
  Heart,
  KeyRound,
  LayoutDashboard,
  ListChecks,
  Loader2,
  Map,
  MessageCircle,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Target,
  UserCog,
  UserPlus,
  UsersRound,
  Waves,
} from "lucide-react";

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
};

type CrmCustomer = {
  id: string;
  tasks?: Array<{
    id: string;
    dueDate?: string | null;
    status: string;
  }>;
};

type NetworkPost = {
  id: string;
  userId?: string | null;
  user?: { id?: string | null } | null;
};

type NotificationResponse = {
  unreadCount: number;
  items?: Array<{ id: string; title?: string; isRead?: boolean }>;
};

type DashboardItem = {
  href: string;
  label: string;
  value: string;
  icon: ReactNode;
  roles?: string[];
};

function normalizeRole(role?: string | null) {
  return String(role || "").toLocaleUpperCase("tr-TR").trim();
}

function roleLabel(role?: string | null) {
  const value = normalizeRole(role);

  if (value === "SUPER_ADMIN") return "Yazılım Ekibi";
  if (value === "ADMIN") return "Admin";
  if (value === "MODERATOR") return "Moderatör";
  if (value.includes("MUTEAHHIT") || value.includes("MÜTEAHHİT")) return "Müteahhit";
  if (value.includes("INSAAT") || value.includes("İNŞAAT")) return "İnşaat Firması";
  if (value.includes("OFIS") || value.includes("OFFICE")) return "Ofis Sahibi";
  if (value.includes("TAKIM") || value.includes("TEAM")) return "Takım Lideri";

  return "Gayrimenkul Danışmanı";
}

function firstName(user?: { firstName?: string | null; email?: string | null } | null) {
  return user?.firstName?.trim() || user?.email?.split("@")[0] || "EPH Üyesi";
}

function countTodayTasks(customers: CrmCustomer[]) {
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);

  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  return customers.reduce((total, customer) => {
    const count = (customer.tasks || []).filter((task) => {
      if (task.status !== "BEKLIYOR" || !task.dueDate) return false;
      const due = new Date(task.dueDate);
      return due >= start && due <= end;
    }).length;

    return total + count;
  }, 0);
}

function countAllTasks(customers: CrmCustomer[]) {
  return customers.reduce(
    (total, customer) =>
      total + (customer.tasks || []).filter((task) => task.status === "BEKLIYOR").length,
    0,
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [customers, setCustomers] = useState<CrmCustomer[]>([]);
  const [posts, setPosts] = useState<NetworkPost[]>([]);
  const [notifications, setNotifications] = useState<NotificationResponse>({
    unreadCount: 0,
    items: [],
  });
  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    if (!user) {
      router.push("/giris");
      return;
    }

    void fetchDashboard();
  }, [hydrated, router, user]);

  async function fetchDashboard() {
    setLoading(true);

    try {
      const [summaryResult, customerResult, postResult, notificationResult, conversationResult] =
        await Promise.allSettled([
          api.get("/dashboard/summary"),
          api.get("/crm/customers"),
          api.get("/network/posts/featured"),
          user?.id
            ? api.get(`/network/notifications?userId=${user.id}`)
            : Promise.resolve({ data: { unreadCount: 0, items: [] } }),
          user?.id
            ? api.get(`/conversations?userId=${user.id}`)
            : Promise.resolve({ data: [] }),
        ]);

      setSummary(summaryResult.status === "fulfilled" ? summaryResult.value.data : null);

      setCustomers(
        customerResult.status === "fulfilled" && Array.isArray(customerResult.value.data)
          ? customerResult.value.data
          : [],
      );

      setPosts(
        postResult.status === "fulfilled" && Array.isArray(postResult.value.data)
          ? postResult.value.data
          : [],
      );

      setNotifications(
        notificationResult.status === "fulfilled"
          ? notificationResult.value.data || { unreadCount: 0, items: [] }
          : { unreadCount: 0, items: [] },
      );

      if (conversationResult.status === "fulfilled" && Array.isArray(conversationResult.value.data)) {
        const total = (conversationResult.value.data as Conversation[]).reduce(
          (sum, conversation) => sum + Number(conversation.unreadCount || 0),
          0,
        );
        setUnreadMessages(total);
      } else {
        setUnreadMessages(0);
      }
    } finally {
      setLoading(false);
    }
  }

  const normalizedRole = normalizeRole(user?.role);
  const role = roleLabel(user?.role);
  const name = firstName(user);
  const stats = summary?.stats || {};
  const todayTasks = useMemo(() => countTodayTasks(customers), [customers]);
  const allTasks = useMemo(() => countAllTasks(customers), [customers]);

  const visiblePosts = useMemo(
    () =>
      posts.filter((post) => {
        const ownerId = post.userId || post.user?.id;
        return !user?.id || !ownerId || ownerId !== user.id;
      }),
    [posts, user?.id],
  );

  const dashboardText =
    todayTasks || unreadMessages || visiblePosts.length
      ? `Bugün ${todayTasks} görev, ${unreadMessages} mesaj ve ${visiblePosts.length} talep görünüyor.`
      : "Bugün paneliniz sakin görünüyor.";

  const portfolioItems: DashboardItem[] = [
    {
      href: "/portfoy",
      label: "Portföy",
      value: String(stats.totalUnits || 0),
      icon: <Building2 size={18} />,
    },
    {
      href: "/portfoy?status=SATILIK",
      label: "Satılık",
      value: "Liste",
      icon: <KeyRound size={18} />,
    },
    {
      href: "/portfoy?status=KIRALIK",
      label: "Kiralık",
      value: "Liste",
      icon: <KeyRound size={18} />,
    },
    {
      href: "/portfoy?favorites=1",
      label: "Favorilerim",
      value: "Kayıtlar",
      icon: <Heart size={18} />,
    },
    {
      href: "/portfoy?sort=newest",
      label: "Son Eklenenler",
      value: "Yeni",
      icon: <Clock3 size={18} />,
    },
    {
      href: "/reports",
      label: "Raporlar",
      value: "Analiz",
      icon: <BarChart3 size={18} />,
    },
    {
      href: "/portfoy?map=1",
      label: "Harita",
      value: "Aç",
      icon: <Map size={18} />,
    },
  ];

  const crmItems: DashboardItem[] = [
    {
      href: "/crm",
      label: "CRM",
      value: `${allTasks} görev`,
      icon: <UsersRound size={18} />,
    },
    {
      href: "/crm",
      label: "Akıllı CRM",
      value: "V2",
      icon: <Sparkles size={18} />,
    },
    {
      href: "/crm",
      label: "Müşteriler",
      value: String(stats.totalCustomers || 0),
      icon: <UserPlus size={18} />,
    },
    {
      href: "/crm",
      label: "Teklifler",
      value: "Kayıtlar",
      icon: <FileText size={18} />,
    },
    {
      href: "/crm",
      label: "Takvim",
      value: "Bugün",
      icon: <CalendarDays size={18} />,
    },
    {
      href: "/crm",
      label: "Aramalar",
      value: "Takip",
      icon: <MessageCircle size={18} />,
    },
    {
      href: "/crm",
      label: "Notlar",
      value: "Kayıtlar",
      icon: <ListChecks size={18} />,
    },
  ];

  const forumItems: DashboardItem[] = [
    {
      href: "/network",
      label: "Talep Merkezi",
      value: String(visiblePosts.length),
      icon: <Target size={18} />,
    },
    {
      href: "/network?tab=mine",
      label: "Taleplerim",
      value: "Kayıtlar",
      icon: <FileText size={18} />,
    },
    {
      href: "/network?tab=saved",
      label: "Kaydettiklerim",
      value: "Kayıtlar",
      icon: <Heart size={18} />,
    },
    {
      href: "/network?tab=interested",
      label: "İlgilendiklerim",
      value: "Takip",
      icon: <UsersRound size={18} />,
    },
    {
      href: "/notification-settings",
      label: "Bildirimler",
      value: String(notifications.unreadCount || 0),
      icon: <Bell size={18} />,
    },
    {
      href: "/messages",
      label: "Mesajlar",
      value: String(unreadMessages),
      icon: <MessageCircle size={18} />,
    },
    {
      href: "/network?create=1",
      label: "Yeni Talep",
      value: "Oluştur",
      icon: <Plus size={18} />,
    },
  ];

  const poolItems: DashboardItem[] = [
    {
      href: "/havuz",
      label: "Havuz",
      value: "Aç",
      icon: <Waves size={18} />,
    },
    {
      href: "/havuz",
      label: "Havuzdaki Portföyler",
      value: "Liste",
      icon: <Building2 size={18} />,
    },
    {
      href: "/havuz",
      label: "Akış",
      value: "Güncel",
      icon: <Waves size={18} />,
    },
    {
      href: "/havuz",
      label: "Katılanlar",
      value: "Üyeler",
      icon: <UsersRound size={18} />,
    },
    {
      href: "/havuz",
      label: "İstatistikler",
      value: "Analiz",
      icon: <BarChart3 size={18} />,
    },
    {
      href: "/havuz",
      label: "Kurallar",
      value: "Bilgi",
      icon: <ShieldCheck size={18} />,
    },
    {
      href: "/havuz",
      label: "Ayarlar",
      value: "Düzenle",
      icon: <Settings size={18} />,
    },
  ];

  const managementItems: DashboardItem[] = [
    {
      href: "/admin",
      label: "Kullanıcılar",
      value: "Yönetim",
      icon: <UserCog size={18} />,
      roles: ["ADMIN", "SUPER_ADMIN"],
    },
    {
      href: "/admin",
      label: "Roller",
      value: "Yetki",
      icon: <ShieldCheck size={18} />,
      roles: ["ADMIN", "SUPER_ADMIN"],
    },
    {
      href: "/admin",
      label: "Yetkiler",
      value: "Kontrol",
      icon: <KeyRound size={18} />,
      roles: ["SUPER_ADMIN"],
    },
    {
      href: "/settings",
      label: "Ayarlar",
      value: "Genel",
      icon: <SlidersHorizontal size={18} />,
    },
    {
      href: "/admin/audit-logs",
      label: "Sistem Logları",
      value: "Kayıtlar",
      icon: <FileText size={18} />,
      roles: ["ADMIN", "SUPER_ADMIN"],
    },
    {
      href: "/help-center",
      label: "Destek Talepleri",
      value: "Destek",
      icon: <Headphones size={18} />,
    },
    {
      href: "/admin/announcements",
      label: "Duyurular",
      value: "Yayın",
      icon: <Bell size={18} />,
      roles: ["ADMIN", "SUPER_ADMIN"],
    },
  ].filter((item) => !item.roles || item.roles.includes(normalizedRole));

  if (!hydrated || loading) {
    return (
      <main className="flex min-h-[calc(100dvh-74px)] items-center justify-center bg-[#F7F7FF] px-4">
        <div className="flex flex-col items-center gap-3 text-center text-[#0F1D45]">
          <Loader2 className="animate-spin text-[#6D28D9]" size={28} />
          <p className="text-[13px] font-black">Ana sayfa hazırlanıyor...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100dvh-74px)] bg-[radial-gradient(circle_at_top,#FFFFFF_0%,#F7F7FF_54%,#F1F3FF_100%)] px-3 pb-24 pt-2 text-[#0F1D45]">
      <div className="mx-auto w-full max-w-[430px] space-y-3">
        <section className="overflow-hidden rounded-[24px] border border-[#E2E4F5] bg-white shadow-[0_14px_34px_rgba(45,49,112,0.08)]">
          <div className="relative min-h-[132px] overflow-hidden px-4 py-4">
            <div className="relative z-10 max-w-[58%]">
              <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#6D28D9]">
                {role}
              </p>
              <h1 className="mt-1.5 text-[25px] font-black leading-[1.02] tracking-[-0.045em] text-[#0F1D45]">
                Merhaba {name}
              </h1>
              <p className="mt-2 text-[11px] font-bold leading-4 text-[#64748B]">
                {dashboardText}
              </p>
            </div>

            <img
              src="/dashboard/eph-istanbul-banner.png"
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute bottom-0 right-[-10px] h-[116px] w-[72%] object-contain object-right-bottom opacity-95"
            />
          </div>

          <div className="grid grid-cols-3 border-t border-[#E9EAF4] bg-white">
            <HeroStat icon={<ClipboardCheck size={16} />} label="Görev" value={todayTasks} />
            <HeroStat icon={<MessageCircle size={16} />} label="Mesaj" value={unreadMessages} />
            <HeroStat icon={<Target size={16} />} label="Talep" value={visiblePosts.length} />
          </div>
        </section>

        <section className="grid grid-cols-2 gap-2">
          <ActionButton
            href="/crm?new=1"
            icon={<UserPlus size={15} />}
            label="Yeni CRM Kaydı"
            tone="blue"
            delay={0}
          />
          <ActionButton
            href="/portfoy?create=1"
            icon={<Plus size={15} />}
            label="Yeni Portföy"
            tone="violet"
            delay={500}
          />
          <ActionButton
            href="/network?create=1"
            icon={<FileText size={15} />}
            label="Talep Oluştur"
            tone="orange"
            delay={1000}
          />
          <ActionButton
            href="/havuz"
            icon={<Waves size={15} />}
            label="Havuzu Kontrol Et"
            tone="green"
            delay={1500}
          />
        </section>

        <DashboardSection title="Portföyler" icon={<Building2 size={15} />} items={portfolioItems} />
        <DashboardSection title="CRM" icon={<UsersRound size={15} />} items={crmItems} />
        <DashboardSection title="Forum" icon={<MessageCircle size={15} />} items={forumItems} />
        <DashboardSection title="Havuz" icon={<Waves size={15} />} items={poolItems} />

        {managementItems.length > 0 && (
          <DashboardSection
            title="Yönetim"
            icon={<Settings size={15} />}
            items={managementItems}
          />
        )}
      </div>

      <style jsx global>{`
        @keyframes dashboardCtaShine {
          0%,
          58% {
            transform: translateX(0) skewX(-18deg);
            opacity: 0;
          }
          66% {
            opacity: 0.72;
          }
          84% {
            transform: translateX(430%) skewX(-18deg);
            opacity: 0;
          }
          100% {
            transform: translateX(430%) skewX(-18deg);
            opacity: 0;
          }
        }


        @media (prefers-reduced-motion: reduce) {
          .dashboard-cta-motion {
            animation: none !important;
          }
        }
      `}</style>
    </main>
  );
}

function HeroStat({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: number | string;
}) {
  return (
    <div className="flex min-h-[72px] items-center justify-center gap-2 px-2 py-2.5 [&:not(:last-child)]:border-r [&:not(:last-child)]:border-[#E9EAF4]">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[11px] bg-[#F3F0FF] text-[#4F46E5]">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[8px] font-black uppercase tracking-[0.08em] text-[#64748B]">
          {label}
        </p>
        <p className="mt-0.5 text-[20px] font-black leading-none text-[#0F1D45]">
          {value}
        </p>
      </div>
    </div>
  );
}

function ActionButton({
  href,
  icon,
  label,
  tone,
  delay,
}: {
  href: string;
  icon: ReactNode;
  label: string;
  tone: "violet" | "blue" | "orange" | "green";
  delay: number;
}) {
  const styles = {
    violet: "from-[#7C3AED] to-[#5B21B6]",
    blue: "from-[#3B82F6] to-[#2563EB]",
    orange: "from-[#F59E0B] to-[#EA580C]",
    green: "from-[#22C55E] to-[#16A34A]",
  };

  return (
    <Link
      href={href}
      className={`group relative flex min-h-[48px] overflow-hidden items-center justify-center gap-2 rounded-[15px] bg-gradient-to-r ${styles[tone]} px-3 text-center text-[11px] font-black text-white shadow-[0_10px_20px_rgba(15,23,42,0.09)] active:scale-[0.98]`}
    >
      <span className="pointer-events-none absolute inset-y-0 left-[-45%] w-[36%] skew-x-[-18deg] bg-white/25 blur-[1px] animate-[dashboardCtaShine_3.4s_ease-in-out_infinite]" />
      <span className="relative z-10 shrink-0 transition-transform duration-200 group-active:scale-90">
        {icon}
      </span>
      <TypewriterLabel text={label} delay={delay} />
    </Link>
  );
}

function TypewriterLabel({ text, delay }: { text: string; delay: number }) {
  const [visibleText, setVisibleText] = useState("");

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;
    const timeoutId = window.setTimeout(() => {
      let index = 0;

      intervalId = setInterval(() => {
        index += 1;
        setVisibleText(text.slice(0, index));

        if (index >= text.length && intervalId) {
          clearInterval(intervalId);
        }
      }, 58);
    }, delay);

    return () => {
      window.clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
    };
  }, [delay, text]);

  return (
    <span className="relative z-10 inline-flex min-w-0 items-center whitespace-nowrap">
      <span>{visibleText}</span>
    </span>
  );
}

function DashboardSection({
  title,
  icon,
  items,
}: {
  title: string;
  icon: ReactNode;
  items: DashboardItem[];
}) {
  return (
    <section>
      <div className="mb-2 flex items-center gap-2 px-1">
        <span className="text-[#4F46E5]">{icon}</span>
        <h2 className="text-[14px] font-black uppercase tracking-[0.035em] text-[#1E2B67]">
          {title}
        </h2>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {items.map((item) => (
          <DashboardTile key={`${item.href}-${item.label}`} item={item} />
        ))}
      </div>
    </section>
  );
}

function DashboardTile({ item }: { item: DashboardItem }) {
  return (
    <Link
      href={item.href}
      className="flex min-h-[92px] min-w-0 flex-col items-center justify-center rounded-[17px] border border-[#E2E4F0] bg-white px-1.5 py-2 text-center shadow-[0_7px_18px_rgba(45,49,112,0.055)] transition active:scale-[0.98]"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-[11px] bg-[#F5F3FF] text-[#4338CA]">
        {item.icon}
      </span>
      <span className="mt-1.5 flex min-h-[28px] items-center justify-center text-[9px] font-black leading-[12px] text-[#0F1D45] [overflow-wrap:anywhere]">
        {item.label}
      </span>
      <span className="mt-0.5 text-[8px] font-bold leading-[10px] text-[#4F46E5]">
        {item.value}
      </span>
    </Link>
  );
}
