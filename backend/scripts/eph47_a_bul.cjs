// EPH-47 A1: SALT OKUMA. Kullanici(lar)i bulur, bagli kayit sayilarini maskeli yazar.
// Kullanim: node scripts/eph47_a_bul.cjs <email> <telefon>
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const [email, phone] = process.argv.slice(2);
const maskEmail = (v) => (v ? v.replace(/^(.).*(@.*)$/, '$1***$2') : null);
const maskPhone = (v) => (v ? v.slice(0, 4) + '***' + v.slice(-2) : null);

(async () => {
  const prisma = new PrismaClient();
  try {
    const users = await prisma.user.findMany({
      where: { OR: [{ email: { equals: email, mode: 'insensitive' } }, { phone }] },
      select: { id: true, email: true, phone: true, role: true, createdAt: true, officeId: true, isApproved: true },
    });
    const rels = prisma._runtimeDataModel.models.User.fields
      .filter((f) => f.kind === 'object' && f.isList).map((f) => f.name);
    for (const u of users) {
      const c = await prisma.user.findUnique({
        where: { id: u.id },
        select: { _count: { select: Object.fromEntries(rels.map((r) => [r, true])) } },
      });
      const counts = Object.fromEntries(Object.entries(c._count).filter(([, n]) => n > 0));
      console.log(JSON.stringify({
        id: u.id, role: u.role, createdAt: u.createdAt, email: maskEmail(u.email), phone: maskPhone(u.phone),
        officeId: u.officeId, isApproved: u.isApproved, baglikayitlar: counts,
      }));
    }
    console.log('bulunan:', users.length);
  } finally {
    await prisma.$disconnect();
  }
})();
