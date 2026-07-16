import { HttpException } from '@nestjs/common';

import { PendingRegistrationService } from '../registration/pending-registration.service';
import { FirebasePhoneRegistrationService } from './firebase-phone-registration.service';
import {
  FirebasePhoneVerificationError,
  FirebasePhoneVerificationService,
} from './firebase-phone-verification.service';
import { PhoneVerificationSecurityService } from './phone-verification-security.service';

describe('FirebasePhoneRegistrationService verifyCode', () => {
  const pendingRegistrationId = 'pending-registration-verify-1';
  const phone = '+905551234567';
  const email = 'test@example.com';
  const sessionInfo = 'firebase-session-info';
  const code = '123456';

  const context = {
    ipAddress: '127.0.0.1',
    userAgent: 'Jest',
  };

  let service: FirebasePhoneRegistrationService;

  let pendingRegistrationService: {
    findById: jest.Mock;
  };

  let firebasePhoneVerificationService: {
    normalizePhone: jest.Mock;
    verifyCode: jest.Mock;
  };

  let phoneVerificationSecurityService: {
    assertActiveSession: jest.Mock;
    recordFailedAttempt: jest.Mock;
    markVerified: jest.Mock;
  };

  const createPending = (overrides: Record<string, unknown> = {}) => ({
    id: pendingRegistrationId,
    phone,
    email,
    phoneVerified: false,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    ...overrides,
  });

  async function captureError(
    operation: () => Promise<unknown>,
  ): Promise<HttpException> {
    try {
      await operation();
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      return error as HttpException;
    }

    throw new Error('Beklenen HttpException oluşmadı.');
  }

  beforeEach(() => {
    pendingRegistrationService = {
      findById: jest.fn(),
    };

    firebasePhoneVerificationService = {
      normalizePhone: jest.fn().mockReturnValue(phone),
      verifyCode: jest.fn(),
    };

    phoneVerificationSecurityService = {
      assertActiveSession: jest.fn().mockResolvedValue({
        active: true,
      }),

      recordFailedAttempt: jest.fn(),

      markVerified: jest.fn().mockResolvedValue({
        success: true,
        phone,
        pendingRegistrationId,
        firebaseUid: 'firebase-user-1',
        verifiedAt: new Date(),
        suspicious: false,
      }),
    };

    service = new FirebasePhoneRegistrationService(
      pendingRegistrationService as unknown as PendingRegistrationService,
      firebasePhoneVerificationService as unknown as FirebasePhoneVerificationService,
      phoneVerificationSecurityService as unknown as PhoneVerificationSecurityService,
    );
  });

  it('doğru kodda Firebase sonucunu güvenlik kaydına işler', async () => {
    pendingRegistrationService.findById.mockResolvedValue(createPending());

    firebasePhoneVerificationService.verifyCode.mockResolvedValue({
      firebaseUid: 'firebase-user-1',
      phoneNumber: phone,
      isNewFirebaseUser: true,
    });

    const result = await service.verifyCode(
      pendingRegistrationId,
      sessionInfo,
      code,
      context,
    );

    expect(
      phoneVerificationSecurityService.assertActiveSession,
    ).toHaveBeenCalledWith({
      phone,
      pendingRegistrationId,
      sessionInfo,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    expect(firebasePhoneVerificationService.verifyCode).toHaveBeenCalledWith(
      sessionInfo,
      code,
    );

    expect(phoneVerificationSecurityService.markVerified).toHaveBeenCalledWith({
      phone,
      pendingRegistrationId,
      sessionInfo,
      firebaseUid: 'firebase-user-1',
      verifiedPhoneNumber: phone,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    expect(result).toEqual(
      expect.objectContaining({
        success: true,
        pendingRegistrationId,
        phoneVerified: true,
        requiresEmailVerification: true,
        email,
        firebaseUid: 'firebase-user-1',
        suspicious: false,
      }),
    );
  });

  it('yanlış kodda tek başarısız deneme kaydeder', async () => {
    pendingRegistrationService.findById.mockResolvedValue(createPending());

    firebasePhoneVerificationService.verifyCode.mockRejectedValue(
      new FirebasePhoneVerificationError('INVALID_CODE', 'INVALID_CODE'),
    );

    phoneVerificationSecurityService.recordFailedAttempt.mockResolvedValue({
      success: false,
      locked: false,
      suspicious: false,
      attemptsRemaining: 2,
      lockedUntil: null,
    });

    const error = await captureError(() =>
      service.verifyCode(pendingRegistrationId, sessionInfo, '000000', context),
    );

    expect(error.getStatus()).toBe(400);

    expect(error.getResponse()).toEqual(
      expect.objectContaining({
        code: 'PHONE_OTP_INVALID',
        attemptsRemaining: 2,
      }),
    );

    expect(
      phoneVerificationSecurityService.recordFailedAttempt,
    ).toHaveBeenCalledTimes(1);

    expect(
      phoneVerificationSecurityService.markVerified,
    ).not.toHaveBeenCalled();
  });

  it('üçüncü yanlış kodda dört saatlik kilit döndürür', async () => {
    const lockedUntil = new Date(Date.now() + 4 * 60 * 60 * 1000);

    pendingRegistrationService.findById.mockResolvedValue(createPending());

    firebasePhoneVerificationService.verifyCode.mockRejectedValue(
      new FirebasePhoneVerificationError('INVALID_CODE', 'INVALID_CODE'),
    );

    phoneVerificationSecurityService.recordFailedAttempt.mockResolvedValue({
      success: false,
      locked: true,
      suspicious: true,
      attemptsRemaining: 0,
      lockedUntil,
    });

    const error = await captureError(() =>
      service.verifyCode(pendingRegistrationId, sessionInfo, '000000', context),
    );

    expect(error.getStatus()).toBe(429);

    expect(error.getResponse()).toEqual(
      expect.objectContaining({
        code: 'PHONE_VERIFICATION_LOCKED',
        attemptsRemaining: 0,
        lockedUntil: lockedUntil.toISOString(),
      }),
    );

    expect(
      phoneVerificationSecurityService.recordFailedAttempt,
    ).toHaveBeenCalledTimes(1);
  });

  it('Firebase session hatasını kullanıcı denemesi saymaz', async () => {
    pendingRegistrationService.findById.mockResolvedValue(createPending());

    firebasePhoneVerificationService.verifyCode.mockRejectedValue(
      new FirebasePhoneVerificationError('SESSION_EXPIRED', 'SESSION_EXPIRED'),
    );

    const error = await captureError(() =>
      service.verifyCode(pendingRegistrationId, sessionInfo, code, context),
    );

    expect(error.getStatus()).toBe(400);

    expect(error.getResponse()).toEqual(
      expect.objectContaining({
        code: 'FIREBASE_SESSION_EXPIRED',
      }),
    );

    expect(
      phoneVerificationSecurityService.recordFailedAttempt,
    ).not.toHaveBeenCalled();

    expect(
      phoneVerificationSecurityService.markVerified,
    ).not.toHaveBeenCalled();
  });

  it('zaten doğrulanmış kaydı tekrar Firebase’e göndermez', async () => {
    pendingRegistrationService.findById.mockResolvedValue(
      createPending({
        phoneVerified: true,
      }),
    );

    const result = await service.verifyCode(
      pendingRegistrationId,
      sessionInfo,
      code,
      context,
    );

    expect(result).toEqual(
      expect.objectContaining({
        success: true,
        alreadyVerified: true,
        pendingRegistrationId,
        phoneVerified: true,
        requiresEmailVerification: true,
        email,
      }),
    );

    expect(
      phoneVerificationSecurityService.assertActiveSession,
    ).not.toHaveBeenCalled();

    expect(firebasePhoneVerificationService.verifyCode).not.toHaveBeenCalled();

    expect(
      phoneVerificationSecurityService.markVerified,
    ).not.toHaveBeenCalled();
  });
});
