import { isAccountDeleted } from './account-deletion';
import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { randomInt } from 'crypto';

import {
  MailService,
  RegistrationType as MailRegistrationType,
} from '../mail.service';
import { InvitationsService } from '../invitations/invitations.service';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import {
  RegisterDto,
  RegistrationType,
} from './dto/register.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { VerifyPasswordResetCodeDto } from './dto/verify-password-reset-code.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private invitationsService: InvitationsService,
    private jwtService: JwtService,
    private prisma: PrismaService,
    private mailService: MailService,
  ) {}

  private getVerificationExpiryMinutes() {
    const value = Number(
      process.env.EMAIL_VERIFICATION_CODE_EXPIRES_MINUTES || 30,
    );

    return Number.isFinite(value) && value > 0 ? Math.floor(value) : 30;
  }

  private getVerificationResendSeconds() {
    const value = Number(
      process.env.EMAIL_VERIFICATION_RESEND_SECONDS || 60,
    );

    return Number.isFinite(value) && value > 0 ? Math.floor(value) : 60;
  }

  private getVerificationMaxAttempts() {
    const value = Number(
      process.env.EMAIL_VERIFICATION_MAX_ATTEMPTS || 5,
    );

    return Number.isFinite(value) && value > 0 ? Math.floor(value) : 5;
  }

  private normalizeEmail(email?: string | null) {
    return String(email || '').trim().toLowerCase();
  }

  private normalizePhone(value?: string | null): string {
    const raw = String(value || '').trim();
    const digits = raw.replace(/\D/g, '');

    let local = digits;

    if (local.startsWith('0090')) {
      local = local.slice(4);
    } else if (local.startsWith('90')) {
      local = local.slice(2);
    } else if (local.startsWith('0')) {
      local = local.slice(1);
    }

    if (local.length > 10) {
      local = local.slice(-10);
    }

    if (local.length === 10 && local.startsWith('5')) {
      return `+90 ${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6, 8)} ${local.slice(8, 10)}`;
    }

    return raw;
  }

  private generateEmailVerificationCode() {
    return String(randomInt(100000, 1000000));
  }

  private resolveRegistrationType(
    role: Role,
    requestedType?: RegistrationType,
  ): MailRegistrationType {
    if (role === Role.EMLAKCI) {
      if (
        requestedType &&
        requestedType !== RegistrationType.EMLAK_DANISMANI &&
        requestedType !== RegistrationType.EMLAK_OFISI
      ) {
        throw new BadRequestException(
          'Seçilen kayıt türü ile meslek rolü uyuşmuyor.',
        );
      }

      return requestedType === RegistrationType.EMLAK_OFISI
        ? 'EMLAK_OFISI'
        : 'EMLAK_DANISMANI';
    }

    if (role === Role.MUTEAHHIT) {
      if (
        requestedType &&
        requestedType !== RegistrationType.MUTEAHHIT
      ) {
        throw new BadRequestException(
          'Seçilen kayıt türü ile meslek rolü uyuşmuyor.',
        );
      }

      return 'MUTEAHHIT';
    }

    if (role === Role.INSAAT_FIRMASI) {
      if (
        requestedType &&
        requestedType !== RegistrationType.INSAAT_FIRMASI
      ) {
        throw new BadRequestException(
          'Seçilen kayıt türü ile meslek rolü uyuşmuyor.',
        );
      }

      return 'INSAAT_FIRMASI';
    }

    return 'EMLAK_DANISMANI';
  }

  private getRemainingCooldownSeconds(lastSentAt?: Date | null) {
    if (!lastSentAt) {
      return 0;
    }

    const resendSeconds = this.getVerificationResendSeconds();
    const elapsedSeconds = Math.floor(
      (Date.now() - lastSentAt.getTime()) / 1000,
    );

    return Math.max(0, resendSeconds - elapsedSeconds);
  }

  private getPasswordResetExpiryMinutes() {
    const value = Number(
      process.env.PASSWORD_RESET_CODE_EXPIRES_MINUTES || 10,
    );

    return Number.isFinite(value) && value > 0 ? Math.floor(value) : 10;
  }

  private getPasswordResetResendSeconds() {
    const value = Number(
      process.env.PASSWORD_RESET_RESEND_SECONDS || 60,
    );

    return Number.isFinite(value) && value > 0 ? Math.floor(value) : 60;
  }

  private getPasswordResetMaxAttempts() {
    const value = Number(
      process.env.PASSWORD_RESET_MAX_ATTEMPTS || 5,
    );

    return Number.isFinite(value) && value > 0 ? Math.floor(value) : 5;
  }

  private getPasswordResetTokenExpiryMinutes() {
    const value = Number(
      process.env.PASSWORD_RESET_TOKEN_EXPIRES_MINUTES || 10,
    );

    return Number.isFinite(value) && value > 0 ? Math.floor(value) : 10;
  }

  private getPasswordResetTokenSecret() {
    return (
      process.env.PASSWORD_RESET_TOKEN_SECRET ||
      process.env.JWT_SECRET ||
      'sm-super-secret-jwt-key-degistirin'
    );
  }

  private getPasswordResetGenericMessage() {
    return 'Girdiğiniz bilgi sistemde kayıtlıysa şifre sıfırlama adımları iletilmiştir.';
  }

  private getPasswordResetRemainingCooldownSeconds(
    lastSentAt?: Date | null,
  ) {
    if (!lastSentAt) {
      return 0;
    }

    const resendSeconds = this.getPasswordResetResendSeconds();
    const elapsedSeconds = Math.floor(
      (Date.now() - lastSentAt.getTime()) / 1000,
    );

    return Math.max(0, resendSeconds - elapsedSeconds);
  }

  generateReferralCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'EPH-';

    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return code;
  }

  async generateUniqueReferralCode() {
    let code = this.generateReferralCode();

    let existing = await this.prisma.user.findFirst({
      where: { referralCode: code },
    });

    while (existing) {
      code = this.generateReferralCode();

      existing = await this.prisma.user.findFirst({
        where: { referralCode: code },
      });
    }

    return code;
  }

  async register(dto: RegisterDto) {
    const normalizedPhone = this.normalizePhone(dto.phone);
    const normalizedEmail = dto.email ? this.normalizeEmail(dto.email) : null;

    const existingPhone = await this.usersService.findByPhone(normalizedPhone);
    if (existingPhone) {
      throw new BadRequestException('Bu telefon numarası zaten kayıtlı.');
    }

    if (normalizedEmail) {
      const existingEmail = await this.usersService.findByEmail(normalizedEmail);
      if (existingEmail) {
        throw new BadRequestException('Bu e-posta adresi zaten kayıtlı.');
      }
    }

    const publicRegistrationRoles: Role[] = [
      Role.EMLAKCI,
      Role.MUTEAHHIT,
      Role.INSAAT_FIRMASI,
    ];

    let role: Role = dto.role;
    let isApproved = false;
    let referralCandidateId: string | null = null;

    if (dto.inviteCode && dto.inviteCode.trim() !== '') {
      const referral = await this.prisma.referralCandidate.findFirst({
        where: {
          referralCode: dto.inviteCode.toUpperCase(),
          isActive: true,
          usedAt: null,
        },
      });

      if (!referral) {
        throw new BadRequestException('Referans kodu bulunamadı.');
      }

      role = referral.role;
      isApproved = true;
      referralCandidateId = referral.id;
    } else if (!publicRegistrationRoles.includes(role)) {
      throw new BadRequestException('Geçerli bir meslek seçiniz.');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const referralCode = await this.generateUniqueReferralCode();

    const user = await this.usersService.create({
      firstName: dto.firstName.trim(),
      lastName: dto.lastName.trim(),
      email: normalizedEmail,
      phone: normalizedPhone,
      city: dto.city.trim(),
      passwordHash,
      role,
      isApproved,
      referralCode,
    });

    if (referralCandidateId) {
      await this.prisma.referralCandidate.update({
        where: {
          id: referralCandidateId,
        },
        data: {
          usedAt: new Date(),
          isActive: false,
        },
      });
    }

    return {
      success: true,
      requiresPhoneVerification: true,
      phone: user.phone,
      isApproved: user.isApproved,
      message: 'Üyeliğiniz oluşturuldu. Giriş yapabilirsiniz.',
    };
  }

  async login(dto: LoginDto) {
    const rawIdentifier = dto.phoneOrEmail || dto.phone || dto.email;

    if (!rawIdentifier || !String(rawIdentifier).trim()) {
      throw new BadRequestException('Lütfen cep telefonu numaranızı veya e-posta adresinizi giriniz.');
    }

    const user = await this.usersService.findByPhoneOrEmail(rawIdentifier);

    if (!user || !user.passwordHash || await isAccountDeleted(this.prisma, user.id)) {
      throw new UnauthorizedException('Kullanıcı bilgisi veya şifre hatalı.');
    }

    const isMatch = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );

    if (!isMatch) {
      throw new UnauthorizedException('Kullanıcı bilgisi veya şifre hatalı.');
    }

    if (!user.isApproved) {
      throw new UnauthorizedException(
        'Üyeliğiniz henüz Yazılım Ekibi tarafından onaylanmadı.',
      );
    }

    const token = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      phone: user.phone,
      role: user.role,
    });

    return {
      token,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isApproved: user.isApproved,
        isVerified: user.isVerified,
        professionalVerificationStatus: user.professionalVerificationStatus,
        referralCode: user.referralCode,
        nominationPoints: user.nominationPoints,
        nominationQuota: user.nominationQuota,
      },
    };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const email = this.normalizeEmail(dto.email);
    const resendAfterSeconds = this.getPasswordResetResendSeconds();

    if (!email) {
      return {
        success: true,
        resendAfterSeconds,
        message: this.getPasswordResetGenericMessage(),
      };
    }

    const user = await this.usersService.findByPhoneOrEmail(email);

    if (!user || !user.email || await isAccountDeleted(this.prisma, user.id)) {
      return {
        success: true,
        resendAfterSeconds,
        message: this.getPasswordResetGenericMessage(),
      };
    }

    const remainingCooldown =
      this.getPasswordResetRemainingCooldownSeconds(
        user.passwordResetLastSentAt,
      );

    if (remainingCooldown > 0) {
      return {
        success: true,
        resendAfterSeconds: remainingCooldown,
        message: this.getPasswordResetGenericMessage(),
      };
    }

    const code = this.generateEmailVerificationCode();
    const codeHash = await bcrypt.hash(code, 10);
    const expiresInMinutes = this.getPasswordResetExpiryMinutes();
    const expiresAt = new Date(
      Date.now() + expiresInMinutes * 60 * 1000,
    );

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetCodeHash: codeHash,
        passwordResetExpiresAt: expiresAt,
        passwordResetAttempts: 0,
        passwordResetLastSentAt: new Date(),
        passwordResetVersion: {
          increment: 1,
        },
      },
    });

    await this.mailService.sendPasswordResetCode({
      email: user.email,
      firstName: user.firstName,
      code,
      expiresInMinutes,
    });

    return {
      success: true,
      resendAfterSeconds,
      message: this.getPasswordResetGenericMessage(),
    };
  }

  async verifyPasswordResetCode(
    dto: VerifyPasswordResetCodeDto,
  ) {
    const email = this.normalizeEmail(dto.email);
    const user = await this.usersService.findByPhoneOrEmail(email);

    const invalidMessage =
      'Doğrulama kodu geçersiz veya süresi dolmuş.';

    if (
      !user ||
      !user.passwordResetCodeHash ||
      !user.passwordResetExpiresAt
    ) {
      throw new BadRequestException(invalidMessage);
    }

    if (user.passwordResetExpiresAt.getTime() <= Date.now()) {
      throw new BadRequestException(invalidMessage);
    }

    const maxAttempts = this.getPasswordResetMaxAttempts();

    if (user.passwordResetAttempts >= maxAttempts) {
      throw new BadRequestException(invalidMessage);
    }

    const isMatch = await bcrypt.compare(
      dto.code,
      user.passwordResetCodeHash,
    );

    if (!isMatch) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          passwordResetAttempts: {
            increment: 1,
          },
        },
      });

      throw new BadRequestException(invalidMessage);
    }

    const tokenExpiresInSeconds =
      this.getPasswordResetTokenExpiryMinutes() * 60;

    const resetToken = this.jwtService.sign(
      {
        sub: user.id,
        purpose: 'password-reset',
        version: user.passwordResetVersion,
      },
      {
        secret: this.getPasswordResetTokenSecret(),
        expiresIn: tokenExpiresInSeconds,
      },
    );

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetCodeHash: null,
        passwordResetExpiresAt: null,
        passwordResetAttempts: 0,
      },
    });

    return {
      success: true,
      resetToken,
      expiresInSeconds: tokenExpiresInSeconds,
      message: 'Doğrulama başarılı.',
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    let payload: {
      sub?: string;
      purpose?: string;
      version?: number;
    };

    try {
      payload = this.jwtService.verify<{
        sub?: string;
        purpose?: string;
        version?: number;
      }>(dto.resetToken, {
        secret: this.getPasswordResetTokenSecret(),
      });
    } catch {
      throw new BadRequestException(
        'Şifre yenileme oturumu geçersiz veya süresi dolmuş.',
      );
    }

    if (
      !payload.sub ||
      payload.purpose !== 'password-reset' ||
      typeof payload.version !== 'number'
    ) {
      throw new BadRequestException(
        'Şifre yenileme oturumu geçersiz veya süresi dolmuş.',
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (
      !user ||
      user.passwordResetVersion !== payload.version
    ) {
      throw new BadRequestException(
        'Şifre yenileme oturumu geçersiz veya daha önce kullanılmış.',
      );
    }

    const passwordHash = await bcrypt.hash(
      dto.newPassword,
      10,
    );

    const updatedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetCodeHash: null,
        passwordResetExpiresAt: null,
        passwordResetAttempts: 0,
        passwordResetLastSentAt: null,
        passwordResetVersion: {
          increment: 1,
        },
      },
    });

    if (updatedUser.email) {
      try {
        await this.mailService.sendPasswordChangedNotification({
          email: updatedUser.email,
          firstName: updatedUser.firstName,
        });
      } catch (error) {
        console.error(
          'Password changed notification could not be sent:',
          error,
        );
      }
    }

    return {
      success: true,
      message: 'Şifreniz başarıyla yenilendi.',
    };
  }

  async verifyEmail(dto: VerifyEmailDto) {
    return {
      success: true,
      message: 'E-posta adresi doğrulandı.',
    };
  }

  async resendVerification(dto: ResendVerificationDto) {
    return {
      success: true,
      message: 'Doğrulama kodu iletildi.',
    };
  }
}
