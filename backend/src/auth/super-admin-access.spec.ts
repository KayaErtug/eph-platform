import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Role, PortfolioApprovalStatus } from '@prisma/client';
import { RolesGuard } from './guards/roles.guard';
import { ProjectsService } from '../projects/projects.service';
import { ProjectsController } from '../projects/projects.controller';
import { ProjectSalesDashboardService } from '../project-sales/project-sales-dashboard.service';
import { NetworkService } from '../network/network.service';
import { MessagesService } from '../messages/messages.service';
import { TeamLeaderCrmService } from '../team-leader-crm/team-leader-crm.service';
import { OfficeOwnerCrmService } from '../office-owner-crm/office-owner-crm.service';
import { OfficeService } from '../office/office.service';
import { CommercialMatchScanService } from '../coordination/commercial-match-scan.service';
import { ProjectSalesOfferService } from '../project-sales/project-sales-offer.service';
import { ProjectSalesReservationService } from '../project-sales/project-sales-reservation.service';

describe('SUPER_ADMIN role access', () => {
  it.each(Object.values(Role))('allows the software team through a %s route', required => {
    const guard = new RolesGuard({ getAllAndOverride: () => [required] } as any);
    expect(guard.canActivate({ getHandler: () => null, getClass: () => null, switchToHttp: () => ({ getRequest: () => ({ user: { role: Role.SUPER_ADMIN } }) }) } as any)).toBe(true);
  });
  it('does not grant admin routes to normal or unauthenticated users', () => {
    const guard = new RolesGuard({ getAllAndOverride: () => [Role.ADMIN] } as any);
    for (const user of [undefined, { role: Role.EMLAKCI }, { role: Role.MUTEAHHIT }]) expect(guard.canActivate({ getHandler: () => null, getClass: () => null, switchToHttp: () => ({ getRequest: () => ({ user }) }) } as any)).toBe(false);
  });
});

describe('Project ownership overrides', () => {
  const project = { id: 'project', ownerId: 'owner', units: [{ approvalStatus: PortfolioApprovalStatus.HAVUZDA }] };
  function setup() {
    const db = { userBlock: { findFirst: jest.fn().mockResolvedValue(null), findMany: jest.fn().mockResolvedValue([]) }, project: { findUnique: jest.fn().mockResolvedValue(project), update: jest.fn().mockResolvedValue({ id: 'project' }), delete: jest.fn().mockResolvedValue({ id: 'project' }), findMany: jest.fn().mockResolvedValue([]) } };
    return { db, service: new ProjectsService(db as any, {} as any) };
  }
  it('software team can update and remove another owner project', async () => {
    const { service, db } = setup();
    await service.update('project', 'super', { city: 'İzmir' }, Role.SUPER_ADMIN);
    await service.remove('project', 'super', Role.SUPER_ADMIN);
    expect(db.project.update.mock.calls[0][0].data).toEqual({ city: 'İzmir' });
    expect(db.project.delete).toHaveBeenCalledTimes(1);
  });
  it('retains ownership and locked-content checks for normal accounts', async () => {
    const { service, db } = setup();
    await expect(service.update('project', 'other', { city: 'İzmir' }, Role.EMLAKCI)).rejects.toThrow(ForbiddenException);
    await expect(service.remove('project', 'other', Role.ADMIN)).rejects.toThrow(ForbiddenException);
    await expect(service.update('project', 'owner', { city: 'İzmir' }, Role.EMLAKCI)).rejects.toThrow(ForbiddenException);
    expect(db.project.update).not.toHaveBeenCalled(); expect(db.project.delete).not.toHaveBeenCalled();
  });
  it('controller forwards authenticated role, ignoring role fields in body', () => {
    const service = { update: jest.fn(), remove: jest.fn(), myProjects: jest.fn() };
    const controller = new ProjectsController(service as any);
    controller.update('project', { id: 'member', role: Role.EMLAKCI }, { role: Role.SUPER_ADMIN } as any);
    expect(service.update.mock.calls[0][3]).toBe(Role.EMLAKCI);
    controller.remove('project', { id: 'super', role: Role.SUPER_ADMIN }); expect(service.remove).toHaveBeenCalledWith('project', 'super', Role.SUPER_ADMIN);
  });
  it('Super project list is global; normal list stays scoped', async () => {
    const { service, db } = setup();
    await service.myProjects('super', Role.SUPER_ADMIN); expect(db.project.findMany.mock.calls[0][0].where).not.toHaveProperty('ownerId');
    await service.myProjects('owner', Role.EMLAKCI); expect(db.project.findMany.mock.calls[1][0].where.ownerId).toBe('owner');
  });
  it('sales dashboard aggregates the same scope as the project list', async () => {
    const db = { userBlock: { findFirst: jest.fn().mockResolvedValue(null), findMany: jest.fn().mockResolvedValue([]) }, project: { findMany: jest.fn().mockResolvedValue([]) }, unit: { groupBy: jest.fn().mockResolvedValue([]) }, customer: { groupBy: jest.fn().mockResolvedValue([]) } };
    const service = new ProjectSalesDashboardService(db as any);
    await service.getDashboard('super', Role.SUPER_ADMIN);
    expect(db.project.findMany.mock.calls[0][0].where).toEqual({}); expect(db.unit.groupBy.mock.calls[0][0].where.project).toEqual({}); expect(db.customer.groupBy.mock.calls[0][0].where).not.toHaveProperty('ownerId');
    await service.getDashboard('owner', Role.MUTEAHHIT); expect(db.project.findMany.mock.calls[1][0].where).toEqual({ ownerId: 'owner' }); expect(db.customer.groupBy.mock.calls[1][0].where.ownerId).toBe('owner');
  });
});

describe('Talep visibility and owner management', () => {
  function setup(role: Role) {
    const db = { userBlock: { findFirst: jest.fn().mockResolvedValue(null), findMany: jest.fn().mockResolvedValue([]) }, user: { findUnique: jest.fn().mockResolvedValue({ role }) }, networkPost: { findFirst: jest.fn().mockResolvedValue({ id: 'post', userId: 'owner' }) } };
    const service = new NetworkService(db as any, {} as any, {} as any, {} as any, {} as any, {} as any);
    return { db, service: service as any };
  }
  it('Super can view all active audience segments', async () => {
    const { service } = setup(Role.SUPER_ADMIN); expect(await service.networkPostVisibilityFilter('super')).toEqual({ User: {} }); // §0: süper admine engelleme filtresi uygulanmaz
  });
  it('normal roles keep their own audience filter', async () => {
    const { service } = setup(Role.EMLAKCI); const filter = await service.networkPostVisibilityFilter('member');
    expect(filter.AND[0].OR).toContainEqual({ visibility: 'SADECE_EMLAKCILAR' }); expect(filter.AND[0].OR).not.toContainEqual({ visibility: 'SADECE_MUTEAHHITLER' });
  });
  it('Super owner operations remain limited to active non-expired posts', async () => {
    const { service, db } = setup(Role.SUPER_ADMIN); await service.assertCanViewNetworkPost('post', 'super', { ownerOnly: true });
    const where = db.networkPost.findFirst.mock.calls[0][0].where; expect(where.isActive).toBe(true); expect(where.expiresAt.gt).toBeInstanceOf(Date); expect(where.AND).not.toContainEqual({ userId: 'super' });
  });
  it('Super may share another active public post without making targeted posts public', async () => {
    const { service, db } = setup(Role.SUPER_ADMIN); (db as any).networkPostShareLink = { create: jest.fn().mockResolvedValue({ token: 'token' }) };
    await service.createNetworkPostShareLink('post', 'super'); const where = db.networkPost.findFirst.mock.calls[0][0].where;
    expect(where).toMatchObject({ isActive: true, visibility: 'TUM_EPH' }); expect(where).not.toHaveProperty('userId');
  });
  it('normal owner operations still constrain userId', async () => {
    const { service, db } = setup(Role.EMLAKCI); await service.assertCanViewNetworkPost('post', 'member', { ownerOnly: true });
    expect(db.networkPost.findFirst.mock.calls[0][0].where.AND).toContainEqual({ userId: 'member' });
  });
});

describe('Software team message intervention', () => {
  function setup() {
    const conversation = { id: 'conversation', NetworkPost: null, ConversationParticipant: [{ userId: 'a' }, { userId: 'b' }] };
    const db = { userBlock: { findFirst: jest.fn().mockResolvedValue(null), findMany: jest.fn().mockResolvedValue([]) }, conversation: { findUnique: jest.fn().mockResolvedValue(conversation), update: jest.fn().mockResolvedValue({}) }, message: { findFirst: jest.fn().mockResolvedValue(null), create: jest.fn(async ({ data }) => ({ id: 'message', body: data.body, createdAt: new Date(), User: { id: data.User.connect.id, role: Role.SUPER_ADMIN, firstName: 'Private', lastName: 'Name' }, Conversation: conversation })) } };
    const push = { notify: jest.fn().mockResolvedValue({}) };
    return { db, push, service: new MessagesService(db as any, push as any) };
  }
  it('Super can write as Yazılım Ekibi in a conversation without impersonation', async () => {
    const { service, db, push } = setup(); await service.sendMessage('conversation', { body: 'Destek yanıtı' }, 'super', Role.SUPER_ADMIN);
    expect(db.message.create.mock.calls[0][0].data.User.connect.id).toBe('super'); expect(push.notify).toHaveBeenCalledTimes(2);
    for (const call of push.notify.mock.calls) expect(call[1].body).toBe('Yazılım Ekibi size mesaj gönderdi.');
  });
  it('blocks normal outsiders and forged senderId even for Super', async () => {
    const { service, db } = setup();
    await expect(service.sendMessage('conversation', { body: 'x' }, 'outsider', Role.EMLAKCI)).rejects.toThrow(ForbiddenException);
    await expect(service.sendMessage('conversation', { body: 'x', senderId: 'a' }, 'super', Role.SUPER_ADMIN)).rejects.toThrow(ForbiddenException);
    expect(db.message.create).not.toHaveBeenCalled();
  });
});

describe('Team and office dashboard selection', () => {
  it('Super sees selected or first active team without becoming a leader', async () => {
    const db = { userBlock: { findFirst: jest.fn().mockResolvedValue(null), findMany: jest.fn().mockResolvedValue([]) }, team: { findFirst: jest.fn().mockResolvedValue(null) } };
    const service = new TeamLeaderCrmService(db as any);
    await expect(service.getMyDashboard({ id: 'super', role: Role.SUPER_ADMIN }, 'team')).rejects.toThrow(NotFoundException);
    expect(db.team.findFirst.mock.calls[0][0].where).toEqual({ id: 'team', isActive: true });
    await expect(service.getMyDashboard({ id: 'super', role: Role.SUPER_ADMIN })).rejects.toThrow(NotFoundException);
    expect(db.team.findFirst.mock.calls[1][0].where).toEqual({ isActive: true });
  });
  it('normal leader cannot request another team', async () => {
    const db = { userBlock: { findFirst: jest.fn().mockResolvedValue(null), findMany: jest.fn().mockResolvedValue([]) }, userCapability: { findUnique: jest.fn().mockResolvedValue({ id: 'cap' }) }, team: { findFirst: jest.fn() } };
    await expect(new TeamLeaderCrmService(db as any).getMyDashboard({ id: 'leader', role: Role.EMLAKCI }, 'other-team')).rejects.toThrow(ForbiddenException);
    expect(db.team.findFirst).not.toHaveBeenCalled();
  });
  it('Super selects an office; normal owner cannot select another office', async () => {
    const db = { userBlock: { findFirst: jest.fn().mockResolvedValue(null), findMany: jest.fn().mockResolvedValue([]) }, office: { findFirst: jest.fn().mockResolvedValue({ id: 'office' }) } };
    const service = new OfficeOwnerCrmService(db as any) as any;
    expect(await service.findManagedOffice({ id: 'super', role: Role.SUPER_ADMIN }, 'office')).toEqual({ id: 'office' });
    await expect(service.findManagedOffice({ id: 'owner', role: Role.EMLAKCI }, 'other')).rejects.toThrow(ForbiddenException);
    expect(db.office.findFirst).toHaveBeenCalledTimes(1);
  });
});

describe('Office trial accounting', () => {
  function setup(owner: string | null = 'owner') {
    let granted = false;
    const tx = { $executeRaw: jest.fn().mockResolvedValue(1), systemSetting: { findUnique: jest.fn().mockResolvedValue(null), upsert: jest.fn().mockResolvedValue({}), update: jest.fn().mockResolvedValue({}) }, kontorHareketi: { findFirst: jest.fn(async () => granted ? { id: 'prior' } : null), create: jest.fn(async ({ data }) => { granted = true; return { id: 'movement', ...data }; }) }, kontorCuzdani: { findUnique: jest.fn().mockResolvedValue({ bakiye: 100 }), update: jest.fn().mockResolvedValue({ bakiye: 5100 }) } };
    const db = { userBlock: { findFirst: jest.fn().mockResolvedValue(null), findMany: jest.fn().mockResolvedValue([]) }, office: { findUnique: jest.fn().mockResolvedValue({ id: 'office', ownerUserId: owner, isActive: true }), findMany: jest.fn().mockResolvedValue([]) }, $transaction: jest.fn(async fn => fn(tx)), systemSetting: { findUnique: jest.fn().mockResolvedValue({ valueJson: [{ code: 'DENEME', monthlyPk: 5000, trialDays: 30 }] }) } };
    return { tx, db, service: new OfficeService(db as any) };
  }
  it('Super credits office owner and records the actual actor', async () => {
    const { service, tx } = setup(); const result = await service.startOfficeTrial('super', 'office', Role.SUPER_ADMIN);
    expect(result).toMatchObject({ beneficiaryUserId: 'owner', balance: 5100, grantedPk: 5000 });
    expect(tx.kontorHareketi.create.mock.calls[0][0].data).toMatchObject({ kullaniciId: 'owner', olusturanId: 'super', miktar: 5000 });
    expect(tx.kontorCuzdani.update.mock.calls[0][0].where).toEqual({ kullaniciId: 'owner' });
    expect(tx.$executeRaw.mock.calls[0][1]).toBe('office-trial:owner');
    await expect(service.startOfficeTrial('super', 'office', Role.SUPER_ADMIN)).rejects.toThrow(BadRequestException); expect(tx.kontorHareketi.create).toHaveBeenCalledTimes(1);
  });
  it('normal office owner retains their own trial flow', async () => {
    const { service, tx } = setup(); await service.startOfficeTrial('owner', 'office', Role.EMLAKCI); expect(tx.kontorHareketi.create.mock.calls[0][0].data).toMatchObject({ kullaniciId: 'owner', olusturanId: 'owner' });
  });
  it('outsider, missing actor or unassigned owner cannot receive trial credit', async () => {
    const { service, db } = setup();
    await expect(service.startOfficeTrial('outsider', 'office', Role.EMLAKCI)).rejects.toThrow(ForbiddenException);
    await expect(service.startOfficeTrial('', 'office', Role.SUPER_ADMIN)).rejects.toThrow(ForbiddenException); expect(db.$transaction).not.toHaveBeenCalled();
    const unowned = setup(null); await expect(unowned.service.startOfficeTrial('super', 'office', Role.SUPER_ADMIN)).rejects.toThrow(BadRequestException); expect(unowned.db.$transaction).not.toHaveBeenCalled();
  });
  it('Super office list has no actor ownership restriction', async () => {
    const { service, db } = setup(); await service.getMyOffices('super', Role.SUPER_ADMIN); expect(db.office.findMany.mock.calls[0][0].where).toEqual({ isActive: true });
  });
});

describe('Cross-owner business operations', () => {
  it('Super can scan another owner private portfolio; normal account cannot', async () => {
    const db = { userBlock: { findFirst: jest.fn().mockResolvedValue(null), findMany: jest.fn().mockResolvedValue([]) }, unit: { findUnique: jest.fn().mockResolvedValue({ id: 'unit', isPoolVisible: false, isOffMarket: false, project: { ownerId: 'owner', isActive: true } }) } };
    const service = new CommercialMatchScanService(db as any, {} as any, {} as any, {} as any) as any;
    await expect(service.context('PRIVATE_PORTFOLIO', 'unit', { id: 'super', role: Role.SUPER_ADMIN }, false)).resolves.toMatchObject({ record: { id: 'unit' } });
    await expect(service.context('PRIVATE_PORTFOLIO', 'unit', { id: 'outsider', role: Role.EMLAKCI }, false)).rejects.toThrow(ForbiddenException);
  });
  it('Super reads cross-owner MATCH history while normal users retain their scope', async () => {
    const db = { userBlock: { findFirst: jest.fn().mockResolvedValue(null), findMany: jest.fn().mockResolvedValue([]) }, user: { findUnique: jest.fn(async ({ where }) => ({ role: where.id === 'super' ? Role.SUPER_ADMIN : Role.EMLAKCI })) }, unit: { findUnique: jest.fn().mockResolvedValue({ id: 'unit', isPoolVisible: false, isOffMarket: false, project: { ownerId: 'member', isActive: true } }) }, matchScanAttempt: { findMany: jest.fn().mockResolvedValue([]) } };
    const service = new CommercialMatchScanService(db as any, {} as any, {} as any, {} as any);
    await service.history('PRIVATE_PORTFOLIO', 'unit', { id: 'super', role: Role.SUPER_ADMIN }); expect(db.matchScanAttempt.findMany.mock.calls[0][0].where).not.toHaveProperty('userId');
    await service.history('PRIVATE_PORTFOLIO', 'unit', { id: 'member', role: Role.EMLAKCI }); expect(db.matchScanAttempt.findMany.mock.calls[1][0].where.userId).toBe('member');
  });
  it('Super can attach the project owner customer to an offer or reservation', async () => {
    const db = { userBlock: { findFirst: jest.fn().mockResolvedValue(null), findMany: jest.fn().mockResolvedValue([]) }, customer: { findUnique: jest.fn().mockResolvedValue({ id: 'customer', ownerId: 'project-owner' }) } };
    const offers = new ProjectSalesOfferService(db as any) as any;
    const reservations = new ProjectSalesReservationService(db as any) as any;
    await expect(offers.ensureCustomerAccess('customer', 'project-owner', 'super', Role.SUPER_ADMIN)).resolves.toBeUndefined();
    await expect(reservations.ensureCustomerAccess(db, 'customer', 'project-owner', 'super', Role.SUPER_ADMIN)).resolves.toBeUndefined();
    db.customer.findUnique.mockResolvedValue({ id: 'customer', ownerId: 'unrelated' });
    await expect(offers.ensureCustomerAccess('customer', 'project-owner', 'super', Role.SUPER_ADMIN)).rejects.toThrow(ForbiddenException);
    await expect(reservations.ensureCustomerAccess(db, 'customer', 'project-owner', 'super', Role.SUPER_ADMIN)).rejects.toThrow(ForbiddenException);
  });
});
