import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { Capability, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

import {
  RegistrationType,
  RegisterDto,
} from '../dto/register.dto';
import { EmailVerificationV2Service } from '../email/email-verification-v2.service';
import { PhoneOtpService } from '../otp/phone-otp.service';
import { PrismaService } from '../../prisma/prisma.service';
import { UsersService } from '../../users/users.service';
import { PendingRegistrationService } from './pending-registration.service';

type MailRegistrationType =
  | 'EMLAK_DANISMANI'
  | 'EMLAK_OFISI'
  | 'MUTEAHHIT'
  | 'INSAAT_FIRMASI';

@Injectable()
export class RegistrationV2Service {
  constructor(
    private readonly usersService: UsersService,
    private readonly prisma: PrismaService,
    private readonly pendingService: PendingRegistrationService,
    private readonly phoneOtpService: PhoneOtpService,
    private readonly emailVerificationService: EmailVerificationV2Service,
  ) {}

  private normalizeEmail(email: string) {
    return String(email || '').trim().toLowerCase();
  }

  private resolveMailRegistrationType(
    role: Role,
    registrationType?: string | null,
  ): MailRegistrationType {
    if (role === Role.MUTEAHHIT) {
      return 'MUTEAHHIT';
    }

    if (role === Role.INSAAT_FIRMASI) {
      return 'INSAAT_FIRMASI';
    }

    if (registrationType === RegistrationType.EMLAK_OFISI) {
      return 'EMLAK_OFISI';
    }

    return 'EMLAK_DANISMANI';
  }

  private generateReferralCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'EPH-';

    for (let index = 0; index < 8; index += 1) {
      code += chars.charAt(
        Math.floor(Math.random() * chars.length),
      );
    }

    return code;
  }

  private async generateUniqueReferralCode() {
    let code = this.generateReferralCode();

    while (
      await this.prisma.user.findUnique({
        where: { referralCode: code },
        select: { id: true },
      })
    ) {
      code = this.generateReferralCode();
    }

    return code;
  }

  async start(dto: RegisterDto) {
    const email = this.normalizeEmail(dto.email);
    const phone = String(dto.phone || '').trim();

    const [existingEmail, existingPhone] =
      await Promise.all([
        this.usersService.findByEmail(email),
        this.prisma.user.findUnique({
          where: { phone },
          select: { id: true },
        }),
      ]);

    if (existingEmail) {
      throw new BadRequestException(
        'Bu e-posta zaten kayıtlı.',
      );
    }

    if (existingPhone) {
      throw new BadRequestException(
        'Bu telefon numarası zaten kayıtlı.',
      );
    }

    const allowedRoles: Role[] = [
      Role.EMLAKCI,
      Role.MUTEAHHIT,
      Role.INSAAT_FIRMASI,
    ];

    let role = dto.role;
    let referralCandidateId: string | null = null;
    let inviteCode: string | null = null;

    if (dto.inviteCode?.trim()) {
      inviteCode = dto.inviteCode.trim().toUpperCase();

      const referral =
        await this.prisma.referralCandidate.findFirst({
          where: {
            referralCode: inviteCode,
            isActive: true,
            usedAt: null,
          },
        });

      if (!referral) {
        throw new BadRequestException(
          'Referans kodu bulunamadı.',
        );
      }

      role = referral.role;
      referralCandidateId = referral.id;
    } else if (!allowedRoles.includes(role)) {
      throw new BadRequestException(
        'Geçerli bir meslek seçiniz.',
      );
    }

    const passwordHash = await bcrypt.hash(
      dto.password,
      10,
    );

    const pending =
      await this.pendingService.createOrReplace({
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        email,
        phone,
        passwordHash,
        city: dto.city.trim(),
        role,
        registrationType:
          dto.registrationType ||
          RegistrationType.EMLAK_DANISMANI,
        inviteCode,
        referralCandidateId,
      });

    await this.phoneOtpService.send(pending.id);

    return {
      success: true,
      pendingRegistrationId: pending.id,
      requiresPhoneVerification: true,
      phone: pending.phone,
      message: 'Telefon doğrulama kodu gönderildi.',
    };
  }

  async verifyPhoneOtp(
    pendingRegistrationId: string,
    code: string,
  ) {
    const pending =
      await this.pendingService.findById(
        pendingRegistrationId,
      );

    if (!pending) {
      throw new BadRequestException(
        'Kayıt doğrulama oturumu bulunamadı.',
      );
    }

    if (pending.phoneVerified) {
      return {
        success: true,
        alreadyVerified: true,
        pendingRegistrationId: pending.id,
        requiresEmailVerification: true,
        message:
          'Telefon numaranız zaten doğrulanmış.',
      };
    }

    await this.phoneOtpService.verify(
      pendingRegistrationId,
      code,
    );

    const updated =
      await this.pendingService.markPhoneVerified(
        pendingRegistrationId,
      );

    return {
      success: true,
      pendingRegistrationId: updated.id,
      phoneVerified: true,
      requiresEmailVerification: true,
      email: updated.email,
      message:
        'Telefon numaranız doğrulandı. E-posta doğrulamasına devam ediniz.',
    };
  }

  async resendPhoneOtp(
    pendingRegistrationId: string,
  ) {
    const pending =
      await this.pendingService.findById(
        pendingRegistrationId,
      );

    if (!pending) {
      throw new BadRequestException(
        'Kayıt doğrulama oturumu bulunamadı.',
      );
    }

    if (pending.phoneVerified) {
      throw new BadRequestException(
        'Telefon numarası zaten doğrulanmış.',
      );
    }

    return this.phoneOtpService.send(
      pendingRegistrationId,
    );
  }

  async sendEmailCode(
    pendingRegistrationId: string,
  ) {
    const pending =
      await this.pendingService.findById(
        pendingRegistrationId,
      );

    if (!pending) {
      throw new BadRequestException(
        'Kayıt doğrulama oturumu bulunamadı.',
      );
    }

    if (!pending.phoneVerified) {
      throw new BadRequestException(
        'Önce telefon doğrulamasını tamamlayınız.',
      );
    }

    if (pending.emailVerified) {
      return {
        success: true,
        alreadyVerified: true,
        pendingRegistrationId: pending.id,
        message:
          'E-posta adresiniz zaten doğrulanmış.',
      };
    }

    const registrationType =
      this.resolveMailRegistrationType(
        pending.role,
        pending.registrationType,
      );

    const result =
      await this.emailVerificationService.send(
        pending.id,
        registrationType,
      );

    return {
      ...result,
      pendingRegistrationId: pending.id,
      email: pending.email,
      message:
        'E-posta doğrulama kodu gönderildi.',
    };
  }

  async verifyEmailV2(
    pendingRegistrationId: string,
    code: string,
  ) {
    const pending =
      await this.pendingService.findById(
        pendingRegistrationId,
      );

    if (!pending) {
      throw new BadRequestException(
        'Kayıt doğrulama oturumu bulunamadı.',
      );
    }

    if (!pending.phoneVerified) {
      throw new BadRequestException(
        'Önce telefon doğrulamasını tamamlayınız.',
      );
    }

    if (pending.emailVerified) {
      return {
        success: true,
        alreadyVerified: true,
        pendingRegistrationId: pending.id,
        readyToComplete: true,
        message:
          'E-posta adresiniz zaten doğrulanmış.',
      };
    }

    await this.emailVerificationService.verify(
      pendingRegistrationId,
      code,
    );

    const updated =
      await this.pendingService.markEmailVerified(
        pendingRegistrationId,
      );

    return {
      success: true,
      pendingRegistrationId: updated.id,
      emailVerified: true,
      readyToComplete: true,
      message:
        'E-posta adresiniz doğrulandı. Üyelik kaydınızı tamamlayabilirsiniz.',
    };
  }

  async completeRegistration(
    pendingRegistrationId: string,
  ) {
    const pending =
      await this.pendingService.findById(
        pendingRegistrationId,
      );

    if (!pending) {
      throw new BadRequestException(
        'Kayıt doğrulama oturumu bulunamadı.',
      );
    }

    if (!pending.phoneVerified || !pending.emailVerified) {
      throw new BadRequestException(
        'Telefon ve e-posta doğrulaması tamamlanmalıdır.',
      );
    }

    if (pending.completedAt) {
      const existingUser =
        await this.prisma.user.findFirst({
          where: {
            OR: [
              { email: pending.email },
              { phone: pending.phone },
            ],
          },
          select: {
            id: true,
            email: true,
            phone: true,
            isApproved: true,
            isVerified: true,
          },
        });

      if (existingUser) {
        return {
          success: true,
          alreadyCompleted: true,
          userId: existingUser.id,
          isApproved: existingUser.isApproved,
          isVerified: existingUser.isVerified,
          message:
            'Üyelik kaydınız daha önce tamamlanmış.',
        };
      }
    }

    const duplicateUser =
      await this.prisma.user.findFirst({
        where: {
          OR: [
            { email: pending.email },
            { phone: pending.phone },
          ],
        },
        select: {
          id: true,
        },
      });

    if (duplicateUser) {
      throw new BadRequestException(
        'Bu e-posta veya telefon numarasıyla daha önce hesap oluşturulmuş.',
      );
    }

    const referralCode =
      await this.generateUniqueReferralCode();

    const user = await this.prisma.user.create({
      data: {
        firstName: pending.firstName,
        lastName: pending.lastName,
        email: pending.email,
        phone: pending.phone,
        city: pending.city,
        passwordHash: pending.passwordHash,
        role: pending.role,
        isVerified: true,
        emailVerifiedAt:
          pending.emailVerifiedAt || new Date(),
        isApproved: false,
        referralCode,
      },
    });

    if (
      pending.registrationType ===
      RegistrationType.EMLAK_OFISI
    ) {
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

    if (pending.referralCandidateId) {
      await this.prisma.referralCandidate.updateMany({
        where: {
          id: pending.referralCandidateId,
          usedAt: null,
          isActive: true,
        },
        data: {
          usedAt: new Date(),
          isActive: false,
        },
      });
    }

    await this.pendingService.markCompleted(
      pending.id,
    );

    return {
      success: true,
      userId: user.id,
      isVerified: true,
      isApproved: false,
      membershipStatus: 'BELGE_BEKLIYOR',
      message:
        'Telefon ve e-posta doğrulaması tamamlandı. Mesleki belgelerinizi yükleyerek üyelik onay sürecine devam ediniz.',
    };
  }
}
