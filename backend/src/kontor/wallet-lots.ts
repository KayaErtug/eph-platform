import { Prisma } from '@prisma/client';

/**
 * EPH-70B1 / 70B1F: ortak PK cüzdanı kilidi + lot (PortfolioCreditLot) tüketim kuralları.
 *
 * TEK KİLİT SIRASI (TÜM yollar: harcama, iade, yükleme, lot değişimi, dönem sonu, mağaza iadesi, admin, ofis dağıtımı):
 *   1) payment-user : pg_advisory_xact_lock(hashtext('payment-user:{kullaniciId}'))   (ödeme/üyelik/mağaza/admin üyelik yolları)
 *   2) office       : ofis/üyelik satırları ve ofis advisory kilitleri (office-user:*, office-policy:* ...)
 *   3) wallet       : pg_advisory_xact_lock(hashtext('wallet:{kullaniciId}')) -> KontorCuzdani ... FOR UPDATE
 *                     Birden çok cüzdan gerekiyorsa kullaniciId'ye göre ARTAN sırayla (lockWalletsOrdered).
 *   4) lot satırları: cüzdan kilidi ALTINDA okunur/yazılır.
 * Cüzdan kilidinden SONRA payment-user/office/üyelik/User satırı kilidi ALINMAZ (aksi ters sıra = deadlock riski).
 *
 * EPH-70B1G/F5 — FK ebeveyn kilitleri: lot / tüketim INSERT'i PostgreSQL'de ebeveyn satırlarında (User, KullaniciUyelikPaketi, PaymentOrder)
 * FOR KEY SHARE alır; bu mod FOR UPDATE ile ÇAKIŞIR ama FOR NO KEY UPDATE ile ÇAKIŞMAZ. Kural: cüzdan akışlarında User / Office /
 * üyelik / PaymentOrder satırları YALNIZ `FOR NO KEY UPDATE` ile (asla FOR UPDATE ile) ve cüzdandan ÖNCE kilitlenir. Böylece
 * "wallet tutan işlem lot INSERT'inde User FK kilidi bekler, User tutan işlem wallet bekler" döngüsü oluşamaz.
 * Apple grant: payment-user -> kullanıcının üyelik satırları (NO KEY UPDATE) -> settlement (wallet) -> üyelik/lot güncellemeleri
 * (satırlar zaten kilitli; yeni kilit alınmaz).
 */

export type WalletLotLike = {
  id: string;
  lotTuru: string;
  kalanMiktar: number;
  ilkMiktar?: number;
  sonKullanmaTarihi: Date | null;
  olusturulmaTarihi?: Date;
  kaynakKayitTuru?: string | null;
};

/** SystemSetting: uzlaştırma SQL'i doğrulanıp bayrak true yazılmadan dönem sonu düşümü HİÇ çalışmaz (D3). */
export const LOT_RECONCILED_KEY = 'EPH70_LOT_UZLASTIRMA_TAMAM';
/** SystemSetting (ISO tarih): bu tarihten SONRA açılan denemelerin kalan PK'sı dönem sonunda silinir; öncekiler kalır (karar 18b). */
export const NEW_TRIAL_START_KEY = 'EPH70_YENI_DENEME_BASLANGICI';

export async function lockPaymentUser(tx: Prisma.TransactionClient, userId: string) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`payment-user:${userId}`}))`;
}

export async function lotsReconciled(tx: Prisma.TransactionClient): Promise<boolean> {
  const row = await tx.systemSetting.findUnique({ where: { key: LOT_RECONCILED_KEY } });
  const v: unknown = row?.valueJson;
  return v === true || v === 'true';
}

export async function newTrialCutoff(tx: Prisma.TransactionClient): Promise<Date | null> {
  const row = await tx.systemSetting.findUnique({ where: { key: NEW_TRIAL_START_KEY } });
  const v: unknown = row?.valueJson;
  const d = typeof v === 'string' ? new Date(v) : null;
  return d && Number.isFinite(d.getTime()) ? d : null;
}

/** Deneme kaynakları (üyelik denemesi + ofis denemesi): karar 18b eski deneme istisnası bunlara uygulanır. */
export const TRIAL_LOT_SOURCES = ['TRIAL_MEMBERSHIP', 'OFFICE_TRIAL'];

/** Eski deneme (karar 18b): deneme kaynaklı lot, cutoff tanımsız veya lot cutoff'tan ÖNCE oluşmuşsa dönem sonunda silinmez ve harcanabilir kalır. */
export function isLegacyTrialLot(lot: WalletLotLike, cutoff: Date | null): boolean {
  if (!lot.kaynakKayitTuru || !TRIAL_LOT_SOURCES.includes(lot.kaynakKayitTuru)) return false;
  if (!cutoff) return true;
  return !lot.olusturulmaTarihi || lot.olusturulmaTarihi.getTime() < cutoff.getTime();
}

/** Harcama/iade için geçerli mi: tarihsiz veya vadesi gelmemiş; ya da eski deneme istisnası. */
export function isLotUsable(lot: WalletLotLike, now: Date, cutoff: Date | null): boolean {
  if (!lot.sonKullanmaTarihi || lot.sonKullanmaTarihi.getTime() > now.getTime()) return true;
  return isLegacyTrialLot(lot, cutoff);
}

/**
 * Kilit sırası (yukarıdaki başlık): wallet advisory -> KontorCuzdani FOR UPDATE.
 * `expire` (varsayılan true): kilit ALTINDA vadesi dolmuş PAKET lotları bakiyeyle atomik kapatılır (D2) — çağıran bakiyeyi
 * bu kapanıştan SONRA okur. Uzlaştırma bayrağı yoksa expireDueLots no-op'tur (D3).
 */
export async function lockWallet(tx: Prisma.TransactionClient, userId: string, opts: { expire?: boolean; now?: Date } = {}) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`wallet:${userId}`}))`;
  await tx.$queryRaw`SELECT "id" FROM "KontorCuzdani" WHERE "kullaniciId" = ${userId} FOR UPDATE`;
  if (opts.expire !== false) await expireDueLots(tx, userId, opts.now ?? new Date());
  return tx.kontorCuzdani.findUnique({ where: { kullaniciId: userId } });
}

/** Birden çok cüzdan: kullaniciId'ye göre artan sırada kilitle (deterministik; tersine kilit yok). */
export async function lockWalletsOrdered(tx: Prisma.TransactionClient, userIds: string[]) {
  for (const id of [...new Set(userIds)].sort()) await lockWallet(tx, id);
}

/**
 * Vadesi gelmiş PAKET lotlarının kalanını bakiyeden düşer (cüzdan kilidi ALTINDA çağrılmalı; idempotent: lot 0/pasif olur).
 * No-op: uzlaştırma bayrağı true değilse (D3); eski denemeler (18b) dokunulmaz (D4). Bakiye eksiye düşmez.
 */
export async function expireDueLots(tx: Prisma.TransactionClient, userId: string, now = new Date()) {
  const due = await tx.portfolioCreditLot.findMany({
    where: { kullaniciId: userId, lotTuru: 'PAKET', aktifMi: true, kalanMiktar: { gt: 0 }, sonKullanmaTarihi: { lte: now } },
    orderBy: [{ sonKullanmaTarihi: 'asc' }, { id: 'asc' }],
  });
  if (due.length === 0) return 0;
  if (!(await lotsReconciled(tx))) {
    console.warn(`[wallet-lots] uzlaştırma tamam değil (${LOT_RECONCILED_KEY}); dönem sonu düşümü atlandı.`);
    return 0;
  }
  const cutoff = await newTrialCutoff(tx);
  const wallet = await tx.kontorCuzdani.findUnique({ where: { kullaniciId: userId } });
  let balance = Math.max(0, wallet?.bakiye ?? 0);
  let total = 0;
  for (const lot of due) {
    if (isLegacyTrialLot(lot as WalletLotLike, cutoff)) continue;
    const dec = Math.max(0, Math.min(lot.kalanMiktar, balance));
    await tx.portfolioCreditLot.update({ where: { id: lot.id }, data: { kalanMiktar: 0, aktifMi: false } });
    if (wallet && dec > 0) {
      await tx.kontorCuzdani.update({ where: { id: wallet.id }, data: { bakiye: { decrement: dec } } });
      await tx.kontorHareketi.create({ data: {
        kullaniciId: userId, hareketTuru: 'DUZELTME', islemTuru: 'DIGER', miktar: dec,
        oncekiBakiye: balance, sonrakiBakiye: balance - dec, aciklama: 'Dönem sonu: kullanılmayan paket PK düşüldü',
        ilgiliKayitTuru: 'PAKET_LOT_DONEM_SONU', ilgiliKayitId: lot.id,
      } });
      balance -= dec; total += dec;
    }
  }
  return total;
}

/** Yeni lot (yükleme yolları için). Cüzdan kilidi ALTINDA çağrılmalı. dedupeKey tekrar çağrıyı korur. */
export async function grantLot(tx: Prisma.TransactionClient, input: {
  userId: string; lotTuru: 'DEVIR' | 'HEDIYE' | 'SATIN_ALMA' | 'PAKET' | 'REFERANS' | 'IADE' | 'DUZELTME'; amount: number;
  kaynakKayitTuru: string; kaynakKayitId?: string | null; dedupeKey?: string | null; aciklama?: string; sonKullanmaTarihi?: Date | null;
}) {
  if (!Number.isSafeInteger(input.amount) || input.amount <= 0) return null;
  return tx.portfolioCreditLot.create({ data: {
    kullaniciId: input.userId, lotTuru: input.lotTuru, ilkMiktar: input.amount, kalanMiktar: input.amount,
    sonKullanmaTarihi: input.sonKullanmaTarihi ?? null, kaynakKayitTuru: input.kaynakKayitTuru, kaynakKayitId: input.kaynakKayitId ?? null,
    dedupeKey: input.dedupeKey ?? null, aciklama: input.aciklama, aktifMi: true,
  } });
}

/**
 * Tüketim önceliği (§11 madde 6):
 *  1) süresi olan PAKET/DENEME lotları — bitişi en yakın olan önce
 *  2) süresiz, EK PK olmayan lotlar (DEVIR, HEDIYE, ...) — eskiden yeniye
 *  3) süresiz EK PK lotu (SATIN_ALMA) — en son
 */
export function lotRank(lot: WalletLotLike): [number, number, number] {
  const created = lot.olusturulmaTarihi ? lot.olusturulmaTarihi.getTime() : 0;
  if (lot.sonKullanmaTarihi) return [0, lot.sonKullanmaTarihi.getTime(), created];
  if (lot.lotTuru === 'SATIN_ALMA') return [2, 0, created];
  return [1, 0, created];
}

export function sortLotsForConsumption<T extends WalletLotLike>(lots: T[]): T[] {
  return [...lots].sort((a, b) => {
    const ra = lotRank(a); const rb = lotRank(b);
    return ra[0] - rb[0] || ra[1] - rb[1] || ra[2] - rb[2] || a.id.localeCompare(b.id);
  });
}

/** Saf hesap: amount'u sıralı lotlardan düşer. Lotlarda karşılığı olmayan kısım (eski/izlenmeyen bakiye) `untracked`. */
export function planConsumption<T extends WalletLotLike>(lots: T[], amount: number) {
  let left = amount;
  const steps: Array<{ lot: T; take: number }> = [];
  for (const lot of sortLotsForConsumption(lots)) {
    if (left <= 0) break;
    const take = Math.min(lot.kalanMiktar, left);
    if (take > 0) { steps.push({ lot, take }); left -= take; }
  }
  return { steps, untracked: left };
}

/**
 * Kilit ALTINDA, harcama hareketi OLUŞTURULDUKTAN sonra çağrılır (hareketId → lot-bazlı tahsis kaydı, D5).
 * Geçersiz (vadesi geçmiş, eski deneme değilse) / pasif lotlar tüketilmez.
 */
export async function consumeLots(tx: Prisma.TransactionClient, userId: string, amount: number, opts: { now?: Date; hareketId?: string } = {}) {
  const now = opts.now ?? new Date();
  const all = await tx.portfolioCreditLot.findMany({ where: { kullaniciId: userId, aktifMi: true, kalanMiktar: { gt: 0 } } });
  const needCutoff = all.some((l) => l.sonKullanmaTarihi && l.sonKullanmaTarihi.getTime() <= now.getTime());
  const cutoff = needCutoff ? await newTrialCutoff(tx) : null;
  const lots = all.filter((l) => isLotUsable(l as WalletLotLike, now, cutoff));
  const plan = planConsumption(lots as WalletLotLike[], amount);
  for (const step of plan.steps) {
    await tx.portfolioCreditLot.update({ where: { id: step.lot.id }, data: { kalanMiktar: { decrement: step.take } } });
    if (opts.hareketId) {
      await tx.portfolioCreditLotTuketim.create({ data: { kullaniciId: userId, hareketId: opts.hareketId, lotId: step.lot.id, miktar: step.take } });
    }
  }
  return plan;
}

/**
 * Başarısız işlem iadesi (D5): YALNIZ o hareketin tahsis kayıtlarından geri alır (başka lotun boşluğu doldurulmaz). İdempotent
 * (iadeEdilen artar). Lot pasif/vadesi geçmiş (ve eski deneme değil) ise o pay lota geri YAZILMAZ ve bakiyeye de eklenmez (`lost`):
 * dönem sonunda zaten düşülecek/geri alınmış PK yeniden doğmaz. Tahsis kaydı olmayan eski hareket: bakiye tam döner, lota dokunulmaz (`untracked`).
 * Dönen `credit` = cüzdan bakiyesine eklenecek PK.
 */
export async function restoreLots(tx: Prisma.TransactionClient, userId: string, hareketId: string, amount: number, now = new Date()) {
  const rows = await tx.portfolioCreditLotTuketim.findMany({ where: { hareketId, kullaniciId: userId }, orderBy: { id: 'asc' } });
  if (rows.length === 0) return { credit: amount, restored: 0, lost: 0, untracked: amount };
  const lots = await tx.portfolioCreditLot.findMany({ where: { id: { in: rows.map((r) => r.lotId) } } });
  const byId = new Map(lots.map((l) => [l.id, l]));
  const needCutoff = lots.some((l) => l.sonKullanmaTarihi && l.sonKullanmaTarihi.getTime() <= now.getTime());
  const cutoff = needCutoff ? await newTrialCutoff(tx) : null;
  let restored = 0; let lost = 0;
  for (const r of rows) {
    const open = r.miktar - r.iadeEdilen;
    if (open <= 0) continue;
    const lot = byId.get(r.lotId);
    const ok = !!lot && lot.aktifMi && isLotUsable(lot as WalletLotLike, now, cutoff);
    if (ok) {
      await tx.portfolioCreditLot.update({ where: { id: r.lotId }, data: { kalanMiktar: { increment: open } } });
      restored += open;
    } else lost += open;
    await tx.portfolioCreditLotTuketim.update({ where: { id: r.id }, data: { iadeEdilen: { increment: open } } });
  }
  const untracked = Math.max(0, amount - rows.reduce((s, r) => s + r.miktar, 0));
  return { credit: restored + untracked, restored, lost, untracked };
}

/** Saf yardımcı (test/rapor): bakiye < Σ lot kalanı ise farkı tüketim sırasıyla lotlardan düşme planı. */
export function planReconciliation<T extends WalletLotLike>(lots: T[], balance: number) {
  const sum = lots.reduce((s, l) => s + l.kalanMiktar, 0);
  const excess = Math.max(0, sum - Math.max(0, balance));
  return planConsumption(lots, excess);
}
