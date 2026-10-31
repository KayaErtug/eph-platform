import { BadRequestException, Injectable, Optional } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  Capability,
  PendingRegistrationStatus,
  ProfessionalVerificationStatus,
  Role,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';

import { RegistrationType, RegisterDto } from '../dto/register.dto';
import { EmailVerificationV2Service } from '../email/email-verification-v2.service';
import { PrismaService } from '../../prisma/prisma.service';
import { UsersService } from '../../users/users.service';
import { PendingRegistrationService } from './pending-registration.service';
import { NewUserEvent, NewUserNotifierService } from './new-user-notifier.service';
import { SupabaseService } from '../../supabase/supabase.service';

type MailRegistrationType =
  | 'PROFILE_ONBOARDING'
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
    private readonly emailVerificationService: EmailVerificationV2Service,
    private readonly supabase: SupabaseService,
    private readonly jwtService: JwtService,
    @Optional() private readonly newUserNotifier?: NewUserNotifierService,
  ) {}

  private normalizeEmail(email: string) {
    return String(email || '')
      .trim()
      .toLowerCase();
  }

  private resolveMailRegistrationType(
    role: Role,
    registrationType?: string | null,
  ): MailRegistrationType {
    if (role === Role.ADAY) {
      return 'PROFILE_ONBOARDING';
    }

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
      code += chars.charAt(Math.floor(Math.random() * chars.length));
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

    const [existingEmail, existingPhone] = await Promise.all([
      this.usersService.findByEmail(email),
      this.prisma.user.findUnique({
        where: { phone },
        select: { id: true },
      }),
    ]);

    if (existingEmail) {
      throw new BadRequestException('Bu e-posta zaten kayıtlı.');
    }

    if (existingPhone) {
      throw new BadRequestException('Bu telefon numarası zaten kayıtlı.');
    }

    /*
     * Gecis uyumlulugu:
     * - password varsa eski mobil kayit akisi
     * - password yoksa yeni B modeli (e-posta + telefon)
     */
    const isLegacyFlow = Boolean(String(dto.password || '').trim());

    if (!isLegacyFlow) {
      const pending = await this.pendingService.createOrReplace({
        firstName: '',
        lastName: '',
        email,
        phone,
        passwordHash: null,
        city: null,
        role: Role.ADAY,
        registrationType: null,
        inviteCode: null,
        referralCandidateId: null,
        taxNumber: null,
        taxOffice: null,
        professionalDocumentNumber: null,
      });

      return {
        success: true,
        flow: 'PROFILE_ONBOARDING',
        pendingRegistrationId: pending.id,
        requiresPhoneVerification: true,
        firebasePhoneVerificationRequired: true,
        phone: pending.phone,
        message:
          'E-posta ve telefon bilgileriniz kaydedildi. Telefon doğrulamasına devam ediniz.',
      };
    }

    const firstName = String(dto.firstName || '').trim();
    const lastName = String(dto.lastName || '').trim();
    const city = String(dto.city || '').trim();

    if (!firstName) {
      throw new BadRequestException('Ad alanı zorunludur.');
    }

    if (!lastName) {
      throw new BadRequestException('Soyad alanı zorunludur.');
    }

    if (city.length < 2) {
      throw new BadRequestException('Şehir seçimi zorunludur.');
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

      const referral = await this.prisma.referralCandidate.findFirst({
        where: {
          referralCode: inviteCode,
          isActive: true,
          usedAt: null,
        },
      });

      if (!referral) {
        throw new BadRequestException('Referans kodu bulunamadı.');
      }

      role = referral.role;
      referralCandidateId = referral.id;
    }

    if (!role || !allowedRoles.includes(role)) {
      throw new BadRequestException('Geçerli bir meslek seçiniz.');
    }

    const taxNumber = String(dto.taxNumber || '').replace(/\D/g, '');
    const taxOffice = String(dto.taxOffice || '').trim();
    const professionalDocumentNumber = String(
      dto.professionalDocumentNumber || '',
    ).trim();

    if (role === Role.EMLAKCI && !professionalDocumentNumber) {
      throw new BadRequestException('Yetki belge numarası zorunludur.');
    }

    if (role === Role.MUTEAHHIT || role === Role.INSAAT_FIRMASI) {
      if (!/^\d{10}$/.test(taxNumber)) {
        throw new BadRequestException('Vergi numarası 10 haneli olmalıdır.');
      }

      if (taxOffice.length < 2) {
        throw new BadRequestException('Vergi dairesi zorunludur.');
      }
    }

    const passwordHash = await bcrypt.hash(String(dto.password), 10);

    const pending = await this.pendingService.createOrReplace({
      firstName,
      lastName,
      email,
      phone,
      passwordHash,
      city,
      role,
      registrationType:
        dto.registrationType || RegistrationType.EMLAK_DANISMANI,
      inviteCode,
      referralCandidateId,
      taxNumber,
      taxOffice,
      professionalDocumentNumber,
    });

    return {
      success: true,
      flow: 'LEGACY',
      pendingRegistrationId: pending.id,
      requiresPhoneVerification: true,
      firebasePhoneVerificationRequired: true,
      phone: pending.phone,
      message:
        'Üyelik bilgileriniz kaydedildi. Firebase telefon doğrulamasına devam ediniz.',
    };
  }

  async uploadProfessionalDocument(
    pendingRegistrationId: string,
    file: Express.Multer.File,
  ) {
    if (!String(pendingRegistrationId || '').trim()) {
      throw new BadRequestException('Kayıt başvurusu kimliği zorunludur.');
    }
    const pending = await this.pendingService.findById(pendingRegistrationId);
    if (!pending || pending.completedAt || pending.expiresAt < new Date()) {
      throw new BadRequestException(
        'Kayıt başvurusu bulunamadı veya süresi doldu.',
      );
    }
    if (!file) {
      throw new BadRequestException('Mesleki belge seçilmelidir.');
    }
    const allowed = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowed.includes(file.mimetype)) {
      throw new BadRequestException('Belge PDF, JPG veya PNG olmalıdır.');
    }
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `pending-registration/${pending.id}/${Date.now()}-${safeName}`;
    await this.supabase.uploadFile(
      'documents',
      storagePath,
      file.buffer,
      file.mimetype,
    );
    const professionalDocumentUrl = storagePath;
    await this.prisma.pendingRegistration.update({
      where: { id: pending.id },
      data: {
        professionalDocumentUrl,
        professionalDocumentName: file.originalname,
        professionalDocumentMime: file.mimetype,
      },
    });
    return { success: true, fileName: file.originalname };
  }

  async sendEmailCode(pendingRegistrationId: string) {
    const pending = await this.pendingService.findById(pendingRegistrationId);

    if (!pending) {
      throw new BadRequestException('Kayıt doğrulama oturumu bulunamadı.');
    }

    if (!pending.phoneVerified) {
      throw new BadRequestException('Önce telefon doğrulamasını tamamlayınız.');
    }

    if (pending.emailVerified) {
      return {
        success: true,
        alreadyVerified: true,
        pendingRegistrationId: pending.id,
        message: 'E-posta adresiniz zaten doğrulanmış.',
      };
    }

    const registrationType = this.resolveMailRegistrationType(
      pending.role,
      pending.registrationType,
    );

    const result = await this.emailVerificationService.send(
      pending.id,
      registrationType,
    );

    return {
      ...result,
      pendingRegistrationId: pending.id,
      email: pending.email,
      message: 'E-posta doğrulama kodu gönderildi.',
    };
  }

  async verifyEmailV2(pendingRegistrationId: string, code: string) {
    const pending = await this.pendingService.findById(pendingRegistrationId);

    if (!pending) {
      throw new BadRequestException('Kayıt doğrulama oturumu bulunamadı.');
    }

    if (!pending.phoneVerified) {
      throw new BadRequestException('Önce telefon doğrulamasını tamamlayınız.');
    }

    if (pending.emailVerified) {
      return {
        success: true,
        alreadyVerified: true,
        pendingRegistrationId: pending.id,
        readyToComplete: true,
        message: 'E-posta adresiniz zaten doğrulanmış.',
      };
    }

    await this.emailVerificationService.verify(pendingRegistrationId, code);

    const updated = await this.pendingService.markEmailVerified(
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

  async completeRegistration(pendingRegistrationId: string) {
    // Yeni üye olayı tek noktadan, commit sonrası ve yalnız hesap bu çağrıda oluştuysa tetiklenir.
    let created = null as NewUserEvent | null;
    const result = await this.prisma.$transaction(async (tx) => {
      // Aynı oturum iki paralel tamamlamada iki kullanıcı/belge oluşturamaz.
      await tx.$queryRaw`SELECT "id" FROM "PendingRegistration" WHERE "id" = ${pendingRegistrationId} FOR UPDATE`;
      const pending = await tx.pendingRegistration.findUnique({ where: { id: pendingRegistrationId } });

      if (!pending) {
        throw new BadRequestException('Kayıt doğrulama oturumu bulunamadı.');
      }

      if (!pending.phoneVerified || !pending.emailVerified) {
        throw new BadRequestException(
          'Telefon ve e-posta doğrulaması tamamlanmalıdır.',
        );
      }

      const isProfileOnboardingFlow =
        !pending.passwordHash && pending.role === Role.ADAY;

      if (!isProfileOnboardingFlow && !pending.professionalDocumentUrl) {
        throw new BadRequestException('Mesleki belge yüklenmelidir.');
      }

      if (pending.completedAt) {
        const existingUser = await tx.user.findFirst({
          where: {
            OR: [{ email: pending.email }, { phone: pending.phone }],
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            role: true,
            isApproved: true,
            isVerified: true,
            professionalVerificationStatus: true,
          },
        });

        if (existingUser) {
          if (isProfileOnboardingFlow) {
            const token = this.jwtService.sign({
              sub: existingUser.id,
              email: existingUser.email,
              phone: existingUser.phone,
              role: existingUser.role,
            });

            return {
              success: true,
              alreadyCompleted: true,
              flow: 'PROFILE_ONBOARDING',
              token,
              profileRoute: '/profile',
              user: existingUser,
              message:
                'Kayıt daha önce tamamlandı. Profil bilgilerinizi tamamlayınız.',
            };
          }

          return {
            success: true,
            alreadyCompleted: true,
            userId: existingUser.id,
            isApproved: existingUser.isApproved,
            isVerified: existingUser.isVerified,
            message: 'Üyelik kaydınız daha önce tamamlanmış.',
          };
        }
      }

      const duplicateUser = await tx.user.findFirst({
        where: {
          OR: [{ email: pending.email }, { phone: pending.phone }],
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

      const referralCode = await this.generateUniqueReferralCode();

      if (isProfileOnboardingFlow) {
        const user = await tx.user.create({
          data: {
            firstName: '',
            lastName: '',
            email: pending.email,
            phone: pending.phone,
            passwordHash: null,
            city: null,
            role: Role.ADAY,
            isVerified: true,
            emailVerifiedAt: pending.emailVerifiedAt || new Date(),
            isApproved: true,
            professionalVerificationStatus:
              ProfessionalVerificationStatus.PENDING,
            profileCompleted: false,
            referralCode,
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            role: true,
            isApproved: true,
            isVerified: true,
            professionalVerificationStatus: true,
          },
        });

        await tx.pendingRegistration.update({
          where: { id: pending.id },
          data: { status: PendingRegistrationStatus.COMPLETED, completedAt: new Date() },
        });

        created = { userId: user.id, firstName: '', lastName: '', role: Role.ADAY, isApproved: true, inviteCode: pending.inviteCode };

        const token = this.jwtService.sign({
          sub: user.id,
          email: user.email,
          phone: user.phone,
          role: user.role,
        });

        return {
          success: true,
          flow: 'PROFILE_ONBOARDING',
          token,
          profileRoute: '/profile',
          user,
          message:
            'Telefon ve e-posta doğrulaması tamamlandı. Profil bilgilerinizi tamamlayınız.',
        };
      }

      const user = await tx.user.create({
        data: {
          firstName: pending.firstName,
          lastName: pending.lastName,
          email: pending.email,
          phone: pending.phone,
          city: pending.city,
          passwordHash: pending.passwordHash,
          role: pending.role,
          isVerified: true,
          emailVerifiedAt: pending.emailVerifiedAt || new Date(),
          isApproved: false,
          referralCode,
          taxNumber: pending.taxNumber,
          taxOffice: pending.taxOffice,
          professionalDocumentNumber: pending.professionalDocumentNumber,
        },
      });

      await tx.document.create({
        data: {
          userId: user.id,
          type:
            pending.role === Role.EMLAKCI
              ? pending.registrationType === RegistrationType.EMLAK_OFISI
                ? 'YETKI_BELGESI' : 'MYK_BELGESI'
              : 'YAMBIS_BELGESI',
          fileUrl: pending.professionalDocumentUrl!,
          fileName: pending.professionalDocumentName || 'mesleki-belge',
        },
      });

      if (pending.registrationType === RegistrationType.EMLAK_OFISI) {
        await tx.userCapability.upsert({
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
        await tx.referralCandidate.updateMany({
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

      await tx.pendingRegistration.update({
        where: { id: pending.id },
        data: { status: PendingRegistrationStatus.COMPLETED, completedAt: new Date() },
      });

      created = {
        userId: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        city: user.city,
        district: user.district,
        inviteCode: pending.inviteCode,
        isApproved: user.isApproved,
      };

      return {
        success: true,
        flow: 'LEGACY',
        userId: user.id,
        isVerified: true,
        isApproved: false,
        membershipStatus: 'BELGE_BEKLIYOR',
        message:
          'Telefon ve e-posta doğrulaması tamamlandı. Üyelik onay sürecine devam ediniz.',
      };
    });

    if (created) this.newUserNotifier?.dispatch(created);
    return result;
  }
}
