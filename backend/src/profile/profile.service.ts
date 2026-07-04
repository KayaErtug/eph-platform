import { BadRequestException, Injectable } from '@nestjs/common';
import { DocumentType } from '@prisma/client';
import * as fs from 'fs/promises';
import * as path from 'path';

import { PrismaService } from '../prisma/prisma.service';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class ProfileService {
  constructor(
    private prisma: PrismaService,
    private supabase: SupabaseService,
  ) {}

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
      createdAt: true,
      city: true,
      district: true,
      memberCode: true,
      referralCode: true,
      memberSince: true,
      nominationPoints: true,
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
            verilenKontor: true,
          },
        })
      : null;

    return {
      ...user,
      coverImageUrl,
      referenceCount: user.nominationPoints,
      kontorCuzdani: wallet,
      currentMembership: membership
        ? {
            ...membership,
            paket: packageInfo,
          }
        : null,
    };
  }

  async updateProfile(
    userId: string,
    data: {
      firstName?: string;
      lastName?: string;
      phone?: string;
      city?: string;
      district?: string;
    },
  ) {
    const safeData = {
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

    await this.prisma.user.update({
      where: { id: userId },
      data: safeData,
    });

    return this.getProfile(userId);
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

    const ext = file.originalname.split('.').pop();
    const filePath = `${userId}/${type}_${Date.now()}.${ext}`;

    await this.supabase.uploadFile(
      'documents',
      filePath,
      file.buffer,
      file.mimetype,
    );

    const fileUrl = this.supabase.getPublicUrl(
      'documents',
      filePath,
    );

    const existing = await this.prisma.document.findFirst({
      where: { userId, type },
    });

    if (existing) {
      return this.prisma.document.update({
        where: { id: existing.id },
        data: {
          fileUrl,
          fileName: file.originalname,
          status: 'PENDING',
        },
      });
    }

    return this.prisma.document.create({
      data: {
        userId,
        type,
        fileUrl,
        fileName: file.originalname,
      },
    });
  }
}
