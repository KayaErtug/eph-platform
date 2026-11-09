import { BadRequestException } from '@nestjs/common';
import { KotaDonemi, Prisma, Role } from '@prisma/client';

export async function consumeMembershipQuota(tx: Prisma.TransactionClient, actorId: string, kind: 'TALEP' | 'HAVUZ') {
  const actor = await tx.user.findUnique({ where: { id: actorId }, select: { role: true, officeId: true } });
  if (!actor || actor.role === Role.SUPER_ADMIN) return;
  const office = actor.officeId
    ? await tx.office.findUnique({ where: { id: actor.officeId }, select: { id: true, ownerUserId: true } })
    : await tx.office.findFirst({ where: { ownerUserId: actorId, isActive: true }, select: { id: true, ownerUserId: true } });
  const userId = office?.ownerUserId || actorId;
  const now = new Date();
  const membership = await tx.kullaniciUyelikPaketi.findFirst({
    where: { kullaniciId: userId, durum: 'AKTIF', baslangicTarihi: { lte: now }, OR: [{ bitisTarihi: null }, { bitisTarihi: { gte: now } }] },
    orderBy: { baslangicTarihi: 'desc' },
  });
  const pack = membership ? await tx.uyelikPaketi.findUnique({ where: { id: membership.paketId } }) : null;
  let limit = kind === 'TALEP' ? pack?.aylikTalepLimiti : pack?.aylikHavuzGonderimLimiti;
  if (office) {
    const sub = await tx.systemSetting.findUnique({ where: { key: `OFFICE_SUBSCRIPTION_${office.id}` } });
    const code = (sub?.valueJson as Prisma.JsonObject | null)?.packageCode;
    const setting = await tx.systemSetting.findUnique({ where: { key: 'OFFICE_MEMBERSHIP_PACKAGES' } });
    const officePack = Array.isArray(setting?.valueJson) ? (setting.valueJson as Prisma.JsonObject[]).find((p) => p.code === code) : undefined;
    const officeLimit = officePack?.[kind === 'TALEP' ? 'monthlyDemandLimit' : 'monthlyPoolLimit'];
    if (typeof officeLimit === 'number') limit = officeLimit;
  }
  if (typeof limit !== 'number' || limit <= 0) return;
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit' }).formatToParts(now);
  const year = Number(parts.find((p) => p.type === 'year')!.value);
  const month = Number(parts.find((p) => p.type === 'month')!.value);
  const start = new Date(Date.UTC(year, month - 1, 1, -3));
  const end = new Date(Date.UTC(year, month, 1, -3));
  const kotaKodu = `MEMBERSHIP_${kind}_YAYIN`;
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`membership-quota:${userId}:${kotaKodu}:${start.toISOString()}`}))`;
  const where = { kullaniciId_kotaKodu_donem_donemBaslangic: { kullaniciId: userId, kotaKodu, donem: KotaDonemi.AYLIK, donemBaslangic: start } };
  const quota = await tx.kotaKullanimi.upsert({ where, create: { kullaniciId: userId, kotaKodu, donem: KotaDonemi.AYLIK, limit, kullanilan: 0, donemBaslangic: start, donemBitis: end }, update: { limit, donemBitis: end } });
  if (quota.kullanilan >= limit) throw new BadRequestException(`Paketinizin aylık ${kind === 'TALEP' ? 'talep' : 'havuz yayını'} kotası (${limit}) doldu.`);
  await tx.kotaKullanimi.update({ where: { id: quota.id }, data: { kullanilan: { increment: 1 } } });
}
