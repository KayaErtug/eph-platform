import * as assert from 'node:assert/strict';
import { PrismaService } from '../prisma/prisma.service';
import { PoolPublicationService, type PoolPublicationInput, type PublicationUnit } from './pool-publication.service';

const actor = { id: 'actor-1', role: 'EMLAKCI' };
const input = (requestId = 'publish-request-1'): PoolPublicationInput => ({ requestId, expectedActorId: actor.id, expectedCostPk: 25, walletSource: 'PERSONAL' });
const makeUnit = (id = 'unit-1') => ({ id, isPoolVisible: false, approvalStatus: 'TASLAK', status: 'SATILIK', isOffMarket: false, poolRemovedAt: null as Date | null, project: { ownerId: actor.id, isActive: true, owner: { role: 'EMLAKCI' } } });
type Unit = ReturnType<typeof makeUnit>;
type Wallet = { bakiye: number; aktifMi: boolean; toplamHarcama: number };
type Log = { actorId?: string; action: string; entityId?: string; metadata: { requestId?: string; fingerprint?: string; billing?: Record<string, unknown> } };

function harness() {
  let state = { units: { 'unit-1': makeUnit(), 'unit-2': makeUnit('unit-2') } as Record<string, Unit>, wallets: { 'actor-1': { bakiye: 200, aktifMi: true, toplamHarcama: 0 }, 'office-owner': { bakiye: 100, aktifMi: true, toplamHarcama: 0 } } as Record<string, Wallet>, movements: [] as Record<string, unknown>[], logs: [] as Log[], audiences: [] as Record<string, unknown>[] };
  let failure = '';
  let officeMember = true;
  let officeActive = true;
  let officeMode = 'ALLOCATED';
  const calls: string[] = [];
  let queue = Promise.resolve();
  const db = {
    $executeRaw: async (_sql: TemplateStringsArray, key: string) => { calls.push(key); return 1; },
    kullaniciUyelikPaketi: { findFirst: async () => null },
    $queryRaw: async () => [],
    unit: {
      findUnique: async ({ where }: { where: { id: string } }) => structuredClone(state.units[where.id] || null),
      update: async ({ where, data }: { where: { id: string }; data: Partial<Unit> }) => {
        if (failure === 'unit') throw new Error('unit write failed');
        state.units[where.id] = { ...state.units[where.id], ...data };
        return structuredClone(state.units[where.id]);
      },
    },
    portfolioCreditLot: { findMany: async () => [], update: async () => ({}), create: async () => ({ id: 'lot' }) }, portfolioCreditLotTuketim: { create: async () => ({}), findMany: async () => [], update: async () => ({}) }, kontorCuzdani: {
      findUnique: async ({ where }: { where: { kullaniciId: string } }) => structuredClone(state.wallets[where.kullaniciId] || null),
      updateMany: async ({ where, data }: { where: { kullaniciId: string; bakiye: { gte: number } }; data: { bakiye: { decrement: number }; toplamHarcama: { increment: number } } }) => {
        const wallet = state.wallets[where.kullaniciId];
        if (!wallet?.aktifMi || wallet.bakiye < where.bakiye.gte) return { count: 0 };
        wallet.bakiye -= data.bakiye.decrement;
        wallet.toplamHarcama += data.toplamHarcama.increment;
        return { count: 1 };
      },
    },
    kontorHareketi: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        if (failure === 'movement') throw new Error('movement write failed');
        const movement = { id: 'movement-' + (state.movements.length + 1), ...data };
        state.movements.push(movement);
        return movement;
      },
    },
    adminActionLog: {
      findFirst: async ({ where }: { where: { actorId: string; action: string; metadata: { equals: string } } }) => structuredClone(state.logs.find(log => log.actorId === where.actorId && log.action === where.action && log.metadata.requestId === where.metadata.equals) || null),
      create: async ({ data }: { data: Log }) => {
        if (failure === 'receipt' || (failure === 'audit' && data.action !== 'PORTFOLIO_POOL_PUBLICATION_RECEIPT')) throw new Error('audit write failed');
        state.logs.push(structuredClone(data));
        return data;
      },
    },
    office: { findMany: async () => officeActive && officeMember ? [{ id: 'office-1' }] : [], findFirst: async () => null, findUnique: async () => ({ id: 'office-1', ownerUserId: 'office-owner', isActive: officeActive }) },
    user: { findUnique: async () => ({ id: actor.id, role: 'EMLAKCI', officeId: officeMember ? 'office-1' : null }), findFirst: async () => officeMember ? { id: actor.id } : null },
    systemSetting: { findUnique: async ({ where }: any) => where.key.startsWith('EPH_OFFICE_SPENDING_') ? { valueJson: { mode: officeMode } } : null },
    poolAudienceGroup: { findMany: async () => [] },
    poolAudienceUnit: { upsert: async ({ create }: { create: Record<string, unknown> }) => { if (failure === 'audience') throw new Error('audience write failed'); state.audiences.push(create); return create; } },
    poolAudienceUnitGroup: { deleteMany: async () => ({ count: 0 }), createMany: async () => ({ count: 1 }) },
    $transaction: async <T>(operation: (tx: unknown) => Promise<T>) => {
      const run = queue.then(async () => {
        const before = structuredClone(state);
        try { return await operation(db); } catch (error) { state = before; throw error; }
      });
      queue = run.then(() => {}, () => {});
      return run;
    },
  };
  const service = new PoolPublicationService(db as unknown as PrismaService);
  const publish = (body: PoolPublicationInput | undefined = input(), id = 'unit-1') => service.publish(state.units[id] as unknown as PublicationUnit, actor, body, {}, async current => {
    if (current.project.ownerId !== actor.id || !current.project.isActive || current.status !== 'SATILIK') throw new Error('publication forbidden');
  });
  return { service, publish, calls, get state() { return state; }, fail: (value: string) => { failure = value; }, mode: (value: string) => { officeMode = value; }, member: (value: boolean) => { officeMember = value; }, activeOffice: (value: boolean) => { officeActive = value; } };
}

describe('Pool publication: quote, atomic charge and durable replay', () => {
  it('quote is read only and costs 25 PK', async () => {
    const h = harness();
    const quote = await h.service.quote(h.state.units['unit-1'] as unknown as PublicationUnit, actor.id, { walletSource: 'PERSONAL' });
    assert.equal(quote.costPk, 25); assert.equal(quote.eligible, true);
    assert.equal(h.state.wallets[actor.id].bakiye, 200); assert.equal(h.state.logs.length, 0); assert.equal(h.calls.length, 0);
  });
  it('publishes, charges once and returns a verifiable receipt', async () => {
    const h = harness(); const result = await h.publish();
    assert.equal(result.isPoolVisible, true); assert.equal(result.billing.spent, 25); assert.equal(result.billing.remainingBalance, 175);
    assert.ok('operationId' in result.billing); assert.ok('requestId' in result.billing);
    assert.equal(result.billing.operationId, 'movement-1'); assert.equal(result.billing.requestId, input().requestId);
    assert.equal(h.state.movements.length, 1); assert.equal(h.state.logs.length, 2);
    assert.deepEqual(h.calls.slice(0, 2), ['pool-publish-request:actor-1:publish-request-1', 'pool-publish-unit:unit-1']); assert.ok(h.calls.includes('wallet:actor-1')); 
  });
  it('replays the same request with zero new PK and no writes', async () => {
    const h = harness(); await h.publish(); const result = await h.publish();
    assert.equal(result.billing.spent, 0); assert.equal(result.billing.replayed, true);
    assert.equal(h.state.movements.length, 1); assert.equal(h.state.wallets[actor.id].bakiye, 175); assert.equal(h.state.logs.length, 2);
  });
  it('a new key for an already published unit does not charge', async () => {
    const h = harness(); await h.publish(); const result = await h.publish(input('new-publish-key'));
    assert.equal(result.billing.spent, 0); assert.equal(h.state.movements.length, 1);
  });
  it('two simultaneous requests for one unit charge only once', async () => {
    const h = harness(); const results = await Promise.all([h.publish(), h.publish(input('concurrent-key-2'))]);
    assert.equal(results.reduce((total, result) => total + Number(result.billing.spent), 0), 25); assert.equal(h.state.movements.length, 1);
  });
  it('replay after withdrawal cannot publish or charge again', async () => {
    const h = harness(); await h.publish(); h.state.units['unit-1'].isPoolVisible = false; h.state.units['unit-1'].approvalStatus = 'TASLAK';
    const result = await h.publish(); assert.equal(result.isPoolVisible, false); assert.equal(result.billing.spent, 0); assert.equal(h.state.movements.length, 1);
  });
  it('a new confirmed publication after withdrawal is a new charge', async () => {
    const h = harness(); await h.publish(); h.state.units['unit-1'].isPoolVisible = false; h.state.units['unit-1'].approvalStatus = 'TASLAK';
    await h.publish(input('republish-new-key')); assert.equal(h.state.movements.length, 2); assert.equal(h.state.wallets[actor.id].bakiye, 150);
  });
  for (const failure of ['unit', 'movement', 'receipt', 'audit', 'audience']) {
    it('rolls back all state on ' + failure + ' failure', async () => {
      const h = harness(); const before = structuredClone(h.state); h.fail(failure);
      await assert.rejects(h.publish({ ...input(), poolAudience: { mode: 'PUBLIC' } }));
      assert.deepEqual(h.state, before);
    });
  }
  it('insufficient PK causes no charge and no publication', async () => {
    const h = harness(); h.state.wallets[actor.id].bakiye = 20; await assert.rejects(h.publish());
    assert.equal(h.state.wallets[actor.id].bakiye, 20); assert.equal(h.state.units['unit-1'].isPoolVisible, false); assert.equal(h.state.movements.length, 0);
  });
  it('inactive wallet is not charged', async () => {
    const h = harness(); h.state.wallets[actor.id].aktifMi = false; await assert.rejects(h.publish()); assert.equal(h.state.movements.length, 0);
  });
  it('office PK charges the office owner wallet and records the actor', async () => {
    const h = harness(); h.mode('SHARED'); const result = await h.publish({ ...input(), walletSource: 'OFFICE', walletOfficeId: 'office-1' });
    assert.equal(h.state.wallets[actor.id].bakiye, 200); assert.equal(h.state.wallets['office-owner'].bakiye, 75);
    assert.ok('walletOfficeId' in result.billing);
    assert.equal(result.billing.walletOfficeId, 'office-1'); assert.equal(h.state.movements[0].olusturanId, actor.id);
  });
  it('insufficient office PK never falls back to personal PK', async () => {
    const h = harness(); h.state.wallets['office-owner'].bakiye = 0; await assert.rejects(h.publish({ ...input(), walletSource: 'OFFICE', walletOfficeId: 'office-1' }));
    assert.equal(h.state.wallets[actor.id].bakiye, 200); assert.equal(h.state.movements.length, 0);
  });
  it('non members cannot charge an office wallet', async () => {
    const h = harness(); h.member(false); await assert.rejects(h.publish({ ...input(), walletSource: 'OFFICE', walletOfficeId: 'office-1' })); assert.equal(h.state.movements.length, 0);
  });
  it('inactive office is rejected without fallback', async () => {
    const h = harness(); h.activeOffice(false); await assert.rejects(h.publish({ ...input(), walletSource: 'OFFICE', walletOfficeId: 'office-1' })); assert.equal(h.state.wallets[actor.id].bakiye, 200);
  });
  it('an office source without an office is rejected', async () => {
    const h = harness(); await assert.rejects(h.publish({ ...input(), walletSource: 'OFFICE' })); assert.equal(h.state.movements.length, 0);
  });
  it('actor mismatch is rejected before transaction', async () => {
    const h = harness(); await assert.rejects(h.publish({ ...input(), expectedActorId: 'other' })); assert.equal(h.calls.length, 0);
  });
  it('invalid cost and missing modern request key cannot charge', async () => {
    const h = harness(); await assert.rejects(h.publish({ ...input(), expectedCostPk: 49 })); await assert.rejects(h.publish({ walletSource: 'PERSONAL' })); assert.equal(h.state.movements.length, 0);
  });
  it('a quote of zero cannot charge 25 if publication state changed', async () => {
    const h = harness(); await assert.rejects(h.publish({ ...input(), expectedCostPk: 0 })); assert.equal(h.state.movements.length, 0);
  });
  it('reusing a key for a different unit is rejected', async () => {
    const h = harness(); await h.publish(); await assert.rejects(h.publish(input(), 'unit-2')); assert.equal(h.state.movements.length, 1);
  });
  it('changing the selected wallet on a replay is rejected', async () => {
    const h = harness(); await h.publish(); await assert.rejects(h.publish({ ...input(), walletSource: 'OFFICE', walletOfficeId: 'office-1' })); assert.equal(h.state.wallets['office-owner'].bakiye, 100);
  });
  it('legacy callers are protected by a deterministic publication cycle key', async () => {
    const h = harness(); await h.publish({}); await h.publish({}); assert.equal(h.state.movements.length, 1);
  });
  it('ownership validation failure cannot charge', async () => {
    const h = harness(); h.state.units['unit-1'].project.ownerId = 'other'; await assert.rejects(h.publish()); assert.equal(h.state.movements.length, 0);
  });
  it('inactive project cannot charge', async () => {
    const h = harness(); h.state.units['unit-1'].project.isActive = false; await assert.rejects(h.publish()); assert.equal(h.state.movements.length, 0);
  });
  it('invalid audience groups cannot charge', async () => {
    const h = harness(); await assert.rejects(h.publish({ ...input(), poolAudience: { mode: 'TARGETED', groupIds: ['not-owned'] } })); assert.equal(h.state.movements.length, 0);
  });
  it('targeted audience settings are committed with publication', async () => {
    const h = harness(); await h.publish({ ...input(), poolAudience: { mode: 'TARGETED', roles: ['EMLAKCI'] } });
    assert.equal(h.state.audiences[0].mode, 'TARGETED'); assert.equal((h.state.audiences[0].roles as string[]).join(','), 'EMLAKCI');
  });
  it('already published quote is zero even if the wallet is empty', async () => {
    const h = harness(); h.state.units['unit-1'].isPoolVisible = true; h.state.units['unit-1'].approvalStatus = 'HAVUZDA'; h.state.wallets[actor.id].bakiye = 0;
    const quote = await h.service.quote(h.state.units['unit-1'] as unknown as PublicationUnit, actor.id); assert.equal(quote.costPk, 0); assert.equal(quote.eligible, true);
  });
});
