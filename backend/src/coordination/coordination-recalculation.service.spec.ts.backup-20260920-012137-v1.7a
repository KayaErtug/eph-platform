import { Role } from '@prisma/client';

import { CoordinationRecalculationService } from './coordination-recalculation.service';

describe('CoordinationRecalculationService', () => {
  const now = new Date('2026-08-02T05:00:00.000Z');

  function createService() {
    const prisma = {
      customerInterest: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
      customerProperty: {
        findMany: jest.fn(),
      },
      networkPost: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
      linaBildirim: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      unit: {
        findMany: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
      },
    };
    const crmService = {
      getCustomerInterestMatches: jest.fn(),
    };

    return {
      service: new CoordinationRecalculationService(
        prisma as any,
        crmService as any,
      ),
      prisma,
      crmService,
    };
  }

  it('returns Lina warnings for stale CRM and request records', async () => {
    const { service, prisma } = createService();

    prisma.customerInterest.findMany.mockResolvedValue([
      {
        id: 'interest-1',
        title: 'Merkezefendi 3+1',
        updatedAt: now,
        lastMatchedAt: null,
        customer: {
          id: 'customer-1',
          firstName: 'Ayşe',
          lastName: 'Hanım',
        },
      },
    ]);
    prisma.customerProperty.findMany.mockResolvedValue([]);
    prisma.networkPost.findMany.mockResolvedValue([
      {
        id: 'post-1',
        title: 'Pamukkale ticari arsa',
        updatedAt: now,
      },
    ]);
    prisma.linaBildirim.findMany.mockResolvedValue([]);

    const result = await service.getAlerts({
      id: 'user-1',
      role: Role.EMLAKCI,
    });

    expect(result.count).toBe(2);
    expect(result.alerts.map((item) => item.type)).toEqual(
      expect.arrayContaining([
        'CRM_INTEREST_STALE',
        'REQUEST_POST_STALE',
      ]),
    );
  });

  it('recalculates a request against the users own portfolio', async () => {
    const { service, prisma } = createService();

    prisma.networkPost.findFirst.mockResolvedValue({
      id: 'post-1',
      userId: 'other-user',
      title: 'Denizli 3+1 aranıyor',
      city: 'Denizli',
      district: 'Merkezefendi',
      neighborhood: null,
      areas: [
        {
          city: 'Denizli',
          district: 'Merkezefendi',
          neighborhood: '',
        },
      ],
      propertyTypes: ['DAIRE'],
      tags: ['Talep Türü:PORTFOY_SATILIK'],
      minBudget: 5_000_000,
      maxBudget: 6_000_000,
      budget: null,
      minArea: 100,
      maxArea: 160,
      roomCounts: ['3+1'],
      features: ['Asansör'],
      updatedAt: now,
    });
    prisma.unit.findMany.mockResolvedValue([
      {
        id: 'unit-1',
        type: 'DAIRE',
        status: 'SATILIK',
        price: 5_750_000,
        area: 130,
        grossArea: 140,
        netArea: 115,
        roomCount: '3+1',
        features: ['Asansör', 'Kapalı Otopark'],
        updatedAt: now,
        project: {
          name: 'EPH Proje',
          city: 'Denizli',
          district: 'Merkezefendi',
          address: 'Yenişehir Mahallesi',
          mapAddress: null,
        },
        images: [{ url: 'cover.jpg' }],
      },
    ]);
    prisma.linaBildirim.findFirst.mockResolvedValue(null);
    prisma.linaBildirim.create.mockResolvedValue({ id: 'notification-1' });

    const result = await service.recalculateRequestPortfolioMatches(
      'post-1',
      {
        id: 'user-1',
        role: Role.EMLAKCI,
      },
    );

    expect(result.matches).toHaveLength(1);
    expect(result.matches[0].unitId).toBe('unit-1');
    expect(result.matches[0].matchScore).toBeGreaterThanOrEqual(70);
    expect(prisma.linaBildirim.create).toHaveBeenCalledTimes(1);
  });
});
