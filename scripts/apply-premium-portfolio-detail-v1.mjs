import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const pagePath = path.join(
  root,
  "frontend/src/app/portfoy/[id]/page.tsx",
);

if (!fs.existsSync(pagePath)) {
  throw new Error(`Dosya bulunamadı: ${pagePath}`);
}

const backupPath = `${pagePath}.backup-premium-single-screen-${timestamp}`;
fs.copyFileSync(pagePath, backupPath);

let page = fs.readFileSync(pagePath, "utf8");

const shareModalImport =
  'import PortfolioShareModal from "@/components/portfolio/PortfolioShareModal";';
const premiumImports = `${shareModalImport}\nimport EphPremiumPortfolioSummary from "@/components/portfolio/EphPremiumPortfolioSummary";\nimport { buildEphPremiumCardData } from "@/components/portfolio/ephPremiumCardStandard";`;

if (!page.includes('import EphPremiumPortfolioSummary from "@/components/portfolio/EphPremiumPortfolioSummary";')) {
  if (!page.includes(shareModalImport)) {
    throw new Error("PortfolioShareModal import satırı bulunamadı.");
  }

  page = page.replace(shareModalImport, premiumImports);
}

page = page.replace(
  "  const [descriptionExpanded, setDescriptionExpanded] = useState(false);\n",
  "",
);
page = page.replace(
  "  const verified = isUnitVerified(unit);\n",
  "",
);
page = page.replace(
  "  const featureLabels = useMemo(() => getFeatureLabels((unit as any)?.features), [unit]);\n",
  "",
);

const calculationStart = page.indexOf(
  "  const style = statusStyle(unit.status);",
);
const calculationEndMarker =
  "  const encodedShareUrl = encodeURIComponent(shareUrl);\n";
const calculationEnd = page.indexOf(
  calculationEndMarker,
  calculationStart,
);

if (calculationStart < 0 || calculationEnd < 0) {
  if (!page.includes("const premiumSummaryData = buildEphPremiumCardData")) {
    throw new Error("Portföy detay hesaplama bloğu bulunamadı.");
  }
} else {
  const calculationReplacement = `  const canEditPortfolio = canEditDetailUnit(unit, user);\n  const canReviewPortfolio = canReviewDetailUnit(user);\n  const portfolioOwnerRole = String(\n    unit.project?.owner?.role || user?.role || "",\n  ).toUpperCase();\n  const isDirectPoolPublisher =\n    isDirectPoolPublisherRole(portfolioOwnerRole);\n  const canSeeDoorAccessInfo = canViewDoorAccessInfo(unit, user);\n  const availableCreditAmount = Number((unit as any)?.availableCreditAmount || 0);\n  const doorAccessInfo = String((unit as any)?.doorAccessInfo || "").trim();\n  const premiumSummaryData = buildEphPremiumCardData(unit, {\n    ...getPortfolioShareData(unit),\n    status: statusLabel(unit.status),\n    location: fullAddress,\n    features: [],\n  });\n`;

  page = `${page.slice(0, calculationStart)}${calculationReplacement}${page.slice(
    calculationEnd + calculationEndMarker.length,
  )}`;
}

const copyButtonStart = page.indexOf(
  "          <button\n            onClick={handleCopyLink}",
);
const shareButtonStart = page.indexOf(
  "          <button\n            onClick={handleOpenShareModal}",
  copyButtonStart,
);

if (copyButtonStart >= 0 && shareButtonStart >= 0) {
  const shareButtonEndMarker = "          </button>\n";
  const shareButtonEnd = page.indexOf(
    shareButtonEndMarker,
    shareButtonStart,
  );

  if (shareButtonEnd < 0) {
    throw new Error("Üst Paylaş butonunun bitişi bulunamadı.");
  }

  page = `${page.slice(0, copyButtonStart)}${page.slice(
    shareButtonEnd + shareButtonEndMarker.length,
  )}`;
}

const oldContentStartMarker =
  '        <section className="overflow-hidden rounded-[24px] border border-[#DDE7F3] bg-white shadow-[0_14px_34px_rgba(15,23,42,0.07)]">';
const oldContentEndMarker =
  "        {canEditPortfolio && managementOpen && (";
const oldContentStart = page.indexOf(oldContentStartMarker);
const oldContentEnd = page.indexOf(
  oldContentEndMarker,
  oldContentStart,
);

const premiumContent = `        <EphPremiumPortfolioSummary\n          data={premiumSummaryData}\n          photoCount={galleryImages.length}\n          maxPhotoCount={MAX_GALLERY_COUNT}\n          copied={copied}\n          onOpenGallery={() => {\n            if (galleryImages.length > 0) setGalleryOpen(true);\n          }}\n          onCopyLink={handleCopyLink}\n          onNativeShare={handleNativeShare}\n          onShareCard={handleOpenShareModal}\n          onPresentation={() => setCustomerPresentationOpen(true)}\n        />\n\n        <details className="group mt-2 overflow-hidden rounded-[20px] border border-[#DDE7F3] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.045)]">\n          <summary className="flex min-h-[46px] cursor-pointer list-none items-center justify-between gap-2 px-3 text-[11px] font-black text-[#06194A] marker:hidden">\n            <span>Harita ve Özel Bilgiler</span>\n            <span className="rounded-full bg-[#EFF6FF] px-2.5 py-1 text-[9px] text-[#1557D6] group-open:bg-[#1557D6] group-open:text-white">\n              Aç / Kapat\n            </span>\n          </summary>\n\n          <div className="border-t border-[#E8F0FA] p-2">\n            <div className="relative overflow-hidden rounded-[18px] border border-[#DDE7F3]">\n              <iframe\n                title="Portföy haritası"\n                src={\`https://www.google.com/maps?q=\${mapQuery}&z=\${hasProjectCoordinates ? 17 : 14}&output=embed\`}\n                className="h-[205px] w-full border-0"\n                loading="lazy"\n                referrerPolicy="no-referrer-when-downgrade"\n              />\n              {hasProjectCoordinates && (\n                <button\n                  type="button"\n                  onClick={() =>\n                    window.open(\n                      \`https://www.google.com/maps?q=\${mapQuery}\`,\n                      "_blank",\n                      "noopener,noreferrer",\n                    )\n                  }\n                  className="absolute right-3 top-3 inline-flex min-h-[32px] items-center justify-center gap-1 rounded-full bg-white/95 px-3 text-[10px] font-black text-[#1557D6] shadow-[0_10px_20px_rgba(15,23,42,0.16)] backdrop-blur"\n                >\n                  Konuma Git <ExternalLink size={11} />\n                </button>\n              )}\n            </div>\n\n            <PortfolioPrivateDetails\n              unit={unit}\n              canSeeDoorAccessInfo={canSeeDoorAccessInfo}\n              doorAccessInfo={doorAccessInfo}\n              availableCreditAmount={availableCreditAmount}\n            />\n          </div>\n        </details>\n\n        {canReviewPortfolio && (\n          <PortfolioApprovalCenter\n            unit={unit}\n            documents={portfolioDocuments}\n            galleryImageCount={galleryImages.length}\n            canReviewPortfolio={canReviewPortfolio}\n            approvalActionLoading={approvalActionLoading}\n            onApprovalAction={handleApprovalAction}\n          />\n        )}\n\n`;

if (oldContentStart < 0 || oldContentEnd < 0) {
  if (!page.includes("<EphPremiumPortfolioSummary")) {
    throw new Error("Eski portföy detay içerik bloğu bulunamadı.");
  }
} else {
  page = `${page.slice(0, oldContentStart)}${premiumContent}${page.slice(
    oldContentEnd,
  )}`;
}

const privateFunctionStart = page.indexOf(
  "function PortfolioDetailInfoCenter({",
);
const privateFunctionEndMarker =
  "\n\nfunction PortfolioDocumentsCenter({";
const privateFunctionEnd = page.indexOf(
  privateFunctionEndMarker,
  privateFunctionStart,
);

const privateFunction = `function PortfolioPrivateDetails({\n  unit,\n  canSeeDoorAccessInfo,\n  doorAccessInfo,\n  availableCreditAmount,\n}: {\n  unit: DetailUnit;\n  canSeeDoorAccessInfo: boolean;\n  doorAccessInfo: string;\n  availableCreditAmount: number;\n}) {\n  const deedOwnerFullName = String((unit as any)?.deedOwnerFullName || "").trim();\n  const deedOwnerPhone = String((unit as any)?.deedOwnerPhone || "").trim();\n  const deedOwnerEmail = String((unit as any)?.deedOwnerEmail || "").trim();\n\n  const deedRows = [\n    { label: "Malik", value: deedOwnerFullName },\n    { label: "Telefon", value: deedOwnerPhone },\n    { label: "E-posta", value: deedOwnerEmail },\n    {\n      label: "Krediye Uygun Tutar",\n      value: availableCreditAmount\n        ? \`\${availableCreditAmount.toLocaleString("tr-TR")} ₺\`\n        : "",\n    },\n    {\n      label: "Kapı / Anahtar Notu",\n      value: canSeeDoorAccessInfo ? doorAccessInfo : "",\n    },\n  ].filter((item) => isDisplayableDetailValue(item.value));\n\n  if (deedRows.length === 0) return null;\n\n  return (\n    <section className="mt-2 rounded-[18px] border border-[#E8F0FA] bg-[#F8FAFC] p-2.5 text-center">\n      <PremiumSectionHeading\n        icon={<FileText size={17} />}\n        title="Malik / Erişim Bilgileri"\n        compact\n      />\n      <div className="mt-2 grid grid-cols-1 gap-2">\n        {deedRows.map((item) => (\n          <InfoRow\n            key={\`\${item.label}-\${item.value}\`}\n            label={item.label}\n            value={item.value}\n          />\n        ))}\n      </div>\n    </section>\n  );\n}`;

if (privateFunctionStart < 0 || privateFunctionEnd < 0) {
  if (!page.includes("function PortfolioPrivateDetails({")) {
    throw new Error("Portföy bilgi merkezi fonksiyonu bulunamadı.");
  }
} else {
  page = `${page.slice(0, privateFunctionStart)}${privateFunction}${page.slice(
    privateFunctionEnd,
  )}`;
}

fs.writeFileSync(pagePath, page, "utf8");

console.log("Tek ekran premium portföy detay düzeni uygulandı.");
console.log("- Tekrarlanan hero, bilgi, açıklama, paylaşım, özellik ve danışman blokları kaldırıldı.");
console.log("- Sekiz temel bilgi, gerçek ilave özellikler ve hızlı aksiyonlar tek kartta birleştirildi.");
console.log("- Harita ile malik/erişim bilgileri kapalı ikincil alana taşındı.");
console.log("- Belge, onay ve medya yönetimi akışları korunmuştur.");
console.log(`Yedek: ${backupPath}`);
