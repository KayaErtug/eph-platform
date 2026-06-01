"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  Bell,
  Bot,
  BriefcaseBusiness,
  Building2,
  CalendarCheck,
  CheckCircle2,
  CheckSquare,
  Clock3,
  Crown,
  Database,
  FileText,
  Home,
  Loader2,
  MessageCircle,
  Plus,
  Radio,
  ShieldCheck,
  Sparkles,
  Store,
  TrendingUp,
  UserCheck,
  UsersRound,
  WalletCards,
} from "lucide-react";

import EphAppShell from "@/components/EphAppShell";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";

type RoleType = "realtor" | "contractor" | "construction" | "admin" | "superadmin";
type ToneType = "blue" | "orange" | "amber" | "slate" | "teal";

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
  return String(role || "").toLocaleUpperCase("tr-TR").trim();
}

function getRoleType(role?: string | null): RoleType {
  const normalizedRole = normalizeRole(role);

  if (normalizedRole === "SUPER_ADMIN") return "superadmin";

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

  if (normalizedRole === "ADMIN") return "admin";

  return "realtor";
}

function roleLabel(role?: string | null) {
  const normalizedRole = normalizeRole(role);

  if (normalizedRole === "SUPER_ADMIN") return "Süper Admin";
  if (normalizedRole === "ADMIN") return "Admin";
  if (normalizedRole === "MUTEAHHIT") return "Müteahhit";
  if (normalizedRole === "INSAAT_FIRMASI") return "İnşaat Firması";
  return "Emlakçı";
}

function statusLabel(status?: string | null) {
  const map: Record<string, string> = {
    PENDING: "Bekliyor",
    APPROVED: "Onaylandı",
    REJECTED: "Reddedildi",
    INVITED: "Davet Gönderildi",
    REGISTERED: "Kayıt Oldu",
  };

  return map[String(status || "")] || String(status || "Durum yok");
}

function shortDate(value?: string | null) {
  if (!value) return "Tarih yok";

  return new Date(value).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
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

function StatCard({
  icon,
  title,
  value,
  description,
  tone,
  href,
}: {
  icon: ReactNode;
  title: string;
  value: string;
  description: string;
  tone: ToneType;
  href?: string;
}) {
  const toneClass: Record<ToneType, string> = {
    blue: "bg-blue-50 text-blue-700",
    orange: "bg-orange-50 text-orange-700",
    amber: "bg-amber-50 text-amber-700",
    slate: "bg-slate-100 text-slate-700",
    teal: "bg-teal-50 text-teal-700",
  };

  const content = (
    <>
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
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="block rounded-[26px] border border-slate-200 bg-white p-5 text-center shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl"
      >
        {content}
      </Link>
    );
  }

  return (
    <div className="rounded-[26px] border border-slate-200 bg-white p-5 text-center shadow-sm">
      {content}
    </div>
  );
}

function SuperAdminMetric({
  icon,
  label,
  value,
  note,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="rounded-[28px] border border-teal-100 bg-white p-5 text-center shadow-sm">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-600">
        {icon}
      </div>

      <p className="mt-4 text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
        {label}
      </p>

      <p className="mt-2 text-4xl font-black text-slate-950">{value}</p>

      <p className="mx-auto mt-2 max-w-xs text-xs font-semibold leading-5 text-slate-500">
        {note}
      </p>
    </div>
  );
}

function SuperAdminAction({
  href,
  icon,
  title,
  desc,
}: {
  href: string;
  icon: ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-[28px] border border-slate-200 bg-white p-5 text-center shadow-sm transition hover:-translate-y-1 hover:border-teal-200 hover:shadow-xl"
    >
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0F172A] text-white shadow-lg shadow-slate-900/15 transition group-hover:bg-[#14B8A6]">
        {icon}
      </div>

      <h3 className="mt-4 text-lg font-black text-slate-950">{title}</h3>

      <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
        {desc}
      </p>
    </Link>
  );
}

function SignalLine({
  icon,
  title,
  value,
  tone = "teal",
}: {
  icon: ReactNode;
  title: string;
  value: string;
  tone?: "teal" | "blue" | "amber" | "slate";
}) {
  const toneClass = {
    teal: "bg-teal-50 text-teal-700 border-teal-100",
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
    slate: "bg-slate-100 text-slate-700 border-slate-200",
  }[tone];

  return (
    <div className={`rounded-2xl border px-4 py-4 text-center ${toneClass}`}>
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-white/80">
        {icon}
      </div>

      <p className="mt-3 text-xs font-black uppercase tracking-[0.16em]">
        {title}
      </p>

      <p className="mt-1 text-sm font-black">{value}</p>
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
  icon: ReactNode;
  label: string;
  tone: ToneType;
}) {
  const toneClass: Record<ToneType, string> = {
    blue: "bg-blue-600 shadow-blue-600/20",
    orange: "bg-orange-600 shadow-orange-600/20",
    amber: "bg-[#C9A84C] shadow-[#C9A84C]/20",
    slate: "bg-slate-900 shadow-slate-900/20",
    teal: "bg-teal-600 shadow-teal-600/20",
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

function DashboardTaskRow({
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

function greetingText() {
  const hour = new Date().getHours();

  if (hour < 11) return "Günaydın";
  if (hour < 17) return "İyi günler";
  return "İyi akşamlar";
}

function formatBudget(value?: number | null) {
  if (!value) return "Bütçe yok";
  return `${value.toLocaleString("tr-TR")} TL`;
}

function TodayFocusCard({
  icon,
  label,
  value,
  desc,
  tone,
  href,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  desc: string;
  tone: ToneType;
  href: string;
}) {
  const toneClass: Record<ToneType, string> = {
    blue: "border-blue-100 bg-blue-50 text-blue-700",
    orange: "border-orange-100 bg-orange-50 text-orange-700",
    amber: "border-amber-100 bg-amber-50 text-amber-700",
    slate: "border-slate-200 bg-slate-50 text-slate-700",
    teal: "border-teal-100 bg-teal-50 text-teal-700",
  };

  return (
    <Link
      href={href}
      className="block rounded-[24px] border border-slate-200 bg-white p-4 text-center shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl"
    >
      <div
        className={`mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border ${toneClass[tone]}`}
      >
        {icon}
      </div>

      <p className="mt-3 text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-2xl font-black text-slate-950">{value}</p>

      <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
        {desc}
      </p>
    </Link>
  );
}

function PerformanceCard({
  icon,
  title,
  value,
  desc,
  tone,
  href,
}: {
  icon: ReactNode;
  title: string;
  value: string;
  desc: string;
  tone: ToneType;
  href: string;
}) {
  const toneClass: Record<ToneType, string> = {
    blue: "bg-blue-600",
    orange: "bg-orange-600",
    amber: "bg-[#C9A84C]",
    slate: "bg-slate-900",
    teal: "bg-teal-600",
  };

  return (
    <Link
      href={href}
      className="block rounded-[26px] border border-slate-200 bg-white p-5 text-center shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl"
    >
      <div
        className={`mx-auto flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-lg ${toneClass[tone]}`}
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

function OpportunityCard({ post }: { post: FeaturedNetworkPost }) {
  const location = [post.city, post.district].filter(Boolean).join(" / ");

  return (
    <Link
      href={`/network/${post.id}`}
      className="block rounded-[24px] border border-slate-200 bg-slate-50 p-4 text-center transition hover:border-blue-200 hover:bg-white hover:shadow-sm"
    >
      <div className="mx-auto inline-flex rounded-full bg-orange-50 px-3 py-1 text-[11px] font-black text-orange-700">
        🔥 {post.type || "Fırsat"}
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
        <span className="rounded-full bg-white px-2 py-1">👁 {post.viewCount}</span>
        <span className="rounded-full bg-white px-2 py-1">⭐ {post.followerCount}</span>
        <span className="rounded-full bg-white px-2 py-1">💬 {post.requestCount}</span>
      </div>
    </Link>
  );
}

function SuperAdminDashboard({
  adminStats,
  summary,
  unreadMessages,
  featuredPosts,
  applications,
  users,
  networkNotifications,
  onReadNotifications,
}: {
  adminStats: AdminStats | null;
  summary: DashboardSummary | null;
  unreadMessages: number;
  featuredPosts: FeaturedNetworkPost[];
  applications: ApplicationItem[];
  users: UserItem[];
  networkNotifications: NetworkNotificationResponse;
  onReadNotifications: () => void;
}) {
  const stats = summary?.stats || {};
  const byRole = adminStats?.byRole || [];

  const roleCount = (role: string) =>
    byRole.find((item) => item.role === role)?.count || 0;

  const totalUsers = adminStats?.totalUsers || 0;
  const approvedUsers = adminStats?.approvedUsers || 0;
  const pendingUsers = adminStats?.pendingUsers || 0;
  const pendingApplications = adminStats?.pendingApplications || 0;
  const pendingDocuments = adminStats?.pendingDocuments || 0;
  const pendingNominations = adminStats?.pendingNominations || 0;
  const totalInvitations = adminStats?.totalInvitations || 0;
  const totalUnits = stats.totalUnits || 0;
  const totalVisits = stats.totalVisits || 0;
  const hotPosts = featuredPosts.filter(
    (post) => post.viewCount + post.followerCount + post.requestCount > 0,
  );

  return (
    <EphAppShell title="EPH Yönetim Merkezi">
      <div className="mx-auto w-full max-w-6xl">
        <section className="overflow-hidden rounded-[36px] bg-gradient-to-br from-[#0F172A] via-[#134E4A] to-[#14B8A6] p-6 text-center text-white shadow-2xl md:p-9">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/15 px-4 py-2 text-xs font-black backdrop-blur">
            <Crown size={15} />
            EPH Kurucu Alanı
          </div>

          <h1 className="mt-5 text-4xl font-black tracking-tight md:text-6xl">
            Hoşgeldin Mustafa Abi
          </h1>

          <p className="mx-auto mt-4 max-w-3xl text-sm font-semibold leading-7 text-white/80 md:text-base">
            EPH Platform Komuta Merkezi. Kullanıcılar, başvurular, ilanlar,
            trafik ve denetim sinyalleri tek ekranda.
          </p>

          <div className="mt-7 grid gap-3 md:grid-cols-4">
            <div className="rounded-3xl border border-white/15 bg-white/10 p-4 backdrop-blur">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/60">
                Sistem
              </p>
              <p className="mt-1 text-xl font-black">Online</p>
            </div>

            <div className="rounded-3xl border border-white/15 bg-white/10 p-4 backdrop-blur">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/60">
                Yetki
              </p>
              <p className="mt-1 text-xl font-black">Kurucu Erişimi</p>
            </div>

            <div className="rounded-3xl border border-white/15 bg-white/10 p-4 backdrop-blur">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/60">
                Bugünkü Odak
              </p>
              <p className="mt-1 text-xl font-black">Operasyon</p>
            </div>

            <div className="rounded-3xl border border-white/15 bg-white/10 p-4 backdrop-blur">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/60">
                Tema
              </p>
              <p className="mt-1 text-xl font-black">Turkuaz Yönetim</p>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SuperAdminMetric
            icon={<UsersRound size={22} />}
            label="Toplam Üye"
            value={String(totalUsers)}
            note="Platforma kayıtlı tüm kullanıcılar"
          />
          <SuperAdminMetric
            icon={<UserCheck size={22} />}
            label="Onaylı Üye"
            value={String(approvedUsers)}
            note="Aktif olarak platformu kullanabilen üyeler"
          />
          <SuperAdminMetric
            icon={<CheckSquare size={22} />}
            label="Bekleyen Onay"
            value={String(pendingUsers + pendingApplications)}
            note="Üye ve başvuru tarafında bekleyen işlemler"
          />
          <SuperAdminMetric
            icon={<TrendingUp size={22} />}
            label="Ziyaret"
            value={String(totalVisits)}
            note="Platform trafik ve hareketlilik göstergesi"
          />
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SuperAdminMetric
            icon={<Building2 size={22} />}
            label="Aktif Stok"
            value={String(totalUnits)}
            note="Sistemdeki ilan ve bağımsız bölüm kayıtları"
          />
          <SuperAdminMetric
            icon={<FileText size={22} />}
            label="Belge"
            value={String(pendingDocuments)}
            note="İnceleme bekleyen belge kayıtları"
          />
          <SuperAdminMetric
            icon={<MessageCircle size={22} />}
            label="Mesaj"
            value={String(unreadMessages)}
            note="Okunmamış görüşme ve mesaj akışı"
          />
          <SuperAdminMetric
            icon={<Sparkles size={22} />}
            label="Davet"
            value={String(totalInvitations)}
            note="Referans ve davet kodu hareketleri"
          />
        </section>

        <section className="mt-6 rounded-[32px] border border-slate-200 bg-white p-5 text-center shadow-sm md:p-6">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-teal-600">
            <Radio size={24} />
          </div>

          <h2 className="mt-4 text-2xl font-black text-slate-950">
            Platform Canlı Sinyalleri
          </h2>

          <p className="mx-auto mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-500">
            Sistemin bugünkü operasyon durumunu hızlıca oku.
          </p>

          <div className="mt-5 grid gap-3 md:grid-cols-4">
            <SignalLine
              icon={<CheckSquare size={20} />}
              title="Başvuru"
              value={`${pendingApplications} bekliyor`}
              tone="teal"
            />
            <SignalLine
              icon={<FileText size={20} />}
              title="Belge"
              value={`${pendingDocuments} inceleme`}
              tone="blue"
            />
            <SignalLine
              icon={<UserCheck size={20} />}
              title="Tavsiye"
              value={`${pendingNominations} aday`}
              tone="amber"
            />
            <SignalLine
              icon={<Activity size={20} />}
              title="Sıcak Akış"
              value={`${hotPosts.length} paylaşım`}
              tone="slate"
            />
          </div>
        </section>

        <section className="mt-6 rounded-[32px] border border-slate-200 bg-white p-5 text-center shadow-sm md:p-6">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-white">
            <ShieldCheck size={24} />
          </div>

          <h2 className="mt-4 text-2xl font-black text-slate-950">
            Kurucu Hızlı Erişim
          </h2>

          <p className="mx-auto mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-500">
            EPH omurgasının ana yönetim kapıları burada.
          </p>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <SuperAdminAction
              href="/admin"
              icon={<ShieldCheck size={22} />}
              title="Yönetim Merkezi"
              desc="Kullanıcı, başvuru, belge ve stok yönetimi"
            />
            <SuperAdminAction
              href="/admin/referrals"
              icon={<UsersRound size={22} />}
              title="Referans Kodları"
              desc="Özel davet ve referans akışını yönet"
            />
            <SuperAdminAction
              href="/network"
              icon={<Store size={22} />}
              title="Network Denetimi"
              desc="Talep, paylaşım ve pazaryeri sinyallerini izle"
            />
            <SuperAdminAction
              href="/stok"
              icon={<Building2 size={22} />}
              title="İlan Denetimi"
              desc="Stok, doğrulama ve off-market kayıtlarını kontrol et"
            />
            <SuperAdminAction
              href="/messages"
              icon={<MessageCircle size={22} />}
              title="Mesaj İnceleme"
              desc="Görüşme trafiğini denetim amacıyla takip et"
            />
            <SuperAdminAction
              href="/profil"
              icon={<Crown size={22} />}
              title="Kurucu Profili"
              desc="Hesap, rol ve kurucu erişimini görüntüle"
            />
          </div>
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-[1fr_1fr]">
          <div className="rounded-[32px] border border-slate-200 bg-white p-5 text-center shadow-sm md:p-6">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-teal-600">
              <UsersRound size={24} />
            </div>

            <h2 className="mt-4 text-2xl font-black text-slate-950">
              Rol Dağılımı
            </h2>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <SignalLine
                icon={<UsersRound size={18} />}
                title="Emlakçı"
                value={`${roleCount("EMLAKCI")} üye`}
                tone="blue"
              />
              <SignalLine
                icon={<BriefcaseBusiness size={18} />}
                title="Müteahhit"
                value={`${roleCount("MUTEAHHIT")} üye`}
                tone="amber"
              />
              <SignalLine
                icon={<Building2 size={18} />}
                title="İnşaat Firması"
                value={`${roleCount("INSAAT_FIRMASI")} üye`}
                tone="slate"
              />
              <SignalLine
                icon={<Crown size={18} />}
                title="Yönetim"
                value={`${roleCount("ADMIN") + roleCount("SUPER_ADMIN")} hesap`}
                tone="teal"
              />
            </div>
          </div>

          <div className="rounded-[32px] border border-slate-200 bg-white p-5 text-center shadow-sm md:p-6">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <Bell size={24} />
            </div>

            <h2 className="mt-4 text-2xl font-black text-slate-950">
              Bildirim ve Uyarılar
            </h2>

            <div className="mt-5 grid gap-3">
              {networkNotifications.items.length > 0 ? (
                networkNotifications.items.slice(0, 4).map((item) => (
                  <button
                    key={item.id}
                    onClick={onReadNotifications}
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
                  Şu anda kritik bildirim yok.
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-[1fr_1fr]">
          <div className="rounded-[32px] border border-slate-200 bg-white p-5 text-center shadow-sm md:p-6">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
              <CheckCircle2 size={24} />
            </div>

            <h2 className="mt-4 text-2xl font-black text-slate-950">
              Bekleyen Başvurular
            </h2>

            <div className="mt-5 grid gap-3">
              {applications.length > 0 ? (
                applications.slice(0, 5).map((application) => (
                  <Link
                    href="/admin"
                    key={application.id}
                    className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4 text-center transition hover:bg-white"
                  >
                    <p className="text-sm font-black text-slate-950">
                      {application.applicantName}
                    </p>

                    <p className="mt-1 text-xs font-semibold text-slate-500">
                      {application.applicantEmail}
                    </p>

                    <div className="mt-3 flex flex-wrap justify-center gap-2">
                      <span className="rounded-full bg-teal-50 px-3 py-1 text-[11px] font-black text-teal-700">
                        {roleLabel(application.requestedRole)}
                      </span>

                      <span className="rounded-full bg-amber-50 px-3 py-1 text-[11px] font-black text-amber-700">
                        {statusLabel(application.status)}
                      </span>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="rounded-2xl bg-slate-50 px-4 py-5 text-sm font-semibold text-slate-500">
                  Bekleyen başvuru yok.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[32px] border border-slate-200 bg-white p-5 text-center shadow-sm md:p-6">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
              <Database size={24} />
            </div>

            <h2 className="mt-4 text-2xl font-black text-slate-950">
              Son Üye Hareketleri
            </h2>

            <div className="mt-5 grid gap-3">
              {users.length > 0 ? (
                users.slice(0, 5).map((item) => (
                  <Link
                    href="/admin"
                    key={item.id}
                    className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4 text-center transition hover:bg-white"
                  >
                    <p className="text-sm font-black text-slate-950">
                      {item.firstName} {item.lastName}
                    </p>

                    <p className="mt-1 text-xs font-semibold text-slate-500">
                      {item.email}
                    </p>

                    <div className="mt-3 flex flex-wrap justify-center gap-2">
                      <span className="rounded-full bg-teal-50 px-3 py-1 text-[11px] font-black text-teal-700">
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
                ))
              ) : (
                <div className="rounded-2xl bg-slate-50 px-4 py-5 text-sm font-semibold text-slate-500">
                  Üye hareketi bulunamadı.
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </EphAppShell>
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

  const pendingTaskCount = summary?.pendingTasks?.length || 0;

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
            href: "/stok",
          },
          {
            title: "Toplam Stok",
            value: String(stats.totalUnits || 0),
            description: "Satıştaki bağımsız bölümler",
            icon: <Home size={22} />,
            href: "/stok",
          },
          {
            title: "Bu Ay Tahsilat",
            value: "0 TL",
            description: "Tahsilat modülüyle dolacak",
            icon: <WalletCards size={22} />,
            href: "/market",
          },
          {
            title: "Satış Performansı",
            value: "%0",
            description: "Satış oranı takibi",
            icon: <TrendingUp size={22} />,
            href: "/stok",
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
            href: "/stok",
          },
          {
            title: "Satılık Bölümler",
            value: String(stats.totalUnits || 0),
            description: "Satıştaki portföylerin",
            icon: <Home size={22} />,
            href: "/stok",
          },
          {
            title: "İş Ortakları",
            value: String(stats.totalCustomers || 0),
            description: "Kayıtlı bağlantıların",
            icon: <BriefcaseBusiness size={22} />,
            href: "/crm",
          },
          {
            title: "Mesajlar",
            value: String(unreadMessages),
            description: "Okunmamış görüşmeler",
            icon: <MessageCircle size={22} />,
            href: "/messages",
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
            href: "/admin",
          },
          {
            title: "Stok",
            value: String(stats.totalUnits || 0),
            description: "Toplam kayıt",
            icon: <Building2 size={22} />,
            href: "/stok",
          },
          {
            title: "Ziyaret",
            value: String(stats.totalVisits || 0),
            description: "Platform trafiği",
            icon: <TrendingUp size={22} />,
            href: "/admin",
          },
          {
            title: "Mesajlar",
            value: String(unreadMessages),
            description: "Okunmamış mesaj",
            icon: <MessageCircle size={22} />,
            href: "/messages",
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
          href: "/stok",
        },
        {
          title: "Müşterilerim",
          value: String(stats.totalCustomers || 0),
          description: "CRM müşteri kayıtların",
          icon: <UsersRound size={22} />,
          href: "/crm",
        },
        {
          title: "Görevler",
          value: String(pendingTaskCount),
          description: "Bekleyen işlerin",
          icon: <CalendarCheck size={22} />,
          href: "/crm",
        },
        {
          title: "Mesajlar",
          value: String(unreadMessages),
          description: "Okunmamış görüşmeler",
          icon: <MessageCircle size={22} />,
          href: "/messages",
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

  if (roleType === "superadmin") {
    return (
      <SuperAdminDashboard
        adminStats={adminStats}
        summary={summary}
        unreadMessages={unreadMessages}
        featuredPosts={featuredPosts}
        applications={applications}
        users={users}
        networkNotifications={networkNotifications}
        onReadNotifications={markNetworkNotificationsRead}
      />
    );
  }

  const portfolioUpdateCount = Math.max(stats.totalUnits || 0, 0);
  const visibleOpportunityPosts = featuredPosts.filter((post) => {
    const ownerId = post.userId || post.user?.id;
    return !user?.id || !ownerId || ownerId !== user.id;
  });
  const totalOpportunityCount = visibleOpportunityPosts.length;

  return (
    <EphAppShell title={pageConfig.title}>
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <section className="overflow-hidden rounded-[34px] border border-slate-200 bg-white p-5 text-center shadow-sm md:p-7">
          <div className="mx-auto inline-flex rounded-full border border-blue-100 bg-blue-50 px-4 py-2 text-xs font-black text-blue-700">
            {roleLabel(user?.role)} Paneli
          </div>

          <h1 className="mt-5 text-4xl font-black tracking-tight text-slate-950 md:text-6xl">
            {greetingText()} {firstName} 👋
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-sm font-semibold leading-7 text-slate-500 md:text-base">
            Bugün seni bekleyen işleri, müşteri takiplerini ve EPH fırsatlarını tek ekrandan yönet.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <TodayFocusCard
              icon={<CalendarCheck size={22} />}
              label="Bugün"
              value={`${todayTasks.length} görev`}
              desc="Bugün tamamlanacak müşteri işleri"
              tone="blue"
              href="/crm"
            />
            <TodayFocusCard
              icon={<Clock3 size={22} />}
              label="Geciken"
              value={`${overdueTasks.length} görev`}
              desc="Öncelikli takip bekleyen işler"
              tone="amber"
              href="/crm"
            />
            <TodayFocusCard
              icon={<MessageCircle size={22} />}
              label="Mesaj"
              value={String(unreadMessages)}
              desc="Okunmamış görüşme ve dönüşler"
              tone="teal"
              href="/messages"
            />
            <TodayFocusCard
              icon={<Store size={22} />}
              label="Fırsat"
              value={String(totalOpportunityCount)}
              desc="Sana ait olmayan sıcak başlıklar"
              tone="slate"
              href="/network"
            />
          </div>
        </section>

        <section className="rounded-[30px] border border-slate-200 bg-white p-5 text-center shadow-sm md:p-6">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <div className="text-center md:text-left">
              <h2 className="text-2xl font-black text-slate-950">
                Hızlı İşlemler
              </h2>
              <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-500">
                Gün içinde en çok dokunacağın ana işlemler.
              </p>
            </div>

            <div className="inline-flex rounded-full bg-slate-50 px-4 py-2 text-xs font-black text-slate-500">
              EPH operasyon kısayolları
            </div>
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

        <section className="rounded-[30px] border border-slate-200 bg-white p-5 text-center shadow-sm md:p-6">
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
            <StatCard
              icon={<CalendarCheck size={22} />}
              title="Bugünkü Görev"
              value={String(todayTasks.length)}
              description="Bugün tamamlanması gereken CRM işleri"
              tone="blue"
              href="/crm"
            />
            <StatCard
              icon={<Clock3 size={22} />}
              title="Geciken Görev"
              value={String(overdueTasks.length)}
              description="Tarihi geçmiş ve tamamlanmamış işler"
              tone="amber"
              href="/crm"
            />
            <StatCard
              icon={<CheckSquare size={22} />}
              title="Yaklaşan Görev"
              value={String(upcomingTasks.length)}
              description="Bugünden sonraki planlı müşteri işleri"
              tone="slate"
              href="/crm"
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
        </section>

        <section className="rounded-[30px] border border-slate-200 bg-white p-5 text-center shadow-sm md:p-6">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
            <TrendingUp size={24} />
          </div>

          <h2 className="mt-4 text-2xl font-black text-slate-950">
            Bugünkü Performansım
          </h2>

          <p className="mx-auto mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-500">
            Portföy, müşteri, görüşme ve takip gücünü hızlıca gör.
          </p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <PerformanceCard
              icon={<Building2 size={22} />}
              title="Portföy"
              value={String(stats.totalUnits || 0)}
              desc="Aktif ilan ve stok kayıtları"
              tone={pageConfig.tone}
              href="/stok"
            />
            <PerformanceCard
              icon={<UsersRound size={22} />}
              title="Müşteri"
              value={String(stats.totalCustomers || 0)}
              desc="CRM tarafındaki toplam kayıt"
              tone="blue"
              href="/crm"
            />
            <PerformanceCard
              icon={<MessageCircle size={22} />}
              title="Görüşme"
              value={String(unreadMessages)}
              desc="Okunmamış özel mesaj akışı"
              tone="teal"
              href="/messages"
            />
            <PerformanceCard
              icon={<Activity size={22} />}
              title="Güncelleme"
              value={String(portfolioUpdateCount)}
              desc="Bugün takip edilecek portföy alanı"
              tone="slate"
              href="/stok"
            />
          </div>
        </section>

        <section className="rounded-[30px] border border-slate-200 bg-white p-5 text-center shadow-sm md:p-6">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-orange-700">
            <Store size={24} />
          </div>

          <h2 className="mt-4 text-2xl font-black text-slate-950">
            EPH Fırsat Merkezi
          </h2>

          <p className="mx-auto mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-500">
            Network akışındaki sıcak talepleri ve öne çıkan fırsatları kaçırma.
          </p>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {visibleOpportunityPosts.length > 0 ? (
              visibleOpportunityPosts.slice(0, 3).map((post) => (
                <OpportunityCard key={post.id} post={post} />
              ))
            ) : (
              <div className="rounded-2xl bg-slate-50 px-4 py-5 text-sm font-semibold text-slate-500 md:col-span-3">
                Sana uygun yeni Network fırsatı yok. Kendi paylaşımların bu alanda sayılmaz.
              </div>
            )}
          </div>
        </section>
      </div>
    </EphAppShell>
  );
}
