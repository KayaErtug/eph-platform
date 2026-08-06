import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

const files = {
  premiumCard: path.join(
    root,
    "frontend/src/components/portfolio/EphStandartGayrimenkulKarti.tsx",
  ),
  shareModal: path.join(
    root,
    "frontend/src/components/portfolio/PortfolioShareModal.tsx",
  ),
  portfolioDetail: path.join(
    root,
    "frontend/src/app/portfoy/[id]/page.tsx",
  ),
};

function assertFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Dosya bulunamadı: ${filePath}`);
  }
}

function backup(filePath) {
  const backupPath = `${filePath}.backup-remove-control-badge-${timestamp}`;
  fs.copyFileSync(filePath, backupPath);
  return backupPath;
}

Object.values(files).forEach(assertFile);
const backups = Object.fromEntries(
  Object.entries(files).map(([key, filePath]) => [key, backup(filePath)]),
);

let premiumCard = fs.readFileSync(files.premiumCard, "utf8");

if (!premiumCard.includes("  ShieldCheck,")) {
  premiumCard = premiumCard.replace(
    "  Ruler,\n",
    "  Ruler,\n  ShieldCheck,\n",
  );
}

const oldPremiumBadge = `        <div className="absolute left-4 right-4 top-4 flex items-start justify-between gap-3">\n          <div className="inline-flex min-h-9 items-center gap-2 rounded-full border border-white/60 bg-white/94 px-3.5 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-[#1557D6] shadow-lg backdrop-blur">\n            <ShieldCheck className="h-4 w-4" />\n            {data.authorization}\n          </div>\n          <div className="rounded-full border border-white/15 bg-[#1557D6] px-3.5 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-white shadow-lg">\n            {data.status}\n          </div>\n        </div>`;

const newPremiumBadge = `        <div className="absolute right-4 top-4">\n          <div className="rounded-full border border-white/15 bg-[#1557D6] px-3.5 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-white shadow-lg">\n            {data.status}\n          </div>\n        </div>`;

if (premiumCard.includes(oldPremiumBadge)) {
  premiumCard = premiumCard.replace(oldPremiumBadge, newPremiumBadge);
} else if (!premiumCard.includes(newPremiumBadge)) {
  throw new Error("Premium kart kontrol rozeti bloğu bulunamadı.");
}

fs.writeFileSync(files.premiumCard, premiumCard, "utf8");

let shareModal = fs.readFileSync(files.shareModal, "utf8");

const canvasAuthorizationPill = `  drawPill(\n    ctx,\n    data.authorization.toLocaleUpperCase("tr-TR"),\n    coverX + 34,\n    coverY + 34,\n    300,\n    58,\n    "rgba(255,255,255,0.95)",\n    "#1557D6",\n  );\n`;

if (shareModal.includes(canvasAuthorizationPill)) {
  shareModal = shareModal.replace(canvasAuthorizationPill, "");
}

fs.writeFileSync(files.shareModal, shareModal, "utf8");

let portfolioDetail = fs.readFileSync(files.portfolioDetail, "utf8");

const detailControlBadge = `              <span\n                className={\`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 \${verified ? "bg-emerald-50 text-emerald-700" : "bg-[#F7FBFF] text-[#64748B]"}\`}\n              >\n                <ShieldCheck size={13} />\n                {verified ? "Doğrulanmış" : "Kontrol"}\n              </span>\n`;

if (portfolioDetail.includes(detailControlBadge)) {
  portfolioDetail = portfolioDetail.replace(detailControlBadge, "");
}

fs.writeFileSync(files.portfolioDetail, portfolioDetail, "utf8");

console.log("Müşteriye dönük kontrol rozetleri kaldırıldı.");
console.log("ShieldCheck importu durum bilgi ikonu için korundu.");
Object.entries(backups).forEach(([key, value]) => {
  console.log(`${key} yedeği: ${value}`);
});
