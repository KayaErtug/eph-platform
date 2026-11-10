import { OFFICE_SETTINGS_FIXTURE } from './office-entitlement.fixture';
import {
  cheaperUpperPackage, computeEntitlements, parseAddonConfig, parseFreeLimits, parsePackageCatalog, parseTrialConfig, checkPurchaseEligibility,
} from './office-entitlement.rules';
import { protectLiveSnapshotsOnCatalogChange } from './office-entitlement.service';
import { legacyCapacityFields, legacySnapshotLive } from './office-legacy';
import { OfficeService } from './office.service';
import { eligibilityMap } from './sister/sister-shared';
import { resolveMaxTeams } from './office-team-quota';

/* ODM-7G-D: F02 (legacy kapanış), F09 (fail-closed), F12, F13, F14, F15, F01 (legacy okuyucu snapshot) birim testleri. Bellek içi; gerçek DB yok. */
const catalogOf = (raw: any = OFFICE_SETTINGS_FIXTURE.OFFICE_MEMBERSHIP_PACKAGES) => parsePackageCatalog(raw);
const FUTURE = new Date(Date.now() + 20 * 86400000).toISOString();
const PAST = new Date(Date.now() - 1000).toISOString();

describe('legacy snapshot yardımcıları (F01/F02)', () => {
  it('legacySnapshotLive: ended/active:false/geçmiş/bozuk bitiş = hak YOK; yalnız geleceğe dönük veya (eski sözleşme) bitişsiz kayıt canlı', () => {
    expect(legacySnapshotLive({ packageCode: 'BRONZ', expiresAt: FUTURE })).toBe(true);
    expect(legacySnapshotLive({ packageCode: 'BRONZ', expiresAt: PAST })).toBe(false);
    expect(legacySnapshotLive({ packageCode: 'BRONZ', expiresAt: 'bozuk' })).toBe(false);
    expect(legacySnapshotLive({ packageCode: 'BRONZ', expiresAt: FUTURE, ended: true })).toBe(false);
    expect(legacySnapshotLive({ packageCode: 'BRONZ', expiresAt: FUTURE, active: false })).toBe(false);
    expect(legacySnapshotLive({ expiresAt: FUTURE })).toBe(false);
  });

  it('legacyCapacityFields: türetilmiş snapshot (ek kullanıcı dahil) katalog satırını EZER; eski kayıtta katalog önceliği korunur; alan yoksa null (yedek sayı yok)', () => {
    const row = { agents: 2, portfolioCapacity: 150, crmCapacity: 1000 };
    expect(legacyCapacityFields({ derived: true, agents: 4, portfolioCapacity: 250, crmCapacity: -1 }, row)).toEqual({ agents: 4, portfolioCapacity: 250, crmCapacity: -1 });
    expect(legacyCapacityFields({ agents: 9, portfolioCapacity: 9, crmCapacity: 9 }, row)).toEqual({ agents: 2, portfolioCapacity: 150, crmCapacity: 1000 });
    expect(legacyCapacityFields({}, undefined)).toEqual({ agents: null, portfolioCapacity: null, crmCapacity: null });
  });

  it('OfficeService.getOfficeCapacity (legacy): Bronz+2 ek kullanıcı snapshot\'ı 4 danışman/250 portföy verir (katalog 2/150 değil); ayar eksikse kontrollü hata', async () => {
    const settings: Record<string, unknown> = {
      OFFICE_MEMBERSHIP_PACKAGES: [{ code: 'BRONZ', name: 'Bronz', agents: 2, portfolioCapacity: 150, crmCapacity: 1000 }, { code: 'DENEME', name: 'Deneme', agents: 5, portfolioCapacity: 300, crmCapacity: 500 }],
      OFFICE_SUBSCRIPTION_o1: { packageCode: 'BRONZ', derived: true, agents: 4, portfolioCapacity: 250, crmCapacity: 1000, expiresAt: FUTURE },
    };
    const prisma: any = { systemSetting: { findUnique: jest.fn(async ({ where }: any) => (settings[where.key] !== undefined ? { valueJson: settings[where.key] } : null)) } };
    const svc = new OfficeService(prisma);
    expect(await svc.getOfficeCapacity('o1')).toMatchObject({ agents: 4, portfolioCapacity: 250, crmCapacity: 1000 });
    settings.OFFICE_MEMBERSHIP_PACKAGES = [{ code: 'BRONZ', name: 'Bronz' }];
    settings.OFFICE_SUBSCRIPTION_o1 = { packageCode: 'BRONZ' };
    await expect(svc.getOfficeCapacity('o1')).rejects.toMatchObject({ response: { code: 'ENTITLEMENT_SETTING_MISSING' } });
  });
});

describe('F12 — Kardeş Ofis uygunluğu', () => {
  const prismaOf = (sub: unknown) => ({
    systemSetting: {
      findUnique: async ({ where }: any) => (where.key === 'KARDES_OFIS_PAKETLER' ? { valueJson: ['ALTIN', 'PLATINUM'] } : null),
      findMany: async () => [{ key: 'OFFICE_SUBSCRIPTION_o1', valueJson: sub }],
    },
    office: { findMany: async () => [{ id: 'o1', isActive: true }] },
  }) as any;
  it('NULL / eksik / bozuk bitiş süresiz sayılmaz; açık SURESIZ_OZEL ve geleceğe dönük kayıt uygundur', async () => {
    for (const bad of [{ packageCode: 'ALTIN' }, { packageCode: 'ALTIN', expiresAt: null }, { packageCode: 'ALTIN', expiresAt: 'x' }, { packageCode: 'ALTIN', expiresAt: PAST }, { packageCode: 'ALTIN', expiresAt: FUTURE, ended: true }]) {
      expect((await eligibilityMap(prismaOf(bad), ['o1'])).get('o1')).toBe(false);
    }
    expect((await eligibilityMap(prismaOf({ packageCode: 'ALTIN', expiresAt: FUTURE }), ['o1'])).get('o1')).toBe(true);
    expect((await eligibilityMap(prismaOf({ packageCode: 'ALTIN', sureTuru: 'SURESIZ_OZEL' }), ['o1'])).get('o1')).toBe(true);
  });
});

describe('F13 — maxTeams ayardan; kodda yedek tablo yok', () => {
  it('parsePackageCatalog maxTeams taşır; resolveMaxTeams ayardaki değeri döndürür, yoksa eski türetme (PROVA-2)', () => {
    const rows = catalogOf([{ code: 'ALTIN', name: 'Altın', price: 4950, totalUsers: 12, portfolioCapacity: 600, monthlyPk: 4800, maxTeams: 4 }, { code: 'BRONZ', name: 'Bronz', price: 1350, totalUsers: 3, portfolioCapacity: 150, monthlyPk: 1200 }]);
    expect(rows.get('ALTIN')!.maxTeams).toBe(4);
    expect(rows.get('BRONZ')!.maxTeams).toBeNull();
    expect(resolveMaxTeams(rows.get('ALTIN'), 12)).toBe(4);
    expect(resolveMaxTeams(rows.get('BRONZ'), 3)).toBe(1); // PROVA-2: ayarda yoksa eski türetme
  });
});

describe('F14 — Özel paket snapshot haklarında Kardeş Ofis', () => {
  it('Özel satırı kardesOfis=true ise canlı snapshot sonucu Kardeş Ofis hakkını korur; Ofis Boy üst sınırı uygulanır', () => {
    const catalog = catalogOf([...(OFFICE_SETTINGS_FIXTURE.OFFICE_MEMBERSHIP_PACKAGES as any[]).filter((p) => p.code !== 'OFIS_25_PLUS'), { code: 'OZEL', name: 'Özel', isCustomPrice: true, kardesOfis: true }]);
    const addon = parseAddonConfig({ ...(OFFICE_SETTINGS_FIXTURE.OFFICE_ADDON_CONFIG as any), ofisBoy: { ...(OFFICE_SETTINGS_FIXTURE.OFFICE_ADDON_CONFIG as any).ofisBoy, ofisBoyOzelUst: 3 } });
    const at = new Date();
    const eff = computeEntitlements({
      officeId: 'o1', at, catalog, addon, trial: parseTrialConfig(OFFICE_SETTINGS_FIXTURE.OFFICE_TRIAL_CONFIG), free: parseFreeLimits(OFFICE_SETTINGS_FIXTURE.OFFICE_FREE_LIMITS),
      subscription: { paketKodu: 'OZEL', durum: 'AKTIF', sureTuru: 'DONEMLI', baslangicTarihi: new Date(at.getTime() - 86400000), bitisTarihi: new Date(at.getTime() + 86400000 * 20), kaynakKanal: 'ADMIN',
        hakSnapshot: { users: 40, portfolio: 2000, monthlyPk: 0, ofisBoy: 9, crm: null, name: 'Özel' }, snapshotBitis: new Date(at.getTime() + 86400000 * 20) }, addons: [], trialRecord: null,
    });
    expect(eff).toMatchObject({ state: 'UCRETLI', packageCode: 'OZEL', kardesOfis: true, ofisBoy: 3, users: 40 });
  });
});

describe('F15 — üst paket daha ucuz', () => {
  it('eklentili toplam, aynı kullanıcı/portföy/PK\'yı veren daha ucuz üst paket varsa EN UCUZUNU önerir; yoksa null', () => {
    const catalog = catalogOf(); const addon = parseAddonConfig(OFFICE_SETTINGS_FIXTURE.OFFICE_ADDON_CONFIG);
    // Bronz + 3 ek kullanıcı = 6 kullanıcı / 300 portföy / 2400 PK, maliyet 1350+3×400=2550 ≥ Gümüş 2500 (aynı hak) → Gümüş
    expect(cheaperUpperPackage(catalog, addon, 'BRONZ', 3)?.code).toBe('GUMUS');
    // Bronz + 10 ek kullanıcı: hiçbir üst paket (Altın 12 < 13 kullanıcı; Platinum 9950 > 5350) hem yeterli hem ucuz değil
    expect(cheaperUpperPackage(catalog, addon, 'BRONZ', 10)).toBeNull();
    expect(cheaperUpperPackage(catalog, addon, 'BRONZ', 1)).toBeNull(); // 1 ek kullanıcı: hiçbir üst paket ucuz/yeterli değil
    expect(cheaperUpperPackage(catalog, addon, 'BRONZ', 0)).toBeNull();
  });
});

describe('F01/F06 — eski kanalda ücretli hak varken yeni paket satın alımı', () => {
  it('legacyPaidActive=true ve ilişkisel canlı satır yok → CHANNEL_UNKNOWN_REVIEW', () => {
    const base = { office: { isActive: true, ownerUserId: 'u' }, actorUserId: 'u', kind: 'PAKET' as const, packageCode: 'BRONZ', channel: 'APPLE', sourceKey: 'k', amount: 1350,
      catalog: catalogOf(), addon: parseAddonConfig(OFFICE_SETTINGS_FIXTURE.OFFICE_ADDON_CONFIG), currentSub: null, currentAddons: [], at: new Date() };
    expect(checkPurchaseEligibility({ ...base, legacyPaidActive: true })).toMatchObject({ ok: false, code: 'CHANNEL_UNKNOWN_REVIEW' });
    expect(checkPurchaseEligibility({ ...base, legacyPaidActive: false })).toEqual({ ok: true });
  });
});

describe('F10 — kapasite azaltımında canlı abonelik hakları dönem sonuna kadar korunur', () => {
  it('protectLiveSnapshotsOnCatalogChange: azalan paketin canlı aboneliğine eski haklar snapshot olarak yazılır; artışta dokunmaz', async () => {
    const now = new Date();
    const subs: any[] = [{ id: 's1', paketKodu: 'BRONZ', durum: 'AKTIF', bitisTarihi: new Date(now.getTime() + 86400000 * 10), hakSnapshot: null, snapshotBitis: null }];
    const updates: any[] = [];
    const tx: any = { ofisAbonelik: { findMany: async () => subs, update: async (a: any) => { updates.push(a); return {}; } } };
    const before = catalogOf().get('BRONZ'); const lower = { ...before!, portfolio: before!.portfolio - 50, monthlyPk: before!.monthlyPk - 100 };
    expect(await protectLiveSnapshotsOnCatalogChange(tx, 'BRONZ', before, lower, now)).toBe(1);
    expect(updates[0].data.hakSnapshot).toMatchObject({ users: before!.totalUsers, portfolio: before!.portfolio, monthlyPk: before!.monthlyPk });
    expect(updates[0].data.snapshotBitis).toEqual(subs[0].bitisTarihi);
    updates.length = 0;
    expect(await protectLiveSnapshotsOnCatalogChange(tx, 'BRONZ', before, { ...before!, portfolio: before!.portfolio + 50 }, now)).toBe(0);
    expect(updates).toHaveLength(0);
  });
});
