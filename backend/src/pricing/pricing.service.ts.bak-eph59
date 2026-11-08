import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { COST_DEFAULTS, COST_PREFIX, LIMIT_DEFAULTS, LIMIT_LIST_DEFAULTS, LIMIT_PREFIX, parseCostValue } from './commercial-costs';
import { readTrialPolicy } from './trial-policy';

const OFFICE_FIELDS = ['code', 'name', 'price', 'monthlyPk', 'active', 'portfolioCapacity', 'crmCapacity', 'monthlyDemandLimit', 'monthlyPoolLimit', 'trialDays', 'agents', 'totalUsers', 'maxTeams'];

@Injectable()
export class PricingService {
  constructor(private readonly prisma: PrismaService) {}

  async tariff() {
    const [rows, packages, officeRow, paymentRow] = await Promise.all([
      this.prisma.systemSetting.findMany({ where: { OR: [{ key: { startsWith: COST_PREFIX } }, { key: { startsWith: LIMIT_PREFIX } }] }, select: { key: true, valueJson: true } }),
      this.prisma.uyelikPaketi.findMany({
        where: { aktifMi: true },
        orderBy: [{ segment: 'asc' }, { fiyat: 'asc' }],
        select: {
          paketKodu: true, paketAdi: true, segment: true, fiyat: true, paraBirimi: true, aktifPortfoyLimiti: true, aktifCrmLimiti: true,
          aylikTalepLimiti: true, aylikHavuzGonderimLimiti: true, projeLimiti: true, projeIlanLimiti: true, aylikPaketPk: true, denemeGunSayisi: true,
        },
      }),
      this.prisma.systemSetting.findUnique({ where: { key: 'OFFICE_MEMBERSHIP_PACKAGES' }, select: { valueJson: true } }),
      this.prisma.systemSetting.findUnique({ where: { key: 'EPH_PAYMENT_SETTINGS_V1' }, select: { valueJson: true } }),
    ]);

    const stored = new Map(rows.map((row) => [row.key, parseCostValue(row.valueJson)]));
    const view = (defaults: Record<string, number>, prefix: string) =>
      [...new Set([...Object.keys(defaults), ...rows.map((row) => row.key).filter((key) => key.startsWith(prefix))])].filter((key) => !(key in LIMIT_LIST_DEFAULTS)).sort().map((key) => {
        const value = stored.get(key);
        return { key, value: value ?? defaults[key] ?? null, source: value !== null && value !== undefined ? 'DB' : 'DEFAULT' };
      });
    const costs = view(COST_DEFAULTS, COST_PREFIX);
    const limits = view(LIMIT_DEFAULTS, LIMIT_PREFIX);

    const officeList = Array.isArray(officeRow?.valueJson) ? officeRow.valueJson as Array<Record<string, unknown>> : [];
    const officeTrial = officeList.find((item) => item.code === 'DENEME');
    const officePackages = officeList.map((item) => Object.fromEntries(OFFICE_FIELDS.filter((field) => field in item).map((field) => [field, item[field]])));

    const payment = paymentRow?.valueJson;
    const products = payment && typeof payment === 'object' && !Array.isArray(payment) && Array.isArray((payment as { pkProducts?: unknown }).pkProducts)
      ? (payment as { pkProducts: Array<{ code: string; name: string; credits: number; amountMinor: number; active: boolean }> }).pkProducts
      : [];
    const pkProducts = products.filter((item) => item.active).map(({ code, name, credits, amountMinor }) => ({ code, name, credits, amountMinor, currency: 'TRY' }));

    return {
      costs,
      limits,
      packages: packages.map((item) => ({ ...item, fiyat: item.fiyat === null ? null : Number(item.fiyat) })),
      officePackages,
      // Mobil metinleri için: ofis denemesi hediye PK/gün (OFFICE_MEMBERSHIP_PACKAGES[DENEME]) ve üyelik deneme politikası.
      officeTrial: officeTrial ? { monthlyPk: officeTrial.monthlyPk ?? null, trialDays: officeTrial.trialDays ?? null } : null,
      trialPolicy: await readTrialPolicy(this.prisma),
      pkProducts,
    };
  }
}
