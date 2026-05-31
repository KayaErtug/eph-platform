const { PrismaClient, Role } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

const PASSWORD = "112233";

const cities = [
  { city: "Ankara", cityPlateCode: "06", district: "Çankaya" },
  { city: "İzmir", cityPlateCode: "35", district: "Konak" },
  { city: "İstanbul", cityPlateCode: "34", district: "Kadıköy" },
];

const roles = [
  { role: Role.EMLAKCI, label: "Emlakçı", prefix: "emlakci" },
  { role: Role.MUTEAHHIT, label: "Müteahhit", prefix: "muteahhit" },
  { role: Role.INSAAT_FIRMASI, label: "İnşaat Firması", prefix: "insaat" },
];

function slug(value) {
  return value
    .toLocaleLowerCase("tr-TR")
    .replaceAll("ı", "i")
    .replaceAll("ğ", "g")
    .replaceAll("ü", "u")
    .replaceAll("ş", "s")
    .replaceAll("ö", "o")
    .replaceAll("ç", "c")
    .replaceAll("İ", "i")
    .replaceAll(" ", "");
}

async function main() {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  for (const cityItem of cities) {
    for (const roleItem of roles) {
      for (let i = 1; i <= 2; i++) {
        const citySlug = slug(cityItem.city);
        const email = `${roleItem.prefix}.${citySlug}.${i}@test.com`;
        const phone = `+9055${cityItem.cityPlateCode}${roles.indexOf(roleItem) + 1}${i}000${i}`;

        await prisma.user.upsert({
          where: { email },
          update: {
            phone,
            passwordHash,
            firstName: `${cityItem.city} ${roleItem.label}`,
            lastName: `Test ${i}`,
            role: roleItem.role,
            isVerified: true,
            isApproved: true,
            adminVisible: true,
            city: cityItem.city,
            cityPlateCode: cityItem.cityPlateCode,
            district: cityItem.district,
            memberSince: new Date("2026-01-01"),
            trustScore: 70,
            referralCode: `TEST-${cityItem.cityPlateCode}-${roleItem.prefix.toUpperCase()}-${i}`,
          },
          create: {
            email,
            phone,
            passwordHash,
            firstName: `${cityItem.city} ${roleItem.label}`,
            lastName: `Test ${i}`,
            role: roleItem.role,
            isVerified: true,
            isApproved: true,
            adminVisible: true,
            city: cityItem.city,
            cityPlateCode: cityItem.cityPlateCode,
            district: cityItem.district,
            memberSince: new Date("2026-01-01"),
            trustScore: 70,
            referralCode: `TEST-${cityItem.cityPlateCode}-${roleItem.prefix.toUpperCase()}-${i}`,
          },
        });

        console.log(`OK: ${email}`);
      }
    }
  }
}

main()
  .then(async () => {
    console.log("18 şehir test kullanıcısı hazır.");
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });