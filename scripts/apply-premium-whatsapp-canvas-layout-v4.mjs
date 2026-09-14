import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const filePath = path.join(
  root,
  "frontend/src/components/portfolio/PortfolioShareModal.tsx",
);
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

if (!fs.existsSync(filePath)) {
  throw new Error(`Dosya bulunamadı: ${filePath}`);
}

const backupPath = `${filePath}.backup-whatsapp-canvas-v4-${timestamp}`;
fs.copyFileSync(filePath, backupPath);

let source = fs.readFileSync(filePath, "utf8");

const functionStart = source.indexOf("async function drawPremiumCanvas(");
const watermarkStart = source.indexOf(
  "\n  ctx.save();\n  ctx.translate(width / 2, height / 2);",
  functionStart,
);

if (functionStart < 0 || watermarkStart < 0) {
  throw new Error("drawPremiumCanvas sınırları bulunamadı.");
}

const beforeCanvas = source.slice(0, functionStart);
let canvasHead = source.slice(functionStart, watermarkStart);
const afterCanvasHead = source.slice(watermarkStart);

const visibleFeaturesPattern =
  /^\s{2}const visibleFeatures\s*=\s*data\.additionalFeatures\.slice\([\s\S]*?\);\n/gm;

const existingDeclarations = canvasHead.match(visibleFeaturesPattern) || [];

if (existingDeclarations.length === 0) {
  throw new Error("visibleFeatures tanımı bulunamadı.");
}

canvasHead = canvasHead.replace(visibleFeaturesPattern, "");

const anchor = "  const featureTitleY = featuresY;\n";
const canonicalDeclaration = `  const visibleFeatures = data.additionalFeatures.slice(\n    0,\n    isVertical ? 8 : mode === "whatsapp" ? 8 : 6,\n  );\n`;

if (!canvasHead.includes(anchor)) {
  throw new Error("featureTitleY sabitleme noktası bulunamadı.");
}

canvasHead = canvasHead.replace(
  anchor,
  `${anchor}${canonicalDeclaration}`,
);

const finalDeclarations = canvasHead.match(visibleFeaturesPattern) || [];

if (finalDeclarations.length !== 1) {
  throw new Error(
    `visibleFeatures tekilleştirilemedi. Kalan tanım sayısı: ${finalDeclarations.length}`,
  );
}

source = `${beforeCanvas}${canvasHead}${afterCanvasHead}`;
fs.writeFileSync(filePath, source, "utf8");

console.log("WhatsApp canvas V4 tanım düzeltmesi uygulandı.");
console.log(`- Önceki visibleFeatures tanım sayısı: ${existingDeclarations.length}`);
console.log("- Son visibleFeatures tanım sayısı: 1");
console.log("- V3 yerleşim ve 1080x1450 WhatsApp ölçüsü korundu.");
console.log(`Yedek: ${backupPath}`);
