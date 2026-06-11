import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
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

    return this.prisma.unit.create({
      data: {
        type: data.type,
        floor: data.floor,
        floorLabel: data.floorLabel,
        totalFloors: data.totalFloors,
        priceCurrency: data.priceCurrency || 'TRY',
        number: data.number,
        roomCount: data.roomCount,
        area: data.area,
        price: data.price,
        status: data.status || UnitStatus.SATILIK,
        description: data.description,
        projectId,
        approvalStatus: PortfolioApprovalStatus.TASLAK,
        isPoolVisible: false,
      },
      include: unitInclude,
    });
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

    return this.prisma.unit.update({
      where: { id },
      data,
      include: unitInclude,
    });
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