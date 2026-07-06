import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ProjectCommercialPurpose,
  ProjectLegalStatus,
  ProjectSetupStatus,
  ProjectSpaceType,
  ProjectWizardStep,
  Role,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type ProjectSpacesBody = {
  projectSpaces?: unknown;
};

type StructureFloor = {
  id: string;
  level: number;
  label: string;
};

type StructureBlock = {
  id: string;
  code: string;
  normalizedCode: string;
  floors: StructureFloor[];
};

type PreparedSpace = {
  projectId: string;
  blockId: string | null;
  floorId: string | null;
  code: string;
  name: string;
  spaceType: ProjectSpaceType;
  customTypeName: string | null;
  legalStatus: ProjectLegalStatus;
  commercialPurpose: ProjectCommercialPurpose;
  grossArea: number | null;
  description: string | null;
  isCustomerVisible: boolean;
  sortOrder: number;
  isActive: boolean;
};

const SALES_PURPOSES = new Set<ProjectCommercialPurpose>([
  ProjectCommercialPurpose.SATISA_SUNULACAK,
  ProjectCommercialPurpose.KIRAYA_VERILECEK,
  ProjectCommercialPurpose.SATIS_VEYA_KIRALAMA_STOGU,
]);

const TECHNICAL_SPACE_TYPES = new Set<ProjectSpaceType>([
  ProjectSpaceType.ELEKTRIK_ODASI,
  ProjectSpaceType.MEKANIK_ODA,
  ProjectSpaceType.JENERATOR_ODASI,
  ProjectSpaceType.SU_DEPOSU,
  ProjectSpaceType.SIGINAK,
  ProjectSpaceType.GUVENLIK_ODASI,
  ProjectSpaceType.PERSONEL_ODASI,
  ProjectSpaceType.COP_ODASI,
  ProjectSpaceType.TEKNIK_DEPO,
  ProjectSpaceType.SERVIS_ALANI,
]);

const OPEN_AMENITY_TYPES = new Set<ProjectSpaceType>([
  ProjectSpaceType.ACIK_HAVUZ,
  ProjectSpaceType.ORTAK_BAHCE,
  ProjectSpaceType.ACIK_OTOPARK,
  ProjectSpaceType.YURUYUS_PARKURU,
  ProjectSpaceType.BASKETBOL_SAHASI,
  ProjectSpaceType.TENIS_KORTU,
  ProjectSpaceType.COCUK_PARKI,
  ProjectSpaceType.PEYZAJ_ALANI,
  ProjectSpaceType.DINLENME_ALANI,
  ProjectSpaceType.SUS_HAVUZU,
  ProjectSpaceType.COCUK_OYUN_ALANI,
]);

@Injectable()
export class ProjectSalesSpacesService {
  constructor(private readonly prisma: PrismaService) {}

  async previewSpaces(
    projectId: string,
    userId: string,
    userRole: Role,
    body: ProjectSpacesBody,
  ) {
    await this.getAuthorizedProject(projectId, userId, userRole);
    const structure = await this.getStructure(projectId);
    const spaces = this.prepareSpaces(projectId, structure, body);

    return {
      valid: true,
      summary: this.createSummary(spaces),
      spaces,
    };
  }

  async applySpaces(
    projectId: string,
    userId: string,
    userRole: Role,
    body: ProjectSpacesBody,
  ) {
    await this.getAuthorizedProject(projectId, userId, userRole);
    const structure = await this.getStructure(projectId);
    const spaces = this.prepareSpaces(projectId, structure, body);

    const [unitCount, existingSpaceCount] = await Promise.all([
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

    if (unitCount === 0) {
      throw new BadRequestException(
        'Önce bağımsız bölüm envanteri oluşturulmalıdır.',
      );
    }

    if (existingSpaceCount > 0) {
      throw new BadRequestException(
        'Projede daha önce oluşturulmuş sosyal, ortak veya teknik alanlar var. Aynı alanlar yeniden oluşturulamaz.',
      );
    }

    await this.prisma.$transaction(async (transaction) => {
      if (spaces.length > 0) {
        await transaction.projectSpace.createMany({
          data: spaces,
        });
      }

      await transaction.project.update({
        where: {
          id: projectId,
        },
        data: {
          wizardStep: ProjectWizardStep.KONTROL,
          setupStatus: ProjectSetupStatus.KONTROLE_HAZIR,
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
          },
        },
        spaces: {
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        },
        _count: {
          select: {
            blocks: true,
            units: true,
            spaces: true,
            designReviewRequests: true,
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

  private async getStructure(projectId: string): Promise<StructureBlock[]> {
    const blocks = await this.prisma.projectBlock.findMany({
      where: {
        projectId,
        isActive: true,
      },
      select: {
        id: true,
        code: true,
        normalizedCode: true,
        floors: {
          where: {
            isActive: true,
          },
          select: {
            id: true,
            level: true,
            label: true,
          },
          orderBy: [{ sortOrder: 'asc' }, { level: 'asc' }],
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    if (blocks.length === 0) {
      throw new BadRequestException(
        'Önce projenin blok ve kat yapısı oluşturulmalıdır.',
      );
    }

    return blocks;
  }

  private prepareSpaces(
    projectId: string,
    structure: StructureBlock[],
    body: ProjectSpacesBody,
  ): PreparedSpace[] {
    const rawSpaces = this.optionalArrayValue(body.projectSpaces);
    const blockMap = new Map(
      structure.map((block) => [block.normalizedCode, block]),
    );
    const codeCounters = new Map<string, number>();
    const spaces: PreparedSpace[] = [];

    for (let spaceIndex = 0; spaceIndex < rawSpaces.length; spaceIndex += 1) {
      const rawSpace = this.objectValue(
        rawSpaces[spaceIndex],
        `${spaceIndex + 1}. proje alanı geçersiz.`,
      );
      const count = this.integerValue(
        rawSpace.count,
        1,
        200,
        `${spaceIndex + 1}. proje alanı adedi`,
        1,
      );
      const name = this.requiredText(
        rawSpace.name,
        `${spaceIndex + 1}. proje alanı adı zorunludur.`,
      );
      const spaceType = this.requiredEnum(
        ProjectSpaceType,
        rawSpace.spaceType,
        `${name} için geçersiz proje alanı türü.`,
      );
      const customTypeName = this.optionalText(rawSpace.customTypeName);

      if (spaceType === ProjectSpaceType.DIGER && !customTypeName) {
        throw new BadRequestException(
          `${name} için özel alan türü açıklaması zorunludur.`,
        );
      }

      const blockCode = this.optionalText(rawSpace.blockCode);
      const rawFloorLevel = rawSpace.floorLevel;
      let blockId: string | null = null;
      let floorId: string | null = null;

      if (
        rawFloorLevel !== null &&
        rawFloorLevel !== undefined &&
        rawFloorLevel !== ''
      ) {
        if (!blockCode) {
          throw new BadRequestException(
            `${name} için kat seçildiyse blok kodu da zorunludur.`,
          );
        }

        const block = this.resolveBlock(blockMap, blockCode, name);
        const floorLevel = this.integerValue(
          rawFloorLevel,
          -20,
          200,
          `${name} kat seviyesi`,
        );
        const floor = this.resolveFloor(block, floorLevel);
        blockId = block.id;
        floorId = floor.id;
      } else if (blockCode) {
        blockId = this.resolveBlock(blockMap, blockCode, name).id;
      }

      const legalStatus =
        this.optionalEnum(
          ProjectLegalStatus,
          rawSpace.legalStatus,
          `${name} için geçersiz hukuki sınıf.`,
        ) ?? this.defaultLegalStatus(spaceType);

      if (legalStatus === ProjectLegalStatus.TAPUDA_BAGIMSIZ_BOLUM) {
        throw new BadRequestException(
          `${name} tapuda bağımsız bölüm ise proje alanı olarak oluşturulamaz.`,
        );
      }

      const commercialPurpose =
        this.optionalEnum(
          ProjectCommercialPurpose,
          rawSpace.commercialPurpose,
          `${name} için geçersiz kullanım amacı.`,
        ) ?? this.defaultCommercialPurpose(legalStatus);

      if (SALES_PURPOSES.has(commercialPurpose)) {
        throw new BadRequestException(
          `${name} satış veya kiralama stoku olamaz. Satılabilir alanları bağımsız bölüm olarak oluşturun.`,
        );
      }

      const grossArea = this.optionalPositiveNumber(
        rawSpace.grossArea,
        `${name} brüt alanı`,
      );
      const description = this.optionalText(rawSpace.description);
      const isCustomerVisible = this.booleanValue(
        rawSpace.isCustomerVisible,
        true,
      );
      const prefix = this.spacePrefix(legalStatus);
      const typeCode =
        spaceType === ProjectSpaceType.DIGER
          ? this.normalizeCode(customTypeName ?? 'DIGER')
          : spaceType.replaceAll('_', '-');
      const counterKey = `${prefix}|${typeCode}`;

      for (let itemIndex = 0; itemIndex < count; itemIndex += 1) {
        const nextCounter = (codeCounters.get(counterKey) ?? 0) + 1;
        codeCounters.set(counterKey, nextCounter);

        spaces.push({
          projectId,
          blockId,
          floorId,
          code: `${prefix}-${typeCode}-${String(nextCounter).padStart(2, '0')}`,
          name: count > 1 ? `${name} ${nextCounter}` : name,
          spaceType,
          customTypeName,
          legalStatus,
          commercialPurpose,
          grossArea,
          description,
          isCustomerVisible,
          sortOrder: spaces.length,
          isActive: true,
        });
      }
    }

    if (spaces.length > 2000) {
      throw new BadRequestException(
        'Tek işlemde en fazla 2.000 proje alanı oluşturulabilir.',
      );
    }

    return spaces;
  }

  private createSummary(spaces: PreparedSpace[]) {
    return {
      projectSpaceCount: spaces.length,
      commonSpaceCount: spaces.filter(
        (space) =>
          space.legalStatus === ProjectLegalStatus.ORTAK_KULLANIM_ALANI,
      ).length,
      technicalSpaceCount: spaces.filter(
        (space) =>
          space.legalStatus === ProjectLegalStatus.TEKNIK_HIZMET_ALANI,
      ).length,
      openAmenityCount: spaces.filter(
        (space) =>
          space.legalStatus === ProjectLegalStatus.ACIK_ALAN_SOSYAL_DONATI,
      ).length,
      attachmentCount: spaces.filter(
        (space) =>
          space.legalStatus === ProjectLegalStatus.BAGIMSIZ_BOLUM_EKLENTISI,
      ).length,
      customerVisibleCount: spaces.filter(
        (space) => space.isCustomerVisible,
      ).length,
    };
  }

  private resolveBlock(
    blockMap: Map<string, StructureBlock>,
    value: unknown,
    fieldName: string,
  ) {
    const normalizedCode = this.normalizeCode(
      this.requiredText(value, `${fieldName} için blok kodu zorunludur.`),
    );
    const block = blockMap.get(normalizedCode);

    if (!block) {
      throw new BadRequestException(
        `${fieldName} için ${normalizedCode} blok kodu bulunamadı.`,
      );
    }

    return block;
  }

  private resolveFloor(block: StructureBlock, level: number) {
    const floor = block.floors.find((item) => item.level === level);

    if (!floor) {
      throw new BadRequestException(
        `${block.code} blokta ${level} kat seviyesi bulunamadı.`,
      );
    }

    return floor;
  }

  private defaultLegalStatus(spaceType: ProjectSpaceType) {
    if (TECHNICAL_SPACE_TYPES.has(spaceType)) {
      return ProjectLegalStatus.TEKNIK_HIZMET_ALANI;
    }

    if (OPEN_AMENITY_TYPES.has(spaceType)) {
      return ProjectLegalStatus.ACIK_ALAN_SOSYAL_DONATI;
    }

    return ProjectLegalStatus.ORTAK_KULLANIM_ALANI;
  }

  private defaultCommercialPurpose(legalStatus: ProjectLegalStatus) {
    if (legalStatus === ProjectLegalStatus.TEKNIK_HIZMET_ALANI) {
      return ProjectCommercialPurpose.TEKNIK_KULLANIM;
    }

    if (legalStatus === ProjectLegalStatus.BAGIMSIZ_BOLUM_EKLENTISI) {
      return ProjectCommercialPurpose.SATIS_DISI;
    }

    return ProjectCommercialPurpose.ORTAK_KULLANIMA_AYRILMIS;
  }

  private spacePrefix(legalStatus: ProjectLegalStatus) {
    switch (legalStatus) {
      case ProjectLegalStatus.BAGIMSIZ_BOLUM_EKLENTISI:
        return 'EKL';
      case ProjectLegalStatus.TEKNIK_HIZMET_ALANI:
        return 'TEK';
      case ProjectLegalStatus.ACIK_ALAN_SOSYAL_DONATI:
        return 'SOS';
      case ProjectLegalStatus.ORTAK_KULLANIM_ALANI:
        return 'ORT';
      default:
        return 'ALN';
    }
  }

  private normalizeCode(value: unknown) {
    return String(value)
      .trim()
      .toLocaleUpperCase('tr-TR')
      .replace(/Ç/g, 'C')
      .replace(/Ğ/g, 'G')
      .replace(/İ/g, 'I')
      .replace(/Ö/g, 'O')
      .replace(/Ş/g, 'S')
      .replace(/Ü/g, 'U')
      .replace(/[^A-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40);
  }

  private optionalArrayValue(value: unknown) {
    if (value === null || value === undefined) {
      return [];
    }

    if (!Array.isArray(value)) {
      throw new BadRequestException('Proje alanları liste olmalıdır.');
    }

    return value;
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

  private requiredText(value: unknown, message: string) {
    const text =
      value === null || value === undefined ? '' : String(value).trim();

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

  private optionalPositiveNumber(value: unknown, fieldName: string) {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const parsed = Number(value);

    if (!Number.isFinite(parsed) || parsed <= 0) {
      throw new BadRequestException(
        `${fieldName} sıfırdan büyük sayı olmalıdır.`,
      );
    }

    return parsed;
  }

  private booleanValue(value: unknown, defaultValue: boolean) {
    if (value === null || value === undefined || value === '') {
      return defaultValue;
    }

    if (typeof value === 'boolean') {
      return value;
    }

    const normalized = String(value).trim().toLocaleUpperCase('tr-TR');

    if (['EVET', 'TRUE', '1'].includes(normalized)) {
      return true;
    }

    if (['HAYIR', 'FALSE', '0'].includes(normalized)) {
      return false;
    }

    throw new BadRequestException('Geçersiz evet/hayır değeri.');
  }

  private requiredEnum<T extends Record<string, string>>(
    enumObject: T,
    value: unknown,
    message: string,
  ): T[keyof T] {
    const matched = this.optionalEnum(enumObject, value, message);

    if (!matched) {
      throw new BadRequestException(message);
    }

    return matched;
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
