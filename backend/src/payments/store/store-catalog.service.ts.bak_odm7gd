import { BadRequestException, ForbiddenException, Injectable, Optional } from '@nestjs/common';
import { PaymentChannel, Role, StorePlatform } from '@prisma/client';
import { randomUUID } from 'crypto';
import { OfficeEntitlementService, loadOfficeSettings, resolveOfficeEntitlements } from '../../office/office-entitlement.service';
import type { PurchaseKind } from '../../office/office-entitlement.rules';
import { PrismaService } from '../../prisma/prisma.service';
import { PAYMENT_SETTINGS_KEY, jsonObject } from '../payment.rules';
import { readAppleStoreConfig } from './apple-store.config';

/**
 * EPH-70B2 — GET /payments/store/catalog (sözleşme r2 §3.1). Ürünler StoreProduct eşlemesinden, haklar ofis ayarlarından (§0-B) gelir;
 * fiyat alanı YOKTUR (mobil fiyatı mağazadan okur). Danışman / Ofis Boy için ürünler listelenir ama canPurchase=false (karar 7).
 */
const SOURCE_LABEL: Record<string, string> = { IYZICO: 'Web', APPLE: 'App Store', GOOGLE: 'Google Play', ADMIN: 'Yönetici', DENEME: 'Deneme', MIGRATION: 'Geçiş' };
const PLATFORM: Record<string, StorePlatform> = { IOS: 'APPLE', ANDROID: 'GOOGLE' };
type Block = { code: string; message: string } | null;

@Injectable()
export class StoreCatalogService {
  private readonly entitlements: OfficeEntitlementService;
  constructor(private readonly prisma: PrismaService, @Optional() entitlements?: OfficeEntitlementService) {
    this.entitlements = entitlements ?? new OfficeEntitlementService(prisma);
  }

  async catalog(userId: string, platformParam: unknown) {
    const label = String(platformParam ?? '').toUpperCase();
    if (!PLATFORM[label]) throw new BadRequestException({ statusCode: 400, code: 'STORE_PLATFORM_INVALID', message: 'Platform IOS veya ANDROID olmalıdır.' });
    const platform = PLATFORM[label];
    const channel: PaymentChannel = platform === 'APPLE' ? 'APPLE' : 'GOOGLE';

    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true, officeId: true, storeAccountToken: true,
      capabilities: { select: { capability: true } }, ownedOffices: { where: { isActive: true }, select: { id: true, name: true }, take: 1 } } });
    if (!user) throw new ForbiddenException({ statusCode: 403, code: 'ROLE_NOT_ELIGIBLE', message: 'Bu hesap türü mağazadan satın alma yapamaz.' });
    const isMuteahhit = user.role === Role.MUTEAHHIT || user.role === Role.INSAAT_FIRMASI;
    const isRealtor = user.role === Role.EMLAKCI || user.role === Role.OFIS_BOY;
    if (!isMuteahhit && !isRealtor) throw new ForbiddenException({ statusCode: 403, code: 'ROLE_NOT_ELIGIBLE', message: 'Bu hesap türü mağazadan satın alma yapamaz.' });

    let accountToken = user.storeAccountToken;
    if (!accountToken) {
      accountToken = randomUUID();
      await this.prisma.user.update({ where: { id: user.id }, data: { storeAccountToken: accountToken } });
    }

    const ownedOffice = user.ownedOffices[0] ?? null;
    const isOwner = user.role === Role.EMLAKCI && !!ownedOffice && user.capabilities.some((c) => c.capability === 'OFFICE_OWNER');
    const memberOfficeId = !isMuteahhit ? (ownedOffice?.id ?? user.officeId ?? null) : null;
    const segment: 'OFFICE' | 'MUTEAHHIT' = isMuteahhit ? 'MUTEAHHIT' : 'OFFICE';
    const storeEnabled = readAppleStoreConfig().enabled;
    const roleBlock: Block = isRealtor && !isOwner ? { code: 'OFFICE_AGENT_PURCHASE_FORBIDDEN', message: 'Ofis paketini ve ofis PK\'sını yalnız ofis sahibi satın alabilir.' } : null;
    const disabledBlock: Block = storeEnabled ? null : { code: 'STORE_DISABLED', message: 'Mağaza satın alma şu an kullanılamıyor.' };

    const [products, settingsRow, office] = await Promise.all([
      this.prisma.storeProduct.findMany({ where: { platform, aktifMi: true }, orderBy: [{ urunTuru: 'asc' }, { urunAnahtari: 'asc' }] }),
      this.prisma.systemSetting.findUnique({ where: { key: PAYMENT_SETTINGS_KEY } }),
      (async () => {
        if (!memberOfficeId) return null;
        try {
          const settings = await loadOfficeSettings(this.prisma);
          const eff = await resolveOfficeEntitlements(this.prisma, memberOfficeId, new Date(), settings);
          const sub = await this.prisma.ofisAbonelik.findFirst({ where: { officeId: memberOfficeId, durum: { in: ['AKTIF', 'GRACE'] } }, select: { kaynakKanal: true, kaynakAbonelikAnahtari: true } });
          const addons = await this.prisma.ofisEklenti.findMany({ where: { officeId: memberOfficeId, durum: { in: ['AKTIF', 'GRACE'] } }, select: { tur: true, kaynakKanal: true, kaynakAbonelikAnahtari: true } });
          return { settings, eff, sub, addons };
        } catch { return null; }
      })(),
    ]);

    const eligibility = async (kind: PurchaseKind, packageCode?: string, adet?: number): Promise<Block> => {
      if (disabledBlock) return disabledBlock;
      if (roleBlock) return roleBlock;
      if (!memberOfficeId || !office) return { code: 'STORE_CATALOG_UNAVAILABLE', message: 'Ofis hakları şu an okunamıyor.' };
      // Aynı kanaldaki mevcut abonelik zincirinde yükseltme/düşürme serbest (sözleşme §5): kaynak anahtarı mevcut zincirden alınır
      let sourceKey: string | null = null;
      if (kind === 'PAKET' && office.sub?.kaynakKanal === channel) sourceKey = office.sub.kaynakAbonelikAnahtari;
      if (kind !== 'PAKET') sourceKey = office.addons.find((a) => a.tur === kind && a.kaynakKanal === channel)?.kaynakAbonelikAnahtari ?? null;
      const r = await this.entitlements.checkPurchaseEligibility(this.prisma, { officeId: memberOfficeId, actorUserId: user.id, kind, packageCode, adet, channel, sourceKey: sourceKey ?? `catalog:${randomUUID()}`, amount: 1 });
      if (r.ok) return null;
      const f = r as { code: string; message: string };
      return f.code === 'MEMBERSHIP_ACTIVE_OTHER_CHANNEL' && office.eff.channel ? { code: f.code, message: `Üyeliğiniz aktif. Kaynak: ${SOURCE_LABEL[office.eff.channel] ?? office.eff.channel}.` } : { code: f.code, message: f.message };
    };

    const out = { membershipProducts: [] as any[], addonProducts: [] as any[], pkProducts: [] as any[] };
    const pkSettings = (Array.isArray(jsonObject(settingsRow?.valueJson).pkProducts) ? jsonObject(settingsRow?.valueJson).pkProducts : []) as Array<{ code: string; name: string; credits: number; active: boolean }>;
    const googlePlan = (p: { googleBasePlanKimligi: string | null }) => (platform === 'GOOGLE' ? p.googleBasePlanKimligi : null);

    for (const p of products) {
      if (p.urunTuru === 'UYELIK' && p.segment === segment) {
        if (segment === 'OFFICE') {
          const row = office?.settings.catalog.get(String(p.paketKodu ?? '').toUpperCase());
          if (!row || row.custom || !row.active) continue;
          const block = await eligibility('PAKET', row.code);
          out.membershipProducts.push({ packageCode: row.code, name: row.name, description: null, segment, storeProductId: p.magazaUrunKimligi, googleBasePlanId: googlePlan(p), canPurchase: !block, blockCode: block?.code ?? null, blockMessage: block?.message ?? null,
            rights: { aylikPaketPk: row.monthlyPk, aktifPortfoyLimiti: row.portfolio, aktifCrmLimiti: row.crm, aylikTalepLimiti: null, aylikHavuzGonderimLimiti: null, projeLimiti: null, projeIlanLimiti: null, ofisAltKullaniciLimiti: Math.max(0, row.totalUsers - 1), kardesOfisAcik: row.kardesOfis, ofisBoyDahil: row.ofisBoyDahil } });
        } else {
          const pkg = p.uyelikPaketiId ? await this.prisma.uyelikPaketi.findUnique({ where: { id: p.uyelikPaketiId } }) : null;
          if (!pkg || !pkg.aktifMi) continue;
          const block = disabledBlock;
          out.membershipProducts.push({ packageCode: pkg.paketKodu, name: pkg.paketAdi, description: null, segment, storeProductId: p.magazaUrunKimligi, googleBasePlanId: googlePlan(p), canPurchase: !block, blockCode: block?.code ?? null, blockMessage: block?.message ?? null,
            rights: { aylikPaketPk: pkg.aylikPaketPk, aktifPortfoyLimiti: pkg.aktifPortfoyLimiti, aktifCrmLimiti: pkg.aktifCrmLimiti, aylikTalepLimiti: pkg.aylikTalepLimiti, aylikHavuzGonderimLimiti: pkg.aylikHavuzGonderimLimiti, projeLimiti: pkg.projeLimiti, projeIlanLimiti: pkg.projeIlanLimiti, ofisAltKullaniciLimiti: null, kardesOfisAcik: false, ofisBoyDahil: 0 } });
        }
      } else if ((p.urunTuru === 'EK_KULLANICI' || p.urunTuru === 'OFIS_BOY') && segment === 'OFFICE') {
        const adet = p.urunTuru === 'EK_KULLANICI' ? Number(p.kisiSayisi) : 1;
        const block = await eligibility(p.urunTuru, undefined, adet);
        out.addonProducts.push({ kind: p.urunTuru, code: p.urunAnahtari, name: p.urunTuru === 'EK_KULLANICI' ? `+${adet} Kullanıcı` : 'Ofis Boy', description: null, kisiSayisi: p.urunTuru === 'EK_KULLANICI' ? adet : null,
          storeProductId: p.magazaUrunKimligi, googleBasePlanId: googlePlan(p), canPurchase: !block, blockCode: block?.code ?? null, blockMessage: block?.message ?? null });
      } else if (p.urunTuru === 'PK') {
        const item = pkSettings.find((x) => x?.code === p.pkUrunKodu);
        if (!item || item.active === false || !Number.isSafeInteger(item.credits) || item.credits <= 0) continue;
        const block = disabledBlock ?? (isMuteahhit ? null : roleBlock);
        out.pkProducts.push({ code: item.code, name: item.name, credits: item.credits, storeProductId: p.magazaUrunKimligi, canPurchase: !block, blockCode: block?.code ?? null, blockMessage: block?.message ?? null });
      }
    }

    const eff = office?.eff;
    const activeMembership = eff && eff.state !== 'UCRETSIZ' && eff.channel
      ? { source: eff.channel, sourceLabel: SOURCE_LABEL[eff.channel] ?? eff.channel, endsAt: eff.endsAt ? eff.endsAt.toISOString() : null, canManageInThisPlatform: eff.channel === channel }
      : null;
    return {
      platform: label, storeEnabled, accountToken, segment,
      purchaseTarget: { walletKind: isMuteahhit ? 'PERSONAL' : 'OFFICE', officeId: memberOfficeId, label: isMuteahhit ? 'PK bakiyem' : ownedOffice?.name ? `${ownedOffice.name} · Ofis PK` : 'Ofis PK' },
      activeMembership, ...out,
    };
  }
}
