import { BadRequestException } from '@nestjs/common';
import { ProjectSalesFeasibilityService } from './project-sales-feasibility.service';

describe('ProjectSalesFeasibilityService', () => {
  const service = new ProjectSalesFeasibilityService();

  it('arsa ve finansal varsayımlardan fizibilite üretir', () => {
    const result = service.calculate({
      landArea: 2000,
      floorAreaRatio: 2,
      taksPercent: 40,
      maxFloors: 6,
      commonAreaPercent: 20,
      constructionCostPerM2: 25000,
      salePricePerM2: 60000,
      landCost: 30000000,
      otherCosts: 5000000,
      financingCostPercent: 8,
      marketingCostPercent: 2,
      contingencyPercent: 5,
      unitMix: [
        { label: '2+1', averageGrossArea: 100, sharePercent: 60 },
        { label: '3+1', averageGrossArea: 140, sharePercent: 40 },
      ],
    });

    expect(result.capacity.grossConstructionArea).toBe(4000);
    expect(result.capacity.saleableArea).toBe(3200);
    expect(result.financials.projectedRevenue).toBe(192000000);
    expect(result.financials.totalCost).toBeGreaterThan(100000000);
    expect(result.financials.breakEvenSalePricePerM2).toBeGreaterThan(0);
    expect(result.unitMix).toHaveLength(2);
    expect(result.policy.estimateOnly).toBe(true);
  });

  it('TAKS x kat kapasitesi emsal alanından düşükse kapasiteyi sınırlar', () => {
    const result = service.calculate({
      landArea: 1000,
      floorAreaRatio: 3,
      taksPercent: 20,
      maxFloors: 5,
      constructionCostPerM2: 10000,
      salePricePerM2: 30000,
    });

    expect(result.capacity.zoningGrossArea).toBe(3000);
    expect(result.capacity.floorCapacityGrossArea).toBe(1000);
    expect(result.capacity.grossConstructionArea).toBe(1000);
  });

  it('geçersiz yüzdeyi reddeder', () => {
    expect(() =>
      service.calculate({
        landArea: 1000,
        floorAreaRatio: 2,
        taksPercent: 140,
        maxFloors: 5,
        constructionCostPerM2: 10000,
        salePricePerM2: 30000,
      }),
    ).toThrow(BadRequestException);
  });
});
