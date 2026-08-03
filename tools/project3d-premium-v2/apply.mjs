import fs from "node:fs";

function read(path) {
  return fs.readFileSync(path, "utf8");
}

function write(path, value) {
  fs.writeFileSync(path, value, "utf8");
}

function replaceOnce(source, from, to, label) {
  if (source.includes(to)) return source;
  const count = source.split(from).length - 1;
  if (count !== 1) {
    throw new Error(`${label}: expected one match, found ${count}`);
  }
  return source.replace(from, to);
}

function replaceRegexOnce(source, pattern, replacement, label) {
  const matches = source.match(pattern);
  if (!matches) {
    if (source.includes(replacement)) return source;
    throw new Error(`${label}: pattern not found`);
  }
  return source.replace(pattern, replacement);
}

{
  const path = "frontend/src/app/proje-satis-sablonu/3d/[projectId]/Project3DStudioClient.tsx";
  let source = read(path);

  source = replaceOnce(
    source,
    `import api from "@/lib/api";\n\nimport type {`,
    `import api from "@/lib/api";\n\nimport PremiumProjectScene, {\n  type SceneViewMode,\n} from "./PremiumProjectScene";\nimport type {`,
    "premium renderer import",
  );

  source = replaceRegexOnce(
    source,
    /\nfunction amenityPalette\(spaceType\?: string\) \{[\s\S]*?\n\}\n\nexport default function Project3DStudioClient/,
    `\nexport default function Project3DStudioClient`,
    "remove legacy amenity palette",
  );

  source = replaceOnce(
    source,
    `  const [notice, setNotice] = useState<Notice>(null);`,
    `  const [notice, setNotice] = useState<Notice>(null);\n  const [sceneViewMode, setSceneViewMode] = useState<SceneViewMode>("SITE");`,
    "scene view mode state",
  );

  source = replaceRegexOnce(
    source,
    /\n  const renderElement = \(element: ProjectSceneElement\) => \{[\s\S]*?\n  if \(loading\) \{/,
    `\n  if (loading) {`,
    "remove legacy scene renderer",
  );

  source = replaceOnce(
    source,
    `              <div className="text-right text-xs font-bold text-slate-500">\n                {sceneData.plot.width} × {sceneData.plot.depth} m\n              </div>`,
    `              <div className="flex flex-wrap items-center justify-end gap-2">\n                <div className="inline-flex rounded-xl border border-[#C7D6E8] bg-[#F8FAFC] p-1">\n                  {[\n                    { value: "SITE" as const, label: "Vaziyet" },\n                    { value: "FOCUS" as const, label: "Blok Odak" },\n                    { value: "PRESENTATION" as const, label: "Sunum" },\n                  ].map((option) => (\n                    <button\n                      key={option.value}\n                      type="button"\n                      onClick={() => setSceneViewMode(option.value)}\n                      className={\`h-8 rounded-lg px-2.5 text-[10px] font-black transition \${\n                        sceneViewMode === option.value\n                          ? "bg-blue-600 text-white shadow-sm"\n                          : "text-slate-600 hover:bg-white"\n                      }\`}\n                    >\n                      {option.label}\n                    </button>\n                  ))}\n                </div>\n                <div className="text-right text-xs font-bold text-slate-500">\n                  {sceneData.plot.width} × {sceneData.plot.depth} m\n                </div>\n              </div>`,
    "scene mode controls",
  );

  source = replaceRegexOnce(
    source,
    /              <svg[\s\S]*?              <\/svg>/,
    `              <PremiumProjectScene\n                sceneData={sceneData}\n                selectedId={selectedId}\n                dragElementId={dragState?.elementId || null}\n                viewMode={sceneViewMode}\n                sceneMetrics={sceneMetrics}\n                toIso={toIso}\n                onClearSelection={() => setSelectedId(null)}\n                onElementPointerDown={handlePointerDown}\n                onElementPointerMove={handlePointerMove}\n                onElementPointerUp={finishDrag}\n              />`,
    "replace legacy SVG",
  );

  source = replaceOnce(
    source,
    `            <div className="relative min-h-[480px] overflow-hidden bg-gradient-to-b from-[#eaf3ff] to-[#dbeafe] md:min-h-[670px]">`,
    `            <div className="relative min-h-[480px] overflow-hidden bg-[#dbeafe] md:min-h-[670px]">`,
    "premium scene container",
  );

  write(path, source);
}

{
  const path = "backend/src/project-scene/project-scene.service.ts";
  let source = read(path);

  source = replaceOnce(source, `    const spacingX = 28;`, `    const spacingX = 34;`, "block spacing x");
  source = replaceOnce(source, `    const spacingZ = 24;`, `    const spacingZ = 30;`, "block spacing z");
  source = replaceOnce(
    source,
    `    const plotWidth = Math.max(60, columns * spacingX + 20);\n    const plotDepth = Math.max(60, rows * spacingZ + 20);`,
    `    const plotWidth = Math.max(68, columns * spacingX + 26);\n    const plotDepth = Math.max(64, rows * spacingZ + 26);`,
    "premium plot size",
  );

  source = replaceOnce(
    source,
    `      const floorCount = Math.max(1, block.floors.length);\n\n      return {`,
    `      const floorCount = Math.max(1, block.floors.length);\n      const geometryType = String(block.geometryType || 'DIKDORTGEN');\n      const isSquare = geometryType.includes('KARE');\n      const isLShape = geometryType.includes('L');\n      const blockWidth = isSquare ? 16 : isLShape ? 22 : 20;\n      const blockDepth = isSquare ? 16 : isLShape ? 18 : 13;\n\n      return {`,
    "geometry aware block dimensions",
  );

  source = replaceOnce(
    source,
    `        size: {\n          width: 18,\n          depth: 12,\n          height: floorCount * 3.2,\n        },`,
    `        size: {\n          width: blockWidth,\n          depth: blockDepth,\n          height: floorCount * 3.05 + 1.2,\n        },`,
    "premium block size",
  );

  source = replaceOnce(
    source,
    `      const angle =\n        project.spaces.length === 1\n          ? 0\n          : (Math.PI * 2 * index) / project.spaces.length;\n\n      return {`,
    `      const angle =\n        project.spaces.length === 1\n          ? 0\n          : (Math.PI * 2 * index) / project.spaces.length;\n      const areaBase = Math.sqrt(Math.max(36, Number(space.grossArea || 72)));\n      const amenityWidth = Math.min(18, Math.max(8, areaBase * 1.35));\n      const amenityDepth = Math.min(14, Math.max(6, areaBase * 0.9));\n\n      return {`,
    "amenity area sizing",
  );

  source = replaceOnce(
    source,
    `        size: {\n          width: 10,\n          depth: 8,\n          height: 0.4,\n        },`,
    `        size: {\n          width: amenityWidth,\n          depth: amenityDepth,\n          height: 0.65,\n        },`,
    "premium amenity size",
  );

  source = replaceOnce(
    source,
    `      schemaVersion: 1,\n      plot: {\n        width: plotWidth,`,
    `      schemaVersion: 2,\n      plot: {\n        width: plotWidth,`,
    "scene schema v2",
  );

  source = replaceOnce(
    source,
    `        position: [40, 34, 40],`,
    `        position: [46, 38, 46],`,
    "premium camera position",
  );

  write(path, source);
}

console.log("Project3D premium geometry V2 patches applied.");
