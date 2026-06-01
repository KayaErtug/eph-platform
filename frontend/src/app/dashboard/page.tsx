"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bell,
  Bot,
  BriefcaseBusiness,
  Building2,
  CalendarCheck,
  CheckCircle2,
  ChevronRight,
  Home,
  Loader2,
  LogOut,
  Menu,
  MessageCircle,
  Plus,
  Settings,
  ShieldCheck,
  Sparkles,
  Store,
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
  tasks?: Array<{
    id: string;
    title: string;
    dueDate?: string | null;
    status: string;
  }>;
};

type DashboardSummary = {
  stats?: {
    totalUnits?: number;
    totalCustomers?: number;
    totalVisits?: number;
    totalProjects?: number;
  };
};

type AdminStats = {
  totalUsers?: number;
  pendingUsers?: number;
  approvedUsers?: number;
  pendingApplications?: number;
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
      text: "text-[#1557D6]",
      bg: "bg-[#1557D6]",
      soft: "bg-[#EFF6FF]",
      border: "border-[#DDE7F3]",
      shadow: "shadow-[0_16px_34px_rgba(21,87,214,0.24)]",
    },
    orange: {
      text: "text-[#EA580C]",
      bg: "bg-[#EA580C]",
      soft: "bg-[#FFF7ED]",
      border: "border-[#FED7AA]",
      shadow: "shadow-[0_16px_34px_rgba(234,88,12,0.20)]",
    },
    green: {
      text: "text-[#16A34A]",
      bg: "bg-[#16A34A]",
      soft: "bg-[#F0FDF4]",
      border: "border-[#BBF7D0]",
      shadow: "shadow-[0_16px_34px_rgba(22,163,74,0.18)]",
    },
    purple: {
      text: "text-[#7C3AED]",
      bg: "bg-[#7C3AED]",
      soft: "bg-[#F5F3FF]",
      border: "border-[#DDD6FE]",
      shadow: "shadow-[0_16px_34px_rgba(124,58,237,0.20)]",
    },
    slate: {
      text: "text-[#0F172A]",
      bg: "bg-[#0F172A]",
      soft: "bg-[#F1F5F9]",
      border: "border-[#DDE7F3]",
      shadow: "shadow-[0_16px_34px_rgba(15,23,42,0.20)]",
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

  useEffect(() => {
    if (!menuOpen) return;

    const scrollY = window.scrollY;
    const originalPosition = document.body.style.position;
    const originalTop = document.body.style.top;
    const originalWidth = document.body.style.width;
    const originalOverflow = document.body.style.overflow;

    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.position = originalPosition;
      document.body.style.top = originalTop;
      document.body.style.width = originalWidth;
      document.body.style.overflow = originalOverflow;
      window.scrollTo(0, scrollY);
    };
  }, [menuOpen]);

  const mainLinks = [
    { label: "Ana Sayfa", href: "/dashboard", icon: <Home size={22} /> },
    { label: "Stok", href: "/stok", icon: <Building2 size={22} /> },
    { label: "CRM", href: "/crm", icon: <BriefcaseBusiness size={22} /> },
    { label: "Network", href: "/network", icon: <Store size={22} /> },
    { label: "Lina", href: "/lina", icon: <Bot size={22} /> },
  ];

  const menuLinks = [
    ...mainLinks,
    { label: "Mesajlar", href: "/messages", icon: <MessageCircle size={22} /> },
    { label: "Profil", href: "/profil", icon: <UserCheck size={22} /> },
    {
      label: "Bildirim Ayarları",
      href: "/notification-settings",
      icon: <Settings size={22} />,
    },
  ];

  return (
    <main className="min-h-screen bg-[#F7FBFF] text-[#06194A]">
      <header className="sticky top-0 z-50 border-b border-[#DDE7F3] bg-white/96 shadow-[0_10px_28px_rgba(15,23,42,0.06)] backdrop-blur-xl">
        <div className="mx-auto grid max-w-7xl grid-cols-[76px_1fr_76px] items-center gap-2 px-4 py-4 md:grid-cols-[150px_1fr_150px] md:px-6 lg:px-8">
          <div className="flex justify-start">
            <button
              onClick={() => router.back()}
              className="flex h-[58px] w-[58px] flex-col items-center justify-center rounded-2xl border border-[#DDE7F3] bg-white text-[#1557D6] shadow-[0_10px_24px_rgba(15,23,42,0.10)] md:h-[70px] md:w-[70px]"
              aria-label="Geri dön"
            >
              <ArrowLeft size={24} strokeWidth={2.6} />
              <span className="mt-1 text-[10px] font-black">GERİ</span>
            </button>
          </div>

          <div className="min-w-0 text-center">
            <div
              className={`mx-auto inline-flex max-w-full rounded-full border px-3 py-1 text-[10px] font-black md:text-[11px] ${toneStyle.border} ${toneStyle.soft} ${toneStyle.text}`}
            >
              {role}
            </div>

            <h1 className="mt-2 truncate text-[24px] font-black leading-none tracking-[-0.04em] text-[#06194A] md:text-[40px]">
              {title}
            </h1>

            <p className="mt-1 truncate text-[12px] font-bold text-[#1557D6] md:text-[17px]">
              EPH Platform İş Merkezi
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Link
              href="/notification-settings"
              className="relative hidden h-[58px] w-[58px] items-center justify-center rounded-2xl border border-[#DDE7F3] bg-white text-[#1557D6] shadow-[0_10px_24px_rgba(15,23,42,0.10)] sm:flex md:h-[70px] md:w-[70px]"
              aria-label="Bildirim ayarları"
            >
              <Bell size={24} />

              {notificationCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-black text-white">
                  {notificationCount}
                </span>
              )}
            </Link>

            <button
              onClick={() => setMenuOpen(true)}
              className="relative flex h-[58px] w-[58px] flex-col items-center justify-center rounded-2xl border border-[#DDE7F3] bg-white text-[#1557D6] shadow-[0_10px_24px_rgba(15,23,42,0.10)] md:h-[70px] md:w-[70px]"
              aria-label="Menüyü aç"
            >
              <Menu size={25} strokeWidth={2.7} />
              <span className="mt-1 text-[10px] font-black">MENÜ</span>

              {unreadMessages + notificationCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-black text-white">
                  {unreadMessages + notificationCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-7 pb-28 md:px-6 md:py-9 lg:px-8">
        {children}
      </section>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[#DDE7F3] bg-white/96 px-3 py-3 shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur-xl md:hidden">
        <div className="grid grid-cols-5 gap-2">
          {mainLinks.map((item) => {
            const active = item.href === "/dashboard";

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex min-h-[58px] flex-col items-center justify-center gap-1 rounded-2xl text-[10px] font-black ${
                  active
                    ? `${toneStyle.bg} text-white ${toneStyle.shadow}`
                    : "border border-[#DDE7F3] bg-white text-[#27364F]"
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
        <div className="fixed inset-0 z-[9999] flex items-end justify-center bg-[#06194A]/65 px-4 pt-8 backdrop-blur-sm">
          <aside className="flex max-h-[92dvh] w-full max-w-[430px] flex-col overflow-hidden rounded-t-[36px] border border-[#DDE7F3] bg-white shadow-2xl">
            <div className="relative shrink-0 px-6 pb-5 pt-6 text-center">
              <div className="mx-auto mb-5 h-1.5 w-14 rounded-full bg-[#DDE7F3]" />

              <button
                onClick={() => setMenuOpen(false)}
                className="absolute right-5 top-7 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#DDE7F3] bg-white text-[#06194A] shadow-[0_10px_24px_rgba(15,23,42,0.08)]"
                aria-label="Menüyü kapat"
              >
                <X size={24} />
              </button>

              <h2 className="text-[36px] font-black leading-none tracking-[-0.04em] text-[#06194A]">
                EPH Menü
              </h2>

              <p className="mx-auto mt-3 max-w-[320px] text-[16px] font-bold leading-7 text-[#64748B]">
                Platformun tüm bölümlerine hızlı geçiş yap.
              </p>
            </div>

            <div
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-6 pt-1"
              style={{
                WebkitOverflowScrolling: "touch",
              }}
            >
              <div className="grid gap-3">
                {menuLinks.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className="grid h-[78px] w-full grid-cols-[62px_1fr_28px] items-center gap-4 rounded-[24px] border border-[#DDE7F3] bg-white px-4 text-left shadow-[0_10px_26px_rgba(15,23,42,0.06)]"
                  >
                    <span className="flex h-[54px] w-[54px] items-center justify-center rounded-2xl bg-[#EFF6FF] text-[#1557D6]">
                      {item.icon}
                    </span>

                    <span className="truncate text-[22px] font-black text-[#06194A]">
                      {item.label}
                    </span>

                    <span className="flex justify-end">
                      <ChevronRight size={25} className="text-[#06194A]" />
                    </span>
                  </Link>
                ))}
              </div>

              <div className="mt-8 text-center">
                <div className="flex items-center justify-center gap-4">
                  <span className="h-px flex-1 bg-[#DDE7F3]" />
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#EFF6FF] text-[#1557D6]">
                    <ShieldCheck size={23} />
                  </span>
                  <span className="h-px flex-1 bg-[#DDE7F3]" />
                </div>

                <p className="mt-4 text-lg font-black text-[#1557D6]">
                  Güvenli. Verimli. Kazançlı.
                </p>

                <p className="mt-1 text-sm font-bold text-[#64748B]">
                  EPH Platform
                </p>

                <Link
                  href="/giris"
                  className="mt-6 flex h-[62px] w-full items-center justify-center gap-3 rounded-2xl bg-[#1557D6] text-[20px] font-black text-white shadow-[0_16px_34px_rgba(21,87,214,0.24)]"
                >
                  <LogOut size={24} />
                  Çıkış Yap
                </Link>
              </div>
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
    <section className="relative overflow-hidden rounded-[32px] border border-[#DDE7F3] bg-white p-7 text-center shadow-[0_24px_70px_rgba(15,23,42,0.10)] md:p-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(21,87,214,0.12),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(219,234,254,0.85),transparent_34%)]" />

      <div className="relative">
        <div
          className={`mx-auto inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-black ${toneStyle.border} ${toneStyle.soft} ${toneStyle.text}`}
        >
          <CheckCircle2 size={15} />
          {role}
        </div>

        <h2 className="mx-auto mt-6 max-w-4xl text-[38px] font-black leading-[1.04] tracking-[-0.05em] text-[#06194A] md:text-[64px]">
          {greetingText()} {firstName}
        </h2>

        <p className="mx-auto mt-5 max-w-2xl text-base font-bold leading-8 text-[#27364F] md:text-xl">
          Portföylerini, müşteri takiplerini, görevlerini ve mesajlarını tek merkezden profesyonel şekilde yönet.
        </p>

        <div className="mt-8 grid auto-rows-fr gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MiniSummary value={portfolioCount} label="Aktif Portföy" />
          <MiniSummary value={customerCount} label="CRM Kaydı" />
          <MiniSummary value={taskCount} label="Açık Görev" />
          <MiniSummary value={unreadMessages} label="Okunmamış Mesaj" />
        </div>
      </div>
    </section>
  );
}

function MiniSummary({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex min-h-[118px] flex-col items-center justify-center rounded-[24px] border border-[#DDE7F3] bg-white p-4 text-center shadow-[0_10px_26px_rgba(15,23,42,0.06)]">
      <div className="text-3xl font-black text-[#06194A]">{value}</div>
      <div className="mt-1 text-xs font-black uppercase tracking-[0.16em] text-[#64748B]">
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
      className="flex min-h-[252px] flex-col items-center justify-center rounded-[28px] border border-[#DDE7F3] bg-white p-6 text-center shadow-[0_14px_34px_rgba(15,23,42,0.08)] transition hover:-translate-y-1 hover:shadow-[0_22px_48px_rgba(15,23,42,0.12)]"
    >
      <div
        className={`mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] ${toneStyle.soft} ${toneStyle.text}`}
      >
        {icon}
      </div>

      <p className="mt-5 text-xs font-black uppercase tracking-[0.16em] text-[#64748B]">
        {title}
      </p>

      <p className="mt-3 text-4xl font-black text-[#06194A]">{value}</p>

      <p className="mt-3 line-clamp-2 min-h-[48px] text-sm font-bold leading-6 text-[#475569]">
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
    <section className="rounded-[32px] border border-[#DDE7F3] bg-white p-5 text-center shadow-[0_18px_48px_rgba(15,23,42,0.08)] md:p-7">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] bg-[#EFF6FF] text-[#1557D6] ring-1 ring-[#DDE7F3]">
        {icon}
      </div>

      <h2 className="mt-5 text-2xl font-black tracking-[-0.03em] text-[#06194A] md:text-3xl">{title}</h2>

      <p className="mx-auto mt-3 max-w-2xl text-sm font-bold leading-6 text-[#475569]">
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
      className="flex min-h-[168px] flex-col items-center justify-center rounded-[24px] border border-[#DDE7F3] bg-white p-4 text-center shadow-[0_12px_30px_rgba(15,23,42,0.07)] transition hover:-translate-y-1 hover:shadow-[0_20px_44px_rgba(15,23,42,0.12)]"
    >
      <div
        className={`mx-auto flex h-14 w-14 items-center justify-center rounded-[20px] text-white ${toneStyle.bg} ${toneStyle.shadow}`}
      >
        {icon}
      </div>

      <span className="mt-4 flex min-h-[44px] items-center justify-center text-center text-[15px] font-black leading-5 text-[#27364F]">
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
      className="flex min-h-[118px] flex-col items-center justify-center rounded-[22px] border border-[#DDE7F3] bg-[#F7FBFF] px-4 py-3 text-center transition hover:bg-white"
    >
      <div className="line-clamp-1 text-sm font-black text-[#06194A]">
        {task.title}
      </div>

      <div className="mt-1 line-clamp-1 text-xs font-semibold text-[#475569]">
        {task.customerName}
        {task.customerPhone ? ` · ${task.customerPhone}` : ""}
      </div>

      <div className="mt-2 text-[11px] font-black text-[#1557D6]">
        {formatTaskTime(task.dueDate)}
      </div>
    </Link>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex min-h-[118px] items-center justify-center rounded-[22px] border border-[#DDE7F3] bg-[#F7FBFF] px-4 py-5 text-center text-sm font-semibold text-[#475569]">
      {text}
    </div>
  );
}

function OpportunityCard({ post }: { post: FeaturedNetworkPost }) {
  const location = [post.city, post.district].filter(Boolean).join(" / ");

  return (
    <Link
      href={`/network/${post.id}`}
      className="flex min-h-[236px] flex-col items-center justify-center rounded-[24px] border border-[#DDE7F3] bg-[#F7FBFF] p-5 text-center shadow-[0_10px_26px_rgba(15,23,42,0.06)] transition hover:bg-white hover:shadow-[0_18px_42px_rgba(15,23,42,0.10)]"
    >
      <div className="flex h-8 items-center justify-center rounded-full bg-[#EFF6FF] px-4 text-[11px] font-black text-[#1557D6]">
        {post.type || "Fırsat"}
      </div>

      <h3 className="mt-5 flex min-h-[58px] max-w-full items-center justify-center overflow-hidden text-center text-lg font-black leading-tight text-[#06194A]">
        <span className="line-clamp-2">{post.title}</span>
      </h3>

      <p className="mt-4 flex h-5 max-w-full items-center justify-center truncate text-xs font-bold text-[#64748B]">
        {location || "Konum bilgisi yok"}
      </p>

      <p className="mt-4 flex h-6 items-center justify-center text-sm font-black text-[#1557D6]">
        {formatBudget(post.budget)}
      </p>

      <div className="mt-5 flex h-7 items-center justify-center gap-2 text-[10px] font-black text-[#64748B]">
        <span className="rounded-full bg-white px-3 py-1 shadow-sm">
          👁 {post.viewCount}
        </span>
        <span className="rounded-full bg-white px-3 py-1 shadow-sm">
          ⭐ {post.followerCount}
        </span>
        <span className="rounded-full bg-white px-3 py-1 shadow-sm">
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
      className="flex min-h-[136px] flex-col items-center justify-center rounded-[22px] border border-[#DDE7F3] bg-[#F7FBFF] px-4 py-4 text-center transition hover:bg-white"
    >
      <div className="flex flex-col items-center justify-center gap-2 md:flex-row">
        {!item.isRead && (
          <span className="rounded-full bg-red-600 px-2 py-1 text-[10px] font-black text-white">
            YENİ
          </span>
        )}

        <span className="text-sm font-black text-[#06194A]">{item.title}</span>
      </div>

      <p className="mx-auto mt-3 line-clamp-3 max-w-3xl whitespace-pre-line text-xs font-semibold leading-6 text-[#475569]">
        {item.message}
      </p>
    </button>
  );
}

function AdminApplicationRow({ item }: { item: ApplicationItem }) {
  return (
    <Link
      href="/admin"
      className="flex min-h-[132px] flex-col items-center justify-center rounded-[22px] border border-[#DDE7F3] bg-[#F7FBFF] px-4 py-4 text-center transition hover:bg-white"
    >
      <p className="line-clamp-1 text-sm font-black text-[#06194A]">
        {item.applicantName}
      </p>

      <p className="mt-1 line-clamp-1 text-xs font-semibold text-[#475569]">
        {item.applicantEmail}
      </p>

      <p className="mt-2 text-[11px] font-black text-[#1557D6]">
        {roleLabel(item.requestedRole)}
      </p>
    </Link>
  );
}

function AdminUserRow({ item }: { item: UserItem }) {
  return (
    <Link
      href="/admin"
      className="flex min-h-[132px] flex-col items-center justify-center rounded-[22px] border border-[#DDE7F3] bg-[#F7FBFF] px-4 py-4 text-center transition hover:bg-white"
    >
      <p className="line-clamp-1 text-sm font-black text-[#06194A]">
        {item.firstName} {item.lastName}
      </p>

      <p className="mt-1 line-clamp-1 text-xs font-semibold text-[#475569]">
        {item.email}
      </p>

      <div className="mt-3 flex flex-wrap justify-center gap-2">
        <span className="rounded-full bg-[#EFF6FF] px-3 py-1 text-[11px] font-black text-[#1557D6]">
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
      <main className="flex min-h-screen items-center justify-center bg-[#F7FBFF]">
        <div className="flex flex-col items-center gap-4 text-[#27364F]">
          <Loader2 className="animate-spin text-[#1557D6]" size={34} />
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
      <div className="mx-auto w-full max-w-6xl space-y-7">
        <WelcomeCard
          firstName={firstName}
          role={roleName}
          tone={tone}
          portfolioCount={stats.totalUnits || 0}
          customerCount={stats.totalCustomers || 0}
          taskCount={crmTasks.length}
          unreadMessages={unreadMessages}
        />

        <section className="grid auto-rows-fr gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
          desc="Portföy, talep, CRM, mesaj ve Lina akışına tek dokunuşla geç."
        >
          <div className="grid auto-rows-fr grid-cols-2 gap-3 md:grid-cols-5">
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
          desc="Müşteri takiplerini gün, öncelik ve zaman akışına göre düzenli takip et."
        >
          <div className="grid auto-rows-fr gap-3 md:grid-cols-3">
            <div className="flex min-h-[390px] flex-col rounded-[24px] border border-[#DDE7F3] bg-white p-4">
              <div className="flex h-12 items-center justify-center">
                <h3 className="text-sm font-black text-[#06194A]">
                  Bugünkü İşlerim
                </h3>
              </div>

              <div className="mt-3 grid flex-1 content-start gap-2">
                {todayTasks.length > 0 ? (
                  todayTasks
                    .slice(0, 3)
                    .map((task) => <TaskRow key={task.id} task={task} />)
                ) : (
                  <EmptyState text="Bugün için planlı görev yok." />
                )}
              </div>
            </div>

            <div className="flex min-h-[390px] flex-col rounded-[24px] border border-red-100 bg-red-50/50 p-4">
              <div className="flex h-12 items-center justify-center">
                <h3 className="text-sm font-black text-red-700">
                  Geciken Görevler
                </h3>
              </div>

              <div className="mt-3 grid flex-1 content-start gap-2">
                {overdueTasks.length > 0 ? (
                  overdueTasks
                    .slice(0, 3)
                    .map((task) => <TaskRow key={task.id} task={task} />)
                ) : (
                  <EmptyState text="Geciken görev yok." />
                )}
              </div>
            </div>

            <div className="flex min-h-[390px] flex-col rounded-[24px] border border-amber-100 bg-amber-50/50 p-4">
              <div className="flex h-12 items-center justify-center">
                <h3 className="text-sm font-black text-amber-700">
                  Yaklaşan Görevler
                </h3>
              </div>

              <div className="mt-3 grid flex-1 content-start gap-2">
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

        <section className="grid items-stretch gap-6 lg:grid-cols-2">
          <SectionCard
            icon={<Store size={24} />}
            title="EPH Fırsat Merkezi"
            desc="Kapalı iş ağındaki güncel talepleri ve öne çıkan fırsatları takip et."
          >
            <div className="grid auto-rows-fr gap-3">
              {visibleOpportunityPosts.length > 0 ? (
                visibleOpportunityPosts
                  .slice(0, 5)
                  .map((post) => <OpportunityCard key={post.id} post={post} />)
              ) : (
                <EmptyState text="Şu anda sana uygun yeni Network fırsatı yok." />
              )}
            </div>
          </SectionCard>

          <SectionCard
            icon={<Bell size={24} />}
            title="Bildirimler"
            desc="Okunmamış bildirimleri ve önemli sistem hareketlerini buradan izle."
          >
            <div className="grid auto-rows-fr gap-3">
              {networkNotifications.items.length > 0 ? (
                networkNotifications.items
                  .slice(0, 5)
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
          <section className="grid items-stretch gap-6 lg:grid-cols-2">
            <SectionCard
              icon={<ShieldCheck size={24} />}
              title="Yönetim Özeti"
              desc="Kullanıcı, başvuru ve sistem hareketlerini hızlıca kontrol et."
            >
              <div className="grid auto-rows-fr gap-3 sm:grid-cols-2">
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
            </SectionCard>

            <SectionCard
              icon={<UserCheck size={24} />}
              title="Son Yönetim Hareketleri"
              desc="Bekleyen başvurular ve son üye kayıtları."
            >
              <div className="grid auto-rows-fr gap-3">
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
          <div className="flex min-h-[320px] flex-col items-center justify-center rounded-[24px] border border-[#DDE7F3] bg-[#F7FBFF] p-5 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#EFF6FF] text-[#1557D6]">
              <Bot size={30} />
            </div>

            <h3 className="mt-4 text-xl font-black text-[#06194A]">
              Lina ile iş akışını hızlandır.
            </h3>

            <p className="mx-auto mt-3 max-w-2xl text-sm font-bold leading-6 text-[#475569]">
              Portföy açıklaması, müşteri notu, paylaşım metni ve iş özeti hazırlamak için Lina'dan destek al.
            </p>

            <div className="mt-5 flex justify-center">
              <Link
                href="/lina"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#1557D6] px-7 text-sm font-black text-white shadow-[0_16px_34px_rgba(21,87,214,0.24)] transition hover:bg-[#0F49BD]"
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