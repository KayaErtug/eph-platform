import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

  async create(ownerId: string, data: {
    name: string;
    description?: string;
    city: string;
    district: string;
    address: string;
  }) {
    return this.prisma.project.create({
      data: { ...data, ownerId },
      include: { owner: { select: { id: true, firstName: true, lastName: true, role: true } }, units: true },
    });
  }

  async findAll(filters?: { city?: string; district?: string; isActive?: boolean }) {
    return this.prisma.project.findMany({
      where: {
        isActive: filters?.isActive ?? true,
        city: filters?.city ? { contains: filters.city, mode: 'insensitive' } : undefined,
        district: filters?.district ? { contains: filters.district, mode: 'insensitive' } : undefined,
      },
      include: {
        owner: { select: { id: true, firstName: true, lastName: true, role: true } },
        units: true,
        _count: { select: { units: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, firstName: true, lastName: true, role: true } },
        units: { orderBy: { createdAt: 'asc' } },
        _count: { select: { units: true } },
      },
    });
    if (!project) throw new NotFoundException('Proje bulunamadi.');
    return project;
  }

  async update(id: string, userId: string, data: {
    name?: string;
    description?: string;
    city?: string;
    district?: string;
    address?: string;
    isActive?: boolean;
  }) {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundException('Proje bulunamadi.');
    if (project.ownerId !== userId) throw new ForbiddenException('Bu projeyi duzenleme yetkiniz yok.');
    return this.prisma.project.update({ where: { id }, data });
  }

  async remove(id: string, userId: string) {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundException('Proje bulunamadi.');
    if (project.ownerId !== userId) throw new ForbiddenException('Bu projeyi silme yetkiniz yok.');
    return this.prisma.project.delete({ where: { id } });
  }

  async myProjects(ownerId: string) {
    return this.prisma.project.findMany({
      where: { ownerId },
      include: {
        units: true,
        _count: { select: { units: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}