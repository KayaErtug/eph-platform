import fs from "node:fs";

function read(path) {
  return fs.readFileSync(path, "utf8");
}

function write(path, content) {
  fs.writeFileSync(path, content, "utf8");
}

function replaceOne(content, search, replacement, label) {
  if (content.includes(replacement)) return content;
  if (!content.includes(search)) {
    throw new Error(`Patch target not found: ${label}`);
  }
  return content.replace(search, replacement);
}

function replaceRegex(content, pattern, replacement, label, marker) {
  if (marker && content.includes(marker)) return content;
  if (!pattern.test(content)) {
    throw new Error(`Regex patch target not found: ${label}`);
  }
  return content.replace(pattern, replacement);
}

const havuzPath = "frontend/src/app/havuz/page.tsx";
let havuz = read(havuzPath);

havuz = replaceOne(
  havuz,
  'import PremiumPropertyImage from "@/components/media/PremiumPropertyImage";\n',
  'import PremiumPropertyImage from "@/components/media/PremiumPropertyImage";\nimport CustomerPresentationSheet from "@/components/presentation/CustomerPresentationSheet";\nimport { getPropertyPresentationCards } from "@/components/presentation/propertyPresentation";\n',
  "havuz presentation imports",
);

havuz = replaceOne(
  havuz,
  '  images?: Array<{ url?: string; supabaseUrl?: string; isCover?: boolean }>;\n  project?: {\n',
  '  images?: Array<{ url?: string; supabaseUrl?: string; isCover?: boolean }>;\n  poolMatch?: {\n    score: number;\n    customerId?: string | null;\n    budgetDiff?: number;\n    reasons?: string[];\n  };\n  project?: {\n',
  "havuz unit poolMatch type",
);

havuz = replaceRegex(
  havuz,
  /(function calculateMatch\([\s\S]*?\}\s*\{\n)(\s*const unitCity =)/,
  `$1  if (unit.poolMatch) {\n    const customer =\n      customers.find((item) => item.id === unit.poolMatch?.customerId) || null;\n\n    return {\n      score: Number(unit.poolMatch.score || 0),\n      customer,\n      budgetDiff: Number(unit.poolMatch.budgetDiff || 0),\n    };\n  }\n\n$2`,
  "backend authoritative match bridge",
  "if (unit.poolMatch) {",
);

havuz = replaceOne(
  havuz,
  '        api.get("/units/pool"),\n',
  '        api.get("/pool-experience/units"),\n',
  "pool experience endpoint",
);

havuz = replaceOne(
  havuz,
  '  const [detailSelection, setDetailSelection] =\n    useState<DetailSelection | null>(null);\n  const [busyAction, setBusyAction] = useState<string | null>(null);\n',
  '  const [detailSelection, setDetailSelection] =\n    useState<DetailSelection | null>(null);\n  const [presentationUnit, setPresentationUnit] = useState<Unit | null>(null);\n  const [busyAction, setBusyAction] = useState<string | null>(null);\n',
  "presentation sheet state",
);

havuz = replaceOne(
  havuz,
  '          actionLockMessage={poolActionLockMessage}\n          onClose={closeDetailSelection}\n',
  '          actionLockMessage={poolActionLockMessage}\n          onPresentation={() => setPresentationUnit(detailSelection.unit)}\n          onClose={closeDetailSelection}\n',
  "detail modal presentation callback",
);

havuz = replaceOne(
  havuz,
  '      {selectedAction && (\n',
  '      <CustomerPresentationSheet\n        open={Boolean(presentationUnit)}\n        unitId={presentationUnit?.id || ""}\n        ephId={presentationUnit ? getEphId(presentationUnit.id) : ""}\n        source="POOL"\n        onClose={() => setPresentationUnit(null)}\n      />\n\n      {selectedAction && (\n',
  "render customer presentation sheet",
);

havuz = replaceOne(
  havuz,
  '  actionLockMessage,\n  onClose,\n',
  '  actionLockMessage,\n  onPresentation,\n  onClose,\n',
  "detail modal presentation destructuring",
);

havuz = replaceOne(
  havuz,
  '  actionLockMessage: string;\n  onClose: () => void;\n',
  '  actionLockMessage: string;\n  onPresentation: () => void;\n  onClose: () => void;\n',
  "detail modal presentation type",
);

havuz = replaceOne(
  havuz,
  '  const portfolioHighlights = getPremiumPortfolioHighlights(unit);\n',
  '  const portfolioHighlights = getPropertyPresentationCards(unit).map((item) => ({\n    icon: item.icon,\n    title: item.label,\n    text: item.value,\n  }));\n',
  "type aware presentation highlights",
);

havuz = replaceRegex(
  havuz,
  /  const \[shareBusy, setShareBusy\] = useState\(false\);[\s\S]*?\n  const goPrevImage =/,
  '  const goPrevImage =',
  "remove legacy instant share handler",
  undefined,
);

havuz = replaceOne(
  havuz,
  '                availableCreditAmount !== null\n                  ? "grid-cols-3"\n                  : "grid-cols-2"\n',
  '                availableCreditAmount !== null\n                  ? "grid-cols-2"\n                  : "grid-cols-1"\n',
  "havuz information grid",
);

havuz = replaceOne(
  havuz,
  '                {availableCreditAmount !== null\n                  ? "Konum, kredi ve güvenli iletişim özeti"\n                  : "Konum ve güvenli iletişim özeti"}\n',
  '                {availableCreditAmount !== null\n                  ? "Kredi ve güvenli iletişim özeti"\n                  : "Güvenli iletişim özeti"}\n',
  "havuz information subtitle",
);

havuz = replaceRegex(
  havuz,
  /\n              <div className="flex min-h-\[78px\] min-w-0 flex-col items-center justify-center rounded-\[15px\] border-2 border-blue-100 bg-blue-50 px-2 py-2 text-center">[\s\S]*?\n              <\/div>\n\n              \{availableCreditAmount !== null && \(/,
  '\n              {availableCreditAmount !== null && (',
  "remove duplicate location information card",
  undefined,
);

havuz = replaceOne(
  havuz,
  '            <div className="grid grid-cols-3 gap-1.5 p-2.5">\n              {portfolioHighlights.map((item) => (\n                <PremiumHighlightCard key={item.title} item={item} dense />\n              ))}\n            </div>\n',
  '            <div className="grid grid-cols-3 gap-1.5 p-2.5">\n              {portfolioHighlights.map((item) => (\n                <PremiumHighlightCard key={item.title} item={item} dense />\n              ))}\n              <button\n                type="button"\n                onClick={onPresentation}\n                className="rounded-[16px] text-center active:scale-[0.98]"\n              >\n                <PremiumHighlightCard\n                  item={{\n                    icon: "🔗",\n                    title: "Müşteri Sunumu",\n                    text: "Sunumu aç, link kopyala veya paylaş",\n                  }}\n                  dense\n                />\n              </button>\n            </div>\n',
  "customer presentation action card",
);

havuz = replaceOne(
  havuz,
  '            onClick={handleShare}\n            disabled={shareBusy || !canUsePoolActions}\n',
  '            onClick={onPresentation}\n            disabled={!canUsePoolActions}\n',
  "bottom customer presentation action",
);

havuz = replaceRegex(
  havuz,
  /            \{shareBusy\n              \? "Bağlantı Oluşturuluyor\.\.\."\n              : canUsePoolActions\n                \? "Müşterime Paylaş"\n                : "Üyelik Gerekli"\}/,
  '            {canUsePoolActions ? "Müşteri Sunumu" : "Üyelik Gerekli"}',
  "bottom customer presentation label",
  undefined,
);

write(havuzPath, havuz);

const filterPath = "frontend/src/components/havuz/HavuzFilterCenter.tsx";
let filter = read(filterPath);

filter = replaceOne(
  filter,
  '      owner?: {\n        role?: string | null;\n      } | null;\n',
  '      ownerRole?: string | null;\n      owner?: {\n        role?: string | null;\n      } | null;\n',
  "filter ownerRole type",
);

filter = replaceOne(
  filter,
  '    const ownerRole = String(unit.project?.owner?.role || "");\n',
  '    const ownerRole = String(\n      unit.project?.ownerRole || unit.project?.owner?.role || "",\n    );\n',
  "filter ownerRole source",
);

write(filterPath, filter);

console.log("Havuz customer presentation V2 source patches applied.");
