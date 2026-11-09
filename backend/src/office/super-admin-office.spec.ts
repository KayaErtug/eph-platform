import { ForbiddenException } from '@nestjs/common';
import { OfficeManagementService } from './office-management.service';
import { OfficeRealtorGuard } from './office-realtor.guard';

function fixture(role = 'SUPER_ADMIN') {
  const office = { id: 'office', name: 'Ofis', ownerUserId: 'owner', isActive: true };
  const team = { id: 'team', officeId: 'office', leaderId: 'member', isActive: true };
  const db: any = {
    $queryRaw: jest.fn(async () => []), $executeRaw: jest.fn(async () => 1),
    user: { findUnique: jest.fn(async ({ where }) => ({ id: where.id, role: where.id === 'root' ? role : 'EMLAKCI', officeId: where.id === 'root' ? null : 'office', capabilities: [] })), updateMany: jest.fn(async () => ({ count: 2 })) },
    office: { findUnique: jest.fn(async () => office), delete: jest.fn(async () => office) },
    team: { findUnique: jest.fn(async () => team), findFirst: jest.fn(async () => null), findMany: jest.fn(async () => [team]), delete: jest.fn(async () => team), update: jest.fn(async () => team) },
    teamMember: { updateMany: jest.fn(async () => ({ count: 1 })) },
    userCapability: { deleteMany: jest.fn(async () => ({ count: 1 })) },
    unit: { updateMany: jest.fn(async () => ({ count: 2 })) },
    systemSetting: { deleteMany: jest.fn(async () => ({ count: 0 })) },
    adminActionLog: { create: jest.fn(async ({ data }) => data) },
  };
  db.$transaction = async (work: any) => work(db);
  return { db, office, team, service: new OfficeManagementService(db) };
}

describe('Süper admin ofis yetki regresyonu', () => {
  it.each(['dashboard', 'deleteTeam', 'removeMember', 'removeTeamMember', 'deleteOffice', 'futureAction'])('üye olmayan süper admin güncel DB rolüyle %s işlemine erişir', async handler => {
    const { db } = fixture();
    const req = { user: { id: 'root', role: 'EMLAKCI' } };
    const context: any = { switchToHttp: () => ({ getRequest: () => req }), getHandler: () => ({ name: handler }), getClass: () => ({ name: 'OfficeManagementController' }) };
    await expect(new OfficeRealtorGuard(db).canActivate(context)).resolves.toBe(true);
    expect(req.user.role).toBe('SUPER_ADMIN');
  });
  it.each(['EMLAKCI', 'ADMIN', 'MUTEAHHIT', 'MODERATOR'])('%s başkasının ofisini silemez', async role => {
    const f = fixture(role);
    await expect(f.service.deleteOffice('root', 'office')).rejects.toBeInstanceOf(ForbiddenException);
    expect(f.db.office.delete).not.toHaveBeenCalled();
  });
  it('başkasının takımını kalıcı siler ve işlem sahibini kaydeder', async () => {
    const f = fixture();
    await expect(f.service.deleteTeam('root', 'office', 'team')).resolves.toEqual({ ok: true });
    expect(f.db.team.delete).toHaveBeenCalledWith({ where: { id: 'team' } });
    expect(f.db.adminActionLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({ actorId: 'root', entityId: 'team' }) });
  });
  it('başkasının takımındaki lideri üyelikten çıkarabilir', async () => {
    const f = fixture();
    await expect(f.service.removeTeamMember('root', 'office', 'team', 'member')).resolves.toEqual({ ok: true });
    expect(f.db.team.update).toHaveBeenCalledWith({ where: { id: 'team' }, data: { leaderId: null } });
  });
  it('pasif ofisi de yönetebilir; ofis silinirken kullanıcı hesapları ve portföyler silinmez', async () => {
    const f = fixture(); f.office.isActive = false;
    await expect(f.service.deleteOffice('root', 'office')).resolves.toEqual({ ok: true, officeId: 'office' });
    expect(f.db.user.updateMany).toHaveBeenCalledWith({ where: { officeId: 'office' }, data: { officeId: null } });
    expect(f.db.unit.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: { sharedWithSisters: false } }));
    expect(f.db.office.delete).toHaveBeenCalled();
  });
  it('yetkisi düşürülen eski süper admin sahiplik kontrolünü aşamaz', async () => {
    const f = fixture('EMLAKCI');
    await expect(f.service.deleteTeam('root', 'office', 'team')).rejects.toBeInstanceOf(ForbiddenException);
    expect(f.db.team.delete).not.toHaveBeenCalled();
  });
});
