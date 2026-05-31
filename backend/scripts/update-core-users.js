const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const USERS = [
  {
    email: "emlak@test.com",
    firstName: "Tamer",
    lastName: "Gündüz",
    city: "Denizli",
    district: "Merkezefendi",
    cityPlateCode: "20",
    memberCode: "EPH-2408-2026-XK41P7",
  },
  {
    email: "muteahhit@test.com",
    firstName: "Kemal",
    lastName: "Turgut",
    city: "Aydın",
    district: "Efeler",
    cityPlateCode: "09",
    memberCode: "EPH-1424-0926-BM73Q8",
  },
  {
    email: "insaat@test.com",
    firstName: "Süleyman",
    lastName: "Şahan",
    city: "Denizli",
    district: "Merkezefendi",
    cityPlateCode: "20",
    memberCode: "EPH-2223-2026-LR91T4",
  },
  {
    email: "admin@test.com",
    firstName: "Şevket",
    lastName: "Özdemir",
    city: "İstanbul",
    district: "Kadıköy",
    cityPlateCode: "34",
    memberCode: "EPH-2319-3426-ND62K5",
  },
  {
    email: "mustafaertugkaya@gmail.com",
    firstName: "Mustafa Ertuğ",
    lastName: "Kaya",
    city: "Denizli",
    district: "Merkezefendi",
    cityPlateCode: "20",
    memberCode: "EPH-1614-2026-ZP84M2",
  },
];

async function main() {
  console.log("EPH çekirdek kullanıcı güncellemesi başlıyor...");

  for (const item of USERS) {
    const user = await prisma.user.findUnique({
      where: { email: item.email },
    });

    if (!user) {
      console.log(`BULUNAMADI: ${item.email}`);
      continue;
    }

    await prisma.user.update({
      where: { email: item.email },
      data: {
        firstName: item.firstName,
        lastName: item.lastName,
        city: item.city,
        district: item.district,
        cityPlateCode: item.cityPlateCode,
        memberCode: item.memberCode,
        memberSince: new Date("2026-01-01"),
      },
    });

    console.log(`GÜNCELLENDİ: ${item.email}`);
  }

  console.log("Tamamlandı.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });