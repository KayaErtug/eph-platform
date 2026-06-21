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

  async getProfile(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: this.profileSelect(),
    });
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

    return this.prisma.user.update({
      where: { id: userId },
      data: safeData,
      select: this.profileSelect(),
    });
  }

  async uploadAvatar(userId: string, file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Profil fotoğrafı seçilmedi.');
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException('Sadece JPG, PNG veya WEBP yüklenebilir.');
    }

    if (file.size > 1024 * 1024) {
      throw new BadRequestException('Profil fotoğrafı 1MB den büyük olamaz.');
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

    return this.prisma.user.update({
      where: { id: userId },
      data: { profileImageUrl },
      select: this.profileSelect(),
    });
  }

  async uploadDocument(
    userId: string,
    type: DocumentType,
    file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Dosya seçilmedi.');
    }

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];

    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Sadece PDF, JPG ve PNG dosyaları yüklenebilir.',
      );
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new BadRequestException('Dosya boyutu 5MB den büyük olamaz.');
    }

    const ext = file.originalname.split('.').pop();
    const filePath = `${userId}/${type}_${Date.now()}.${ext}`;

    await this.supabase.uploadFile(
      'documents',
      filePath,
      file.buffer,
      file.mimetype,
    );

    const fileUrl = this.supabase.getPublicUrl('documents', filePath);

    const existing = await this.prisma.document.findFirst({
      where: { userId, type },
    });

    if (existing) {
      return this.prisma.document.update({
        where: { id: existing.id },
        data: { fileUrl, fileName: file.originalname, status: 'PENDING' },
      });
    }

    return this.prisma.document.create({
      data: { userId, type, fileUrl, fileName: file.originalname },
    });
  }
}
