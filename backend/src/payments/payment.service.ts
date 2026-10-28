import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, Logger, NotFoundException, OnApplicationBootstrap, OnModuleDestroy, ServiceUnavailableException } from '@nestjs/common';
import { AuditAction, PaymentAttemptStatus, PaymentOrderPurpose, PaymentOrderStatus, PaymentTransactionStatus, PaymentTransactionType, Prisma, UyelikPaketKodu } from '@prisma/client';
import { isIP } from 'node:net';
import { randomUUID } from 'node:crypto';
import { MembershipService } from '../membership/membership.service';
import { PrismaService } from '../prisma/prisma.service';
import { CheckoutDto, PaymentSettingsDto, MembershipPackageSettingsDto } from './payment.dto';
import { PAYMENT_GATEWAY, PaymentGateway } from './iyzico.gateway';
import { DEFAULT_PAYMENT_TERMS, PAYMENT_SETTINGS_KEY, digest, equalMoney, jsonObject, money, termsVersion } from './payment.rules';

@Injectable()
export class PaymentService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(PaymentService.name);
  private timer?: ReturnType<typeof setInterval>;
  private working?: Promise<void>;
  private stopping = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly membership: MembershipService,
    @Inject(PAYMENT_GATEWAY) private readonly gateway: PaymentGateway,
  ) {}

  onApplicationBootstrap() {
    this.timer = setInterval(() => { void this.tick(); }, 30000);
    this.timer.unref();
  }
  async onModuleDestroy() {
    this.stopping = true;
    if (this.timer) clearInterval(this.timer);
    await this.working;
  }

  private webOrigin(): string {
    const url = new URL(process.env.EPH_PAYMENT_WEB_ORIGIN || 'https://emlakportfoyhavuzu.com');
    if (url.protocol !== 'https:' || url.pathname !== '/' || url.search || url.hash || url.username || url.password) {
      throw new ServiceUnavailableException('Ödeme dönüş adresi yapılandırılmamış.');
    }
    return url.origin;
  }

  resultUrl(orderId?: string): string {
    return `${this.webOrigin()}/odeme${orderId ? `?order=${encodeURIComponent(orderId)}` : ''}`;
  }

  private callbackUrl(): string {
    const url = new URL(process.env.IYZICO_CALLBACK_URL || `${this.webOrigin()}/api/payments/iyzico/callback`);
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) {
      throw new ServiceUnavailableException('Ödeme bildirim adresi yapılandırılmamış.');
    }
    return url.toString();
  }

  async settings() {
    const row = await this.prisma.systemSetting.findUnique({ where: { key: PAYMENT_SETTINGS_KEY } });
    const value = jsonObject(row?.valueJson);
    const terms = value.terms ? jsonObject(value.terms) : DEFAULT_PAYMENT_TERMS;
    return {
      approved: value.approved === true,
      terms, termsVersion: termsVersion(terms),
      pkProducts: Array.isArray(value.pkProducts) ? value.pkProducts as Array<{ code: string; name: string; credits: number; amountMinor: number; active: boolean }> : [],
      mode: this.gateway.mode(), enabled: this.gateway.ready() && value.approved === true,
    };
  }

  async saveSettings(userId: string, dto: PaymentSettingsDto) {
    if (new Set(dto.pkProducts.map((p) => p.code)).size !== dto.pkProducts.length) {
      throw new BadRequestException('PK ürün kodları benzersiz olmalıdır.');
    }
    const terms = {
      seller: { name: dto.sellerName, address: dto.sellerAddress, taxOffice: dto.taxOffice, taxNumber: dto.taxNumber,
        registryNumber: dto.registryNumber, email: dto.email, phone: dto.phone },
      delivery: dto.delivery, refunds: dto.refunds, sales: dto.sales, privacy: dto.privacy,
    };
    await this.prisma.$transaction(async (tx) => {
      const before = await tx.systemSetting.findUnique({ where: { key: PAYMENT_SETTINGS_KEY } });
      const previous = jsonObject(before?.valueJson);
      const next = { approved: dto.approved, pkProducts: dto.pkProducts.map((p) => ({ ...p })), terms };
      const saved = await tx.systemSetting.upsert({
        where: { key: PAYMENT_SETTINGS_KEY },
        create: { key: PAYMENT_SETTINGS_KEY, valueJson: next, updatedById: userId },
        update: { valueJson: next, updatedById: userId },
      });
      await tx.auditLog.create({ data: { actorId: userId, action: AuditAction.UPDATE_SYSTEM_SETTING, entityType: 'SystemSetting', entityId: saved.id,
        description: `Ödeme ayarları güncellendi: ${PAYMENT_SETTINGS_KEY}`,
        metadata: JSON.parse(JSON.stringify({ key: PAYMENT_SETTINGS_KEY,
          previousValue: { approved: previous.approved ?? null, pkProducts: previous.pkProducts ?? [], termsVersion: termsVersion(previous.terms) },
          newValue: { approved: next.approved, pkProducts: next.pkProducts, termsVersion: termsVersion(terms) } })) } });
    });
    return this.settings();
  }

  async membershipPrices() {
    const packages = await this.prisma.uyelikPaketi.findMany({ orderBy: [{ segment: 'asc' }, { paketKodu: 'asc' }] });
    return packages.map((p) => ({ id: p.id, code: p.paketKodu, segment: p.segment, name: p.paketAdi,
      amountMinor: p.fiyat ? new Prisma.Decimal(p.fiyat).mul(100).toNumber() : null, active: p.aktifMi, currency: p.paraBirimi }));
  }

  async saveMembershipPrice(actor: string, id: string, amountMinor: number, active: boolean) {
    return this.prisma.$transaction(async (tx) => {
      const old = await tx.uyelikPaketi.findUnique({ where: { id } });
      if (!old || old.paketKodu === 'DENEME') throw new BadRequestException('Ücretli üyelik paketi seçilmelidir.');
      await tx.uyelikPaketi.update({ where: { id }, data: { fiyat: new Prisma.Decimal(amountMinor).div(100), paraBirimi: 'TRY', aktifMi: active } });
      await tx.systemSetting.create({ data: { key: `EPH_PAYMENT_PRICE_AUDIT_${randomUUID()}`, updatedById: actor,
        valueJson: { packageId: id, oldPrice: old.fiyat?.toString() || null, oldActive: old.aktifMi, amountMinor, active } } });
      await tx.auditLog.create({ data: { actorId: actor, action: AuditAction.UPDATE_SYSTEM_SETTING, entityType: 'UyelikPaketi', entityId: id,
        description: `Üyelik fiyatı güncellendi: ${old.paketKodu}`,
        metadata: { key: `UyelikPaketi.fiyat:${old.segment}:${old.paketKodu}`, previousValue: { fiyat: old.fiyat?.toString() || null, aktifMi: old.aktifMi },
          newValue: { fiyat: new Prisma.Decimal(amountMinor).div(100).toString(), aktifMi: active } } } });
      return { saved: true };
    });
  }

  async publicCatalog() {
    const [settings, packages, officePackages] = await Promise.all([
      this.settings(),
      this.prisma.uyelikPaketi.findMany({
        where: { aktifMi: true },
        orderBy: [{ segment: 'asc' }, { fiyat: 'asc' }, { paketKodu: 'asc' }],
        select: {
          paketKodu: true, segment: true, paketAdi: true, fiyat: true, paraBirimi: true,
          aktifPortfoyLimiti: true, aktifCrmLimiti: true, aylikPaketPk: true,
          projeLimiti: true, projeIlanLimiti: true, denemeGunSayisi: true, aylikTalepLimiti: true, aylikHavuzGonderimLimiti: true,
        },
      }),
      this.membership.getOfficePackages(),
    ]);
    return {
      paymentEnabled: settings.enabled,
      pkProducts: settings.pkProducts.filter((p) => p.active && p.code === 'PK_1000_STANDARD').map((p) => ({ name: p.name, credits: p.credits, price: p.amountMinor / 100 })),
      packages: packages.map((item) => {
        const agents = Array.isArray(officePackages)
          ? (officePackages as Array<{ code: string; agents?: unknown }>).find((office) => office.code === item.paketKodu)?.agents
          : null;
        return {
          ...item,
          fiyat: item.fiyat === null ? null : Number(item.fiyat),
          ofisAltKullaniciLimiti: item.segment === 'EMLAK_PRO' && typeof agents === 'number' && Number.isFinite(agents) && agents >= 0 ? agents : null,
        };
      }),
    };
  }

  async adminMembershipPackages() {
    const [packages, officePackages] = await Promise.all([
      this.prisma.uyelikPaketi.findMany({ orderBy: [{ segment: 'asc' }, { fiyat: 'asc' }] }),
      this.membership.getOfficePackages(),
    ]);
    return packages.map((item) => {
      const office = Array.isArray(officePackages) ? (officePackages as Array<{code:string;agents?:unknown}>).find((p) => p.code === item.paketKodu) : undefined;
      return { ...item, fiyat: item.fiyat === null ? null : Number(item.fiyat), ofisAltKullaniciLimiti: item.segment === 'EMLAK_PRO' && typeof office?.agents === 'number' ? office.agents : null };
    });
  }

  async saveMembershipPackage(actor: string, id: string, dto: MembershipPackageSettingsDto) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "UyelikPaketi" WHERE "id" = ${id} FOR UPDATE`;
      const before = await tx.uyelikPaketi.findUnique({ where: { id } });
      if (!before) throw new NotFoundException('Paket bulunamadı.');
      if (before.guncellenmeTarihi.toISOString() !== new Date(dto.expectedUpdatedAt).toISOString()) throw new ConflictException('Paket başka bir işlemle değiştirildi. Listeyi yenileyin.');
      if (['DENEME', 'UCRETSIZ'].includes(before.paketKodu) && !dto.denemeGunSayisi) throw new BadRequestException('Deneme süresi en az 1 gün olmalıdır.');
      const { expectedUpdatedAt, ofisAltKullaniciLimiti, ...data } = dto;
      const after = await tx.uyelikPaketi.update({ where: { id }, data });
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${'OFFICE_MEMBERSHIP_PACKAGES'}))`;
      const row = await tx.systemSetting.findUnique({ where: { key: 'OFFICE_MEMBERSHIP_PACKAGES' } });
      const officeBefore = JSON.parse(JSON.stringify(row?.valueJson ?? null));
      const offices = Array.isArray(row?.valueJson) ? row.valueJson as Array<Record<string, unknown>> : [];
      if (before.segment === 'EMLAK_PRO') {
        const office = offices.find((p) => p.code === before.paketKodu);
        if (office) {
          Object.assign(office, { name: 'Ofis '+after.paketAdi, price: Number(after.fiyat), monthlyPk: after.aylikPaketPk, active: after.aktifMi,
            portfolioCapacity: after.aktifPortfoyLimiti, crmCapacity: after.aktifCrmLimiti,
            monthlyDemandLimit: after.aylikTalepLimiti, monthlyPoolLimit: after.aylikHavuzGonderimLimiti,
            trialDays: after.denemeGunSayisi ?? 0,
            ...(ofisAltKullaniciLimiti !== null && ofisAltKullaniciLimiti !== undefined ? { agents: ofisAltKullaniciLimiti, totalUsers: ofisAltKullaniciLimiti + 1 } : {}),
          });
          await tx.systemSetting.update({ where: { key: 'OFFICE_MEMBERSHIP_PACKAGES' }, data: { valueJson: offices as Prisma.InputJsonValue } });
        }
      }
      await tx.systemSetting.create({ data: { key: `EPH_MEMBERSHIP_SETTINGS_AUDIT_${randomUUID()}`, updatedById: actor,
        valueJson: JSON.parse(JSON.stringify({ packageId: id, before, after, officeBefore, officeAfter: offices, changedAt: new Date().toISOString() })) } });
      await tx.auditLog.create({ data: { actorId: actor, action: AuditAction.UPDATE_SYSTEM_SETTING, entityType: 'UyelikPaketi', entityId: id,
        description: `Üyelik paketi güncellendi: ${before.paketKodu}`,
        metadata: JSON.parse(JSON.stringify({ key: `UyelikPaketi:${before.segment}:${before.paketKodu}`, previousValue: before, newValue: after })) } });
      return { saved: true, updatedAt: after.guncellenmeTarihi };
    });
  }

  async catalog(userId: string) {
    const settings = await this.settings();
    let membershipPackages: unknown[] = [];
    try { membershipPackages = (await this.membership.getPackages(userId)).packages; }
    catch (error) { if (!(error instanceof ForbiddenException)) throw error; }
    return {
      enabled: settings.enabled, mode: settings.mode, termsVersion: settings.termsVersion,
      membershipPackages,
      pkProducts: settings.pkProducts.filter((p) => p.active).map((p) => ({ ...p, price: money(new Prisma.Decimal(p.amountMinor).div(100)), currency: 'TRY' })),
    };
  }

  private view(order: any) {
    const meta = jsonObject(order.metadata);
    return {
      id: order.id, number: order.siparisNo, purpose: order.amac, status: order.durum,
      amount: String(order.tutar), currency: order.paraBirimi, credits: order.pkMiktari,
      product: order.fiyatSnapshot, createdAt: order.olusturulmaTarihi, expiresAt: order.expiresAt,
      paidAt: order.paidAt, settled: !!order.settlement, settledAt: order.settlement?.settledAt || null,
      mode: meta.paymentMode || null,
      channel: typeof meta.channel === 'string' ? meta.channel : 'WEB',
      amountPending: ['APPLE', 'GOOGLE'].includes(String(meta.channel)) && !order.paidAt,
      requiresRefundReview: meta.requiresRefundReview === true,
      checkoutUrl: (meta.channel || 'WEB') === 'WEB' && order.durum === 'PENDING' && order.expiresAt > new Date() && order.attempts?.[0]?.durum === 'REQUIRES_ACTION'
        && meta.paymentMode === this.gateway.mode()
        ? this.gateway.checkoutUrl(jsonObject(order.attempts[0].publicMetadata).checkoutUrl) : null,
      refunds: order.refunds?.map((r: any) => ({ id: r.id, status: r.durum, amount: String(r.tutar), reason: r.sebep, createdAt: r.olusturulmaTarihi })),
    };
  }

  async orders(userId: string, admin = false) {
    const rows = await this.prisma.paymentOrder.findMany({
      where: admin ? {} : { kullaniciId: userId }, orderBy: { olusturulmaTarihi: 'desc' }, take: 100,
      include: { settlement: true, refunds: { orderBy: { olusturulmaTarihi: 'desc' } }, attempts: { orderBy: { olusturulmaTarihi: 'desc' }, take: 1 } },
    });
    return rows.map((row) => this.view(row));
  }

  async order(userId: string, id: string) {
    const order = await this.prisma.paymentOrder.findFirst({
      where: { id, kullaniciId: userId }, include: { settlement: true, refunds: true, attempts: { orderBy: { olusturulmaTarihi: 'desc' }, take: 1 } },
    });
    if (!order) throw new NotFoundException('Ödeme bulunamadı.');
    return this.view(order);
  }

  private attemptView(attempt: any) {
    const meta = jsonObject(attempt.publicMetadata);
    return {
      orderId: attempt.orderId, status: attempt.durum,
      checkoutUrl: meta.checkoutUrl && attempt.durum === PaymentAttemptStatus.REQUIRES_ACTION && attempt.order?.expiresAt > new Date()
        ? this.gateway.checkoutUrl(meta.checkoutUrl) : null,
    };
  }

  async checkout(userId: string, dto: CheckoutDto, key: string, ip: string) {
    if (!/^[a-zA-Z0-9_-]{16,100}$/.test(key || '')) throw new BadRequestException('Geçerli işlem anahtarı gerekli.');
    if (!dto.billing || dto.acceptedTerms !== true) throw new BadRequestException('Fatura bilgileri ve sözleşme onayı gerekli.');
    const settings = await this.settings();
    if (!settings.enabled) throw new ServiceUnavailableException('Kartlı ödeme henüz etkinleştirilmedi.');
    if (settings.mode === 'sandbox') {
      const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { hesapTuru: true } });
      if (user?.hesapTuru !== 'TEST') throw new ForbiddenException('Sandbox ödemeleri yalnız TEST hesaplarında kullanılabilir.');
    }
    if (dto.termsVersion !== settings.termsVersion) throw new ConflictException('Ödeme koşulları değişti. Sayfayı yenileyin.');
    const callbackUrl = this.callbackUrl();
    const idempotencyKey = `iyzico:${settings.mode}:${userId}:${key}`;
    const requestHash = digest({ kind: dto.kind, productCode: dto.productCode, billing: dto.billing, termsVersion: dto.termsVersion });
    const prepared = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`payment-user:${userId}`}))`;
      const existing = await tx.paymentAttempt.findUnique({ where: { idempotencyKey }, include: { order: true } });
      if (existing) {
        if (jsonObject(existing.publicMetadata).requestHash !== requestHash) throw new ConflictException('Aynı işlem anahtarı farklı sipariş için kullanılamaz.');
        return { attempt: existing, reused: true };
      }
      const recent = await tx.paymentAttempt.count({ where: { order: { kullaniciId: userId }, olusturulmaTarihi: { gt: new Date(Date.now() - 600000) } } });
      if (recent >= 10) throw new ConflictException('Çok sayıda ödeme denemesi var. Birkaç dakika sonra deneyin.');
      const pending = await tx.paymentOrder.findFirst({
        where: { kullaniciId: userId, durum: { in: ['CREATED', 'PENDING'] }, expiresAt: { gt: new Date() },
          attempts: { some: {} },
          ...(dto.kind === 'MEMBERSHIP' ? { amac: { not: 'PK_PURCHASE' } } : { amac: 'PK_PURCHASE' }) },
      });
      if (pending) throw new ConflictException('Devam eden bir ödemeniz var. Ödemelerim ekranından kontrol edin.');
      let order: any;
      if (dto.kind === 'MEMBERSHIP') {
        const result = await this.membership.createPaymentOrder(userId, { paketKodu: dto.productCode as UyelikPaketKodu }, tx);
        order = await tx.paymentOrder.findUniqueOrThrow({ where: { id: result.order.id } });
      } else {
        const product = settings.pkProducts.find((p) => p.code === dto.productCode && p.active);
        if (!product) throw new NotFoundException('Satın alınabilir PK paketi bulunamadı.');
        order = await tx.paymentOrder.create({ data: {
          siparisNo: `EPH-PK-${randomUUID()}`, kullaniciId: userId, amac: PaymentOrderPurpose.PK_PURCHASE,
          tutar: money(new Prisma.Decimal(product.amountMinor).div(100)), paraBirimi: 'TRY', pkMiktari: product.credits,
          fiyatSnapshot: { code: product.code, paketAdi: product.name, credits: product.credits, amountMinor: product.amountMinor, currency: 'TRY' },
          expiresAt: new Date(Date.now() + 30 * 60000),
        } });
      }
      if (order.paraBirimi !== 'TRY') throw new BadRequestException('Bu ödeme akışında yalnız TRY kullanılabilir.');
      await tx.paymentOrder.update({ where: { id: order.id }, data: {
        metadata: { ...jsonObject(order.metadata), paymentMode: settings.mode, channel: 'WEB',
          terms: settings.terms as Prisma.InputJsonObject, termsVersion: settings.termsVersion,
          consentAt: new Date().toISOString(), billing: { firstName: dto.billing.firstName, lastName: dto.billing.lastName,
            email: dto.billing.email, phone: dto.billing.phone, address: dto.billing.address, city: dto.billing.city, country: 'Turkey' } },
      } });
      const provider = await tx.paymentProvider.upsert({
        where: { kod: `IYZICO_${settings.mode.toUpperCase()}` }, update: {},
        create: { kod: `IYZICO_${settings.mode.toUpperCase()}`, ad: `iyzico ${settings.mode}`, adapterKodu: 'IYZICO_CF_V1' },
      });
      if (!provider.aktifMi) throw new ServiceUnavailableException('Ödeme sağlayıcısı kapalı.');
      const attempt = await tx.paymentAttempt.create({ data: {
        orderId: order.id, providerId: provider.id, idempotencyKey, publicMetadata: { requestHash },
      }, include: { order: true } });
      return { attempt, reused: false };
    }, { timeout: 15000 });

    if (prepared.reused) return this.attemptView(prepared.attempt);
    const { attempt } = prepared;
    const order = attempt.order;
    const billing = dto.billing;
    const amount = money(order.tutar);
    const buyerIp = isIP(ip) ? ip : '127.0.0.1';
    let response: Record<string, any>;
    try {
      response = await this.gateway.initialize({
        locale: 'tr', conversationId: attempt.id, basketId: order.id, price: amount, paidPrice: amount,
        currency: order.paraBirimi, paymentGroup: 'PRODUCT', enabledInstallments: [1], callbackUrl,
        buyer: { id: userId, name: billing.firstName, surname: billing.lastName, email: billing.email,
          gsmNumber: billing.phone, identityNumber: billing.identityNumber, registrationAddress: billing.address,
          city: billing.city, country: 'Turkey', ip: buyerIp },
        billingAddress: { address: billing.address, contactName: `${billing.firstName} ${billing.lastName}`, city: billing.city, country: 'Turkey' },
        basketItems: [{ id: order.id, name: String(jsonObject(order.fiyatSnapshot).paketAdi || 'EPH üyelik'),
          category1: order.amac === 'PK_PURCHASE' ? 'PK' : 'Üyelik', itemType: 'VIRTUAL', price: amount }],
      });
    } catch {
      await this.prisma.paymentAttempt.update({ where: { id: attempt.id }, data: { durum: 'PENDING', failureCode: 'INIT_UNCERTAIN' } });
      throw new ServiceUnavailableException('Ödeme oturumu doğrulanamadı. Ödemelerim ekranından kontrol edin.');
    }
    const initialized = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "PaymentOrder" WHERE "id" = ${order.id} FOR UPDATE`;
      if (response.status !== 'success') {
        await tx.paymentAttempt.update({ where: { id: attempt.id }, data: { durum: 'FAILED', failureCode: 'INIT_REJECTED' } });
        await tx.paymentOrder.update({ where: { id: order.id }, data: { durum: 'FAILED' } });
        return null;
      }
      const updated = await tx.paymentAttempt.update({ where: { id: attempt.id }, data: {
        checkoutReference: response.token, durum: 'REQUIRES_ACTION',
        publicMetadata: { requestHash, checkoutUrl: this.gateway.checkoutUrl(response.paymentPageUrl) },
      }, include: { order: true } });
      await tx.paymentOrder.update({ where: { id: order.id }, data: { durum: 'PENDING' } });
      return this.attemptView(updated);
    });
    if (!initialized) throw new BadRequestException('Ödeme sayfası başlatılamadı.');
    return initialized;
  }

  async reconcileAttempt(attemptId: string) {
    const attempt = await this.prisma.paymentAttempt.findUnique({ where: { id: attemptId }, include: { order: { include: { settlement: true } } } });
    if (!attempt) throw new NotFoundException('Ödeme oturumu bulunamadı.');
    if (['REFUNDED', 'PARTIALLY_REFUNDED'].includes(attempt.order.durum)) return attempt.orderId;
    if (attempt.order.settlement) return attempt.orderId;
    if (jsonObject(attempt.order.metadata).paymentMode !== this.gateway.mode()) throw new ConflictException('Ödeme ortamı siparişle eşleşmiyor.');
    if (!attempt.checkoutReference) return attempt.orderId;
    const result = await this.gateway.retrieve(attempt.checkoutReference, attempt.id);
    if (result.status !== 'success') return attempt.orderId;
    if (result.token !== attempt.checkoutReference || result.conversationId !== attempt.id || result.basketId !== attempt.orderId) {
      throw new BadRequestException('Ödeme referansları eşleşmiyor.');
    }
    if (result.paymentStatus !== 'SUCCESS') {
      if (result.paymentStatus === 'FAILURE') {
        await this.prisma.$transaction(async (tx) => {
          await tx.$queryRaw`SELECT "id" FROM "PaymentOrder" WHERE "id" = ${attempt.orderId} FOR UPDATE`;
          const fresh = await tx.paymentOrder.findUniqueOrThrow({ where: { id: attempt.orderId } });
          if (['PAID', 'REFUNDED', 'PARTIALLY_REFUNDED'].includes(fresh.durum)) return;
          await tx.paymentAttempt.update({ where: { id: attempt.id }, data: { durum: 'FAILED', failureCode: 'PAYMENT_FAILED' } });
          await tx.paymentOrder.update({ where: { id: fresh.id }, data: { durum: 'FAILED' } });
        });
      }
      return attempt.orderId;
    }
    if (Number(result.fraudStatus) !== 1) return attempt.orderId;
    if (!equalMoney(result.paidPrice, attempt.order.tutar) || !equalMoney(result.price, attempt.order.tutar) ||
      result.currency !== attempt.order.paraBirimi || !/^[a-zA-Z0-9_-]{1,100}$/.test(String(result.paymentId || ''))) {
      throw new BadRequestException('Ödeme tutarı veya para birimi eşleşmiyor.');
    }
    const items = result.itemTransactions;
    if (!Array.isArray(items) || items.length !== 1 || items[0].itemId !== attempt.orderId ||
      !equalMoney(items[0].paidPrice, attempt.order.tutar) || !items[0].paymentTransactionId) {
      throw new BadRequestException('Ödeme ürün dökümü eşleşmiyor.');
    }
    const record = async (tx: Prisma.TransactionClient, grant: boolean) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`payment-user:${attempt.order.kullaniciId}`}))`;
      await tx.$queryRaw`SELECT "id" FROM "PaymentOrder" WHERE "id" = ${attempt.orderId} FOR UPDATE`;
      const order = await tx.paymentOrder.findUniqueOrThrow({ where: { id: attempt.orderId }, include: { settlement: true } });
      if (order.settlement || ['REFUNDED', 'PARTIALLY_REFUNDED'].includes(order.durum)) return;
      const paymentId = String(result.paymentId);
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`payment-reference:${attempt.providerId}:${paymentId}`}))`;
      const duplicate = await tx.paymentTransaction.findFirst({ where: { providerId: attempt.providerId, providerTransactionId: paymentId, islemTuru: 'PAYMENT' } });
      if (duplicate && duplicate.orderId !== order.id) throw new ConflictException('Ödeme referansı başka siparişte kullanılmış.');
      if (!duplicate) await tx.paymentTransaction.create({ data: {
        orderId: order.id, attemptId: attempt.id, providerId: attempt.providerId, providerTransactionId: paymentId,
        islemTuru: PaymentTransactionType.PAYMENT, durum: PaymentTransactionStatus.SUCCEEDED,
        tutar: order.tutar, paraBirimi: order.paraBirimi, processedAt: new Date(),
        metadata: { itemTransactionId: String(items[0].paymentTransactionId), fraudStatus: 1,
          iyziCommissionFee: String(result.iyziCommissionFee ?? ''), iyziCommissionRateAmount: String(result.iyziCommissionRateAmount ?? '') },
      } });
      await tx.paymentAttempt.update({ where: { id: attempt.id }, data: { durum: 'SUCCEEDED', providerReference: paymentId, failureCode: null } });
      await tx.paymentOrder.update({ where: { id: order.id }, data: { durum: PaymentOrderStatus.PAID, paidAt: order.paidAt || new Date() } });
      if (grant) await this.membership.settlePaidOrder(order.id, tx);
    };
    try {
      await this.prisma.$transaction((tx) => record(tx, true), { timeout: 20000 });
    } catch {
      await this.prisma.$transaction((tx) => record(tx, false), { timeout: 20000 });
      this.logger.warn(`PAYMENT_PAID_UNSETTLED:${attempt.orderId}`);
    }
    return attempt.orderId;
  }

  async callback(token: unknown) {
    if (typeof token !== 'string' || !token || token.length > 512) throw new BadRequestException('Geçersiz ödeme dönüşü.');
    const attempt = await this.prisma.paymentAttempt.findFirst({ where: { checkoutReference: token } });
    if (!attempt) throw new NotFoundException('Ödeme oturumu bulunamadı.');
    try { await this.reconcileAttempt(attempt.id); }
    catch { this.logger.warn(`PAYMENT_RECONCILE_PENDING:${attempt.orderId}`); }
    return attempt.orderId;
  }

  async webhook(body: unknown, signature: string) {
    const payload = jsonObject(body);
    if (payload.iyziEventType !== 'CHECKOUT_FORM_AUTH' || !this.gateway.verifyWebhook(payload, signature)) {
      throw new ForbiddenException('Ödeme bildirimi doğrulanamadı.');
    }
    const attempt = await this.prisma.paymentAttempt.findFirst({
      where: { id: String(payload.paymentConversationId), checkoutReference: String(payload.token) },
    });
    if (!attempt) throw new NotFoundException('Ödeme oturumu bulunamadı.');
    const payloadHash = digest(payload);
    const event = await this.prisma.paymentWebhookEvent.upsert({
      where: { providerId_payloadHash: { providerId: attempt.providerId, payloadHash } }, update: {},
      create: { providerId: attempt.providerId, payloadHash, signatureValid: true, eventType: 'CHECKOUT_FORM_AUTH',
        providerEventId: String(payload.iyziReferenceCode || '').slice(0, 200),
        payload: { attemptId: attempt.id, status: String(payload.status), paymentId: String(payload.iyziPaymentId) } },
    });
    if (!event.processed) {
      await this.reconcileAttempt(attempt.id);
      await this.prisma.paymentWebhookEvent.update({ where: { id: event.id }, data: { processed: true, processedAt: new Date() } });
    }
    return { received: true };
  }

  async refresh(userId: string, orderId: string) {
    await this.order(userId, orderId);
    const attempt = await this.prisma.paymentAttempt.findFirst({ where: { orderId }, orderBy: { olusturulmaTarihi: 'desc' } });
    if (attempt && attempt.guncellenmeTarihi.getTime() < Date.now() - 10000) {
      await this.reconcileAttempt(attempt.id);
    }
    return this.order(userId, orderId);
  }

  async requestRefund(userId: string, orderId: string, reason: string) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "PaymentOrder" WHERE "id" = ${orderId} FOR UPDATE`;
      const order = await tx.paymentOrder.findFirst({ where: { id: orderId, kullaniciId: userId } });
      if (!order) throw new NotFoundException('Ödeme bulunamadı.');
      if (['APPLE', 'GOOGLE'].includes(String(jsonObject(order.metadata).channel))) throw new BadRequestException('Mağaza işlemlerinde iadeyi Apple veya Google yönetir.');
      if (order.durum !== 'PAID') throw new BadRequestException('İade talebi yalnız ödenmiş sipariş için oluşturulur.');
      const existing = await tx.paymentRefund.findFirst({ where: { orderId, durum: { in: ['CREATED', 'PENDING', 'SUCCEEDED'] } } });
      if (existing) return { id: existing.id, status: existing.durum };
      const payment = await tx.paymentTransaction.findFirst({ where: { orderId, islemTuru: 'PAYMENT', durum: 'SUCCEEDED' } });
      const refund = await tx.paymentRefund.create({ data: { orderId, transactionId: payment?.id, providerId: payment?.providerId,
        tutar: order.tutar, paraBirimi: order.paraBirimi, sebep: reason,
        metadata: { requestedBy: userId, requiresReview: true } } });
      return { id: refund.id, status: refund.durum };
    });
  }

  async tick() {
    if (this.stopping || this.working || !this.gateway.ready()) return;
    this.working = this.reconcileBatch().catch(() => { this.logger.warn('PAYMENT_WORKER_RETRY_PENDING'); });
    try { await this.working; } finally { this.working = undefined; }
  }

  private async reconcileBatch() {
    const rows = await this.prisma.paymentAttempt.findMany({
      where: { provider: { adapterKodu: 'IYZICO_CF_V1' }, checkoutReference: { not: null }, order: { settlement: null, durum: { in: ['CREATED', 'PENDING', 'PAID', 'EXPIRED'] } },
        olusturulmaTarihi: { gt: new Date(Date.now() - 72 * 3600000), lt: new Date(Date.now() - 20000) } },
      orderBy: { guncellenmeTarihi: 'asc' }, take: 10,
    });
    for (const row of rows) {
      if (this.stopping) break;
      try { await this.reconcileAttempt(row.id); }
      catch { this.logger.warn(`PAYMENT_RECONCILE_PENDING:${row.orderId}`); }
      await this.prisma.paymentAttempt.update({ where: { id: row.id }, data: { guncellenmeTarihi: new Date() } });
    }
  }
}
