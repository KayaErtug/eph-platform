"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BarChart3,
  BellRing,
  Building2,
  CheckCircle2,
  ChevronRight,
  Home,
  Loader2,
  MapPin,
  MessageCircle,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserPlus,
  UsersRound,
  WalletCards,
} from "lucide-react";

import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";

type TeamLeaderMember = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  role?: string | null;
  portfolioCount?: number;
  authorizedPortfolioCount?: number;
  poolPortfolioCount?: number;
  performanceScore?: number;
};

type TeamLeaderDashboard = {
  team?: {
    id?: string;
    name?: string | null;
    officeName?: string | null;
    leaderName?: string | null;
  } | null;
  kpi?: {
    memberCount?: number;
    portfolioCount?: number;
    authorizedPortfolioCount?: number;
    poolPortfolioCount?: number;
    kontorUsage?: number;
    performanceScore?: number;
  } | null;
  quality?: {
    missingPhotoCount?: number;
    missingDocumentCount?: number;
    missingLocationCount?: number;
    unauthorizedPortfolioCount?: number;
  } | null;
  members?: TeamLeaderMember[];
  reports?: {
    thisWeek?: number;
    thisMonth?: number;
    last30Days?: number;
  } | null;
};

const fallbackDashboard: TeamLeaderDashboard = {
  team: {
    name: "Takım Lideri CRM",
    officeName: "Ofis bilgisi bekleniyor",
    leaderName: "Takım Lideri",
  },
  kpi: {
    memberCount: 0,
    portfolioCount: 0,
    authorizedPortfolioCount: 0,
    poolPortfolioCount: 0,
    kontorUsage: 0,
    performanceScore: 0,
  },
  quality: {
    missingPhotoCount: 0,
    missingDocumentCount: 0,
    missingLocationCount: 0,
    unauthorizedPortfolioCount: 0,
  },
  reports: {
    thisWeek: 0,
    thisMonth: 0,
    last30Days: 0,
  },
  members: [],
};

function numberValue(value?: number | null) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function fullName(member?: TeamLeaderMember | null) {
  if (!member) return "Danışman";
  const name = `${member.firstName || ""} ${member.lastName || ""}`.trim();
  return name || member.email || "Danışman";
}

function initials(member?: TeamLeaderMember | null) {
  const name = fullName(member);
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((item) => item.charAt(0))
    .join("")
    .toLocaleUpperCase("tr-TR") || "TL";
}

export default function TeamLeaderCrmDashboardPage() {
  const router = useRouter();
  const { user, hasHydrated } = useAuthStore();

  const [dashboard, setDashboard] = useState<TeamLeaderDashboard>(fallbackDashboard);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const role = String(user?.role || "").toUpperCase();
  const canEnter = role === "EMLAKCI" || role === "ADMIN" || role === "SUPER_ADMIN";

  useEffect(() => {
    if (!hasHydrated) return;

    if (!user) {
      router.push("/giris");
      return;
    }

    if (!canEnter) {
      router.push("/crm");
      return;
    }

    loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasHydrated, user?.id, user?.role]);

  async function loadDashboard() {
    setLoading(true);
    setError("");

    try {
      const response = await api.get(`/team-leader-crm/dashboard?t=${Date.now()}`);
      setDashboard({ ...fallbackDashboard, ...(response.data || {}) });
    } catch (err: any) {
      setError(err?.response?.data?.message || "Takım lideri verileri yüklenemedi.");
      setDashboard(fallbackDashboard);
    } finally {
      setLoading(false);
    }
  }

  const kpi = dashboard.kpi || fallbackDashboard.kpi!;
  const quality = dashboard.quality || fallbackDashboard.quality!;
  const reports = dashboard.reports || fallbackDashboard.reports!;
  const members = Array.isArray(dashboard.members) ? dashboard.members : [];

  const qualityTotal = useMemo(() => {
    return (
      numberValue(quality.missingPhotoCount) +
      numberValue(quality.missingDocumentCount) +
      numberValue(quality.missingLocationCount) +
      numberValue(quality.unauthorizedPortfolioCount)
    );
  }, [quality]);

  if (!hasHydrated || loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F4F8FF] text-[#1F2937]">
        <div className="text-center">
          <Loader2 className="mx-auto animate-spin text-[#2563EB]" size={30} />
          <p className="mt-3 text-[12px] font-black uppercase tracking-[0.18em] text-slate-400">
            Takım Lideri CRM
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F4F8FF] pb-[calc(90px+env(safe-area-inset-bottom))] text-[#1F2937]">
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
              <h1 className="text-[20px] font-black tracking-[-0.04em] text-[#1F2937]">
                CRM Takım Lideri
              </h1>
              <p className="truncate text-[12px] font-bold text-slate-500">
                {dashboard.team?.officeName || "Ofis"} • {dashboard.team?.name || "Takım"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={loadDashboard}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[#C7D6E8] bg-white text-[#1F2937] shadow-sm"
            aria-label="Yenile"
          >
            <RefreshCw size={17} />
          </button>
        </div>
      </header>

      <section className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-3 py-3 lg:px-6">
        {error ? (
          <div className="rounded-2xl border border-amber-100 bg-amber-50 p-3 text-center text-[13px] font-black text-amber-700">
            {error}
          </div>
        ) : null}

        <section className="overflow-hidden rounded-[28px] border border-[#C7D6E8] bg-white shadow-sm">
          <div className="bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-4 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-[#2563EB] text-white shadow-sm">
              <Sparkles size={26} />
            </div>
            <h2 className="mt-3 text-[22px] font-black tracking-[-0.04em] text-[#1F2937]">
              Lina Takım Koçu
            </h2>
            <p className="mx-auto mt-2 max-w-2xl text-[13px] font-bold leading-6 text-slate-600">
              Takım performansını, portföy kalitesini ve danışman üretkenliğini tek ekrandan takip et.
              Eksik alanlara odaklan, güçlü portföyleri havuza taşı, ekibini daha hızlı büyüt.
            </p>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
          <KpiCard label="Takım Üyesi" value={numberValue(kpi.memberCount)} icon={<UsersRound size={19} />} />
          <KpiCard label="Portföy" value={numberValue(kpi.portfolioCount)} icon={<Home size={19} />} />
          <KpiCard label="Yetkili" value={numberValue(kpi.authorizedPortfolioCount)} icon={<ShieldCheck size={19} />} />
          <KpiCard label="Havuz" value={numberValue(kpi.poolPortfolioCount)} icon={<Building2 size={19} />} />
          <KpiCard label="Performans" value={`${numberValue(kpi.performanceScore)}/100`} icon={<TrendingUp size={19} />} />
          <KpiCard label="Kontör" value={numberValue(kpi.kontorUsage)} icon={<WalletCards size={19} />} />
        </section>

        <section className="grid gap-3 lg:grid-cols-[0.95fr_1.05fr]">
          <Panel title="Hızlı İşlemler" actionText="4 aksiyon">
            <div className="grid grid-cols-2 gap-2">
              <ActionCard title="Danışman Ekle" desc="Takıma yeni üye ata" icon={<UserPlus size={19} />} />
              <ActionCard title="Portföy Kalitesi" desc="Eksikleri incele" icon={<CheckCircle2 size={19} />} />
              <ActionCard title="Takım Raporu" desc="Haftalık özeti gör" icon={<BarChart3 size={19} />} />
              <ActionCard title="Takım Mesajları" desc="Ofis içi iletişim" icon={<MessageCircle size={19} />} />
            </div>
          </Panel>

          <Panel title="Takım Kalite Merkezi" actionText={qualityTotal ? `${qualityTotal} uyarı` : "Temiz"}>
            <div className="grid grid-cols-2 gap-2">
              <QualityCard label="Eksik Fotoğraf" value={numberValue(quality.missingPhotoCount)} />
              <QualityCard label="Eksik Belge" value={numberValue(quality.missingDocumentCount)} />
              <QualityCard label="Eksik Konum" value={numberValue(quality.missingLocationCount)} />
              <QualityCard label="Yetkisiz Portföy" value={numberValue(quality.unauthorizedPortfolioCount)} />
            </div>
          </Panel>
        </section>

        <section className="grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
          <Panel title="Danışman Performansı" actionText={`${members.length} danışman`}>
            <div className="space-y-2">
              {members.length ? (
                members.map((member) => (
                  <div key={member.id} className="rounded-3xl border border-[#C7D6E8] bg-[#F8FAFC] p-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-[12px] font-black text-slate-700 shadow-sm">
                        {initials(member)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-black text-[#1F2937]">
                          {fullName(member)}
                        </span>
                        <span className="block truncate text-[11px] font-bold text-slate-500">
                          {member.email || "E-posta yok"}
                        </span>
                      </span>
                      <span className="rounded-full bg-blue-50 px-2 py-1 text-[11px] font-black text-blue-700">
                        {numberValue(member.performanceScore)}/100
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      <MiniStat label="Portföy" value={numberValue(member.portfolioCount)} />
                      <MiniStat label="Yetkili" value={numberValue(member.authorizedPortfolioCount)} />
                      <MiniStat label="Havuz" value={numberValue(member.poolPortfolioCount)} />
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState text="Henüz danışman performans verisi yok." />
              )}
            </div>
          </Panel>

          <Panel title="Takım Raporları" actionText="Özet">
            <div className="space-y-2">
              <ReportRow label="Bu Hafta" value={numberValue(reports.thisWeek)} />
              <ReportRow label="Bu Ay" value={numberValue(reports.thisMonth)} />
              <ReportRow label="Son 30 Gün" value={numberValue(reports.last30Days)} />
              <div className="rounded-3xl border border-[#C7D6E8] bg-[#F8FAFC] p-3 text-center">
                <BellRing className="mx-auto text-[#2563EB]" size={24} />
                <p className="mt-2 text-[13px] font-black text-[#1F2937]">Lina önerisi</p>
                <p className="mt-1 text-[12px] font-bold leading-5 text-slate-500">
                  En düşük performanslı danışmandan başlayarak eksik portföy bilgilerini tamamlat.
                </p>
              </div>
            </div>
          </Panel>
        </section>
      </section>
    </main>
  );
}

function Panel({ title, actionText, children }: { title: string; actionText?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-[#C7D6E8] bg-white p-3 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-[16px] font-black text-[#1F2937]">{title}</h2>
        {actionText ? <span className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-black text-blue-700">{actionText}</span> : null}
      </div>
      {children}
    </section>
  );
}

function KpiCard({ label, value, icon }: { label: string; value: number | string; icon: React.ReactNode }) {
  return (
    <div className="min-h-[104px] rounded-3xl border border-[#C7D6E8] bg-white p-3 text-center shadow-sm">
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-[#2563EB]">{icon}</div>
      <p className="mt-2 text-[11px] font-black uppercase text-slate-500">{label}</p>
      <p className="mt-1 text-[20px] font-black text-[#1F2937]">{value}</p>
    </div>
  );
}

function ActionCard({ title, desc, icon }: { title: string; desc: string; icon: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={() => window.alert("Bu aksiyon Paket-6 sonrası gerçek iş akışına bağlanacak.")}
      className="min-h-[96px] rounded-3xl border border-[#C7D6E8] bg-[#F8FAFC] p-3 text-left shadow-sm"
    >
      <div className="flex items-start gap-2">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-[#2563EB] shadow-sm">{icon}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-black text-[#1F2937]">{title}</span>
          <span className="mt-1 block text-[11px] font-bold leading-4 text-slate-500">{desc}</span>
        </span>
        <ChevronRight className="shrink-0 text-slate-400" size={16} />
      </div>
    </button>
  );
}

function QualityCard({ label, value }: { label: string; value: number }) {
  const clean = value === 0;
  return (
    <div className={`rounded-3xl border p-3 text-center ${clean ? "border-emerald-100 bg-emerald-50" : "border-amber-100 bg-amber-50"}`}>
      <p className={`text-[20px] font-black ${clean ? "text-emerald-700" : "text-amber-700"}`}>{value}</p>
      <p className={`mt-1 text-[11px] font-black ${clean ? "text-emerald-700" : "text-amber-700"}`}>{label}</p>
    </div>
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

function ReportRow({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#C7D6E8] bg-[#F8FAFC] p-3">
      <span className="text-[13px] font-black text-[#1F2937]">{label}</span>
      <span className="rounded-full bg-white px-3 py-1 text-[12px] font-black text-[#2563EB] shadow-sm">{value}</span>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-[#C7D6E8] bg-[#F8FAFC] p-6 text-center">
      <MapPin className="mx-auto text-slate-400" size={30} />
      <p className="mt-3 text-[13px] font-black text-slate-600">{text}</p>
    </div>
  );
}
