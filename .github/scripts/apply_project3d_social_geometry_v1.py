from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected exactly one match, found {count}")
    return text.replace(old, new, 1)


def patch_renderer() -> None:
    path = ROOT / "frontend/src/app/proje-satis-sablonu/3d/[projectId]/PremiumProjectScene.tsx"
    text = path.read_text(encoding="utf-8")

    text = replace_once(
        text,
        'import type { PointerEvent as ReactPointerEvent } from "react";\n\nimport LandscapeLayer from "./LandscapeLayer";',
        'import type { PointerEvent as ReactPointerEvent } from "react";\n\nimport AmenityGeometry from "./AmenityGeometry";\nimport LandscapeLayer from "./LandscapeLayer";',
        "renderer amenity import",
    )

    text = replace_once(
        text,
        '  if (geometry.includes("L")) {',
        '  if (["L", "L_PLAN", "L_TIPI", "L_SHAPE"].includes(geometry)) {',
        "renderer exact L geometry",
    )
    text = replace_once(
        text,
        '  if (geometry.includes("U")) {',
        '  if (["U", "U_PLAN", "U_TIPI", "U_SHAPE"].includes(geometry)) {',
        "renderer exact U geometry",
    )
    text = replace_once(
        text,
        '  if (geometry.includes("T")) {',
        '  if (["T", "T_PLAN", "T_TIPI", "T_SHAPE"].includes(geometry)) {',
        "renderer exact T geometry",
    )
    text = replace_once(
        text,
        '  if (geometry.includes("KARE")) {',
        '  if (geometry === "KARE" || geometry === "KARE_PLAN") {',
        "renderer exact square geometry",
    )

    text = replace_once(
        text,
        '''    const selected = selectedId === element.id;
    const isBlock = element.type === "BLOCK";
    const localFootprint = geometryFootprint(element);''',
        '''    const selected = selectedId === element.id;
    const isBlock = element.type === "BLOCK";

    if (!isBlock) {
      return (
        <AmenityGeometry
          key={element.id}
          element={element}
          selected={selected}
          dragElementId={dragElementId}
          viewMode={viewMode}
          sceneMetrics={sceneMetrics}
          toIso={toIso}
          showLabels={sceneData.settings.showLabels}
          onElementPointerDown={onElementPointerDown}
          onElementPointerMove={onElementPointerMove}
          onElementPointerUp={onElementPointerUp}
        />
      );
    }

    const localFootprint = geometryFootprint(element);''',
        "renderer amenity branch",
    )

    path.write_text(text, encoding="utf-8")


def patch_types() -> None:
    path = ROOT / "frontend/src/app/proje-satis-sablonu/3d/[projectId]/projectSceneTypes.ts"
    text = path.read_text(encoding="utf-8")
    text = replace_once(
        text,
        '''  sourceId: string;
  name: string;
  code?: string;''',
        '''  sourceId: string;
  name: string;
  projectName?: string;
  code?: string;''',
        "types project name",
    )
    path.write_text(text, encoding="utf-8")


def patch_client() -> None:
    path = ROOT / "frontend/src/app/proje-satis-sablonu/3d/[projectId]/Project3DStudioClient.tsx"
    text = path.read_text(encoding="utf-8")

    text = replace_once(
        text,
        "  schemaVersion: 3,",
        "  schemaVersion: 4,",
        "client schema version",
    )
    text = replace_once(
        text,
        "    schemaVersion: Number(source.schemaVersion) || 1,",
        "    schemaVersion: Math.max(4, Number(source.schemaVersion) || 1),",
        "client normalized schema version",
    )

    marker = '''function apiErrorMessage(error: unknown) {'''
    helper = '''function isSiteGate(element: ProjectSceneElement) {
  const type = String(element.spaceType || "").toUpperCase();
  return (
    type === "GIRIS_KAPISI_KEMERI" ||
    type === "SITE_GATE_ARCH" ||
    element.id === "system-site-gate"
  );
}

function ensureMandatorySiteGate(
  sceneData: ProjectSceneData,
  projectName: string,
): ProjectSceneData {
  const existingIndex = sceneData.elements.findIndex(isSiteGate);

  if (existingIndex >= 0) {
    return {
      ...sceneData,
      schemaVersion: Math.max(4, sceneData.schemaVersion),
      elements: sceneData.elements.map((element, index) =>
        index === existingIndex
          ? {
              ...element,
              projectName,
              spaceType: "GIRIS_KAPISI_KEMERI",
              size: {
                width: Math.max(16, Number(element.size?.width) || 20),
                depth: Math.max(5, Number(element.size?.depth) || 7),
                height: Math.max(4.2, Number(element.size?.height) || 5.2),
              },
            }
          : element,
      ),
    };
  }

  return {
    ...sceneData,
    schemaVersion: Math.max(4, sceneData.schemaVersion),
    elements: [
      ...sceneData.elements,
      {
        id: "system-site-gate",
        type: "AMENITY",
        sourceId: "system-site-gate",
        name: "Giriş Kapısı Kemeri",
        projectName,
        spaceType: "GIRIS_KAPISI_KEMERI",
        grossArea: 90,
        position: [0, 0.1, Math.max(0, sceneData.plot.depth / 2 - 5.5)],
        rotationY: 0,
        size: {
          width: 20,
          depth: 7,
          height: 5.2,
        },
        stylePreset: "SITE_GATE_PREMIUM",
      },
    ],
  };
}

'''
    text = replace_once(text, marker, helper + marker, "client gate helper")

    text = replace_once(
        text,
        '''    setResponse(next);
    setSceneData(normalizeSceneData(next.scene?.sceneData));
    setSelectedId(null);''',
        '''    setResponse(next);
    setSceneData(
      ensureMandatorySiteGate(
        normalizeSceneData(next.scene?.sceneData),
        next.project.name,
      ),
    );
    setSelectedId(null);''',
        "client inject mandatory gate",
    )

    path.write_text(text, encoding="utf-8")


def patch_backend() -> None:
    path = ROOT / "backend/src/project-scene/project-scene.service.ts"
    text = path.read_text(encoding="utf-8")

    text = text.replace("schemaVersion: 3,", "schemaVersion: 4,")

    text = replace_once(
        text,
        '''        name: space.name,
        spaceType: space.spaceType,
        grossArea: space.grossArea,''',
        '''        name: space.name,
        projectName:
          space.spaceType === 'GIRIS_KAPISI_KEMERI'
            ? project.name
            : undefined,
        spaceType: space.spaceType,
        grossArea: space.grossArea,''',
        "backend explicit gate project name",
    )

    text = replace_once(
        text,
        '''    return {
      schemaVersion: 4,''',
        '''    const hasExplicitGate = amenityElements.some(
      (element) => element.spaceType === 'GIRIS_KAPISI_KEMERI',
    );
    const gateElements = hasExplicitGate
      ? []
      : [
          {
            id: 'system-site-gate',
            type: 'AMENITY',
            sourceId: 'system-site-gate',
            name: 'Giriş Kapısı Kemeri',
            projectName: project.name,
            spaceType: 'GIRIS_KAPISI_KEMERI',
            grossArea: 90,
            blockId: null,
            floorId: null,
            position: [0, 0.1, Math.max(0, plotDepth / 2 - 5.5)],
            rotationY: 0,
            size: {
              width: 20,
              depth: 7,
              height: 5.2,
            },
            stylePreset: 'SITE_GATE_PREMIUM',
          },
        ];

    return {
      schemaVersion: 4,''',
        "backend mandatory gate",
    )

    text = replace_once(
        text,
        "      elements: [...blockElements, ...amenityElements],",
        "      elements: [...blockElements, ...amenityElements, ...gateElements],",
        "backend gate elements",
    )

    path.write_text(text, encoding="utf-8")


def patch_options() -> None:
    path = ROOT / "frontend/src/app/proje-satis-sablonu/lib/projectSalesOptions.ts"
    text = path.read_text(encoding="utf-8-sig")

    text = replace_once(
        text,
        '''  { value: "SUS_HAVUZU", label: "Süs Havuzu" },
  { value: "DIGER", label: "Diğer" },''',
        '''  { value: "SUS_HAVUZU", label: "Süs Havuzu" },
  {
    value: "GIRIS_KAPISI_KEMERI",
    label: "Giriş Kapısı Kemeri / Proje İsimliği",
  },
  { value: "DIGER", label: "Diğer" },''',
        "options gate entry",
    )

    text = replace_once(
        text,
        '''  "SUS_HAVUZU",
  "COCUK_OYUN_ALANI",''',
        '''  "SUS_HAVUZU",
  "GIRIS_KAPISI_KEMERI",
  "COCUK_OYUN_ALANI",''',
        "options open gate",
    )

    path.write_text(text, encoding="utf-8")


def main() -> None:
    patch_renderer()
    patch_types()
    patch_client()
    patch_backend()
    patch_options()
    print("Project3D social geometry V1 applied successfully.")


if __name__ == "__main__":
    main()
