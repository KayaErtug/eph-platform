import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

const files = {
  backendUnits: path.join(root, "backend/src/units/units.service.ts"),
  featureMetadata: path.join(
    root,
    "frontend/src/components/stok/portfolioFeatureMetadata.ts",
  ),
  portfolioPage: path.join(root, "frontend/src/app/portfoy/page.tsx"),
  stockModal: path.join(
    root,
    "frontend/src/components/stok/StokCreateModal.tsx",
  ),
};

function assertFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Dosya bulunamadı: ${filePath}`);
  }
}

function backup(filePath) {
  const backupPath = `${filePath}.backup-user-selections-${timestamp}`;
  fs.copyFileSync(filePath, backupPath);
  return backupPath;
}

Object.values(files).forEach(assertFile);
const backups = Object.fromEntries(
  Object.entries(files).map(([key, filePath]) => [key, backup(filePath)]),
);

// 1) Backend: UI tarafından üretilen group:label özelliklerini güvenli biçimde koru.
let backendUnits = fs.readFileSync(files.backendUnits, "utf8");

if (!backendUnits.includes("const publicFeatureGroups = new Map<string, string>([")) {
  const oldFeatureNormalizer = `            const normalized = String(item || '').trim().toUpperCase();\n            return allowed.has(normalized) ? normalized : '';`;

  const newFeatureNormalizer = `            const rawFeature = String(item || '').trim();\n            const normalized = rawFeature.toUpperCase();\n\n            if (allowed.has(normalized)) return normalized;\n\n            const publicFeatureGroups = new Map<string, string>([\n              ['INTERIOR', 'interior'],\n              ['EXTERIOR', 'exterior'],\n              ['LOCATION', 'location'],\n              ['TRANSPORT', 'transport'],\n              ['FRONT', 'front'],\n              ['VIEW', 'view'],\n              ['ACCESSIBILITY', 'accessibility'],\n              ['ZONING', 'zoning'],\n              ['LANDINFRASTRUCTURE', 'landInfrastructure'],\n              ['COMMERCIAL', 'commercial'],\n              ['TOURISM', 'tourism'],\n              ['LUXURY', 'luxury'],\n            ]);\n            const separatorIndex = rawFeature.indexOf(':');\n\n            if (separatorIndex < 1) return '';\n\n            const rawGroup = rawFeature\n              .slice(0, separatorIndex)\n              .trim()\n              .replace(/[^a-zA-Z]/g, '')\n              .toUpperCase();\n            const group = publicFeatureGroups.get(rawGroup);\n\n            if (!group) return '';\n\n            const label = rawFeature\n              .slice(separatorIndex + 1)\n              .replace(/[\\u0000-\\u001F\\u007F]/g, ' ')\n              .replace(/[<>]/g, '')\n              .replace(/\\s+/g, ' ')\n              .trim()\n              .slice(0, 120);\n\n            return label ? \\`${'${group}'}:${'${label}'}\\` : '';`;

  if (!backendUnits.includes(oldFeatureNormalizer)) {
    throw new Error("Backend özellik normalizasyon bloğu bulunamadı.");
  }

  backendUnits = backendUnits.replace(
    oldFeatureNormalizer,
    newFeatureNormalizer,
  );
}

fs.writeFileSync(files.backendUnits, backendUnits, "utf8");

// 2) Kart: group:label kayıt biçiminden kullanıcıya yalnız gerçek etiketi göster.
let featureMetadata = fs.readFileSync(files.featureMetadata, "utf8");

const oldFeatureLabel = `export function getFeatureLabel(code: string) {\n  return FEATURE_LABELS[code] || code;\n}`;
const newFeatureLabel = `export function getFeatureLabel(code: string) {\n  const raw = cleanValue(code);\n  const separatorIndex = raw.indexOf(":");\n\n  if (separatorIndex > 0) {\n    const group = raw.slice(0, separatorIndex).trim().toLocaleLowerCase("tr-TR");\n    const allowedGroups = new Set([\n      "interior",\n      "exterior",\n      "location",\n      "transport",\n      "front",\n      "view",\n      "accessibility",\n      "zoning",\n      "landinfrastructure",\n      "commercial",\n      "tourism",\n      "luxury",\n    ]);\n\n    if (allowedGroups.has(group)) {\n      return raw.slice(separatorIndex + 1).trim() || raw;\n    }\n  }\n\n  return FEATURE_LABELS[raw] || raw;\n}`;

if (!featureMetadata.includes(newFeatureLabel)) {
  if (!featureMetadata.includes(oldFeatureLabel)) {
    throw new Error("Frontend özellik etiketi fonksiyonu bulunamadı.");
  }

  featureMetadata = featureMetadata.replace(oldFeatureLabel, newFeatureLabel);
}

fs.writeFileSync(files.featureMetadata, featureMetadata, "utf8");

// 3) Düzenleme kaydı: unit ile birlikte mevcut projenin adres/harita alanlarını da kaydet.
let portfolioPage = fs.readFileSync(files.portfolioPage, "utf8");

const oldEditingSave = `      if (editingUnit) {\n        await api.patch(\`/units/\${editingUnit.id}\`, unitPayload);`;
const newEditingSave = `      if (editingUnit) {\n        const editingProjectId = editingUnit.project?.id || selectedProjectId;\n\n        if (editingProjectId) {\n          await api.patch(\`/projects/\${editingProjectId}\`, {\n            name: String(projectForm.name || '').trim() || undefined,\n            city: String(projectForm.city || '').trim(),\n            district: String(projectForm.district || '').trim(),\n            address: String(projectForm.address || '').trim(),\n            latitude: (projectForm as any).latitude ?? null,\n            longitude: (projectForm as any).longitude ?? null,\n            mapAddress: (projectForm as any).mapAddress ?? null,\n            placeId: (projectForm as any).placeId ?? null,\n          });\n        }\n\n        await api.patch(\`/units/\${editingUnit.id}\`, unitPayload);`;

if (!portfolioPage.includes("const editingProjectId = editingUnit.project?.id || selectedProjectId;")) {
  if (!portfolioPage.includes(oldEditingSave)) {
    throw new Error("Portföy düzenleme kayıt bloğu bulunamadı.");
  }

  portfolioPage = portfolioPage.replace(oldEditingSave, newEditingSave);
}

fs.writeFileSync(files.portfolioPage, portfolioPage, "utf8");

// 4) İlçe: API seçeneğiyle birebir eşleşmeyen mevcut kayıt da select içinde görünür kalsın.
let stockModal = fs.readFileSync(files.stockModal, "utf8");

const districtAnchor = `                    <option value="">İlçe seçiniz</option>\n                    {districtOptions.map((district) => (`;
const districtReplacement = `                    <option value="">İlçe seçiniz</option>\n                    {projectForm.district &&\n                      !districtOptions.some(\n                        (district) => district.name === projectForm.district,\n                      ) && (\n                        <option value={projectForm.district}>\n                          {projectForm.district}\n                        </option>\n                      )}\n                    {districtOptions.map((district) => (`;

if (!stockModal.includes("<option value={projectForm.district}>")) {
  if (!stockModal.includes(districtAnchor)) {
    throw new Error("İlçe seçenek bloğu bulunamadı.");
  }

  stockModal = stockModal.replace(districtAnchor, districtReplacement);
}

fs.writeFileSync(files.stockModal, stockModal, "utf8");

console.log("Kullanıcı seçimlerinin kalıcı kayıt düzeltmesi uygulandı.");
console.log("- İlave özellikler backend tarafından korunacak.");
console.log("- Paylaşım kartında grup ön eki gösterilmeyecek.");
console.log("- Düzenlemede proje il/ilçe/mahalle/harita bilgileri kaydedilecek.");
console.log("- Mevcut ilçe değeri seçenek listesinde görünür kalacak.");
Object.entries(backups).forEach(([key, value]) => {
  console.log(`${key} yedeği: ${value}`);
});
