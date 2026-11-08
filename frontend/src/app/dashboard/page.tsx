"use client";

import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  Building2,
  ChevronRight,
  ClipboardCheck,
  Clock,
  FileText,
  Loader2,
  Map,
  MessageCircle,
  Plus,
  Search,
  ShieldCheck,
  Target,
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

type CrmTask = {
  id: string;
  dueDate?: string | null;
  status?: string | null;
  title?: string | null;
};

type CrmCustomer = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  name?: string | null;
  tasks?: CrmTask[];
};

type NetworkPost = {
  id: string;
  userId?: string | null;
  user?: {
    id?: string | null;
  } | null;
};

type NotificationItem = {
  id: string;
  title?: string;
  isRead?: boolean;
  createdAt?: string | null;
};

type NotificationResponse = {
  unreadCount: number;
  items?: NotificationItem[];
};

type PriorityItem = {
  href: string;
  title: string;
  description: string;
  action: string;
  icon: ReactNode;
  tone: "blue" | "violet" | "emerald" | "amber";
};

type OpportunityItem = {
  href: string;
  eyebrow: string;
  title: string;
  description: string;
  badge: string;
  icon: ReactNode;
  tone: "blue" | "navy";
};

function normalizeRole(role?: string | null) {
  return String(role || "")
    .toLocaleUpperCase("tr-TR")
    .trim();
}

function roleLabel(role?: string | null) {
  const value = normalizeRole(role);

  if (value === "SUPER_ADMIN") return "Yazılım Ekibi";
  if (value === "ADMIN") return "Admin";
  if (value === "MODERATOR") return "Moderatör";

  if (
    value.includes("MUTEAHHIT") ||
    value.includes("MÜTEAHHİT")
  ) {
    return "Müteahhit";
  }

  if (
    value.includes("INSAAT") ||
    value.includes("İNŞAAT")
  ) {
    return "İnşaat Firması";
  }

  if (
    value.includes("OFIS") ||
    value.includes("OFFICE")
  ) {
    return "Ofis Sahibi";
  }

  if (
    value.includes("TAKIM") ||
    value.includes("TEAM")
  ) {
    return "Takım Lideri";
  }

  return "Gayrimenkul Danışmanı";
}

function firstName(
  user?: {
    firstName?: string | null;
    email?: string | null;
  } | null,
) {
  return (
    user?.firstName?.trim() ||
    user?.email?.split("@")[0] ||
    "EPH Üyesi"
  );
}

function countTodayTasks(customers: CrmCustomer[]) {
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);

  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  return customers.reduce((total, customer) => {
    const count = (customer.tasks || []).filter((task) => {
      if (
        String(task.status || "").toLocaleUpperCase("tr-TR") !==
          "BEKLIYOR" ||
        !task.dueDate
      ) {
        return false;
      }

      const due = new Date(task.dueDate);

      return (
        !Number.isNaN(due.getTime()) &&
        due >= start &&
        due <= end
      );
    }).length;

    return total + count;
  }, 0);
}

function countAllPendingTasks(customers: CrmCustomer[]) {
  return customers.reduce((total, customer) => {
    const count = (customer.tasks || []).filter(
      (task) =>
        String(task.status || "").toLocaleUpperCase("tr-TR") ===
        "BEKLIYOR",
    ).length;

    return total + count;
  }, 0);
}

function formatActivityTime(
  createdAt?: string | null,
  isRead?: boolean,
) {
  if (!createdAt) {
    return isRead ? "Okundu" : "Yeni";
  }

  const date = new Date(createdAt);

  if (Number.isNaN(date.getTime())) {
    return isRead ? "Okundu" : "Yeni";
  }

  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (sameDay) {
    return `Bugün ${date.toLocaleTimeString("tr-TR", {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  }

  return date.toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "short",
  });
}

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] =
    useState<DashboardSummary | null>(null);
  const [customers, setCustomers] = useState<CrmCustomer[]>([]);
  const [posts, setPosts] = useState<NetworkPost[]>([]);
  const [notifications, setNotifications] =
    useState<NotificationResponse>({
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
      const [
        summaryResult,
        customerResult,
        postResult,
        notificationResult,
        conversationResult,
      ] = await Promise.allSettled([
        api.get("/dashboard/summary"),
        api.get("/crm/customers"),
        api.get("/network/posts/featured"),
        user?.id
          ? api.get(
              `/network/notifications?userId=${user.id}`,
            )
          : Promise.resolve({
              data: {
                unreadCount: 0,
                items: [],
              },
            }),
        user?.id
          ? api.get(`/conversations?userId=${user.id}`)
          : Promise.resolve({
              data: [],
            }),
      ]);

      setSummary(
        summaryResult.status === "fulfilled"
          ? summaryResult.value.data
          : null,
      );

      setCustomers(
        customerResult.status === "fulfilled" &&
          Array.isArray(customerResult.value.data)
          ? customerResult.value.data
          : [],
      );

      setPosts(
        postResult.status === "fulfilled" &&
          Array.isArray(postResult.value.data)
          ? postResult.value.data
          : [],
      );

      setNotifications(
        notificationResult.status === "fulfilled"
          ? notificationResult.value.data || {
              unreadCount: 0,
              items: [],
            }
          : {
              unreadCount: 0,
              items: [],
            },
      );

      if (
        conversationResult.status === "fulfilled" &&
        Array.isArray(conversationResult.value.data)
      ) {
        const total = (
          conversationResult.value.data as Conversation[]
        ).reduce(
          (sum, conversation) =>
            sum + Number(conversation.unreadCount || 0),
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

  const role = roleLabel(user?.role);
  const name = firstName(user);
  const stats = summary?.stats || {};

  const todayTasks = useMemo(
    () => countTodayTasks(customers),
    [customers],
  );

  const pendingTasks = useMemo(
    () => countAllPendingTasks(customers),
    [customers],
  );

  const visiblePosts = useMemo(
    () =>
      posts.filter((post) => {
        const ownerId =
          post.userId ||
          post.user?.id;

        return (
          !user?.id ||
          !ownerId ||
          String(ownerId) !== String(user.id)
        );
      }),
    [posts, user?.id],
  );

  const dashboardText =
    todayTasks ||
    unreadMessages ||
    visiblePosts.length
      ? `Bugün ${todayTasks} iş, ${visiblePosts.length} talep ve ${unreadMessages} okunmamış mesaj bulunuyor.`
      : "Bugün paneliniz sakin. Yeni fırsatlar için Havuz ve Talep Merkezi'ni inceleyin.";

  const priorityItems: PriorityItem[] = [];

  if (todayTasks > 0) {
    priorityItems.push({
      href: "/crm",
      title: `Bugün tamamlanacak ${todayTasks} CRM görevi`,
      description:
        "Günü kapatmadan önce bekleyen işlerinizi kontrol edin.",
      action: "Görevleri Aç",
      icon: <ClipboardCheck size={18} />,
      tone: "blue",
    });
  } else if (pendingTasks > 0) {
    priorityItems.push({
      href: "/crm",
      title: `${pendingTasks} CRM görevi tamamlanmayı bekliyor`,
      description:
        "Müşteri takiplerinizi ve planlanan işleri inceleyin.",
      action: "CRM'i Aç",
      icon: <ClipboardCheck size={18} />,
      tone: "blue",
    });
  }

  if (unreadMessages > 0) {
    priorityItems.push({
      href: "/messages",
      title: `${unreadMessages} okunmamış mesajınız var`,
      description:
        "Yeni görüşmeleri ve iş birliği mesajlarını inceleyin.",
      action: "Mesajları Aç",
      icon: <MessageCircle size={18} />,
      tone: "violet",
    });
  }

  if (visiblePosts.length > 0) {
    priorityItems.push({
      href: "/network",
      title: `${visiblePosts.length} talep fırsatı incelenebilir`,
      description:
        "Talep Merkezi'ndeki yeni kayıtları kontrol edin.",
      action: "Talepleri Gör",
      icon: <Target size={18} />,
      tone: "emerald",
    });
  }

  if (
    Number(notifications.unreadCount || 0) > 0 &&
    priorityItems.length < 3
  ) {
    priorityItems.push({
      href: "/notification-settings",
      title: `${notifications.unreadCount} yeni bildiriminiz var`,
      description:
        "Portföy, müşteri ve platform hareketlerini inceleyin.",
      action: "Bildirimleri Aç",
      icon: <Bell size={18} />,
      tone: "amber",
    });
  }

  const fallbackPriorities: PriorityItem[] = [
    {
      href: "/portfoy",
      title: `${Number(stats.totalUnits || 0)} portföyünüzü yönetin`,
      description:
        "Portföy bilgilerinizi güncel tutun ve sunuma hazırlayın.",
      action: "Portföyleri Aç",
      icon: <Building2 size={18} />,
      tone: "blue",
    },
    {
      href: "/havuz",
      title: "Havuzdaki yeni fırsatları inceleyin",
      description:
        "Portföy ve talepler arasında yeni eşleşmeler arayın.",
      action: "Havuzu Aç",
      icon: <Waves size={18} />,
      tone: "emerald",
    },
    {
      href: "/crm",
      title: `${Number(
        stats.totalCustomers || 0,
      )} müşteri kaydınızı takip edin`,
      description:
        "Görüşmeleri, görevleri ve müşteri taleplerini yönetin.",
      action: "CRM'i Aç",
      icon: <UsersRound size={18} />,
      tone: "violet",
    },
  ];

  for (const fallback of fallbackPriorities) {
    if (priorityItems.length >= 3) break;

    const alreadyExists = priorityItems.some(
      (item) => item.href === fallback.href,
    );

    if (!alreadyExists) {
      priorityItems.push(fallback);
    }
  }

  const opportunities: OpportunityItem[] = [
    {
      href: "/network",
      eyebrow: "Talep Fırsatları",
      title:
        visiblePosts.length > 0
          ? `${visiblePosts.length} aktif talebi incele`
          : "Yeni talepleri keşfet",
      description:
        "Müşterileriniz için uygun portföy fırsatlarını bulun.",
      badge:
        visiblePosts.length > 0
          ? `${visiblePosts.length} Talep`
          : "Talep Merkezi",
      icon: <Target size={21} />,
      tone: "blue",
    },
    {
      href: "/havuz",
      eyebrow: "Havuz Eşleşmeleri",
      title:
        Number(stats.totalUnits || 0) > 0
          ? `${stats.totalUnits} portföy için eşleşme ara`
          : "Havuzda eşleşme ara",
      description:
        "Havuzdaki portföy ve talepleri birlikte değerlendirin.",
      badge: "Havuz",
      icon: <Waves size={21} />,
      tone: "navy",
    },
  ];

  const recentActivities = Array.isArray(
    notifications.items,
  )
    ? notifications.items.slice(0, 3)
    : [];

  if (!hydrated || loading) {
    return (
      <main className="flex min-h-[calc(100dvh-74px)] items-center justify-center bg-[#F4F8FF] px-4">
        <div className="flex flex-col items-center gap-3 text-center text-[#0F2A5F]">
          <span className="flex h-14 w-14 items-center justify-center rounded-[18px] border border-[#D8E3F0] bg-white shadow-[0_12px_28px_rgba(15,42,95,0.10)]">
            <Loader2
              className="animate-spin text-[#2563EB]"
              size={27}
            />
          </span>

          <p className="text-[13px] font-black">
            Akıllı İş Merkezi hazırlanıyor...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100dvh-74px)] overflow-x-hidden bg-[#F4F8FF] px-3 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-3 text-[#0F2A5F]">
      <div className="mx-auto w-full max-w-[440px] space-y-4">

        <section className="relative overflow-hidden rounded-[26px] border border-[#3B82F6]/30 bg-[linear-gradient(145deg,#1E40AF_0%,#1D4ED8_58%,#2563EB_100%)] px-4 pb-4 pt-4 text-white shadow-[0_18px_40px_rgba(30,64,175,0.22)]">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute right-[-54px] top-[-46px] h-44 w-44 rounded-full border border-white/15 bg-white/10"
          />

          <div
            aria-hidden="true"
            className="pointer-events-none absolute bottom-[-78px] left-[-64px] h-44 w-44 rounded-full bg-[#EA580C]/20 blur-2xl"
          />

          <div className="relative z-10">
            <div className="flex flex-col items-center text-center">
              <span className="inline-flex min-h-[28px] items-center gap-1.5 rounded-full border border-white/20 bg-white/15 px-3 text-[10px] font-black uppercase tracking-[0.11em] text-[#DCEBFF] backdrop-blur">
                <ShieldCheck size={13} />
                {role}
              </span>

              <p className="mt-3 text-[10px] font-black uppercase tracking-[0.17em] text-[#93C5FD]">
                EPH PLATFORM
              </p>

              <h1 className="mt-1 text-center text-[23px] font-black leading-[1.1] tracking-[-0.035em]">
                Akıllı İş Merkezi
              </h1>

              <h2 className="mt-2 text-center text-[16px] font-bold text-white/90">
                Merhaba {name} 👋
              </h2>

              <p className="mt-1.5 max-w-[340px] text-center text-[11px] font-medium leading-[1.5] text-white/80">
                {dashboardText}
              </p>
            </div>

            <div className="mt-4 grid grid-cols-3 overflow-hidden rounded-[18px] border border-white/20 bg-white/[0.12] backdrop-blur-md">
              <HeroMetric
                icon={<ClipboardCheck size={16} />}
                value={todayTasks}
                label="Bugünkü İş"
              />

              <HeroMetric
                icon={<Target size={16} />}
                value={visiblePosts.length}
                label="Talep"
              />

              <HeroMetric
                icon={<MessageCircle size={16} />}
                value={unreadMessages}
                label="Mesaj"
              />
            </div>
          </div>
        </section>

        <section>
          <SectionHeader title="Hızlı Başlangıç" />

          <div className="mt-2 grid grid-cols-2 gap-2">
            <QuickAction
              href="/portfoy?create=1"
              icon={<Plus size={20} />}
              title="Yeni Portföy Oluştur"
              description="Gayrimenkulünüzü sisteme ekleyin."
              primary
            />

            <QuickAction
              href="/network?create=1"
              icon={<FileText size={20} />}
              title="Yeni Talep Oluştur"
              description="Müşterinizin aradığı mülkü kaydedin."
              primary
            />

            <QuickAction
              href="/crm?new=1"
              icon={<UserPlus size={20} />}
              title="Müşteri Ekle"
              description="Yeni müşteri kaydı oluşturun."
            />

            <QuickAction
              href="/havuz"
              icon={<Search size={20} />}
              title="Havuzda Eşleşme Ara"
              description="Yeni portföy fırsatlarını keşfedin."
            />
          </div>
        </section>

        <section>
          <SectionHeader
            title="Bugünkü Önceliklerim"
            href="/crm"
          />

          <div className="mt-2 overflow-hidden rounded-[22px] border border-[#D8E3F0] bg-white shadow-[0_12px_28px_rgba(15,42,95,0.07)]">
            {priorityItems.slice(0, 3).map((item, index) => (
              <PriorityRow
                key={`${item.href}-${item.title}`}
                item={item}
                bordered={index > 0}
              />
            ))}
          </div>
        </section>

        <section>
          <SectionHeader
            title="Fırsatlar"
            href="/network"
          />

          <div className="mt-2 grid grid-cols-2 gap-2">
            {opportunities.map((item) => (
              <OpportunityCard
                key={item.href}
                item={item}
              />
            ))}
          </div>
        </section>

        <section>
          <SectionHeader
            title="Son Hareketler"
            href="/notification-settings"
          />

          <div className="mt-2 overflow-hidden rounded-[22px] border border-[#D8E3F0] bg-white shadow-[0_12px_28px_rgba(15,42,95,0.07)]">
            {recentActivities.length > 0 ? (
              recentActivities.map((item, index) => (
                <Link
                  key={item.id}
                  href="/notification-settings"
                  className={`flex min-h-[66px] items-center gap-3 px-3.5 py-3 transition active:bg-[#F4F8FF] ${
                    index > 0
                      ? "border-t border-[#E6EDF6]"
                      : ""
                  }`}
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-[#EAF2FF] text-[#2563EB]">
                    <Bell size={17} />
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-[11.5px] font-black leading-[1.35] text-[#0F2A5F]">
                      {item.title || "Yeni platform hareketi"}
                    </p>

                    <p className="mt-1 text-[9.5px] font-bold text-[#64748B]">
                      {formatActivityTime(
                        item.createdAt,
                        item.isRead,
                      )}
                    </p>
                  </div>

                  <ChevronRight
                    size={17}
                    className="shrink-0 text-[#94A3B8]"
                  />
                </Link>
              ))
            ) : (
              <div className="flex min-h-[118px] flex-col items-center justify-center px-5 py-5 text-center">
                <span className="flex h-11 w-11 items-center justify-center rounded-[15px] bg-[#EEF4FB] text-[#64748B]">
                  <Clock size={19} />
                </span>

                <p className="mt-2.5 text-[11.5px] font-black text-[#0F2A5F]">
                  Henüz yeni hareket yok
                </p>

                <p className="mt-1 max-w-[260px] text-[9.5px] font-semibold leading-4 text-[#64748B]">
                  Portföy, müşteri ve talep hareketleri burada
                  gösterilecek.
                </p>
              </div>
            )}
          </div>
        </section>

        <Link
          href="/portfoy?map=1"
          className="flex min-h-[58px] items-center gap-3 rounded-[20px] border border-[#D8E3F0] bg-white px-4 shadow-[0_10px_26px_rgba(15,42,95,0.06)] transition active:scale-[0.99]"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-[#EAF2FF] text-[#2563EB]">
            <Map size={18} />
          </span>

          <div className="min-w-0 flex-1">
            <p className="text-[11.5px] font-black text-[#0F2A5F]">
              Portföy Haritasını Aç
            </p>

            <p className="mt-0.5 text-[9.5px] font-semibold text-[#64748B]">
              Portföylerinizi harita üzerinde inceleyin.
            </p>
          </div>

          <ChevronRight
            size={18}
            className="shrink-0 text-[#2563EB]"
          />
        </Link>
      </div>
    </main>
  );
}

function HeroMetric({
  icon,
  value,
  label,
}: {
  icon: ReactNode;
  value: number | string;
  label: string;
}) {
  return (
    <div className="flex min-h-[76px] min-w-0 flex-col items-center justify-center px-1.5 py-2.5 text-center [&:not(:last-child)]:border-r [&:not(:last-child)]:border-white/12">
      <span className="flex h-8 w-8 items-center justify-center rounded-[11px] bg-white/12 text-[#AFCBFF]">
        {icon}
      </span>

      <p className="mt-1.5 text-[20px] font-black leading-none text-white">
        {value}
      </p>

      <p className="mt-1 text-[8px] font-black uppercase leading-[10px] tracking-[0.06em] text-white/60">
        {label}
      </p>
    </div>
  );
}

function SectionHeader({
  title,
  href,
}: {
  title: string;
  href?: string;
}) {
  return (
    <div className="flex min-h-[36px] items-center justify-between gap-3 px-1">
      <h2 className="text-[15px] font-black tracking-[-0.015em] text-[#1E3A8A]">
        {title}
      </h2>

      {href && (
        <Link
          href={href}
          className="inline-flex min-h-[44px] items-center gap-0.5 text-[11px] font-bold text-[#2563EB] transition hover:text-[#1D4ED8]"
        >
          Tümünü Gör
          <ChevronRight size={14} />
        </Link>
      )}
    </div>
  );
}

function QuickAction({
  href,
  icon,
  title,
  description,
  primary = false,
}: {
  href: string;
  icon: ReactNode;
  title: string;
  description: string;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group flex min-h-[116px] min-w-0 flex-col rounded-[20px] border p-3 transition active:scale-[0.98] ${
        primary
          ? "border-[#C9DBF4] bg-[linear-gradient(145deg,#FFFFFF_0%,#EEF5FF_100%)] shadow-[0_12px_26px_rgba(37,99,235,0.09)]"
          : "border-[#D8E3F0] bg-white shadow-[0_10px_24px_rgba(15,42,95,0.055)]"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] ${
            primary
              ? "bg-[#2563EB] text-white shadow-[0_8px_18px_rgba(37,99,235,0.25)]"
              : "bg-[#EAF2FF] text-[#2563EB]"
          }`}
        >
          {icon}
        </span>

        <ChevronRight
          size={17}
          className="mt-1 shrink-0 text-[#94A3B8]"
        />
      </div>

      <p className="mt-3 min-w-0 text-[11px] font-black leading-[1.25] text-[#0F2A5F]">
        {title}
      </p>

      <p className="mt-1.5 line-clamp-2 text-[9px] font-semibold leading-[1.4] text-[#64748B]">
        {description}
      </p>
    </Link>
  );
}

function PriorityRow({
  item,
  bordered,
}: {
  item: PriorityItem;
  bordered: boolean;
}) {
  const toneStyles = {
    blue: "bg-[#EAF2FF] text-[#2563EB]",
    violet: "bg-[#F1EDFF] text-[#6D28D9]",
    emerald: "bg-[#E8F8F3] text-[#07846C]",
    amber: "bg-[#FFF5E4] text-[#B7791F]",
  };

  return (
    <Link
      href={item.href}
      className={`flex min-h-[82px] items-center gap-3 px-3 py-3 transition active:bg-[#F8FAFC] ${
        bordered ? "border-t border-[#E6EDF6]" : ""
      }`}
    >
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px] ${toneStyles[item.tone]}`}
      >
        {item.icon}
      </span>

      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-[11px] font-black leading-[1.3] text-[#0F2A5F]">
          {item.title}
        </p>

        <p className="mt-1 line-clamp-2 text-[9px] font-semibold leading-[1.35] text-[#64748B]">
          {item.description}
        </p>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1">
        <span className="rounded-full border border-[#C9DBF4] bg-[#F7FAFF] px-2 py-1 text-[8px] font-black text-[#2563EB]">
          {item.action}
        </span>

        <ChevronRight
          size={15}
          className="text-[#94A3B8]"
        />
      </div>
    </Link>
  );
}

function OpportunityCard({
  item,
}: {
  item: OpportunityItem;
}) {
  const toneStyles = {
    blue: {
      card: "border-[#CFE0F6] bg-[linear-gradient(145deg,#FFFFFF,#EFF6FF)]",
      icon: "bg-[#2563EB] text-white",
      badge: "bg-[#E7F0FF] text-[#2563EB]",
    },
    navy: {
      card: "border-[#CCD8E9] bg-[linear-gradient(145deg,#FFFFFF,#F2F6FB)]",
      icon: "bg-[#0F2A5F] text-white",
      badge: "bg-[#E8EEF6] text-[#0F2A5F]",
    },
  };

  const styles = toneStyles[item.tone];

  return (
    <Link
      href={item.href}
      className={`flex min-h-[168px] min-w-0 flex-col rounded-[21px] border p-3 shadow-[0_12px_26px_rgba(15,42,95,0.065)] transition active:scale-[0.98] ${styles.card}`}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] ${styles.icon}`}
        >
          {item.icon}
        </span>

        <span
          className={`max-w-[74px] rounded-full px-2 py-1 text-center text-[7.5px] font-black leading-[10px] ${styles.badge}`}
        >
          {item.badge}
        </span>
      </div>

      <p className="mt-3 text-[8px] font-black uppercase tracking-[0.08em] text-[#64748B]">
        {item.eyebrow}
      </p>

      <p className="mt-1.5 line-clamp-2 text-[12px] font-black leading-[1.25] text-[#0F2A5F]">
        {item.title}
      </p>

      <p className="mt-1.5 line-clamp-3 text-[9px] font-semibold leading-[1.4] text-[#64748B]">
        {item.description}
      </p>

      <span className="mt-auto inline-flex items-center gap-1 pt-3 text-[8.5px] font-black text-[#2563EB]">
        İncele
        <ChevronRight size={13} />
      </span>
    </Link>
  );
}
