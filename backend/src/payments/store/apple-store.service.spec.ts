import { AppleStoreService, StoreError } from './apple-store.service';
import { AppleSignatureError, AppleStorePort, AppleTransactionNotFoundError } from './apple-store.port';
import { AppleStoreConfig } from './apple-store.config';
import { MembershipService } from '../../membership/membership.service';
import { OFFICE_SETTINGS_FIXTURE } from '../../office/office-entitlement.fixture';

/* ODM-3 birim testleri: gerçek Apple/DB yok. Sahte port "imzalı" yükü (FAKE.<base64>.VALID) doğrular; sahte Prisma bellekte çalışır. */

const TOKEN = '11111111-2222-3333-4444-555555555555';
const BUNDLE = 'com.eph.test';
let seq = 0;

const jws = (body: unknown, sig = 'VALID') => `FAKE.${Buffer.from(JSON.stringify(body)).toString('base64')}.${sig}`;

class FakeApple implements AppleStorePort {
  transactions = new Map<string, { transaction: any; environment: 'PRODUCTION' | 'SANDBOX' }>();
  async getTransaction(id: string) {
    const found = this.transactions.get(id);
    if (!found) throw new AppleTransactionNotFoundError('yok');
    return found;
  }
  async decodeNotification(signed: string) {
    const [head, payload, sig] = signed.split('.');
    if (head !== 'FAKE' || sig !== 'VALID') throw new AppleSignatureError('imza');
    const body = JSON.parse(Buffer.from(payload, 'base64').toString());
    return { notification: body.notification, transaction: body.transaction, renewal: body.renewal, environment: body.environment ?? 'PRODUCTION' };
  }
}

const tmv = (v: any) => (v instanceof Date ? v.getTime() : v);
const match = (row: any, where: any): boolean => Object.entries(where ?? {}).every(([key, value]) => {
  if (value && typeof value === 'object' && !(value instanceof Date) && !Array.isArray(value)) {
    if ('in' in (value as any)) return (value as any).in.includes(row[key]);
    if ('lte' in (value as any) || 'lt' in (value as any) || 'gt' in (value as any) || 'gte' in (value as any)) {
      const v = row[key]; const o = value as any; if (v === null || v === undefined) return false;
      return (!('lte' in o) || tmv(v) <= tmv(o.lte)) && (!('lt' in o) || tmv(v) < tmv(o.lt)) && (!('gt' in o) || tmv(v) > tmv(o.gt)) && (!('gte' in o) || tmv(v) >= tmv(o.gte));
    }
    if (key.includes('_')) return match(row, value);
    return true;
  }
  if (value instanceof Date) return row[key] instanceof Date && row[key].getTime() === value.getTime();
  return value === undefined || row[key] === value;
});

function makeDb() {
  const t: Record<string, any[]> = {
    user: [], storeProduct: [], uyelikPaketi: [], kullaniciUyelikPaketi: [], paymentSettlement: [], paymentOrder: [], paymentTransaction: [],
    storeEntitlementGrant: [], storeSubscription: [], paymentWebhookEvent: [], paymentProvider: [], portfolioCreditLot: [], kontorCuzdani: [],
    kontorHareketi: [], auditLog: [], systemSetting: [],
    office: [], ofisAbonelik: [], ofisEklenti: [], ofisHakDonemi: [], ofisDenemeKaydi: [],
  };
  const flag = { failSettle: false };
  const id = (p: string) => `${p}-${++seq}`;
  const find = (name: string, where: any) => t[name].find((r) => match(r, where)) ?? null;
  const base = (name: string, extra: Record<string, any> = {}) => ({
    findUnique: async ({ where, include }: any = {}) => withInclude(name, find(name, where), include),
    findFirst: async ({ where }: any = {}) => find(name, where),
    findMany: async ({ where }: any = {}) => t[name].filter((r) => match(r, where)),
    update: async ({ where, data }: any) => {
      const row = find(name, where); if (!row) throw new Error(`${name} yok`);
      for (const [k, v] of Object.entries(data)) {
        if (v && typeof v === 'object' && !(v instanceof Date) && 'decrement' in (v as any)) row[k] -= (v as any).decrement;
        else if (v && typeof v === 'object' && !(v instanceof Date) && 'increment' in (v as any)) row[k] += (v as any).increment;
        else row[k] = v;
      }
      return row;
    },
    updateMany: async ({ where, data }: any) => { t[name].filter((r) => match(r, where)).forEach((r) => Object.assign(r, data)); return { count: 1 }; },
    create: async ({ data }: any) => { const row = { id: id(name), ...data }; t[name].push(row); return row; },
    ...extra,
  });
  const withInclude = (name: string, row: any, include: any) => {
    if (!row || !include) return row;
    const out = { ...row };
    if (include.order) out.order = find('paymentOrder', { id: row.orderId });
    return out;
  };
  const uniqueKeys: Record<string, string[]> = { storeEntitlementGrant: ['platform', 'magazaIslemKimligi'], paymentOrder: ['siparisNo'] };
  const strictCreate = (name: string) => async ({ data }: any) => {
    const keys = uniqueKeys[name];
    if (keys && t[name].some((r) => keys.every((k) => r[k] === data[k]))) throw Object.assign(new Error('unique'), { code: 'P2002' });
    const row = { id: id(name), ...data }; t[name].push(row); return row;
  };
  const upsertBy = (name: string) => async ({ where, create, update }: any) => {
    const row = find(name, where);
    if (row) { Object.assign(row, update ?? {}); return row; }
    const made = { id: id(name), ...create }; t[name].push(made); return made;
  };
  const prisma: any = {
    _t: t, _flag: flag,
    user: base('user'), storeProduct: base('storeProduct'), uyelikPaketi: base('uyelikPaketi'), systemSetting: base('systemSetting', { upsert: upsertBy('systemSetting') }),
    kullaniciUyelikPaketi: base('kullaniciUyelikPaketi', { findFirst: async ({ where }: any) => t.kullaniciUyelikPaketi.filter((r) => match(r, where)).sort((a, b) => +b.baslangicTarihi - +a.baslangicTarihi)[0] ?? null }),
    paymentSettlement: base('paymentSettlement', { findFirst: async ({ where }: any) => { const r = find('paymentSettlement', where); return r ? { ...r, order: find('paymentOrder', { id: r.orderId }) } : null; } }),
    paymentOrder: base('paymentOrder', { create: strictCreate('paymentOrder'), upsert: upsertBy('paymentOrder') }),
    paymentTransaction: base('paymentTransaction'),
    storeEntitlementGrant: base('storeEntitlementGrant', { create: strictCreate('storeEntitlementGrant') }),
    storeSubscription: base('storeSubscription', { upsert: upsertBy('storeSubscription') }),
    paymentWebhookEvent: base('paymentWebhookEvent', { upsert: upsertBy('paymentWebhookEvent') }),
    paymentProvider: base('paymentProvider', { upsert: upsertBy('paymentProvider') }),
    portfolioCreditLot: base('portfolioCreditLot'), kontorHareketi: base('kontorHareketi'), auditLog: base('auditLog'),
    kontorCuzdani: base('kontorCuzdani', { upsert: async ({ where, create }: any) => find('kontorCuzdani', where) ?? (t.kontorCuzdani.push({ id: `w-${create.kullaniciId}`, bakiye: 0, toplamYukleme: 0, toplamHarcama: 0, toplamHediye: 0, aktifMi: true, ...create }), t.kontorCuzdani[t.kontorCuzdani.length - 1]) }),
    office: base('office'), ofisAbonelik: base('ofisAbonelik'), ofisEklenti: base('ofisEklenti'), ofisHakDonemi: base('ofisHakDonemi', { create: async ({ data }: any) => { const row = { id: id('ofisHakDonemi'), iptalTarihi: null, ...data }; t.ofisHakDonemi.push(row); return row; } }), ofisDenemeKaydi: base('ofisDenemeKaydi'),
    $executeRaw: async () => 0, $queryRaw: async () => [],
  };
  // advisory kilit benzetimi: transaction'lar sıraya girer; hata olursa durum geri alınır
  let chain: Promise<unknown> = Promise.resolve();
  prisma.$transaction = (fn: any) => {
    const run = chain.then(async () => {
      const snapshot = structuredClone(t);
      try { return await fn(prisma); }
      catch (error) { for (const k of Object.keys(t)) t[k] = snapshot[k]; throw error; }
    });
    chain = run.catch(() => undefined);
    return run;
  };
  return prisma;
}

/** Ortak settlement'ın (MembershipService.settlePaidOrder) gerekli yazımlarını benzeten sahte. */
function makeMembership(prisma: any) {
  return {
    settlePaidOrder: async (orderId: string) => {
      const t = prisma._t;
      if (prisma._flag.failSettle) throw new Error('settle patladı');
      const order = t.paymentOrder.find((o: any) => o.id === orderId);
      if (order.amac === 'OFFICE_PACKAGE' || order.amac === 'OFFICE_ADDON') return new MembershipService(prisma).settlePaidOrder(orderId, prisma);
      if (order.amac === 'PK_PURCHASE') {
        const wallet = t.kontorCuzdani.find((w: any) => w.kullaniciId === order.kullaniciId) ?? (t.kontorCuzdani.push({ id: `w-${order.kullaniciId}`, kullaniciId: order.kullaniciId, bakiye: 0, toplamYukleme: 0, aktifMi: true }), t.kontorCuzdani.at(-1));
        wallet.bakiye += order.pkMiktari; wallet.toplamYukleme += order.pkMiktari;
        const lot = { id: `lot-${orderId}`, kullaniciId: order.kullaniciId, paymentOrderId: orderId, ilkMiktar: order.pkMiktari, kalanMiktar: order.pkMiktari, aktifMi: true };
        t.portfolioCreditLot.push(lot);
        t.paymentSettlement.push({ id: `s-${orderId}`, orderId, kullaniciId: order.kullaniciId, uyelikId: null, portfolioCreditLotId: lot.id, settledAt: new Date() });
        return { settled: true };
      }
      const paket = t.uyelikPaketi.find((p: any) => p.id === order.hedefPaketId);
      for (const m of t.kullaniciUyelikPaketi) if (m.kullaniciId === order.kullaniciId && m.durum === 'AKTIF' && order.amac !== 'MEMBERSHIP_RENEWAL') m.durum = 'PASIF';
      let membership = t.kullaniciUyelikPaketi.find((m: any) => m.kullaniciId === order.kullaniciId && m.durum === 'AKTIF');
      if (order.amac === 'MEMBERSHIP_RENEWAL' && membership) membership.bitisTarihi = new Date(membership.bitisTarihi.getTime() + 30 * 86400000);
      else { membership = { id: `m-${orderId}`, kullaniciId: order.kullaniciId, paketId: paket.id, durum: 'AKTIF', baslangicTarihi: new Date(), bitisTarihi: new Date(Date.now() + 30 * 86400000), kaynakKanal: null }; t.kullaniciUyelikPaketi.push(membership); }
      const lot = { id: `lot-${orderId}`, kullaniciId: order.kullaniciId, paymentOrderId: orderId, ilkMiktar: paket.aylikPaketPk, kalanMiktar: paket.aylikPaketPk, aktifMi: true };
      t.portfolioCreditLot.push(lot);
      const wallet = t.kontorCuzdani.find((w: any) => w.kullaniciId === order.kullaniciId) ?? (t.kontorCuzdani.push({ id: `w-${order.kullaniciId}`, kullaniciId: order.kullaniciId, bakiye: 0, toplamYukleme: 0, aktifMi: true }), t.kontorCuzdani.at(-1));
      wallet.bakiye += paket.aylikPaketPk;
      t.paymentSettlement.push({ id: `s-${orderId}`, orderId, kullaniciId: order.kullaniciId, uyelikId: membership.id, portfolioCreditLotId: lot.id, settledAt: new Date() });
      return { settled: true, membershipId: membership.id };
    },
  };
}

interface Ctx { prisma: any; apple: FakeApple; service: AppleStoreService; cfg: AppleStoreConfig }

function setup(overrides: Partial<AppleStoreConfig> = {}): Ctx {
  const prisma = makeDb();
  const apple = new FakeApple();
  const cfg: AppleStoreConfig = { enabled: true, allowTest: true, environment: 'PRODUCTION', bundleId: BUNDLE, issuerId: 'i', keyId: 'k', privateKeyPath: 'p', appAppleId: 1, rootCaDir: 'd', ...overrides };
  const t = prisma._t;
  t.user.push(
    { id: 'owner', role: 'EMLAKCI', hesapTuru: 'GERCEK', storeAccountToken: TOKEN, officeId: 'off1', capabilities: [{ capability: 'OFFICE_OWNER' }], ownedOffices: [{ id: 'off1' }] },
    { id: 'tester', role: 'EMLAKCI', hesapTuru: 'TEST', storeAccountToken: TOKEN.replace('1111', '9999'), officeId: 'off2', capabilities: [{ capability: 'OFFICE_OWNER' }], ownedOffices: [{ id: 'off2' }] },
    { id: 'agent', role: 'EMLAKCI', hesapTuru: 'GERCEK', storeAccountToken: TOKEN.replace('1111', '7777'), officeId: 'off1', capabilities: [], ownedOffices: [] },
    { id: 'boy', role: 'OFIS_BOY', hesapTuru: 'GERCEK', storeAccountToken: TOKEN.replace('1111', '6666'), officeId: 'off1', capabilities: [], ownedOffices: [] },
    { id: 'builder', role: 'MUTEAHHIT', hesapTuru: 'GERCEK', storeAccountToken: TOKEN.replace('1111', '5555'), officeId: null, capabilities: [], ownedOffices: [] },
  );
  t.uyelikPaketi.push(
    { id: 'pk-bronz', paketKodu: 'BRONZ', segment: 'EMLAK_PRO', paketAdi: 'Bronz', fiyat: '1350', aylikPaketPk: 1200 },
    { id: 'pk-m-bronz', paketKodu: 'BRONZ', segment: 'MUTEAHHIT', paketAdi: 'Müteahhit Bronz', fiyat: '750', aylikPaketPk: 100 },
    { id: 'pk-deneme', paketKodu: 'DENEME', segment: 'EMLAK_PRO', paketAdi: 'Deneme', fiyat: null, aylikPaketPk: 500 },
  );
  t.storeProduct.push(
    { id: 'sp1', platform: 'APPLE', urunTuru: 'UYELIK', segment: 'OFFICE', paketKodu: 'BRONZ', uyelikPaketiId: null, magazaUrunKimligi: 'eph_sub_office_bronz_v1', aktifMi: true },
    { id: 'sp2', platform: 'APPLE', urunTuru: 'UYELIK', segment: 'OFFICE', paketKodu: 'SOLO', uyelikPaketiId: null, magazaUrunKimligi: 'eph_sub_office_solo_v1', aktifMi: true },
    { id: 'sp3', platform: 'APPLE', urunTuru: 'PK', segment: null, pkUrunKodu: 'PK_250', uyelikPaketiId: null, magazaUrunKimligi: 'eph_pk_250_v1', aktifMi: true },
    { id: 'sp4', platform: 'APPLE', urunTuru: 'UYELIK', segment: 'MUTEAHHIT', paketKodu: 'BRONZ', uyelikPaketiId: null, magazaUrunKimligi: 'eph_sub_muteahhit_bronz_v1', aktifMi: true },
    { id: 'sp5', platform: 'APPLE', urunTuru: 'EK_KULLANICI', segment: null, kisiSayisi: 1, uyelikPaketiId: null, magazaUrunKimligi: 'eph_addon_user_1_v2', aktifMi: true },
    { id: 'sp6', platform: 'APPLE', urunTuru: 'OFIS_BOY', segment: null, uyelikPaketiId: null, magazaUrunKimligi: 'eph_addon_ofisboy_v1', aktifMi: true },
    { id: 'sp7', platform: 'APPLE', urunTuru: 'EK_KULLANICI', segment: null, kisiSayisi: 3, uyelikPaketiId: null, magazaUrunKimligi: 'eph_addon_user_3_v2', aktifMi: true },
  );
  t.office.push({ id: 'off1', isActive: true, ownerUserId: 'owner' }, { id: 'off2', isActive: true, ownerUserId: 'tester' });
  for (const [key, valueJson] of Object.entries(OFFICE_SETTINGS_FIXTURE)) t.systemSetting.push({ id: `ss-${key}`, key, valueJson });
  t.systemSetting.push({ id: 'ss-src', key: 'OFFICE_ENTITLEMENT_SOURCE', valueJson: 'relational' });
  t.systemSetting.push({ id: 'ss', key: 'EPH_PAYMENT_SETTINGS_V1', valueJson: { pkProducts: [{ code: 'PK_250', credits: 250, amountMinor: 25000, active: true }] } });
  const service = new AppleStoreService(prisma, makeMembership(prisma) as any, apple, () => cfg);
  return { prisma, apple, service, cfg };
}

const pkTx = (over: any = {}) => ({ transactionId: `tx${++seq}`, originalTransactionId: `tx${seq}`, bundleId: BUNDLE, productId: 'eph_pk_250_v1', type: 'Consumable', quantity: 1,
  appAccountToken: TOKEN, environment: 'Production', price: 250000, currency: 'TRY', purchaseDate: Date.now(), ...over });
const subTx = (over: any = {}) => ({ transactionId: `tx${++seq}`, originalTransactionId: `orig${seq}`, bundleId: BUNDLE, productId: 'eph_sub_office_bronz_v1', type: 'Auto-Renewable Subscription', quantity: 1,
  appAccountToken: TOKEN, environment: 'Production', price: 1350000, currency: 'TRY', purchaseDate: Date.now(), expiresDate: Date.now() + 30 * 86400000, ...over });
const put = (c: Ctx, tx: any) => c.apple.transactions.set(tx.transactionId, { transaction: tx, environment: tx.environment === 'Sandbox' ? 'SANDBOX' : 'PRODUCTION' });
const verify = (c: Ctx, tx: any, userId = 'owner') => { put(c, tx); return c.service.verify(userId, { transactionId: tx.transactionId, productId: tx.productId }); };
const note = (type: string, tx: any, extra: any = {}) => jws({ notification: { notificationType: type, notificationUUID: `uuid-${++seq}`, subtype: extra.subtype, data: { bundleId: BUNDLE } }, transaction: tx, renewal: extra.renewal, environment: extra.environment });
const code = async (promise: Promise<unknown>) => { try { await promise; return 'OK'; } catch (error) { return error instanceof StoreError ? error.code : `ERR:${(error as Error).message}`; } };
const wallet = (c: Ctx, userId = 'owner') => c.prisma._t.kontorCuzdani.find((w: any) => w.kullaniciId === userId);

describe('Apple doğrulama (POST verify)', () => {
  it('PK satın alma hak verir; aynı işlem ikinci kez hak vermez, önceki sonucu döner', async () => {
    const c = setup();
    const tx = pkTx();
    const first = await verify(c, tx);
    const second = await verify(c, tx);
    expect(first.status).toBe('GRANTED');
    expect(second.status).toBe('ALREADY_PROCESSED');
    expect(second.orderId).toBe(first.orderId);
    expect(wallet(c).bakiye).toBe(250);
    expect(c.prisma._t.storeEntitlementGrant).toHaveLength(1);
    expect(c.prisma._t.paymentSettlement).toHaveLength(1);
  });

  it('eşzamanlı iki doğrulama tek hak verir', async () => {
    const c = setup();
    const tx = pkTx();
    put(c, tx);
    const results = await Promise.all([1, 2].map(() => c.service.verify('owner', { transactionId: tx.transactionId, productId: tx.productId })));
    expect(results.map((r) => r.status).sort()).toEqual(['ALREADY_PROCESSED', 'GRANTED']);
    expect(wallet(c).bakiye).toBe(250);
  });

  it('hak yazımı patlarsa anahtar da geri alınır (aynı transaction)', async () => {
    const c = setup();
    const tx = pkTx();
    c.prisma._flag.failSettle = true;
    expect(await code(verify(c, tx))).toBe('ERR:settle patladı');
    expect(c.prisma._t.storeEntitlementGrant).toHaveLength(0);
    expect(c.prisma._t.paymentOrder).toHaveLength(0);
    c.prisma._flag.failSettle = false;
    expect((await c.service.verify('owner', { transactionId: tx.transactionId, productId: tx.productId })).status).toBe('GRANTED');
  });

  it('Apple imzası/işlemi doğrulanamazsa hak verilmez', async () => {
    const c = setup();
    expect(await code(c.service.verify('owner', { transactionId: 'yok123', productId: 'eph_pk_250_v1' }))).toBe('STORE_VERIFY_FAILED');
    expect(c.prisma._t.storeEntitlementGrant).toHaveLength(0);
  });

  it('sandbox işlemi: TEST olmayan hesaba hak yok, TEST hesaba hak var; test kapalıysa 403', async () => {
    const c = setup();
    const blocked = await verify(c, pkTx({ environment: 'Sandbox' }));
    expect(blocked.status).toBe('TEST_NOT_GRANTED');
    expect(c.prisma._t.storeEntitlementGrant).toHaveLength(0);
    expect(wallet(c)).toBeUndefined();

    const granted = await verify(c, pkTx({ environment: 'Sandbox', appAccountToken: TOKEN.replace('1111', '9999') }), 'tester');
    expect(granted.status).toBe('GRANTED');
    expect(granted.environment).toBe('SANDBOX');
    expect(wallet(c, 'tester').bakiye).toBe(250);
    expect(c.prisma._t.paymentOrder[0].ortam).toBe('TEST');

    const off = setup({ allowTest: false });
    expect(await code(verify(off, pkTx({ environment: 'Sandbox', appAccountToken: TOKEN.replace('1111', '9999') }), 'tester'))).toBe('STORE_TEST_DISABLED');
  });

  it('appAccountToken uyuşmazlığı reddedilir ve kaydedilir; token yoksa da reddedilir', async () => {
    const c = setup();
    expect(await code(verify(c, pkTx({ appAccountToken: 'aaaaaaaa-0000-0000-0000-000000000000' })))).toBe('STORE_ACCOUNT_MISMATCH');
    expect(await code(verify(c, pkTx({ appAccountToken: undefined })))).toBe('STORE_ACCOUNT_MISMATCH');
    expect(c.prisma._t.storeEntitlementGrant).toHaveLength(0);
    const logged = c.prisma._t.paymentWebhookEvent.filter((e: any) => e.eventType === 'VERIFY_REJECTED' && e.errorMessage === 'STORE_ACCOUNT_MISMATCH');
    expect(logged).toHaveLength(2);
  });

  it('başkasının grant anahtarını başka kullanıcı sahiplenemez', async () => {
    const c = setup();
    const tx = pkTx();
    await verify(c, tx);
    expect(await code(c.service.verify('builder', { transactionId: tx.transactionId, productId: tx.productId }))).toBe('STORE_ACCOUNT_MISMATCH');
  });

  it('danışman ve Ofis Boy satın alamaz; ofis sahibi ve müteahhit alabilir', async () => {
    const c = setup();
    expect(await code(verify(c, pkTx({ appAccountToken: TOKEN.replace('1111', '7777') }), 'agent'))).toBe('OFFICE_AGENT_PURCHASE_FORBIDDEN');
    expect(await code(verify(c, pkTx({ appAccountToken: TOKEN.replace('1111', '6666') }), 'boy'))).toBe('OFFICE_AGENT_PURCHASE_FORBIDDEN');
    expect(c.prisma._t.storeEntitlementGrant).toHaveLength(0);
    expect((await verify(c, pkTx())).status).toBe('GRANTED');
    const builder = await verify(c, subTx({ productId: 'eph_sub_muteahhit_bronz_v1', appAccountToken: TOKEN.replace('1111', '5555') }), 'builder');
    expect(builder.status).toBe('GRANTED');
    expect(c.prisma._t.paymentOrder.at(-1).metadata.walletKind).toBe('PERSONAL');
    expect(c.prisma._t.paymentOrder[0].metadata.walletKind).toBe('OFFICE');
  });

  it('ofis ürünü müteahhide, müteahhit ürünü ofis sahibine satılmaz', async () => {
    const c = setup();
    expect(await code(verify(c, subTx({ appAccountToken: TOKEN.replace('1111', '5555') }), 'builder'))).toBe('STORE_PRODUCT_MISMATCH');
    expect(await code(verify(c, subTx({ productId: 'eph_sub_muteahhit_bronz_v1' })))).toBe('STORE_PRODUCT_MISMATCH');
  });

  it('üyelik hak verir: kaynak APPLE, bitiş Apple expiresDate, abonelik kaydı oluşur', async () => {
    const c = setup();
    const tx = subTx();
    const result = await verify(c, tx);
    expect(result.status).toBe('GRANTED');
    const membership = c.prisma._t.ofisAbonelik[0];
    expect(membership).toMatchObject({ officeId: 'off1', paketKodu: 'BRONZ', kaynakKanal: 'APPLE', kaynakAbonelikAnahtari: tx.originalTransactionId });
    expect(membership.bitisTarihi.getTime()).toBe(tx.expiresDate);
    expect(c.prisma._t.kullaniciUyelikPaketi).toHaveLength(0); // ofis paketi artık kişisel üyelik satırı yazmaz
    expect(c.prisma._t.paymentOrder[0]).toMatchObject({ amac: 'OFFICE_PACKAGE', hedefOfficeId: 'off1', hakSahibiUserId: 'owner', hedefOfisPaketKodu: 'BRONZ' });
    expect(c.prisma._t.storeSubscription[0]).toMatchObject({ abonelikKimligi: tx.originalTransactionId, durum: 'ACTIVE' });
    expect(wallet(c).bakiye).toBe(1200);
  });

  it('ODM-7G-D F01: OFFICE_ENTITLEMENT_SOURCE=legacy iken Ek Kullanıcı / Ofis Boy / Solo hak vermez (yazıcı da yayın kapısına bağlı); OfisAbonelik yazılmaz', async () => {
    const c = setup();
    c.prisma._t.systemSetting.find((r: any) => r.key === 'OFFICE_ENTITLEMENT_SOURCE').valueJson = 'legacy';
    expect(await code(verify(c, subTx({ productId: 'eph_addon_user_1_v2', price: 400000 })))).toBe('STORE_PRODUCT_NOT_GRANTABLE');
    expect(await code(verify(c, subTx({ productId: 'eph_addon_ofisboy_v1', price: 300000 })))).toBe('STORE_PRODUCT_NOT_GRANTABLE');
    expect(c.prisma._t.ofisAbonelik ?? []).toHaveLength(0);
    expect(c.prisma._t.ofisEklenti ?? []).toHaveLength(0);
    expect(c.prisma._t.storeEntitlementGrant).toHaveLength(0);
  });

  it('EPH-70B2: SOLO ofis paketi hak verir (1 kullanıcı, 400 PK, ayarlardan)', async () => {
    const c = setup();
    const r = await verify(c, subTx({ productId: 'eph_sub_office_solo_v1', price: 500000 }));
    expect(r.status).toBe('GRANTED');
    expect(c.prisma._t.ofisAbonelik[0]).toMatchObject({ paketKodu: 'SOLO', durum: 'AKTIF' });
    expect(wallet(c).bakiye).toBe(400);
    expect(c.prisma._t.portfolioCreditLot[0]).toMatchObject({ lotTuru: 'PAKET', ilkMiktar: 400, kaynakKayitTuru: 'OFFICE_PACKAGE' });
    expect(c.prisma._t.ofisHakDonemi).toHaveLength(1);
  });

  it('EPH-70B2: ek kullanıcı temel paket olmadan reddedilir, inceleme kaydı yazılır (para çekildi)', async () => {
    const c = setup();
    expect(await code(verify(c, subTx({ productId: 'eph_addon_user_1_v2', price: 400000 })))).toBe('ADDON_REQUIRES_OFFICE_PACKAGE');
    expect(c.prisma._t.storeEntitlementGrant).toHaveLength(0);
    expect(c.prisma._t.paymentOrder[0].metadata).toMatchObject({ requiresRefundReview: true, reviewReason: 'ADDON_REQUIRES_OFFICE_PACKAGE' });
    expect(wallet(c)).toBeUndefined();
  });

  it('EPH-70B2: ek kullanıcı (Bronz+) ve Ofis Boy hak verir; Solo\'da ek kullanıcı, Platinum\'da Ofis Boy reddedilir', async () => {
    const c = setup();
    await verify(c, subTx()); // Bronz: 1200 PK
    const eku = await verify(c, subTx({ productId: 'eph_addon_user_3_v2', price: 1200000 }));
    expect(eku.status).toBe('GRANTED');
    expect(c.prisma._t.ofisEklenti[0]).toMatchObject({ tur: 'EK_KULLANICI', adet: 3, kaynakKanal: 'APPLE' });
    expect(wallet(c).bakiye).toBe(1200 + 3 * 400); // kişi başı PK ayardan
    const boy = await verify(c, subTx({ productId: 'eph_addon_ofisboy_v1', price: 300000 }));
    expect(boy.status).toBe('GRANTED');
    expect(c.prisma._t.ofisEklenti[1]).toMatchObject({ tur: 'OFIS_BOY', adet: 1 });
    expect(wallet(c).bakiye).toBe(2400); // Ofis Boy PK getirmez
    const solo = setup();
    await verify(solo, subTx({ productId: 'eph_sub_office_solo_v1', price: 500000 }));
    expect(await code(verify(solo, subTx({ productId: 'eph_addon_user_1_v2', price: 400000 })))).toBe('ADDON_REQUIRES_OFFICE_PACKAGE');
    const plat = setup();
    plat.prisma._t.storeProduct.push({ id: 'sp9', platform: 'APPLE', urunTuru: 'UYELIK', segment: 'OFFICE', paketKodu: 'PLATINUM', uyelikPaketiId: null, magazaUrunKimligi: 'eph_sub_office_platinum_v1', aktifMi: true });
    await verify(plat, subTx({ productId: 'eph_sub_office_platinum_v1', price: 9950000 }));
    expect(await code(verify(plat, subTx({ productId: 'eph_addon_ofisboy_v1', price: 300000 })))).toBe('ADDON_INCLUDED_IN_PACKAGE');
  });

  it('EPH-70B2: ayar bozuksa hak verilmez (fail-closed, sessiz varsayılan yok)', async () => {
    const c = setup();
    c.prisma._t.systemSetting.find((r: any) => r.key === 'OFFICE_ADDON_CONFIG').valueJson = { ekKullanici: {} };
    expect(await code(verify(c, subTx()))).toBe('STORE_PRODUCT_NOT_GRANTABLE');
    expect(c.prisma._t.storeEntitlementGrant).toHaveLength(0);
  });

  it('kanal çakışması: aktif iyzico üyeliği varken Apple üyeliği 409 + inceleme kaydı, hak yok', async () => {
    const c = setup();
    c.prisma._t.ofisAbonelik.push({ id: 'web', officeId: 'off1', paketKodu: 'BRONZ', durum: 'AKTIF', sureTuru: 'DONEMLI', baslangicTarihi: new Date(), bitisTarihi: new Date(Date.now() + 86400000 * 10), kaynakKanal: 'IYZICO', kaynakAbonelikAnahtari: 'web-1' });
    const outcome = await verify(c, subTx()).catch((e) => e);
    expect(outcome).toBeInstanceOf(StoreError);
    expect(outcome.code).toBe('MEMBERSHIP_ACTIVE_OTHER_CHANNEL');
    expect(outcome.getResponse().message).toBe('Üyeliğiniz aktif. Kaynak: Web.');
    expect(c.prisma._t.storeEntitlementGrant).toHaveLength(0);
    expect(c.prisma._t.paymentSettlement).toHaveLength(0);
    expect(c.prisma._t.paymentOrder[0].metadata.requiresRefundReview).toBe(true);
    // Ek PK her kanaldan alınabilir
    expect((await verify(c, pkTx())).status).toBe('GRANTED');
  });

  it('DENEME üyeliği kanal çakışması sayılmaz', async () => {
    const c = setup();
    c.prisma._t.ofisDenemeKaydi.push({ id: 'trial', officeId: 'off1', ownerUserId: 'owner', baslangicTarihi: new Date(), bitisTarihi: new Date(Date.now() + 86400000), sonlandiTarihi: null });
    expect((await verify(c, subTx())).status).toBe('GRANTED');
  });

  it('STORE_PAYMENTS_ENABLED=false iken doğrulama hak vermez', async () => {
    const c = setup({ enabled: false });
    expect(await code(verify(c, pkTx()))).toBe('STORE_DISABLED');
    expect(c.prisma._t.storeEntitlementGrant).toHaveLength(0);
  });

  it('bundle uyuşmazlığı ve iade edilmiş işlem reddedilir', async () => {
    const c = setup();
    expect(await code(verify(c, pkTx({ bundleId: 'com.baska' })))).toBe('STORE_BUNDLE_MISMATCH');
    expect(await code(verify(c, pkTx({ revocationDate: Date.now() })))).toBe('STORE_VERIFY_FAILED');
  });
});

describe('Apple Notifications V2', () => {
  it('sahte/bozuk imza 401 verir ve hiçbir şey kaydedilmez', async () => {
    const c = setup();
    expect(await code(c.service.handleNotification(jws({ notification: { notificationType: 'REFUND', notificationUUID: 'x' } }, 'BAD')))).toBe('STORE_NOTIFICATION_INVALID');
    expect(await code(c.service.handleNotification(undefined))).toBe('STORE_NOTIFICATION_INVALID');
    expect(c.prisma._t.paymentWebhookEvent).toHaveLength(0);
  });

  it('REFUND: harcanmış PK bakiyeyi eksiye düşürmez, sıfırda bırakır, fark denetime yazılır; tekrar bildirim tekrar işlemez', async () => {
    const c = setup();
    const tx = pkTx();
    await verify(c, tx);
    wallet(c).bakiye = 40; // 210 PK harcandı
    c.prisma._t.portfolioCreditLot[0].kalanMiktar = 40;
    const signed = note('REFUND', tx);
    await c.service.handleNotification(signed);
    expect(wallet(c).bakiye).toBe(0);
    expect(c.prisma._t.paymentOrder[0].durum).toBe('REFUNDED');
    expect(c.prisma._t.auditLog[0].metadata).toMatchObject({ granted: 250, reclaimed: 40, shortfall: 210 });
    await c.service.handleNotification(signed); // aynı notificationUUID
    expect(c.prisma._t.auditLog).toHaveLength(1);
    // aynı işlem farklı UUID ile gelse bile ikinci kez düşülmez
    await c.service.handleNotification(note('REFUND', tx));
    expect(wallet(c).bakiye).toBe(0);
    expect(c.prisma._t.auditLog).toHaveLength(1);
  });

  it('REFUND: harcanmamış PK tamamen geri alınır, denetim farkı yok', async () => {
    const c = setup();
    const tx = pkTx();
    await verify(c, tx);
    await c.service.handleNotification(note('REFUND', tx));
    expect(wallet(c).bakiye).toBe(0);
    expect(c.prisma._t.auditLog).toHaveLength(0);
  });

  it('REVOKE üyeliği IPTAL eder ve aboneliği REVOKED yapar', async () => {
    const c = setup();
    const tx = subTx();
    await verify(c, tx);
    await c.service.handleNotification(note('REVOKE', tx));
    expect(c.prisma._t.ofisAbonelik[0].durum).toBe('IPTAL');
    expect(c.prisma._t.storeSubscription[0].durum).toBe('REVOKED');
    expect(c.prisma._t.ofisHakDonemi[0].iptalTarihi).toBeInstanceOf(Date);
    expect(wallet(c).bakiye).toBe(0);
  });

  it('DID_RENEW yeni transactionId ile yeni hak verir; SUBSCRIBED ardından doğrulama ALREADY_PROCESSED döner', async () => {
    const c = setup();
    const first = subTx();
    await c.service.handleNotification(note('SUBSCRIBED', first, { subtype: 'INITIAL_BUY' }));
    expect(c.prisma._t.storeEntitlementGrant).toHaveLength(1);
    expect((await verify(c, first)).status).toBe('ALREADY_PROCESSED');
    const renewalEnd = Date.now() + 60 * 86400000;
    const renewed = subTx({ originalTransactionId: first.originalTransactionId, expiresDate: renewalEnd });
    await c.service.handleNotification(note('DID_RENEW', renewed));
    expect(c.prisma._t.storeEntitlementGrant).toHaveLength(2);
    expect(c.prisma._t.ofisAbonelik).toHaveLength(1); // aynı zincir: yenileme yeni satır açmaz
    expect(c.prisma._t.ofisAbonelik[0].bitisTarihi.getTime()).toBe(renewalEnd);
    expect(c.prisma._t.ofisHakDonemi).toHaveLength(2); // dönem başına tek hak
    expect(wallet(c).bakiye).toBe(2400);
  });

  it('DID_CHANGE_RENEWAL_STATUS, DID_FAIL_TO_RENEW (grace), EXPIRED abonelik ve üyelik durumunu günceller', async () => {
    const c = setup();
    const tx = subTx();
    await verify(c, tx);
    await c.service.handleNotification(note('DID_CHANGE_RENEWAL_STATUS', tx, { subtype: 'AUTO_RENEW_DISABLED' }));
    expect(c.prisma._t.storeSubscription[0]).toMatchObject({ otomatikYenileme: false, durum: 'CANCELED' });
    const graceEnd = Date.now() + 5 * 86400000;
    await c.service.handleNotification(note('DID_FAIL_TO_RENEW', tx, { subtype: 'GRACE_PERIOD', renewal: { gracePeriodExpiresDate: graceEnd } }));
    expect(c.prisma._t.storeSubscription[0].durum).toBe('GRACE');
    await c.service.handleNotification(note('GRACE_PERIOD_EXPIRED', tx));
    expect(c.prisma._t.storeSubscription[0].durum).toBe('EXPIRED');
    expect(c.prisma._t.ofisAbonelik[0].durum).toBe('SURESI_DOLDU');
  });

  it('CONSUMPTION_REQUEST yalnız kaydedilir; bilinmeyen tür kaydedilir ve 200 döner', async () => {
    const c = setup();
    const tx = pkTx();
    expect(await c.service.handleNotification(note('CONSUMPTION_REQUEST', tx))).toEqual({ received: true });
    expect(await c.service.handleNotification(note('SOMETHING_NEW', tx))).toEqual({ received: true });
    expect(c.prisma._t.paymentWebhookEvent.map((e: any) => e.eventType)).toEqual(['CONSUMPTION_REQUEST', 'SOMETHING_NEW']);
    expect(c.prisma._t.storeEntitlementGrant).toHaveLength(0);
  });

  it('STORE_PAYMENTS_ENABLED=false iken bildirim kaydedilir ama hak yazmaz', async () => {
    const c = setup({ enabled: false });
    expect(await c.service.handleNotification(note('SUBSCRIBED', subTx()))).toEqual({ received: true });
    expect(c.prisma._t.paymentWebhookEvent).toHaveLength(1);
    expect(c.prisma._t.paymentWebhookEvent[0].processed).toBeFalsy();
    expect(c.prisma._t.storeEntitlementGrant).toHaveLength(0);
  });

  it('bildirimde appAccountToken eşleşmiyorsa hak verilmez, 200 döner', async () => {
    const c = setup();
    await c.service.handleNotification(note('SUBSCRIBED', subTx({ appAccountToken: 'bilinmeyen-token' })));
    expect(c.prisma._t.storeEntitlementGrant).toHaveLength(0);
    expect(c.prisma._t.paymentWebhookEvent[0].payload.outcome).toBe('USER_UNRESOLVED');
  });

  it('bildirimde danışman hesabı için hak verilmez', async () => {
    const c = setup();
    await c.service.handleNotification(note('SUBSCRIBED', subTx({ appAccountToken: TOKEN.replace('1111', '7777') })));
    expect(c.prisma._t.storeEntitlementGrant).toHaveLength(0);
    expect(c.prisma._t.paymentWebhookEvent[0].payload.outcome).toBe('REJECTED:OFFICE_AGENT_PURCHASE_FORBIDDEN');
  });
});

/* ODM-3F — Codex ODM-7B düzeltme testleri */
const noteAt = (type: string, tx: any, signedDate: number, extra: any = {}) => jws({ notification: { notificationType: type, notificationUUID: `uuid-${++seq}`, subtype: extra.subtype, signedDate, data: { bundleId: BUNDLE } }, transaction: tx, renewal: extra.renewal });

describe('ODM-3F düzeltmeleri', () => {
  it('K1: iade, cüzdan satır kilidini alır ve bakiyeyi KİLİT ALTINDA okur (bekleme sırasında harcama commit olsa bile eksiye düşmez)', async () => {
    const c = setup();
    const tx = pkTx();
    await verify(c, tx);
    const locks: string[] = [];
    let spent = false;
    c.prisma.$executeRaw = async (strings: TemplateStringsArray, ...vals: any[]) => { locks.push(String(vals[0] ?? strings[0])); return 0; };
    c.prisma.$queryRaw = async (strings: TemplateStringsArray) => {
      // cüzdan satırı kilidi beklenirken eşzamanlı harcama commit olur
      if (strings.join('?').includes('KontorCuzdani') && !spent) { spent = true; wallet(c).bakiye -= 60; }
      return [];
    };
    await c.service.handleNotification(note('REFUND', tx));
    expect(locks).toContain('wallet:owner');
    expect(spent).toBe(true);
    expect(wallet(c).bakiye).toBe(0);
    expect(wallet(c).bakiye).toBeGreaterThanOrEqual(0);
    expect(c.prisma._t.kontorHareketi[0]).toMatchObject({ miktar: 190, oncekiBakiye: 190, sonrakiBakiye: 0 });
  });

  it('K1: iki lotlu siparişte çalışan bakiye izlenir, toplam düşüm bakiyeyi aşmaz', async () => {
    const c = setup();
    const tx = pkTx();
    await verify(c, tx);
    const order = c.prisma._t.paymentOrder[0];
    c.prisma._t.portfolioCreditLot.push({ id: 'lot-extra', kullaniciId: 'owner', paymentOrderId: order.id, ilkMiktar: 100, kalanMiktar: 100, aktifMi: true });
    wallet(c).bakiye = 300; // 350 lot hakkı, 300 bakiye
    await c.service.handleNotification(note('REFUND', tx));
    expect(wallet(c).bakiye).toBe(0);
  });

  it('K3: sırasız bildirim — yeni DID_RENEW sonrası gelen ESKİ EXPIRED üyeliği düşürmez', async () => {
    const c = setup();
    const t0 = Date.now() - 1000;
    const first = subTx();
    await c.service.handleNotification(noteAt('SUBSCRIBED', first, t0));
    const renewEnd = Date.now() + 60 * 86400000;
    const renewed = subTx({ originalTransactionId: first.originalTransactionId, expiresDate: renewEnd });
    await c.service.handleNotification(noteAt('DID_RENEW', renewed, t0 + 500));
    // eski dönem için, yenilemeden ÖNCE imzalanmış EXPIRED gecikmeli geliyor
    await c.service.handleNotification(noteAt('EXPIRED', first, t0 + 100));
    expect(c.prisma._t.storeSubscription[0].durum).toBe('ACTIVE');
    expect(c.prisma._t.ofisAbonelik[0].durum).toBe('AKTIF');
    expect(c.prisma._t.paymentWebhookEvent.at(-1).payload.outcome).toBe('STALE_EVENT');
  });

  it('K3: eski dönem DID_RENEW daha yeni dönemin bitişini geriye çekmez ve hak vermez', async () => {
    const c = setup();
    const first = subTx({ expiresDate: Date.now() + 40 * 86400000 });
    await verify(c, first);
    const olderPeriod = subTx({ originalTransactionId: first.originalTransactionId, expiresDate: Date.now() + 10 * 86400000 });
    await c.service.handleNotification(note('DID_RENEW', olderPeriod));
    expect(c.prisma._t.storeEntitlementGrant).toHaveLength(1);
    expect(c.prisma._t.storeSubscription[0].bitisTarihi.getTime()).toBe(first.expiresDate);
    expect(c.prisma._t.paymentWebhookEvent.at(-1).payload.outcome).toBe('REJECTED:STORE_PERIOD_EXPIRED');
  });

  it('K3: grant\'tan ÖNCE gelen REFUND kalıcı kaydedilir; sonradan gelen SUBSCRIBED/verify hak vermez', async () => {
    const c = setup();
    const tx = subTx();
    await c.service.handleNotification(note('REFUND', tx));
    expect(c.prisma._t.paymentWebhookEvent.at(-1).payload.transactionId).toBe(tx.transactionId);
    await c.service.handleNotification(note('SUBSCRIBED', tx, { subtype: 'INITIAL_BUY' })); // iade öncesi imzalı, revocationDate yok
    expect(c.prisma._t.storeEntitlementGrant).toHaveLength(0);
    expect(c.prisma._t.paymentWebhookEvent.at(-1).payload.outcome).toBe('REJECTED:STORE_REFUNDED');
    expect(await code(verify(c, tx))).toBe('STORE_REFUNDED');
    expect(wallet(c)).toBeUndefined();
  });

  it('K3: iade edilmiş (REVOKED) abonelik sonradan gelen durum bildirimiyle canlanmaz', async () => {
    const c = setup();
    const tx = subTx();
    await verify(c, tx);
    await c.service.handleNotification(note('REVOKE', tx));
    await c.service.handleNotification(note('DID_CHANGE_RENEWAL_STATUS', tx, { subtype: 'AUTO_RENEW_ENABLED' }));
    expect(c.prisma._t.storeSubscription[0].durum).toBe('REVOKED');
    expect(c.prisma._t.ofisAbonelik[0].durum).toBe('IPTAL');
  });

  it('K4: süresi geçmiş üyelik dönemi PK yüklemez', async () => {
    const c = setup();
    const expired = subTx({ expiresDate: Date.now() - 86400000 });
    expect(await code(verify(c, expired))).toBe('STORE_PERIOD_EXPIRED');
    await c.service.handleNotification(note('DID_RENEW', subTx({ expiresDate: Date.now() - 1000 })));
    expect(c.prisma._t.storeEntitlementGrant).toHaveLength(0);
    expect(wallet(c)).toBeUndefined();
  });

  it('O2: ortak servisten gelen HTTP 400 Apple\'a 4xx dönmez (503), olay işlenmemiş kalır', async () => {
    const c = setup();
    const { BadRequestException, HttpException } = require('@nestjs/common');
    (c.service as any).membership.settlePaidOrder = async () => { throw new BadRequestException('cüzdan kapalı'); };
    const err: any = await c.service.handleNotification(note('SUBSCRIBED', subTx())).catch((e) => e);
    expect(err).toBeInstanceOf(HttpException);
    expect(err.getStatus()).toBe(503);
    expect(c.prisma._t.paymentWebhookEvent[0].processed).toBeFalsy();
  });

  it('O3: grace uzatması güncel uygunluğu denetler (sonradan danışman yapılan kullanıcıda süre uzamaz)', async () => {
    const c = setup();
    const tx = subTx();
    await verify(c, tx);
    const before = c.prisma._t.ofisAbonelik[0].bitisTarihi.getTime();
    const user = c.prisma._t.user.find((u: any) => u.id === 'owner');
    user.capabilities = []; user.ownedOffices = [];
    await c.service.handleNotification(note('DID_FAIL_TO_RENEW', tx, { subtype: 'GRACE_PERIOD', renewal: { gracePeriodExpiresDate: before + 5 * 86400000 } }));
    expect(c.prisma._t.ofisAbonelik[0].bitisTarihi.getTime()).toBe(before);
    expect(c.prisma._t.storeSubscription[0].durum).toBe('GRACE'); // durum kaydı yine işlenir
  });

  it('O6: Apple tutarı/para birimi yoksa katalog fiyatıyla PAID kayıt oluşmaz; 0 tutar mali inceleme bayrağı alır', async () => {
    const c = setup();
    expect(await code(verify(c, pkTx({ price: undefined })))).toBe('STORE_PRICE_UNVERIFIED');
    expect(await code(verify(c, pkTx({ currency: undefined })))).toBe('STORE_PRICE_UNVERIFIED');
    expect(c.prisma._t.paymentOrder).toHaveLength(0);
    // EPH-70B1 / §11 madde 19: 0 TL işlem hak vermez; finans incelemesine düşer
    const zero = await verify(c, subTx({ price: 0 }));
    expect(zero.status).toBe('FINANCE_REVIEW');
    expect(c.prisma._t.paymentOrder).toHaveLength(1);
    expect(c.prisma._t.paymentOrder[0].metadata).toMatchObject({ amountSource: 'STORE_ZERO', collectedAmount: '0', requiresFinanceReview: true, entitlementGranted: false });
    expect(String(c.prisma._t.paymentOrder[0].tutar)).toBe('0'); // EPH-70B1F/D8: siparişe katalog değil gerçek tutar (0)
    expect(c.prisma._t.storeEntitlementGrant).toHaveLength(0);
    expect(c.prisma._t.portfolioCreditLot).toHaveLength(0);
    expect(c.prisma._t.kullaniciUyelikPaketi).toHaveLength(0);
    expect(c.prisma._t.storeSubscription).toHaveLength(0);
    // PK ürünü de 0 TL ile hak vermez
    expect((await verify(c, pkTx({ price: 0 }))).status).toBe('FINANCE_REVIEW');
    expect(c.prisma._t.kontorCuzdani.every((w: any) => w.bakiye === 0)).toBe(true);
  });
});
