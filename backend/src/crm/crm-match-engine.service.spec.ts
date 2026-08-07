import {
  CustomerPurchaseIntent,
  Role,
  UnitStatus,
  UnitType,
} from '@prisma/client';

import { CrmMatchEngineService } from './crm-match-engine.service';

describe('CrmMatchEngineService', () => {
  const userId = 'user-1';
  const interestId = 'interest-1';

  const buildInterest = (overrides: Record<string, unknown> = {}) => ({
    id: interestId,
    customerId: 'customer-1',
    title: 'Antalya konut talebi',
    city: 'Antalya',
    district: 'Konyaaltı',
    neighborhood: 'Hurma Mahallesi',
    propertyTypes: [UnitType.DAIRE],
    statuses: [UnitStatus.SATILIK],
    minBudget: null,
    maxBudget: 5_000_000,
    priceCurrency: 'TRY',
    minArea: null,
    maxArea: null,
    roomCounts: [],
    features: [],
    purchaseIntent: CustomerPurchaseIntent.SATIN_ALMA,
    customer: {
      ownerId: userId,
    },
    ...overrides,
  });

  const buildUnit = (overrides: Record<string, unknown> = {}) => ({
    id: 'unit-1',
    type: UnitType.DAIRE,
    status: UnitStatus.SATILIK,
    price: 9_000_000,
    area: 140,
    roomCount: '3+1',
    features: [],
    isPoolVisible: true,
    poolPublishedAt: new Date(),
    project: {
      name: 'Test Projesi',
      city: 'Antalya',
      district: 'Konyaaltı',
      address: 'Hurma Mahallesi',
      mapAddress: 'Hurma Mahallesi, Konyaaltı, Antalya, Türkiye',
      placeId: null,
      latitude: 36.88,
      longitude: 30.64,
    },
    images: [],
    ...overrides,
  });

  const buildDistanceResult = (straightLineDistanceKm: number) => ({
    success: true,
    straightLine: {
      distanceKm: straightLineDistanceKm,
    },
    driving: {
      available: true,
      distanceKm: straightLineDistanceKm + 0.4,
      durationMinutes: 5,
    },
    comparison: {
      detourFactor: 1.2,
      roadNetworkBarrierSignal: false,
    },
  });

  const createService = ({
    interest = buildInterest(),
    units = [buildUnit()],
    distanceKm = 1,
  }: {
    interest?: any;
    units?: any[];
    distanceKm?: number;
  } = {}) => {
    const prisma = {
      customerInterest: {
        findUnique: jest.fn().mockResolvedValue(interest),
        update: jest.fn().mockResolvedValue({}),
      },
      unit: {
        findMany: jest.fn().mockResolvedValue(units),
      },
    } as any;

    const distanceService = {
      calculate: jest.fn().mockResolvedValue(buildDistanceResult(distanceKm)),
    } as any;

    const propertyCriteriaService = {} as any;

    const service = new CrmMatchEngineService(
      prisma,
      distanceService,
      propertyCriteriaService,
    );

    return { service, prisma, distanceService };
  };

  it('5 milyon bütçeli alıcı ile 9 milyon konutu %30 pazarlık kesişimi varsa eşleştirir', async () => {
    const { service } = createService();

    const result = await service.getCustomerInterestMatches(
      interestId,
      userId,
      Role.EMLAKCI,
    );

    expect(result).toHaveLength(1);
    expect(result[0].priceMatch.declaredMaxBudget).toBe(5_000_000);
    expect(result[0].priceMatch.buyerNegotiationCeiling).toBe(6_500_000);
    expect(result[0].priceMatch.sellerNegotiationFloor).toBe(6_300_000);
    expect(result[0].matchPolicy.priceTolerancePercent).toBe(30);
    expect(result[0].matchReasons).toContain(
      '%30 pazarlık bandında fiyat kesişimi var',
    );
  });

  it('konutta %30 pazarlık bantları kesişmiyorsa portföyü dışarıda bırakır', async () => {
    const { service, distanceService } = createService({
      units: [buildUnit({ price: 9_500_000 })],
    });

    const result = await service.getCustomerInterestMatches(
      interestId,
      userId,
      Role.EMLAKCI,
    );

    expect(result).toEqual([]);
    expect(distanceService.calculate).not.toHaveBeenCalled();
  });

  it('arsa ve tarla grubunda %40 fiyat toleransı uygular', async () => {
    const interest = buildInterest({
      title: 'Antalya arsa talebi',
      propertyTypes: [UnitType.ARSA],
    });
    const unit = buildUnit({
      type: UnitType.ARSA,
      price: 10_000_000,
      roomCount: null,
    });
    const { service } = createService({ interest, units: [unit] });

    const result = await service.getCustomerInterestMatches(
      interestId,
      userId,
      Role.EMLAKCI,
    );

    expect(result).toHaveLength(1);
    expect(result[0].matchPolicy.propertyGroup).toBe('LAND');
    expect(result[0].matchPolicy.priceTolerancePercent).toBe(40);
    expect(result[0].priceMatch.buyerNegotiationCeiling).toBe(7_000_000);
    expect(result[0].priceMatch.sellerNegotiationFloor).toBe(6_000_000);
  });

  it('hedef mahalle merkezinden 5 km üzerindeki portföyü eşleşme dışı bırakır', async () => {
    const { service } = createService({ distanceKm: 5.01 });

    const result = await service.getCustomerInterestMatches(
      interestId,
      userId,
      Role.EMLAKCI,
    );

    expect(result).toEqual([]);
  });

  it('il kesin filtresini uygular', async () => {
    const { service, distanceService } = createService({
      units: [
        buildUnit({
          project: {
            ...buildUnit().project,
            city: 'Muğla',
          },
        }),
      ],
    });

    const result = await service.getCustomerInterestMatches(
      interestId,
      userId,
      Role.EMLAKCI,
    );

    expect(result).toEqual([]);
    expect(distanceService.calculate).not.toHaveBeenCalled();
  });

  it('mülk tipini kesin filtre olarak uygular', async () => {
    const { service, distanceService } = createService({
      units: [buildUnit({ type: UnitType.VILLA })],
    });

    const result = await service.getCustomerInterestMatches(
      interestId,
      userId,
      Role.EMLAKCI,
    );

    expect(result).toEqual([]);
    expect(distanceService.calculate).not.toHaveBeenCalled();
  });
});
