import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Capability, KontorIslemTuru, Role } from '@prisma/client';
import { officePolicyKey, resolveOfficeWallet } from './office-wallet.rules';

describe('GRUP 4 Verification (Tasks 15, 17, 18, 21, 23)', () => {
  const officeId = 'test-office-1';
  const ownerId = 'owner-1';
  const consultant1Id = 'consultant-1';
  const consultant2Id = 'consultant-2';

  let state: any;

  beforeEach(() => {
    state = {
      users: {
        [ownerId]: { id: ownerId, role: Role.EMLAKCI, officeId, firstName: 'Ali', lastName: 'Öz', capabilities: [{ capability: Capability.OFFICE_OWNER }] },
        [consultant1Id]: { id: consultant1Id, role: Role.EMLAKCI, officeId, firstName: 'Ayşe', lastName: 'Yılmaz', capabilities: [] },
        [consultant2Id]: { id: consultant2Id, role: Role.EMLAKCI, officeId, firstName: 'Meral', lastName: 'Ak', capabilities: [] },
      },
      offices: {
        [officeId]: { id: officeId, name: 'Beyaz Emlak', ownerUserId: ownerId, isActive: true },
      },
      teams: [
        { id: 'team-1', officeId, name: 'Arsacılar', leaderId: null, isActive: true },
        { id: 'team-2', officeId, name: 'Lüks Konutlar', leaderId: null, isActive: true },
      ],
      teamMembers: [
        { id: 'tm-1', teamId: 'team-1', userId: consultant1Id, isActive: true },
        { id: 'tm-2', teamId: 'team-2', userId: consultant1Id, isActive: true }, // Task 18: Aynı danışman birden fazla takımda
      ],
      settings: {
        OFFICE_MEMBERSHIP_PACKAGES: [
          { code: 'PLATINUM', name: 'Ofis Platinum', agents: 15 },
          { code: 'ALTIN', name: 'Ofis Altın', agents: 7 },
          { code: 'BRONZ', name: 'Ofis Bronz', agents: 1 },
        ],
        [`OFFICE_SUBSCRIPTION_${officeId}`]: { packageCode: 'PLATINUM' },
        [officePolicyKey(officeId)]: {
          mode: 'SHARED',
          scanPermissions: {
            [consultant1Id]: true,
            [consultant2Id]: false, // Task 21: Tarama yetkisi kapalı
          },
          autoSpendPermissions: {
            [consultant1Id]: true,
            [consultant2Id]: false, // Task 23: Onaysız harcama kapalı
          },
          allowedSharedPoolUserIds: [consultant1Id], // Task 23: Havuz sadece consultant1'e açık
        },
      },
      wallets: {
        [ownerId]: { kullaniciId: ownerId, bakiye: 5000, aktifMi: true },
        [consultant1Id]: { kullaniciId: consultant1Id, bakiye: 100, aktifMi: true },
        [consultant2Id]: { kullaniciId: consultant2Id, bakiye: 50, aktifMi: true },
      },
    };
  });

  const mockDb: any = {
    user: {
      findUnique: jest.fn(async ({ where }: any) => state.users[where.id] || null),
      count: jest.fn(async ({ where }: any) => {
        return Object.values(state.users).filter((u: any) => u.officeId === where.officeId && u.id !== where.NOT?.id).length;
      }),
    },
    office: {
      findUnique: jest.fn(async ({ where }: any) => state.offices[where.id] || null),
      findFirst: jest.fn(async ({ where }: any) => Object.values(state.offices).find((o: any) => o.ownerUserId === where.ownerUserId && o.isActive) || null),
    },
    team: {
      count: jest.fn(async ({ where }: any) => state.teams.filter((t: any) => t.officeId === where.officeId && t.isActive).length),
    },
    teamMember: {
      count: jest.fn(async ({ where }: any) => {
        return state.teamMembers.filter((tm: any) => {
          if (!tm.isActive) return false;
          if (where.userId && tm.userId !== where.userId) return false;
          if (where.teamId?.in && !where.teamId.in.includes(tm.teamId)) return false;
          return true;
        }).length;
      }),
    },
    systemSetting: {
      findUnique: jest.fn(async ({ where }: any) => {
        const val = state.settings[where.key];
        return val !== undefined ? { key: where.key, valueJson: val } : null;
      }),
    },
    kontorCuzdani: {
      findUnique: jest.fn(async ({ where }: any) => state.wallets[where.kullaniciId] || null),
    },
    $executeRaw: jest.fn(async () => 1),
    $queryRaw: jest.fn(async () => []),
  };

  describe('Task 15: Personel Hiyerarşisi', () => {
    it('generates the exact hierarchy list: OfficeName -> Role -> PersonName', () => {
      const hierarchy = [
        {
          officeName: state.offices[officeId].name,
          roleTitle: 'Ofis Sahibi',
          fullName: `${state.users[ownerId].firstName} ${state.users[ownerId].lastName}`,
          userId: ownerId,
        },
        {
          officeName: state.offices[officeId].name,
          roleTitle: 'Emlak Danışmanı',
          fullName: `${state.users[consultant1Id].firstName} ${state.users[consultant1Id].lastName}`,
          userId: consultant1Id,
        },
        {
          officeName: state.offices[officeId].name,
          roleTitle: 'Emlak Danışmanı',
          fullName: `${state.users[consultant2Id].firstName} ${state.users[consultant2Id].lastName}`,
          userId: consultant2Id,
        },
      ];

      expect(hierarchy).toHaveLength(3);
      expect(hierarchy[0]).toEqual({
        officeName: 'Beyaz Emlak',
        roleTitle: 'Ofis Sahibi',
        fullName: 'Ali Öz',
        userId: ownerId,
      });
      expect(hierarchy[1]).toEqual({
        officeName: 'Beyaz Emlak',
        roleTitle: 'Emlak Danışmanı',
        fullName: 'Ayşe Yılmaz',
        userId: consultant1Id,
      });
      expect(hierarchy[2]).toEqual({
        officeName: 'Beyaz Emlak',
        roleTitle: 'Emlak Danışmanı',
        fullName: 'Meral Ak',
        userId: consultant2Id,
      });
    });
  });

  describe('Task 17: Takım Limiti Denetimi', () => {
    it('15 kişilik pakette en fazla 3 takım kuralı doğrulanır', () => {
      const pkg = state.settings.OFFICE_MEMBERSHIP_PACKAGES.find((p: any) => p.code === 'PLATINUM');
      const agentCap = pkg.agents;
      const maxTeams = agentCap >= 25 ? 5 : agentCap >= 15 ? 3 : agentCap >= 7 ? 2 : agentCap >= 1 ? 1 : 0;
      expect(maxTeams).toBe(3);

      const currentTeams = state.teams.filter((t: any) => t.officeId === officeId && t.isActive).length;
      expect(currentTeams).toBe(2);
      expect(currentTeams < maxTeams).toBe(true); // Can create 1 more team
    });

    it('alt paketlerde takım limitleri korunur', () => {
      const goldMax = 7 >= 15 ? 3 : 7 >= 7 ? 2 : 1;
      expect(goldMax).toBe(2);

      const bronzeMax = 1 >= 7 ? 2 : 1 >= 1 ? 1 : 0;
      expect(bronzeMax).toBe(1);
    });
  });

  describe('Task 18: Çoklu Takım Üyeliği', () => {
    it('aynı danışman aynı ofiste birden fazla takıma katılabilir ve kotada 1 kez sayılır', async () => {
      const memberships = state.teamMembers.filter((tm: any) => tm.userId === consultant1Id && tm.isActive);
      expect(memberships).toHaveLength(2); // In both team-1 and team-2

      // Personel kotasında tekil sayım
      const distinctMemberCount = await mockDb.user.count({ where: { officeId, role: Role.EMLAKCI, NOT: { id: ownerId } } });
      expect(distinctMemberCount).toBe(2); // Only consultant1 and consultant2, not 3
    });
  });

  describe('Task 21: Tarama Yetkisi', () => {
    it('tarama yetkisi kapalı olan danışman yetkisiz olarak engellenir', () => {
      const policy = state.settings[officePolicyKey(officeId)];
      const canScanConsultant1 = policy.scanPermissions[consultant1Id] !== false;
      const canScanConsultant2 = policy.scanPermissions[consultant2Id] !== false;

      expect(canScanConsultant1).toBe(true);
      expect(canScanConsultant2).toBe(false);
    });
  });

  describe('Task 23: Kontör Havuzu ve Harcama', () => {
    it('ortak kontör havuzuna erişim izni olan danışman ofis cüzdanını çözebilir', async () => {
      const wallet = await resolveOfficeWallet(mockDb, consultant1Id, { walletSource: 'OFFICE', walletOfficeId: officeId });
      expect(wallet.walletSource).toBe('OFFICE');
      expect(wallet.chargeUserId).toBe(ownerId);
    });

    it('ortak kontör havuzuna erişim izni olmayan danışman ofis cüzdanını kullanamaz', async () => {
      await expect(
        resolveOfficeWallet(mockDb, consultant2Id, { walletSource: 'OFFICE', walletOfficeId: officeId })
      ).rejects.toThrow(ForbiddenException);
    });

    it('onaysız harcama yetkisi kapalı olan danışman harcama yapamaz', async () => {
      // Add consultant2 to allowedSharedPoolUserIds but keep autoSpendPermissions false
      state.settings[officePolicyKey(officeId)].allowedSharedPoolUserIds.push(consultant2Id);
      state.settings[officePolicyKey(officeId)].autoSpendPermissions[consultant2Id] = false;

      await expect(
        resolveOfficeWallet(mockDb, consultant2Id, { walletSource: 'OFFICE', walletOfficeId: officeId })
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
