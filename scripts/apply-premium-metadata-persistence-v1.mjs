import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

const frontendPath = path.join(
  root,
  "frontend/src/components/stok/portfolioFeatureMetadata.ts",
);
const backendPath = path.join(root, "backend/src/units/units.service.ts");

const metadataKeys = [
  "netArea",
  "grossArea",
  "gardenArea",
  "landArea",
  "unitCount",
  "bathroomCount",
  "heatingType",
  "parkingType",
  "front",
  "view",
  "elevator",
  "usageStatus",
  "serviceType",
  "seasonUsage",
  "restorationStatus",
  "infrastructure",
  "road",
  "commercialValue",
];

const metadataLabels = {
  netArea: "Net Alan",
  grossArea: "Brüt Alan",
  gardenArea: "Bahçe Alanı",
  landArea: "Arsa Alanı",
  unitCount: "Bağımsız Bölüm Sayısı",
  bathroomCount: "Banyo Sayısı",
  heatingType: "Isınma Türü",
  parkingType: "Otopark",
  front: "Cephe",
  view: "Manzara",
  elevator: "Asansör",
  usageStatus: "Kullanım Durumu",
  serviceType: "Hizmet Tipi",
  seasonUsage: "Kullanım Şekli",
  restorationStatus: "Restorasyon Durumu",
  infrastructure: "Altyapı Özeti",
  road: "Yol Durumu",
  commercialValue: "Ticari Değer",
};

function assertFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Dosya bulunamadı: ${filePath}`);
  }
}

function makeBackup(filePath) {
  const backupPath = `${filePath}.backup-premium-metadata-${timestamp}`;
  fs.copyFileSync(filePath, backupPath);
  return backupPath;
}

function addKeysToBlock(source, startMarker, endMarker, quote) {
  const start = source.indexOf(startMarker);
  if (start < 0) throw new Error(`Başlangıç işareti bulunamadı: ${startMarker}`);

  const end = source.indexOf(endMarker, start);
  if (end < 0) throw new Error(`Bitiş işareti bulunamadı: ${endMarker}`);

  const block = source.slice(start, end);
  const missing = metadataKeys.filter(
    (key) => !block.includes(`"${key}"`) && !block.includes(`'${key}'`),
  );

  if (!missing.length) return source;

  const insertion = missing.map((key) => `  ${quote}${key}${quote},`).join("\n");
  return `${source.slice(0, end)}${insertion}\n${source.slice(end)}`;
}

function addLabelsToBlock(source, startMarker, endMarker, quote) {
  const start = source.indexOf(startMarker);
  if (start < 0) throw new Error(`Etiket başlangıcı bulunamadı: ${startMarker}`);

  const end = source.indexOf(endMarker, start);
  if (end < 0) throw new Error(`Etiket bitişi bulunamadı: ${endMarker}`);

  const block = source.slice(start, end);
  const missing = Object.entries(metadataLabels).filter(
    ([key]) => !block.includes(`${key}:`),
  );

  if (!missing.length) return source;

  const insertion = missing
    .map(([key, label]) => `  ${key}: ${quote}${label}${quote},`)
    .join("\n");

  return `${source.slice(0, end)}${insertion}\n${source.slice(end)}`;
}

assertFile(frontendPath);
assertFile(backendPath);

const frontendBackup = makeBackup(frontendPath);
const backendBackup = makeBackup(backendPath);

let frontend = fs.readFileSync(frontendPath, "utf8");
frontend = addKeysToBlock(
  frontend,
  "export const PORTFOLIO_METADATA_KEYS = [",
  "] as const;",
  '"',
);
frontend = addLabelsToBlock(
  frontend,
  "export const METADATA_KEY_LABELS: Record<string, string> = {",
  "};",
  '"',
);
fs.writeFileSync(frontendPath, frontend, "utf8");

let backend = fs.readFileSync(backendPath, "utf8");
backend = addKeysToBlock(
  backend,
  "const PORTFOLIO_METADATA_KEYS = new Set([",
  "]);",
  "'",
);
backend = addLabelsToBlock(
  backend,
  "const PORTFOLIO_FIELD_LABELS: Record<string, string> = {",
  "};",
  "'",
);
fs.writeFileSync(backendPath, backend, "utf8");

console.log("Premium kart metadata anahtarları frontend ve backend arasında eşitlendi.");
console.log(`Frontend yedeği: ${frontendBackup}`);
console.log(`Backend yedeği: ${backendBackup}`);
console.log(`Toplam eşitlenen yeni anahtar: ${metadataKeys.length}`);
