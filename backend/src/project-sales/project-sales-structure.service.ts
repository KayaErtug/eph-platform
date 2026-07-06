import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  ProjectFloorType,
  ProjectGeometryType,
  ProjectSetupStatus,
  ProjectWizardStep,
  Role,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type ProjectStructureBody = {
  blocks?: unknown;
};

type NormalizedFloor = {
  level: number;
  label: string;
  floorType: ProjectFloorType;
  sortOrder: number;
};

type NormalizedBlock = {
  code: string;
  normalizedCode: string;
  name: string | null;
  geometryType: ProjectGeometryType;
  facadeViewCount: number;
  sortOrder: number;
  floors: NormalizedFloor[];
};

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

const STANDARD_FACADE_COUNTS: Partial<Record<ProjectGeometryType, number>> = {
  [ProjectGeometryType.TEK_CEPHELI_STANDART]: 1,
  [ProjectGeometryType.CIFT_CEPHELI_STANDART]: 2,
  [ProjectGeometryType.UC_CEPHELI_STANDART]: 3,
  [ProjectGeometryType.DORT_CEPHELI_STANDART]: 4,
};

@Injectable()
export class ProjectSalesStructureService {
  constructor(private readonly prisma: PrismaService) {}

  async previewStructure(
    projectId: string,
    userId: string,
    userRole: Role,
    body: ProjectStructureBody,
  ) {
    const project = await this.getAuthorizedProject(
      projectId,
      userId,
      userRole,
    );
    const blocks = this.normalizeBlocks(body.blocks, project.geometryType);

    return {
      valid: true,
      summary: {
        blockCount: blocks.length,
        floorCount: blocks.reduce(
          (total, block) => total + block.floors.length,
          0,
        ),
        complexGeometryDetected: blocks.some((block) =>
          COMPLEX_GEOMETRIES.has(block.geometryType),
        ),
      },
      blocks,
    };
  }

  async applyStructure(
    projectId: string,
    userId: string,
    userRole: Role,
    body: ProjectStructureBody,
  ) {
    const project = await this.getAuthorizedProject(
      projectId,
      userId,
      userRole,
    );
    const blocks = this.normalizeBlocks(body.blocks, project.geometryType);

    const [unitCount, spaceCount] = await Promise.all([
      this.prisma.unit.count({
        where: {
          projectId,
        },
      }),
      this.prisma.projectSpace.count({
        where: {
          projectId,
        },
      }),
    ]);

    if (unitCount > 0 || spaceCount > 0) {
      throw new BadRequestException(
        'Projede bağımsız bölüm veya proje alanı bulunduğu için blok ve kat yapısı yeniden oluşturulamaz.',
      );
    }

    const complexGeometryDetected = blocks.some((block) =>
      COMPLEX_GEOMETRIES.has(block.geometryType),
    );

    await this.prisma.$transaction(async (transaction) => {
      await transaction.projectBlock.deleteMany({
        where: {
          projectId,
        },
      });

      for (const block of blocks) {
        await transaction.projectBlock.create({
          data: {
            projectId,
            code: block.code,
            normalizedCode: block.normalizedCode,
            name: block.name,
            geometryType: block.geometryType,
            facadeViewCount: block.facadeViewCount,
            sortOrder: block.sortOrder,
            floors: {
              create: block.floors.map((floor) => ({
                level: floor.level,
                label: floor.label,
                floorType: floor.floorType,
                sortOrder: floor.sortOrder,
              })),
            },
          },
        });
      }

      await transaction.project.update({
        where: {
          id: projectId,
        },
        data: {
          wizardStep: ProjectWizardStep.KAT_DAGILIMI,
          setupStatus: ProjectSetupStatus.YAPI_OLUSTURULUYOR,
          needsSoftwareTeamReview:
            project.needsSoftwareTeamReview || complexGeometryDetected,
        },
      });
    });

    return this.prisma.project.findUnique({
      where: {
        id: projectId,
      },
      include: {
        blocks: {
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
          include: {
            floors: {
              orderBy: [{ sortOrder: 'asc' }, { level: 'asc' }],
            },
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
            blocks: true,
            units: true,
            spaces: true,
          },
        },
      },
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
      select: {
        id: true,
        ownerId: true,
        geometryType: true,
        needsSoftwareTeamReview: true,
      },
    });

    if (!project) {
      throw new NotFoundException('Proje bulunamadı.');
    }

    if (project.ownerId !== userId && userRole !== Role.SUPER_ADMIN) {
      throw new ForbiddenException('Bu projeye erişim yetkiniz yok.');
    }

    return project;
  }

  private normalizeBlocks(
    value: unknown,
    defaultGeometryType: ProjectGeometryType,
  ): NormalizedBlock[] {
    if (!Array.isArray(value) || value.length === 0) {
      throw new BadRequestException('En az bir blok tanımlanmalıdır.');
    }

    if (value.length > 50) {
      throw new BadRequestException('Bir projede en fazla 50 blok tanımlanabilir.');
    }

    const normalizedCodes = new Set<string>();

    return value.map((rawBlock, blockIndex) => {
      const block = this.objectValue(
        rawBlock,
        `${blockIndex + 1}. blok bilgisi geçersiz.`,
      );
      const normalizedCode = this.normalizeCode(
        block.code,
        `${blockIndex + 1}. blok kodu zorunludur.`,
      );

      if (normalizedCodes.has(normalizedCode)) {
        throw new BadRequestException(
          `${normalizedCode} blok kodu birden fazla kullanılamaz.`,
        );
      }

      normalizedCodes.add(normalizedCode);

      const geometryType =
        this.optionalEnum(
          ProjectGeometryType,
          block.geometryType,
          `${normalizedCode} için geçersiz geometri türü.`,
        ) ?? defaultGeometryType;
      const standardFacadeCount = STANDARD_FACADE_COUNTS[geometryType];
      const facadeViewCount =
        standardFacadeCount ??
        this.integerValue(
          block.facadeViewCount,
          1,
          8,
          `${normalizedCode} cephe görünüm sayısı`,
          1,
        );

      if (
        standardFacadeCount !== undefined &&
        block.facadeViewCount !== null &&
        block.facadeViewCount !== undefined &&
        block.facadeViewCount !== '' &&
        Number(block.facadeViewCount) !== standardFacadeCount
      ) {
        throw new BadRequestException(
          `${normalizedCode} için seçilen geometri ${standardFacadeCount} cephe gerektirir.`,
        );
      }

      const floors = this.normalizeFloors(block.floors, normalizedCode);

      return {
        code: normalizedCode,
        normalizedCode,
        name: this.optionalText(block.name),
        geometryType,
        facadeViewCount,
        sortOrder: this.integerValue(
          block.sortOrder,
          0,
          9999,
          `${normalizedCode} blok sıra değeri`,
          blockIndex,
        ),
        floors,
      };
    });
  }

  private normalizeFloors(
    value: unknown,
    blockCode: string,
  ): NormalizedFloor[] {
    if (!Array.isArray(value) || value.length === 0) {
      throw new BadRequestException(
        `${blockCode} için en az bir kat tanımlanmalıdır.`,
      );
    }

    if (value.length > 300) {
      throw new BadRequestException(
        `${blockCode} için en fazla 300 kat tanımlanabilir.`,
      );
    }

    const levels = new Set<number>();

    return value.map((rawFloor, floorIndex) => {
      const floor = this.objectValue(
        rawFloor,
        `${blockCode} içindeki ${floorIndex + 1}. kat bilgisi geçersiz.`,
      );
      const level = this.integerValue(
        floor.level,
        -20,
        200,
        `${blockCode} kat seviyesi`,
      );

      if (levels.has(level)) {
        throw new BadRequestException(
          `${blockCode} içinde ${level} kat seviyesi birden fazla kullanılamaz.`,
        );
      }

      levels.add(level);

      const floorType =
        this.optionalEnum(
          ProjectFloorType,
          floor.floorType,
          `${blockCode} ${level} seviyesi için geçersiz kat türü.`,
        ) ?? this.inferFloorType(level);

      return {
        level,
        label: this.optionalText(floor.label) ?? this.defaultFloorLabel(level),
        floorType,
        sortOrder: this.integerValue(
          floor.sortOrder,
          -1000,
          9999,
          `${blockCode} ${level} kat sıra değeri`,
          level,
        ),
      };
    });
  }

  private inferFloorType(level: number) {
    if (level < 0) {
      return ProjectFloorType.BODRUM;
    }

    if (level === 0) {
      return ProjectFloorType.ZEMIN;
    }

    return ProjectFloorType.NORMAL;
  }

  private defaultFloorLabel(level: number) {
    if (level < 0) {
      return `${Math.abs(level)}. Bodrum Kat`;
    }

    if (level === 0) {
      return 'Zemin Kat';
    }

    return `${level}. Kat`;
  }

  private normalizeCode(value: unknown, message: string) {
    const text = this.requiredText(value, message)
      .toLocaleUpperCase('tr-TR')
      .replace(/Ç/g, 'C')
      .replace(/Ğ/g, 'G')
      .replace(/İ/g, 'I')
      .replace(/Ö/g, 'O')
      .replace(/Ş/g, 'S')
      .replace(/Ü/g, 'U')
      .replace(/[^A-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 20);

    if (!text) {
      throw new BadRequestException(message);
    }

    return text;
  }

  private integerValue(
    value: unknown,
    minimum: number,
    maximum: number,
    fieldName: string,
    defaultValue?: number,
  ) {
    if (
      (value === null || value === undefined || value === '') &&
      defaultValue !== undefined
    ) {
      return defaultValue;
    }

    const parsed = Number(value);

    if (
      !Number.isInteger(parsed) ||
      parsed < minimum ||
      parsed > maximum
    ) {
      throw new BadRequestException(
        `${fieldName} ${minimum} ile ${maximum} arasında tam sayı olmalıdır.`,
      );
    }

    return parsed;
  }

  private requiredText(value: unknown, message: string) {
    const text = value === null || value === undefined ? '' : String(value).trim();

    if (!text) {
      throw new BadRequestException(message);
    }

    return text;
  }

  private optionalText(value: unknown) {
    if (value === null || value === undefined) {
      return null;
    }

    const text = String(value).trim();

    return text || null;
  }

  private objectValue(value: unknown, message: string) {
    if (
      value === null ||
      typeof value !== 'object' ||
      Array.isArray(value)
    ) {
      throw new BadRequestException(message);
    }

    return value as Record<string, unknown>;
  }

  private optionalEnum<T extends Record<string, string>>(
    enumObject: T,
    value: unknown,
    message: string,
  ): T[keyof T] | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const text = String(value).trim();
    const matched = Object.values(enumObject).find((item) => item === text);

    if (!matched) {
      throw new BadRequestException(message);
    }

    return matched as T[keyof T];
  }
}
