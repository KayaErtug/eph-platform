import { BadRequestException } from '@nestjs/common';
import { Role, UnitStatus, UnitType } from '@prisma/client';
import { ProjectSalesOfferService } from './project-sales-offer.service';

describe('ProjectSalesOfferService', () => {
  const unitFindUnique = jest.fn();
  const customerFindUnique = jest.fn();
  const prisma = {
    unit: { findUnique: unitFindUnique },
    customer: { findUnique: customerFindUnique },
  } as any;

  const service = new ProjectSalesOfferService(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
    unitFindUnique.mockResolvedValue(unit());
  });

  it('peşinat + faizli taksit planını üretir ve toplamları dengeler', async () => {
    const result = await service.previewOffer(
      'unit-1',
      'owner-1',
      Role.MUTEAHHIT,
      {
        offerPrice: 9_000_000,
        downPayment: { mode: 'PERCENT', value: 30 },
        installmentCount: 24,
        annualRatePercent: 24,
        balloonPayment: 900_000,
        firstInstallmentDate: '2026-10-15T00:00:00.000Z',
      },
    );

    expect(result.pricing).toEqual(
      expect.objectContaining({
        listPrice: 10_000_000,
        offerPrice: 9_000_000,
        listDifference: -1_000_000,
        listDifferencePercent: -10,
        currency: 'TRY',
      }),
    );
    expect(result.paymentPlan.downPayment.amount).toBe(2_700_000);
    expect(result.paymentPlan.financedPrincipal).toBe(5_400_000);
    expect(result.paymentPlan.installmentCount).toBe(24);
    expect(result.paymentPlan.schedule).toHaveLength(24);
    expect(result.paymentPlan.totalPayable).toBeGreaterThan(9_000_000);
    expect(result.paymentPlan.schedule[23].remainingPrincipal).toBe(0);
    expect(result.offerReference).toMatch(/^EPH-OF-[A-F0-9]{12}$/);
  });

  it('faizsiz planda anapara taksitlerini doğru dağıtır', async () => {
    const result = await service.previewOffer(
      'unit-1',
      'owner-1',
      Role.INSAAT_FIRMASI,
      {
        downPayment: { mode: 'FIXED', value: 4_000_000 },
        installmentCount: 12,
        annualRatePercent: 0,
        firstInstallmentDate: '2026-10-01T00:00:00.000Z',
      },
    );

    expect(result.paymentPlan.financedPrincipal).toBe(6_000_000);
    expect(result.paymentPlan.totalInstallments).toBe(6_000_000);
    expect(result.paymentPlan.financingCost).toBe(0);
    expect(result.paymentPlan.totalPayable).toBe(10_000_000);
  });

  it('peşinat ve balon ödeme toplamı teklif fiyatını aşamaz', async () => {
    await expect(
      service.previewOffer('unit-1', 'owner-1', Role.MUTEAHHIT, {
        offerPrice: 5_000_000,
        downPayment: { mode: 'FIXED', value: 4_500_000 },
        balloonPayment: 1_000_000,
        installmentCount: 12,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('satılmış stok için teklif üretmez', async () => {
    unitFindUnique.mockResolvedValue(unit(UnitStatus.SATILDI));

    await expect(
      service.previewOffer('unit-1', 'owner-1', Role.MUTEAHHIT, {}),
    ).rejects.toThrow(
      'Satılmış, kiralanmış veya pasif bağımsız bölüm için teklif oluşturulamaz.',
    );
  });

  it('SUPER_ADMIN özel CRM müşterisini proje sahibinin teklifiyle ilişkilendiremez', async () => {
    await expect(
      service.previewOffer('unit-1', 'super-admin-1', Role.SUPER_ADMIN, {
        customerId: 'customer-1',
      }),
    ).rejects.toThrow(
      'SUPER_ADMIN özel CRM müşteri kaydını teklife bağlayamaz.',
    );

    expect(customerFindUnique).not.toHaveBeenCalled();
  });
});

function unit(status: UnitStatus = UnitStatus.SATILIK) {
  return {
    id: 'unit-1',
    projectId: 'project-1',
    inventoryCode: 'A-01',
    type: UnitType.DAIRE,
    status,
    roomCount: '2+1',
    floorLabel: '1. Kat',
    number: '1',
    price: 10_000_000,
    priceCurrency: 'TRY',
    project: {
      id: 'project-1',
      ownerId: 'owner-1',
      name: 'Deneme Projesi',
      code: 'DENEME-01',
      city: 'Denizli',
      district: 'Pamukkale',
    },
  };
}
