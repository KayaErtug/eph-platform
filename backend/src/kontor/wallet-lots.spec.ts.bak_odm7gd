import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { KontorService } from './kontor.service';
import {
  consumeLots, expireDueLots, lockWallet, lockWalletsOrdered, planConsumption, planReconciliation, restoreLots, sortLotsForConsumption,
  LOT_RECONCILED_KEY, NEW_TRIAL_START_KEY,
} from './wallet-lots';

/* EPH-70B1 / 70B1F — cüzdan kilidi + lot tüketimi testleri.
 * UYARI: Bellek içi model gerçek PostgreSQL kilidini (advisory + SELECT ... FOR UPDATE) çalıştırmaz; kilit, tx başına
 * mutex ile MODELLENİR. Gerçek kilit/deadlock davranışı DB'de doğrulanmalıdır (iki eşzamanlı oturum). */

const D = (iso: string) => new Date(iso);
const NOW = D('2026-11-08T12:00:00Z');

type Lot = { id: string; kullaniciId: string; lotTuru: string; ilkMiktar: number; kalanMiktar: number; sonKullanmaTarihi: Date | null; aktifMi: boolean; olusturulmaTarihi: Date; kaynakKayitTuru?: string | null };

/** Küçük Prisma `where` eşleyici: eşitlik, {gt,lte,in}, OR. */
function match(row: any, where: any = {}): boolean {
  return Object.entries(where).every(([k, v]: [string, any]) => {
    if (k === 'OR') return v.some((w: any) => match(row, w));
    const x = row[k];
    if (v === null) return x === null || x === undefined;
    if (v instanceof Date || typeof v !== 'object') return x === v || (x instanceof Date && v instanceof Date && x.getTime() === v.getTime());
    if ('gt' in v && !(x != null && x > v.gt)) return false;
    if ('lte' in v && !(x != null && x <= v.lte)) return false;
    if ('in' in v && !v.in.includes(x)) return false;
    return true;
  });
}

function makeDb(balance: number, lots: Lot[], settings: Record<string, unknown> = {}, extraUsers: Array<{ id: string; bakiye: number }> = []) {
  const wallets: Record<string, any> = { u1: { id: 'w-u1', kullaniciId: 'u1', bakiye: balance, toplamHarcama: 0, aktifMi: true } };
  for (const u of extraUsers) wallets[u.id] = { id: `w-${u.id}`, kullaniciId: u.id, bakiye: u.bakiye, toplamHarcama: 0, aktifMi: true };
  const state = { wallets, lots, movements: [] as any[], tuketim: [] as any[], lockLog: [] as string[], settings, get wallet() { return wallets.u1; } };
  let tail: Promise<void> = Promise.resolve();
  const make = () => {
    let release: (() => void) | null = null;
    const tx: any = {
      $executeRaw: async (_s: any, ...vals: any[]) => {
        state.lockLog.push(String(vals[0]));
        if (release) return 0;
        let rel!: () => void; const got = new Promise<void>((r) => (rel = r)); const prev = tail; tail = prev.then(() => got); await prev; release = rel; return 0;
      },
      $queryRaw: async () => [{ id: 'w' }],
      systemSetting: { findUnique: async ({ where }: any) => (where.key in state.settings ? { valueJson: state.settings[where.key] } : null) },
      kontorCuzdani: {
        findUnique: async ({ where }: any) => ({ ...state.wallets[where.kullaniciId] }),
        update: async ({ where, data }: any) => {
          const w = Object.values(state.wallets).find((x: any) => (where.id ? x.id === where.id : x.kullaniciId === where.kullaniciId)) as any;
          if (data.bakiye?.decrement) w.bakiye -= data.bakiye.decrement;
          if (data.bakiye?.increment) w.bakiye += data.bakiye.increment;
          return { ...w };
        },
      },
      portfolioCreditLot: {
        findMany: async ({ where, distinct, orderBy, take }: any) => {
          let rows = state.lots.filter((l) => match(l, where));
          if (orderBy) {
            const o = Array.isArray(orderBy) ? orderBy : [orderBy];
            rows = [...rows].sort((a: any, b: any) => {
              for (const c of o) {
                const [k, dir] = Object.entries<string>(c)[0];
                const av = a[k] instanceof Date ? a[k].getTime() : a[k]; const bv = b[k] instanceof Date ? b[k].getTime() : b[k];
                if (av !== bv) return (av < bv ? -1 : 1) * (dir === 'desc' ? -1 : 1);
              }
              return 0;
            });
          }
          if (distinct) rows = rows.filter((r, i, a) => a.findIndex((x) => x.kullaniciId === r.kullaniciId) === i).map((r) => ({ kullaniciId: r.kullaniciId } as any));
          if (take) rows = rows.slice(0, take);
          return rows.map((r) => ({ ...r }));
        },
        findUnique: async ({ where }: any) => ({ ...state.lots.find((l) => l.id === where.id)! }),
        update: async ({ where, data }: any) => {
          const l = state.lots.find((x) => x.id === where.id)!;
          for (const [k, v] of Object.entries<any>(data)) { if (v?.decrement) l.kalanMiktar -= v.decrement; else if (v?.increment) l.kalanMiktar += v.increment; else (l as any)[k] = v; }
          return { ...l };
        },
      },
      portfolioCreditLotTuketim: {
        create: async ({ data }: any) => { const r = { id: `t${state.tuketim.length + 1}`, iadeEdilen: 0, ...data }; state.tuketim.push(r); return r; },
        findMany: async ({ where }: any) => state.tuketim.filter((t) => match(t, where)).map((t) => ({ ...t })),
        update: async ({ where, data }: any) => { const t = state.tuketim.find((x) => x.id === where.id); if (data.iadeEdilen?.increment) t.iadeEdilen += data.iadeEdilen.increment; return { ...t }; },
      },
      kontorHareketi: { create: async ({ data }: any) => { const m = { id: `m${state.movements.length + 1}`, ...data }; state.movements.push(m); return m; } },
    };
    return { tx, done: () => { release?.(); release = null; } };
  };
  const prisma: any = {
    $transaction: async (fn: any) => { const { tx, done } = make(); try { return await fn(tx); } finally { done(); } },
    systemSetting: { findUnique: async (a: any) => make().tx.systemSetting.findUnique(a) },
    portfolioCreditLot: { findMany: async (args: any) => make().tx.portfolioCreditLot.findMany(args) },
  };
  return { state, prisma };
}

const lot = (id: string, lotTuru: string, kalan: number, exp: string | null, created = '2026-10-01T00:00:00Z', ilk = kalan, kaynak: string | null = null, user = 'u1'): Lot =>
  ({ id, kullaniciId: user, lotTuru, ilkMiktar: ilk, kalanMiktar: kalan, sonKullanmaTarihi: exp ? D(exp) : null, aktifMi: true, olusturulmaTarihi: D(created), kaynakKayitTuru: kaynak });
const kalanlar = (db: ReturnType<typeof makeDb>) => Object.fromEntries(db.state.lots.map((l) => [l.id, l.kalanMiktar]));

describe('lot tüketim sırası (K2)', () => {
  const lots = [
    lot('ek', 'SATIN_ALMA', 100, null),
    lot('paket-geç', 'PAKET', 50, '2026-12-20T00:00:00Z'),
    lot('devir', 'DEVIR', 20, null),
    lot('paket-yakın', 'PAKET', 30, '2026-11-20T00:00:00Z'),
  ];
  it('önce süresi en yakın PAKET/DENEME, sonra süresiz, en son süresiz EK PK', () => {
    expect(sortLotsForConsumption(lots).map((l) => l.id)).toEqual(['paket-yakın', 'paket-geç', 'devir', 'ek']);
  });
  it('düşüm sırayla yapılır; lot karşılığı olmayan kısım untracked döner', () => {
    const plan = planConsumption(lots, 95);
    expect(plan.steps.map((s) => [s.lot.id, s.take])).toEqual([['paket-yakın', 30], ['paket-geç', 50], ['devir', 15]]);
    expect(planConsumption(lots, 500).untracked).toBe(500 - 200);
  });
  it('harcama lotları tüketir (tahsis kaydıyla), EK PK en son azalır; süresi geçmiş lota dokunulmaz', async () => {
    const db = makeDb(200, [...lots.map((l) => ({ ...l })), lot('eski', 'PAKET', 40, '2026-11-01T00:00:00Z')]);
    await db.prisma.$transaction(async (tx: any) => { await lockWallet(tx, 'u1'); await consumeLots(tx, 'u1', 110, { now: NOW, hareketId: 'h1' }); });
    expect(kalanlar(db)).toMatchObject({ 'paket-yakın': 0, 'paket-geç': 0, devir: 0, ek: 90, eski: 40 });
    expect(db.state.tuketim.map((t) => [t.lotId, t.miktar])).toEqual([['paket-yakın', 30], ['paket-geç', 50], ['devir', 20], ['ek', 10]]);
  });
});

describe('uzlaştırma planı (saf yardımcı)', () => {
  it('Σ lot kalanı > bakiye ise fark tanımlı sırayla düşülür', () => {
    const lots = [lot('ek', 'SATIN_ALMA', 100, null), lot('p', 'PAKET', 60, '2026-12-01T00:00:00Z')];
    expect(planReconciliation(lots, 130).steps.map((s) => [s.lot.id, s.take])).toEqual([['p', 30]]);
    expect(planReconciliation(lots, 160).steps).toHaveLength(0);
    expect(planReconciliation(lots, 500).steps).toHaveLength(0);
  });
});

describe('iade (D5): yalnız hareketin kendi tahsisinden geri alınır', () => {
  it('ODM-7D örneği: başarısız işlem EK PK\'dan 50 aldı → iade EK\'e döner, boşalmış PAKET lotu DOLDURULMAZ', async () => {
    const db = makeDb(100, [lot('p', 'PAKET', 0, '2026-12-01T00:00:00Z', undefined, 100), lot('ek', 'SATIN_ALMA', 50, null, undefined, 100)]);
    db.state.tuketim.push({ id: 't0', kullaniciId: 'u1', hareketId: 'h-basarisiz', lotId: 'ek', miktar: 50, iadeEdilen: 0 });
    const r = await db.prisma.$transaction(async (tx: any) => { await lockWallet(tx, 'u1'); return restoreLots(tx, 'u1', 'h-basarisiz', 50, NOW); });
    expect(kalanlar(db)).toEqual({ p: 0, ek: 100 });
    expect(r).toMatchObject({ credit: 50, restored: 50, lost: 0 });
  });
  it('idempotent: ikinci iade çağrısı bir şey geri yazmaz', async () => {
    const db = makeDb(100, [lot('ek', 'SATIN_ALMA', 50, null, undefined, 100)]);
    db.state.tuketim.push({ id: 't0', kullaniciId: 'u1', hareketId: 'h', lotId: 'ek', miktar: 50, iadeEdilen: 0 });
    await db.prisma.$transaction(async (tx: any) => { await restoreLots(tx, 'u1', 'h', 50, NOW); });
    const again = await db.prisma.$transaction(async (tx: any) => restoreLots(tx, 'u1', 'h', 50, NOW));
    expect(again.credit).toBe(0);
    expect(kalanlar(db)).toEqual({ ek: 100 });
  });
  it('lot arada pasifleşmiş/süresi dolmuşsa o pay lota yazılmaz ve bakiyeye eklenmez (lost)', async () => {
    const db = makeDb(10, [{ ...lot('p', 'PAKET', 0, '2026-11-01T00:00:00Z', undefined, 60), aktifMi: false }, lot('ek', 'SATIN_ALMA', 0, null, undefined, 10)]);
    db.state.tuketim.push({ id: 'a', kullaniciId: 'u1', hareketId: 'h', lotId: 'p', miktar: 40, iadeEdilen: 0 }, { id: 'b', kullaniciId: 'u1', hareketId: 'h', lotId: 'ek', miktar: 10, iadeEdilen: 0 });
    const r = await db.prisma.$transaction(async (tx: any) => restoreLots(tx, 'u1', 'h', 50, NOW));
    expect(r).toMatchObject({ credit: 10, restored: 10, lost: 40 });
    expect(kalanlar(db)).toEqual({ p: 0, ek: 10 });
  });
  it('tahsis kaydı olmayan eski hareket: bakiye tam döner, lotlara dokunulmaz', async () => {
    const db = makeDb(10, [lot('ek', 'SATIN_ALMA', 5, null, undefined, 100)]);
    const r = await db.prisma.$transaction(async (tx: any) => restoreLots(tx, 'u1', 'eski-hareket', 30, NOW));
    expect(r).toMatchObject({ credit: 30, restored: 0, untracked: 30 });
    expect(kalanlar(db)).toEqual({ ek: 5 });
  });
});

describe('dönem sonu: kapı (D3), atomik kapanış (D2), eski deneme (D4), sayfalama (D9)', () => {
  const mk = (settings: Record<string, unknown> = { [LOT_RECONCILED_KEY]: true }) => makeDb(150, [
    lot('bitmiş', 'PAKET', 40, '2026-11-01T00:00:00Z'),
    lot('sürüyor', 'PAKET', 30, '2027-01-01T00:00:00Z'),
    lot('ek', 'SATIN_ALMA', 80, null),
  ], settings);

  it('D3: bayrak yoksa cron HİÇBİR ŞEY yapmaz (no-op)', async () => {
    const db = mk({});
    const svc = new KontorService(db.prisma, {} as any);
    expect(await svc.expirePackageLots(NOW)).toEqual({ users: 0, deducted: 0, skipped: true });
    expect(db.state.wallet.bakiye).toBe(150);
    expect(kalanlar(db)).toEqual({ bitmiş: 40, sürüyor: 30, ek: 80 });
  });
  it('D3: bayrak "false" ise de no-op; lockWallet da düşmez', async () => {
    const db = mk({ [LOT_RECONCILED_KEY]: false });
    await db.prisma.$transaction(async (tx: any) => { await lockWallet(tx, 'u1', { now: NOW }); });
    expect(db.state.wallet.bakiye).toBe(150);
  });
  it('bayrak true: bitmiş PAKET kalanı düşülür; EK PK ve süren PAKET korunur; idempotent', async () => {
    const db = mk();
    const svc = new KontorService(db.prisma, {} as any);
    expect(await svc.expirePackageLots(NOW)).toEqual({ users: 1, deducted: 40, skipped: false });
    expect(db.state.wallet.bakiye).toBe(110);
    expect(kalanlar(db)).toEqual({ bitmiş: 0, sürüyor: 30, ek: 80 });
    expect(db.state.movements[0]).toMatchObject({ hareketTuru: 'DUZELTME', miktar: 40, ilgiliKayitTuru: 'PAKET_LOT_DONEM_SONU' });
    expect(await svc.expirePackageLots(NOW)).toEqual({ users: 0, deducted: 0, skipped: false });
    expect(db.state.wallet.bakiye).toBe(110);
  });
  it('bakiye lot kalanından azsa bakiye sıfırın altına düşmez', async () => {
    const db = makeDb(15, [lot('bitmiş', 'PAKET', 40, '2026-11-01T00:00:00Z')], { [LOT_RECONCILED_KEY]: true });
    await new KontorService(db.prisma, {} as any).expirePackageLots(NOW);
    expect(db.state.wallet.bakiye).toBe(0);
  });
  it('D2: harcama anında vadesi dolan PAKET, yeterlilik kontrolünden ÖNCE bakiyeden düşer (cron beklenmez)', async () => {
    const db = makeDb(100, [lot('bitmiş', 'PAKET', 100, '2026-11-01T00:00:00Z')], { [LOT_RECONCILED_KEY]: true });
    const w = await db.prisma.$transaction(async (tx: any) => lockWallet(tx, 'u1', { now: NOW }));
    expect(w.bakiye).toBe(0); // 60 PK harcama artık yeterlilik kontrolünde reddedilir
    expect(kalanlar(db)).toEqual({ bitmiş: 0 });
  });
  it('D4: eski deneme (cutoff tanımsız veya lot cutoff öncesi) düşülmez ve harcanabilir kalır; yeni deneme düşülür', async () => {
    const eski = lot('eski-deneme', 'PAKET', 25, '2026-11-01T00:00:00Z', '2026-10-20T00:00:00Z', 25, 'TRIAL_MEMBERSHIP');
    const yeni = lot('yeni-deneme', 'PAKET', 10, '2026-11-05T00:00:00Z', '2026-11-02T00:00:00Z', 10, 'TRIAL_MEMBERSHIP');
    const a = makeDb(35, [{ ...eski }, { ...yeni }], { [LOT_RECONCILED_KEY]: true }); // cutoff yok → ikisi de "eski" sayılır
    await a.prisma.$transaction(async (tx: any) => expireDueLots(tx, 'u1', NOW));
    expect(kalanlar(a)).toEqual({ 'eski-deneme': 25, 'yeni-deneme': 10 });
    const b = makeDb(35, [{ ...eski }, { ...yeni }], { [LOT_RECONCILED_KEY]: true, [NEW_TRIAL_START_KEY]: '2026-11-01T00:00:00Z' });
    await b.prisma.$transaction(async (tx: any) => expireDueLots(tx, 'u1', NOW));
    expect(kalanlar(b)).toEqual({ 'eski-deneme': 25, 'yeni-deneme': 0 });
    expect(b.state.wallet.bakiye).toBe(25);
    await b.prisma.$transaction(async (tx: any) => consumeLots(tx, 'u1', 20, { now: NOW, hareketId: 'h' })); // vadesi geçse de harcanabilir
    expect(kalanlar(b)['eski-deneme']).toBe(5);
  });
  it('D9: 200\'lük sayfalardan fazla kullanıcı tek çağrıda boşaltılır', async () => {
    const users = Array.from({ length: 450 }, (_, i) => `x${String(i).padStart(3, '0')}`);
    const db = makeDb(0, users.map((u) => lot(`l-${u}`, 'PAKET', 5, '2026-11-01T00:00:00Z', undefined, 5, null, u)), { [LOT_RECONCILED_KEY]: true }, users.map((id) => ({ id, bakiye: 5 })));
    const res = await new KontorService(db.prisma, {} as any).expirePackageLots(NOW);
    expect(res).toMatchObject({ users: 450, deducted: 450 * 5, skipped: false });
    expect(db.state.lots.every((l) => l.kalanMiktar === 0)).toBe(true);
  });
});

describe('kilit sırası (D7) — MODEL', () => {
  it('birden çok cüzdan kullaniciId artan sırada kilitlenir (ters sıra yok)', async () => {
    const db = makeDb(0, [], {}, [{ id: 'b', bakiye: 1 }, { id: 'a', bakiye: 1 }]);
    await db.prisma.$transaction(async (tx: any) => { await lockWalletsOrdered(tx, ['u1', 'b', 'a', 'b']); });
    expect(db.state.lockLog.filter((k) => k.startsWith('wallet:'))).toEqual(['wallet:a', 'wallet:b', 'wallet:u1']);
  });
});

describe('eşzamanlı iade + harcama (K1) — MODEL', () => {
  it('kilit altında seri çalışır: bakiye < 0 olmaz, Σ lot kalanı ≤ bakiye kalır (gerçek FOR UPDATE DB\'de doğrulanmalı)', async () => {
    const db = makeDb(100, [lot('p', 'PAKET', 100, '2026-12-01T00:00:00Z')]);
    const spend = (n: number) => db.prisma.$transaction(async (tx: any) => {
      const w = await lockWallet(tx, 'u1');
      if (!w || w.bakiye < n) return 'YETERSIZ';
      await tx.kontorCuzdani.update({ where: { kullaniciId: 'u1' }, data: { bakiye: { decrement: n } } });
      await consumeLots(tx, 'u1', n, { now: NOW });
      return 'OK';
    });
    const revoke = () => db.prisma.$transaction(async (tx: any) => {
      const w = await lockWallet(tx, 'u1');
      const l = await tx.portfolioCreditLot.findUnique({ where: { id: 'p' } });
      const dec = Math.max(0, Math.min(l.kalanMiktar, w.bakiye));
      await tx.portfolioCreditLot.update({ where: { id: 'p' }, data: { kalanMiktar: 0, aktifMi: false } });
      if (dec > 0) await tx.kontorCuzdani.update({ where: { kullaniciId: 'u1' }, data: { bakiye: { decrement: dec } } });
      return { dec };
    });
    await Promise.all([spend(60), revoke(), spend(60)]);
    expect(db.state.wallet.bakiye).toBeGreaterThanOrEqual(0);
    expect(db.state.lots.reduce((s, l) => s + l.kalanMiktar, 0)).toBeLessThanOrEqual(db.state.wallet.bakiye);
  });
});

describe('D1 — statik koruma: bakiye düşen her cüzdan yolu lot tüketimine bağlı', () => {
  function walk(dir: string, out: string[] = []) {
    for (const n of readdirSync(dir)) {
      const p = join(dir, n);
      if (statSync(p).isDirectory()) walk(p, out);
      else if (p.endsWith('.ts') && !p.endsWith('.spec.ts') && !p.endsWith('.d.ts')) out.push(p);
    }
    return out;
  }
  // Lot-bazlı iade/dönem sonu düşümü (lotun KENDİSİNİ kapatır) — consumeLots gerektirmez:
  const LOT_KAPATMA = ['kontor/wallet-lots.ts', 'payments/store/apple-store.service.ts', 'office/office-entitlement.service.ts']; // EPH-70B2: reclaimPeriodLot = lot-bazlı iade/kademe değişimi (lotun kendisini kapatır)
  it('"bakiye: { decrement }" içeren her kaynak dosya consumeLots kullanır (veya lot-kapatma istisnasıdır)', () => {
    const root = join(__dirname, '..');
    const offenders = walk(root)
      .filter((f) => /bakiye:\s*\{\s*decrement/.test(readFileSync(f, 'utf8')))
      .filter((f) => !readFileSync(f, 'utf8').includes('consumeLots'))
      .map((f) => f.replace(/\\/g, '/').split('/src/')[1])
      .filter((f) => !LOT_KAPATMA.includes(f));
    expect(offenders).toEqual([]);
  });
});

describe('EPH-70B1G — ODM-7E düzeltmeleri', () => {
  it('F2: ofis denemesi (OFFICE_TRIAL) süreli PAKET lotudur; cutoff öncesi eski deneme korunur, sonrası dönem sonunda düşer', async () => {
    const eski = lot('ofis-eski', 'PAKET', 25, '2026-11-01T00:00:00Z', '2026-10-20T00:00:00Z', 25, 'OFFICE_TRIAL');
    const yeni = lot('ofis-yeni', 'PAKET', 10, '2026-11-05T00:00:00Z', '2026-11-02T00:00:00Z', 10, 'OFFICE_TRIAL');
    const db = makeDb(35, [{ ...eski }, { ...yeni }], { [LOT_RECONCILED_KEY]: true, [NEW_TRIAL_START_KEY]: '2026-11-01T00:00:00Z' });
    await db.prisma.$transaction(async (tx: any) => expireDueLots(tx, 'u1', NOW));
    expect(kalanlar(db)).toEqual({ 'ofis-eski': 25, 'ofis-yeni': 0 });
  });

  it('F2 (statik): ofis deneme/paket yüklemesi süresiz HEDIYE/DEVIR lotu yazmaz ve vade (sonKullanmaTarihi) taşır', () => {
    // EPH-70B2: tüm ofis PK yüklemeleri OfficeEntitlementService.creditPk'ten geçer (tek yol): PAKET türü + vade zorunlu
    const src = readFileSync(join(__dirname, '..', 'office', 'office-entitlement.service.ts'), 'utf8');
    const creditPk = src.slice(src.indexOf('private async creditPk('), src.indexOf('private async reclaimPeriodLot('));
    expect(creditPk).toContain("lotTuru: 'PAKET'");
    expect(creditPk).toContain('sonKullanmaTarihi: o.sonKullanma');
    expect(creditPk).not.toMatch(/lotTuru: '(HEDIYE|DEVIR)'/);
    for (const kaynak of ["kaynakKayitTuru: NEW_OFFICE_TRIAL_LOT_SOURCE", "kaynakKayitTuru: 'OFFICE_PACKAGE'", "kaynakKayitTuru: 'OFFICE_ADDON_USERS'"]) {
      const call = src.split('\n').find((l) => l.includes(kaynak)) ?? '';
      expect(call).toContain('creditPk') ;
    }
    for (const line of src.split('\n').filter((l) => l.includes('this.creditPk('))) expect(src).toContain(line.trim().slice(0, 40));
    expect(src).toContain('sonKullanma: bitis');
    expect(src).toContain('sonKullanma: input.donemBitis');
  });

  it('F3 (statik): koordinasyon telafisi restoreLots + ortak cüzdan kilidi kullanır; ham wallet advisory yok', () => {
    const src = readFileSync(join(__dirname, '..', 'coordination', 'coordination.service.ts'), 'utf8');
    expect(src).toContain('restoreLots(');
    expect(src).toContain('lockWalletsOrdered(');
    expect(src).not.toMatch(/hashtext\(\$\{`wallet:/);
  });

  it('F4 (statik): admin mutlak bakiye düzeltmesi ortak cüzdan kilidi + lot (grantLot/consumeLots) kullanır', () => {
    const src = readFileSync(join(__dirname, '..', 'admin', 'admin.service.ts'), 'utf8');
    expect(src).toContain("kaynakKayitTuru: 'ADMIN_BAKIYE_DUZELTME'");
    expect(src).toMatch(/consumeLots\(tx, id, -diff/);
  });

  it('F5 (statik): cüzdan akışlarında User satırı yalnız FOR NO KEY UPDATE ile kilitlenir (FK KEY SHARE ile çakışmaz)', () => {
    const root = join(__dirname, '..');
    const files = ['office/office-wallet.rules.ts', 'office/office-management.service.ts'];
    for (const f of files) {
      const src = readFileSync(join(root, f), 'utf8');
      expect(src).not.toMatch(/FROM "User" WHERE "id" = \$\{[^}]+\} FOR UPDATE/);
      expect(src).toMatch(/FROM "User" WHERE "id" = \$\{[^}]+\} FOR NO KEY UPDATE/);
    }
  });

  it('F5 (statik): Apple grant üyelik satırlarını settlement (cüzdan) öncesinde kilitler', () => {
    const src = readFileSync(join(__dirname, '..', 'payments', 'store', 'apple-store.service.ts'), 'utf8');
    const lockAt = src.indexOf('FROM "KullaniciUyelikPaketi" WHERE "kullaniciId"');
    const settleAt = src.indexOf('this.membership.settlePaidOrder(order.id, db)');
    expect(lockAt).toBeGreaterThan(0);
    expect(lockAt).toBeLessThan(settleAt);
  });

  it('F1/F6 (statik): SQL — köken şüphesi toplam karşılaştırmasından ÖNCE; plan yalnız bu çalıştırmanın cüzdanları; rollback bayrağı kapatır', () => {
    const sql = readFileSync(join(__dirname, '..', '..', 'scripts', 'eph70_lot_uzlastirma.sql'), 'utf8');
    expect(sql.indexOf("THEN 'INCELEME'")).toBeLessThan(sql.indexOf("THEN 'ESIT'"));
    expect(sql).toContain('c."islendi" = now()');
    // ODM-7F-D/D10: geri alma now() hassasiyetine/TimeZone'a bağlı değil; lotta SAKLANAN ham değer (RETURNING) defterde tutulur ve onunla karşılaştırılır.
    expect(sql).toContain('"lotGuncellenme" timestamp(3)');
    expect(sql).toContain('RETURNING l.id, l."guncellenmeTarihi" AS ts');
    expect(sql).toContain('"lotGuncellenme" = u.ts');
    expect(sql).toContain('l."guncellenmeTarihi" = COALESCE(d."lotGuncellenme", d."uygulananAt"::timestamp(3))');
    expect(sql).not.toContain('"guncellenmeTarihi" = d."uygulananAt"');
    expect(sql).toMatch(/SET "valueJson" = 'false'::jsonb[^\n]*EPH70_LOT_UZLASTIRMA_TAMAM/);
  });
});
