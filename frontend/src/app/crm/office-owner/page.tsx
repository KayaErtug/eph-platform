"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BarChart3,
  Building2,
  CheckCircle2,
  Crown,
  FileWarning,
  Home,
  Loader2,
  MessageCircle,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UsersRound,
  WalletCards,
} from "lucide-react";

import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";

type OfficeOwnerDashboard = {
  office?: {
    id?: string;
    name?: string;
    city?: string | null;
    district?: string | null;
  } | null;
  summary?: {
    teamCount?: number;
    teamLeaderCount?: number;
    memberCount?: number;
    portfolioCount?: number;
    authorizedPortfolioCount?: number;
    poolPortfolioCount?: number;
    kontorUsage?: number;
    performanceScore?: number;
  } | null;
  teams?: OfficeTeam[];
  leaders?: OfficeLeader[];
  quality?: {
    missingPhotoCount?: number;
    missingDocumentCount?: number;
    missingLocationCount?: number;
    unauthorizedPortfolioCount?: number;
  } | null;
  reports?: {
    weeklyScore?: number;
    monthlyScore?: number;
    last30DaysScore?: number;
  } | null;
  linaInsight?: string | null;
};

type OfficeTeam = {
  id: string;
  name: string;
  leaderName?: string | null;
  memberCount?: number;
  portfolioCount?: number;
  authorizedPortfolioCount?: number;
  poolPortfolioCount?: number;
  performanceScore?: number;
};

type OfficeLeader = {
  id: string;
  name: string;
  email?: string | null;
  teamName?: string | null;
  performanceScore?: number;
  memberCount?: number;
};

const EMPTY_DASHBOARD: OfficeOwnerDashboard = {
  office: null,
  summary: {
    teamCount: 0,
    teamLeaderCount: 0,
    memberCount: 0,
    portfolioCount: 0,
    authorizedPortfolioCount: 0,
    poolPortfolioCount: 0,
    kontorUsage: 0,
    performanceScore: 0,
  },
  teams: [],
  leaders: [],
  quality: {
    missingPhotoCount: 0,
    missingDocumentCount: 0,
    missingLocationCount: 0,
    unauthorizedPortfolioCount: 0,
  },
  reports: {
    weeklyScore: 0,
    monthlyScore: 0,
    last30DaysScore: 0,
  },
  linaInsight: null,
};

function asNumber(value: unknown) {
  const numeric = Number(value || 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

function getDashboardValue(data: OfficeOwnerDashboard | null) {
  return data || EMPTY_DASHBOARD;
}

export default function OfficeOwnerCrmDashboardPage() {
  const router = useRouter();
  const { user, hasHydrated } = useAuthStore();

  const [dashboard, setDashboard] = useState<OfficeOwnerDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const normalized = useMemo(() => getDashboardValue(dashboard), [dashboard]);
  const summary = normalized.summary || EMPTY_DASHBOARD.summary!;
  const office = normalized.office;
  const quality = normalized.quality || EMPTY_DASHBOARD.quality!;
  const reports = normalized.reports || EMPTY_DASHBOARD.reports!;
  const teams = Array.isArray(normalized.teams) ? normalized.teams : [];
  const leaders = Array.isArray(normalized.leaders) ? normalized.leaders : [];

  useEffect(() => {
    if (!hasHydrated) return;

    if (!user) {
      router.push("/giris");
      return;
    }

    loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasHydrated, user?.id]);

  async function loadDashboard() {
    setError("");
    setRefreshing(true);

    try {
      const response = await api.get(`/office-owner-crm/dashboard?t=${Date.now()}`);
      setDashboard(response.data || EMPTY_DASHBOARD);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Ofis sahibi dashboard verileri yüklenemedi.");
      setDashboard(EMPTY_DASHBOARD);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  if (!hasHydrated || loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F4F8FF] text-[#1F2937]">
        <div className="text-center">
          <Loader2 className="mx-auto animate-spin text-[#2563EB]" size={30} />
          <p className="mt-3 text-[12px] font-black uppercase tracking-[0.18em] text-slate-400">
            Ofis Sahibi CRM
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F4F8FF] pb-[calc(88px+env(safe-area-inset-bottom))] text-[#1F2937]">
      <header className="sticky top-0 z-40 border-b border-[#C7D6E8] bg-white/95 px-3 py-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <Link
              href="/crm"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[#C7D6E8] bg-white text-[#1F2937] shadow-sm"
              aria-label="CRM ekranına dön"
            >
              <ArrowLeft size={19} />
            </Link>
            <div className="min-w-0">
              <h1 className="text-center text-[20px] font-black tracking-[-0.04em] text-[#1F2937] sm:text-left">
                CRM Ofis Sahibi
              </h1>
              <p className="text-center text-[12px] font-bold text-slate-500 sm:text-left">
                Ofis, takım liderleri, danışmanlar ve performans merkezi
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={loadDashboard}
            disabled={refreshing}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[#C7D6E8] bg-white text-[#1F2937] shadow-sm disabled:opacity-60"
            aria-label="Yenile"
          >
            {refreshing ? <Loader2 className="animate-spin" size={17} /> : <RefreshCw size={17} />}
          </button>
        </div>
      </header>

      <section className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-3 py-3 lg:px-6">
        {error ? (
          <div className="rounded-2xl border border-red-100 bg-red-50 p-3 text-center text-[13px] font-black text-red-700">
            {error}
          </div>
        ) : null}

        <section className="rounded-[28px] border border-[#C7D6E8] bg-white p-4 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-[#2563EB]">
            <Sparkles size={24} />
          </div>
          <p className="mt-3 text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
            Lina Ofis Koçu
          </p>
          <h2 className="mt-1 text-[18px] font-black tracking-[-0.03em] text-[#1F2937]">
            {office?.name || "Ofis Sahibi Dashboard"}
          </h2>
          <p className="mt-2 text-[13px] font-bold leading-relaxed text-slate-600">
            {normalized.linaInsight ||
              "Ofis genelinde takım performanslarını, portföy kalitesini ve lider dağılımını tek ekrandan takip edebilirsin."}
          </p>
          <p className="mt-2 text-[12px] font-bold text-slate-500">
            {[office?.city, office?.district].filter(Boolean).join(" / ") || "Ofis konumu girilmedi"}
          </p>
        </section>

        <section className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <KpiCard label="Toplam Takım" value={asNumber(summary.teamCount)} icon={<Building2 size={20} />} tone="blue" />
          <KpiCard label="Takım Lideri" value={asNumber(summary.teamLeaderCount)} icon={<Crown size={20} />} tone="yellow" />
          <KpiCard label="Danışman" value={asNumber(summary.memberCount)} icon={<UsersRound size={20} />} tone="purple" />
          <KpiCard label="Portföy" value={asNumber(summary.portfolioCount)} icon={<Home size={20} />} tone="green" />
          <KpiCard label="Yetkili Portföy" value={asNumber(summary.authorizedPortfolioCount)} icon={<ShieldCheck size={20} />} tone="emerald" />
          <KpiCard label="Havuz Portföy" value={asNumber(summary.poolPortfolioCount)} icon={<CheckCircle2 size={20} />} tone="cyan" />
          <KpiCard label="Kontör Kullanımı" value={asNumber(summary.kontorUsage)} icon={<WalletCards size={20} />} tone="orange" />
          <KpiCard label="Ofis Performansı" value={`${asNumber(summary.performanceScore)}/100`} icon={<TrendingUp size={20} />} tone="gray" />
        </section>

        <section className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
          <Panel title="Takımlarım" actionText={`${teams.length} takım`}>
            {teams.length ? (
              <div className="space-y-2">
                {teams.map((team) => (
                  <article key={team.id} className="rounded-3xl border border-[#C7D6E8] bg-[#F8FAFC] p-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
                        <UsersRound size={22} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h3 className="text-[15px] font-black text-[#1F2937]">{team.name}</h3>
                          <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-black text-blue-700">
                            {asNumber(team.performanceScore)}/100
                          </span>
                        </div>
                        <p className="mt-1 text-[12px] font-bold text-slate-500">
                          Lider: {team.leaderName || "Atanmadı"}
                        </p>
                        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                          <MiniStat label="Üye" value={asNumber(team.memberCount)} />
                          <MiniStat label="Portföy" value={asNumber(team.portfolioCount)} />
                          <MiniStat label="Yetkili" value={asNumber(team.authorizedPortfolioCount)} />
                          <MiniStat label="Havuz" value={asNumber(team.poolPortfolioCount)} />
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState text="Bu ofis için takım verisi bulunamadı." />
            )}
          </Panel>

          <Panel title="Takım Liderleri" actionText={`${leaders.length} lider`}>
            {leaders.length ? (
              <div className="space-y-2">
                {leaders.map((leader) => (
                  <article key={leader.id} className="rounded-3xl border border-[#C7D6E8] bg-[#F8FAFC] p-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-yellow-50 text-yellow-700">
                        <Crown size={20} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-[14px] font-black text-[#1F2937]">{leader.name}</h3>
                        <p className="mt-1 text-[11px] font-bold text-slate-500">{leader.teamName || "Takım yok"}</p>
                        <p className="mt-1 text-[11px] font-bold text-slate-500">{leader.email || "E-posta yok"}</p>
                      </div>
                      <div className="rounded-2xl bg-white px-3 py-2 text-center">
                        <p className="text-[14px] font-black text-[#1F2937]">{asNumber(leader.performanceScore)}</p>
                        <p className="text-[10px] font-black text-slate-500">Puan</p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState text="Takım lideri verisi bulunamadı." />
            )}
          </Panel>
        </section>

        <section className="grid gap-3 lg:grid-cols-2">
          <Panel title="Ofis Kalite Merkezi" actionText="Kontrol">
            <div className="grid grid-cols-2 gap-2">
              <QualityCard label="Eksik Fotoğraf" value={asNumber(quality.missingPhotoCount)} />
              <QualityCard label="Eksik Belge" value={asNumber(quality.missingDocumentCount)} />
              <QualityCard label="Eksik Konum" value={asNumber(quality.missingLocationCount)} />
              <QualityCard label="Yetkisiz Portföy" value={asNumber(quality.unauthorizedPortfolioCount)} />
            </div>
          </Panel>

          <Panel title="Ofis Raporları" actionText="Analiz">
            <div className="grid gap-2 sm:grid-cols-3">
              <ReportCard label="Bu Hafta" value={asNumber(reports.weeklyScore)} />
              <ReportCard label="Bu Ay" value={asNumber(reports.monthlyScore)} />
              <ReportCard label="Son 30 Gün" value={asNumber(reports.last30DaysScore)} />
            </div>
            <div className="mt-3 rounded-2xl border border-[#C7D6E8] bg-[#F8FAFC] p-3 text-center">
              <BarChart3 className="mx-auto text-[#2563EB]" size={24} />
              <p className="mt-2 text-[13px] font-black text-[#1F2937]">Ofis performans raporu hazır</p>
              <p className="mt-1 text-[12px] font-bold text-slate-500">
                Detaylı raporlar sonraki paketlerde Excel/PDF çıktısına bağlanacak.
              </p>
            </div>
          </Panel>
        </section>

        <section className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <ActionCard label="Takım Yönetimi" icon={<UsersRound size={20} />} />
          <ActionCard label="Lider Performansı" icon={<Crown size={20} />} />
          <ActionCard label="Ofis Raporları" icon={<BarChart3 size={20} />} />
          <ActionCard label="Ofis Mesajları" icon={<MessageCircle size={20} />} />
        </section>
      </section>
    </main>
  );
}

function Panel({ title, actionText, children }: { title: string; actionText?: string; children: ReactNode }) {
  return (
    <section className="rounded-3xl border border-[#C7D6E8] bg-white p-3 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-center text-[16px] font-black text-[#1F2937] sm:text-left">{title}</h2>
        {actionText ? <span className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-black text-blue-700">{actionText}</span> : null}
      </div>
      {children}
    </section>
  );
}

function KpiCard({ label, value, icon, tone }: { label: string; value: number | string; icon: ReactNode; tone: "blue" | "yellow" | "purple" | "green" | "emerald" | "cyan" | "orange" | "gray" }) {
  const toneMap = {
    blue: "bg-blue-50 text-blue-700",
    yellow: "bg-yellow-50 text-yellow-700",
    purple: "bg-violet-50 text-violet-700",
    green: "bg-green-50 text-green-700",
    emerald: "bg-emerald-50 text-emerald-700",
    cyan: "bg-cyan-50 text-cyan-700",
    orange: "bg-orange-50 text-orange-700",
    gray: "bg-slate-50 text-slate-700",
  };

  return (
    <article className="min-h-[108px] rounded-3xl border border-[#C7D6E8] bg-white p-3 text-center shadow-sm">
      <div className={`mx-auto flex h-10 w-10 items-center justify-center rounded-2xl ${toneMap[tone]}`}>{icon}</div>
      <p className="mt-2 text-[11px] font-black uppercase leading-tight text-slate-500">{label}</p>
      <p className="mt-1 text-[21px] font-black tracking-[-0.03em] text-[#1F2937]">{value}</p>
    </article>
  );
}

function MiniStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-[#C7D6E8] bg-white p-2 text-center">
      <p className="text-[10px] font-black uppercase text-slate-500">{label}</p>
      <p className="mt-1 text-[15px] font-black text-[#1F2937]">{value}</p>
    </div>
  );
}

function QualityCard({ label, value }: { label: string; value: number }) {
  return (
    <article className="rounded-3xl border border-[#C7D6E8] bg-[#F8FAFC] p-3 text-center">
      <FileWarning className="mx-auto text-orange-600" size={22} />
      <p className="mt-2 text-[12px] font-black text-[#1F2937]">{label}</p>
      <p className="mt-1 text-[22px] font-black text-orange-700">{value}</p>
    </article>
  );
}

function ReportCard({ label, value }: { label: string; value: number }) {
  return (
    <article className="rounded-3xl border border-[#C7D6E8] bg-[#F8FAFC] p-3 text-center">
      <TrendingUp className="mx-auto text-[#2563EB]" size={22} />
      <p className="mt-2 text-[12px] font-black text-[#1F2937]">{label}</p>
      <p className="mt-1 text-[20px] font-black text-[#2563EB]">{value}/100</p>
    </article>
  );
}

function ActionCard({ label, icon }: { label: string; icon: ReactNode }) {
  return (
    <button
      type="button"
      onClick={() => window.alert(`${label} sonraki pakette aktif edilecek.`)}
      className="min-h-[92px] rounded-3xl border border-[#C7D6E8] bg-white p-3 text-center shadow-sm transition active:scale-[0.98]"
    >
      <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-[#2563EB]">
        {icon}
      </span>
      <span className="mt-2 block text-[12px] font-black text-[#1F2937]">{label}</span>
    </button>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-[#C7D6E8] bg-[#F8FAFC] p-6 text-center">
      <Building2 className="mx-auto text-slate-400" size={34} />
      <p className="mt-3 text-[13px] font-black text-slate-600">{text}</p>
    </div>
  );
}
