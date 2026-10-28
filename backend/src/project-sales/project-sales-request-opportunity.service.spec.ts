import { ForbiddenException } from '@nestjs/common';
import {
  NetworkVisibility,
  Role,
  UnitStatus,
  UnitType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectSalesRequestOpportunityService } from './project-sales-request-opportunity.service';

describe('ProjectSalesRequestOpportunityService', () => {
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

  const buildRequest = (overrides: Record<string, unknown> = {}) => ({
    id: 'request-1',
    type: 'PORTFOY_ARIYORUM',
    title: 'Pamukkale Kınıklı 3+1 satılık daire arıyorum',
    description: 'Hazır müşterim için uygun portföy arıyorum.',
    city: 'Denizli',
    district: 'Pamukkale',
    neighborhood: 'Kınıklı',
    areas: [
      {
        city: 'Denizli',
        district: 'Pamukkale',
        neighborhood: 'Kınıklı',
      },
    ],
    budget: null,
    minArea: 110,
    maxArea: 160,
    minBudget: 4_000_000,
    maxBudget: 6_500_000,
    propertyTypes: [UnitType.DAIRE],
    roomCounts: ['3+1'],
    features: ['Otopark'],
    priceCurrency: 'TRY',
    urgency: 'Yüksek',
    visibility: NetworkVisibility.TUM_EPH,
    tags: ['Portföy Arıyorum', 'Talep Türü:PORTFOY_SATILIK'],
    expiresAt: new Date('2026-09-21T12:00:00.000Z'),
    createdAt: new Date('2026-09-14T12:00:00.000Z'),
    ...overrides,
  });

  const createService = ({
    project = buildProject(),
    units = [buildUnit()],
    requests = [buildRequest()],
  }: {
    project?: ReturnType<typeof buildProject> | null;
    units?: ReturnType<typeof buildUnit>[];
    requests?: ReturnType<typeof buildRequest>[];
  } = {}) => {
    const prisma = {
      project: {
        findUnique: jest.fn().mockResolvedValue(project),
      },
      unit: {
        findMany: jest.fn().mockResolvedValue(units),
      },
      networkPost: {
        findMany: jest.fn().mockResolvedValue(requests),
      },
    };

    return {
      service: new ProjectSalesRequestOpportunityService(
        prisma as unknown as PrismaService,
      ),
      prisma,
    };
  };

  it('Havuzda yayınlanmamış proje stokunu Talep Merkezi satılık talebiyle eşleştirir', async () => {
    const { service } = createService();

    const result = await service.getProjectOpportunities(
      projectId,
      ownerId,
      Role.MUTEAHHIT,
    );

    expect(result.summary.matchedPairCount).toBe(1);
    expect(result.summary.matchedUnitCount).toBe(1);
    expect(result.summary.matchedRequestCount).toBe(1);
    expect(result.opportunities[0].request.id).toBe('request-1');
    expect(result.opportunities[0].unit.inventoryCode).toBe('A-101');
    expect(result.opportunities[0].matchScore).toBeGreaterThanOrEqual(90);
    expect(result.opportunities[0].matchReasons).toContain(
      'Talep edilen mahalle ile aynı konum',
    );
    expect(result.unitRadar[0].opportunityCount).toBe(1);
    expect(result.policy.usesPrivateProjectInventory).toBe(true);
    expect(result.policy.requesterIdentityHidden).toBe(true);
    expect(result.opportunities[0].request).not.toHaveProperty('user');
    expect(result.opportunities[0].request).not.toHaveProperty('userId');
  });

  it('yalnız müteahhide görünür ve tüm EPH taleplerini sorgular, bağlantıya özel talepleri dışarıda bırakır', async () => {
    const { service, prisma } = createService();

    await service.getProjectOpportunities(
      projectId,
      ownerId,
      Role.INSAAT_FIRMASI,
    );

    expect(prisma.networkPost.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          visibility: {
            in: [
              NetworkVisibility.TUM_EPH,
              NetworkVisibility.SADECE_MUTEAHHITLER,
            ],
          },
          userId: { not: ownerId },
        }),
      }),
    );
  });

  it('kiralık talebi satılık bağımsız bölümle eşleştirmez', async () => {
    const { service } = createService({
      requests: [
        buildRequest({
          tags: ['Portföy Arıyorum', 'Talep Türü:PORTFOY_KIRALIK'],
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

  it('mülk tipi uyuşmayan talebi fırsat olarak döndürmez', async () => {
    const { service } = createService({
      requests: [
        buildRequest({
          propertyTypes: [UnitType.VILLA],
        }),
      ],
    });

    const result = await service.getProjectOpportunities(
      projectId,
      ownerId,
      Role.MUTEAHHIT,
    );

    expect(result.opportunities).toEqual([]);
    expect(result.summary.unitsWithoutRequestMatchCount).toBe(1);
  });

  it('para birimi farklı talebi fiyat fırsatı olarak eşleştirmez', async () => {
    const { service } = createService({
      requests: [buildRequest({ priceCurrency: 'USD' })],
    });

    const result = await service.getProjectOpportunities(
      projectId,
      ownerId,
      Role.MUTEAHHIT,
    );

    expect(result.opportunities).toEqual([]);
  });

  it('başka kullanıcının proje fırsatlarını görmesini engeller', async () => {
    const { service } = createService();

    await expect(
      service.getProjectOpportunities(
        projectId,
        'other-user',
        Role.MUTEAHHIT,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('limit değerini 500 ile sınırlar', async () => {
    const { service } = createService();

    const result = await service.getProjectOpportunities(
      projectId,
      ownerId,
      Role.MUTEAHHIT,
      '9999',
    );

    expect(result.policy.maxLimit).toBe(500);
  });
});
