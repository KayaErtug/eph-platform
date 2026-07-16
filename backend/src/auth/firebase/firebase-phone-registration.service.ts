import { BadRequestException, GoneException, Injectable } from '@nestjs/common';

import { PendingRegistrationService } from '../registration/pending-registration.service';
import { FirebasePhoneVerificationService } from './firebase-phone-verification.service';
import {
  PhoneVerificationRequestContext,
  PhoneVerificationSecurityService,
} from './phone-verification-security.service';

@Injectable()
export class FirebasePhoneRegistrationService {
  constructor(
    private readonly pendingRegistrationService: PendingRegistrationService,
    private readonly firebasePhoneVerificationService: FirebasePhoneVerificationService,
    private readonly phoneVerificationSecurityService: PhoneVerificationSecurityService,
  ) {}

  async prepare(
    pendingRegistrationId: string,
    context: PhoneVerificationRequestContext,
  ) {
    const pending = await this.requirePendingRegistration(
      pendingRegistrationId,
    );

    await this.phoneVerificationSecurityService.assertCanRequestSms(
      pending.phone,
    );

    const prepared =
      await this.phoneVerificationSecurityService.prepareForRegistration({
        phone: pending.phone,
        pendingRegistrationId: pending.id,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      });

    return {
      success: true,
      pendingRegistrationId: pending.id,
      phone: this.firebasePhoneVerificationService.normalizePhone(
        pending.phone,
      ),
      firebasePhoneVerificationReady: true,
      attemptsRemaining: prepared.attemptsRemaining,
      suspicious: prepared.suspicious,
      message:
        'Telefon doğrulama işlemi Firebase SMS gönderimi için hazırlandı.',
    };
  }

  async bindSession(
    pendingRegistrationId: string,
    sessionInfo: string,
    context: PhoneVerificationRequestContext,
  ) {
    const pending = await this.requirePendingRegistration(
      pendingRegistrationId,
    );

    const result =
      await this.phoneVerificationSecurityService.bindFirebaseSession({
        phone: pending.phone,
        pendingRegistrationId: pending.id,
        sessionInfo,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      });

    return {
      success: true,
      pendingRegistrationId: pending.id,
      sessionBound: true,
      sessionExpiresAt: result.sessionExpiresAt,
      nextSmsAllowedAt: result.nextSmsAllowedAt,
      attemptsRemaining: result.attemptsRemaining,
      message: 'Firebase telefon doğrulama oturumu güvenli şekilde kaydedildi.',
    };
  }

  private async requirePendingRegistration(pendingRegistrationIdInput: string) {
    const pendingRegistrationId = String(
      pendingRegistrationIdInput || '',
    ).trim();

    if (!pendingRegistrationId) {
      throw new BadRequestException({
        code: 'INVALID_PENDING_REGISTRATION_ID',
        message: 'Geçersiz üyelik doğrulama oturumu.',
      });
    }

    const pending = await this.pendingRegistrationService.findById(
      pendingRegistrationId,
    );

    if (!pending) {
      throw new BadRequestException({
        code: 'PENDING_REGISTRATION_NOT_FOUND',
        message: 'Kayıt doğrulama oturumu bulunamadı.',
      });
    }

    if (pending.expiresAt.getTime() <= Date.now()) {
      throw new GoneException({
        code: 'PENDING_REGISTRATION_EXPIRED',
        message: 'Kayıt doğrulama oturumunun süresi dolmuş.',
      });
    }

    if (pending.phoneVerified) {
      throw new BadRequestException({
        code: 'PHONE_ALREADY_VERIFIED',
        message: 'Telefon numarası zaten doğrulanmış.',
      });
    }

    return pending;
  }
}
