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
  const oldFeatureNormalizer = `            const normalized = String(item || '').trim().toUpperCase();
            return allowed.has(normalized) ? normalized : '';`;

  const newFeatureNormalizer = `            const rawFeature = String(item || '').trim();
            const normalized = rawFeature.toUpperCase();

            if (allowed.has(normalized)) return normalized;

            const publicFeatureGroups = new Map<string, string>([
              ['INTERIOR', 'interior'],
              ['EXTERIOR', 'exterior'],
              ['LOCATION', 'location'],
              ['TRANSPORT', 'transport'],
              ['FRONT', 'front'],
              ['VIEW', 'view'],
              ['ACCESSIBILITY', 'accessibility'],
              ['ZONING', 'zoning'],
              ['LANDINFRASTRUCTURE', 'landInfrastructure'],
              ['COMMERCIAL', 'commercial'],
              ['TOURISM', 'tourism'],
              ['LUXURY', 'luxury'],
            ]);
            const separatorIndex = rawFeature.indexOf(':');

            if (separatorIndex < 1) return '';

            const rawGroup = rawFeature
              .slice(0, separatorIndex)
              .trim()
              .replace(/[^a-zA-Z]/g, '')
              .toUpperCase();
            const group = publicFeatureGroups.get(rawGroup);

            if (!group) return '';

            const label = rawFeature
              .slice(separatorIndex + 1)
              .replace(/[\u0000-\u001F\u007F]/g, ' ')
              .replace(/[<>]/g, '')
              .replace(/\s+/g, ' ')
              .trim()
              .slice(0, 120);

            return label ? [group, label].join(':') : '';`;

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

const oldFeatureLabel = `export function getFeatureLabel(code: string) {
  return FEATURE_LABELS[code] || code;
}`;
const newFeatureLabel = `export function getFeatureLabel(code: string) {
  const raw = cleanValue(code);
  const separatorIndex = raw.indexOf(":");

  if (separatorIndex > 0) {
    const group = raw.slice(0, separatorIndex).trim().toLocaleLowerCase("tr-TR");
    const allowedGroups = new Set([
      "interior",
      "exterior",
      "location",
      "transport",
      "front",
      "view",
      "accessibility",
      "zoning",
      "landinfrastructure",
      "commercial",
      "tourism",
      "luxury",
    ]);

    if (allowedGroups.has(group)) {
      return raw.slice(separatorIndex + 1).trim() || raw;
    }
  }

  return FEATURE_LABELS[raw] || raw;
}`;

if (!featureMetadata.includes(newFeatureLabel)) {
  if (!featureMetadata.includes(oldFeatureLabel)) {
    throw new Error("Frontend özellik etiketi fonksiyonu bulunamadı.");
  }

  featureMetadata = featureMetadata.replace(oldFeatureLabel, newFeatureLabel);
}

fs.writeFileSync(files.featureMetadata, featureMetadata, "utf8");

// 3) Düzenleme kaydı: unit ile birlikte mevcut projenin adres/harita alanlarını da kaydet.
let portfolioPage = fs.readFileSync(files.portfolioPage, "utf8");

const oldEditingSave = `      if (editingUnit) {
        await api.patch(\`/units/\${editingUnit.id}\`, unitPayload);`;
const newEditingSave = `      if (editingUnit) {
        const editingProjectId = editingUnit.project?.id || selectedProjectId;

        if (editingProjectId) {
          await api.patch(\`/projects/\${editingProjectId}\`, {
            name: String(projectForm.name || '').trim() || undefined,
            city: String(projectForm.city || '').trim(),
            district: String(projectForm.district || '').trim(),
            address: String(projectForm.address || '').trim(),
            latitude: (projectForm as any).latitude ?? null,
            longitude: (projectForm as any).longitude ?? null,
            mapAddress: (projectForm as any).mapAddress ?? null,
            placeId: (projectForm as any).placeId ?? null,
          });
        }

        await api.patch(\`/units/\${editingUnit.id}\`, unitPayload);`;

if (!portfolioPage.includes("const editingProjectId = editingUnit.project?.id || selectedProjectId;")) {
  if (!portfolioPage.includes(oldEditingSave)) {
    throw new Error("Portföy düzenleme kayıt bloğu bulunamadı.");
  }

  portfolioPage = portfolioPage.replace(oldEditingSave, newEditingSave);
}

fs.writeFileSync(files.portfolioPage, portfolioPage, "utf8");

// 4) İlçe: API seçeneğiyle birebir eşleşmeyen mevcut kayıt da select içinde görünür kalsın.
let stockModal = fs.readFileSync(files.stockModal, "utf8");

const districtAnchor = `                    <option value="">İlçe seçiniz</option>
                    {districtOptions.map((district) => (`;
const districtReplacement = `                    <option value="">İlçe seçiniz</option>
                    {projectForm.district &&
                      !districtOptions.some(
                        (district) => district.name === projectForm.district,
                      ) && (
                        <option value={projectForm.district}>
                          {projectForm.district}
                        </option>
                      )}
                    {districtOptions.map((district) => (`;

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
