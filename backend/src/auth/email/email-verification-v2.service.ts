import { BadRequestException, Injectable } from '@nestjs/common';
import { randomInt } from 'crypto';
import * as bcrypt from 'bcryptjs';

import {
  MailService,
  RegistrationType as MailRegistrationType,
} from '../../mail.service';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class EmailVerificationV2Service {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  private generateCode() {
    return String(randomInt(100000, 1000000));
  }

  private getExpiryMinutes() {
    const value = Number(
      process.env.EMAIL_VERIFICATION_CODE_EXPIRES_MINUTES || 30,
    );
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : 30;
  }

  private getMaxAttempts() {
    const value = Number(
      process.env.EMAIL_VERIFICATION_MAX_ATTEMPTS || 5,
    );
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : 5;
  }

  async send(
    pendingRegistrationId: string,
    registrationType: MailRegistrationType,
  ) {
    const pending = await this.prisma.pendingRegistration.findUnique({
      where: { id: pendingRegistrationId },
    });

    if (!pending || !pending.phoneVerified) {
      throw new BadRequestException(
        'Önce telefon doğrulamasını tamamlayınız.',
      );
    }

    const code = this.generateCode();
    const codeHash = await bcrypt.hash(code, 10);
    const expiresInMinutes = this.getExpiryMinutes();
    const now = new Date();

    await this.prisma.pendingRegistration.update({
      where: { id: pending.id },
      data: {
        emailVerificationCodeHash: codeHash,
        emailVerificationExpiresAt: new Date(
          now.getTime() + expiresInMinutes * 60 * 1000,
        ),
        emailVerificationAttempts: 0,
        emailVerificationLastSentAt: now,
      },
    });

    await this.mailService.sendEmailVerificationCode({
      email: pending.email,
      firstName: pending.firstName,
      code,
      expiresInMinutes,
      registrationType,
    });

    return { success: true, expiresInMinutes };
  }

  async verify(pendingRegistrationId: string, code: string) {
    const pending = await this.prisma.pendingRegistration.findUnique({
      where: { id: pendingRegistrationId },
    });

    if (
      !pending ||
      !pending.emailVerificationCodeHash ||
      !pending.emailVerificationExpiresAt
    ) {
      throw new BadRequestException(
        'Aktif e-posta doğrulama kodu bulunamadı.',
      );
    }

    const maxAttempts = this.getMaxAttempts();

    if (pending.emailVerificationAttempts >= maxAttempts) {
      throw new BadRequestException(
        'E-posta doğrulama deneme hakkınız doldu.',
      );
    }

    if (pending.emailVerificationExpiresAt.getTime() < Date.now()) {
      throw new BadRequestException(
        'E-posta doğrulama kodunun süresi doldu.',
      );
    }

    const isValid = await bcrypt.compare(
      code,
      pending.emailVerificationCodeHash,
    );

    if (!isValid) {
      const attempts = pending.emailVerificationAttempts + 1;

      await this.prisma.pendingRegistration.update({
        where: { id: pending.id },
        data: { emailVerificationAttempts: attempts },
      });

      throw new BadRequestException(
        attempts >= maxAttempts
          ? 'E-posta doğrulama deneme hakkınız doldu.'
          : `Kod hatalı. Kalan deneme hakkınız: ${
              maxAttempts - attempts
            }.`,
      );
    }

    return { success: true };
  }
}
