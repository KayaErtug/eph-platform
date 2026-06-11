"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  ArrowRight,
  Bell,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Home,
  Loader2,
  LogOut,
  MessageCircle,
  Palette,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  UserPlus,
  UsersRound,
} from "lucide-react";

import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";

type Stats = {
  totalUsers?: number;
  pendingUsers?: number;
  approvedUsers?: number;
  totalInvitations?: number;
  pendingDocuments?: number;
  pendingNominations?: number;
  pendingApplications?: number;
  byRole?: { role: string; count: number }[];
};

type ApprovalUnit = {
  id: string;
  approvalStatus?: string | null;
  isPoolVisible?: boolean;
};

type ApplicationItem = {
  id: string;
  status?: string | null;
};

type VisitItem = {
  id?: string;
  userId?: string;
  page?: string;
  createdAt?: string;
  user?: {
    id?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    role?: string;
  };
};

type ModuleCard = {
  title: string;
  description: string;
  href: string;
  icon: ReactNode;
  badge: string;
  accent: "amber" | "blue" | "green" | "gray" | "purple" | "red";
  muted?: boolean;
};

const NAV_ITEMS = [
  {
    label: "Genel Bakış",
    href: "/admin",
    icon: <Home size={16} />,
    active: true,
  },
  {
    label: "Portföy Onayları",
    href: "/admin/portfolio-approvals",
    icon: <ClipboardCheck size={16} />,
    badgeKey: "portfolio",
  },
  {
    label: "Katılım Talepleri",
    href: "/admin/katilim-talepleri",
    icon: <UserPlus size={16} />,
    badgeKey: "applications",
  },
  {
    label: "Sistem Mesajları",
    href: "/admin/system-messages",
    icon: <MessageCircle size={16} />,
  },
];

const TOOL_ITEMS = [
  {
    label: "Trafik Merkezi",
    href: "/admin",
    icon: <Activity size={16} />,
  },
  {
    label: "Lina Merkezi",
    href: "/lina",
    icon: <Sparkles size={16} />,
  },
  {
    label: "Tema Yönetimi",
    href: "/admin",
    icon: <Palette size={16} />,
  },
];

const SYSTEM_ITEMS = [
  {
    label: "Sistem Ayarları",
    href: "/admin",
    icon: <Settings size={16} />,
  },
  {
    label: "Ana Sayfa",
    href: "/dashboard",
    icon: <Home size={16} />,
  },
];

const TURAN_QUOTES = [
  {
    text: "Muhtaç olduğun kudret, damarlarındaki asil kanda mevcuttur!",
    highlights: ["asil kanda"],
  },
  {
    text: "VATAN ne Türkiyedir Türklere, ne Türkistan, VATAN Büyük ve Müebbet bir ülkedir. TÜRKLERE TURAN",
    highlights: ["TÜRKLERE TURAN"],
  },
  {
    text: "Bugünden sonra divanda, dergahta, bargahta, mecliste ve meydanda Türkçeden başka dil kullanılmayacaktır.",
    highlights: ["Türkçeden başka dil"],
  },
  {
    text: "Har içinde biten gonca güle minnet eylemem, Arabi, Farisi bilmem; dile minnet eylemem.",
    highlights: ["dile minnet eylemem"],
  },
  {
    text: "Yufka yüreklilerle çetin yollar aşılmaz; Çünkü bu yol kutludur, gider Tanrı Dağı'na.",
    highlights: ["Tanrı Dağı'na"],
  },
];

function accentClasses(accent: ModuleCard["accent"]) {
  const map: Record<ModuleCard["accent"], string> = {
    amber: "bg-[#FAEEDA] text-[#854F0B]",
    blue: "bg-[#E6F1FB] text-[#185FA5]",
    green: "bg-[#EAF3DE] text-[#3B6D11]",
    gray: "bg-[#F1EFE8] text-[#5F5E5A]",
    purple: "bg-[#EEEDFE] text-[#534AB7]",
    red: "bg-[#FCEBEB] text-[#A32D2D]",
  };

  return map[accent];
}

function pillClasses(accent: ModuleCard["accent"]) {
  const map: Record<ModuleCard["accent"], string> = {
    amber: "bg-[#FAEEDA] text-[#854F0B]",
    blue: "bg-[#E6F1FB] text-[#185FA5]",
    green: "bg-[#EAF3DE] text-[#3B6D11]",
    gray: "bg-[#F1EFE8] text-[#5F5E5A]",
    purple: "bg-[#EEEDFE] text-[#534AB7]",
    red: "bg-[#FCEBEB] text-[#A32D2D]",
  };

  return map[accent];
}

function getInitials(firstName?: string | null, lastName?: string | null) {
  const first = String(firstName || "").trim().charAt(0);
  const last = String(lastName || "").trim().charAt(0);
  return `${first}${last}`.toLocaleUpperCase("tr-TR") || "EP";
}

function formatDate(value = new Date()) {
  return value.toLocaleString("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function visitTime(value?: string | null) {
  if (!value) return "—";

  return new Date(value).toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function highlightQuote(text: string, highlights: string[]) {
  let parts: ReactNode[] = [text];

  highlights.forEach((highlight) => {
    parts = parts.flatMap((part, index) => {
      if (typeof part !== "string") return [part];

      const split = part.split(highlight);

      if (split.length === 1) return [part];

      return split.flatMap((piece, pieceIndex) => {
        const nodes: ReactNode[] = [];

        if (piece) nodes.push(piece);

        if (pieceIndex < split.length - 1) {
          nodes.push(
            <span
              key={`${highlight}-${index}-${pieceIndex}`}
              className="font-medium text-[#C8922A]"
            >
              {highlight}
            </span>,
          );
        }

        return nodes;
      });
    });
  });

  return parts;
}

export default function AdminPage() {
  const router = useRouter();
  const { user, hasHydrated, logout } = useAuthStore();

  const [stats, setStats] = useState<Stats | null>(null);
  const [approvalItems, setApprovalItems] = useState<ApprovalUnit[]>([]);
  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const [visits, setVisits] = useState<VisitItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [quoteVisible, setQuoteVisible] = useState(true);

  const role = String(user?.role || "").toUpperCase();
  const canAccess = ["ADMIN", "SUPER_ADMIN", "MODERATOR"].includes(role);

  useEffect(() => {
    if (!hasHydrated) return;

    if (!user) {
      router.push("/giris");
      return;
    }

    if (!canAccess) {
      router.push("/dashboard");
      return;
    }

    fetchDashboard();
  }, [hasHydrated, user?.id, user?.role]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setQuoteVisible(false);

      window.setTimeout(() => {
        setQuoteIndex((current) => (current + 1) % TURAN_QUOTES.length);
        setQuoteVisible(true);
      }, 400);
    }, 60000);

    return () => window.clearInterval(timer);
  }, []);

  const fetchDashboard = async () => {
    setLoading(true);

    try {
      const [statsResult, approvalsResult, applicationsResult, visitsResult] =
        await Promise.allSettled([
          api.get("/admin/stats"),
          api.get("/units/admin/portfolio-approvals?status=ALL"),
          api.get("/admin/applications?status=all"),
          api.get("/visits"),
        ]);

      if (statsResult.status === "fulfilled") {
        setStats(statsResult.value.data || null);
      }

      if (approvalsResult.status === "fulfilled") {
        setApprovalItems(
          Array.isArray(approvalsResult.value.data)
            ? approvalsResult.value.data
            : [],
        );
      }

      if (applicationsResult.status === "fulfilled") {
        setApplications(
          Array.isArray(applicationsResult.value.data)
            ? applicationsResult.value.data
            : [],
        );
      }

      if (visitsResult.status === "fulfilled") {
        setVisits(Array.isArray(visitsResult.value.data) ? visitsResult.value.data : []);
      }
    } finally {
      setLoading(false);
    }
  };

  const portfolioCounts = useMemo(() => {
    return {
      total: approvalItems.length,
      waiting: approvalItems.filter((item) =>
        ["BELGE_BEKLENIYOR", "INCELEMEYE_GONDERILDI"].includes(
          String(item.approvalStatus || ""),
        ),
      ).length,
      reviewing: approvalItems.filter(
        (item) => item.approvalStatus === "INCELEMEDE",
      ).length,
      approved: approvalItems.filter(
        (item) => item.approvalStatus === "ONAYLANDI",
      ).length,
      pool: approvalItems.filter(
        (item) => item.approvalStatus === "HAVUZDA" || item.isPoolVisible,
      ).length,
    };
  }, [approvalItems]);

  const pendingApplications = useMemo(() => {
    return applications.filter(
      (item) => String(item.status || "").toUpperCase() === "PENDING",
    ).length;
  }, [applications]);

  const onlineUsers = useMemo(() => {
    const latestByUser = new Map<string, VisitItem>();

    visits.forEach((visit) => {
      const id = visit.user?.id || visit.userId;
      if (!id) return;

      const current = latestByUser.get(id);
      const currentTime = new Date(current?.createdAt || 0).getTime();
      const visitTimeValue = new Date(visit.createdAt || 0).getTime();

      if (!current || visitTimeValue > currentTime) latestByUser.set(id, visit);
    });

    return Array.from(latestByUser.values()).filter((visit) => {
      if (!visit.createdAt) return false;
      return Date.now() - new Date(visit.createdAt).getTime() < 1000 * 60 * 5;
    }).length;
  }, [visits]);

  const latestVisits = useMemo(() => {
    return [...visits]
      .sort(
        (a, b) =>
          new Date(b.createdAt || 0).getTime() -
          new Date(a.createdAt || 0).getTime(),
      )
      .slice(0, 3);
  }, [visits]);

  const moduleCards: ModuleCard[] = [
    {
      title: "Portföy Onayları",
      description: "Belgeli portföyleri incele ve onayla.",
      href: "/admin/portfolio-approvals",
      icon: <ClipboardCheck size={16} />,
      badge: `${portfolioCounts.waiting} bekleyen`,
      accent: "amber",
    },
    {
      title: "Katılım Talepleri",
      description: "Yeni üyelik başvurularını yönet.",
      href: "/admin/katilim-talepleri",
      icon: <UserPlus size={16} />,
      badge: pendingApplications ? `${pendingApplications} başvuru` : "Başvuru yok",
      accent: "blue",
    },
    {
      title: "Sistem Mesajları",
      description: "Üyelere duyuru ve uyarı gönder.",
      href: "/admin/system-messages",
      icon: <MessageCircle size={16} />,
      badge: "Aktif",
      accent: "green",
    },
    {
      title: "Kullanıcı Yönetimi",
      description: "Üye rolleri ve onay durumları.",
      href: "/admin",
      icon: <UsersRound size={16} />,
      badge: `${stats?.pendingUsers || 0} bekleyen`,
      accent: "gray",
      muted: true,
    },
    {
      title: "Lina Merkezi",
      description: "AI asistan durum ve talepleri.",
      href: "/lina",
      icon: <Sparkles size={16} />,
      badge: "Asistan",
      accent: "purple",
    },
    {
      title: "Tema Yönetimi",
      description: "Turan Theme ayarları.",
      href: "/admin",
      icon: <Palette size={16} />,
      badge: "Kilitli",
      accent: "gray",
      muted: true,
    },
  ];

  const currentQuote = TURAN_QUOTES[quoteIndex];

  if (!hasHydrated || loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F7F6F3] text-[#2C2C2A]">
        <div className="text-center">
          <Loader2 className="mx-auto animate-spin text-[#2C2C2A]" size={30} />
          <p className="mt-4 text-[12px] font-medium text-[#888780]">
            EPH Yönetim Merkezi açılıyor
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex h-screen overflow-hidden bg-[#F7F6F3] text-[#2C2C2A]">
      <aside className="hidden h-screen w-[200px] shrink-0 border-r border-black/10 bg-white px-3 py-4 md:block">
        <AdminLogo />

        <nav className="mt-6 space-y-1">
          {NAV_ITEMS.map((item) => (
            <NavItem
              key={item.label}
              href={item.href}
              icon={item.icon}
              label={item.label}
              active={item.active}
              badge={
                item.badgeKey === "portfolio"
                  ? portfolioCounts.waiting
                  : item.badgeKey === "applications"
                    ? pendingApplications
                    : undefined
              }
            />
          ))}

          <NavSection label="Araçlar" />

          {TOOL_ITEMS.map((item) => (
            <NavItem
              key={item.label}
              href={item.href}
              icon={item.icon}
              label={item.label}
            />
          ))}

          <NavSection label="Sistem" />

          {SYSTEM_ITEMS.map((item) => (
            <NavItem
              key={item.label}
              href={item.href}
              icon={item.icon}
              label={item.label}
            />
          ))}
        </nav>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-[52px] shrink-0 items-center justify-between border-b border-black/10 bg-white px-4">
          <div className="flex min-w-0 items-center gap-2">
            <button className="flex h-8 w-8 items-center justify-center rounded-lg border border-black/10 bg-white text-[#5F5E5A] md:hidden">
              <Home size={16} />
            </button>

            <div className="min-w-0 truncate text-[14px] font-medium">
              Genel Bakış
            </div>
            <span className="text-[#B4B2A9]">—</span>
            <div className="hidden text-[12px] text-[#B4B2A9] sm:block">
              {formatDate()}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-black/10 bg-white text-[#5F5E5A]">
              <Bell size={15} />
              {portfolioCounts.waiting > 0 && (
                <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#2C2C2A] px-1 text-[10px] font-medium text-white">
                  {portfolioCounts.waiting}
                </span>
              )}
            </button>

            <button className="flex h-8 w-8 items-center justify-center rounded-lg border border-black/10 bg-white text-[#5F5E5A]">
              <Search size={15} />
            </button>

            <button
              onClick={fetchDashboard}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-black/10 bg-white text-[#5F5E5A]"
            >
              <RefreshCw size={15} />
            </button>

            <div className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-[#D3D1C7] text-[11px] font-medium text-[#444441]">
              {getInitials(user?.firstName, user?.lastName)}
            </div>

            <button
              onClick={() => {
                logout();
                router.push("/giris");
              }}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-black/10 bg-white text-[#5F5E5A]"
            >
              <LogOut size={15} />
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-5">
          <section className="mb-4 rounded-[10px] border-l-[3px] border-l-[#C8922A] bg-[#1C1B18] px-5 py-[13px]">
            <div className="flex min-h-[22px] items-center gap-3">
              <div className="shrink-0 text-[22px] leading-none text-[#C8922A]">
                ❝
              </div>

              <div
                className={`min-w-0 flex-1 truncate text-[13px] font-normal leading-[1.4] text-[#E8E6E0] transition-opacity duration-300 ${
                  quoteVisible ? "opacity-100" : "opacity-0"
                }`}
              >
                {highlightQuote(currentQuote.text, currentQuote.highlights)}
              </div>

              <div className="relative h-[22px] w-8 shrink-0 overflow-hidden rounded-[3px] bg-[#C0392B] text-center text-[14px] leading-[22px] text-white">
                ☽
              </div>

              <div className="flex shrink-0 items-center gap-1">
                {TURAN_QUOTES.map((_, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => {
                      setQuoteVisible(false);
                      window.setTimeout(() => {
                        setQuoteIndex(index);
                        setQuoteVisible(true);
                      }, 200);
                    }}
                    className={`h-[6px] w-[6px] rounded-full ${
                      quoteIndex === index
                        ? "bg-[#C8922A]"
                        : "bg-[#C8922A]/30"
                    }`}
                    aria-label={`Söz ${index + 1}`}
                  />
                ))}
              </div>
            </div>
          </section>

          <section className="grid gap-[10px] sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Bekleyen Portföy"
              value={portfolioCounts.waiting}
              sub="İnceleme bekliyor"
              dot="bg-[#A32D2D]"
            />
            <StatCard
              label="Online Kullanıcı"
              value={onlineUsers}
              sub="Şu an aktif"
              dot="bg-[#3B6D11]"
            />
            <StatCard
              label="Başvuru"
              value={pendingApplications}
              sub={pendingApplications ? "İşlem bekliyor" : "Bekleyen yok"}
            />
            <StatCard
              label="Toplam Üye"
              value={stats?.totalUsers || 0}
              sub="Kayıtlı kullanıcı"
            />
          </section>

          <section className="mt-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-[13px] font-medium text-[#2C2C2A]">
                Modüller
              </h2>
              <Link
                href="/admin/portfolio-approvals"
                className="inline-flex items-center gap-1 text-[12px] text-[#888780]"
              >
                Tümünü gör <ArrowRight size={13} />
              </Link>
            </div>

            <div className="grid gap-[10px] md:grid-cols-2 xl:grid-cols-3">
              {moduleCards.map((card) => (
                <ModuleCard key={card.title} card={card} />
              ))}
            </div>
          </section>

          <section className="mt-4 grid gap-[10px] xl:grid-cols-2">
            <div className="rounded-[10px] border border-black/10 bg-white p-4">
              <div className="mb-2 flex items-center justify-between gap-3">
                <h2 className="text-[13px] font-medium text-[#2C2C2A]">
                  Son Hareketler
                </h2>
                <span className="text-[10px] text-[#B4B2A9]">
                  Canlı trafik
                </span>
              </div>

              <div>
                {latestVisits.length === 0 ? (
                  <div className="py-8 text-center text-[12px] text-[#888780]">
                    Henüz hareket görünmüyor.
                  </div>
                ) : (
                  latestVisits.map((visit, index) => (
                    <div
                      key={`${visit.id || visit.userId || index}`}
                      className={`flex items-center gap-3 py-3 ${
                        index !== latestVisits.length - 1
                          ? "border-b border-black/10"
                          : ""
                      }`}
                    >
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#F1EFE8] text-[10px] font-medium text-[#5F5E5A]">
                        {getInitials(visit.user?.firstName, visit.user?.lastName)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12px] font-medium text-[#2C2C2A]">
                          {[visit.user?.firstName, visit.user?.lastName]
                            .filter(Boolean)
                            .join(" ") || "Ziyaretçi"}
                        </p>
                        <p className="truncate text-[11px] text-[#888780]">
                          {visit.page || "/admin"}
                        </p>
                      </div>
                      <span className="shrink-0 text-[10px] text-[#B4B2A9]">
                        {visitTime(visit.createdAt)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-[10px] border border-black/10 bg-white p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-[13px] font-medium text-[#2C2C2A]">
                  Portföy Onay Özeti
                </h2>
                <span className="text-[10px] text-[#B4B2A9]">
                  Approval
                </span>
              </div>

              <div className="grid grid-cols-5">
                <ApprovalMini label="Toplam" value={portfolioCounts.total} />
                <ApprovalMini
                  label="Bekleyen"
                  value={portfolioCounts.waiting}
                  className="text-[#854F0B]"
                />
                <ApprovalMini label="İnceleme" value={portfolioCounts.reviewing} />
                <ApprovalMini
                  label="Onaylı"
                  value={portfolioCounts.approved}
                  className="text-[#3B6D11]"
                />
                <ApprovalMini label="Havuz" value={portfolioCounts.pool} />
              </div>

              <div className="mt-4 border-t border-black/10 pt-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[11px] text-[#888780]">
                    Sistem durumu
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#3B6D11]">
                    <span className="h-[6px] w-[6px] rounded-full bg-[#3B6D11]" />
                    Aktif
                  </span>
                </div>
                <p className="mt-2 text-[11px] text-[#B4B2A9]">
                  Backend, frontend ve PWA canlı ortamda çalışıyor.
                </p>
              </div>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

function AdminLogo() {
  return (
    <Link href="/admin" className="flex items-center gap-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2C2C2A] text-[11px] font-medium text-white">
        EPH
      </div>
      <div>
        <p className="text-[13px] font-medium text-[#2C2C2A]">
          EPH Admin
        </p>
        <p className="text-[11px] text-[#888780]">
          Yönetim Merkezi
        </p>
      </div>
    </Link>
  );
}

function NavSection({ label }: { label: string }) {
  return (
    <div className="px-2 pt-[14px] text-[10px] font-medium uppercase tracking-[0.12em] text-[#B4B2A9]">
      {label}
    </div>
  );
}

function NavItem({
  href,
  icon,
  label,
  active,
  badge,
}: {
  href: string;
  icon: ReactNode;
  label: string;
  active?: boolean;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      className={`flex h-9 items-center justify-between gap-2 rounded-lg px-[10px] text-[13px] transition ${
        active
          ? "bg-[#F1EFE8] font-medium text-[#2C2C2A]"
          : "text-[#5F5E5A] hover:bg-[#F7F6F3]"
      }`}
    >
      <span className="flex min-w-0 items-center gap-2">
        {icon}
        <span className="truncate">{label}</span>
      </span>

      {Boolean(badge) && (
        <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#2C2C2A] px-1 text-[10px] font-medium text-white">
          {badge}
        </span>
      )}
    </Link>
  );
}

function StatCard({
  label,
  value,
  sub,
  dot,
}: {
  label: string;
  value: number | string;
  sub: string;
  dot?: string;
}) {
  return (
    <div className="rounded-[10px] border border-black/10 bg-white px-4 py-[14px]">
      <p className="text-[11px] text-[#B4B2A9]">{label}</p>
      <p className="mt-2 text-[22px] font-medium leading-none text-[#2C2C2A]">
        {value}
      </p>
      <p
        className={`mt-2 flex items-center gap-1.5 text-[11px] ${
          dot ? "text-[#888780]" : "text-[#B4B2A9]"
        }`}
      >
        {dot && <span className={`h-[6px] w-[6px] rounded-full ${dot}`} />}
        {sub}
      </p>
    </div>
  );
}

function ModuleCard({ card }: { card: ModuleCard }) {
  return (
    <Link
      href={card.href}
      className={`rounded-[10px] border border-black/10 bg-white px-4 py-[14px] transition hover:border-[#888780] ${
        card.muted ? "opacity-55" : ""
      }`}
    >
      <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${accentClasses(card.accent)}`}>
        {card.icon}
      </div>

      <h3 className="mt-[10px] text-[13px] font-medium text-[#2C2C2A]">
        {card.title}
      </h3>

      <p className="mt-1 min-h-[34px] text-[11px] leading-[1.4] text-[#888780]">
        {card.description}
      </p>

      <span className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[10px] ${pillClasses(card.accent)}`}>
        {card.badge}
      </span>
    </Link>
  );
}

function ApprovalMini({
  label,
  value,
  className = "text-[#2C2C2A]",
}: {
  label: string;
  value: number;
  className?: string;
}) {
  return (
    <div className="border-r border-black/10 px-2 text-center last:border-r-0">
      <p className={`text-[18px] font-medium leading-none ${className}`}>
        {value}
      </p>
      <p className="mt-2 text-[10px] text-[#B4B2A9]">
        {label}
      </p>
    </div>
  );
}
