import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const filePath = path.join(root, "frontend/src/app/havuz/page.tsx");
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

if (!fs.existsSync(filePath)) {
  throw new Error(`Dosya bulunamadı: ${filePath}`);
}

const backupPath = `${filePath}.backup-havuz-required-inputs-${timestamp}`;
fs.copyFileSync(filePath, backupPath);

let source = fs.readFileSync(filePath, "utf8");

const functionStart = source.indexOf("function PoolUnitCard({");
const functionEnd = source.indexOf("function PoolDetailModal({", functionStart);

if (functionStart < 0 || functionEnd < 0) {
  throw new Error("PoolUnitCard sınırları bulunamadı.");
}

const before = source.slice(0, functionStart);
let block = source.slice(functionStart, functionEnd);
const after = source.slice(functionEnd);

const anchor = `    price: compactMoney(unit.price, unit.priceCurrency),\n`;
const requiredInputs = `    roomCount: String(unit.roomCount || ""),\n    area: String(unit.netArea || unit.area || unit.grossArea || ""),\n`;

if (!block.includes("roomCount: String(unit.roomCount")) {
  if (!block.includes(anchor)) {
    throw new Error("Premium kart fiyat sabitleme satırı bulunamadı.");
  }

  block = block.replace(anchor, `${anchor}${requiredInputs}`);
}

const roomCountOccurrences = (
  block.match(/roomCount:\s*String\(unit\.roomCount/g) || []
).length;
const areaOccurrences = (
  block.match(/area:\s*String\(unit\.netArea\s*\|\|\s*unit\.area/g) || []
).length;

if (roomCountOccurrences !== 1 || areaOccurrences !== 1) {
  throw new Error(
    `Zorunlu kart girdileri tekilleştirilemedi. roomCount=${roomCountOccurrences}, area=${areaOccurrences}`,
  );
}

source = `${before}${block}${after}`;
fs.writeFileSync(filePath, source, "utf8");

console.log("Havuz standart kart zorunlu girdileri V3 uygulandı.");
console.log("- roomCount ortak kart girdisine aktarıldı.");
console.log("- area için netArea > area > grossArea sıralaması kullanıldı.");
console.log("- Sekiz temel bilgi yine doğrudan unit verisinden üretilecek.");
console.log(`Yedek: ${backupPath}`);
