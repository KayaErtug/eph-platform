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

const backupPath = `${filePath}.backup-whatsapp-canvas-v3-${timestamp}`;
fs.copyFileSync(filePath, backupPath);

let source = fs.readFileSync(filePath, "utf8");

const oldCanvasSize = `function getCanvasSize(mode: ShareMode): CanvasSize {
  if (mode === "story" || mode === "reel") {
    return { width: 1080, height: 1920 };
  }

  return { width: 1080, height: 1350 };
}`;

const newCanvasSize = `function getCanvasSize(mode: ShareMode): CanvasSize {
  if (mode === "story" || mode === "reel") {
    return { width: 1080, height: 1920 };
  }

  if (mode === "whatsapp") {
    return { width: 1080, height: 1450 };
  }

  return { width: 1080, height: 1350 };
}`;

if (source.includes(oldCanvasSize)) {
  source = source.replace(oldCanvasSize, newCanvasSize);
} else if (!source.includes('if (mode === "whatsapp") {\n    return { width: 1080, height: 1450 };')) {
  throw new Error("Canvas ölçü fonksiyonu bulunamadı.");
}

const layoutStart = source.indexOf("  const featuresY =", source.indexOf("async function drawPremiumCanvas"));
const watermarkStart = source.indexOf(
  "\n  ctx.save();\n  ctx.translate(width / 2, height / 2);",
  layoutStart,
);

if (layoutStart < 0 || watermarkStart < 0) {
  throw new Error("Canvas özellik/footer çizim sınırları bulunamadı.");
}

const rebuiltLayout = `  const factsBottom =
    factsY + 4 * factHeight + 3 * factGap;
  const featuresY = factsBottom + (isVertical ? 20 : 14);
  const featureTitleY = featuresY;
  const visibleFeatures = data.additionalFeatures.slice(
    0,
    isVertical ? 8 : mode === "whatsapp" ? 8 : 6,
  );
  const chipColumns = isVertical ? 2 : 3;
  const chipGap = isVertical ? 12 : 10;
  const chipWidth =
    (bodyWidth - chipGap * (chipColumns - 1)) / chipColumns;
  const chipHeight = isVertical ? 50 : 40;
  const chipRowGap = isVertical ? 10 : 8;
  const chipStartOffset = isVertical ? 38 : 32;

  if (visibleFeatures.length > 0) {
    drawText(
      ctx,
      "İLAVE ÖZELLİKLER",
      bodyX,
      featureTitleY,
      bodyWidth,
      "900 20px Arial",
      "#1557D6",
    );

    visibleFeatures.forEach((feature, index) => {
      const col = index % chipColumns;
      const row = Math.floor(index / chipColumns);

      drawFeatureChip(
        ctx,
        feature,
        bodyX + col * (chipWidth + chipGap),
        featureTitleY +
          chipStartOffset +
          row * (chipHeight + chipRowGap),
        chipWidth,
        chipHeight,
      );
    });
  }

  const featureRows = visibleFeatures.length
    ? Math.ceil(visibleFeatures.length / chipColumns)
    : 0;
  const featureBottom = visibleFeatures.length
    ? featureTitleY +
      chipStartOffset +
      featureRows * chipHeight +
      Math.max(0, featureRows - 1) * chipRowGap
    : factsBottom;
  const descriptionY = featureBottom + 18;

  if (isVertical) {
    ctx.fillStyle = "#F8FAFC";
    drawRoundRect(ctx, bodyX, descriptionY, bodyWidth, 108, 30);
    ctx.fill();
    ctx.strokeStyle = "#D5E2F1";
    ctx.stroke();
    drawWrappedText(
      ctx,
      data.description,
      bodyX + 26,
      descriptionY + 22,
      bodyWidth - 52,
      29,
      2,
      "800 23px Arial",
      "#475569",
    );
  }

  const footerHeight = isVertical ? 120 : 100;
  const footerBottomPadding = isVertical ? 28 : 22;
  const defaultFooterY =
    cardY + cardHeight - footerHeight - footerBottomPadding;
  const contentFooterY =
    (isVertical ? descriptionY + 108 : featureBottom) +
    (isVertical ? 24 : 26);
  const footerY = Math.max(defaultFooterY, contentFooterY);

  const footerGradient = ctx.createLinearGradient(
    bodyX,
    footerY,
    bodyX + bodyWidth,
    footerY + footerHeight,
  );
  footerGradient.addColorStop(0, "#06194A");
  footerGradient.addColorStop(1, "#1557D6");
  ctx.fillStyle = footerGradient;
  drawRoundRect(ctx, bodyX, footerY, bodyWidth, footerHeight, 30);
  ctx.fill();

  drawText(
    ctx,
    "EPH DANIŞMANI",
    bodyX + 28,
    footerY + (isVertical ? 22 : 14),
    bodyWidth - 320,
    "900 18px Arial",
    "rgba(255,255,255,0.62)",
  );
  drawText(
    ctx,
    data.consultantName,
    bodyX + 28,
    footerY + (isVertical ? 50 : 37),
    bodyWidth - 320,
    isVertical ? "900 29px Arial" : "900 26px Arial",
    "#FFFFFF",
  );
  drawText(
    ctx,
    data.consultantPhone,
    bodyX + 28,
    footerY + (isVertical ? 84 : 68),
    bodyWidth - 320,
    isVertical ? "800 21px Arial" : "800 18px Arial",
    "rgba(255,255,255,0.76)",
  );

  drawText(
    ctx,
    "PORTFÖY NO",
    bodyX + bodyWidth - 240,
    footerY + (isVertical ? 30 : 20),
    200,
    "900 17px Arial",
    "rgba(255,255,255,0.62)",
    "right",
  );
  drawText(
    ctx,
    data.portfolioNo,
    bodyX + bodyWidth - 40,
    footerY + (isVertical ? 62 : 48),
    220,
    "900 22px Arial",
    "#FFFFFF",
    "right",
  );
`;

source = `${source.slice(0, layoutStart)}${rebuiltLayout}${source.slice(watermarkStart)}`;

fs.writeFileSync(filePath, source, "utf8");

console.log("WhatsApp canvas yerleşimi V3 uygulandı.");
console.log("- WhatsApp PNG yüksekliği 1080x1450 olarak ayrıldı.");
console.log("- İlave özellikler 3 sütunlu gerçek canvas gridinde çizilecek.");
console.log("- İlk 8 ilave özellik gösterilecek.");
console.log("- Danışman alanı içerik bitişinden sonra ve kart tabanında konumlanacak.");
console.log("- Canlı önizleme bileşeni değiştirilmedi.");
console.log(`Yedek: ${backupPath}`);
