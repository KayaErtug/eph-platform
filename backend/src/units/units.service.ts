import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role, UnitStatus, UnitType } from '@prisma/client';

type CurrentUserPayload = {
  id: string;
  role?: Role | string;
};

type CreateUnitPayload = {
  type: UnitType;
  floor?: number;
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
      owner: { select: { firstName: true, lastName: true, role: true } },
    },
  },
  images: {
    orderBy: [{ isCover: 'desc' as const }, { sortOrder: 'asc' as const }, { createdAt: 'asc' as const }],
  },
};

@Injectable()
export class UnitsService {
  constructor(private prisma: PrismaService) {}

  private canManageUnit(user: CurrentUserPayload, ownerId: string) {
    if (user.role === Role.ADMIN || user.role === 'ADMIN') return true;
    return ownerId === user.id;
  }

  async create(user: CurrentUserPayload, projectId: string, data: CreateUnitPayload) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });

    if (!project) {
      throw new NotFoundException('Proje bulunamadı.');
    }

    return this.prisma.unit.create({
      data: {
        type: data.type,
        floor: data.floor,
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

  async findOne(id: string) {
    const unit = await this.prisma.unit.findUnique({
      where: { id },
      include: unitInclude,
    });

    if (!unit) {
      throw new NotFoundException('Birim bulunamadı.');
    }

    return unit;
  }

  async findByProject(projectId: string, filters?: { status?: UnitStatus; type?: UnitType }) {
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

  async findAll(filters?: {
    status?: UnitStatus;
    type?: UnitType;
    city?: string;
    isOffMarket?: boolean;
  }) {
    return this.prisma.unit.findMany({
      where: {
        status: filters?.status,
        type: filters?.type,
        isOffMarket: filters?.isOffMarket,
        project: {
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

  async updateStatus(id: string, user: CurrentUserPayload, status: UnitStatus) {
    const unit = await this.prisma.unit.findUnique({
      where: { id },
      include: { project: true },
    });

    if (!unit) {
      throw new NotFoundException('Birim bulunamadı.');
    }

    if (!this.canManageUnit(user, unit.project.ownerId)) {
      throw new ForbiddenException('Bu birimi güncelleme yetkiniz yok.');
    }

    return this.prisma.unit.update({
      where: { id },
      data: { status },
      include: unitInclude,
    });
  }

  async update(id: string, user: CurrentUserPayload, data: any) {
    const unit = await this.prisma.unit.findUnique({
      where: { id },
      include: { project: true },
    });

    if (!unit) {
      throw new NotFoundException('Birim bulunamadı.');
    }

    if (!this.canManageUnit(user, unit.project.ownerId)) {
      throw new ForbiddenException('Bu birimi güncelleme yetkiniz yok.');
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
    const unit = await this.prisma.unit.findUnique({ where: { id } });

    if (!unit) {
      throw new NotFoundException('Birim bulunamadı.');
    }

    const isVerified = !!(
      data.tapuVerified ||
      data.photoVerified ||
      data.yetkiVerified
    );

    const verifiedAt = isVerified ? new Date() : null;

    return this.prisma.unit.update({
      where: { id },
      data: { ...data, isVerified, verifiedAt },
      include: unitInclude,
    });
  }

  async remove(id: string, user: CurrentUserPayload) {
    const unit = await this.prisma.unit.findUnique({
      where: { id },
      include: { project: true },
    });

    if (!unit) {
      throw new NotFoundException('Birim bulunamadı.');
    }

    if (!this.canManageUnit(user, unit.project.ownerId)) {
      throw new ForbiddenException('Bu birimi silme yetkiniz yok.');
    }

    return this.prisma.unit.delete({ where: { id } });
  }
}
