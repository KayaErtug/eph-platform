import { Role } from '@prisma/client';
import { LinaController } from '../lina.controller';
import { LinaChatBudgetService } from '../lina-chat-budget.service';
import { LinaActionEngineService } from './lina-action-engine.service';
import { LinaConfirmationGateService } from './lina-confirmation-gate.service';

function matches(row: any, where: any): boolean {
  return Object.entries(where).every(([key, value]: [string, any]) => {
    if (value === undefined) return true;
    if (value && typeof value === 'object') {
      if ('gt' in value) return row[key] > value.gt;
      if ('path' in value) return row[key]?.[value.path[0]] === value.equals;
      if ('equals' in value) return JSON.stringify(row[key]) === JSON.stringify(value.equals);
    }
    return row[key] === value;
  });
}

function setup() {
  const rows: any[] = [];
  const customer = { id: 'customer', firstName: 'Ali', lastName: 'Veli' };
  const user = { id: 'agent', role: Role.EMLAKCI };
  const command = 'Ali Veli CRM kaydını sil';
  const db: any = { systemSetting: { findUnique: async () => ({ valueJson: 22000 }) }, linaTaslak: {
    findFirst: async ({ where }: any) => structuredClone(rows.filter(row => matches(row, where)).slice(-1)[0] || null),
    create: jest.fn(async ({ data }: any) => { const row = structuredClone({ id: `legacy-${rows.length}`, ...data }); rows.push(row); return row; }),
    updateMany: async ({ where, data }: any) => { const selected = rows.filter(row => matches(row, where)); selected.forEach(row => Object.assign(row, structuredClone(data))); return { count: selected.length }; },
  } };
  const crm = { getCustomers: jest.fn(async () => [customer]), getCustomer: jest.fn(async () => customer),
    deleteCustomer: jest.fn(async () => ({})) };
  const engine = new LinaActionEngineService(db, crm as any, {} as any, {} as any, { log: jest.fn() } as any);
  const gate = new LinaConfirmationGateService(db);
  const controller = Object.create(LinaController.prototype) as LinaController;
  Object.assign(controller, { chatBudget: new LinaChatBudgetService(db),
    linaScopeService: { classify: async () => 'EPH_SCOPE' }, linaNaturalCommandService: { normalize: (message: string) => message },
    linaDraftFlowService: { getScopeContext: async () => ({ aktifTaslak: false }), handle: async () => ({ handled: false }) },
    linaConfirmationGateService: gate, linaActionEngineService: engine,
  });
  const chat = (message: string, confirmationId?: string, sourceModule: 'general' | 'crm' = 'crm', extra = {}) =>
    controller.chat({ message, confirmationId, sourceModule, ...extra } as any, { user } as any) as Promise<any>;
  return { rows, crm, db, user, command, engine, chat };
}

describe('EPH91B CRM deletion confirmation ownership', () => {
  it.each(['general', 'crm'] as const)('%s: Onayla → Kesin Onayla deletes once, without a third prompt', async module => {
    const t = setup();
    const first = await t.chat(t.command, undefined, module);
    const id = first.data.confirmation.id;
    expect(first.data.confirmation.stage).toBe('FIRST'); expect(t.crm.deleteCustomer).not.toHaveBeenCalled();
    const final = await t.chat('Onayla', id, module);
    expect(final.data.confirmation.stage).toBe('FINAL'); expect(t.crm.deleteCustomer).not.toHaveBeenCalled();
    const done = await t.chat('Kesin Onayla', id, module);
    expect(done).toMatchObject({ success: true, action: 'crm_customer_delete', requiresConfirmation: false });
    expect(t.crm.deleteCustomer).toHaveBeenCalledTimes(1);
    expect(t.crm.deleteCustomer).toHaveBeenCalledWith('customer', 'agent', Role.EMLAKCI);
    expect(t.rows.some(row => row.tur === 'MOTOR_AKSIYON')).toBe(false);
    await t.chat('Kesin Onayla', id, module); expect(t.crm.deleteCustomer).toHaveBeenCalledTimes(1);
  });
  it('parallel final confirmations still execute exactly once', async () => {
    const t = setup(); const first = await t.chat(t.command); const id = first.data.confirmation.id;
    await t.chat('Onayla', id);
    const results = await Promise.all([t.chat('Kesin Onayla', id), t.chat('Kesin Onayla', id)]);
    expect(results.filter(result => result.success)).toHaveLength(1); expect(t.crm.deleteCustomer).toHaveBeenCalledTimes(1);
  });
  it('HTTP flags cannot skip the gate; wrong module/id cannot execute', async () => {
    const t = setup();
    const first = await t.chat(t.command, undefined, 'crm', { confirmedDelete: { planId: 'forged', userId: t.user.id, sourceModule: 'crm', command: t.command } });
    expect(first.requiresConfirmation).toBe(true); expect(t.crm.deleteCustomer).not.toHaveBeenCalled();
    await t.chat('Kesin Onayla', first.data.confirmation.id);
    await t.chat('Onayla', 'wrong'); await t.chat('Onayla', first.data.confirmation.id, 'general');
    expect(t.crm.deleteCustomer).not.toHaveBeenCalled();
  });
  it('legacy engine callers retain their own approval', async () => {
    const t = setup(); const pending = await t.engine.tryExecute(t.command, t.user, 'crm');
    expect(pending.requiresConfirmation).toBe(true); expect(t.crm.deleteCustomer).not.toHaveBeenCalled();
    const done = await t.engine.tryExecute('Onayla', t.user, 'crm');
    expect(done).toMatchObject({ success: true, action: 'crm_customer_delete' }); expect(t.crm.deleteCustomer).toHaveBeenCalledTimes(1);
  });
  it.each(['user', 'module', 'command', 'plan'])('mismatched internal approval (%s) does not bypass legacy approval', async mismatch => {
    const t = setup(); const approval = { planId: 'server-plan', userId: t.user.id, sourceModule: 'crm' as const, command: t.command };
    if (mismatch === 'user') approval.userId = 'other';
    if (mismatch === 'module') (approval as any).sourceModule = 'general';
    if (mismatch === 'command') approval.command = 'different';
    if (mismatch === 'plan') approval.planId = '';
    expect((await t.engine.tryExecute(t.command, t.user, 'crm', [], approval)).requiresConfirmation).toBe(true);
    expect(t.crm.deleteCustomer).not.toHaveBeenCalled();
  });
});
