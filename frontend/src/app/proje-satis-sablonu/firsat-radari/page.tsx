"use client";

import {
  ArrowLeft,
  Building2,
  CircleAlert,
  Loader2,
  RadioTower,
  RefreshCw,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import api from "@/lib/api";

type ProjectListItem = {
  id: string;
  name: string;
  code?: string | null;
  city?: string | null;
  district?: string | null;
  neighborhood?: string | null;
  isActive?: boolean;
  declaredSalesInventoryCount?: number | null;
  _count?: {
    units?: number;
  };
};

type RadarUnit = {
  unitId: string;
  inventoryCode?: string | null;
  type: string;
  status: string;
  blockCode?: string | null;
  floorLabel?: string | null;
  number?: string | null;
  roomCount?: string | null;
  price: number;
  priceCurrency: string;
  opportunityCount: number;
  bestMatchScore?: number | null;
  topMatches: Array<{
    matchScore: number;
    matchLevel?: string;
    matchReasons?: string[];
    customerId?: string;
    customerName?: string;
    interestId?: string;
    requestId?: string;
    requestTitle?: string;
    requestType?: string;
    urgency?: string | null;
  }>;
};

type CrmRadarResponse = {
  generatedAt: string;
  project: {
    id: string;
    name: string;
    code?: string | null;
    city?: string | null;
    district?: string | null;
    neighborhood?: string | null;
  };
  summary: {
    salesInventoryCount: number;
    activeBuyerInterestCount: number;
    matchedPairCount: number;
    strongOpportunityCount: number;
    perfectOpportunityCount: number;
    matchedUnitCount: number;
    matchedCustomerCount: number;
    unitsWithoutBuyerMatchCount: number;
    unpricedUnitCount: number;
  };
  unitRadar: RadarUnit[];
};

type RequestRadarResponse = {
  generatedAt: string;
  project: {
    id: string;
    name: string;
    code?: string | null;
    city?: string | null;
    district?: string | null;
    neighborhood?: string | null;
  };
  summary: {
    salesInventoryCount: number;
    activeRequestCount: number;
    matchedPairCount: number;
    strongOpportunityCount: number;
    perfectOpportunityCount: number;
    matchedUnitCount: number;
    matchedRequestCount: number;
    unitsWithoutRequestMatchCount: number;
    unpricedUnitCount: number;
  };
  unitRadar: RadarUnit[];
};

type CombinedUnit = {
  unitId: string;
  inventoryCode?: string | null;
  type: string;
  status: string;
  blockCode?: string | null;
  floorLabel?: string | null;
  number?: string | null;
  roomCount?: string | null;
  price: number;
  priceCurrency: string;
  crmCount: number;
  requestCount: number;
  totalCount: number;
  bestScore: number | null;
  crmMatches: RadarUnit["topMatches"];
  requestMatches: RadarUnit["topMatches"];
};

type RadarTab = "ALL" | "CRM" | "REQUEST";

export default function ProjectSalesOpportunityRadarPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [crmRadar, setCrmRadar] = useState<CrmRadarResponse | null>(null);
  const [requestRadar, setRequestRadar] = useState<RequestRadarResponse | null>(null);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingRadar, setLoadingRadar] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<RadarTab>("ALL");

  const loadProjects = useCallback(async () => {
    setLoadingProjects(true);
    setError("");

    try {
      const response = await api.get<ProjectListItem[]>("/project-sales/projects");
      const items = Array.isArray(response.data) ? response.data : [];
      setProjects(items);
      setSelectedProjectId((current) => {
        if (current && items.some((project) => project.id === current)) {
          return current;
        }
        return items[0]?.id || "";
      });
    } catch {
      setProjects([]);
      setSelectedProjectId("");
      setError("Projeler yüklenemedi. Lütfen tekrar deneyin.");
    } finally {
      setLoadingProjects(false);
    }
  }, []);

  const loadRadar = useCallback(async (projectId: string) => {
    if (!projectId) {
      setCrmRadar(null);
      setRequestRadar(null);
      return;
    }

    setLoadingRadar(true);
    setError("");

    try {
      const [crmResult, requestResult] = await Promise.all([
        api.get<CrmRadarResponse>(
          `/project-sales/projects/${projectId}/crm-opportunities`,
          { params: { limit: 500 } },
        ),
        api.get<RequestRadarResponse>(
          `/project-sales/projects/${projectId}/request-opportunities`,
          { params: { limit: 500 } },
        ),
      ]);

      setCrmRadar(crmResult.data);
      setRequestRadar(requestResult.data);
    } catch {
      setCrmRadar(null);
      setRequestRadar(null);
      setError("Fırsat radarı oluşturulamadı. Proje erişimini ve stok bilgilerini kontrol edin.");
    } finally {
      setLoadingRadar(false);
    }
  }, []);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    if (selectedProjectId) {
      void loadRadar(selectedProjectId);
    }
  }, [loadRadar, selectedProjectId]);

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) || null,
    [projects, selectedProjectId],
  );

  const combinedUnits = useMemo<CombinedUnit[]>(() => {
    const unitMap = new Map<string, CombinedUnit>();

    const absorb = (unit: RadarUnit, source: "CRM" | "REQUEST") => {
      const current = unitMap.get(unit.unitId) || {
        unitId: unit.unitId,
        inventoryCode: unit.inventoryCode,
        type: unit.type,
        status: unit.status,
        blockCode: unit.blockCode,
        floorLabel: unit.floorLabel,
        number: unit.number,
        roomCount: unit.roomCount,
        price: Number(unit.price || 0),
        priceCurrency: unit.priceCurrency || "TRY",
        crmCount: 0,
        requestCount: 0,
        totalCount: 0,
        bestScore: null,
        crmMatches: [],
        requestMatches: [],
      } satisfies CombinedUnit;

      if (source === "CRM") {
        current.crmCount = Number(unit.opportunityCount || 0);
        current.crmMatches = unit.topMatches || [];
      } else {
        current.requestCount = Number(unit.opportunityCount || 0);
        current.requestMatches = unit.topMatches || [];
      }

      current.totalCount = current.crmCount + current.requestCount;
      const score = unit.bestMatchScore == null ? null : Number(unit.bestMatchScore);
      if (score !== null && (current.bestScore === null || score > current.bestScore)) {
        current.bestScore = score;
      }

      unitMap.set(unit.unitId, current);
    };

    for (const unit of crmRadar?.unitRadar || []) absorb(unit, "CRM");
    for (const unit of requestRadar?.unitRadar || []) absorb(unit, "REQUEST");

    return Array.from(unitMap.values())
      .filter((unit) => {
        if (tab === "CRM") return unit.crmCount > 0;
        if (tab === "REQUEST") return unit.requestCount > 0;
        return unit.totalCount > 0;
      })
      .sort((left, right) => {
        if (right.totalCount !== left.totalCount) return right.totalCount - left.totalCount;
        return (right.bestScore || 0) - (left.bestScore || 0);
      });
  }, [crmRadar, requestRadar, tab]);

  const totals = useMemo(() => {
    const crm = crmRadar?.summary;
    const request = requestRadar?.summary;

    return {
      inventory: Math.max(crm?.salesInventoryCount || 0, request?.salesInventoryCount || 0),
      crmPairs: crm?.matchedPairCount || 0,
      requestPairs: request?.matchedPairCount || 0,
      strong: (crm?.strongOpportunityCount || 0) + (request?.strongOpportunityCount || 0),
      perfect: (crm?.perfectOpportunityCount || 0) + (request?.perfectOpportunityCount || 0),
      crmPeople: crm?.matchedCustomerCount || 0,
      requestCount: request?.matchedRequestCount || 0,
    };
  }, [crmRadar, requestRadar]);

  return (
    <main className="min-h-[100dvh] bg-[#F4F8FF] px-3 pb-[calc(110px+env(safe-area-inset-bottom,0px))] pt-[calc(12px+env(safe-area-inset-top,0px))] text-[#1F2937]">
      <div className="mx-auto w-full max-w-5xl space-y-3">
        <header className="rounded-[24px] border border-[#C7D6E8] bg-white p-3 shadow-[0_14px_34px_rgba(15,23,42,0.06)]">
          <div className="grid grid-cols-[44px_1fr_44px] items-center gap-2">
            <button
              type="button"
              onClick={() => router.push("/proje-satis-sablonu")}
              className="flex h-11 w-11 items-center justify-center rounded-[16px] border border-[#C7D6E8] bg-white text-[#2563EB] active:scale-95"
              aria-label="Proje Satış Merkezi'ne dön"
            >
              <ArrowLeft size={20} />
            </button>

            <div className="min-w-0 text-center">
              <p className="mx-auto inline-flex rounded-full bg-[#EFF6FF] px-3 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-[#2563EB]">
                Proje Satış Merkezi
              </p>
              <h1 className="mt-2 text-center text-[23px] font-black leading-none tracking-[-0.04em] text-[#1F2937]">
                Satış Fırsat Radarı
              </h1>
              <p className="mx-auto mt-1 max-w-[620px] text-center text-[12px] font-semibold leading-5 text-[#64748B]">
                CRM müşterilerinizi ve Talep Merkezi'ndeki aktif talepleri özel proje stoğunuzla tek ekranda eşleştirir.
              </p>
            </div>

            <button
              type="button"
              onClick={() => selectedProjectId && void loadRadar(selectedProjectId)}
              disabled={!selectedProjectId || loadingRadar}
              className="flex h-11 w-11 items-center justify-center rounded-[16px] bg-[#2563EB] text-white shadow-[0_10px_24px_rgba(37,99,235,0.24)] disabled:cursor-not-allowed disabled:opacity-50 active:scale-95"
              aria-label="Radarı yenile"
            >
              <RefreshCw size={19} className={loadingRadar ? "animate-spin" : ""} />
            </button>
          </div>
        </header>

        <section className="rounded-[22px] border border-[#C7D6E8] bg-white p-3">
          <p className="text-center text-[11px] font-black uppercase tracking-[0.08em] text-[#64748B]">
            Proje seçimi
          </p>

          {loadingProjects ? (
            <div className="flex min-h-20 items-center justify-center gap-2 text-sm font-bold text-[#64748B]">
              <Loader2 size={18} className="animate-spin" /> Projeler yükleniyor
            </div>
          ) : projects.length === 0 ? (
            <div className="mt-3 rounded-[18px] bg-[#F8FAFC] p-4 text-center text-sm font-bold text-[#64748B]">
              Fırsat radarı için önce bir proje oluşturun.
            </div>
          ) : (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch]">
              {projects.map((project) => {
                const active = project.id === selectedProjectId;
                return (
                  <button
                    key={project.id}
                    type="button"
                    onClick={() => setSelectedProjectId(project.id)}
                    className={`min-w-[180px] shrink-0 rounded-[18px] border px-3 py-3 text-center transition active:scale-[0.98] ${
                      active
                        ? "border-[#2563EB] bg-[#EFF6FF] shadow-[0_8px_20px_rgba(37,99,235,0.10)]"
                        : "border-[#C7D6E8] bg-white"
                    }`}
                  >
                    <span className={`mx-auto flex h-9 w-9 items-center justify-center rounded-[13px] ${active ? "bg-[#2563EB] text-white" : "bg-[#F1F5F9] text-[#64748B]"}`}>
                      <Building2 size={18} />
                    </span>
                    <span className="mt-2 block break-words text-[13px] font-black text-[#1F2937]">
                      {project.name}
                    </span>
                    <span className="mt-1 block break-words text-[10px] font-bold text-[#64748B]">
                      {[project.city, project.district].filter(Boolean).join(" / ") || "Konum yok"}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {error ? (
          <section className="flex items-start gap-2 rounded-[20px] border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">
            <CircleAlert size={19} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </section>
        ) : null}

        {selectedProject && !error ? (
          <>
            <section className="grid grid-cols-2 gap-2 md:grid-cols-4">
              <MetricCard label="Satış Stoğu" value={totals.inventory} tone="blue" />
              <MetricCard label="CRM Eşleşmesi" value={totals.crmPairs} tone="purple" />
              <MetricCard label="Talep Eşleşmesi" value={totals.requestPairs} tone="orange" />
              <MetricCard label="%90+ Fırsat" value={totals.perfect} tone="green" />
            </section>

            <section className="rounded-[22px] border border-[#C7D6E8] bg-white p-3">
              <div className="grid grid-cols-3 gap-2">
                <RadarTabButton
                  active={tab === "ALL"}
                  onClick={() => setTab("ALL")}
                  icon={<Sparkles size={16} />}
                  label="Tümü"
                  count={totals.crmPairs + totals.requestPairs}
                />
                <RadarTabButton
                  active={tab === "CRM"}
                  onClick={() => setTab("CRM")}
                  icon={<UsersRound size={16} />}
                  label="CRM"
                  count={totals.crmPeople}
                />
                <RadarTabButton
                  active={tab === "REQUEST"}
                  onClick={() => setTab("REQUEST")}
                  icon={<RadioTower size={16} />}
                  label="Talep Merkezi"
                  count={totals.requestCount}
                />
              </div>
            </section>

            {loadingRadar ? (
              <section className="flex min-h-44 items-center justify-center rounded-[22px] border border-[#C7D6E8] bg-white">
                <div className="text-center">
                  <Loader2 size={26} className="mx-auto animate-spin text-[#2563EB]" />
                  <p className="mt-2 text-sm font-black text-[#1F2937]">Lina fırsatları tarıyor</p>
                  <p className="mt-1 text-xs font-semibold text-[#64748B]">Özel proje stoğu yayınlanmadan analiz ediliyor.</p>
                </div>
              </section>
            ) : combinedUnits.length === 0 ? (
              <section className="rounded-[22px] border border-[#C7D6E8] bg-white p-6 text-center">
                <Sparkles size={28} className="mx-auto text-[#94A3B8]" />
                <h2 className="mt-2 text-base font-black text-[#1F2937]">Şu anda eşleşme yok</h2>
                <p className="mx-auto mt-1 max-w-lg text-xs font-semibold leading-5 text-[#64748B]">
                  Stok fiyatlarını ve bağımsız bölüm bilgilerini tamamlayın. Yeni CRM müşterileri ve Talep Merkezi talepleri geldikçe radar sonucu değişir.
                </p>
              </section>
            ) : (
              <section className="space-y-2">
                <div className="px-1 text-center">
                  <h2 className="text-[17px] font-black tracking-[-0.03em] text-[#1F2937]">Öncelikli Stok Fırsatları</h2>
                  <p className="mt-1 text-[11px] font-semibold text-[#64748B]">
                    En çok eşleşen bağımsız bölümler üstte gösterilir.
                  </p>
                </div>

                {combinedUnits.map((unit) => (
                  <UnitOpportunityCard key={unit.unitId} unit={unit} />
                ))}
              </section>
            )}
          </>
        ) : null}
      </div>
    </main>
  );
}

function MetricCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "blue" | "purple" | "orange" | "green";
}) {
  const styles = {
    blue: "border-blue-200 bg-blue-50 text-blue-700",
    purple: "border-violet-200 bg-violet-50 text-violet-700",
    orange: "border-orange-200 bg-orange-50 text-orange-700",
    green: "border-emerald-200 bg-emerald-50 text-emerald-700",
  };

  return (
    <div className={`rounded-[20px] border p-3 text-center ${styles[tone]}`}>
      <p className="text-[24px] font-black leading-none">{value.toLocaleString("tr-TR")}</p>
      <p className="mt-1 break-words text-[10px] font-black uppercase tracking-[0.05em]">{label}</p>
    </div>
  );
}

function RadarTabButton({
  active,
  onClick,
  icon,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-[64px] flex-col items-center justify-center rounded-[17px] border px-2 text-center transition active:scale-[0.98] ${
        active
          ? "border-[#2563EB] bg-[#2563EB] text-white"
          : "border-[#C7D6E8] bg-[#F8FAFC] text-[#475569]"
      }`}
    >
      <span className="flex items-center gap-1.5 text-[11px] font-black">
        {icon} {label}
      </span>
      <span className="mt-1 text-[16px] font-black leading-none">{count.toLocaleString("tr-TR")}</span>
    </button>
  );
}

function UnitOpportunityCard({ unit }: { unit: CombinedUnit }) {
  const title = unit.inventoryCode || [unit.blockCode, unit.number].filter(Boolean).join("-") || "Bağımsız Bölüm";
  const detail = [unit.type, unit.roomCount, unit.floorLabel].filter(Boolean).join(" • ");

  return (
    <article className="rounded-[22px] border border-[#C7D6E8] bg-white p-3 shadow-[0_10px_26px_rgba(15,23,42,0.045)]">
      <div className="grid grid-cols-[1fr_auto] items-start gap-3">
        <div className="min-w-0">
          <p className="break-words text-[16px] font-black leading-5 text-[#1F2937]">{title}</p>
          <p className="mt-1 break-words text-[11px] font-bold text-[#64748B]">{detail || unit.status}</p>
          <p className="mt-2 text-[15px] font-black text-[#2563EB]">{formatMoney(unit.price, unit.priceCurrency)}</p>
        </div>

        <div className="rounded-[16px] bg-[#EFF6FF] px-3 py-2 text-center text-[#2563EB]">
          <p className="text-[20px] font-black leading-none">{unit.totalCount}</p>
          <p className="mt-1 text-[9px] font-black uppercase">Fırsat</p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <MiniStat label="CRM" value={unit.crmCount} />
        <MiniStat label="Talep" value={unit.requestCount} />
        <MiniStat label="En İyi" value={unit.bestScore == null ? "–" : `%${unit.bestScore}`} />
      </div>

      {unit.crmMatches.length > 0 ? (
        <MatchGroup title="CRM müşterileri" tone="purple" matches={unit.crmMatches} />
      ) : null}

      {unit.requestMatches.length > 0 ? (
        <MatchGroup title="Talep Merkezi" tone="orange" matches={unit.requestMatches} />
      ) : null}
    </article>
  );
}

function MiniStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-[15px] border border-[#E2E8F0] bg-[#F8FAFC] px-2 py-2 text-center">
      <p className="text-[14px] font-black text-[#1F2937]">{value}</p>
      <p className="mt-0.5 text-[9px] font-black uppercase tracking-[0.05em] text-[#94A3B8]">{label}</p>
    </div>
  );
}

function MatchGroup({
  title,
  tone,
  matches,
}: {
  title: string;
  tone: "purple" | "orange";
  matches: RadarUnit["topMatches"];
}) {
  const classes =
    tone === "purple"
      ? "border-violet-100 bg-violet-50/70"
      : "border-orange-100 bg-orange-50/70";

  return (
    <div className={`mt-3 rounded-[17px] border p-2.5 ${classes}`}>
      <p className="text-center text-[10px] font-black uppercase tracking-[0.06em] text-[#64748B]">{title}</p>
      <div className="mt-2 space-y-1.5">
        {matches.slice(0, 3).map((match, index) => {
          const label = match.customerName || match.requestTitle || `Eşleşme ${index + 1}`;
          return (
            <div key={`${label}-${index}`} className="grid grid-cols-[1fr_auto] items-start gap-2 rounded-[13px] bg-white px-2.5 py-2">
              <div className="min-w-0">
                <p className="break-words text-[11px] font-black text-[#1F2937]">{label}</p>
                {match.matchReasons?.[0] ? (
                  <p className="mt-0.5 break-words text-[9px] font-semibold leading-4 text-[#64748B]">{match.matchReasons[0]}</p>
                ) : null}
              </div>
              <span className="rounded-full bg-[#EFF6FF] px-2 py-1 text-[10px] font-black text-[#2563EB]">%{match.matchScore}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatMoney(value: number, currency: string) {
  const suffix = currency === "TRY" ? "TL" : currency;
  return `${Number(value || 0).toLocaleString("tr-TR")} ${suffix}`;
}
