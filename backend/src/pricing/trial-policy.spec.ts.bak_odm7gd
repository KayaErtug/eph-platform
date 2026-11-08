import { BadRequestException } from '@nestjs/common';
import { readTrialPolicy, resolveInitialTrialDays } from './trial-policy';
import { LIMIT_LIST_DEFAULTS, parseLimitList, readLimitList } from './commercial-costs';
import { resolveMaxTeams } from '../office/office-team-quota';

const fakeDb = (rows: Array<{ key: string; valueJson: unknown }>) => ({
  systemSetting: {
    findUnique: async ({ where }: { where: { key: string } }) => rows.find((row) => row.key === where.key) ?? null,
  },
}) as never;

describe('trial-policy', () => {
  it('kayıt yoksa yedek değerleri ve toplam günü verir', async () => {
    expect(await readTrialPolicy(fakeDb([]))).toEqual({ initialDays: 14, extensionDays: 14, maxExtensions: 1, maxTotalDays: 28 });
  });

  it('SystemSetting değerlerini okur', async () => {
    const db = fakeDb([
      { key: 'TRIAL_INITIAL_DAYS', valueJson: { value: 10 } },
      { key: 'TRIAL_EXTENSION_DAYS', valueJson: 7 },
      { key: 'TRIAL_MAX_EXTENSIONS', valueJson: { value: 2 } },
    ]);
    expect(await readTrialPolicy(db)).toEqual({ initialDays: 10, extensionDays: 7, maxExtensions: 2, maxTotalDays: 24 });
  });

  it('gün sayısı 0 ise reddeder', async () => {
    await expect(readTrialPolicy(fakeDb([{ key: 'TRIAL_INITIAL_DAYS', valueJson: 0 }]))).rejects.toBeInstanceOf(BadRequestException);
  });

  it('ilk deneme günü önce paket alanından gelir', async () => {
    const policy = await readTrialPolicy(fakeDb([]));
    expect(resolveInitialTrialDays({ denemeGunSayisi: 30 }, policy)).toBe(30);
    expect(resolveInitialTrialDays({ denemeGunSayisi: null }, policy)).toBe(14);
    expect(resolveInitialTrialDays(null, policy)).toBe(14);
  });
});

describe('limit listesi', () => {
  it('geçerli listeyi ayrıştırır, geçersizi reddeder', () => {
    expect(parseLimitList({ value: [100, 250] })).toEqual([100, 250]);
    expect(parseLimitList([5])).toEqual([5]);
    expect(parseLimitList([])).toBeNull();
    expect(parseLimitList([0, 5])).toBeNull();
    expect(parseLimitList(['a'])).toBeNull();
    expect(parseLimitList(5)).toBeNull();
  });

  it('kayıt yoksa veya geçersizse yedek listeyi verir', async () => {
    expect(await readLimitList(fakeDb([]), 'LIMIT_ADMIN_HEDIYE_PK_SECENEKLERI')).toEqual([...LIMIT_LIST_DEFAULTS.LIMIT_ADMIN_HEDIYE_PK_SECENEKLERI]);
    expect(await readLimitList(fakeDb([{ key: 'LIMIT_ADMIN_HEDIYE_PK_SECENEKLERI', valueJson: { value: [-1] } }]), 'LIMIT_ADMIN_HEDIYE_PK_SECENEKLERI')).toEqual([100, 250, 500]);
    expect(await readLimitList(fakeDb([{ key: 'LIMIT_ADMIN_HEDIYE_PK_SECENEKLERI', valueJson: { value: [50, 75] } }]), 'LIMIT_ADMIN_HEDIYE_PK_SECENEKLERI')).toEqual([50, 75]);
  });
});

describe('resolveMaxTeams', () => {
  it('paketin maxTeams alanı eşik tablosundan önceliklidir', () => {
    expect(resolveMaxTeams({ maxTeams: 7 }, 3)).toBe(7);
    expect(resolveMaxTeams({ maxTeams: 0 }, 30)).toBe(0);
  });

  it('maxTeams yoksa danışman kapasitesinden yedek tablo', () => {
    expect(resolveMaxTeams({}, 25)).toBe(5);
    expect(resolveMaxTeams(undefined, 15)).toBe(3);
    expect(resolveMaxTeams({ maxTeams: null }, 7)).toBe(2);
    expect(resolveMaxTeams({ maxTeams: -1 }, 1)).toBe(1);
    expect(resolveMaxTeams({}, 0)).toBe(0);
  });
});
