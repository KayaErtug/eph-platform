// EPH-50: Volarant Denizli ortak harcama modunu SHARED yapar (OfficeManagementService.mode ile ayni kayit bicimi).
// Kullanim: node scripts/eph50_ofis_ortak_mod.cjs          (yalniz okur)
//           node scripts/eph50_ofis_ortak_mod.cjs --yaz    (kaydeder)
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const apply = process.argv.includes('--yaz');
(async () => {
  const offices = await prisma.office.findMany({ where: { id: { startsWith: 'a9d50719' } } });
  if (offices.length !== 1) throw new Error(`Ofis tekil bulunamadi: ${offices.length}`);
  const office = offices[0];
  const key = `EPH_OFFICE_SPENDING_${office.id}`;
  const before = await prisma.systemSetting.findUnique({ where: { key } });
  console.log(JSON.stringify({ id: office.id, name: office.name, ownerUserId: office.ownerUserId, isActive: office.isActive, key, before: before?.valueJson ?? null }));
  if (!apply) return;
  if (!office.ownerUserId) throw new Error('Ofis sahibi yok.');
  const value = { mode: 'SHARED', updatedAt: new Date().toISOString(), updatedBy: office.ownerUserId };
  await prisma.$transaction(async tx => {
    await tx.systemSetting.upsert({ where: { key }, create: { key, valueJson: value }, update: { valueJson: value } });
    await tx.adminActionLog.create({ data: { actorId: office.ownerUserId, action: 'OFFICE_SPENDING_MODE_CHANGED', entityType: 'OFFICE', entityId: office.id,
      description: 'Apple App Review demo hesabı', metadata: { ...value, previous: before?.valueJson ?? null, task: 'EPH-50' } } });
  });
  console.log('after', JSON.stringify((await prisma.systemSetting.findUnique({ where: { key } })).valueJson));
})().catch(e => { console.error(e.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
