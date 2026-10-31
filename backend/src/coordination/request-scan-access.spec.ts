import { Role } from '@prisma/client';
import { CoordinationRecalculationService } from './coordination-recalculation.service';

describe('Request routes use the shared paid-scan boundary', () => {
  function setup() { const paid: any = { config: jest.fn(async () => ({ costPk: 7 })), scan: jest.fn(async () => ({ ok: true })),
    history: jest.fn(async () => []), historyReceipt: jest.fn(async () => ({ matches: [] })) };
    return { paid, service: new CoordinationRecalculationService({} as any, {} as any, {} as any, paid, {} as any) }; }
  const actor = { id: 'agent', role: Role.EMLAKCI };
  it('forwards wallet config unchanged', async () => { const t = setup(); const options = { walletSource: 'OFFICE', walletOfficeId: 'office' }; await t.service.getMatchScanConfig(actor, options); expect(t.paid.config).toHaveBeenCalledWith(actor, options); });
  it('forwards actor, source, approved cost and request ID to the shared scanner', async () => { const t = setup(); await t.service.runPaidRequestMatchScan('post', actor, 'request-key-1234', { expectedActorId: 'agent', expectedCostPk: 7 }); expect(t.paid.scan).toHaveBeenCalledWith('REQUEST', 'post', actor, { requestId: 'request-key-1234', expectedActorId: 'agent', expectedCostPk: 7 }); });
  it('keeps existing history-list endpoint read only', async () => { const t = setup(); await t.service.requestMatchHistory('post', actor); expect(t.paid.history).toHaveBeenCalledWith('REQUEST', 'post', actor); expect(t.paid.scan).not.toHaveBeenCalled(); });
  it('keeps existing report endpoint read only', async () => { const t = setup(); await t.service.requestMatchHistory('post', actor, 'request-key-1234'); expect(t.paid.historyReceipt).toHaveBeenCalledWith('REQUEST', 'post', 'request-key-1234', actor); expect(t.paid.scan).not.toHaveBeenCalled(); });
});
