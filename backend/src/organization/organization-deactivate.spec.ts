import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { OrganizationService } from './organization.service';

function fixture() {
  const db: any = {
    office: { findUnique: jest.fn(async () => ({ id: 'o1', name: 'Ofis', isActive: true })), update: jest.fn(async ({ data }) => ({ id: 'o1', ...data })) },
    team: { findUnique: jest.fn(async () => ({ id: 't1', name: 'Takım', officeId: 'o1', isActive: true })), update: jest.fn(async ({ data }) => ({ id: 't1', ...data })) },
    teamMember: { updateMany: jest.fn(async () => ({ count: 2 })) },
    auditLog: { create: jest.fn(async () => ({})) },
  };
  db.$transaction = jest.fn(async (work: any) => work(db));
  return { db, service: new OrganizationService(db) };
}
const superActor = { id: 'super', role: 'SUPER_ADMIN' };

describe('Süper admin ofis/takım pasifleştirme', () => {
  it('ofisi siler değil pasifleştirir ve AuditLog yazar', async () => {
    const f = fixture();
    await expect(f.service.deactivateOffice('o1', superActor)).resolves.toMatchObject({ ok: true, deactivated: true });
    expect(f.db.office.update).toHaveBeenCalledWith({ where: { id: 'o1' }, data: { isActive: false } });
    expect(f.db.auditLog.create).toHaveBeenCalledTimes(1);
  });
  it('takımı pasifleştirir, üyeleri çıkarır ve AuditLog yazar', async () => {
    const f = fixture();
    await expect(f.service.deactivateTeam('t1', superActor)).resolves.toMatchObject({ ok: true, deactivated: true });
    expect(f.db.team.update).toHaveBeenCalledWith({ where: { id: 't1' }, data: { isActive: false } });
    expect(f.db.teamMember.updateMany).toHaveBeenCalled();
    expect(f.db.auditLog.create).toHaveBeenCalledTimes(1);
  });
  it('ADMIN rolü kullanamaz', async () => {
    const f = fixture();
    await expect(f.service.deactivateOffice('o1', { id: 'a', role: 'ADMIN' })).rejects.toThrow(ForbiddenException);
    await expect(f.service.deactivateTeam('t1', { id: 'a', role: 'ADMIN' })).rejects.toThrow(ForbiddenException);
    expect(f.db.office.update).not.toHaveBeenCalled();
  });
  it('olmayan kayıt 404', async () => {
    const f = fixture();
    f.db.office.findUnique.mockResolvedValueOnce(null);
    await expect(f.service.deactivateOffice('x', superActor)).rejects.toThrow(NotFoundException);
  });
});
