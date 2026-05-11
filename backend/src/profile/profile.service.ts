import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseService } from '../supabase/supabase.service';
import { DocumentType } from '@prisma/client';

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

  async updateProfile(userId: string, data: { firstName?: string; lastName?: string; phone?: string }) {
    return this.prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
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
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException('Sadece PDF, JPG ve PNG dosyalari yuklenebilir.');
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new BadRequestException('Dosya boyutu 5MB den buyuk olamaz.');
    }

    const ext = file.originalname.split('.').pop();
    const path = `${userId}/${type}_${Date.now()}.${ext}`;

    await this.supabase.uploadFile('documents', path, file.buffer, file.mimetype);
    const fileUrl = this.supabase.getPublicUrl('documents', path);

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