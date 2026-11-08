import { Prisma, Role, UyelikDurumu } from '@prisma/client';

type PoolAccessDb = Pick<Prisma.TransactionClient, 'kullaniciUyelikPaketi' | 'uyelikPaketi' | 'user' | 'office' | 'systemSetting'>;
export type PoolMembershipAccess = {
  allowed: boolean;
  code: 'ACTIVE' | 'SUPER_ADMIN' | 'OFFICE_PACKAGE' | 'NO_MEMBERSHIP' | 'NOT_STARTED' | 'EXPIRED' | 'PASSIVE' | 'CANCELLED' | 'PACKAGE_INACTIVE';
  message: string;
  packageCode: string | null;
  packageName: string | null;
  expiresAt: Date | null;
  officeId?: string;
};

const object = (value: Prisma.JsonValue | undefined): Prisma.JsonObject =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Prisma.JsonObject : {};
const text = (value: unknown) => typeof value === 'string' ? value.trim() : '';

// Kişisel üyelik önceliklidir. Ofis aboneliği, kardeş ofis ağı ile aynı SystemSetting kaynağından okunur.
export async function resolvePoolAccess(db: PoolAccessDb, user: { id: string; role?: Role | string }): Promise<PoolMembershipAccess> {
  if (String(user.role || '').toUpperCase() === Role.SUPER_ADMIN) {
    return { allowed: true, code: 'SUPER_ADMIN', message: 'Yazılım Ekibi Havuz işlem erişimi aktif.', packageCode: 'SYSTEM', packageName: 'Yazılım Ekibi', expiresAt: null };
  }
  const now = new Date();
  const [active, latest] = await Promise.all([
    db.kullaniciUyelikPaketi.findFirst({
      where: { kullaniciId: user.id, durum: UyelikDurumu.AKTIF, baslangicTarihi: { lte: now }, OR: [{ bitisTarihi: null }, { bitisTarihi: { gte: now } }] },
      orderBy: { baslangicTarihi: 'desc' },
    }),
    db.kullaniciUyelikPaketi.findFirst({ where: { kullaniciId: user.id }, orderBy: { baslangicTarihi: 'desc' } }),
  ]);
  const pack = active ? await db.uyelikPaketi.findUnique({ where: { id: active.paketId }, select: { paketKodu: true, paketAdi: true, aktifMi: true } }) : null;
  if (active && pack?.aktifMi) {
    return { allowed: true, code: 'ACTIVE', message: 'Havuz işlem erişiminiz aktif.', packageCode: pack.paketKodu, packageName: pack.paketAdi, expiresAt: active.bitisTarihi };
  }

  // Ofis ilişkisini JWT yerine güncel kayıttan doğrula; sahiplerin User.officeId alanı boş olabilir.
  const actor = await db.user.findUnique({ where: { id: user.id }, select: { role: true, officeId: true } });
  if (actor?.role === Role.SUPER_ADMIN) {
    return { allowed: true, code: 'SUPER_ADMIN', message: 'Yazılım Ekibi Havuz işlem erişimi aktif.', packageCode: 'SYSTEM', packageName: 'Yazılım Ekibi', expiresAt: null };
  }
  const offices = actor ? await db.office.findMany({
    where: { isActive: true, OR: [{ ownerUserId: user.id }, ...(actor.officeId ? [{ id: actor.officeId }] : [])] },
    select: { id: true }, orderBy: { id: 'asc' },
  }) : [];
  if (offices.length) {
    const catalog = await db.systemSetting.findUnique({ where: { key: 'OFFICE_MEMBERSHIP_PACKAGES' }, select: { valueJson: true } });
    const packages = Array.isArray(catalog?.valueJson) ? catalog.valueJson.map(object) : [];
    for (const office of offices) {
      const row = await db.systemSetting.findUnique({ where: { key: `OFFICE_SUBSCRIPTION_${office.id}` }, select: { valueJson: true } });
      const sub = object(row?.valueJson);
      const code = text(sub.packageCode).toUpperCase();
      const officePack = packages.find(item => text(item.code).toUpperCase() === code);
      const expiry = sub.expiresAt == null ? null : new Date(text(sub.expiresAt));
      // Bozuk tarih veya pasif katalog paketi erişim vermez. Süresiz abonelik, mevcut ofis kuralıyla uyumludur.
      if (!code || !officePack || officePack.active === false || sub.active === false || (expiry && (!Number.isFinite(expiry.getTime()) || expiry <= now))) continue;
      return {
        allowed: true, code: 'OFFICE_PACKAGE', message: 'Ofis paketiniz ile Havuz işlem erişiminiz aktif.',
        packageCode: code, packageName: text(officePack.name) || text(officePack.title) || text(sub.packageName) || code,
        expiresAt: expiry, officeId: office.id,
      };
    }
  }

  // Ofis paketi de uygun değilse mevcut kişisel üyelik mesajını ve kodunu koru.
  const denied = (code: PoolMembershipAccess['code'], message: string): PoolMembershipAccess => ({
    allowed: false, code, message, packageCode: null, packageName: null, expiresAt: latest?.bitisTarihi ?? null,
  });
  if (active) return { ...denied('PACKAGE_INACTIVE', 'Üyelik paketiniz aktif olmadığı için Havuz işlemleri kullanılamıyor.'), packageCode: pack?.paketKodu || null, packageName: pack?.paketAdi || null, expiresAt: active.bitisTarihi };
  if (!latest) return denied('NO_MEMBERSHIP', 'Havuz işlemleri için aktif üyelik gereklidir. Üyelik Merkezi üzerinden paket talebi oluşturabilirsiniz.');
  if (latest.durum === UyelikDurumu.AKTIF && latest.baslangicTarihi > now) return denied('NOT_STARTED', 'Üyeliğiniz henüz başlamadığı için Havuz işlemleri kullanılamıyor.');
  if (latest.durum === UyelikDurumu.SURESI_DOLDU || (latest.durum === UyelikDurumu.AKTIF && latest.bitisTarihi !== null && latest.bitisTarihi < now)) return denied('EXPIRED', 'Üyelik süreniz dolduğu için Havuz işlemleri kilitlidir. Havuzu görüntülemeye devam edebilirsiniz.');
  if (latest.durum === UyelikDurumu.IPTAL) return denied('CANCELLED', 'Üyeliğiniz iptal edildiği için Havuz işlemleri kullanılamıyor.');
  return denied('PASSIVE', 'Üyeliğiniz aktif olmadığı için Havuz işlemleri kullanılamıyor.');
}
