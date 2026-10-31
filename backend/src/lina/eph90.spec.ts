import { Prisma } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { CoordinationRecalculationService } from '../coordination/coordination-recalculation.service';
import { CrmService } from '../crm/crm.service';
import { PropertyCriteriaService } from '../property-criteria/property-criteria.service';
import { LinaConfirmationGateService } from './actions/lina-confirmation-gate.service';
import { LinaActionEngineService } from './actions/lina-action-engine.service';
import { LinaDraftFlowService } from './draft/lina-draft-flow.service';
import { bosAlanlar } from './draft/lina-draft.types';
import { LinaChatBudgetService, LINA_BUSY_MESSAGE, assertLinaBudget, linaFetchSignal } from './lina-chat-budget.service';
import { LinaOpenAiLiveGatewayService } from './openai-tools/lina-openai-live-gateway.service';
import { LinaService } from './lina.service';
import { LinaController } from './lina.controller';

function matches(row: any, where: any): boolean {
  return Object.entries(where).every(([key, value]: [string, any]) => {
    if (value === undefined) return true;
    if (value && typeof value === 'object') {
      if ('in' in value) return value.in.includes(row[key]);
      if ('gt' in value) return row[key] > value.gt;
      if ('path' in value) return row[key]?.[value.path[0]] === value.equals;
      if ('equals' in value) return JSON.stringify(row[key]) === JSON.stringify(value.equals);
    }
    return row[key] === value;
  });
}

describe('EPH90 F04/F05 notification delivery and criterion dedupe', () => {
  it.each(['REQUEST', 'CRM'])('%s writes NetworkNotification once; unchanged criteria and concurrent callbacks dedupe', async source => {
    const rows: any[] = [];
    const record: any = { id: 'source', customerId: 'customer', isActive: true,
      city: 'Denizli', maxBudget: 10, features: ['havuz', 'otopark'], customer: { ownerId: 'owner' } };
    const db: any = {
      networkPost: { findUnique: async () => record }, customerInterest: { findUnique: async () => record },
      linaBildirim: { create: jest.fn() },
      networkNotification: {
        create: jest.fn(async ({ data }) => {
          if (rows.some(row => row.eventKey === data.eventKey)) throw new Prisma.PrismaClientKnownRequestError('duplicate', { code: 'P2002', clientVersion: 'test' });
          const row = { id: String(rows.length), ...data }; rows.push(row); return row;
        }),
        findUnique: async ({ where }: any) => rows.find(row => row.eventKey === where.eventKey),
      },
    };
    const notifications = new NotificationsService(db, {} as any);
    const delivery = jest.spyOn(notifications as any, 'deliver').mockResolvedValue(undefined);
    let callback: any;
    const coordination = new CoordinationRecalculationService(db,
      { registerInterestMatchHandler: (fn: any) => { if (source === 'CRM') callback = fn; } } as any,
      { registerRequestMatchHandler: (fn: any) => { if (source === 'REQUEST') callback = fn; } } as any,
      {} as any, notifications);
    coordination.onModuleInit();
    await Promise.all([callback('source', 'owner'), callback('source', 'owner')]);
    record.updatedAt = new Date(); record.notes = 'changed note'; record.features.reverse();
    await callback('source', 'owner');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ type: 'MATCH_SCAN_REMINDER', priority: 'BILGI',
      title: 'Talebiniz için eşleşme taraması yapabilirsiniz', pushStatus: 'PENDING' });
    expect(rows[0].actionUrl).toContain(source === 'REQUEST' ? '/network/source' : 'customerId=customer&interestId=source');
    expect(rows[0].eventKey).toMatch(new RegExp(`^MATCH_SCAN_REMINDER:${source}:source:`));
    expect(delivery).toHaveBeenCalled();
    expect(db.linaBildirim.create).not.toHaveBeenCalled();
    record.maxBudget = 20; await callback('source', 'owner'); expect(rows).toHaveLength(2);
  });
});

describe('EPH90 F07 confirmation single consumption', () => {
  function setup() {
    const rows: any[] = [];
    const db: any = { linaTaslak: {
      findFirst: async ({ where }: any) => structuredClone(rows.find(row => matches(row, where)) || null),
      create: async ({ data }: any) => { rows.push(structuredClone(data)); return data; },
      updateMany: async ({ where, data }: any) => { const selected = rows.filter(row => matches(row, where)); selected.forEach(row => Object.assign(row, structuredClone(data))); return { count: selected.length }; },
    } };
    return new LinaConfirmationGateService(db);
  }
  it('two concurrent confirmations permit exactly one execution', async () => {
    const gate = setup();
    const prepared = await gate.evaluate('müşteriyi güncelle', 'u', 'crm');
    const id = prepared.data!.confirmation!.id;
    const execute = jest.fn();
    await Promise.all([1, 2].map(async () => {
      const result = await gate.evaluate('Onayla', 'u', 'crm', id);
      if (result.executeMessage) execute(result.executeMessage);
    }));
    expect(execute).toHaveBeenCalledTimes(1);
    expect((await gate.evaluate('Onayla', 'u', 'crm', id)).executeMessage).toBeUndefined();
  });
  it('requires the exact plan and module; parallel first approvals cannot skip FINAL', async () => {
    const gate = setup();
    const prepared = await gate.evaluate('müşteriyi sil', 'u', 'crm');
    const id = prepared.data!.confirmation!.id;
    for (const [module, plan] of [['general', id], ['crm', 'wrong'], ['crm', undefined]] as const) {
      expect((await gate.evaluate('Onayla', 'u', module, plan)).executeMessage).toBeUndefined();
    }
    const first = await Promise.all([1, 2].map(() => gate.evaluate('Onayla', 'u', 'crm', id)));
    expect(first.every(result => !result.executeMessage)).toBe(true);
    expect(first.filter(result => result.data?.confirmation?.stage === 'FINAL')).toHaveLength(1);
    expect((await gate.evaluate('Kesin Onayla', 'u', 'crm', id)).executeMessage).toBe('müşteriyi sil');
  });
});

describe('EPH90 F07 CRM transaction and F13 safe errors', () => {
  function setup(existing = false) {
    const fields = { ...bosAlanlar(), adSoyad: 'Test Kisi', rol: 'alıcı', telefon: '5331234567', amac: 'SATILIK',
      il: 'Denizli', ilce: 'Merkezefendi', mulkTipi: 'DAIRE' };
    const draft: any = { id: 'draft', kullaniciId: 'u', tur: 'CRM_MUSTERI', alanlar: fields,
      durum: 'ONAY_BEKLIYOR', gecerlilikTarihi: new Date('2099-01-01') };
    const state: any = { draft, customers: existing ? [{ id: 'existing', ownerId: 'u' }] : [], interests: [], failFinish: false };
    const tx: any = {
      linaTaslak: {
        updateMany: async ({ where, data }: any) => { if (!matches(state.draft, where)) return { count: 0 }; Object.assign(state.draft, data); return { count: 1 }; },
        update: async ({ data }: any) => { if (state.failFinish) throw Error('internal_db_password_detail'); Object.assign(state.draft, data); return state.draft; },
      },
      customer: {
        findFirst: async () => existing ? state.customers[0] : null,
        create: async ({ data }: any) => { const row = { id: 'new', ...data }; state.customers.push(row); return row; },
        findUnique: async () => ({ ...state.customers[0], interests: state.interests }),
      },
      customerInterest: {
        createMany: async ({ data }: any) => { state.interests.push(...data.map((row: any) => ({ id: 'interest', ...row }))); },
        create: async ({ data }: any) => { const row = { id: 'interest', ...data }; state.interests.push(row); return row; },
      },
    };
    let queue = Promise.resolve();
    const db: any = { $transaction: (fn: any) => {
      const result = queue.then(async () => {
        const snapshot = structuredClone(state);
        try { return await fn(tx); } catch (error) { Object.assign(state, snapshot); throw error; }
      });
      queue = result.then(() => undefined, () => undefined); return result;
    } };
    const crm = new CrmService(db, {} as any, new PropertyCriteriaService());
    jest.spyOn(crm as any, 'ensureActiveCrmCapacity').mockResolvedValue(undefined);
    const notify = jest.spyOn(crm, 'refreshInterestMatches').mockResolvedValue(undefined);
    const flow = new LinaDraftFlowService(db, {} as any, {} as any, {} as any, {} as any, crm);
    const confirm = () => (flow as any).confirm(structuredClone(draft), { id: 'u', role: 'EMLAKCI' });
    return { state, confirm, notify };
  }
  it.each([false, true])('customer/interest and draft all roll back if closing fails (existing=%s)', async existing => {
    const t = setup(existing); t.state.failFinish = true;
    const result = await t.confirm();
    expect(result.success).toBe(false); expect(result.message).not.toContain('internal_db_password_detail');
    expect(t.state.customers).toHaveLength(existing ? 1 : 0); expect(t.state.interests).toHaveLength(0);
    expect(t.state.draft.durum).toBe('ONAY_BEKLIYOR'); expect(t.notify).not.toHaveBeenCalled();
  });
  it('parallel draft saves create one record and close once', async () => {
    const t = setup(); await Promise.all([t.confirm(), t.confirm()]);
    expect(t.state.customers).toHaveLength(1); expect(t.state.interests).toHaveLength(1);
    expect(t.state.draft.durum).toBe('KAYDEDILDI'); expect(t.notify).toHaveBeenCalledTimes(1);
  });
  it('action engine logs internal error and returns a safe Turkish message', async () => {
    const audit = { log: jest.fn() };
    const engine = new LinaActionEngineService({ linaTaslak: { findFirst: async () => null } } as any,
      {} as any, {} as any, {} as any, audit as any);
    jest.spyOn(engine as any, 'prepareNetworkRequestCreate').mockRejectedValue(Error('private_sql_detail'));
    const result = await engine.tryExecute('müşteriyi güncelle', { id: 'u', role: 'EMLAKCI' }, 'crm');
    expect(result.success).toBe(false); expect(result.message).not.toContain('private_sql_detail'); expect(audit.log).toHaveBeenCalled();
  });
});

describe('EPH90 F08 request budget and fetch cancellation', () => {
  const budget = (value = 20) => new LinaChatBudgetService({ systemSetting: { findUnique: async () => ({ valueJson: value }) } } as any);
  afterEach(() => jest.restoreAllMocks());
  it('returns the exact busy message, aborts fetch and prevents delayed mutation', async () => {
    const write = jest.fn(); let signal: AbortSignal | undefined;
    const result = await budget().run(async () => {
      signal = linaFetchSignal();
      await new Promise(resolve => setTimeout(resolve, 40));
      assertLinaBudget(); write(); return {};
    });
    expect(result).toMatchObject({ success: false, message: LINA_BUSY_MESSAGE }); expect(signal?.aborted).toBe(true);
    await new Promise(resolve => setTimeout(resolve, 50)); expect(write).not.toHaveBeenCalled();
  });
  it('caps administrator values at 22 seconds and supports lower DB values', async () => {
    expect(await budget(90000).readTimeoutMs()).toBe(22000); expect(await budget(15).readTimeoutMs()).toBe(15);
  });
  it('/lina/chat applies the budget to scope work before any action executes', async () => {
    const controller = Object.create(LinaController.prototype) as LinaController;
    const execute = jest.fn();
    Object.assign(controller, { chatBudget: budget(),
      linaDraftFlowService: { getScopeContext: async () => ({ aktifTaslak: false }), handle: execute },
      linaScopeService: { classify: async () => { await new Promise(resolve => setTimeout(resolve, 45)); return 'EPH_SCOPE'; } },
    });
    expect(await controller.chat({ message: 'test', sourceModule: 'crm' }, { user: { id: 'u', role: 'EMLAKCI' } } as any))
      .toMatchObject({ success: false, message: LINA_BUSY_MESSAGE });
    await new Promise(resolve => setTimeout(resolve, 50)); expect(execute).not.toHaveBeenCalled();
  });
  it('fallback and TTS fetch receive AbortSignals without provider calls', async () => {
    const signals: AbortSignal[] = [];
    jest.spyOn(global, 'fetch').mockImplementation(async (_url, init) => {
      signals.push(init!.signal as AbortSignal);
      return { ok: true, json: async () => ({ choices: [{ message: { content: 'test' } }] }), arrayBuffer: async () => new ArrayBuffer(1) } as any;
    });
    const gateway = new LinaOpenAiLiveGatewayService(budget(), { get: () => 'test-only' } as any,
      { run: async () => ({ status: 'failed', message: 'test' }) } as any);
    await gateway.run({ message: 'test', instructions: '', identity: {}, sourceModule: 'general' });
    const lina = Object.create(LinaService.prototype);
    lina.configService = { get: () => 'test-only' }; lina.chatBudget = budget();
    // Invoke only the provider transport; no real network or credentials.
    await lina.askOpenAiSpeech('test');
    expect(signals).toHaveLength(2); expect(signals.every(signal => signal instanceof AbortSignal)).toBe(true);
    await new Promise(resolve => setTimeout(resolve, 35)); expect(signals.every(signal => signal.aborted)).toBe(true);
  });
});
