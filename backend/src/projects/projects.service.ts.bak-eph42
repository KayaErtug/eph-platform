import { PoolProjectsService } from '../pool-projects/pool-projects.service';
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  PortfolioApprovalStatus,
  ProjectSetupStatus,
  Role,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type ProjectLocationData = {
  name?: string;
  description?: string;
  city?: string;
  district?: string;
  neighborhood?: string | null;
  address?: string;
  latitude?: number | string | null;
  longitude?: number | string | null;
  mapAddress?: string | null;
  placeId?: string | null;
  isActive?: boolean;
};

type CreateProjectData = ProjectLocationData & {
  name: string;
  city: string;
  district: string;
  address: string;
};

function toNullableFloat(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === '') return null;

  const numeric = Number(value);

  return Number.isFinite(numeric) ? numeric : null;
}

function cleanOptionalText(value: string | null | undefined) {
  if (value === undefined) return undefined;
  if (value === null) return null;

  const normalized = String(value).trim();
  return normalized || null;
}

function cleanOptionalLocationData(data: ProjectLocationData) {
  const cleaned: Record<string, unknown> = {};

  if (data.name !== undefined) cleaned.name = String(data.name).trim();
  if (data.description !== undefined) cleaned.description = data.description;
  if (data.city !== undefined) cleaned.city = String(data.city).trim();
  if (data.district !== undefined) cleaned.district = String(data.district).trim();
  if (data.neighborhood !== undefined) {
    cleaned.neighborhood = cleanOptionalText(data.neighborhood);
  }
  if (data.address !== undefined) cleaned.address = String(data.address).trim();
  if (data.latitude !== undefined) cleaned.latitude = toNullableFloat(data.latitude);
  if (data.longitude !== undefined) cleaned.longitude = toNullableFloat(data.longitude);
  if (data.mapAddress !== undefined) {
    cleaned.mapAddress = cleanOptionalText(data.mapAddress);
  }
  if (data.placeId !== undefined) {
    cleaned.placeId = cleanOptionalText(data.placeId);
  }
  if (data.isActive !== undefined) cleaned.isActive = data.isActive;

  return cleaned;
}

function cleanCreateLocationData(data: CreateProjectData) {
  return {
    name: String(data.name).trim(),
    description: data.description,
    city: String(data.city).trim(),
    district: String(data.district).trim(),
    neighborhood: cleanOptionalText(data.neighborhood),
    address: String(data.address).trim(),
    latitude: toNullableFloat(data.latitude),
    longitude: toNullableFloat(data.longitude),
    mapAddress: cleanOptionalText(data.mapAddress),
    placeId: cleanOptionalText(data.placeId),
    isActive: data.isActive,
  };
}

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService, private readonly poolProjects: PoolProjectsService) {}

  private ensureProjectContentEditable(
    units: Array<{
      approvalStatus?: PortfolioApprovalStatus | string | null;
    }>,
  ) {
    const lockedStatuses = new Set<string>([
      PortfolioApprovalStatus.INCELEMEYE_GONDERILDI,
      PortfolioApprovalStatus.INCELEMEDE,
      PortfolioApprovalStatus.ONAYLANDI,
      PortfolioApprovalStatus.HAVUZDA,
    ]);

    const hasLockedPortfolio = units.some((unit) =>
      lockedStatuses.has(
        String(unit.approvalStatus || '').toUpperCase(),
      ),
    );

    if (hasLockedPortfolio) {
      throw new ForbiddenException(
        'İncelemeye gönderilmiş veya havuzda yayınlanan portföyün adres ve harita konumu değiştirilemez. Düzeltme için portföyün Eksik Bilgi durumuna alınması gerekir.',
      );
    }
  }

  private getPortfolioVisibleProjectWhere() {
    return {
      OR: [
        {
          code: null,
          declaredIndependentUnitCount: null,
          declaredSalesInventoryCount: null,
          plannedUnitTypes: {
            isEmpty: true,
          },
          blocks: {
            none: {},
          },
          mediaPackages: {
            none: {},
          },
          designReviewRequests: {
            none: {},
          },
        },
        {
          setupStatus: ProjectSetupStatus.TAMAMLANDI,
        },
      ],
    };
  }

  async create(ownerId: string, data: CreateProjectData) {
    return this.prisma.project.create({
      data: {
        ...cleanCreateLocationData(data),
        owner: {
          connect: {
            id: ownerId,
          },
        },
      },
      include: {
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
        units: true,
      },
    });
  }

  async findAll(filters?: {
    city?: string;
    district?: string;
    neighborhood?: string;
    isActive?: boolean;
  }, user?: { id: string; role?: string }) {
    if (!user?.id) throw new ForbiddenException('Oturum bulunamadı.');
    const owned = await this.prisma.project.findMany({
      where: {
        ...this.getPortfolioVisibleProjectWhere(),
        ...(user.role === Role.SUPER_ADMIN ? {} : { ownerId: user.id }),
        isActive: filters?.isActive ?? true,
        city: filters?.city
          ? {
              contains: filters.city,
              mode: 'insensitive',
            }
          : undefined,
        district: filters?.district
          ? {
              contains: filters.district,
              mode: 'insensitive',
            }
          : undefined,
        neighborhood: filters?.neighborhood
          ? {
              contains: filters.neighborhood,
              mode: 'insensitive',
            }
          : undefined,
      },
      include: {
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
        units: true,
        _count: {
          select: {
            units: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    if (user.role === Role.SUPER_ADMIN) return owned;
    const publicProjects = await this.poolProjects.listProjects(user);
    const ownedIds = new Set(owned.map(project => project.id));
    return [...owned, ...publicProjects.filter(project => !ownedIds.has(project.id) &&
      (!filters?.city || project.city?.toLocaleLowerCase('tr-TR').includes(filters.city.toLocaleLowerCase('tr-TR'))) &&
      (!filters?.district || project.district?.toLocaleLowerCase('tr-TR').includes(filters.district.toLocaleLowerCase('tr-TR'))) &&
      (!filters?.neighborhood || project.neighborhood?.toLocaleLowerCase('tr-TR').includes(filters.neighborhood.toLocaleLowerCase('tr-TR')))
    )];
  }

  async findOne(id: string, user?: { id: string; role?: string }) {
    if (!user?.id) throw new ForbiddenException('Oturum bulunamadı.');
    const project = await this.prisma.project.findFirst({
      where: {
        id,
        ...this.getPortfolioVisibleProjectWhere(),
      },
      include: {
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
        units: {
          orderBy: {
            createdAt: 'asc',
          },
        },
        _count: {
          select: {
            units: true,
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Proje bulunamadi.');
    }

    if (project.ownerId === user.id || user.role === Role.SUPER_ADMIN) return project;
    return this.poolProjects.getProjectDetail(id, user);
  }

  async update(
    id: string,
    userId: string,
    data: ProjectLocationData,
    userRole?: Role | string,
  ) {
    const project = await this.prisma.project.findUnique({
      where: {
        id,
      },
      include: {
        units: {
          select: {
            approvalStatus: true,
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Proje bulunamadi.');
    }

    if (project.ownerId !== userId && userRole !== Role.SUPER_ADMIN) {
      throw new ForbiddenException(
        'Bu projeyi duzenleme yetkiniz yok.',
      );
    }

    if (userRole !== Role.SUPER_ADMIN) this.ensureProjectContentEditable(project.units);

    return this.prisma.project.update({
      where: {
        id,
      },
      data: cleanOptionalLocationData(data),
      include: {
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
        units: true,
      },
    });
  }

  async remove(id: string, userId: string, userRole?: Role | string) {
    const project = await this.prisma.project.findUnique({
      where: {
        id,
      },
      include: {
        units: {
          select: {
            approvalStatus: true,
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Proje bulunamadi.');
    }

    if (project.ownerId !== userId && userRole !== Role.SUPER_ADMIN) {
      throw new ForbiddenException(
        'Bu projeyi silme yetkiniz yok.',
      );
    }

    if (userRole !== Role.SUPER_ADMIN) this.ensureProjectContentEditable(project.units);

    return this.prisma.project.delete({
      where: {
        id,
      },
    });
  }

  async myProjects(ownerId: string, userRole?: Role | string) {
    return this.prisma.project.findMany({
      where: {
        ...this.getPortfolioVisibleProjectWhere(),
        ...(userRole === Role.SUPER_ADMIN ? {} : { ownerId }),
      },
      include: {
        units: true,
        _count: {
          select: {
            units: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}