import { PricingService } from './pricing.service';

function make(rows: Array<{ key: string; valueJson: unknown }>) {
  const prisma: any = {
    systemSetting: { findMany: jest.fn().mockResolvedValue(rows), findUnique: jest.fn().mockResolvedValue(null) },
    uyelikPaketi: { findMany: jest.fn().mockResolvedValue([]) },
  };
  return new PricingService(prisma);
}

describe('PricingService.tariff liste değerli limitler', () => {
  it('dizi değerleri dizi döndürür, sayısal anahtarlar sayı kalır', async () => {
    const res = await make([
      { key: 'LIMIT_DENEME_GUN_SECENEKLERI', valueJson: { value: [7, 14, 30] } },
      { key: 'LIMIT_ADMIN_HEDIYE_PK_SECENEKLERI', valueJson: { value: [50, 75] } },
      { key: 'LIMIT_TAKIM_DANISMAN', valueJson: { value: 8 } },
    ]).tariff();
    const by = Object.fromEntries(res.limits.map((l) => [l.key, l]));
    expect(by.LIMIT_DENEME_GUN_SECENEKLERI).toEqual({ key: 'LIMIT_DENEME_GUN_SECENEKLERI', value: [7, 14, 30], source: 'DB' });
    expect(by.LIMIT_ADMIN_HEDIYE_PK_SECENEKLERI).toEqual({ key: 'LIMIT_ADMIN_HEDIYE_PK_SECENEKLERI', value: [50, 75], source: 'DB' });
    expect(by.LIMIT_TAKIM_DANISMAN.value).toBe(8);
    expect(res.limits.filter((l) => l.key === 'LIMIT_DENEME_GUN_SECENEKLERI')).toHaveLength(1);
  });

  it('kayıt yoksa/geçersizse yedek liste döner', async () => {
    const res = await make([{ key: 'LIMIT_ADMIN_HEDIYE_PK_SECENEKLERI', valueJson: { value: [-1] } }]).tariff();
    const item = res.limits.find((l) => l.key === 'LIMIT_ADMIN_HEDIYE_PK_SECENEKLERI');
    expect(item).toEqual({ key: 'LIMIT_ADMIN_HEDIYE_PK_SECENEKLERI', value: [100, 250, 500], source: 'DEFAULT' });
  });
});
