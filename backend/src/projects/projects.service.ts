import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ProjectSetupStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type ProjectLocationData = {
  name?: string;
  description?: string;
  city?: string;
  district?: string;
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

function cleanOptionalLocationData(data: ProjectLocationData) {
  return {
    description: data.description,
    city: data.city,
    district: data.district,
    address: data.address,
    latitude: toNullableFloat(data.latitude),
    longitude: toNullableFloat(data.longitude),
    mapAddress: data.mapAddress ? String(data.mapAddress).trim() : null,
    placeId: data.placeId ? String(data.placeId).trim() : null,
    isActive: data.isActive,
  };
}

function cleanCreateLocationData(data: CreateProjectData) {
  return {
    name: data.name,
    description: data.description,
    city: data.city,
    district: data.district,
    address: data.address,
    latitude: toNullableFloat(data.latitude),
    longitude: toNullableFloat(data.longitude),
    mapAddress: data.mapAddress ? String(data.mapAddress).trim() : null,
    placeId: data.placeId ? String(data.placeId).trim() : null,
    isActive: data.isActive,
  };
}

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

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

  async findAll(filters?: { city?: string; district?: string; isActive?: boolean }) {
    return this.prisma.project.findMany({
      where: {
        ...this.getPortfolioVisibleProjectWhere(),
        isActive: filters?.isActive ?? true,
        city: filters?.city ? { contains: filters.city, mode: 'insensitive' } : undefined,
        district: filters?.district ? { contains: filters.district, mode: 'insensitive' } : undefined,
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
  }

  async findOne(id: string) {
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

    return project;
  }

  async update(id: string, userId: string, data: ProjectLocationData) {
    const project = await this.prisma.project.findUnique({
      where: {
        id,
      },
    });

    if (!project) {
      throw new NotFoundException('Proje bulunamadi.');
    }

    if (project.ownerId !== userId) {
      throw new ForbiddenException('Bu projeyi duzenleme yetkiniz yok.');
    }

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

  async remove(id: string, userId: string) {
    const project = await this.prisma.project.findUnique({
      where: {
        id,
      },
    });

    if (!project) {
      throw new NotFoundException('Proje bulunamadi.');
    }

    if (project.ownerId !== userId) {
      throw new ForbiddenException('Bu projeyi silme yetkiniz yok.');
    }

    return this.prisma.project.delete({
      where: {
        id,
      },
    });
  }

  async myProjects(ownerId: string) {
    return this.prisma.project.findMany({
      where: {
        ...this.getPortfolioVisibleProjectWhere(),
        ownerId,
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
