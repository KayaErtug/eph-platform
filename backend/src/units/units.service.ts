import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role, UnitStatus, UnitType } from '@prisma/client';

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

  private getPrivateUnitWhere(user: CurrentUserPayload) {
    if (this.isSuperAdmin(user)) return {};

    if (this.isAdmin(user)) {
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

  async create(
    user: CurrentUserPayload,
    projectId: string,
    data: CreateUnitPayload,
  ) {
    const project = await this.prisma.project.findUnique({
      where: {
        id: projectId,
      },
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
      },
      include: unitInclude,
    });
  }

  async findOne(user: CurrentUserPayload, id: string) {
    const unit = await this.prisma.unit.findUnique({
      where: {
        id,
      },
      include: unitInclude,
    });

    if (!unit) {
      throw new NotFoundException('Birim bulunamadı.');
    }

    this.ensureCanViewUnit(user, unit.project.ownerId);

    return unit;
  }

  async findByProject(
    user: CurrentUserPayload,
    projectId: string,
    filters?: { status?: UnitStatus; type?: UnitType },
  ) {
    const project = await this.prisma.project.findUnique({
      where: {
        id: projectId,
      },
      select: {
        id: true,
        ownerId: true,
      },
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
          ...(this.isSuperAdmin(user) || this.isAdmin(user)
            ? {}
            : { ownerId: user.id }),
          isActive: true,
          city: filters?.city
            ? { contains: filters.city, mode: 'insensitive' }
            : undefined,
        },
      },
      include: unitInclude,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async updateStatus(id: string, user: CurrentUserPayload, status: UnitStatus) {
    const unit = await this.prisma.unit.findUnique({
      where: {
        id,
      },
      include: {
        project: true,
      },
    });

    if (!unit) {
      throw new NotFoundException('Birim bulunamadı.');
    }

    this.ensureCanManageUnit(user, unit.project.ownerId);

    return this.prisma.unit.update({
      where: {
        id,
      },
      data: {
        status,
      },
      include: unitInclude,
    });
  }

  async update(id: string, user: CurrentUserPayload, data: any) {
    const unit = await this.prisma.unit.findUnique({
      where: {
        id,
      },
      include: {
        project: true,
      },
    });

    if (!unit) {
      throw new NotFoundException('Birim bulunamadı.');
    }

    this.ensureCanManageUnit(user, unit.project.ownerId);

    return this.prisma.unit.update({
      where: {
        id,
      },
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
      where: {
        id,
      },
    });

    if (!unit) {
      throw new NotFoundException('Birim bulunamadı.');
    }

    const isVerified = Boolean(
      data.tapuVerified || data.photoVerified || data.yetkiVerified,
    );

    const verifiedAt = isVerified ? new Date() : null;

    return this.prisma.unit.update({
      where: {
        id,
      },
      data: {
        ...data,
        isVerified,
        verifiedAt,
      },
      include: unitInclude,
    });
  }

  async remove(id: string, user: CurrentUserPayload) {
    const unit = await this.prisma.unit.findUnique({
      where: {
        id,
      },
      include: {
        project: true,
      },
    });

    if (!unit) {
      throw new NotFoundException('Birim bulunamadı.');
    }

    this.ensureCanManageUnit(user, unit.project.ownerId);

    return this.prisma.unit.delete({
      where: {
        id,
      },
    });
  }
}