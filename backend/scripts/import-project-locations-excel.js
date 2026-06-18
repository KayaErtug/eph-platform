const { PrismaClient } = require("@prisma/client");
const XLSX = require("xlsx");

const prisma = new PrismaClient();

function getArg(name, fallback) {
  const found = process.argv.find((arg) => arg.startsWith(`${name}=`));
  return found ? found.split("=").slice(1).join("=") : fallback;
}

function toNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const normalized = String(value).replace(",", ".").trim();
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

async function main() {
  const file = getArg("--file", "");
  const apply = process.argv.includes("--apply");

  if (!file) throw new Error("--file parametresi zorunlu.");

  const workbook = XLSX.readFile(file);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet);

  let checked = 0;
  let updated = 0;
  let skipped = 0;

  for (const row of rows) {
    const flag = String(row["Güncellensin mi?"] || "").toLocaleUpperCase("tr-TR").trim();
    if (flag !== "EVET") {
      skipped++;
      continue;
    }

    checked++;

    const id = String(row["Proje ID"] || "").trim();
    const latitude = toNumber(row["Enlem"]);
    const longitude = toNumber(row["Boylam"]);

    if (!id || latitude === null || longitude === null) {
      console.log(`ATLANDI: ID/enlem/boylam eksik -> ${id}`);
      skipped++;
      continue;
    }

    const data = {
      city: String(row["İl"] || "").trim(),
      district: String(row["İlçe"] || "").trim(),
      address: String(row["Mahalle / Adres"] || "").trim(),
      latitude,
      longitude,
      mapAddress: String(row["Harita Adresi"] || "").trim() || null,
      placeId: String(row["Place ID"] || "").trim() || null,
    };

    console.log(`${apply ? "GÜNCELLENİYOR" : "DRY-RUN"}: ${id} -> ${data.city}/${data.district} ${latitude},${longitude}`);

    if (apply) {
      await prisma.project.update({ where: { id }, data });
      updated++;
    }
  }

  console.log("---");
  console.log(`EVET işaretli satır: ${checked}`);
  console.log(`Güncellenen: ${updated}`);
  console.log(`Atlanan: ${skipped}`);
  console.log(apply ? "GERÇEK UPDATE TAMAMLANDI" : "DRY-RUN TAMAMLANDI. Yazmak için --apply ekle.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());