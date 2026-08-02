import { Role } from '@prisma/client';

import { LinaCoordinationReadToolProviderService } from './lina-coordination-read-tool-provider.service';

describe('LinaCoordinationReadToolProviderService', () => {
  const registryService = {
    registerMany: jest.fn(),
  };

  const prisma = {
    customerInterest: {
      findMany: jest.fn(),
    },
    networkPost: {
      findMany: jest.fn(),
    },
    unit: {
      findMany: jest.fn(),
    },
  };

  const crmService = {
    getCustomerInterestMatches: jest.fn(),
  };

  const service = new LinaCoordinationReadToolProviderService(
    registryService as any,
    prisma as any,
    crmService as any,
  );

  const context = {
    userId: 'user-1',
    role: Role.EMLAKCI,
    sourceModule: 'crm' as const,
    membershipActive: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service.onModuleInit();
  });

  it('CRM, Havuz, Talep Merkezi ve Portföy için dört güvenli okuma aracı kaydeder', () => {
    const registered = registryService.registerMany.mock.calls[0][0];
    const names = registered.map((item: any) => item.definition.name);

    expect(names).toEqual(
      expect.arrayContaining([
        'list_my_crm_interests',
        'find_crm_interest_pool_matches',
        'list_my_request_center_posts',
        'list_my_pool_portfolios',
      ]),
    );
    expect(registered).toHaveLength(4);
    expect(
      registered.every(
        (item: any) => item.definition.riskLevel === 0,
      ),
    ).toBe(true);
  });

  it('CRM talebinin Havuz eşleşmelerini puan sırasını bozmadan sınırlar', async () => {
    crmService.getCustomerInterestMatches.mockResolvedValue([
      { unitId: 'unit-1', matchScore: 95 },
      { unitId: 'unit-2', matchScore: 90 },
      { unitId: 'unit-3', matchScore: 80 },
    ]);

    const registered = registryService.registerMany.mock.calls[0][0];
    const tool = registered.find(
      (item: any) =>
        item.definition.name ===
        'find_crm_interest_pool_matches',
    );

    const result = await tool.handler(
      { interestId: 'interest-1', limit: 2 },
      context,
    );

    expect(crmService.getCustomerInterestMatches).toHaveBeenCalledWith(
      'interest-1',
      'user-1',
      Role.EMLAKCI,
    );
    expect(result.success).toBe(true);
    expect(result.data.items).toEqual([
      { unitId: 'unit-1', matchScore: 95 },
      { unitId: 'unit-2', matchScore: 90 },
    ]);
  });

  it('yalnız oturum sahibinin CRM taleplerini sorgular', async () => {
    prisma.customerInterest.findMany.mockResolvedValue([]);

    const registered = registryService.registerMany.mock.calls[0][0];
    const tool = registered.find(
      (item: any) =>
        item.definition.name === 'list_my_crm_interests',
    );

    await tool.handler({}, context);

    expect(prisma.customerInterest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          isActive: true,
          customer: {
            ownerId: 'user-1',
          },
        },
      }),
    );
  });
});
