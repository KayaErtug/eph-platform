import fs from "node:fs";

const path = "frontend/src/app/proje-satis-sablonu/3d/[projectId]/PremiumProjectScene.tsx";
let source = fs.readFileSync(path, "utf8");

const marker = `type SceneMetrics = {`;
const paletteType = `type ScenePalette = {\n  top?: string;\n  side?: string;\n  edge?: string;\n  accent?: string;\n  roof?: string;\n  roofInset?: string;\n  facadeFront?: string;\n  facadeSide?: string;\n  facadeBack?: string;\n  frame?: string;\n  glass?: string;\n};\n\ntype SceneMetrics = {`;

if (!source.includes("type ScenePalette =")) {
  if (!source.includes(marker)) throw new Error("SceneMetrics marker not found");
  source = source.replace(marker, paletteType);
}

source = source.replace(
  `function amenityPalette(spaceType?: string) {`,
  `function amenityPalette(spaceType?: string): ScenePalette {`,
);
source = source.replace(
  `function blockPalette(selected: boolean, presentation: boolean) {`,
  `function blockPalette(\n  selected: boolean,\n  presentation: boolean,\n): ScenePalette {`,
);

fs.writeFileSync(path, source, "utf8");
console.log("Project3D palette types fixed.");
