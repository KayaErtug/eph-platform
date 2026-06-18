const { PrismaClient } = require("@prisma/client");
const XLSX = require("xlsx");

const prisma = new PrismaClient();

function getArg(name, fallback) {
  const found = process.argv.find((arg) => arg.startsWith(`${name}=`));
  return found ? found.split("=").slice(1).join("=") : fallback;
}

async function main() {
  const out = getArg("--out", "portfoy-proje-konumlari.xlsx");

  const projects = await prisma.project.findMany({
    orderBy: [{ city: "asc" }, { district: "asc" }, { name: "asc" }],
    include: { units: true },
  });

  const rows = projects.map((p) => ({
    "Güncellensin mi?": "",
    "Proje ID": p.id,
    "Proje Adı": p.name,
    "İl": p.city,
    "İlçe": p.district,
    "Mahalle / Adres": p.address,
    "Enlem": p.latitude ?? "",
    "Boylam": p.longitude ?? "",
    "Harita Adresi": p.mapAddress ?? "",
    "Place ID": p.placeId ?? "",
    "Portföy Sayısı": p.units.length,
    "Konum Durumu": p.latitude && p.longitude ? "KONUMLU" : "KONUMSUZ",
  }));

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, worksheet, "Proje Konumlari");
  XLSX.writeFile(workbook, out);

  console.log(`Excel oluşturuldu: ${out}`);
  console.log(`Toplam proje: ${projects.length}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());