import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

type CurrentUserPayload = {
  userId: string;
  userRole?: string;
};

type CreateInput = CurrentUserPayload & {
  body: {
    unitId?: string;
    authorityType?: string;
    durationDays?: number | string;
    ownerName?: string;
    ownerPhone?: string;
    ownerEmail?: string;
    authorityStartDate?: string;
  };
};

@Injectable()
export class EphAuthorityLettersService {
  constructor(private readonly prisma: PrismaService) {}

  async findByPortfolio(input: CurrentUserPayload & { unitId: string }) {
    const unit = await this.getUnitOrFail(input.unitId);
    this.ensureCanView(input, unit.project.ownerId);

    return this.prisma.ePHAuthorityLetter.findMany({
      where: { unitId: input.unitId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(input: CreateInput) {
    const unitId = this.cleanText(input.body?.unitId);

    if (!unitId) {
      throw new BadRequestException('Portföy ID zorunludur.');
    }

    const unit = await this.getUnitOrFail(unitId);
    this.ensureCanManage(input, unit.project.ownerId);

    const authorityType = this.normalizeAuthorityType(input.body?.authorityType);
    const durationDays = this.normalizeDurationDays(input.body?.durationDays);
    const startDate = this.normalizeDate(input.body?.authorityStartDate);
    const endDate = this.addDays(startDate, durationDays);

    const letter = await this.prisma.ePHAuthorityLetter.create({
      data: {
        unitId,
        authorityNo: await this.createAuthorityNo(),
        ownerName:
          this.cleanText(input.body?.ownerName) ||
          this.cleanText(unit.deedOwnerFullName) ||
          'Tapu Sahibi',
        ownerPhone:
          this.cleanText(input.body?.ownerPhone) ||
          this.cleanText(unit.deedOwnerPhone),
        ownerEmail:
          this.cleanText(input.body?.ownerEmail) ||
          this.cleanText(unit.deedOwnerEmail),
        authorityType,
        authorityStartDate: startDate,
        authorityEndDate: endDate,
        status: 'TASLAK',
        createdById: input.userId,
      },
    });

    return {
      success: true,
      message: 'EPH yetki belgesi taslağı oluşturuldu.',
      letter,
    };
  }

  async markPdfCreated(input: CurrentUserPayload & { id: string; pdfUrl?: string }) {
    const letter = await this.prisma.ePHAuthorityLetter.findUnique({
      where: { id: input.id },
      include: {
        unit: {
          include: { project: true },
        },
      },
    });

    if (!letter) {
      throw new NotFoundException('Yetki belgesi bulunamadı.');
    }

    this.ensureCanManage(input, letter.unit.project.ownerId);

    const pdfUrl = this.cleanText(input.pdfUrl);

    if (!pdfUrl) {
      throw new BadRequestException('PDF bağlantısı zorunludur.');
    }

    const updated = await this.prisma.ePHAuthorityLetter.update({
      where: { id: input.id },
      data: {
        pdfUrl,
        status: 'PDF_OLUSTURULDU',
      },
    });

    return {
      success: true,
      message: 'PDF yetki belgesine işlendi.',
      letter: updated,
    };
  }

  private async getUnitOrFail(unitId: string) {
    const unit = await this.prisma.unit.findUnique({
      where: { id: unitId },
      include: { project: true },
    });

    if (!unit) {
      throw new NotFoundException('Portföy bulunamadı.');
    }

    return unit;
  }

  private ensureCanView(user: CurrentUserPayload, ownerId: string) {
    if (this.isManager(user.userRole)) return;
    if (user.userId === ownerId) return;

    throw new ForbiddenException('Bu yetki belgesini görüntüleme yetkiniz yok.');
  }

  private ensureCanManage(user: CurrentUserPayload, ownerId: string) {
    if (this.isSuperAdmin(user.userRole)) return;
    if (user.userId === ownerId) return;

    throw new ForbiddenException('Bu yetki belgesini oluşturma yetkiniz yok.');
  }

  private isSuperAdmin(role?: string) {
    return String(role || '').toUpperCase() === 'SUPER_ADMIN';
  }

  private isManager(role?: string) {
    return ['MODERATOR', 'ADMIN', 'SUPER_ADMIN'].includes(
      String(role || '').toUpperCase(),
    );
  }

  private normalizeAuthorityType(value?: string) {
    const normalized = String(value || '').trim().toUpperCase();

    if (['SATIS', 'KIRALAMA', 'SATIS_VE_KIRALAMA'].includes(normalized)) {
      return normalized;
    }

    throw new BadRequestException(
      'Yetki türü SATIS, KIRALAMA veya SATIS_VE_KIRALAMA olmalıdır.',
    );
  }

  private normalizeDurationDays(value?: number | string) {
    const numeric = Number(value || 0);

    if ([30, 90, 180, 365].includes(numeric)) {
      return numeric;
    }

    throw new BadRequestException('Yetki süresi 30, 90, 180 veya 365 gün olmalıdır.');
  }

  private normalizeDate(value?: string) {
    if (!value) return new Date();

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Başlangıç tarihi geçersiz.');
    }

    return date;
  }

  private addDays(date: Date, days: number) {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
  }

  private cleanText(value?: string | null) {
    const text = String(value || '').trim();
    return text || undefined;
  }

  private async createAuthorityNo() {
    const year = new Date().getFullYear();
    const count = await this.prisma.ePHAuthorityLetter.count({
      where: {
        authorityNo: {
          startsWith: `EPH-YB-${year}-`,
        },
      },
    });

    return `EPH-YB-${year}-${String(count + 1).padStart(6, '0')}`;
  }
}