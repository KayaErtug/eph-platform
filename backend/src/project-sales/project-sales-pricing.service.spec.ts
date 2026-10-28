import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Role, UnitStatus, UnitType } from '@prisma/client';
import { ProjectSalesPricingService } from './project-sales-pricing.service';

describe('ProjectSalesPricingService', () => {
  const projectId = 'project-1';
  const ownerId = 'owner-1';
  const updatedAt = new Date('2026-09-14T12:00:00.000Z');

  const buildUnit = (overrides: Record<string, unknown> = {}) => ({
    id: 'unit-1',
    inventoryCode: 'A-101',
    blockId: 'block-a',
    floorId: 'floor-1',
    roomCount: '3+1',
    type: UnitType.DAIRE,
    status: UnitStatus.SATILIK,
    price: 10_000_000,
    priceCurrency: 'TRY',
    updatedAt,
    ...overrides,
  });

  const createService = (units: any[] = [buildUnit()]) => {
    const transactionUnit = {
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    };

    const prisma = {
      project: {
        findUnique: jest.fn().mockResolvedValue({
          id: projectId,
          ownerId,
        }),
      },
      unit: {
        findMany: jest.fn().mockResolvedValue(units),
      },
      $transaction: jest.fn(async (callback: any) =>
        callback({ unit: transactionUnit }),
      ),
    } as any;

    return {
      service: new ProjectSalesPricingService(prisma),
      prisma,
      transactionUnit,
    };
  };

  it('yüzdesel zam önizlemesini üretir ve kilitli stoku atlar', async () => {
    const units = [
      buildUnit(),
      buildUnit({
        id: 'unit-2',
        inventoryCode: 'A-102',
        price: 8_000_000,
      }),
      buildUnit({
        id: 'unit-3',
        inventoryCode: 'A-103',
        status: UnitStatus.SATILDI,
        price: 9_000_000,
      }),
    ];
    const { service } = createService(units);

    const result = await service.previewBulkPricing(
      projectId,
      ownerId,
      Role.MUTEAHHIT,
      {
        selection: {
          blockId: 'block-a',
          roomCount: '3+1',
        },
        adjustment: {
          mode: 'PERCENT',
          direction: 'INCREASE',
          value: 5,
        },
      },
    );

    expect(result.selectedUnitCount).toBe(3);
    expect(result.editableUnitCount).toBe(2);
    expect(result.skippedLockedUnitCount).toBe(1);
    expect(result.previousTotal).toBe(18_000_000);
    expect(result.newTotal).toBe(18_900_000);
    expect(result.units[0].nextPrice).toBe(10_500_000);
    expect(result.previewHash).toHaveLength(64);
    expect(result.confirmationRequired).toBe('FIYATLARI_GUNCELLE');
  });

  it('önizleme hash ile toplu fiyat güncellemesini transaction içinde uygular', async () => {
    const { service, transactionUnit } = createService();
    const body = {
      selection: { unitIds: ['unit-1'] },
      adjustment: {
        mode: 'FIXED',
        direction: 'INCREASE',
        value: 750_000,
      },
    };

    const preview = await service.previewBulkPricing(
      projectId,
      ownerId,
      Role.INSAAT_FIRMASI,
      body,
    );

    const result = await service.applyBulkPricing(
      projectId,
      ownerId,
      Role.INSAAT_FIRMASI,
      {
        ...body,
        previewHash: preview.previewHash,
        confirmation: 'FIYATLARI_GUNCELLE',
      },
    );

    expect(result.applied).toBe(true);
    expect(result.updatedUnitCount).toBe(1);
    expect(result.previousTotal).toBe(10_000_000);
    expect(result.newTotal).toBe(10_750_000);
    expect(transactionUnit.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'unit-1',
        projectId,
        updatedAt,
      },
      data: {
        price: 10_750_000,
      },
    });
  });

  it('başka kullanıcının projesinde toplu fiyat işlemini engeller', async () => {
    const { service } = createService();

    await expect(
      service.previewBulkPricing(
        projectId,
        'other-user',
        Role.MUTEAHHIT,
        {
          adjustment: {
            mode: 'PERCENT',
            direction: 'INCREASE',
            value: 5,
          },
        },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('sabit tutarı farklı para birimlerine aynı anda uygulamaz', async () => {
    const { service } = createService([
      buildUnit(),
      buildUnit({
        id: 'unit-2',
        priceCurrency: 'USD',
      }),
    ]);

    await expect(
      service.previewBulkPricing(
        projectId,
        ownerId,
        Role.MUTEAHHIT,
        {
          adjustment: {
            mode: 'FIXED',
            direction: 'INCREASE',
            value: 100_000,
          },
        },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
