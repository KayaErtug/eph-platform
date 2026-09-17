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

const backupPath = `${filePath}.backup-premium-feature-layout-${timestamp}`;
fs.copyFileSync(filePath, backupPath);

let source = fs.readFileSync(filePath, "utf8");

function replaceOnce(oldValue, newValue, label) {
  if (source.includes(newValue)) return;
  if (!source.includes(oldValue)) {
    throw new Error(`${label} bloğu bulunamadı.`);
  }
  source = source.replace(oldValue, newValue);
}

replaceOnce(
  '  const coverHeight = isVertical ? 720 : 470;',
  '  const coverHeight = isVertical ? 720 : 400;',
  "Yatay kapak yüksekliği",
);

replaceOnce(
  '  const bodyY = cardY + coverHeight + 26;\n\n  ctx.fillStyle = "#F4F8FF";\n  drawRoundRect(ctx, bodyX, bodyY, bodyWidth, 142, 34);',
  '  const bodyY = cardY + coverHeight + 26;\n  const summaryHeight = isVertical ? 142 : 120;\n\n  ctx.fillStyle = "#F4F8FF";\n  drawRoundRect(ctx, bodyX, bodyY, bodyWidth, summaryHeight, 34);',
  "Fiyat özeti yüksekliği",
);

replaceOnce(
  '    bodyY + 20,',
  '    bodyY + (isVertical ? 20 : 14),',
  "Portföy tipi konumu",
);

replaceOnce(
  '    bodyY + 54,\n    bodyWidth - 30,\n    "900 47px Arial",',
  '    bodyY + (isVertical ? 54 : 42),\n    bodyWidth - 30,\n    isVertical ? "900 47px Arial" : "900 43px Arial",',
  "Fiyat konumu",
);

replaceOnce(
  '    bodyY + 108,',
  '    bodyY + (isVertical ? 108 : 92),',
  "Konum metni konumu",
);

replaceOnce(
  '  const factsY = bodyY + 166;\n  const factGap = 14;\n  const factWidth = (bodyWidth - factGap) / 2;\n  const factHeight = isVertical ? 104 : 92;',
  '  const factsY = bodyY + (isVertical ? 166 : 140);\n  const factGap = isVertical ? 14 : 10;\n  const factWidth = (bodyWidth - factGap) / 2;\n  const factHeight = isVertical ? 104 : 76;',
  "Temel bilgi grid ölçüleri",
);

replaceOnce(
  '  const featuresY = factsY + 4 * (factHeight + factGap) + 4;',
  '  const featuresY =\n    factsY + 4 * factHeight + 3 * factGap + (isVertical ? 20 : 14);',
  "İlave özellik başlangıç konumu",
);

replaceOnce(
  '  const visibleFeatures = data.additionalFeatures.slice(0, isVertical ? 8 : 6);\n  const chipGap = 12;\n  const chipWidth = (bodyWidth - chipGap) / 2;\n  const chipHeight = 50;\n\n  visibleFeatures.forEach((feature, index) => {\n    const col = index % 2;\n    const row = Math.floor(index / 2);\n    drawFeatureChip(\n      ctx,\n      feature,\n      bodyX + col * (chipWidth + chipGap),\n      featureTitleY + 36 + row * (chipHeight + 10),\n      chipWidth,\n      chipHeight,\n    );\n  });\n\n  const featureRows = Math.max(1, Math.ceil(visibleFeatures.length / 2));\n  const descriptionY = featureTitleY + 48 + featureRows * (chipHeight + 10);',
  '  const visibleFeatures = data.additionalFeatures.slice(0, 8);\n  const chipColumns = isVertical ? 2 : 3;\n  const chipGap = isVertical ? 12 : 10;\n  const chipWidth =\n    (bodyWidth - chipGap * (chipColumns - 1)) / chipColumns;\n  const chipHeight = isVertical ? 50 : 40;\n  const chipRowGap = isVertical ? 10 : 8;\n  const chipStartOffset = isVertical ? 36 : 30;\n\n  visibleFeatures.forEach((feature, index) => {\n    const col = index % chipColumns;\n    const row = Math.floor(index / chipColumns);\n    drawFeatureChip(\n      ctx,\n      feature,\n      bodyX + col * (chipWidth + chipGap),\n      featureTitleY + chipStartOffset + row * (chipHeight + chipRowGap),\n      chipWidth,\n      chipHeight,\n    );\n  });\n\n  const featureRows = Math.max(1, Math.ceil(visibleFeatures.length / chipColumns));\n  const descriptionY =\n    featureTitleY +\n    (isVertical ? 48 : 38) +\n    featureRows * (chipHeight + chipRowGap);',
  "İlave özellik grid ölçüleri",
);

replaceOnce(
  '  const footerHeight = 120;',
  '  const footerHeight = isVertical ? 120 : 104;',
  "Danışman footer yüksekliği",
);

replaceOnce(
  '    footerY + 22,',
  '    footerY + (isVertical ? 22 : 16),',
  "Danışman başlığı konumu",
);

replaceOnce(
  '    footerY + 50,\n    bodyWidth - 320,\n    "900 29px Arial",',
  '    footerY + (isVertical ? 50 : 40),\n    bodyWidth - 320,\n    isVertical ? "900 29px Arial" : "900 26px Arial",',
  "Danışman adı konumu",
);

replaceOnce(
  '    footerY + 84,\n    bodyWidth - 320,\n    "800 21px Arial",',
  '    footerY + (isVertical ? 84 : 72),\n    bodyWidth - 320,\n    isVertical ? "800 21px Arial" : "800 18px Arial",',
  "Danışman telefonu konumu",
);

replaceOnce(
  '    footerY + 30,',
  '    footerY + (isVertical ? 30 : 22),',
  "Portföy numarası başlığı konumu",
);

replaceOnce(
  '    footerY + 62,',
  '    footerY + (isVertical ? 62 : 50),',
  "Portföy numarası konumu",
);

fs.writeFileSync(filePath, source, "utf8");

console.log("Premium paylaşım kartı ilave özellik yerleşimi düzeltildi.");
console.log("- WhatsApp ve Instagram 4:5 kartında kapak alanı kompaktlaştırıldı.");
console.log("- Sekiz temel bilgi kutusu daha kompakt hale getirildi.");
console.log("- Sekiz ilave özellik footer üstünde görünür olacak.");
console.log("- Yatay kartta özellikler 3 sütunlu kompakt düzende gösterilecek.");
console.log("- Danışman/footer alanı özelliklerin altında kalacak.");
console.log("- Hikâye ve Reels 9:16 düzeni değiştirilmedi.");
console.log(`Yedek: ${backupPath}`);
