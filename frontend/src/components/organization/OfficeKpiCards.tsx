"use client";

import { useEffect, useState } from "react";
import {
  BarChart3,
  Building2,
  CheckCircle2,
  Home,
  Loader2,
  UsersRound,
  Waves,
} from "lucide-react";

import api from "@/lib/api";

type OfficeKpi = {
  officeId?: string;
  officeName?: string;
  activeTeamCount: number;
  memberCount: number;
  portfolioCount: number;
  authorizedPortfolioCount: number;
  poolPortfolioCount: number;
  performanceScore: number;
};

type OfficeKpiCardsProps = {
  officeId: string;
};

const EMPTY_KPI: OfficeKpi = {
  activeTeamCount: 0,
  memberCount: 0,
  portfolioCount: 0,
  authorizedPortfolioCount: 0,
  poolPortfolioCount: 0,
  performanceScore: 0,
};

export default function OfficeKpiCards({ officeId }: OfficeKpiCardsProps) {
  const [kpi, setKpi] = useState<OfficeKpi>(EMPTY_KPI);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;

    async function loadKpi() {
      if (!officeId) return;

      setLoading(true);
      setError("");

      try {
        const response = await api.get(`/organization/offices/${officeId}/kpi?t=${Date.now()}`);
        if (!alive) return;

        setKpi({
          officeId: response.data?.officeId || officeId,
          officeName: response.data?.officeName || "",
          activeTeamCount: Number(response.data?.activeTeamCount || 0),
          memberCount: Number(response.data?.memberCount || 0),
          portfolioCount: Number(response.data?.portfolioCount || 0),
          authorizedPortfolioCount: Number(response.data?.authorizedPortfolioCount || 0),
          poolPortfolioCount: Number(response.data?.poolPortfolioCount || 0),
          performanceScore: Number(response.data?.performanceScore || 0),
        });
      } catch (err: any) {
        if (!alive) return;
        setError(err?.response?.data?.message || "Ofis KPI verileri alınamadı.");
        setKpi(EMPTY_KPI);
      } finally {
        if (alive) setLoading(false);
      }
    }

    loadKpi();

    return () => {
      alive = false;
    };
  }, [officeId]);

  if (loading) {
    return (
      <div className="mt-3 flex min-h-[76px] items-center justify-center rounded-2xl border border-[#C7D6E8] bg-white text-slate-500">
        <Loader2 className="animate-spin" size={18} />
        <span className="ml-2 text-[12px] font-black">Ofis KPI yükleniyor</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-3 rounded-2xl border border-red-100 bg-red-50 p-3 text-center text-[12px] font-black text-red-700">
        {error}
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-3xl border border-[#C7D6E8] bg-white p-2">
      <div className="mb-2 flex items-center justify-between gap-2 px-1">
        <p className="text-[12px] font-black text-[#1F2937]">Ofis KPI</p>
        <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-black text-emerald-700">
          {kpi.performanceScore}/100 Puan
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <KpiMiniCard label="Takım" value={kpi.activeTeamCount} icon={<Building2 size={15} />} />
        <KpiMiniCard label="Danışman" value={kpi.memberCount} icon={<UsersRound size={15} />} />
        <KpiMiniCard label="Portföy" value={kpi.portfolioCount} icon={<Home size={15} />} />
        <KpiMiniCard label="Yetkili" value={kpi.authorizedPortfolioCount} icon={<CheckCircle2 size={15} />} />
        <KpiMiniCard label="Havuz" value={kpi.poolPortfolioCount} icon={<Waves size={15} />} centered />
      </div>

      <div className="mt-2 rounded-2xl bg-[#F8FAFC] p-2">
        <div className="mb-1 flex items-center justify-between text-[11px] font-black text-slate-600">
          <span className="flex items-center gap-1">
            <BarChart3 size={14} />
            Ofis Performansı
          </span>
          <span>{kpi.performanceScore}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-[#2563EB]"
            style={{ width: `${Math.min(100, Math.max(0, kpi.performanceScore))}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function KpiMiniCard({
  label,
  value,
  icon,
  centered,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  centered?: boolean;
}) {
  return (
    <div className={`rounded-2xl border border-[#C7D6E8] bg-[#F8FAFC] p-2 text-center ${centered ? "col-span-2 mx-auto w-[50%]" : ""}`}>
      <div className="mx-auto flex h-7 w-7 items-center justify-center rounded-xl bg-white text-[#2563EB]">
        {icon}
      </div>
      <p className="mt-1 text-[10px] font-black uppercase text-slate-500">{label}</p>
      <p className="text-[16px] font-black text-[#1F2937]">{value}</p>
    </div>
  );
}
