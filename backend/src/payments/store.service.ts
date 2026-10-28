import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, Logger, NotFoundException, OnApplicationBootstrap, OnModuleDestroy, ServiceUnavailableException } from '@nestjs/common';
import { Prisma, UyelikPaketKodu } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { MembershipService } from '../membership/membership.service';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentService } from './payment.service';
import { jsonObject } from './payment.rules';
import { StoreIntentDto, StoreMode, StorePlatform, StoreProductDto, StoreSettingsDto, StoreVerifyDto } from './store.dto';
import { STORE_GATEWAY, StoreGateway, StoreProof } from './store.gateway';

export const STORE_SETTINGS_KEY = 'EPH_STORE_SETTINGS_V1';

@Injectable()
export class StorePaymentService implements OnApplicationBootstrap, OnModuleDestroy {
  private timer?: ReturnType<typeof setInterval>;
  private working?: Promise<void>;
  private stopping = false;
  private readonly verificationBudget = new Map<string, { until: number; count: number }>();
  private readonly logger = new Logger(StorePaymentService.name);
  constructor(private readonly prisma: PrismaService, private readonly membership: MembershipService,
    private readonly payments: PaymentService, @Inject(STORE_GATEWAY) private readonly gateway: StoreGateway) {}

  onApplicationBootstrap() { this.timer = setInterval(() => { void this.tick(); }, 30000); this.timer.unref(); }
  async onModuleDestroy() { this.stopping = true; if (this.timer) clearInterval(this.timer); await this.working; }
  private mode(): StoreMode { return process.env.EPH_STORE_MODE === 'live' ? 'live' : 'sandbox'; }
  private async settings(db: Prisma.TransactionClient | PrismaService = this.prisma) {
    const row = await db.systemSetting.findUnique({ where: { key: STORE_SETTINGS_KEY } });
    const value = jsonObject(row?.valueJson);
    return { approved: value.approved === true, products: (Array.isArray(value.products) ? value.products : []) as unknown as StoreProductDto[] };
  }
  async adminSettings() {
    const value = await this.settings();
    return { ...value, mode: this.mode(), enabled: process.env.EPH_STORE_ENABLED === 'true',
      readiness: { APPLE: this.gateway.ready('APPLE', this.mode()), GOOGLE: this.gateway.ready('GOOGLE', this.mode()) } };
  }
  async saveSettings(actor: string, dto: StoreSettingsDto) {
    const keys = dto.products.map((p) => `${p.platform}:${p.sku}`);
    if (new Set(keys).size !== keys.length || dto.products.some((p) => p.kind === 'MEMBERSHIP' && (!p.segment || p.productCode === 'DENEME'))) throw new BadRequestException('Mağaza ürün eşleştirmeleri geçersiz.');
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('EPH_STORE_SETTINGS_V1'))`;
      const previous = await this.settings(tx);
      for (const product of dto.products) {
        const old = previous.products.find((p) => p.platform === product.platform && p.sku === product.sku);
        if (old && (old.kind !== product.kind || old.productCode !== product.productCode || old.segment !== product.segment)) {
          const used = await tx.paymentOrder.findFirst({ where: { AND: [
            { metadata: { path: ['storeSku'], equals: product.sku } }, { metadata: { path: ['storePlatform'], equals: product.platform } },
          ] } });
          if (used) throw new BadRequestException('Kullanılmış mağaza SKU’su başka ürüne bağlanamaz. Yeni SKU tanımlayın.');
        }
        const historical = await tx.paymentOrder.findFirst({ where: { AND: [
          { metadata: { path: ['storeSku'], equals: product.sku } }, { metadata: { path: ['storePlatform'], equals: product.platform } },
        ] } });
        if (historical) {
          const meta = jsonObject(historical.metadata); const snapshot = jsonObject(historical.fiyatSnapshot);
          if (meta.storeKind !== product.kind || (snapshot.code || snapshot.paketKodu) !== product.productCode ||
            (product.kind === 'MEMBERSHIP' && snapshot.segment !== product.segment)) throw new BadRequestException('Kullanılmış mağaza SKU’su yeniden eşleştirilemez.');
        }
      }
      const value = { approved: dto.approved, products: dto.products.map((p) => ({ ...p })) } as Prisma.InputJsonObject;
      await tx.systemSetting.upsert({ where: { key: STORE_SETTINGS_KEY }, create: { key: STORE_SETTINGS_KEY, valueJson: value, updatedById: actor }, update: { valueJson: value, updatedById: actor } });
      await tx.systemSetting.create({ data: { key: `EPH_STORE_SETTINGS_AUDIT_${randomUUID()}`, valueJson: value, updatedById: actor } });
      return { saved: true };
    }, { timeout: 20000 });
  }
  async catalog(userId: string, platform: StorePlatform) {
    if (!['APPLE', 'GOOGLE'].includes(platform)) throw new BadRequestException('Geçersiz mağaza.');
    const [settings, legal, user] = await Promise.all([this.settings(), this.payments.settings(), this.prisma.user.findUnique({ where: { id: userId }, select: { hesapTuru: true } })]);
    if (!user) throw new ForbiddenException('Hesap bulunamadı.');
    let membershipPackages: any[] = [];
    try { membershipPackages = (await this.membership.getPackages(userId)).packages; }
    catch (error) { if (!(error instanceof ForbiddenException)) throw error; }
    const products = settings.products.filter((p) => p.platform === platform && p.active).flatMap((p) => {
      if (p.kind === 'PK') {
        const pk = legal.pkProducts.find((v) => v.code === p.productCode && v.active);
        return pk ? [{ ...p, name: pk.name, credits: pk.credits, durationMonths: null }] : [];
      }
      const plan = membershipPackages.find((v) => v.paketKodu === p.productCode && v.segment === p.segment && v.aktifMi && Number(v.fiyat) > 0);
      return plan ? [{ ...p, name: plan.paketAdi, credits: plan.aylikPaketPk, durationMonths: 1 }] : [];
    });
    const mode = this.mode();
    return { platform, mode, terms: legal.terms, termsVersion: legal.termsVersion, products,
      enabled: process.env.EPH_STORE_ENABLED === 'true' && settings.approved && legal.approved && this.gateway.ready(platform, mode) && (mode !== 'sandbox' || user.hesapTuru === 'TEST') };
  }
  async intent(userId: string, dto: StoreIntentDto) {
    const catalog = await this.catalog(userId, dto.platform);
    if (!catalog.enabled) throw new ServiceUnavailableException('Mağaza satışı henüz kullanıma açılmadı.');
    if (dto.acceptedTerms !== true || dto.termsVersion !== catalog.termsVersion) throw new ConflictException('Güncel koşulları okuyup onaylayın.');
    const product = catalog.products.find((p) => p.sku === dto.sku);
    if (!product) throw new NotFoundException('Satın alınabilir mağaza ürünü bulunamadı.');
    const order = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`payment-user:${userId}`}))`;
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('EPH_STORE_SETTINGS_V1'))`;
      const currentSettings = await this.settings(tx);
      const currentProduct = currentSettings.products.find((p) => p.platform === dto.platform && p.sku === dto.sku && p.active);
      if (!currentSettings.approved || !currentProduct || currentProduct.kind !== product.kind || currentProduct.productCode !== product.productCode || currentProduct.segment !== product.segment) {
        throw new ConflictException('Mağaza ürün bilgileri değişti. Paketleri yenileyin.');
      }
      const existing = await tx.paymentOrder.findFirst({ where: { kullaniciId: userId, durum: { in: ['CREATED', 'PENDING'] },
        AND: [{ metadata: { path: ['storePlatform'], equals: dto.platform } }, { metadata: { path: ['storeSku'], equals: dto.sku } }], expiresAt: { gt: new Date() } }, orderBy: { olusturulmaTarihi: 'desc' } });
      if (existing) return { ...existing, resumed: true };
      const recent = await tx.paymentOrder.count({ where: { kullaniciId: userId, olusturulmaTarihi: { gt: new Date(Date.now() - 600000) } } });
      if (recent >= 10) throw new ConflictException('Çok sayıda satın alma denemesi var. Birkaç dakika sonra tekrar deneyin.');
      let created: any;
      if (product.kind === 'MEMBERSHIP') {
        const result = await this.membership.createPaymentOrder(userId, { paketKodu: product.productCode as UyelikPaketKodu }, tx);
        created = await tx.paymentOrder.findUniqueOrThrow({ where: { id: result.order.id } });
        if (jsonObject(created.fiyatSnapshot).segment !== product.segment) throw new BadRequestException('Üyelik segmenti eşleşmiyor.');
      } else {
        created = await tx.paymentOrder.create({ data: { siparisNo: `EPH-STORE-${randomUUID()}`, kullaniciId: userId, amac: 'PK_PURCHASE',
          tutar: 0, paraBirimi: 'TRY', pkMiktari: product.credits,
          fiyatSnapshot: { code: product.productCode, paketAdi: product.name, credits: product.credits } } });
      }
      const provider = await tx.paymentProvider.upsert({ where: { kod: `${dto.platform}_${catalog.mode.toUpperCase()}` }, update: {},
        create: { kod: `${dto.platform}_${catalog.mode.toUpperCase()}`, ad: dto.platform === 'APPLE' ? 'App Store' : 'Google Play', adapterKodu: 'OFFICIAL_STORE_V1' } });
      if (!provider.aktifMi) throw new ServiceUnavailableException('Mağaza sağlayıcısı kapalı.');
      const result = await tx.paymentOrder.update({ where: { id: created.id }, data: { durum: 'PENDING', expiresAt: new Date(Date.now() + 30 * 60000),
        metadata: { ...jsonObject(created.metadata), channel: dto.platform, paymentMode: catalog.mode, storePlatform: dto.platform, storeSku: dto.sku,
          storeKind: product.kind, termsVersion: catalog.termsVersion, consentAt: new Date().toISOString(), terms: catalog.terms as Prisma.InputJsonObject } } });
      await tx.paymentAttempt.create({ data: { orderId: created.id, providerId: provider.id, durum: 'REQUIRES_ACTION',
        idempotencyKey: `store-intent:${created.id}`, publicMetadata: { platform: dto.platform, sku: dto.sku } } });
      return { ...result, resumed: false };
    }, { timeout: 20000 });
    return { orderId: order.id, sku: dto.sku, mode: catalog.mode, resumed: order.resumed, appAccountToken: order.id,
      obfuscatedAccountId: this.gateway.accountToken(userId), obfuscatedProfileId: order.id };
  }

  async cancel(userId: string, orderId: string) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "PaymentOrder" WHERE "id" = ${orderId} FOR UPDATE`;
      const order = await tx.paymentOrder.findFirst({ where: { id: orderId, kullaniciId: userId } });
      if (!order || !['APPLE', 'GOOGLE'].includes(String(jsonObject(order.metadata).channel))) throw new NotFoundException('Mağaza işlemi bulunamadı.');
      if (['CREATED', 'PENDING'].includes(order.durum)) await tx.paymentOrder.update({ where: { id: orderId }, data: { durum: 'CANCELLED' } });
      return { cancelled: true };
    }, { timeout: 20000 });
  }
  private async validateProof(userId: string, proof: StoreProof) {
    if (!/^[a-f0-9-]{36}$/i.test(proof.intentId)) throw new BadRequestException('Mağaza hesap bağlantısı geçersiz.');
    const order = await this.prisma.paymentOrder.findFirst({ where: { id: proof.intentId, kullaniciId: userId }, include: { attempts: { take: 1 }, settlement: true } });
    if (!order) throw new ForbiddenException('Bu mağaza işlemi bu hesaba ait değil.');
    const meta = jsonObject(order.metadata);
    if (meta.storePlatform !== proof.platform || meta.storeSku !== proof.sku || meta.paymentMode !== proof.mode ||
      (proof.platform === 'GOOGLE' && proof.accountToken !== this.gateway.accountToken(userId)) ||
      (proof.platform === 'APPLE' && proof.productType !== (meta.storeKind === 'PK' ? 'CONSUMABLE' : 'NON_RENEWING'))) throw new BadRequestException('Mağaza ürünü veya hesap bağlantısı eşleşmiyor.');
    if (!proof.pending && new Date(proof.purchasedAt).getTime() + 60000 < order.olusturulmaTarihi.getTime()) throw new BadRequestException('Mağaza işlemi siparişten önce oluşturulmuş.');
    if (proof.mode === 'sandbox') {
      const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { hesapTuru: true } });
      if (user?.hesapTuru !== 'TEST') throw new ForbiddenException('Deneme mağaza işlemleri yalnız TEST hesabında kullanılabilir.');
    }
    return order;
  }
  async verify(userId: string, dto: StoreVerifyDto) {
    const now = Date.now();
    for (const [id, value] of this.verificationBudget) if (value.until < now) this.verificationBudget.delete(id);
    const budget = this.verificationBudget.get(userId) || { until: now + 60000, count: 0 };
    if (++budget.count > 60 || (!this.verificationBudget.has(userId) && this.verificationBudget.size >= 10000)) throw new ConflictException('Çok sık işlem kontrolü yapıldı. Bir dakika sonra tekrar deneyin.');
    this.verificationBudget.set(userId, budget);
    const owned = await this.prisma.paymentOrder.findFirst({ where: { kullaniciId: userId, AND: [
      { metadata: { path: ['storePlatform'], equals: dto.platform } }, { metadata: { path: ['storeSku'], equals: dto.sku } },
    ] }, select: { id: true } });
    if (!owned) throw new NotFoundException('Bu hesapta eşleştirilecek mağaza siparişi bulunamadı.');
    const proof = await this.gateway.verify(dto);
    const order = await this.validateProof(userId, proof);
    const attempt = order.attempts[0];
    if (!attempt) throw new BadRequestException('Mağaza sipariş oturumu bulunamadı.');
    const sealed = this.gateway.seal(dto);
    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`payment-user:${userId}`}))`;
      await tx.$queryRaw`SELECT "id" FROM "PaymentOrder" WHERE "id" = ${order.id} FOR UPDATE`;
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`payment-reference:${attempt.providerId}:${proof.reference}`}))`;
      const fresh = await tx.paymentOrder.findUniqueOrThrow({ where: { id: order.id }, include: { settlement: true } });
      const currentAttempt = await tx.paymentAttempt.findUniqueOrThrow({ where: { id: attempt.id } });
      const duplicate = await tx.paymentTransaction.findFirst({ where: { providerId: attempt.providerId, providerTransactionId: proof.reference, islemTuru: 'PAYMENT' } });
      if (duplicate && duplicate.orderId !== order.id) throw new ConflictException('Mağaza makbuzu başka siparişte kullanılmış.');
      if (currentAttempt.providerReference && currentAttempt.providerReference !== proof.reference) throw new ConflictException('Bu siparişte başka mağaza makbuzu var.');
      if (proof.revoked) {
        if (!fresh.paidAt && proof.paymentConfirmed) {
          const amount = new Prisma.Decimal(proof.amount);
          if (amount.lt(0) || amount.gt(1000000000) || !/^[A-Z]{3}$/.test(proof.currency)) throw new BadRequestException('Mağaza tutarı geçersiz.');
          if (!duplicate) await tx.paymentTransaction.create({ data: { orderId: order.id, attemptId: attempt.id, providerId: attempt.providerId,
            providerTransactionId: proof.reference, islemTuru: 'PAYMENT', durum: 'SUCCEEDED', tutar: amount, paraBirimi: proof.currency, processedAt: new Date(proof.purchasedAt) } });
          await tx.paymentOrder.update({ where: { id: order.id }, data: { tutar: amount, paraBirimi: proof.currency, paidAt: new Date(proof.purchasedAt) } });
          fresh.tutar = amount; fresh.paraBirimi = proof.currency; fresh.paidAt = new Date(proof.purchasedAt);
        }
        await tx.paymentAttempt.update({ where: { id: attempt.id }, data: { checkoutReference: sealed, providerReference: proof.reference,
          durum: 'SUCCEEDED', publicMetadata: { ...jsonObject(currentAttempt.publicMetadata), consumed: proof.platform === 'APPLE' || jsonObject(currentAttempt.publicMetadata).consumed === true } } });
        await this.recordRevocation(tx, fresh, proof);
        return;
      }
      if (['REFUNDED', 'PARTIALLY_REFUNDED'].includes(fresh.durum)) return;
      await tx.paymentAttempt.update({ where: { id: attempt.id }, data: { checkoutReference: sealed, providerReference: proof.reference,
        durum: proof.pending ? 'PENDING' : 'SUCCEEDED', publicMetadata: { ...jsonObject(currentAttempt.publicMetadata), consumed: proof.platform === 'APPLE' || jsonObject(currentAttempt.publicMetadata).consumed === true }, guncellenmeTarihi: new Date() } });
      if (proof.pending) return;
      const amount = new Prisma.Decimal(proof.amount);
      if (amount.lt(0) || amount.gt(1000000000) || !/^[A-Z]{3}$/.test(proof.currency)) throw new BadRequestException('Mağaza tutarı geçersiz.');
      if (duplicate && (!new Prisma.Decimal(duplicate.tutar).eq(amount) || duplicate.paraBirimi !== proof.currency)) throw new ConflictException('Mağaza tutarı daha önceki kayıtla eşleşmiyor.');
      if (!duplicate) await tx.paymentTransaction.create({ data: { orderId: order.id, attemptId: attempt.id, providerId: attempt.providerId,
        providerTransactionId: proof.reference, islemTuru: 'PAYMENT', durum: 'SUCCEEDED', tutar: amount, paraBirimi: proof.currency,
        processedAt: new Date(proof.purchasedAt), metadata: { platform: proof.platform, sku: proof.sku, verifiedAt: new Date().toISOString() } } });
      await tx.paymentOrder.update({ where: { id: order.id }, data: { durum: 'PAID', tutar: amount, paraBirimi: proof.currency, paidAt: new Date(proof.purchasedAt) } });
    }, { timeout: 20000 });
    const fresh = await this.prisma.paymentOrder.findUniqueOrThrow({ where: { id: order.id } });
    if (fresh.durum === 'PAID') {
      await this.membership.settlePaidOrder(order.id);
      if (dto.platform === 'GOOGLE' && dto.purchaseToken && jsonObject(attempt.publicMetadata).consumed !== true) {
        // Delivery is committed before consumption. A failed consumption is retried by the worker.
        try {
          await this.gateway.consume(dto.sku, dto.purchaseToken);
          await this.prisma.paymentAttempt.update({ where: { id: attempt.id }, data: { publicMetadata: { ...jsonObject(attempt.publicMetadata), consumed: true } } });
        } catch { this.logger.warn(`STORE_CONSUMPTION_RETRY:${order.id}`); }
      }
    }
    const result = await this.payments.order(userId, order.id);
    const savedAttempt = await this.prisma.paymentAttempt.findUniqueOrThrow({ where: { id: attempt.id } });
    return { ...result, finishAllowed: (result.status === 'PAID' && result.settled) || ['REFUNDED', 'PARTIALLY_REFUNDED'].includes(result.status),
      storeFinalized: dto.platform === 'GOOGLE' && jsonObject(savedAttempt.publicMetadata).consumed === true,
      isConsumable: dto.platform === 'GOOGLE' || jsonObject(order.metadata).storeKind === 'PK' };
  }

  private async recordRevocation(tx: Prisma.TransactionClient, order: any, proof: StoreProof) {
    if (order.durum === 'REFUNDED') return;
    const meta = jsonObject(order.metadata);
    const partial = proof.partialRevocation === true && proof.refundMilliPercent !== 100000;
    const previous = Number(meta.storeRefundMilliPercent || 0);
    const fraction = proof.refundMilliPercent ?? (partial ? null : 100000);
    if (partial && !fraction) {
      await tx.paymentOrder.update({ where: { id: order.id }, data: { durum: 'PARTIALLY_REFUNDED',
        metadata: { ...meta, requiresRefundReview: true, storePartialRefundUnknown: true } } });
      return;
    }
    if (fraction !== null && fraction <= previous) return;
    await tx.paymentOrder.update({ where: { id: order.id }, data: { durum: order.paidAt ? 'REFUNDED' : 'CANCELLED',
      metadata: { ...meta, storeRefundMilliPercent: fraction, storeRevokedAt: new Date().toISOString(), requiresRefundReview: !!order.settlement || partial } } });
    if (partial) await tx.paymentOrder.update({ where: { id: order.id }, data: { durum: 'PARTIALLY_REFUNDED' } });
    if (!order.paidAt) return;
    const amount = new Prisma.Decimal(order.tutar).mul((fraction ?? 100000) - previous).div(100000);
    await tx.paymentRefund.create({ data: { orderId: order.id, durum: 'SUCCEEDED', tutar: amount, paraBirimi: order.paraBirimi,
      providerRefundId: `${proof.reference}:${fraction}`, sebep: partial ? 'Mağaza tarafından kısmi iade doğrulandı.' : 'Mağaza tarafından iade/iptal doğrulandı.', metadata: { requiresEntitlementReview: !!order.settlement || partial } } });
    if (partial) return;
    // Revoke the unspent grant immediately. Used PK and stacked membership
    // periods require an explicit review rather than altering unrelated grants.
    const lots = await tx.portfolioCreditLot.findMany({ where: { paymentOrderId: order.id, aktifMi: true } });
    await tx.$queryRaw`SELECT "id" FROM "KontorCuzdani" WHERE "kullaniciId" = ${order.kullaniciId} FOR UPDATE`;
    const wallet = await tx.kontorCuzdani.findUnique({ where: { kullaniciId: order.kullaniciId } });
    const unspent = lots.reduce((sum, lot) => sum + lot.kalanMiktar, 0);
    if (wallet && unspent > 0) {
      const amount = Math.min(unspent, wallet.bakiye);
      await tx.kontorCuzdani.update({ where: { id: wallet.id }, data: { bakiye: { decrement: amount } } });
      await tx.kontorHareketi.create({ data: { kullaniciId: order.kullaniciId, hareketTuru: 'IADE', islemTuru: 'DIGER', miktar: -amount,
        oncekiBakiye: wallet.bakiye, sonrakiBakiye: wallet.bakiye - amount, ilgiliKayitTuru: 'PAYMENT_REFUND', ilgiliKayitId: order.id, aciklama: 'Mağaza iadesi nedeniyle kullanılmamış PK geri alındı.' } });
    }
    await tx.portfolioCreditLot.updateMany({ where: { paymentOrderId: order.id }, data: { aktifMi: false, kalanMiktar: 0 } });
    if (order.amac === 'MEMBERSHIP_PURCHASE' && order.settlement?.uyelikId) {
      const later = await tx.paymentSettlement.findFirst({ where: { kullaniciId: order.kullaniciId, orderId: { not: order.id }, uyelikId: order.settlement.uyelikId, settledAt: { gte: order.settlement.settledAt } } });
      if (!later) await tx.kullaniciUyelikPaketi.updateMany({ where: { id: order.settlement.uyelikId, durum: 'AKTIF' }, data: { durum: 'PASIF', bitisTarihi: new Date() } });
    }
    await tx.systemSetting.upsert({ where: { key: `EPH_STORE_REFUND_REVIEW_${order.id}` },
      create: { key: `EPH_STORE_REFUND_REVIEW_${order.id}`, valueJson: { orderId: order.id, userId: order.kullaniciId, requiresReview: true, reason: 'Store refund: remaining entitlements and used PK need review.' } }, update: {} });
  }
  async refresh(userId: string, orderId: string) {
    const order = await this.payments.order(userId, orderId);
    if (!['APPLE', 'GOOGLE'].includes(order.channel)) return this.payments.refresh(userId, orderId);
    const attempt = await this.prisma.paymentAttempt.findFirst({ where: { orderId }, orderBy: { olusturulmaTarihi: 'desc' } });
    if (attempt?.checkoutReference && attempt.guncellenmeTarihi.getTime() < Date.now() - 10000) return this.verify(userId, this.gateway.unseal(attempt.checkoutReference));
    return order;
  }
  private async tick() {
    if (this.stopping || this.working) return;
    this.working = this.reconcile().catch(() => { this.logger.warn('STORE_RECONCILE_RETRY'); });
    try { await this.working; } finally { this.working = undefined; }
  }
  private async reconcile() {
    const rows = await this.prisma.paymentAttempt.findMany({ where: { provider: { adapterKodu: 'OFFICIAL_STORE_V1' }, checkoutReference: { not: null },
      OR: [{ order: { settlement: null, durum: { not: 'PARTIALLY_REFUNDED' } } }, { publicMetadata: { path: ['consumed'], equals: false } }, { guncellenmeTarihi: { lt: new Date(Date.now() - 24 * 3600000) } }],
      order: { durum: { in: ['CREATED', 'PENDING', 'PAID', 'EXPIRED', 'PARTIALLY_REFUNDED'] } }, guncellenmeTarihi: { lt: new Date(Date.now() - 30000) } },
      include: { order: true }, orderBy: { guncellenmeTarihi: 'asc' }, take: 5 });
    for (const row of rows) {
      if (this.stopping) break;
      try { await this.verify(row.order.kullaniciId, this.gateway.unseal(row.checkoutReference)); }
      catch { this.logger.warn(`STORE_RECONCILE_PENDING:${row.orderId}`); }
      await this.prisma.paymentAttempt.update({ where: { id: row.id }, data: { guncellenmeTarihi: new Date() } });
    }
  }
}
