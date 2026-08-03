import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ProjectSceneStatus, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type SceneUpdateBody = {
  version?: unknown;
  sceneData?: unknown;
  thumbnailUrl?: unknown;
};

@Injectable()
export class ProjectSceneService {
  constructor(private readonly prisma: PrismaService) {}

  async getScene(projectId: string, userId: string, userRole: Role) {
    const project = await this.getAuthorizedProject(projectId, userId, userRole);
    const scene = await this.prisma.projectScene.findUnique({
      where: { projectId },
    });

    return this.sceneResponse(project, scene);
  }

  async initializeScene(projectId: string, userId: string, userRole: Role) {
    const project = await this.getAuthorizedProject(projectId, userId, userRole);
    const existingScene = await this.prisma.projectScene.findUnique({
      where: { projectId },
    });

    if (existingScene) {
      return this.sceneResponse(project, existingScene);
    }

    if (project.blocks.length === 0) {
      throw new BadRequestException(
        '3D proje sahnesi oluşturulmadan önce blok ve kat yapısı hazırlanmalıdır.',
      );
    }

    const scene = await this.prisma.projectScene.create({
      data: {
        projectId,
        sceneData: this.buildInitialScene(project),
      },
    });

    return this.sceneResponse(project, scene);
  }

  async updateScene(
    projectId: string,
    userId: string,
    userRole: Role,
    body: SceneUpdateBody,
  ) {
    const project = await this.getAuthorizedProject(projectId, userId, userRole);
    const version = this.requiredPositiveInteger(
      body.version,
      'Sahne sürümü geçersiz.',
    );
    const sceneData = this.requiredJsonObject(
      body.sceneData,
      'Kaydedilecek 3D sahne verisi geçersiz.',
    );
    const thumbnailUrl = this.optionalText(body.thumbnailUrl);

    const updateResult = await this.prisma.projectScene.updateMany({
      where: {
        projectId,
        version,
      },
      data: {
        sceneData,
        thumbnailUrl,
        version: {
          increment: 1,
        },
        status: ProjectSceneStatus.TASLAK,
        completedAt: null,
      },
    });

    if (updateResult.count === 0) {
      const currentScene = await this.prisma.projectScene.findUnique({
        where: { projectId },
        select: { version: true },
      });

      if (!currentScene) {
        throw new NotFoundException(
          '3D sahne bulunamadı. Önce sahneyi oluşturun.',
        );
      }

      throw new ConflictException(
        `3D sahne başka bir oturumda güncellendi. Güncel sürüm: ${currentScene.version}.`,
      );
    }

    const scene = await this.prisma.projectScene.findUniqueOrThrow({
      where: { projectId },
    });

    return this.sceneResponse(project, scene);
  }

  async completeScene(projectId: string, userId: string, userRole: Role) {
    const project = await this.getAuthorizedProject(projectId, userId, userRole);
    const existingScene = await this.prisma.projectScene.findUnique({
      where: { projectId },
    });

    if (!existingScene) {
      throw new NotFoundException(
        'Tamamlanacak 3D sahne bulunamadı. Önce sahneyi oluşturun.',
      );
    }

    const scene = await this.prisma.projectScene.update({
      where: { projectId },
      data: {
        status: ProjectSceneStatus.TAMAMLANDI,
        completedAt: new Date(),
        version: {
          increment: 1,
        },
      },
    });

    return this.sceneResponse(project, scene);
  }

  async skipScene(projectId: string, userId: string, userRole: Role) {
    const project = await this.getAuthorizedProject(projectId, userId, userRole);
    const scene = await this.prisma.projectScene.upsert({
      where: { projectId },
      create: {
        projectId,
        status: ProjectSceneStatus.ATLANDI,
        completedAt: new Date(),
        sceneData: {
          schemaVersion: 3,
          skipped: true,
          landscape: {
            preset: 'URBAN_MODERN',
            density: 3,
            showTrees: true,
            showPaths: true,
            showLighting: true,
            showBenches: true,
            showShrubs: true,
          },
          elements: [],
        },
      },
      update: {
        status: ProjectSceneStatus.ATLANDI,
        completedAt: new Date(),
        version: {
          increment: 1,
        },
      },
    });

    return this.sceneResponse(project, scene);
  }

  async resetScene(projectId: string, userId: string, userRole: Role) {
    await this.getAuthorizedProject(projectId, userId, userRole);
    const result = await this.prisma.projectScene.deleteMany({
      where: { projectId },
    });

    return {
      success: true,
      deleted: result.count > 0,
    };
  }

  private async getAuthorizedProject(
    projectId: string,
    userId: string,
    userRole: Role,
  ) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        ownerId: true,
        name: true,
        code: true,
        city: true,
        district: true,
        neighborhood: true,
        geometryType: true,
        setupStatus: true,
        blocks: {
          where: { isActive: true },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
          select: {
            id: true,
            code: true,
            name: true,
            geometryType: true,
            facadeViewCount: true,
            sortOrder: true,
            floors: {
              where: { isActive: true },
              orderBy: [{ sortOrder: 'asc' }, { level: 'asc' }],
              select: {
                id: true,
                level: true,
                label: true,
                floorType: true,
              },
            },
          },
        },
        spaces: {
          where: {
            isActive: true,
            isCustomerVisible: true,
          },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
          select: {
            id: true,
            name: true,
            spaceType: true,
            grossArea: true,
            blockId: true,
            floorId: true,
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Proje bulunamadı.');
    }

    if (project.ownerId !== userId && userRole !== Role.SUPER_ADMIN) {
      throw new ForbiddenException('Bu projenin 3D sahnesine erişim yetkiniz yok.');
    }

    return project;
  }

  private buildInitialScene(
    project: Awaited<ReturnType<ProjectSceneService['getAuthorizedProject']>>,
  ): Prisma.InputJsonObject {
    const blockCount = project.blocks.length;
    const columns = Math.max(1, Math.ceil(Math.sqrt(blockCount)));
    const rows = Math.max(1, Math.ceil(blockCount / columns));
    const spacingX = 34;
    const spacingZ = 30;
    const plotWidth = Math.max(68, columns * spacingX + 26);
    const plotDepth = Math.max(64, rows * spacingZ + 26);

    const blockElements = project.blocks.map((block, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      const x = column * spacingX - ((columns - 1) * spacingX) / 2;
      const z = row * spacingZ - ((rows - 1) * spacingZ) / 2;
      const floorCount = Math.max(1, block.floors.length);
      const geometryType = String(block.geometryType || 'DIKDORTGEN');
      const isSquare = geometryType.includes('KARE');
      const isLShape = geometryType.includes('L');
      const blockWidth = isSquare ? 16 : isLShape ? 22 : 20;
      const blockDepth = isSquare ? 16 : isLShape ? 18 : 13;

      return {
        id: `block-${block.id}`,
        type: 'BLOCK',
        sourceId: block.id,
        name: block.name ?? `${block.code} Blok`,
        code: block.code,
        geometryType: block.geometryType,
        facadeViewCount: block.facadeViewCount,
        floorCount,
        position: [x, 0, z],
        rotationY: 0,
        size: {
          width: blockWidth,
          depth: blockDepth,
          height: floorCount * 3.05 + 1.2,
        },
        stylePreset: 'MODERN_LIGHT',
        facadeStyle: {
          preset: 'MODERN_LIGHT',
          primaryColor: '#2563eb',
          secondaryColor: '#60a5fa',
          accentColor: '#ffffff',
          glassColor: '#dbeafe',
          roofColor: '#f8fafc',
          balconyStyle: 'GLASS',
          verticalFins: false,
        },
        floors: block.floors.map((floor) => ({
          id: floor.id,
          level: floor.level,
          label: floor.label,
          floorType: floor.floorType,
        })),
      };
    });

    const amenityRadius = Math.max(plotWidth, plotDepth) / 2 - 8;
    const amenityElements = project.spaces.map((space, index) => {
      const angle =
        project.spaces.length === 1
          ? 0
          : (Math.PI * 2 * index) / project.spaces.length;
      const areaBase = Math.sqrt(Math.max(36, Number(space.grossArea || 72)));
      const amenityWidth = Math.min(18, Math.max(8, areaBase * 1.35));
      const amenityDepth = Math.min(14, Math.max(6, areaBase * 0.9));

      return {
        id: `space-${space.id}`,
        type: 'AMENITY',
        sourceId: space.id,
        name: space.name,
        spaceType: space.spaceType,
        grossArea: space.grossArea,
        blockId: space.blockId,
        floorId: space.floorId,
        position: [
          Math.cos(angle) * amenityRadius,
          0.05,
          Math.sin(angle) * amenityRadius,
        ],
        rotationY: 0,
        size: {
          width: amenityWidth,
          depth: amenityDepth,
          height: 0.65,
        },
      };
    });

    return {
      schemaVersion: 3,
      plot: {
        width: plotWidth,
        depth: plotDepth,
        northRotation: 0,
      },
      camera: {
        mode: 'ORTHOGRAPHIC',
        position: [46, 38, 46],
        target: [0, 0, 0],
        zoom: 1,
      },
      settings: {
        showGrid: true,
        showLabels: true,
        quality: 'AUTO',
      },
      landscape: {
        preset: 'URBAN_MODERN',
        density: 3,
        showTrees: true,
        showPaths: true,
        showLighting: true,
        showBenches: true,
        showShrubs: true,
      },
      elements: [...blockElements, ...amenityElements],
    } as Prisma.InputJsonObject;
  }

  private sceneResponse(
    project: Awaited<ReturnType<ProjectSceneService['getAuthorizedProject']>>,
    scene: Awaited<ReturnType<PrismaService['projectScene']['findUnique']>>,
  ) {
    return {
      initialized: Boolean(scene),
      project: {
        id: project.id,
        name: project.name,
        code: project.code,
        city: project.city,
        district: project.district,
        neighborhood: project.neighborhood,
        geometryType: project.geometryType,
        setupStatus: project.setupStatus,
        blockCount: project.blocks.length,
        visibleSpaceCount: project.spaces.length,
      },
      scene,
    };
  }

  private requiredPositiveInteger(value: unknown, message: string) {
    const parsed = Number(value);

    if (!Number.isInteger(parsed) || parsed < 1) {
      throw new BadRequestException(message);
    }

    return parsed;
  }

  private requiredJsonObject(
    value: unknown,
    message: string,
  ): Prisma.InputJsonObject {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new BadRequestException(message);
    }

    return value as Prisma.InputJsonObject;
  }

  private optionalText(value: unknown) {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    if (typeof value !== 'string') {
      throw new BadRequestException('3D sahne önizleme bağlantısı geçersiz.');
    }

    const normalized = value.trim();
    return normalized || null;
  }
}
