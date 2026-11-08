import { ServiceUnavailableException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

/**
 * ODM-7G-D — Eski (legacy) kanal yardımcıları. Saf/ince: ilişkisel çözümleyiciyi import ETMEZ (döngüsel bağımlılık olmasın).
 * §0-B: ticari değer yok; yalnız mevcut ayar/kayıtların durum yorumu.
 */

export const OFFICE_ENTITLEMENT_SOURCE_SETTING = 'OFFICE_ENTITLEMENT_SOURCE';
const NON_PAID_LEGACY_CODES = ['DENEME', 'UCRETSIZ'];

const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {});

/**
 * Eski OFFICE_SUBSCRIPTION_* JSON'u şu an hak veriyor mu? (F02) `active:false`, `ended:true` veya geçmiş/bozuk bitiş = HAYIR.
 * expiresAt yok/null = süresiz (eski sözleşme). Bozuk tarih fail-closed: hak yok.
 */
export function legacySnapshotLive(raw: unknown, at: Date = new Date()): boolean {
  const sub = obj(raw);
  if (typeof sub.packageCode !== 'string' || !sub.packageCode.trim()) return false;
  if (sub.active === false || sub.ended === true) return false;
  if (sub.expiresAt === null || sub.expiresAt === undefined) return true;
  const t = Date.parse(String(sub.expiresAt));
  return Number.isFinite(t) && t > at.getTime();
}

/**
 * Eski okuyucular için kapasite (F02 + F01/legacy-eklenti): TÜRETİLMİŞ (derived) snapshot ek kullanıcı/Ofis Boy dahil etkin değerleri taşır;
 * katalog satırı bunların ÜSTÜNE yazmamalıdır. Türetilmemiş (eski) kayıtta katalog satırı önceliği korunur.
 * Dönüş: `null` alan = ayarda değer yok (çağıran kontrollü hata verir; kodda yedek sayı yok).
 */
export function legacyCapacityFields(sub: Record<string, unknown>, catalogRow: Record<string, unknown> | undefined): { agents: number | null; portfolioCapacity: number | null; crmCapacity: number | null } {
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
  const derived = sub.derived === true;
  const pick = (k: string) => (derived ? (num(sub[k]) ?? num(catalogRow?.[k])) : (num(catalogRow?.[k]) ?? num(sub[k])));
  return { agents: pick('agents'), portfolioCapacity: pick('portfolioCapacity'), crmCapacity: pick('crmCapacity') };
}

export class EntitlementSettingMissingError extends ServiceUnavailableException {
  constructor(what: string) { super({ statusCode: 503, code: 'ENTITLEMENT_SETTING_MISSING', message: `Ofis paketi ayarı eksik: ${what}. Yönetici ayarı tamamlamalıdır.` }); }
}

/**
 * F09 fail-closed: ilişkisel (relational) modda limitini doğru uygulayamayan, henüz taşınmamış okuyucular işlemi REDDEDER
 * (yanlış limit vermek yerine). Okuyucu taşındığında çağrı kaldırılır.
 */
export async function assertReaderMigrated(db: { systemSetting: { findUnique: (a: any) => Promise<{ valueJson: Prisma.JsonValue } | null> } }, reader: string): Promise<void> {
  const row = await db.systemSetting.findUnique({ where: { key: OFFICE_ENTITLEMENT_SOURCE_SETTING }, select: { valueJson: true } });
  if (row?.valueJson === 'relational') {
    throw new ServiceUnavailableException({ statusCode: 503, code: 'ENTITLEMENT_READER_NOT_MIGRATED', message: 'Bu işlem paket modeli geçişi tamamlanana kadar geçici olarak kapalıdır.', reader });
  }
}

/**
 * F01/F06: ilişkisel modelde karşılığı olmayan, ESKİ kanalda aktif ücretli hak var mı?
 * (a) türetilmemiş OFFICE_SUBSCRIPTION_<ofis> JSON'u canlı ve ücretli kodlu; (b) ofis sahibinin AKTIF, süresi dolmamış, deneme/ücretsiz olmayan KullaniciUyelikPaketi kaydı.
 */
export async function legacyPaidActive(
  db: Pick<Prisma.TransactionClient, 'systemSetting' | 'kullaniciUyelikPaketi' | 'uyelikPaketi'>,
  officeId: string, ownerUserId: string | null, at: Date = new Date(),
): Promise<boolean> {
  const row = await db.systemSetting.findUnique({ where: { key: `OFFICE_SUBSCRIPTION_${officeId}` }, select: { valueJson: true } });
  const sub = obj(row?.valueJson);
  if (sub.derived !== true && legacySnapshotLive(sub, at) && !NON_PAID_LEGACY_CODES.includes(String(sub.packageCode).trim().toUpperCase())) return true;
  if (!ownerUserId) return false;
  const rel = await db.kullaniciUyelikPaketi.findFirst({
    where: { kullaniciId: ownerUserId, durum: 'AKTIF', baslangicTarihi: { lte: at }, OR: [{ bitisTarihi: null }, { bitisTarihi: { gt: at } }] },
    orderBy: { baslangicTarihi: 'desc' },
  });
  if (!rel) return false;
  const pack = await db.uyelikPaketi.findUnique({ where: { id: rel.paketId }, select: { paketKodu: true } });
  return !!pack && !NON_PAID_LEGACY_CODES.includes(String(pack.paketKodu));
}
