import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  PortfolioApprovalStatus,
  PortfolioAuthorityType,
  Prisma,
  UyelikDurumu,
} from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { SupabaseService } from '../supabase/supabase.service';
import { LinaDocumentPrecheckService } from '../lina/document/lina-document-precheck.service';

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

type ReviewPortfolioDocumentInput = DeletePortfolioDocumentInput & {
  note?: string;
};

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
];

const MAX_FILE_SIZE = 15 * 1024 * 1024;
const REJECT_REASON_PREFIX = '[BELGE_REDDEDILDI]';
const REUPLOAD_REASON_PREFIX = '[YENIDEN_BELGE_ISTENDI]';

@Injectable()
export class PortfolioDocumentsService {
  private readonly bucket =
    process.env.SUPABASE_PORTFOLIO_DOCUMENTS_BUCKET || 'portfolio-documents';

  constructor(
    private readonly prisma: PrismaService,
    private readonly supabaseService: SupabaseService,
    private readonly linaDocumentPrecheckService: LinaDocumentPrecheckService,
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

  async submitPortfolioForReview(input: PortfolioDocumentInput) {
    const unit = await this.prisma.unit.findUnique({
      where: { id: input.portfolioId },
      include: {
        project: {
          include: {
            owner: {
              select: {
                role: true,
              },
            },
          },
        },
      },
    });

    if (!unit) {
      throw new NotFoundException('Portföy bulunamadı.');
    }

    const role = String(input.userRole || '').toUpperCase();
    const ownerRole = String(unit.project.owner?.role || '').toUpperCase();
    const isOwner = unit.project.ownerId === input.userId;
    const isSuperAdmin = role === 'SUPER_ADMIN';

    if (!isOwner && !isSuperAdmin) {
      throw new ForbiddenException(
        'Bu portföyü incelemeye gönderme yetkiniz yok.',
      );
    }

    if (['MUTEAHHIT', 'INSAAT_FIRMASI'].includes(ownerRole)) {
      throw new BadRequestException(
        'Müteahhit ve İnşaat Firması portföyleri doğrudan havuz yayın akışını kullanır.',
      );
    }

    if (ownerRole !== 'EMLAKCI') {
      throw new BadRequestException(
        'Bu kullanıcı rolü için belge inceleme akışı tanımlı değildir.',
      );
    }

    this.ensurePortfolioContentEditable(
      input.userRole,
      unit.approvalStatus,
    );

    await this.ensurePoolActionMembership(input.userId, input.userRole);

    const documents = await this.prisma.portfolioAuthorityDocument.findMany({
      where: {
        unitId: unit.id,
        authorityType: {
          in: [
            PortfolioAuthorityType.TAPU,
            PortfolioAuthorityType.YETKI_BELGESI,
          ],
        },
      },
      select: {
        authorityType: true,
        approved: true,
      },
    });

    const hasTapu = documents.some(
      (item) => item.authorityType === PortfolioAuthorityType.TAPU,
    );
    const hasYetki = documents.some(
      (item) => item.authorityType === PortfolioAuthorityType.YETKI_BELGESI,
    );

    const missingDocuments: string[] = [];

    if (!hasTapu) missingDocuments.push('Tapu');
    if (!hasYetki) missingDocuments.push('Yetki Belgesi');

    if (missingDocuments.length > 0) {
      throw new BadRequestException(
        `Portföyü incelemeye göndermek için ${missingDocuments.join(
          ' ve ',
        )} yüklenmelidir.`,
      );
    }

    const hasApprovedTapu = documents.some(
      (item) =>
        item.authorityType === PortfolioAuthorityType.TAPU && item.approved,
    );
    const hasApprovedYetki = documents.some(
      (item) =>
        item.authorityType === PortfolioAuthorityType.YETKI_BELGESI &&
        item.approved,
    );

    return this.prisma.unit.update({
      where: { id: unit.id },
      data: {
        tapuVerified: hasApprovedTapu,
        yetkiVerified: hasApprovedYetki,
        isVerified: false,
        verifiedAt: null,
        approvalStatus: PortfolioApprovalStatus.INCELEMEYE_GONDERILDI,
        submittedForApprovalAt: new Date(),
        approvedAt: null,
        rejectedAt: null,
        approvalNote: null,
        isPoolVisible: false,
      },
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

    const precheck = await this.linaDocumentPrecheckService.analyze({
      fileName: file.originalname,
      mimeType: file.mimetype,
      buffer: file.buffer,
      authorityType,
      portfolioContext: {
        ownerName: unit.deedOwnerFullName,
        ownerPhone: unit.deedOwnerPhone,
        ownerEmail: unit.deedOwnerEmail,
        city: unit.project?.city,
        district: unit.project?.district,
        adaNo: unit.adaNo,
        parselNo: unit.parselNo,
        area: unit.area,
      },
    });

    const existing = await this.prisma.portfolioAuthorityDocument.findFirst({
      where: {
        unitId: portfolioId,
        authorityType,
      },
    });

    let document;

    if (existing) {
      await this.tryRemoveStorageFile(
        this.bucket,
        this.extractPath(existing.fileUrl),
      );

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
          documentType: precheck.documentType,
          ocrQualityScore: precheck.ocrQualityScore,
          confidenceScore: precheck.confidenceScore,
          riskLevel: precheck.riskLevel,
          qrDetected: precheck.qrDetected,
          linaSummary: precheck.linaSummary,
          analyzedAt: new Date(),
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
          documentType: precheck.documentType,
          ocrQualityScore: precheck.ocrQualityScore,
          confidenceScore: precheck.confidenceScore,
          riskLevel: precheck.riskLevel,
          qrDetected: precheck.qrDetected,
          linaSummary: precheck.linaSummary,
          analyzedAt: new Date(),
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

    const approvedDocuments =
      await this.prisma.portfolioAuthorityDocument.findMany({
        where: {
          unitId: portfolioId,
          approved: true,
        },
        select: {
          authorityType: true,
        },
      });

    const hasApprovedYetki = approvedDocuments.some(
      (item) =>
        item.authorityType === PortfolioAuthorityType.YETKI_BELGESI,
    );
    const hasApprovedTapu = approvedDocuments.some(
      (item) => item.authorityType === PortfolioAuthorityType.TAPU,
    );

    await this.prisma.unit.update({
      where: { id: unit.id },
      data: {
        yetkiVerified: hasApprovedYetki,
        tapuVerified: hasApprovedTapu,
        isVerified: false,
        verifiedAt: null,
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

  async approvePortfolioDocument(input: ReviewPortfolioDocumentInput) {
    const document = await this.assertCanReviewDocument(input);
    const now = new Date();
    const note = this.cleanReviewNote(input.note);
    const label = this.getAuthorityTypeLabel(document.authorityType);

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedDocument = await tx.portfolioAuthorityDocument.update({
        where: { id: document.id },
        data: {
          approved: true,
          approvedById: input.userId,
          approvedAt: now,
          rejectReason: null,
        },
      });

      const flags = await this.getApprovedDocumentFlags(tx, document.unitId);
      const allRequiredApproved = flags.hasApprovedYetki && flags.hasApprovedTapu;

      const updatedUnit = await tx.unit.update({
        where: { id: document.unitId },
        data: {
          yetkiVerified: flags.hasApprovedYetki,
          tapuVerified: flags.hasApprovedTapu,
          isVerified: false,
          verifiedAt: null,
          approvalStatus:
            document.unit.approvalStatus ===
            PortfolioApprovalStatus.INCELEMEYE_GONDERILDI
              ? PortfolioApprovalStatus.INCELEMEDE
              : document.unit.approvalStatus,
          approvalNote: allRequiredApproved
            ? 'Tapu ve Yetki Belgesi yönetici tarafından onaylandı. Portföy nihai onaya hazır.'
            : `${label} yönetici tarafından onaylandı.${note ? ` Not: ${note}` : ''}`,
          rejectedAt: null,
          isPoolVisible: false,
        },
      });

      await this.createDocumentReviewAuditLog(tx, {
        actorId: input.userId,
        targetUserId: document.unit.project.ownerId,
        action: 'PORTFOLIO_DOCUMENT_APPROVED',
        documentId: document.id,
        unitId: document.unitId,
        authorityType: document.authorityType,
        description: `${label} yönetici tarafından onaylandı.`,
        note,
        allRequiredApproved,
      });

      return { updatedDocument, updatedUnit, allRequiredApproved };
    });

    return {
      success: true,
      message: `${label} onaylandı.`,
      document: result.updatedDocument,
      unit: result.updatedUnit,
      allRequiredApproved: result.allRequiredApproved,
    };
  }

  async rejectPortfolioDocument(input: ReviewPortfolioDocumentInput) {
    const note = this.requireReviewNote(input.note);
    const document = await this.assertCanReviewDocument(input);
    const now = new Date();
    const label = this.getAuthorityTypeLabel(document.authorityType);

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedDocument = await tx.portfolioAuthorityDocument.update({
        where: { id: document.id },
        data: {
          approved: false,
          approvedById: null,
          approvedAt: null,
          rejectReason: `${REJECT_REASON_PREFIX} ${note}`,
        },
      });

      const flags = await this.getApprovedDocumentFlags(tx, document.unitId);

      const updatedUnit = await tx.unit.update({
        where: { id: document.unitId },
        data: {
          yetkiVerified: flags.hasApprovedYetki,
          tapuVerified: flags.hasApprovedTapu,
          isVerified: false,
          verifiedAt: null,
          approvalStatus: PortfolioApprovalStatus.REDDEDILDI,
          approvalNote: `${label} reddedildi: ${note}`,
          rejectedAt: now,
          isPoolVisible: false,
          poolRemovedAt: now,
        },
      });

      await this.createDocumentReviewAuditLog(tx, {
        actorId: input.userId,
        targetUserId: document.unit.project.ownerId,
        action: 'PORTFOLIO_DOCUMENT_REJECTED',
        documentId: document.id,
        unitId: document.unitId,
        authorityType: document.authorityType,
        description: `${label} yönetici tarafından reddedildi.`,
        note,
        allRequiredApproved: false,
      });

      return { updatedDocument, updatedUnit };
    });

    return {
      success: true,
      message: `${label} reddedildi.`,
      document: result.updatedDocument,
      unit: result.updatedUnit,
    };
  }

  async requestPortfolioDocumentReupload(
    input: ReviewPortfolioDocumentInput,
  ) {
    const note = this.requireReviewNote(input.note);
    const document = await this.assertCanReviewDocument(input);
    const now = new Date();
    const label = this.getAuthorityTypeLabel(document.authorityType);

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedDocument = await tx.portfolioAuthorityDocument.update({
        where: { id: document.id },
        data: {
          approved: false,
          approvedById: null,
          approvedAt: null,
          rejectReason: `${REUPLOAD_REASON_PREFIX} ${note}`,
        },
      });

      const flags = await this.getApprovedDocumentFlags(tx, document.unitId);

      const updatedUnit = await tx.unit.update({
        where: { id: document.unitId },
        data: {
          yetkiVerified: flags.hasApprovedYetki,
          tapuVerified: flags.hasApprovedTapu,
          isVerified: false,
          verifiedAt: null,
          approvalStatus: PortfolioApprovalStatus.EKSIK_BILGI_BEKLENIYOR,
          approvalNote: `${label} için yeniden belge istendi: ${note}`,
          rejectedAt: null,
          isPoolVisible: false,
          poolRemovedAt: now,
        },
      });

      await this.createDocumentReviewAuditLog(tx, {
        actorId: input.userId,
        targetUserId: document.unit.project.ownerId,
        action: 'PORTFOLIO_DOCUMENT_REUPLOAD_REQUESTED',
        documentId: document.id,
        unitId: document.unitId,
        authorityType: document.authorityType,
        description: `${label} için yeniden yükleme istendi.`,
        note,
        allRequiredApproved: false,
      });

      return { updatedDocument, updatedUnit };
    });

    return {
      success: true,
      message: `${label} için yeniden yükleme talebi gönderildi.`,
      document: result.updatedDocument,
      unit: result.updatedUnit,
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

    this.ensurePortfolioContentEditable(
      input.userRole,
      document.unit.approvalStatus,
    );

    await this.tryRemoveStorageFile(
      this.bucket,
      this.extractPath(document.fileUrl),
    );

    await this.prisma.portfolioAuthorityDocument.delete({
      where: { id: document.id },
    });

    const remainingDocs =
      await this.prisma.portfolioAuthorityDocument.findMany({
        where: { unitId: document.unitId },
      });

    const hasYetki = remainingDocs.some(
      (item) => item.authorityType === PortfolioAuthorityType.YETKI_BELGESI,
    );
    const hasTapu = remainingDocs.some(
      (item) => item.authorityType === PortfolioAuthorityType.TAPU,
    );
    const hasApprovedYetki = remainingDocs.some(
      (item) =>
        item.authorityType === PortfolioAuthorityType.YETKI_BELGESI &&
        item.approved,
    );
    const hasApprovedTapu = remainingDocs.some(
      (item) =>
        item.authorityType === PortfolioAuthorityType.TAPU && item.approved,
    );

    await this.prisma.unit.update({
      where: { id: document.unitId },
      data: {
        yetkiVerified: hasApprovedYetki,
        tapuVerified: hasApprovedTapu,
        isVerified: false,
        verifiedAt: null,
        approvalStatus: PortfolioApprovalStatus.BELGE_BEKLENIYOR,
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
    const isApprovalManager = ['MODERATOR', 'ADMIN', 'SUPER_ADMIN'].includes(
      role,
    );

    if (!isOwner && !isApprovalManager) {
      throw new ForbiddenException(
        'Bu portföy belgelerini görüntüleme yetkiniz yok.',
      );
    }

    return unit;
  }

  private async assertCanReviewDocument(
    input: ReviewPortfolioDocumentInput,
  ) {
    if (!input.documentId) {
      throw new BadRequestException('Belge ID zorunludur.');
    }

    const role = String(input.userRole || '').toUpperCase();
    const isApprovalManager = ['MODERATOR', 'ADMIN', 'SUPER_ADMIN'].includes(
      role,
    );

    if (!isApprovalManager) {
      throw new ForbiddenException(
        'Bu belge için inceleme işlemi yapma yetkiniz yok.',
      );
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

    const reviewableStatuses = new Set<PortfolioApprovalStatus>([
      PortfolioApprovalStatus.INCELEMEYE_GONDERILDI,
      PortfolioApprovalStatus.INCELEMEDE,
    ]);

    if (!reviewableStatuses.has(document.unit.approvalStatus)) {
      throw new BadRequestException(
        'Belge işlemi yalnızca incelemeye gönderilmiş portföylerde yapılabilir.',
      );
    }

    return document;
  }

  private ensurePortfolioContentEditable(
    userRole: string | undefined,
    approvalStatus?: PortfolioApprovalStatus | string | null,
  ) {
    if (String(userRole || '').toUpperCase() === 'SUPER_ADMIN') {
      return;
    }

    const normalizedStatus = String(approvalStatus || '').toUpperCase();

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
        'Portföy incelemeye gönderildikten sonra belge değiştirilemez. Düzeltme için portföyün Eksik Bilgi durumuna alınması gerekir.',
      );
    }
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
      throw new ForbiddenException(
        'Bu portföy belgelerini yönetme yetkiniz yok.',
      );
    }

    this.ensurePortfolioContentEditable(
      input.userRole,
      unit.approvalStatus,
    );

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

  private async getApprovedDocumentFlags(
    tx: Prisma.TransactionClient,
    unitId: string,
  ) {
    const approvedDocuments = await tx.portfolioAuthorityDocument.findMany({
      where: {
        unitId,
        approved: true,
      },
      select: {
        authorityType: true,
      },
    });

    return {
      hasApprovedYetki: approvedDocuments.some(
        (item) =>
          item.authorityType === PortfolioAuthorityType.YETKI_BELGESI,
      ),
      hasApprovedTapu: approvedDocuments.some(
        (item) => item.authorityType === PortfolioAuthorityType.TAPU,
      ),
    };
  }

  private async createDocumentReviewAuditLog(
    tx: Prisma.TransactionClient,
    input: {
      actorId: string;
      targetUserId: string;
      action: string;
      documentId: string;
      unitId: string;
      authorityType: PortfolioAuthorityType;
      description: string;
      note?: string;
      allRequiredApproved?: boolean;
    },
  ) {
    await tx.adminActionLog.create({
      data: {
        actorId: input.actorId,
        targetUserId: input.targetUserId,
        action: input.action,
        entityType: 'PORTFOLIO_AUTHORITY_DOCUMENT',
        entityId: input.documentId,
        description: input.description,
        metadata: {
          unitId: input.unitId,
          authorityType: input.authorityType,
          note: input.note || '',
          allRequiredApproved: Boolean(input.allRequiredApproved),
          recordedAt: new Date().toISOString(),
        } as Prisma.InputJsonValue,
      },
    });
  }

  private cleanReviewNote(note?: string) {
    return String(note || '').trim().slice(0, 1000);
  }

  private requireReviewNote(note?: string) {
    const cleanNote = this.cleanReviewNote(note);

    if (cleanNote.length < 3) {
      throw new BadRequestException(
        'Red veya yeniden belge isteme işleminde en az 3 karakterlik açıklama zorunludur.',
      );
    }

    return cleanNote;
  }

  private getAuthorityTypeLabel(authorityType: PortfolioAuthorityType) {
    if (authorityType === PortfolioAuthorityType.YETKI_BELGESI) {
      return 'Yetki Belgesi';
    }

    if (authorityType === PortfolioAuthorityType.TAPU) {
      return 'Tapu';
    }

    if (authorityType === PortfolioAuthorityType.TAPU_SAHIBI_KIMLIK) {
      return 'Tapu Sahibi Kimlik Belgesi';
    }

    if (authorityType === PortfolioAuthorityType.KAT_KARSILIGI_SOZLESMESI) {
      return 'Kat Karşılığı Sözleşmesi';
    }

    return 'Doğrulama Evrakı';
  }

  private async ensurePoolActionMembership(
    userId: string,
    userRole?: string,
  ) {
    if (String(userRole || '').toUpperCase() === 'SUPER_ADMIN') {
      return;
    }

    const now = new Date();

    const [activeMembership, latestMembership] = await Promise.all([
      this.prisma.kullaniciUyelikPaketi.findFirst({
        where: {
          kullaniciId: userId,
          durum: UyelikDurumu.AKTIF,
          baslangicTarihi: {
            lte: now,
          },
          OR: [
            {
              bitisTarihi: null,
            },
            {
              bitisTarihi: {
                gte: now,
              },
            },
          ],
        },
        orderBy: {
          baslangicTarihi: 'desc',
        },
      }),
      this.prisma.kullaniciUyelikPaketi.findFirst({
        where: {
          kullaniciId: userId,
        },
        orderBy: {
          baslangicTarihi: 'desc',
        },
      }),
    ]);

    if (!activeMembership) {
      if (!latestMembership) {
        throw new ForbiddenException(
          'Havuz işlemleri için aktif üyelik gereklidir. Üyelik Merkezi üzerinden paket talebi oluşturabilirsiniz.',
        );
      }

      if (
        latestMembership.durum === UyelikDurumu.AKTIF &&
        latestMembership.baslangicTarihi.getTime() > now.getTime()
      ) {
        throw new ForbiddenException(
          'Üyeliğiniz henüz başlamadığı için Havuz işlemleri kullanılamıyor.',
        );
      }

      if (
        latestMembership.durum === UyelikDurumu.SURESI_DOLDU ||
        (latestMembership.durum === UyelikDurumu.AKTIF &&
          latestMembership.bitisTarihi !== null &&
          latestMembership.bitisTarihi.getTime() < now.getTime())
      ) {
        throw new ForbiddenException(
          'Üyelik süreniz dolduğu için Havuz işlemleri kilitlidir. Havuzu görüntülemeye devam edebilirsiniz.',
        );
      }

      if (latestMembership.durum === UyelikDurumu.IPTAL) {
        throw new ForbiddenException(
          'Üyeliğiniz iptal edildiği için Havuz işlemleri kullanılamıyor.',
        );
      }

      throw new ForbiddenException(
        'Üyeliğiniz aktif olmadığı için Havuz işlemleri kullanılamıyor.',
      );
    }

    const membershipPackage = await this.prisma.uyelikPaketi.findUnique({
      where: {
        id: activeMembership.paketId,
      },
      select: {
        aktifMi: true,
      },
    });

    if (!membershipPackage || !membershipPackage.aktifMi) {
      throw new ForbiddenException(
        'Üyelik paketiniz aktif olmadığı için Havuz işlemleri kullanılamıyor.',
      );
    }
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
