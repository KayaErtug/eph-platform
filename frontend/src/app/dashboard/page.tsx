"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  Bot,
  BriefcaseBusiness,
  Building2,
  CalendarCheck,
  ChevronRight,
  Clock3,
  Home,
  Loader2,
  MessageCircle,
  Sparkles,
  Target,
  UsersRound,
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
  return String(role || "")
    .toLocaleUpperCase("tr-TR")
    .trim();
}

function roleLabel(role?: string | null) {
  const normalizedRole = normalizeRole(role);

  if (normalizedRole === "SUPER_ADMIN") return "Süper Admin";
  if (normalizedRole === "ADMIN") return "Admin";
  if (
    normalizedRole === "MUTEAHHIT" ||
    normalizedRole === "MÜTEAHHİT" ||
    normalizedRole === "MÜTAHHİT"
  ) {
    return "Müteahhit";
  }

  if (
    normalizedRole === "INSAAT_FIRMASI" ||
    normalizedRole === "İNŞAAT_FİRMASI"
  ) {
    return "İnşaat Firması";
  }

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

  const isToday = date.toDateString() === today.toDateString();
  const isTomorrow = date.toDateString() === tomorrow.toDateString();

  const time = date.toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (isToday) return `Bugün ${time}`;
  if (isTomorrow) return `Yarın ${time}`;

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
      const aTime = a.dueDate
        ? new Date(a.dueDate).getTime()
        : Number.MAX_SAFE_INTEGER;
      const bTime = b.dueDate
        ? new Date(b.dueDate).getTime()
        : Number.MAX_SAFE_INTEGER;

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
          user?.id
            ? api.get(`/conversations?userId=${user.id}`)
            : Promise.resolve({ data: [] }),
          user?.id
            ? api.get(`/network/notifications?userId=${user.id}`)
            : Promise.resolve({ data: { unreadCount: 0, items: [] } }),
          api.get("/network/posts/featured"),
          api.get("/crm/customers"),
        ]);

      if (summaryRes.status === "fulfilled") {
        setSummary(summaryRes.value.data);
      } else {
        setSummary(null);
      }

      if (conversationsRes.status === "fulfilled") {
        const conversations = Array.isArray(conversationsRes.value.data)
          ? (conversationsRes.value.data as Conversation[])
          : [];

        const unreadTotal = conversations.reduce(
          (sum, item) => sum + (item.unreadCount || 0),
          0,
        );

        setUnreadMessages(unreadTotal);
      } else {
        setUnreadMessages(0);
      }

      if (notificationsRes.status === "fulfilled") {
        setNetworkNotifications(
          notificationsRes.value.data || { unreadCount: 0, items: [] },
        );
      } else {
        setNetworkNotifications({ unreadCount: 0, items: [] });
      }

      if (featuredRes.status === "fulfilled") {
        setFeaturedPosts(
          Array.isArray(featuredRes.value.data) ? featuredRes.value.data : [],
        );
      } else {
        setFeaturedPosts([]);
      }

      if (crmCustomersRes.status === "fulfilled") {
        setCrmCustomers(
          Array.isArray(crmCustomersRes.value.data)
            ? (crmCustomersRes.value.data as CrmDashboardCustomer[])
            : [],
        );
      } else {
        setCrmCustomers([]);
      }
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

    return [...overdue, ...today, ...future].slice(0, 3);
  }, [crmTasks, todayEnd, todayStart]);

  const visibleForumRequests = useMemo(() => {
    return featuredPosts
      .filter((post) => {
        const ownerId = post.userId || post.user?.id;
        return !user?.id || !ownerId || ownerId !== user.id;
      })
      .slice(0, 3);
  }, [featuredPosts, user?.id]);

  const latestNotifications = useMemo(() => {
    return networkNotifications.items.slice(0, 3);
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

  const commandText = `${todayTaskCount} göreviniz, ${unreadMessages} okunmamış mesajınız, ${visibleForumRequests.length} aktif talebiniz var.`;

  if (!hydrated || loading) {
    return (
      <main className="flex min-h-[calc(100dvh-74px)] items-center justify-center bg-[#F8FAFC] px-4">
        <div className="flex flex-col items-center gap-4 text-center text-[#27364F]">
          <Loader2 className="animate-spin text-[#6D28FF]" size={34} />
          <p className="text-sm font-black">Anasayfa yükleniyor...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100dvh-74px)] bg-[#F8FAFC] px-4 pb-6 pt-6 text-[#06194A]">
      <div className="mx-auto w-full max-w-[430px] space-y-4">
        <section className="text-center">
          <p className="mx-auto inline-flex min-h-[34px] items-center justify-center rounded-full border border-[#DDE7F3] bg-white px-4 text-[13px] font-black text-[#1557D6] shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
            {roleName}
          </p>

          <h1 className="mt-4 text-center text-[30px] font-black leading-none tracking-[-0.045em] text-[#06194A]">
            Merhaba {firstName}
          </h1>

          <p className="mx-auto mt-2 max-w-[330px] text-center text-[14px] font-bold leading-6 text-[#64748B]">
            {commandText}
          </p>
        </section>

        <DashboardCard className="pt-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] bg-[#F1ECFF] text-[#6D28FF]">
            <BriefcaseBusiness size={30} strokeWidth={2.5} />
          </div>

          <h2 className="mt-4 text-center text-[24px] font-black tracking-[-0.04em] text-[#06194A]">
            Bugünkü İş Akışı
          </h2>

          <div className="mt-5 grid grid-cols-3 divide-x divide-[#DDE7F3]">
            <HeroStat label="Görev" value={todayTaskCount} />
            <HeroStat label="Mesaj" value={unreadMessages} />
            <HeroStat label="Talep" value={visibleForumRequests.length} />
          </div>
        </DashboardCard>

        <SectionBlock
          icon={<Clock3 size={22} />}
          title="Acil İşlerim"
          actionHref="/crm"
          actionLabel="CRM"
        >
          {urgentTasks.length > 0 ? (
            <div className="grid gap-3">
              {urgentTasks.map((task) => (
                <UrgentTaskCard key={task.id} task={task} />
              ))}
            </div>
          ) : (
            <EmptyState text="Bugün için acil görev görünmüyor." />
          )}
        </SectionBlock>

        <SectionBlock
          icon={<MessageCircle size={22} />}
          title="Bana Uygun Forum Talepleri"
          actionHref="/network"
          actionLabel="Forum"
        >
          {visibleForumRequests.length > 0 ? (
            <div className="grid gap-3">
              {visibleForumRequests.map((post) => (
                <ForumRequestCard key={post.id} post={post} />
              ))}
            </div>
          ) : (
            <EmptyState text="Şu anda size uygun yeni talep yok." />
          )}
        </SectionBlock>

        <SectionBlock
          icon={<Target size={22} />}
          title="Bana Uygun Havuz Portföyleri"
          actionHref="/havuz"
          actionLabel="Havuz"
        >
          <div className="grid gap-3">
            <PoolSuggestionCard
              title="Yetkili Portföy"
              desc="Havuz eşleşmeleri aktif hale geldiğinde burada size uygun portföyler listelenecek."
              price="Lina eşleştirme bekliyor"
            />
          </div>
        </SectionBlock>

        <section className="grid grid-cols-2 gap-3">
          <SummaryMiniCard
            icon={<Building2 size={23} />}
            title="Portföy Özeti"
            rows={[
              ["Toplam", String(stats.totalUnits || 0)],
              ["Projeler", String(stats.totalProjects || 0)],
            ]}
          />

          <SummaryMiniCard
            icon={<UsersRound size={23} />}
            title="CRM Özeti"
            rows={[
              ["Müşteri", String(stats.totalCustomers || 0)],
              ["Görev", String(crmTasks.length)],
            ]}
          />
        </section>

        <SectionBlock
          icon={<Sparkles size={22} />}
          title="Lina Önerileri"
          actionHref="/lina"
          actionLabel="Lina"
        >
          <DashboardCard className="!p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] bg-[#F1ECFF] text-[#6D28FF]">
                <Bot size={23} />
              </div>

              <div className="min-w-0 flex-1 text-left">
                <h3 className="text-left text-[16px] font-black text-[#06194A]">
                  Lina bugün iş akışını sadeleştirebilir.
                </h3>
                <p className="mt-1 text-left text-[13px] font-bold leading-5 text-[#64748B]">
                  Portföy metni, müşteri notu ve paylaşım açıklaması için Lina'yı kullan.
                </p>
              </div>

              <ChevronRight className="shrink-0 text-[#06194A]" size={23} />
            </div>
          </DashboardCard>
        </SectionBlock>

        <SectionBlock
          icon={<Bell size={22} />}
          title="Son Bildirimler"
          actionHref="/messages"
          actionLabel="Mesajlar"
        >
          {latestNotifications.length > 0 ? (
            <div className="grid gap-3">
              {latestNotifications.map((item) => (
                <NotificationMiniCard key={item.id} item={item} />
              ))}
            </div>
          ) : (
            <EmptyState text="Şu anda yeni bildirim yok." />
          )}
        </SectionBlock>

        <section className="grid grid-cols-4 gap-3 pb-4">
          <Shortcut href="/stok" icon={<Building2 size={23} />} label="Portföy" />
          <Shortcut href="/crm" icon={<UsersRound size={23} />} label="CRM" />
          <Shortcut href="/network" icon={<MessageCircle size={23} />} label="Forum" />
          <Shortcut href="/havuz" icon={<Target size={24} />} label="Havuz" />
        </section>
      </div>
    </main>
  );
}

function DashboardCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-[30px] border border-[#DDE7F3] bg-white p-5 text-center shadow-[0_18px_42px_rgba(15,23,42,0.07)] ${className}`}
    >
      {children}
    </section>
  );
}

function HeroStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="px-2 text-center">
      <p className="text-center text-[13px] font-bold text-[#64748B]">
        {label}
      </p>
      <p className="mt-2 text-center text-[31px] font-black leading-none text-[#06194A]">
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
    <section>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[16px] bg-[#F1ECFF] text-[#6D28FF]">
            {icon}
          </span>
          <h2 className="min-w-0 text-left text-[20px] font-black tracking-[-0.035em] text-[#06194A]">
            {title}
          </h2>
        </div>

        <Link
          href={actionHref}
          className="inline-flex min-h-[38px] shrink-0 items-center justify-center rounded-full bg-[#EFF6FF] px-4 text-[13px] font-black text-[#1557D6]"
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
      className="grid grid-cols-[76px_1fr] items-center gap-3 rounded-[24px] border border-[#DDE7F3] bg-white p-4 shadow-[0_14px_32px_rgba(15,23,42,0.06)]"
    >
      <div className="flex h-16 w-16 flex-col items-center justify-center rounded-[20px] bg-[#FFF7ED] text-center text-[#EA580C]">
        <Clock3 size={22} />
        <span className="mt-1 text-[10px] font-black">ACİL</span>
      </div>

      <div className="min-w-0 text-left">
        <p className="text-left text-[12px] font-black text-[#1557D6]">
          {formatTaskDate(task.dueDate)}
        </p>

        <h3 className="mt-1 line-clamp-1 text-left text-[16px] font-black text-[#06194A]">
          {task.title}
        </h3>

        <p className="mt-1 line-clamp-1 text-left text-[13px] font-bold text-[#64748B]">
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
    <Link
      href={`/network/${post.id}`}
      className="rounded-[24px] border border-[#DDE7F3] bg-white p-4 shadow-[0_14px_32px_rgba(15,23,42,0.06)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 text-left">
          <p className="text-left text-[11px] font-black uppercase tracking-[0.13em] text-[#6D28FF]">
            Portföy Aranıyor
          </p>

          <h3 className="mt-2 line-clamp-2 text-left text-[17px] font-black leading-5 text-[#06194A]">
            {post.title}
          </h3>

          <p className="mt-2 line-clamp-1 text-left text-[13px] font-bold text-[#64748B]">
            {location || "Konum bilgisi yok"}
          </p>
        </div>

        <div className="shrink-0 rounded-[16px] bg-[#EFF6FF] px-3 py-2 text-center">
          <p className="text-[16px] font-black text-[#1557D6]">
            {post.score || 0}
          </p>
          <p className="text-[9px] font-black text-[#64748B]">PUAN</p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-left text-[13px] font-black text-[#1557D6]">
          {formatBudget(post.budget)}
        </p>

        <span className="inline-flex min-h-[34px] items-center justify-center rounded-full bg-[#1557D6] px-4 text-[12px] font-black text-white">
          İlgileniyorum
        </span>
      </div>
    </Link>
  );
}

function PoolSuggestionCard({
  title,
  desc,
  price,
}: {
  title: string;
  desc: string;
  price: string;
}) {
  return (
    <DashboardCard className="!p-4">
      <div className="grid grid-cols-[72px_1fr] items-center gap-3">
        <div className="flex h-[72px] w-[72px] items-center justify-center rounded-[22px] bg-[#EFF6FF] text-[#1557D6]">
          <Target size={30} />
        </div>

        <div className="min-w-0 text-left">
          <p className="text-left text-[11px] font-black uppercase tracking-[0.13em] text-[#6D28FF]">
            {title}
          </p>
          <h3 className="mt-1 text-left text-[16px] font-black text-[#06194A]">
            {price}
          </h3>
          <p className="mt-1 line-clamp-2 text-left text-[13px] font-bold leading-5 text-[#64748B]">
            {desc}
          </p>
        </div>
      </div>
    </DashboardCard>
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
    <DashboardCard className="!p-4">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-[18px] bg-[#F1ECFF] text-[#6D28FF]">
        {icon}
      </div>

      <h3 className="mt-3 text-center text-[16px] font-black text-[#06194A]">
        {title}
      </h3>

      <div className="mt-3 grid gap-2">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-3">
            <span className="text-left text-[12px] font-bold text-[#64748B]">
              {label}
            </span>
            <span className="text-right text-[14px] font-black text-[#06194A]">
              {value}
            </span>
          </div>
        ))}
      </div>
    </DashboardCard>
  );
}

function NotificationMiniCard({ item }: { item: NetworkNotification }) {
  return (
    <Link
      href={item.postId ? `/network/${item.postId}` : "/messages"}
      className="rounded-[24px] border border-[#DDE7F3] bg-white p-4 shadow-[0_14px_32px_rgba(15,23,42,0.06)]"
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="line-clamp-1 text-left text-[16px] font-black text-[#06194A]">
          {item.title}
        </h3>

        {!item.isRead && (
          <span className="shrink-0 rounded-full bg-red-600 px-2 py-1 text-[10px] font-black text-white">
            Yeni
          </span>
        )}
      </div>

      <p className="mt-2 line-clamp-2 text-left text-[13px] font-bold leading-5 text-[#64748B]">
        {item.message}
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
      className="flex min-h-[84px] flex-col items-center justify-center gap-2 rounded-[22px] border border-[#DDE7F3] bg-white px-2 text-center shadow-[0_12px_28px_rgba(15,23,42,0.06)]"
    >
      <span className="text-[#6D28FF]">{icon}</span>
      <span className="text-[12px] font-black text-[#06194A]">{label}</span>
    </Link>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <DashboardCard className="!p-5">
      <p className="text-center text-[14px] font-bold leading-6 text-[#64748B]">
        {text}
      </p>
    </DashboardCard>
  );
}
