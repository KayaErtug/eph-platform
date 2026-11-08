import { Role } from '@prisma/client';
import { CoordinationRecalculationService } from './coordination-recalculation.service';

describe('Paid matching coordination and read-only hooks', () => {
  function setup() {
    const db: any = { user: { findUnique: jest.fn(async () => ({ role: Role.EMLAKCI })) },
      customerInterest: { findUnique: jest.fn(async () => ({ isActive: true, customer: { ownerId: 'agent' } })), findMany: jest.fn(async () => []) },
      networkPost: { findMany: jest.fn(async () => []) }, unit: { findMany: jest.fn(async () => []) },
      matchScanAttempt: { findMany: jest.fn(async () => []) }, linaBildirim: { create: jest.fn(async () => ({})) } };
    const crm: any = { registerInterestMatchHandler: jest.fn() };
    const network: any = { registerRequestMatchHandler: jest.fn() };
    const paid: any = { config: jest.fn(async () => ({ costPk: 7 })), scan: jest.fn(async () => ({ ok: true })),
      history: jest.fn(async () => []), historyReceipt: jest.fn(async () => ({ matches: [] })) };
    return { db, crm, network, paid, service: new CoordinationRecalculationService(db, crm, network, paid) };
  }
  const user = { id: 'agent', role: Role.EMLAKCI };
  it('registers persistence notifications without starting a paid or free scan', async () => {
    const t = setup(); t.service.onModuleInit();
    await t.network.registerRequestMatchHandler.mock.calls[0][0]('post', 'agent');
    await t.crm.registerInterestMatchHandler.mock.calls[0][0]('interest');
    expect(t.db.linaBildirim.create).toHaveBeenCalledTimes(2); expect(t.paid.scan).not.toHaveBeenCalled();
    expect(t.db.linaBildirim.create.mock.calls[0][0].data.mesaj).toContain('PK ücretini onaylayarak');
  });
  it('does not notify for an inactive CRM interest', async () => { const t = setup(); t.db.customerInterest.findUnique.mockResolvedValue({ isActive: false }); t.service.onModuleInit(); await t.crm.registerInterestMatchHandler.mock.calls[0][0]('interest'); expect(t.db.linaBildirim.create).not.toHaveBeenCalled(); });
  it('blocks legacy free preview and recalculation routes', async () => { const t = setup(); await expect(t.service.previewRequestPoolMatches({}, user)).rejects.toMatchObject({ response: { code: 'PAID_MATCH_REQUIRED' } }); await expect(t.service.recalculateCrmInterest('interest', user)).rejects.toMatchObject({ response: { code: 'PAID_MATCH_REQUIRED' } }); expect(t.paid.scan).not.toHaveBeenCalled(); });
  it('returns read-only Lina summaries without calling the paid scanner', async () => { const t = setup(); expect(await t.service.getLinaOpportunities(user)).toMatchObject({ snapshot: true, summary: { total: 0 }, opportunities: [] }); expect(t.paid.scan).not.toHaveBeenCalled(); });
  it('alerts require a new confirmed paid scan after a source update', async () => { const t = setup(); t.db.customerInterest.findMany.mockResolvedValue([{ id: 'interest', title: 'Adalet', updatedAt: new Date('2026-10-15') }]); const result = await t.service.getAlerts(user); expect(result.alerts[0]).toMatchObject({ entityId: 'interest', requiresPaidScan: true }); expect(t.paid.scan).not.toHaveBeenCalled(); });
});
