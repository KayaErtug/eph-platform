"use client";

import {
  ArrowLeft,
  Box,
  Building2,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  CircleOff,
  Grid3X3,
  Loader2,
  Map,
  RotateCcw,
  Save,
  Sparkles,
  Trees,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

import api from "@/lib/api";

import FacadeLandscapeControls from "./FacadeLandscapeControls";
import PremiumProjectScene, {
  type SceneViewMode,
} from "./PremiumProjectScene";
import {
  defaultLandscapeSettings,
  facadeStyleForPreset,
  normalizeLandscapeSettings,
} from "./sceneStylePresets";
import type {
  FacadePresetId,
  ProjectLandscapeSettings,
  ProjectSceneData,
  ProjectSceneElement,
  ProjectSceneResponse,
} from "./projectSceneTypes";

type DragState = {
  elementId: string;
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startPosition: [number, number, number];
};

type Notice = {
  tone: "success" | "error" | "warning";
  message: string;
} | null;

const defaultSceneData: ProjectSceneData = {
  schemaVersion: 3,
  plot: {
    width: 70,
    depth: 60,
    northRotation: 0,
  },
  camera: {
    mode: "ORTHOGRAPHIC",
    position: [40, 34, 40],
    target: [0, 0, 0],
    zoom: 1,
  },
  settings: {
    showGrid: true,
    showLabels: true,
    quality: "AUTO",
  },
  landscape: defaultLandscapeSettings,
  elements: [],
};

function normalizeSceneData(value: unknown): ProjectSceneData {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return defaultSceneData;
  }

  const source = value as Partial<ProjectSceneData>;

  return {
    schemaVersion: Number(source.schemaVersion) || 1,
    skipped: Boolean(source.skipped),
    plot: {
      width: Number(source.plot?.width) || defaultSceneData.plot.width,
      depth: Number(source.plot?.depth) || defaultSceneData.plot.depth,
      northRotation: Number(source.plot?.northRotation) || 0,
    },
    camera: {
      mode: source.camera?.mode || defaultSceneData.camera.mode,
      position: source.camera?.position || defaultSceneData.camera.position,
      target: source.camera?.target || defaultSceneData.camera.target,
      zoom: Number(source.camera?.zoom) || 1,
    },
    settings: {
      showGrid: source.settings?.showGrid ?? true,
      showLabels: source.settings?.showLabels ?? true,
      quality: source.settings?.quality || "AUTO",
    },
    landscape: normalizeLandscapeSettings(source.landscape),
    elements: Array.isArray(source.elements) ? source.elements : [],
  };
}

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

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function statusLabel(status?: string) {
  const labels: Record<string, string> = {
    TASLAK: "Taslak",
    TAMAMLANDI: "Tamamlandı",
    ATLANDI: "Atlandı",
  };

  return status ? labels[status] || status : "Oluşturulmadı";
}

export default function Project3DStudioClient({
  projectId,
}: {
  projectId: string;
}) {
  const router = useRouter();
  const [response, setResponse] = useState<ProjectSceneResponse | null>(null);
  const [sceneData, setSceneData] = useState<ProjectSceneData>(defaultSceneData);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [sceneViewMode, setSceneViewMode] = useState<SceneViewMode>("SITE");

  const endpoint = `/project-sales/projects/${encodeURIComponent(projectId)}/scene`;

  const applyResponse = useCallback((next: ProjectSceneResponse) => {
    setResponse(next);
    setSceneData(normalizeSceneData(next.scene?.sceneData));
    setSelectedId(null);
    setDirty(false);
  }, []);

  const loadScene = useCallback(async () => {
    setLoading(true);
    setNotice(null);

    try {
      const result = await api.get<ProjectSceneResponse>(endpoint);
      applyResponse(result.data);
    } catch (error) {
      setNotice({ tone: "error", message: apiErrorMessage(error) });
    } finally {
      setLoading(false);
    }
  }, [applyResponse, endpoint]);

  useEffect(() => {
    void loadScene();
  }, [loadScene]);

  useEffect(() => {
    const warnBeforeLeave = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
    };

    window.addEventListener("beforeunload", warnBeforeLeave);
    return () => window.removeEventListener("beforeunload", warnBeforeLeave);
  }, [dirty]);

  const selectedElement = useMemo(
    () => sceneData.elements.find((element) => element.id === selectedId) || null,
    [sceneData.elements, selectedId],
  );

  const sceneMetrics = useMemo(() => {
    const span = Math.max(20, sceneData.plot.width + sceneData.plot.depth);

    return {
      centerX: 500,
      centerY: 410,
      scaleX: 760 / span,
      scaleY: 340 / span,
      heightScale: 4.2,
    };
  }, [sceneData.plot.depth, sceneData.plot.width]);

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

  const updateElement = useCallback(
    (
      elementId: string,
      updater: (element: ProjectSceneElement) => ProjectSceneElement,
    ) => {
      setSceneData((current) => ({
        ...current,
        elements: current.elements.map((element) =>
          element.id === elementId ? updater(element) : element,
        ),
      }));
      setDirty(true);
    },
    [],
  );

  const setElementPosition = useCallback(
    (elementId: string, x: number, z: number) => {
      updateElement(elementId, (element) => {
        const xLimit = Math.max(
          0,
          sceneData.plot.width / 2 - element.size.width / 2,
        );
        const zLimit = Math.max(
          0,
          sceneData.plot.depth / 2 - element.size.depth / 2,
        );

        return {
          ...element,
          position: [
            Number(clamp(x, -xLimit, xLimit).toFixed(2)),
            element.position[1],
            Number(clamp(z, -zLimit, zLimit).toFixed(2)),
          ],
        };
      });
    },
    [sceneData.plot.depth, sceneData.plot.width, updateElement],
  );

  const handlePointerDown = (
    event: ReactPointerEvent<SVGGElement>,
    element: ProjectSceneElement,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    setSelectedId(element.id);
    setDragState({
      elementId: element.id,
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startPosition: [...element.position],
    });
  };

  const handlePointerMove = (event: ReactPointerEvent<SVGGElement>) => {
    if (!dragState || event.pointerId !== dragState.pointerId) return;

    const svg = event.currentTarget.ownerSVGElement;
    if (!svg) return;

    const bounds = svg.getBoundingClientRect();
    const deltaSvgX = ((event.clientX - dragState.startClientX) / bounds.width) * 1000;
    const deltaSvgY = ((event.clientY - dragState.startClientY) / bounds.height) * 700;
    const deltaWorldX =
      deltaSvgX / (2 * sceneMetrics.scaleX) +
      deltaSvgY / (2 * sceneMetrics.scaleY);
    const deltaWorldZ =
      -deltaSvgX / (2 * sceneMetrics.scaleX) +
      deltaSvgY / (2 * sceneMetrics.scaleY);

    setElementPosition(
      dragState.elementId,
      dragState.startPosition[0] + deltaWorldX,
      dragState.startPosition[2] + deltaWorldZ,
    );
  };

  const finishDrag = (event: ReactPointerEvent<SVGGElement>) => {
    if (dragState && event.pointerId === dragState.pointerId) {
      setDragState(null);
    }
  };

  const initializeScene = async () => {
    setBusyAction("initialize");
    setNotice(null);

    try {
      const result = await api.post<ProjectSceneResponse>(`${endpoint}/initialize`);
      applyResponse(result.data);
      setNotice({ tone: "success", message: "3D proje sahnesi oluşturuldu." });
    } catch (error) {
      setNotice({ tone: "error", message: apiErrorMessage(error) });
    } finally {
      setBusyAction(null);
    }
  };

  const persistScene = async () => {
    if (!response?.scene) return null;

    setBusyAction("save");
    setNotice(null);

    try {
      const result = await api.put<ProjectSceneResponse>(endpoint, {
        version: response.scene.version,
        sceneData,
        thumbnailUrl: response.scene.thumbnailUrl,
      });
      applyResponse(result.data);
      setNotice({ tone: "success", message: "3D sahne kaydedildi." });
      return result.data;
    } catch (error) {
      setNotice({ tone: "error", message: apiErrorMessage(error) });
      return null;
    } finally {
      setBusyAction(null);
    }
  };

  const completeScene = async () => {
    if (dirty) {
      const saved = await persistScene();
      if (!saved) return;
    }

    setBusyAction("complete");
    setNotice(null);

    try {
      const result = await api.post<ProjectSceneResponse>(`${endpoint}/complete`);
      applyResponse(result.data);
      setNotice({ tone: "success", message: "3D proje sahnesi tamamlandı." });
    } catch (error) {
      setNotice({ tone: "error", message: apiErrorMessage(error) });
    } finally {
      setBusyAction(null);
    }
  };

  const skipScene = async () => {
    if (!window.confirm("3D model aşaması atlanacak. Devam edilsin mi?")) return;

    setBusyAction("skip");
    setNotice(null);

    try {
      const result = await api.post<ProjectSceneResponse>(`${endpoint}/skip`);
      applyResponse(result.data);
      setNotice({ tone: "warning", message: "3D model aşaması atlandı." });
    } catch (error) {
      setNotice({ tone: "error", message: apiErrorMessage(error) });
    } finally {
      setBusyAction(null);
    }
  };

  const resetScene = async () => {
    if (!window.confirm("Kaydedilmiş 3D sahne silinip yeniden oluşturulacak.")) return;

    setBusyAction("reset");
    setNotice(null);

    try {
      await api.delete(`${endpoint}/reset`);
      await initializeScene();
    } catch (error) {
      setNotice({ tone: "error", message: apiErrorMessage(error) });
      setBusyAction(null);
    }
  };

  const nudgeSelected = (xDelta: number, zDelta: number) => {
    if (!selectedElement) return;
    setElementPosition(
      selectedElement.id,
      selectedElement.position[0] + xDelta,
      selectedElement.position[2] + zDelta,
    );
  };

  const rotateSelected = (delta: number) => {
    if (!selectedElement) return;
    updateElement(selectedElement.id, (element) => ({
      ...element,
      rotationY: (element.rotationY + delta + 360) % 360,
    }));
  };

  const toggleSetting = (key: "showGrid" | "showLabels") => {
    setSceneData((current) => ({
      ...current,
      settings: {
        ...current.settings,
        [key]: !current.settings[key],
      },
    }));
    setDirty(true);
  };

  const applyFacadePreset = useCallback(
    (presetId: FacadePresetId) => {
      if (!selectedElement || selectedElement.type !== "BLOCK") return;

      updateElement(selectedElement.id, (element) => ({
        ...element,
        stylePreset: presetId,
        facadeStyle: facadeStyleForPreset(presetId),
      }));
    },
    [selectedElement, updateElement],
  );

  const applyFacadeToAllBlocks = useCallback((presetId: FacadePresetId) => {
    const facadeStyle = facadeStyleForPreset(presetId);
    setSceneData((current) => ({
      ...current,
      schemaVersion: Math.max(3, current.schemaVersion),
      elements: current.elements.map((element) =>
        element.type === "BLOCK"
          ? {
              ...element,
              stylePreset: presetId,
              facadeStyle: { ...facadeStyle },
            }
          : element,
      ),
    }));
    setDirty(true);
  }, []);

  const updateLandscape = useCallback((next: ProjectLandscapeSettings) => {
    setSceneData((current) => ({
      ...current,
      schemaVersion: Math.max(3, current.schemaVersion),
      landscape: normalizeLandscapeSettings(next),
    }));
    setDirty(true);
  }, []);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F4F8FF] p-6">
        <div className="flex items-center gap-3 rounded-2xl border border-[#C7D6E8] bg-white px-5 py-4 text-sm font-semibold text-slate-700 shadow-sm">
          <Loader2 className="animate-spin text-blue-600" size={20} />
          3D Proje Stüdyosu hazırlanıyor
        </div>
      </main>
    );
  }

  if (!response) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F4F8FF] p-5">
        <div className="w-full max-w-md rounded-3xl border border-red-200 bg-white p-6 text-center shadow-sm">
          <CircleOff className="mx-auto mb-3 text-red-500" size={34} />
          <h1 className="text-xl font-black text-slate-900">Stüdyo Açılamadı</h1>
          <p className="mt-2 text-sm text-slate-600">
            {notice?.message || "Proje bilgileri alınamadı."}
          </p>
          <button
            type="button"
            onClick={() => void loadScene()}
            className="mt-5 h-11 w-full rounded-xl bg-blue-600 text-sm font-bold text-white"
          >
            Tekrar Dene
          </button>
        </div>
      </main>
    );
  }

  if (!response.initialized || !response.scene) {
    return (
      <main className="min-h-screen bg-[#F4F8FF] p-4 md:p-7">
        <div className="mx-auto max-w-3xl">
          <button
            type="button"
            onClick={() => router.push("/proje-satis-sablonu")}
            className="mb-4 inline-flex h-10 items-center gap-2 rounded-xl border border-[#C7D6E8] bg-white px-4 text-sm font-bold text-slate-700"
          >
            <ArrowLeft size={17} /> Geri
          </button>

          <section className="overflow-hidden rounded-[28px] border border-[#C7D6E8] bg-white shadow-sm">
            <div className="bg-gradient-to-br from-slate-950 via-blue-950 to-blue-700 p-7 text-white md:p-10">
              <div className="mb-5 inline-flex rounded-2xl bg-white/10 p-3 backdrop-blur">
                <Box size={32} />
              </div>
              <h1 className="text-3xl font-black tracking-tight md:text-4xl">
                3D Proje Stüdyosu
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-blue-100 md:text-base">
                {response.project.name} için blok ve proje alanlarından otomatik
                2.5D satış modeli oluşturulacak.
              </p>
            </div>

            <div className="grid gap-4 p-5 md:grid-cols-3 md:p-7">
              <MetricCard
                icon={<Building2 size={20} />}
                label="Blok"
                value={response.project.blockCount}
              />
              <MetricCard
                icon={<Trees size={20} />}
                label="Proje Alanı"
                value={response.project.visibleSpaceCount}
              />
              <MetricCard
                icon={<Map size={20} />}
                label="Konum"
                value={`${response.project.district}`}
              />
            </div>

            {notice && <NoticeBand notice={notice} />}

            <div className="grid gap-3 p-5 pt-0 md:grid-cols-2 md:p-7 md:pt-0">
              <button
                type="button"
                onClick={() => void initializeScene()}
                disabled={Boolean(busyAction)}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 text-sm font-black text-white disabled:opacity-60"
              >
                {busyAction === "initialize" ? (
                  <Loader2 className="animate-spin" size={19} />
                ) : (
                  <Sparkles size={19} />
                )}
                Otomatik Model Oluştur
              </button>
              <button
                type="button"
                onClick={() => void skipScene()}
                disabled={Boolean(busyAction)}
                className="h-12 rounded-2xl border border-[#C7D6E8] bg-white px-5 text-sm font-bold text-slate-700 disabled:opacity-60"
              >
                Şimdilik Atla
              </button>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F4F8FF] px-3 py-3 md:px-6 md:py-5">
      <div className="mx-auto max-w-[1500px]">
        <header className="mb-3 rounded-2xl border border-[#C7D6E8] bg-white p-3 shadow-sm md:p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => router.push("/proje-satis-sablonu")}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#C7D6E8] text-slate-700"
                aria-label="Geri"
              >
                <ArrowLeft size={19} />
              </button>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="truncate text-lg font-black text-slate-900 md:text-xl">
                    {response.project.name}
                  </h1>
                  <span className="shrink-0 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-black text-blue-700">
                    {statusLabel(response.scene.status)}
                  </span>
                </div>
                <p className="truncate text-xs font-medium text-slate-500 md:text-sm">
                  3D Proje Stüdyosu • {response.project.city} / {response.project.district}
                </p>
              </div>
            </div>

            <div className="flex flex-1 flex-wrap justify-end gap-2 md:flex-none">
              <button
                type="button"
                onClick={() => toggleSetting("showGrid")}
                className={`inline-flex h-10 items-center gap-2 rounded-xl border px-3 text-xs font-bold ${
                  sceneData.settings.showGrid
                    ? "border-blue-200 bg-blue-50 text-blue-700"
                    : "border-[#C7D6E8] bg-white text-slate-600"
                }`}
              >
                <Grid3X3 size={16} /> Izgara
              </button>
              <button
                type="button"
                onClick={() => void persistScene()}
                disabled={!dirty || Boolean(busyAction)}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-xs font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {busyAction === "save" ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : (
                  <Save size={16} />
                )}
                Kaydet
              </button>
            </div>
          </div>
        </header>

        {notice && <NoticeBand notice={notice} compact />}

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_330px]">
          <section className="overflow-hidden rounded-2xl border border-[#C7D6E8] bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <div>
                <h2 className="text-sm font-black text-slate-900">Vaziyet Planı</h2>
                <p className="text-xs text-slate-500">
                  Bloğu tutup sürükleyerek konumlandır.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <div className="inline-flex rounded-xl border border-[#C7D6E8] bg-[#F8FAFC] p-1">
                  {[
                    { value: "SITE" as const, label: "Vaziyet" },
                    { value: "FOCUS" as const, label: "Blok Odak" },
                    { value: "PRESENTATION" as const, label: "Sunum" },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setSceneViewMode(option.value)}
                      className={`h-8 rounded-lg px-2.5 text-[10px] font-black transition ${
                        sceneViewMode === option.value
                          ? "bg-blue-600 text-white shadow-sm"
                          : "text-slate-600 hover:bg-white"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <div className="text-right text-xs font-bold text-slate-500">
                  {sceneData.plot.width} × {sceneData.plot.depth} m
                </div>
              </div>
            </div>

            <div className="relative min-h-[480px] overflow-hidden bg-[#dbeafe] md:min-h-[670px]">
              <PremiumProjectScene
                sceneData={sceneData}
                selectedId={selectedId}
                dragElementId={dragState?.elementId || null}
                viewMode={sceneViewMode}
                sceneMetrics={sceneMetrics}
                toIso={toIso}
                onClearSelection={() => setSelectedId(null)}
                onElementPointerDown={handlePointerDown}
                onElementPointerMove={handlePointerMove}
                onElementPointerUp={finishDrag}
              />

              <div className="pointer-events-none absolute bottom-3 left-3 rounded-xl border border-white/70 bg-white/90 px-3 py-2 text-[11px] font-bold text-slate-600 shadow-sm backdrop-blur">
                {sceneData.elements.filter((item) => item.type === "BLOCK").length} blok •{" "}
                {sceneData.elements.filter((item) => item.type !== "BLOCK").length} alan
              </div>
            </div>
          </section>

          <aside className="space-y-3">
            <section className="rounded-2xl border border-[#C7D6E8] bg-white p-4 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-blue-50 text-blue-700">
                  {selectedElement?.type === "BLOCK" ? (
                    <Building2 size={18} />
                  ) : selectedElement ? (
                    <Trees size={18} />
                  ) : (
                    <Box size={18} />
                  )}
                </div>
                <div>
                  <h2 className="text-sm font-black text-slate-900">
                    {selectedElement?.name || "Nesne Seçilmedi"}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {selectedElement
                      ? selectedElement.type === "BLOCK"
                        ? `${selectedElement.floorCount || 0} katlı blok`
                        : "Proje alanı"
                      : "Sahneden bir blok veya alan seç."}
                  </p>
                </div>
              </div>

              {selectedElement ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    <NumberField
                      label="X Konumu"
                      value={selectedElement.position[0]}
                      onChange={(value) =>
                        setElementPosition(
                          selectedElement.id,
                          value,
                          selectedElement.position[2],
                        )
                      }
                    />
                    <NumberField
                      label="Z Konumu"
                      value={selectedElement.position[2]}
                      onChange={(value) =>
                        setElementPosition(
                          selectedElement.id,
                          selectedElement.position[0],
                          value,
                        )
                      }
                    />
                  </div>

                  <div>
                    <p className="mb-2 text-xs font-black text-slate-600">Hassas Konum</p>
                    <div className="mx-auto grid w-[132px] grid-cols-3 gap-1.5">
                      <span />
                      <ControlButton onClick={() => nudgeSelected(-1, -1)}>
                        <ChevronUp size={18} />
                      </ControlButton>
                      <span />
                      <ControlButton onClick={() => nudgeSelected(-1, 1)}>
                        <ChevronLeft size={18} />
                      </ControlButton>
                      <ControlButton onClick={() => rotateSelected(15)}>
                        <RotateCcw size={17} />
                      </ControlButton>
                      <ControlButton onClick={() => nudgeSelected(1, -1)}>
                        <ChevronRight size={18} />
                      </ControlButton>
                      <span />
                      <ControlButton onClick={() => nudgeSelected(1, 1)}>
                        <ChevronDown size={18} />
                      </ControlButton>
                      <span />
                    </div>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
                    <div className="flex justify-between gap-3">
                      <span>Boyut</span>
                      <strong className="text-slate-800">
                        {selectedElement.size.width} × {selectedElement.size.depth} m
                      </strong>
                    </div>
                    <div className="mt-2 flex justify-between gap-3">
                      <span>Dönüş</span>
                      <strong className="text-slate-800">
                        {Math.round(selectedElement.rotationY)}°
                      </strong>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-xs font-semibold leading-5 text-slate-500">
                  Blokları sürükleyerek proje vaziyet planını düzenleyebilirsin.
                </div>
              )}
            </section>

            <FacadeLandscapeControls
              selectedElement={selectedElement}
              sceneData={sceneData}
              onApplyFacadePreset={applyFacadePreset}
              onApplyFacadeToAllBlocks={applyFacadeToAllBlocks}
              onUpdateLandscape={updateLandscape}
            />

            <section className="rounded-2xl border border-[#C7D6E8] bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-sm font-black text-slate-900">Proje Özeti</h2>
              <div className="grid grid-cols-2 gap-2">
                <MiniMetric label="Blok" value={response.project.blockCount} />
                <MiniMetric label="Alan" value={response.project.visibleSpaceCount} />
                <MiniMetric label="Sürüm" value={`v${response.scene.version}`} />
                <MiniMetric label="Durum" value={statusLabel(response.scene.status)} />
              </div>
            </section>

            <section className="grid gap-2 rounded-2xl border border-[#C7D6E8] bg-white p-4 shadow-sm">
              <button
                type="button"
                onClick={() => void completeScene()}
                disabled={Boolean(busyAction)}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-600 text-sm font-black text-white disabled:opacity-60"
              >
                {busyAction === "complete" ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <Check size={18} />
                )}
                3D Modeli Tamamla
              </button>
              <button
                type="button"
                onClick={() => void resetScene()}
                disabled={Boolean(busyAction)}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 text-xs font-black text-red-700 disabled:opacity-60"
              >
                <RotateCcw size={16} /> Otomatik Yerleşimi Yenile
              </button>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}

function MetricCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="mb-3 text-blue-600">{icon}</div>
      <div className="text-xl font-black text-slate-900">{value}</div>
      <div className="mt-1 text-xs font-bold text-slate-500">{label}</div>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <div className="truncate text-sm font-black text-slate-900">{value}</div>
      <div className="mt-1 text-[11px] font-bold text-slate-500">{label}</div>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-black text-slate-600">{label}</span>
      <input
        type="number"
        step="0.5"
        value={Number(value.toFixed(2))}
        onChange={(event) => onChange(Number(event.target.value) || 0)}
        className="h-10 w-full rounded-xl border border-[#C7D6E8] bg-[#EEF3F8] px-3 text-sm font-bold text-slate-800 outline-none focus:border-blue-500"
      />
    </label>
  );
}

function ControlButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="grid h-40 min-h-10 w-10 place-items-center rounded-xl border border-[#C7D6E8] bg-white text-slate-700 shadow-sm active:scale-95"
      style={{ height: 40 }}
    >
      {children}
    </button>
  );
}

function NoticeBand({ notice, compact = false }: { notice: Notice; compact?: boolean }) {
  if (!notice) return null;

  const toneClass = {
    success: "border-emerald-200 bg-emerald-50 text-emerald-800",
    error: "border-red-200 bg-red-50 text-red-800",
    warning: "border-amber-200 bg-amber-50 text-amber-800",
  }[notice.tone];

  return (
    <div
      className={`${compact ? "mb-3" : "mx-5 mb-5 md:mx-7"} rounded-xl border px-4 py-3 text-xs font-bold ${toneClass}`}
    >
      {notice.message}
    </div>
  );
}
