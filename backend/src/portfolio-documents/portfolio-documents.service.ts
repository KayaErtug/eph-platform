import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PortfolioApprovalStatus, PortfolioAuthorityType } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { SupabaseService } from '../supabase/supabase.service';

type PortfolioDocumentInput = {
  userId: string;
  userRole?: string;
  portfolioId: string;
};

type UploadPortfolioDocumentInput = PortfolioDocumentInput & {
  authorityType: PortfolioAuthorityType;
  file: Express.Multer.File;
};

type DeletePortfolioDocumentInput = {
  userId: string;
  userRole?: string;
  documentId: string;
};

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
];

const MAX_FILE_SIZE = 15 * 1024 * 1024;

@Injectable()
export class PortfolioDocumentsService {
  private readonly bucket =
    process.env.SUPABASE_PORTFOLIO_DOCUMENTS_BUCKET || 'portfolio-documents';

  constructor(
    private readonly prisma: PrismaService,
    private readonly supabaseService: SupabaseService,
  ) {}

  async getPortfolioDocuments(input: PortfolioDocumentInput) {
    const unit = await this.assertCanViewPortfolio(input);

    return this.prisma.portfolioAuthorityDocument.findMany({
      where: {
        unitId: unit.id,
      },
      orderBy: [{ createdAt: 'desc' }],
    });
  }

  async uploadPortfolioDocument(input: UploadPortfolioDocumentInput) {
    const { file, portfolioId, authorityType } = input;

    if (!file) {
      throw new BadRequestException('Yüklenecek belge bulunamadı.');
    }

    if (!portfolioId) {
      throw new BadRequestException('Portföy ID zorunludur.');
    }

    if (!authorityType) {
      throw new BadRequestException('Belge türü zorunludur.');
    }

    if (
      ![
        PortfolioAuthorityType.YETKI_BELGESI,
        PortfolioAuthorityType.TAPU,
        PortfolioAuthorityType.TAPU_SAHIBI_KIMLIK,
        PortfolioAuthorityType.KAT_KARSILIGI_SOZLESMESI,
        PortfolioAuthorityType.DIGER_DOGRULAMA_EVRAKI,
      ].includes(authorityType)
    ) {
      throw new BadRequestException('Geçersiz belge türü.');
    }

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        'Sadece PDF, JPG, PNG veya WEBP dosyası yüklenebilir.',
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException(
        `Yüklediğiniz belge çok büyük. Her belge en fazla 15 MB olabilir. Seçtiğiniz belge: ${(file.size / (1024 * 1024)).toFixed(1)} MB.`,
      );
    }

    const unit = await this.assertCanManagePortfolio(input);

    const extension = this.getExtension(file.originalname, file.mimetype);
    const safeUserId = this.slugify(input.userId);
    const safePortfolioId = this.slugify(portfolioId);
    const safeType = this.slugify(authorityType);

    const uniqueName = `${safeType}-${Date.now()}-${Math.random()
      .toString(16)
      .slice(2)}.${extension}`;

    const path = `portfolio/${safeUserId}/${safePortfolioId}/${uniqueName}`;

    await this.supabaseService.uploadFile(
      this.bucket,
      path,
      file.buffer,
      file.mimetype,
    );

    const fileUrl = this.supabaseService.getPublicUrl(this.bucket, path);

    const existing = await this.prisma.portfolioAuthorityDocument.findFirst({
      where: {
        unitId: portfolioId,
        authorityType,
      },
    });

    let document;

    if (existing) {
      await this.tryRemoveStorageFile(this.bucket, this.extractPath(existing.fileUrl));

      document = await this.prisma.portfolioAuthorityDocument.update({
        where: { id: existing.id },
        data: {
          fileUrl,
          fileName: file.originalname,
          mimeType: file.mimetype,
          sizeBytes: file.size,
          approved: false,
          approvedById: null,
          approvedAt: null,
          rejectReason: null,
        },
      });
    } else {
      document = await this.prisma.portfolioAuthorityDocument.create({
        data: {
          unitId: portfolioId,
          authorityType,
          fileUrl,
          fileName: file.originalname,
          mimeType: file.mimetype,
          sizeBytes: file.size,
        },
      });
    }

    const hasYetki = await this.hasDocumentType(
      portfolioId,
      PortfolioAuthorityType.YETKI_BELGESI,
    );
    const hasTapu = await this.hasDocumentType(
      portfolioId,
      PortfolioAuthorityType.TAPU,
    );

    await this.prisma.unit.update({
      where: { id: unit.id },
      data: {
        yetkiVerified:
          authorityType === PortfolioAuthorityType.YETKI_BELGESI
            ? true
            : unit.yetkiVerified,
        tapuVerified:
          authorityType === PortfolioAuthorityType.TAPU
            ? true
            : unit.tapuVerified,
        approvalStatus:
          hasYetki || hasTapu
            ? PortfolioApprovalStatus.BELGE_BEKLENIYOR
            : unit.approvalStatus,
        approvalNote:
          hasYetki || hasTapu
            ? 'Belge yüklendi. Portföy incelemeye gönderilmeye hazır.'
            : unit.approvalNote,
        isPoolVisible: false,
      },
    });

    return {
      success: true,
      message: 'Belge başarıyla yüklendi.',
      document,
    };
  }

  async deletePortfolioDocument(input: DeletePortfolioDocumentInput) {
    if (!input.documentId) {
      throw new BadRequestException('Belge ID zorunludur.');
    }

    const document = await this.prisma.portfolioAuthorityDocument.findUnique({
      where: { id: input.documentId },
      include: {
        unit: {
          include: {
            project: true,
          },
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

    await this.tryRemoveStorageFile(this.bucket, this.extractPath(document.fileUrl));

    await this.prisma.portfolioAuthorityDocument.delete({
      where: { id: document.id },
    });

    const remainingDocs = await this.prisma.portfolioAuthorityDocument.findMany({
      where: { unitId: document.unitId },
    });

    const hasYetki = remainingDocs.some(
      (item) => item.authorityType === PortfolioAuthorityType.YETKI_BELGESI,
    );
    const hasTapu = remainingDocs.some(
      (item) => item.authorityType === PortfolioAuthorityType.TAPU,
    );

    await this.prisma.unit.update({
      where: { id: document.unitId },
      data: {
        yetkiVerified: hasYetki,
        tapuVerified: hasTapu,
        approvalStatus:
          hasYetki || hasTapu
            ? PortfolioApprovalStatus.BELGE_BEKLENIYOR
            : PortfolioApprovalStatus.BELGE_BEKLENIYOR,
        approvalNote:
          hasYetki || hasTapu
            ? 'Belge güncellendi. Portföy incelemeye gönderilmeye hazır.'
            : 'Havuza gönderebilmek için yetki belgesi, tapu veya ilgili doğrulama evrakı gereklidir.',
        isPoolVisible: false,
      },
    });

    return {
      success: true,
      message: 'Belge silindi.',
    };
  }

  private async assertCanViewPortfolio(input: PortfolioDocumentInput) {
    const unit = await this.prisma.unit.findUnique({
      where: { id: input.portfolioId },
      include: { project: true },
    });

    if (!unit) {
      throw new NotFoundException('Portföy bulunamadı.');
    }

    const role = String(input.userRole || '').toUpperCase();
    const isOwner = unit.project.ownerId === input.userId;
    const isApprovalManager = ['MODERATOR', 'ADMIN', 'SUPER_ADMIN'].includes(role);

    if (!isOwner && !isApprovalManager) {
      throw new ForbiddenException('Bu portföy belgelerini görüntüleme yetkiniz yok.');
    }

    return unit;
  }

  private async assertCanManagePortfolio(input: PortfolioDocumentInput) {
    const unit = await this.prisma.unit.findUnique({
      where: { id: input.portfolioId },
      include: { project: true },
    });

    if (!unit) {
      throw new NotFoundException('Portföy bulunamadı.');
    }

    const role = String(input.userRole || '').toUpperCase();
    const isOwner = unit.project.ownerId === input.userId;
    const isSuperAdmin = role === 'SUPER_ADMIN';

    if (!isOwner && !isSuperAdmin) {
      throw new ForbiddenException('Bu portföy belgelerini yönetme yetkiniz yok.');
    }

    return unit;
  }

  private async hasDocumentType(
    portfolioId: string,
    authorityType: PortfolioAuthorityType,
  ) {
    const count = await this.prisma.portfolioAuthorityDocument.count({
      where: {
        unitId: portfolioId,
        authorityType,
      },
    });

    return count > 0;
  }

  private async tryRemoveStorageFile(bucket: string, path: string) {
    if (!path) return;

    try {
      await this.supabaseService.removeFile(bucket, [path]);
    } catch {
      return;
    }
  }

  private extractPath(fileUrl?: string | null) {
    if (!fileUrl) return '';

    const marker = `/storage/v1/object/public/${this.bucket}/`;
    const markerIndex = fileUrl.indexOf(marker);

    if (markerIndex >= 0) {
      return fileUrl.slice(markerIndex + marker.length);
    }

    return '';
  }

  private getExtension(originalName: string, mimetype: string) {
    const extensionFromName = originalName.split('.').pop()?.toLowerCase();

    if (
      extensionFromName &&
      ['pdf', 'jpg', 'jpeg', 'png', 'webp'].includes(extensionFromName)
    ) {
      return extensionFromName === 'jpeg' ? 'jpg' : extensionFromName;
    }

    if (mimetype === 'application/pdf') return 'pdf';
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