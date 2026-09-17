import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const modalPath = path.join(
  root,
  "frontend/src/components/stok/StokCreateModal.tsx",
);

if (!fs.existsSync(modalPath)) {
  throw new Error(`StokCreateModal.tsx bulunamadı: ${modalPath}`);
}

let source = fs.readFileSync(modalPath, "utf8");
const backupPath = `${modalPath}.backup-premium-entry-${new Date()
  .toISOString()
  .replace(/[:.]/g, "-")}`;

fs.copyFileSync(modalPath, backupPath);

const importLine =
  'import PremiumCardEntrySection from "./PremiumCardEntrySection";';

if (!source.includes(importLine)) {
  const importAnchor = 'import GoogleGeoPicker from "./GoogleGeoPicker";';

  if (!source.includes(importAnchor)) {
    throw new Error("Premium kart import noktası bulunamadı.");
  }

  source = source.replace(importAnchor, `${importAnchor}\n${importLine}`);
}

function findDivBlockContaining(text, marker) {
  const markerIndex = text.indexOf(marker);

  if (markerIndex < 0) {
    throw new Error(`Blok işareti bulunamadı: ${marker}`);
  }

  const start = text.lastIndexOf('<div className="stock-form-block', markerIndex);

  if (start < 0) {
    throw new Error(`stock-form-block başlangıcı bulunamadı: ${marker}`);
  }

  const tagRegex = /<div\b|<\/div>/g;
  tagRegex.lastIndex = start;
  let depth = 0;
  let end = -1;
  let match;

  while ((match = tagRegex.exec(text))) {
    if (match[0] === "<div") depth += 1;
    else depth -= 1;

    if (depth === 0) {
      end = tagRegex.lastIndex;
      break;
    }
  }

  if (end < 0) {
    throw new Error(`stock-form-block sonu bulunamadı: ${marker}`);
  }

  while (end < text.length && ["\r", "\n"].includes(text[end])) end += 1;

  return {
    start,
    end,
    content: text.slice(start, end),
  };
}

if (!source.includes("PremiumCardEntrySection\n            unitForm=")) {
  const portfolioBlock = findDivBlockContaining(
    source,
    "Portföy Temel Bilgileri",
  );

  let portfolioContent = portfolioBlock.content.replace(
    "Portföy Temel Bilgileri",
    "1. Portföy Tipi ve Temel Kart Bilgileri",
  );

  source =
    source.slice(0, portfolioBlock.start) + source.slice(portfolioBlock.end);

  const projectBlock = findDivBlockContaining(source, "Proje Bilgileri");
  const premiumPreview = `          <div className="stock-form-grid">\n            <PremiumCardEntrySection\n              unitForm={unitForm}\n              projectForm={projectForm}\n              setUnitForm={setUnitForm}\n            />\n          </div>\n\n`;

  source =
    source.slice(0, projectBlock.start) +
    portfolioContent +
    premiumPreview +
    source.slice(projectBlock.start);
}

fs.writeFileSync(modalPath, source, "utf8");

console.log("Premium 8 bilgi giriş bölümü uygulandı.");
console.log(`Yedek: ${backupPath}`);
