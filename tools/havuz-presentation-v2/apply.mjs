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

const path = "frontend/src/app/portfoy/[id]/page.tsx";
let content = read(path);

content = replaceOne(
  content,
  'import PortfolioShareModal from "@/components/portfolio/PortfolioShareModal";\n',
  'import PortfolioShareModal from "@/components/portfolio/PortfolioShareModal";\nimport CustomerPresentationSheet from "@/components/presentation/CustomerPresentationSheet";\n',
  "portfolio customer presentation import",
);

content = replaceOne(
  content,
  '  const [shareOpen, setShareOpen] = useState(false);\n  const [linkShareBusy, setLinkShareBusy] = useState(false);\n',
  '  const [shareOpen, setShareOpen] = useState(false);\n  const [customerPresentationOpen, setCustomerPresentationOpen] = useState(false);\n',
  "portfolio customer presentation state",
);

content = replaceRegex(
  content,
  /\n  const handleShareLink = async \(\) => \{[\s\S]*?\n  \};\n\n  const handleCopyLink/,
  '\n  const handleCopyLink',
  "remove legacy portfolio link creator",
  "const [customerPresentationOpen, setCustomerPresentationOpen]",
);

content = replaceOne(
  content,
  '            onClick={handleShareLink}\n            disabled={linkShareBusy}\n',
  '            onClick={() => setCustomerPresentationOpen(true)}\n',
  "portfolio presentation button action",
);

content = replaceOne(
  content,
  '            {linkShareBusy ? "Bağlantı Oluşturuluyor..." : "Müşterime Paylaş"}\n',
  '            Müşteri Sunumu\n',
  "portfolio presentation button label",
);

content = replaceOne(
  content,
  '      <PortfolioShareModal\n        open={shareOpen}\n',
  '      <CustomerPresentationSheet\n        open={customerPresentationOpen}\n        unitId={unit.id}\n        ephId={getPortfolioNo(unit)}\n        source="PORTFOLIO"\n        onClose={() => setCustomerPresentationOpen(false)}\n      />\n\n      <PortfolioShareModal\n        open={shareOpen}\n',
  "portfolio customer presentation sheet render",
);

write(path, content);
console.log("Portfolio customer presentation integration applied.");
