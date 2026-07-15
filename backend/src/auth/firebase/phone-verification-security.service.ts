import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { AuditAction, PhoneVerificationSecurity, Prisma } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { FirebasePhoneVerificationService } from './firebase-phone-verification.service';

const MAX_FAILED_ATTEMPTS = 3;
const LOCK_DURATION_MS = 4 * 60 * 60 * 1000;
const SMS_COOLDOWN_MS = 2 * 60 * 1000;
const SESSION_TTL_MS = 10 * 60 * 1000;
const SERIALIZABLE_RETRY_COUNT = 3;

export interface PhoneVerificationRequestContext {
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface PreparePhoneVerificationInput extends PhoneVerificationRequestContext {
  phone: string;
  pendingRegistrationId: string;
}

export interface BindFirebaseSessionInput extends PhoneVerificationRequestContext {
  phone: string;
  pendingRegistrationId: string;
  sessionInfo: string;
}

export interface PhoneVerificationAttemptInput extends PhoneVerificationRequestContext {
  phone: string;
  pendingRegistrationId: string;
  sessionInfo: string;
  providerCode?: string | null;
}

export interface MarkPhoneVerifiedInput extends PhoneVerificationRequestContext {
  phone: string;
  pendingRegistrationId: string;
  sessionInfo: string;
  firebaseUid: string;
  verifiedPhoneNumber: string;
}

@Injectable()
export class PhoneVerificationSecurityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly firebasePhoneService: FirebasePhoneVerificationService,
  ) {}

  async prepareForRegistration(input: PreparePhoneVerificationInput) {
    const phone = this.normalizeRequiredPhone(input.phone);
    const pendingRegistrationId = this.normalizePendingRegistrationId(
      input.pendingRegistrationId,
    );

    const context = this.normalizeContext(input);
    const now = new Date();

    return this.runSerializable(async (tx) => {
      const existing = await tx.phoneVerificationSecurity.findUnique({
        where: { phone },
      });

      if (existing?.lockedUntil && existing.lockedUntil > now) {
        this.throwLocked(existing.lockedUntil);
      }

      const expiredLock = existing?.lockedUntil && existing.lockedUntil <= now;

      const state = await tx.phoneVerificationSecurity.upsert({
        where: { phone },
        create: {
          phone,
          activePendingRegistrationId: pendingRegistrationId,
          lastIpAddress: context.ipAddress,
          lastUserAgent: context.userAgent,
        },
        update: {
          activePendingRegistrationId: pendingRegistrationId,

          firebaseVerificationIdHash: null,
          firebaseSessionStartedAt: null,
          firebaseSessionExpiresAt: null,
          firebaseSessionConsumedAt: null,

          firebaseUid: null,
          verifiedAt: null,

          lastIpAddress: context.ipAddress,
          lastUserAgent: context.userAgent,

          ...(expiredLock
            ? {
                failedAttempts: 0,
                lockedAt: null,
                lockedUntil: null,
                nextSmsAllowedAt: null,
              }
            : {}),
        },
      });

      await this.createAudit(tx, {
        phone,
        pendingRegistrationId,
        event: 'PHONE_VERIFICATION_PREPARED',
        description: 'Telefon doğrulama güvenlik oturumu hazırlandı.',
        context,
        metadata: {
          failedAttempts: state.failedAttempts,
          totalFailedAttempts: state.totalFailedAttempts,
          suspicious: state.suspiciousAt !== null,
        },
      });

      return {
        phone,
        pendingRegistrationId,
        attemptsRemaining: Math.max(
          0,
          MAX_FAILED_ATTEMPTS - state.failedAttempts,
        ),
        suspicious: state.suspiciousAt !== null,
      };
    });
  }

  async assertCanRequestSms(phoneInput: string) {
    const phone = this.normalizeRequiredPhone(phoneInput);

    const now = new Date();

    let state = await this.prisma.phoneVerificationSecurity.findUnique({
      where: { phone },
    });

    if (state?.lockedUntil && state.lockedUntil <= now) {
      state = await this.prisma.phoneVerificationSecurity.update({
        where: { phone },
        data: {
          failedAttempts: 0,
          lockedAt: null,
          lockedUntil: null,
          nextSmsAllowedAt: null,

          firebaseVerificationIdHash: null,
          firebaseSessionStartedAt: null,
          firebaseSessionExpiresAt: null,
          firebaseSessionConsumedAt: null,
        },
      });
    }

    if (state?.lockedUntil && state.lockedUntil > now) {
      this.throwLocked(state.lockedUntil);
    }

    if (state?.nextSmsAllowedAt && state.nextSmsAllowedAt > now) {
      this.throwSmsCooldown(state.nextSmsAllowedAt);
    }

    return {
      phone,
      canRequestSms: true,
    };
  }

  async bindFirebaseSession(input: BindFirebaseSessionInput) {
    const phone = this.normalizeRequiredPhone(input.phone);

    const pendingRegistrationId = this.normalizePendingRegistrationId(
      input.pendingRegistrationId,
    );

    const sessionInfo = this.normalizeSessionInfo(input.sessionInfo);

    const context = this.normalizeContext(input);
    const now = new Date();

    const sessionExpiresAt = new Date(now.getTime() + SESSION_TTL_MS);

    const nextSmsAllowedAt = new Date(now.getTime() + SMS_COOLDOWN_MS);

    return this.runSerializable(async (tx) => {
      const state = await tx.phoneVerificationSecurity.findUnique({
        where: { phone },
      });

      if (!state) {
        throw new BadRequestException({
          code: 'PHONE_SECURITY_STATE_MISSING',
          message: 'Telefon doğrulama güvenlik kaydı bulunamadı.',
        });
      }

      this.ensurePendingRegistrationMatches(state, pendingRegistrationId);

      this.ensureNotLocked(state, now);

      if (state.nextSmsAllowedAt && state.nextSmsAllowedAt > now) {
        this.throwSmsCooldown(state.nextSmsAllowedAt);
      }

      const updated = await tx.phoneVerificationSecurity.update({
        where: { phone },
        data: {
          firebaseVerificationIdHash:
            this.firebasePhoneService.hashSessionInfo(sessionInfo),

          firebaseSessionStartedAt: now,
          firebaseSessionExpiresAt: sessionExpiresAt,
          firebaseSessionConsumedAt: null,

          lastSmsSentAt: now,
          nextSmsAllowedAt,

          lastIpAddress: context.ipAddress,
          lastUserAgent: context.userAgent,
        },
      });

      await this.createAudit(tx, {
        phone,
        pendingRegistrationId,
        event: 'PHONE_OTP_SESSION_BOUND',
        description: 'Firebase telefon doğrulama oturumu EPH kaydına bağlandı.',
        context,
        metadata: {
          sessionExpiresAt: sessionExpiresAt.toISOString(),
          nextSmsAllowedAt: nextSmsAllowedAt.toISOString(),
          failedAttempts: updated.failedAttempts,
        },
      });

      return {
        phone,
        pendingRegistrationId,
        sessionExpiresAt,
        nextSmsAllowedAt,
        attemptsRemaining: Math.max(
          0,
          MAX_FAILED_ATTEMPTS - updated.failedAttempts,
        ),
      };
    });
  }

  async assertActiveSession(input: PhoneVerificationAttemptInput) {
    const phone = this.normalizeRequiredPhone(input.phone);

    const pendingRegistrationId = this.normalizePendingRegistrationId(
      input.pendingRegistrationId,
    );

    const sessionInfo = this.normalizeSessionInfo(input.sessionInfo);

    const now = new Date();

    const state = await this.prisma.phoneVerificationSecurity.findUnique({
      where: { phone },
    });

    if (!state) {
      throw new BadRequestException({
        code: 'PHONE_SECURITY_STATE_MISSING',
        message: 'Telefon doğrulama güvenlik kaydı bulunamadı.',
      });
    }

    this.ensurePendingRegistrationMatches(state, pendingRegistrationId);

    this.ensureNotLocked(state, now);

    this.ensureSessionIsUsable(state, sessionInfo, now);

    return {
      phone,
      pendingRegistrationId,
      attemptsRemaining: Math.max(
        0,
        MAX_FAILED_ATTEMPTS - state.failedAttempts,
      ),
    };
  }

  async recordFailedAttempt(input: PhoneVerificationAttemptInput) {
    const phone = this.normalizeRequiredPhone(input.phone);

    const pendingRegistrationId = this.normalizePendingRegistrationId(
      input.pendingRegistrationId,
    );

    const sessionInfo = this.normalizeSessionInfo(input.sessionInfo);

    const context = this.normalizeContext(input);
    const providerCode = this.normalizeOptionalText(input.providerCode, 200);

    const now = new Date();

    return this.runSerializable(async (tx) => {
      const state = await tx.phoneVerificationSecurity.findUnique({
        where: { phone },
      });

      if (!state) {
        throw new BadRequestException({
          code: 'PHONE_SECURITY_STATE_MISSING',
          message: 'Telefon doğrulama güvenlik kaydı bulunamadı.',
        });
      }

      this.ensurePendingRegistrationMatches(state, pendingRegistrationId);

      this.ensureNotLocked(state, now);

      this.ensureSessionIsUsable(state, sessionInfo, now);

      const failedAttempts = state.failedAttempts + 1;

      const locked = failedAttempts >= MAX_FAILED_ATTEMPTS;

      const lockedUntil = locked
        ? new Date(now.getTime() + LOCK_DURATION_MS)
        : null;

      const updated = await tx.phoneVerificationSecurity.update({
        where: { phone },
        data: {
          failedAttempts,
          totalFailedAttempts: {
            increment: 1,
          },
          lastAttemptAt: now,

          lastIpAddress: context.ipAddress,
          lastUserAgent: context.userAgent,

          ...(locked
            ? {
                lockedAt: now,
                lockedUntil,
                suspiciousAt: state.suspiciousAt || now,
                nextSmsAllowedAt: lockedUntil,
                firebaseSessionConsumedAt: now,
              }
            : {}),
        },
      });

      await this.createAudit(tx, {
        phone,
        pendingRegistrationId,
        event: locked ? 'PHONE_OTP_LOCKED' : 'PHONE_OTP_FAILED',
        description: locked
          ? 'Telefon doğrulama oturumu üç yanlış deneme nedeniyle dört saat kilitlendi.'
          : 'Telefon doğrulama kodu yanlış girildi.',
        context,
        metadata: {
          failedAttempts: updated.failedAttempts,
          totalFailedAttempts: updated.totalFailedAttempts,
          attemptsRemaining: Math.max(
            0,
            MAX_FAILED_ATTEMPTS - updated.failedAttempts,
          ),
          locked,
          lockedUntil: lockedUntil?.toISOString() || null,
          providerCode: providerCode || null,
        },
      });

      if (locked && lockedUntil) {
        return {
          success: false,
          locked: true,
          suspicious: true,
          attemptsRemaining: 0,
          lockedUntil,
        };
      }

      return {
        success: false,
        locked: false,
        suspicious: updated.suspiciousAt !== null,
        attemptsRemaining: Math.max(
          0,
          MAX_FAILED_ATTEMPTS - updated.failedAttempts,
        ),
        lockedUntil: null,
      };
    });
  }

  async markVerified(input: MarkPhoneVerifiedInput) {
    const phone = this.normalizeRequiredPhone(input.phone);

    const verifiedPhone = this.normalizeRequiredPhone(
      input.verifiedPhoneNumber,
    );

    if (verifiedPhone !== phone) {
      throw new BadRequestException({
        code: 'FIREBASE_PHONE_MISMATCH',
        message:
          'Firebase tarafından doğrulanan telefon numarası kayıt numarasıyla eşleşmiyor.',
      });
    }

    const pendingRegistrationId = this.normalizePendingRegistrationId(
      input.pendingRegistrationId,
    );

    const sessionInfo = this.normalizeSessionInfo(input.sessionInfo);

    const firebaseUid = this.normalizeFirebaseUid(input.firebaseUid);

    const context = this.normalizeContext(input);
    const now = new Date();

    return this.runSerializable(async (tx) => {
      const state = await tx.phoneVerificationSecurity.findUnique({
        where: { phone },
      });

      if (!state) {
        throw new BadRequestException({
          code: 'PHONE_SECURITY_STATE_MISSING',
          message: 'Telefon doğrulama güvenlik kaydı bulunamadı.',
        });
      }

      this.ensurePendingRegistrationMatches(state, pendingRegistrationId);

      this.ensureNotLocked(state, now);

      this.ensureSessionIsUsable(state, sessionInfo, now);

      const updated = await tx.phoneVerificationSecurity.update({
        where: { phone },
        data: {
          failedAttempts: 0,

          lockedAt: null,
          lockedUntil: null,

          firebaseSessionConsumedAt: now,
          firebaseUid,
          verifiedAt: now,

          nextSmsAllowedAt: null,

          lastIpAddress: context.ipAddress,
          lastUserAgent: context.userAgent,
        },
      });

      await this.createAudit(tx, {
        phone,
        pendingRegistrationId,
        event: 'PHONE_OTP_VERIFIED',
        description: 'Telefon numarası Firebase ile doğrulandı.',
        context,
        metadata: {
          firebaseUid,
          verifiedAt: now.toISOString(),
          totalFailedAttempts: updated.totalFailedAttempts,
          suspicious: updated.suspiciousAt !== null,
        },
      });

      return {
        success: true,
        phone,
        pendingRegistrationId,
        firebaseUid,
        verifiedAt: now,
        suspicious: updated.suspiciousAt !== null,
      };
    });
  }

  async getStatus(phoneInput: string) {
    const phone = this.normalizeRequiredPhone(phoneInput);

    const state = await this.prisma.phoneVerificationSecurity.findUnique({
      where: { phone },
    });

    if (!state) {
      return {
        phone,
        exists: false,
        locked: false,
        suspicious: false,
        attemptsRemaining: MAX_FAILED_ATTEMPTS,
      };
    }

    const now = new Date();

    return {
      phone,
      exists: true,
      locked: Boolean(state.lockedUntil && state.lockedUntil > now),
      lockedUntil: state.lockedUntil,
      suspicious: state.suspiciousAt !== null,
      failedAttempts: state.failedAttempts,
      totalFailedAttempts: state.totalFailedAttempts,
      attemptsRemaining: Math.max(
        0,
        MAX_FAILED_ATTEMPTS - state.failedAttempts,
      ),
      nextSmsAllowedAt: state.nextSmsAllowedAt,
      verifiedAt: state.verifiedAt,
    };
  }

  private ensurePendingRegistrationMatches(
    state: PhoneVerificationSecurity,
    pendingRegistrationId: string,
  ) {
    if (state.activePendingRegistrationId !== pendingRegistrationId) {
      throw new BadRequestException({
        code: 'PENDING_REGISTRATION_MISMATCH',
        message: 'Telefon doğrulama oturumu bu üyelik kaydıyla eşleşmiyor.',
      });
    }
  }

  private ensureNotLocked(state: PhoneVerificationSecurity, now: Date) {
    if (state.lockedUntil && state.lockedUntil > now) {
      this.throwLocked(state.lockedUntil);
    }
  }

  private ensureSessionIsUsable(
    state: PhoneVerificationSecurity,
    sessionInfo: string,
    now: Date,
  ) {
    if (
      !state.firebaseVerificationIdHash ||
      !state.firebaseSessionStartedAt ||
      !state.firebaseSessionExpiresAt
    ) {
      throw new BadRequestException({
        code: 'FIREBASE_SESSION_MISSING',
        message: 'Firebase doğrulama oturumu bulunamadı.',
      });
    }

    if (state.firebaseSessionConsumedAt) {
      throw new BadRequestException({
        code: 'FIREBASE_SESSION_CONSUMED',
        message: 'Firebase doğrulama oturumu daha önce kullanılmış.',
      });
    }

    if (state.firebaseSessionExpiresAt <= now) {
      throw new BadRequestException({
        code: 'FIREBASE_SESSION_EXPIRED',
        message: 'Telefon doğrulama oturumunun süresi dolmuş.',
      });
    }

    const sessionMatches = this.firebasePhoneService.sessionInfoMatches(
      sessionInfo,
      state.firebaseVerificationIdHash,
    );

    if (!sessionMatches) {
      throw new BadRequestException({
        code: 'FIREBASE_SESSION_MISMATCH',
        message: 'Firebase doğrulama oturumu eşleşmiyor.',
      });
    }
  }

  private throwLocked(lockedUntil: Date): never {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((lockedUntil.getTime() - Date.now()) / 1000),
    );

    throw new HttpException(
      {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        code: 'PHONE_VERIFICATION_LOCKED',
        message:
          'Telefon doğrulama işlemi üç yanlış deneme nedeniyle dört saat kilitlendi.',
        lockedUntil: lockedUntil.toISOString(),
        retryAfterSeconds,
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  private throwSmsCooldown(nextSmsAllowedAt: Date): never {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((nextSmsAllowedAt.getTime() - Date.now()) / 1000),
    );

    throw new HttpException(
      {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        code: 'PHONE_SMS_COOLDOWN',
        message: 'Yeni doğrulama kodu istemeden önce kısa bir süre bekleyiniz.',
        nextSmsAllowedAt: nextSmsAllowedAt.toISOString(),
        retryAfterSeconds,
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  private normalizeRequiredPhone(value: string) {
    const phone = this.firebasePhoneService.normalizePhone(value);

    if (!/^\+\d{8,15}$/.test(phone)) {
      throw new BadRequestException({
        code: 'INVALID_PHONE_NUMBER',
        message: 'Geçerli bir telefon numarası giriniz.',
      });
    }

    return phone;
  }

  private normalizePendingRegistrationId(value: string) {
    const id = String(value || '').trim();

    if (!id || id.length > 200) {
      throw new BadRequestException({
        code: 'INVALID_PENDING_REGISTRATION_ID',
        message: 'Geçersiz üyelik doğrulama oturumu.',
      });
    }

    return id;
  }

  private normalizeSessionInfo(value: string) {
    const sessionInfo = String(value || '').trim();

    if (!sessionInfo || sessionInfo.length > 5000) {
      throw new BadRequestException({
        code: 'INVALID_FIREBASE_SESSION',
        message: 'Geçersiz Firebase doğrulama oturumu.',
      });
    }

    return sessionInfo;
  }

  private normalizeFirebaseUid(value: string) {
    const firebaseUid = String(value || '').trim();

    if (!firebaseUid || firebaseUid.length > 200) {
      throw new BadRequestException({
        code: 'INVALID_FIREBASE_UID',
        message: 'Geçersiz Firebase kullanıcı kimliği.',
      });
    }

    return firebaseUid;
  }

  private normalizeContext(context: PhoneVerificationRequestContext) {
    return {
      ipAddress: this.normalizeOptionalText(context.ipAddress, 128),
      userAgent: this.normalizeOptionalText(context.userAgent, 1000),
    };
  }

  private normalizeOptionalText(
    value: string | null | undefined,
    maximumLength: number,
  ) {
    const normalized = String(value || '').trim();

    return normalized ? normalized.slice(0, maximumLength) : null;
  }

  private maskPhone(phone: string) {
    const visible = phone.slice(-4);
    const hiddenLength = Math.max(0, phone.length - visible.length);

    return `${'*'.repeat(hiddenLength)}${visible}`;
  }

  private async createAudit(
    tx: Prisma.TransactionClient,
    input: {
      phone: string;
      pendingRegistrationId: string | null;
      event: string;
      description: string;
      context: {
        ipAddress: string | null;
        userAgent: string | null;
      };
      metadata: Prisma.InputJsonObject;
    },
  ) {
    await tx.auditLog.create({
      data: {
        actorId: null,
        targetUserId: null,
        action: AuditAction.SYSTEM_SECURITY_ACTION,
        entityType: 'PhoneVerificationSecurity',
        entityId: input.phone,
        description: input.description,
        metadata: {
          event: input.event,
          phoneMasked: this.maskPhone(input.phone),
          pendingRegistrationId: input.pendingRegistrationId,
          ...input.metadata,
        },
        ipAddress: input.context.ipAddress,
        userAgent: input.context.userAgent,
      },
    });
  }

  private async runSerializable<T>(
    operation: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= SERIALIZABLE_RETRY_COUNT; attempt += 1) {
      try {
        return await this.prisma.$transaction(operation, {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        });
      } catch (error) {
        lastError = error;

        const retryable =
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2034';

        if (!retryable || attempt === SERIALIZABLE_RETRY_COUNT) {
          throw error;
        }
      }
    }

    throw (
      lastError || new Error('Telefon doğrulama güvenlik işlemi tamamlanamadı.')
    );
  }
}
