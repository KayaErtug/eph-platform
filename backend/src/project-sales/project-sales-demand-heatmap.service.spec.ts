import { NetworkVisibility } from '@prisma/client';
import { ProjectSalesDemandHeatmapService } from './project-sales-demand-heatmap.service';

describe('ProjectSalesDemandHeatmapService', () => {
  const networkPostFindMany = jest.fn();
  const prisma = {
    networkPost: {
      findMany: networkPostFindMany,
    },
  } as any;

  const service = new ProjectSalesDemandHeatmapService(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Talep Merkezi verisini kimlik açmadan toplulaştırır', async () => {
    const now = new Date();
    networkPostFindMany.mockResolvedValue([
      demand('1', now, {
        areas: [area('Denizli', 'Pamukkale', 'Kınıklı')],
        propertyTypes: ['DAIRE'],
        roomCounts: ['2+1'],
        minBudget: 4_000_000,
        maxBudget: 5_000_000,
        minArea: 90,
        maxArea: 110,
      }),
      demand('2', now, {
        areas: [area('Denizli', 'Pamukkale', 'Kınıklı')],
        propertyTypes: ['DAIRE'],
        roomCounts: ['2+1'],
        minBudget: 4_500_000,
        maxBudget: 5_500_000,
        minArea: 95,
        maxArea: 115,
      }),
      demand('3', now, {
        areas: [area('Denizli', 'Pamukkale', 'Kınıklı')],
        propertyTypes: ['DAIRE'],
        roomCounts: ['3+1'],
        minBudget: 5_000_000,
        maxBudget: 6_000_000,
        minArea: 120,
        maxArea: 140,
      }),
      demand('4', now, {
        areas: [area('Denizli', 'Merkezefendi', 'Yenişehir')],
        propertyTypes: ['VILLA'],
        roomCounts: ['4+1'],
        minBudget: 12_000_000,
        maxBudget: 15_000_000,
        minArea: 220,
        maxArea: 260,
      }),
    ]);

    const result = await service.getHeatmap({ days: '30' });

    expect(networkPostFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          type: 'PORTFOY_ARIYORUM',
          isActive: true,
          visibility: {
            in: [
              NetworkVisibility.TUM_EPH,
              NetworkVisibility.SADECE_MUTEAHHITLER,
            ],
          },
        }),
      }),
    );
    expect(result.summary.activeRequestCount).toBe(4);
    expect(result.summary.saleRequestCount).toBe(4);
    expect(result.locations.cities[0]).toEqual(
      expect.objectContaining({ key: 'Denizli', count: 4, demandScore: 100 }),
    );
    expect(result.locations.neighborhoods).toHaveLength(1);
    expect(result.locations.neighborhoods[0]).toEqual(
      expect.objectContaining({
        key: 'Denizli / Pamukkale / Kınıklı',
        count: 3,
      }),
    );
    expect(result.propertyTypes[0]).toEqual(
      expect.objectContaining({ key: 'DAIRE', count: 3 }),
    );
    expect(result.budgetByCurrency[0]).toEqual(
      expect.objectContaining({ currency: 'TRY', sampleCount: 4 }),
    );
    expect(result.privacy).toEqual(
      expect.objectContaining({
        identityFieldsIncluded: false,
        phoneOrEmailIncluded: false,
        aggregateOnly: true,
      }),
    );
  });

  it('şehir ve ilçe filtresini çoklu konum alanından uygular', async () => {
    const now = new Date();
    networkPostFindMany.mockResolvedValue([
      demand('1', now, {
        areas: [
          area('İzmir', 'Çeşme', 'Alaçatı'),
          area('Denizli', 'Pamukkale', 'Kınıklı'),
        ],
      }),
      demand('2', now, {
        areas: [area('Denizli', 'Merkezefendi', 'Servergazi')],
      }),
    ]);

    const result = await service.getHeatmap({
      city: 'Denizli',
      district: 'Pamukkale',
      days: '999',
    });

    expect(result.period.days).toBe(90);
    expect(result.summary.activeRequestCount).toBe(1);
    expect(result.filters).toEqual({ city: 'Denizli', district: 'Pamukkale' });
  });

  it('üç kayıttan az sayısal örnekte hassas istatistik üretmez', async () => {
    const now = new Date();
    networkPostFindMany.mockResolvedValue([
      demand('1', now, { minBudget: 1_000_000, maxBudget: 2_000_000 }),
      demand('2', now, { minBudget: 2_000_000, maxBudget: 3_000_000 }),
    ]);

    const result = await service.getHeatmap({});

    expect(result.budgetByCurrency).toHaveLength(0);
    expect(result.area).toEqual({
      sampleCount: 0,
      minimum: null,
      median: null,
      average: null,
      maximum: null,
    });
  });
});

function area(city: string, district: string, neighborhood: string) {
  return { city, district, neighborhood };
}

function demand(
  id: string,
  createdAt: Date,
  overrides: Partial<{
    city: string | null;
    district: string | null;
    neighborhood: string | null;
    areas: unknown;
    budget: number | null;
    minBudget: number | null;
    maxBudget: number | null;
    minArea: number | null;
    maxArea: number | null;
    propertyTypes: string[];
    roomCounts: string[];
    priceCurrency: string;
    tags: string[];
  }> = {},
) {
  return {
    id,
    city: null,
    district: null,
    neighborhood: null,
    areas: [area('Denizli', 'Pamukkale', 'Kınıklı')],
    budget: null,
    minBudget: null,
    maxBudget: null,
    minArea: null,
    maxArea: null,
    propertyTypes: ['DAIRE'],
    roomCounts: ['2+1'],
    priceCurrency: 'TRY',
    tags: ['Talep Türü:PORTFOY_SATILIK'],
    createdAt,
    ...overrides,
  };
}
