import { StoreCatalogService } from './store-catalog.service';
import { OFFICE_SETTINGS_FIXTURE } from '../../office/office-entitlement.fixture';

/* EPH-70B2: GET /payments/store/catalog (sözleşme r2 §3.1). Sahte Prisma; gerçek mağaza/DB yok. */
const PRODUCTS = [
  { platform: 'APPLE', urunTuru: 'UYELIK', segment: 'OFFICE', paketKodu: 'SOLO', magazaUrunKimligi: 'eph_sub_office_solo_v1', urunAnahtari: 'office_solo', googleBasePlanKimligi: null, kisiSayisi: null, pkUrunKodu: null, uyelikPaketiId: null },
  { platform: 'APPLE', urunTuru: 'UYELIK', segment: 'OFFICE', paketKodu: 'BRONZ', magazaUrunKimligi: 'eph_sub_office_bronz_v1', urunAnahtari: 'office_bronz', googleBasePlanKimligi: null, kisiSayisi: null, pkUrunKodu: null, uyelikPaketiId: null },
  { platform: 'APPLE', urunTuru: 'EK_KULLANICI', segment: null, paketKodu: null, magazaUrunKimligi: 'eph_addon_user_3_v1', urunAnahtari: 'addon_user_3', googleBasePlanKimligi: null, kisiSayisi: 3, pkUrunKodu: null, uyelikPaketiId: null },
  { platform: 'APPLE', urunTuru: 'OFIS_BOY', segment: null, paketKodu: null, magazaUrunKimligi: 'eph_addon_ofisboy_v1', urunAnahtari: 'addon_ofisboy', googleBasePlanKimligi: null, kisiSayisi: null, pkUrunKodu: null, uyelikPaketiId: null },
  { platform: 'APPLE', urunTuru: 'PK', segment: null, paketKodu: null, magazaUrunKimligi: 'eph_pk_250_v1', urunAnahtari: 'pk_250', googleBasePlanKimligi: null, kisiSayisi: null, pkUrunKodu: 'PK_250', uyelikPaketiId: null },
];

function setup(userOver: any = {}, subRow: any = null, source: 'relational' | 'legacy' = 'relational') {
  const settings: Record<string, unknown> = { ...OFFICE_SETTINGS_FIXTURE, OFFICE_ENTITLEMENT_SOURCE: source, EPH_PAYMENT_SETTINGS_V1: { pkProducts: [{ code: 'PK_250', name: '250 PK', credits: 250, amountMinor: 25000, active: true }] } };
  const user = { id: 'owner', role: 'EMLAKCI', officeId: 'o1', storeAccountToken: 'tok', capabilities: [{ capability: 'OFFICE_OWNER' }], ownedOffices: [{ id: 'o1', name: 'Ofis' }], ...userOver };
  const prisma: any = {
    user: { findUnique: jest.fn(async () => user), update: jest.fn(async ({ data }: any) => Object.assign(user, data)) },
    storeProduct: { findMany: jest.fn(async () => PRODUCTS) },
    uyelikPaketi: { findUnique: jest.fn(async () => null) },
    systemSetting: {
      findUnique: jest.fn(async ({ where }: any) => (settings[where.key] ? { valueJson: settings[where.key] } : null)),
      findMany: jest.fn(async ({ where }: any) => where.key.in.filter((k: string) => settings[k]).map((k: string) => ({ key: k, valueJson: settings[k] }))),
    },
    office: { findUnique: jest.fn(async () => ({ isActive: true, ownerUserId: 'owner' })) },
    ofisAbonelik: { findFirst: jest.fn(async () => subRow) },
    ofisEklenti: { findMany: jest.fn(async () => []) },
    ofisDenemeKaydi: { findUnique: jest.fn(async () => null) },
    kullaniciUyelikPaketi: { findFirst: jest.fn(async () => null) },
  };
  return new StoreCatalogService(prisma);
}
const sub = (paketKodu: string, kaynakKanal: string, key: string) => ({ paketKodu, durum: 'AKTIF', sureTuru: 'DONEMLI', baslangicTarihi: new Date(Date.now() - 86400000), bitisTarihi: new Date(Date.now() + 86400000 * 20), hakSnapshot: null, snapshotBitis: null, kaynakKanal, kaynakAbonelikAnahtari: key });

describe('GET /payments/store/catalog', () => {
  beforeEach(() => { process.env.STORE_PAYMENTS_ENABLED = 'true'; });
  afterAll(() => { delete process.env.STORE_PAYMENTS_ENABLED; });

  it('ODM-7G-D F01: OFFICE_ENTITLEMENT_SOURCE=legacy iken yeni ofis ürünleri (Solo, Ek Kullanıcı, Ofis Boy) satın alınamaz', async () => {
    const r: any = await setup({}, sub('BRONZ', 'APPLE', 'k1'), 'legacy').catalog('owner', 'IOS');
    expect(r.addonProducts.every((a: any) => a.canPurchase === false && a.blockCode === 'OFFICE_PRODUCT_NOT_AVAILABLE_YET')).toBe(true);
    expect(r.membershipProducts.find((m: any) => m.packageCode === 'SOLO')).toMatchObject({ canPurchase: false, blockCode: 'OFFICE_PRODUCT_NOT_AVAILABLE_YET' });
  });
  it('geçersiz platform 400 STORE_PLATFORM_INVALID', async () => {
    await expect(setup().catalog('owner', 'WEB')).rejects.toMatchObject({ response: { code: 'STORE_PLATFORM_INVALID' } });
  });
  it('ofis sahibi: 5 ofis paketi hakları ayardan, fiyat alanı YOK, SOLO dahil, ek kullanıcı/Ofis Boy temel paket olmadan kapalı', async () => {
    const r: any = await setup().catalog('owner', 'IOS');
    expect(r).toMatchObject({ platform: 'IOS', storeEnabled: true, accountToken: 'tok', segment: 'OFFICE', purchaseTarget: { walletKind: 'OFFICE', officeId: 'o1' }, activeMembership: null });
    const solo = r.membershipProducts.find((p: any) => p.packageCode === 'SOLO');
    expect(solo).toMatchObject({ canPurchase: true, storeProductId: 'eph_sub_office_solo_v1', rights: { aylikPaketPk: 400, aktifPortfoyLimiti: 50, ofisAltKullaniciLimiti: 0, kardesOfisAcik: false, ofisBoyDahil: 0 } });
    expect(JSON.stringify(r)).not.toMatch(/"(price|fiyat|amountMinor)"/i);
    for (const a of r.addonProducts) expect(a).toMatchObject({ canPurchase: false, blockCode: 'ADDON_REQUIRES_OFFICE_PACKAGE' });
    expect(r.pkProducts[0]).toMatchObject({ code: 'PK_250', credits: 250, canPurchase: true });
  });
  it('Bronz aktifken ek kullanıcı ve Ofis Boy satın alınabilir', async () => {
    const r: any = await setup({}, sub('BRONZ', 'APPLE', 'orig')).catalog('owner', 'IOS');
    expect(r.activeMembership).toMatchObject({ source: 'APPLE', sourceLabel: 'App Store', canManageInThisPlatform: true });
    expect(r.addonProducts.map((a: any) => [a.kind, a.canPurchase])).toEqual([['EK_KULLANICI', true], ['OFIS_BOY', true]]);
    expect(r.addonProducts[0]).toMatchObject({ kisiSayisi: 3, name: '+3 Kullanıcı' });
  });
  it('başka kanalda aktif üyelik: nötr bilgi mesajı, link yok, ek PK serbest (karar 6)', async () => {
    const r: any = await setup({}, sub('BRONZ', 'IYZICO', 'web')).catalog('owner', 'IOS');
    expect(r.activeMembership).toMatchObject({ source: 'IYZICO', sourceLabel: 'Web', canManageInThisPlatform: false });
    const blocked = r.membershipProducts.find((p: any) => p.packageCode === 'SOLO');
    expect(blocked).toMatchObject({ canPurchase: false, blockCode: 'MEMBERSHIP_ACTIVE_OTHER_CHANNEL', blockMessage: 'Üyeliğiniz aktif. Kaynak: Web.' });
    expect(r.pkProducts[0].canPurchase).toBe(true);
  });
  it('danışman: ürünler listelenir ama satın alma kapalı (OFFICE_AGENT_PURCHASE_FORBIDDEN)', async () => {
    const r: any = await setup({ id: 'agent', capabilities: [], ownedOffices: [] }).catalog('agent', 'IOS');
    expect([...r.membershipProducts, ...r.addonProducts, ...r.pkProducts].every((p: any) => !p.canPurchase && p.blockCode === 'OFFICE_AGENT_PURCHASE_FORBIDDEN')).toBe(true);
  });
  it('mağaza kapalıyken storeEnabled=false ve canPurchase=false; rolsüz hesap 403', async () => {
    process.env.STORE_PAYMENTS_ENABLED = 'false';
    const r: any = await setup().catalog('owner', 'IOS');
    expect(r.storeEnabled).toBe(false);
    expect(r.membershipProducts.every((p: any) => !p.canPurchase && p.blockCode === 'STORE_DISABLED')).toBe(true);
    await expect(setup({ role: 'USER' }).catalog('owner', 'IOS')).rejects.toMatchObject({ response: { code: 'ROLE_NOT_ELIGIBLE' } });
  });
  it('hesap tokeni yoksa üretilir ve kaydedilir', async () => {
    const r: any = await setup({ storeAccountToken: null }).catalog('owner', 'IOS');
    expect(r.accountToken).toMatch(/^[0-9a-f-]{36}$/);
  });
});
