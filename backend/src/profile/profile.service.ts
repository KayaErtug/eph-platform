import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseService } from '../supabase/supabase.service';
import { DocumentType } from '@prisma/client';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class ProfileService {
  constructor(
    private prisma: PrismaService,
    private supabase: SupabaseService,
  ) {}

  async getProfile(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
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
        documents: {
          select: {
            id: true,
            type: true,
            status: true,
            fileUrl: true,
            fileName: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  async updateProfile(
    userId: string,
    data: { firstName?: string; lastName?: string; phone?: string },
  ) {
    return this.prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        profileImageUrl: true,
        role: true,
        isApproved: true,
      },
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

    if (file.size > 3 * 1024 * 1024) {
      throw new BadRequestException('Profil fotoğrafı 3MB den büyük olamaz.');
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
      '..',
      'frontend',
      'public',
      'profile-images',
    );

    await fs.mkdir(uploadDir, { recursive: true });

    const fullPath = path.join(uploadDir, fileName);

    await fs.writeFile(fullPath, file.buffer);

    const profileImageUrl = `/profile-images/${fileName}`;

    return this.prisma.user.update({
      where: { id: userId },
      data: { profileImageUrl },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        profileImageUrl: true,
        role: true,
        isApproved: true,
      },
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