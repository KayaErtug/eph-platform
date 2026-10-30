// EPH-47 A3-A4: JSON yedek + tek transaction'da anonimleştirme.
// Mantik: src/profile/profile.service.ts processScheduledAccountDeletions (satir 66-143) ile ayni.
// Kullanim: node scripts/eph47_a_sil.cjs <email> <telefon> <yedekYolu>
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const [email, phone, backupPath] = process.argv.slice(2);
if (!email || !phone || !backupPath) throw new Error('Kullanim: <email> <telefon> <yedekYolu>');

(async () => {
  const prisma = new PrismaClient();
  try {
    const users = await prisma.user.findMany({
      where: { OR: [{ email: { equals: email, mode: 'insensitive' } }, { phone }] },
      select: { id: true, role: true },
    });
    if (users.some((u) => u.role === 'SUPER_ADMIN')) throw new Error('SUPER_ADMIN bulundu, durduruldu.');

    const rels = prisma._runtimeDataModel.models.User.fields
      .filter((f) => f.kind === 'object' && f.isList).map((f) => f.name);
    const backup = [];
    for (const u of users) {
      backup.push(await prisma.user.findUnique({
        where: { id: u.id },
        include: Object.fromEntries(rels.map((r) => [r, true])),
      }));
    }
    fs.mkdirSync(path.dirname(backupPath), { recursive: true });
    fs.writeFileSync(
      backupPath,
      JSON.stringify(backup, (k, v) => (typeof v === 'bigint' ? v.toString() : v), 2),
      'utf8',
    );
    console.log('yedek:', backupPath, 'kullanici:', backup.length);

    const now = new Date();
    await prisma.$transaction(async (tx) => {
      for (const u of users) {
        await tx.accountDeletionRequest.create({
          data: { userId: u.id, status: 'COMPLETED', scheduledDeletionAt: now, completedAt: now },
        });
        await tx.userBlock.deleteMany({ where: { OR: [{ blockerId: u.id }, { blockedId: u.id }] } });
        await tx.pushSubscription.deleteMany({ where: { userId: u.id } });
        await tx.user.update({
          where: { id: u.id },
          data: {
            email: null, phone: `deleted-${u.id}`, passwordHash: null,
            firstName: 'Silinmis', lastName: 'Kullanici',
            isVerified: false, emailVerifiedAt: null,
            emailVerificationCodeHash: null, emailVerificationExpiresAt: null,
            emailVerificationAttempts: 0, emailVerificationLastSentAt: null,
            passwordResetCodeHash: null, passwordResetExpiresAt: null,
            passwordResetAttempts: 0, passwordResetLastSentAt: null,
            passwordResetVersion: { increment: 1 },
            isApproved: false, adminVisible: false,
            profileCompleted: false, profileCompletedAt: null, profileImageUrl: null,
            referralCode: null, memberCode: null,
            city: null, cityPlateCode: null, district: null,
            companyName: null, taxNumber: null, taxOffice: null, professionalDocumentNumber: null,
            pilotKullaniciMi: false,
          },
        });
      }
    });

    const left = await prisma.user.count({
      where: { OR: [{ email: { equals: email, mode: 'insensitive' } }, { phone }] },
    });
    const anon = await prisma.user.findMany({
      where: { id: { in: users.map((u) => u.id) } },
      select: { id: true, email: true, phone: true, firstName: true, isApproved: true },
    });
    console.log('dogrulama: ayni email/telefonla kalan kayit =', left);
    console.log(JSON.stringify(anon));
  } finally {
    await prisma.$disconnect();
  }
})();
