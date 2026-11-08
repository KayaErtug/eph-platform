import { lockWallet } from '../../kontor/wallet-lots';
import { HttpException, Inject, ServiceUnavailableException, Injectable, Logger, Optional } from '@nestjs/common';
import { AuditAction, KontorHareketTuru, KontorIslemTuru, PaymentChannel, PaymentOrderPurpose, PaymentOrderStatus, PaymentTransactionStatus, PaymentTransactionType, Prisma, Role, UyelikDurumu, UyelikPaketKodu } from '@prisma/client';
import type { JWSRenewalInfoDecodedPayload, JWSTransactionDecodedPayload } from '@apple/app-store-server-library';
import { MembershipService } from '../../membership/membership.service';
import { OfficeEntitlementService, loadOfficeSettings } from '../../office/office-entitlement.service';
import type { PurchaseKind } from '../../office/office-entitlement.rules';
import { PrismaService } from '../../prisma/prisma.service';
import { PAYMENT_SETTINGS_KEY, digest, jsonObject, money } from '../payment.rules';
import { AppleStoreConfig, readAppleStoreConfig } from './apple-store.config';
import {
  APPLE_STORE_CONFIG, APPLE_STORE_PORT, AppleDecodedNotification, AppleEnv, AppleSignatureError, AppleStorePort, AppleStoreUnavailableError, AppleTransactionNotFoundError,
} from './apple-store.port';

/** ODM-3 — Apple doğrulama + App Store Server Notifications V2. Sözleşme: EPH_ODEME_API_SOZLESMESI.md r2 §3.2, §3.4, §5, §6. */

const PROVIDER_CODE = 'APPLE_APP_STORE';
const refundTombstoneHash = (transactionId: string): string => digest({ appleRefundTombstone: transactionId });
const SOURCE_LABEL: Record<string, string> = { IYZICO: 'Web', APPLE: 'App Store', GOOGLE: 'Google Play', ADMIN: 'Yönetici', DENEME: 'Deneme' };
const SUBSCRIPTION_TYPE = 'Auto-Renewable Subscription';
const CONSUMABLE_TYPE = 'Consumable';

export type VerifyStatus = 'GRANTED' | 'ALREADY_PROCESSED' | 'PENDING' | 'TEST_NOT_GRANTED' | 'FINANCE_REVIEW';
export interface VerifyResult {
  status: VerifyStatus; platform: 'IOS'; environment: 'PRODUCTION' | 'SANDBOX';
  orderId: string | null; urunTuru: string; summary: string;
}

const MESSAGES: Record<string, [number, string]> = {
  STORE_DISABLED: [503, 'Mağaza satın alma şu an kullanılamıyor.'],
  STORE_REQUEST_INVALID: [400, 'Satın alma bilgileri eksik veya hatalı.'],
  STORE_PRODUCT_NOT_FOUND: [404, 'Satın alınabilir ürün bulunamadı.'],
  STORE_PRODUCT_MISMATCH: [409, 'Mağaza ürünü ile paket eşleşmiyor.'],
  STORE_PRODUCT_NOT_GRANTABLE: [422, 'Bu ürün için hak tanımlaması henüz desteklenmiyor.'],
  STORE_ACCOUNT_MISMATCH: [403, 'Bu satın alma başka bir hesaba ait.'],
  STORE_BUNDLE_MISMATCH: [403, 'Satın alma bu uygulamaya ait değil.'],
  STORE_ENVIRONMENT_MISMATCH: [409, 'Satın alma ortamı bu sunucuyla eşleşmiyor.'],
  STORE_VERIFY_FAILED: [422, 'Satın alma doğrulanamadı.'],
  STORE_VERIFY_UNAVAILABLE: [503, 'Mağaza doğrulaması şu an yapılamıyor. Satın alımınız kaybolmaz; birkaç dakika sonra tekrar deneyin.'],
  STORE_TEST_DISABLED: [403, 'Test satın alımları bu sunucuda kapalı.'],
  STORE_NOTIFICATION_INVALID: [401, 'Bildirim doğrulanamadı.'],
  OFFICE_AGENT_PURCHASE_FORBIDDEN: [403, 'Ofis paketini ve ofis PK\'sını yalnız ofis sahibi satın alabilir.'],
  ROLE_NOT_ELIGIBLE: [403, 'Bu hesap türü mağazadan satın alma yapamaz.'],
  MEMBERSHIP_ACTIVE_OTHER_CHANNEL: [409, 'Üyeliğiniz aktif.'],
  STORE_PERIOD_EXPIRED: [422, 'Bu abonelik dönemi sona ermiş veya daha yeni bir dönem işlenmiş; bu işlemle hak verilmez.'],
  STORE_REFUNDED: [422, 'Bu satın alma iade edilmiş.'],
  STORE_PRICE_UNVERIFIED: [422, 'Satın alma tutarı doğrulanamadı; destek incelemesi gerekir.'],
  ADDON_REQUIRES_OFFICE_PACKAGE: [409, 'Eklenti için uygun bir ofis paketi gerekir.'],
  ADDON_TIER_ALREADY_ACTIVE: [409, 'Bu eklenti için aktif bir abonelik zaten var.'],
  ADDON_TIER_INVALID: [422, 'Geçersiz ek kullanıcı kademesi.'],
  ADDON_NOT_ALLOWED_FOR_PACKAGE: [409, 'Bu pakette bu eklenti alınamaz.'],
  ADDON_INCLUDED_IN_PACKAGE: [409, 'Bu pakette Ofis Boy zaten dahildir.'],
  PACKAGE_NOT_PURCHASABLE: [422, 'Bu paket satın alınamaz.'],
  CHANNEL_UNKNOWN_REVIEW: [409, 'Mevcut üyeliğin kaynağı belirsiz; destek incelemesi gerekir.'],
  OFFICE_NOT_FOUND: [404, 'Aktif ofis bulunamadı.'],
  AMOUNT_INVALID: [422, 'Tutarı 0 olan işlem hak vermez.'],
  WALLET_INACTIVE: [409, 'PK cüzdanı kapalı; satın alma destek incelemesi gerektiriyor.'],
};

export class StoreError extends HttpException {
  constructor(readonly code: string, message?: string) {
    const [status, text] = MESSAGES[code] ?? [400, 'İşlem tamamlanamadı.'];
    super({ statusCode: status, code, message: message ?? text }, status);
  }
}

const normalizeEnv = (value: unknown): AppleEnv | null => {
  const text = String(value ?? '').toLowerCase();
  return text === 'production' ? 'PRODUCTION' : text === 'sandbox' ? 'SANDBOX' : null;
};
const sameToken = (a: unknown, b: unknown): boolean => typeof a === 'string' && typeof b === 'string' && !!a && a.toLowerCase() === b.toLowerCase();
const dateOf = (ms: unknown): Date | null => (typeof ms === 'number' && Number.isFinite(ms) && ms > 0 ? new Date(ms) : null);
const isP2002 = (error: unknown): boolean => !!error && typeof error === 'object' && (error as { code?: string }).code === 'P2002';

type Tx = Prisma.TransactionClient;
interface OfficePlan { officeId: string; kind: PurchaseKind; paketKodu?: string; adet?: number; tur?: 'EK_KULLANICI' | 'OFIS_BOY'; monthlyPk: number; ekKullaniciPk: number }
interface Target { kind: 'OFFICE' | 'PERSONAL'; segment: 'OFFICE' | 'MUTEAHHIT'; officeId: string | null }
interface ProcessInput { userId: string; tx: JWSTransactionDecodedPayload; env: AppleEnv; renewal?: JWSRenewalInfoDecodedPayload; requireActiveProduct: boolean; eventAt: Date }
type ProcessResult = { status: VerifyStatus; orderId: string | null; urunTuru: string; summary: string };

@Injectable()
export class AppleStoreService {
  private readonly logger = new Logger(AppleStoreService.name);

  private readonly configReader: () => AppleStoreConfig;
  private readonly officeEntitlements: OfficeEntitlementService;

  constructor(
    private readonly prisma: PrismaService,
    private readonly membership: MembershipService,
    @Inject(APPLE_STORE_PORT) private readonly apple: AppleStorePort,
    @Optional() @Inject(APPLE_STORE_CONFIG) configReader?: () => AppleStoreConfig,
    @Optional() officeEntitlements?: OfficeEntitlementService,
  ) { this.configReader = configReader ?? readAppleStoreConfig; this.officeEntitlements = officeEntitlements ?? new OfficeEntitlementService(prisma); }

  // ───────────────────────── Mobil doğrulama (POST /payments/store/apple/verify) ─────────────────────────

  async verify(userId: string, dto: { transactionId?: unknown; originalTransactionId?: unknown; productId?: unknown }): Promise<VerifyResult> {
    const cfg = this.configReader();
    if (!cfg.enabled) throw new StoreError('STORE_DISABLED');
    const transactionId = typeof dto?.transactionId === 'string' ? dto.transactionId.trim() : '';
    const productId = typeof dto?.productId === 'string' ? dto.productId.trim() : '';
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(transactionId) || !/^[A-Za-z0-9._-]{1,150}$/.test(productId)) throw new StoreError('STORE_REQUEST_INVALID');

    let lookup;
    try { lookup = await this.apple.getTransaction(transactionId); }
    catch (error) {
      if (error instanceof AppleTransactionNotFoundError || error instanceof AppleSignatureError) throw new StoreError('STORE_VERIFY_FAILED');
      if (error instanceof AppleStoreUnavailableError) throw new StoreError('STORE_VERIFY_UNAVAILABLE');
      this.logger.error('APPLE_VERIFY_UNEXPECTED');
      throw new StoreError('STORE_VERIFY_UNAVAILABLE');
    }
    const tx = lookup.transaction;
    if (cfg.bundleId && tx.bundleId !== cfg.bundleId) throw new StoreError('STORE_BUNDLE_MISMATCH');
    if (String(tx.transactionId ?? '') !== transactionId) throw new StoreError('STORE_VERIFY_FAILED');
    if (tx.productId !== productId) throw new StoreError('STORE_PRODUCT_MISMATCH');
    const env = normalizeEnv(tx.environment) ?? lookup.environment;
    if (normalizeEnv(tx.environment) === null || (cfg.environment === 'SANDBOX' && env === 'PRODUCTION')) {
      await this.reject('VERIFY_REJECTED', { code: 'STORE_ENVIRONMENT_MISMATCH', transactionId, userId });
      throw new StoreError('STORE_ENVIRONMENT_MISMATCH');
    }
    if (tx.revocationDate) throw new StoreError('STORE_VERIFY_FAILED');

    const result = await this.process({ userId, tx, env, requireActiveProduct: true, eventAt: dateOf(tx.signedDate) ?? new Date() }, cfg, true);
    return { ...result, platform: 'IOS', environment: env };
  }

  // ───────────────────────── Notifications V2 alıcısı (POST /payments/store/apple/notifications) ─────────────────────────

  async handleNotification(signedPayload: unknown): Promise<{ received: true }> {
    if (typeof signedPayload !== 'string' || !signedPayload || signedPayload.length > 200000) throw new StoreError('STORE_NOTIFICATION_INVALID');
    const cfg = this.configReader();
    let decoded: AppleDecodedNotification;
    try { decoded = await this.apple.decodeNotification(signedPayload); }
    catch (error) {
      if (error instanceof AppleStoreUnavailableError) throw new StoreError('STORE_VERIFY_UNAVAILABLE');
      throw new StoreError('STORE_NOTIFICATION_INVALID');
    }
    const note = decoded.notification;
    const uuid = typeof note.notificationUUID === 'string' ? note.notificationUUID : '';
    if (!uuid || (cfg.bundleId && note.data?.bundleId && note.data.bundleId !== cfg.bundleId)) throw new StoreError('STORE_NOTIFICATION_INVALID');

    const type = String(note.notificationType ?? 'UNKNOWN');
    const meta = {
      notificationType: type, subtype: note.subtype ? String(note.subtype) : null, environment: decoded.environment,
      transactionId: decoded.transaction?.transactionId ?? null, originalTransactionId: decoded.transaction?.originalTransactionId ?? null,
      productId: decoded.transaction?.productId ?? null,
    };
    const provider = await this.prisma.paymentProvider.upsert({
      where: { kod: PROVIDER_CODE }, update: {}, create: { kod: PROVIDER_CODE, ad: 'Apple App Store', adapterKodu: 'APPLE_ASN_V2' },
    });
    const event = await this.prisma.paymentWebhookEvent.upsert({
      where: { providerId_payloadHash: { providerId: provider.id, payloadHash: digest({ appleNotificationUUID: uuid }) } }, update: {},
      create: { providerId: provider.id, payloadHash: digest({ appleNotificationUUID: uuid }), providerEventId: uuid.slice(0, 200),
        eventType: type.slice(0, 100), signatureValid: true, payload: meta },
    });
    if (event.processed) return { received: true };
    if (!cfg.enabled) return { received: true }; // STORE_PAYMENTS_ENABLED=false: yalnız kayıt

    let outcome: string;
    try {
      outcome = await this.applyNotification(decoded, cfg);
    } catch (error) {
      if (error instanceof StoreError) outcome = `REJECTED:${error.code}`; // iş kuralı reddi: tekrar denemek sonucu değiştirmez
      else {
        await this.prisma.paymentWebhookEvent.update({ where: { id: event.id }, data: { errorMessage: 'PROCESSING_FAILED' } });
        this.logger.error(`APPLE_NOTIFICATION_FAILED:${type}`);
        // ODM-3F/O2: ortak servisten gelen Nest HttpException (ör. 400) Apple'a 4xx gitmesin → geçici hata olarak 503 (Apple yeniden dener)
        if (error instanceof HttpException) throw new ServiceUnavailableException('Bildirim işlenemedi; yeniden denenecek.');
        throw error;
      }
    }
    await this.prisma.paymentWebhookEvent.update({
      where: { id: event.id }, data: { processed: true, processedAt: new Date(), errorMessage: null, payload: { ...meta, outcome } },
    });
    return { received: true };
  }

  private async applyNotification(decoded: AppleDecodedNotification, cfg: AppleStoreConfig): Promise<string> {
    const { notification, transaction, renewal, environment } = decoded;
    const type = String(notification.notificationType ?? '');
    const subtype = String(notification.subtype ?? '');
    if (type === 'CONSUMPTION_REQUEST') return 'RECORDED_ONLY';
    if (!['SUBSCRIBED', 'DID_RENEW', 'DID_CHANGE_RENEWAL_STATUS', 'DID_FAIL_TO_RENEW', 'EXPIRED', 'GRACE_PERIOD_EXPIRED', 'REFUND', 'REVOKE'].includes(type)) return 'RECORDED_ONLY';
    if (!transaction?.transactionId || !transaction.originalTransactionId) return 'NO_TRANSACTION';
    if (environment === 'SANDBOX' && !cfg.allowTest) return 'TEST_DISABLED';
    if (cfg.environment === 'SANDBOX' && environment === 'PRODUCTION') return 'ENVIRONMENT_MISMATCH';

    const eventAt = dateOf(notification.signedDate) ?? dateOf(transaction.signedDate) ?? new Date();

    if (type === 'SUBSCRIBED' || type === 'DID_RENEW') {
      if (transaction.revocationDate) return 'REVOKED_TRANSACTION';
      const userId = await this.resolveUser(transaction);
      if (!userId) return 'USER_UNRESOLVED';
      const result = await this.process({ userId, tx: transaction, env: environment, renewal, requireActiveProduct: false, eventAt }, cfg, false);
      return result.status;
    }
    if (type === 'REFUND' || type === 'REVOKE') return this.revoke(transaction, type);

    const originalId = String(transaction.originalTransactionId);
    return this.prisma.$transaction(async (db) => {
      // ODM-3F/K3: abonelik düzeyinde seri işleme (grant/revoke ile aynı kilit)
      await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`store-apple-sub:${originalId}`}))`;
      const sub = await db.storeSubscription.findUnique({ where: { platform_abonelikKimligi: { platform: 'APPLE', abonelikKimligi: originalId } } });
      if (!sub) return 'SUBSCRIPTION_UNKNOWN';
      // ODM-3F/K3: iade edilmiş abonelik hiçbir durum bildirimiyle canlanmaz; olay sırası Apple signedDate ile korunur
      if (sub.durum === 'REVOKED') return 'ALREADY_REVOKED';
      if (sub.sonBildirimAt && eventAt.getTime() < sub.sonBildirimAt.getTime()) return 'STALE_EVENT';
      const txExpires = dateOf(transaction.expiresDate);
      if ((type === 'EXPIRED' || type === 'GRACE_PERIOD_EXPIRED') && txExpires && sub.bitisTarihi && txExpires.getTime() < sub.bitisTarihi.getTime() - 60000) return 'STALE_EVENT'; // daha yeni dönem zaten işlendi
      const membershipRow = sub.uyelikId;
      const now = eventAt;
      const touchMembership = async (data: Prisma.KullaniciUyelikPaketiUpdateInput, only?: UyelikDurumu) => {
        if (!membershipRow) return;
        const row = await db.kullaniciUyelikPaketi.findUnique({ where: { id: membershipRow } });
        if (!row || row.kaynakKanal !== 'APPLE' || (only && row.durum !== only)) return;
        await db.kullaniciUyelikPaketi.update({ where: { id: row.id }, data });
      };
      if (type === 'DID_CHANGE_RENEWAL_STATUS') {
        const off = subtype === 'AUTO_RENEW_DISABLED' || Number(renewal?.autoRenewStatus) === 0;
        const on = subtype === 'AUTO_RENEW_ENABLED' || Number(renewal?.autoRenewStatus) === 1;
        if (!off && !on) return 'NO_CHANGE';
        await db.storeSubscription.update({ where: { id: sub.id }, data: {
          otomatikYenileme: on, sonBildirimAt: now, durum: off && sub.durum === 'ACTIVE' ? 'CANCELED' : on && sub.durum === 'CANCELED' ? 'ACTIVE' : sub.durum } });
        await touchMembership({ otomatikYenileme: on });
        if (!membershipRow) await this.officeEntitlements.touchSource(db, { kanal: PaymentChannel.APPLE, kaynakAbonelikAnahtari: originalId, otomatikYenileme: on });
        return off ? 'AUTO_RENEW_OFF' : 'AUTO_RENEW_ON';
      }
      if (type === 'DID_FAIL_TO_RENEW') {
        const graceEnd = dateOf(renewal?.gracePeriodExpiresDate);
        if (subtype === 'GRACE_PERIOD' && graceEnd) {
          await db.storeSubscription.update({ where: { id: sub.id }, data: { durum: 'GRACE', graceBitis: graceEnd, sonBildirimAt: now } });
          // ODM-3F/O3: hak UZATAN geçiş güncel uygunluğu yeniden doğrular (hak azaltan yollar etkilenmez)
          if (membershipRow && await this.stillEligible(db, sub.kullaniciId, sub.ortam === 'TEST' ? 'SANDBOX' : 'PRODUCTION', cfg)) {
            const row = await db.kullaniciUyelikPaketi.findUnique({ where: { id: membershipRow } });
            if (row && row.kaynakKanal === 'APPLE' && row.durum === 'AKTIF' && (!row.bitisTarihi || row.bitisTarihi < graceEnd)) {
              await db.kullaniciUyelikPaketi.update({ where: { id: row.id }, data: { bitisTarihi: graceEnd } });
            }
          }
          if (!membershipRow && await this.stillEligible(db, sub.kullaniciId, sub.ortam === 'TEST' ? 'SANDBOX' : 'PRODUCTION', cfg)) {
            // Grace erişim verir ama yeni dönem PK'sı üretmez (F16); yalnız bitiş ileri taşınır
            await this.officeEntitlements.touchSource(db, { kanal: PaymentChannel.APPLE, kaynakAbonelikAnahtari: originalId, durum: 'GRACE', graceBitis: graceEnd });
          }
          return 'GRACE';
        }
        await db.storeSubscription.update({ where: { id: sub.id }, data: { durum: 'BILLING_RETRY', sonBildirimAt: now } });
        return 'BILLING_RETRY';
      }
      // EXPIRED, GRACE_PERIOD_EXPIRED
      await db.storeSubscription.update({ where: { id: sub.id }, data: { durum: 'EXPIRED', otomatikYenileme: false, sonBildirimAt: now } });
      await touchMembership({ durum: UyelikDurumu.SURESI_DOLDU }, UyelikDurumu.AKTIF);
      if (!membershipRow) await this.officeEntitlements.expire(db, { kanal: PaymentChannel.APPLE, kaynakAbonelikAnahtari: originalId, neden: 'SURESI_DOLDU', at: now });
      return 'EXPIRED';
    });
  }

  private async stillEligible(db: Tx, userId: string, env: AppleEnv, cfg: AppleStoreConfig): Promise<boolean> {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, hesapTuru: true, officeId: true, capabilities: { select: { capability: true } }, ownedOffices: { where: { isActive: true }, select: { id: true }, take: 1 } },
    });
    if (!user) return false;
    if (env === 'SANDBOX' && (!cfg.allowTest || user.hesapTuru !== 'TEST')) return false;
    try { this.eligibility(user, null); return true; } catch { return false; }
  }

  private async resolveUser(tx: JWSTransactionDecodedPayload): Promise<string | null> {
    const sub = await this.prisma.storeSubscription.findUnique({
      where: { platform_abonelikKimligi: { platform: 'APPLE', abonelikKimligi: String(tx.originalTransactionId) } } });
    if (sub) return sub.kullaniciId;
    if (typeof tx.appAccountToken !== 'string' || !tx.appAccountToken) return null;
    const user = await this.prisma.user.findUnique({ where: { storeAccountToken: tx.appAccountToken.toLowerCase() }, select: { id: true } })
      ?? await this.prisma.user.findUnique({ where: { storeAccountToken: tx.appAccountToken }, select: { id: true } });
    return user?.id ?? null;
  }

  // ───────────────────────── Ortak işlem hattı (doğrulama + bildirim) ─────────────────────────

  private async process(input: ProcessInput, cfg: AppleStoreConfig, fromClient: boolean): Promise<ProcessResult> {
    const { userId, tx, env } = input;
    const transactionId = String(tx.transactionId);
    const productId = String(tx.productId ?? '');

    const product = await this.prisma.storeProduct.findFirst({
      where: { platform: 'APPLE', magazaUrunKimligi: productId, ...(input.requireActiveProduct ? { aktifMi: true } : {}) } });
    if (!product) throw new StoreError('STORE_PRODUCT_NOT_FOUND');
    const wantsType = product.urunTuru === 'PK' ? CONSUMABLE_TYPE : SUBSCRIPTION_TYPE;
    if (String(tx.type ?? '') !== wantsType || (tx.quantity !== undefined && Number(tx.quantity) !== 1)) throw new StoreError('STORE_PRODUCT_MISMATCH');

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, hesapTuru: true, storeAccountToken: true, officeId: true,
        capabilities: { select: { capability: true } }, ownedOffices: { where: { isActive: true }, select: { id: true }, take: 1 } },
    });
    if (!user) throw new StoreError('STORE_ACCOUNT_MISMATCH');
    // appAccountToken ↔ kullanıcı eşleşmesi zorunlu; eşleşmezse reddet + kaydet
    if (!sameToken(tx.appAccountToken, user.storeAccountToken)) {
      await this.reject(fromClient ? 'VERIFY_REJECTED' : 'NOTIFICATION_REJECTED', { code: 'STORE_ACCOUNT_MISMATCH', transactionId, userId, reason: tx.appAccountToken ? 'TOKEN_DIFFERENT' : 'TOKEN_MISSING' });
      throw new StoreError('STORE_ACCOUNT_MISMATCH');
    }
    // Sandbox: yalnız TEST hesaba hak
    if (env === 'SANDBOX') {
      if (!cfg.allowTest) throw new StoreError('STORE_TEST_DISABLED');
      if (user.hesapTuru !== 'TEST') {
        await this.reject(fromClient ? 'VERIFY_REJECTED' : 'NOTIFICATION_REJECTED', { code: 'STORE_TEST_NOT_GRANTED', transactionId, userId });
        return { status: 'TEST_NOT_GRANTED', orderId: null, urunTuru: product.urunTuru, summary: 'Test satın alması gerçek hak vermez.' };
      }
    }
    const target = this.eligibility(user, product.segment);

    // EPH-70B2: ofis sahibi için ofis paketi (SOLO dahil), Ek Kullanıcı ve Ofis Boy artık OfficeEntitlementService ile hak verir.
    // Müteahhit üyeliği ve PK satın alma eski yolda kalır.
    const officeFlow = target.kind === 'OFFICE' && (product.urunTuru === 'UYELIK' || product.urunTuru === 'EK_KULLANICI' || product.urunTuru === 'OFIS_BOY');
    let officePlan: OfficePlan | null = null;
    if (officeFlow) {
      const notGrantable = async (reason: string): Promise<never> => {
        await this.reject(fromClient ? 'VERIFY_REJECTED' : 'NOTIFICATION_REJECTED', { code: 'STORE_PRODUCT_NOT_GRANTABLE', transactionId, userId, productId, reason });
        throw new StoreError('STORE_PRODUCT_NOT_GRANTABLE');
      };
      let settings;
      try { settings = await loadOfficeSettings(this.prisma); } catch { return notGrantable('OFFICE_SETTINGS_INVALID'); }
      if (product.urunTuru === 'UYELIK') {
        const row = settings.catalog.get(String(product.paketKodu ?? '').trim().toUpperCase());
        if (!row || row.custom || !row.active || row.price === null || row.price <= 0 || ['UCRETSIZ', 'DENEME'].includes(row.code)) return notGrantable('PACKAGE_ROW_MISSING');
        officePlan = { officeId: target.officeId as string, kind: 'PAKET', paketKodu: row.code, monthlyPk: row.monthlyPk, ekKullaniciPk: 0 };
      } else if (product.urunTuru === 'EK_KULLANICI') {
        const adet = Number(product.kisiSayisi);
        if (!settings.addon.ekKullanici.kademeler.includes(adet)) return notGrantable('ADDON_TIER_NOT_CONFIGURED');
        officePlan = { officeId: target.officeId as string, kind: 'EK_KULLANICI', tur: 'EK_KULLANICI', adet, monthlyPk: 0, ekKullaniciPk: adet * settings.addon.ekKullanici.kisiBasiPk };
      } else {
        officePlan = { officeId: target.officeId as string, kind: 'OFIS_BOY', tur: 'OFIS_BOY', adet: 1, monthlyPk: 0, ekKullaniciPk: 0 };
      }
    }

    // Hak kaynağı (paket / PK miktarı) yalnız DB'den
    let packageRow: { id: string; paketKodu: UyelikPaketKodu; fiyat: Prisma.Decimal | null; paketAdi: string } | null = null;
    let credits = 0;
    let fallbackAmount: Prisma.Decimal | null = null;
    if (officeFlow) {
      fallbackAmount = null; // tutar yalnız mağaza işleminden gelir (0/eksik → aşağıda inceleme)
    } else if (product.urunTuru === 'UYELIK') {
      packageRow = await this.resolvePackage(product);
      if (!packageRow) {
        await this.reject(fromClient ? 'VERIFY_REJECTED' : 'NOTIFICATION_REJECTED', { code: 'STORE_PRODUCT_NOT_GRANTABLE', transactionId, userId, productId, reason: 'PACKAGE_ROW_MISSING' });
        throw new StoreError('STORE_PRODUCT_NOT_GRANTABLE');
      }
      fallbackAmount = packageRow.fiyat;
    } else {
      const settings = jsonObject((await this.prisma.systemSetting.findUnique({ where: { key: PAYMENT_SETTINGS_KEY } }))?.valueJson);
      const item = (Array.isArray(settings.pkProducts) ? settings.pkProducts : []).find((p: any) => p?.code === product.pkUrunKodu);
      credits = Number(item?.credits);
      if (!item || !Number.isSafeInteger(credits) || credits <= 0) throw new StoreError('STORE_PRODUCT_NOT_FOUND');
      fallbackAmount = new Prisma.Decimal(Number(item.amountMinor) || 0).div(100);
    }
    // ODM-3F/O6: Apple tutarı/para birimi yoksa katalog fiyatı gerçek tahsilat gibi yazılmaz
    const milli = Number(tx.price);
    if (tx.price === undefined || tx.price === null || !Number.isFinite(milli) || milli < 0 || typeof tx.currency !== 'string' || !/^[A-Z]{3}$/.test(tx.currency)) {
      await this.reject(fromClient ? 'VERIFY_REJECTED' : 'NOTIFICATION_REJECTED', { code: 'STORE_PRICE_UNVERIFIED', transactionId, userId });
      throw new StoreError('STORE_PRICE_UNVERIFIED');
    }
    const amountFromCatalog = milli === 0;
    const amount = this.amountOf(tx, fallbackAmount);
    const currency = tx.currency;
    // EPH-70B1 / §11 madde 19: mağazada ücretsiz deneme/indirim tanımlanmaz; tutarı 0 olan işlem hak vermez, finans incelemesine düşer.
    if (amountFromCatalog) {
      await this.prisma.paymentOrder.upsert({
        where: { siparisNo: `EPH-APPLE-ZERO-${transactionId}` }, update: {},
        create: { siparisNo: `EPH-APPLE-ZERO-${transactionId}`, kullaniciId: userId, amac: product.urunTuru === 'PK' ? PaymentOrderPurpose.PK_PURCHASE : PaymentOrderPurpose.MEMBERSHIP_PURCHASE,
          durum: PaymentOrderStatus.PAID, tutar: '0', paraBirimi: currency, hedefPaketId: packageRow?.id ?? null, pkMiktari: packageRow || officeFlow ? null : credits, // EPH-70B1F/D8: gerçek tahsilat 0; katalog fiyatı yalnız metadata
          kanal: PaymentChannel.APPLE, ortam: env === 'SANDBOX' ? 'TEST' : 'LIVE', paidAt: dateOf(tx.purchaseDate) ?? new Date(),
          metadata: { channel: 'APPLE', amountSource: 'STORE_ZERO', collectedAmount: '0', catalogAmount: amount, requiresFinanceReview: true, reviewReason: 'ZERO_AMOUNT_STORE_TRANSACTION', entitlementGranted: false,
            store: { platform: 'APPLE', productId: product.magazaUrunKimligi, transactionId, originalTransactionId: String(tx.originalTransactionId ?? transactionId), environment: env } } as Prisma.InputJsonObject },
      });
      await this.reject(fromClient ? 'VERIFY_REJECTED' : 'NOTIFICATION_REJECTED', { code: 'STORE_ZERO_AMOUNT_REVIEW', transactionId, userId });
      return { status: 'FINANCE_REVIEW', orderId: null, urunTuru: product.urunTuru, summary: 'İşlem tutarı 0 olduğu için hak tanımlanmadı; finans incelemesine alındı.' };
    }
    // ODM-3F/K4: süresi geçmiş dönem bugün kullanılabilir hak (PK) üretmez (ofis eklentileri dahil)
    if (product.urunTuru !== 'PK') {
      const periodEnd = dateOf(tx.expiresDate);
      if (periodEnd && periodEnd.getTime() <= Date.now()) {
        await this.reject(fromClient ? 'VERIFY_REJECTED' : 'NOTIFICATION_REJECTED', { code: 'STORE_PERIOD_EXPIRED', transactionId, userId });
        throw new StoreError('STORE_PERIOD_EXPIRED');
      }
    }

    let outcome: Awaited<ReturnType<AppleStoreService['grant']>>;
    try { outcome = await this.grant({ input, product, target, packageRow, credits, amount, currency, cfg, amountFromCatalog, office: officePlan }); }
    catch (error) {
      if (!isP2002(error)) throw error;
      outcome = await this.grant({ input, product, target, packageRow, credits, amount, currency, cfg, amountFromCatalog, office: officePlan }); // eşzamanlı çift istek: ikinci deneme kaydı bulur
    }
    if (outcome.kind === 'CONFLICT') {
      const label = SOURCE_LABEL[outcome.channel] ?? outcome.channel;
      throw new StoreError('MEMBERSHIP_ACTIVE_OTHER_CHANNEL', `Üyeliğiniz aktif. Kaynak: ${label}.`);
    }
    if (outcome.kind === 'OWNED_BY_OTHER') throw new StoreError('STORE_ACCOUNT_MISMATCH');
    if (outcome.kind === 'REVIEW') throw new StoreError(outcome.code, outcome.message);
    return { status: outcome.kind === 'DONE' ? 'GRANTED' : 'ALREADY_PROCESSED', orderId: outcome.orderId, urunTuru: product.urunTuru,
      summary: outcome.kind === 'DONE' ? (product.urunTuru === 'PK' ? 'PK hesabınıza eklendi.' : officeFlow && product.urunTuru !== 'UYELIK' ? 'Ofis eklentiniz etkinleştirildi.' : 'Üyeliğiniz etkinleştirildi.') : 'Bu satın alma daha önce işlendi.' };
  }

  /** §11 madde 7: yalnız aktif ofis sahibi (emlakçı) veya müteahhit hesabı. Emlakçıda PERSONAL yok. */
  private eligibility(user: { id: string; role: Role; officeId: string | null; capabilities: Array<{ capability: string }>; ownedOffices: Array<{ id: string }> }, segment: string | null): Target {
    let target: Target;
    if (user.role === Role.MUTEAHHIT || user.role === Role.INSAAT_FIRMASI) {
      target = { kind: 'PERSONAL', segment: 'MUTEAHHIT', officeId: null };
    } else if (user.role === Role.EMLAKCI) {
      const office = user.ownedOffices[0];
      if (office && user.capabilities.some((c) => c.capability === 'OFFICE_OWNER')) target = { kind: 'OFFICE', segment: 'OFFICE', officeId: office.id };
      else if (user.officeId) throw new StoreError('OFFICE_AGENT_PURCHASE_FORBIDDEN');
      else throw new StoreError('ROLE_NOT_ELIGIBLE');
    } else if (user.role === Role.OFIS_BOY) {
      throw new StoreError('OFFICE_AGENT_PURCHASE_FORBIDDEN');
    } else {
      throw new StoreError('ROLE_NOT_ELIGIBLE');
    }
    if (segment && segment !== target.segment) throw new StoreError('STORE_PRODUCT_MISMATCH');
    return target;
  }

  private async resolvePackage(product: { uyelikPaketiId: string | null; paketKodu: string | null; segment: string | null }) {
    if (product.uyelikPaketiId) return this.prisma.uyelikPaketi.findUnique({ where: { id: product.uyelikPaketiId } });
    const code = product.paketKodu as UyelikPaketKodu;
    if (!product.paketKodu || !Object.values(UyelikPaketKodu).includes(code) || code === 'DENEME' || code === 'UCRETSIZ') return null;
    // OFFICE ürünleri OFFICE_MEMBERSHIP_PACKAGES'ta; web akışı BRONZ..PLATINUM için EMLAK_PRO satırlarını kullanır. SOLO için satır yok → null.
    return this.prisma.uyelikPaketi.findUnique({ where: { paketKodu_segment: { paketKodu: code, segment: product.segment === 'OFFICE' ? 'EMLAK_PRO' : 'MUTEAHHIT' } } });
  }

  private amountOf(tx: JWSTransactionDecodedPayload, fallback: Prisma.Decimal | null): string {
    const milli = Number(tx.price);
    if (Number.isFinite(milli) && milli > 0) {
      try { return money(new Prisma.Decimal(milli).div(1000).toDecimalPlaces(2)); } catch { /* fallback */ }
    }
    try { return money(fallback ?? 0); } catch { return '0.01'; }
  }

  /** Anahtar sahiplenme + hak yazımı AYNI transaction'da (sözleşme §5). Hak yazımı patlarsa anahtar da geri alınır. */
  private async grant(ctx: {
    input: ProcessInput; product: any; target: Target; packageRow: { id: string; paketKodu: UyelikPaketKodu; fiyat: Prisma.Decimal | null; paketAdi: string } | null;
    credits: number; amount: string; currency: string; cfg: AppleStoreConfig; amountFromCatalog: boolean; office: OfficePlan | null;
  }): Promise<{ kind: 'DONE' | 'ALREADY'; orderId: string } | { kind: 'CONFLICT'; channel: string } | { kind: 'OWNED_BY_OTHER' } | { kind: 'REVIEW'; code: string; message: string }> {
    const { input, product, packageRow, credits, amount, currency } = ctx;
    const officePlan = ctx.office;
    const { userId, tx: apple, env } = input;
    const transactionId = String(apple.transactionId);
    const originalId = String(apple.originalTransactionId ?? transactionId);
    const expires = dateOf(apple.expiresDate);
    const autoRenew = input.renewal ? Number(input.renewal.autoRenewStatus) !== 0 : true;

    return this.prisma.$transaction(async (db) => {
      await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`payment-user:${userId}`}))`;
      await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`store-apple-tx:${transactionId}`}))`;

      if (packageRow || officePlan) await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`store-apple-sub:${originalId}`}))`;

      const existing = await db.storeEntitlementGrant.findUnique({ where: { platform_magazaIslemKimligi: { platform: 'APPLE', magazaIslemKimligi: transactionId } }, include: { order: true } });
      if (existing) return existing.order.kullaniciId === userId ? { kind: 'ALREADY' as const, orderId: existing.orderId } : { kind: 'OWNED_BY_OTHER' as const };

      // ODM-3F/K3: grant'tan ÖNCE gelmiş iade/revoke → kalıcı engel (tombstone); sonradan gelen SUBSCRIBED/DID_RENEW hak vermez
      const provider = await db.paymentProvider.upsert({ where: { kod: PROVIDER_CODE }, update: {}, create: { kod: PROVIDER_CODE, ad: 'Apple App Store', adapterKodu: 'APPLE_ASN_V2' } });
      const refundedEarly = await db.paymentWebhookEvent.findFirst({ where: { providerId: provider.id, payloadHash: refundTombstoneHash(transactionId) } });
      if (refundedEarly) throw new StoreError('STORE_REFUNDED');

      // ODM-3F/K3: eski dönem, bilinen daha yeni dönemin bitişini geriye çekemez / yeni hakkı bozamaz
      const knownSub = packageRow || officePlan ? await db.storeSubscription.findUnique({ where: { platform_abonelikKimligi: { platform: 'APPLE', abonelikKimligi: originalId } } }) : null;
      if (knownSub?.bitisTarihi && expires && expires.getTime() < knownSub.bitisTarihi.getTime() - 60000) throw new StoreError('STORE_PERIOD_EXPIRED');
      if (knownSub?.durum === 'REVOKED') throw new StoreError('STORE_REFUNDED');

      let purpose: PaymentOrderPurpose = PaymentOrderPurpose.PK_PURCHASE;
      const orderMeta: Record<string, unknown> = {
        channel: 'APPLE', paymentMode: env === 'SANDBOX' ? 'sandbox' : 'live', walletKind: ctx.target.kind, officeId: ctx.target.officeId,
        store: { platform: 'APPLE', productId: product.magazaUrunKimligi, transactionId, originalTransactionId: originalId, environment: env },
      };
      let officeOrder: Record<string, unknown> = {};
      if (officePlan) {
        // F10: tek uygunluk denetimi (settlement içinde de çalışır). Para çekildi → reddedilen işlem finans/iade incelemesine kaydedilir.
        const elig = await this.officeEntitlements.checkPurchaseEligibility(db, { officeId: officePlan.officeId, actorUserId: userId, kind: officePlan.kind, packageCode: officePlan.paketKodu, adet: officePlan.adet,
          channel: PaymentChannel.APPLE, sourceKey: originalId, amount: Number(amount), at: new Date() });
        if (!elig.ok) {
          const fail = elig as { code: string; message: string };
          await db.paymentOrder.upsert({
            where: { siparisNo: `EPH-APPLE-REVIEW-${transactionId}` }, update: {},
            create: { siparisNo: `EPH-APPLE-REVIEW-${transactionId}`, kullaniciId: userId, amac: officePlan.kind === 'PAKET' ? PaymentOrderPurpose.OFFICE_PACKAGE : PaymentOrderPurpose.OFFICE_ADDON, durum: PaymentOrderStatus.PAID,
              tutar: amount, paraBirimi: currency, hedefOfficeId: officePlan.officeId, hakSahibiUserId: userId, kanal: PaymentChannel.APPLE, ortam: env === 'SANDBOX' ? 'TEST' : 'LIVE', paidAt: dateOf(apple.purchaseDate) ?? new Date(),
              metadata: { ...orderMeta, requiresRefundReview: true, entitlementGranted: false, reviewReason: fail.code } as Prisma.InputJsonObject },
          });
          if (fail.code === 'MEMBERSHIP_ACTIVE_OTHER_CHANNEL' || fail.code === 'CHANNEL_UNKNOWN_REVIEW') {
            const activeSub = await db.ofisAbonelik.findFirst({ where: { officeId: officePlan.officeId, durum: { in: ['AKTIF', 'GRACE'] } }, select: { kaynakKanal: true } });
            return { kind: 'CONFLICT' as const, channel: activeSub?.kaynakKanal ?? 'IYZICO' };
          }
          return { kind: 'REVIEW' as const, code: fail.code, message: fail.message };
        }
        const start = dateOf(apple.purchaseDate) ?? new Date();
        orderMeta.entitlementPeriod = { start: start.toISOString(), end: expires ? expires.toISOString() : null, key: originalId, autoRenew, productId: product.magazaUrunKimligi };
        purpose = officePlan.kind === 'PAKET' ? PaymentOrderPurpose.OFFICE_PACKAGE : PaymentOrderPurpose.OFFICE_ADDON;
        officeOrder = {
          hedefOfficeId: officePlan.officeId, hakSahibiUserId: userId, hedefOfisPaketKodu: officePlan.paketKodu ?? null,
          hedefEklenti: officePlan.kind === 'PAKET' ? undefined : { tur: officePlan.tur, adet: officePlan.adet },
          // F16: hak değerleri sipariş anında dondurulur (ayar ödeme beklerken değişse de verilen hak snapshot'tır)
          fiyatSnapshot: { source: 'APPLE', kind: officePlan.kind, paketKodu: officePlan.paketKodu ?? null, tur: officePlan.tur ?? null, adet: officePlan.adet ?? null, monthlyPk: officePlan.monthlyPk, ekKullaniciPk: officePlan.ekKullaniciPk },
        };
      } else if (packageRow) {
        const current = await db.kullaniciUyelikPaketi.findFirst({ where: { kullaniciId: userId, durum: UyelikDurumu.AKTIF }, orderBy: { baslangicTarihi: 'desc' } });
        if (current) {
          const currentPackage = await db.uyelikPaketi.findUnique({ where: { id: current.paketId } });
          const live = !current.bitisTarihi || current.bitisTarihi > new Date();
          let channel: string | null = current.kaynakKanal ?? null;
          if (!channel) {
            const prior = await db.paymentSettlement.findFirst({ where: { uyelikId: current.id }, orderBy: { settledAt: 'desc' }, include: { order: true } });
            channel = prior?.order.kanal ?? null;
          }
          const trial = !currentPackage || ['DENEME', 'UCRETSIZ'].includes(currentPackage.paketKodu) || channel === 'DENEME';
          if (live && !trial && channel && channel !== 'APPLE') {
            // Para çekildi ama hak verilmez: kayıt + requiresRefundReview (§6)
            await db.paymentOrder.upsert({
              where: { siparisNo: `EPH-APPLE-REVIEW-${transactionId}` }, update: {},
              create: { siparisNo: `EPH-APPLE-REVIEW-${transactionId}`, kullaniciId: userId, amac: PaymentOrderPurpose.MEMBERSHIP_PURCHASE, durum: PaymentOrderStatus.PAID,
                tutar: amount, paraBirimi: currency, hedefPaketId: packageRow.id, kanal: PaymentChannel.APPLE, ortam: env === 'SANDBOX' ? 'TEST' : 'LIVE',
                paidAt: dateOf(apple.purchaseDate) ?? new Date(),
                metadata: { ...orderMeta, requiresRefundReview: true, reviewReason: 'MEMBERSHIP_ACTIVE_OTHER_CHANNEL', activeChannel: channel } as Prisma.InputJsonObject },
            });
            return { kind: 'CONFLICT' as const, channel };
          }
          orderMeta.mevcutUyelikId = current.id;
          purpose = current.paketId === packageRow.id ? PaymentOrderPurpose.MEMBERSHIP_RENEWAL : PaymentOrderPurpose.MEMBERSHIP_PURCHASE;
        } else {
          purpose = PaymentOrderPurpose.MEMBERSHIP_PURCHASE;
        }
      }

      const order = await db.paymentOrder.create({ data: {
        siparisNo: `EPH-APPLE-${transactionId}`, kullaniciId: userId, amac: purpose, durum: PaymentOrderStatus.PAID, tutar: amount, paraBirimi: currency,
        hedefPaketId: packageRow?.id ?? null, pkMiktari: packageRow || officePlan ? null : credits,
        fiyatSnapshot: packageRow ? { paketKodu: packageRow.paketKodu, paketAdi: packageRow.paketAdi, source: 'APPLE' } : { code: product.pkUrunKodu, credits, source: 'APPLE' },
        ...(officePlan ? (officeOrder as any) : {}),
        kanal: PaymentChannel.APPLE, ortam: env === 'SANDBOX' ? 'TEST' : 'LIVE', paidAt: dateOf(apple.purchaseDate) ?? new Date(),
        metadata: orderMeta as Prisma.InputJsonObject,
      } });
      await db.paymentTransaction.create({ data: {
        orderId: order.id, providerId: provider.id, providerTransactionId: transactionId, islemTuru: PaymentTransactionType.PAYMENT,
        durum: PaymentTransactionStatus.SUCCEEDED, tutar: amount, paraBirimi: currency, processedAt: new Date(),
        metadata: { originalTransactionId: originalId, environment: env },
      } });
      // Anahtar sahiplenme (tekillik ihlali → P2002 → tüm transaction geri alınır, çağıran ikinci kez dener)
      await db.storeEntitlementGrant.create({ data: { platform: 'APPLE', magazaIslemKimligi: transactionId, orderId: order.id, abonelikKimligi: packageRow ? originalId : null } });
      // EPH-70B1G/F5: kilit sırası payment-user -> üyelik satırları -> wallet. Settlement cüzdan kilidini alacağı için bu kullanıcının
      // üyelik satırları (settlement sonrası güncellenecek olanlar dahil) cüzdandan ÖNCE kilitlenir (FOR NO KEY UPDATE: FK KEY SHARE ile çakışmaz).
      if (packageRow && !officePlan) await db.$queryRaw`SELECT "id" FROM "KullaniciUyelikPaketi" WHERE "kullaniciId" = ${userId} ORDER BY "id" FOR NO KEY UPDATE`;
      // Hak yazımı: ortak settlement (iyzico ile aynı kod yolu; değiştirilmedi)
      const settled = await this.membership.settlePaidOrder(order.id, db);

      if (officePlan) {
        // Ofis aboneliği/eklentisi: mağaza abonelik satırı (uyelikId yok) oluşturulur ve ilişkisel satıra bağlanır.
        const sub = await db.storeSubscription.upsert({
          where: { platform_abonelikKimligi: { platform: 'APPLE', abonelikKimligi: originalId } },
          create: { platform: 'APPLE', abonelikKimligi: originalId, kullaniciId: userId, uyelikId: null, magazaUrunKimligi: product.magazaUrunKimligi, durum: 'ACTIVE',
            otomatikYenileme: autoRenew, bitisTarihi: expires, ortam: env === 'SANDBOX' ? 'TEST' : 'LIVE', sonBildirimAt: input.eventAt },
          update: { magazaUrunKimligi: product.magazaUrunKimligi, durum: 'ACTIVE', otomatikYenileme: autoRenew, graceBitis: null, bitisTarihi: expires, sonBildirimAt: knownSub?.sonBildirimAt && knownSub.sonBildirimAt > input.eventAt ? knownSub.sonBildirimAt : input.eventAt },
        });
        await db.ofisAbonelik.updateMany({ where: { kaynakKanal: 'APPLE', kaynakAbonelikAnahtari: originalId }, data: { storeSubscriptionId: sub.id } });
        await db.ofisEklenti.updateMany({ where: { kaynakKanal: 'APPLE', kaynakAbonelikAnahtari: originalId }, data: { storeSubscriptionId: sub.id } });
      } else if (packageRow) {
        const settlement = await db.paymentSettlement.findUnique({ where: { orderId: order.id } });
        const uyelikId = settlement?.uyelikId ?? (settled as any)?.membershipId ?? null;
        if (uyelikId) {
          await db.kullaniciUyelikPaketi.update({ where: { id: uyelikId }, data: { kaynakKanal: PaymentChannel.APPLE, otomatikYenileme: autoRenew, ...(expires ? { bitisTarihi: expires } : {}) } });
          if (expires && settlement?.portfolioCreditLotId) await db.portfolioCreditLot.update({ where: { id: settlement.portfolioCreditLotId }, data: { sonKullanmaTarihi: expires } });
        }
        await db.storeSubscription.upsert({
          where: { platform_abonelikKimligi: { platform: 'APPLE', abonelikKimligi: originalId } },
          create: { platform: 'APPLE', abonelikKimligi: originalId, kullaniciId: userId, uyelikId, magazaUrunKimligi: product.magazaUrunKimligi, durum: 'ACTIVE',
            otomatikYenileme: autoRenew, bitisTarihi: expires, ortam: env === 'SANDBOX' ? 'TEST' : 'LIVE', sonBildirimAt: input.eventAt },
          update: { uyelikId, magazaUrunKimligi: product.magazaUrunKimligi, durum: 'ACTIVE', otomatikYenileme: autoRenew, graceBitis: null, bitisTarihi: expires, sonBildirimAt: knownSub?.sonBildirimAt && knownSub.sonBildirimAt > input.eventAt ? knownSub.sonBildirimAt : input.eventAt },
        });
      }
      return { kind: 'DONE' as const, orderId: order.id };
    }, { timeout: 20000 });
  }

  // ───────────────────────── REFUND / REVOKE ─────────────────────────

  private async revoke(apple: JWSTransactionDecodedPayload, type: string): Promise<string> {
    const transactionId = String(apple.transactionId);
    const grantKey = { platform_magazaIslemKimligi: { platform: 'APPLE' as const, magazaIslemKimligi: transactionId } };
    return this.prisma.$transaction(async (db) => {
      // Kilit sırası grant ile aynı: payment-user → store-apple-tx → store-apple-sub (→ PaymentOrder → wallet)
      const grant = await db.storeEntitlementGrant.findUnique({ where: grantKey, include: { order: true } });
      if (!grant) {
        // ODM-3F/K3: grant henüz yok → iadeyi kalıcı kaydet (tombstone); sonradan gelen grant bunu görüp reddeder
        await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`store-apple-tx:${transactionId}`}))`;
        if (await db.storeEntitlementGrant.findUnique({ where: grantKey })) throw new Error('REFUND_RACE_RETRY'); // grant bu sırada yazıldı → 5xx, Apple yeniden dener
        const provider = await db.paymentProvider.upsert({ where: { kod: PROVIDER_CODE }, update: {}, create: { kod: PROVIDER_CODE, ad: 'Apple App Store', adapterKodu: 'APPLE_ASN_V2' } });
        const hash = refundTombstoneHash(transactionId);
        await db.paymentWebhookEvent.upsert({
          where: { providerId_payloadHash: { providerId: provider.id, payloadHash: hash } }, update: {},
          create: { providerId: provider.id, payloadHash: hash, eventType: `REFUND_TOMBSTONE:${type}`.slice(0, 100), signatureValid: true, processed: true, processedAt: new Date(),
            payload: { transactionId, type } },
        });
        return 'GRANT_UNKNOWN_TOMBSTONED';
      }
      const order = grant.order;
      await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`payment-user:${order.kullaniciId}`}))`;
      await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`store-apple-tx:${transactionId}`}))`;
      const subKey = grant.abonelikKimligi ?? String(apple.originalTransactionId);
      await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`store-apple-sub:${subKey}`}))`;
      await db.$queryRaw`SELECT "id" FROM "PaymentOrder" WHERE "id" = ${order.id} FOR NO KEY UPDATE`;
      const fresh = await db.paymentOrder.findUnique({ where: { id: order.id } });
      if (!fresh || fresh.durum === PaymentOrderStatus.REFUNDED) return 'ALREADY_REFUNDED';
      await db.paymentOrder.update({ where: { id: order.id }, data: { durum: PaymentOrderStatus.REFUNDED, metadata: { ...jsonObject(fresh.metadata), refundedBy: type, refundedAt: new Date().toISOString() } } });

      // EPH-70B1F/D7: kilit sırası payment-user -> üyelik satırı -> wallet. Üyelik güncellemesi cüzdan kilidinden ÖNCE yapılır
      // (admin üyelik/PK yüklemesi ile ters sıra = deadlock döngüsü kapatıldı).
      // Üyelik: iade edilen dönem en son dönemse IPTAL
      const settlement = await db.paymentSettlement.findUnique({ where: { orderId: order.id } });
      if (settlement?.uyelikId) {
        const row = await db.kullaniciUyelikPaketi.findUnique({ where: { id: settlement.uyelikId } });
        const expires = dateOf(apple.expiresDate);
        if (row && row.durum !== UyelikDurumu.IPTAL && (!expires || !row.bitisTarihi || expires.getTime() >= row.bitisTarihi.getTime() - 60000)) {
          await db.kullaniciUyelikPaketi.update({ where: { id: row.id }, data: { durum: UyelikDurumu.IPTAL, otomatikYenileme: false } });
          await db.storeSubscription.updateMany({ where: { platform: 'APPLE', abonelikKimligi: subKey }, data: { durum: 'REVOKED', otomatikYenileme: false, sonBildirimAt: new Date() } });
        }
      }
      // EPH-70B2: ofis aboneliği/eklentisi iadesi -> ilgili dönem hakkı iptal (lotlar aşağıdaki ortak döngüde geri alınır; çift geri alma yok)
      if (fresh.hedefOfficeId) {
        const periodMeta = jsonObject(jsonObject(fresh.metadata).entitlementPeriod);
        const periodStart = typeof periodMeta.start === 'string' ? new Date(periodMeta.start) : null;
        const out = await this.officeEntitlements.expire(db, { officeId: fresh.hedefOfficeId, kanal: PaymentChannel.APPLE, kaynakAbonelikAnahtari: subKey, neden: 'IADE', reclaimLots: false,
          donemBaslangic: periodStart && Number.isFinite(periodStart.getTime()) ? periodStart : null, donemBitis: dateOf(apple.expiresDate), paymentOrderId: order.id });
        if (out.statusChanged) await db.storeSubscription.updateMany({ where: { platform: 'APPLE', abonelikKimligi: subKey }, data: { durum: 'REVOKED', otomatikYenileme: false, sonBildirimAt: new Date() } });
      }
      // PK lotları geri al: harcanmış kısım geri alınamaz, bakiye sıfırın altına düşmez (karar 5).
      // ODM-3F/K1: harcamayla AYNI cüzdan kilitleri (advisory wallet:{id} + satır FOR UPDATE); bakiye kilit ALTINDA okunur, çalışan bakiye izlenir.
      const lots = await db.portfolioCreditLot.findMany({ where: { paymentOrderId: order.id } });
      let granted = 0; let reclaimed = 0;
      // EPH-70B1/K1: ortak tek kilit sırası (wallet-lots.lockWallet); lot kalanları harcamayla azaldığı için yalnız bu siparişin KALAN lotu düşer.
      const wallet = lots.length > 0 ? await lockWallet(db, order.kullaniciId) : null;
      if (lots.length > 0) { for (let i = 0; i < lots.length; i++) lots[i] = (await db.portfolioCreditLot.findUnique({ where: { id: lots[i].id } })) ?? lots[i]; }
      let balance = wallet?.bakiye ?? 0;
      for (const lot of lots) {
        granted += lot.ilkMiktar;
        const dec = wallet ? Math.max(0, Math.min(lot.kalanMiktar, balance)) : 0;
        await db.portfolioCreditLot.update({ where: { id: lot.id }, data: { kalanMiktar: 0, aktifMi: false } });
        if (wallet && dec > 0) {
          await db.kontorCuzdani.update({ where: { id: wallet.id }, data: { bakiye: { decrement: dec } } });
          await db.kontorHareketi.create({ data: { kullaniciId: order.kullaniciId, hareketTuru: KontorHareketTuru.DUZELTME, islemTuru: KontorIslemTuru.DIGER,
            miktar: dec, oncekiBakiye: balance, sonrakiBakiye: balance - dec, aciklama: `Apple ${type}: PK geri alındı`,
            ilgiliKayitTuru: 'PAYMENT_ORDER', ilgiliKayitId: order.id } });
          balance -= dec;
        }
        reclaimed += dec;
      }
      const shortfall = granted - reclaimed;
      if (shortfall > 0) {
        await db.auditLog.create({ data: { targetUserId: order.kullaniciId, action: AuditAction.UPDATE_SYSTEM_SETTING, entityType: 'PaymentOrder', entityId: order.id,
          description: `Apple ${type}: harcanmış PK geri alınamadı (bakiye sıfırda bırakıldı)`,
          metadata: { key: 'STORE_REFUND_SHORTFALL', platform: 'APPLE', transactionId, granted, reclaimed, shortfall } } });
      }

      return shortfall > 0 ? 'REFUNDED_WITH_SHORTFALL' : 'REFUNDED';
    }, { timeout: 20000 });
  }

  // ───────────────────────── Kayıt (reddedilen doğrulama / bildirim) ─────────────────────────

  private async reject(eventType: string, data: Record<string, unknown>): Promise<void> {
    try {
      const provider = await this.prisma.paymentProvider.upsert({ where: { kod: PROVIDER_CODE }, update: {}, create: { kod: PROVIDER_CODE, ad: 'Apple App Store', adapterKodu: 'APPLE_ASN_V2' } });
      const hash = digest({ eventType, ...data });
      await this.prisma.paymentWebhookEvent.upsert({
        where: { providerId_payloadHash: { providerId: provider.id, payloadHash: hash } }, update: {},
        create: { providerId: provider.id, payloadHash: hash, eventType, signatureValid: true, processed: true, processedAt: new Date(),
          errorMessage: String(data.code ?? 'REJECTED'), payload: data as Prisma.InputJsonObject },
      });
    } catch { this.logger.warn('APPLE_REJECT_RECORD_FAILED'); }
  }
}
