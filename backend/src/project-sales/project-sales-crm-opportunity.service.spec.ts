import { ForbiddenException } from '@nestjs/common';
import {
  CustomerInterestPriority,
  CustomerPurchaseIntent,
  CustomerStatus,
  Role,
  UnitStatus,
  UnitType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectSalesCrmOpportunityService } from './project-sales-crm-opportunity.service';

describe('ProjectSalesCrmOpportunityService', () => {
  const projectId = 'project-1';
  const ownerId = 'owner-1';

  const buildProject = (overrides: Record<string, unknown> = {}) => ({
    id: projectId,
    ownerId,
    name: 'EPH Residence',
    code: 'EPH-001',
    city: 'Denizli',
    district: 'Pamukkale',
    neighborhood: 'Kınıklı',
    isActive: true,
    ...overrides,
  });

  const buildUnit = (overrides: Record<string, unknown> = {}) => ({
    id: 'unit-1',
    blockId: 'block-a',
    floorId: 'floor-1',
    inventoryCode: 'A-101',
    type: UnitType.DAIRE,
    status: UnitStatus.SATILIK,
    floor: 1,
    floorLabel: '1. Kat',
    number: '101',
    roomCount: '3+1',
    conceptLabel: null,
    area: 140,
    netArea: 125,
    grossArea: 140,
    facades: ['GUNEY'],
    price: 6_000_000,
    priceCurrency: 'TRY',
    features: ['Otopark', 'Asansör'],
    deliveryDate: null,
    updatedAt: new Date('2026-09-14T12:00:00.000Z'),
    block: {
      id: 'block-a',
      code: 'A',
      name: 'A Blok',
    },
    projectFloor: {
      id: 'floor-1',
      level: 1,
      label: '1. Kat',
    },
    images: [{ url: 'https://example.com/cover.jpg' }],
    ...overrides,
  });

  const buildInterest = (overrides: Record<string, unknown> = {}) => ({
    id: 'interest-1',
    customerId: 'customer-1',
    title: 'Pamukkale 3+1 arıyorum',
    city: 'Denizli',
    district: 'Pamukkale',
    neighborhood: 'Kınıklı',
    propertyTypes: [UnitType.DAIRE],
    statuses: [UnitStatus.SATILIK],
    minBudget: 4_000_000,
    maxBudget: 6_500_000,
    priceCurrency: 'TRY',
    minArea: 110,
    maxArea: 160,
    roomCounts: ['3+1'],
    features: ['Otopark'],
    purchaseIntent: CustomerPurchaseIntent.SATIN_ALMA,
    priority: CustomerInterestPriority.YUKSEK,
    notes: null,
    isActive: true,
    lastMatchedAt: null,
    createdAt: new Date('2026-09-10T12:00:00.000Z'),
    updatedAt: new Date('2026-09-14T12:00:00.000Z'),
    customer: {
      id: 'customer-1',
      firstName: 'Ayşe',
      lastName: 'Yılmaz',
      phone: '05550000000',
      email: 'ayse@example.com',
      company: null,
      status: CustomerStatus.AKTIF,
    },
    ...overrides,
  });

  const createService = ({
    project = buildProject(),
    units = [buildUnit()],
    interests = [buildInterest()],
  }: {
    project?: ReturnType<typeof buildProject> | null;
    units?: ReturnType<typeof buildUnit>[];
    interests?: ReturnType<typeof buildInterest>[];
  } = {}) => {
    const prisma = {
      project: {
        findUnique: jest.fn().mockResolvedValue(project),
      },
      unit: {
        findMany: jest.fn().mockResolvedValue(units),
      },
      customerInterest: {
        findMany: jest.fn().mockResolvedValue(interests),
      },
    };

    return {
      service: new ProjectSalesCrmOpportunityService(
        prisma as unknown as PrismaService,
      ),
      prisma,
    };
  };

  it('Havuzda yayınlanmamış proje stokunu kendi CRM alıcısıyla eşleştirir', async () => {
    const { service } = createService();

    const result = await service.getProjectOpportunities(
      projectId,
      ownerId,
      Role.MUTEAHHIT,
    );

    expect(result.summary.matchedPairCount).toBe(1);
    expect(result.summary.matchedUnitCount).toBe(1);
    expect(result.summary.matchedCustomerCount).toBe(1);
    expect(result.opportunities[0].customer.fullName).toBe('Ayşe Yılmaz');
    expect(result.opportunities[0].unit.inventoryCode).toBe('A-101');
    expect(result.opportunities[0].matchScore).toBeGreaterThanOrEqual(90);
    expect(result.opportunities[0].matchReasons).toContain(
      'Hedef mahalle ile aynı konum',
    );
    expect(result.unitRadar[0].opportunityCount).toBe(1);
    expect(result.policy.usesPrivateProjectInventory).toBe(true);
  });

  it('başka kullanıcının proje CRM fırsatlarını görmesini engeller', async () => {
    const { service } = createService();

    await expect(
      service.getProjectOpportunities(
        projectId,
        'other-user',
        Role.MUTEAHHIT,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('mülk tipi uyuşmayan CRM talebini fırsat olarak döndürmez', async () => {
    const { service } = createService({
      interests: [
        buildInterest({
          propertyTypes: [UnitType.VILLA],
        }),
      ],
    });

    const result = await service.getProjectOpportunities(
      projectId,
      ownerId,
      Role.INSAAT_FIRMASI,
    );

    expect(result.opportunities).toEqual([]);
    expect(result.summary.unitsWithoutBuyerMatchCount).toBe(1);
  });

  it('konutta %30 pazarlık bantları kesişmiyorsa eşleşme üretmez', async () => {
    const { service } = createService({
      units: [buildUnit({ price: 10_000_000 })],
      interests: [
        buildInterest({
          minBudget: null,
          maxBudget: 5_000_000,
          minArea: null,
          maxArea: null,
          roomCounts: [],
          features: [],
        }),
      ],
    });

    const result = await service.getProjectOpportunities(
      projectId,
      ownerId,
      Role.MUTEAHHIT,
    );

    expect(result.opportunities).toEqual([]);
    expect(result.summary.matchedPairCount).toBe(0);
  });

  it('para birimi farklı CRM talebini fiyat fırsatı olarak eşleştirmez', async () => {
    const { service } = createService({
      interests: [buildInterest({ priceCurrency: 'USD' })],
    });

    const result = await service.getProjectOpportunities(
      projectId,
      ownerId,
      Role.MUTEAHHIT,
    );

    expect(result.opportunities).toEqual([]);
  });

  it('SUPER_ADMIN erişiminde de yalnız proje sahibinin CRM kayıtlarını sorgular', async () => {
    const { service, prisma } = createService();

    await service.getProjectOpportunities(
      projectId,
      'super-admin-user',
      Role.SUPER_ADMIN,
    );

    expect(prisma.customerInterest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          customer: expect.objectContaining({
            ownerId,
          }),
        }),
      }),
    );
  });

  it('limit değerini 500 ile sınırlar', async () => {
    const interests = Array.from({ length: 2 }, (_, index) =>
      buildInterest({
        id: `interest-${index + 1}`,
        customer: {
          ...buildInterest().customer,
          id: `customer-${index + 1}`,
        },
      }),
    );
    const { service } = createService({ interests });

    const result = await service.getProjectOpportunities(
      projectId,
      ownerId,
      Role.MUTEAHHIT,
      '9999',
    );

    expect(result.opportunities).toHaveLength(2);
    expect(result.policy.maxLimit).toBe(500);
  });
});
