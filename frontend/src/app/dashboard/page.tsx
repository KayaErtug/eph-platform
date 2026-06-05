"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  Bot,
  BriefcaseBusiness,
  Building2,
  Clock3,
  Loader2,
  MessageCircle,
  Target,
  UsersRound,
} from "lucide-react";

import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";

type Conversation = { id: string; unreadCount?: number };

type DashboardSummary = {
  stats?: {
    totalUnits?: number;
    totalCustomers?: number;
    totalVisits?: number;
    totalProjects?: number;
  };
};

type CrmDashboardCustomer = {
  id: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  city?: string | null;
  status: string;
  tasks?: Array<{
    id: string;
    title: string;
    dueDate?: string | null;
    status: string;
  }>;
};

type NetworkNotification = {
  id: string;
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
  userId?: string | null;
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
    id?: string | null;
    firstName: string;
    lastName: string;
    role: string;
  };
};

type DashboardTask = {
  id: string;
  title: string;
  dueDate?: string | null;
  customerId: string;
  customerName: string;
  customerPhone?: string | null;
};

function normalizeRole(role?: string | null) {
  return String(role || "").toLocaleUpperCase("tr-TR").trim();
}

function roleLabel(role?: string | null) {
  const normalizedRole = normalizeRole(role);

  if (normalizedRole === "SUPER_ADMIN") return "Süper Admin";
  if (normalizedRole === "ADMIN") return "Admin";
  if (["MUTEAHHIT", "MÜTEAHHİT", "MÜTAHHİT"].includes(normalizedRole)) return "Müteahhit";
  if (["INSAAT_FIRMASI", "İNŞAAT_FİRMASI"].includes(normalizedRole)) return "İnşaat Firması";

  return "Gayrimenkul Danışmanı";
}

function getFirstName(user?: { firstName?: string | null; email?: string | null } | null) {
  return user?.firstName?.trim() || user?.email?.split("@")[0] || "EPH Üyesi";
}

function formatBudget(value?: number | null) {
  if (!value) return "Bütçe belirtilmedi";

  if (value >= 1000000) {
    const compact = value / 1000000;
    return `${compact.toLocaleString("tr-TR", {
      maximumFractionDigits: compact >= 10 ? 0 : 1,
    })}M TL`;
  }

  return `${value.toLocaleString("tr-TR")} TL`;
}

function formatTaskDate(value?: string | null) {
  if (!value) return "Saat yok";

  const date = new Date(value);
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);

  const time = date.toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (date.toDateString() === today.toDateString()) return `Bugün ${time}`;
  if (date.toDateString() === tomorrow.toDateString()) return `Yarın ${time}`;

  return `${date.toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "short",
  })} · ${time}`;
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

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [crmCustomers, setCrmCustomers] = useState<CrmDashboardCustomer[]>([]);
  const [featuredPosts, setFeaturedPosts] = useState<FeaturedNetworkPost[]>([]);
  const [networkNotifications, setNetworkNotifications] =
    useState<NetworkNotificationResponse>({ unreadCount: 0, items: [] });
  const [unreadMessages, setUnreadMessages] = useState(0);

  const firstName = getFirstName(user);
  const roleName = roleLabel(user?.role);

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
      const [summaryRes, conversationsRes, notificationsRes, featuredRes, crmCustomersRes] =
        await Promise.allSettled([
          api.get("/dashboard/summary"),
          user?.id ? api.get(`/conversations?userId=${user.id}`) : Promise.resolve({ data: [] }),
          user?.id
            ? api.get(`/network/notifications?userId=${user.id}`)
            : Promise.resolve({ data: { unreadCount: 0, items: [] } }),
          api.get("/network/posts/featured"),
          api.get("/crm/customers"),
        ]);

      setSummary(summaryRes.status === "fulfilled" ? summaryRes.value.data : null);

      if (conversationsRes.status === "fulfilled") {
        const conversations = Array.isArray(conversationsRes.value.data)
          ? (conversationsRes.value.data as Conversation[])
          : [];

        setUnreadMessages(conversations.reduce((sum, item) => sum + (item.unreadCount || 0), 0));
      } else {
        setUnreadMessages(0);
      }

      setNetworkNotifications(
        notificationsRes.status === "fulfilled"
          ? notificationsRes.value.data || { unreadCount: 0, items: [] }
          : { unreadCount: 0, items: [] },
      );

      setFeaturedPosts(
        featuredRes.status === "fulfilled" && Array.isArray(featuredRes.value.data)
          ? featuredRes.value.data
          : [],
      );

      setCrmCustomers(
        crmCustomersRes.status === "fulfilled" && Array.isArray(crmCustomersRes.value.data)
          ? crmCustomersRes.value.data
          : [],
      );
    } finally {
      setLoading(false);
    }
  };

  const crmTasks = useMemo(() => flattenCustomerTasks(crmCustomers), [crmCustomers]);
  const todayStart = startOfToday();
  const todayEnd = endOfToday();

  const urgentTasks = useMemo(() => {
    const overdue = crmTasks.filter((task) => {
      if (!task.dueDate) return false;
      return new Date(task.dueDate).getTime() < todayStart.getTime();
    });

    const today = crmTasks.filter((task) => {
      if (!task.dueDate) return false;
      const dueDate = new Date(task.dueDate);
      return dueDate >= todayStart && dueDate <= todayEnd;
    });

    const future = crmTasks.filter((task) => {
      if (!task.dueDate) return false;
      return new Date(task.dueDate).getTime() > todayEnd.getTime();
    });

    return [...overdue, ...today, ...future].slice(0, 2);
  }, [crmTasks, todayEnd, todayStart]);

  const visibleForumRequests = useMemo(() => {
    return featuredPosts
      .filter((post) => {
        const ownerId = post.userId || post.user?.id;
        return !user?.id || !ownerId || ownerId !== user.id;
      })
      .slice(0, 2);
  }, [featuredPosts, user?.id]);

  const latestNotifications = useMemo(() => {
    return networkNotifications.items.slice(0, 1);
  }, [networkNotifications.items]);

  const stats = summary?.stats || {
    totalUnits: 0,
    totalCustomers: 0,
    totalVisits: 0,
    totalProjects: 0,
  };

  const todayTaskCount = crmTasks.filter((task) => {
    if (!task.dueDate) return false;
    const dueDate = new Date(task.dueDate);
    return dueDate >= todayStart && dueDate <= todayEnd;
  }).length;

  const dashboardSummaryText = useMemo(() => {
    const parts: string[] = [];

    if (todayTaskCount > 0) {
      parts.push(`${todayTaskCount} görev`);
    }

    if (unreadMessages > 0) {
      parts.push(`${unreadMessages} mesaj`);
    }

    if (visibleForumRequests.length > 0) {
      parts.push(`${visibleForumRequests.length} uygun talep`);
    }

    if (parts.length === 0) {
      return "Bugün paneliniz sakin görünüyor.";
    }

    if (parts.length === 1) {
      return `Bugün ${parts[0]} görünüyor.`;
    }

    const lastPart = parts.pop();

    return `Bugün ${parts.join(", ")} ve ${lastPart} görünüyor.`;
  }, [todayTaskCount, unreadMessages, visibleForumRequests.length]);

  if (!hydrated || loading) {
    return (
      <main className="flex min-h-[calc(100dvh-74px)] items-center justify-center bg-[#F7FBFF] px-4">
        <div className="flex flex-col items-center gap-4 text-center text-[#27364F]">
          <Loader2 className="animate-spin text-[#1557D6]" size={34} />
          <p className="text-sm font-black">Dashboard hazırlanıyor...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100dvh-74px)] bg-[#F7FBFF] px-3 pb-4 pt-3 text-[#06194A]">
      <div className="mx-auto w-full max-w-[430px] space-y-3">
        <section className="rounded-[30px] border border-[#DDE7F3] bg-white px-4 py-5 text-center shadow-[0_18px_42px_rgba(15,23,42,0.075)]">
          <p className="mx-auto inline-flex min-h-[30px] items-center justify-center rounded-full bg-[#EFF6FF] px-4 text-[12px] font-black text-[#1557D6]">
            {roleName}
          </p>

          <h1 className="mx-auto mt-3 max-w-[360px] text-center text-[28px] font-black leading-[0.98] tracking-[-0.055em] text-[#06194A]">
            Merhaba {firstName}
          </h1>

          <p className="mx-auto mt-3 max-w-[340px] text-center text-[13px] font-extrabold leading-5 text-[#64748B]">
            {dashboardSummaryText}
          </p>

          <div className="mt-5 grid grid-cols-3 overflow-hidden rounded-[24px] border border-[#DDE7F3] bg-[#FBFDFF]">
            <HeroStat label="Görev" value={todayTaskCount} />
            <HeroStat label="Mesaj" value={unreadMessages} />
            <HeroStat label="Talep" value={visibleForumRequests.length} />
          </div>
        </section>

        <section className="grid grid-cols-4 gap-2">
          <Shortcut href="/stok" icon={<Building2 size={21} />} label="Portföy" />
          <Shortcut href="/crm" icon={<UsersRound size={21} />} label="CRM" />
          <Shortcut href="/network" icon={<MessageCircle size={21} />} label="Forum" />
          <Shortcut href="/havuz" icon={<Target size={22} />} label="Havuz" />
        </section>

        <SectionBlock icon={<Clock3 size={20} />} title="Acil İşler" actionHref="/crm" actionLabel="Tümü">
          {urgentTasks.length > 0 ? (
            <div className="grid gap-2">
              {urgentTasks.map((task) => (
                <UrgentTaskCard key={task.id} task={task} />
              ))}
            </div>
          ) : (
            <EmptyState text="Bugün için acil görev görünmüyor." />
          )}
        </SectionBlock>

        <SectionBlock icon={<MessageCircle size={20} />} title="Uygun Talepler" actionHref="/network" actionLabel="Forum">
          {visibleForumRequests.length > 0 ? (
            <div className="grid gap-2">
              {visibleForumRequests.map((post) => (
                <ForumRequestCard key={post.id} post={post} />
              ))}
            </div>
          ) : (
            <EmptyState text="Şu anda size uygun yeni talep yok." />
          )}
        </SectionBlock>

        <section className="grid grid-cols-2 gap-2">
          <SummaryMiniCard
            icon={<Building2 size={21} />}
            title="Portföy"
            rows={[
              ["Toplam", String(stats.totalUnits || 0)],
              ["Proje", String(stats.totalProjects || 0)],
            ]}
          />

          <SummaryMiniCard
            icon={<BriefcaseBusiness size={21} />}
            title="CRM"
            rows={[
              ["Müşteri", String(stats.totalCustomers || 0)],
              ["Görev", String(crmTasks.length)],
            ]}
          />
        </section>

        <SectionBlock icon={<Target size={20} />} title="Havuz Eşleşmeleri" actionHref="/havuz" actionLabel="Havuz">
          <PoolSuggestionCard />
        </SectionBlock>

        <section className="grid grid-cols-2 gap-2">
          <CompactInfoCard
            href="/lina"
            icon={<Bot size={22} />}
            title="Lina"
            desc="Metin, ses ve portföy desteği."
          />

          <CompactInfoCard
            href="/messages"
            icon={<Bell size={22} />}
            title="Bildirimler"
            desc={latestNotifications.length > 0 ? latestNotifications[0].title : "Yeni bildirim yok."}
          />
        </section>
      </div>
    </main>
  );
}

function HeroStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="min-h-[70px] px-2 py-3 text-center [&:not(:last-child)]:border-r [&:not(:last-child)]:border-[#DDE7F3]">
      <p className="text-center text-[11px] font-black uppercase tracking-[0.08em] text-[#64748B]">
        {label}
      </p>
      <p className="mt-1 text-center text-[28px] font-black leading-none text-[#06194A]">
        {value}
      </p>
    </div>
  );
}

function SectionBlock({
  icon,
  title,
  actionHref,
  actionLabel,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  actionHref: string;
  actionLabel: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[26px] border border-[#DDE7F3] bg-white p-3 shadow-[0_14px_34px_rgba(15,23,42,0.06)]">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[15px] bg-[#EFF6FF] text-[#1557D6]">
            {icon}
          </span>
          <h2 className="min-w-0 text-left text-[18px] font-black tracking-[-0.04em] text-[#06194A]">
            {title}
          </h2>
        </div>

        <Link
          href={actionHref}
          className="inline-flex min-h-[34px] shrink-0 items-center justify-center rounded-full bg-[#EFF6FF] px-3 text-[12px] font-black text-[#1557D6]"
        >
          {actionLabel}
        </Link>
      </div>

      {children}
    </section>
  );
}

function UrgentTaskCard({ task }: { task: DashboardTask }) {
  return (
    <Link
      href="/crm"
      className="grid min-h-[82px] grid-cols-[56px_1fr] items-center gap-3 rounded-[20px] border border-[#DDE7F3] bg-[#FBFDFF] p-3"
    >
      <div className="flex h-12 w-12 flex-col items-center justify-center rounded-[17px] bg-[#FFF7ED] text-[#EA580C]">
        <Clock3 size={18} />
        <span className="mt-0.5 text-[9px] font-black">ACİL</span>
      </div>

      <div className="min-w-0 text-left">
        <p className="text-left text-[11px] font-black text-[#1557D6]">
          {formatTaskDate(task.dueDate)}
        </p>
        <h3 className="mt-0.5 line-clamp-1 text-left text-[15px] font-black text-[#06194A]">
          {task.title}
        </h3>
        <p className="mt-0.5 line-clamp-1 text-left text-[12px] font-bold text-[#64748B]">
          {task.customerName}
          {task.customerPhone ? ` · ${task.customerPhone}` : ""}
        </p>
      </div>
    </Link>
  );
}

function ForumRequestCard({ post }: { post: FeaturedNetworkPost }) {
  const location = [post.city, post.district].filter(Boolean).join(" / ");

  return (
    <Link href={`/network/${post.id}`} className="block min-h-[118px] rounded-[20px] border border-[#DDE7F3] bg-[#FBFDFF] p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 text-left">
          <p className="text-left text-[10px] font-black uppercase tracking-[0.12em] text-[#1557D6]">
            Portföy Aranıyor
          </p>
          <h3 className="mt-1 line-clamp-1 text-left text-[15px] font-black text-[#06194A]">
            {post.title}
          </h3>
          <p className="mt-1 line-clamp-1 text-left text-[12px] font-bold text-[#64748B]">
            {location || "Konum bilgisi yok"}
          </p>
        </div>

        <div className="shrink-0 rounded-[14px] bg-[#EFF6FF] px-2 py-1.5 text-center">
          <p className="text-[14px] font-black text-[#1557D6]">{post.score || 0}</p>
          <p className="text-[8px] font-black text-[#64748B]">PUAN</p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <p className="text-left text-[12px] font-black text-[#1557D6]">
          {formatBudget(post.budget)}
        </p>
        <span className="inline-flex min-h-[30px] items-center justify-center rounded-full bg-[#1557D6] px-3 text-[11px] font-black text-white">
          İncele
        </span>
      </div>
    </Link>
  );
}

function SummaryMiniCard({
  icon,
  title,
  rows,
}: {
  icon: React.ReactNode;
  title: string;
  rows: Array<[string, string]>;
}) {
  return (
    <section className="min-h-[150px] rounded-[24px] border border-[#DDE7F3] bg-white p-3 text-center shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-[16px] bg-[#EFF6FF] text-[#1557D6]">
        {icon}
      </div>

      <h3 className="mt-2 text-center text-[15px] font-black text-[#06194A]">{title}</h3>

      <div className="mt-2 grid gap-1.5">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-2">
            <span className="text-left text-[11px] font-bold text-[#64748B]">{label}</span>
            <span className="text-right text-[13px] font-black text-[#06194A]">{value}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function PoolSuggestionCard() {
  return (
    <Link
      href="/havuz"
      className="grid min-h-[82px] grid-cols-[54px_1fr] items-center gap-3 rounded-[20px] border border-[#DDE7F3] bg-[#FBFDFF] p-3"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-[17px] bg-[#EFF6FF] text-[#1557D6]">
        <Target size={24} />
      </div>

      <div className="min-w-0 text-left">
        <p className="text-left text-[11px] font-black uppercase tracking-[0.12em] text-[#1557D6]">
          Yetkili Portföy
        </p>
        <h3 className="mt-0.5 text-left text-[14px] font-black text-[#06194A]">
          Lina eşleştirme bekliyor
        </h3>
        <p className="mt-0.5 line-clamp-1 text-left text-[12px] font-bold text-[#64748B]">
          Size uygun portföyler burada listelenecek.
        </p>
      </div>
    </Link>
  );
}

function CompactInfoCard({
  href,
  icon,
  title,
  desc,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <Link
      href={href}
      className="min-h-[124px] rounded-[24px] border border-[#DDE7F3] bg-white p-3 text-center shadow-[0_12px_30px_rgba(15,23,42,0.06)]"
    >
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-[16px] bg-[#EFF6FF] text-[#1557D6]">
        {icon}
      </div>

      <h3 className="mt-2 text-center text-[14px] font-black text-[#06194A]">{title}</h3>

      <p className="mt-1 line-clamp-2 text-center text-[11px] font-bold leading-4 text-[#64748B]">
        {desc}
      </p>
    </Link>
  );
}

function Shortcut({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex min-h-[74px] flex-col items-center justify-center gap-1.5 rounded-[22px] border border-[#DDE7F3] bg-white px-1 text-center shadow-[0_10px_26px_rgba(15,23,42,0.055)]"
    >
      <span className="text-[#1557D6]">{icon}</span>
      <span className="text-[11px] font-black text-[#06194A]">{label}</span>
    </Link>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-[20px] border border-[#DDE7F3] bg-[#FBFDFF] px-4 py-4">
      <p className="text-center text-[13px] font-bold leading-5 text-[#64748B]">{text}</p>
    </div>
  );
}