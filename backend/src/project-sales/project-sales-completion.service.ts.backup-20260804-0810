import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ProjectDesignReviewStatus,
  ProjectGeometryType,
  ProjectSetupStatus,
  ProjectWizardStep,
  Role,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type DesignReviewRequestBody = {
  geometryNotes?: unknown;
  userMessage?: unknown;
};

type DesignReviewUpdateBody = {
  status?: unknown;
  softwareTeamNote?: unknown;
};

type CompletionIssue = {
  code: string;
  message: string;
};

const OPEN_REVIEW_STATUSES: ProjectDesignReviewStatus[] = [
  ProjectDesignReviewStatus.BEKLIYOR,
  ProjectDesignReviewStatus.INCELEMEDE,
  ProjectDesignReviewStatus.EK_BILGI_BEKLENIYOR,
];

const APPROVED_REVIEW_STATUSES: ProjectDesignReviewStatus[] = [
  ProjectDesignReviewStatus.ONAYLANDI,
  ProjectDesignReviewStatus.TAMAMLANDI,
];

const COMPLEX_GEOMETRIES = new Set<ProjectGeometryType>([
  ProjectGeometryType.BESGEN,
  ProjectGeometryType.ALTIGEN,
  ProjectGeometryType.YILDIZ,
  ProjectGeometryType.DAIRESEL,
  ProjectGeometryType.KIRIK_CEPHELI,
  ProjectGeometryType.COK_KANATLI,
  ProjectGeometryType.BAGLANTILI_KULELER,
  ProjectGeometryType.OZEL_KARMASIK,
]);

@Injectable()
export class ProjectSalesCompletionService {
  constructor(private readonly prisma: PrismaService) {}

  async previewCompletion(
    projectId: string,
    userId: string,
    userRole: Role,
  ) {
    const project = await this.getAuthorizedProject(
      projectId,
      userId,
      userRole,
    );

    const issues = this.buildCompletionIssues(project);

    return {
      ready: issues.length === 0,
      issues,
      summary: this.buildSummary(project),
      latestDesignReview:
        project.designReviewRequests[0] ?? null,
    };
  }

  async completeProject(
    projectId: string,
    userId: string,
    userRole: Role,
  ) {
    const project = await this.getAuthorizedProject(
      projectId,
      userId,
      userRole,
    );
    const issues = this.buildCompletionIssues(project);

    if (issues.length > 0) {
      throw new BadRequestException({
        message: 'Proje kurulumu tamamlanamadı.',
        issues,
      });
    }

    return this.prisma.project.update({
      where: {
        id: projectId,
      },
      data: {
        wizardStep: ProjectWizardStep.TAMAMLANDI,
        setupStatus: ProjectSetupStatus.TAMAMLANDI,
      },
      include: {
        blocks: {
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
          include: {
            floors: {
              orderBy: [{ sortOrder: 'asc' }, { level: 'asc' }],
              include: {
                _count: {
                  select: {
                    units: true,
                    spaces: true,
                  },
                },
              },
            },
            _count: {
              select: {
                units: true,
                spaces: true,
              },
            },
          },
        },
        designReviewRequests: {
          orderBy: {
            requestedAt: 'desc',
          },
        },
        _count: {
          select: {
            units: true,
            spaces: true,
          },
        },
      },
    });
  }

  async createDesignReviewRequest(
    projectId: string,
    userId: string,
    userRole: Role,
    body: DesignReviewRequestBody,
  ) {
    const project = await this.getAuthorizedProject(
      projectId,
      userId,
      userRole,
    );

    const existingOpenRequest =
      await this.prisma.projectDesignReviewRequest.findFirst({
        where: {
          projectId,
          status: {
            in: OPEN_REVIEW_STATUSES,
          },
        },
        orderBy: {
          requestedAt: 'desc',
        },
      });

    if (existingOpenRequest) {
      throw new BadRequestException(
        'Bu proje için açık bir Yazılım Ekibi inceleme talebi zaten var.',
      );
    }

    const geometryNotes =
      this.optionalText(body.geometryNotes) ??
      this.defaultGeometryNote(project.geometryType);
    const userMessage = this.optionalText(body.userMessage);

    return this.prisma.$transaction(async (transaction) => {
      const request =
        await transaction.projectDesignReviewRequest.create({
          data: {
            projectId,
            requestedById: userId,
            geometryNotes,
            userMessage,
          },
          include: {
            project: {
              select: {
                id: true,
                name: true,
                code: true,
                geometryType: true,
              },
            },
            requestedBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                role: true,
              },
            },
          },
        });

      await transaction.project.update({
        where: {
          id: projectId,
        },
        data: {
          needsSoftwareTeamReview: true,
        },
      });

      return request;
    });
  }

  async listProjectDesignReviewRequests(
    projectId: string,
    userId: string,
    userRole: Role,
  ) {
    await this.getAuthorizedProject(projectId, userId, userRole);

    return this.prisma.projectDesignReviewRequest.findMany({
      where: {
        projectId,
      },
      include: {
        requestedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
        reviewedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
      orderBy: {
        requestedAt: 'desc',
      },
    });
  }

  async listDesignReviewRequests(
    userRole: Role,
    statusValue?: string,
  ) {
    this.ensureSoftwareTeam(userRole);

    const status = statusValue
      ? this.requiredEnum(
          ProjectDesignReviewStatus,
          statusValue,
          'Geçersiz inceleme durumu.',
        )
      : null;

    return this.prisma.projectDesignReviewRequest.findMany({
      where: {
        status: status ?? undefined,
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            code: true,
            city: true,
            district: true,
            neighborhood: true,
            geometryType: true,
            needsSoftwareTeamReview: true,
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
        requestedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
        reviewedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
      orderBy: [
        {
          status: 'asc',
        },
        {
          requestedAt: 'desc',
        },
      ],
    });
  }

  async updateDesignReviewRequest(
    requestId: string,
    reviewerId: string,
    reviewerRole: Role,
    body: DesignReviewUpdateBody,
  ) {
    this.ensureSoftwareTeam(reviewerRole);

    const request =
      await this.prisma.projectDesignReviewRequest.findUnique({
        where: {
          id: requestId,
        },
        select: {
          id: true,
          projectId: true,
          status: true,
        },
      });

    if (!request) {
      throw new NotFoundException(
        'Yazılım Ekibi inceleme talebi bulunamadı.',
      );
    }

    const status = body.status
      ? this.requiredEnum(
          ProjectDesignReviewStatus,
          body.status,
          'Geçersiz inceleme durumu.',
        )
      : request.status;
    const softwareTeamNote = this.optionalText(
      body.softwareTeamNote,
    );
    const now = new Date();
    const approved = APPROVED_REVIEW_STATUSES.includes(status);

    return this.prisma.$transaction(async (transaction) => {
      const updated =
        await transaction.projectDesignReviewRequest.update({
          where: {
            id: requestId,
          },
          data: {
            status,
            softwareTeamNote,
            reviewedById: reviewerId,
            reviewedAt:
              status === ProjectDesignReviewStatus.BEKLIYOR
                ? null
                : now,
            completedAt:
              status === ProjectDesignReviewStatus.TAMAMLANDI
                ? now
                : null,
          },
          include: {
            project: {
              select: {
                id: true,
                name: true,
                code: true,
                geometryType: true,
              },
            },
            requestedBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                role: true,
              },
            },
            reviewedBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                role: true,
              },
            },
          },
        });

      await transaction.project.update({
        where: {
          id: request.projectId,
        },
        data: {
          needsSoftwareTeamReview: !approved,
        },
      });

      return updated;
    });
  }

  private async getAuthorizedProject(
    projectId: string,
    userId: string,
    userRole: Role,
  ) {
    const project = await this.prisma.project.findUnique({
      where: {
        id: projectId,
      },
      include: {
        blocks: {
          where: {
            isActive: true,
          },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
          include: {
            floors: {
              where: {
                isActive: true,
              },
              orderBy: [{ sortOrder: 'asc' }, { level: 'asc' }],
            },
          },
        },
        units: {
          select: {
            id: true,
            blockId: true,
            floorId: true,
            inventoryCode: true,
            number: true,
            legalStatus: true,
            commercialPurpose: true,
            isSalesInventory: true,
          },
        },
        spaces: {
          where: {
            isActive: true,
          },
          select: {
            id: true,
            code: true,
            legalStatus: true,
            commercialPurpose: true,
          },
        },
        designReviewRequests: {
          orderBy: {
            requestedAt: 'desc',
          },
          take: 1,
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Proje bulunamadı.');
    }

    if (
      project.ownerId !== userId &&
      userRole !== Role.SUPER_ADMIN
    ) {
      throw new ForbiddenException(
        'Bu projeye erişim yetkiniz yok.',
      );
    }

    return project;
  }

  private buildCompletionIssues(
    project: Awaited<
      ReturnType<ProjectSalesCompletionService['getAuthorizedProject']>
    >,
  ): CompletionIssue[] {
    const issues: CompletionIssue[] = [];

    this.requireTextIssue(
      issues,
      project.name,
      'PROJECT_NAME_REQUIRED',
      'Proje adı zorunludur.',
    );
    this.requireTextIssue(
      issues,
      project.city,
      'CITY_REQUIRED',
      'İl zorunludur.',
    );
    this.requireTextIssue(
      issues,
      project.district,
      'DISTRICT_REQUIRED',
      'İlçe zorunludur.',
    );
    this.requireTextIssue(
      issues,
      project.neighborhood,
      'NEIGHBORHOOD_REQUIRED',
      'Mahalle zorunludur.',
    );
    this.requireTextIssue(
      issues,
      project.address,
      'ADDRESS_REQUIRED',
      'Açık adres zorunludur.',
    );

    if (
      project.latitude === null ||
      project.longitude === null
    ) {
      issues.push({
        code: 'MAP_LOCATION_REQUIRED',
        message: 'Harita konumu seçilmelidir.',
      });
    }

    if (
      project.declaredIndependentUnitCount === null
    ) {
      issues.push({
        code: 'DECLARED_UNIT_COUNT_REQUIRED',
        message:
          'Beyan edilen toplam bağımsız bölüm sayısı girilmelidir.',
      });
    }

    if (
      project.declaredSalesInventoryCount === null
    ) {
      issues.push({
        code: 'DECLARED_SALES_COUNT_REQUIRED',
        message:
          'Beyan edilen satış veya kiralama stoku sayısı girilmelidir.',
      });
    }

    if (
      project.declaredIndependentUnitCount !== null &&
      project.declaredSalesInventoryCount !== null &&
      project.declaredSalesInventoryCount >
        project.declaredIndependentUnitCount
    ) {
      issues.push({
        code: 'SALES_COUNT_EXCEEDS_UNIT_COUNT',
        message:
          'Satış veya kiralama stoku toplam bağımsız bölüm sayısını aşamaz.',
      });
    }

    if (project.blocks.length === 0) {
      issues.push({
        code: 'BLOCK_REQUIRED',
        message: 'En az bir blok oluşturulmalıdır.',
      });
    }

    for (const block of project.blocks) {
      if (block.floors.length === 0) {
        issues.push({
          code: 'BLOCK_FLOOR_REQUIRED',
          message: `${block.code} blok için en az bir kat oluşturulmalıdır.`,
        });
      }
    }

    const unitCount = project.units.length;
    const salesInventoryCount = project.units.filter(
      (unit) => unit.isSalesInventory,
    ).length;

    if (unitCount === 0) {
      issues.push({
        code: 'UNIT_REQUIRED',
        message:
          'En az bir tapuda bağımsız bölüm oluşturulmalıdır.',
      });
    }

    if (
      project.declaredIndependentUnitCount !== null &&
      unitCount !== project.declaredIndependentUnitCount
    ) {
      issues.push({
        code: 'UNIT_COUNT_MISMATCH',
        message:
          `Beyan edilen bağımsız bölüm sayısı ${project.declaredIndependentUnitCount}, oluşturulan sayı ${unitCount}.`,
      });
    }

    if (
      project.declaredSalesInventoryCount !== null &&
      salesInventoryCount !==
        project.declaredSalesInventoryCount
    ) {
      issues.push({
        code: 'SALES_COUNT_MISMATCH',
        message:
          `Beyan edilen satış/kiralama stoku ${project.declaredSalesInventoryCount}, oluşturulan stok ${salesInventoryCount}.`,
      });
    }

    const incompleteUnitCount = project.units.filter(
      (unit) =>
        !unit.blockId ||
        !unit.floorId ||
        !unit.inventoryCode ||
        !unit.number,
    ).length;

    if (incompleteUnitCount > 0) {
      issues.push({
        code: 'INCOMPLETE_UNIT_STRUCTURE',
        message:
          `${incompleteUnitCount} bağımsız bölümün blok, kat veya numara bilgisi eksik.`,
      });
    }

    const latestReview = project.designReviewRequests[0];
    const complexGeometry =
      COMPLEX_GEOMETRIES.has(project.geometryType);

    if (
      (project.needsSoftwareTeamReview || complexGeometry) &&
      !latestReview
    ) {
      issues.push({
        code: 'SOFTWARE_TEAM_REVIEW_REQUIRED',
        message:
          'Bu proje için Yazılım Ekibi inceleme talebi oluşturulmalıdır.',
      });
    }

    if (
      (project.needsSoftwareTeamReview || complexGeometry) &&
      latestReview &&
      !APPROVED_REVIEW_STATUSES.includes(latestReview.status)
    ) {
      issues.push({
        code: 'SOFTWARE_TEAM_REVIEW_NOT_APPROVED',
        message:
          'Yazılım Ekibi incelemesi onaylanmadan proje kurulumu tamamlanamaz.',
      });
    }

    return issues;
  }

  private buildSummary(
    project: Awaited<
      ReturnType<ProjectSalesCompletionService['getAuthorizedProject']>
    >,
  ) {
    const salesInventoryCount = project.units.filter(
      (unit) => unit.isSalesInventory,
    ).length;

    return {
      blockCount: project.blocks.length,
      floorCount: project.blocks.reduce(
        (total, block) => total + block.floors.length,
        0,
      ),
      independentUnitCount: project.units.length,
      salesInventoryCount,
      nonSalesIndependentUnitCount:
        project.units.length - salesInventoryCount,
      projectSpaceCount: project.spaces.length,
      declaredIndependentUnitCount:
        project.declaredIndependentUnitCount,
      declaredSalesInventoryCount:
        project.declaredSalesInventoryCount,
      geometryType: project.geometryType,
      needsSoftwareTeamReview:
        project.needsSoftwareTeamReview,
      setupStatus: project.setupStatus,
      wizardStep: project.wizardStep,
    };
  }

  private requireTextIssue(
    issues: CompletionIssue[],
    value: string | null | undefined,
    code: string,
    message: string,
  ) {
    if (!value || !value.trim()) {
      issues.push({
        code,
        message,
      });
    }
  }

  private defaultGeometryNote(
    geometryType: ProjectGeometryType,
  ) {
    return `Proje geometrisi ${geometryType}. Standart EPH şablonuna uygunluğunun Yazılım Ekibi tarafından incelenmesi talep ediliyor.`;
  }

  private optionalText(value: unknown) {
    if (value === null || value === undefined) {
      return null;
    }

    const text = String(value).trim();

    return text || null;
  }

  private ensureSoftwareTeam(userRole: Role) {
    if (userRole !== Role.SUPER_ADMIN) {
      throw new ForbiddenException(
        'Bu işlem yalnız Yazılım Ekibi tarafından yapılabilir.',
      );
    }
  }

  private requiredEnum<T extends Record<string, string>>(
    enumObject: T,
    value: unknown,
    message: string,
  ): T[keyof T] {
    const text = String(value ?? '').trim();
    const matched = Object.values(enumObject).find(
      (item) => item === text,
    );

    if (!matched) {
      throw new BadRequestException(message);
    }

    return matched as T[keyof T];
  }
}
