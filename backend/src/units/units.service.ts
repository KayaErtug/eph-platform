import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ActivityType,
  CustomerStatus,
  PortfolioApprovalStatus,
  Role,
  UnitStatus,
  UnitType,
} from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

type CurrentUserPayload = {
  id: string;
  role?: Role | string;
};

type CreateUnitPayload = {
  type: UnitType;
  floor?: number;
  floorLabel?: string;
  totalFloors?: number;
  priceCurrency?: string;
  number: string;
  roomCount?: string;
  area?: number;
  price: number;
  status?: UnitStatus;
  description?: string;
  deedOwnerFullName?: string;
  deedOwnerPhone?: string;
  deedOwnerEmail?: string;
};

const unitInclude = {
  project: {
    select: {
      id: true,
      name: true,
      city: true,
      district: true,
      address: true,
      latitude: true,
      longitude: true,
      mapAddress: true,
      placeId: true,
      ownerId: true,
      owner: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          role: true,
          memberCode: true,
        },
      },
    },
  },
  images: {
    orderBy: [
      { isCover: 'desc' as const },
      { sortOrder: 'asc' as const },
      { createdAt: 'asc' as const },
    ],
  },
};

@Injectable()
export class UnitsService {
  constructor(private prisma: PrismaService) {}

  private isSuperAdmin(user?: CurrentUserPayload) {
    return user?.role === Role.SUPER_ADMIN || user?.role === 'SUPER_ADMIN';
  }

  private isAdmin(user?: CurrentUserPayload) {
    return user?.role === Role.ADMIN || user?.role === 'ADMIN';
  }

  private isModerator(user?: CurrentUserPayload) {
    return user?.role === Role.MODERATOR || user?.role === 'MODERATOR';
  }

  private isApprovalManager(user?: CurrentUserPayload) {
    return this.isSuperAdmin(user) || this.isAdmin(user) || this.isModerator(user);
  }

  private isOwner(user: CurrentUserPayload, ownerId: string) {
    return Boolean(user?.id && ownerId && user.id === ownerId);
  }

  private ensureCanViewUnit(user: CurrentUserPayload, ownerId: string) {
    if (this.isSuperAdmin(user)) return;
    if (this.isOwner(user, ownerId)) return;

    throw new ForbiddenException('Bu portföyü görüntüleme yetkiniz yok.');
  }

  private ensureCanManageUnit(user: CurrentUserPayload, ownerId: string) {
    if (this.isSuperAdmin(user)) return;
    if (this.isOwner(user, ownerId)) return;

    throw new ForbiddenException('Bu portföy için işlem yetkiniz yok.');
  }

  private ensureApprovalManager(user: CurrentUserPayload) {
    if (!this.isApprovalManager(user)) {
      throw new ForbiddenException(
        'Bu işlem sadece Moderatör, Admin veya Yazılım Ekibi tarafından yapılabilir.',
      );
    }
  }

  private getPrivateUnitWhere(user: CurrentUserPayload) {
    if (this.isSuperAdmin(user)) return {};

    if (this.isAdmin(user) || this.isModerator(user)) {
      return {
        id: '__ADMIN_PORTFOY_GOREMEZ__',
      };
    }

    return {
      project: {
        ownerId: user.id,
      },
    };
  }

  private async getUnitWithProjectOrFail(id: string) {
    const unit = await this.prisma.unit.findUnique({
      where: { id },
      include: { project: true },
    });

    if (!unit) {
      throw new NotFoundException('Portföy bulunamadı.');
    }

    return unit;
  }

  private hasApprovalDocument(unit: {
    tapuVerified: boolean;
    yetkiVerified: boolean;
  }) {
    return Boolean(unit.tapuVerified || unit.yetkiVerified);
  }

  private cleanText(value?: string | null) {
    const text = String(value || '').trim();
    return text || undefined;
  }

  private normalizePhone(value?: string | null) {
    const text = String(value || '').trim();
    return text || undefined;
  }

  private splitFullName(fullName?: string | null) {
    const cleanName = this.cleanText(fullName);

    if (!cleanName) {
      return { firstName: 'Tapu Sahibi', lastName: 'Bilinmiyor' };
    }

    const parts = cleanName.split(/\s+/).filter(Boolean);

    if (parts.length === 1) {
      return { firstName: parts[0], lastName: 'Bilinmiyor' };
    }

    return {
      firstName: parts.slice(0, -1).join(' '),
      lastName: parts.slice(-1).join(' '),
    };
  }

  private async syncDeedOwnerToCrm(input: {
    ownerId: string;
    unitId: string;
    project: {
      name?: string | null;
      city?: string | null;
      district?: string | null;
      address?: string | null;
    };
    unit: {
      type?: UnitType | string | null;
      status?: UnitStatus | string | null;
      price?: number | null;
      area?: number | null;
      deedOwnerFullName?: string | null;
      deedOwnerPhone?: string | null;
      deedOwnerEmail?: string | null;
    };
  }) {
    const fullName = this.cleanText(input.unit.deedOwnerFullName);
    const phone = this.normalizePhone(input.unit.deedOwnerPhone);
    const email = this.cleanText(input.unit.deedOwnerEmail);

    if (!fullName || (!phone && !email)) return;

    const { firstName, lastName } = this.splitFullName(fullName);
    const portfolioNo = `EPH-${input.unitId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase()}-${input.unitId.replace(/[^a-zA-Z0-9]/g, '').slice(-4).toUpperCase()}`;
    const location = [input.project.address, input.project.district, input.project.city]
      .filter(Boolean)
      .join(' / ');
    const note = [
      'Bu kişi, portföy girişi sırasında tapu sahibi olarak otomatik CRM kaydına işlendi.',
      `Bağlı Portföy: ${portfolioNo}`,
      `Portföy ID: ${input.unitId}`,
      input.project.name ? `Portföy/Proje: ${input.project.name}` : '',
      location ? `Konum: ${location}` : '',
      input.unit.type ? `Mülk Tipi: ${input.unit.type}` : '',
      input.unit.status ? `Durum: ${input.unit.status}` : '',
      input.unit.area ? `m²: ${input.unit.area}` : '',
      input.unit.price ? `Fiyat: ${input.unit.price}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    const existing = await this.prisma.customer.findFirst({
      where: {
        ownerId: input.ownerId,
        OR: [
          phone ? { phone } : undefined,
          email ? { email } : undefined,
        ].filter(Boolean) as any[],
      },
    });

    if (existing) {
      const existingTags = Array.isArray(existing.tags) ? existing.tags : [];
      const nextTags = Array.from(
        new Set([...existingTags, 'PORTFOY_TAPU_SAHIBI', `PORTFOY_${input.unitId}`]),
      );

      await this.prisma.customer.update({
        where: { id: existing.id },
        data: {
          firstName: existing.firstName || firstName,
          lastName: existing.lastName || lastName,
          phone: existing.phone || phone,
          email: existing.email || email,
          city: existing.city || input.project.city || undefined,
          interestedArea:
            existing.interestedArea ||
            [input.project.district, input.project.address].filter(Boolean).join(' / ') ||
            undefined,
          interestedType: existing.interestedType || String(input.unit.type || ''),
          source: existing.source || 'PORTFOY_TAPU_SAHIBI',
          notes: [existing.notes, note].filter(Boolean).join('\n\n---\n\n'),
          tags: nextTags,
          updatedAt: new Date(),
        },
      });

      await this.prisma.activity.create({
        data: {
          customerId: existing.id,
          userId: input.ownerId,
          type: ActivityType.NOT,
          note: `Tapu sahibi bilgisi portföy ile eşleştirildi. Portföy ID: ${input.unitId}`,
        },
      });

      return;
    }

    const customer = await this.prisma.customer.create({
      data: {
        ownerId: input.ownerId,
        firstName,
        lastName,
        phone,
        email,
        city: input.project.city || undefined,
        interestedArea:
          [input.project.district, input.project.address].filter(Boolean).join(' / ') ||
          undefined,
        interestedType: String(input.unit.type || '') || undefined,
        budget: input.unit.price || undefined,
        source: 'PORTFOY_TAPU_SAHIBI',
        status: CustomerStatus.YENI_LEAD,
        tags: ['PORTFOY_TAPU_SAHIBI', `PORTFOY_${input.unitId}`],
        notes: note,
      },
    });

    await this.prisma.activity.create({
      data: {
        customerId: customer.id,
        userId: input.ownerId,
        type: ActivityType.NOT,
        note: `Tapu sahibi portföy girişinden otomatik CRM kaydı olarak oluşturuldu. Portföy ID: ${input.unitId}`,
      },
    });
  }

  async create(
    user: CurrentUserPayload,
    projectId: string,
    data: CreateUnitPayload,
  ) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Proje bulunamadı.');
    }

    this.ensureCanManageUnit(user, project.ownerId);

    const createdUnit = await this.prisma.unit.create({
      data: {
        type: data.type,
        floor: data.floor,
        floorLabel: data.floorLabel,
        totalFloors: data.totalFloors,
        priceCurrency: data.priceCurrency || 'TRY',
        number: data.number || '',
        roomCount: data.roomCount,
        area: data.area,
        price: data.price,
        status: data.status || UnitStatus.SATILIK,
        description: data.description,
        deedOwnerFullName: this.cleanText(data.deedOwnerFullName),
        deedOwnerPhone: this.normalizePhone(data.deedOwnerPhone),
        deedOwnerEmail: this.cleanText(data.deedOwnerEmail),
        projectId,
        approvalStatus: PortfolioApprovalStatus.TASLAK,
        isPoolVisible: false,
      },
      include: unitInclude,
    });

    await this.syncDeedOwnerToCrm({
      ownerId: project.ownerId,
      unitId: createdUnit.id,
      project,
      unit: createdUnit,
    });

    return createdUnit;
  }

  async findOne(user: CurrentUserPayload, id: string) {
    const unit = await this.prisma.unit.findUnique({
      where: { id },
      include: unitInclude,
    });

    if (!unit) {
      throw new NotFoundException('Portföy bulunamadı.');
    }

    this.ensureCanViewUnit(user, unit.project.ownerId);

    return unit;
  }

  async findPortfolioApprovals(
    user: CurrentUserPayload,
    filters?: { status?: string },
  ) {
    this.ensureApprovalManager(user);

    const rawStatus = String(filters?.status || '').trim().toUpperCase();

    const approvalStatus =
      rawStatus && rawStatus !== 'ALL'
        ? (rawStatus as PortfolioApprovalStatus)
        : undefined;

    const approvalStatuses: PortfolioApprovalStatus[] = [
      PortfolioApprovalStatus.BELGE_BEKLENIYOR,
      PortfolioApprovalStatus.INCELEMEYE_GONDERILDI,
      PortfolioApprovalStatus.INCELEMEDE,
      PortfolioApprovalStatus.EKSIK_BILGI_BEKLENIYOR,
      PortfolioApprovalStatus.ONAYLANDI,
      PortfolioApprovalStatus.HAVUZDA,
      PortfolioApprovalStatus.REDDEDILDI,
    ];

    return this.prisma.unit.findMany({
      where: {
        approvalStatus: approvalStatus || {
          in: approvalStatuses,
        },
      },
      include: unitInclude,
      orderBy: [
        { submittedForApprovalAt: 'desc' },
        { updatedAt: 'desc' },
        { createdAt: 'desc' },
      ],
    });
  }

  async findByProject(
    user: CurrentUserPayload,
    projectId: string,
    filters?: { status?: UnitStatus; type?: UnitType },
  ) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, ownerId: true },
    });

    if (!project) {
      throw new NotFoundException('Proje bulunamadı.');
    }

    this.ensureCanViewUnit(user, project.ownerId);

    return this.prisma.unit.findMany({
      where: {
        projectId,
        status: filters?.status,
        type: filters?.type,
      },
      include: unitInclude,
      orderBy: [{ floor: 'asc' }, { number: 'asc' }],
    });
  }

  async findAll(
    user: CurrentUserPayload,
    filters?: {
      status?: UnitStatus;
      type?: UnitType;
      city?: string;
      isOffMarket?: boolean;
    },
  ) {
    return this.prisma.unit.findMany({
      where: {
        ...this.getPrivateUnitWhere(user),
        status: filters?.status,
        type: filters?.type,
        isOffMarket: filters?.isOffMarket,
        project: {
          ...(this.isSuperAdmin(user) || this.isAdmin(user) || this.isModerator(user)
            ? {}
            : { ownerId: user.id }),
          isActive: true,
          city: filters?.city
            ? { contains: filters.city, mode: 'insensitive' }
            : undefined,
        },
      },
      include: unitInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findPool(
    user: CurrentUserPayload,
    filters?: {
      status?: UnitStatus;
      type?: UnitType;
      city?: string;
    },
  ) {
    return this.prisma.unit.findMany({
      where: {
        isPoolVisible: true,
        approvalStatus: PortfolioApprovalStatus.HAVUZDA,
        status: filters?.status,
        type: filters?.type,
        project: {
          isActive: true,
          city: filters?.city
            ? { contains: filters.city, mode: 'insensitive' }
            : undefined,
        },
      },
      include: unitInclude,
      orderBy: { poolPublishedAt: 'desc' },
    });
  }

  async submitApproval(id: string, user: CurrentUserPayload) {
    const unit = await this.getUnitWithProjectOrFail(id);

    this.ensureCanManageUnit(user, unit.project.ownerId);

    if (!this.hasApprovalDocument(unit)) {
      return this.prisma.unit.update({
        where: { id },
        data: {
          approvalStatus: PortfolioApprovalStatus.BELGE_BEKLENIYOR,
          isPoolVisible: false,
          approvalNote:
            'Havuza gönderebilmek için yetki belgesi, tapu veya ilgili doğrulama evrakı gereklidir.',
        },
        include: unitInclude,
      });
    }

    return this.prisma.unit.update({
      where: { id },
      data: {
        approvalStatus: PortfolioApprovalStatus.INCELEMEYE_GONDERILDI,
        submittedForApprovalAt: new Date(),
        rejectedAt: null,
        approvalNote: null,
        isPoolVisible: false,
      },
      include: unitInclude,
    });
  }

  async markReviewing(
    id: string,
    user: CurrentUserPayload,
    body?: { note?: string },
  ) {
    this.ensureApprovalManager(user);

    await this.getUnitWithProjectOrFail(id);

    return this.prisma.unit.update({
      where: { id },
      data: {
        approvalStatus: PortfolioApprovalStatus.INCELEMEDE,
        approvalNote: body?.note || 'Portföy incelemeye alındı.',
        isPoolVisible: false,
      },
      include: unitInclude,
    });
  }

  async requestMissingInfo(
    id: string,
    user: CurrentUserPayload,
    body?: { note?: string },
  ) {
    this.ensureApprovalManager(user);

    await this.getUnitWithProjectOrFail(id);

    return this.prisma.unit.update({
      where: { id },
      data: {
        approvalStatus: PortfolioApprovalStatus.EKSIK_BILGI_BEKLENIYOR,
        approvalNote:
          body?.note ||
          'EPH inceleme ekibi bu portföy için ek bilgi veya belge bekliyor.',
        isPoolVisible: false,
        poolRemovedAt: new Date(),
      },
      include: unitInclude,
    });
  }

  async approve(id: string, user: CurrentUserPayload, body?: { note?: string }) {
    this.ensureApprovalManager(user);

    const unit = await this.getUnitWithProjectOrFail(id);

    if (!this.hasApprovalDocument(unit)) {
      throw new BadRequestException(
        'Bu portföyde onay için yeterli doğrulama evrakı bulunmuyor.',
      );
    }

    return this.prisma.unit.update({
      where: { id },
      data: {
        approvalStatus: PortfolioApprovalStatus.ONAYLANDI,
        approvedAt: new Date(),
        rejectedAt: null,
        approvalNote: body?.note || null,
        isVerified: true,
        verifiedAt: new Date(),
        isPoolVisible: false,
      },
      include: unitInclude,
    });
  }

  async reject(id: string, user: CurrentUserPayload, body?: { note?: string }) {
    this.ensureApprovalManager(user);

    await this.getUnitWithProjectOrFail(id);

    return this.prisma.unit.update({
      where: { id },
      data: {
        approvalStatus: PortfolioApprovalStatus.REDDEDILDI,
        rejectedAt: new Date(),
        approvalNote: body?.note || 'Portföy doğrulama sürecinde reddedildi.',
        isPoolVisible: false,
        poolRemovedAt: new Date(),
      },
      include: unitInclude,
    });
  }

  async sendToPool(id: string, user: CurrentUserPayload) {
    const unit = await this.getUnitWithProjectOrFail(id);

    if (!this.isApprovalManager(user)) {
      this.ensureCanManageUnit(user, unit.project.ownerId);
    }

    if (unit.approvalStatus !== PortfolioApprovalStatus.ONAYLANDI) {
      throw new BadRequestException(
        'Sadece onaylanmış portföyler havuza gönderilebilir.',
      );
    }

    return this.prisma.unit.update({
      where: { id },
      data: {
        approvalStatus: PortfolioApprovalStatus.HAVUZDA,
        isPoolVisible: true,
        poolPublishedAt: new Date(),
        poolRemovedAt: null,
      },
      include: unitInclude,
    });
  }

  async removeFromPool(id: string, user: CurrentUserPayload) {
    const unit = await this.getUnitWithProjectOrFail(id);

    if (!this.isApprovalManager(user)) {
      this.ensureCanManageUnit(user, unit.project.ownerId);
    }

    if (!unit.isPoolVisible) {
      throw new BadRequestException('Bu portföy zaten havuzda değil.');
    }

    return this.prisma.unit.update({
      where: { id },
      data: {
        approvalStatus: PortfolioApprovalStatus.ONAYLANDI,
        isPoolVisible: false,
        poolRemovedAt: new Date(),
      },
      include: unitInclude,
    });
  }

  async updateStatus(id: string, user: CurrentUserPayload, status: UnitStatus) {
    const unit = await this.getUnitWithProjectOrFail(id);

    this.ensureCanManageUnit(user, unit.project.ownerId);

    return this.prisma.unit.update({
      where: { id },
      data: { status },
      include: unitInclude,
    });
  }

  async update(id: string, user: CurrentUserPayload, data: any) {
    const unit = await this.getUnitWithProjectOrFail(id);

    this.ensureCanManageUnit(user, unit.project.ownerId);

    const protectedFields = [
      'approvalStatus',
      'isPoolVisible',
      'submittedForApprovalAt',
      'approvedAt',
      'rejectedAt',
      'approvalNote',
      'poolPublishedAt',
      'poolRemovedAt',
      'isVerified',
      'verifiedAt',
    ];

    for (const field of protectedFields) {
      if (field in data && !this.isSuperAdmin(user)) {
        delete data[field];
      }
    }

    const updatedUnit = await this.prisma.unit.update({
      where: { id },
      data: {
        ...data,
        deedOwnerFullName:
          'deedOwnerFullName' in data
            ? this.cleanText(data.deedOwnerFullName)
            : undefined,
        deedOwnerPhone:
          'deedOwnerPhone' in data
            ? this.normalizePhone(data.deedOwnerPhone)
            : undefined,
        deedOwnerEmail:
          'deedOwnerEmail' in data
            ? this.cleanText(data.deedOwnerEmail)
            : undefined,
      },
      include: unitInclude,
    });

    await this.syncDeedOwnerToCrm({
      ownerId: unit.project.ownerId,
      unitId: updatedUnit.id,
      project: unit.project,
      unit: updatedUnit,
    });

    return updatedUnit;
  }

  async verifyUnit(
    id: string,
    data: {
      tapuVerified?: boolean;
      photoVerified?: boolean;
      yetkiVerified?: boolean;
      isOffMarket?: boolean;
    },
  ) {
    const unit = await this.prisma.unit.findUnique({
      where: { id },
    });

    if (!unit) {
      throw new NotFoundException('Portföy bulunamadı.');
    }

    const isVerified = Boolean(
      data.tapuVerified || data.photoVerified || data.yetkiVerified,
    );

    const verifiedAt = isVerified ? new Date() : null;

    return this.prisma.unit.update({
      where: { id },
      data: {
        ...data,
        isVerified,
        verifiedAt,
      },
      include: unitInclude,
    });
  }

  async remove(id: string, user: CurrentUserPayload) {
    const unit = await this.getUnitWithProjectOrFail(id);

    this.ensureCanManageUnit(user, unit.project.ownerId);

    return this.prisma.unit.delete({
      where: { id },
    });
  }
}