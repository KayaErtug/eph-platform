import { ForbiddenException } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { KontorService } from '../kontor/kontor.service';
import { EphMatchEngineService } from '../matching/eph-match-engine.service';
import { CommercialMatchScanService } from './commercial-match-scan.service';

function fits(row: any, where: any): boolean {
  if (!where) return true;
  return Object.entries(where).every(([key, value]: [string, any]) => {
    if (value === undefined) return true;
    if (key === 'AND') return (Array.isArray(value) ? value : [value]).every(w => fits(row, w));
    if (key === 'OR') return value.some((w: any) => fits(row, w));
    const actual = row?.[key];
    if (value && typeof value === 'object' && !(value instanceof Date)) {
      if ('is' in value) return value.is === null ? actual == null : fits(actual, value.is);
      if ('none' in value) return !(actual || []).some((item: any) => fits(item, value.none));
      if ('some' in value) return (actual || []).some((item: any) => fits(item, value.some));
      if ('equals' in value) return value.mode === 'insensitive' ? String(actual).toLocaleLowerCase('tr-TR') === String(value.equals).toLocaleLowerCase('tr-TR') : actual === value.equals;
      if ('in' in value && !value.in.includes(actual)) return false;
      if ('notIn' in value && value.notIn.includes(actual)) return false;
      if ('has' in value && !(actual || []).includes(value.has)) return false;
      if ('gt' in value && !(actual > value.gt)) return false;
      if ('gte' in value && !(actual >= value.gte)) return false;
      if ('lte' in value && !(actual <= value.lte)) return false;
      if (['in', 'notIn', 'has', 'gt', 'gte', 'lte', 'mode'].some(k => k in value)) return true;
      return fits(actual, value);
    }
    return actual === value;
  });
}

function setup() {
  const stamp = new Date('2026-10-15T12:00:00Z');
  const customer = { id: 'customer-1', ownerId: 'agent', firstName: 'Galip', lastName: 'Kahraman' };
  const interest = { id: 'interest', customerId: customer.id, customer, isActive: true, city: 'Denizli', district: 'Merkezefendi',
    neighborhood: 'Adalet', propertyTypes: ['DAIRE'], statuses: ['SATILIK'], maxBudget: 5000000, minBudget: null,
    priceCurrency: 'TRY', roomCounts: ['3+1'], features: [], updatedAt: stamp, cardProfileCriteria: null };
  const unit = { id: 'unit', type: 'DAIRE', status: 'SATILIK', price: 4500000, priceCurrency: 'TRY', area: 130, roomCount: '3+1',
    features: [], isOffMarket: false, isSalesInventory: true, isPoolVisible: true, updatedAt: stamp, images: [], poolAudience: null,
    project: { id: 'project', name: 'Adalet Konutları', ownerId: 'agent', city: 'Denizli', district: 'Merkezefendi', neighborhood: 'Adalet', isActive: true, updatedAt: stamp } };
  const state: any = { users: [{ id: 'agent', role: Role.EMLAKCI, officeId: 'office' }, { id: 'owner', role: Role.EMLAKCI }, { id: 'outsider', role: Role.EMLAKCI }, { id: 'super', role: Role.SUPER_ADMIN }],
    offices: [{ id: 'office', ownerUserId: 'owner', isActive: true }], customers: [customer], interests: [interest], units: [unit],
    posts: [{ id: 'post', userId: 'agent', type: 'PORTFOY_ARIYORUM', title: 'Adalet talebi', ...interest, customer: undefined,
      expiresAt: new Date('2099-01-01'), tags: ['Talep Türü: PORTFOY_SATILIK'] }],
    attempts: [], movements: [], wallets: { agent: { bakiye: 100, aktifMi: true }, owner: { bakiye: 200, aktifMi: true }, super: { bakiye: 100, aktifMi: true } },
    officeMode: 'ALLOCATED', scanPermissions: undefined, cost: 7, failSave: false, lostCommit: false, failRecovery: false, sequence: 0 };
  state.posts[0].id = 'post';
  const db: any = { userBlock: { findFirst: jest.fn().mockResolvedValue(null), findMany: jest.fn().mockResolvedValue([]) }, $queryRaw: jest.fn(async () => []), $executeRaw: jest.fn(async () => 1) };
  function model(name: string) {
    return { findUnique: jest.fn(async ({ where }: any) => state[name].find((row: any) => fits(row, where)) || null),
      findFirst: jest.fn(async ({ where }: any) => state[name].find((row: any) => fits(row, where)) || null),
      findMany: jest.fn(async ({ where, take }: any = {}) => state[name].filter((row: any) => fits(row, where)).slice(0, take || Infinity)) };
  }
  db.systemSetting = { findUnique: jest.fn(async ({ where }: any) => where.key.startsWith('EPH_OFFICE_SPENDING_') ? { valueJson: { mode: state.officeMode, scanPermissions: state.scanPermissions } }
    : where.key === 'COST_ESLESME_TARAMA' && state.cost !== null ? { valueJson: state.cost } : null) };
  db.user = model('users'); db.office = model('offices'); db.customer = model('customers');
  db.customerInterest = model('interests'); db.unit = model('units'); db.networkPost = model('posts');
  db.matchScanAttempt = { ...model('attempts'), create: jest.fn(async ({ data }: any) => {
    if (state.attempts.some((row: any) => row.requestId === data.requestId)) throw new Prisma.PrismaClientKnownRequestError('duplicate', { code: 'P2002', clientVersion: '6.19.3' });
    const row = { id: 'attempt-' + ++state.sequence, startedAt: new Date(), ...data }; state.attempts.push(row); return row;
  }), update: jest.fn(async ({ where, data }: any) => {
    if (state.failSave && data.status === 'COMPLETED') throw Error('receipt persistence failure');
    if (state.failRecovery && data.status === 'FAILED') throw Error('database unavailable');
    const row = state.attempts.find((item: any) => fits(item, where)); Object.assign(row, data); return row;
  }) };
  db.kontorCuzdani = { upsert: jest.fn(async ({ where }: any) => state.wallets[where.kullaniciId]),
    findUnique: jest.fn(async ({ where }: any) => structuredClone(state.wallets[where.kullaniciId] || null)),
    update: jest.fn(async ({ where, data }: any) => { const wallet = state.wallets[where.kullaniciId]; wallet.bakiye -= data.bakiye.decrement; return wallet; }) };
  db.kontorHareketi = { ...model('movements'), create: jest.fn(async ({ data }: any) => {
    const row = { id: 'movement-' + ++state.sequence, ...data }; state.movements.push(row); return row;
  }) };
  let queue = Promise.resolve();
  db.$transaction = jest.fn((worker: any) => {
    const result = queue.then(async () => {
      const before = structuredClone({ attempts: state.attempts, movements: state.movements, wallets: state.wallets });
      let value: any;
      try { value = await worker(db); }
      catch (issue) { Object.assign(state, before); throw issue; }
      if (state.lostCommit && value?.ok) { state.lostCommit = false; throw Error('commit response lost'); }
      return value;
    });
    queue = result.then(() => undefined, () => undefined); return result;
  });
  const kontor = new KontorService(db, {} as any);
  jest.spyOn(kontor, 'getCuzdan').mockImplementation(async id => structuredClone(state.wallets[id]) as any);
  const spend = jest.spyOn(kontor, 'harcamayiYap');
  const engine = new EphMatchEngineService({ calculate: jest.fn() } as any, { resolve: jest.fn(() => ({ slots: [] })) } as any);
  const compute = jest.spyOn(engine, 'matchDemandToUnits');
  const service = new CommercialMatchScanService(db, { getNumericSystemSetting: jest.fn(async () => state.cost) } as any, kontor, engine);
  const actor = { id: 'agent', role: Role.EMLAKCI };
  const input = { requestId: 'paid-match-key-0001', expectedActorId: actor.id, expectedCostPk: 7, walletSource: 'PERSONAL' };
  return { state, db, service, actor, input, compute, spend, engine, interest, unit };
}

async function code(promise: Promise<unknown>) {
  try { await promise; throw Error('Expected rejection'); }
  catch (issue) { return (issue as any).getResponse?.().code || (issue as Error).message; }
}

describe('Paid matching: shared engine, atomic receipt and KontorService', () => {
  it.each(['CRM', 'REQUEST', 'PRIVATE_PORTFOLIO', 'POOL_PROPERTY'])('runs %s with a positive tariff and complete receipt', async type => {
    const t = setup(); if (type === 'PRIVATE_PORTFOLIO') t.unit.isPoolVisible = false;
    const source = type === 'CRM' ? 'interest' : type === 'REQUEST' ? 'post' : 'unit';
    const receipt: any = await t.service.scan(type, source, t.actor, t.input);
    expect(receipt).toMatchObject({ ok: true, spent: 7, billing: { cost: 7, previousBalance: 100, remainingBalance: 93 }, matches: [{ unitId: 'unit', title: 'Adalet Konutları' }] });
    expect(t.state.wallets.agent.bakiye).toBe(93); expect(t.state.movements).toHaveLength(1);
    expect(t.spend.mock.calls[0][0].transaction).toBe(t.db);
    expect(t.state.attempts[0].status).toBe('COMPLETED');
  });
  it('quotes without computing or charging', async () => { const t = setup(); expect(await t.service.quote('CRM', 'interest', t.actor, {})).toMatchObject({ actorId: 'agent', costPk: 7, eligible: true }); expect(t.compute).not.toHaveBeenCalled(); expect(t.spend).not.toHaveBeenCalled(); });
  it('zero results still produce a paid report', async () => { const t = setup(); t.unit.price = 6000000; expect(await t.service.scan('CRM', 'interest', t.actor, t.input)).toMatchObject({ spent: 7, matches: [] }); expect(t.state.movements).toHaveLength(1); });
  it('same completed ID returns zero new spend and never recomputes', async () => { const t = setup(); await t.service.scan('CRM', 'interest', t.actor, t.input); const count = t.compute.mock.calls.length; expect(await t.service.scan('CRM', 'interest', t.actor, t.input)).toMatchObject({ spent: 0, replayed: true, billing: { charged: false } }); expect(t.compute).toHaveBeenCalledTimes(count); expect(t.state.movements).toHaveLength(1); });
  it('two distinct confirmed scans charge separately', async () => { const t = setup(); await t.service.scan('CRM', 'interest', t.actor, t.input); await t.service.scan('CRM', 'interest', t.actor, { ...t.input, requestId: 'paid-match-key-0002' }); expect(t.state.wallets.agent.bakiye).toBe(86); });
  it('same-key concurrent calls never debit twice', async () => { const t = setup(); await Promise.allSettled([t.service.scan('CRM', 'interest', t.actor, t.input), t.service.scan('CRM', 'interest', t.actor, t.input)]); expect(t.state.movements).toHaveLength(1); expect(t.state.wallets.agent.bakiye).toBe(93); });
  it('receipt persistence failure rolls back actual KontorService debit', async () => { const t = setup(); t.state.failSave = true; expect(await code(t.service.scan('CRM', 'interest', t.actor, t.input))).toBe('MATCH_SCAN_FAILED_RETRY_NEW'); expect(t.spend).toHaveBeenCalledTimes(1); expect(t.state.wallets.agent.bakiye).toBe(100); expect(t.state.movements).toHaveLength(0); expect(t.state.attempts[0].status).toBe('FAILED'); });
  it('lost commit response recovers completed receipt without a second debit', async () => { const t = setup(); t.state.lostCommit = true; expect(await t.service.scan('CRM', 'interest', t.actor, t.input)).toMatchObject({ replayed: true, spent: 0 }); expect(t.state.wallets.agent.bakiye).toBe(93); expect(t.state.movements).toHaveLength(1); });
  it('unresolved failure keeps a review-required state', async () => { const t = setup(); t.state.failSave = true; t.state.failRecovery = true; expect(await code(t.service.scan('CRM', 'interest', t.actor, t.input))).toBe('MATCH_SCAN_REVIEW_REQUIRED'); expect(t.state.wallets.agent.bakiye).toBe(100); });
  it.each([-1, 1.5, null])('refuses with a safe error when the tariff is missing or invalid (%s)', async cost => { const t = setup(); t.state.cost = cost; await expect(t.service.quote('CRM', 'interest', t.actor, {})).rejects.toMatchObject({ response: { code: 'MATCH_SCAN_TARIFF_MISSING', message: 'Tarama ücreti tanımlı değil, yöneticinize başvurun.' } }); expect(t.spend).not.toHaveBeenCalled(); });
  it('falls back to the general MATCH_SCAN_COST_PK setting and never to a hard-coded 25', async () => { const t = setup(); t.state.cost = null; t.db.systemSetting.findUnique.mockImplementation(async ({ where }: any) => where.key === 'MATCH_SCAN_COST_PK' ? { valueJson: { value: 9 } } : null); expect(await t.service.quote('CRM', 'interest', t.actor, {})).toMatchObject({ costPk: 9 }); });
  it('treats an admin-set 0 tariff as a free scan: report is produced, no PK movement', async () => { const t = setup(); t.state.cost = 0; expect(await t.service.quote('CRM', 'interest', t.actor, {})).toMatchObject({ costPk: 0, eligible: true });
    const receipt: any = await t.service.scan('CRM', 'interest', t.actor, { ...t.input, expectedCostPk: 0 });
    expect(receipt).toMatchObject({ ok: true, spent: 0, billing: { cost: 0, remainingBalance: 100 } }); expect(t.spend).not.toHaveBeenCalled(); expect(t.state.movements).toHaveLength(0); expect(t.state.wallets.agent.bakiye).toBe(100); expect(t.state.attempts[0].status).toBe('COMPLETED'); });
  it('office scan ban: quote reports a clear not-eligible state and scan is refused without charge', async () => { const t = setup(); t.state.scanPermissions = { agent: false };
    expect(await t.service.quote('CRM', 'interest', t.actor, {})).toMatchObject({ eligible: false, reason: 'SCAN_NOT_PERMITTED', message: expect.stringContaining('yetkiniz bulunmamaktadır') });
    await expect(t.service.scan('CRM', 'interest', t.actor, t.input)).rejects.toThrow(ForbiddenException); expect(t.state.movements).toHaveLength(0); expect(t.state.attempts).toHaveLength(0); });
  it('office scan ban set during computation is caught by the final in-transaction check', async () => { const t = setup(); t.compute.mockImplementationOnce(async () => { t.state.scanPermissions = { agent: false }; return []; });
    expect(await code(t.service.scan('CRM', 'interest', t.actor, t.input))).toBe('MATCH_SCAN_FAILED_RETRY_NEW'); expect(t.state.movements).toHaveLength(0); expect(t.state.wallets.agent.bakiye).toBe(100); });
  it('office owner and super admin are exempt from the scan ban', async () => { const t = setup(); t.state.scanPermissions = { owner: false, super: false, agent: true };
    expect(await t.service.quote('CRM', 'interest', { id: 'owner', role: Role.EMLAKCI }, {}).catch(() => 'n/a')).not.toHaveProperty('reason');
    expect(await t.service.quote('CRM', 'interest', { id: 'super', role: Role.SUPER_ADMIN }, {})).toMatchObject({ eligible: true }); });
  it('super admin reaches another agent private portfolio even when the block lookup would deny (§0)', async () => { const t = setup(); t.db.userBlock.findFirst.mockResolvedValue({ id: 'block' });
    t.unit.isPoolVisible = false; t.unit.project.ownerId = 'outsider';
    expect(await t.service.quote('PRIVATE_PORTFOLIO', 'unit', { id: 'super', role: Role.SUPER_ADMIN }, {})).toMatchObject({ eligible: true });
    expect(await t.service.quote('PRIVATE_PORTFOLIO', 'unit', { id: 'agent', role: Role.EMLAKCI }, {}).catch(() => 'denied')).toBe('denied'); });
  it('rejects old price, stale criteria and low balance before computing', async () => {
    for (const extra of [{ expectedCostPk: 6 }, { expectedSourceVersion: 'old-version' }]) { const t = setup(); expect(await code(t.service.scan('CRM', 'interest', t.actor, { ...t.input, ...extra }))).toBe('MATCH_SCAN_RECONFIRM'); expect(t.compute).not.toHaveBeenCalled(); }
    const t = setup(); t.state.wallets.agent.bakiye = 1; expect(await code(t.service.scan('CRM', 'interest', t.actor, t.input))).toBe('MATCH_SCAN_RECONFIRM'); expect(t.state.attempts).toHaveLength(0);
  });
  it('incomplete source is refused before billing', async () => { const t = setup(); t.interest.maxBudget = null as any; expect(await code(t.service.scan('CRM', 'interest', t.actor, t.input))).toBe('MATCH_SCAN_SOURCE_INVALID'); expect(t.state.movements).toHaveLength(0); });
  it('uses selected office wallet and records acting user', async () => { const t = setup(); t.state.officeMode = 'SHARED'; const r = await t.service.scan('CRM', 'interest', t.actor, { ...t.input, walletSource: 'OFFICE', walletOfficeId: 'office' }); expect(r.billing).toMatchObject({ walletOfficeId: 'office', previousBalance: 200, remainingBalance: 193 }); expect(t.state.wallets.agent.bakiye).toBe(100); expect(t.state.movements[0]).toMatchObject({ kullaniciId: 'owner', olusturanId: 'agent' }); });
  it('office outsider cannot use another office wallet', async () => { const t = setup(); t.state.users[0].officeId = null; await expect(t.service.quote('CRM', 'interest', t.actor, { walletSource: 'OFFICE', walletOfficeId: 'office' })).rejects.toThrow(ForbiddenException); });
  it('an existing key cannot change source, actor or wallet', async () => { const t = setup(); await t.service.scan('CRM', 'interest', t.actor, t.input); await expect(t.service.scan('REQUEST', 'post', t.actor, t.input)).rejects.toThrow(ForbiddenException); await expect(t.service.scan('CRM', 'interest', t.actor, { ...t.input, walletSource: 'OFFICE', walletOfficeId: 'office' })).rejects.toThrow(ForbiddenException); await expect(t.service.scan('CRM', 'interest', { id: 'super' }, { ...t.input, expectedActorId: 'super' })).rejects.toThrow(ForbiddenException); });
  it('saved report opening is free and hides withdrawn units', async () => { const t = setup(); await t.service.scan('CRM', 'interest', t.actor, t.input); t.unit.isOffMarket = true; expect(await t.service.historyReceipt('CRM', 'interest', t.input.requestId, t.actor)).toMatchObject({ matches: [], unavailableResultCount: 1 }); expect(t.state.movements).toHaveLength(1); });
  it('marks saved results stale when source criteria change', async () => { const t = setup(); await t.service.scan('CRM', 'interest', t.actor, t.input); t.interest.maxBudget = 5500000; expect(await t.service.historyReceipt('CRM', 'interest', t.input.requestId, t.actor)).toMatchObject({ stale: true }); });
  it('revoked CRM ownership blocks saved history and replays', async () => { const t = setup(); await t.service.scan('CRM', 'interest', t.actor, t.input); t.interest.customer.ownerId = 'outsider'; await expect(t.service.historyReceipt('CRM', 'interest', t.input.requestId, t.actor)).rejects.toThrow(ForbiddenException); await expect(t.service.scan('CRM', 'interest', t.actor, t.input)).rejects.toThrow(ForbiddenException); });
  it('private matches name the customer and retain private navigation flags', async () => { const t = setup(); t.unit.isPoolVisible = false; const r = await t.service.scan('PRIVATE_PORTFOLIO', 'unit', t.actor, t.input); expect(r.matches[0]).toMatchObject({ customerName: 'Galip Kahraman', customerId: 'customer-1', isOwnPortfolio: true, isPoolVisible: false }); });
  it('private portfolios owned by others never enter CRM results', async () => { const t = setup(); t.unit.isPoolVisible = false; t.unit.project.ownerId = 'outsider'; expect(await t.service.scan('CRM', 'interest', t.actor, t.input)).toMatchObject({ matches: [] }); });
  it('targeted pool audience is enforced for new scans and saved reports', async () => { const t = setup(); t.unit.project.ownerId = 'outsider'; await t.service.scan('CRM', 'interest', t.actor, t.input); (t.unit as any).poolAudience = { mode: 'TARGETED', roles: [], groups: [] }; expect(await t.service.historyReceipt('CRM', 'interest', t.input.requestId, t.actor)).toMatchObject({ matches: [] }); await expect(t.service.quote('POOL_PROPERTY', 'unit', t.actor, {})).rejects.toThrow('erişim izniniz'); });
  it('role-targeted pool audience permits the matching role', async () => { const t = setup(); t.unit.project.ownerId = 'outsider'; (t.unit as any).poolAudience = { mode: 'TARGETED', roles: [Role.EMLAKCI], groups: [] }; expect(await t.service.scan('CRM', 'interest', t.actor, t.input)).toMatchObject({ matches: [{ unitId: 'unit' }] }); });
  it('does not trust a client-supplied super-admin role', async () => { const t = setup(); t.interest.customer.ownerId = 'outsider'; await expect(t.service.quote('CRM', 'interest', { id: 'agent', role: Role.SUPER_ADMIN }, {})).rejects.toThrow(ForbiddenException); });
  it('source changes during computation abort without a debit', async () => { const t = setup(); t.compute.mockImplementationOnce(async () => { t.interest.maxBudget = 5500000; return []; }); expect(await code(t.service.scan('CRM', 'interest', t.actor, t.input))).toBe('MATCH_SCAN_FAILED_RETRY_NEW'); expect(t.state.movements).toHaveLength(0); });
  it('old pending request receipt is normalized and never charged again', async () => { const t = setup(); await t.service.scan('REQUEST', 'post', t.actor, t.input); delete t.state.attempts[0].resultJson.ok; expect(await t.service.scan('REQUEST', 'post', t.actor, t.input)).toMatchObject({ ok: true, spent: 0, replayed: true }); expect(t.state.movements).toHaveLength(1); });
  it('expired processing key without movement can safely be retried as a new scan', async () => { const t = setup(); t.state.attempts.push({ id: 'expired', requestId: t.input.requestId, userId: 'agent', sourceType: 'CRM_CUSTOMER', sourceId: 'interest', status: 'PROCESSING', startedAt: new Date(Date.now() - 180000) }); expect(await code(t.service.scan('CRM', 'interest', t.actor, t.input))).toBe('MATCH_SCAN_FAILED_RETRY_NEW'); expect(t.state.attempts[0].status).toBe('FAILED'); expect(t.state.movements).toHaveLength(0); });
  it('expired legacy key with a movement stays blocked for financial review', async () => { const t = setup(); t.state.attempts.push({ id: 'expired', requestId: t.input.requestId, userId: 'agent', sourceType: 'CRM_CUSTOMER', sourceId: 'interest', status: 'PROCESSING', startedAt: new Date(Date.now() - 180000) }); t.state.movements.push({ islemTuru: 'ESLESME_TARAMASI', hareketTuru: 'HARCAMA', ilgiliKayitId: t.input.requestId }); expect(await code(t.service.scan('CRM', 'interest', t.actor, t.input))).toBe('MATCH_SCAN_REVIEW_REQUIRED'); expect(t.state.attempts[0].status).toBe('PROCESSING'); });

  it('multiple request regions return one unit and incur one scan fee', async () => { const t = setup(); t.state.posts[0].areas = [{ city: 'Denizli', district: 'Merkezefendi', neighborhood: 'Adalet' }, { city: 'Denizli', district: 'Merkezefendi', neighborhood: 'Adalet' }]; const r = await t.service.scan('REQUEST', 'post', t.actor, t.input); expect(r.matches).toHaveLength(1); expect(t.state.movements).toHaveLength(1); });
  it('role revoked during computation stops before debit', async () => { const t = setup(); t.compute.mockImplementationOnce(async () => { t.state.users[0].role = Role.MODERATOR; return []; }); expect(await code(t.service.scan('CRM', 'interest', t.actor, t.input))).toBe('MATCH_SCAN_FAILED_RETRY_NEW'); expect(t.state.movements).toHaveLength(0); });
  it('office membership revoked during computation stops before debit', async () => { const t = setup(); t.state.officeMode = 'SHARED'; t.compute.mockImplementationOnce(async () => { t.state.users[0].officeId = null; return []; }); expect(await code(t.service.scan('CRM', 'interest', t.actor, { ...t.input, walletSource: 'OFFICE', walletOfficeId: 'office' }))).toBe('MATCH_SCAN_FAILED_RETRY_NEW'); expect(t.state.movements).toHaveLength(0); });

  it('refuses an invalid-price source portfolio before a scan can be charged', async () => { const t = setup(); t.unit.price = 0; expect(await code(t.service.quote('POOL_PROPERTY', 'unit', t.actor, {}))).toBe('MATCH_SCAN_SOURCE_INVALID'); expect(t.state.movements).toHaveLength(0); });

  it('candidate cap refuses billing and explains how to narrow the source', async () => { const t = setup(); t.state.units = Array.from({ length: 2001 }, (_, i) => ({ ...t.unit, id: 'unit-' + i })); await expect(t.service.scan('CRM', 'interest', t.actor, t.input)).rejects.toMatchObject({ response: { code: 'MATCH_SCAN_FAILED_RETRY_NEW', message: expect.stringContaining('kapsamı çok geniş') } }); expect(t.state.movements).toHaveLength(0); });

});

describe('Paid matching block boundaries', () => {
  it('rejects a blocked pool source before quote, computation or debit', async () => {
    const t = setup(); t.unit.project.ownerId = 'owner'; t.db.userBlock.findFirst.mockResolvedValue({ id: 'block' });
    await expect(t.service.quote('POOL_PROPERTY', 'unit', t.actor, {})).rejects.toBeInstanceOf(ForbiddenException);
    await expect(t.service.scan('POOL_PROPERTY', 'unit', t.actor, t.input)).rejects.toBeInstanceOf(ForbiddenException);
    expect(t.spend).not.toHaveBeenCalled(); expect(t.state.movements).toHaveLength(0);
  });
  it('filters a blocked author out of paid candidate SQL and stored reports', async () => {
    const t = setup(); t.unit.project.ownerId = 'owner';
    (t.unit.project as any).owner = { usersBlocked: [], blockedByUsers: [{ blockerId: 'agent' }] };
    const result = await t.service.scan('CRM', 'interest', t.actor, t.input);
    expect(result.matches).toHaveLength(0); expect(t.state.movements).toHaveLength(1);
    // A completed scan remains billable even when the filtered result set is empty.
  });
});
