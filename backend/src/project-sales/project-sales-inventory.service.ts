import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  PortfolioApprovalStatus,
  ProjectCommercialPurpose,
  ProjectLegalStatus,
  ProjectSetupStatus,
  ProjectSpaceType,
  ProjectWizardStep,
  Role,
  UnitStatus,
  UnitType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type ProjectNumberingMode = 'FLOOR_CODED' | 'CONTINUOUS';

type InventoryBody = {
  numberingMode?: unknown;
  floorPlans?: unknown;
  projectSpaces?: unknown;
};

type PreparedUnit = {
  projectId: string;
  blockId: string;
  floorId: string;
  inventoryCode: string;
  inventorySortOrder: number;
  type: UnitType;
  floor: number;
  floorLabel: string;
  number: string;
  roomCount: string | null;
  area: number | null;
  netArea: number | null;
  grossArea: number | null;
  facades: string[];
  price: number;
  priceCurrency: string;
  status: UnitStatus;
  description: string | null;
  conceptLabel: string | null;
  legalStatus: ProjectLegalStatus;
  commercialPurpose: ProjectCommercialPurpose;
  isSalesInventory: boolean;
  isOffMarket: boolean;
  isPoolVisible: boolean;
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

type PreparedInventory = {
  units: PreparedUnit[];
  spaces: PreparedSpace[];
  summary: {
    independentUnitCount: number;
    salesInventoryCount: number;
    nonSalesIndependentUnitCount: number;
    projectSpaceCount: number;
    commonSpaceCount: number;
    technicalSpaceCount: number;
    openAmenityCount: number;
  };
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
export class ProjectSalesInventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async previewInventory(
    projectId: string,
    userId: string,
    userRole: Role,
    body: InventoryBody,
  ) {
    const project = await this.getAuthorizedProject(
      projectId,
      userId,
      userRole,
    );
    const structure = await this.getStructure(projectId);
    const prepared = this.prepareInventory(
      projectId,
      project.declaredIndependentUnitCount,
      project.declaredSalesInventoryCount,
      structure,
      body,
    );

    return {
      valid: true,
      summary: prepared.summary,
      units: prepared.units.map((unit) => ({
        blockId: unit.blockId,
        floorId: unit.floorId,
        inventoryCode: unit.inventoryCode,
        type: unit.type,
        floor: unit.floor,
        floorLabel: unit.floorLabel,
        number: unit.number,
        roomCount: unit.roomCount,
        netArea: unit.netArea,
        grossArea: unit.grossArea,
        conceptLabel: unit.conceptLabel,
        legalStatus: unit.legalStatus,
        commercialPurpose: unit.commercialPurpose,
        isSalesInventory: unit.isSalesInventory,
      })),
      spaces: prepared.spaces,
    };
  }

  async applyInventory(
    projectId: string,
    userId: string,
    userRole: Role,
    body: InventoryBody,
  ) {
    const project = await this.getAuthorizedProject(
      projectId,
      userId,
      userRole,
    );
    const structure = await this.getStructure(projectId);
    const prepared = this.prepareInventory(
      projectId,
      project.declaredIndependentUnitCount,
      project.declaredSalesInventoryCount,
      structure,
      body,
    );

    const [existingUnitCount, existingSpaceCount] = await Promise.all([
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

    if (existingUnitCount > 0 || existingSpaceCount > 0) {
      throw new BadRequestException(
        'Projede daha önce oluşturulmuş bağımsız bölüm veya proje alanı var. Otomatik envanter yeniden uygulanamaz.',
      );
    }

    await this.prisma.$transaction(async (transaction) => {
      if (prepared.units.length > 0) {
        await transaction.unit.createMany({
          data: prepared.units,
        });
      }

      if (prepared.spaces.length > 0) {
        await transaction.projectSpace.createMany({
          data: prepared.spaces,
        });
      }

      await transaction.project.update({
        where: {
          id: projectId,
        },
        data: {
          declaredIndependentUnitCount:
            prepared.summary.independentUnitCount,
          declaredSalesInventoryCount:
            prepared.summary.salesInventoryCount,
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
              include: {
                units: {
                  orderBy: {
                    inventorySortOrder: 'asc',
                  },
                },
                spaces: {
                  orderBy: {
                    sortOrder: 'asc',
                  },
                },
              },
            },
          },
        },
        spaces: {
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
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

  async replaceInventory(
    projectId: string,
    userId: string,
    userRole: Role,
    body: InventoryBody,
  ) {
    const project = await this.getAuthorizedProject(
      projectId,
      userId,
      userRole,
    );
    const structure = await this.getStructure(projectId);
    const prepared = this.prepareInventory(
      projectId,
      project.declaredIndependentUnitCount,
      project.declaredSalesInventoryCount,
      structure,
      body,
    );

    const existingUnits = await this.prisma.unit.findMany({
      where: {
        projectId,
      },
      select: {
        id: true,
        approvalStatus: true,
        isPoolVisible: true,
        _count: {
          select: {
            images: true,
            authorityDocuments: true,
            authorityLetters: true,
            customerProperties: true,
            batchItems: true,
          },
        },
      },
      orderBy: [
        { inventorySortOrder: 'asc' },
        { createdAt: 'asc' },
      ],
    });

    if (existingUnits.length === 0) {
      throw new BadRequestException(
        'Güncellenecek bağımsız bölüm bulunamadı. İlk kayıt için oluşturma işlemini kullanın.',
      );
    }

    if (existingUnits.length !== prepared.units.length) {
      throw new BadRequestException(
        `Mevcut bağımsız bölüm adedi ${existingUnits.length}, güncel dağılım adedi ${prepared.units.length}. Güvenli güncelleme için toplam adet değişmemelidir.`,
      );
    }

    const protectedUnit = existingUnits.find(
      (unit) =>
        unit.approvalStatus !== PortfolioApprovalStatus.TASLAK ||
        unit.isPoolVisible ||
        unit._count.images > 0 ||
        unit._count.authorityDocuments > 0 ||
        unit._count.authorityLetters > 0 ||
        unit._count.customerProperties > 0 ||
        unit._count.batchItems > 0,
    );

    if (protectedUnit) {
      throw new BadRequestException(
        'Onaya gönderilmiş, havuzda yayımlanmış, belgeli, görselli veya müşteri bağlantılı bağımsız bölümler toplu olarak güncellenemez.',
      );
    }

    await this.prisma.$transaction(async (transaction) => {
      await transaction.unit.updateMany({
        where: { projectId },
        data: {
          inventoryCode: null,
          number: null,
        },
      });

      for (let index = 0; index < prepared.units.length; index += 1) {
        const currentUnit = existingUnits[index];
        const nextUnit = prepared.units[index];

        await transaction.unit.update({
          where: { id: currentUnit.id },
          data: {
            blockId: nextUnit.blockId,
            floorId: nextUnit.floorId,
            inventoryCode: nextUnit.inventoryCode,
            inventorySortOrder: nextUnit.inventorySortOrder,
            type: nextUnit.type,
            floor: nextUnit.floor,
            floorLabel: nextUnit.floorLabel,
            number: nextUnit.number,
            roomCount: nextUnit.roomCount,
            area: nextUnit.area,
            netArea: nextUnit.netArea,
            grossArea: nextUnit.grossArea,
            facades: nextUnit.facades,
            description: nextUnit.description,
            conceptLabel: nextUnit.conceptLabel,
            legalStatus: nextUnit.legalStatus,
            commercialPurpose: nextUnit.commercialPurpose,
            isSalesInventory: nextUnit.isSalesInventory,
            ...(nextUnit.isSalesInventory
              ? {}
              : {
                  price: 0,
                  priceCurrency: 'TRY',
                  status: UnitStatus.PASIF,
                  isOffMarket: true,
                  isPoolVisible: false,
                }),
          },
        });
      }

      await transaction.project.update({
        where: {
          id: projectId,
        },
        data: {
          declaredIndependentUnitCount:
            prepared.summary.independentUnitCount,
          declaredSalesInventoryCount:
            prepared.summary.salesInventoryCount,
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
              include: {
                units: {
                  orderBy: {
                    inventorySortOrder: 'asc',
                  },
                },
                spaces: {
                  orderBy: {
                    sortOrder: 'asc',
                  },
                },
              },
            },
          },
        },
        spaces: {
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
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
        declaredIndependentUnitCount: true,
        declaredSalesInventoryCount: true,
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

  private prepareInventory(
    projectId: string,
    declaredIndependentUnitCount: number | null,
    declaredSalesInventoryCount: number | null,
    structure: StructureBlock[],
    body: InventoryBody,
  ): PreparedInventory {
    const blockMap = new Map(
      structure.map((block) => [block.normalizedCode, block]),
    );
    const floorPlans = this.arrayValue(body.floorPlans, 'Kat dağılımı');
    const projectSpaces = this.optionalArrayValue(body.projectSpaces);
    const numberingMode = this.projectNumberingMode(body.numberingMode);

    if (floorPlans.length === 0) {
      throw new BadRequestException(
        'En az bir kat için bağımsız bölüm dağılımı girilmelidir.',
      );
    }

    const usedFloorKeys = new Set<string>();
    const continuousSequences = new Map<string, number>();
    const units: PreparedUnit[] = [];
    const spaces: PreparedSpace[] = [];
    let unitSortOrder = 0;

    for (let floorPlanIndex = 0; floorPlanIndex < floorPlans.length; floorPlanIndex += 1) {
      const rawFloorPlan = this.objectValue(
        floorPlans[floorPlanIndex],
        `${floorPlanIndex + 1}. kat dağılımı geçersiz.`,
      );
      const block = this.resolveBlock(
        blockMap,
        rawFloorPlan.blockCode,
        `${floorPlanIndex + 1}. kat dağılımı`,
      );
      const floorLevel = this.integerValue(
        rawFloorPlan.floorLevel,
        -20,
        200,
        `${block.code} kat seviyesi`,
      );
      const floor = this.resolveFloor(block, floorLevel);
      const floorKey = `${block.id}|${floor.id}`;

      if (usedFloorKeys.has(floorKey)) {
        throw new BadRequestException(
          `${block.code} ${floor.label} için birden fazla kat dağılımı girilemez.`,
        );
      }

      usedFloorKeys.add(floorKey);

      const unitGroups = this.arrayValue(
        rawFloorPlan.unitGroups,
        `${block.code} ${floor.label} bağımsız bölüm grupları`,
      );
      const numberPrefix =
        this.optionalText(rawFloorPlan.numberPrefix) ??
        block.normalizedCode;
      let floorSequence = this.integerValue(
        rawFloorPlan.startingSequence,
        1,
        9999,
        `${block.code} ${floor.label} başlangıç sıra numarası`,
        1,
      );
      let continuousSequence = continuousSequences.get(block.id) ?? 1;

      for (let groupIndex = 0; groupIndex < unitGroups.length; groupIndex += 1) {
        const rawGroup = this.objectValue(
          unitGroups[groupIndex],
          `${block.code} ${floor.label} içindeki ${groupIndex + 1}. bağımsız bölüm grubu geçersiz.`,
        );
        const count = this.integerValue(
          rawGroup.count,
          1,
          500,
          `${block.code} ${floor.label} bağımsız bölüm adedi`,
        );
        const type = this.requiredEnum(
          UnitType,
          rawGroup.type,
          `${block.code} ${floor.label} için geçersiz bağımsız bölüm türü.`,
        );
        const legalStatus =
          this.optionalEnum(
            ProjectLegalStatus,
            rawGroup.legalStatus,
            `${block.code} ${floor.label} için geçersiz hukuki durum.`,
          ) ?? ProjectLegalStatus.TAPUDA_BAGIMSIZ_BOLUM;

        if (legalStatus !== ProjectLegalStatus.TAPUDA_BAGIMSIZ_BOLUM) {
          throw new BadRequestException(
            `${block.code} ${floor.label} içindeki bağımsız bölümlerin hukuki durumu TAPUDA_BAGIMSIZ_BOLUM olmalıdır. Ortak ve teknik alanları proje alanı olarak girin.`,
          );
        }

        const commercialPurpose =
          this.optionalEnum(
            ProjectCommercialPurpose,
            rawGroup.commercialPurpose,
            `${block.code} ${floor.label} için geçersiz ticari amaç.`,
          ) ?? ProjectCommercialPurpose.SATISA_SUNULACAK;
        const isSalesInventory = SALES_PURPOSES.has(commercialPurpose);
        const roomCount = this.optionalText(rawGroup.roomCount);
        const conceptLabel = this.optionalText(rawGroup.conceptLabel);
        const netArea = this.optionalPositiveNumber(
          rawGroup.netArea,
          `${block.code} ${floor.label} net alanı`,
        );
        const grossArea = this.optionalPositiveNumber(
          rawGroup.grossArea,
          `${block.code} ${floor.label} brüt alanı`,
        );

        if (
          netArea !== null &&
          grossArea !== null &&
          grossArea < netArea
        ) {
          throw new BadRequestException(
            `${block.code} ${floor.label} için brüt alan net alandan küçük olamaz.`,
          );
        }

        const facades = this.stringList(rawGroup.facades);
        const description = this.optionalText(rawGroup.description);

        for (let itemIndex = 0; itemIndex < count; itemIndex += 1) {
          const sequence =
            numberingMode === 'CONTINUOUS' && floor.level >= 0
              ? continuousSequence
              : floorSequence;
          const number = this.createUnitNumber(
            numberPrefix,
            floor.level,
            sequence,
            numberingMode,
          );

          units.push({
            projectId,
            blockId: block.id,
            floorId: floor.id,
            inventoryCode: number,
            inventorySortOrder: unitSortOrder,
            type,
            floor: floor.level,
            floorLabel: floor.label,
            number,
            roomCount,
            area: grossArea ?? netArea,
            netArea,
            grossArea,
            facades,
            price: 0,
            priceCurrency: 'TRY',
            status: UnitStatus.PASIF,
            description,
            conceptLabel,
            legalStatus,
            commercialPurpose,
            isSalesInventory,
            isOffMarket: true,
            isPoolVisible: false,
          });

          if (numberingMode === 'CONTINUOUS' && floor.level >= 0) {
            continuousSequence += 1;
          } else {
            floorSequence += 1;
          }
          unitSortOrder += 1;
        }
      }

      if (numberingMode === 'CONTINUOUS' && floor.level >= 0) {
        continuousSequences.set(block.id, continuousSequence);
      }
    }

    const spaceCodeCounters = new Map<string, number>();

    for (let spaceIndex = 0; spaceIndex < projectSpaces.length; spaceIndex += 1) {
      const rawSpace = this.objectValue(
        projectSpaces[spaceIndex],
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

      if (rawFloorLevel !== null && rawFloorLevel !== undefined && rawFloorLevel !== '') {
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
        const block = this.resolveBlock(blockMap, blockCode, name);
        blockId = block.id;
      }

      const defaultLegalStatus = this.defaultSpaceLegalStatus(spaceType);
      const legalStatus =
        this.optionalEnum(
          ProjectLegalStatus,
          rawSpace.legalStatus,
          `${name} için geçersiz hukuki durum.`,
        ) ?? defaultLegalStatus;

      if (legalStatus === ProjectLegalStatus.TAPUDA_BAGIMSIZ_BOLUM) {
        throw new BadRequestException(
          `${name} tapuda bağımsız bölüm ise proje alanı değil, bağımsız bölüm olarak oluşturulmalıdır.`,
        );
      }

      const defaultCommercialPurpose =
        legalStatus === ProjectLegalStatus.TEKNIK_HIZMET_ALANI
          ? ProjectCommercialPurpose.TEKNIK_KULLANIM
          : ProjectCommercialPurpose.ORTAK_KULLANIMA_AYRILMIS;
      const commercialPurpose =
        this.optionalEnum(
          ProjectCommercialPurpose,
          rawSpace.commercialPurpose,
          `${name} için geçersiz ticari amaç.`,
        ) ?? defaultCommercialPurpose;

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
        const nextCounter = (spaceCodeCounters.get(counterKey) ?? 0) + 1;
        spaceCodeCounters.set(counterKey, nextCounter);

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

    if (units.length > 10000) {
      throw new BadRequestException(
        'Tek işlemde en fazla 10.000 bağımsız bölüm oluşturulabilir.',
      );
    }

    const salesInventoryCount = units.filter(
      (unit) => unit.isSalesInventory,
    ).length;

    if (
      declaredIndependentUnitCount !== null &&
      declaredIndependentUnitCount !== units.length
    ) {
      throw new BadRequestException(
        `Beyan edilen bağımsız bölüm sayısı ${declaredIndependentUnitCount}, oluşturulan sayı ${units.length}. Sayılar eşit olmalıdır.`,
      );
    }

    if (
      declaredSalesInventoryCount !== null &&
      declaredSalesInventoryCount !== salesInventoryCount
    ) {
      throw new BadRequestException(
        `Beyan edilen satış/kiralama stoku ${declaredSalesInventoryCount}, oluşturulan stok ${salesInventoryCount}. Sayılar eşit olmalıdır.`,
      );
    }

    return {
      units,
      spaces,
      summary: {
        independentUnitCount: units.length,
        salesInventoryCount,
        nonSalesIndependentUnitCount:
          units.length - salesInventoryCount,
        projectSpaceCount: spaces.length,
        commonSpaceCount: spaces.filter(
          (space) =>
            space.legalStatus ===
            ProjectLegalStatus.ORTAK_KULLANIM_ALANI,
        ).length,
        technicalSpaceCount: spaces.filter(
          (space) =>
            space.legalStatus ===
            ProjectLegalStatus.TEKNIK_HIZMET_ALANI,
        ).length,
        openAmenityCount: spaces.filter(
          (space) =>
            space.legalStatus ===
            ProjectLegalStatus.ACIK_ALAN_SOSYAL_DONATI,
        ).length,
      },
    };
  }

  private resolveBlock(
    blockMap: Map<string, StructureBlock>,
    value: unknown,
    fieldName: string,
  ) {
    const normalizedCode = this.normalizeCode(
      this.requiredText(
        value,
        `${fieldName} için blok kodu zorunludur.`,
      ),
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

  private createUnitNumber(
    prefix: string,
    floorLevel: number,
    sequence: number,
    numberingMode: ProjectNumberingMode,
  ) {
    const normalizedPrefix = this.normalizeCode(prefix);

    if (floorLevel < 0) {
      return `${normalizedPrefix}-B${Math.abs(floorLevel)}-${sequence}`;
    }

    if (floorLevel === 0) {
      return `${normalizedPrefix}-Z-${sequence}`;
    }

    if (numberingMode === 'CONTINUOUS') {
      return `${normalizedPrefix}-${sequence}`;
    }

    return `${normalizedPrefix}-${floorLevel}${String(sequence).padStart(2, '0')}`;
  }

  private projectNumberingMode(value: unknown): ProjectNumberingMode {
    if (value === null || value === undefined || value === '') {
      return 'FLOOR_CODED';
    }

    if (value === 'FLOOR_CODED' || value === 'CONTINUOUS') {
      return value;
    }

    throw new BadRequestException('Geçersiz bağımsız bölüm numaralandırma yöntemi.');
  }

  private defaultSpaceLegalStatus(spaceType: ProjectSpaceType) {
    if (TECHNICAL_SPACE_TYPES.has(spaceType)) {
      return ProjectLegalStatus.TEKNIK_HIZMET_ALANI;
    }

    if (OPEN_AMENITY_TYPES.has(spaceType)) {
      return ProjectLegalStatus.ACIK_ALAN_SOSYAL_DONATI;
    }

    return ProjectLegalStatus.ORTAK_KULLANIM_ALANI;
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

  private stringList(value: unknown) {
    if (!Array.isArray(value)) {
      return [];
    }

    return Array.from(
      new Set(
        value
          .map((item) => String(item).trim())
          .filter(Boolean),
      ),
    );
  }

  private arrayValue(value: unknown, fieldName: string) {
    if (!Array.isArray(value)) {
      throw new BadRequestException(`${fieldName} liste olmalıdır.`);
    }

    return value;
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
    const text = value === null || value === undefined
      ? ''
      : String(value).trim();

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

  private optionalPositiveNumber(
    value: unknown,
    fieldName: string,
  ) {
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
