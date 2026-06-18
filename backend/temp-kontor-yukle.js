const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
    },
  });

  let created = 0;
  let updated = 0;

  for (const user of users) {
    const wallet = await prisma.kontorCuzdani.findUnique({
      where: {
        kullaniciId: user.id,
      },
    });

    if (!wallet) {
      await prisma.kontorCuzdani.create({
        data: {
          kullaniciId: user.id,
          bakiye: 500,
          toplamYukleme: 500,
          aktifMi: true,
        },
      });

      created++;
      continue;
    }

    await prisma.kontorCuzdani.update({
      where: {
        kullaniciId: user.id,
      },
      data: {
        bakiye: 500,
        toplamYukleme: Math.max(wallet.toplamYukleme, 500),
        aktifMi: true,
      },
    });

    updated++;
  }

  console.log({
    created,
    updated,
    totalUsers: users.length,
  });
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });