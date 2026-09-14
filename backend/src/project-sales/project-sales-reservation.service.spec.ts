import { ConflictException } from '@nestjs/common';
import { Role, UnitStatus } from '@prisma/client';
import { ProjectSalesReservationService } from './project-sales-reservation.service';

describe('ProjectSalesReservationService', () => {
  const queryRaw = jest.fn();
  const executeRaw = jest.fn();
  const unitUpdate = jest.fn();
  const unitUpdateMany = jest.fn();
  const customerFindUnique = jest.fn();

  const tx = {
    $queryRaw: queryRaw,
    $executeRaw: executeRaw,
    unit: {
      update: unitUpdate,
      updateMany: unitUpdateMany,
    },
    customer: {
      findUnique: customerFindUnique,
    },
  } as any;

  const projectFindUnique = jest.fn();
  const prisma = {
    $transaction: jest.fn(async (callback: (value: any) => unknown) => callback(tx)),
    project: {
      findUnique: projectFindUnique,
    },
    $queryRaw: queryRaw,
  } as any;

  const service = new ProjectSalesReservationService(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
    executeRaw.mockResolvedValue(1);
    unitUpdate.mockResolvedValue({});
    unitUpdateMany.mockResolvedValue({ count: 1 });
  });

  it('aktif stokta atomik rezervasyon oluşturur ve stok durumunu REZERVE yapar', async () => {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const unit = lockedUnit(UnitStatus.SATILIK);
    const row = reservationRow({
      activeUnitStatus: UnitStatus.REZERVE,
      expiresAt,
    });

    queryRaw
      .mockResolvedValueOnce([unit])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([row]);

    const result = await service.createReservation(
      'unit-1',
      'owner-1',
      Role.MUTEAHHIT,
      {
        type: 'RESERVATION',
        expiresAt: expiresAt.toISOString(),
        idempotencyKey: 'reservation-test-0001',
      },
    );

    expect(result).toEqual(
      expect.objectContaining({
        unitId: 'unit-1',
        type: 'RESERVATION',
        status: 'ACTIVE',
        activeUnitStatus: UnitStatus.REZERVE,
      }),
    );
    expect(unitUpdate).toHaveBeenCalledWith({
      where: { id: 'unit-1' },
      data: { status: UnitStatus.REZERVE },
    });
    expect(executeRaw).toHaveBeenCalledTimes(1);
  });

  it('aktif rezervasyon varken ikinci rezervasyonu engeller', async () => {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const unit = lockedUnit(UnitStatus.SATILIK);
    const active = reservationRow({ expiresAt });

    queryRaw
      .mockResolvedValueOnce([unit])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([active]);

    await expect(
      service.createReservation(
        'unit-1',
        'owner-1',
        Role.MUTEAHHIT,
        {
          type: 'OPTION',
          expiresAt: expiresAt.toISOString(),
          idempotencyKey: 'reservation-test-0002',
        },
      ),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(unitUpdate).not.toHaveBeenCalled();
  });

  it('aynı idempotency key tekrarında yeni kayıt açmadan mevcut sonucu döndürür', async () => {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const unit = lockedUnit(UnitStatus.SATILIK);
    const existing = reservationRow({ expiresAt });

    queryRaw
      .mockResolvedValueOnce([unit])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([existing]);

    const result = await service.createReservation(
      'unit-1',
      'owner-1',
      Role.MUTEAHHIT,
      {
        type: 'RESERVATION',
        expiresAt: expiresAt.toISOString(),
        idempotencyKey: 'reservation-test-0003',
      },
    );

    expect(result.id).toBe(existing.id);
    expect(unitUpdate).not.toHaveBeenCalled();
  });

  it('SUPER_ADMIN özel CRM müşterisini başka proje sahibine bağlayamaz', async () => {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const unit = lockedUnit(UnitStatus.SATILIK);

    queryRaw
      .mockResolvedValueOnce([unit])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    await expect(
      service.createReservation(
        'unit-1',
        'super-admin-1',
        Role.SUPER_ADMIN,
        {
          type: 'RESERVATION',
          customerId: 'customer-1',
          expiresAt: expiresAt.toISOString(),
          idempotencyKey: 'reservation-test-0004',
        },
      ),
    ).rejects.toThrow(
      'SUPER_ADMIN özel CRM müşteri kaydını rezervasyona bağlayamaz.',
    );

    expect(customerFindUnique).not.toHaveBeenCalled();
  });
});

function lockedUnit(status: UnitStatus) {
  return {
    id: 'unit-1',
    projectId: 'project-1',
    ownerId: 'owner-1',
    status,
  };
}

function reservationRow(
  overrides: Partial<{
    id: string;
    activeUnitStatus: string;
    previousUnitStatus: string;
    expiresAt: Date;
  }> = {},
) {
  const now = new Date();
  return {
    id: overrides.id || 'reservation-1',
    projectId: 'project-1',
    unitId: 'unit-1',
    customerId: null,
    createdById: 'owner-1',
    type: 'RESERVATION' as const,
    status: 'ACTIVE' as const,
    previousUnitStatus: overrides.previousUnitStatus || UnitStatus.SATILIK,
    activeUnitStatus: overrides.activeUnitStatus || UnitStatus.REZERVE,
    startsAt: now,
    expiresAt: overrides.expiresAt || new Date(now.getTime() + 60_000),
    releasedAt: null,
    convertedAt: null,
    cancelledAt: null,
    expiredAt: null,
    note: null,
    releaseNote: null,
    idempotencyKey: 'reservation-test-key',
    createdAt: now,
    updatedAt: now,
  };
}
