import { PrismaService } from '../prisma/prisma.service';
import { UnitsService } from './units.service';

describe('UnitsService Havuz atomic işlemleri', () => {
  let service: UnitsService;

  let tx: {
    $executeRaw: jest.Mock;
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
            bakiye: Number(data.bakiye),
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

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.$executeRaw).toHaveBeenCalledTimes(1);

    expect(tx.kontorCuzdani.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          kullaniciId: currentUser.id,
        },
        data: expect.objectContaining({
          bakiye: 90,
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

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.$executeRaw).toHaveBeenCalledTimes(1);

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

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.$executeRaw).toHaveBeenCalledTimes(1);

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

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.kontorHareketi.create).toHaveBeenCalledTimes(1);
    expect(tx.networkNotification.create).toHaveBeenCalledTimes(1);
  });
});
