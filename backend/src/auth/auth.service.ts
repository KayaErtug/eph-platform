import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Capability, Role } from '@prisma/client';
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

  private normalizeEmail(email: string) {
    return String(email || '').trim().toLowerCase();
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

  private async getStoredRegistrationType(user: {
    id: string;
    role: Role;
  }): Promise<MailRegistrationType> {
    if (user.role === Role.MUTEAHHIT) {
      return 'MUTEAHHIT';
    }

    if (user.role === Role.INSAAT_FIRMASI) {
      return 'INSAAT_FIRMASI';
    }

    if (user.role === Role.EMLAKCI) {
      const officeOwnerCapability =
        await this.prisma.userCapability.findFirst({
          where: {
            userId: user.id,
            capability: Capability.OFFICE_OWNER,
          },
          select: {
            id: true,
          },
        });

      return officeOwnerCapability
        ? 'EMLAK_OFISI'
        : 'EMLAK_DANISMANI';
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

  private async createAndStoreVerificationCode(userId: string) {
    const code = this.generateEmailVerificationCode();
    const codeHash = await bcrypt.hash(code, 10);
    const expiresInMinutes = this.getVerificationExpiryMinutes();
    const expiresAt = new Date(
      Date.now() + expiresInMinutes * 60 * 1000,
    );
    const sentAt = new Date();

    await this.prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        emailVerificationCodeHash: codeHash,
        emailVerificationExpiresAt: expiresAt,
        emailVerificationAttempts: 0,
        emailVerificationLastSentAt: sentAt,
      },
    });

    return {
      code,
      expiresInMinutes,
    };
  }

  private async sendVerificationCode(data: {
    userId: string;
    email: string;
    firstName: string;
    registrationType: MailRegistrationType;
  }) {
    const verification = await this.createAndStoreVerificationCode(
      data.userId,
    );

    await this.mailService.sendEmailVerificationCode({
      email: data.email,
      firstName: data.firstName,
      code: verification.code,
      expiresInMinutes: verification.expiresInMinutes,
      registrationType: data.registrationType,
    });
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
    const normalizedEmail = this.normalizeEmail(dto.email);
    const existing = await this.usersService.findByEmail(normalizedEmail);

    if (existing) {
      throw new BadRequestException('Bu e-posta zaten kayıtlı.');
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

    const registrationType = this.resolveRegistrationType(
      role,
      dto.registrationType,
    );
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const referralCode = await this.generateUniqueReferralCode();

    const user = await this.usersService.create({
      firstName: dto.firstName.trim(),
      lastName: dto.lastName.trim(),
      email: normalizedEmail,
      phone: dto.phone,
      city: dto.city.trim(),
      passwordHash,
      role,
      isApproved,
      referralCode,
    });

    if (registrationType === 'EMLAK_OFISI') {
      await this.prisma.userCapability.upsert({
        where: {
          userId_capability: {
            userId: user.id,
            capability: Capability.OFFICE_OWNER,
          },
        },
        update: {},
        create: {
          userId: user.id,
          capability: Capability.OFFICE_OWNER,
          createdById: null,
        },
      });
    }

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

    let verificationEmailSent = true;

    try {
      await this.sendVerificationCode({
        userId: user.id,
        email: user.email,
        firstName: user.firstName,
        registrationType,
      });
    } catch (error) {
      verificationEmailSent = false;
      console.error(
        'E-posta doğrulama kodu gönderilemedi:',
        error instanceof Error ? error.message : 'Bilinmeyen hata',
      );
    }

    return {
      success: true,
      requiresEmailVerification: true,
      verificationEmailSent,
      email: user.email,
      isApproved: user.isApproved,
      resendAfterSeconds: this.getVerificationResendSeconds(),
      message: verificationEmailSent
        ? 'Doğrulama kodu e-posta adresinize gönderildi.'
        : 'Hesabınız oluşturuldu ancak doğrulama e-postası gönderilemedi. Yeniden kod gönderme seçeneğini kullanınız.',
    };
  }

  async verifyEmail(dto: VerifyEmailDto) {
    const email = this.normalizeEmail(dto.email);
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      throw new BadRequestException(
        'E-posta adresi veya doğrulama kodu hatalı.',
      );
    }

    if (user.isVerified) {
      return {
        success: true,
        alreadyVerified: true,
        isApproved: user.isApproved,
        canLogin: user.isApproved,
        message: user.isApproved
          ? 'E-posta adresiniz zaten doğrulanmış. Giriş yapabilirsiniz.'
          : 'E-posta adresiniz zaten doğrulanmış. Başvurunuz Yazılım Ekibi onayı bekliyor.',
      };
    }

    if (
      !user.emailVerificationCodeHash ||
      !user.emailVerificationExpiresAt
    ) {
      throw new BadRequestException(
        'Aktif doğrulama kodu bulunamadı. Yeni kod isteyiniz.',
      );
    }

    const maxAttempts = this.getVerificationMaxAttempts();

    if (user.emailVerificationAttempts >= maxAttempts) {
      throw new BadRequestException(
        'Çok fazla hatalı deneme yapıldı. Yeni doğrulama kodu isteyiniz.',
      );
    }

    if (user.emailVerificationExpiresAt.getTime() < Date.now()) {
      throw new BadRequestException(
        'Doğrulama kodunun süresi doldu. Yeni kod isteyiniz.',
      );
    }

    const isCodeValid = await bcrypt.compare(
      dto.code,
      user.emailVerificationCodeHash,
    );

    if (!isCodeValid) {
      const nextAttemptCount = user.emailVerificationAttempts + 1;

      await this.prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          emailVerificationAttempts: nextAttemptCount,
        },
      });

      const remainingAttempts = Math.max(
        0,
        maxAttempts - nextAttemptCount,
      );

      throw new BadRequestException(
        remainingAttempts > 0
          ? `Doğrulama kodu hatalı. Kalan deneme hakkınız: ${remainingAttempts}.`
          : 'Çok fazla hatalı deneme yapıldı. Yeni doğrulama kodu isteyiniz.',
      );
    }

    await this.prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        isVerified: true,
        emailVerifiedAt: new Date(),
        emailVerificationCodeHash: null,
        emailVerificationExpiresAt: null,
        emailVerificationAttempts: 0,
        emailVerificationLastSentAt: null,
      },
    });

    return {
      success: true,
      isApproved: user.isApproved,
      canLogin: user.isApproved,
      message: user.isApproved
        ? 'E-posta adresiniz doğrulandı. Giriş yapabilirsiniz.'
        : 'E-posta adresiniz doğrulandı. Başvurunuz Yazılım Ekibi onayı bekliyor.',
    };
  }

  async resendVerification(dto: ResendVerificationDto) {
    const email = this.normalizeEmail(dto.email);
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      return {
        success: true,
        message:
          'E-posta adresi sistemde kayıtlıysa yeni doğrulama kodu gönderilmiştir.',
      };
    }

    if (user.isVerified) {
      return {
        success: true,
        alreadyVerified: true,
        isApproved: user.isApproved,
        canLogin: user.isApproved,
        message: user.isApproved
          ? 'E-posta adresiniz zaten doğrulanmış. Giriş yapabilirsiniz.'
          : 'E-posta adresiniz zaten doğrulanmış. Başvurunuz Yazılım Ekibi onayı bekliyor.',
      };
    }

    const remainingCooldownSeconds =
      this.getRemainingCooldownSeconds(
        user.emailVerificationLastSentAt,
      );

    if (remainingCooldownSeconds > 0) {
      throw new BadRequestException(
        `Yeni kod göndermek için ${remainingCooldownSeconds} saniye bekleyiniz.`,
      );
    }

    const registrationType =
      await this.getStoredRegistrationType(user);

    await this.sendVerificationCode({
      userId: user.id,
      email: user.email,
      firstName: user.firstName,
      registrationType,
    });

    return {
      success: true,
      resendAfterSeconds: this.getVerificationResendSeconds(),
      message: 'Yeni doğrulama kodu e-posta adresinize gönderildi.',
    };
  }

  async login(dto: LoginDto) {
    const email = this.normalizeEmail(dto.email);
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException('E-posta veya şifre hatalı.');
    }

    const isMatch = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );

    if (!isMatch) {
      throw new UnauthorizedException('E-posta veya şifre hatalı.');
    }

    if (!user.isVerified) {
      throw new UnauthorizedException(
        'E-posta adresiniz henüz doğrulanmadı.',
      );
    }

    if (!user.isApproved) {
      throw new UnauthorizedException(
        'Üyeliğiniz henüz Yazılım Ekibi tarafından onaylanmadı.',
      );
    }

    const token = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      token,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        isApproved: user.isApproved,
        isVerified: user.isVerified,
        referralCode: user.referralCode,
        nominationPoints: user.nominationPoints,
        nominationQuota: user.nominationQuota,
      },
    };
  }
}
