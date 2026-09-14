import { PortfolioApprovalStatus, UnitStatus, UnitType } from '@prisma/client';
import { ProjectSalesAgentChannelService } from './project-sales-agent-channel.service';

describe('ProjectSalesAgentChannelService', () => {
  const unitFindMany = jest.fn();
  const interestFindMany = jest.fn();
  const prisma = {
    unit: { findMany: unitFindMany },
    customerInterest: { findMany: interestFindMany },
  } as any;

  const service = new ProjectSalesAgentChannelService(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
    unitFindMany.mockResolvedValue([channelUnit()]);
    interestFindMany.mockResolvedValue([matchingInterest()]);
  });

  it('yalnız havuzda görünür proje stoklarını ve mahremiyetli CRM ipucunu döndürür', async () => {
    const result = await service.listChannel('agent-1', {
      city: 'Denizli',
      district: 'Pamukkale',
    });

    expect(unitFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          isSalesInventory: true,
          isPoolVisible: true,
          approvalStatus: PortfolioApprovalStatus.HAVUZDA,
          isOffMarket: false,
        }),
      }),
    );
    expect(interestFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          isActive: true,
          customer: { ownerId: 'agent-1' },
        },
      }),
    );
    expect(result.summary.visibleUnitCount).toBe(1);
    expect(result.items[0].crmHint.directMatchCount).toBe(1);
    expect(result.privacy).toEqual(
      expect.objectContaining({
        projectOwnerIdentityIncluded: false,
        projectOwnerContactIncluded: false,
        fullAddressIncluded: false,
        privateCustomerDataIncluded: false,
      }),
    );
  });

  it('bütçe dışındaki stokta doğrudan CRM eşleşmesi üretmez', async () => {
    interestFindMany.mockResolvedValue([
      matchingInterest({ maxBudget: 2_000_000 }),
    ]);

    const result = await service.listChannel('agent-1', {});

    expect(result.items[0].crmHint.directMatchCount).toBe(0);
    expect(result.summary.unitsWithDirectCrmMatch).toBe(0);
  });

  it('farklı şehirdeki CRM talebini eşleştirmez', async () => {
    interestFindMany.mockResolvedValue([
      matchingInterest({ city: 'İzmir', district: 'Çeşme' }),
    ]);

    const result = await service.listChannel('agent-1', {});

    expect(result.items[0].crmHint.directMatchCount).toBe(0);
  });

  it('limit değerini güvenli üst sınıra çeker', async () => {
    await service.listChannel('agent-1', { limit: '9999' });

    expect(unitFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 200 }),
    );
  });
});

function channelUnit() {
  return {
    id: 'unit-1',
    inventoryCode: 'A-01',
    type: UnitType.DAIRE,
    status: UnitStatus.SATILIK,
    roomCount: '2+1',
    conceptLabel: null,
    area: 100,
    netArea: 90,
    grossArea: 110,
    floor: 1,
    floorLabel: '1. Kat',
    totalFloors: 5,
    facades: ['GUNEY'],
    features: ['OTOPARK'],
    price: 5_000_000,
    priceCurrency: 'TRY',
    deliveryDate: null,
    poolPublishedAt: new Date(),
    updatedAt: new Date(),
    block: { code: 'A', name: 'A Blok' },
    images: [{ url: 'https://image.example/cover.jpg' }],
    mediaPackage: null,
    project: {
      id: 'project-1',
      name: 'Deneme Projesi',
      code: 'DENEME-01',
      lifecycleStage: null,
      city: 'Denizli',
      district: 'Pamukkale',
      neighborhood: 'Kınıklı',
      completionPercent: 100,
      defaultDeliveryDate: null,
    },
  };
}

function matchingInterest(
  overrides: Partial<{
    city: string | null;
    district: string | null;
    maxBudget: number | null;
  }> = {},
) {
  return {
    id: 'interest-1',
    city: 'Denizli',
    district: 'Pamukkale',
    neighborhood: null,
    propertyTypes: [UnitType.DAIRE],
    statuses: [UnitStatus.SATILIK],
    minBudget: 4_000_000,
    maxBudget: 6_000_000,
    priceCurrency: 'TRY',
    minArea: 80,
    maxArea: 120,
    roomCounts: ['2+1'],
    priority: 'NORMAL',
    purchaseIntent: 'SATIN_ALMA',
    ...overrides,
  };
}
