"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  Bell,
  Bot,
  Building2,
  ClipboardCheck,
  FileText,
  Filter,
  Headphones,
  Heart,
  KeyRound,
  LayoutDashboard,
  Loader2,
  Map,
  MessageCircle,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
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

type DashboardTone =
  | "portfolio"
  | "crm"
  | "forum"
  | "pool"
  | "management";

const DASHBOARD_TONE_STYLES: Record<
  DashboardTone,
  {
    section: string;
    heading: string;
    headingIcon: string;
    tileBorder: string;
    tileIcon: string;
    tileValue: string;
  }
> = {
  portfolio: {
    section: "border-[#D7E5F5] bg-[#F4F8FF]",
    heading: "text-[#174A7E]",
    headingIcon: "bg-[#E5F0FF] text-[#2563EB]",
    tileBorder: "border-[#D9E7F7]",
    tileIcon: "bg-[#EDF4FF] text-[#2563EB]",
    tileValue: "text-[#2563EB]",
  },
  crm: {
    section: "border-[#E4DCF7] bg-[#F8F5FF]",
    heading: "text-[#5B3A86]",
    headingIcon: "bg-[#EEE7FF] text-[#7C3AED]",
    tileBorder: "border-[#E5DDF7]",
    tileIcon: "bg-[#F1ECFF] text-[#7C3AED]",
    tileValue: "text-[#6D28D9]",
  },
  forum: {
    section: "border-[#F0DDE3] bg-[#FFF7F8]",
    heading: "text-[#8A3F55]",
    headingIcon: "bg-[#FBE9EE] text-[#BE4565]",
    tileBorder: "border-[#F1DFE5]",
    tileIcon: "bg-[#FCEEF2] text-[#BE4565]",
    tileValue: "text-[#A63A59]",
  },
  pool: {
    section: "border-[#D1EAE3] bg-[#F2FBF8]",
    heading: "text-[#176B5A]",
    headingIcon: "bg-[#DFF5EE] text-[#0F8A70]",
    tileBorder: "border-[#D5ECE6]",
    tileIcon: "bg-[#E7F7F2] text-[#0F8A70]",
    tileValue: "text-[#087966]",
  },
  management: {
    section: "border-[#EEDFC8] bg-[#FFF9F1]",
    heading: "text-[#7A5522]",
    headingIcon: "bg-[#F8EBD8] text-[#B7791F]",
    tileBorder: "border-[#EFE1CD]",
    tileIcon: "bg-[#FBF0E1] text-[#B7791F]",
    tileValue: "text-[#9A681A]",
  },
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
      href: "/portfoy?map=1",
      label: "Harita",
      value: "Aç",
      icon: <Map size={18} />,
    },
  ];

  const crmItems: DashboardItem[] = [
    {
      href: "/crm",
      label: "Müşteriler",
      value: String(stats.totalCustomers || 0),
      icon: <UsersRound size={18} />,
    },
    {
      href: "/crm?new=1",
      label: "Yeni Müşteri",
      value: "Oluştur",
      icon: <UserPlus size={18} />,
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
      href: "/profil",
      label: "Profil ve Ayarlar",
      value: "Hesap",
      icon: <SlidersHorizontal size={18} />,
    },
    {
      href: "/admin/audit-log",
      label: "Sistem Logları",
      value: "Kayıtlar",
      icon: <FileText size={18} />,
      roles: ["SUPER_ADMIN"],
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
    <main className="min-h-[calc(100dvh-74px)] overflow-x-hidden bg-[#F3F6FB] px-3 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-2 text-[#0F1D45]">
      <div className="mx-auto w-full max-w-[440px] space-y-3">
        <section className="overflow-hidden rounded-[26px] border border-[#DCE5F1] bg-white shadow-[0_14px_34px_rgba(15,29,69,0.08)]">
          <div className="relative overflow-hidden px-4 py-5 text-center">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute left-[-42px] top-[-46px] h-28 w-28 rounded-full bg-[#E9F1FF]"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute bottom-[-54px] right-[-36px] h-32 w-32 rounded-full bg-[#F0EBFF]"
            />

            <div className="relative z-10 mx-auto flex max-w-[360px] flex-col items-center justify-center">
              <span className="inline-flex min-h-[26px] items-center justify-center rounded-full border border-[#DDD6FE] bg-[#F5F3FF] px-3 text-center text-[9px] font-black uppercase tracking-[0.12em] text-[#6D28D9]">
                {role}
              </span>

              <h1 className="mt-2 text-center text-[25px] font-black leading-[1.05] tracking-[-0.04em] text-[#0F1D45]">
                Merhaba {name}
              </h1>

              <p className="mt-2 max-w-[320px] text-center text-[11px] font-bold leading-4 text-[#64748B]">
                {dashboardText}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 border-t border-[#E5EAF2] bg-white">
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
          />
          <ActionButton
            href="/portfoy?create=1"
            icon={<Plus size={15} />}
            label="Yeni Portföy"
            tone="violet"
          />
          <ActionButton
            href="/network?create=1"
            icon={<FileText size={15} />}
            label="Talep Oluştur"
            tone="orange"
          />
          <ActionButton
            href="/havuz"
            icon={<Waves size={15} />}
            label="Havuzu Kontrol Et"
            tone="green"
          />
        </section>

        <DashboardSection
          title="Portföy"
          icon={<Building2 size={15} />}
          items={portfolioItems}
          tone="portfolio"
        />

        <DashboardSection
          title="CRM"
          icon={<UsersRound size={15} />}
          items={crmItems}
          tone="crm"
        />

        <DashboardSection
          title="Talep Merkezi"
          icon={<MessageCircle size={15} />}
          items={forumItems}
          tone="forum"
        />

        <DashboardSection
          title="Havuz"
          icon={<Waves size={15} />}
          items={poolItems}
          tone="pool"
        />

        {managementItems.length > 0 && (
          <DashboardSection
            title="Yönetim"
            icon={<Settings size={15} />}
            items={managementItems}
            tone="management"
          />
        )}
      </div>

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
}: {
  href: string;
  icon: ReactNode;
  label: string;
  tone: "violet" | "blue" | "orange" | "green";
}) {
  const styles = {
    violet: "from-[#6D28D9] to-[#5B21B6]",
    blue: "from-[#2563EB] to-[#1D4ED8]",
    orange: "from-[#F59E0B] to-[#EA580C]",
    green: "from-[#16A34A] to-[#15803D]",
  };

  return (
    <Link
      href={href}
      className={`flex min-h-[48px] items-center justify-center gap-2 rounded-[15px] border border-white/20 bg-gradient-to-r ${styles[tone]} px-3 text-center text-[11px] font-black text-white shadow-[0_9px_18px_rgba(15,23,42,0.10)] transition active:scale-[0.98]`}
    >
      <span className="shrink-0">{icon}</span>
      <span className="min-w-0 whitespace-nowrap">{label}</span>
    </Link>
  );
}

function DashboardSection({
  title,
  icon,
  items,
  tone,
}: {
  title: string;
  icon: ReactNode;
  items: DashboardItem[];
  tone: DashboardTone;
}) {
  const styles = DASHBOARD_TONE_STYLES[tone];

  return (
    <section
      className={`overflow-hidden rounded-[24px] border p-2.5 shadow-[0_8px_22px_rgba(15,29,69,0.045)] ${styles.section}`}
    >
      <div className="mb-2.5 flex w-full items-center justify-center gap-2 text-center">
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-[10px] ${styles.headingIcon}`}
        >
          {icon}
        </span>

        <h2
          className={`text-center text-[14px] font-black uppercase tracking-[0.045em] ${styles.heading}`}
        >
          {title}
        </h2>
      </div>

      <div className="flex w-full flex-wrap justify-center gap-2">
        {items.map((item) => (
          <DashboardTile
            key={`${item.href}-${item.label}`}
            item={item}
            tone={tone}
          />
        ))}
      </div>
    </section>
  );
}

function DashboardTile({
  item,
  tone,
}: {
  item: DashboardItem;
  tone: DashboardTone;
}) {
  const styles = DASHBOARD_TONE_STYLES[tone];

  return (
    <Link
      href={item.href}
      className={`flex min-h-[96px] w-[calc(25%_-_6px)] min-w-0 flex-col items-center justify-center rounded-[17px] border bg-white px-1.5 py-2 text-center shadow-[0_6px_16px_rgba(15,29,69,0.055)] transition active:scale-[0.98] ${styles.tileBorder}`}
    >
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[11px] ${styles.tileIcon}`}
      >
        {item.icon}
      </span>

      <span className="mt-1.5 flex min-h-[28px] w-full items-center justify-center text-center text-[9px] font-black leading-[12px] text-[#0F1D45] [overflow-wrap:anywhere]">
        {item.label}
      </span>

      <span
        className={`mt-0.5 text-center text-[8px] font-bold leading-[10px] ${styles.tileValue}`}
      >
        {item.value}
      </span>
    </Link>
  );
}
