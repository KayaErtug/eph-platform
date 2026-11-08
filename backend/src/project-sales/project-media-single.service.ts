import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseService } from '../supabase/supabase.service';

// EPH-19: Proje fotoğraflarını ZIP olmadan, tek tek pakete ekler.
const IMAGE_MAX_BYTES = 15 * 1024 * 1024;
const PACKAGE_MAX_IMAGES = 10;
const EXTENSION_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

type SingleUploadInput = {
  userId: string;
  userRole?: Role | string;
  projectCode: string;
  packageId: string;
  file?: Express.Multer.File;
};

@Injectable()
export class ProjectMediaSingleService {
  private readonly logger = new Logger(ProjectMediaSingleService.name);
  private readonly bucket =
    process.env.SUPABASE_STORAGE_BUCKET || 'portfolio-images';

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: SupabaseService,
  ) {}

  async uploadImage(input: SingleUploadInput) {
    const file = input.file;

    if (!file?.buffer?.length) {
      throw new BadRequestException('Fotoğraf yüklenmedi.');
    }

    if (file.size > IMAGE_MAX_BYTES) {
      throw new BadRequestException(
        `Fotoğraf en fazla ${IMAGE_MAX_BYTES / (1024 * 1024)} MB olabilir.`,
      );
    }

    const mimetype = this.detectMime(file.buffer);

    if (!mimetype) {
      throw new BadRequestException(
        'Yalnız JPEG, PNG veya WEBP fotoğraf yüklenebilir.',
      );
    }

    const code = String(input.projectCode || '').trim();

    if (!code) {
      throw new BadRequestException('Proje Kodu zorunludur.');
    }

    const project = await this.prisma.project.findFirst({
      where: {
        code: { equals: code, mode: 'insensitive' },
        ...(input.userRole === Role.SUPER_ADMIN
          ? {}
          : { ownerId: input.userId }),
      },
      select: { id: true, code: true, ownerId: true },
    });

    if (!project) {
      throw new NotFoundException(
        'Proje bulunamadı veya bu projeye erişim yetkiniz yok.',
      );
    }

    const mediaPackage = await this.prisma.projectMediaPackage.findFirst({
      where: { id: input.packageId, projectId: project.id, isActive: true },
      select: { id: true, code: true },
    });

    if (!mediaPackage) {
      throw new NotFoundException('Fotoğraf paketi bulunamadı.');
    }

    const existing = await this.prisma.projectMediaAsset.count({
      where: { packageId: mediaPackage.id },
    });

    if (existing >= PACKAGE_MAX_IMAGES) {
      throw new BadRequestException(
        `Bu pakete en fazla ${PACKAGE_MAX_IMAGES} fotoğraf eklenebilir.`,
      );
    }

    const path =
      `project-media/${this.slug(project.ownerId)}/${this.slug(project.id)}/` +
      `${this.slug(mediaPackage.code)}/${Date.now()}-${randomUUID().slice(0, 8)}.${EXTENSION_BY_MIME[mimetype]}`;

    try {
      await this.storage.uploadFile(this.bucket, path, file.buffer, mimetype);
    } catch (error) {
      this.logger.error(
        `Tek fotoğraf depoya yazılamadı: project=${project.code}, package=${mediaPackage.code}: ${this.message(error)}`,
      );
      throw new BadRequestException(
        `Fotoğraf depoya yüklenemedi. ${this.message(error)}`,
      );
    }

    const url = this.storage.getImageDomainUrl(path);
    const supabaseUrl = this.storage.getPublicUrl(this.bucket, path);

    try {
      const asset = await this.prisma.$transaction(async (tx) => {
        const count = await tx.projectMediaAsset.count({
          where: { packageId: mediaPackage.id },
        });

        if (count >= PACKAGE_MAX_IMAGES) {
          throw new BadRequestException(
            `Bu pakete en fazla ${PACKAGE_MAX_IMAGES} fotoğraf eklenebilir.`,
          );
        }

        return tx.projectMediaAsset.create({
          data: {
            packageId: mediaPackage.id,
            url,
            supabaseUrl,
            path,
            bucket: this.bucket,
            originalName: String(file.originalname || '').slice(0, 200) || null,
            mimetype,
            size: file.size,
            isCover: count === 0,
            sortOrder: count,
          },
          select: { id: true, url: true, isCover: true, sortOrder: true },
        });
      });

      this.logger.log(
        `Proje fotoğrafı yüklendi: project=${project.code}, package=${mediaPackage.code}, sira=${asset.sortOrder + 1}`,
      );

      return {
        success: true,
        asset,
        packageAssetCount: asset.sortOrder + 1,
        packageMaxCount: PACKAGE_MAX_IMAGES,
      };
    } catch (error) {
      await this.storage.removeFile(this.bucket, [path]).catch(() => undefined);
      throw error;
    }
  }

  // EPH-22: Pakete ait tek fotoğrafı siler; kapak silinirse sıradaki fotoğraf kapak olur.
  async deleteAsset(input: { userId: string; userRole?: Role | string; projectCode: string; assetId: string }) {
    const code = String(input.projectCode || '').trim();
    const project = await this.prisma.project.findFirst({
      where: {
        code: { equals: code, mode: 'insensitive' },
        ...(input.userRole === Role.SUPER_ADMIN ? {} : { ownerId: input.userId }),
      },
      select: { id: true },
    });

    if (!project) {
      throw new NotFoundException('Proje bulunamadı veya bu projeye erişim yetkiniz yok.');
    }

    const asset = await this.prisma.projectMediaAsset.findFirst({
      where: { id: input.assetId, package: { projectId: project.id } },
      select: { id: true, packageId: true, path: true, bucket: true, isCover: true },
    });

    if (!asset) {
      throw new NotFoundException('Fotoğraf bulunamadı.');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.projectMediaAsset.delete({ where: { id: asset.id } });
      const rest = await tx.projectMediaAsset.findMany({
        where: { packageId: asset.packageId },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        select: { id: true },
      });
      for (const [index, item] of rest.entries()) {
        await tx.projectMediaAsset.update({ where: { id: item.id }, data: { sortOrder: index, isCover: index === 0 } });
      }
    });

    await this.storage.removeFile(asset.bucket || this.bucket, [asset.path]).catch(() => undefined);

    return { success: true };
  }

  private detectMime(buffer: Buffer) {
    if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return 'image/jpeg';
    }

    const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

    if (buffer.length >= png.length && png.every((value, index) => buffer[index] === value)) {
      return 'image/png';
    }

    if (
      buffer.length >= 12 &&
      buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buffer.subarray(8, 12).toString('ascii') === 'WEBP'
    ) {
      return 'image/webp';
    }

    return null;
  }

  private slug(value: string) {
    return String(value || '')
      .trim()
      .toLocaleLowerCase('tr-TR')
      .replace(/ç/g, 'c')
      .replace(/ğ/g, 'g')
      .replace(/ı/g, 'i')
      .replace(/ö/g, 'o')
      .replace(/ş/g, 's')
      .replace(/ü/g, 'u')
      .replace(/\+/g, '-')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private message(error: unknown) {
    return error instanceof Error ? error.message : String(error);
  }
}
