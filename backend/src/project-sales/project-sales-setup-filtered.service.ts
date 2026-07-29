import { Injectable } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectSalesSetupService } from './project-sales-setup.service';

@Injectable()
export class ProjectSalesSetupFilteredService extends ProjectSalesSetupService {
  constructor(private readonly listPrisma: PrismaService) {
    super(listPrisma);
  }

  override async listProjectDrafts(userId: string, userRole: Role) {
    return this.listPrisma.project.findMany({
      where: {
        code: {
          not: null,
        },
        ...(userRole === Role.SUPER_ADMIN
          ? {}
          : {
              ownerId: userId,
            }),
      },
      select: this.filteredProjectListSelect(),
      orderBy: [{ isActive: 'desc' }, { updatedAt: 'desc' }],
    });
  }

  private filteredProjectListSelect(): Prisma.ProjectSelect {
    return {
      id: true,
      name: true,
      code: true,
      description: true,
      lifecycleStage: true,
      city: true,
      district: true,
      neighborhood: true,
      address: true,
      adaNo: true,
      parselNo: true,
      latitude: true,
      longitude: true,
      mapAddress: true,
      placeId: true,
      declaredIndependentUnitCount: true,
      declaredSalesInventoryCount: true,
      plannedUnitTypes: true,
      plannedOtherUnitTypeName: true,
      geometryType: true,
      wizardStep: true,
      setupStatus: true,
      needsSoftwareTeamReview: true,
      completionPercent: true,
      defaultDeliveryDate: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          blocks: true,
          units: true,
          spaces: true,
          designReviewRequests: true,
        },
      },
    };
  }
}
