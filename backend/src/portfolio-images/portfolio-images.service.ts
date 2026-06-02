import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { PrismaService } from '../prisma/prisma.service';

type UploadPortfolioImageInput = {
  userId: string;
  portfolioId: string;
  file: Express.Multer.File;
  isCover?: boolean;
};

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

@Injectable()
export class PortfolioImagesService {
  private readonly bucket =
    process.env.SUPABASE_STORAGE_BUCKET || 'portfolio-images';

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly prisma: PrismaService,
  ) {}

  async uploadPortfolioImage(input: UploadPortfolioImageInput) {
    const { userId, portfolioId, file, isCover } = input;

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

    if (unit.project.ownerId !== userId) {
      throw new BadRequestException('Bu portföye görsel yükleme yetkiniz yok.');
    }

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        'Sadece JPG, PNG veya WEBP formatında görsel yüklenebilir.',
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException('Görsel boyutu en fazla 10 MB olabilir.');
    }

    const existingCount = await this.prisma.unitImage.count({
      where: { unitId: portfolioId },
    });

    if (!isCover && existingCount >= 16) {
      throw new BadRequestException(
        'Bir portföy için en fazla 1 kapak ve 15 galeri fotoğrafı yüklenebilir.',
      );
    }

    if (isCover) {
      await this.prisma.unitImage.updateMany({
        where: { unitId: portfolioId, isCover: true },
        data: { isCover: false },
      });
    }

    const extension = this.getExtension(file.originalname, file.mimetype);
    const safeUserId = this.slugify(userId);
    const safePortfolioId = this.slugify(portfolioId);
    const uniqueName = isCover
      ? `cover.${extension}`
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

    const image = await this.prisma.unitImage.create({
      data: {
        unitId: portfolioId,
        imageUrl,
        storagePath: path,
        bucket: this.bucket,
        fileName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        isCover: Boolean(isCover),
        sortOrder: isCover ? 0 : existingCount + 1,
      },
    });

    return {
      success: true,
      bucket: this.bucket,
      path,
      supabaseUrl,
      imageUrl,
      isCover: Boolean(isCover),
      originalName: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
      image,
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