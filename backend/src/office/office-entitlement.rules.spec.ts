import { OFFICE_SETTINGS_FIXTURE as F } from './office-entitlement.fixture';
import {
  EntitlementConfigError, checkPurchaseEligibility, cheaperUpperPackage, computeEntitlements, parseAddonConfig, parseFreeLimits, parsePackageCatalog, parseTrialConfig, subscriptionLive,
} from './office-entitlement.rules';

/* EPH-70B2 kabul matrisi (plan v2 B2.9). Değerler EPH_ODEME_SISTEMI.md §12 (KİLİTLİ) ile birebir; test verisi OFFICE_SETTINGS_FIXTURE = scripts/eph70b2_ayarlar.sql. */
const catalog = parsePackageCatalog(F.OFFICE_MEMBERSHIP_PACKAGES);
const addon = parseAddonConfig(F.OFFICE_ADDON_CONFIG);
const trial = parseTrialConfig(F.OFFICE_TRIAL_CONFIG);
const free = parseFreeLimits(F.OFFICE_FREE_LIMITS);
const NOW = new Date('2026-11-10T12:00:00Z');
const day = (n: number) => new Date(NOW.getTime() + n * 86400000);
const sub = (paketKodu: string, over: any = {}) => ({ paketKodu, durum: 'AKTIF', sureTuru: 'DONEMLI', baslangicTarihi: day(-5), bitisTarihi: day(20), hakSnapshot: null, snapshotBitis: null, kaynakKanal: 'APPLE', ...over });
const eff = (subscription: any, addons: any[] = [], trialRecord: any = null) => computeEntitlements({ officeId: 'o1', at: NOW, catalog, addon, trial, free, subscription, addons, trialRecord });

describe('Kabul matrisi — paketler (§12.2)', () => {
  const rows: Array<[string, number, number, number, number, boolean, number]> = [
    // kod, kullanıcı, TL, portföy, aylık PK, kardeş, dahil Ofis Boy
    ['SOLO', 1, 500, 50, 400, false, 0],
    ['BRONZ', 3, 1350, 150, 1200, false, 0],
    ['GUMUS', 6, 2500, 300, 2400, false, 0],
    ['ALTIN', 12, 4950, 600, 4800, true, 0],
    ['PLATINUM', 25, 9950, 1250, 10000, true, 2],
  ];
  it.each(rows)('%s: kullanıcı %i, %i TL, portföy %i, PK %i, kardeş %s, Ofis Boy dahil %i', (code, users, price, portfolio, pk, kardes, boy) => {
    expect(catalog.get(code)).toMatchObject({ totalUsers: users, price, portfolio, monthlyPk: pk, kardesOfis: kardes, ofisBoyDahil: boy });
    const e = eff(sub(code));
    expect(e).toMatchObject({ state: 'UCRETLI', users, agents: users - 1, portfolio, monthlyPk: pk, kardesOfis: kardes, ofisBoy: boy });
  });
  it('ilke: her kullanıcı 50 portföy + 400 PK getirir (Solo..Platinum)', () => {
    for (const [, users, , portfolio, pk] of rows) { expect(portfolio).toBe(users * 50); expect(pk).toBe(users * 400); }
  });
  it('Özel paket otomatik hak taşımaz; satın alınamaz', () => {
    expect(catalog.get('OFIS_25_PLUS')).toMatchObject({ custom: true, price: null });
    expect(eff(sub('OFIS_25_PLUS')).state).toBe('UCRETSIZ');
  });
});

describe('Ek kullanıcı ve Ofis Boy (§12.3)', () => {
  it('her kademe: adet × (+1 kullanıcı, +50 portföy, +400 PK) — Bronz ve üstünde; Ofis Boy kullanıcı sayısına girmez (18d)', () => {
    for (const n of [1, 2, 3, 5, 10]) {
      const e = eff(sub('BRONZ'), [{ tur: 'EK_KULLANICI', adet: n, durum: 'AKTIF', bitisTarihi: day(20) }]);
      expect(e).toMatchObject({ users: 3 + n, portfolio: 150 + n * 50, monthlyPk: 1200 + n * 400, ekKullaniciAdet: n });
    }
    expect(addon.ekKullanici.kademeler).toEqual([1, 2, 3, 5, 10]);
  });
  it('Solo\'da ek kullanıcı etkisizdir (Bronz ve üstü); geçersiz kademe etkisizdir', () => {
    expect(eff(sub('SOLO'), [{ tur: 'EK_KULLANICI', adet: 3, durum: 'AKTIF', bitisTarihi: day(20) }]).users).toBe(1);
    expect(eff(sub('BRONZ'), [{ tur: 'EK_KULLANICI', adet: 4, durum: 'AKTIF', bitisTarihi: day(20) }]).users).toBe(3);
  });
  it('Ofis Boy: tek ürün = koltukPerUrun (2) koltuk; PK/portföy getirmez; Platinum\'da 2 dahil, eklenti etkisiz', () => {
    const boy = [{ tur: 'OFIS_BOY', adet: 1, durum: 'AKTIF', bitisTarihi: day(20) }];
    expect(eff(sub('ALTIN'), boy)).toMatchObject({ ofisBoy: 2, users: 12, portfolio: 600, monthlyPk: 4800 });
    expect(eff(sub('PLATINUM'), boy)).toMatchObject({ ofisBoy: 2, ofisBoyAddonAktif: false });
    expect(eff(sub('PLATINUM')).ofisBoy).toBe(2);
  });
  it('temel paket bitince eklenti de etkisiz olur (aynı anda AKTIF kalamaz)', () => {
    const e = eff(sub('BRONZ', { bitisTarihi: day(-1) }), [{ tur: 'EK_KULLANICI', adet: 5, durum: 'AKTIF', bitisTarihi: day(20) }]);
    expect(e.state).toBe('UCRETSIZ');
    expect(e.users).toBe(1);
  });
  it('"bir üst paket daha ucuz" uyarısı DB fiyatlarından hesaplanır', () => {
    expect(cheaperUpperPackage(catalog, addon, 'BRONZ', 3)?.code).toBe('GUMUS'); // 1350+1200=2550 >= 2500, 6 kullanıcı
    expect(cheaperUpperPackage(catalog, addon, 'BRONZ', 1)).toBeNull();
  });
});

describe('Deneme ve Ücretsiz (§12.4-12.5)', () => {
  it('deneme: Gümüş düzeyi (6 kullanıcı, 300 portföy), 500 PK, Kardeş Ofis/Ofis Boy kapalı', () => {
    const e = eff(null, [], { baslangicTarihi: day(-1), bitisTarihi: day(13), sonlandiTarihi: null });
    expect(e).toMatchObject({ state: 'DENEME', users: 6, portfolio: 300, monthlyPk: 500, kardesOfis: false, ofisBoy: 0, channel: 'DENEME' });
    expect(trial).toMatchObject({ gun: 14, pk: 500, kartIstenir: false });
  });
  it('deneme biterse otomatik Ücretsiz; ücretli abonelik denemeden önceliklidir', () => {
    expect(eff(null, [], { baslangicTarihi: day(-15), bitisTarihi: day(-1), sonlandiTarihi: null }).state).toBe('UCRETSIZ');
    expect(eff(sub('SOLO'), [], { baslangicTarihi: day(-1), bitisTarihi: day(13), sonlandiTarihi: null }).state).toBe('UCRETLI');
  });
  it('Ücretsiz: 1 kullanıcı, 10 portföy, 50 CRM, 0 PK; 0=kapalı, null=sınırsız anlamı', () => {
    expect(eff(null)).toMatchObject({ state: 'UCRETSIZ', users: 1, agents: 0, portfolio: 10, crm: 50, monthlyPk: 0, havuzIlanMax: 3, talepMax: 2, linaGunluk: 5, projeYonetimi: false, kardesOfis: false, ofisBoy: 0, pasifGun: 90 });
    expect(parseFreeLimits({ ...F.OFFICE_FREE_LIMITS as any, crm: null }).crm).toBeNull();
    expect(parseFreeLimits({ ...F.OFFICE_FREE_LIMITS as any, talepMax: 0 }).talepMax).toBe(0);
  });
});

describe('Süre ve geçiş kuralları', () => {
  it('NULL / bozuk bitiş ücretli hak sayılmaz (F15); yalnız açık SURESIZ_OZEL süresizdir', () => {
    expect(subscriptionLive(sub('ALTIN', { bitisTarihi: null }), NOW)).toBe(false);
    expect(subscriptionLive(sub('ALTIN', { bitisTarihi: new Date('x') }), NOW)).toBe(false);
    expect(subscriptionLive(sub('ALTIN', { sureTuru: 'SURESIZ_OZEL', bitisTarihi: null }), NOW)).toBe(true);
    expect(subscriptionLive(sub('ALTIN', { durum: 'IPTAL' }), NOW)).toBe(false);
    expect(subscriptionLive(sub('ALTIN', { durum: 'GRACE' }), NOW)).toBe(true); // grace erişim verir
  });
  it('18a: düşen limit dönem sonuna kadar eski değerde, yükselen hemen yeni değerde', () => {
    const snap = { users: 12, portfolio: 600, monthlyPk: 4800, ofisBoy: 0, crm: null, name: 'Eski' };
    const live = eff(sub('BRONZ', { hakSnapshot: snap, snapshotBitis: day(10) }));
    expect(live).toMatchObject({ users: 12, portfolio: 600, snapshotApplied: true });
    const over = eff(sub('BRONZ', { hakSnapshot: snap, snapshotBitis: day(-1) }));
    expect(over).toMatchObject({ users: 3, portfolio: 150, snapshotApplied: false });
    const higher = eff(sub('ALTIN', { hakSnapshot: { users: 3, portfolio: 150, monthlyPk: 1200, ofisBoy: 0, crm: null }, snapshotBitis: day(10) }));
    expect(higher).toMatchObject({ users: 12, portfolio: 600 });
  });
});

describe('Ayarlar fail-closed (§0-B)', () => {
  it('eksik/geçersiz ayar EntitlementConfigError fırlatır; sessiz varsayılan yok', () => {
    expect(() => parsePackageCatalog('x')).toThrow(EntitlementConfigError);
    expect(() => parsePackageCatalog([{ code: 'A', price: 10, totalUsers: 0, portfolioCapacity: 1, monthlyPk: 1 }])).toThrow(EntitlementConfigError);
    expect(() => parsePackageCatalog([{ code: 'A', price: 10, totalUsers: 1, portfolioCapacity: 1 }])).toThrow(EntitlementConfigError);
    expect(() => parseAddonConfig({ ekKullanici: {}, ofisBoy: {} })).toThrow(EntitlementConfigError);
    expect(() => parseTrialConfig({ gun: 14 })).toThrow(EntitlementConfigError);
    expect(() => parseFreeLimits({ ...F.OFFICE_FREE_LIMITS as any, aktifPortfoy: -1 })).toThrow(EntitlementConfigError);
  });
  it('kodda sabit ticari değer yok: ayar değişince sonuç değişir', () => {
    const changed = parsePackageCatalog((F.OFFICE_MEMBERSHIP_PACKAGES as any[]).map((p) => (p.code === 'BRONZ' ? { ...p, portfolioCapacity: 999, monthlyPk: 7 } : p)));
    const e = computeEntitlements({ officeId: 'o', at: NOW, catalog: changed, addon, trial, free, subscription: sub('BRONZ'), addons: [], trialRecord: null });
    expect(e).toMatchObject({ portfolio: 999, monthlyPk: 7 });
  });
});

describe('Satın alma uygunluğu (F10/F11)', () => {
  const office = { isActive: true, ownerUserId: 'owner' };
  const base = { office, actorUserId: 'owner', channel: 'APPLE', sourceKey: 'orig-1', amount: 1350, catalog, addon, at: NOW, currentSub: null, currentAddons: [] as any[] };
  const check = (over: any) => checkPurchaseEligibility({ ...base, kind: 'PAKET', packageCode: 'BRONZ', ...over });
  const code = (r: any) => (r.ok ? 'OK' : r.code);
  const live = (kanal: string | null, key: string | null, paket = 'BRONZ') => ({ ...sub(paket, { kaynakKanal: kanal }), kaynakAbonelikAnahtari: key });

  it('yalnız ofis sahibi satın alır (danışman/Ofis Boy reddedilir, PK dahil kural aynı)', () => {
    expect(code(check({}))).toBe('OK');
    expect(code(check({ actorUserId: 'agent' }))).toBe('OFFICE_AGENT_PURCHASE_FORBIDDEN');
    expect(code(check({ office: null }))).toBe('OFFICE_NOT_FOUND');
  });
  it('0 TL ve satılamayan paketler: Ücretsiz, Deneme, Özel, pasif', () => {
    expect(code(check({ amount: 0 }))).toBe('AMOUNT_INVALID');
    for (const c of ['UCRETSIZ', 'DENEME', 'OFIS_25_PLUS', 'YOK']) expect(code(check({ packageCode: c }))).toBe('PACKAGE_NOT_PURCHASABLE');
  });
  it('kanal çakışması: başka kanal aktifse ret; kaynak NULL izinli sayılmaz; aynı zincirde yükseltme serbest; ADMIN/DENEME çakışma sayılmaz', () => {
    expect(code(check({ currentSub: live('IYZICO', 'web-1') }))).toBe('MEMBERSHIP_ACTIVE_OTHER_CHANNEL');
    expect(code(check({ currentSub: live(null, null) }))).toBe('CHANNEL_UNKNOWN_REVIEW');
    expect(code(check({ currentSub: live('APPLE', 'orig-1', 'SOLO'), packageCode: 'GUMUS' }))).toBe('OK');
    expect(code(check({ currentSub: live('APPLE', 'orig-OTHER') }))).toBe('MEMBERSHIP_ACTIVE_OTHER_CHANNEL');
    expect(code(check({ currentSub: live('ADMIN', 'a') }))).toBe('OK');
    expect(code(check({ currentSub: live('IYZICO', 'w', 'BRONZ') && { ...live('IYZICO', 'w'), bitisTarihi: day(-1) } }))).toBe('OK'); // süresi dolmuş
  });
  it('ek kullanıcı: Bronz+ gerekir, kademe geçerli olmalı, tek kademe (farklı zincir reddedilir, aynı zincir yerine koyar)', () => {
    const ek = (over: any) => checkPurchaseEligibility({ ...base, kind: 'EK_KULLANICI', adet: 3, amount: 1200, currentSub: live('APPLE', 'orig-1'), ...over });
    expect(code(ek({}))).toBe('OK');
    expect(code(ek({ currentSub: null }))).toBe('ADDON_REQUIRES_OFFICE_PACKAGE');
    expect(code(ek({ currentSub: live('APPLE', 'orig-1', 'SOLO') }))).toBe('ADDON_REQUIRES_OFFICE_PACKAGE');
    expect(code(ek({ adet: 4 }))).toBe('ADDON_TIER_INVALID');
    const existing = { tur: 'EK_KULLANICI', adet: 1, durum: 'AKTIF', bitisTarihi: day(10), kaynakKanal: 'APPLE', kaynakAbonelikAnahtari: 'eku-1' };
    expect(code(ek({ currentAddons: [existing], sourceKey: 'eku-2' }))).toBe('ADDON_TIER_ALREADY_ACTIVE');
    expect(code(ek({ currentAddons: [existing], sourceKey: 'eku-1' }))).toBe('OK');
  });
  it('Ofis Boy: izinli paketler (Solo..Altın), Platinum\'da dahil olduğu için satılmaz, Ücretsiz/Deneme\'de yok', () => {
    const boy = (over: any) => checkPurchaseEligibility({ ...base, kind: 'OFIS_BOY', amount: 300, sourceKey: 'boy-1', currentSub: live('APPLE', 'orig-1', 'ALTIN'), ...over });
    expect(code(boy({}))).toBe('OK');
    expect(code(boy({ currentSub: live('APPLE', 'orig-1', 'PLATINUM') }))).toBe('ADDON_INCLUDED_IN_PACKAGE');
    expect(code(boy({ currentSub: null }))).toBe('ADDON_REQUIRES_OFFICE_PACKAGE');
  });
});
