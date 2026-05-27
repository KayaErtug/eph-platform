"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import LinaPanel from "@/components/LinaPanel";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";

import {
  ArrowUpRight,
  Bell,
  Bot,
  Building2,
  CalendarCheck,
  ChevronRight,
  CircleUserRound,
  ClipboardList,
  Clock3,
  Eye,
  Home,
  Loader2,
  LogOut,
  MapPin,
  MessageCircle,
  Mic,
  PhoneCall,
  Plus,
  Sparkles,
  Target,
  TrendingUp,
  UsersRound,
  WalletCards,
} from "lucide-react";

type Project = {
  id: string;
  name: string;
  city: string;
  district: string;
  address: string;
};

type Unit = {
  id: string;
  type: string;
  floor?: number | null;
  number: string;
  roomCount?: string | null;
  area?: number | null;
  price: number;
  status: string;
  description?: string | null;
  createdAt: string;
  project?: Project | null;
};

type Customer = {
  id: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  city?: string | null;
  budget?: number | null;
  interestedArea?: string | null;
  interestedType?: string | null;
  status: string;
  createdAt: string;
};

type Activity = {
  id: string;
  type: string;
  note: string;
  createdAt: string;
  customer?: Customer | null;
};

type Task = {
  id: string;
  title: string;
  dueDate?: string | null;
  status: string;
  createdAt: string;
  customer?: Customer | null;
};

type Conversation = {
  id: string;
  unreadCount?: number;
};

type DashboardSummary = {
  stats: {
    totalUnits: number;
    totalCustomers: number;
    totalVisits: number;
    totalProjects: number;
  };
  latestUnits: Unit[];
  latestCustomers: Customer[];
  latestActivities: Activity[];
  pendingTasks: Task[];
};

const fallbackListingImages = [
  "/listings/gerzele-31.jpg",
  "/listings/camlik-11.jpg",
  "/listings/kosuyolu-arsa.jpg",
  "/listings/kuspinar-arsa.jpg",
];

function getGreeting() {
  const now = new Date();
  const hour = now.getHours();
  const month = now.getMonth() + 1;
  const day = now.getDate();

  const isBayram =
    (month === 3 && day >= 29 && day <= 31) ||
    (month === 4 && day <= 2) ||
    (month === 6 && day >= 5 && day <= 9);

  if (isBayram) {
    return {
      title: "İyi bayramlar",
      subtitle:
        "Sevdiklerinle birlikte huzurlu ve bereketli bir bayram geçirmeni dileriz.",
    };
  }

  if (hour >= 5 && hour < 12) {
    return {
      title: "Günaydın",
      subtitle: "Bugünkü portföy hareketlerin ve müşteri trafiğin hazır.",
    };
  }

  if (hour >= 12 && hour < 17) {
    return {
      title: "Tünaydın",
      subtitle:
        "Piyasadaki fırsatları ve aktif görüşmelerini takip etmeyi unutma.",
    };
  }

  if (hour >= 17 && hour < 22) {
    return {
      title: "İyi akşamlar",
      subtitle:
        "Günün performansını ve müşteri hareketlerini gözden geçirebilirsin.",
    };
  }

  return {
    title: "İyi geceler",
    subtitle: "Yarınki fırsatlar için sistemin hazır durumda.",
  };
}

function money(value?: number | null) {
  if (!value) return "—";
  return `${value.toLocaleString("tr-TR")} TL`;
}

function formatDate(value?: string | null) {
  if (!value) return "Tarih yok";

  return new Date(value).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "short",
  });
}

function formatDateTime(value?: string | null) {
  if (!value) return "Bekliyor";

  const date = new Date(value);

  return `${date.toLocaleDateString("tr-TR")} · ${date.toLocaleTimeString(
    "tr-TR",
    {
      hour: "2-digit",
      minute: "2-digit",
    },
  )}`;
}

function formatTimeAgo(value?: string | null) {
  if (!value) return "Yeni";

  const date = new Date(value);
  const diff = Date.now() - date.getTime();
  const minutes = Math.max(1, Math.floor(diff / 60000));

  if (minutes < 60) return `${minutes} dk önce`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} saat önce`;

  return formatDate(value);
}

function isTaskSoon(value?: string | null) {
  if (!value) return false;

  const dueDate = new Date(value);
  const now = new Date();

  const diffMs = dueDate.getTime() - now.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  return diffHours <= 1 && diffHours > 0;
}

function unitTitle(unit: Unit) {
  return unit.project?.name || `${unit.roomCount || unit.type} Portföy`;
}

function unitType(unit: Unit) {
  const parts = [
    unit.roomCount,
    unit.area ? `${unit.area} m²` : null,
    unit.status,
  ].filter(Boolean);

  return parts.join(" • ") || unit.type;
}

function unitLocation(unit: Unit) {
  return (
    [unit.project?.district, unit.project?.city].filter(Boolean).join(" / ") ||
    "Konum yok"
  );
}

function getProfileImageUrl(user: unknown) {
  const profileUser = user as
    | {
        profilePhotoUrl?: string | null;
        profileImageUrl?: string | null;
        avatarUrl?: string | null;
        photoUrl?: string | null;
        imageUrl?: string | null;
      }
    | null
    | undefined;

  return (
    profileUser?.profilePhotoUrl ||
    profileUser?.profileImageUrl ||
    profileUser?.avatarUrl ||
    profileUser?.photoUrl ||
    profileUser?.imageUrl ||
    ""
  );
}

function getProfileInitials(
  firstName?: string | null,
  lastName?: string | null,
  email?: string | null,
) {
  const first = firstName?.trim()?.[0] || "";
  const last = lastName?.trim()?.[0] || "";

  if (first || last) {
    return `${first}${last}`.toLocaleUpperCase("tr-TR");
  }

  return (email?.trim()?.[0] || "E").toLocaleUpperCase("tr-TR");
}

function UserAvatar({
  imageUrl,
  initials,
  size = "md",
}: {
  imageUrl?: string;
  initials: string;
  size?: "sm" | "md";
}) {
  const sizeClass =
    size === "sm" ? "h-12 w-12 rounded-2xl" : "h-14 w-14 rounded-2xl";
  const textClass = size === "sm" ? "text-[15px]" : "text-[17px]";

  return (
    <div
      className={`relative ${sizeClass} shrink-0 overflow-hidden border-2 border-white bg-gradient-to-br from-[#0B1F44] via-[#1D4ED8] to-[#60A5FA] shadow-lg shadow-[#1D4ED8]/20 ring-2 ring-[#1D4ED8]/20`}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt="Profil"
          className="h-full w-full object-cover"
        />
      ) : (
        <div
          className={`flex h-full w-full items-center justify-center font-black text-white ${textClass}`}
        >
          {initials}
        </div>
      )}

      <span className="absolute bottom-0.5 right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
    </div>
  );
}

function AdminMissionControl({
  firstName,
  unreadMessages,
  handleLogout,
}: {
  firstName: string;
  unreadMessages: number;
  handleLogout: () => void;
}) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const commandLinks = [
    {
      title: "Admin Merkezi",
      desc: "Kullanıcı, başvuru, belge ve operasyon denetimi",
      href: "/admin",
      icon: <Sparkles size={24} />,
      tone: "from-cyan-300 to-blue-500",
    },
    {
      title: "Network Radar",
      desc: "Platform içi paylaşım ve görüşme trafiği",
      href: "/network",
      icon: <MessageCircle size={24} />,
      tone: "from-violet-300 to-indigo-500",
    },
    {
      title: "Stok Kontrol",
      desc: "Portföy, proje ve doğrulama ekranı",
      href: "/stok",
      icon: <Building2 size={24} />,
      tone: "from-amber-200 to-yellow-500",
    },
    {
      title: "CRM İzleme",
      desc: "Kullanıcı mahremiyeti korunmuş operasyon alanı",
      href: "/crm",
      icon: <UsersRound size={24} />,
      tone: "from-emerald-300 to-teal-500",
    },
    {
      title: "Piyasa Paneli",
      desc: "Canlı piyasa, portföy ve saha sinyalleri",
      href: "/market",
      icon: <WalletCards size={24} />,
      tone: "from-sky-300 to-cyan-500",
    },
    {
      title: "Profil & Güvenlik",
      desc: "Admin oturumu, kimlik ve hesap merkezi",
      href: "/profil",
      icon: <CircleUserRound size={24} />,
      tone: "from-rose-300 to-red-500",
    },
  ];

  const signals = [
    { label: "Sistem modu", value: "ADMIN CORE", state: "online" },
    { label: "Veri mahremiyeti", value: "AKTİF", state: "secure" },
    {
      label: "Okunmamış mesaj",
      value: String(unreadMessages),
      state: unreadMessages > 0 ? "warn" : "online",
    },
    {
      label: "Saat",
      value: now.toLocaleTimeString("tr-TR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      state: "online",
    },
  ];

  return (
    <main className="min-h-screen overflow-hidden bg-[#020617] text-white">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-[-140px] top-[-160px] h-[420px] w-[420px] rounded-full bg-cyan-500/20 blur-[120px]" />
        <div className="absolute right-[-120px] top-[120px] h-[380px] w-[380px] rounded-full bg-[#C9A84C]/20 blur-[120px]" />
        <div className="absolute bottom-[-160px] left-[25%] h-[420px] w-[420px] rounded-full bg-blue-700/25 blur-[130px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.035)_1px,transparent_1px)] bg-[size:42px_42px]" />
      </div>

      <section className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col px-5 py-5 pb-10">
        <header className="flex flex-col gap-4 rounded-[34px] border border-cyan-300/15 bg-white/[0.055] p-4 shadow-2xl shadow-cyan-950/30 backdrop-blur-2xl md:flex-row md:items-center md:justify-between">
          <Link href="/admin" className="flex items-center gap-4 no-underline">
            <div className="relative flex h-14 w-14 items-center justify-center rounded-[22px] border border-cyan-300/25 bg-cyan-300/10 shadow-lg shadow-cyan-400/15">
              <div className="absolute inset-0 rounded-[22px] bg-cyan-300/20 blur-xl" />
              <img
                src="/LOGO_EPH.png"
                alt="EPH"
                className="relative h-10 w-10 object-contain"
              />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.32em] text-[#C9A84C]">
                EPH Mission Control
              </p>
              <h1 className="mt-1 text-xl font-black tracking-tight text-white md:text-2xl">
                Admin Komuta Ekranı
              </h1>
            </div>
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/admin"
              className="rounded-2xl border border-cyan-300/25 bg-cyan-300/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-cyan-100 no-underline"
            >
              Admin Panel
            </Link>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-rose-100 transition hover:bg-rose-500/20"
            >
              <LogOut size={15} />
              Çıkış
            </button>
          </div>
        </header>

        <div className="mt-6 grid flex-1 gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="relative overflow-hidden rounded-[42px] border border-cyan-300/15 bg-[#061126]/90 p-6 shadow-2xl shadow-cyan-950/40 backdrop-blur-2xl md:p-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(34,211,238,0.28),transparent_28%),radial-gradient(circle_at_88%_18%,rgba(201,168,76,0.22),transparent_28%),radial-gradient(circle_at_50%_100%,rgba(29,78,216,0.28),transparent_45%)]" />
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/80 to-transparent" />

            <div className="relative z-10">
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/25 bg-emerald-400/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-emerald-100">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-300" />
                  Admin Oturumu Aktif
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-[#C9A84C]/30 bg-[#C9A84C]/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-[#F7DFA3]">
                  Veri Mahremiyeti Kilitli
                </span>
              </div>

              <h2 className="mt-8 max-w-4xl text-[44px] font-black leading-[0.95] tracking-[-0.06em] text-white md:text-[74px]">
                Hoş geldin,
                <span className="block bg-gradient-to-r from-[#F7DFA3] via-cyan-100 to-white bg-clip-text text-transparent">
                  {firstName}
                </span>
              </h2>

              <p className="mt-6 max-w-2xl text-sm font-semibold leading-7 text-slate-300 md:text-base">
                Bu ekran normal kullanıcı paneli değildir. EPH’nin başvuru, üye,
                stok, network ve güvenlik katmanlarını yöneten üst seviye komuta
                kokpitidir.
              </p>

              <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {signals.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-[26px] border border-white/10 bg-white/[0.07] p-4 backdrop-blur"
                  >
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                      {item.label}
                    </p>
                    <p
                      className={`mt-3 text-2xl font-black ${
                        item.state === "warn"
                          ? "text-[#F7DFA3]"
                          : item.state === "secure"
                            ? "text-emerald-200"
                            : "text-cyan-100"
                      }`}
                    >
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/admin"
                  className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#F7DFA3] to-[#C9A84C] px-6 text-sm font-black uppercase tracking-[0.14em] text-[#061126] no-underline shadow-xl shadow-[#C9A84C]/20 transition hover:scale-[1.02]"
                >
                  <Sparkles size={18} />
                  Komuta Merkezine Gir
                </Link>
                <Link
                  href="/network"
                  className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl border border-cyan-300/25 bg-cyan-300/10 px-6 text-sm font-black uppercase tracking-[0.14em] text-cyan-100 no-underline transition hover:bg-cyan-300/20"
                >
                  <MessageCircle size={18} />
                  Network Radar
                </Link>
              </div>
            </div>
          </section>

          <aside className="grid gap-5">
            <div className="relative overflow-hidden rounded-[42px] border border-cyan-300/15 bg-white/[0.055] p-6 shadow-2xl shadow-cyan-950/30 backdrop-blur-2xl">
              <div className="absolute right-6 top-6 h-32 w-32 rounded-full border border-cyan-300/10" />
              <div className="absolute right-12 top-12 h-20 w-20 rounded-full border border-[#C9A84C]/10" />
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-cyan-200/80">
                AI Core
              </p>
              <h3 className="mt-3 text-2xl font-black text-white">
                Operasyon Zekâsı
              </h3>
              <p className="mt-3 text-sm font-semibold leading-7 text-slate-300">
                Kullanıcı görevleri ve CRM içerikleri kullanıcıya özel kalır.
                Admin ekranı kişisel görev paneli değil, sistem komuta
                katmanıdır.
              </p>
              <div className="mt-5 grid gap-3">
                <MissionLine label="Kullanıcı mahremiyeti" value="Korunuyor" />
                <MissionLine label="Admin modu" value="Oyun kurucu" />
                <MissionLine label="Platform çekirdeği" value="Online" />
              </div>
            </div>

            <div className="rounded-[42px] border border-[#C9A84C]/20 bg-[#C9A84C]/10 p-6 shadow-2xl shadow-[#C9A84C]/10 backdrop-blur-2xl">
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#F7DFA3]">
                Hızlı Komutlar
              </p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                {commandLinks.slice(0, 4).map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="group rounded-[26px] border border-white/10 bg-black/20 p-4 no-underline transition hover:-translate-y-1 hover:bg-black/30"
                  >
                    <div
                      className={`mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${item.tone} text-[#061126] shadow-lg`}
                    >
                      {item.icon}
                    </div>
                    <h4 className="text-sm font-black text-white">
                      {item.title}
                    </h4>
                    <p className="mt-2 text-[11px] font-semibold leading-5 text-slate-300">
                      {item.desc}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          </aside>
        </div>

        <section className="mt-5 grid gap-3 md:grid-cols-3">
          {commandLinks.slice(4).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-[30px] border border-white/10 bg-white/[0.055] p-5 no-underline shadow-xl shadow-cyan-950/10 backdrop-blur-2xl transition hover:-translate-y-1 hover:border-cyan-300/30"
            >
              <div
                className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${item.tone} text-[#061126]`}
              >
                {item.icon}
              </div>
              <h4 className="text-lg font-black text-white">{item.title}</h4>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-300">
                {item.desc}
              </p>
            </Link>
          ))}
          <Link
            href="/messages"
            className="rounded-[30px] border border-white/10 bg-white/[0.055] p-5 no-underline shadow-xl shadow-cyan-950/10 backdrop-blur-2xl transition hover:-translate-y-1 hover:border-cyan-300/30"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-300 to-blue-500 text-[#061126]">
              <Bell size={24} />
            </div>
            <h4 className="text-lg font-black text-white">Mesaj Merkezi</h4>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-300">
              Okunmamış mesaj: {unreadMessages}. Platform görüşmelerini takip
              et.
            </p>
          </Link>
        </section>
      </section>
    </main>
  );
}

function MissionLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3">
      <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
        {label}
      </span>
      <span className="text-sm font-black text-cyan-100">{value}</span>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const [hydrated, setHydrated] = useState(false);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [linaOpen, setLinaOpen] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);

  const greeting = getGreeting();

  const firstName =
    user?.firstName?.trim() || user?.email?.split("@")[0] || "EPH Üyesi";

  const lastName =
    (user as { lastName?: string | null } | null | undefined)?.lastName || "";
  const profileImageUrl = getProfileImageUrl(user);
  const profileInitials = getProfileInitials(firstName, lastName, user?.email);
  const userRole = user?.role || "EPH Üyesi";

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
  }, [hydrated, user]);

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
    } catch (error) {
      console.error(error);
      setSummary(null);
      setUnreadMessages(0);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push("/giris");
  };

  const stats = summary?.stats || {
    totalUnits: 0,
    totalCustomers: 0,
    totalVisits: 0,
    totalProjects: 0,
  };

  const latestUnits = summary?.latestUnits || [];
  const latestCustomers = summary?.latestCustomers || [];
  const pendingTasks = summary?.pendingTasks || [];
  const latestActivities = summary?.latestActivities || [];

  const soonTaskCount = pendingTasks.filter((task) =>
    isTaskSoon(task.dueDate),
  ).length;

  const aiSuggestions = useMemo(() => {
    const items: string[] = [];

    if (soonTaskCount > 0) {
      items.push(`${soonTaskCount} göreve 1 saatten az kaldı. Öncelik ver.`);
    }

    if (latestUnits[0]) {
      items.push(`${unitTitle(latestUnits[0])} portföyünü bugün kontrol et.`);
    }

    if (latestCustomers[0]) {
      items.push(
        `${latestCustomers[0].firstName} ${latestCustomers[0].lastName} için CRM takibini güncelle.`,
      );
    }

    if (unreadMessages > 0) {
      items.push(`${unreadMessages} okunmamış mesaj için hızlı dönüş yap.`);
    }

    if (items.length === 0) {
      items.push(
        "Bugün ilk müşteri ve portföy kayıtlarını ekleyerek paneli başlat.",
      );
    }

    return items.slice(0, 3);
  }, [latestUnits, latestCustomers, unreadMessages, soonTaskCount]);

  if (!hydrated || loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#07111F]">
        <div className="flex flex-col items-center gap-4 text-white">
          <Loader2 className="animate-spin" size={34} />
          <p className="text-sm font-black">Dashboard verileri yükleniyor...</p>
        </div>
      </main>
    );
  }

  if (userRole === "ADMIN") {
    return (
      <AdminMissionControl
        firstName={firstName}
        unreadMessages={unreadMessages}
        handleLogout={handleLogout}
      />
    );
  }

  return (
    <main className="min-h-screen bg-[#07111F] text-[#111827]">
      <LinaPanel open={linaOpen} onClose={() => setLinaOpen(false)} />

      <section className="relative mx-auto min-h-screen max-w-md overflow-hidden bg-[#F8FAFC] px-5 pb-28 pt-6 shadow-2xl shadow-black/20">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#2563EB]/20 blur-3xl" />
        <div className="pointer-events-none absolute -left-24 top-72 h-72 w-72 rounded-full bg-[#60A5FA]/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 bottom-80 h-72 w-72 rounded-full bg-[#C9A84C]/15 blur-3xl" />

        <header className="relative z-10">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-[#0B1F44] px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-white">
                <Sparkles size={12} />
                Canlı Panel
              </div>

              <h1 className="mt-3 text-[30px] font-black tracking-tight text-[#0B1F44]">
                EPH
              </h1>

              <p className="mt-1 text-[13px] font-medium text-slate-500">
                Emlak Portföy Havuzu
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => router.push("/messages")}
                className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm"
              >
                {unreadMessages > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-black text-white ring-2 ring-white">
                    {unreadMessages > 99 ? "99+" : unreadMessages}
                  </span>
                )}

                <Bell size={19} />
              </button>

              <button
                onClick={() => router.push("/profil")}
                className="relative"
              >
                <UserAvatar
                  imageUrl={profileImageUrl}
                  initials={profileInitials}
                  size="sm"
                />
              </button>
            </div>
          </div>

          <div className="mt-5 flex items-center gap-3 rounded-[24px] border border-slate-200 bg-white p-3 shadow-sm">
            <UserAvatar
              imageUrl={profileImageUrl}
              initials={profileInitials}
              size="md"
            />

            <div className="min-w-0 flex-1">
              <p className="truncate text-[17px] font-black text-[#0B1F44]">
                {firstName}
              </p>

              <p className="mt-0.5 truncate text-[12px] font-bold text-slate-500">
                {userRole} •{" "}
                {unreadMessages > 0
                  ? `${unreadMessages} yeni mesaj`
                  : "Çevrimiçi"}
              </p>
            </div>

            <button
              onClick={() => router.push("/profil")}
              className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#EEF4FF] text-[#1D4ED8]"
            >
              <ArrowUpRight size={18} />
            </button>
          </div>

          <div className="mt-6 overflow-hidden rounded-[32px] bg-gradient-to-br from-[#0B1F44] via-[#123B7A] to-[#1D4ED8] p-5 text-white shadow-2xl shadow-[#1D4ED8]/25">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#93C5FD]">
                  Günlük Özet
                </p>

                <h2 className="mt-3 text-[28px] font-black leading-tight tracking-tight">
                  {greeting.title} {firstName}
                </h2>

                <p className="mt-3 max-w-[300px] text-[14px] leading-6 text-white/70">
                  {greeting.subtitle}
                </p>
              </div>

              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-white backdrop-blur">
                <TrendingUp size={26} />
              </div>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2">
              <MiniHeroItem label="İlan" value={String(stats.totalUnits)} />
              <MiniHeroItem
                label="Müşteri"
                value={String(stats.totalCustomers)}
              />
              <MiniHeroItem label="Mesaj" value={String(unreadMessages)} />
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-red-100 bg-red-50 text-[13px] font-black text-red-600 transition hover:bg-red-100"
          >
            <LogOut size={16} />
            Güvenli Çıkış Yap
          </button>
        </header>

        <section className="relative z-10 mt-7 grid grid-cols-3 gap-3">
          <StatCard
            icon={<Building2 size={18} />}
            title="İlan"
            value={String(stats.totalUnits)}
            change="Gerçek"
          />

          <StatCard
            icon={<UsersRound size={18} />}
            title="Müşteri"
            value={String(stats.totalCustomers)}
            change="CRM"
          />

          <StatCard
            icon={<MessageCircle size={18} />}
            title="Mesaj"
            value={String(unreadMessages)}
            change={unreadMessages > 0 ? "Yeni" : "Temiz"}
          />
        </section>

        <section className="relative z-10 mt-8">
          <SectionTitle title="Bugünkü İşlerim" action="Plan" href="/crm" />

          <div className="space-y-3">
            {pendingTasks.length > 0 ? (
              pendingTasks
                .slice(0, 3)
                .map((task) => (
                  <TaskCard
                    key={task.id}
                    icon={<ClipboardList size={18} />}
                    title={task.title}
                    desc={
                      task.customer
                        ? `${task.customer.firstName} ${task.customer.lastName} müşteri kaydı`
                        : "CRM görev kaydı"
                    }
                    dueDate={task.dueDate}
                  />
                ))
            ) : (
              <EmptyCard
                icon={<CalendarCheck size={18} />}
                title="Bekleyen görev yok"
                desc="CRM içinde görev eklediğinde burada görünür."
              />
            )}
          </div>
        </section>

        <section className="relative z-10 mt-8">
          <SectionTitle title="Hızlı İşlemler" action="Profil" href="/profil" />

          <div className="grid grid-cols-4 gap-3">
            <QuickAction href="/stok" icon={<Plus size={20} />} label="İlan" />
            <QuickAction
              href="/crm"
              icon={<UsersRound size={20} />}
              label="CRM"
            />
            <QuickAction
              href="/network"
              icon={<MessageCircle size={20} />}
              label="Network"
            />
            <QuickAction
              href="/market"
              icon={<WalletCards size={20} />}
              label="Piyasa"
            />
          </div>
        </section>

        <section className="relative z-10 mt-8">
          <SectionTitle title="Canlı Aktivite" action="Tümü" href="/crm" />

          <div className="space-y-3">
            {latestActivities.length > 0 ? (
              latestActivities
                .slice(0, 3)
                .map((activity) => (
                  <ActivityCard
                    key={activity.id}
                    icon={<Eye size={18} />}
                    title={
                      activity.customer
                        ? `${activity.customer.firstName} ${activity.customer.lastName}`
                        : activity.type
                    }
                    desc={activity.note}
                    time={formatTimeAgo(activity.createdAt)}
                  />
                ))
            ) : latestCustomers.length > 0 ? (
              latestCustomers
                .slice(0, 3)
                .map((customer) => (
                  <ActivityCard
                    key={customer.id}
                    icon={<PhoneCall size={18} />}
                    title={`${customer.firstName} ${customer.lastName}`}
                    desc={`${customer.status} durumunda yeni CRM kaydı`}
                    time={formatTimeAgo(customer.createdAt)}
                  />
                ))
            ) : (
              <EmptyCard
                icon={<MessageCircle size={18} />}
                title="Henüz aktivite yok"
                desc="CRM ve network hareketleri burada listelenecek."
              />
            )}
          </div>
        </section>

        <section className="relative z-10 mt-8">
          <SectionTitle title="Son İlanlar" action="Tümü" href="/stok" />

          <div className="space-y-3">
            {latestUnits.length > 0 ? (
              latestUnits
                .slice(0, 4)
                .map((unit, index) => (
                  <ListingCard
                    key={unit.id}
                    title={unitTitle(unit)}
                    type={unitType(unit)}
                    location={unitLocation(unit)}
                    price={money(unit.price)}
                    status={unit.status}
                    image={
                      fallbackListingImages[
                        index % fallbackListingImages.length
                      ]
                    }
                  />
                ))
            ) : (
              <EmptyCard
                icon={<Building2 size={18} />}
                title="Henüz ilan yok"
                desc="Stok sayfasından ilk portföyünü ekleyebilirsin."
              />
            )}
          </div>
        </section>

        <section className="relative z-10 mt-8 overflow-hidden rounded-[30px] border border-[#1D4ED8]/10 bg-gradient-to-br from-[#0B1F44] to-[#1D4ED8] p-5 text-white shadow-xl shadow-[#1D4ED8]/20">
          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />

          <div className="relative flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-white backdrop-blur">
              <Bot size={28} />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-black uppercase tracking-[0.22em] text-[#BFDBFE]">
                Lina AI Önerileri
              </p>

              <h3 className="mt-1 text-[21px] font-black tracking-tight">
                Gerçek veriye göre öneriler
              </h3>

              <p className="mt-1 text-[14px] leading-5 text-white/70">
                Platform hareketlerine göre öne çıkan aksiyonlar.
              </p>
            </div>
          </div>

          <div className="relative mt-5 space-y-2">
            {aiSuggestions.map((item) => (
              <div
                key={item}
                className="flex items-start gap-2 rounded-2xl bg-white/10 px-3 py-3 text-[13px] font-semibold leading-5 text-white/80 backdrop-blur"
              >
                <Target size={16} className="mt-0.5 shrink-0 text-[#BFDBFE]" />
                {item}
              </div>
            ))}
          </div>

          <button
            onClick={() => setLinaOpen(true)}
            className="relative mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-white text-[14px] font-black text-[#1D4ED8]"
          >
            <Mic size={18} />
            Lina’yı Başlat
          </button>
        </section>

        <section className="relative z-10 mt-8 rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
          <SectionTitle title="Piyasa Özeti" action="Detay" href="/market" />

          <div className="mt-5 grid grid-cols-3 gap-3">
            <MarketMini
              title="İlan"
              value={String(stats.totalUnits)}
              change="Canlı"
            />
            <MarketMini
              title="Müşteri"
              value={String(stats.totalCustomers)}
              change="CRM"
            />
            <MarketMini
              title="Ziyaret"
              value={String(stats.totalVisits)}
              change="Takip"
            />
          </div>
        </section>
      </section>

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white/95 px-5 pb-6 pt-3 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center justify-between">
          <BottomItem
            active
            href="/dashboard"
            icon={<Home size={21} />}
            label="Ana Sayfa"
          />
          <BottomItem
            href="/stok"
            icon={<Building2 size={21} />}
            label="İlanlar"
          />
          <BottomItem
            href="/network"
            icon={<MessageCircle size={21} />}
            label="Network"
          />
          <BottomItem href="/crm" icon={<UsersRound size={21} />} label="CRM" />
          <BottomItem
            href="/profil"
            icon={<CircleUserRound size={21} />}
            label="Profil"
          />
        </div>
      </nav>
    </main>
  );
}

function SectionTitle({
  title,
  action,
  href,
}: {
  title: string;
  action?: string;
  href?: string;
}) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h3 className="text-[18px] font-black tracking-tight">{title}</h3>

      {action && href ? (
        <Link
          href={href}
          className="flex items-center gap-1 text-[13px] font-bold text-[#1D4ED8]"
        >
          {action}
          <ChevronRight size={15} />
        </Link>
      ) : null}
    </div>
  );
}

function MiniHeroItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/10 px-3 py-3 text-center backdrop-blur">
      <p className="text-[18px] font-black leading-none">{value}</p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-white/55">
        {label}
      </p>
    </div>
  );
}

function StatCard({
  icon,
  title,
  value,
  change,
}: {
  icon: ReactNode;
  title: string;
  value: string;
  change: string;
}) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white px-4 py-4 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
      <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#EEF4FF] text-[#1D4ED8]">
        {icon}
      </div>

      <p className="mt-3 text-[11px] font-bold uppercase tracking-wide text-slate-400">
        {title}
      </p>
      <p className="mt-2 text-[28px] font-black leading-none">{value}</p>
      <p className="mt-3 text-[12px] font-bold text-emerald-600">{change}</p>
    </div>
  );
}

function TaskCard({
  icon,
  title,
  desc,
  dueDate,
}: {
  icon: ReactNode;
  title: string;
  desc: string;
  dueDate?: string | null;
}) {
  const soon = isTaskSoon(dueDate);

  return (
    <article
      className={`flex items-center gap-3 rounded-[24px] border p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-lg ${
        soon ? "border-red-200 bg-red-50" : "border-slate-200 bg-white"
      }`}
    >
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
          soon ? "bg-red-100 text-red-600" : "bg-[#EEF4FF] text-[#1D4ED8]"
        }`}
      >
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <h4 className="truncate text-[15px] font-black tracking-tight">
          {title}
        </h4>

        <p className="mt-1 text-[12px] leading-5 text-slate-500">{desc}</p>

        {soon && (
          <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-1 text-[10px] font-black text-red-600">
            ⏰ Göreve 1 saatten az kaldı
          </div>
        )}
      </div>

      <span
        className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-black ${
          soon ? "bg-red-100 text-red-600" : "bg-[#F8FAFC] text-slate-500"
        }`}
      >
        {formatDateTime(dueDate)}
      </span>
    </article>
  );
}

function ActivityCard({
  icon,
  title,
  desc,
  time,
}: {
  icon: ReactNode;
  title: string;
  desc: string;
  time: string;
}) {
  return (
    <article className="relative overflow-hidden rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="absolute left-0 top-0 h-full w-1 bg-[#1D4ED8]" />

      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#EEF4FF] text-[#1D4ED8]">
          {icon}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h4 className="truncate text-[15px] font-black tracking-tight">
              {title}
            </h4>

            <div className="flex shrink-0 items-center gap-1 text-[11px] font-bold text-slate-400">
              <Clock3 size={12} />
              {time}
            </div>
          </div>

          <p className="mt-1 text-[12px] leading-5 text-slate-500">{desc}</p>
        </div>
      </div>
    </article>
  );
}

function EmptyCard({
  icon,
  title,
  desc,
}: {
  icon: ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <article className="flex items-center gap-3 rounded-[24px] border border-dashed border-slate-300 bg-white/70 p-4">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#EEF4FF] text-[#1D4ED8]">
        {icon}
      </div>

      <div>
        <h4 className="text-[15px] font-black tracking-tight text-[#0B1F44]">
          {title}
        </h4>
        <p className="mt-1 text-[12px] leading-5 text-slate-500">{desc}</p>
      </div>
    </article>
  );
}

function QuickAction({
  icon,
  label,
  href,
}: {
  icon: ReactNode;
  label: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-[24px] border border-slate-200 bg-white px-2 py-4 shadow-sm transition hover:-translate-y-1 hover:border-[#1D4ED8]/30 hover:shadow-lg"
    >
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-[#EEF4FF] text-[#1D4ED8]">
        {icon}
      </div>

      <span className="mt-3 block text-center text-[12px] font-bold text-slate-700">
        {label}
      </span>
    </Link>
  );
}

function ListingCard({
  title,
  type,
  location,
  price,
  status,
  image,
}: {
  title: string;
  type: string;
  location: string;
  price: string;
  status: string;
  image: string;
}) {
  return (
    <article className="flex items-center gap-3 rounded-[26px] border border-slate-200 bg-white p-3 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
      <div className="h-[88px] w-[98px] shrink-0 overflow-hidden rounded-[20px] bg-[#E8EEF6]">
        <img src={image} alt={title} className="h-full w-full object-cover" />
      </div>

      <div className="min-w-0 flex-1">
        <h4 className="truncate text-[16px] font-black tracking-tight">
          {title}
        </h4>
        <p className="mt-1 text-[13px] font-semibold text-slate-500">{type}</p>

        <p className="mt-1 flex items-center gap-1 truncate text-[12px] text-slate-400">
          <MapPin size={12} />
          {location}
        </p>

        <p className="mt-2 text-[17px] font-black text-[#0B1F44]">{price}</p>
      </div>

      <div className="flex flex-col items-end justify-between self-stretch py-1">
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-700">
          {status}
        </span>

        <ChevronRight size={19} className="text-slate-400" />
      </div>
    </article>
  );
}

function MarketMini({
  title,
  value,
  change,
}: {
  title: string;
  value: string;
  change: string;
}) {
  return (
    <div className="rounded-2xl bg-[#F8FAFC] p-3">
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
        {title}
      </p>
      <p className="mt-2 text-[19px] font-black">{value}</p>
      <p className="mt-2 text-[12px] font-bold text-emerald-600">{change}</p>
    </div>
  );
}

function BottomItem({
  icon,
  label,
  active,
  href,
}: {
  icon: ReactNode;
  label: string;
  active?: boolean;
  href: string;
}) {
  return (
    <Link
      href={href}
      className={`flex w-16 flex-col items-center gap-1 ${
        active ? "text-[#1D4ED8]" : "text-slate-500"
      }`}
    >
      {icon}
      <span className="text-[11px] font-bold">{label}</span>
    </Link>
  );
}
