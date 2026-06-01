"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  ArrowLeft,
  Bell,
  Bot,
  BriefcaseBusiness,
  Building2,
  CalendarCheck,
  CheckCircle2,
  CheckSquare,
  Clock3,
  Crown,
  Home,
  Loader2,
  Menu,
  MessageCircle,
  Plus,
  Settings,
  ShieldCheck,
  Sparkles,
  Store,
  TrendingUp,
  UserCheck,
  UsersRound,
  X,
} from "lucide-react";

import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";

type RoleType =
  | "realtor"
  | "contractor"
  | "construction"
  | "admin"
  | "superadmin";

type ToneType = "blue" | "orange" | "green" | "purple" | "slate";

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

type AdminStats = {
  totalUsers?: number;
  pendingUsers?: number;
  approvedUsers?: number;
  totalInvitations?: number;
  pendingDocuments?: number;
  pendingNominations?: number;
  pendingApplications?: number;
  byRole?: { role: string; count: number }[];
};

type ApplicationItem = {
  id: string;
  applicantName: string;
  applicantEmail: string;
  requestedRole: string;
  status: string;
  createdAt: string;
};

type UserItem = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  isApproved: boolean;
};

function normalizeRole(role?: string | null) {
  return String(role || "")
    .toLocaleUpperCase("tr-TR")
    .trim();
}

function getRoleType(role?: string | null): RoleType {
  const normalizedRole = normalizeRole(role);

  if (normalizedRole === "SUPER_ADMIN") return "superadmin";
  if (normalizedRole === "ADMIN") return "admin";

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

  return "realtor";
}

function roleLabel(role?: string | null) {
  const normalizedRole = normalizeRole(role);

  if (normalizedRole === "SUPER_ADMIN") return "Süper Admin";
  if (normalizedRole === "ADMIN") return "Admin";
  if (normalizedRole === "MUTEAHHIT") return "Müteahhit";
  if (normalizedRole === "MÜTEAHHİT") return "Müteahhit";
  if (normalizedRole === "MÜTAHHİT") return "Müteahhit";
  if (normalizedRole === "INSAAT_FIRMASI") return "İnşaat Firması";
  if (normalizedRole === "İNŞAAT_FİRMASI") return "İnşaat Firması";

  return "Gayrimenkul Danışmanı";
}

function greetingText() {
  const hour = new Date().getHours();

  if (hour < 11) return "Günaydın";
  if (hour < 17) return "İyi günler";
  return "İyi akşamlar";
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

  return `${date.toLocaleDateString("tr-TR")} · ${date.toLocaleTimeString(
    "tr-TR",
    {
      hour: "2-digit",
      minute: "2-digit",
    },
  )}`;
}

function formatBudget(value?: number | null) {
  if (!value) return "Bütçe yok";
  return `${value.toLocaleString("tr-TR")} TL`;
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

function getTone(roleType: RoleType): ToneType {
  if (roleType === "contractor") return "orange";
  if (roleType === "construction") return "green";
  if (roleType === "admin") return "purple";
  if (roleType === "superadmin") return "slate";

  return "blue";
}

function toneClasses(tone: ToneType) {
  const map = {
    blue: {
      text: "text-blue-700",
      bg: "bg-blue-600",
      soft: "bg-blue-50",
      border: "border-blue-100",
      shadow: "shadow-blue-600/20",
    },
    orange: {
      text: "text-orange-700",
      bg: "bg-orange-600",
      soft: "bg-orange-50",
      border: "border-orange-100",
      shadow: "shadow-orange-600/20",
    },
    green: {
      text: "text-green-700",
      bg: "bg-green-600",
      soft: "bg-green-50",
      border: "border-green-100",
      shadow: "shadow-green-600/20",
    },
    purple: {
      text: "text-purple-700",
      bg: "bg-purple-600",
      soft: "bg-purple-50",
      border: "border-purple-100",
      shadow: "shadow-purple-600/20",
    },
    slate: {
      text: "text-slate-800",
      bg: "bg-slate-950",
      soft: "bg-slate-100",
      border: "border-slate-200",
      shadow: "shadow-slate-900/20",
    },
  };

  return map[tone];
}

function DashboardShell({
  title,
  role,
  tone,
  unreadMessages,
  notificationCount,
  children,
}: {
  title: string;
  role: string;
  tone: ToneType;
  unreadMessages: number;
  notificationCount: number;
  children: ReactNode;
}) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const toneStyle = toneClasses(tone);

  const mainLinks = [
    { label: "Ana Sayfa", href: "/dashboard", icon: <Home size={20} /> },
    { label: "Stok", href: "/stok", icon: <Building2 size={20} /> },
    { label: "CRM", href: "/crm", icon: <BriefcaseBusiness size={20} /> },
    { label: "Network", href: "/network", icon: <Store size={20} /> },
    { label: "Lina", href: "/lina", icon: <Bot size={20} /> },
  ];

  const menuLinks = [
    ...mainLinks,
    { label: "Mesajlar", href: "/messages", icon: <MessageCircle size={20} /> },
    { label: "Profil", href: "/profil", icon: <UserCheck size={20} /> },
    {
      label: "Bildirim Ayarları",
      href: "/notification-settings",
      icon: <Settings size={20} />,
    },
  ];

  return (
    <main className="min-h-screen bg-[#F8FAFC] text-[#071332]">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-start justify-between gap-3 px-4 py-4">
          <button
            onClick={() => router.back()}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <ArrowLeft size={17} />
            Geri
          </button>

          <div className="min-w-0 flex-1 px-1 text-center">
            <div
              className={`mx-auto inline-flex rounded-full border px-3 py-1 text-[11px] font-black ${toneStyle.border} ${toneStyle.soft} ${toneStyle.text}`}
            >
              {role}
            </div>

            <h1 className="mt-2 truncate text-[22px] font-black tracking-tight text-slate-950">
              {title}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/notification-settings"
              className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
              aria-label="Bildirim ayarları"
            >
              <Bell size={18} />

              {notificationCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-black text-white">
                  {notificationCount}
                </span>
              )}
            </Link>

            <Link
              href="/messages"
              className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
              aria-label="Mesajlar"
            >
              <MessageCircle size={18} />

              {unreadMessages > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-black text-white">
                  {unreadMessages}
                </span>
              )}
            </Link>

            <button
              onClick={() => setMenuOpen(true)}
              className={`flex h-11 w-11 items-center justify-center rounded-2xl text-white shadow-lg transition ${toneStyle.bg} ${toneStyle.shadow}`}
              aria-label="Menüyü aç"
            >
              <Menu size={21} />
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-6 pb-28">
        {children}
      </section>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-3 py-3 backdrop-blur-xl md:hidden">
        <div className="grid grid-cols-5 gap-2">
          {mainLinks.map((item) => {
            const active = item.href === "/dashboard";

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex min-h-[58px] flex-col items-center justify-center gap-1 rounded-2xl text-[10px] font-black ${
                  active
                    ? `${toneStyle.bg} text-white shadow-lg ${toneStyle.shadow}`
                    : "border border-slate-200 bg-white text-slate-700"
                }`}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {menuOpen && (
        <div
          className="fixed inset-0 z-[9999] bg-slate-950/50 p-4 backdrop-blur-sm"
          onClick={() => setMenuOpen(false)}
        >
          <aside
            className="ml-auto flex h-full w-full max-w-sm flex-col overflow-auto rounded-[30px] bg-white p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div
                  className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-black ${toneStyle.border} ${toneStyle.soft} ${toneStyle.text}`}
                >
                  EPH Menü
                </div>

                <h2 className="mt-2 text-2xl font-black text-slate-950">
                  Hızlı Geçiş
                </h2>

                <p className="mt-1 text-sm font-semibold text-slate-500">
                  Platformun ana bölümlerine tek dokunuşla geç.
                </p>
              </div>

              <button
                onClick={() => setMenuOpen(false)}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mt-5 grid gap-2">
              {menuLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className="flex min-h-14 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-800 transition hover:bg-slate-50"
                >
                  <span
                    className={`flex h-10 w-10 items-center justify-center rounded-xl ${toneStyle.soft} ${toneStyle.text}`}
                  >
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              ))}
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}

function WelcomeCard({
  firstName,
  role,
  tone,
  portfolioCount,
  customerCount,
  taskCount,
  unreadMessages,
}: {
  firstName: string;
  role: string;
  tone: ToneType;
  portfolioCount: number;
  customerCount: number;
  taskCount: number;
  unreadMessages: number;
}) {
  const toneStyle = toneClasses(tone);

  return (
    <section className="overflow-hidden rounded-[30px] border border-slate-200 bg-white p-6 text-center shadow-sm md:p-8">
      <div
        className={`mx-auto inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-black ${toneStyle.border} ${toneStyle.soft} ${toneStyle.text}`}
      >
        <CheckCircle2 size={15} />
        {role}
      </div>

      <h2 className="mt-5 text-4xl font-black tracking-tight text-slate-950 md:text-6xl">
        {greetingText()} {firstName} 👋
      </h2>

      <p className="mx-auto mt-4 max-w-2xl text-sm font-semibold leading-7 text-slate-500 md:text-base">
        Bugünkü portföy, müşteri, görev ve mesaj akışını tek ekrandan yönet.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MiniSummary value={portfolioCount} label="Aktif Portföy" />
        <MiniSummary value={customerCount} label="CRM Kaydı" />
        <MiniSummary value={taskCount} label="Açık Görev" />
        <MiniSummary value={unreadMessages} label="Okunmamış Mesaj" />
      </div>
    </section>
  );
}

function MiniSummary({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-[#F8FAFC] p-4 text-center">
      <div className="text-3xl font-black text-slate-950">{value}</div>
      <div className="mt-1 text-xs font-black uppercase tracking-[0.16em] text-slate-400">
        {label}
      </div>
    </div>
  );
}

function KpiCard({
  href,
  icon,
  title,
  value,
  desc,
  tone,
}: {
  href: string;
  icon: ReactNode;
  title: string;
  value: string;
  desc: string;
  tone: ToneType;
}) {
  const toneStyle = toneClasses(tone);

  return (
    <Link
      href={href}
      className="block rounded-[26px] border border-slate-200 bg-white p-5 text-center shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
    >
      <div
        className={`mx-auto flex h-13 w-13 items-center justify-center rounded-2xl ${toneStyle.soft} ${toneStyle.text}`}
      >
        {icon}
      </div>

      <p className="mt-4 text-xs font-black uppercase tracking-[0.16em] text-slate-400">
        {title}
      </p>

      <p className="mt-2 text-3xl font-black text-slate-950">{value}</p>

      <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
        {desc}
      </p>
    </Link>
  );
}

function SectionCard({
  icon,
  title,
  desc,
  children,
}: {
  icon: ReactNode;
  title: string;
  desc: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[30px] border border-slate-200 bg-white p-5 text-center shadow-sm md:p-6">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-blue-700 ring-1 ring-slate-200">
        {icon}
      </div>

      <h2 className="mt-4 text-2xl font-black text-slate-950">{title}</h2>

      <p className="mx-auto mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-500">
        {desc}
      </p>

      <div className="mt-5">{children}</div>
    </section>
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
  const toneStyle = toneClasses(tone);

  return (
    <Link
      href={href}
      className="rounded-[24px] border border-slate-200 bg-white p-4 text-center shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
    >
      <div
        className={`mx-auto flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-lg ${toneStyle.bg} ${toneStyle.shadow}`}
      >
        {icon}
      </div>

      <span className="mt-3 block text-sm font-black text-slate-800">
        {label}
      </span>
    </Link>
  );
}

function TaskRow({
  task,
}: {
  task: {
    id: string;
    title: string;
    dueDate?: string | null;
    customerName: string;
    customerPhone?: string | null;
  };
}) {
  return (
    <Link
      href="/crm"
      className="block rounded-2xl border border-slate-200 bg-[#F8FAFC] px-4 py-3 text-center transition hover:bg-white"
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

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-[#F8FAFC] px-4 py-5 text-center text-sm font-semibold text-slate-500">
      {text}
    </div>
  );
}

function OpportunityCard({ post }: { post: FeaturedNetworkPost }) {
  const location = [post.city, post.district].filter(Boolean).join(" / ");

  return (
    <Link
      href={`/network/${post.id}`}
      className="block rounded-[24px] border border-slate-200 bg-[#F8FAFC] p-4 text-center transition hover:bg-white hover:shadow-sm"
    >
      <div className="mx-auto inline-flex rounded-full bg-orange-50 px-3 py-1 text-[11px] font-black text-orange-700">
        {post.type || "Fırsat"}
      </div>

      <h3 className="mt-3 line-clamp-2 text-lg font-black leading-tight text-slate-950">
        {post.title}
      </h3>

      <p className="mt-2 text-xs font-bold text-slate-500">
        {location || "Konum bilgisi yok"}
      </p>

      <p className="mt-2 text-sm font-black text-blue-700">
        {formatBudget(post.budget)}
      </p>

      <div className="mt-3 flex flex-wrap justify-center gap-2 text-[10px] font-black text-slate-500">
        <span className="rounded-full bg-white px-2 py-1">
          👁 {post.viewCount}
        </span>
        <span className="rounded-full bg-white px-2 py-1">
          ⭐ {post.followerCount}
        </span>
        <span className="rounded-full bg-white px-2 py-1">
          💬 {post.requestCount}
        </span>
      </div>
    </Link>
  );
}

function NotificationRow({
  item,
  onClick,
}: {
  item: NetworkNotification;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-2xl border border-slate-200 bg-[#F8FAFC] px-4 py-4 text-center transition hover:bg-white"
    >
      <div className="flex flex-col items-center justify-center gap-2 md:flex-row">
        {!item.isRead && (
          <span className="rounded-full bg-red-600 px-2 py-1 text-[10px] font-black text-white">
            YENİ
          </span>
        )}

        <span className="text-sm font-black text-slate-900">{item.title}</span>
      </div>

      <p className="mx-auto mt-2 max-w-3xl whitespace-pre-line text-xs font-semibold leading-6 text-slate-500">
        {item.message}
      </p>
    </button>
  );
}

function AdminApplicationRow({ item }: { item: ApplicationItem }) {
  return (
    <Link
      href="/admin"
      className="block rounded-2xl border border-slate-200 bg-[#F8FAFC] px-4 py-4 text-center transition hover:bg-white"
    >
      <p className="text-sm font-black text-slate-950">{item.applicantName}</p>

      <p className="mt-1 text-xs font-semibold text-slate-500">
        {item.applicantEmail}
      </p>

      <p className="mt-2 text-[11px] font-black text-blue-700">
        {roleLabel(item.requestedRole)}
      </p>
    </Link>
  );
}

function AdminUserRow({ item }: { item: UserItem }) {
  return (
    <Link
      href="/admin"
      className="block rounded-2xl border border-slate-200 bg-[#F8FAFC] px-4 py-4 text-center transition hover:bg-white"
    >
      <p className="text-sm font-black text-slate-950">
        {item.firstName} {item.lastName}
      </p>

      <p className="mt-1 text-xs font-semibold text-slate-500">{item.email}</p>

      <div className="mt-3 flex flex-wrap justify-center gap-2">
        <span className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-black text-blue-700">
          {roleLabel(item.role)}
        </span>

        <span
          className={`rounded-full px-3 py-1 text-[11px] font-black ${
            item.isApproved
              ? "bg-emerald-50 text-emerald-700"
              : "bg-amber-50 text-amber-700"
          }`}
        >
          {item.isApproved ? "Onaylı" : "Bekliyor"}
        </span>
      </div>
    </Link>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [hydrated, setHydrated] = useState(false);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null);
  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [networkNotifications, setNetworkNotifications] =
    useState<NetworkNotificationResponse>({ unreadCount: 0, items: [] });
  const [featuredPosts, setFeaturedPosts] = useState<FeaturedNetworkPost[]>([]);
  const [crmCustomers, setCrmCustomers] = useState<CrmDashboardCustomer[]>([]);
  const [loading, setLoading] = useState(true);

  const roleType = getRoleType(user?.role);
  const tone = getTone(roleType);

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
      const [
        summaryRes,
        conversationsRes,
        notificationsRes,
        featuredRes,
        crmCustomersRes,
        adminStatsRes,
        applicationsRes,
        usersRes,
      ] = await Promise.allSettled([
        api.get("/dashboard/summary"),
        user?.id
          ? api.get(`/conversations?userId=${user.id}`)
          : Promise.resolve({ data: [] }),
        user?.id
          ? api.get(`/network/notifications?userId=${user.id}`)
          : Promise.resolve({ data: { unreadCount: 0, items: [] } }),
        api.get("/network/posts/featured"),
        api.get("/crm/customers"),
        roleType === "admin" || roleType === "superadmin"
          ? api.get("/admin/stats")
          : Promise.resolve({ data: null }),
        roleType === "admin" || roleType === "superadmin"
          ? api.get("/admin/applications?status=PENDING")
          : Promise.resolve({ data: [] }),
        roleType === "admin" || roleType === "superadmin"
          ? api.get("/admin/users?filter=all")
          : Promise.resolve({ data: [] }),
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

      if (adminStatsRes.status === "fulfilled") {
        setAdminStats(adminStatsRes.value.data || null);
      } else {
        setAdminStats(null);
      }

      if (applicationsRes.status === "fulfilled") {
        setApplications(
          Array.isArray(applicationsRes.value.data)
            ? (applicationsRes.value.data as ApplicationItem[])
            : [],
        );
      } else {
        setApplications([]);
      }

      if (usersRes.status === "fulfilled") {
        setUsers(
          Array.isArray(usersRes.value.data)
            ? (usersRes.value.data as UserItem[])
            : [],
        );
      } else {
        setUsers([]);
      }
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

  const crmTasks = useMemo(
    () => flattenCustomerTasks(crmCustomers),
    [crmCustomers],
  );

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

  const visibleOpportunityPosts = featuredPosts.filter((post) => {
    const ownerId = post.userId || post.user?.id;
    return !user?.id || !ownerId || ownerId !== user.id;
  });

  const roleName = roleLabel(user?.role);

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
    <DashboardShell
      title={roleType === "superadmin" ? "Yönetim Merkezi" : "Dashboard"}
      role={roleName}
      tone={tone}
      unreadMessages={unreadMessages}
      notificationCount={networkNotifications.unreadCount}
    >
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <WelcomeCard
          firstName={firstName}
          role={roleName}
          tone={tone}
          portfolioCount={stats.totalUnits || 0}
          customerCount={stats.totalCustomers || 0}
          taskCount={crmTasks.length}
          unreadMessages={unreadMessages}
        />

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            href="/stok"
            icon={<Building2 size={23} />}
            title="Portföylerim"
            value={String(stats.totalUnits || 0)}
            desc="Aktif stok ve ilan kayıtları"
            tone={tone}
          />

          <KpiCard
            href="/crm"
            icon={<UsersRound size={23} />}
            title="Müşterilerim"
            value={String(stats.totalCustomers || 0)}
            desc="CRM müşteri kayıtları"
            tone="blue"
          />

          <KpiCard
            href="/crm"
            icon={<CalendarCheck size={23} />}
            title="Görevlerim"
            value={String(crmTasks.length)}
            desc="Bekleyen CRM görevleri"
            tone="orange"
          />

          <KpiCard
            href="/messages"
            icon={<MessageCircle size={23} />}
            title="Mesajlarım"
            value={String(unreadMessages)}
            desc="Okunmamış görüşmeler"
            tone="green"
          />
        </section>

        <SectionCard
          icon={<Sparkles size={24} />}
          title="Hızlı İşlemler"
          desc="Gün içinde en çok kullanılacak EPH operasyon kısayolları."
        >
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <QuickAction
              href="/stok"
              icon={<Plus size={21} />}
              label="Portföy Ekle"
              tone={tone}
            />
            <QuickAction
              href="/network"
              icon={<Store size={21} />}
              label="Talep Paylaş"
              tone="orange"
            />
            <QuickAction
              href="/crm"
              icon={<BriefcaseBusiness size={21} />}
              label="CRM Aç"
              tone="blue"
            />
            <QuickAction
              href="/messages"
              icon={<MessageCircle size={21} />}
              label="Mesajlar"
              tone="green"
            />
            <QuickAction
              href="/lina"
              icon={<Bot size={21} />}
              label="Lina"
              tone="purple"
            />
          </div>
        </SectionCard>

        <SectionCard
          icon={<CalendarCheck size={24} />}
          title="CRM Görevleri"
          desc="Bugünkü, geciken ve yaklaşan müşteri takiplerini buradan izle."
        >
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-[24px] border border-slate-200 bg-white p-4">
              <h3 className="text-sm font-black text-slate-900">
                Bugünkü İşlerim
              </h3>

              <div className="mt-3 space-y-2">
                {todayTasks.length > 0 ? (
                  todayTasks
                    .slice(0, 3)
                    .map((task) => <TaskRow key={task.id} task={task} />)
                ) : (
                  <EmptyState text="Bugün için planlı görev yok." />
                )}
              </div>
            </div>

            <div className="rounded-[24px] border border-red-100 bg-red-50/50 p-4">
              <h3 className="text-sm font-black text-red-700">
                Geciken Görevler
              </h3>

              <div className="mt-3 space-y-2">
                {overdueTasks.length > 0 ? (
                  overdueTasks
                    .slice(0, 3)
                    .map((task) => <TaskRow key={task.id} task={task} />)
                ) : (
                  <EmptyState text="Geciken görev yok." />
                )}
              </div>
            </div>

            <div className="rounded-[24px] border border-amber-100 bg-amber-50/50 p-4">
              <h3 className="text-sm font-black text-amber-700">
                Yaklaşan Görevler
              </h3>

              <div className="mt-3 space-y-2">
                {upcomingTasks.length > 0 ? (
                  upcomingTasks
                    .slice(0, 3)
                    .map((task) => <TaskRow key={task.id} task={task} />)
                ) : (
                  <EmptyState text="Yaklaşan görev yok." />
                )}
              </div>
            </div>
          </div>
        </SectionCard>

        <section className="grid gap-6 lg:grid-cols-2">
          <SectionCard
            icon={<Store size={24} />}
            title="EPH Fırsat Merkezi"
            desc="Network akışındaki sıcak talepleri ve öne çıkan fırsatları takip et."
          >
            <div className="grid gap-3">
              {visibleOpportunityPosts.length > 0 ? (
                visibleOpportunityPosts
                  .slice(0, 3)
                  .map((post) => <OpportunityCard key={post.id} post={post} />)
              ) : (
                <EmptyState text="Şu anda sana uygun yeni Network fırsatı yok." />
              )}
            </div>
          </SectionCard>

          <SectionCard
            icon={<Bell size={24} />}
            title="Bildirimler"
            desc="Okunmamış Network bildirimleri ve sistem uyarıları."
          >
            <div className="grid gap-3">
              {networkNotifications.items.length > 0 ? (
                networkNotifications.items
                  .slice(0, 4)
                  .map((item) => (
                    <NotificationRow
                      key={item.id}
                      item={item}
                      onClick={markNetworkNotificationsRead}
                    />
                  ))
              ) : (
                <EmptyState text="Şu anda yeni bildirim yok." />
              )}
            </div>
          </SectionCard>
        </section>

        {(roleType === "admin" || roleType === "superadmin") && (
          <section className="grid gap-6 lg:grid-cols-2">
            <SectionCard
              icon={<ShieldCheck size={24} />}
              title="Yönetim Özeti"
              desc="Kullanıcı, başvuru ve sistem hareketlerini hızlıca kontrol et."
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <MiniSummary
                  value={adminStats?.totalUsers || 0}
                  label="Toplam Üye"
                />
                <MiniSummary
                  value={adminStats?.approvedUsers || 0}
                  label="Onaylı Üye"
                />
                <MiniSummary
                  value={adminStats?.pendingUsers || 0}
                  label="Bekleyen Üye"
                />
                <MiniSummary
                  value={adminStats?.pendingApplications || 0}
                  label="Başvuru"
                />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <QuickAction
                  href="/admin"
                  icon={<ShieldCheck size={21} />}
                  label="Admin"
                  tone={tone}
                />
                <QuickAction
                  href="/admin/referrals"
                  icon={<UsersRound size={21} />}
                  label="Referans"
                  tone="blue"
                />
              </div>
            </SectionCard>

            <SectionCard
              icon={<UserCheck size={24} />}
              title="Son Yönetim Hareketleri"
              desc="Bekleyen başvurular ve son üye kayıtları."
            >
              <div className="grid gap-3">
                {applications.length > 0 ? (
                  applications
                    .slice(0, 2)
                    .map((item) => (
                      <AdminApplicationRow key={item.id} item={item} />
                    ))
                ) : (
                  <EmptyState text="Bekleyen başvuru yok." />
                )}

                {users.length > 0 &&
                  users
                    .slice(0, 2)
                    .map((item) => <AdminUserRow key={item.id} item={item} />)}
              </div>
            </SectionCard>
          </section>
        )}

        <SectionCard
          icon={<Bot size={24} />}
          title="Lina Önerisi"
          desc="Bugünkü iş akışını hızlandırmak için Lina'dan destek al."
        >
          <div className="rounded-[24px] border border-slate-200 bg-[#F8FAFC] p-5 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
              <Bot size={30} />
            </div>

            <h3 className="mt-4 text-xl font-black text-slate-950">
              Bugün Lina ile portföy metinlerini hızlandırabilirsin.
            </h3>

            <p className="mx-auto mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-500">
              İlan açıklaması, müşteri notu, paylaşım metni ve portföy özeti
              hazırlamak için Lina'yı kullan.
            </p>

            <div className="mt-5 flex justify-center">
              <Link
                href="/lina"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-7 text-sm font-black text-white shadow-lg shadow-blue-600/20"
              >
                Lina'yı Başlat
                <Sparkles size={17} />
              </Link>
            </div>
          </div>
        </SectionCard>
      </div>
    </DashboardShell>
  );
}