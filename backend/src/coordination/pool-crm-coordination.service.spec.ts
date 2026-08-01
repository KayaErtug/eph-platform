import { BadRequestException } from '@nestjs/common';
import {
  CustomerPropertyRelation,
  Role,
} from '@prisma/client';

import { PoolCrmCoordinationService } from './pool-crm-coordination.service';

describe('PoolCrmCoordinationService', () => {
  const prisma = {
    user: {
      findUnique: jest.fn(),
    },
    customerProperty: {
      findUnique: jest.fn(),
    },
    customerInterest: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    adminActionLog: {
      create: jest.fn(),
    },
  };

  const crmService = {
    addCustomerProperty: jest.fn(),
    addActivity: jest.fn(),
    addTask: jest.fn(),
  };

  const service = new PoolCrmCoordinationService(
    prisma as any,
    crmService as any,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.adminActionLog.create.mockResolvedValue({ id: 'audit-1' });
    prisma.customerInterest.update.mockResolvedValue({
      id: 'interest-1',
    });
    crmService.addActivity.mockResolvedValue({ id: 'activity-1' });
    crmService.addTask.mockResolvedValue({ id: 'task-1' });
    crmService.addCustomerProperty.mockResolvedValue({
      id: 'relation-1',
      customerId: 'customer-1',
      unitId: 'unit-1',
      relationType: CustomerPropertyRelation.ALICI_ADAYI,
    });
  });

  it('Havuz portföyünü CRM müşterisine bağlar ve zaman çizelgesine yazar', async () => {
    prisma.customerInterest.findUnique.mockResolvedValue({
      id: 'interest-1',
      customerId: 'customer-1',
      isActive: true,
      customer: {
        ownerId: 'user-1',
      },
    });
    prisma.customerProperty.findUnique.mockResolvedValue(null);

    const result = await service.linkPoolUnitToCustomer(
      'customer-1',
      'unit-1',
      { id: 'user-1', role: Role.EMLAKCI },
      {
        customerInterestId: 'interest-1',
        matchScore: 92,
        matchReasons: [
          'Aynı ilçe',
          'Bütçe aralığında',
          'Oda sayısı uyumlu',
        ],
        createFollowUpTask: true,
      },
    );

    expect(result.created).toBe(true);
    expect(crmService.addCustomerProperty).toHaveBeenCalledWith(
      'customer-1',
      'user-1',
      Role.EMLAKCI,
      expect.objectContaining({
        unitId: 'unit-1',
        relationType: CustomerPropertyRelation.ALICI_ADAYI,
        notes: expect.stringContaining('Eşleşme puanı: %92'),
      }),
    );
    expect(prisma.customerInterest.update).toHaveBeenCalledWith({
      where: { id: 'interest-1' },
      data: { lastMatchedAt: expect.any(Date) },
    });
    expect(crmService.addActivity).toHaveBeenCalled();
    expect(crmService.addTask).toHaveBeenCalled();
    expect(prisma.adminActionLog.create).toHaveBeenCalled();
  });

  it('mevcut bağlantıyı güncellerken ikinci aktivite ve görev oluşturmaz', async () => {
    prisma.customerProperty.findUnique.mockResolvedValue({
      id: 'relation-1',
    });

    const result = await service.linkPoolUnitToCustomer(
      'customer-1',
      'unit-1',
      { id: 'user-1', role: Role.EMLAKCI },
      {
        matchScore: 80,
        createFollowUpTask: true,
      },
    );

    expect(result.created).toBe(false);
    expect(crmService.addCustomerProperty).toHaveBeenCalled();
    expect(crmService.addActivity).not.toHaveBeenCalled();
    expect(crmService.addTask).not.toHaveBeenCalled();
  });

  it('başka müşteriye ait talep profilinin kullanılmasını engeller', async () => {
    prisma.customerInterest.findUnique.mockResolvedValue({
      id: 'interest-1',
      customerId: 'another-customer',
      isActive: true,
      customer: {
        ownerId: 'user-1',
      },
    });

    await expect(
      service.linkPoolUnitToCustomer(
        'customer-1',
        'unit-1',
        { id: 'user-1', role: Role.EMLAKCI },
        {
          customerInterestId: 'interest-1',
        },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(crmService.addCustomerProperty).not.toHaveBeenCalled();
  });
});
