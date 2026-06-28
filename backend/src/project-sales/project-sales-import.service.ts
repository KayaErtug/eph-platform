import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  ProjectInventoryBatchItemAction,
  ProjectInventoryBatchItemStatus,
  ProjectInventoryBatchStatus,
  ProjectInventoryBatchType,
  Role,
} from '@prisma/client';
import { createHash, randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import {
  ProjectSalesBlockRow,
  ProjectSalesPhotoPackage,
  ProjectSalesPreviewResult,
  ProjectSalesProjectRow,
  ProjectSalesUnitRow,
} from './project-sales.types';
import {
  ProjectSalesImportProjectResult,
  ProjectSalesImportResult,
} from './project-sales-import.types';
import { ProjectSalesService } from './project-sales.service';

type CommitInput = {
  userId: string;
  userRole?: Role | string;
  file: Express.Multer.File;
  previewHash: string;
  confirmation: string;
};

type FloorDefinition = {
  projectCode: string;
  normalizedBlockCode: string;
  level: number;
  label: string;
  floorType: ProjectSalesUnitRow['floor']['floorType'];
  sortOrder: number;
};

type ExistingUnitRecord = {
  id: string;
  inventoryCode: string | null;
  externalRef: string | null;
};

@Injectable()
export class ProjectSalesImportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projectSalesService: ProjectSalesService,
  ) {}

  async previewExcel(userId: string, file: Express.Multer.File) {
    const preview = await this.projectSalesService.previewExcel(
      userId,
      file,
    );

    return {
      ...preview,
      fileHash: this.hashBuffer(file.buffer),
    };
  }

  async commitExcel(input: CommitInput): Promise<ProjectSalesImportResult> {
    this.validateCommitRequest(input);

    const fileHash = this.hashBuffer(input.file.buffer);

    if (fileHash !== input.previewHash.trim().toLowerCase()) {
      throw new ConflictException(
        'Ön izlenen Excel dosyası ile içe aktarılmak istenen dosya aynı değil.',
      );
    }

    const preview = await this.projectSalesService.previewExcel(
      input.userId,
      input.file,
    );

    if (!preview.valid) {
      throw new BadRequestException({
        message:
          'Excel dosyasında doğrulama hataları bulundu. Önce hataları düzeltin.',
        preview,
      });
    }

    if (preview.projects.length === 0) {
      throw new BadRequestException(
        'İçe aktarılacak proje bulunamadı.',
      );
    }

    this.validateFloorConsistency(preview.units);

    const salesRepresentativeMap =
      await this.resolveSalesRepresentatives(preview.units);
    const idempotencyKey = `excel-v4:${fileHash}`;

    const projectResults = await this.prisma.$transaction(
      async (tx) => {
        const results: ProjectSalesImportProjectResult[] = [];

        for (const projectRow of preview.projects) {
          const result = await this.importProject({
            tx,
            userId: input.userId,
            projectRow,
            preview,
            fileName: input.file.originalname,
            fileHash,
            idempotencyKey,
            salesRepresentativeMap,
          });

          results.push(result);
        }

        return results;
      },
      {
        isolationLevel:
          Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 20_000,
        timeout: 120_000,
      },
    );

    return {
      success: true,
      fileName: input.file.originalname,
      fileHash,
      templateVersion: preview.templateVersion,
      idempotencyKey,
      summary: {
        projectCount: projectResults.length,
        createdProjectCount: projectResults.filter(
          (item) => item.projectCreated,
        ).length,
        batchCount: projectResults.length,
        idempotentBatchCount: projectResults.filter(
          (item) => item.idempotent,
        ).length,
        createdBlockCount: projectResults.reduce(
          (total, item) => total + item.createdBlockCount,
          0,
        ),
        createdFloorCount: projectResults.reduce(
          (total, item) => total + item.createdFloorCount,
          0,
        ),
        createdPhotoPackageCount: projectResults.reduce(
          (total, item) =>
            total + item.createdPhotoPackageCount,
          0,
        ),
        createdUnitCount: projectResults.reduce(
          (total, item) => total + item.createdUnitCount,
          0,
        ),
        skippedUnitCount: projectResults.reduce(
          (total, item) => total + item.skippedUnitCount,
          0,
        ),
      },
      projects: projectResults,
    };
  }

  async getBatch(
    userId: string,
    userRole: Role | string | undefined,
    batchId: string,
  ) {
    const batch = await this.prisma.projectInventoryBatch.findUnique({
      where: { id: batchId },
      include: {
        project: {
          select: {
            id: true,
            code: true,
            name: true,
            ownerId: true,
          },
        },
        items: {
          orderBy: { sequence: 'asc' },
          take: 100,
          select: {
            id: true,
            unitId: true,
            sequence: true,
            sourceRow: true,
            naturalKey: true,
            action: true,
            status: true,
            errors: true,
            warnings: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!batch) {
      throw new NotFoundException('İçe aktarma işlemi bulunamadı.');
    }

    const canView =
      userRole === Role.SUPER_ADMIN ||
      batch.createdById === userId ||
      batch.project.ownerId === userId;

    if (!canView) {
      throw new ForbiddenException(
        'Bu içe aktarma işlemini görüntüleme yetkiniz yok.',
      );
    }

    return batch;
  }

  private async importProject(input: {
    tx: Prisma.TransactionClient;
    userId: string;
    projectRow: ProjectSalesProjectRow;
    preview: ProjectSalesPreviewResult;
    fileName: string;
    fileHash: string;
    idempotencyKey: string;
    salesRepresentativeMap: Map<string, string>;
  }): Promise<ProjectSalesImportProjectResult> {
    const {
      tx,
      userId,
      projectRow,
      preview,
      fileName,
      fileHash,
      idempotencyKey,
      salesRepresentativeMap,
    } = input;

    let project = await tx.project.findUnique({
      where: {
        ownerId_code: {
          ownerId: userId,
          code: projectRow.projectCode,
        },
      },
      select: {
        id: true,
        code: true,
        name: true,
      },
    });
    let projectCreated = false;

    if (!project) {
      project = await tx.project.create({
        data: {
          id: randomUUID(),
          ownerId: userId,
          code: projectRow.projectCode,
          name: projectRow.name,
          description: projectRow.description,
          city: projectRow.city,
          district: projectRow.district,
          address: projectRow.address,
          completionPercent: projectRow.completionPercent,
          defaultDeliveryDate: this.toDate(
            projectRow.defaultDeliveryDate,
          ),
          isActive: projectRow.isActive,
        },
        select: {
          id: true,
          code: true,
          name: true,
        },
      });
      projectCreated = true;
    }

    const existingBatch =
      await tx.projectInventoryBatch.findUnique({
        where: {
          projectId_idempotencyKey: {
            projectId: project.id,
            idempotencyKey,
          },
        },
      });

    if (existingBatch) {
      if (
        existingBatch.status ===
          ProjectInventoryBatchStatus.COMPLETED ||
        existingBatch.status ===
          ProjectInventoryBatchStatus.PARTIAL
      ) {
        return {
          projectId: project.id,
          projectCode: projectRow.projectCode,
          projectName: project.name,
          batchId: existingBatch.id,
          batchStatus: existingBatch.status,
          idempotent: true,
          projectCreated: false,
          createdBlockCount: 0,
          existingBlockCount: 0,
          createdFloorCount: 0,
          existingFloorCount: 0,
          createdPhotoPackageCount: 0,
          existingPhotoPackageCount: 0,
          createdUnitCount: 0,
          skippedUnitCount: existingBatch.skippedCount,
        };
      }

      throw new ConflictException(
        `${projectRow.projectCode} projesi için aynı dosyaya ait işlem ${existingBatch.status} durumunda.`,
      );
    }

    const projectUnits = preview.units.filter(
      (item) => item.projectCode === projectRow.projectCode,
    );
    const projectBlocks = preview.blocks.filter(
      (item) => item.projectCode === projectRow.projectCode,
    );

    const batch = await tx.projectInventoryBatch.create({
      data: {
        id: randomUUID(),
        projectId: project.id,
        createdById: userId,
        type: ProjectInventoryBatchType.EXCEL_IMPORT,
        status: ProjectInventoryBatchStatus.PROCESSING,
        idempotencyKey,
        inputHash: fileHash,
        sourceFileName: fileName,
        templateVersion: preview.templateVersion,
        totalRows: projectUnits.length,
        processedRows: 0,
        validRows: projectUnits.length,
        invalidRows: 0,
        progressPercent: 5,
        validationSummary:
          preview.summary as unknown as Prisma.InputJsonValue,
        startedAt: new Date(),
      },
    });

    const packageResult = await this.ensurePhotoPackages({
      tx,
      projectId: project.id,
      photoPackages: preview.photoPackages,
    });
    const blockResult = await this.ensureBlocks({
      tx,
      projectId: project.id,
      batchId: batch.id,
      blocks: projectBlocks,
    });
    const floorResult = await this.ensureFloors({
      tx,
      batchId: batch.id,
      units: projectUnits,
      blockIdByCode: blockResult.idByCode,
    });

    const existingUnits = await this.findExistingUnits(
      tx,
      project.id,
      projectUnits,
    );
    const existingByInventoryCode = new Map(
      existingUnits
        .filter((item) => item.inventoryCode)
        .map((item) => [item.inventoryCode as string, item]),
    );
    const existingByExternalRef = new Map(
      existingUnits
        .filter((item) => item.externalRef)
        .map((item) => [item.externalRef as string, item]),
    );

    const unitCreates: Prisma.UnitCreateManyInput[] = [];
    const itemCreates: Prisma.ProjectInventoryBatchItemCreateManyInput[] = [];
    let createdUnitCount = 0;
    let skippedUnitCount = 0;

    projectUnits.forEach((unit, index) => {
      const existing =
        existingByInventoryCode.get(unit.inventoryCode) ||
        (unit.externalRef
          ? existingByExternalRef.get(unit.externalRef)
          : undefined);
      const normalized = this.normalizedUnitData(unit);

      if (existing) {
        skippedUnitCount += 1;
        itemCreates.push({
          id: randomUUID(),
          batchId: batch.id,
          unitId: existing.id,
          sequence: index + 1,
          sourceRow: unit.sourceRow,
          naturalKey: unit.inventoryCode,
          action: ProjectInventoryBatchItemAction.SKIP,
          status: ProjectInventoryBatchItemStatus.SKIPPED,
          rawData: normalized,
          normalizedData: normalized,
          warnings: [
            {
              code: 'UNIT_ALREADY_EXISTS',
              message:
                'Bağımsız bölüm daha önce kaydedildiği için atlandı.',
            },
          ],
        });
        return;
      }

      const unitId = randomUUID();
      const blockId = blockResult.idByCode.get(
        unit.normalizedBlockCode,
      );
      const floorId = floorResult.idByKey.get(
        this.floorKey(unit.normalizedBlockCode, unit.floor.level),
      );
      const mediaPackageId = unit.photoPackageCode
        ? packageResult.idByCode.get(unit.photoPackageCode)
        : undefined;
      const salesRepresentativeId =
        unit.salesRepresentativeEmail
          ? salesRepresentativeMap.get(
              unit.salesRepresentativeEmail.toLocaleLowerCase(
                'tr-TR',
              ),
            )
          : undefined;

      if (!blockId || !floorId) {
        throw new BadRequestException(
          `Satır ${unit.sourceRow}: Blok veya kat bağlantısı kurulamadı.`,
        );
      }

      if (unit.photoPackageCode && !mediaPackageId) {
        throw new BadRequestException(
          `Satır ${unit.sourceRow}: ${unit.photoPackageCode} fotoğraf paketi bulunamadı.`,
        );
      }

      if (!unit.type || !unit.status || unit.price === null) {
        throw new BadRequestException(
          `Satır ${unit.sourceRow}: Geçersiz bağımsız bölüm verisi.`,
        );
      }

      unitCreates.push({
        id: unitId,
        projectId: project.id,
        blockId,
        floorId,
        sourceBatchId: batch.id,
        salesRepresentativeId,
        mediaPackageId,
        inventoryCode: unit.inventoryCode,
        externalRef: unit.externalRef,
        inventorySortOrder: index,
        type: unit.type,
        floor: unit.floor.level,
        floorLabel: unit.floor.label,
        number: unit.number,
        roomCount: unit.roomCount,
        area: unit.grossArea ?? unit.netArea,
        netArea: unit.netArea,
        grossArea: unit.grossArea,
        facades: unit.facades,
        deliveryDate: this.toDate(unit.deliveryDate),
        price: unit.price,
        priceCurrency: unit.priceCurrency,
        status: unit.status,
        description: unit.description,
        features: unit.features,
      });

      itemCreates.push({
        id: randomUUID(),
        batchId: batch.id,
        unitId,
        sequence: index + 1,
        sourceRow: unit.sourceRow,
        naturalKey: unit.inventoryCode,
        action: ProjectInventoryBatchItemAction.CREATE,
        status: ProjectInventoryBatchItemStatus.CREATED,
        rawData: normalized,
        normalizedData: normalized,
        afterData: normalized,
        afterHash: this.hashJson(normalized),
      });
      createdUnitCount += 1;
    });

    await this.createManyInChunks(
      unitCreates,
      (data) => tx.unit.createMany({ data }),
    );
    await this.createManyInChunks(
      itemCreates,
      (data) =>
        tx.projectInventoryBatchItem.createMany({ data }),
    );

    await tx.projectInventoryBatch.update({
      where: { id: batch.id },
      data: {
        status: ProjectInventoryBatchStatus.COMPLETED,
        processedRows: projectUnits.length,
        createdCount: createdUnitCount,
        skippedCount: skippedUnitCount,
        failedCount: 0,
        progressPercent: 100,
        completedAt: new Date(),
      },
    });

    return {
      projectId: project.id,
      projectCode: projectRow.projectCode,
      projectName: project.name,
      batchId: batch.id,
      batchStatus: ProjectInventoryBatchStatus.COMPLETED,
      idempotent: false,
      projectCreated,
      createdBlockCount: blockResult.createdCount,
      existingBlockCount: blockResult.existingCount,
      createdFloorCount: floorResult.createdCount,
      existingFloorCount: floorResult.existingCount,
      createdPhotoPackageCount: packageResult.createdCount,
      existingPhotoPackageCount: packageResult.existingCount,
      createdUnitCount,
      skippedUnitCount,
    };
  }

  private async ensurePhotoPackages(input: {
    tx: Prisma.TransactionClient;
    projectId: string;
    photoPackages: ProjectSalesPhotoPackage[];
  }) {
    const existing = await input.tx.projectMediaPackage.findMany({
      where: {
        projectId: input.projectId,
        code: {
          in: input.photoPackages.map((item) => item.code),
        },
      },
      select: {
        id: true,
        code: true,
      },
    });
    const idByCode = new Map(
      existing.map((item) => [item.code, item.id]),
    );
    const creates = input.photoPackages.filter(
      (item) => !idByCode.has(item.code),
    );

    if (creates.length > 0) {
      const data = creates.map((item) => ({
        id: randomUUID(),
        projectId: input.projectId,
        code: item.code,
        name: item.name,
        type: item.type!,
        unitType: item.unitType,
        roomCount: item.roomCount,
        isDefault: item.isDefault,
        isActive: item.isActive,
        sortOrder: item.sortOrder,
      }));

      await input.tx.projectMediaPackage.createMany({ data });
      data.forEach((item) => idByCode.set(item.code, item.id));
    }

    return {
      idByCode,
      createdCount: creates.length,
      existingCount: existing.length,
    };
  }

  private async ensureBlocks(input: {
    tx: Prisma.TransactionClient;
    projectId: string;
    batchId: string;
    blocks: ProjectSalesBlockRow[];
  }) {
    const existing = await input.tx.projectBlock.findMany({
      where: {
        projectId: input.projectId,
        normalizedCode: {
          in: input.blocks.map(
            (item) => item.normalizedBlockCode,
          ),
        },
      },
      select: {
        id: true,
        normalizedCode: true,
      },
    });
    const idByCode = new Map(
      existing.map((item) => [item.normalizedCode, item.id]),
    );
    const creates = input.blocks.filter(
      (item) => !idByCode.has(item.normalizedBlockCode),
    );

    if (creates.length > 0) {
      const data = creates.map((item) => ({
        id: randomUUID(),
        projectId: input.projectId,
        sourceBatchId: input.batchId,
        code: item.blockCode,
        normalizedCode: item.normalizedBlockCode,
        name: item.name,
        sortOrder: item.sortOrder,
        isActive: item.isActive,
      }));

      await input.tx.projectBlock.createMany({ data });
      data.forEach((item) =>
        idByCode.set(item.normalizedCode, item.id),
      );
    }

    return {
      idByCode,
      createdCount: creates.length,
      existingCount: existing.length,
    };
  }

  private async ensureFloors(input: {
    tx: Prisma.TransactionClient;
    batchId: string;
    units: ProjectSalesUnitRow[];
    blockIdByCode: Map<string, string>;
  }) {
    const definitions = this.floorDefinitions(input.units);
    const blockIds = Array.from(
      new Set(input.blockIdByCode.values()),
    );
    const existing = await input.tx.projectFloor.findMany({
      where: {
        blockId: { in: blockIds },
      },
      select: {
        id: true,
        blockId: true,
        level: true,
      },
    });
    const idByKey = new Map<string, string>();
    const blockCodeById = new Map(
      Array.from(input.blockIdByCode.entries()).map(
        ([code, id]) => [id, code],
      ),
    );

    existing.forEach((item) => {
      const blockCode = blockCodeById.get(item.blockId);
      if (blockCode) {
        idByKey.set(this.floorKey(blockCode, item.level), item.id);
      }
    });

    const creates = definitions.filter(
      (item) =>
        !idByKey.has(
          this.floorKey(item.normalizedBlockCode, item.level),
        ),
    );

    if (creates.length > 0) {
      const data = creates.map((item) => {
        const blockId = input.blockIdByCode.get(
          item.normalizedBlockCode,
        );

        if (!blockId) {
          throw new BadRequestException(
            `${item.normalizedBlockCode} bloğu bulunamadı.`,
          );
        }

        return {
          id: randomUUID(),
          blockId,
          sourceBatchId: input.batchId,
          level: item.level,
          label: item.label,
          floorType: item.floorType,
          sortOrder: item.sortOrder,
          isActive: true,
        };
      });

      await input.tx.projectFloor.createMany({ data });
      data.forEach((item) => {
        const blockCode = blockCodeById.get(item.blockId);
        if (blockCode) {
          idByKey.set(
            this.floorKey(blockCode, item.level),
            item.id,
          );
        }
      });
    }

    return {
      idByKey,
      createdCount: creates.length,
      existingCount: definitions.length - creates.length,
    };
  }

  private async findExistingUnits(
    tx: Prisma.TransactionClient,
    projectId: string,
    units: ProjectSalesUnitRow[],
  ): Promise<ExistingUnitRecord[]> {
    const inventoryCodes = Array.from(
      new Set(units.map((item) => item.inventoryCode)),
    );
    const externalRefs = Array.from(
      new Set(
        units
          .map((item) => item.externalRef)
          .filter((item): item is string => Boolean(item)),
      ),
    );

    if (inventoryCodes.length === 0 && externalRefs.length === 0) {
      return [];
    }

    return tx.unit.findMany({
      where: {
        projectId,
        OR: [
          ...(inventoryCodes.length > 0
            ? [{ inventoryCode: { in: inventoryCodes } }]
            : []),
          ...(externalRefs.length > 0
            ? [{ externalRef: { in: externalRefs } }]
            : []),
        ],
      },
      select: {
        id: true,
        inventoryCode: true,
        externalRef: true,
      },
    });
  }

  private async resolveSalesRepresentatives(
    units: ProjectSalesUnitRow[],
  ) {
    const emails = Array.from(
      new Set(
        units
          .map((item) => item.salesRepresentativeEmail)
          .filter((item): item is string => Boolean(item))
          .map((item) => item.toLocaleLowerCase('tr-TR')),
      ),
    );

    if (emails.length === 0) {
      return new Map<string, string>();
    }

    const users = await this.prisma.user.findMany({
      where: {
        email: { in: emails },
      },
      select: {
        id: true,
        email: true,
      },
    });
    const result = new Map(
      users.map((item) => [
        item.email.toLocaleLowerCase('tr-TR'),
        item.id,
      ]),
    );
    const missing = emails.filter((email) => !result.has(email));

    if (missing.length > 0) {
      throw new BadRequestException(
        `Satış temsilcisi hesabı bulunamadı: ${missing.join(', ')}`,
      );
    }

    return result;
  }

  private floorDefinitions(units: ProjectSalesUnitRow[]) {
    const map = new Map<string, FloorDefinition>();

    units.forEach((unit) => {
      const key = this.floorKey(
        unit.normalizedBlockCode,
        unit.floor.level,
      );

      if (!map.has(key)) {
        map.set(key, {
          projectCode: unit.projectCode,
          normalizedBlockCode: unit.normalizedBlockCode,
          level: unit.floor.level,
          label: unit.floor.label,
          floorType: unit.floor.floorType,
          sortOrder: unit.floor.level,
        });
      }
    });

    return Array.from(map.values());
  }

  private validateFloorConsistency(units: ProjectSalesUnitRow[]) {
    const map = new Map<
      string,
      { label: string; floorType: string; sourceRow: number }
    >();

    units.forEach((unit) => {
      const key = `${unit.projectCode}|${this.floorKey(
        unit.normalizedBlockCode,
        unit.floor.level,
      )}`;
      const existing = map.get(key);

      if (!existing) {
        map.set(key, {
          label: unit.floor.label,
          floorType: unit.floor.floorType,
          sourceRow: unit.sourceRow,
        });
        return;
      }

      if (
        existing.label !== unit.floor.label ||
        existing.floorType !== unit.floor.floorType
      ) {
        throw new BadRequestException(
          `Satır ${unit.sourceRow}: Aynı blok ve kat için farklı kat etiketi veya kat tipi kullanılmış. İlk satır: ${existing.sourceRow}.`,
        );
      }
    });
  }

  private normalizedUnitData(
    unit: ProjectSalesUnitRow,
  ): Prisma.InputJsonValue {
    return {
      projectCode: unit.projectCode,
      blockCode: unit.normalizedBlockCode,
      floorLevel: unit.floor.level,
      floorLabel: unit.floor.label,
      number: unit.number,
      inventoryCode: unit.inventoryCode,
      externalRef: unit.externalRef,
      type: unit.type,
      roomCount: unit.roomCount,
      netArea: unit.netArea,
      grossArea: unit.grossArea,
      price: unit.price,
      priceCurrency: unit.priceCurrency,
      status: unit.status,
      facades: unit.facades,
      deliveryDate: unit.deliveryDate,
      featurePackageCode: unit.featurePackageCode,
      photoPackageCode: unit.photoPackageCode,
      features: unit.features,
      salesRepresentativeEmail: unit.salesRepresentativeEmail,
      description: unit.description,
    } as unknown as Prisma.InputJsonValue;
  }

  private validateCommitRequest(input: CommitInput) {
    if (!input.file?.buffer?.length) {
      throw new BadRequestException('Excel dosyası yüklenmedi.');
    }

    if (!input.previewHash?.trim()) {
      throw new BadRequestException('Ön izleme dosya özeti zorunludur.');
    }

    if (input.confirmation !== 'IMPORT') {
      throw new BadRequestException(
        'İçe aktarmayı onaylamak için confirmation=IMPORT gönderilmelidir.',
      );
    }
  }

  private async createManyInChunks<T>(
    rows: T[],
    create: (chunk: T[]) => Promise<unknown>,
  ) {
    const chunkSize = 500;

    for (let index = 0; index < rows.length; index += chunkSize) {
      await create(rows.slice(index, index + chunkSize));
    }
  }

  private floorKey(normalizedBlockCode: string, level: number) {
    return `${normalizedBlockCode}|${level}`;
  }

  private toDate(value: string | null) {
    if (!value) {
      return null;
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`Geçersiz tarih: ${value}`);
    }

    return date;
  }

  private hashBuffer(buffer: Buffer) {
    return createHash('sha256').update(buffer).digest('hex');
  }

  private hashJson(value: Prisma.InputJsonValue) {
    return createHash('sha256')
      .update(JSON.stringify(value))
      .digest('hex');
  }
}
