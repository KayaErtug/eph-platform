import { OFFICE_SETTINGS_FIXTURE } from './office-entitlement.fixture';
import { OfficeEntitlementError, OfficeEntitlementService, resolveOfficeEntitlements } from './office-entitlement.service';
import { legacySnapshotLive } from './office-legacy';
import { isLegacyTrialLot, isLotUsable } from '../kontor/wallet-lots';

/* EPH-70B2 servis testleri: bellek içi sahte Prisma (gerçek DB yok). Gerçek kilit/deadlock davranışı PostgreSQL'de ayrıca doğrulanmalıdır. */
const tm = (v: any) => (v instanceof Date ? v.getTime() : v);
const match = (row: any, where: any): boolean => Object.entries(where ?? {}).every(([key, value]) => {
  if (key === 'OR') return (value as any[]).some((w) => match(row, w));
  if (value && typeof value === 'object' && !(value instanceof Date) && ('lte' in (value as any) || 'lt' in (value as any) || 'gt' in (value as any) || 'gte' in (value as any))) {
    const v = row[key]; if (v === null || v === undefined) return false; const o = value as any;
    return (!('lte' in o) || tm(v) <= tm(o.lte)) && (!('lt' in o) || tm(v) < tm(o.lt)) && (!('gt' in o) || tm(v) > tm(o.gt)) && (!('gte' in o) || tm(v) >= tm(o.gte));
  }
  if (value instanceof Date) return row[key] instanceof Date && row[key].getTime() === value.getTime();
  if (value && typeof value === 'object') {
    if ('in' in (value as any)) return (value as any).in.includes(row[key]);
    if ('not' in (value as any)) return row[key] !== (value as any).not;
    if (key.includes('_')) return match(row, value);
    return true;
  }
  return value === undefined || row[key] === value;
});

function makeDb() {
  const t: Record<string, any[]> = { office: [{ id: 'o1', isActive: true, ownerUserId: 'owner', name: 'Ofis' }], systemSetting: [], ofisAbonelik: [], ofisEklenti: [], ofisHakDonemi: [], ofisDenemeKaydi: [], kullaniciUyelikPaketi: [], uyelikPaketi: [], user: [], portfolioCreditLot: [], kontorCuzdani: [], kontorHareketi: [], auditLog: [] };
  for (const [key, valueJson] of Object.entries(OFFICE_SETTINGS_FIXTURE)) t.systemSetting.push({ id: key, key, valueJson });
  const calls: string[] = [];
  let n = 0;
  const find = (name: string, where: any) => t[name].find((r) => match(r, where)) ?? null;
  const base = (name: string, extra: any = {}) => ({
    findUnique: async ({ where }: any) => find(name, where),
    findFirst: async ({ where }: any = {}) => find(name, where),
    findMany: async ({ where }: any = {}) => t[name].filter((r) => match(r, where)),
    create: async ({ data }: any) => { const row = { id: `${name}-${++n}`, ...data }; t[name].push(row); calls.push(`create:${name}`); return row; },
    update: async ({ where, data }: any) => {
      const row = find(name, where); if (!row) throw new Error(`${name} yok`);
      for (const [k, v] of Object.entries(data)) {
        if (v && typeof v === 'object' && !(v instanceof Date) && 'increment' in (v as any)) row[k] += (v as any).increment;
        else if (v && typeof v === 'object' && !(v instanceof Date) && 'decrement' in (v as any)) row[k] -= (v as any).decrement;
        else row[k] = v;
      }
      return row;
    },
    updateMany: async ({ where, data }: any) => { t[name].filter((r) => match(r, where)).forEach((r) => Object.assign(r, data)); return { count: 1 }; },
    ...extra,
  });
  const db: any = {
    _t: t, _calls: calls,
    office: base('office'), ofisAbonelik: base('ofisAbonelik'), ofisEklenti: base('ofisEklenti'), ofisHakDonemi: base('ofisHakDonemi', { create: async ({ data }: any) => { const row = { id: `hd-${++n}`, iptalTarihi: null, ...data }; t.ofisHakDonemi.push(row); return row; } }),
    ofisDenemeKaydi: base('ofisDenemeKaydi'), kullaniciUyelikPaketi: base('kullaniciUyelikPaketi'), uyelikPaketi: base('uyelikPaketi'), user: base('user'), portfolioCreditLot: base('portfolioCreditLot'), kontorHareketi: base('kontorHareketi'), auditLog: base('auditLog'),
    systemSetting: base('systemSetting', { upsert: async ({ where, create, update }: any) => { const r = find('systemSetting', where); if (r) { Object.assign(r, update); return r; } t.systemSetting.push({ id: where.key, ...create }); return create; } }),
    kontorCuzdani: base('kontorCuzdani', { upsert: async ({ where, create }: any) => find('kontorCuzdani', where) ?? (t.kontorCuzdani.push({ id: `w-${create.kullaniciId}`, bakiye: 0, toplamYukleme: 0, toplamHarcama: 0, toplamHediye: 0, aktifMi: true, ...create }), t.kontorCuzdani[t.kontorCuzdani.length - 1]) }),
    $executeRaw: async (s: TemplateStringsArray, ...v: any[]) => { calls.push(`lock:${String(v[0])}`); return 0; },
    $queryRaw: async (s: TemplateStringsArray) => { calls.push(`row:${s.join('?').includes('"Office"') ? 'office' : 'wallet'}`); return []; },
  };
  return db;
}

const NOW = new Date();
const d = (days: number) => new Date(NOW.getTime() + days * 86400000);
const pkg = (db: any, over: any = {}) => ({
  officeId: 'o1', hakSahibiUserId: 'owner', paketKodu: 'BRONZ', kanal: 'APPLE' as const, kaynakAbonelikAnahtari: 'orig-1', donemBaslangic: NOW, donemBitis: d(30), tutar: 1350, paymentOrderId: 'order-1', at: NOW, ...over,
});
const trialReady = (db: any) => { for (const key of ['EPH70_LOT_UZLASTIRMA_TAMAM', 'EPH70_DENEME_GERIDOLDURMA_TAMAM']) db._t.systemSetting.push({ id: key, key, valueJson: true }); };
const wallet = (db: any) => db._t.kontorCuzdani.find((w: any) => w.kullaniciId === 'owner');

describe('OfficeEntitlementService.grantPackage', () => {
  it('Bronz: abonelik + dönem kaydı + süreli PAKET lotu + cüzdan; eski okuyucu için türetilmiş JSON yazılır (dual-write)', async () => {
    const db = makeDb(); const svc = new OfficeEntitlementService(db);
    const r = await svc.grantPackage(db, pkg(db));
    expect(r).toMatchObject({ grantedPk: 1200, renewed: false, stale: false });
    expect(db._t.ofisAbonelik[0]).toMatchObject({ officeId: 'o1', paketKodu: 'BRONZ', durum: 'AKTIF', kaynakKanal: 'APPLE' });
    expect(db._t.portfolioCreditLot[0]).toMatchObject({ kullaniciId: 'owner', lotTuru: 'PAKET', ilkMiktar: 1200, kaynakKayitTuru: 'OFFICE_PACKAGE', paymentOrderId: 'order-1' });
    expect(db._t.portfolioCreditLot[0].sonKullanmaTarihi.getTime()).toBe(d(30).getTime());
    expect(db._t.portfolioCreditLot[0].dedupeKey).toContain(':PAKET_PK');
    expect(wallet(db).bakiye).toBe(1200);
    const legacy = db._t.systemSetting.find((s: any) => s.key === 'OFFICE_SUBSCRIPTION_o1').valueJson;
    expect(legacy).toMatchObject({ packageCode: 'BRONZ', monthlyPk: 1200, portfolioCapacity: 150, agents: 2, derived: true, source: 'OFIS_ABONELIK' });
  });

  it('kilit sırası: payment-user -> office (advisory + satır) -> wallet', async () => {
    const db = makeDb(); const svc = new OfficeEntitlementService(db);
    await svc.grantPackage(db, pkg(db));
    const order = db._calls.filter((c: string) => /^(lock|row):/.test(c));
    const iPay = order.indexOf('lock:payment-user:owner'); const iOff = order.indexOf('lock:office:o1'); const iOffRow = order.indexOf('row:office'); const iWal = order.indexOf('lock:wallet:owner');
    expect(iPay).toBeGreaterThanOrEqual(0);
    expect(iPay).toBeLessThan(iOff); expect(iOff).toBeLessThan(iOffRow); expect(iOffRow).toBeLessThan(iWal);
  });

  it('aynı dönem iki kez gelirse PK ikinci kez verilmez (dönem tekilliği)', async () => {
    const db = makeDb(); const svc = new OfficeEntitlementService(db);
    await svc.grantPackage(db, pkg(db));
    const again = await svc.grantPackage(db, pkg(db));
    expect(again).toMatchObject({ alreadyGranted: true, grantedPk: 0 });
    expect(db._t.portfolioCreditLot).toHaveLength(1);
    expect(wallet(db).bakiye).toBe(1200);
  });

  it('yenileme: yeni dönem aynı satırı uzatır ve yeni dönem PK\'sı verir; eski dönem geç gelirse bitişi geriye çekmez', async () => {
    const db = makeDb(); const svc = new OfficeEntitlementService(db);
    await svc.grantPackage(db, pkg(db));
    const next = await svc.renew(db, { ...pkg(db), donemBaslangic: d(30), donemBitis: d(60), paymentOrderId: 'order-2' });
    expect(next).toMatchObject({ renewed: true, grantedPk: 1200 });
    expect(db._t.ofisAbonelik).toHaveLength(1);
    expect(db._t.ofisAbonelik[0].bitisTarihi.getTime()).toBe(d(60).getTime());
    expect(wallet(db).bakiye).toBe(2400);
    const stale = await svc.grantPackage(db, { ...pkg(db), donemBaslangic: NOW, donemBitis: d(30), paymentOrderId: 'order-3' });
    expect(stale.stale).toBe(true);
    expect(db._t.ofisAbonelik[0].bitisTarihi.getTime()).toBe(d(60).getTime());
    expect(wallet(db).bakiye).toBe(2400);
  });

  it('K4: süresi geçmiş dönem hak/PK yazmaz (yalnız tarihsel kayıt)', async () => {
    const db = makeDb(); const svc = new OfficeEntitlementService(db);
    const r = await svc.grantPackage(db, pkg(db, { donemBaslangic: d(-40), donemBitis: d(-10) }));
    expect(r.grantedPk).toBe(0);
    expect(db._t.portfolioCreditLot).toHaveLength(0);
    expect(wallet(db)).toBeUndefined();
    expect((await resolveOfficeEntitlements(db, 'o1', NOW)).state).toBe('UCRETSIZ');
  });

  it('0 TL / geçersiz dönem / danışman reddedilir; hiçbir şey yazılmaz', async () => {
    const db = makeDb(); const svc = new OfficeEntitlementService(db);
    await expect(svc.grantPackage(db, pkg(db, { tutar: 0 }))).rejects.toMatchObject({ code: 'AMOUNT_INVALID' });
    await expect(svc.grantPackage(db, pkg(db, { donemBitis: d(-1), donemBaslangic: d(1) }))).rejects.toMatchObject({ code: 'PERIOD_INVALID' });
    await expect(svc.grantPackage(db, pkg(db, { hakSahibiUserId: 'agent' }))).rejects.toMatchObject({ code: 'OFFICE_AGENT_PURCHASE_FORBIDDEN' });
    await expect(svc.grantPackage(db, pkg(db, { paketKodu: 'OFIS_25_PLUS' }))).rejects.toMatchObject({ code: 'PACKAGE_NOT_PURCHASABLE' });
    expect(db._t.ofisAbonelik).toHaveLength(0);
    expect(db._t.portfolioCreditLot).toHaveLength(0);
  });

  it('F16: sipariş anında donmuş hak (hakSnapshot) ayar sonradan değişse de verilir', async () => {
    const db = makeDb(); const svc = new OfficeEntitlementService(db);
    db._t.systemSetting.find((s: any) => s.key === 'OFFICE_MEMBERSHIP_PACKAGES').valueJson = (OFFICE_SETTINGS_FIXTURE.OFFICE_MEMBERSHIP_PACKAGES as any[]).map((p) => (p.code === 'BRONZ' ? { ...p, monthlyPk: 9999 } : p));
    const r = await svc.grantPackage(db, pkg(db, { hakSnapshot: { monthlyPk: 1200 } }));
    expect(r.grantedPk).toBe(1200);
  });

  it('ayar bozuksa hak verilmez (fail-closed)', async () => {
    const db = makeDb(); const svc = new OfficeEntitlementService(db);
    db._t.systemSetting = db._t.systemSetting.filter((s: any) => s.key !== 'OFFICE_FREE_LIMITS');
    await expect(svc.grantPackage(db, pkg(db))).rejects.toThrow(/OFFICE_FREE_LIMITS/);
    expect(db._t.ofisAbonelik).toHaveLength(0);
  });

  it('18a: düşük pakete geçişte eski haklar dönem sonuna kadar korunur (snapshot)', async () => {
    const db = makeDb(); const svc = new OfficeEntitlementService(db);
    await svc.grantPackage(db, pkg(db, { paketKodu: 'ALTIN', tutar: 4950 }));
    await svc.grantPackage(db, pkg(db, { paketKodu: 'BRONZ', donemBaslangic: d(1), donemBitis: d(31), paymentOrderId: 'order-2' }));
    const e = await resolveOfficeEntitlements(db, 'o1', NOW);
    expect(e).toMatchObject({ packageCode: 'BRONZ', users: 12, portfolio: 600, snapshotApplied: true });
    const later = await resolveOfficeEntitlements(db, 'o1', d(31));
    expect(later.snapshotApplied).toBe(false);
  });

  it('ADMIN kanalı (karar 18g): gerekçe zorunlu, denetim kaydı yazılır, ödeme/tutar aranmaz', async () => {
    const db = makeDb(); const svc = new OfficeEntitlementService(db);
    await expect(svc.grantPackage(db, pkg(db, { kanal: 'ADMIN', tutar: 0, admin: { actorUserId: 'adm', gerekce: ' ' } }))).rejects.toMatchObject({ code: 'ADMIN_REASON_REQUIRED' });
    const r = await svc.grantPackage(db, pkg(db, { kanal: 'ADMIN', tutar: 0, kaynakAbonelikAnahtari: 'admin:o1:1', paymentOrderId: null, admin: { actorUserId: 'adm', gerekce: 'Pilot ofis' } }));
    expect(r.grantedPk).toBe(1200);
    expect(db._t.auditLog[0].metadata).toMatchObject({ key: 'OFFICE_PACKAGE_ADMIN_GRANT', admin: 'adm', gerekce: 'Pilot ofis' });
  });
});

describe('OfficeEntitlementService.grantAddon / expire / grantTrial', () => {
  it('ek kullanıcı: kişi başı PK (ayardan) yalnız ek kullanıcı aboneliğinin KENDİ dönemi için; paket yenilemesi ek PK\'yı tekrar vermez (F09)', async () => {
    const db = makeDb(); const svc = new OfficeEntitlementService(db);
    await svc.grantPackage(db, pkg(db));
    const add = { ...pkg(db), tur: 'EK_KULLANICI' as const, adet: 3, kaynakAbonelikAnahtari: 'eku-1', tutar: 1200, paymentOrderId: 'order-eku' };
    const r = await svc.grantAddon(db, add);
    expect(r.grantedPk).toBe(1200);
    expect(wallet(db).bakiye).toBe(2400);
    expect(db._t.portfolioCreditLot[1]).toMatchObject({ kaynakKayitTuru: 'OFFICE_ADDON_USERS', ilkMiktar: 1200 });
    await svc.renew(db, { ...pkg(db), donemBaslangic: d(30), donemBitis: d(60), paymentOrderId: 'order-2' }); // yalnız paket yenilendi
    expect(wallet(db).bakiye).toBe(2400 + 1200); // paket PK'sı eklendi; ek kullanıcı PK'sı tekrar eklenmedi
    expect((await resolveOfficeEntitlements(db, 'o1', d(5))).users).toBe(6);
    expect(await svc.grantAddon(db, add)).toMatchObject({ alreadyGranted: true, grantedPk: 0 });
  });

  it('kademe değişimi YERİNE koyar (toplamaz): önceki kademenin dönem PK\'sı geri alınır', async () => {
    const db = makeDb(); const svc = new OfficeEntitlementService(db);
    await svc.grantPackage(db, pkg(db));
    const add = { ...pkg(db), tur: 'EK_KULLANICI' as const, kaynakAbonelikAnahtari: 'eku-1', paymentOrderId: 'o-a' };
    await svc.grantAddon(db, { ...add, adet: 1, tutar: 400 });
    await svc.grantAddon(db, { ...add, adet: 3, tutar: 1200, donemBaslangic: d(1), paymentOrderId: 'o-b' });
    expect(db._t.ofisEklenti).toHaveLength(1);
    expect(db._t.ofisEklenti[0].adet).toBe(3);
    expect((await resolveOfficeEntitlements(db, 'o1', d(2))).users).toBe(6); // 3 + 3, 3 + 1 + 3 değil
    expect(wallet(db).bakiye).toBe(1200 + 1200); // paket 1200 + yeni kademe 1200; eski +1 kademenin 400 PK'sı geri alındı
  });

  it('Ofis Boy: PK/portföy getirmez; Platinum\'da reddedilir; Ücretsiz\'de reddedilir', async () => {
    const db = makeDb(); const svc = new OfficeEntitlementService(db);
    await expect(svc.grantAddon(db, { ...pkg(db), tur: 'OFIS_BOY', adet: 1, kaynakAbonelikAnahtari: 'boy-1', tutar: 300 })).rejects.toMatchObject({ code: 'ADDON_REQUIRES_OFFICE_PACKAGE' });
    await svc.grantPackage(db, pkg(db, { paketKodu: 'GUMUS', tutar: 2500 }));
    const r = await svc.grantAddon(db, { ...pkg(db), tur: 'OFIS_BOY', adet: 1, kaynakAbonelikAnahtari: 'boy-1', tutar: 300 });
    expect(r.grantedPk).toBe(0);
    expect((await resolveOfficeEntitlements(db, 'o1', NOW))).toMatchObject({ ofisBoy: 2, users: 6, portfolio: 300 });
    const plat = makeDb(); const psvc = new OfficeEntitlementService(plat);
    await psvc.grantPackage(plat, pkg(plat, { paketKodu: 'PLATINUM', tutar: 9950 }));
    await expect(psvc.grantAddon(plat, { ...pkg(plat), tur: 'OFIS_BOY', adet: 1, kaynakAbonelikAnahtari: 'boy-1', tutar: 300 })).rejects.toMatchObject({ code: 'ADDON_INCLUDED_IN_PACKAGE' });
  });

  it('expire SURESI_DOLDU: durum kapanır, eklentiler paketi izler; resolver Ücretsiz döner', async () => {
    const db = makeDb(); const svc = new OfficeEntitlementService(db);
    await svc.grantPackage(db, pkg(db));
    await svc.grantAddon(db, { ...pkg(db), tur: 'EK_KULLANICI', adet: 2, kaynakAbonelikAnahtari: 'eku-1', tutar: 800 });
    const out = await svc.expire(db, { kanal: 'APPLE', kaynakAbonelikAnahtari: 'orig-1', neden: 'SURESI_DOLDU' });
    expect(out.statusChanged).toBe(true);
    expect(db._t.ofisAbonelik[0].durum).toBe('SURESI_DOLDU');
    expect(db._t.ofisEklenti[0].durum).toBe('SURESI_DOLDU');
    expect((await resolveOfficeEntitlements(db, 'o1', NOW)).state).toBe('UCRETSIZ');
  });

  it('expire IADE: kalan lot geri alınır; harcanmış kısım bakiyeyi eksiye düşürmez, fark denetime yazılır (karar 5)', async () => {
    const db = makeDb(); const svc = new OfficeEntitlementService(db);
    await svc.grantPackage(db, pkg(db));
    wallet(db).bakiye = 300; db._t.portfolioCreditLot[0].kalanMiktar = 300; // 900 PK harcandı
    const out = await svc.expire(db, { kanal: 'APPLE', kaynakAbonelikAnahtari: 'orig-1', neden: 'IADE', paymentOrderId: 'order-1' });
    expect(out.reclaimed).toBe(300);
    expect(wallet(db).bakiye).toBe(0);
    expect(db._t.auditLog[0].metadata).toMatchObject({ key: 'STORE_REFUND_SHORTFALL', granted: 1200, reclaimed: 300, shortfall: 900 });
    expect(db._t.ofisHakDonemi[0].iptalTarihi).toBeInstanceOf(Date);
  });

  it('deneme: ofis + telefon tekil; Gümüş düzeyi, 500 PK süreli lot; ikinci ofis aynı telefonla alamaz', async () => {
    const db = makeDb(); const svc = new OfficeEntitlementService(db); trialReady(db);
    const r = await svc.grantTrial(db, { officeId: 'o1', ownerUserId: 'owner', telefonHash: 'h'.repeat(64), actorUserId: 'owner', at: NOW });
    expect(r).toMatchObject({ grantedPk: 500, trialDays: 14, balance: 500 });
    expect(db._t.portfolioCreditLot[0]).toMatchObject({ lotTuru: 'PAKET', ilkMiktar: 500, kaynakKayitTuru: 'OFFICE_TRIAL_YENI' });
    expect(db._t.portfolioCreditLot[0].sonKullanmaTarihi.getTime()).toBe(d(14).getTime());
    expect(await resolveOfficeEntitlements(db, 'o1', NOW)).toMatchObject({ state: 'DENEME', users: 6, portfolio: 300 });
    await expect(svc.grantTrial(db, { officeId: 'o1', ownerUserId: 'owner', telefonHash: 'x'.repeat(64), actorUserId: 'owner', at: NOW })).rejects.toMatchObject({ code: 'TRIAL_ALREADY_USED' });
    db._t.office.push({ id: 'o2', isActive: true, ownerUserId: 'owner2', name: 'Diğer' });
    await expect(svc.grantTrial(db, { officeId: 'o2', ownerUserId: 'owner2', telefonHash: 'h'.repeat(64), actorUserId: 'owner2', at: NOW })).rejects.toMatchObject({ code: 'TRIAL_PHONE_USED' });
  });

  it('OfficeEntitlementError dışarıya kod + mesaj taşır', () => {
    const e = new OfficeEntitlementError('MEMBERSHIP_ACTIVE_OTHER_CHANNEL', 'x');
    expect(e.getStatus()).toBe(409);
    expect((e.getResponse() as any).code).toBe('MEMBERSHIP_ACTIVE_OTHER_CHANNEL');
  });
});

describe('ODM-7G-D düzeltmeleri', () => {
  const eku = (db: any, over: any = {}) => ({ ...pkg(db), tur: 'EK_KULLANICI' as const, adet: 1, kaynakAbonelikAnahtari: 'eku-1', tutar: 400, paymentOrderId: 'o-eku', ...over });
  const trialIn = (over: any = {}) => ({ officeId: 'o1', ownerUserId: 'owner', telefonHash: 'h'.repeat(64), actorUserId: 'owner', at: NOW, ...over });

  it('F03: kapanmış kaynak zinciri yeniden kullanılır — aynı dönem tekrarı hak/satır üretmez, daha yeni dönem AYNI satırı yeniden açar, başka ofis reddedilir', async () => {
    const db = makeDb(); const svc = new OfficeEntitlementService(db);
    await svc.grantPackage(db, pkg(db));
    await svc.expire(db, { kanal: 'APPLE', kaynakAbonelikAnahtari: 'orig-1', neden: 'IADE', paymentOrderId: 'order-1' });
    expect(db._t.ofisAbonelik[0].durum).toBe('IPTAL');
    const replay = await svc.grantPackage(db, pkg(db));
    expect(replay).toMatchObject({ alreadyGranted: true, grantedPk: 0 });
    expect(db._t.ofisAbonelik).toHaveLength(1);
    expect(db._t.ofisAbonelik[0].durum).toBe('IPTAL'); // iade edilen dönemin tekrarı hakkı geri açmaz
    const renewed = await svc.grantPackage(db, pkg(db, { donemBaslangic: d(30), donemBitis: d(60), paymentOrderId: 'order-2' }));
    expect(renewed).toMatchObject({ renewed: true, grantedPk: 1200 });
    expect(db._t.ofisAbonelik).toHaveLength(1);
    expect(db._t.ofisAbonelik[0].durum).toBe('AKTIF');
    db._t.office.push({ id: 'o2', isActive: true, ownerUserId: 'owner2', name: 'Diğer' });
    await expect(svc.grantPackage(db, pkg(db, { officeId: 'o2', hakSahibiUserId: 'owner2' }))).rejects.toMatchObject({ code: 'STORE_ACCOUNT_MISMATCH' });
  });

  it('F04: süresi dolmuş ama AKTIF eklenti satırı kapatılır; farklı zincirle yeni eklenti satın alımı engellenmez', async () => {
    const db = makeDb(); const svc = new OfficeEntitlementService(db);
    await svc.grantPackage(db, pkg(db, { donemBitis: d(90) }));
    await svc.grantAddon(db, eku(db, { donemBitis: d(30) }));
    const later = d(40);
    const r = await svc.grantAddon(db, eku(db, { kaynakAbonelikAnahtari: 'eku-2', donemBaslangic: later, donemBitis: d(70), at: later, paymentOrderId: 'o-eku2' }));
    expect(r.stale).toBe(false);
    expect(db._t.ofisEklenti).toHaveLength(2);
    expect(db._t.ofisEklenti[0].durum).toBe('SURESI_DOLDU');
    expect(db._t.ofisEklenti[1].durum).toBe('AKTIF');
  });

  it('F04/F03: iade edilen eklenti dönemi tekrar gelirse yeniden AÇILMAZ', async () => {
    const db = makeDb(); const svc = new OfficeEntitlementService(db);
    await svc.grantPackage(db, pkg(db));
    await svc.grantAddon(db, eku(db));
    await svc.expire(db, { kanal: 'APPLE', kaynakAbonelikAnahtari: 'eku-1', neden: 'IADE' });
    expect(db._t.ofisEklenti[0].durum).toBe('IPTAL');
    expect(await svc.grantAddon(db, eku(db))).toMatchObject({ stale: true, grantedPk: 0 });
    expect(db._t.ofisEklenti[0].durum).toBe('IPTAL');
  });

  it('F05: AYNI dönem başlangıcında kademe değişimi PK yi de yerine koyar (kapasite +3 → PK +3)', async () => {
    const db = makeDb(); const svc = new OfficeEntitlementService(db);
    await svc.grantPackage(db, pkg(db));
    await svc.grantAddon(db, eku(db, { adet: 1 }));
    expect(wallet(db).bakiye).toBe(1200 + 400);
    const r = await svc.grantAddon(db, eku(db, { adet: 3, tutar: 1200, paymentOrderId: 'o-b' })); // AYNI donemBaslangic
    expect(r.grantedPk).toBe(1200);
    expect((await resolveOfficeEntitlements(db, 'o1', d(2))).users).toBe(6);
    expect(wallet(db).bakiye).toBe(1200 + 1200); // eski +1 kademenin kalan 400 PK'sı geri alındı
    expect(db._t.ofisHakDonemi.find((h: any) => h.kaynakTur === 'EKLENTI').verilenPk).toBe(1200);
    expect(await svc.grantAddon(db, eku(db, { adet: 3, tutar: 1200, paymentOrderId: 'o-b' }))).toMatchObject({ alreadyGranted: true, grantedPk: 0 }); // aynı kademe tekrarı PK vermez
  });

  it('F02: iade sonrası legacy snapshot KAPANIR (gelecekteki mağaza bitişi etkin hak sayılmaz); kapasite alanları Ücretsiz etkin hak', async () => {
    const db = makeDb(); const svc = new OfficeEntitlementService(db);
    await svc.grantPackage(db, pkg(db, { paketKodu: 'ALTIN', tutar: 4950 }));
    await svc.expire(db, { kanal: 'APPLE', kaynakAbonelikAnahtari: 'orig-1', neden: 'IADE', paymentOrderId: 'order-1' });
    const legacy = db._t.systemSetting.find((s: any) => s.key === 'OFFICE_SUBSCRIPTION_o1').valueJson;
    expect(legacy).toMatchObject({ ended: true, active: false, derived: true, portfolioCapacity: 10, agents: 0 });
    expect(new Date(legacy.expiresAt).getTime()).toBeLessThanOrEqual(Date.now() + 1000);
    expect(new Date(legacy.originalEndsAt).getTime()).toBeGreaterThan(Date.now());
    expect(legacySnapshotLive(legacy)).toBe(false);
  });

  it('F01/F06: eski kanalda (OFFICE_SUBSCRIPTION_* veya kişisel üyelik) aktif ücretli hak varken yeni paket/deneme YAZILMAZ', async () => {
    const db = makeDb(); const svc = new OfficeEntitlementService(db); trialReady(db);
    db._t.systemSetting.push({ id: 'legacy', key: 'OFFICE_SUBSCRIPTION_o1', valueJson: { packageCode: 'BRONZ', expiresAt: d(20).toISOString() } });
    await expect(svc.grantPackage(db, pkg(db))).rejects.toMatchObject({ code: 'CHANNEL_UNKNOWN_REVIEW' });
    await expect(svc.grantTrial(db, trialIn())).rejects.toMatchObject({ code: 'PAID_PACKAGE_ACTIVE' });
    db._t.systemSetting = db._t.systemSetting.filter((s: any) => s.id !== 'legacy');
    db._t.uyelikPaketi.push({ id: 'up1', paketKodu: 'BRONZ' });
    db._t.kullaniciUyelikPaketi.push({ id: 'ku1', kullaniciId: 'owner', paketId: 'up1', durum: 'AKTIF', baslangicTarihi: d(-5), bitisTarihi: d(20) });
    await expect(svc.grantTrial(db, trialIn())).rejects.toMatchObject({ code: 'PAID_PACKAGE_ACTIVE' });
    expect(db._t.ofisDenemeKaydi).toHaveLength(0);
  });

  it('F07: yeni deneme önkoşulları yoksa açılmaz; yeni deneme lotu eski deneme istisnasına girmez ve süre sonunda harcanamaz', async () => {
    const db = makeDb(); const svc = new OfficeEntitlementService(db);
    await expect(svc.grantTrial(db, trialIn())).rejects.toMatchObject({ code: 'TRIAL_PREREQUISITES_PENDING' });
    trialReady(db);
    await svc.grantTrial(db, trialIn());
    const lot = db._t.portfolioCreditLot[0];
    expect(isLegacyTrialLot(lot, null)).toBe(false); // cutoff tanımsız olsa bile eski deneme sayılmaz
    expect(isLotUsable(lot, d(15), null)).toBe(false);
    expect(isLotUsable(lot, d(5), null)).toBe(true);
  });

  it('F08: ofise bağlı başka bir kullanıcının eski deneme tüketimi yeni denemeyi engeller (ofis el değiştirmiş olabilir)', async () => {
    const db = makeDb(); const svc = new OfficeEntitlementService(db); trialReady(db);
    db._t.user.push({ id: 'oldOwner', officeId: 'o1' });
    db._t.kontorHareketi.push({ id: 'h1', kullaniciId: 'oldOwner', aciklama: 'Ofis Deneme Paketi: 14 Günlük Deneme ve 500 Ortak PK Yüklendi.' });
    await expect(svc.grantTrial(db, trialIn())).rejects.toMatchObject({ code: 'TRIAL_ALREADY_USED' });
  });
});
