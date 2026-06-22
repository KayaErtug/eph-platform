const { PrismaClient } = require("@prisma/client");

const p = new PrismaClient();

async function main() {
  const rows = await p.kullaniciUyelikPaketi.findMany({
    take: 20,
    orderBy: {
      baslangicTarihi: "desc",
    },
  });

  console.dir(rows, { depth: null });
}

main()
  .catch(console.error)
  .finally(async () => {
    await p.$disconnect();
  });