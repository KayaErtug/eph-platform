"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  ArrowLeft,
  Clock3,
  Eye,
  FileText,
  Globe2,
  Loader2,
  RefreshCw,
  Search,
  TrendingUp,
  UserRound,
  UsersRound,
} from "lucide-react";

import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import AdminFlagBanner from "@/components/admin/AdminFlagBanner";

type VisitUser = {
  id?: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  role?: string | null;
  city?: string | null;
  district?: string | null;
  memberCode?: string | null;
};

type VisitItem = {
  id?: string;
  page?: string;
  ip?: string | null;
  userAgent?: string | null;
  createdAt?: string;
  user?: VisitUser | null;
};

type TopPage = {
  page: string;
  count: number;
};

type TopUser = {
  user?: VisitUser | null;
  count: number;
  lastSeenAt?: string | null;
};

type TrafficSummary = {
  counts: {
    totalVisits: number;
    todayVisits: number;
    weekVisits: number;
    monthVisits: number;
    totalUsers: number;
    onlineCount: number;
    awayCount: number;
    offlineCount: number;
  };
  lastVisits: VisitItem[];
  topPages: TopPage[];
  topUsers: TopUser[];
};

function userName(user?: VisitUser | null) {
  if (!user) return "Misafir";
  return `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email || "Kullanıcı";
}

function dateText(value?: string | null) {
  if (!value) return "-";

  return new Date(value).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function roleLabel(role?: string | null) {
  const map: Record<string, string> = {
    EMLAKCI: "Emlakçı",
    MUTEAHHIT: "Müteahhit",
    INSAAT_FIRMASI: "İnşaat Firması",
    MODERATOR: "Moderatör",
    ADMIN: "Admin",
    SUPER_ADMIN: "Yazılım Ekibi",
  };

  return map[String(role || "")] || role || "-";
}

function normalize(value?: string | null) {
  return String(value || "").trim().toLocaleLowerCase("tr-TR");
}

export default function AdminReportsPage() {
  const router = useRouter();
  const { user, hasHydrated } = useAuthStore();

  const currentRole = String(user?.role || "").toUpperCase();
  const canAccess = currentRole === "ADMIN" || currentRole === "SUPER_ADMIN";

  const [data, setData] = useState<TrafficSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!hasHydrated) return;

    if (!user) {
      router.push("/giris");
      return;
    }

    if (!canAccess) {
      router.push("/admin");
      return;
    }

    loadReports();
  }, [hasHydrated, user?.id, user?.role]);

  async function loadReports() {
    setLoading(true);
    setError("");

    try {
      const response = await api.get(`/admin/traffic-summary?t=${Date.now()}`);
      setData(response.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Rapor verileri yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }

  const filteredVisits = useMemo(() => {
    const q = normalize(query);
    const visits = data?.lastVisits || [];

    if (!q) return visits;

    return visits.filter((item) =>
      normalize(
        [
          item.page,
          item.ip,
          item.userAgent,
          userName(item.user),
          item.user?.email,
          item.user?.role,
          item.user?.city,
          item.user?.district,
        ].join(" "),
      ).includes(q),
    );
  }, [data, query]);

  if (!hasHydrated || loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F8FAFC] text-[#172033]">
        <div className="text-center">
          <Loader2 className="mx-auto animate-spin text-[#1557D6]" size={30} />
          <p className="mt-3 text-[12px] font-black uppercase tracking-[0.18em] text-slate-400">
            Raporlar
          </p>
        </div>
      </main>
    );
  }

  const counts = data?.counts || {
    totalVisits: 0,
    todayVisits: 0,
    weekVisits: 0,
    monthVisits: 0,
    totalUsers: 0,
    onlineCount: 0,
    awayCount: 0,
    offlineCount: 0,
  };

  return (
    <main className="min-h-screen bg-[#F8FAFC] text-[#172033]">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 px-3 py-2.5 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <Link
              href="/admin"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm"
            >
              <ArrowLeft size={19} />
            </Link>

            <div className="min-w-0">
              <h1 className="truncate text-[19px] font-black tracking-[-0.04em]">
                Raporlar
              </h1>
              <p className="truncate text-[11px] font-bold text-slate-500">
                Trafik, kullanıcı ve sayfa performansı
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={loadReports}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm"
          >
            <RefreshCw size={17} />
          </button>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1180px] px-3 py-3 pb-20">
        <AdminFlagBanner className="mb-2 rounded-[8px]" />

        <section className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <MetricCard label="Toplam Ziyaret" value={counts.totalVisits} icon={<Eye size={18} />} tone="blue" />
          <MetricCard label="Bugün" value={counts.todayVisits} icon={<Clock3 size={18} />} tone="green" />
          <MetricCard label="Bu Hafta" value={counts.weekVisits} icon={<TrendingUp size={18} />} tone="amber" />
          <MetricCard label="Bu Ay" value={counts.monthVisits} icon={<Activity size={18} />} tone="slate" />
        </section>

        <section className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-4">
          <MetricCard label="Kullanıcı" value={counts.totalUsers} icon={<UsersRound size={18} />} tone="blue" />
          <MetricCard label="Online" value={counts.onlineCount} icon={<UserRound size={18} />} tone="green" />
          <MetricCard label="Uzakta" value={counts.awayCount} icon={<Clock3 size={18} />} tone="amber" />
          <MetricCard label="Offline" value={counts.offlineCount} icon={<FileText size={18} />} tone="rose" />
        </section>

        <section className="mt-3 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Son ziyaretlerde kullanıcı, sayfa, IP veya cihaz ara..."
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-center text-[13px] font-bold outline-none focus:border-[#1557D6] md:text-left"
            />
          </label>
        </section>

        {error ? (
          <div className="mt-3 rounded-2xl border border-rose-100 bg-rose-50 p-3 text-center text-[13px] font-black text-rose-700">
            {error}
          </div>
        ) : null}

        <section className="mt-3 grid grid-cols-1 gap-2 lg:grid-cols-2">
          <ReportPanel title="En Çok Ziyaret Edilen Sayfalar" icon={<Globe2 size={18} />}>
            {(data?.topPages || []).length === 0 ? (
              <EmptyText text="Sayfa raporu bulunamadı." />
            ) : (
              <div className="grid gap-2">
                {(data?.topPages || []).map((item) => (
                  <RowCard
                    key={item.page}
                    title={item.page || "/"}
                    subtitle="Sayfa ziyareti"
                    value={item.count}
                  />
                ))}
              </div>
            )}
          </ReportPanel>

          <ReportPanel title="En Aktif Kullanıcılar" icon={<UsersRound size={18} />}>
            {(data?.topUsers || []).length === 0 ? (
              <EmptyText text="Kullanıcı raporu bulunamadı." />
            ) : (
              <div className="grid gap-2">
                {(data?.topUsers || []).map((item, index) => (
                  <RowCard
                    key={`${item.user?.id || "guest"}-${index}`}
                    title={userName(item.user)}
                    subtitle={`${roleLabel(item.user?.role)} • Son: ${dateText(item.lastSeenAt)}`}
                    value={item.count}
                  />
                ))}
              </div>
            )}
          </ReportPanel>
        </section>

        <section className="mt-3">
          <ReportPanel title="Son Ziyaretler" icon={<Activity size={18} />}>
            {filteredVisits.length === 0 ? (
              <EmptyText text="Bu filtrede ziyaret kaydı bulunamadı." />
            ) : (
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
                {filteredVisits.map((item, index) => (
                  <VisitCard key={`${item.id || "visit"}-${index}`} item={item} />
                ))}
              </div>
            )}
          </ReportPanel>
        </section>
      </div>
    </main>
  );
}

function MetricCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone: "blue" | "green" | "amber" | "rose" | "slate";
}) {
  const toneClass =
    tone === "green"
      ? "bg-emerald-50 text-emerald-700"
      : tone === "amber"
        ? "bg-amber-50 text-amber-700"
        : tone === "rose"
          ? "bg-rose-50 text-rose-700"
          : tone === "slate"
            ? "bg-slate-100 text-slate-700"
            : "bg-blue-50 text-blue-700";

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-3 text-center shadow-sm">
      <div className={`mx-auto flex h-9 w-9 items-center justify-center rounded-xl ${toneClass}`}>
        {icon}
      </div>
      <p className="mt-2 text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-[24px] font-black leading-none text-[#172033]">{value}</p>
    </article>
  );
}

function ReportPanel({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="mb-3 flex items-center justify-center gap-2 text-center">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
          {icon}
        </span>
        <h2 className="text-[15px] font-black tracking-[-0.03em] text-[#172033]">
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

function RowCard({
  title,
  subtitle,
  value,
}: {
  title: string;
  subtitle: string;
  value: number;
}) {
  return (
    <article className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3">
      <div className="min-w-0">
        <p className="truncate text-[13px] font-black text-[#172033]">{title}</p>
        <p className="truncate text-[11px] font-bold text-slate-500">{subtitle}</p>
      </div>
      <span className="flex h-9 min-w-9 items-center justify-center rounded-xl bg-white px-2 text-[14px] font-black text-blue-700 shadow-sm">
        {value}
      </span>
    </article>
  );
}

function VisitCard({ item }: { item: VisitItem }) {
  return (
    <article className="rounded-2xl border border-slate-100 bg-slate-50 p-3 text-center">
      <p className="truncate text-[13px] font-black text-[#172033]">
        {userName(item.user)}
      </p>
      <p className="mt-1 truncate text-[11px] font-bold text-slate-500">
        {roleLabel(item.user?.role)}
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <MiniInfo label="Sayfa" value={item.page || "/"} />
        <MiniInfo label="Tarih" value={dateText(item.createdAt)} />
        <MiniInfo label="IP" value={item.ip || "-"} />
        <MiniInfo label="Cihaz" value={item.userAgent || "-"} />
      </div>
    </article>
  );
}

function MiniInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white p-2 text-center">
      <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 truncate text-[11px] font-black text-[#172033]">
        {value}
      </p>
    </div>
  );
}

function EmptyText({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
      <p className="text-[13px] font-black text-slate-500">{text}</p>
    </div>
  );
}