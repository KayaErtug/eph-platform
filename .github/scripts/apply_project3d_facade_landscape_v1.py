from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected exactly one match, found {count}")
    return text.replace(old, new, 1)


def replace_regex(text: str, pattern: str, replacement: str, label: str) -> str:
    updated, count = re.subn(pattern, replacement, text, count=1, flags=re.S)
    if count != 1:
        raise RuntimeError(f"{label}: expected exactly one regex match, found {count}")
    return updated


def patch_client() -> None:
    path = ROOT / "frontend/src/app/proje-satis-sablonu/3d/[projectId]/Project3DStudioClient.tsx"
    text = path.read_text(encoding="utf-8")

    text = replace_once(
        text,
        '''import PremiumProjectScene, {
  type SceneViewMode,
} from "./PremiumProjectScene";
import type {
  ProjectSceneData,
  ProjectSceneElement,
  ProjectSceneResponse,
} from "./projectSceneTypes";''',
        '''import FacadeLandscapeControls from "./FacadeLandscapeControls";
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
} from "./projectSceneTypes";''',
        "client imports",
    )

    text = replace_once(
        text,
        "const defaultSceneData: ProjectSceneData = {\n  schemaVersion: 1,",
        "const defaultSceneData: ProjectSceneData = {\n  schemaVersion: 3,",
        "client default schema version",
    )

    text = replace_once(
        text,
        '''  settings: {
    showGrid: true,
    showLabels: true,
    quality: "AUTO",
  },
  elements: [],''',
        '''  settings: {
    showGrid: true,
    showLabels: true,
    quality: "AUTO",
  },
  landscape: defaultLandscapeSettings,
  elements: [],''',
        "client default landscape",
    )

    text = replace_once(
        text,
        '''    settings: {
      showGrid: source.settings?.showGrid ?? true,
      showLabels: source.settings?.showLabels ?? true,
      quality: source.settings?.quality || "AUTO",
    },
    elements: Array.isArray(source.elements) ? source.elements : [],''',
        '''    settings: {
      showGrid: source.settings?.showGrid ?? true,
      showLabels: source.settings?.showLabels ?? true,
      quality: source.settings?.quality || "AUTO",
    },
    landscape: normalizeLandscapeSettings(source.landscape),
    elements: Array.isArray(source.elements) ? source.elements : [],''',
        "client normalize landscape",
    )

    text = replace_once(
        text,
        '''  const toggleSetting = (key: "showGrid" | "showLabels") => {
    setSceneData((current) => ({
      ...current,
      settings: {
        ...current.settings,
        [key]: !current.settings[key],
      },
    }));
    setDirty(true);
  };
''',
        '''  const toggleSetting = (key: "showGrid" | "showLabels") => {
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
''',
        "client style callbacks",
    )

    text = replace_once(
        text,
        '''            </section>

            <section className="rounded-2xl border border-[#C7D6E8] bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-sm font-black text-slate-900">Proje Özeti</h2>''',
        '''            </section>

            <FacadeLandscapeControls
              selectedElement={selectedElement}
              sceneData={sceneData}
              onApplyFacadePreset={applyFacadePreset}
              onApplyFacadeToAllBlocks={applyFacadeToAllBlocks}
              onUpdateLandscape={updateLandscape}
            />

            <section className="rounded-2xl border border-[#C7D6E8] bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-sm font-black text-slate-900">Proje Özeti</h2>''',
        "client controls insertion",
    )

    path.write_text(text, encoding="utf-8")


def patch_renderer() -> None:
    path = ROOT / "frontend/src/app/proje-satis-sablonu/3d/[projectId]/PremiumProjectScene.tsx"
    text = path.read_text(encoding="utf-8")

    text = replace_once(
        text,
        '''import type { ProjectSceneData, ProjectSceneElement } from "./projectSceneTypes";''',
        '''import LandscapeLayer from "./LandscapeLayer";
import type { ProjectSceneData, ProjectSceneElement } from "./projectSceneTypes";
import { resolveFacadePalette } from "./sceneStylePresets";''',
        "renderer imports",
    )

    text = replace_regex(
        text,
        r'''function blockPalette\(\n  selected: boolean,\n  presentation: boolean,\n\): ScenePalette \{.*?\n\}\n\nfunction renderAmenityMarkings''',
        '''function blockPalette(
  element: ProjectSceneElement,
  selected: boolean,
  presentation: boolean,
): ScenePalette {
  return resolveFacadePalette(element, { selected, presentation });
}

function renderAmenityMarkings''',
        "renderer block palette",
    )

    text = replace_once(
        text,
        '''      ? blockPalette(selected, viewMode === "PRESENTATION")''',
        '''      ? blockPalette(element, selected, viewMode === "PRESENTATION")''',
        "renderer palette call",
    )

    text = replace_once(
        text,
        '''    const floorCount = Math.max(1, element.floorCount || 1);
    const visibleFloorCount = Math.min(floorCount, 24);
    const showLabel =''',
        '''    const floorCount = Math.max(1, element.floorCount || 1);
    const visibleFloorCount = Math.min(floorCount, 24);
    const balconyStyle = element.facadeStyle?.balconyStyle || "GLASS";
    const verticalFins = element.facadeStyle?.verticalFins ?? false;
    const showLabel =''',
        "renderer facade variables",
    )

    text = replace_once(
        text,
        '''                        stroke={balconyFloor ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.55)"}
                        strokeWidth={balconyFloor ? 2.2 : 1}''',
        '''                        stroke={
                          balconyFloor
                            ? palette.frame || palette.accent
                            : "rgba(255,255,255,0.55)"
                        }
                        strokeWidth={
                          balconyFloor
                            ? balconyStyle === "FRAME"
                              ? 3.2
                              : balconyStyle === "SOLID"
                                ? 2.7
                                : 2.2
                            : 1
                        }''',
        "renderer balcony style",
    )

    text = replace_once(
        text,
        '''                        stroke={palette.glass}
                        strokeWidth="1.15"
                        opacity={isFront ? 0.72 : 0.45}''',
        '''                        stroke={verticalFins ? palette.accent : palette.glass}
                        strokeWidth={verticalFins ? 2.15 : 1.15}
                        opacity={verticalFins ? (isFront ? 0.9 : 0.58) : isFront ? 0.72 : 0.45}''',
        "renderer vertical fins",
    )

    text = replace_once(
        text,
        '''      <polygon
        points={polygonPoints(innerPlotPoints)}
        fill="none"
        stroke="#cbd5e1"
        strokeWidth="8"
        strokeLinejoin="round"
        opacity="0.8"
      />

      {sceneData.settings.showGrid && viewMode !== "PRESENTATION" && (''',
        '''      <polygon
        points={polygonPoints(innerPlotPoints)}
        fill="none"
        stroke="#cbd5e1"
        strokeWidth="8"
        strokeLinejoin="round"
        opacity="0.8"
      />

      <LandscapeLayer sceneData={sceneData} viewMode={viewMode} toIso={toIso} />

      {sceneData.settings.showGrid && viewMode !== "PRESENTATION" && (''',
        "renderer landscape layer",
    )

    path.write_text(text, encoding="utf-8")


def patch_backend() -> None:
    path = ROOT / "backend/src/project-scene/project-scene.service.ts"
    text = path.read_text(encoding="utf-8")

    text = replace_once(
        text,
        '''        sceneData: {
          schemaVersion: 1,
          skipped: true,
          elements: [],
        },''',
        '''        sceneData: {
          schemaVersion: 3,
          skipped: true,
          landscape: {
            preset: 'URBAN_MODERN',
            density: 3,
            showTrees: true,
            showPaths: true,
            showLighting: true,
            showBenches: true,
            showShrubs: true,
          },
          elements: [],
        },''',
        "backend skipped scene",
    )

    text = replace_once(
        text,
        '''        stylePreset: 'MODERN_LIGHT',
        floors: block.floors.map((floor) => ({''',
        '''        stylePreset: 'MODERN_LIGHT',
        facadeStyle: {
          preset: 'MODERN_LIGHT',
          primaryColor: '#2563eb',
          secondaryColor: '#60a5fa',
          accentColor: '#ffffff',
          glassColor: '#dbeafe',
          roofColor: '#f8fafc',
          balconyStyle: 'GLASS',
          verticalFins: false,
        },
        floors: block.floors.map((floor) => ({''',
        "backend default facade",
    )

    text = replace_once(
        text,
        '''      schemaVersion: 2,
      plot: {''',
        '''      schemaVersion: 3,
      plot: {''',
        "backend scene schema version",
    )

    text = replace_once(
        text,
        '''      settings: {
        showGrid: true,
        showLabels: true,
        quality: 'AUTO',
      },
      elements: [...blockElements, ...amenityElements],''',
        '''      settings: {
        showGrid: true,
        showLabels: true,
        quality: 'AUTO',
      },
      landscape: {
        preset: 'URBAN_MODERN',
        density: 3,
        showTrees: true,
        showPaths: true,
        showLighting: true,
        showBenches: true,
        showShrubs: true,
      },
      elements: [...blockElements, ...amenityElements],''',
        "backend default landscape",
    )

    path.write_text(text, encoding="utf-8")


def main() -> None:
    patch_client()
    patch_renderer()
    patch_backend()
    print("Project3D facade and landscape V1 patches applied successfully.")


if __name__ == "__main__":
    main()
