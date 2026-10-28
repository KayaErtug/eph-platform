import { PrismaService } from '../prisma/prisma.service';
import { UnitsService } from './units.service';

describe('UnitsService Havuz atomic işlemleri', () => {
  let service: UnitsService;
  let poolAudienceService: { assertCanViewUnit: jest.Mock };

  let tx: {
    $executeRaw: jest.Mock;
    $queryRaw: jest.Mock;
    user: { findUnique: jest.Mock };
    office: { findFirst: jest.Mock; findUnique: jest.Mock };
    systemSetting: { findUnique: jest.Mock };
    kontorCuzdani: {
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    kontorHareketi: {
      findFirst: jest.Mock;
      create: jest.Mock;
    };
    conversation: {
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    message: {
      create: jest.Mock;
    };
    networkNotification: {
      create: jest.Mock;
    };
  };

  let prisma: {
    $transaction: jest.Mock;
  };

  const currentUser = {
    id: 'viewer-1',
    role: 'EMLAKCI',
  };

  const poolUnit = {
    id: 'unit-atomic-1',
    project: {
      ownerId: 'owner-1',
    },
  };

  beforeEach(() => {
    tx = {
      $executeRaw: jest.fn().mockResolvedValue(1),
      $queryRaw: jest.fn().mockResolvedValue([]),
      user: { findUnique: jest.fn().mockResolvedValue({ id: currentUser.id, role: "EMLAKCI", officeId: null }) },
      office: { findFirst: jest.fn().mockResolvedValue(null), findUnique: jest.fn().mockResolvedValue(null) },
      systemSetting: { findUnique: jest.fn().mockResolvedValue(null) },

      kontorCuzdani: {
        findUnique: jest.fn().mockResolvedValue({
          kullaniciId: currentUser.id,
          bakiye: 100,
          toplamHarcama: 0,
          aktifMi: true,
        }),

        create: jest.fn(),

        update: jest.fn().mockImplementation(
          async ({ data }: any) => ({
            kullaniciId: currentUser.id,
            bakiye:
                typeof data.bakiye === 'number'
                  ? data.bakiye
                  : 100 - Number(data.bakiye?.decrement ?? 0),
            toplamHarcama: 10,
            aktifMi: true,
          }),
        ),
      },

      kontorHareketi: {
        findFirst: jest.fn().mockResolvedValue(null),

        create: jest.fn().mockImplementation(
          async ({ data }: any) => ({
            id: 'movement-1',
            ...data,
          }),
        ),
      },

      conversation: {
        findFirst: jest.fn().mockResolvedValue(null),

        create: jest.fn().mockResolvedValue({
          id: 'conversation-1',
          ConversationParticipant: [
            {
              userId: currentUser.id,
            },
            {
              userId: poolUnit.project.ownerId,
            },
          ],
        }),

        update: jest.fn().mockResolvedValue({
          id: 'conversation-1',
        }),
      },

      message: {
        create: jest.fn().mockResolvedValue({
          id: 'message-1',
        }),
      },

      networkNotification: {
        create: jest.fn().mockResolvedValue({
          id: 'notification-1',
        }),
      },
    };

    prisma = {
      $transaction: jest.fn(
        async (
          operation: (
            transactionClient: typeof tx,
          ) => Promise<unknown>,
        ) => operation(tx),
      ),
    };

    service = new UnitsService(
      prisma as unknown as PrismaService,
    );

    poolAudienceService = {
      assertCanViewUnit: jest.fn().mockResolvedValue(undefined),
    };
    Object.defineProperty(service, 'poolAudienceService', {
      value: poolAudienceService,
    });

    jest
      .spyOn(service as any, 'ensurePoolActionMembership')
      .mockResolvedValue({
        allowed: true,
      });

    jest
      .spyOn(service as any, 'getPoolUnitWithProjectOrFail')
      .mockResolvedValue(poolUnit);
  });

  it('İlgileniyorum işleminde kontör ve bildirimi tek transaction içinde işler', async () => {
    const result = await service.poolInterest(
      poolUnit.id,
      currentUser,
      {
        matchScore: 87,
        note: 'Müşterim için uygun görünüyor',
      },
    );

    expect(poolAudienceService.assertCanViewUnit).toHaveBeenCalledWith(poolUnit.id, currentUser);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.$executeRaw).toHaveBeenCalledTimes(3);

    expect(tx.kontorCuzdani.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          kullaniciId: currentUser.id,
        },
        data: expect.objectContaining({
          bakiye: { decrement: 10 },
        }),
      }),
    );

    expect(tx.kontorHareketi.create).toHaveBeenCalledTimes(1);
    expect(tx.networkNotification.create).toHaveBeenCalledTimes(1);

    expect(result).toEqual(
      expect.objectContaining({
        ok: true,
        cost: 10,
        spent: 10,
        previousBalance: 100,
        remainingBalance: 90,
        balance: 90,
      }),
    );
  });

  it('Mesaj işleminde kontör, görüşme, mesaj ve bildirimi tek transaction içinde işler', async () => {
    tx.kontorCuzdani.update.mockResolvedValue({
      kullaniciId: currentUser.id,
      bakiye: 97,
      toplamHarcama: 3,
      aktifMi: true,
    });

    const result = await service.poolMessage(
      poolUnit.id,
      currentUser,
      {
        message: 'Bu portföy hakkında bilgi almak istiyorum.',
        matchScore: 80,
      },
    );

    expect(poolAudienceService.assertCanViewUnit).toHaveBeenCalledWith(poolUnit.id, currentUser);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.$executeRaw).toHaveBeenCalledTimes(3);

    expect(tx.kontorHareketi.findFirst).toHaveBeenCalledTimes(1);
    expect(tx.kontorHareketi.create).toHaveBeenCalledTimes(1);
    expect(tx.conversation.create).toHaveBeenCalledTimes(1);
    expect(tx.message.create).toHaveBeenCalledTimes(1);
    expect(tx.conversation.update).toHaveBeenCalledTimes(1);
    expect(tx.networkNotification.create).toHaveBeenCalledTimes(1);

    expect(result).toEqual(
      expect.objectContaining({
        ok: true,
        cost: 3,
        spent: 3,
        previousBalance: 100,
        remainingBalance: 97,
        balance: 97,
        conversationId: 'conversation-1',
        url: '/messages/conversation-1',
      }),
    );
  });

  it('24 saat içindeki tekrar mesajda kontör düşmeden mesaj ve bildirim oluşturur', async () => {
    tx.kontorHareketi.findFirst.mockResolvedValue({
      id: 'recent-message-charge',
    });

    const result = await service.poolMessage(
      poolUnit.id,
      currentUser,
      {
        message: 'Görüşmeye yeni bilgi ekliyorum.',
      },
    );

    expect(poolAudienceService.assertCanViewUnit).toHaveBeenCalledWith(poolUnit.id, currentUser);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.$executeRaw).toHaveBeenCalledTimes(2);

    expect(tx.kontorCuzdani.update).not.toHaveBeenCalled();
    expect(tx.kontorHareketi.create).not.toHaveBeenCalled();

    expect(tx.message.create).toHaveBeenCalledTimes(1);
    expect(tx.networkNotification.create).toHaveBeenCalledTimes(1);

    expect(result).toEqual(
      expect.objectContaining({
        ok: true,
        cost: 3,
        spent: 0,
        previousBalance: 100,
        remainingBalance: 100,
        balance: 100,
      }),
    );
  });

  it('hedef kitle erişimi reddedilirse kontör işlemi başlamaz', async () => {
    poolAudienceService.assertCanViewUnit.mockRejectedValue(new Error('audience denied'));

    await expect(service.poolInterest(poolUnit.id, currentUser)).rejects.toThrow('audience denied');

    expect(poolAudienceService.assertCanViewUnit).toHaveBeenCalledWith(poolUnit.id, currentUser);
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(tx.kontorCuzdani.update).not.toHaveBeenCalled();
    expect(tx.kontorHareketi.create).not.toHaveBeenCalled();
  });

  it('bildirim yazılamazsa atomic işlem başarısız olur', async () => {
    tx.networkNotification.create.mockRejectedValue(
      new Error('notification failed'),
    );

    await expect(
      service.poolMatchingCustomer(
        poolUnit.id,
        currentUser,
        {
          matchScore: 91,
          note: 'Hazır müşterim var',
        },
      ),
    ).rejects.toThrow('notification failed');

    expect(poolAudienceService.assertCanViewUnit).toHaveBeenCalledWith(poolUnit.id, currentUser);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.kontorHareketi.create).toHaveBeenCalledTimes(1);
    expect(tx.networkNotification.create).toHaveBeenCalledTimes(1);
  });
});
