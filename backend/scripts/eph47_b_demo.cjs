// EPH-47 B3-B4: Apple App Review demo hesabi + Volarant Denizli ofis paketi (Ofis Altin) + ofis PK.
// Sifre YALNIZ ortam degiskeninden okunur:  $env:EPH47_DEMO_PASSWORD='...'; node scripts/eph47_b_demo.cjs
// Ofis paketi/PK mantigi: src/office/office.service.ts purchaseOfficePackage (satir 139-250) ile ayni kayit bicimi.
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const OFFICE_ID = 'a9d50719-6f67-480d-9737-b7556ece78f3'; // Volarant Denizli
const PACKAGE_CODE = 'ALTIN';
const DESCRIPTION = 'Apple App Review demo hesabı';
const DEMO = {
  firstName: 'Melisa', lastName: 'Deniz', email: 'appreview@emlakportfoyhavuzu.com',
  phone: '+905551112233', city: 'Denizli',
};

(async () => {
  const password = process.env.EPH47_DEMO_PASSWORD;
  if (!password) throw new Error('EPH47_DEMO_PASSWORD ortam degiskeni gerekli.');
  const prisma = new PrismaClient();
  try {
    const now = new Date();
    const result = await prisma.$transaction(async (tx) => {
      const office = await tx.office.findUnique({ where: { id: OFFICE_ID } });
      if (!office || !office.isActive || !office.ownerUserId) throw new Error('Volarant ofisi bulunamadi/aktif degil.');
      const admin = await tx.user.findFirst({ where: { role: 'SUPER_ADMIN' }, select: { id: true } });
      if (!admin) throw new Error('SUPER_ADMIN bulunamadi (AuditLog aktoru).');
      if (await tx.user.findFirst({ where: { OR: [{ email: DEMO.email }, { phone: DEMO.phone }] } })) {
        throw new Error('Demo e-posta/telefon zaten kayitli, durduruldu.');
      }

      const pkgRow = await tx.systemSetting.findUnique({ where: { key: 'OFFICE_MEMBERSHIP_PACKAGES' } });
      const pkg = (Array.isArray(pkgRow?.valueJson) ? pkgRow.valueJson : []).find((p) => p.code === PACKAGE_CODE);
      if (!pkg || pkg.active === false) throw new Error('Ofis Altin paketi tanimli/aktif degil.');
      const agents = await tx.user.count({ where: { officeId: office.id, role: 'EMLAKCI', id: { not: office.ownerUserId } } });
      if (agents + 1 > Number(pkg.agents)) throw new Error(`Ofis danisman kapasitesi yetersiz: ${agents}/${pkg.agents}`);

      // Demo kullanici (register ile ayni: bcryptjs, 10 tur)
      const user = await tx.user.create({
        data: {
          ...DEMO,
          passwordHash: await bcrypt.hash(password, 10),
          role: 'EMLAKCI',
          isApproved: true,
          isVerified: true,
          emailVerifiedAt: now,
          profileCompleted: true,
          profileCompletedAt: now,
          officeId: office.id,
        },
      });

      // Ofis paketi kaydi (ofis aboneligi; Kutay'in bireysel uyelik paketine dokunulmaz)
      const monthlyPk = Number(pkg.monthlyPk);
      const valueJson = {
        officeId: office.id, packageCode: pkg.code, packageName: pkg.name, price: pkg.price,
        monthlyPk: pkg.monthlyPk, portfolioCapacity: pkg.portfolioCapacity, crmCapacity: pkg.crmCapacity, agents: pkg.agents,
        purchasedAt: now.toISOString(), expiresAt: new Date(now.getTime() + 30 * 86400000).toISOString(),
      };
      const key = `OFFICE_SUBSCRIPTION_${office.id}`;
      const before = await tx.systemSetting.findUnique({ where: { key } });
      await tx.systemSetting.upsert({ where: { key }, create: { key, valueJson }, update: { valueJson } });

      // Ofis (ortak) cuzdani = ofis sahibinin KontorCuzdani'
      const wallet = await tx.kontorCuzdani.findUnique({ where: { kullaniciId: office.ownerUserId } });
      if (!wallet) throw new Error('Ofis sahibinin PK cuzdani yok.');
      const updated = await tx.kontorCuzdani.update({
        where: { kullaniciId: office.ownerUserId },
        data: { bakiye: { increment: monthlyPk }, toplamYukleme: { increment: monthlyPk }, toplamHediye: { increment: monthlyPk } },
      });
      await tx.kontorHareketi.create({
        data: {
          kullaniciId: office.ownerUserId, hareketTuru: 'YUKLEME', islemTuru: 'DIGER', miktar: monthlyPk,
          oncekiBakiye: wallet.bakiye, sonrakiBakiye: updated.bakiye,
          aciklama: `${DESCRIPTION}: ${pkg.name} ofis paketi ve ${monthlyPk} Ortak PK yüklendi.`, olusturanId: admin.id,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: admin.id, targetUserId: office.ownerUserId, action: 'UPDATE_USER_PACKAGE', entityType: 'OFFICE', entityId: office.id,
          description: DESCRIPTION,
          metadata: { oncekiAbonelik: before?.valueJson ?? null, yeniPaket: pkg.code, yuklenenPk: monthlyPk, oncekiBakiye: wallet.bakiye, sonrakiBakiye: updated.bakiye, demoUserId: user.id },
        },
      });
      await tx.auditLog.create({
        data: {
          actorId: admin.id, targetUserId: user.id, action: 'UPDATE_USER_ROLE', entityType: 'USER', entityId: user.id,
          description: DESCRIPTION, metadata: { officeId: office.id, role: 'EMLAKCI' },
        },
      });
      return { demoUserId: user.id, officePackage: pkg.code, ownerWalletBefore: wallet.bakiye, ownerWalletAfter: updated.bakiye };
    });
    console.log(JSON.stringify(result));
  } finally {
    await prisma.$disconnect();
  }
})();
