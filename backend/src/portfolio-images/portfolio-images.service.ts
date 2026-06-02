import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseService } from '../supabase/supabase.service';

type UploadPortfolioImageInput = {
  userId: string;
  userRole?: Role | string;
  portfolioId: string;
  file: Express.Multer.File;
  isCover?: boolean;
  sortOrder?: number;
};

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_GALLERY_COUNT = 15;

@Injectable()
export class PortfolioImagesService {
  private readonly bucket =
    process.env.SUPABASE_STORAGE_BUCKET || 'portfolio-images';

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly prisma: PrismaService,
  ) {}

  async uploadPortfolioImage(input: UploadPortfolioImageInput) {
    const { userId, userRole, portfolioId, file, isCover, sortOrder } = input;

    if (!file) {
      throw new NotFoundException('Yüklenecek görsel bulunamadı.');
    }

    if (!portfolioId) {
      throw new BadRequestException('Portföy ID zorunludur.');
    }

    const unit = await this.prisma.unit.findUnique({
      where: { id: portfolioId },
      include: { project: true },
    });

    if (!unit) {
      throw new NotFoundException('Portföy bulunamadı.');
    }

    const isAdmin = userRole === Role.ADMIN || userRole === 'ADMIN';

    if (!isAdmin && unit.project.ownerId !== userId) {
      throw new ForbiddenException('Bu portföye görsel yükleme yetkiniz yok.');
    }

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        'Sadece JPG, PNG veya WEBP formatında görsel yüklenebilir.',
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException('Görsel boyutu en fazla 10 MB olabilir.');
    }

    if (!isCover) {
      const galleryCount = await this.prisma.unitImage.count({
        where: { unitId: portfolioId, isCover: false },
      });

      if (galleryCount >= MAX_GALLERY_COUNT) {
        throw new BadRequestException(
          `Galeri için en fazla ${MAX_GALLERY_COUNT} fotoğraf yüklenebilir.`,
        );
      }
    }

    const extension = this.getExtension(file.originalname, file.mimetype);
    const safeUserId = this.slugify(userId);
    const safePortfolioId = this.slugify(portfolioId);
    const uniqueName = isCover
      ? `cover-${Date.now()}.${extension}`
      : `${Date.now()}-${Math.random().toString(16).slice(2)}.${extension}`;

    const path = `portfolio/${safeUserId}/${safePortfolioId}/${uniqueName}`;

    await this.supabaseService.uploadFile(
      this.bucket,
      path,
      file.buffer,
      file.mimetype,
    );

    const supabaseUrl = this.supabaseService.getPublicUrl(this.bucket, path);
    const imageUrl = this.supabaseService.getImageDomainUrl(path);

    if (isCover) {
      await this.prisma.unitImage.updateMany({
        where: { unitId: portfolioId, isCover: true },
        data: { isCover: false },
      });
    }

    const imageRecord = await this.prisma.unitImage.create({
      data: {
        unitId: portfolioId,
        url: imageUrl,
        supabaseUrl,
        path,
        bucket: this.bucket,
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        isCover: Boolean(isCover),
        sortOrder: Number.isFinite(sortOrder) ? Number(sortOrder) : 0,
      },
    });

    return {
      success: true,
      bucket: this.bucket,
      path,
      supabaseUrl,
      imageUrl,
      image: imageRecord,
      isCover: Boolean(isCover),
      originalName: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
    };
  }

  private getExtension(originalName: string, mimetype: string) {
    const extensionFromName = originalName.split('.').pop()?.toLowerCase();

    if (
      extensionFromName &&
      ['jpg', 'jpeg', 'png', 'webp'].includes(extensionFromName)
    ) {
      return extensionFromName === 'jpeg' ? 'jpg' : extensionFromName;
    }

    if (mimetype === 'image/png') return 'png';
    if (mimetype === 'image/webp') return 'webp';

    return 'jpg';
  }

  private slugify(value: string) {
    return String(value || 'unknown')
      .trim()
      .replace(/[^a-zA-Z0-9-_]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }
}
