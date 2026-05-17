import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UnitStatus, UnitType } from '@prisma/client';

@Injectable()
export class UnitsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, projectId: string, data: {
    type: UnitType; floor?: number; number: string;
    roomCount?: string; area?: number; price: number; description?: string;
  }) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Proje bulunamadi.');
    if (project.ownerId !== userId) throw new ForbiddenException('Bu projeye birim ekleme yetkiniz yok.');
    return this.prisma.unit.create({ data: { ...data, projectId } });
  }

  async findByProject(projectId: string, filters?: { status?: UnitStatus; type?: UnitType }) {
    return this.prisma.unit.findMany({
      where: { projectId, status: filters?.status, type: filters?.type },
      orderBy: [{ floor: 'asc' }, { number: 'asc' }],
    });
  }

  async findAll(filters?: { status?: UnitStatus; type?: UnitType; city?: string; isOffMarket?: boolean }) {
    return this.prisma.unit.findMany({
      where: {
        status: filters?.status,
        type: filters?.type,
        isOffMarket: filters?.isOffMarket,
        project: {
          isActive: true,
          city: filters?.city ? { contains: filters.city, mode: 'insensitive' } : undefined,
        },
      },
      include: {
        project: {
          select: {
            id: true, name: true, city: true, district: true, address: true,
            owner: { select: { firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateStatus(id: string, userId: string, status: UnitStatus) {
    const unit = await this.prisma.unit.findUnique({ where: { id }, include: { project: true } });
    if (!unit) throw new NotFoundException('Birim bulunamadi.');
    if (unit.project.ownerId !== userId) throw new ForbiddenException('Bu birimi guncelleme yetkiniz yok.');
    return this.prisma.unit.update({ where: { id }, data: { status } });
  }

  async update(id: string, userId: string, data: any) {
    const unit = await this.prisma.unit.findUnique({ where: { id }, include: { project: true } });
    if (!unit) throw new NotFoundException('Birim bulunamadi.');
    if (unit.project.ownerId !== userId) throw new ForbiddenException('Bu birimi guncelleme yetkiniz yok.');
    return this.prisma.unit.update({ where: { id }, data });
  }

  async verifyUnit(id: string, data: {
    tapuVerified?: boolean;
    photoVerified?: boolean;
    yetkiVerified?: boolean;
    isOffMarket?: boolean;
  }) {
    const unit = await this.prisma.unit.findUnique({ where: { id } });
    if (!unit) throw new NotFoundException('Birim bulunamadi.');

    const isVerified = !!(data.tapuVerified || data.photoVerified || data.yetkiVerified);
    const verifiedAt = isVerified ? new Date() : null;

    return this.prisma.unit.update({
      where: { id },
      data: {
        ...data,
        isVerified,
        verifiedAt,
      },
    });
  }

  async remove(id: string, userId: string) {
    const unit = await this.prisma.unit.findUnique({ where: { id }, include: { project: true } });
    if (!unit) throw new NotFoundException('Birim bulunamadi.');
    if (unit.project.ownerId !== userId) throw new ForbiddenException('Bu birimi silme yetkiniz yok.');
    return this.prisma.unit.delete({ where: { id } });
  }
}