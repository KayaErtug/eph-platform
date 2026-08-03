"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Copy,
  ExternalLink,
  Filter,
  Layers3,
  MapPin,
  MessageCircle,
  RefreshCw,
  Share2,
  Store,
  Trash2,
  Users,
  X,
} from "lucide-react";

import api from "@/lib/api";
import CustomerPresentationSheet from "@/components/presentation/CustomerPresentationSheet";

type PoolProjectUnit = {
  id: string;
  title: string;
  blockId?: string | null;
  blockCode?: string | null;
  blockName?: string | null;
  floor?: number | null;
  floorLabel?: string | null;
  totalFloors?: number | null;
  number?: string | null;
  type: string;
  typeLabel: string;
  status: string;
  statusLabel: string;
  availabilityGroup: "AVAILABLE" | "RESERVED" | "CLOSED" | "OTHER";
  roomCount?: string | null;
  area?: number | null;
  netArea?: number | null;
  grossArea?: number | null;
  price?: number | null;
  priceCurrency?: string | null;
  coverUrl?: string | null;
  match?: {
    score: number;
    customerId?: string | null;
    reasons?: string[];
  } | null;
};

type PoolProject = {
  id: string;
  kind: "PROJECT";
  name: string;
  code?: string | null;
  description?: string | null;
  city?: string | null;
  district?: string | null;
  neighborhood?: string | null;
  address?: string | null;
  locationLabel: string;
  latitude?: number | null;
  longitude?: number | null;
  completionPercent?: number | null;
  deliveryDate?: string | null;
  ownerRole?: string | null;
  blockCount: number;
  blocks: Array<{
    id: string;
    code: string;
    name: string;
    floorCount: number;
  }>;
  spaces: Array<{
    id: string;
    name: string;
    type: string;
    grossArea?: number | null;
    description?: string | null;
  }>;
  metrics: {
    totalUnits: number;
    availableUnits: number;
    reservedUnits: number;
    closedUnits: number;
  };
  typeBreakdown: Array<{
    type: string;
    label: string;
    count: number;
    availableCount: number;
    reservedCount: number;
    soldCount: number;
    minPrice?: number | null;
    maxPrice?: number | null;
  }>;
  roomCounts: string[];
  priceRange: {
    min?: number | null;
    max?: number | null;
    currency?: string | null;
  };
  coverUrl?: string | null;
  images?: string[];
  representativeUnitId?: string | null;
  crmMatch: {
    matchedCustomerCount: number;
    matchedUnitCount: number;
    bestScore: number;
    topMatches: Array<{
      customerId: string;
      customerName: string;
      matchedUnitCount: number;
      bestScore: number;
    }>;
  };
  publishedAt?: string | null;
  updatedAt: string;
  units: PoolProjectUnit[];
};

type PresentationLink = {
  id: string;
  token: string;
  projectId: string;
  durationHours: number;
  expiresAt: string;
  revokedAt?: string | null;
  viewCount: number;
  whatsappClickCount: number;
  lastViewedAt?: string | null;
  status: "ACTIVE" | "EXPIRED" | "REVOKED";
  url: string;
};

const DURATION_OPTIONS = [
  { value: 24, label: "24 Saat" },
  { value: 72, label: "3 Gün" },
  { value: 168, label: "7 Gün" },
  { value: 336, label: "14 Gün" },
];

function formatMoney(value?: number | null, currency = "TRY") {
  const amount = Number(value || 0);
  if (!amount) return "Fiyat sorunuz";

  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: currency === "TL" ? "TRY" : currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function projectSearchText(project: PoolProject) {
  return [
    project.name,
    project.code,
    project.city,
    project.district,
    project.neighborhood,
    project.address,
    ...project.typeBreakdown.map((item) => item.label),
    ...project.roomCounts,
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase("tr-TR");
}

function getConversationId(data: any) {
  return (
    data?.conversationId ||
    data?.conversation?.id ||
    data?.id ||
    data?.data?.conversationId ||
    data?.data?.id ||
    ""
  );
}

export default function PoolProjectCenter({
  search,
  viewMode,
  canUsePoolActions,
  actionLockMessage,
  onCountChange,
}: {
  search: string;
  viewMode: "LIST" | "MAP";
  canUsePoolActions: boolean;
  actionLockMessage: string;
  onCountChange?: (count: number) => void;
}) {
  const router = useRouter();
  const [projects, setProjects] = useState<PoolProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [presentationProject, setPresentationProject] = useState<PoolProject | null>(
    null,
  );
  const [busyProjectId, setBusyProjectId] = useState("");

  useEffect(() => {
    let alive = true;

    api
      .get<PoolProject[]>("/pool-projects")
      .then((response) => {
        if (!alive) return;
        const next = Array.isArray(response.data) ? response.data : [];
        setProjects(next);
        onCountChange?.(next.length);
        setError("");
      })
      .catch((requestError) => {
        if (!alive) return;
        setError(
          requestError?.response?.data?.message ||
            "Proje Havuzu şu anda yüklenemedi.",
        );
        onCountChange?.(0);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [onCountChange]);

  const filteredProjects = useMemo(() => {
    const query = search.toLocaleLowerCase("tr-TR").trim();
    if (!query) return projects;
    return projects.filter((project) => projectSearchText(project).includes(query));
  }, [projects, search]);

  const startProjectMessage = async (project: PoolProject) => {
    if (!canUsePoolActions) {
      setError(actionLockMessage);
      return;
    }
    if (!project.representativeUnitId || busyProjectId) return;

    setBusyProjectId(project.id);
    setError("");

    try {
      const response = await api.post(
        `/units/pool/${project.representativeUnitId}/message`,
        {
          message: `Merhaba, ${project.name} projesinin satış stoku hakkında iletişime geçmek istiyorum.`,
          matchScore: project.crmMatch.bestScore,
        },
      );
      const conversationId = getConversationId(response.data);
      router.push(conversationId ? `/messages/${conversationId}` : "/messages");
    } catch (requestError: any) {
      setError(
        requestError?.response?.data?.message ||
          "Proje için iletişim başlatılamadı.",
      );
    } finally {
      setBusyProjectId("");
    }
  };

  if (loading) {
    return (
      <section className="rounded-[24px] border-2 border-[#BFDBFE] bg-white p-4 text-center shadow-sm">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-[#2563EB] border-t-transparent" />
        <p className="mt-2 text-[11px] font-black text-[#64748B]">
          Proje Havuzu hazırlanıyor...
        </p>
      </section>
    );
  }

  if (!projects.length && !error) return null;

  return (
    <>
      <section className="space-y-3">
        <div className="rounded-[24px] border-2 border-[#93C5FD] bg-[linear-gradient(145deg,#FFFFFF_0%,#EFF6FF_55%,#F0FDFA_100%)] p-3 shadow-[0_16px_34px_rgba(37,99,235,0.10)]">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] bg-[#2563EB] text-white shadow-sm">
                <Layers3 size={21} />
              </span>
              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase tracking-[0.13em] text-[#2563EB]">
                  Proje Satış Havuzu
                </p>
                <h2 className="truncate text-[17px] font-black text-[#0F172A]">
                  Büyük Projeler Tek Kartta
                </h2>
                <p className="mt-0.5 text-[9.5px] font-bold text-[#64748B]">
                  {filteredProjects.length} proje · bağımsız bölümler proje içinde
                </p>
              </div>
            </div>
            <span className="rounded-full border border-[#93C5FD] bg-white px-2.5 py-1 text-[10px] font-black text-[#1D4ED8]">
              {projects.length}
            </span>
          </div>
        </div>

        {error && (
          <div className="rounded-[18px] border-2 border-red-200 bg-red-50 px-3 py-2 text-center text-[11px] font-black text-red-700">
            {error}
          </div>
        )}

        {viewMode === "MAP" && filteredProjects.length > 0 && (
          <PoolProjectMap
            projects={filteredProjects}
            onSelect={(project) => setSelectedProjectId(project.id)}
          />
        )}

        {filteredProjects.map((project) => (
          <PoolProjectCard
            key={project.id}
            project={project}
            busy={busyProjectId === project.id}
            onDetail={() => setSelectedProjectId(project.id)}
            onPresentation={() => setPresentationProject(project)}
            onMessage={() => startProjectMessage(project)}
          />
        ))}
      </section>

      {selectedProjectId && (
        <PoolProjectDetailModal
          projectId={selectedProjectId}
          canUsePoolActions={canUsePoolActions}
          actionLockMessage={actionLockMessage}
          onClose={() => setSelectedProjectId("")}
          onProjectPresentation={setPresentationProject}
        />
      )}

      <ProjectPresentationSheet
        project={presentationProject}
        onClose={() => setPresentationProject(null)}
      />
    </>
  );
}

function PoolProjectCard({
  project,
  busy,
  onDetail,
  onPresentation,
  onMessage,
}: {
  project: PoolProject;
  busy: boolean;
  onDetail: () => void;
  onPresentation: () => void;
  onMessage: () => void;
}) {
  return (
    <article className="overflow-hidden rounded-[26px] border-2 border-[#93C5FD] bg-white shadow-[0_18px_40px_rgba(37,99,235,0.12)]">
      <div className="relative h-[210px] overflow-hidden bg-[#DBEAFE]">
        {project.coverUrl ? (
          <img
            src={project.coverUrl}
            alt={project.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-[linear-gradient(135deg,#DBEAFE,#F0FDFA)] text-[#2563EB]">
            <Building2 size={48} />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/85 via-slate-950/35 to-transparent px-4 pb-4 pt-16 text-white">
          <span className="inline-flex rounded-full bg-[#2563EB] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.1em]">
            İnşaat Firması Projesi
          </span>
          <h3 className="mt-2 text-[22px] font-black leading-6">{project.name}</h3>
          <p className="mt-1 flex items-center gap-1 text-[10.5px] font-bold">
            <MapPin size={13} /> {project.locationLabel}
          </p>
        </div>
      </div>

      <div className="p-3">
        <div className="grid grid-cols-4 gap-1.5 text-center">
          <ProjectMetric value={project.blockCount} label="Blok" />
          <ProjectMetric value={project.metrics.totalUnits} label="Toplam" />
          <ProjectMetric value={project.metrics.availableUnits} label="Satışta" />
          <ProjectMetric value={project.metrics.reservedUnits} label="Rezerve" />
        </div>

        <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
          {project.typeBreakdown.map((item) => (
            <span
              key={item.type}
              className="shrink-0 rounded-full border border-[#BFDBFE] bg-[#EFF6FF] px-2.5 py-1 text-[9.5px] font-black text-[#1D4ED8]"
            >
              {item.count} {item.label}
            </span>
          ))}
          {project.roomCounts.map((room) => (
            <span
              key={room}
              className="shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[9.5px] font-black text-emerald-700"
            >
              {room}
            </span>
          ))}
        </div>

        <div className="mt-2 grid grid-cols-[1fr_auto] items-center gap-2 rounded-[16px] border border-[#C7D6E8] bg-[#F8FAFC] px-3 py-2.5">
          <div>
            <p className="text-[8.5px] font-black uppercase tracking-[0.1em] text-[#64748B]">
              Fiyat Aralığı
            </p>
            <p className="mt-0.5 text-[12px] font-black text-[#0F172A]">
              {formatMoney(project.priceRange.min, project.priceRange.currency || "TRY")}
              {project.priceRange.max && project.priceRange.max !== project.priceRange.min
                ? ` – ${formatMoney(project.priceRange.max, project.priceRange.currency || "TRY")}`
                : ""}
            </p>
          </div>
          <span className="rounded-[12px] bg-white px-2 py-1.5 text-[9px] font-black text-[#64748B]">
            {project.metrics.closedUnits} satıldı
          </span>
        </div>

        <div className="mt-2 rounded-[16px] border border-[#99F6E4] bg-[#F0FDFA] px-3 py-2.5">
          <div className="flex items-center gap-2 text-[#0F766E]">
            <Users size={16} />
            <p className="text-[10.5px] font-black">
              {project.crmMatch.matchedCustomerCount} müşteriniz için {project.crmMatch.matchedUnitCount} uygun bağımsız bölüm
            </p>
          </div>
          <p className="mt-1 text-[9px] font-bold text-[#64748B]">
            En güçlü eşleşme %{project.crmMatch.bestScore}
          </p>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onDetail}
            className="flex min-h-[46px] items-center justify-center gap-1.5 rounded-[15px] bg-[#2563EB] px-3 text-[11px] font-black text-white"
          >
            <Building2 size={16} /> Projeyi İncele
          </button>
          <button
            type="button"
            onClick={onPresentation}
            className="flex min-h-[46px] items-center justify-center gap-1.5 rounded-[15px] border-2 border-emerald-400 bg-emerald-50 px-3 text-[11px] font-black text-emerald-700"
          >
            <Share2 size={16} /> Projeyi Sun
          </button>
          <button
            type="button"
            onClick={onMessage}
            disabled={busy}
            className="col-span-2 flex min-h-[44px] items-center justify-center gap-1.5 rounded-[15px] border-2 border-[#2563EB] bg-white px-3 text-[11px] font-black text-[#1D4ED8] disabled:opacity-60"
          >
            <MessageCircle size={15} />
            {busy ? "İletişim başlatılıyor..." : "İletişime Geç 3K"}
          </button>
        </div>
      </div>
    </article>
  );
}

function ProjectMetric({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-[14px] border border-[#C7D6E8] bg-[#F8FAFC] px-1 py-2">
      <strong className="block text-[17px] font-black text-[#2563EB]">{value}</strong>
      <span className="text-[8.5px] font-black text-[#64748B]">{label}</span>
    </div>
  );
}

function PoolProjectMap({
  projects,
  onSelect,
}: {
  projects: PoolProject[];
  onSelect: (project: PoolProject) => void;
}) {
  const points = projects.filter(
    (project) => Number(project.latitude) && Number(project.longitude),
  );
  const latitudes = points.map((project) => Number(project.latitude));
  const longitudes = points.map((project) => Number(project.longitude));
  const minLat = Math.min(...latitudes, 36);
  const maxLat = Math.max(...latitudes, 42);
  const minLng = Math.min(...longitudes, 26);
  const maxLng = Math.max(...longitudes, 45);
  const latRange = Math.max(maxLat - minLat, 0.5);
  const lngRange = Math.max(maxLng - minLng, 0.5);

  return (
    <div className="relative h-[290px] overflow-hidden rounded-[24px] border-2 border-[#93C5FD] bg-[radial-gradient(circle_at_25%_20%,#DBEAFE_0,transparent_35%),radial-gradient(circle_at_75%_75%,#CCFBF1_0,transparent_38%),#F8FAFC] shadow-sm">
      <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(#93C5FD_1px,transparent_1px),linear-gradient(90deg,#93C5FD_1px,transparent_1px)] [background-size:36px_36px]" />
      <div className="absolute left-3 top-3 rounded-full border border-[#BFDBFE] bg-white/95 px-3 py-1.5 text-[9.5px] font-black text-[#1D4ED8] shadow-sm">
        Proje başına tek pin · {projects.length} proje
      </div>
      {(points.length ? points : projects).map((project, index) => {
        const left = points.length
          ? 8 + ((Number(project.longitude) - minLng) / lngRange) * 84
          : 18 + ((index * 29) % 68);
        const top = points.length
          ? 12 + ((maxLat - Number(project.latitude)) / latRange) * 72
          : 28 + ((index * 23) % 48);

        return (
          <button
            type="button"
            key={project.id}
            onClick={() => onSelect(project)}
            style={{ left: `${left}%`, top: `${top}%` }}
            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-[14px] border-2 border-white bg-[#2563EB] px-2 py-1.5 text-left text-white shadow-[0_8px_20px_rgba(37,99,235,0.35)]"
          >
            <span className="flex items-center gap-1 text-[9px] font-black">
              <MapPin size={12} /> {project.name}
            </span>
            <span className="mt-0.5 block text-[8px] font-bold opacity-90">
              {project.metrics.availableUnits} satışta
            </span>
          </button>
        );
      })}
    </div>
  );
}

function PoolProjectDetailModal({
  projectId,
  canUsePoolActions,
  actionLockMessage,
  onClose,
  onProjectPresentation,
}: {
  projectId: string;
  canUsePoolActions: boolean;
  actionLockMessage: string;
  onClose: () => void;
  onProjectPresentation: (project: PoolProject) => void;
}) {
  const [project, setProject] = useState<PoolProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [blockId, setBlockId] = useState("");
  const [type, setType] = useState("");
  const [room, setRoom] = useState("");
  const [availability, setAvailability] = useState("AVAILABLE");
  const [selectedUnit, setSelectedUnit] = useState<PoolProjectUnit | null>(null);

  useEffect(() => {
    let alive = true;
    api
      .get<PoolProject>(`/pool-projects/${projectId}`)
      .then((response) => {
        if (!alive) return;
        setProject(response.data);
        setError("");
      })
      .catch((requestError) => {
        if (!alive) return;
        setError(
          requestError?.response?.data?.message || "Proje detayı yüklenemedi.",
        );
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [projectId]);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  const filteredUnits = useMemo(() => {
    if (!project) return [];
    return project.units.filter((unit) => {
      if (blockId && unit.blockId !== blockId) return false;
      if (type && unit.type !== type) return false;
      if (room && unit.roomCount !== room) return false;
      if (availability && unit.availabilityGroup !== availability) return false;
      return true;
    });
  }, [availability, blockId, project, room, type]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[10030] bg-[#F4F8FF] text-[#1F2937]">
      <div className="mx-auto flex h-full w-full max-w-[520px] flex-col bg-[#F4F8FF] shadow-2xl">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b-2 border-[#C7D6E8] bg-white px-3 py-3">
          <div className="min-w-0">
            <p className="text-[9px] font-black uppercase tracking-[0.13em] text-[#2563EB]">
              Proje Satış Merkezi
            </p>
            <h2 className="truncate text-[17px] font-black text-[#0F172A]">
              {project?.name || "Proje yükleniyor"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px] border-2 border-[#C7D6E8] bg-[#F8FAFC] text-[#2563EB]"
            aria-label="Kapat"
          >
            <X size={19} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-3 pb-28">
          {loading ? (
            <div className="py-16 text-center">
              <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-[#2563EB] border-t-transparent" />
              <p className="mt-3 text-[11px] font-black text-[#64748B]">
                Proje stoku hazırlanıyor...
              </p>
            </div>
          ) : error || !project ? (
            <div className="rounded-[18px] border-2 border-red-200 bg-red-50 p-4 text-center text-[11px] font-black text-red-700">
              {error || "Proje bulunamadı."}
            </div>
          ) : (
            <div className="space-y-3">
              <section className="overflow-hidden rounded-[24px] border-2 border-[#93C5FD] bg-white">
                <div className="relative h-[220px] bg-[#DBEAFE]">
                  {project.coverUrl ? (
                    <img
                      src={project.coverUrl}
                      alt={project.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[#2563EB]">
                      <Building2 size={48} />
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/85 to-transparent px-4 pb-4 pt-16 text-white">
                    <h3 className="text-[22px] font-black">{project.name}</h3>
                    <p className="mt-1 flex items-center gap-1 text-[10px] font-bold">
                      <MapPin size={13} /> {project.locationLabel}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-1.5 p-2.5">
                  <ProjectMetric value={project.blockCount} label="Blok" />
                  <ProjectMetric value={project.metrics.totalUnits} label="Toplam" />
                  <ProjectMetric value={project.metrics.availableUnits} label="Satışta" />
                  <ProjectMetric value={project.metrics.closedUnits} label="Satıldı" />
                </div>
              </section>

              <section className="rounded-[22px] border-2 border-[#C7D6E8] bg-white p-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.12em] text-[#2563EB]">
                      Proje Bilgileri
                    </p>
                    <p className="mt-1 text-[11px] font-bold leading-5 text-[#64748B]">
                      {project.description ||
                        `${project.blockCount} blok ve ${project.metrics.totalUnits} bağımsız bölümden oluşan proje.`}
                    </p>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {project.spaces.map((space) => (
                    <span
                      key={space.id}
                      className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[9px] font-black text-emerald-700"
                    >
                      {space.name}
                    </span>
                  ))}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <a
                    href={`/proje-satis-sablonu/3d/${project.id}?mode=preview`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex min-h-[42px] items-center justify-center gap-1.5 rounded-[14px] border-2 border-[#C7D6E8] bg-[#F8FAFC] text-[10px] font-black text-[#475569]"
                  >
                    <Layers3 size={14} /> 3D Görünüm
                  </a>
                  <button
                    type="button"
                    onClick={() => onProjectPresentation(project)}
                    className="flex min-h-[42px] items-center justify-center gap-1.5 rounded-[14px] bg-[#2563EB] text-[10px] font-black text-white"
                  >
                    <Share2 size={14} /> Projeyi Sun
                  </button>
                </div>
              </section>

              <section className="rounded-[22px] border-2 border-[#99F6E4] bg-[#F0FDFA] p-3">
                <div className="flex items-center gap-2 text-[#0F766E]">
                  <Users size={17} />
                  <h3 className="text-[12px] font-black">CRM Proje Eşleşmeleri</h3>
                </div>
                <p className="mt-1 text-[10px] font-bold text-[#64748B]">
                  {project.crmMatch.matchedCustomerCount} müşteri · {project.crmMatch.matchedUnitCount} uygun bağımsız bölüm · en güçlü %{project.crmMatch.bestScore}
                </p>
                {project.crmMatch.topMatches.length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    {project.crmMatch.topMatches.slice(0, 4).map((item) => (
                      <div
                        key={item.customerId}
                        className="flex items-center justify-between rounded-[13px] bg-white px-2.5 py-2 text-[9.5px] font-black"
                      >
                        <span className="truncate text-[#0F172A]">
                          {item.customerName} → {item.matchedUnitCount} uygun bölüm
                        </span>
                        <span className="shrink-0 text-[#0F766E]">%{item.bestScore}</span>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="rounded-[22px] border-2 border-[#C7D6E8] bg-white p-3">
                <div className="flex items-center gap-2">
                  <Filter size={16} className="text-[#2563EB]" />
                  <h3 className="text-[12px] font-black text-[#0F172A]">
                    Canlı Satış Stoku
                  </h3>
                  <span className="ml-auto rounded-full bg-[#EFF6FF] px-2 py-1 text-[9px] font-black text-[#1D4ED8]">
                    {filteredUnits.length}
                  </span>
                </div>

                <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
                  <FilterChip active={!blockId} label="Tüm Bloklar" onClick={() => setBlockId("")} />
                  {project.blocks.map((block) => (
                    <FilterChip
                      key={block.id}
                      active={blockId === block.id}
                      label={block.name}
                      onClick={() => setBlockId(block.id)}
                    />
                  ))}
                </div>

                <div className="mt-2 grid grid-cols-3 gap-1.5">
                  <select
                    value={type}
                    onChange={(event) => setType(event.target.value)}
                    className="min-h-[40px] rounded-[13px] border-2 border-[#C7D6E8] bg-[#F8FAFC] px-2 text-[9.5px] font-black text-[#475569] outline-none"
                  >
                    <option value="">Tüm Tipler</option>
                    {project.typeBreakdown.map((item) => (
                      <option key={item.type} value={item.type}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={room}
                    onChange={(event) => setRoom(event.target.value)}
                    className="min-h-[40px] rounded-[13px] border-2 border-[#C7D6E8] bg-[#F8FAFC] px-2 text-[9.5px] font-black text-[#475569] outline-none"
                  >
                    <option value="">Tüm Odalar</option>
                    {project.roomCounts.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                  <select
                    value={availability}
                    onChange={(event) => setAvailability(event.target.value)}
                    className="min-h-[40px] rounded-[13px] border-2 border-[#C7D6E8] bg-[#F8FAFC] px-2 text-[9.5px] font-black text-[#475569] outline-none"
                  >
                    <option value="">Tüm Durumlar</option>
                    <option value="AVAILABLE">Satışta</option>
                    <option value="RESERVED">Rezerve</option>
                    <option value="CLOSED">Satıldı</option>
                  </select>
                </div>

                <div className="mt-3 space-y-2">
                  {filteredUnits.map((unit) => (
                    <article
                      key={unit.id}
                      className="rounded-[17px] border-2 border-[#D7E2F0] bg-[#F8FAFC] p-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[11px] font-black text-[#0F172A]">
                            {unit.title || unit.typeLabel}
                          </p>
                          <p className="mt-0.5 text-[9px] font-bold text-[#64748B]">
                            {unit.typeLabel}
                            {unit.roomCount ? ` · ${unit.roomCount}` : ""}
                            {unit.grossArea || unit.area || unit.netArea
                              ? ` · ${unit.grossArea || unit.area || unit.netArea} m²`
                              : ""}
                            {unit.floorLabel ? ` · ${unit.floorLabel}` : ""}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-2 py-1 text-[8.5px] font-black ${
                            unit.availabilityGroup === "AVAILABLE"
                              ? "bg-emerald-100 text-emerald-700"
                              : unit.availabilityGroup === "RESERVED"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-slate-200 text-slate-600"
                          }`}
                        >
                          {unit.statusLabel}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <strong className="text-[11px] font-black text-[#2563EB]">
                          {formatMoney(unit.price, unit.priceCurrency || "TRY")}
                        </strong>
                        {unit.match?.score ? (
                          <span className="text-[9px] font-black text-[#0F766E]">
                            CRM %{unit.match.score}
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedUnit(unit)}
                          className="flex min-h-[38px] items-center justify-center gap-1 rounded-[12px] border-2 border-[#2563EB] bg-white text-[9.5px] font-black text-[#1D4ED8]"
                        >
                          <Store size={13} /> Bölümü İncele
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            unit.availabilityGroup === "AVAILABLE" && setSelectedUnit(unit)
                          }
                          disabled={
                            !canUsePoolActions || unit.availabilityGroup !== "AVAILABLE"
                          }
                          className="flex min-h-[38px] items-center justify-center gap-1 rounded-[12px] bg-[#2563EB] text-[9.5px] font-black text-white disabled:bg-slate-300"
                          title={!canUsePoolActions ? actionLockMessage : undefined}
                        >
                          <Share2 size={13} /> Müşterime Sun
                        </button>
                      </div>
                    </article>
                  ))}

                  {filteredUnits.length === 0 && (
                    <div className="rounded-[16px] border-2 border-dashed border-[#C7D6E8] p-4 text-center text-[10px] font-black text-[#64748B]">
                      Bu filtrelere uygun bağımsız bölüm bulunamadı.
                    </div>
                  )}
                </div>
              </section>
            </div>
          )}
        </div>
      </div>

      {selectedUnit && (
        <UnitQuickView
          unit={selectedUnit}
          project={project}
          canPresent={
            canUsePoolActions && selectedUnit.availabilityGroup === "AVAILABLE"
          }
          onClose={() => setSelectedUnit(null)}
        />
      )}
    </div>,
    document.body,
  );
}

function FilterChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full border px-2.5 py-1.5 text-[9px] font-black ${
        active
          ? "border-[#2563EB] bg-[#2563EB] text-white"
          : "border-[#C7D6E8] bg-white text-[#64748B]"
      }`}
    >
      {label}
    </button>
  );
}

function UnitQuickView({
  unit,
  project,
  canPresent,
  onClose,
}: {
  unit: PoolProjectUnit;
  project: PoolProject | null;
  canPresent: boolean;
  onClose: () => void;
}) {
  const [presentationOpen, setPresentationOpen] = useState(false);

  return (
    <>
      <div className="fixed inset-0 z-[10050] flex items-end justify-center bg-slate-950/60 px-2 pt-10">
        <section className="relative max-h-[88dvh] w-full max-w-[460px] overflow-y-auto rounded-t-[28px] border-2 border-b-0 border-[#C7D6E8] bg-white p-3 shadow-2xl">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-[14px] border-2 border-[#C7D6E8] bg-white text-[#2563EB]"
          >
            <X size={17} />
          </button>
          {unit.coverUrl && (
            <img
              src={unit.coverUrl}
              alt={unit.title}
              className="h-[220px] w-full rounded-[20px] object-cover"
            />
          )}
          <div className="px-1 pb-2 pt-3">
            <p className="text-[9px] font-black uppercase tracking-[0.12em] text-[#2563EB]">
              {project?.name}
            </p>
            <h3 className="mt-1 text-[20px] font-black text-[#0F172A]">
              {unit.title || unit.typeLabel}
            </h3>
            <p className="mt-1 text-[11px] font-bold text-[#64748B]">
              {unit.typeLabel}
              {unit.roomCount ? ` · ${unit.roomCount}` : ""}
              {unit.grossArea || unit.area || unit.netArea
                ? ` · ${unit.grossArea || unit.area || unit.netArea} m²`
                : ""}
              {unit.floorLabel ? ` · ${unit.floorLabel}` : ""}
            </p>
            <p className="mt-3 text-[17px] font-black text-[#2563EB]">
              {formatMoney(unit.price, unit.priceCurrency || "TRY")}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-[14px] bg-[#F8FAFC] p-2 text-center">
                <p className="text-[9px] font-black text-[#64748B]">Durum</p>
                <p className="mt-1 text-[11px] font-black text-[#0F172A]">
                  {unit.statusLabel}
                </p>
              </div>
              <div className="rounded-[14px] bg-[#F8FAFC] p-2 text-center">
                <p className="text-[9px] font-black text-[#64748B]">CRM Eşleşmesi</p>
                <p className="mt-1 text-[11px] font-black text-[#0F766E]">
                  %{unit.match?.score || 0}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => canPresent && setPresentationOpen(true)}
              disabled={!canPresent}
              className="mt-3 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-[16px] bg-[#2563EB] text-[12px] font-black text-white disabled:bg-slate-300"
            >
              <Share2 size={16} />
              {canPresent ? "Bu Bağımsız Bölümü Müşterime Sun" : "Bu bölüm sunuma açık değil"}
            </button>
          </div>
        </section>
      </div>

      <CustomerPresentationSheet
        open={presentationOpen}
        unitId={unit.id}
        ephId={`EPH-${unit.id.replaceAll("-", "").slice(0, 6).toUpperCase()}`}
        source="POOL"
        onClose={() => setPresentationOpen(false)}
      />
    </>
  );
}

function ProjectPresentationSheet({
  project,
  onClose,
}: {
  project: PoolProject | null;
  onClose: () => void;
}) {
  const [links, setLinks] = useState<PresentationLink[]>([]);
  const [durationHours, setDurationHours] = useState(168);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const activeLink = links.find((link) => link.status === "ACTIVE") || null;

  useEffect(() => {
    if (!project) return;
    setLoading(true);
    setDurationHours(168);
    setMessage("");
    setError("");

    api
      .get<PresentationLink[]>(`/pool-projects/${project.id}/presentations`)
      .then((response) =>
        setLinks(Array.isArray(response.data) ? response.data : []),
      )
      .catch((requestError) =>
        setError(
          requestError?.response?.data?.message ||
            "Proje sunum bağlantıları yüklenemedi.",
        ),
      )
      .finally(() => setLoading(false));
  }, [project]);

  useEffect(() => {
    if (!project) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [project]);

  if (!project || typeof document === "undefined") return null;

  const createLink = async () => {
    if (busy) return;
    setBusy("create");
    setError("");
    setMessage("");
    try {
      const response = await api.post<PresentationLink>(
        `/pool-projects/${project.id}/presentations`,
        { durationHours },
      );
      setLinks((current) => [
        response.data,
        ...current.filter((item) => item.id !== response.data.id),
      ]);
      setMessage("Proje müşteri sunumu hazırlandı.");
    } catch (requestError: any) {
      setError(
        requestError?.response?.data?.message || "Sunum oluşturulamadı.",
      );
    } finally {
      setBusy("");
    }
  };

  const renewLink = async () => {
    if (!activeLink || busy) return;
    setBusy("renew");
    try {
      const response = await api.patch<PresentationLink>(
        `/pool-projects/presentations/${activeLink.id}/renew`,
        { durationHours },
      );
      setLinks((current) =>
        current.map((item) =>
          item.id === response.data.id ? response.data : item,
        ),
      );
      setMessage("Proje sunum süresi yenilendi.");
    } catch (requestError: any) {
      setError(requestError?.response?.data?.message || "Süre yenilenemedi.");
    } finally {
      setBusy("");
    }
  };

  const revokeLink = async () => {
    if (!activeLink || busy) return;
    setBusy("revoke");
    try {
      const response = await api.delete<PresentationLink>(
        `/pool-projects/presentations/${activeLink.id}`,
      );
      setLinks((current) =>
        current.map((item) =>
          item.id === response.data.id ? response.data : item,
        ),
      );
      setMessage("Proje sunum bağlantısı iptal edildi.");
    } catch (requestError: any) {
      setError(requestError?.response?.data?.message || "Bağlantı iptal edilemedi.");
    } finally {
      setBusy("");
    }
  };

  const shareLink = async () => {
    if (!activeLink?.url) return;
    const text = `${project.name} proje sunumu: ${activeLink.url}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: project.name, text, url: activeLink.url });
        return;
      } catch {
        return;
      }
    }
    window.open(
      `https://wa.me/?text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[10080] flex items-end justify-center bg-slate-950/65 px-2 pt-10"
      onClick={onClose}
    >
      <section
        className="relative flex max-h-[92dvh] w-full max-w-[460px] flex-col overflow-hidden rounded-t-[28px] border-2 border-b-0 border-[#C7D6E8] bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="shrink-0 border-b-2 border-[#E2EAF5] bg-[#F8FAFC] px-4 pb-3 pt-3 text-center">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-[14px] border-2 border-[#C7D6E8] bg-white text-[#2563EB]"
          >
            <X size={17} />
          </button>
          <p className="text-[9px] font-black uppercase tracking-[0.13em] text-[#2563EB]">
            Proje Müşteri Sunumu
          </p>
          <h2 className="mt-1 pr-10 text-[19px] font-black text-[#0F172A]">
            {project.name}
          </h2>
          <p className="mt-1 text-[10px] font-bold text-[#64748B]">
            Tüm proje ve canlı satış stoku tek bağlantıda
          </p>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          <div className="grid grid-cols-4 gap-1.5">
            {DURATION_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setDurationHours(option.value)}
                className={`min-h-[42px] rounded-[13px] border-2 px-1 text-[9.5px] font-black ${
                  durationHours === option.value
                    ? "border-[#2563EB] bg-[#2563EB] text-white"
                    : "border-[#C7D6E8] bg-white text-[#64748B]"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="mt-3 rounded-[17px] bg-[#F8FAFC] p-5 text-center text-[10px] font-black text-[#64748B]">
              Sunum bağlantıları yükleniyor...
            </div>
          ) : activeLink ? (
            <div className="mt-3 overflow-hidden rounded-[20px] border-2 border-emerald-200 bg-white">
              <div className="bg-emerald-50 px-3 py-3 text-center">
                <p className="text-[9px] font-black uppercase tracking-[0.1em] text-emerald-700">
                  Bağlantı Aktif
                </p>
                <p className="mt-1 flex items-center justify-center gap-1 text-[10.5px] font-black text-emerald-900">
                  <Clock3 size={14} /> {formatDate(activeLink.expiresAt)} tarihine kadar
                </p>
              </div>
              <div className="grid grid-cols-2 gap-1.5 p-2.5 text-center">
                <div className="rounded-[13px] bg-[#F8FAFC] p-2">
                  <strong className="block text-[17px] font-black text-[#2563EB]">
                    {activeLink.viewCount}
                  </strong>
                  <span className="text-[8.5px] font-black text-[#64748B]">Görüntüleme</span>
                </div>
                <div className="rounded-[13px] bg-[#F8FAFC] p-2">
                  <strong className="block text-[17px] font-black text-emerald-600">
                    {activeLink.whatsappClickCount}
                  </strong>
                  <span className="text-[8.5px] font-black text-[#64748B]">WhatsApp</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 border-t border-[#E2EAF5] p-2.5">
                <button
                  type="button"
                  onClick={() =>
                    window.open(activeLink.url, "_blank", "noopener,noreferrer")
                  }
                  className="flex min-h-[43px] items-center justify-center gap-1 rounded-[13px] bg-[#2563EB] text-[10px] font-black text-white"
                >
                  <ExternalLink size={14} /> Sunumu Aç
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await navigator.clipboard.writeText(activeLink.url);
                    setMessage("Bağlantı kopyalandı.");
                  }}
                  className="flex min-h-[43px] items-center justify-center gap-1 rounded-[13px] border-2 border-[#2563EB] bg-[#EFF6FF] text-[10px] font-black text-[#1D4ED8]"
                >
                  <Copy size={14} /> Kopyala
                </button>
                <button
                  type="button"
                  onClick={shareLink}
                  className="col-span-2 flex min-h-[43px] items-center justify-center gap-1 rounded-[13px] border-2 border-emerald-300 bg-emerald-50 text-[10px] font-black text-emerald-700"
                >
                  <MessageCircle size={14} /> WhatsApp / Paylaş
                </button>
                <button
                  type="button"
                  onClick={renewLink}
                  disabled={Boolean(busy)}
                  className="flex min-h-[41px] items-center justify-center gap-1 rounded-[13px] border-2 border-[#C7D6E8] text-[9.5px] font-black text-[#475569] disabled:opacity-60"
                >
                  <RefreshCw size={13} /> Süreyi Yenile
                </button>
                <button
                  type="button"
                  onClick={revokeLink}
                  disabled={Boolean(busy)}
                  className="flex min-h-[41px] items-center justify-center gap-1 rounded-[13px] border-2 border-rose-200 bg-rose-50 text-[9.5px] font-black text-rose-700 disabled:opacity-60"
                >
                  <Trash2 size={13} /> İptal Et
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={createLink}
              disabled={Boolean(busy)}
              className="mt-3 flex min-h-[50px] w-full items-center justify-center gap-2 rounded-[16px] bg-[#2563EB] text-[12px] font-black text-white disabled:opacity-60"
            >
              <Share2 size={16} />
              {busy === "create" ? "Hazırlanıyor..." : "Proje Sunumu Oluştur"}
            </button>
          )}

          {error && (
            <p className="mt-3 rounded-[14px] border-2 border-red-200 bg-red-50 px-3 py-2 text-center text-[10px] font-black text-red-700">
              {error}
            </p>
          )}
          {message && (
            <p className="mt-3 rounded-[14px] border-2 border-emerald-200 bg-emerald-50 px-3 py-2 text-center text-[10px] font-black text-emerald-700">
              {message}
            </p>
          )}
        </div>
      </section>
    </div>,
    document.body,
  );
}
