import { HttpException } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { FirebasePhoneVerificationService } from './firebase-phone-verification.service';
import { PhoneVerificationSecurityService } from './phone-verification-security.service';

describe('PhoneVerificationSecurityService', () => {
  const phone = '+905551234567';
  const pendingRegistrationId = 'pending-registration-1';
  const sessionInfo = 'firebase-session-info-1';

  let service: PhoneVerificationSecurityService;

  let transactionClient: {
    phoneVerificationSecurity: {
      findUnique: jest.Mock;
      upsert: jest.Mock;
      update: jest.Mock;
    };
    auditLog: {
      create: jest.Mock;
    };
  };

  let prisma: {
    $transaction: jest.Mock;
    phoneVerificationSecurity: {
      findUnique: jest.Mock;
      update: jest.Mock;
    };
  };

  let firebasePhoneService: {
    normalizePhone: jest.Mock;
    hashSessionInfo: jest.Mock;
    sessionInfoMatches: jest.Mock;
  };

  const createState = (overrides: Record<string, unknown> = {}) => ({
    phone,
    activePendingRegistrationId: pendingRegistrationId,

    failedAttempts: 0,
    totalFailedAttempts: 0,
    lastAttemptAt: null,

    lockedAt: null,
    lockedUntil: null,
    suspiciousAt: null,

    lastSmsSentAt: null,
    nextSmsAllowedAt: null,

    lastIpAddress: null,
    lastUserAgent: null,

    firebaseVerificationIdHash: 'hashed-session',
    firebaseSessionStartedAt: new Date(Date.now() - 1_000),
    firebaseSessionExpiresAt: new Date(Date.now() + 10 * 60 * 1_000),
    firebaseSessionConsumedAt: null,
    firebaseUid: null,

    verifiedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),

    ...overrides,
  });

  beforeEach(() => {
    transactionClient = {
      phoneVerificationSecurity: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
        update: jest.fn(),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({
          id: 'audit-1',
        }),
      },
    };

    prisma = {
      $transaction: jest.fn(),
      phoneVerificationSecurity: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    firebasePhoneService = {
      normalizePhone: jest.fn((value: string) => {
        const input = String(value || '').trim();

        const digits = input.replace(/\D/g, '');

        if (input.startsWith('+')) {
          return `+${digits}`;
        }

        if (digits.length === 11 && digits.startsWith('0')) {
          return `+90${digits.slice(1)}`;
        }

        if (digits.length === 10 && digits.startsWith('5')) {
          return `+90${digits}`;
        }

        return `+${digits}`;
      }),

      hashSessionInfo: jest.fn().mockReturnValue('hashed-session'),

      sessionInfoMatches: jest.fn().mockReturnValue(true),
    };

    prisma.$transaction.mockImplementation(
      async (operation: (tx: typeof transactionClient) => Promise<unknown>) =>
        operation(transactionClient),
    );

    service = new PhoneVerificationSecurityService(
      prisma as unknown as PrismaService,
      firebasePhoneService as unknown as FirebasePhoneVerificationService,
    );
  });

  it('yeni telefon için güvenlik kaydını hazırlar', async () => {
    transactionClient.phoneVerificationSecurity.findUnique.mockResolvedValue(
      null,
    );

    transactionClient.phoneVerificationSecurity.upsert.mockResolvedValue(
      createState(),
    );

    const result = await service.prepareForRegistration({
      phone: '05551234567',
      pendingRegistrationId,
      ipAddress: '127.0.0.1',
      userAgent: 'Jest',
    });

    expect(result).toEqual({
      phone,
      pendingRegistrationId,
      attemptsRemaining: 3,
      suspicious: false,
    });

    expect(
      transactionClient.phoneVerificationSecurity.upsert,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { phone },
        create: expect.objectContaining({
          phone,
          activePendingRegistrationId: pendingRegistrationId,
        }),
      }),
    );

    expect(transactionClient.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorId: null,
        targetUserId: null,
        action: 'SYSTEM_SECURITY_ACTION',
        entityType: 'PhoneVerificationSecurity',
        entityId: phone,
        metadata: expect.objectContaining({
          event: 'PHONE_VERIFICATION_PREPARED',
          failedAttempts: 0,
          totalFailedAttempts: 0,
          suspicious: false,
        }),
      }),
    });
  });

  it('Firebase oturumunu hash olarak kaydeder', async () => {
    const state = createState({
      firebaseVerificationIdHash: null,
      firebaseSessionStartedAt: null,
      firebaseSessionExpiresAt: null,
    });

    transactionClient.phoneVerificationSecurity.findUnique.mockResolvedValue(
      state,
    );

    transactionClient.phoneVerificationSecurity.update.mockResolvedValue(
      createState({
        lastSmsSentAt: new Date(),
        nextSmsAllowedAt: new Date(Date.now() + 2 * 60 * 1_000),
      }),
    );

    const result = await service.bindFirebaseSession({
      phone,
      pendingRegistrationId,
      sessionInfo,
      ipAddress: '127.0.0.1',
      userAgent: 'Jest',
    });

    expect(firebasePhoneService.hashSessionInfo).toHaveBeenCalledWith(
      sessionInfo,
    );

    expect(
      transactionClient.phoneVerificationSecurity.update,
    ).toHaveBeenCalledWith({
      where: { phone },
      data: expect.objectContaining({
        firebaseVerificationIdHash: 'hashed-session',
        firebaseSessionConsumedAt: null,
        lastIpAddress: '127.0.0.1',
        lastUserAgent: 'Jest',
      }),
    });

    expect(result).toEqual(
      expect.objectContaining({
        phone,
        pendingRegistrationId,
        attemptsRemaining: 3,
      }),
    );
  });

  it('üçüncü yanlış denemede telefonu dört saat kilitler', async () => {
    transactionClient.phoneVerificationSecurity.findUnique.mockResolvedValue(
      createState({
        failedAttempts: 2,
        totalFailedAttempts: 4,
      }),
    );

    transactionClient.phoneVerificationSecurity.update.mockImplementation(
      async ({ data }: { data: any }) =>
        createState({
          failedAttempts: 3,
          totalFailedAttempts: 5,
          lastAttemptAt: new Date(),
          lockedAt: data.lockedAt,
          lockedUntil: data.lockedUntil,
          suspiciousAt: data.suspiciousAt,
          nextSmsAllowedAt: data.nextSmsAllowedAt,
          firebaseSessionConsumedAt: data.firebaseSessionConsumedAt,
        }),
    );

    const result = await service.recordFailedAttempt({
      phone,
      pendingRegistrationId,
      sessionInfo,
      providerCode: 'INVALID_CODE',
      ipAddress: '127.0.0.1',
      userAgent: 'Jest',
    });

    expect(result.locked).toBe(true);
    expect(result.suspicious).toBe(true);
    expect(result.attemptsRemaining).toBe(0);
    expect(result.lockedUntil).toBeInstanceOf(Date);

    const updateCall =
      transactionClient.phoneVerificationSecurity.update.mock.calls[0][0];

    expect(updateCall.data).toEqual(
      expect.objectContaining({
        failedAttempts: 3,
        totalFailedAttempts: {
          increment: 1,
        },
        lockedAt: expect.any(Date),
        lockedUntil: expect.any(Date),
        suspiciousAt: expect.any(Date),
        firebaseSessionConsumedAt: expect.any(Date),
      }),
    );

    const auditCall = transactionClient.auditLog.create.mock.calls[0][0];

    expect(auditCall.data.metadata).toEqual(
      expect.objectContaining({
        event: 'PHONE_OTP_LOCKED',
        failedAttempts: 3,
        totalFailedAttempts: 5,
        attemptsRemaining: 0,
        locked: true,
      }),
    );
  });

  it('kilitli telefonun yeni SMS istemesini engeller', async () => {
    prisma.phoneVerificationSecurity.findUnique.mockResolvedValue(
      createState({
        lockedAt: new Date(),
        lockedUntil: new Date(Date.now() + 4 * 60 * 60 * 1_000),
        suspiciousAt: new Date(),
      }),
    );

    let thrownError: unknown;

    try {
      await service.assertCanRequestSms(phone);
    } catch (error) {
      thrownError = error;
    }

    expect(thrownError).toBeInstanceOf(HttpException);

    const httpError = thrownError as HttpException;

    expect(httpError.getStatus()).toBe(429);

    expect(httpError.getResponse()).toEqual(
      expect.objectContaining({
        code: 'PHONE_VERIFICATION_LOCKED',
        retryAfterSeconds: expect.any(Number),
      }),
    );
  });

  it('Firebase tarafından farklı telefon doğrulanırsa reddeder', async () => {
    await expect(
      service.markVerified({
        phone,
        pendingRegistrationId,
        sessionInfo,
        firebaseUid: 'firebase-user-1',
        verifiedPhoneNumber: '+905559999999',
        ipAddress: '127.0.0.1',
        userAgent: 'Jest',
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'FIREBASE_PHONE_MISMATCH',
      }),
    });

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
