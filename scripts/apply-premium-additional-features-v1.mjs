import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

const standardPath = path.join(
  root,
  "frontend/src/components/portfolio/ephPremiumCardStandard.ts",
);
const modalPath = path.join(
  root,
  "frontend/src/components/portfolio/PortfolioShareModal.tsx",
);

function assertFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Dosya bulunamadı: ${filePath}`);
  }
}

function backup(filePath) {
  const backupPath = `${filePath}.backup-additional-features-${timestamp}`;
  fs.copyFileSync(filePath, backupPath);
  return backupPath;
}

assertFile(standardPath);
assertFile(modalPath);

const standardBackup = backup(standardPath);
const modalBackup = backup(modalPath);

let standard = fs.readFileSync(standardPath, "utf8");

const oldAdditionalFeatures = `  const additionalFeatures = unique([\n    ...featureLabels,\n    ...(base?.features || []).map((item) => item.label),\n  ]).slice(0, 12);`;

const newAdditionalFeatures = `  const additionalFeatures = unique(featureLabels).slice(0, 12);`;

if (!standard.includes(oldAdditionalFeatures)) {
  if (!standard.includes(newAdditionalFeatures)) {
    throw new Error("İlave özellik veri bloğu bulunamadı.");
  }
} else {
  standard = standard.replace(oldAdditionalFeatures, newAdditionalFeatures);
}

fs.writeFileSync(standardPath, standard, "utf8");

let modal = fs.readFileSync(modalPath, "utf8");

const startMarker = "  const featuresY = factsY + 4 * (factHeight + factGap) + 4;";
const endMarker = "  if (isVertical) {";
const start = modal.indexOf(startMarker);
const end = modal.indexOf(endMarker, start);

if (start < 0 || end < 0) {
  throw new Error("PNG ilave özellik çizim bloğu bulunamadı.");
}

const replacement = `  const visibleFeatures = data.additionalFeatures.slice(0, isVertical ? 8 : 6);\n  const featuresY = factsY + 4 * (factHeight + factGap) + 4;\n  let descriptionY = featuresY;\n\n  if (visibleFeatures.length > 0) {\n    const featureTitleY = featuresY;\n\n    drawText(\n      ctx,\n      "İLAVE ÖZELLİKLER",\n      bodyX,\n      featureTitleY,\n      bodyWidth,\n      "900 20px Arial",\n      "#1557D6",\n    );\n\n    const chipGap = 12;\n    const chipWidth = (bodyWidth - chipGap) / 2;\n    const chipHeight = 50;\n\n    visibleFeatures.forEach((feature, index) => {\n      const col = index % 2;\n      const row = Math.floor(index / 2);\n      drawFeatureChip(\n        ctx,\n        feature,\n        bodyX + col * (chipWidth + chipGap),\n        featureTitleY + 36 + row * (chipHeight + 10),\n        chipWidth,\n        chipHeight,\n      );\n    });\n\n    const featureRows = Math.ceil(visibleFeatures.length / 2);\n    descriptionY = featureTitleY + 48 + featureRows * (chipHeight + 10);\n  }\n\n`;

modal = `${modal.slice(0, start)}${replacement}${modal.slice(end)}`;
fs.writeFileSync(modalPath, modal, "utf8");

console.log("İlave özellikler yalnız gerçek portföy özelliklerinden üretilecek şekilde düzeltildi.");
console.log("Gerçek özellik yoksa önizleme ve PNG içinde bölüm gösterilmeyecek.");
console.log(`Standart dosya yedeği: ${standardBackup}`);
console.log(`Paylaşım modalı yedeği: ${modalBackup}`);
