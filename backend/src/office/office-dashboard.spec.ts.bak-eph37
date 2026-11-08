import { OfficeManagementService } from './office-management.service';
import { officePolicyKey } from './office-wallet.rules';

function fixture(actorId = 'owner', maxTeams: number | undefined = 4) {
  const owner = { id: 'owner', firstName: 'Ofis', lastName: 'Sahibi', isApproved: true, isVerified: true };
  const advisor = { id: 'advisor', firstName: 'Test', lastName: 'Danışman', phone: null, isApproved: true, isVerified: true };
  const office = { id: 'office', name: 'Test Ofisi', ownerUserId: owner.id, owner, isActive: true };
  const policy = { mode: 'SHARED', scanPermissions: { advisor: false }, autoSpendPermissions: { advisor: false }, allowedSharedPoolUserIds: [], allowedSharedPoolTeamIds: ['team'] };
  const settings = {
    [officePolicyKey(office.id)]: policy,
    OFFICE_SUBSCRIPTION_office: { packageCode: 'test', agents: 7 },
    OFFICE_MEMBERSHIP_PACKAGES: [{ code: 'test', agents: 7, maxTeams }],
  };
  const db: any = {
    user: {
      findUnique: jest.fn(async () => ({ id: actorId, role: 'EMLAKCI', officeId: office.id, capabilities: actorId === owner.id ? [{ capability: 'OFFICE_OWNER' }] : [] })),
      findMany: jest.fn(async ({ where }) => where.id?.not ? [advisor] : [owner, advisor]),
      count: jest.fn(async () => 1),
    },
    office: { findMany: jest.fn(async () => [office]) },
    systemSetting: {
      findUnique: jest.fn(async ({ where }) => settings[where.key] ? { valueJson: settings[where.key] } : null),
      findMany: jest.fn(async () => []),
    },
    kontorCuzdani: { findUnique: jest.fn(async () => ({ bakiye: 550, aktifMi: true })) },
    team: { findMany: jest.fn(async () => [{ id: 'team', name: 'Takım', leaderId: advisor.id, leader: advisor, members: [{ userId: advisor.id, user: advisor }] }]) },
  };
  return { db, policy, service: new OfficeManagementService(db) };
}

describe('Mobile office dashboard contract', () => {
  it('returns teams, leader, advisors, policy and hierarchy while preserving existing fields', async () => {
    const f = fixture();
    const response = await f.service.dashboard('owner');
    expect(response).toMatchObject({ actorId: 'owner', requiresOffice: false, canCreate: false });
    const office = response.offices[0];
    const { mode, ...permissions } = f.policy;
    expect(office).toMatchObject({ id: 'office', name: 'Test Ofisi', ownerName: 'Ofis Sahibi', isOwner: true, mode, balance: 550, walletActive: true, memberCount: 1, applicants: [], maxTeams: 4, permissions });
    expect(office.teams).toEqual([{ id: 'team', name: 'Takım', leaderId: 'advisor', leaderName: 'Test Danışman', memberCount: 1, members: [{ id: 'advisor', firstName: 'Test', lastName: 'Danışman' }] }]);
    expect(office.allMembers).toEqual([expect.objectContaining({ id: 'advisor', phone: null, canScan: false, canAutoSpend: false, hasSharedPoolAccess: true, teams: [{ id: 'team', name: 'Takım' }] })]);
    expect(office.members).toHaveLength(2);
    expect(office.members[1]).toMatchObject({ id: 'advisor', firstName: 'Test', lastName: 'Danışman', isApproved: true, isVerified: true, canScan: false, canAutoSpend: false, teams: [{ id: 'team', name: 'Takım' }] });
    expect(office.hierarchy).toEqual([
      { officeName: 'Test Ofisi', roleTitle: 'Ofis Sahibi', fullName: 'Ofis Sahibi', userId: 'owner' },
      { officeName: 'Test Ofisi', roleTitle: 'Emlak Danışmanı', fullName: 'Test Danışman', userId: 'advisor' },
    ]);
    expect(f.db.team.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { officeId: 'office', isActive: true }, include: expect.objectContaining({ members: expect.objectContaining({ where: { isActive: true } }) }) }));
    expect(f.db.user.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { officeId: 'office', role: 'EMLAKCI', id: { not: 'owner' } } }));
  });

  it.each([0, 9])('uses the configured package maxTeams=%s without replacing zero', async maxTeams => {
    const f = fixture('owner', maxTeams);
    expect((await f.service.dashboard('owner')).offices[0].maxTeams).toBe(maxTeams);
  });

  it('uses the existing EPH-24A capacity fallback when maxTeams is absent', async () => {
    const f = fixture();
    f.db.systemSetting.findUnique.mockImplementation(async ({ where }) => {
      if (where.key === 'OFFICE_SUBSCRIPTION_office') return { valueJson: { agents: 7 } };
      return null;
    });
    expect((await f.service.dashboard('owner')).offices[0].maxTeams).toBe(2);
  });

  it('returns hierarchy to an affiliated advisor while preserving owner-only data boundaries', async () => {
    const f = fixture('advisor');
    const office = (await f.service.dashboard('advisor')).offices[0];
    expect(office.isOwner).toBe(false);
    expect(office.hierarchy).toHaveLength(2);
    expect(office.members).toEqual([]);
    for (const field of ['teams', 'maxTeams', 'allMembers', 'permissions']) expect(office).not.toHaveProperty(field);
    expect(f.db.team.findMany).not.toHaveBeenCalled();
  });
});
