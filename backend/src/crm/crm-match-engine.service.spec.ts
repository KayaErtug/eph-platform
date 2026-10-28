import { ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CrmMatchEngineService } from './crm-match-engine.service';

describe('CRM legacy read endpoint returns only saved paid matches', () => {
  function setup() {
    const state: any = { ownerId: 'agent', active: true, report: null };
    const db: any = { user: { findUnique: jest.fn(async () => ({ role: Role.EMLAKCI })) },
      customerInterest: { findUnique: jest.fn(async () => ({ isActive: state.active, customer: { ownerId: state.ownerId } })), update: jest.fn() },
      matchScanAttempt: { findFirst: jest.fn(async () => state.report) },
      unit: { findMany: jest.fn(async () => [{ id: 'unit', isPoolVisible: true, project: { ownerId: 'other' } }]) } };
    return { state, db, service: new CrmMatchEngineService(db, {} as any, {} as any) };
  }
  it('returns empty without any matching query when no paid receipt exists', async () => { const t = setup(); expect(await t.service.getCustomerInterestMatches('interest', 'agent', Role.EMLAKCI)).toEqual([]); expect(t.db.unit.findMany).not.toHaveBeenCalled(); expect(t.db.customerInterest.update).not.toHaveBeenCalled(); });
  it('reads saved matches without refreshing their calculation timestamp', async () => { const t = setup(); t.state.report = { resultJson: { matches: [{ unitId: 'unit', title: 'Kayıtlı ilan', matchScore: 90, matchReasons: [] }] } }; expect(await t.service.getCustomerInterestMatches('interest', 'agent', Role.EMLAKCI)).toMatchObject([{ title: 'Kayıtlı ilan' }]); expect(t.db.customerInterest.update).not.toHaveBeenCalled(); });
  it('blocks another owner and ignores a caller-supplied super role', async () => { const t = setup(); t.state.ownerId = 'other'; await expect(t.service.getCustomerInterestMatches('interest', 'agent', Role.SUPER_ADMIN)).rejects.toThrow(ForbiddenException); });
  it('does not return a passive interest report', async () => { const t = setup(); t.state.active = false; await expect(t.service.getCustomerInterestMatches('interest', 'agent', Role.EMLAKCI)).rejects.toThrow('Aktif CRM'); });
  it('scopes saved reports to the authenticated owner', async () => { const t = setup(); await t.service.getCustomerInterestMatches('interest', 'agent', Role.EMLAKCI); expect(t.db.matchScanAttempt.findFirst.mock.calls[0][0].where).toMatchObject({ userId: 'agent', sourceType: 'CRM_CUSTOMER', status: 'COMPLETED' }); });
});
