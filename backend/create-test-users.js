const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("112233", 10);

  const users = [
    {
      email: "emlak@test.com",
      phone: "+905550000001",
      firstName: "Emlakçı",
      lastName: "Test",
      role: "EMLAKCI",
      referralCode: "TEST-EMLAK",
    },
    {
      email: "muteahhit@test.com",
      phone: "+905550000002",
      firstName: "Müteahhit",
      lastName: "Test",
      role: "MUTEAHHIT",
      referralCode: "TEST-MUTEAHHIT",
    },
    {
      email: "insaat@test.com",
      phone: "+905550000003",
      firstName: "İnşaat",
      lastName: "Firması",
      role: "INSAAT_FIRMASI",
      referralCode: "TEST-INSAAT",
    },
    {
      email: "admin@test.com",
      phone: "+905550000004",
      firstName: "Admin",
      lastName: "Test",
      role: "ADMIN",
      referralCode: "TEST-ADMIN",
    },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        phone: user.phone,
        firstName: user.firstName,
        lastName: user.lastName,
        passwordHash,
        role: user.role,
        isApproved: true,
        isVerified: true,
        adminVisible: true,
        referralCode: user.referralCode,
      },
      create: {
        email: user.email,
        phone: user.phone,
        firstName: user.firstName,
        lastName: user.lastName,
        passwordHash,
        role: user.role,
        isApproved: true,
        isVerified: true,
        adminVisible: true,
        referralCode: user.referralCode,
      },
    });

    console.log(`${user.email} hazırlandı. Rol: ${user.role}`);
  }

  console.log("Tüm test kullanıcıları hazır.");
}

main()
  .catch((error) => {
    console.error("Hata oluştu:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });