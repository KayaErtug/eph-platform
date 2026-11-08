import { BadRequestException } from '@nestjs/common';
import { SisterDemandsService } from './sister-demands.service';

describe('SisterDemandsService (FAZ 2 Kardeş Ofisler Talep Havuzu)', () => {
  let service: SisterDemandsService;
  let mockPrisma: any;
  let mockLinks: any;
  let mockNotifications: any;
  let state: any;

  beforeEach(() => {
    state = {
      users: {
        ownerA: { id: 'ownerA', role: 'EMLAKCI', officeId: 'officeA', firstName: 'Ahmet', lastName: 'Er', phone: '05551112233' },
        agentA: { id: 'agentA', role: 'EMLAKCI', officeId: 'officeA', firstName: 'Elif', lastName: 'Şimşek', phone: '05551112234' },
        ownerB: { id: 'ownerB', role: 'EMLAKCI', officeId: 'officeB', firstName: 'Mehmet', lastName: 'Ak', phone: '05552223344' },
        superAdmin: { id: 'superAdmin', role: 'SUPER_ADMIN', officeId: null, firstName: 'Mustafa', lastName: 'Abi', phone: '05559998877' },
      },
      offices: {
        officeA: { id: 'officeA', name: 'Elit Gayrimenkul', ownerUserId: 'ownerA', isActive: true, code: 'ELT-1001' },
        officeB: { id: 'officeB', name: 'Poyraz Gayrimenkul', ownerUserId: 'ownerB', isActive: true, code: 'PYR-2002' },
      },
      settings: {
        OFFICE_SUBSCRIPTION_officeA: { packageCode: 'PLATINUM' },
        OFFICE_MEMBERSHIP_PACKAGES: [
          { code: 'PLATINUM', name: 'Ofis Platin', sisterDemandLimit: 15 },
        ],
        COST_SISTER_TALEP_ASIM: { value: 10 },
        LIMIT_OFFICE_SISTER_TALEP_QUOTA: { value: 15 },
      },
      wallets: {
        ownerA: { id: 'wA', kullaniciId: 'ownerA', bakiye: 50, toplamYukleme: 100, toplamHarcama: 50, aktifMi: true },
      },
      quotas: {},
      posts: [],
      movements: [],
    };

    mockPrisma = {
      office: {
        findUnique: jest.fn(async ({ where }) => state.offices[where.id] || null),
      },
      user: {
        findUnique: jest.fn(async ({ where }) => state.users[where.id] || null),
        findMany: jest.fn(async ({ where }) => {
          return Object.values(state.users).filter((u: any) => {
            if (where.officeId && u.officeId === where.officeId) return true;
            if (where.OR) {
              return where.OR.some((cond: any) => {
                if (cond.officeId && u.officeId === cond.officeId) return true;
                if (cond.officeId?.in && cond.officeId.in.includes(u.officeId)) return true;
                if (cond.id && u.id === cond.id) return true;
                if (cond.id?.in && cond.id.in.includes(u.id)) return true;
                return false;
              });
            }
            return false;
          });
        }),
      },
      systemSetting: {
        findUnique: jest.fn(async ({ where }) => {
          const val = state.settings[where.key];
          return val !== undefined ? { key: where.key, valueJson: val } : null;
        }),
      },
      portfolioCreditLot: { findMany: async () => [], update: async () => ({}), create: async () => ({ id: 'lot' }) }, portfolioCreditLotTuketim: { create: async () => ({}), findMany: async () => [], update: async () => ({}) }, kontorCuzdani: {
        findUnique: jest.fn(async ({ where }) => state.wallets[where.kullaniciId] || null),
        create: jest.fn(async ({ data }) => {
          state.wallets[data.kullaniciId] = { ...data, id: 'w_' + data.kullaniciId };
          return state.wallets[data.kullaniciId];
        }),
        update: jest.fn(async ({ where, data }) => {
          const w = state.wallets[where.kullaniciId];
          if (data.bakiye?.decrement) w.bakiye -= data.bakiye.decrement;
          if (data.toplamHarcama?.increment) w.toplamHarcama += data.toplamHarcama.increment;
          return w;
        }),
      },
      kontorHareketi: {
        create: jest.fn(async ({ data }) => {
          const m = { ...data, id: 'mov_' + Date.now() };
          state.movements.push(m);
          return m;
        }),
      },
      kotaKullanimi: {
        findUnique: jest.fn(async ({ where }) => {
          const key = `${where.kullaniciId_kotaKodu_donem_donemBaslangic.kullaniciId}`;
          return state.quotas[key] || null;
        }),
        upsert: jest.fn(async ({ where, create, update }) => {
          const key = `${where.kullaniciId_kotaKodu_donem_donemBaslangic.kullaniciId}`;
          if (!state.quotas[key]) {
            state.quotas[key] = { id: 'q_' + key, ...create };
          } else {
            state.quotas[key] = { ...state.quotas[key], ...update };
          }
          return state.quotas[key];
        }),
        update: jest.fn(async ({ where, data }) => {
          const q = Object.values(state.quotas).find((item: any) => item.id === where.id) as any;
          if (q && data.kullanilan?.increment) {
            q.kullanilan += data.kullanilan.increment;
          }
          return q;
        }),
      },
      networkPost: {
        findUnique: jest.fn(async ({ where }) => state.posts.find((p: any) => p.listingNumber === where.listingNumber) || null),
        findMany: jest.fn(async () => state.posts),
        create: jest.fn(async ({ data, include }) => {
          const p = { ...data, id: data.id || 'np_' + Date.now(), createdAt: new Date() };
          if (include?.User) {
            const uId = data.User?.connect?.id || data.userId;
            p.User = state.users[uId];
          }
          state.posts.push(p);
          return p;
        }),
      },
      $executeRaw: jest.fn(async () => 1),
      $queryRaw: jest.fn(async () => []),
      $transaction: jest.fn(async (cb) => cb(mockPrisma)),
    };

    mockLinks = {
      activePartners: jest.fn(async (officeId: string) => {
        if (officeId === 'officeA') {
          return {
            partners: [{ office: state.offices.officeB, link: { id: 'l1', commissionSplitPct: 50 } }],
            suspended: false,
          };
        }
        return { partners: [], suspended: false };
      }),
    };

    mockNotifications = {
      notify: jest.fn(async () => ({ ok: true })),
    };

    service = new SisterDemandsService(mockPrisma, mockLinks, mockNotifications);
  });

  describe('getQuota', () => {
    it('returns package monthly limit (15) and 0 used initially', async () => {
      const q = await service.getQuota('agentA', 'officeA');
      expect(q.limit).toBe(15);
      expect(q.used).toBe(0);
      expect(q.remaining).toBe(15);
      expect(q.isOverQuota).toBe(false);
      expect(q.overQuotaCost).toBe(10);
      expect(q.officeWalletBalance).toBe(50);
      expect(q.isSuperAdmin).toBe(false);
    });

    it('exempts SUPER_ADMIN from quota limits and over-quota flags (§0)', async () => {
      const q = await service.getQuota('superAdmin', 'officeA');
      expect(q.isSuperAdmin).toBe(true);
      expect(q.isOverQuota).toBe(false);
      expect(q.remaining).toBe(999999);
    });
  });

  describe('create demand within quota', () => {
    it('creates demand without charging PK when under quota', async () => {
      const res = await service.create('agentA', 'officeA', {
        title: 'Acil 3+1 Kadıköy Kiralık Daire Arayışı',
        type: 'KONUT',
        city: 'İstanbul',
        district: 'Kadıköy',
        budget: 45000,
        roomCounts: ['3+1'],
      });

      expect(res.ok).toBe(true);
      expect(res.chargedKontor).toBe(0);
      expect(res.post.title).toBe('Acil 3+1 Kadıköy Kiralık Daire Arayışı');
      expect(res.post.tags).toContain('KARDES_OFISLER');
      expect(state.wallets.ownerA.bakiye).toBe(50); // No deduction
      expect(mockNotifications.notify).toHaveBeenCalledTimes(1);
    });
  });

  describe('create demand over quota', () => {
    it('charges 10 PK from office wallet when quota is exceeded and balance is sufficient', async () => {
      // Simulate quota is already full (15 used)
      state.quotas['ownerA'] = { id: 'q_ownerA', kullaniciId: 'ownerA', kotaKodu: 'OFFICE_SISTER_TALEP', limit: 15, kullanilan: 15 };

      const res = await service.create('agentA', 'officeA', {
        title: '16. Talep - Kotayı Aşan Talep',
        type: 'KONUT',
        city: 'İstanbul',
        district: 'Ataşehir',
        budget: 60000,
      });

      expect(res.ok).toBe(true);
      expect(res.chargedKontor).toBe(10); // 10 PK charged
      expect(state.wallets.ownerA.bakiye).toBe(40); // 50 - 10 = 40 PK
      expect(state.movements.length).toBe(1);
      expect(state.movements[0].miktar).toBe(10);
      expect(state.movements[0].kullaniciId).toBe('ownerA'); // Charged from office owner wallet
    });

    it('rejects with BadRequestException when quota is exceeded and office wallet has insufficient PK', async () => {
      state.quotas['ownerA'] = { id: 'q_ownerA', kullaniciId: 'ownerA', kotaKodu: 'OFFICE_SISTER_TALEP', limit: 15, kullanilan: 15 };
      state.wallets.ownerA.bakiye = 5; // Less than 10 PK

      await expect(
        service.create('agentA', 'officeA', {
          title: 'Yetersiz Bakiyeli Talep',
          type: 'KONUT',
          city: 'İstanbul',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
