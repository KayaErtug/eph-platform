import { BadRequestException, Injectable } from '@nestjs/common';

type UnitMixInput = {
  label?: unknown;
  averageGrossArea?: unknown;
  sharePercent?: unknown;
};

type FeasibilityInput = {
  landArea?: unknown;
  floorAreaRatio?: unknown;
  taksPercent?: unknown;
  maxFloors?: unknown;
  commonAreaPercent?: unknown;
  constructionCostPerM2?: unknown;
  salePricePerM2?: unknown;
  landCost?: unknown;
  otherCosts?: unknown;
  financingCostPercent?: unknown;
  marketingCostPercent?: unknown;
  contingencyPercent?: unknown;
  currency?: unknown;
  unitMix?: unknown;
};

const DEFAULT_COMMON_AREA_PERCENT = 18;
const DEFAULT_CONTINGENCY_PERCENT = 5;
const MAX_UNIT_MIX_ITEMS = 12;

@Injectable()
export class ProjectSalesFeasibilityService {
  calculate(input: FeasibilityInput) {
    const landArea = this.positive(input.landArea, 'landArea');
    const floorAreaRatio = this.positive(input.floorAreaRatio, 'floorAreaRatio');
    const taksPercent = this.percent(input.taksPercent, 'taksPercent', true);
    const maxFloors = this.integer(input.maxFloors, 'maxFloors', 1, 100);
    const commonAreaPercent = this.percent(
      input.commonAreaPercent ?? DEFAULT_COMMON_AREA_PERCENT,
      'commonAreaPercent',
      false,
    );
    const constructionCostPerM2 = this.nonNegative(
      input.constructionCostPerM2,
      'constructionCostPerM2',
    );
    const salePricePerM2 = this.nonNegative(
      input.salePricePerM2,
      'salePricePerM2',
    );
    const landCost = this.nonNegative(input.landCost ?? 0, 'landCost');
    const otherCosts = this.nonNegative(input.otherCosts ?? 0, 'otherCosts');
    const financingCostPercent = this.percent(
      input.financingCostPercent ?? 0,
      'financingCostPercent',
      false,
    );
    const marketingCostPercent = this.percent(
      input.marketingCostPercent ?? 0,
      'marketingCostPercent',
      false,
    );
    const contingencyPercent = this.percent(
      input.contingencyPercent ?? DEFAULT_CONTINGENCY_PERCENT,
      'contingencyPercent',
      false,
    );
    const currency = this.currency(input.currency);
    const unitMix = this.unitMix(input.unitMix);

    const zoningGrossArea = landArea * floorAreaRatio;
    const footprintArea = landArea * (taksPercent / 100);
    const floorCapacityGrossArea = footprintArea * maxFloors;
    const grossConstructionArea = Math.min(zoningGrossArea, floorCapacityGrossArea);
    const saleableArea = grossConstructionArea * (1 - commonAreaPercent / 100);

    const constructionCost = grossConstructionArea * constructionCostPerM2;
    const projectedRevenue = saleableArea * salePricePerM2;
    const financingCost = (constructionCost + landCost + otherCosts) * (financingCostPercent / 100);
    const marketingCost = projectedRevenue * (marketingCostPercent / 100);
    const contingencyCost = constructionCost * (contingencyPercent / 100);
    const totalCost = constructionCost + landCost + otherCosts + financingCost + marketingCost + contingencyCost;
    const grossProfit = projectedRevenue - totalCost;
    const profitMarginPercent = projectedRevenue > 0 ? (grossProfit / projectedRevenue) * 100 : 0;
    const breakEvenSalePricePerM2 = saleableArea > 0 ? totalCost / saleableArea : 0;
    const landSharePercent = totalCost > 0 ? (landCost / totalCost) * 100 : 0;

    const mix = this.calculateUnitMix(unitMix, saleableArea);

    return {
      generatedAt: new Date().toISOString(),
      currency,
      inputs: {
        landArea: this.round(landArea),
        floorAreaRatio: this.round(floorAreaRatio, 3),
        taksPercent: this.round(taksPercent, 2),
        maxFloors,
        commonAreaPercent: this.round(commonAreaPercent, 2),
        constructionCostPerM2: this.roundMoney(constructionCostPerM2),
        salePricePerM2: this.roundMoney(salePricePerM2),
        landCost: this.roundMoney(landCost),
        otherCosts: this.roundMoney(otherCosts),
        financingCostPercent: this.round(financingCostPercent, 2),
        marketingCostPercent: this.round(marketingCostPercent, 2),
        contingencyPercent: this.round(contingencyPercent, 2),
      },
      capacity: {
        zoningGrossArea: this.round(zoningGrossArea),
        footprintArea: this.round(footprintArea),
        floorCapacityGrossArea: this.round(floorCapacityGrossArea),
        grossConstructionArea: this.round(grossConstructionArea),
        saleableArea: this.round(saleableArea),
        estimatedIndependentUnitCount: mix.reduce((sum, item) => sum + item.estimatedUnitCount, 0),
      },
      financials: {
        constructionCost: this.roundMoney(constructionCost),
        landCost: this.roundMoney(landCost),
        otherCosts: this.roundMoney(otherCosts),
        financingCost: this.roundMoney(financingCost),
        marketingCost: this.roundMoney(marketingCost),
        contingencyCost: this.roundMoney(contingencyCost),
        totalCost: this.roundMoney(totalCost),
        projectedRevenue: this.roundMoney(projectedRevenue),
        grossProfit: this.roundMoney(grossProfit),
        profitMarginPercent: this.round(profitMarginPercent, 2),
        breakEvenSalePricePerM2: this.roundMoney(breakEvenSalePricePerM2),
        landSharePercent: this.round(landSharePercent, 2),
      },
      unitMix: mix,
      assessment: this.assessment(profitMarginPercent, projectedRevenue, totalCost),
      policy: {
        version: 'PROJECT_FEASIBILITY_V1',
        estimateOnly: true,
        zoningApprovalIncluded: false,
        appraisalIncluded: false,
        taxLegalAdviceIncluded: false,
        note: 'Bu çalışma karar desteği amaçlı yaklaşık fizibilitedir. İmar durumu, ruhsat, vergi, finansman ve resmi ekspertiz yerine geçmez.',
      },
    };
  }

  private calculateUnitMix(
    items: Array<{ label: string; averageGrossArea: number; sharePercent: number }>,
    saleableArea: number,
  ) {
    if (items.length === 0) return [];

    const totalShare = items.reduce((sum, item) => sum + item.sharePercent, 0);
    return items.map((item) => {
      const normalizedShare = totalShare > 0 ? item.sharePercent / totalShare : 1 / items.length;
      const allocatedArea = saleableArea * normalizedShare;
      const estimatedUnitCount = Math.max(0, Math.floor(allocatedArea / item.averageGrossArea));
      return {
        label: item.label,
        sharePercent: this.round(normalizedShare * 100, 2),
        allocatedSaleableArea: this.round(allocatedArea),
        averageGrossArea: this.round(item.averageGrossArea),
        estimatedUnitCount,
      };
    });
  }

  private unitMix(value: unknown) {
    if (value === undefined || value === null) return [];
    if (!Array.isArray(value)) {
      throw new BadRequestException('unitMix dizi olmalıdır.');
    }
    if (value.length > MAX_UNIT_MIX_ITEMS) {
      throw new BadRequestException(`unitMix en fazla ${MAX_UNIT_MIX_ITEMS} satır olabilir.`);
    }

    const result = (value as UnitMixInput[]).map((item, index) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        throw new BadRequestException(`unitMix[${index}] geçersiz.`);
      }
      const label = String(item.label || '').trim();
      if (!label || label.length > 60) {
        throw new BadRequestException(`unitMix[${index}].label zorunlu ve en fazla 60 karakter olmalıdır.`);
      }
      return {
        label,
        averageGrossArea: this.positive(item.averageGrossArea, `unitMix[${index}].averageGrossArea`),
        sharePercent: this.percent(item.sharePercent, `unitMix[${index}].sharePercent`, true),
      };
    });

    const total = result.reduce((sum, item) => sum + item.sharePercent, 0);
    if (result.length > 0 && total <= 0) {
      throw new BadRequestException('unitMix paylarının toplamı sıfırdan büyük olmalıdır.');
    }
    return result;
  }

  private assessment(margin: number, revenue: number, totalCost: number) {
    if (revenue <= 0) {
      return { level: 'INCOMPLETE', message: 'Satış m² fiyatı girilmeden kârlılık değerlendirilemez.' };
    }
    if (totalCost <= 0) {
      return { level: 'INCOMPLETE', message: 'Maliyet kalemleri girilmeden fizibilite güvenilir değildir.' };
    }
    if (margin < 0) return { level: 'LOSS', message: 'Bu varsayımlarla proje zarar üretiyor.' };
    if (margin < 10) return { level: 'LOW', message: 'Kâr marjı düşük; maliyet ve satış fiyatı hassasiyet analizi önerilir.' };
    if (margin < 20) return { level: 'MODERATE', message: 'Kâr marjı pozitif ancak değişken maliyetlere karşı takip edilmelidir.' };
    return { level: 'STRONG', message: 'Girilen varsayımlarla finansal tampon daha güçlü görünüyor.' };
  }

  private positive(value: unknown, field: string) {
    const number = Number(value);
    if (!Number.isFinite(number) || number <= 0) {
      throw new BadRequestException(`${field} sıfırdan büyük sayı olmalıdır.`);
    }
    return number;
  }

  private nonNegative(value: unknown, field: string) {
    const number = Number(value);
    if (!Number.isFinite(number) || number < 0) {
      throw new BadRequestException(`${field} negatif olamaz.`);
    }
    return number;
  }

  private integer(value: unknown, field: string, min: number, max: number) {
    const number = Number(value);
    if (!Number.isInteger(number) || number < min || number > max) {
      throw new BadRequestException(`${field} ${min}-${max} arasında tam sayı olmalıdır.`);
    }
    return number;
  }

  private percent(value: unknown, field: string, mustBePositive: boolean) {
    const number = Number(value);
    if (!Number.isFinite(number) || number < 0 || number > 100 || (mustBePositive && number <= 0)) {
      throw new BadRequestException(`${field} ${mustBePositive ? '0-100' : '0-100'} aralığında olmalıdır.`);
    }
    return number;
  }

  private currency(value: unknown) {
    const currency = String(value || 'TRY').trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(currency)) {
      throw new BadRequestException('currency üç harfli para birimi kodu olmalıdır.');
    }
    return currency;
  }

  private round(value: number, digits = 2) {
    const scale = 10 ** digits;
    return Math.round((value + Number.EPSILON) * scale) / scale;
  }

  private roundMoney(value: number) {
    return this.round(value, 2);
  }
}
