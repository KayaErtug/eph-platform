import {
  ForbiddenException,
} from '@nestjs/common';
import {
  CustomerInterestPriority,
  CustomerPurchaseIntent,
  Role,
  UnitStatus,
  UnitType,
} from '@prisma/client';

import { CoordinationService } from './coordination.service';

describe('CoordinationService', () => {
  const prisma = {
    user: {
      findUnique: jest.fn(),
    },
    customerInterest: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    networkPost: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    customer: {
      findUnique: jest.fn(),
    },
    adminActionLog: {
      create: jest.fn(),
    },
    kontorHareketi: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    kontorCuzdani: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const crmService = {
    createCustomer: jest.fn(),
    deleteCustomer: jest.fn(),
    addActivity: jest.fn(),
    addTask: jest.fn(),
  };

  const networkService = {
    create: jest.fn(),
  };

  const linkRepository = {
    reserve: jest.fn(),
    complete: jest.fn(),
    fail: jest.fn(),
    find: jest.fn(),
  };

  const service = new CoordinationService(
    prisma as any,
    crmService as any,
    networkService as any,
    linkRepository as any,
  );

  const interest = {
    id: 'interest-1',
    customerId: 'customer-1',
    title: 'Merkezefendi 3+1',
    city: 'Denizli',
    district: 'Merkezefendi',
    neighborhood: 'Yenişehir',
    propertyTypes: [UnitType.DAIRE],
    statuses: [UnitStatus.SATILIK],
    minBudget: 5_000_000,
    maxBudget: 6_000_000,
    priceCurrency: 'TRY',
    minArea: 120,
    maxArea: 160,
    roomCounts: ['3+1'],
    features: ['Balkon'],
    purchaseIntent: CustomerPurchaseIntent.SATIN_ALMA,
    priority: CustomerInterestPriority.YUKSEK,
    notes: null,
    isActive: true,
    customer: {
      id: 'customer-1',
      ownerId: 'user-1',
      firstName: 'Ayşe',
      lastName: 'Yılmaz',
      phone: '05550000000',
      email: 'ayse@example.com',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.adminActionLog.create.mockResolvedValue({ id: 'audit-1' });
    crmService.addActivity.mockResolvedValue({ id: 'activity-1' });
    crmService.addTask.mockResolvedValue({ id: 'task-1' });
    linkRepository.fail.mockResolvedValue(undefined);
  });

  it('CRM talebini yalnız sahibi veya SUPER_ADMIN yayınlayabilir', async () => {
    prisma.customerInterest.findUnique.mockResolvedValue({
      ...interest,
      customer: {
        ...interest.customer,
        ownerId: 'another-user',
      },
    });

    await expect(
      service.publishCrmInterestToRequestCenter(
        'interest-1',
        { id: 'user-1', role: Role.EMLAKCI },
        {},
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(networkService.create).not.toHaveBeenCalled();
  });

  it('CRM talebini kişisel verileri taşımadan Talep Merkezine yayınlar', async () => {
    prisma.customerInterest.findUnique.mockResolvedValue(interest);
    linkRepository.reserve.mockResolvedValue({
      acquired: true,
      link: {
        id: 'link-1',
        status: 'PENDING',
      },
    });
    networkService.create.mockResolvedValue({
      id: 'post-1',
      title: 'Denizli talebi',
    });
    linkRepository.complete.mockResolvedValue({
      id: 'link-1',
      status: 'COMPLETE',
      networkPostId: 'post-1',
    });

    const result = await service.publishCrmInterestToRequestCenter(
      'interest-1',
      { id: 'user-1', role: Role.EMLAKCI },
      {},
    );

    expect(result.created).toBe(true);
    expect(networkService.create).toHaveBeenCalledTimes(1);

    const publishedPayload = networkService.create.mock.calls[0][0];
    const serializedPayload = JSON.stringify(publishedPayload);

    expect(serializedPayload).not.toContain('05550000000');
    expect(serializedPayload).not.toContain('ayse@example.com');
    expect(serializedPayload).not.toContain('Ayşe');
    expect(publishedPayload.areas).toEqual([
      {
        city: 'Denizli',
        district: 'Merkezefendi',
        neighborhood: 'Yenişehir',
      },
    ]);
    expect(publishedPayload.minBudget).toBe(5_000_000);
    expect(publishedPayload.maxBudget).toBe(6_000_000);
    expect(crmService.addActivity).toHaveBeenCalled();
  });

  it('aynı CRM talebi ikinci kez yayınlanmak istendiğinde mevcut bağlantıyı döndürür', async () => {
    prisma.customerInterest.findUnique.mockResolvedValue(interest);
    linkRepository.reserve.mockResolvedValue({
      acquired: false,
      link: {
        id: 'link-1',
        status: 'COMPLETE',
        networkPostId: 'post-1',
      },
    });
    prisma.networkPost.findUnique.mockResolvedValue({
      id: 'post-1',
      isActive: true,
    });

    const result = await service.publishCrmInterestToRequestCenter(
      'interest-1',
      { id: 'user-1', role: Role.EMLAKCI },
      {},
    );

    expect(result.created).toBe(false);
    expect(networkService.create).not.toHaveBeenCalled();
  });

  it('Talep Merkezi kaydını iletişim bilgisi kopyalamadan CRM fırsatına dönüştürür', async () => {
    prisma.networkPost.findFirst.mockResolvedValue({
      id: 'post-1',
      userId: 'post-owner',
      type: 'PORTFOY_ARIYORUM',
      title: 'Pamukkale ticari arsa talebi',
      description: '10 milyon TL bütçeli ticari arsa aranıyor.',
      city: 'Denizli',
      district: 'Pamukkale',
      neighborhood: null,
      areas: [
        {
          city: 'Denizli',
          district: 'Pamukkale',
          neighborhood: '',
        },
      ],
      budget: null,
      minBudget: null,
      maxBudget: 10_000_000,
      minArea: null,
      maxArea: null,
      propertyTypes: [UnitType.TICARI_ARSA],
      roomCounts: [],
      features: [],
      priceCurrency: 'TRY',
      urgency: 'Normal',
      tags: ['Talep Türü:PORTFOY_SATILIK'],
      expiresAt: new Date(Date.now() + 86_400_000),
      isActive: true,
      User: {
        firstName: 'Mehmet',
        lastName: 'Demir',
        role: Role.EMLAKCI,
      },
    });
    linkRepository.reserve.mockResolvedValue({
      acquired: true,
      link: {
        id: 'link-2',
        status: 'PENDING',
      },
    });
    crmService.createCustomer.mockResolvedValue({
      id: 'customer-2',
    });
    prisma.customer.findUnique.mockResolvedValue({
      id: 'customer-2',
      interests: [
        {
          id: 'interest-2',
          city: 'Denizli',
        },
      ],
    });
    linkRepository.complete.mockResolvedValue({
      id: 'link-2',
      status: 'COMPLETE',
      customerId: 'customer-2',
    });

    const result = await service.createCrmOpportunityFromRequest(
      'post-1',
      { id: 'user-1', role: Role.EMLAKCI },
    );

    expect(result.created).toBe(true);
    expect(crmService.createCustomer).toHaveBeenCalledTimes(1);

    const customerPayload = crmService.createCustomer.mock.calls[0][1];

    expect(customerPayload.phone).toBeUndefined();
    expect(customerPayload.email).toBeUndefined();
    expect(customerPayload.source).toBe('TALEP_MERKEZI');
    expect(customerPayload.interestAreas).toEqual([
      {
        city: 'Denizli',
        district: 'Pamukkale',
        neighborhood: '',
      },
    ]);
    expect(crmService.addTask).toHaveBeenCalled();
    expect(crmService.addActivity).toHaveBeenCalled();
  });

  it('bağlantı tamamlanamazsa oluşturulan Talep Merkezi kaydını telafi eder', async () => {
    prisma.customerInterest.findUnique.mockResolvedValue(interest);
    linkRepository.reserve.mockResolvedValue({
      acquired: true,
      link: {
        id: 'link-3',
        status: 'PENDING',
      },
    });
    networkService.create.mockResolvedValue({
      id: 'post-3',
    });
    linkRepository.complete.mockRejectedValue(
      new Error('link failure'),
    );
    prisma.$transaction.mockImplementation(async (callback) =>
      callback({
        networkPost: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'post-3',
            userId: 'user-1',
          }),
          update: jest.fn().mockResolvedValue({
            id: 'post-3',
            isActive: false,
          }),
        },
        kontorHareketi: {
          findMany: jest.fn().mockResolvedValue([]),
        },
      }),
    );

    await expect(
      service.publishCrmInterestToRequestCenter(
        'interest-1',
        { id: 'user-1', role: Role.EMLAKCI },
        {},
      ),
    ).rejects.toThrow('link failure');

    expect(linkRepository.fail).toHaveBeenCalledWith(
      'link-3',
      expect.any(Error),
    );
    expect(prisma.$transaction).toHaveBeenCalled();
  });
});
