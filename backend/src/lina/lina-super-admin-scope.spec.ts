import { Role } from '@prisma/client';

import { visibleAuthor } from '../content-safety/block-policy';
import { visiblePaidUnits } from '../matching/paid-match-report';
import { LinaKvkkService } from './lina-kvkk.service';
import { LinaCoordinationReadToolProviderService } from './openai-tools/lina-coordination-read-tool-provider.service';

describe('§0 süper admin kapsamı (EPH-87 F01)', () => {
  describe('LinaKvkkService', () => {
    const kvkk = new LinaKvkkService();
    const text = 'Müşteri 0532 123 45 67, ali@ornek.com';

    it('rol verilmezse ve normal rolde telefon/e-posta maskelenir (OpenAI’a giden politika değişmez)', () => {
      for (const options of [undefined, { role: 'EMLAKCI' }]) {
        const result = kvkk.filterText(text, options);
        expect(result.safeText).toContain('[telefon bilgisi gizlendi]');
        expect(result.safeText).toContain('[e-posta bilgisi gizlendi]');
        expect(result.filtered).toBe(true);
      }
    });

    it('SUPER_ADMIN için kullanıcıya dönen metinde maskeleme yapılmaz', () => {
      const result = kvkk.filterText(text, { role: 'SUPER_ADMIN' });
      expect(result.safeText).toBe(text);
      expect(result.filtered).toBe(false);
      expect(result.detectedTypes).toEqual([]);
    });
  });

  describe('engelleme / eşleşme kapsamı', () => {
    it('visibleAuthor SUPER_ADMIN için filtre üretmez, diğerleri için simetrik filtre üretir', () => {
      expect(visibleAuthor('u', 'SUPER_ADMIN')).toEqual({});
      expect(visibleAuthor('u', 'EMLAKCI')).toEqual({
        usersBlocked: { none: { blockedId: 'u' } },
        blockedByUsers: { none: { blockerId: 'u' } },
      });
      expect(visibleAuthor('u')).toHaveProperty('usersBlocked');
    });

    it('visiblePaidUnits SUPER_ADMIN için engelleme ve sahiplik kısıtı koymaz', () => {
      expect(visiblePaidUnits({ id: 'sa', role: Role.SUPER_ADMIN })).toEqual({});
      expect(JSON.stringify(visiblePaidUnits({ id: 'u', role: Role.EMLAKCI }))).toContain('usersBlocked');
    });
  });

  describe('Lina koordinasyon okuma araçları', () => {
    const registry = { registerMany: jest.fn() };
    const prisma = {
      customerInterest: { findMany: jest.fn().mockResolvedValue([]) },
      networkPost: { findMany: jest.fn().mockResolvedValue([]) },
      unit: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const service = new LinaCoordinationReadToolProviderService(registry as any, prisma as any, {} as any);
    const tools = () => Object.fromEntries(registry.registerMany.mock.calls[0][0].map((t: any) => [t.definition.name, t.handler]));
    const ctx = (role: Role) => ({ userId: 'user-1', role, sourceModule: 'crm', membershipActive: true });

    beforeEach(() => {
      jest.clearAllMocks();
      service.onModuleInit();
    });

    it('SUPER_ADMIN için ownerId/userId filtresi uygulanmaz (küresel okuma)', async () => {
      const t = tools();
      await t.list_my_crm_interests({}, ctx(Role.SUPER_ADMIN));
      await t.list_my_request_center_posts({}, ctx(Role.SUPER_ADMIN));
      await t.list_my_pool_portfolios({}, ctx(Role.SUPER_ADMIN));

      expect(prisma.customerInterest.findMany.mock.calls[0][0].where).toEqual({ isActive: true });
      expect(prisma.networkPost.findMany.mock.calls[0][0].where).toEqual({ isActive: true });
      expect(prisma.unit.findMany.mock.calls[0][0].where).toEqual({ isPoolVisible: true, project: { isActive: true } });
    });

    it('diğer rollerde sahiplik filtresi korunur', async () => {
      const t = tools();
      await t.list_my_crm_interests({}, ctx(Role.EMLAKCI));
      await t.list_my_request_center_posts({}, ctx(Role.EMLAKCI));
      await t.list_my_pool_portfolios({}, ctx(Role.EMLAKCI));

      expect(prisma.customerInterest.findMany.mock.calls[0][0].where.customer).toEqual({ ownerId: 'user-1' });
      expect(prisma.networkPost.findMany.mock.calls[0][0].where.userId).toBe('user-1');
      expect(prisma.unit.findMany.mock.calls[0][0].where.project.ownerId).toBe('user-1');
    });
  });
});
