import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseService } from '../supabase/supabase.service';

type UploadPortfolioImageInput = {
  userId: string;
  portfolioId: string;
  file: Express.Multer.File;
  isCover?: boolean;
  sortOrder?: number;
};

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

@Injectable()
export class PortfolioImagesService {
  private readonly bucket =
    process.env.SUPABASE_STORAGE_BUCKET || 'portfolio-images';

  constructor(
    private readonly prisma: PrismaService,
    private readonly supabaseService: SupabaseService,
  ) {}

  async uploadPortfolioImage(input: UploadPortfolioImageInput) {
    const { userId, portfolioId, file, isCover } = input;
    const sortOrder = Number.isFinite(Number(input.sortOrder))
      ? Number(input.sortOrder)
      : isCover
        ? 0
        : 1;

    if (!file) {
      throw new NotFoundException('Yüklenecek görsel bulunamadı.');
    }

    if (!portfolioId) {
      throw new BadRequestException('Portföy ID zorunludur.');
    }

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        'Sadece JPG, PNG veya WEBP formatında görsel yüklenebilir.',
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException('Görsel boyutu en fazla 10 MB olabilir.');
    }

    const unit = await this.prisma.unit.findUnique({
      where: { id: portfolioId },
      include: { project: true },
    });

    if (!unit) {
      throw new NotFoundException('Portföy bulunamadı.');
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

    if (isCover) {
      await this.prisma.unitImage.deleteMany({
        where: {
          unitId: portfolioId,
          isCover: true,
        },
      });
    }

    const image = await this.prisma.unitImage.create({
      data: {
        unitId: portfolioId,
        url: supabaseUrl,
        supabaseUrl,
        path,
        bucket: this.bucket,
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        isCover: Boolean(isCover),
        sortOrder,
      },
    });

    return {
      success: true,
      ...image,
      imageUrl: supabaseUrl,
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
