"use client";

import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  CheckCircle2,
  ExternalLink,
  ImageIcon,
  Layers3,
  ListChecks,
  Loader2,
  Map,
  RefreshCw,
  Sparkles,
  Trees,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import api from "@/lib/api";

import PremiumProjectScene from "../PremiumProjectScene";
import type {
  ProjectSceneData,
  ProjectSceneElement,
  ProjectSceneResponse,
} from "../projectSceneTypes";

type RenderJobStatus =
  | "YOK"
  | "BEKLIYOR"
  | "URETILIYOR"
  | "TAMAMLANDI"
  | "HATA";

type ViewTab = "REALISTIC" | "TECHNICAL";

type RenderStatusResponse = {
  configured: boolean;
  model: string;
  project: {
    id: string;
    name: string;
    code: string | null;
    city: string;
    district: string;
  };
  scene: {
    initialized: boolean;
    version: number | null;
    status: string | null;
    thumbnailUrl: string | null;
  };
  job: {
    id: string | null;
    status: RenderJobStatus;
    progress: number;
    message: string;
    model: string;
    sourceSceneVersion: number | null;
    resultUrl: string | null;
    error: string | null;
    createdAt: string | null;
    startedAt: string | null;
    completedAt: string | null;
  };
  latestRenderUrl: string | null;
};

type Notice = {
  tone: "success" | "error" | "warning";
  message: string;
} | null;

type SceneMetrics = {
  centerX: number;
  centerY: number;
  scaleX: number;
  scaleY: number;
  heightScale: number;
};

const ACTIVE_STATUSES = new Set<RenderJobStatus>([
  "BEKLIYOR",
  "URETILIYOR",
]);

function apiErrorMessage(error: unknown) {
  const candidate = error as {
    response?: {
      data?: {
        message?: string | string[];
      };
    };
    message?: string;
  };
  const message = candidate.response?.data?.message;

  if (Array.isArray(message)) return message.join(" ");
  if (typeof message === "string") return message;
  return candidate.message || "İşlem tamamlanamadı.";
}

function canvasBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
        return;
      }

      reject(new Error("Render referans görseli oluşturulamadı."));
    }, "image/png");
  });
}

function normalizeToken(value: string | undefined) {
  return String(value || "")
    .trim()
    .toLocaleUpperCase("tr-TR")
    .replaceAll("İ", "I")
    .replaceAll("Ğ", "G")
    .replaceAll("Ü", "U")
    .replaceAll("Ş", "S")
    .replaceAll("Ö", "O")
    .replaceAll("Ç", "C");
}

function geometryLabel(value: string | undefined) {
  const geometry = normalizeToken(value);

  if (geometry.includes("KARE")) return "Kare";
  if (geometry.includes("DIKDORTGEN")) return "Dikdörtgen";
  if (geometry === "L" || geometry.startsWith("L_")) return "L Blok";
  if (geometry === "U" || geometry.startsWith("U_")) return "U Blok";
  if (geometry === "T" || geometry.startsWith("T_")) return "T Blok";

  return value || "Belirtilmedi";
}

function floorCountOf(element: ProjectSceneElement) {
  if (typeof element.floorCount === "number" && element.floorCount > 0) {
    return element.floorCount;
  }

  if (Array.isArray(element.floors) && element.floors.length > 0) {
    return element.floors.length;
  }

  return null;
}

function amenityLabel(element: ProjectSceneElement) {
  return element.name || element.spaceType || "Proje Alanı";
}

function technicalSceneData(sceneData: ProjectSceneData): ProjectSceneData {
  return {
    ...sceneData,
    settings: {
      ...sceneData.settings,
      showGrid: true,
      showLabels: true,
    },
  };
}

function presentationSceneData(sceneData: ProjectSceneData): ProjectSceneData {
  return {
    ...sceneData,
    settings: {
      ...sceneData.settings,
      showGrid: false,
      showLabels: false,
    },
  };
}

export default function ProjectRenderClient({
  projectId,
}: {
  projectId: string;
}) {
  const router = useRouter();
  const referenceRootRef = useRef<HTMLDivElement>(null);
  const [sceneResponse, setSceneResponse] =
    useState<ProjectSceneResponse | null>(null);
  const [renderStatus, setRenderStatus] =
    useState<RenderStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [activeTab, setActiveTab] = useState<ViewTab>("REALISTIC");

  const sceneEndpoint =
    `/project-sales/projects/${encodeURIComponent(projectId)}/scene`;
  const renderEndpoint =
    `/project-sales/projects/${encodeURIComponent(projectId)}/render`;

  const loadAll = useCallback(async () => {
    setLoading(true);

    try {
      const [sceneResult, statusResult] = await Promise.all([
        api.get<ProjectSceneResponse>(sceneEndpoint),
        api.get<RenderStatusResponse>(renderEndpoint),
      ]);

      setSceneResponse(sceneResult.data);
      setRenderStatus(statusResult.data);
    } catch (error) {
      setNotice({
        tone: "error",
        message: apiErrorMessage(error),
      });
    } finally {
      setLoading(false);
    }
  }, [renderEndpoint, sceneEndpoint]);

  const refreshStatus = useCallback(async () => {
    try {
      const result =
        await api.get<RenderStatusResponse>(renderEndpoint);
      setRenderStatus(result.data);

      if (result.data.job.status === "TAMAMLANDI") {
        setGenerating(false);
        setNotice({
          tone: "success",
          message: "Gerçekçi sunum renderı hazır.",
        });
      }

      if (result.data.job.status === "HATA") {
        setGenerating(false);
        setNotice({
          tone: "error",
          message:
            result.data.job.error ||
            "Sunum renderı oluşturulamadı.",
        });
      }
    } catch (error) {
      setGenerating(false);
      setNotice({
        tone: "error",
        message: apiErrorMessage(error),
      });
    }
  }, [renderEndpoint]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    const status = renderStatus?.job.status;

    if (!status || !ACTIVE_STATUSES.has(status)) {
      return;
    }

    setGenerating(true);
    const timer = window.setInterval(() => {
      void refreshStatus();
    }, 2500);

    return () => window.clearInterval(timer);
  }, [refreshStatus, renderStatus?.job.status]);

  const sceneData = sceneResponse?.scene?.sceneData || null;

  const blocks = useMemo(
    () =>
      sceneData?.elements.filter((item) => item.type === "BLOCK") || [],
    [sceneData],
  );

  const amenities = useMemo(
    () =>
      sceneData?.elements.filter((item) => item.type !== "BLOCK") || [],
    [sceneData],
  );

  const sceneMetrics = useMemo<SceneMetrics>(() => {
    if (!sceneData) {
      return {
        centerX: 500,
        centerY: 410,
        scaleX: 6,
        scaleY: 3,
        heightScale: 4.2,
      };
    }

    const span = Math.max(
      20,
      sceneData.plot.width + sceneData.plot.depth,
    );

    return {
      centerX: 500,
      centerY: 410,
      scaleX: 760 / span,
      scaleY: 340 / span,
      heightScale: 4.2,
    };
  }, [sceneData]);

  const toIso = useCallback(
    (worldX: number, worldZ: number) => ({
      x:
        sceneMetrics.centerX +
        (worldX - worldZ) * sceneMetrics.scaleX,
      y:
        sceneMetrics.centerY +
        (worldX + worldZ) * sceneMetrics.scaleY,
    }),
    [sceneMetrics],
  );

  const createReferenceImage = useCallback(async () => {
    const svg = referenceRootRef.current?.querySelector("svg");

    if (!svg) {
      throw new Error("3D sahne referansı ekranda bulunamadı.");
    }

    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clone.setAttribute("width", "1536");
    clone.setAttribute("height", "1024");
    clone.setAttribute("preserveAspectRatio", "xMidYMid meet");
    clone.removeAttribute("class");
    clone.removeAttribute("style");

    const serialized = new XMLSerializer().serializeToString(clone);
    const sourceBlob = new Blob([serialized], {
      type: "image/svg+xml;charset=utf-8",
    });
    const sourceUrl = URL.createObjectURL(sourceBlob);

    try {
      const image = new Image();
      image.decoding = "async";

      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () =>
          reject(
            new Error(
              "3D sahne referansı görsele dönüştürülemedi.",
            ),
          );
        image.src = sourceUrl;
      });

      const canvas = document.createElement("canvas");
      canvas.width = 1536;
      canvas.height = 1024;
      const context = canvas.getContext("2d");

      if (!context) {
        throw new Error("Tarayıcı görsel işleme alanını açamadı.");
      }

      context.fillStyle = "#dbeafe";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);

      return canvasBlob(canvas);
    } finally {
      URL.revokeObjectURL(sourceUrl);
    }
  }, []);

  const generateRender = async () => {
    if (
      !sceneResponse?.scene ||
      !sceneData ||
      !renderStatus?.configured
    ) {
      return;
    }

    setGenerating(true);
    setNotice(null);
    setActiveTab("REALISTIC");

    try {
      const referenceImage = await createReferenceImage();
      const form = new FormData();
      form.append(
        "referenceImage",
        referenceImage,
        `${projectId}-vaziyet-referansi.png`,
      );

      const result = await api.post<{
        accepted: boolean;
        job: RenderStatusResponse["job"];
      }>(`${renderEndpoint}/generate`, form);

      setRenderStatus((current) =>
        current
          ? {
              ...current,
              job: result.data.job,
            }
          : current,
      );
      setNotice({
        tone: "warning",
        message:
          "Gerçekçi render görevi başladı. Sonuç otomatik takip ediliyor.",
      });
    } catch (error) {
      setGenerating(false);
      setNotice({
        tone: "error",
        message: apiErrorMessage(error),
      });
    }
  };

  const active =
    generating ||
    Boolean(
      renderStatus?.job.status &&
        ACTIVE_STATUSES.has(renderStatus.job.status),
    );
  const latestRenderUrl =
    renderStatus?.latestRenderUrl ||
    renderStatus?.job.resultUrl ||
    null;

  if (loading) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center overflow-y-auto bg-[#F4F8FF] p-5">
        <div className="flex items-center gap-3 rounded-2xl border border-[#C7D6E8] bg-white px-5 py-4 text-sm font-bold text-slate-700 shadow-sm">
          <Loader2 className="animate-spin text-blue-600" size={20} />
          Sunum Sistemi hazırlanıyor
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[100dvh] overflow-y-auto bg-[#F4F8FF] px-3 pt-3 pb-[calc(24px+env(safe-area-inset-bottom))] md:px-6 md:pt-5">
      <div className="mx-auto max-w-[1440px]">
        <header className="mb-3 rounded-2xl border border-[#C7D6E8] bg-white p-3 shadow-sm md:p-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() =>
                router.push(
                  `/proje-satis-sablonu/3d/${encodeURIComponent(projectId)}`,
                )
              }
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#C7D6E8] text-slate-700"
              aria-label="3D stüdyoya dön"
            >
              <ArrowLeft size={19} />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-lg font-black text-slate-900 md:text-xl">
                {renderStatus?.project.name || "Proje Sunum Sistemi"}
              </h1>
              <p className="truncate text-xs font-semibold text-slate-500 md:text-sm">
                Sunum Merkezi • {renderStatus?.project.city} /{" "}
                {renderStatus?.project.district}
              </p>
            </div>
          </div>
        </header>

        {notice && <NoticeBand notice={notice} />}

        {sceneData && (
          <div
            ref={referenceRootRef}
            aria-hidden="true"
            className="pointer-events-none fixed -left-[12000px] top-0 h-[700px] w-[1000px] overflow-hidden opacity-0"
          >
            <PremiumProjectScene
              sceneData={presentationSceneData(sceneData)}
              selectedId={null}
              dragElementId={null}
              viewMode="PRESENTATION"
              sceneMetrics={sceneMetrics}
              toIso={toIso}
              onClearSelection={() => undefined}
              onElementPointerDown={() => undefined}
              onElementPointerMove={() => undefined}
              onElementPointerUp={() => undefined}
            />
          </div>
        )}

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_350px]">
          <section className="overflow-hidden rounded-2xl border border-[#C7D6E8] bg-white shadow-sm">
            <div className="border-b border-slate-100 px-3 py-3 md:px-4">
              <div className="grid grid-cols-2 gap-2 rounded-xl bg-[#EEF3F8] p-1">
                <TabButton
                  active={activeTab === "REALISTIC"}
                  icon={<Sparkles size={16} />}
                  label="Gerçekçi Sunum"
                  onClick={() => setActiveTab("REALISTIC")}
                />
                <TabButton
                  active={activeTab === "TECHNICAL"}
                  icon={<Layers3 size={16} />}
                  label="Teknik Vaziyet"
                  onClick={() => setActiveTab("TECHNICAL")}
                />
              </div>
            </div>

            {activeTab === "REALISTIC" ? (
              <RealisticView
                latestRenderUrl={latestRenderUrl}
                sceneData={sceneData}
                sceneMetrics={sceneMetrics}
                toIso={toIso}
                projectName={renderStatus?.project.name || "Proje"}
              />
            ) : (
              <TechnicalView
                sceneData={sceneData}
                sceneMetrics={sceneMetrics}
                toIso={toIso}
                blocks={blocks}
                amenities={amenities}
              />
            )}
          </section>

          <aside className="space-y-3">
            {activeTab === "REALISTIC" ? (
              <>
                <section className="rounded-2xl border border-[#C7D6E8] bg-white p-4 shadow-sm">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-700">
                      <Sparkles size={20} />
                    </div>
                    <div>
                      <h2 className="text-sm font-black text-slate-900">
                        Gerçekçi Sunum
                      </h2>
                      <p className="text-[11px] font-semibold text-slate-500">
                        Satış ve tanıtım amaçlı kavramsal görsel
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <MiniMetric label="Blok" value={blocks.length} />
                    <MiniMetric label="Alan" value={amenities.length} />
                    <MiniMetric
                      label="Sahne"
                      value={`v${renderStatus?.scene.version || 0}`}
                    />
                    <MiniMetric
                      label="Motor"
                      value={renderStatus?.model || "—"}
                    />
                  </div>

                  {!renderStatus?.configured && (
                    <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] font-bold leading-5 text-amber-800">
                      Backend ortamında OPENAI_API_KEY tanımlanmadan gerçekçi render üretilemez.
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => void generateRender()}
                    disabled={
                      active ||
                      !sceneData ||
                      !renderStatus?.configured
                    }
                    className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {active ? (
                      <Loader2 className="animate-spin" size={18} />
                    ) : (
                      <ImageIcon size={18} />
                    )}
                    {latestRenderUrl
                      ? "Renderı Yeniden Üret"
                      : "Sunum Renderı Oluştur"}
                  </button>

                  <button
                    type="button"
                    onClick={() => void refreshStatus()}
                    disabled={active}
                    className="mt-2 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-[#C7D6E8] bg-white text-xs font-black text-slate-700 disabled:opacity-50"
                  >
                    <RefreshCw size={15} />
                    Durumu Yenile
                  </button>
                </section>

                <RenderStatusCard
                  renderStatus={renderStatus}
                  latestRenderUrl={latestRenderUrl}
                />

                <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-[11px] font-semibold leading-5 text-amber-900">
                  <div className="mb-2 flex items-center gap-2 font-black">
                    <AlertTriangle size={16} />
                    Kavramsal Görsel
                  </div>
                  Gerçekçi render satış ve tanıtım içindir. Yapay zekâ blok cephelerini, kat algısını ve peyzaj detaylarını yorumlayabilir. Ruhsat, uygulama veya kesin vaziyet projesi yerine kullanılmaz.
                </section>
              </>
            ) : (
              <TechnicalSidebar
                sceneData={sceneData}
                blocks={blocks}
                amenities={amenities}
                onOpenStudio={() =>
                  router.push(
                    `/proje-satis-sablonu/3d/${encodeURIComponent(projectId)}`,
                  )
                }
              />
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}

function RealisticView({
  latestRenderUrl,
  sceneData,
  sceneMetrics,
  toIso,
  projectName,
}: {
  latestRenderUrl: string | null;
  sceneData: ProjectSceneData | null;
  sceneMetrics: SceneMetrics;
  toIso: (worldX: number, worldZ: number) => { x: number; y: number };
  projectName: string;
}) {
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
        <div>
          <h2 className="text-sm font-black text-slate-900">
            {latestRenderUrl
              ? "Son Gerçekçi Sunum"
              : "Render Yerleşim Referansı"}
          </h2>
          <p className="text-xs font-semibold text-slate-500">
            Tanıtım ve müşteri sunumu için kavramsal çıktı
          </p>
        </div>
        <span className="rounded-full bg-blue-50 px-3 py-1.5 text-[10px] font-black text-blue-700">
          1536 × 1024
        </span>
      </div>

      {latestRenderUrl ? (
        <div className="relative aspect-[3/2] overflow-hidden bg-slate-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={latestRenderUrl}
            alt={`${projectName} gerçekçi sunum renderı`}
            className="h-full w-full object-contain"
          />
          <div className="absolute bottom-3 left-3 rounded-full border border-amber-200 bg-amber-50/95 px-3 py-1.5 text-[10px] font-black text-amber-900 shadow-sm backdrop-blur">
            Kavramsal görseldir
          </div>
        </div>
      ) : sceneData ? (
        <div className="relative aspect-[3/2] min-h-[360px] overflow-hidden bg-[#dbeafe]">
          <PremiumProjectScene
            sceneData={presentationSceneData(sceneData)}
            selectedId={null}
            dragElementId={null}
            viewMode="PRESENTATION"
            sceneMetrics={sceneMetrics}
            toIso={toIso}
            onClearSelection={() => undefined}
            onElementPointerDown={() => undefined}
            onElementPointerMove={() => undefined}
            onElementPointerUp={() => undefined}
          />
        </div>
      ) : (
        <EmptyScene />
      )}
    </>
  );
}

function TechnicalView({
  sceneData,
  sceneMetrics,
  toIso,
  blocks,
  amenities,
}: {
  sceneData: ProjectSceneData | null;
  sceneMetrics: SceneMetrics;
  toIso: (worldX: number, worldZ: number) => { x: number; y: number };
  blocks: ProjectSceneElement[];
  amenities: ProjectSceneElement[];
}) {
  if (!sceneData) return <EmptyScene />;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
        <div>
          <h2 className="text-sm font-black text-slate-900">
            Kesin Teknik Vaziyet
          </h2>
          <p className="text-xs font-semibold text-slate-500">
            Kayıtlı blok, kat, geometri ve proje alanı verileri
          </p>
        </div>
        <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-[10px] font-black text-emerald-700">
          AI kullanılmaz
        </span>
      </div>

      <div className="relative aspect-[3/2] min-h-[360px] overflow-hidden bg-[#dbeafe]">
        <PremiumProjectScene
          sceneData={technicalSceneData(sceneData)}
          selectedId={null}
          dragElementId={null}
          viewMode="PRESENTATION"
          sceneMetrics={sceneMetrics}
          toIso={toIso}
          onClearSelection={() => undefined}
          onElementPointerDown={() => undefined}
          onElementPointerMove={() => undefined}
          onElementPointerUp={() => undefined}
        />
      </div>

      <div className="border-t border-slate-100 bg-[#F8FAFC] p-3 md:p-4">
        <div className="mb-3 flex items-center gap-2">
          <Building2 size={17} className="text-blue-700" />
          <h3 className="text-sm font-black text-slate-900">
            Bloklar
          </h3>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {blocks.map((block) => (
            <BlockTechnicalCard key={block.id} block={block} />
          ))}
        </div>

        <div className="mb-3 mt-4 flex items-center gap-2">
          <Trees size={17} className="text-emerald-700" />
          <h3 className="text-sm font-black text-slate-900">
            Proje Alanları
          </h3>
        </div>
        {amenities.length > 0 ? (
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {amenities.map((amenity) => (
              <AmenityTechnicalCard
                key={amenity.id}
                amenity={amenity}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-[#C7D6E8] bg-white p-4 text-center text-xs font-bold text-slate-500">
            Kayıtlı proje alanı bulunmuyor.
          </div>
        )}
      </div>
    </>
  );
}

function TechnicalSidebar({
  sceneData,
  blocks,
  amenities,
  onOpenStudio,
}: {
  sceneData: ProjectSceneData | null;
  blocks: ProjectSceneElement[];
  amenities: ProjectSceneElement[];
  onOpenStudio: () => void;
}) {
  return (
    <>
      <section className="rounded-2xl border border-[#C7D6E8] bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
            <Layers3 size={20} />
          </div>
          <div>
            <h2 className="text-sm font-black text-slate-900">
              Teknik Vaziyet
            </h2>
            <p className="text-[11px] font-semibold text-slate-500">
              Sahne verisinin doğrudan görünümü
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <MiniMetric label="Blok" value={blocks.length} />
          <MiniMetric label="Alan" value={amenities.length} />
          <MiniMetric
            label="Parsel"
            value={
              sceneData
                ? `${sceneData.plot.width} × ${sceneData.plot.depth} m`
                : "—"
            }
          />
          <MiniMetric
            label="Kuzey"
            value={
              sceneData
                ? `${sceneData.plot.northRotation}°`
                : "—"
            }
          />
        </div>

        <button
          type="button"
          onClick={onOpenStudio}
          className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-xs font-black text-white"
        >
          <Map size={16} />
          3D Stüdyoda Düzenle
        </button>
      </section>

      <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-[11px] font-semibold leading-5 text-emerald-900">
        <div className="mb-2 flex items-center gap-2 font-black">
          <CheckCircle2 size={16} />
          Kesinlik Kapsamı
        </div>
        Bu görünüm kayıtlı blok sayısını, kat adetlerini, L/U geometrilerini, blok konumlarını, dönüş açılarını, parsel sınırını ve proje alanlarını doğrudan sahneden gösterir. Yapay zekâ kullanılmaz.
      </section>

      <section className="rounded-2xl border border-[#C7D6E8] bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <ListChecks size={16} className="text-blue-700" />
          <h2 className="text-sm font-black text-slate-900">
            Kullanım Amacı
          </h2>
        </div>
        <div className="space-y-2 text-[11px] font-semibold leading-5 text-slate-600">
          <p>• Blok ve kat kontrolü</p>
          <p>• Geometri ve yerleşim doğrulaması</p>
          <p>• Proje alanı kontrolü</p>
          <p>• Sunum renderıyla karşılaştırma</p>
        </div>
      </section>
    </>
  );
}

function BlockTechnicalCard({ block }: { block: ProjectSceneElement }) {
  const floorCount = floorCountOf(block);

  return (
    <article className="rounded-xl border border-[#C7D6E8] bg-white p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 className="truncate text-xs font-black text-slate-900">
            {block.name || block.code || "Blok"}
          </h4>
          <p className="mt-0.5 truncate text-[10px] font-bold text-slate-500">
            {geometryLabel(block.geometryType)}
          </p>
        </div>
        <span className="shrink-0 rounded-lg bg-blue-50 px-2 py-1 text-[10px] font-black text-blue-700">
          {floorCount === null ? "—" : `${floorCount} kat`}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] font-bold text-slate-600">
        <TechnicalValue
          label="Ölçü"
          value={`${block.size.width} × ${block.size.depth} m`}
        />
        <TechnicalValue
          label="Dönüş"
          value={`${block.rotationY}°`}
        />
      </div>
    </article>
  );
}

function AmenityTechnicalCard({
  amenity,
}: {
  amenity: ProjectSceneElement;
}) {
  return (
    <article className="rounded-xl border border-[#C7D6E8] bg-white p-3">
      <div className="flex items-start gap-2">
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-700">
          <Trees size={15} />
        </div>
        <div className="min-w-0">
          <h4 className="truncate text-xs font-black text-slate-900">
            {amenityLabel(amenity)}
          </h4>
          <p className="mt-0.5 truncate text-[10px] font-bold text-slate-500">
            {amenity.spaceType || "Proje alanı"}
          </p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] font-bold text-slate-600">
        <TechnicalValue
          label="Ölçü"
          value={`${amenity.size.width} × ${amenity.size.depth} m`}
        />
        <TechnicalValue
          label="Dönüş"
          value={`${amenity.rotationY}°`}
        />
      </div>
    </article>
  );
}

function RenderStatusCard({
  renderStatus,
  latestRenderUrl,
}: {
  renderStatus: RenderStatusResponse | null;
  latestRenderUrl: string | null;
}) {
  return (
    <section className="rounded-2xl border border-[#C7D6E8] bg-white p-4 shadow-sm">
      <h2 className="text-sm font-black text-slate-900">
        Render Durumu
      </h2>
      <p className="mt-1 text-xs font-semibold text-slate-500">
        {renderStatus?.job.message || "Henüz render görevi yok."}
      </p>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-blue-600 transition-all duration-500"
          style={{
            width: `${Math.max(
              0,
              Math.min(100, renderStatus?.job.progress || 0),
            )}%`,
          }}
        />
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="text-[11px] font-black text-slate-500">
          {renderStatus?.job.status || "YOK"}
        </span>
        <strong className="text-xs text-blue-700">
          %{renderStatus?.job.progress || 0}
        </strong>
      </div>

      {renderStatus?.job.error && (
        <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-[11px] font-bold leading-5 text-red-700">
          {renderStatus.job.error}
        </div>
      )}

      {latestRenderUrl && (
        <a
          href={latestRenderUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 text-xs font-black text-emerald-700"
        >
          <ExternalLink size={15} />
          Renderı Yeni Sekmede Aç
        </a>
      )}
    </section>
  );
}

function EmptyScene() {
  return (
    <div className="grid min-h-[420px] place-items-center p-6 text-center">
      <div>
        <AlertTriangle className="mx-auto text-amber-500" size={34} />
        <p className="mt-3 text-sm font-black text-slate-800">
          3D sahne bulunamadı
        </p>
        <p className="mt-1 text-xs font-semibold text-slate-500">
          Önce 3D Proje Stüdyosunda sahneyi oluşturun.
        </p>
      </div>
    </div>
  );
}

function TabButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg px-3 text-xs font-black transition ${
        active
          ? "bg-white text-blue-700 shadow-sm"
          : "text-slate-600"
      }`}
    >
      {icon}
      <span className="truncate">{label}</span>
    </button>
  );
}

function MiniMetric({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <div className="truncate text-sm font-black text-slate-900">
        {value}
      </div>
      <div className="mt-1 text-[10px] font-bold text-slate-500">
        {label}
      </div>
    </div>
  );
}

function TechnicalValue({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg bg-slate-50 p-2">
      <div className="truncate text-[10px] font-black text-slate-800">
        {value}
      </div>
      <div className="mt-0.5 text-[9px] font-bold text-slate-500">
        {label}
      </div>
    </div>
  );
}

function NoticeBand({ notice }: { notice: Notice }) {
  if (!notice) return null;

  const toneClass = {
    success: "border-emerald-200 bg-emerald-50 text-emerald-800",
    error: "border-red-200 bg-red-50 text-red-800",
    warning: "border-amber-200 bg-amber-50 text-amber-800",
  }[notice.tone];

  return (
    <div
      className={`mb-3 rounded-xl border px-4 py-3 text-xs font-bold ${toneClass}`}
    >
      {notice.message}
    </div>
  );
}
