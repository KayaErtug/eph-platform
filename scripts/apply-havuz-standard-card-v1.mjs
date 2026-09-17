import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const pagePath = path.join(root, "frontend/src/app/havuz/page.tsx");

if (!fs.existsSync(pagePath)) {
  throw new Error(`Dosya bulunamadı: ${pagePath}`);
}

const backupPath = `${pagePath}.backup-havuz-standard-card-${timestamp}`;
fs.copyFileSync(pagePath, backupPath);

let source = fs.readFileSync(pagePath, "utf8");

const projectCenterImport =
  'import PoolProjectCenter from "@/components/havuz/PoolProjectCenter";';
const standardCardImports = `${projectCenterImport}\nimport EphHavuzStandartKart from "@/components/havuz/EphHavuzStandartKart";\nimport { buildEphPremiumCardData } from "@/components/portfolio/ephPremiumCardStandard";`;

if (!source.includes('import EphHavuzStandartKart from "@/components/havuz/EphHavuzStandartKart";')) {
  if (!source.includes(projectCenterImport)) {
    throw new Error("PoolProjectCenter import sabitleme noktası bulunamadı.");
  }

  source = source.replace(projectCenterImport, standardCardImports);
}

const functionStartMarker = "function PoolUnitCard({";
const functionEndMarker = "function PoolDetailModal({";
const functionStart = source.indexOf(functionStartMarker);
const functionEnd = source.indexOf(functionEndMarker, functionStart);

if (functionStart < 0 || functionEnd < 0) {
  throw new Error("PoolUnitCard fonksiyon sınırları bulunamadı.");
}

const standardPoolCardFunction = `function PoolUnitCard({
  index,
  unit,
  match,
  isOwnPortfolio,
  selected,
  busyAction,
  canUsePoolActions,
  onDetail,
  onMessage,
  onAction,
}: {
  index: number;
  unit: Unit;
  match: { score: number; customer: Customer | null; budgetDiff: number };
  isOwnPortfolio: boolean;
  selected: boolean;
  busyAction: string | null;
  canUsePoolActions: boolean;
  onDetail: () => void;
  onMessage: () => void;
  onAction: (type: PoolAction) => void;
}) {
  const image = getCover(unit);
  const imageCount = Array.isArray(unit.images) ? unit.images.length : 0;
  const availableCreditAmount = getAvailableCreditAmount(unit);
  const statusTone = getPoolCardStatusTone(unit.status);
  const busy = Boolean(busyAction);
  const messageBusy = busyAction === \`MESSAGE_\${unit.id}\`;
  const premiumCardData = buildEphPremiumCardData(unit, {
    id: unit.id,
    title: unit.project?.name || "EPH Portföy",
    location: getLocation(unit),
    status: statusTone.label,
    price: compactMoney(unit.price, unit.priceCurrency),
    coverImage: image || "/showcase/stock.jpg",
    portfolioNo: getEphId(unit.id),
    consultantName: "EPH Havuz Portföyü",
    consultantPhone: "Güvenli iletişim",
    shortDescription:
      unit.description || "Bu Havuz portföyü için açıklama girilmemiş.",
    features: [],
  });

  return (
    <div
      id={\`pool-card-\${unit.id}\`}
      data-card-index={index}
      data-unit-id={unit.id}
      className="w-full max-w-full scroll-mt-24"
    >
      <EphHavuzStandartKart
        data={premiumCardData}
        photoCount={imageCount}
        matchScore={match.score}
        availableCreditLabel={
          availableCreditAmount !== null
            ? compactMoney(availableCreditAmount, unit.priceCurrency)
            : null
        }
        isOwnPortfolio={isOwnPortfolio}
        selected={selected}
        busy={busy}
        messageBusy={messageBusy}
        canUsePoolActions={canUsePoolActions}
        onDetail={onDetail}
        onMessage={onMessage}
        onInterest={() => onAction("INTEREST")}
      />
    </div>
  );
}

`;

source = `${source.slice(0, functionStart)}${standardPoolCardFunction}${source.slice(functionEnd)}`;

fs.writeFileSync(pagePath, source, "utf8");

console.log("EPH Havuz Standart Kart V1 uygulandı.");
console.log("- Eski renkli Havuz kartı kaldırıldı.");
console.log("- Ortak premium veri standardından 8 temel bilgi kullanılacak.");
console.log("- Gerçek ilave özellikler Havuz kartında gösterilecek.");
console.log("- Eşleşme oranı, kredi bilgisi ve Havuz aksiyonları korundu.");
console.log("- Portföy sahibi iletişim bilgileri kartta gösterilmeyecek.");
console.log(`Yedek: ${backupPath}`);
