import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

const files = {
  page: path.join(root, "frontend/src/app/havuz/page.tsx"),
  card: path.join(root, "frontend/src/components/havuz/EphHavuzStandartKart.tsx"),
};

for (const filePath of Object.values(files)) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Dosya bulunamadı: ${filePath}`);
  }
}

for (const filePath of Object.values(files)) {
  fs.copyFileSync(
    filePath,
    `${filePath}.backup-location-v2-${timestamp}`,
  );
}

function replaceOnce(source, oldValue, newValue, label) {
  if (source.includes(newValue)) return source;
  if (!source.includes(oldValue)) {
    throw new Error(`${label} bloğu bulunamadı.`);
  }
  return source.replace(oldValue, newValue);
}

let page = fs.readFileSync(files.page, "utf8");
const poolCardStart = page.indexOf("function PoolUnitCard({");
const poolCardEnd = page.indexOf("function PoolDetailModal({", poolCardStart);

if (poolCardStart < 0 || poolCardEnd < 0) {
  throw new Error("PoolUnitCard sınırları bulunamadı.");
}

const pageBefore = page.slice(0, poolCardStart);
let poolCardBlock = page.slice(poolCardStart, poolCardEnd);
const pageAfter = page.slice(poolCardEnd);

poolCardBlock = replaceOnce(
  poolCardBlock,
  `  onDetail,\n  onMessage,\n  onAction,\n}: {`,
  `  onDetail,\n  onMessage,\n  onAction,\n  onLocation,\n}: {`,
  "PoolUnitCard parametre listesi",
);

poolCardBlock = replaceOnce(
  poolCardBlock,
  `  onDetail: () => void;\n  onMessage: () => void;\n  onAction: (type: PoolAction) => void;\n}) {`,
  `  onDetail: () => void;\n  onMessage: () => void;\n  onAction: (type: PoolAction) => void;\n  onLocation: () => void;\n}) {`,
  "PoolUnitCard prop tipi",
);

poolCardBlock = replaceOnce(
  poolCardBlock,
  `        onMessage={onMessage}\n        onInterest={() => onAction("INTEREST")}\n      />`,
  `        onMessage={onMessage}\n        onInterest={() => onAction("INTEREST")}\n        onLocation={onLocation}\n      />`,
  "Standart karta konum aktarımı",
);

page = `${pageBefore}${poolCardBlock}${pageAfter}`;
fs.writeFileSync(files.page, page, "utf8");

let card = fs.readFileSync(files.card, "utf8");

card = replaceOnce(
  card,
  `  MessageCircle,\n  Mountain,`,
  `  MessageCircle,\n  Mountain,\n  Navigation,`,
  "Navigation ikon importu",
);

card = replaceOnce(
  card,
  `  onMessage: () => void;\n  onInterest: () => void;\n};`,
  `  onMessage: () => void;\n  onInterest: () => void;\n  onLocation: () => void;\n};`,
  "Standart kart onLocation tipi",
);

card = replaceOnce(
  card,
  `  onDetail,\n  onMessage,\n  onInterest,\n}: Props) {`,
  `  onDetail,\n  onMessage,\n  onInterest,\n  onLocation,\n}: Props) {`,
  "Standart kart onLocation parametresi",
);

card = replaceOnce(
  card,
  `        ) : (\n          <div className="grid grid-cols-3 gap-1.5">`,
  `        ) : (\n          <>\n            <div className="grid grid-cols-3 gap-1.5">`,
  "Havuz aksiyon fragment başlangıcı",
);

const actionTail = `            <button\n              type="button"\n              onClick={onInterest}\n              disabled={busy || !canUsePoolActions}\n              className="flex min-h-[44px] items-center justify-center gap-1 rounded-[12px] bg-[#1557D6] px-1 text-[10px] font-black text-white shadow-[0_8px_18px_rgba(21,87,214,0.22)] disabled:opacity-60"\n            >\n              <Target className="h-3.5 w-3.5" />\n              İlgilen 10K\n            </button>\n          </div>\n        )}`;

const actionTailWithLocation = `            <button\n              type="button"\n              onClick={onInterest}\n              disabled={busy || !canUsePoolActions}\n              className="flex min-h-[44px] items-center justify-center gap-1 rounded-[12px] bg-[#1557D6] px-1 text-[10px] font-black text-white shadow-[0_8px_18px_rgba(21,87,214,0.22)] disabled:opacity-60"\n            >\n              <Target className="h-3.5 w-3.5" />\n              İlgilen 10K\n            </button>\n            </div>\n\n            <button\n              type="button"\n              onClick={onLocation}\n              disabled={busy || !canUsePoolActions}\n              className="mt-1.5 flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-[12px] border-2 border-[#1557D6] bg-white px-2 text-[10px] font-black text-[#1557D6] shadow-sm disabled:opacity-60"\n            >\n              <Navigation className="h-3.5 w-3.5" />\n              Konuma Git 10K\n            </button>\n          </>\n        )}`;

card = replaceOnce(
  card,
  actionTail,
  actionTailWithLocation,
  "Konuma Git aksiyon butonu",
);

fs.writeFileSync(files.card, card, "utf8");

console.log("Havuz standart kart konum aksiyonu V2 uygulandı.");
console.log("- PoolUnitCard onLocation prop tanımı tamamlandı.");
console.log("- onLocation standart karta aktarıldı.");
console.log("- Konuma Git 10K butonu kartta korundu.");
console.log("- Detay, İletişim ve İlgilen aksiyonları değişmedi.");
