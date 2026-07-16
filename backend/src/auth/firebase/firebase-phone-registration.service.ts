import {
  BadRequestException,
  GoneException,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';

import { PendingRegistrationService } from '../registration/pending-registration.service';
import {
  FirebasePhoneVerificationError,
  FirebasePhoneVerificationService,
  VerifiedFirebasePhone,
} from './firebase-phone-verification.service';
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

  async verifyCode(
    pendingRegistrationId: string,
    sessionInfo: string,
    code: string,
    context: PhoneVerificationRequestContext,
  ) {
    const pending = await this.requirePendingRegistration(
      pendingRegistrationId,
      true,
    );

    if (pending.phoneVerified) {
      return {
        success: true,
        alreadyVerified: true,
        pendingRegistrationId: pending.id,
        phoneVerified: true,
        requiresEmailVerification: true,
        email: pending.email,
        message: 'Telefon numaranız zaten doğrulanmış.',
      };
    }

    await this.phoneVerificationSecurityService.assertActiveSession({
      phone: pending.phone,
      pendingRegistrationId: pending.id,
      sessionInfo,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    const verified = await this.verifyWithFirebase({
      phone: pending.phone,
      pendingRegistrationId: pending.id,
      sessionInfo,
      code,
      context,
    });

    const securityResult =
      await this.phoneVerificationSecurityService.markVerified({
        phone: pending.phone,
        pendingRegistrationId: pending.id,
        sessionInfo,
        firebaseUid: verified.firebaseUid,
        verifiedPhoneNumber: verified.phoneNumber,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      });

    return {
      success: true,
      pendingRegistrationId: pending.id,
      phoneVerified: true,
      requiresEmailVerification: true,
      email: pending.email,
      firebaseUid: securityResult.firebaseUid,
      suspicious: securityResult.suspicious,
      message:
        'Telefon numaranız Firebase ile doğrulandı. E-posta doğrulamasına devam ediniz.',
    };
  }

  private async verifyWithFirebase(input: {
    phone: string;
    pendingRegistrationId: string;
    sessionInfo: string;
    code: string;
    context: PhoneVerificationRequestContext;
  }): Promise<VerifiedFirebasePhone> {
    try {
      return await this.firebasePhoneVerificationService.verifyCode(
        input.sessionInfo,
        input.code,
      );
    } catch (error) {
      if (!(error instanceof FirebasePhoneVerificationError)) {
        throw error;
      }

      return this.handleFirebaseVerificationError(error, input);
    }
  }

  private async handleFirebaseVerificationError(
    error: FirebasePhoneVerificationError,
    input: {
      phone: string;
      pendingRegistrationId: string;
      sessionInfo: string;
      context: PhoneVerificationRequestContext;
    },
  ): Promise<never> {
    if (error.reason === 'INVALID_CODE') {
      const attempt =
        await this.phoneVerificationSecurityService.recordFailedAttempt({
          phone: input.phone,
          pendingRegistrationId: input.pendingRegistrationId,
          sessionInfo: input.sessionInfo,
          providerCode: error.providerCode,
          ipAddress: input.context.ipAddress,
          userAgent: input.context.userAgent,
        });

      if (attempt.locked) {
        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            code: 'PHONE_VERIFICATION_LOCKED',
            message:
              'Üç yanlış doğrulama denemesi nedeniyle telefon doğrulaması dört saat kilitlendi.',
            attemptsRemaining: 0,
            lockedUntil: attempt.lockedUntil?.toISOString() || null,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      throw new BadRequestException({
        code: 'PHONE_OTP_INVALID',
        message: `Doğrulama kodu hatalı. Kalan deneme hakkınız: ${attempt.attemptsRemaining}.`,
        attemptsRemaining: attempt.attemptsRemaining,
      });
    }

    if (error.reason === 'SESSION_EXPIRED') {
      throw new BadRequestException({
        code: 'FIREBASE_SESSION_EXPIRED',
        message:
          'Telefon doğrulama oturumunun süresi dolmuş. Yeni bir kod isteyiniz.',
      });
    }

    if (error.reason === 'INVALID_SESSION') {
      throw new BadRequestException({
        code: 'FIREBASE_SESSION_INVALID',
        message: 'Telefon doğrulama oturumu geçersiz. Yeni bir kod isteyiniz.',
      });
    }

    if (error.reason === 'TOO_MANY_ATTEMPTS') {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          code: 'FIREBASE_PROVIDER_RATE_LIMIT',
          message:
            'Firebase geçici olarak çok fazla doğrulama isteği algıladı. Lütfen daha sonra tekrar deneyiniz.',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    throw new HttpException(
      {
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        code: 'FIREBASE_PROVIDER_UNAVAILABLE',
        message:
          'Telefon doğrulama servisine şu anda ulaşılamıyor. Lütfen kısa süre sonra tekrar deneyiniz.',
      },
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }

  private async requirePendingRegistration(
    pendingRegistrationIdInput: string,
    allowPhoneVerified = false,
  ) {
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

    if (pending.phoneVerified && !allowPhoneVerified) {
      throw new BadRequestException({
        code: 'PHONE_ALREADY_VERIFIED',
        message: 'Telefon numarası zaten doğrulanmış.',
      });
    }

    return pending;
  }
}
