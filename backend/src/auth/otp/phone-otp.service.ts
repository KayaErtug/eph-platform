import { BadRequestException, Injectable } from '@nestjs/common';
import { randomInt } from 'crypto';
import * as bcrypt from 'bcryptjs';

import { PrismaService } from '../../prisma/prisma.service';
import { NetgsmService } from './netgsm.service';

@Injectable()
export class PhoneOtpService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly netgsmService: NetgsmService,
  ) {}

  private getExpirySeconds() {
    const value = Number(process.env.PHONE_OTP_EXPIRES_SECONDS || 120);
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : 120;
  }

  private getMaxAttempts() {
    const value = Number(process.env.PHONE_OTP_MAX_ATTEMPTS || 3);
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : 3;
  }

  private generateCode() {
    return String(randomInt(100000, 1000000));
  }

  async send(pendingRegistrationId: string) {
    const pending = await this.prisma.pendingRegistration.findUnique({
      where: { id: pendingRegistrationId },
    });

    if (!pending) {
      throw new BadRequestException('Kayıt doğrulama oturumu bulunamadı.');
    }

    if (pending.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException(
        'Kayıt doğrulama oturumunun süresi dolmuş.',
      );
    }

    const code = this.generateCode();
    const codeHash = await bcrypt.hash(code, 10);
    const expiresInSeconds = this.getExpirySeconds();
    const now = new Date();

    await this.prisma.pendingRegistration.update({
      where: { id: pending.id },
      data: {
        phoneVerificationCodeHash: codeHash,
        phoneVerificationExpiresAt: new Date(
          now.getTime() + expiresInSeconds * 1000,
        ),
        phoneVerificationAttempts: 0,
        phoneVerificationLastSentAt: now,
      },
    });

    await this.netgsmService.sendOtp(pending.phone, code);

    return { success: true, expiresInSeconds };
  }

  async verify(pendingRegistrationId: string, code: string) {
    const pending = await this.prisma.pendingRegistration.findUnique({
      where: { id: pendingRegistrationId },
    });

    if (
      !pending ||
      !pending.phoneVerificationCodeHash ||
      !pending.phoneVerificationExpiresAt
    ) {
      throw new BadRequestException(
        'Aktif telefon doğrulama kodu bulunamadı.',
      );
    }

    const maxAttempts = this.getMaxAttempts();

    if (pending.phoneVerificationAttempts >= maxAttempts) {
      throw new BadRequestException(
        'Telefon doğrulama deneme hakkınız doldu.',
      );
    }

    if (pending.phoneVerificationExpiresAt.getTime() < Date.now()) {
      throw new BadRequestException(
        'Telefon doğrulama kodunun süresi doldu.',
      );
    }

    const isValid = await bcrypt.compare(
      code,
      pending.phoneVerificationCodeHash,
    );

    if (!isValid) {
      const attempts = pending.phoneVerificationAttempts + 1;

      await this.prisma.pendingRegistration.update({
        where: { id: pending.id },
        data: { phoneVerificationAttempts: attempts },
      });

      throw new BadRequestException(
        attempts >= maxAttempts
          ? 'Telefon doğrulama deneme hakkınız doldu.'
          : `Kod hatalı. Kalan deneme hakkınız: ${
              maxAttempts - attempts
            }.`,
      );
    }

    return { success: true };
  }
}
