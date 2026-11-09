import { HttpException, Injectable } from '@nestjs/common';
import { KontorHareketTuru, KontorIslemTuru, PaymentChannel, Prisma } from '@prisma/client';
import { lockPaymentUser, lockWallet } from '../kontor/wallet-lots';
import { PrismaService } from '../prisma/prisma.service';
import {
  AddonConfig, ComputeInput, EligibilityCode, EntitlementConfigError, FreeLimits, OfficeEntitlements, OfficePackageRow, PurchaseKind, TrialConfig,
  addonLive, checkPurchaseEligibility, computeEntitlements, parseAddonConfig, parseFreeLimits, parsePackageCatalog, parseTrialConfig, subscriptionLive,
} from './office-entitlement.rules';

/**
 * EPH-70B2 — Ofis hak servisi (tek çözümleyici + hak yazıcıları). Plan: EPH-70A2 v2, EPH_ODEME_SISTEMI.md §11-§13.
 *
 * KİLİT SIRASI (wallet-lots.ts başlığıyla aynı): payment-user:{ownerUserId} -> office (advisory `office:{id}` + Office satırı FOR NO KEY UPDATE)
 * -> wallet (lockWallet) -> lot. Cüzdan kilidinden SONRA başka kilit alınmaz. Her yazıcı çağıranın transaction'ını (tx) kullanır.
 * Ticari değer yok (§0-B): hepsi kurallar dosyasındaki ayar çözümleyicilerinden gelir; ayar bozuksa EntitlementConfigError ile hak VERİLMEZ.
 */

export const OFFICE_ENTITLEMENT_SOURCE_KEY = 'OFFICE_ENTITLEMENT_SOURCE';
/** Çözümleyicinin ihtiyacı olan en küçük yüzey (okuyucuların dar tipleri de geçer). */
export type EntitlementDb = Pick<Prisma.TransactionClient, 'systemSetting' | 'ofisAbonelik' | 'ofisEklenti' | 'ofisDenemeKaydi'>;
type Db = PrismaService | Prisma.TransactionClient;
type Tx = Prisma.TransactionClient;

const STATUS: Record<string, number> = { OFFICE_AGENT_PURCHASE_FORBIDDEN: 403, MEMBERSHIP_ACTIVE_OTHER_CHANNEL: 409, ADDON_TIER_ALREADY_ACTIVE: 409, CHANNEL_UNKNOWN_REVIEW: 409 };
export class OfficeEntitlementError extends HttpException {
  constructor(readonly code: EligibilityCode | string, message: string) { super({ statusCode: STATUS[code] ?? 400, code, message }, STATUS[code] ?? 400); }
}

export interface OfficeSettings { catalog: Map<string, OfficePackageRow>; addon: AddonConfig; trial: TrialConfig; free: FreeLimits }
const SETTING_KEYS = ['OFFICE_MEMBERSHIP_PACKAGES', 'OFFICE_ADDON_CONFIG', 'OFFICE_TRIAL_CONFIG', 'OFFICE_FREE_LIMITS'];

export async function loadOfficeSettings(db: Pick<Prisma.TransactionClient, 'systemSetting'>): Promise<OfficeSettings> {
  const rows = await db.systemSetting.findMany({ where: { key: { in: SETTING_KEYS } }, select: { key: true, valueJson: true } });
  const by = new Map(rows.map((r) => [r.key, r.valueJson]));
  for (const k of SETTING_KEYS) if (!by.has(k)) throw new EntitlementConfigError(k, 'ayar bulunamadı.');
  return { catalog: parsePackageCatalog(by.get('OFFICE_MEMBERSHIP_PACKAGES')), addon: parseAddonConfig(by.get('OFFICE_ADDON_CONFIG')), trial: parseTrialConfig(by.get('OFFICE_TRIAL_CONFIG')), free: parseFreeLimits(by.get('OFFICE_FREE_LIMITS')) };
}

/** Yayın kapısı (F10): 'legacy' (varsayılan) | 'relational'. Okuyucular yalnız 'relational' iken yeni çözümleyiciyi kullanır. */
export async function entitlementSource(db: Pick<Prisma.TransactionClient, 'systemSetting'>): Promise<'legacy' | 'relational'> {
  const row = await db.systemSetting.findUnique({ where: { key: OFFICE_ENTITLEMENT_SOURCE_KEY }, select: { valueJson: true } });
  return row?.valueJson === 'relational' ? 'relational' : 'legacy';
}

/** TEK ÇÖZÜMLEYİCİ: ofisin etkin hakkı (süreye göre Ücretsiz / Deneme / Ücretli). Okuyucular bunu çağırır. */
export async function resolveOfficeEntitlements(db: EntitlementDb, officeId: string, at: Date = new Date(), settings?: OfficeSettings): Promise<OfficeEntitlements> {
  const s = settings ?? await loadOfficeSettings(db);
  const [sub, addons, trialRecord] = await Promise.all([
    db.ofisAbonelik.findFirst({ where: { officeId, durum: { in: ['AKTIF', 'GRACE'] } }, orderBy: { bitisTarihi: 'desc' } }),
    db.ofisEklenti.findMany({ where: { officeId, durum: { in: ['AKTIF', 'GRACE'] } } }),
    db.ofisDenemeKaydi.findUnique({ where: { officeId } }),
  ]);
  const input: ComputeInput = {
    officeId, at, ...s,
    subscription: sub ? { paketKodu: sub.paketKodu, durum: sub.durum, sureTuru: sub.sureTuru, baslangicTarihi: sub.baslangicTarihi, bitisTarihi: sub.bitisTarihi, hakSnapshot: sub.hakSnapshot, snapshotBitis: sub.snapshotBitis, kaynakKanal: sub.kaynakKanal } : null,
    addons: addons.map((a) => ({ tur: a.tur, adet: a.adet, durum: a.durum, bitisTarihi: a.bitisTarihi })),
    trialRecord: trialRecord ? { baslangicTarihi: trialRecord.baslangicTarihi, bitisTarihi: trialRecord.bitisTarihi, sonlandiTarihi: trialRecord.sonlandiTarihi } : null,
  };
  return computeEntitlements(input);
}

export interface GrantBase {
  officeId: string; hakSahibiUserId: string; kanal: PaymentChannel; kaynakAbonelikAnahtari: string | null;
  donemBaslangic: Date; donemBitis: Date; tutar: number; paymentOrderId?: string | null; paymentSettlementId?: string | null; storeSubscriptionId?: string | null;
  magazaUrunKimligi?: string | null; otomatikYenileme?: boolean | null; ayarSurumu?: string | null;
  /** Sipariş oluşturulurken donmuş hak değerleri (F16): ayar sonradan değişse de verilen hak budur. */
  hakSnapshot?: { monthlyPk?: number; ekKullaniciPk?: number } | null;
  /** ADMIN kanalı: ödeme yok; ücretsiz idari tanım (18g). Gerekçe zorunlu, audit yazılır. */
  admin?: { actorUserId: string; gerekce: string } | null;
  at?: Date;
}
export interface GrantPackageInput extends GrantBase { paketKodu: string }
export interface GrantAddonInput extends GrantBase { tur: 'EK_KULLANICI' | 'OFIS_BOY'; adet: number }
export interface GrantResult { abonelikId: string | null; eklentiId?: string; hakDonemiId: string | null; lotId: string | null; grantedPk: number; renewed: boolean; stale: boolean; alreadyGranted: boolean }

const iso = (d: Date) => d.toISOString();
const MIGRATION_SAFE_CHANNELS = ['ADMIN', 'DENEME'];

@Injectable()
export class OfficeEntitlementService {
  constructor(private readonly prisma: PrismaService) {}

  resolveOfficeEntitlements(officeId: string, at: Date = new Date(), db: Db = this.prisma) { return resolveOfficeEntitlements(db, officeId, at); }

  // ───────────────────────── kilit + yardımcılar ─────────────────────────

  private async lockOffice(tx: Tx, officeId: string, ownerUserId: string) {
    await lockPaymentUser(tx, ownerUserId); // 1) payment-user
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`office:${officeId}`}))`; // 2) office
    await tx.$queryRaw`SELECT "id" FROM "Office" WHERE "id" = ${officeId} FOR NO KEY UPDATE`;
  }

  private async loadOffice(tx: Tx, officeId: string, actorUserId: string) {
    const office = await tx.office.findUnique({ where: { id: officeId }, select: { id: true, isActive: true, ownerUserId: true, name: true } });
    if (!office || !office.isActive) throw new OfficeEntitlementError('OFFICE_NOT_FOUND', 'Aktif ofis bulunamadı.');
    if (!office.ownerUserId || office.ownerUserId !== actorUserId) throw new OfficeEntitlementError('OFFICE_AGENT_PURCHASE_FORBIDDEN', 'Ofis paketini yalnız ofis sahibi satın alabilir.');
    return office as typeof office & { ownerUserId: string };
  }

  /** 3) wallet kilidi altında ofis sahibinin cüzdanına SÜRELİ PAKET lotu yükler (70B1F kuralları). */
  private async creditPk(tx: Tx, ownerUserId: string, amount: number, o: { orderId?: string | null; kaynakKayitTuru: string; kaynakKayitId: string; dedupeKey: string; aciklama: string; sonKullanma: Date; hediye?: boolean }) {
    if (!Number.isSafeInteger(amount) || amount <= 0) return null;
    await tx.kontorCuzdani.upsert({ where: { kullaniciId: ownerUserId }, update: {}, create: { kullaniciId: ownerUserId } });
    const wallet = await lockWallet(tx, ownerUserId);
    if (!wallet) throw new OfficeEntitlementError('WALLET_MISSING', 'PK cüzdanı bulunamadı.');
    if (!wallet.aktifMi) throw new OfficeEntitlementError('WALLET_INACTIVE', 'PK cüzdanı kapalı; ödeme destek incelemesi gerektiriyor.');
    const lot = await tx.portfolioCreditLot.create({ data: {
      kullaniciId: ownerUserId, lotTuru: 'PAKET', ilkMiktar: amount, kalanMiktar: amount, sonKullanmaTarihi: o.sonKullanma, kaynakKayitTuru: o.kaynakKayitTuru, kaynakKayitId: o.kaynakKayitId,
      paymentOrderId: o.orderId ?? null, dedupeKey: o.dedupeKey, aciklama: o.aciklama, aktifMi: true } });
    const updated = await tx.kontorCuzdani.update({ where: { id: wallet.id }, data: { bakiye: { increment: amount }, toplamYukleme: { increment: amount }, ...(o.hediye ? { toplamHediye: { increment: amount } } : {}) } });
    await tx.kontorHareketi.create({ data: { kullaniciId: ownerUserId, hareketTuru: KontorHareketTuru.YUKLEME, islemTuru: KontorIslemTuru.DIGER, miktar: amount, oncekiBakiye: wallet.bakiye, sonrakiBakiye: updated.bakiye,
      aciklama: o.aciklama, ilgiliKayitTuru: o.orderId ? 'PAYMENT_ORDER' : o.kaynakKayitTuru, ilgiliKayitId: o.orderId ?? o.kaynakKayitId, olusturanId: null } });
    return Object.assign(lot, { balanceAfter: updated.bakiye });
  }

  /** Bir dönemin KALAN lotunu geri alır (iade / kademe değişimi). Harcanmış kısım bakiyeyi eksiye indirmez (karar 5); fark audit'e yazılır. */
  private async reclaimPeriodLot(tx: Tx, ownerUserId: string, lotId: string, neden: string, ctx: { orderId?: string | null; officeId: string }) {
    const wallet = await lockWallet(tx, ownerUserId);
    const lot = await tx.portfolioCreditLot.findUnique({ where: { id: lotId } });
    if (!lot) return { granted: 0, reclaimed: 0 };
    let balance = wallet?.bakiye ?? 0;
    const dec = wallet ? Math.max(0, Math.min(lot.kalanMiktar, balance)) : 0;
    await tx.portfolioCreditLot.update({ where: { id: lot.id }, data: { kalanMiktar: 0, aktifMi: false } });
    if (wallet && dec > 0) {
      await tx.kontorCuzdani.update({ where: { id: wallet.id }, data: { bakiye: { decrement: dec } } });
      await tx.kontorHareketi.create({ data: { kullaniciId: ownerUserId, hareketTuru: KontorHareketTuru.DUZELTME, islemTuru: KontorIslemTuru.DIGER, miktar: dec, oncekiBakiye: balance, sonrakiBakiye: balance - dec,
        aciklama: `Ofis paketi: ${neden} - dönem PK'sı geri alındı`, ilgiliKayitTuru: 'OFIS_HAK_DONEMI', ilgiliKayitId: lot.id } });
      balance -= dec;
    }
    const spent = lot.ilkMiktar - lot.kalanMiktar; // harcanmış kısım geri alınamaz
    if (spent > 0 || dec < lot.kalanMiktar) {
      await tx.auditLog.create({ data: { targetUserId: ownerUserId, action: 'UPDATE_SYSTEM_SETTING', entityType: 'Office', entityId: ctx.officeId,
        description: `Ofis paketi ${neden}: harcanmış PK geri alınamadı (bakiye sıfırın altına düşürülmedi)`,
        metadata: { key: 'STORE_REFUND_SHORTFALL', officeId: ctx.officeId, orderId: ctx.orderId ?? null, lotId, granted: lot.ilkMiktar, reclaimed: dec, shortfall: lot.ilkMiktar - dec } } });
    }
    return { granted: lot.ilkMiktar, reclaimed: dec };
  }

  // ───────────────────────── uygunluk (F10/F11) ─────────────────────────

  /** Tek uygunluk denetimi: sipariş oluşturmada VE settlement içinde, tüm kanallarda. Reddi `check` ile okur, `assert` ile fırlatır. */
  async checkPurchaseEligibility(db: Db, i: { officeId: string; actorUserId: string; kind: PurchaseKind; packageCode?: string; adet?: number; channel: PaymentChannel; sourceKey: string | null; amount: number; at?: Date; adminGrant?: boolean }) {
    const at = i.at ?? new Date();
    const [office, settings, sub, addons] = await Promise.all([
      db.office.findUnique({ where: { id: i.officeId }, select: { isActive: true, ownerUserId: true } }),
      loadOfficeSettings(db),
      db.ofisAbonelik.findFirst({ where: { officeId: i.officeId, durum: { in: ['AKTIF', 'GRACE'] } }, orderBy: { bitisTarihi: 'desc' } }),
      db.ofisEklenti.findMany({ where: { officeId: i.officeId, durum: { in: ['AKTIF', 'GRACE'] } } }),
    ]);
    return checkPurchaseEligibility({
      office, actorUserId: i.actorUserId, kind: i.kind, packageCode: i.packageCode, adet: i.adet, channel: i.channel, sourceKey: i.sourceKey, amount: i.adminGrant ? 1 : i.amount,
      catalog: settings.catalog, addon: settings.addon, at,
      currentSub: sub ? { paketKodu: sub.paketKodu, durum: sub.durum, sureTuru: sub.sureTuru, baslangicTarihi: sub.baslangicTarihi, bitisTarihi: sub.bitisTarihi, kaynakKanal: sub.kaynakKanal, kaynakAbonelikAnahtari: sub.kaynakAbonelikAnahtari } : null,
      currentAddons: addons.map((a) => ({ tur: a.tur, adet: a.adet, durum: a.durum, bitisTarihi: a.bitisTarihi, kaynakKanal: a.kaynakKanal, kaynakAbonelikAnahtari: a.kaynakAbonelikAnahtari })),
    });
  }
  async assertPurchaseEligibility(db: Db, i: Parameters<OfficeEntitlementService['checkPurchaseEligibility']>[1]) {
    const r = await this.checkPurchaseEligibility(db, i);
    if (!r.ok) { const f = r as { code: string; message: string }; throw new OfficeEntitlementError(f.code, f.message); }
  }

  private periodGuard(b: GrantBase, now: Date) {
    if (!Number.isFinite(b.donemBaslangic.getTime()) || !Number.isFinite(b.donemBitis.getTime()) || b.donemBitis.getTime() <= b.donemBaslangic.getTime()) throw new OfficeEntitlementError('PERIOD_INVALID', 'Abonelik dönemi geçersiz.');
    if (b.kanal !== 'ADMIN' && (!Number.isFinite(b.tutar) || b.tutar <= 0)) throw new OfficeEntitlementError('AMOUNT_INVALID', 'Tutarı 0 olan işlem hak vermez.');
    if (b.kanal === 'ADMIN' && (!b.admin || !b.admin.gerekce?.trim())) throw new OfficeEntitlementError('ADMIN_REASON_REQUIRED', 'Ücretsiz idari paket tanımı için gerekçe zorunludur.');
    return b.donemBitis.getTime() > now.getTime(); // K4: süresi geçmiş dönem hak/PK yazmaz
  }

  // ───────────────────────── grantPackage / renew ─────────────────────────

  async grantPackage(tx: Tx, input: GrantPackageInput): Promise<GrantResult> {
    const now = input.at ?? new Date();
    const periodLive = this.periodGuard(input, now);
    await this.lockOffice(tx, input.officeId, input.hakSahibiUserId);
    const office = await this.loadOffice(tx, input.officeId, input.hakSahibiUserId);
    const settings = await loadOfficeSettings(tx);
    await this.assertPurchaseEligibility(tx, { officeId: input.officeId, actorUserId: input.hakSahibiUserId, kind: 'PAKET', packageCode: input.paketKodu, channel: input.kanal, sourceKey: input.kaynakAbonelikAnahtari, amount: input.tutar, at: now, adminGrant: input.kanal === 'ADMIN' });
    const row = settings.catalog.get(input.paketKodu.toUpperCase()) as OfficePackageRow;

    const key = input.kaynakAbonelikAnahtari;
    const active = await tx.ofisAbonelik.findFirst({ where: { officeId: input.officeId, durum: { in: ['AKTIF', 'GRACE'] } } });
    const sameChain = !!active && active.kaynakKanal === input.kanal && !!key && active.kaynakAbonelikAnahtari === key;
    // dönem sadece ileri: eski bildirim daha yeni bitişi geriye çekmez
    if (sameChain && active.bitisTarihi && active.bitisTarihi.getTime() > input.donemBitis.getTime() + 60000) {
      return { abonelikId: active.id, hakDonemiId: null, lotId: null, grantedPk: 0, renewed: false, stale: true, alreadyGranted: false };
    }
    let abonelikId: string; let renewed = false;
    const snapshotOf = (r: OfficePackageRow | undefined) => r ? { users: r.totalUsers, portfolio: r.portfolio, monthlyPk: r.monthlyPk, ofisBoy: r.ofisBoyDahil, crm: r.crm, name: r.name } : null;
    if (active && sameChain) {
      renewed = true; abonelikId = active.id;
      // 18a: düşüşte (yeni < eski) eski haklar mevcut dönem sonuna kadar korunur; yükselişte hemen yeni değer
      const old = settings.catalog.get(active.paketKodu.toUpperCase());
      const lower = !!old && active.paketKodu !== row.code && (old.totalUsers > row.totalUsers || old.portfolio > row.portfolio || old.monthlyPk > row.monthlyPk);
      const holdUntil = active.bitisTarihi && active.bitisTarihi.getTime() > now.getTime() ? active.bitisTarihi : null;
      await tx.ofisAbonelik.update({ where: { id: active.id }, data: {
        paketKodu: row.code, durum: 'AKTIF', sureTuru: 'DONEMLI', bitisTarihi: active.bitisTarihi && active.bitisTarihi.getTime() > input.donemBitis.getTime() ? active.bitisTarihi : input.donemBitis,
        otomatikYenileme: input.otomatikYenileme ?? active.otomatikYenileme, paymentOrderId: input.paymentOrderId ?? active.paymentOrderId, storeSubscriptionId: input.storeSubscriptionId ?? active.storeSubscriptionId,
        ...(lower && holdUntil ? { hakSnapshot: snapshotOf(old) as Prisma.InputJsonObject, snapshotBitis: holdUntil } : { hakSnapshot: Prisma.DbNull, snapshotBitis: null }), ayarSurumu: input.ayarSurumu ?? active.ayarSurumu } });
    } else {
      if (active) { // başka zincir (ADMIN/DENEME/süresi dolmuş mağaza): yerine konur, eklentiler temel pakete bağlı olduğu için kapanır
        await tx.ofisAbonelik.update({ where: { id: active.id }, data: { durum: 'IPTAL', metadata: { ...(active.metadata && typeof active.metadata === 'object' ? (active.metadata as object) : {}), degistirenKanal: input.kanal, degistirmeTarihi: iso(now) } } });
        await tx.ofisEklenti.updateMany({ where: { ofisAboneligiId: active.id, durum: { in: ['AKTIF', 'GRACE'] } }, data: { durum: 'IPTAL' } });
      }
      const created = await tx.ofisAbonelik.create({ data: {
        officeId: input.officeId, paketKodu: row.code, durum: 'AKTIF', sureTuru: 'DONEMLI', baslangicTarihi: input.donemBaslangic, bitisTarihi: input.donemBitis, kaynakKanal: input.kanal,
        kaynakAbonelikAnahtari: key, storeSubscriptionId: input.storeSubscriptionId ?? null, paymentOrderId: input.paymentOrderId ?? null, otomatikYenileme: input.otomatikYenileme ?? null, ayarSurumu: input.ayarSurumu ?? null,
        metadata: input.admin ? { admin: input.admin.actorUserId, gerekce: input.admin.gerekce } : undefined } });
      abonelikId = created.id;
    }

    // Dönem başına tek hak yazımı (F09): aynı kaynak+dönem+hak türü iki kez PK veremez
    const existingPeriod = await tx.ofisHakDonemi.findUnique({ where: { kaynakTur_kaynakId_hakTuru_donemBaslangic: { kaynakTur: 'ABONELIK', kaynakId: abonelikId, hakTuru: 'PAKET_PK', donemBaslangic: input.donemBaslangic } } });
    let lotId: string | null = null; let granted = 0; let hakDonemiId = existingPeriod?.id ?? null;
    if (!existingPeriod) {
      const pk = Number.isSafeInteger(input.hakSnapshot?.monthlyPk) ? (input.hakSnapshot!.monthlyPk as number) : row.monthlyPk;
      if (periodLive && pk > 0) {
        const lot = await this.creditPk(tx, office.ownerUserId, pk, { orderId: input.paymentOrderId, kaynakKayitTuru: 'OFFICE_PACKAGE', kaynakKayitId: abonelikId, dedupeKey: `ofis:${abonelikId}:${iso(input.donemBaslangic)}:PAKET_PK`,
          aciklama: `${row.name} ofis paketi aylık PK`, sonKullanma: input.donemBitis });
        lotId = lot?.id ?? null; granted = pk;
      }
      const hd = await tx.ofisHakDonemi.create({ data: { officeId: input.officeId, kaynakTur: 'ABONELIK', kaynakId: abonelikId, hakTuru: 'PAKET_PK', donemBaslangic: input.donemBaslangic, donemBitis: input.donemBitis,
        verilenPk: granted, portfolioCreditLotId: lotId, paymentSettlementId: input.paymentSettlementId ?? null } });
      hakDonemiId = hd.id;
    }
    if (input.admin) await tx.auditLog.create({ data: { targetUserId: office.ownerUserId, action: 'UPDATE_SYSTEM_SETTING', entityType: 'Office', entityId: input.officeId, description: `ADMIN ofis paketi tanımı: ${row.code}`,
      metadata: { key: 'OFFICE_PACKAGE_ADMIN_GRANT', admin: input.admin.actorUserId, gerekce: input.admin.gerekce, paketKodu: row.code, donemBitis: iso(input.donemBitis) } } });
    await this.syncLegacySnapshot(tx, input.officeId, now, settings);
    return { abonelikId, hakDonemiId, lotId, grantedPk: granted, renewed, stale: false, alreadyGranted: !!existingPeriod };
  }

  /** Yenileme: kaynak zincirindeki mevcut aboneliğe yeni dönem (yalnız ileri). Zincir yoksa hata. */
  async renew(tx: Tx, input: Omit<GrantPackageInput, 'paketKodu'> & { paketKodu?: string }): Promise<GrantResult> {
    const existing = await tx.ofisAbonelik.findFirst({ where: { officeId: input.officeId, kaynakKanal: input.kanal, kaynakAbonelikAnahtari: input.kaynakAbonelikAnahtari }, orderBy: { bitisTarihi: 'desc' } });
    if (!existing) throw new OfficeEntitlementError('SUBSCRIPTION_NOT_FOUND', 'Yenilenecek ofis aboneliği bulunamadı.');
    return this.grantPackage(tx, { ...input, paketKodu: input.paketKodu ?? existing.paketKodu });
  }

  // ───────────────────────── grantAddon ─────────────────────────

  async grantAddon(tx: Tx, input: GrantAddonInput): Promise<GrantResult> {
    const now = input.at ?? new Date();
    if (!input.kaynakAbonelikAnahtari) throw new OfficeEntitlementError('SOURCE_KEY_REQUIRED', 'Eklenti için kaynak abonelik kimliği zorunludur.');
    if (input.kanal === 'ADMIN') throw new OfficeEntitlementError('CHANNEL_NOT_SUPPORTED', 'Eklenti ücretsiz tanımlanamaz.');
    const periodLive = this.periodGuard(input, now);
    await this.lockOffice(tx, input.officeId, input.hakSahibiUserId);
    const office = await this.loadOffice(tx, input.officeId, input.hakSahibiUserId);
    const settings = await loadOfficeSettings(tx);
    await this.assertPurchaseEligibility(tx, { officeId: input.officeId, actorUserId: input.hakSahibiUserId, kind: input.tur, adet: input.adet, channel: input.kanal, sourceKey: input.kaynakAbonelikAnahtari, amount: input.tutar, at: now });
    const base = await tx.ofisAbonelik.findFirst({ where: { officeId: input.officeId, durum: { in: ['AKTIF', 'GRACE'] } } });
    if (!base) throw new OfficeEntitlementError('ADDON_REQUIRES_OFFICE_PACKAGE', 'Eklenti için aktif ofis paketi gerekir.');
    const adet = input.tur === 'OFIS_BOY' ? 1 : input.adet; // Ofis Boy: abonelik adedi 1 (koltuk sayısı ayardan)

    const existing = await tx.ofisEklenti.findUnique({ where: { kaynakKanal_kaynakAbonelikAnahtari: { kaynakKanal: input.kanal, kaynakAbonelikAnahtari: input.kaynakAbonelikAnahtari } } });
    if (existing && existing.officeId !== input.officeId) throw new OfficeEntitlementError('STORE_ACCOUNT_MISMATCH', 'Bu abonelik başka bir ofise ait.');
    if (existing && existing.bitisTarihi.getTime() > input.donemBitis.getTime() + 60000) {
      return { abonelikId: base.id, eklentiId: existing.id, hakDonemiId: null, lotId: null, grantedPk: 0, renewed: false, stale: true, alreadyGranted: false };
    }
    let eklentiId: string; const tierChanged = !!existing && existing.adet !== adet;
    if (existing) {
      eklentiId = existing.id;
      await tx.ofisEklenti.update({ where: { id: existing.id }, data: { adet, durum: 'AKTIF', ofisAboneligiId: base.id, bitisTarihi: input.donemBitis, paymentOrderId: input.paymentOrderId ?? existing.paymentOrderId,
        storeSubscriptionId: input.storeSubscriptionId ?? existing.storeSubscriptionId, magazaUrunKimligi: input.magazaUrunKimligi ?? existing.magazaUrunKimligi } });
    } else {
      const created = await tx.ofisEklenti.create({ data: { officeId: input.officeId, ofisAboneligiId: base.id, tur: input.tur, adet, durum: 'AKTIF', kaynakKanal: input.kanal, kaynakAbonelikAnahtari: input.kaynakAbonelikAnahtari,
        storeSubscriptionId: input.storeSubscriptionId ?? null, paymentOrderId: input.paymentOrderId ?? null, magazaUrunKimligi: input.magazaUrunKimligi ?? null, baslangicTarihi: input.donemBaslangic, bitisTarihi: input.donemBitis } });
      eklentiId = created.id;
    }

    let lotId: string | null = null; let granted = 0; let hakDonemiId: string | null = null; let already = false;
    if (input.tur === 'EK_KULLANICI') {
      const dup = await tx.ofisHakDonemi.findUnique({ where: { kaynakTur_kaynakId_hakTuru_donemBaslangic: { kaynakTur: 'EKLENTI', kaynakId: eklentiId, hakTuru: 'EK_KULLANICI_PK', donemBaslangic: input.donemBaslangic } } });
      already = !!dup; hakDonemiId = dup?.id ?? null;
      if (!dup) {
        if (tierChanged) { // kademe değişimi YERİNE koyar: önceki kademenin dönem PK'sının kalanı geri alınır (toplamaz)
          const prev = await tx.ofisHakDonemi.findMany({ where: { kaynakTur: 'EKLENTI', kaynakId: eklentiId, hakTuru: 'EK_KULLANICI_PK', iptalTarihi: null, portfolioCreditLotId: { not: null } } });
          for (const p of prev) { await this.reclaimPeriodLot(tx, office.ownerUserId, p.portfolioCreditLotId as string, 'ek kullanıcı kademe değişimi', { orderId: input.paymentOrderId, officeId: input.officeId }); await tx.ofisHakDonemi.update({ where: { id: p.id }, data: { iptalTarihi: now } }); }
        }
        const pk = Number.isSafeInteger(input.hakSnapshot?.ekKullaniciPk) ? (input.hakSnapshot!.ekKullaniciPk as number) : adet * settings.addon.ekKullanici.kisiBasiPk;
        if (periodLive && pk > 0) {
          const lot = await this.creditPk(tx, office.ownerUserId, pk, { orderId: input.paymentOrderId, kaynakKayitTuru: 'OFFICE_ADDON_USERS', kaynakKayitId: eklentiId, dedupeKey: `ofis:${eklentiId}:${iso(input.donemBaslangic)}:EK_KULLANICI_PK`,
            aciklama: `Ek kullanıcı (+${adet}) aylık PK`, sonKullanma: input.donemBitis });
          lotId = lot?.id ?? null; granted = pk;
        }
        const hd = await tx.ofisHakDonemi.create({ data: { officeId: input.officeId, kaynakTur: 'EKLENTI', kaynakId: eklentiId, hakTuru: 'EK_KULLANICI_PK', donemBaslangic: input.donemBaslangic, donemBitis: input.donemBitis,
          verilenPk: granted, portfolioCreditLotId: lotId, paymentSettlementId: input.paymentSettlementId ?? null } });
        hakDonemiId = hd.id;
      }
    }
    await this.syncLegacySnapshot(tx, input.officeId, now, settings);
    return { abonelikId: base.id, eklentiId, hakDonemiId, lotId, grantedPk: granted, renewed: !!existing, stale: false, alreadyGranted: already };
  }

  // ───────────────────────── expire ─────────────────────────

  /**
   * Sona erdirme. SURESI_DOLDU/IPTAL: durum kapanır, eklentiler temel paketi izler; PK lotları dönem sonu işlemiyle (expireDueLots) düşer.
   * IADE: ilgili dönem anahtarının KALAN lotu geri alınır (harcanmış kısım STORE_REFUND_SHORTFALL denetim kaydı, bakiye eksiye inmez).
   */
  async expire(tx: Tx, input: { officeId?: string; kanal: PaymentChannel; kaynakAbonelikAnahtari: string; neden: 'SURESI_DOLDU' | 'IPTAL' | 'IADE'; donemBaslangic?: Date | null; donemBitis?: Date | null;
    reclaimLots?: boolean; paymentOrderId?: string | null; at?: Date }) {
    const now = input.at ?? new Date();
    const sub = await tx.ofisAbonelik.findFirst({ where: { kaynakKanal: input.kanal, kaynakAbonelikAnahtari: input.kaynakAbonelikAnahtari, ...(input.officeId ? { officeId: input.officeId } : {}) } });
    const addon = sub ? null : await tx.ofisEklenti.findUnique({ where: { kaynakKanal_kaynakAbonelikAnahtari: { kaynakKanal: input.kanal, kaynakAbonelikAnahtari: input.kaynakAbonelikAnahtari } } });
    const officeId = sub?.officeId ?? addon?.officeId ?? null;
    if (!officeId || (input.officeId && input.officeId !== officeId)) return { changed: false, statusChanged: false, reclaimed: 0 };
    const office = await tx.office.findUnique({ where: { id: officeId }, select: { ownerUserId: true } });
    if (!office?.ownerUserId) return { changed: false, statusChanged: false, reclaimed: 0 };
    await this.lockOffice(tx, officeId, office.ownerUserId);
    const durum = input.neden === 'SURESI_DOLDU' ? 'SURESI_DOLDU' : 'IPTAL';
    let statusChanged = false; let reclaimed = 0;
    // İade edilen dönem, kaynağın EN SON dönemi değilse durum kapanmaz (yalnız o dönemin hakkı iptal edilir)
    const latest = (end: Date | null | undefined) => !input.donemBitis || !end || input.donemBitis.getTime() >= end.getTime() - 60000;
    const periods: Array<{ id: string; portfolioCreditLotId: string | null }> = [];
    const periodWhere = { iptalTarihi: null, ...(input.donemBaslangic ? { donemBaslangic: input.donemBaslangic } : {}) };
    if (sub) {
      if (latest(sub.bitisTarihi) && sub.durum !== 'IPTAL' && sub.durum !== 'SURESI_DOLDU') {
        await tx.ofisAbonelik.update({ where: { id: sub.id }, data: { durum, otomatikYenileme: false } });
        await tx.ofisEklenti.updateMany({ where: { ofisAboneligiId: sub.id, durum: { in: ['AKTIF', 'GRACE'] } }, data: { durum } });
        statusChanged = true;
      }
      if (input.neden === 'IADE') periods.push(...await tx.ofisHakDonemi.findMany({ where: { kaynakTur: 'ABONELIK', kaynakId: sub.id, ...periodWhere } }));
    } else if (addon) {
      if (latest(addon.bitisTarihi) && addon.durum !== 'IPTAL' && addon.durum !== 'SURESI_DOLDU') { await tx.ofisEklenti.update({ where: { id: addon.id }, data: { durum } }); statusChanged = true; }
      if (input.neden === 'IADE') periods.push(...await tx.ofisHakDonemi.findMany({ where: { kaynakTur: 'EKLENTI', kaynakId: addon.id, ...periodWhere } }));
    }
    for (const p of periods) {
      if (input.reclaimLots !== false && p.portfolioCreditLotId) reclaimed += (await this.reclaimPeriodLot(tx, office.ownerUserId, p.portfolioCreditLotId, 'iade', { orderId: input.paymentOrderId, officeId })).reclaimed;
      await tx.ofisHakDonemi.update({ where: { id: p.id }, data: { iptalTarihi: now } });
    }
    if (statusChanged || periods.length) await this.syncLegacySnapshot(tx, officeId, now);
    return { changed: statusChanged || periods.length > 0, statusChanged, reclaimed };
  }

  /** Mağaza bildirimi (yenileme kapama / grace): abonelik veya eklenti satırını kaynak anahtarıyla günceller (hak değişmez, yalnız durum/bitiş). */
  async touchSource(tx: Tx, input: { kanal: PaymentChannel; kaynakAbonelikAnahtari: string; otomatikYenileme?: boolean; durum?: 'AKTIF' | 'GRACE'; graceBitis?: Date | null }) {
    const sub = await tx.ofisAbonelik.findFirst({ where: { kaynakKanal: input.kanal, kaynakAbonelikAnahtari: input.kaynakAbonelikAnahtari } });
    const addon = sub ? null : await tx.ofisEklenti.findUnique({ where: { kaynakKanal_kaynakAbonelikAnahtari: { kaynakKanal: input.kanal, kaynakAbonelikAnahtari: input.kaynakAbonelikAnahtari } } });
    if (!sub && !addon) return false;
    const grace = input.durum === 'GRACE' && input.graceBitis ? { durum: 'GRACE' as const, bitisTarihi: input.graceBitis } : {};
    if (sub) {
      if (sub.durum === 'IPTAL' || sub.durum === 'SURESI_DOLDU') return false;
      await tx.ofisAbonelik.update({ where: { id: sub.id }, data: { ...(input.otomatikYenileme === undefined ? {} : { otomatikYenileme: input.otomatikYenileme }), ...(grace.durum && sub.bitisTarihi && sub.bitisTarihi < (input.graceBitis as Date) ? grace : {}) } });
      await this.syncLegacySnapshot(tx, sub.officeId, new Date());
    } else if (addon) {
      if (addon.durum === 'IPTAL' || addon.durum === 'SURESI_DOLDU') return false;
      if (grace.durum && addon.bitisTarihi < (input.graceBitis as Date)) await tx.ofisEklenti.update({ where: { id: addon.id }, data: grace });
    }
    return true;
  }

  // ───────────────────────── Deneme (kartsız, ofis + telefon tekil) ─────────────────────────

  async grantTrial(tx: Tx, input: { officeId: string; ownerUserId: string; telefonHash: string; actorUserId: string; at?: Date }) {
    const now = input.at ?? new Date();
    await this.lockOffice(tx, input.officeId, input.ownerUserId);
    await this.loadOffice(tx, input.officeId, input.ownerUserId);
    const settings = await loadOfficeSettings(tx);
    if (settings.trial.kartIstenir) throw new EntitlementConfigError('OFFICE_TRIAL_CONFIG', 'kartIstenir=true bu akışta desteklenmiyor (deneme kartsızdır).');
    if (await tx.ofisDenemeKaydi.findUnique({ where: { officeId: input.officeId } })) throw new OfficeEntitlementError('TRIAL_ALREADY_USED', 'Bu ofis için deneme paketi daha önce kullanılmıştır.');
    if (await tx.ofisDenemeKaydi.findUnique({ where: { telefonHash: input.telefonHash } })) throw new OfficeEntitlementError('TRIAL_PHONE_USED', 'Bu telefon numarasıyla deneme paketi daha önce kullanılmıştır.');
    const legacyTrial = await tx.kontorHareketi.findFirst({ where: { kullaniciId: input.ownerUserId, aciklama: { contains: 'Ofis Deneme Paketi' } }, select: { id: true } });
    if (legacyTrial) throw new OfficeEntitlementError('TRIAL_ALREADY_USED', 'Bu ofis sahibi için deneme paketi daha önce kullanılmıştır.');
    const paid = await tx.ofisAbonelik.findFirst({ where: { officeId: input.officeId, durum: { in: ['AKTIF', 'GRACE'] } } });
    if (paid && subscriptionLive(paid, now)) throw new OfficeEntitlementError('PAID_PACKAGE_ACTIVE', 'Aktif ücretli ofis paketi denemeyle değiştirilemez.');
    const level = settings.catalog.get(settings.trial.seviyePaketi);
    if (!level) throw new EntitlementConfigError('OFFICE_TRIAL_CONFIG', `seviyePaketi "${settings.trial.seviyePaketi}" katalogda yok.`);
    const bitis = new Date(now.getTime() + settings.trial.gun * 86400000);
    const record = await tx.ofisDenemeKaydi.create({ data: { officeId: input.officeId, ownerUserId: input.ownerUserId, telefonHash: input.telefonHash, kaynak: 'YENI', baslangicTarihi: now, bitisTarihi: bitis, verilenPk: settings.trial.pk } });
    const lot = await this.creditPk(tx, input.ownerUserId, settings.trial.pk, { kaynakKayitTuru: 'OFFICE_TRIAL', kaynakKayitId: record.id, dedupeKey: `office-trial:${record.id}`,
      aciklama: `Ofis Deneme Paketi: ${settings.trial.gun} Günlük Deneme ve ${settings.trial.pk} Ortak PK Yüklendi.`, sonKullanma: bitis, hediye: true });
    await this.syncLegacySnapshot(tx, input.officeId, now, settings);
    return { record, lotId: lot?.id ?? null, grantedPk: settings.trial.pk, trialDays: settings.trial.gun, expiresAt: bitis, level, balance: lot?.balanceAfter ?? 0 };
  }

  // ───────────────────────── eski okuyucular için türetilmiş snapshot (dual-write) ─────────────────────────

  /**
   * OFFICE_SUBSCRIPTION_<id> JSON'unu ilişkisel durumdan TÜRETİR. İlişkisel model tek kaynaktır; JSON legacy okuyucular ve rollback içindir.
   * Not: eski okuyucular paket kodunu katalogdan (ek kullanıcısız) okur; ek kullanıcı/Ofis Boy bu JSON'da alanlarla taşınır, relational kaynağa geçişte okuyucular çözümleyiciye taşınır.
   */
  async syncLegacySnapshot(tx: Tx, officeId: string, at: Date, settings?: OfficeSettings) {
    const s = settings ?? await loadOfficeSettings(tx);
    const cur = await tx.ofisAbonelik.findFirst({ where: { officeId }, orderBy: { baslangicTarihi: 'desc' } });
    const eff = await resolveOfficeEntitlements(tx, officeId, at, s);
    let value: Prisma.InputJsonObject | null = null;
    if (eff.state === 'DENEME') {
      const level = s.catalog.get(s.trial.seviyePaketi);
      value = { officeId, packageCode: 'DENEME', packageName: 'Ofis Deneme', monthlyPk: eff.monthlyPk, portfolioCapacity: eff.portfolio, crmCapacity: eff.crm ?? -1, agents: eff.agents, purchasedAt: iso(at), expiresAt: eff.endsAt ? iso(eff.endsAt) : null, source: 'OFIS_ABONELIK', derived: true, seviye: level?.code ?? null };
    } else if (eff.state === 'UCRETLI' && eff.packageCode) {
      const row = s.catalog.get(eff.packageCode);
      value = { officeId, packageCode: eff.packageCode, packageName: eff.packageName, price: row?.price ?? null, monthlyPk: eff.monthlyPk, portfolioCapacity: eff.portfolio, crmCapacity: eff.crm ?? -1, agents: eff.agents,
        ofisBoy: eff.ofisBoy, ekKullanici: eff.ekKullaniciAdet, purchasedAt: cur ? iso(cur.baslangicTarihi) : iso(at), expiresAt: eff.endsAt ? iso(eff.endsAt) : null, source: 'OFIS_ABONELIK', derived: true };
    } else if (cur) { // süresi dolmuş: legacy okuyucular erişimi kapatsın (expiresAt geçmişte)
      value = { officeId, packageCode: cur.paketKodu, packageName: s.catalog.get(cur.paketKodu.toUpperCase())?.name ?? cur.paketKodu, monthlyPk: 0, portfolioCapacity: 0, agents: 0, purchasedAt: iso(cur.baslangicTarihi), expiresAt: iso(cur.bitisTarihi ?? at), source: 'OFIS_ABONELIK', derived: true, ended: true };
    }
    if (!value) return;
    const key = `OFFICE_SUBSCRIPTION_${officeId}`;
    await tx.systemSetting.upsert({ where: { key }, create: { key, valueJson: value }, update: { valueJson: value } });
  }
}

export { addonLive };
