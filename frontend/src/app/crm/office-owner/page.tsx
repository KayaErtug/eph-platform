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
    advisorCount?: number;
    portfolioCount?: number;
    authorizedPortfolioCount?: number;
    poolPortfolioCount?: number;
    kontorUsage?: number;
    performanceScore?: number;
  } | null;
  teams?: OfficeTeam[];
  leaders?: OfficeLeader[];
  advisors?: OfficeAdvisor[];
  quality?: OfficeQuality | null;
  qualityCenter?: OfficeQuality | null;
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

type OfficeAdvisor = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  role?: string | null;
  isTeamLeader?: boolean;
  portfolioCount?: number;
  authorizedPortfolioCount?: number;
  poolPortfolioCount?: number;
  performanceScore?: number;
};

type OfficeQuality = {
  missingPhotoCount?: number;
  missingDocumentCount?: number;
  missingLocationCount?: number;
  unauthorizedPortfolioCount?: number;
  qualityScore?: number;
};

const EMPTY_DASHBOARD: OfficeOwnerDashboard = {
  office: null,
  summary: {
    teamCount: 0,
    teamLeaderCount: 0,
    memberCount: 0,
    advisorCount: 0,
    portfolioCount: 0,
    authorizedPortfolioCount: 0,
    poolPortfolioCount: 0,
    kontorUsage: 0,
    performanceScore: 0,
  },
  teams: [],
  leaders: [],
  advisors: [],
  quality: {
    missingPhotoCount: 0,
    missingDocumentCount: 0,
    missingLocationCount: 0,
    unauthorizedPortfolioCount: 0,
    qualityScore: 100,
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

function formatCompactMoney(value: number) {
  if (!value) return "0 ₺";
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M ₺`;
  return `${value.toLocaleString("tr-TR")} ₺`;
}

function calculateRevenuePotential(params: {
  authorizedPortfolioCount: number;
  poolPortfolioCount: number;
  teamCount: number;
  advisorCount: number;
}) {
  const authorizedBase = params.authorizedPortfolioCount * 1000;
  const poolBase = params.poolPortfolioCount * 1500;
  const teamBase = params.teamCount * 250;
  const advisorBase = params.advisorCount * 100;

  return authorizedBase + poolBase + teamBase + advisorBase;
}

function getDashboardValue(data: OfficeOwnerDashboard | null) {
  return data || EMPTY_DASHBOARD;
}

function advisorName(advisor: OfficeAdvisor) {
  const name = `${advisor.firstName || ""} ${advisor.lastName || ""}`.trim();
  return name || advisor.email || "Danışman";
}

function advisorInitials(advisor: OfficeAdvisor) {
  return (
    advisorName(advisor)
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((item) => item.charAt(0))
      .join("")
      .toLocaleUpperCase("tr-TR") || "D"
  );
}

function teamLeaderName(team: OfficeTeam) {
  const rawTeam = team as OfficeTeam & {
    leader?: {
      firstName?: string | null;
      lastName?: string | null;
      email?: string | null;
    } | null;
  };
  const name =
    `${rawTeam.leader?.firstName || ""} ${rawTeam.leader?.lastName || ""}`.trim();
  return team.leaderName || name || rawTeam.leader?.email || "Atanmadı";
}

function teamAuthorizedRate(team: OfficeTeam) {
  const portfolioCount = asNumber(team.portfolioCount);
  if (!portfolioCount) return 0;
  return Math.round(
    (asNumber(team.authorizedPortfolioCount) / portfolioCount) * 100,
  );
}

function teamPoolRate(team: OfficeTeam) {
  const portfolioCount = asNumber(team.portfolioCount);
  if (!portfolioCount) return 0;
  return Math.round((asNumber(team.poolPortfolioCount) / portfolioCount) * 100);
}

function teamRiskLabel(team: OfficeTeam) {
  const score = asNumber(team.performanceScore);
  const portfolioCount = asNumber(team.portfolioCount);
  const authorizedRate = teamAuthorizedRate(team);

  if (score >= 80 && authorizedRate >= 60) return "Güçlü";
  if (score < 45 || portfolioCount === 0 || authorizedRate < 25)
    return "Riskli";
  return "Takip";
}

function calculateQualityScore(params: {
  portfolioCount: number;
  missingPhotoCount: number;
  missingDocumentCount: number;
  missingLocationCount: number;
  unauthorizedPortfolioCount: number;
}) {
  const portfolioCount = Math.max(0, params.portfolioCount);

  if (portfolioCount === 0) return 100;

  const missingTotal =
    Math.max(0, params.missingPhotoCount) +
    Math.max(0, params.missingDocumentCount) +
    Math.max(0, params.missingLocationCount) +
    Math.max(0, params.unauthorizedPortfolioCount);

  const penalty = Math.min(100, Math.round((missingTotal / Math.max(portfolioCount, 1)) * 25));
  return Math.max(0, Math.min(100, 100 - penalty));
}

function qualityLevel(score: number) {
  if (score >= 90) return { label: "Mükemmel", tone: "emerald" as const };
  if (score >= 75) return { label: "Çok İyi", tone: "blue" as const };
  if (score >= 60) return { label: "İyi", tone: "cyan" as const };
  if (score >= 40) return { label: "Geliştirilmeli", tone: "amber" as const };
  return { label: "Riskli", tone: "red" as const };
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
  const quality =
    normalized.quality || normalized.qualityCenter || EMPTY_DASHBOARD.quality!;
  const reports = normalized.reports || EMPTY_DASHBOARD.reports!;
  const teams = Array.isArray(normalized.teams) ? normalized.teams : [];
  const leaders = Array.isArray(normalized.leaders) ? normalized.leaders : [];
  const advisors = Array.isArray(normalized.advisors)
    ? normalized.advisors
    : [];
  const advisorCount = asNumber(
    summary.memberCount ?? summary.advisorCount ?? advisors.length,
  );
  const teamLeaderAdvisorCount =
    advisors.filter((advisor) => advisor.isTeamLeader).length ||
    asNumber(summary.teamLeaderCount);
  const regularAdvisorCount = Math.max(
    advisorCount - teamLeaderAdvisorCount,
    0,
  );
  const leaderRatio =
    advisorCount > 0
      ? Math.round((teamLeaderAdvisorCount / advisorCount) * 100)
      : 0;
  const topAdvisors = [...advisors]
    .sort((a, b) => asNumber(b.performanceScore) - asNumber(a.performanceScore))
    .slice(0, 5);
  const riskyAdvisors = [...advisors]
    .filter(
      (advisor) =>
        asNumber(advisor.performanceScore) < 50 ||
        asNumber(advisor.portfolioCount) === 0,
    )
    .sort((a, b) => asNumber(a.performanceScore) - asNumber(b.performanceScore))
    .slice(0, 5);
  const sortedTeams = [...teams].sort(
    (a, b) => asNumber(b.performanceScore) - asNumber(a.performanceScore),
  );
  const bestTeams = sortedTeams.slice(0, 3);
  const riskyTeams = [...teams]
    .filter((team) => teamRiskLabel(team) === "Riskli")
    .sort((a, b) => asNumber(a.performanceScore) - asNumber(b.performanceScore))
    .slice(0, 3);
  const teamPerformanceAverage = teams.length
    ? Math.round(
        teams.reduce((sum, team) => sum + asNumber(team.performanceScore), 0) /
          teams.length,
      )
    : 0;
  const teamAuthorizedAverage = teams.length
    ? Math.round(
        teams.reduce((sum, team) => sum + teamAuthorizedRate(team), 0) /
          teams.length,
      )
    : 0;
  const teamPoolAverage = teams.length
    ? Math.round(
        teams.reduce((sum, team) => sum + teamPoolRate(team), 0) / teams.length,
      )
    : 0;
  const totalKontorUsage = asNumber(summary.kontorUsage);
  const kontorPerAdvisor =
    advisorCount > 0 ? Math.round(totalKontorUsage / advisorCount) : 0;
  const kontorPerTeam =
    teams.length > 0 ? Math.round(totalKontorUsage / teams.length) : 0;
  const poolOpportunityCount = asNumber(summary.poolPortfolioCount);
  const authorizedOpportunityCount = asNumber(summary.authorizedPortfolioCount);
  const revenuePotential = calculateRevenuePotential({
    authorizedPortfolioCount: authorizedOpportunityCount,
    poolPortfolioCount: poolOpportunityCount,
    teamCount: teams.length,
    advisorCount,
  });
  const officeProductionScore = Math.min(
    100,
    Math.round(
      (teamPerformanceAverage +
        teamAuthorizedAverage +
        teamPoolAverage +
        asNumber(summary.performanceScore)) /
        4,
    ),
  );

  const officeQualityScore = asNumber(quality.qualityScore) || calculateQualityScore({
    portfolioCount: asNumber(summary.portfolioCount),
    missingPhotoCount: asNumber(quality.missingPhotoCount),
    missingDocumentCount: asNumber(quality.missingDocumentCount),
    missingLocationCount: asNumber(quality.missingLocationCount),
    unauthorizedPortfolioCount: asNumber(quality.unauthorizedPortfolioCount),
  });
  const officeQualityStatus = qualityLevel(officeQualityScore);

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
      const response = await api.get(
        `/office-owner-crm/dashboard?t=${Date.now()}`,
      );
      setDashboard(response.data || EMPTY_DASHBOARD);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Ofis sahibi dashboard verileri yüklenemedi.",
      );
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
            {refreshing ? (
              <Loader2 className="animate-spin" size={17} />
            ) : (
              <RefreshCw size={17} />
            )}
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
            {[office?.city, office?.district].filter(Boolean).join(" / ") ||
              "Ofis konumu girilmedi"}
          </p>
        </section>

        <section className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <KpiCard
            label="Toplam Takım"
            value={asNumber(summary.teamCount)}
            icon={<Building2 size={20} />}
            tone="blue"
          />
          <KpiCard
            label="Takım Lideri"
            value={asNumber(summary.teamLeaderCount)}
            icon={<Crown size={20} />}
            tone="yellow"
          />
          <KpiCard
            label="Danışman"
            value={advisorCount}
            icon={<UsersRound size={20} />}
            tone="purple"
          />
          <KpiCard
            label="Portföy"
            value={asNumber(summary.portfolioCount)}
            icon={<Home size={20} />}
            tone="green"
          />
          <KpiCard
            label="Yetkili Portföy"
            value={asNumber(summary.authorizedPortfolioCount)}
            icon={<ShieldCheck size={20} />}
            tone="emerald"
          />
          <KpiCard
            label="Havuz Portföy"
            value={asNumber(summary.poolPortfolioCount)}
            icon={<CheckCircle2 size={20} />}
            tone="cyan"
          />
          <KpiCard
            label="Kontör Kullanımı"
            value={asNumber(summary.kontorUsage)}
            icon={<WalletCards size={20} />}
            tone="orange"
          />
          <KpiCard
            label="Ofis Performansı"
            value={`${asNumber(summary.performanceScore)}/100`}
            icon={<TrendingUp size={20} />}
            tone="gray"
          />
        </section>

        <section className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
          <Panel title="Takımlarım" actionText={`${teams.length} takım`}>
            {teams.length ? (
              <div className="space-y-2">
                {teams.map((team) => (
                  <article
                    key={team.id}
                    className="rounded-3xl border border-[#C7D6E8] bg-[#F8FAFC] p-3"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
                        <UsersRound size={22} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h3 className="text-[15px] font-black text-[#1F2937]">
                            {team.name}
                          </h3>
                          <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-black text-blue-700">
                            {asNumber(team.performanceScore)}/100
                          </span>
                        </div>
                        <p className="mt-1 text-[12px] font-bold text-slate-500">
                          Lider: {teamLeaderName(team)}
                        </p>
                        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                          <MiniStat
                            label="Üye"
                            value={asNumber(team.memberCount)}
                          />
                          <MiniStat
                            label="Portföy"
                            value={asNumber(team.portfolioCount)}
                          />
                          <MiniStat
                            label="Yetkili"
                            value={asNumber(team.authorizedPortfolioCount)}
                          />
                          <MiniStat
                            label="Havuz"
                            value={asNumber(team.poolPortfolioCount)}
                          />
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
                  <article
                    key={leader.id}
                    className="rounded-3xl border border-[#C7D6E8] bg-[#F8FAFC] p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-yellow-50 text-yellow-700">
                        <Crown size={20} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-[14px] font-black text-[#1F2937]">
                          {leader.name}
                        </h3>
                        <p className="mt-1 text-[11px] font-bold text-slate-500">
                          {leader.teamName || "Takım yok"}
                        </p>
                        <p className="mt-1 text-[11px] font-bold text-slate-500">
                          {leader.email || "E-posta yok"}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-white px-3 py-2 text-center">
                        <p className="text-[14px] font-black text-[#1F2937]">
                          {asNumber(leader.performanceScore)}
                        </p>
                        <p className="text-[10px] font-black text-slate-500">
                          Puan
                        </p>
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

        <section className="grid gap-3 lg:grid-cols-[0.95fr_1.05fr]">
          <Panel
            title="Takım Performans Merkezi"
            actionText={`${teams.length} takım`}
          >
            <div className="grid grid-cols-3 gap-2">
              <TeamMetricCard
                label="Ortalama Puan"
                value={`${teamPerformanceAverage}/100`}
                icon={<TrendingUp size={18} />}
              />
              <TeamMetricCard
                label="Yetki Oranı"
                value={`%${teamAuthorizedAverage}`}
                icon={<ShieldCheck size={18} />}
              />
              <TeamMetricCard
                label="Havuz Oranı"
                value={`%${teamPoolAverage}`}
                icon={<CheckCircle2 size={18} />}
              />
            </div>
            <div className="mt-3 rounded-3xl border border-[#C7D6E8] bg-[#F8FAFC] p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <h3 className="text-[13px] font-black text-[#1F2937]">
                  Takım Sıralaması
                </h3>
                <span className="rounded-full bg-white px-2 py-1 text-[10px] font-black text-[#2563EB]">
                  Puan
                </span>
              </div>
              <div className="space-y-2">
                {sortedTeams.length ? (
                  sortedTeams.map((team, index) => (
                    <TeamRankRow key={team.id} team={team} rank={index + 1} />
                  ))
                ) : (
                  <EmptyState text="Takım performans verisi bulunamadı." />
                )}
              </div>
            </div>
          </Panel>

          <Panel title="Takım Radar" actionText="Canlı özet">
            <div className="grid gap-2 md:grid-cols-2">
              <TeamMiniList
                title="En Güçlü 3 Takım"
                teams={bestTeams}
                emptyText="Takım verisi bekleniyor."
              />
              <TeamMiniList
                title="Riskli Takımlar"
                teams={riskyTeams}
                emptyText="Riskli takım bulunamadı."
              />
            </div>
            <div className="mt-3 rounded-3xl border border-[#C7D6E8] bg-[#F8FAFC] p-3 text-center">
              <Sparkles className="mx-auto text-[#2563EB]" size={23} />
              <p className="mt-2 text-[13px] font-black text-[#1F2937]">
                Lina takım önerisi
              </p>
              <p className="mt-1 text-[12px] font-bold leading-5 text-slate-500">
                Riskli takımlarda önce yetki belgesi ve havuz görünürlüğü
                eksiklerini tamamlat.
              </p>
            </div>
          </Panel>
        </section>

        <section className="grid gap-3 lg:grid-cols-[0.9fr_1.1fr]">
          <Panel
            title="Danışman Kalite Merkezi"
            actionText={`${advisorCount} danışman`}
          >
            <div className="grid grid-cols-2 gap-2">
              <AdvisorQualityCard
                label="Toplam Danışman"
                value={advisorCount}
                icon={<UsersRound size={19} />}
              />
              <AdvisorQualityCard
                label="Takım Lideri"
                value={teamLeaderAdvisorCount}
                icon={<Crown size={19} />}
              />
              <AdvisorQualityCard
                label="Normal Danışman"
                value={regularAdvisorCount}
                icon={<Home size={19} />}
              />
              <AdvisorQualityCard
                label="Lider Oranı"
                value={`%${leaderRatio}`}
                icon={<TrendingUp size={19} />}
              />
            </div>
          </Panel>

          <Panel title="Danışman Performans Özeti" actionText="Gerçek veri">
            <div className="grid gap-2 md:grid-cols-2">
              <AdvisorList
                title="En Başarılı 5"
                advisors={topAdvisors}
                emptyText="Performans verisi bekleniyor."
              />
              <AdvisorList
                title="Riskli 5"
                advisors={riskyAdvisors}
                emptyText="Riskli danışman bulunamadı."
              />
            </div>
          </Panel>
        </section>

        <section className="grid gap-3 lg:grid-cols-[0.9fr_1.1fr]">
          <Panel title="Kontör Ekonomisi Özeti" actionText="Gerçek hareket">
            <div className="grid grid-cols-2 gap-2">
              <EconomyCard
                label="Toplam Harcama"
                value={`${totalKontorUsage} kontör`}
                icon={<WalletCards size={19} />}
              />
              <EconomyCard
                label="Danışman Başına"
                value={`${kontorPerAdvisor} kontör`}
                icon={<UsersRound size={19} />}
              />
              <EconomyCard
                label="Takım Başına"
                value={`${kontorPerTeam} kontör`}
                icon={<Building2 size={19} />}
              />
              <EconomyCard
                label="Havuz Portföy"
                value={poolOpportunityCount}
                icon={<CheckCircle2 size={19} />}
              />
            </div>
            <div className="mt-3 rounded-3xl border border-[#C7D6E8] bg-[#F8FAFC] p-3 text-center">
              <WalletCards className="mx-auto text-[#2563EB]" size={24} />
              <p className="mt-2 text-[13px] font-black text-[#1F2937]">
                Kontör tüketimi izleniyor
              </p>
              <p className="mt-1 text-[12px] font-bold leading-5 text-slate-500">
                Bu özet mevcut kontör hareketlerinden gelir; kontör bakiyesi ve
                paket satışları Kontör Ekonomisi V2 paketinde derinleşecek.
              </p>
            </div>
          </Panel>

          <Panel title="Gelir Özeti" actionText="Potansiyel">
            <div className="grid grid-cols-2 gap-2">
              <EconomyCard
                label="Yetkili Portföy"
                value={authorizedOpportunityCount}
                icon={<ShieldCheck size={19} />}
              />
              <EconomyCard
                label="Havuz Fırsatı"
                value={poolOpportunityCount}
                icon={<Home size={19} />}
              />
              <EconomyCard
                label="Üretim Skoru"
                value={`${officeProductionScore}/100`}
                icon={<TrendingUp size={19} />}
              />
              <EconomyCard
                label="Gelir Potansiyeli"
                value={formatCompactMoney(revenuePotential)}
                icon={<BarChart3 size={19} />}
              />
            </div>
            <div className="mt-3 rounded-3xl border border-[#C7D6E8] bg-[#F8FAFC] p-3 text-center">
              <Sparkles className="mx-auto text-[#2563EB]" size={24} />
              <p className="mt-2 text-[13px] font-black text-[#1F2937]">
                Lina gelir önerisi
              </p>
              <p className="mt-1 text-[12px] font-bold leading-5 text-slate-500">
                Gelir potansiyeli yetkili portföy, havuz görünürlüğü, takım ve
                danışman üretiminden hesaplanan yönetim göstergesidir.
              </p>
            </div>
          </Panel>
        </section>

        <section className="grid gap-3 lg:grid-cols-2">
          <Panel title="Ofis Kalite Merkezi" actionText={officeQualityStatus.label}>
            <QualityScoreCard score={officeQualityScore} level={officeQualityStatus.label} tone={officeQualityStatus.tone} />
            <div className="mt-2 grid grid-cols-2 gap-2">
              <QualityCard
                label="Eksik Fotoğraf"
                value={asNumber(quality.missingPhotoCount)}
              />
              <QualityCard
                label="Eksik Belge"
                value={asNumber(quality.missingDocumentCount)}
              />
              <QualityCard
                label="Eksik Konum"
                value={asNumber(quality.missingLocationCount)}
              />
              <QualityCard
                label="Yetkisiz Portföy"
                value={asNumber(quality.unauthorizedPortfolioCount)}
              />
            </div>
          </Panel>

          <Panel title="Ofis Raporları" actionText="Analiz">
            <div className="grid gap-2 sm:grid-cols-3">
              <ReportCard
                label="Bu Hafta"
                value={asNumber(reports.weeklyScore)}
              />
              <ReportCard
                label="Bu Ay"
                value={asNumber(reports.monthlyScore)}
              />
              <ReportCard
                label="Son 30 Gün"
                value={asNumber(reports.last30DaysScore)}
              />
            </div>
            <div className="mt-3 rounded-2xl border border-[#C7D6E8] bg-[#F8FAFC] p-3 text-center">
              <BarChart3 className="mx-auto text-[#2563EB]" size={24} />
              <p className="mt-2 text-[13px] font-black text-[#1F2937]">
                Ofis performans raporu hazır
              </p>
              <p className="mt-1 text-[12px] font-bold text-slate-500">
                Detaylı raporlar sonraki paketlerde Excel/PDF çıktısına
                bağlanacak.
              </p>
            </div>
          </Panel>
        </section>

        <section className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <ActionCard
            label="Takım Yönetimi"
            icon={<UsersRound size={20} />}
            href="/admin/organization"
          />
          <ActionCard
            label="Lider Performansı"
            icon={<Crown size={20} />}
            href="/crm/team-leader"
          />
          <ActionCard
            label="Ofis Raporları"
            icon={<BarChart3 size={20} />}
            href="/admin/reports"
          />
          <ActionCard
            label="Ofis Mesajları"
            icon={<MessageCircle size={20} />}
            href="/messages"
          />
        </section>
      </section>
    </main>
  );
}

function Panel({
  title,
  actionText,
  children,
}: {
  title: string;
  actionText?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-[#C7D6E8] bg-white p-3 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-center text-[16px] font-black text-[#1F2937] sm:text-left">
          {title}
        </h2>
        {actionText ? (
          <span className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-black text-blue-700">
            {actionText}
          </span>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function KpiCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number | string;
  icon: ReactNode;
  tone:
    | "blue"
    | "yellow"
    | "purple"
    | "green"
    | "emerald"
    | "cyan"
    | "orange"
    | "gray";
}) {
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
      <div
        className={`mx-auto flex h-10 w-10 items-center justify-center rounded-2xl ${toneMap[tone]}`}
      >
        {icon}
      </div>
      <p className="mt-2 text-[11px] font-black uppercase leading-tight text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-[21px] font-black tracking-[-0.03em] text-[#1F2937]">
        {value}
      </p>
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

function QualityScoreCard({ score, level, tone }: { score: number; level: string; tone: "emerald" | "blue" | "cyan" | "amber" | "red" }) {
  const toneClass = {
    emerald: "border-emerald-100 bg-emerald-50 text-emerald-700",
    blue: "border-blue-100 bg-blue-50 text-blue-700",
    cyan: "border-cyan-100 bg-cyan-50 text-cyan-700",
    amber: "border-amber-100 bg-amber-50 text-amber-700",
    red: "border-red-100 bg-red-50 text-red-700",
  }[tone];

  return (
    <article className={`rounded-3xl border p-3 text-center ${toneClass}`}>
      <div className="flex items-center justify-center gap-2">
        <CheckCircle2 size={20} />
        <p className="text-[12px] font-black uppercase tracking-[0.08em]">Ofis Kalite Skoru</p>
      </div>
      <p className="mt-2 text-[26px] font-black tracking-[-0.04em]">{score}/100</p>
      <p className="mt-1 text-[12px] font-black">{level}</p>
    </article>
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

function TeamMetricCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number | string;
  icon: ReactNode;
}) {
  return (
    <article className="min-h-[88px] rounded-3xl border border-[#C7D6E8] bg-[#F8FAFC] p-2 text-center shadow-sm">
      <span className="mx-auto flex h-9 w-9 items-center justify-center rounded-2xl bg-white text-[#2563EB] shadow-sm">
        {icon}
      </span>
      <p className="mt-2 text-[10px] font-black leading-tight text-[#1F2937]">
        {label}
      </p>
      <p className="mt-1 text-[17px] font-black tracking-[-0.03em] text-[#2563EB]">
        {value}
      </p>
    </article>
  );
}

function TeamRankRow({ team, rank }: { team: OfficeTeam; rank: number }) {
  const riskLabel = teamRiskLabel(team);
  const riskClass =
    riskLabel === "Güçlü"
      ? "bg-emerald-50 text-emerald-700"
      : riskLabel === "Riskli"
        ? "bg-orange-50 text-orange-700"
        : "bg-blue-50 text-blue-700";

  return (
    <article className="rounded-3xl border border-[#C7D6E8] bg-white p-3 shadow-sm">
      <div className="flex items-start gap-2">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[#EFF6FF] text-[12px] font-black text-[#2563EB]">
          {rank}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="break-words text-[13px] font-black leading-5 text-[#1F2937]">
              {team.name}
            </h3>
            <span
              className={`rounded-full px-2 py-1 text-[10px] font-black ${riskClass}`}
            >
              {riskLabel}
            </span>
          </div>
          <p className="mt-1 break-words text-[11px] font-bold text-slate-500">
            Lider: {teamLeaderName(team)}
          </p>
          <div className="mt-2 grid grid-cols-4 gap-1.5">
            <MiniStat label="Üye" value={asNumber(team.memberCount)} />
            <MiniStat
              label="Puan"
              value={`${asNumber(team.performanceScore)}`}
            />
            <MiniStat label="Yetki" value={`%${teamAuthorizedRate(team)}`} />
            <MiniStat label="Havuz" value={`%${teamPoolRate(team)}`} />
          </div>
        </div>
      </div>
    </article>
  );
}

function TeamMiniList({
  title,
  teams,
  emptyText,
}: {
  title: string;
  teams: OfficeTeam[];
  emptyText: string;
}) {
  return (
    <section className="rounded-3xl border border-[#C7D6E8] bg-[#F8FAFC] p-3">
      <h3 className="text-center text-[13px] font-black text-[#1F2937]">
        {title}
      </h3>
      <div className="mt-2 space-y-2">
        {teams.length ? (
          teams.map((team) => (
            <article
              key={team.id}
              className="rounded-2xl border border-[#C7D6E8] bg-white p-2"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12px] font-black text-[#1F2937]">
                    {team.name}
                  </span>
                  <span className="block truncate text-[10px] font-bold text-slate-500">
                    {teamLeaderName(team)}
                  </span>
                </span>
                <span className="rounded-full bg-[#EFF6FF] px-2 py-1 text-[10px] font-black text-[#2563EB]">
                  {asNumber(team.performanceScore)}/100
                </span>
              </div>
            </article>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-[#C7D6E8] bg-white p-4 text-center text-[12px] font-black text-slate-500">
            {emptyText}
          </div>
        )}
      </div>
    </section>
  );
}

function AdvisorQualityCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number | string;
  icon: ReactNode;
}) {
  return (
    <article className="min-h-[92px] rounded-3xl border border-[#C7D6E8] bg-[#F8FAFC] p-3 text-center shadow-sm">
      <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-[#2563EB] shadow-sm">
        {icon}
      </span>
      <p className="mt-2 text-[11px] font-black leading-tight text-[#1F2937]">
        {label}
      </p>
      <p className="mt-1 text-[20px] font-black tracking-[-0.03em] text-[#2563EB]">
        {value}
      </p>
    </article>
  );
}

function AdvisorList({
  title,
  advisors,
  emptyText,
}: {
  title: string;
  advisors: OfficeAdvisor[];
  emptyText: string;
}) {
  return (
    <section className="rounded-3xl border border-[#C7D6E8] bg-[#F8FAFC] p-3">
      <h3 className="text-center text-[13px] font-black text-[#1F2937]">
        {title}
      </h3>
      <div className="mt-2 space-y-2">
        {advisors.length ? (
          advisors.map((advisor) => (
            <article
              key={advisor.id}
              className="flex items-center gap-2 rounded-2xl border border-[#C7D6E8] bg-white p-2"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-[11px] font-black text-[#2563EB]">
                {advisorInitials(advisor)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12px] font-black text-[#1F2937]">
                  {advisorName(advisor)}
                </span>
                <span className="block truncate text-[10px] font-bold text-slate-500">
                  {advisor.isTeamLeader ? "Takım Lideri" : "Danışman"}
                </span>
              </span>
              <span className="rounded-full bg-[#EFF6FF] px-2 py-1 text-[10px] font-black text-[#2563EB]">
                {asNumber(advisor.performanceScore)}/100
              </span>
            </article>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-[#C7D6E8] bg-white p-4 text-center text-[12px] font-black text-slate-500">
            {emptyText}
          </div>
        )}
      </div>
    </section>
  );
}

function EconomyCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number | string;
  icon: ReactNode;
}) {
  return (
    <article className="min-h-[96px] rounded-3xl border border-[#C7D6E8] bg-[#F8FAFC] p-3 text-center shadow-sm">
      <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-[#2563EB] shadow-sm">
        {icon}
      </span>
      <p className="mt-2 text-[11px] font-black leading-tight text-[#1F2937]">
        {label}
      </p>
      <p className="mt-1 break-words text-[18px] font-black tracking-[-0.03em] text-[#2563EB]">
        {value}
      </p>
    </article>
  );
}

function ActionCard({
  label,
  icon,
  href,
}: {
  label: string;
  icon: ReactNode;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="min-h-[92px] rounded-3xl border border-[#C7D6E8] bg-white p-3 text-center shadow-sm transition active:scale-[0.98]"
    >
      <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-[#2563EB]">
        {icon}
      </span>
      <span className="mt-2 block text-[12px] font-black text-[#1F2937]">
        {label}
      </span>
    </Link>
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
