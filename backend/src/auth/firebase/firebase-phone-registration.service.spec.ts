import { BadRequestException, GoneException } from '@nestjs/common';

import { PendingRegistrationService } from '../registration/pending-registration.service';
import { FirebasePhoneRegistrationService } from './firebase-phone-registration.service';
import { FirebasePhoneVerificationService } from './firebase-phone-verification.service';
import { PhoneVerificationSecurityService } from './phone-verification-security.service';

describe('FirebasePhoneRegistrationService', () => {
  const pendingRegistrationId = 'pending-registration-1';
  const phone = '+90 555 123 45 67';

  let service: FirebasePhoneRegistrationService;

  let pendingRegistrationService: {
    findById: jest.Mock;
  };

  let firebasePhoneVerificationService: {
    normalizePhone: jest.Mock;
  };

  let phoneVerificationSecurityService: {
    assertCanRequestSms: jest.Mock;
    prepareForRegistration: jest.Mock;
    bindFirebaseSession: jest.Mock;
  };

  const createPending = (overrides: Record<string, unknown> = {}) => ({
    id: pendingRegistrationId,
    phone,
    phoneVerified: false,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    ...overrides,
  });

  beforeEach(() => {
    pendingRegistrationService = {
      findById: jest.fn(),
    };

    firebasePhoneVerificationService = {
      normalizePhone: jest.fn().mockReturnValue('+905551234567'),
    };

    phoneVerificationSecurityService = {
      assertCanRequestSms: jest.fn().mockResolvedValue({
        canRequestSms: true,
      }),

      prepareForRegistration: jest.fn().mockResolvedValue({
        attemptsRemaining: 3,
        suspicious: false,
      }),

      bindFirebaseSession: jest.fn().mockResolvedValue({
        sessionExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
        nextSmsAllowedAt: new Date(Date.now() + 2 * 60 * 1000),
        attemptsRemaining: 3,
      }),
    };

    service = new FirebasePhoneRegistrationService(
      pendingRegistrationService as unknown as PendingRegistrationService,
      firebasePhoneVerificationService as unknown as FirebasePhoneVerificationService,
      phoneVerificationSecurityService as unknown as PhoneVerificationSecurityService,
    );
  });

  it('Firebase SMS gönderimi için güvenlik hazırlığını yapar', async () => {
    pendingRegistrationService.findById.mockResolvedValue(createPending());

    const result = await service.prepare(pendingRegistrationId, {
      ipAddress: '127.0.0.1',
      userAgent: 'Jest',
    });

    expect(
      phoneVerificationSecurityService.assertCanRequestSms,
    ).toHaveBeenCalledWith(phone);

    expect(
      phoneVerificationSecurityService.prepareForRegistration,
    ).toHaveBeenCalledWith({
      phone,
      pendingRegistrationId,
      ipAddress: '127.0.0.1',
      userAgent: 'Jest',
    });

    expect(result).toEqual(
      expect.objectContaining({
        success: true,
        pendingRegistrationId,
        phone: '+905551234567',
        firebasePhoneVerificationReady: true,
        attemptsRemaining: 3,
        suspicious: false,
      }),
    );
  });

  it('Firebase sessionInfo değerini güvenlik kaydına bağlar', async () => {
    pendingRegistrationService.findById.mockResolvedValue(createPending());

    const result = await service.bindSession(
      pendingRegistrationId,
      'firebase-session-info',
      {
        ipAddress: '127.0.0.1',
        userAgent: 'Jest',
      },
    );

    expect(
      phoneVerificationSecurityService.bindFirebaseSession,
    ).toHaveBeenCalledWith({
      phone,
      pendingRegistrationId,
      sessionInfo: 'firebase-session-info',
      ipAddress: '127.0.0.1',
      userAgent: 'Jest',
    });

    expect(result).toEqual(
      expect.objectContaining({
        success: true,
        pendingRegistrationId,
        sessionBound: true,
        attemptsRemaining: 3,
      }),
    );
  });

  it('süresi dolmuş üyelik oturumunu reddeder', async () => {
    pendingRegistrationService.findById.mockResolvedValue(
      createPending({
        expiresAt: new Date(Date.now() - 60 * 1000),
      }),
    );

    await expect(
      service.prepare(pendingRegistrationId, {}),
    ).rejects.toBeInstanceOf(GoneException);

    expect(
      phoneVerificationSecurityService.assertCanRequestSms,
    ).not.toHaveBeenCalled();
  });

  it('zaten doğrulanmış telefonu yeniden başlatmaz', async () => {
    pendingRegistrationService.findById.mockResolvedValue(
      createPending({
        phoneVerified: true,
      }),
    );

    await expect(
      service.prepare(pendingRegistrationId, {}),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(
      phoneVerificationSecurityService.prepareForRegistration,
    ).not.toHaveBeenCalled();
  });

  it('bulunamayan üyelik oturumunu reddeder', async () => {
    pendingRegistrationService.findById.mockResolvedValue(null);

    await expect(
      service.bindSession(pendingRegistrationId, 'firebase-session-info', {}),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(
      phoneVerificationSecurityService.bindFirebaseSession,
    ).not.toHaveBeenCalled();
  });
});
