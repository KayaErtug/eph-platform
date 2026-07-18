import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  PortfolioApprovalStatus,
  PortfolioAuthorityType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseService } from '../supabase/supabase.service';

type UploadPortfolioImageInput = {
  userId: string;
  userRole?: string;
  portfolioId: string;
  file: Express.Multer.File;
  isCover?: boolean;
  sortOrder?: number;
};

type ImageActionInput = {
  userId: string;
  userRole?: string;
  imageId: string;
};

type ReorderPortfolioImagesInput = {
  userId: string;
  userRole?: string;
  portfolioId: string;
  imageIds: string[];
};

type UploadAuthorityDocumentInput = {
  userId: string;
  userRole?: string;
  portfolioId: string;
  authorityType: PortfolioAuthorityType;
  documentSide?: string;
  file: Express.Multer.File;
};

type AuthorityDocumentActionInput = {
  userId: string;
  userRole?: string;
  documentId: string;
  rejectReason?: string;
};

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_DOCUMENT_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_FILE_SIZE = 15 * 1024 * 1024;
const MAX_DOCUMENT_FILE_SIZE = 15 * 1024 * 1024;

const AUTHORITY_DOCUMENT_TYPES = [
  PortfolioAuthorityType.YETKI_BELGESI,
  PortfolioAuthorityType.TAPU,
  PortfolioAuthorityType.TAPU_SAHIBI_KIMLIK,
  PortfolioAuthorityType.KAT_KARSILIGI_SOZLESMESI,
  PortfolioAuthorityType.DIGER_DOGRULAMA_EVRAKI,
];

@Injectable()
export class PortfolioImagesService {
  private readonly bucket =
    process.env.SUPABASE_STORAGE_BUCKET || 'portfolio-images';

  constructor(
    private readonly prisma: PrismaService,
    private readonly supabaseService: SupabaseService,
  ) {}

  async getPortfolioImages(portfolioId: string) {
    if (!portfolioId) {
      throw new BadRequestException('Portföy ID zorunludur.');
    }

    const unit = await this.prisma.unit.findUnique({
      where: { id: portfolioId },
      select: { id: true },
    });

    if (!unit) {
      throw new NotFoundException('Portföy bulunamadı.');
    }

    return this.prisma.unitImage.findMany({
      where: { unitId: portfolioId },
      orderBy: [{ isCover: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

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
      throw new BadRequestException(
        `Yüklediğiniz görsel dosyası çok büyük. Her bir görsel en fazla 15 MB olabilir. Seçtiğiniz görsel: ${(file.size / (1024 * 1024)).toFixed(1)} MB. Lütfen daha düşük boyutlu bir JPG, PNG veya WEBP görsel yükleyiniz.`,
      );
    }

    await this.assertCanManagePortfolio({
      userId,
      userRole: input.userRole,
      portfolioId,
    });

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
      await this.prisma.unitImage.updateMany({
        where: {
          unitId: portfolioId,
          isCover: true,
        },
        data: {
          isCover: false,
          sortOrder: 1,
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



  async getAuthorityDocuments(input: {
    userId: string;
    userRole?: string;
    portfolioId: string;
  }) {
    if (!input.portfolioId) {
      throw new BadRequestException('Portföy ID zorunludur.');
    }

    await this.assertCanManageSensitivePortfolio({
      userId: input.userId,
      userRole: input.userRole,
      portfolioId: input.portfolioId,
    });

    return this.prisma.portfolioAuthorityDocument.findMany({
      where: { unitId: input.portfolioId },
      orderBy: [{ createdAt: 'desc' }],
    });
  }

  async uploadAuthorityDocument(input: UploadAuthorityDocumentInput) {
    const { userId, portfolioId, file } = input;
    const authorityType = input.authorityType;
    const documentSide = this.cleanDocumentSide(input.documentSide);

    if (!file) {
      throw new NotFoundException('Yüklenecek belge bulunamadı.');
    }

    if (!portfolioId) {
      throw new BadRequestException('Portföy ID zorunludur.');
    }

    if (!AUTHORITY_DOCUMENT_TYPES.includes(authorityType)) {
      throw new BadRequestException('Geçersiz belge tipi.');
    }

    if (!ALLOWED_DOCUMENT_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('Sadece JPG, PNG, WEBP veya PDF belge yüklenebilir.');
    }

    if (file.size > MAX_DOCUMENT_FILE_SIZE) {
      throw new BadRequestException(
        `Yüklediğiniz belge dosyası çok büyük. Her belge en fazla 15 MB olabilir. Seçtiğiniz belge: ${(file.size / (1024 * 1024)).toFixed(1)} MB.`,
      );
    }

    const unit = await this.assertCanManageSensitivePortfolio({
      userId,
      userRole: input.userRole,
      portfolioId,
    });

    this.ensurePortfolioContentEditable(
      input.userRole,
      unit.approvalStatus,
    );

    const extension = this.getDocumentExtension(file.originalname, file.mimetype);
    const safeUserId = this.slugify(userId);
    const safePortfolioId = this.slugify(portfolioId);
    const safeAuthorityType = this.slugify(authorityType);
    const safeSide = this.slugify(documentSide || 'belge');
    const uniqueName = `${safeSide}-${Date.now()}-${Math.random().toString(16).slice(2)}.${extension}`;
    const path = `portfolio-documents/${safeUserId}/${safePortfolioId}/${safeAuthorityType}/${uniqueName}`;

    await this.supabaseService.uploadFile(
      this.bucket,
      path,
      file.buffer,
      file.mimetype,
    );

    const fileUrl = this.supabaseService.getPublicUrl(this.bucket, path);

    if (authorityType === PortfolioAuthorityType.TAPU_SAHIBI_KIMLIK && documentSide) {
      const previousDocuments = await this.prisma.portfolioAuthorityDocument.findMany({
        where: {
          unitId: portfolioId,
          authorityType,
          documentSide,
          approved: false,
        },
      });

      await Promise.all(
        previousDocuments.map(async (document) => {
          await this.tryRemoveStorageFile(this.bucket, this.getPathFromPublicUrl(document.fileUrl));
          return this.prisma.portfolioAuthorityDocument.delete({ where: { id: document.id } });
        }),
      );
    }

    const document = await this.prisma.portfolioAuthorityDocument.create({
      data: {
        unitId: portfolioId,
        authorityType,
        documentSide,
        fileUrl,
        fileName: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        approved: false,
      },
    });

    return {
      success: true,
      ...document,
      documentUrl: fileUrl,
    };
  }

  async approveAuthorityDocument(input: AuthorityDocumentActionInput) {
    this.ensureSuperAdmin(input.userRole);

    const document = await this.prisma.portfolioAuthorityDocument.findUnique({
      where: { id: input.documentId },
    });

    if (!document) {
      throw new NotFoundException('Belge bulunamadı.');
    }

    return this.prisma.portfolioAuthorityDocument.update({
      where: { id: input.documentId },
      data: {
        approved: true,
        approvedById: input.userId,
        approvedAt: new Date(),
        rejectReason: null,
      },
    });
  }

  async rejectAuthorityDocument(input: AuthorityDocumentActionInput) {
    this.ensureSuperAdmin(input.userRole);

    const document = await this.prisma.portfolioAuthorityDocument.findUnique({
      where: { id: input.documentId },
    });

    if (!document) {
      throw new NotFoundException('Belge bulunamadı.');
    }

    return this.prisma.portfolioAuthorityDocument.update({
      where: { id: input.documentId },
      data: {
        approved: false,
        approvedById: null,
        approvedAt: null,
        rejectReason: input.rejectReason || 'Belge reddedildi.',
      },
    });
  }

  async deleteAuthorityDocument(input: AuthorityDocumentActionInput) {
    const document = await this.prisma.portfolioAuthorityDocument.findUnique({
      where: { id: input.documentId },
      include: {
        unit: {
          include: { project: true },
        },
      },
    });

    if (!document) {
      throw new NotFoundException('Belge bulunamadı.');
    }

    const isSuperAdmin = input.userRole === 'SUPER_ADMIN';
    const isOwner = document.unit.project.ownerId === input.userId;

    if (!isSuperAdmin && !isOwner) {
      throw new ForbiddenException('Bu belgeyi silme yetkiniz yok.');
    }

    if (document.approved && !isSuperAdmin) {
      throw new ForbiddenException('Onaylı belge sadece Yazılım Ekibi tarafından silinebilir.');
    }

    this.ensurePortfolioContentEditable(
      input.userRole,
      document.unit.approvalStatus,
    );

    await this.tryRemoveStorageFile(this.bucket, this.getPathFromPublicUrl(document.fileUrl));

    await this.prisma.portfolioAuthorityDocument.delete({
      where: { id: input.documentId },
    });

    return { success: true };
  }


  async setCoverImage(input: ImageActionInput) {
    const image = await this.prisma.unitImage.findUnique({
      where: { id: input.imageId },
      include: {
        unit: {
          include: {
            project: true,
          },
        },
      },
    });

    if (!image) {
      throw new NotFoundException('Görsel bulunamadı.');
    }

    await this.assertCanManagePortfolio({
      userId: input.userId,
      userRole: input.userRole,
      portfolioId: image.unitId,
    });

    await this.prisma.$transaction([
      this.prisma.unitImage.updateMany({
        where: { unitId: image.unitId },
        data: { isCover: false },
      }),
      this.prisma.unitImage.update({
        where: { id: image.id },
        data: {
          isCover: true,
          sortOrder: 0,
        },
      }),
    ]);

    return this.getPortfolioImages(image.unitId);
  }

  async deleteImage(input: ImageActionInput) {
    const image = await this.prisma.unitImage.findUnique({
      where: { id: input.imageId },
      include: {
        unit: {
          include: {
            project: true,
          },
        },
      },
    });

    if (!image) {
      throw new NotFoundException('Görsel bulunamadı.');
    }

    await this.assertCanManagePortfolio({
      userId: input.userId,
      userRole: input.userRole,
      portfolioId: image.unitId,
    });

    const imageCount = await this.prisma.unitImage.count({
      where: { unitId: image.unitId },
    });

    if (image.isCover && imageCount > 1) {
      throw new BadRequestException(
        'Kapak görselini silmeden önce galeriden başka bir görseli kapak yapın.',
      );
    }

    await this.tryRemoveStorageFile(image.bucket || this.bucket, image.path);

    await this.prisma.unitImage.delete({
      where: { id: image.id },
    });

    const remainingImages = await this.prisma.unitImage.findMany({
      where: { unitId: image.unitId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    await Promise.all(
      remainingImages.map((item, index) =>
        this.prisma.unitImage.update({
          where: { id: item.id },
          data: { sortOrder: item.isCover ? 0 : index + 1 },
        }),
      ),
    );

    return this.getPortfolioImages(image.unitId);
  }

  async reorderImages(input: ReorderPortfolioImagesInput) {
    if (!input.portfolioId) {
      throw new BadRequestException('Portföy ID zorunludur.');
    }

    if (!Array.isArray(input.imageIds) || input.imageIds.length === 0) {
      throw new BadRequestException('Sıralanacak görsel listesi zorunludur.');
    }

    await this.assertCanManagePortfolio({
      userId: input.userId,
      userRole: input.userRole,
      portfolioId: input.portfolioId,
    });

    const images = await this.prisma.unitImage.findMany({
      where: { unitId: input.portfolioId },
    });

    const imageSet = new Set(images.map((image) => image.id));

    const hasForeignImage = input.imageIds.some((imageId) => !imageSet.has(imageId));

    if (hasForeignImage) {
      throw new BadRequestException(
        'Sıralama listesinde bu portföye ait olmayan görsel var.',
      );
    }

    await Promise.all(
      input.imageIds.map((imageId, index) =>
        this.prisma.unitImage.update({
          where: { id: imageId },
          data: { sortOrder: index },
        }),
      ),
    );

    return this.getPortfolioImages(input.portfolioId);
  }



  private ensurePortfolioContentEditable(
    userRole: string | undefined,
    approvalStatus?: PortfolioApprovalStatus | string | null,
  ) {
    if (String(userRole || '').toUpperCase() === 'SUPER_ADMIN') {
      return;
    }

    const normalizedStatus = String(
      approvalStatus || '',
    ).toUpperCase();

    const lockedStatuses = new Set<PortfolioApprovalStatus>([
      PortfolioApprovalStatus.INCELEMEYE_GONDERILDI,
      PortfolioApprovalStatus.INCELEMEDE,
      PortfolioApprovalStatus.ONAYLANDI,
      PortfolioApprovalStatus.HAVUZDA,
    ]);

    const contentLocked = lockedStatuses.has(
      normalizedStatus as PortfolioApprovalStatus,
    );

    if (contentLocked) {
      throw new ForbiddenException(
        'Portföy incelemeye gönderildikten sonra fotoğraf veya belge değiştirilemez. Düzeltme için portföyün Eksik Bilgi durumuna alınması gerekir.',
      );
    }
  }

  private async assertCanManageSensitivePortfolio(input: {
    userId: string;
    userRole?: string;
    portfolioId: string;
  }) {
    const unit = await this.prisma.unit.findUnique({
      where: { id: input.portfolioId },
      include: { project: true },
    });

    if (!unit) {
      throw new NotFoundException('Portföy bulunamadı.');
    }

    const isSuperAdmin = input.userRole === 'SUPER_ADMIN';

    if (!isSuperAdmin && unit.project.ownerId !== input.userId) {
      throw new ForbiddenException('Bu portföyün mahrem belgelerini yönetemezsiniz.');
    }

    return unit;
  }

  private ensureSuperAdmin(userRole?: string) {
    if (userRole !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Bu işlem sadece Yazılım Ekibi tarafından yapılabilir.');
    }
  }

  private cleanDocumentSide(value?: string) {
    const text = String(value || '').trim().toUpperCase();

    if (!text) return undefined;

    if (['KIMLIK_ON', 'KIMLIK_ARKA', 'TAPU', 'YETKI', 'DIGER'].includes(text)) {
      return text;
    }

    return text.replace(/[^A-Z0-9_]/g, '_').slice(0, 40) || undefined;
  }

  private getDocumentExtension(originalName: string, mimetype: string) {
    const extensionFromName = originalName.split('.').pop()?.toLowerCase();

    if (
      extensionFromName &&
      ['jpg', 'jpeg', 'png', 'webp', 'pdf'].includes(extensionFromName)
    ) {
      return extensionFromName === 'jpeg' ? 'jpg' : extensionFromName;
    }

    if (mimetype === 'image/png') return 'png';
    if (mimetype === 'image/webp') return 'webp';
    if (mimetype === 'application/pdf') return 'pdf';

    return 'jpg';
  }

  private getPathFromPublicUrl(fileUrl?: string | null) {
    const url = String(fileUrl || '').trim();
    const marker = `/${this.bucket}/`;
    const markerIndex = url.indexOf(marker);

    if (markerIndex >= 0) {
      return decodeURIComponent(url.slice(markerIndex + marker.length));
    }

    return url;
  }


  private async assertCanManagePortfolio(input: {
    userId: string;
    userRole?: string;
    portfolioId: string;
  }) {
    const unit = await this.prisma.unit.findUnique({
      where: { id: input.portfolioId },
      include: { project: true },
    });

    if (!unit) {
      throw new NotFoundException('Portföy bulunamadı.');
    }

    const isSuperAdmin = input.userRole === 'SUPER_ADMIN';
    const isOwner = unit.project.ownerId === input.userId;

    if (!isSuperAdmin && !isOwner) {
      throw new ForbiddenException('Bu portföyün görsellerini yönetemezsiniz.');
    }

    this.ensurePortfolioContentEditable(
      input.userRole,
      unit.approvalStatus,
    );

    return unit;
  }

  private async tryRemoveStorageFile(bucket: string, path: string) {
    const serviceAsAny = this.supabaseService as any;

    try {
      if (typeof serviceAsAny.deleteFile === 'function') {
        await serviceAsAny.deleteFile(bucket, path);
      }

      if (typeof serviceAsAny.removeFile === 'function') {
        await serviceAsAny.removeFile(bucket, path);
      }
    } catch {
      return;
    }
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