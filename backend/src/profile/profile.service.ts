import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import {
  Capability,
  DocumentType,
  ProfessionalVerificationStatus,
  Role,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as fs from 'fs/promises';
import * as path from 'path';

import { companyName, requiresCompanyName } from './company-name';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class ProfileService {
  constructor(
    private prisma: PrismaService,
    private supabase: SupabaseService,
  ) {}


  private async createProfessionalDocumentSignedUrl(
    storedValue: string,
  ) {
    try {
      return await this.supabase.createSignedUrl(
        'documents',
        storedValue,
        300,
      );
    } catch (error) {
      console.error(
        'Mesleki belge signed URL üretilemedi:',
        error instanceof Error ? error.message : error,
      );

      return null;
    }
  }

  @Cron('17 * * * *')
  async processScheduledAccountDeletions() {
    const now = new Date();

    const requests =
      await this.prisma.accountDeletionRequest.findMany({
        where: {
          status: 'PENDING',
          scheduledDeletionAt: {
            lte: now,
          },
        },
        select: {
          id: true,
          userId: true,
        },
        orderBy: {
          scheduledDeletionAt: 'asc',
        },
        take: 100,
      });

    for (const request of requests) {
      await this.prisma.$transaction(async (tx) => {
        const claimed =
          await tx.accountDeletionRequest.updateMany({
            where: {
              id: request.id,
              status: 'PENDING',
              scheduledDeletionAt: {
                lte: now,
              },
            },
            data: {
              status: 'COMPLETED',
              completedAt: now,
            },
          });

        if (claimed.count !== 1) {
          return;
        }

        await tx.userBlock.deleteMany({ where: { OR: [{ blockerId: request.userId }, { blockedId: request.userId }] } });
        await tx.pushSubscription.deleteMany({
          where: {
            userId: request.userId,
          },
        });

        await tx.user.update({
          where: {
            id: request.userId,
          },
          data: {
            email: null,
            phone: `deleted-${request.userId}`,
            passwordHash: null,

            firstName: 'Silinmis',
            lastName: 'Kullanici',

            isVerified: false,
            emailVerifiedAt: null,
            emailVerificationCodeHash: null,
            emailVerificationExpiresAt: null,
            emailVerificationAttempts: 0,
            emailVerificationLastSentAt: null,

            passwordResetCodeHash: null,
            passwordResetExpiresAt: null,
            passwordResetAttempts: 0,
            passwordResetLastSentAt: null,
            passwordResetVersion: {
              increment: 1,
            },

            isApproved: false,
            adminVisible: false,

            profileCompleted: false,
            profileCompletedAt: null,
            profileImageUrl: null,

            referralCode: null,
            memberCode: null,

            city: null,
            cityPlateCode: null,
            district: null,

            companyName: null,
            taxNumber: null,
            taxOffice: null,
            professionalDocumentNumber: null,

            pilotKullaniciMi: false,
          },
        });
      });
    }
  }

  private requiredProfessionalDocumentTypes(
    role: Role,
    capabilities: Capability[],
  ): DocumentType[] {
    if (role === Role.EMLAKCI) {
      return [
        DocumentType.YETKI_BELGESI,
        DocumentType.MYK_BELGESI,
        DocumentType.VERGI_LEVHASI,
      ];
    }

    if (
      role === Role.MUTEAHHIT ||
      role === Role.INSAAT_FIRMASI
    ) {
      return [
        DocumentType.YAMBIS_BELGESI,
        DocumentType.VERGI_LEVHASI,
      ];
    }

    return [];
  }

  private profileSelect() {
    return {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      profileImageUrl: true,
      role: true,
      isVerified: true,
      isApproved: true,
      professionalVerificationStatus: true,
      profileCompleted: true,
      profileCompletedAt: true,
      createdAt: true,
      city: true,
      district: true,
      companyName: true,
      taxNumber: true,
      taxOffice: true,
      professionalDocumentNumber: true,
      memberCode: true,
      referralCode: true,
      memberSince: true,
      nominationPoints: true,
      capabilities: {
        select: {
          capability: true,
        },
      },
      office: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
      documents: {
        select: {
          id: true,
          type: true,
          status: true,
          fileUrl: true,
          fileName: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' as const },
      },
    };
  }

  private async getCoverImageUrl(userId: string) {
    const coverDir = path.resolve(
      process.cwd(),
      'public',
      'profile-covers',
    );

    for (const extension of ['jpg', 'png', 'webp']) {
      const filePath = path.join(coverDir, `${userId}.${extension}`);

      try {
        const stat = await fs.stat(filePath);
        return `/api/profile/cover-file/${userId}?v=${Math.floor(stat.mtimeMs)}`;
      } catch {
        continue;
      }
    }

    return null;
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: this.profileSelect(),
    });

    if (!user) return null;

    const capabilities = user.capabilities.map(
      (item) => item.capability,
    );

    const requiredProfessionalDocumentTypes =
      this.requiredProfessionalDocumentTypes(
        user.role,
        capabilities,
      );

    const registrationType =
      user.role === Role.EMLAKCI
        ? capabilities.includes(Capability.OFFICE_OWNER)
          ? 'EMLAK_OFISI'
          : 'EMLAK_DANISMANI'
        : user.role === Role.MUTEAHHIT
          ? 'MUTEAHHIT'
          : user.role === Role.INSAAT_FIRMASI
            ? 'INSAAT_FIRMASI'
            : null;

    const documents = await Promise.all(
      user.documents.map(async (document) => ({
        ...document,
        fileUrl:
          await this.createProfessionalDocumentSignedUrl(
            document.fileUrl,
          ),
      })),
    );

    const [wallet, membership, coverImageUrl] = await Promise.all([
      this.prisma.kontorCuzdani.findUnique({
        where: { kullaniciId: userId },
        select: {
          bakiye: true,
          toplamYukleme: true,
          toplamHarcama: true,
          toplamHediye: true,
        },
      }),
      this.prisma.kullaniciUyelikPaketi.findFirst({
        where: { kullaniciId: userId, durum: 'AKTIF' },
        orderBy: { baslangicTarihi: 'desc' },
        select: {
          paketId: true,
          durum: true,
          baslangicTarihi: true,
          bitisTarihi: true,
          pilotPaketMi: true,
          testPaketiMi: true,
        },
      }),
      this.getCoverImageUrl(userId),
    ]);

    const packageInfo = membership
      ? await this.prisma.uyelikPaketi.findUnique({
          where: { id: membership.paketId },
          select: {
            paketKodu: true,
            paketAdi: true,
            aktifPortfoyLimiti: true,
            aylikPaketPk: true,
          },
        })
      : null;

    const effectiveCompanyName = user.companyName || user.office?.name || null;

    return {
      ...user,
      companyName: effectiveCompanyName,
      office: user.office,
      capabilities,
      registrationType,
      requiredProfessionalDocumentTypes,
      documents,
      coverImageUrl,
      referenceCount: user.nominationPoints,
      kontorCuzdani: wallet,
      currentMembership: membership
        ? {
            ...membership,
            paket: packageInfo
              ? {
                  ...packageInfo,
                  verilenKontor: packageInfo.aylikPaketPk,
                }
              : null,
          }
        : null,
    };
  }

  async updateProfile(
    userId: string,
    data: {
      companyName?: string;
      firstName?: string;
      lastName?: string;
      phone?: string;
      city?: string;
      district?: string;
      taxNumber?: string;
      taxOffice?: string;
    },
  ) {
    const current = await this.prisma.user.findUnique({
      where: { id: userId }, select: { role: true, companyName: true },
    });
    if (!current) throw new NotFoundException('Kullanıcı bulunamadı.');
    const employer = requiresCompanyName(current.role)
      ? companyName(data.companyName === undefined ? current.companyName : data.companyName)
      : data.companyName === undefined ? undefined : companyName(data.companyName);
    const safeData = {
      ...(employer !== undefined ? { companyName: employer } : {}),
      ...(data.firstName !== undefined
        ? { firstName: String(data.firstName || '').trim() }
        : {}),
      ...(data.lastName !== undefined
        ? { lastName: String(data.lastName || '').trim() }
        : {}),
      ...(data.phone !== undefined
        ? { phone: String(data.phone || '').trim() }
        : {}),
      ...(data.city !== undefined
        ? { city: String(data.city || '').trim() || null }
        : {}),
      ...(data.district !== undefined
        ? { district: String(data.district || '').trim() || null }
        : {}),
      ...(data.taxNumber !== undefined
        ? { taxNumber: String(data.taxNumber || '').replace(/\D/g, '') || null }
        : {}),
      ...(data.taxOffice !== undefined
        ? { taxOffice: String(data.taxOffice || '').trim() || null }
        : {}),
    };

    if ('firstName' in safeData && !safeData.firstName) {
      throw new BadRequestException('Ad alanı boş olamaz.');
    }

    if ('lastName' in safeData && !safeData.lastName) {
      throw new BadRequestException('Soyad alanı boş olamaz.');
    }

    if ('firstName' in safeData && safeData.firstName.length > 20) {
      throw new BadRequestException('Ad en fazla 20 karakter olabilir.');
    }

    if ('lastName' in safeData && safeData.lastName.length > 20) {
      throw new BadRequestException('Soyad en fazla 20 karakter olabilir.');
    }

    if ('phone' in safeData && safeData.phone) {
      const phone = String(safeData.phone).trim();
      if (!/^\+90 5\d{2} \d{3} \d{2} \d{2}$/.test(phone)) {
        throw new BadRequestException(
          'Telefon formatı +90 5xx xxx xx xx olmalıdır.',
        );
      }
    }

    if (
      'taxNumber' in safeData &&
      safeData.taxNumber &&
      !/^\d{10}$/.test(safeData.taxNumber)
    ) {
      throw new BadRequestException('Vergi numarası 10 haneli olmalıdır.');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: safeData,
    });

    return this.getProfile(userId);
  }

  async completeInitialProfile(
    userId: string,
    data: {
      companyName?: string;
      firstName?: string;
      lastName?: string;
      city?: string;
      district?: string;
      role?: Role;
      registrationType?: string;
      password?: string;
    },
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        phone: true,
        role: true,
        passwordHash: true,
        professionalVerificationStatus: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Kullanıcı bulunamadı.');
    }

    if (user.role !== Role.ADAY) {
      throw new BadRequestException(
        'Meslek rolünüz daha önce seçilmiş. Rol değişikliği yalnız Yazılım Ekibi tarafından yapılabilir.',
      );
    }

    if (user.passwordHash) {
      throw new BadRequestException(
        'İlk şifre oluşturma işlemi daha önce tamamlanmış.',
      );
    }

    const firstName = String(data.firstName || '').trim();
    const lastName = String(data.lastName || '').trim();
    const city = String(data.city || '').trim();
    const district = String(data.district || '').trim();
    const password = String(data.password || '');

    if (!firstName) {
      throw new BadRequestException('Ad alanı zorunludur.');
    }

    if (!lastName) {
      throw new BadRequestException('Soyad alanı zorunludur.');
    }

    if (firstName.length > 20) {
      throw new BadRequestException('Ad en fazla 20 karakter olabilir.');
    }

    if (lastName.length > 20) {
      throw new BadRequestException('Soyad en fazla 20 karakter olabilir.');
    }

    if (city.length < 2) {
      throw new BadRequestException('Şehir seçimi zorunludur.');
    }

    if (password.length < 6) {
      throw new BadRequestException(
        'Şifre en az 6 karakter olmalıdır.',
      );
    }

    const allowedRoles: Role[] = [
      Role.EMLAKCI,
      Role.MUTEAHHIT,
      Role.INSAAT_FIRMASI,
    ];

    const selectedRole = data.role;

    if (!selectedRole || !allowedRoles.includes(selectedRole)) {
      throw new BadRequestException('Geçerli bir meslek seçiniz.');
    }

    const requestedType = String(data.registrationType || '').trim();

    let resolvedRegistrationType: string;

    if (selectedRole === Role.EMLAKCI) {
      if (
        requestedType &&
        requestedType !== 'EMLAK_DANISMANI' &&
        requestedType !== 'EMLAK_OFISI'
      ) {
        throw new BadRequestException(
          'Seçilen kayıt türü ile meslek rolü uyuşmuyor.',
        );
      }

      resolvedRegistrationType =
        requestedType === 'EMLAK_OFISI'
          ? 'EMLAK_OFISI'
          : 'EMLAK_DANISMANI';
    } else if (selectedRole === Role.MUTEAHHIT) {
      if (requestedType && requestedType !== 'MUTEAHHIT') {
        throw new BadRequestException(
          'Seçilen kayıt türü ile meslek rolü uyuşmuyor.',
        );
      }

      resolvedRegistrationType = 'MUTEAHHIT';
    } else {
      if (requestedType && requestedType !== 'INSAAT_FIRMASI') {
        throw new BadRequestException(
          'Seçilen kayıt türü ile meslek rolü uyuşmuyor.',
        );
      }

      resolvedRegistrationType = 'INSAAT_FIRMASI';
    }

    const employer = companyName(data.companyName);
    const passwordHash = await bcrypt.hash(password, 10);

    await this.prisma.$transaction(async (tx) => {
      const current = await tx.user.findUnique({
        where: { id: userId },
        select: {
          role: true,
          passwordHash: true,
        },
      });

      if (!current) {
        throw new NotFoundException('Kullanıcı bulunamadı.');
      }

      if (current.role !== Role.ADAY || current.passwordHash) {
        throw new BadRequestException(
          'İlk profil kurulumu daha önce tamamlanmış.',
        );
      }

      await tx.user.update({
        where: { id: userId },
        data: {
          firstName,
          lastName,
          companyName: employer,
          city,
          district: district || null,
          role: selectedRole,
          passwordHash,
          professionalVerificationStatus:
            ProfessionalVerificationStatus.PENDING,
          profileCompleted: false,
          profileCompletedAt: null,
        },
      });

      // PROFILE_ONBOARDING'de meslek henüz bilinmediği için kayıt belgesi
      // PendingRegistration'da bekler. Meslek seçildiğinde gerçek Document'a aktar.
      const pendingDocument = await tx.pendingRegistration.findFirst({
        where: {
          email: user.email,
          phone: user.phone,
          phoneVerified: true,
          emailVerified: true,
          completedAt: { not: null },
          professionalDocumentUrl: { not: null },
        },
        orderBy: { completedAt: 'desc' },
      });
      if (pendingDocument?.professionalDocumentUrl) {
        const existingDocument = await tx.document.findFirst({
          where: { userId, fileUrl: pendingDocument.professionalDocumentUrl },
        });
        if (!existingDocument) {
          await tx.document.create({
            data: {
              userId,
              type: selectedRole === Role.EMLAKCI
                ? resolvedRegistrationType === 'EMLAK_OFISI'
                  ? DocumentType.YETKI_BELGESI : DocumentType.MYK_BELGESI
                : DocumentType.YAMBIS_BELGESI,
              status: 'PENDING',
              fileUrl: pendingDocument.professionalDocumentUrl,
              fileName: pendingDocument.professionalDocumentName || 'mesleki-belge',
            },
          });
        }
      }

      if (resolvedRegistrationType === 'EMLAK_OFISI') {
        await tx.userCapability.upsert({
          where: {
            userId_capability: {
              userId,
              capability: Capability.OFFICE_OWNER,
            },
          },
          update: {},
          create: {
            userId,
            capability: Capability.OFFICE_OWNER,
            createdById: null,
          },
        });
      }
    });

    return {
      success: true,
      registrationType: resolvedRegistrationType,
      professionalVerificationStatus:
        ProfessionalVerificationStatus.PENDING,
      profileRoute: '/profile',
      requiresProfessionalVerification: true,
      message:
        'Profil temel bilgileriniz kaydedildi. Mesleki doğrulama bilgilerinizi ve belgenizi tamamlayınız.',
    };
  }

  async uploadAvatar(userId: string, file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Profil fotoğrafı seçilmedi.');
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Sadece JPG, PNG veya WEBP yüklenebilir.',
      );
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new BadRequestException(
        'Profil fotoğrafı 5MB den büyük olamaz.',
      );
    }

    const safeExt =
      file.mimetype === 'image/png'
        ? 'png'
        : file.mimetype === 'image/webp'
          ? 'webp'
          : 'jpg';

    const fileName = `${userId}_${Date.now()}.${safeExt}`;

    const uploadDir = path.resolve(
      process.cwd(),
      'public',
      'profile-images',
    );

    await fs.mkdir(uploadDir, { recursive: true });
    await fs.writeFile(path.join(uploadDir, fileName), file.buffer);

    const profileImageUrl = `/api/profile/avatar-file/${fileName}`;

    await this.prisma.user.update({
      where: { id: userId },
      data: { profileImageUrl },
    });

    return this.getProfile(userId);
  }

  async uploadCover(userId: string, file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Kapak görseli seçilmedi.');
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Kapak görseli JPG, PNG veya WEBP olmalıdır.',
      );
    }

    if (file.size > 8 * 1024 * 1024) {
      throw new BadRequestException(
        'Kapak görseli 8MB den büyük olamaz.',
      );
    }

    const safeExt =
      file.mimetype === 'image/png'
        ? 'png'
        : file.mimetype === 'image/webp'
          ? 'webp'
          : 'jpg';

    const uploadDir = path.resolve(
      process.cwd(),
      'public',
      'profile-covers',
    );

    await fs.mkdir(uploadDir, { recursive: true });

    await Promise.all(
      ['jpg', 'png', 'webp'].map(async (extension) => {
        try {
          await fs.unlink(path.join(uploadDir, `${userId}.${extension}`));
        } catch {
          return;
        }
      }),
    );

    await fs.writeFile(
      path.join(uploadDir, `${userId}.${safeExt}`),
      file.buffer,
    );

    return this.getProfile(userId);
  }

  async uploadDocument(
    userId: string,
    type: DocumentType,
    file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Dosya seçilmedi.');
    }

    const normalizedType = String(type || '')
      .trim()
      .toUpperCase() as DocumentType;

    if (
      !Object.values(DocumentType).includes(normalizedType)
    ) {
      throw new BadRequestException(
        'Geçersiz belge türü.',
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        role: true,
        companyName: true,
        office: { select: { id: true, name: true } },
        professionalVerificationStatus: true,
        capabilities: {
          select: {
            capability: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Kullanıcı bulunamadı.');
    }

    const effectiveCompanyName = (user.companyName || user.office?.name || '').trim();
    if (requiresCompanyName(user.role)) companyName(effectiveCompanyName);

    const capabilities = user.capabilities.map(
      (item) => item.capability,
    );

    if (user.professionalVerificationStatus !== null) {
      const requiredTypes =
        this.requiredProfessionalDocumentTypes(
          user.role,
          capabilities,
        );

      if (!requiredTypes.length) {
        throw new BadRequestException(
          'Bu hesap için mesleki belge yükleme işlemi kullanılamaz.',
        );
      }

      if (!requiredTypes.includes(normalizedType)) {
        throw new BadRequestException(
          `Bu meslek için belge türü uygun değil. Zorunlu belge türleri: ${requiredTypes.join(', ')}.`,
        );
      }
    }

    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Sadece PDF, JPG ve PNG dosyaları yüklenebilir.',
      );
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new BadRequestException(
        'Dosya boyutu 5MB den büyük olamaz.',
      );
    }

    const extension =
      file.mimetype === 'application/pdf'
        ? 'pdf'
        : file.mimetype === 'image/png'
          ? 'png'
          : 'jpg';

    const filePath =
      `${userId}/${normalizedType}_${Date.now()}.${extension}`;

    await this.supabase.uploadFile(
      'documents',
      filePath,
      file.buffer,
      file.mimetype,
    );

    const document = await this.prisma.$transaction(
      async (tx) => {
        const existing = await tx.document.findFirst({
          where: {
            userId,
            type: normalizedType,
          },
        });

        const saved = existing
          ? await tx.document.update({
              where: { id: existing.id },
              data: {
                fileUrl: filePath,
                fileName: file.originalname,
                status: 'PENDING',
              },
            })
          : await tx.document.create({
              data: {
                userId,
                type: normalizedType,
                fileUrl: filePath,
                fileName: file.originalname,
                status: 'PENDING',
              },
            });

        if (!user.companyName && user.office?.name) {
          await tx.user.update({
            where: { id: userId },
            data: { companyName: user.office.name },
          });
        }

        if (
          user.professionalVerificationStatus !== null &&
          user.professionalVerificationStatus !==
            ProfessionalVerificationStatus.VERIFIED
        ) {
          await tx.user.update({
            where: { id: userId },
            data: {
              professionalVerificationStatus:
                ProfessionalVerificationStatus.PENDING,
              profileCompleted: false,
              profileCompletedAt: null,
            },
          });
        }

        return saved;
      },
    );

    return {
      ...document,
      fileUrl:
        await this.createProfessionalDocumentSignedUrl(
          document.fileUrl,
        ),
      professionalVerificationStatus:
        user.professionalVerificationStatus === null
          ? null
          : ProfessionalVerificationStatus.PENDING,
    };
  }

  async requestAccountDeletion(userId: string, confirmation?: string) {
    if (confirmation !== 'HESABIMI SIL') {
      throw new BadRequestException(
        'Hesap silme onayı geçersiz.',
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });

    if (!user) {
      throw new NotFoundException('Kullanıcı bulunamadı.');
    }

    if (user.role === 'SUPER_ADMIN') {
      throw new BadRequestException(
        'Yazılım Ekibi hesabı uygulama içinden silinemez.',
      );
    }

    const existing = await this.prisma.accountDeletionRequest.findFirst({
      where: { userId, status: 'PENDING' },
      orderBy: { requestedAt: 'desc' },
    });

    if (existing) {
      return {
        success: true,
        scheduledDeletionAt: existing.scheduledDeletionAt,
      };
    }

    const scheduledDeletionAt = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000,
    );

    const request = await this.prisma.$transaction(async (tx) => {
      await tx.pushSubscription.deleteMany({ where: { userId } });
      await tx.user.update({
        where: { id: userId },
        data: {
          isApproved: false,
          adminVisible: false,
          passwordResetVersion: { increment: 1 },
        },
      });

      return tx.accountDeletionRequest.create({
        data: { userId, scheduledDeletionAt },
      });
    });

    return {
      success: true,
      scheduledDeletionAt: request.scheduledDeletionAt,
    };
  }
}
