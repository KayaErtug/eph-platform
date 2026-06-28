import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  ProjectMediaPackageType,
  Role,
  UnitType,
} from '@prisma/client';
import { randomUUID } from 'crypto';
import { unlink } from 'fs/promises';
import { basename, extname } from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseService } from '../supabase/supabase.service';
import {
  ProjectMediaZipFilePreview,
  ProjectMediaZipIssue,
  ProjectMediaZipPackagePreview,
  ProjectMediaZipPreviewResult,
  ProjectMediaZipUploadResult,
} from './project-media-zip.types';

type MediaZipInput = {
  userId: string;
  userRole?: Role | string;
  projectCode: string;
  file: Express.Multer.File;
  replaceExisting?: boolean;
};

type ProjectRecord = {
  id: string;
  code: string | null;
  name: string;
  ownerId: string;
};

type MediaPackageDefinition = {
  id: string;
  code: string;
  name: string;
  type: ProjectMediaPackageType;
  unitType: UnitType | null;
  roomCount: string | null;
  isDefault: boolean;
  sortOrder: number;
  assets: Array<{ path: string }>;
  _count: {
    assets: number;
    units: number;
  };
};

type ParsedZipFile = ProjectMediaZipFilePreview & {
  entry: any;
};

type ParsedZipPackage = {
  packageId: string;
  sourceFolder: string;
  code: string;
  name: string;
  type: ProjectMediaPackageType;
  unitType: UnitType | null;
  roomCount: string | null;
  isDefault: boolean;
  sortOrder: number;
  existingAssetCount: number;
  assignedUnitCount: number;
  fileCount: number;
  totalSize: number;
  files: ParsedZipFile[];
};

type ParsedZipResult = {
  packages: ParsedZipPackage[];
  issues: ProjectMediaZipIssue[];
  totalImageSize: number;
  imageCount: number;
};

type UploadedAsset = {
  packageId: string;
  path: string;
  url: string;
  originalName: string;
  mimetype: string;
  size: number;
  isCover: boolean;
  sortOrder: number;
};

const ZIP_MAX_FILE_SIZE = 200 * 1024 * 1024;
const IMAGE_MAX_FILE_SIZE = 15 * 1024 * 1024;
const ZIP_MAX_UNCOMPRESSED_SIZE = 400 * 1024 * 1024;
const ZIP_MAX_IMAGE_COUNT = 200;
const ZIP_MAX_PACKAGE_COUNT = 50;
const ZIP_MAX_COMPRESSION_RATIO = 100;
const GENERAL_MIN_IMAGE_COUNT = 8;
const GENERAL_MAX_IMAGE_COUNT = 10;
const PACKAGE_RECOMMENDED_IMAGE_COUNT = 5;
const PACKAGE_MAX_IMAGE_COUNT = 10;

const IMAGE_MIME_BY_EXTENSION: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

@Injectable()
export class ProjectMediaZipService {
  private readonly logger = new Logger(ProjectMediaZipService.name);
  private readonly bucket =
    process.env.SUPABASE_STORAGE_BUCKET || 'portfolio-images';

  constructor(
    private readonly prisma: PrismaService,
    private readonly supabaseService: SupabaseService,
  ) {}

  async getConfig(
    userId: string,
    userRole: Role | string | undefined,
    projectCode: string,
  ) {
    const project = await this.findProject(
      userId,
      userRole,
      projectCode,
    );
    const definitions = await this.loadPackageDefinitions(project.id);

    return {
      project: {
        id: project.id,
        code: project.code,
        name: project.name,
      },
      limits: {
        maxZipSizeMb: ZIP_MAX_FILE_SIZE / (1024 * 1024),
        maxImageSizeMb: IMAGE_MAX_FILE_SIZE / (1024 * 1024),
        maxImageCount: ZIP_MAX_IMAGE_COUNT,
        maxPackageCount: ZIP_MAX_PACKAGE_COUNT,
        allowedImageExtensions: Object.keys(IMAGE_MIME_BY_EXTENSION),
        generalImageCount: {
          min: GENERAL_MIN_IMAGE_COUNT,
          max: GENERAL_MAX_IMAGE_COUNT,
        },
        recommendedStandardImageCount:
          PACKAGE_RECOMMENDED_IMAGE_COUNT,
        maxStandardImageCount: PACKAGE_MAX_IMAGE_COUNT,
      },
      folders: definitions.map((item) => ({
        packageId: item.id,
        code: item.code,
        folder: this.slugifyCode(item.code),
        name: item.name,
        type: item.type,
        unitType: item.unitType,
        roomCount: item.roomCount,
        isDefault: item.isDefault,
        existingAssetCount: item._count.assets,
        assignedUnitCount: item._count.units,
      })),
    };
  }

  async previewZip(
    input: MediaZipInput,
  ): Promise<ProjectMediaZipPreviewResult> {
    try {
      this.validateZipFile(input.file);

      const project = await this.findProject(
        input.userId,
        input.userRole,
        input.projectCode,
      );
      const definitions = await this.loadPackageDefinitions(
        project.id,
      );
      const parsed = await this.parseZip(
        input.file,
        definitions,
      );

      return this.buildPreview(
        project,
        input.file,
        parsed,
        Boolean(input.replaceExisting),
      );
    } finally {
      await this.removeTempFile(input.file?.path);
    }
  }

  async uploadZip(
    input: MediaZipInput,
  ): Promise<ProjectMediaZipUploadResult> {
    const uploadedAssets: UploadedAsset[] = [];

    try {
      this.validateZipFile(input.file);

      const project = await this.findProject(
        input.userId,
        input.userRole,
        input.projectCode,
      );
      const definitions = await this.loadPackageDefinitions(
        project.id,
      );
      const parsed = await this.parseZip(
        input.file,
        definitions,
      );
      const preview = this.buildPreview(
        project,
        input.file,
        parsed,
        Boolean(input.replaceExisting),
      );

      if (!preview.valid) {
        throw new BadRequestException({
          message:
            'Fotoğraf ZIP dosyasında doğrulama hataları bulundu.',
          preview,
        });
      }

      const batchCode =
        `${Date.now()}-${randomUUID().slice(0, 8)}`;

      for (const mediaPackage of parsed.packages) {
        for (const image of mediaPackage.files) {
          const buffer = await image.entry.buffer();

          if (
            !this.matchesImageSignature(
              buffer,
              image.mimetype,
            )
          ) {
            throw new BadRequestException(
              `${image.originalPath} dosyasının içeriği uzantısıyla uyuşmuyor.`,
            );
          }

          const safeFileName = this.safeStorageFileName(
            image.fileName,
          );
          const path =
            `project-media/${this.slugifyCode(project.ownerId)}/` +
            `${this.slugifyCode(project.id)}/` +
            `${this.slugifyCode(mediaPackage.code)}/` +
            `${batchCode}-${String(image.sortOrder + 1).padStart(2, '0')}-${safeFileName}`;

          await this.supabaseService.uploadFile(
            this.bucket,
            path,
            buffer,
            image.mimetype,
          );

          uploadedAssets.push({
            packageId: mediaPackage.packageId,
            path,
            url: this.supabaseService.getPublicUrl(
              this.bucket,
              path,
            ),
            originalName: image.fileName,
            mimetype: image.mimetype,
            size: image.size,
            isCover: image.isCover,
            sortOrder: image.sortOrder,
          });
        }
      }

      const oldStoragePaths = parsed.packages
        .filter(
          (item) =>
            input.replaceExisting &&
            item.existingAssetCount > 0,
        )
        .flatMap((item) => {
          const definition = definitions.find(
            (candidate) => candidate.id === item.packageId,
          );
          return definition?.assets.map((asset) => asset.path) ?? [];
        });

      const transactionResult = await this.prisma.$transaction(
        async (tx) => {
          const packages: ProjectMediaZipUploadResult['packages'] = [];
          let replacedAssetCount = 0;
          let assignedUnitCount = 0;

          for (const parsedPackage of parsed.packages) {
            if (
              parsedPackage.existingAssetCount > 0 &&
              !input.replaceExisting
            ) {
              throw new BadRequestException(
                `${parsedPackage.code} paketinde mevcut fotoğraflar var. Değiştirmek için replaceExisting=true gönderilmelidir.`,
              );
            }

            if (input.replaceExisting) {
              replacedAssetCount +=
                parsedPackage.existingAssetCount;

              await tx.projectMediaAsset.deleteMany({
                where: {
                  packageId: parsedPackage.packageId,
                },
              });
            }

            const packageUploads = uploadedAssets.filter(
              (asset) =>
                asset.packageId === parsedPackage.packageId,
            );

            await tx.projectMediaAsset.createMany({
              data: packageUploads.map((asset) => ({
                packageId: parsedPackage.packageId,
                url: asset.url,
                supabaseUrl: asset.url,
                path: asset.path,
                bucket: this.bucket,
                originalName: asset.originalName,
                mimetype: asset.mimetype,
                size: asset.size,
                isCover: asset.isCover,
                sortOrder: asset.sortOrder,
              })),
            });

            const assignedCount = await tx.unit.count({
              where: {
                mediaPackageId: parsedPackage.packageId,
              },
            });

            assignedUnitCount += assignedCount;

            packages.push({
              id: parsedPackage.packageId,
              code: parsedPackage.code,
              name: parsedPackage.name,
              type: parsedPackage.type,
              assetCount: packageUploads.length,
              assignedUnitCount: assignedCount,
            });
          }

          return {
            packages,
            replacedAssetCount,
            assignedUnitCount,
          };
        },
        {
          maxWait: 10_000,
          timeout: 30_000,
        },
      );

      if (oldStoragePaths.length > 0) {
        try {
          await this.supabaseService.removeFile(
            this.bucket,
            oldStoragePaths,
          );
        } catch (error) {
          this.logger.warn(
            `Eski proje görselleri depodan silinemedi: ${this.errorMessage(error)}`,
          );
        }
      }

      return {
        success: true,
        project: {
          id: project.id,
          code: project.code,
          name: project.name,
        },
        summary: {
          packageCount: transactionResult.packages.length,
          uploadedAssetCount: uploadedAssets.length,
          replacedAssetCount:
            transactionResult.replacedAssetCount,
          assignedUnitCount:
            transactionResult.assignedUnitCount,
        },
        packages: transactionResult.packages,
        warnings: parsed.issues.filter(
          (issue) => issue.level === 'WARNING',
        ),
      };
    } catch (error) {
      if (uploadedAssets.length > 0) {
        try {
          await this.supabaseService.removeFile(
            this.bucket,
            uploadedAssets.map((asset) => asset.path),
          );
        } catch (cleanupError) {
          this.logger.error(
            `Başarısız ZIP yüklemesinin dosyaları temizlenemedi: ${this.errorMessage(cleanupError)}`,
          );
        }
      }

      throw error;
    } finally {
      await this.removeTempFile(input.file?.path);
    }
  }

  async listPackages(
    userId: string,
    userRole: Role | string | undefined,
    projectCode: string,
  ) {
    const project = await this.findProject(
      userId,
      userRole,
      projectCode,
    );
    const packages = await this.loadPackageDefinitions(
      project.id,
    );

    return {
      project: {
        id: project.id,
        code: project.code,
        name: project.name,
      },
      packages: packages.map((item) => ({
        ...item,
        zipFolder: this.slugifyCode(item.code),
      })),
    };
  }

  private buildPreview(
    project: ProjectRecord,
    file: Express.Multer.File,
    parsed: ParsedZipResult,
    replaceExisting: boolean,
  ): ProjectMediaZipPreviewResult {
    const issues = [...parsed.issues];

    const packages: ProjectMediaZipPackagePreview[] =
      parsed.packages.map((item) => {
        const action =
          item.existingAssetCount === 0
            ? 'CREATE_ASSETS'
            : replaceExisting
              ? 'REPLACE_ASSETS'
              : 'BLOCKED';

        if (action === 'BLOCKED') {
          issues.push({
            level: 'ERROR',
            code: 'PACKAGE_ALREADY_HAS_ASSETS',
            message:
              `${item.code} paketinde ${item.existingAssetCount} mevcut görsel var. ` +
              'Değiştirmek için replaceExisting=true kullanılmalıdır.',
            path: item.sourceFolder,
          });
        }

        return {
          packageId: item.packageId,
          sourceFolder: item.sourceFolder,
          code: item.code,
          name: item.name,
          type: item.type,
          unitType: item.unitType,
          roomCount: item.roomCount,
          isDefault: item.isDefault,
          sortOrder: item.sortOrder,
          fileCount: item.fileCount,
          totalSize: item.totalSize,
          existingAssetCount: item.existingAssetCount,
          assignedUnitCount: item.assignedUnitCount,
          action,
          files: item.files.map(
            ({ entry: _entry, ...image }) => image,
          ),
        };
      });

    const errorCount = issues.filter(
      (issue) => issue.level === 'ERROR',
    ).length;
    const warningCount = issues.filter(
      (issue) => issue.level === 'WARNING',
    ).length;
    const compressionRatio =
      file.size > 0
        ? Number(
            (
              parsed.totalImageSize / file.size
            ).toFixed(2),
          )
        : 0;

    return {
      valid: errorCount === 0,
      project: {
        id: project.id,
        code: project.code,
        name: project.name,
      },
      archive: {
        fileName: file.originalname,
        fileSize: file.size,
        totalImageSize: parsed.totalImageSize,
        compressionRatio,
      },
      summary: {
        packageCount: packages.length,
        imageCount: parsed.imageCount,
        totalImageSize: parsed.totalImageSize,
        existingPackageCount: packages.filter(
          (item) => item.existingAssetCount > 0,
        ).length,
        existingAssetCount: packages.reduce(
          (total, item) =>
            total + item.existingAssetCount,
          0,
        ),
        assignedUnitCount: packages.reduce(
          (total, item) =>
            total + item.assignedUnitCount,
          0,
        ),
        errorCount,
        warningCount,
      },
      packages,
      issues,
    };
  }

  private async parseZip(
    file: Express.Multer.File,
    definitions: MediaPackageDefinition[],
  ): Promise<ParsedZipResult> {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const unzipper = require('unzipper');
    const directory = await unzipper.Open.file(file.path);
    const issues: ProjectMediaZipIssue[] = [];

    const folderMap = new Map<string, MediaPackageDefinition>();

    for (const definition of definitions) {
      const folder = this.slugifyCode(definition.code);
      const existing = folderMap.get(folder);

      if (existing) {
        issues.push({
          level: 'ERROR',
          code: 'DUPLICATE_DYNAMIC_FOLDER',
          message:
            `${existing.code} ve ${definition.code} aynı ZIP klasörüne dönüşüyor.`,
          value: folder,
        });
        continue;
      }

      folderMap.set(folder, definition);
    }

    const rawEntries = directory.files.filter(
      (entry: any) =>
        entry.type !== 'Directory' &&
        !this.shouldIgnoreZipPath(entry.path),
    );
    const normalizedEntries = this.normalizeRootFolder(
      rawEntries,
    );

    if (normalizedEntries.length === 0) {
      issues.push({
        level: 'ERROR',
        code: 'ZIP_HAS_NO_IMAGES',
        message: 'ZIP dosyasında görsel bulunamadı.',
      });

      return {
        packages: [],
        issues,
        totalImageSize: 0,
        imageCount: 0,
      };
    }

    if (normalizedEntries.length > ZIP_MAX_IMAGE_COUNT) {
      issues.push({
        level: 'ERROR',
        code: 'TOO_MANY_IMAGES',
        message:
          `ZIP dosyasında en fazla ${ZIP_MAX_IMAGE_COUNT} görsel olabilir.`,
        value: normalizedEntries.length,
      });
    }

    const totalUncompressedSize = normalizedEntries.reduce(
      (
        total: number,
        item: { entry: any },
      ) =>
        total +
        Number(item.entry.uncompressedSize || 0),
      0,
    );

    if (
      totalUncompressedSize >
      ZIP_MAX_UNCOMPRESSED_SIZE
    ) {
      issues.push({
        level: 'ERROR',
        code: 'ZIP_UNCOMPRESSED_SIZE_TOO_LARGE',
        message:
          `ZIP açıldığında toplam dosya boyutu en fazla ` +
          `${ZIP_MAX_UNCOMPRESSED_SIZE / (1024 * 1024)} MB olabilir.`,
        value: totalUncompressedSize,
      });
    }

    const compressionRatio =
      file.size > 0
        ? totalUncompressedSize / file.size
        : 0;

    if (
      compressionRatio >
      ZIP_MAX_COMPRESSION_RATIO
    ) {
      issues.push({
        level: 'ERROR',
        code: 'SUSPICIOUS_COMPRESSION_RATIO',
        message: 'ZIP sıkıştırma oranı güvenli sınırı aşıyor.',
        value: Number(compressionRatio.toFixed(2)),
      });
    }

    const packageMap = new Map<string, ParsedZipPackage>();

    for (const normalized of normalizedEntries) {
      if (this.hasUnsafePath(normalized.originalPath)) {
        issues.push({
          level: 'ERROR',
          code: 'UNSAFE_ZIP_PATH',
          message: 'ZIP içinde güvenli olmayan dosya yolu bulundu.',
          path: normalized.originalPath,
        });
        continue;
      }

      const parts = normalized.path.split('/').filter(Boolean);

      if (parts.length !== 2) {
        issues.push({
          level: 'ERROR',
          code: 'INVALID_FOLDER_DEPTH',
          message:
            'Görseller yalnız paket klasörünün doğrudan içinde olmalıdır.',
          path: normalized.originalPath,
        });
        continue;
      }

      const folderName = this.slugifyCode(parts[0]);
      const definition = folderMap.get(folderName);

      if (!definition) {
        issues.push({
          level: 'ERROR',
          code: 'UNKNOWN_MEDIA_FOLDER',
          message:
            'ZIP klasörü Excel V4 ile tanımlanan aktif fotoğraf paketlerinden biri olmalıdır.',
          path: normalized.originalPath,
          value: {
            folder: folderName,
            allowedFolders: Array.from(folderMap.keys()),
          },
        });
        continue;
      }

      const fileName = basename(parts[1]);
      const extension = extname(fileName)
        .toLocaleLowerCase('tr-TR');
      const mimetype =
        IMAGE_MIME_BY_EXTENSION[extension];

      if (!mimetype) {
        issues.push({
          level: 'ERROR',
          code: 'INVALID_IMAGE_EXTENSION',
          message:
            'Yalnız JPG, JPEG, PNG veya WEBP görseller kullanılabilir.',
          path: normalized.originalPath,
          value: extension,
        });
        continue;
      }

      const imageSize = Number(
        normalized.entry.uncompressedSize || 0,
      );

      if (imageSize <= 0) {
        issues.push({
          level: 'ERROR',
          code: 'EMPTY_IMAGE',
          message: 'Görsel dosyası boş.',
          path: normalized.originalPath,
        });
        continue;
      }

      if (imageSize > IMAGE_MAX_FILE_SIZE) {
        issues.push({
          level: 'ERROR',
          code: 'IMAGE_TOO_LARGE',
          message:
            `Her görsel en fazla ` +
            `${IMAGE_MAX_FILE_SIZE / (1024 * 1024)} MB olabilir.`,
          path: normalized.originalPath,
          value: imageSize,
        });
        continue;
      }

      let mediaPackage = packageMap.get(definition.id);

      if (!mediaPackage) {
        mediaPackage = {
          packageId: definition.id,
          sourceFolder: folderName,
          code: definition.code,
          name: definition.name,
          type: definition.type,
          unitType: definition.unitType,
          roomCount: definition.roomCount,
          isDefault: definition.isDefault,
          sortOrder: definition.sortOrder,
          existingAssetCount:
            definition._count.assets,
          assignedUnitCount:
            definition._count.units,
          fileCount: 0,
          totalSize: 0,
          files: [],
        };
        packageMap.set(definition.id, mediaPackage);
      }

      mediaPackage.files.push({
        originalPath: normalized.originalPath,
        fileName,
        extension,
        mimetype,
        size: imageSize,
        sortOrder: 0,
        isCover: false,
        entry: normalized.entry,
      });
    }

    const packages = Array.from(packageMap.values());

    if (packages.length > ZIP_MAX_PACKAGE_COUNT) {
      issues.push({
        level: 'ERROR',
        code: 'TOO_MANY_PACKAGES',
        message:
          `En fazla ${ZIP_MAX_PACKAGE_COUNT} fotoğraf paketi yüklenebilir.`,
        value: packages.length,
      });
    }

    const defaultGeneral =
      definitions.find(
        (item) =>
          item.type ===
            ProjectMediaPackageType.PROJECT_GENERAL &&
          item.isDefault,
      ) ??
      definitions.find(
        (item) =>
          item.type ===
          ProjectMediaPackageType.PROJECT_GENERAL,
      );

    if (!defaultGeneral) {
      issues.push({
        level: 'ERROR',
        code: 'GENERAL_PACKAGE_DEFINITION_REQUIRED',
        message:
          'Projede aktif PROJECT_GENERAL fotoğraf paketi bulunamadı.',
      });
    } else {
      const uploadedGeneral = packageMap.has(
        defaultGeneral.id,
      );

      if (
        defaultGeneral._count.assets === 0 &&
        !uploadedGeneral
      ) {
        issues.push({
          level: 'ERROR',
          code: 'GENERAL_FOLDER_REQUIRED',
          message:
            `${this.slugifyCode(defaultGeneral.code)} klasörü ilk fotoğraf yüklemesinde zorunludur.`,
          value: this.slugifyCode(defaultGeneral.code),
        });
      }
    }

    for (const mediaPackage of packages) {
      mediaPackage.files.sort((left, right) =>
        left.fileName.localeCompare(
          right.fileName,
          'tr',
          {
            numeric: true,
            sensitivity: 'base',
          },
        ),
      );

      mediaPackage.files.forEach((image, index) => {
        image.sortOrder = index;
        image.isCover = index === 0;
      });

      mediaPackage.fileCount =
        mediaPackage.files.length;
      mediaPackage.totalSize =
        mediaPackage.files.reduce(
          (total, image) => total + image.size,
          0,
        );

      if (
        mediaPackage.type ===
        ProjectMediaPackageType.PROJECT_GENERAL
      ) {
        if (
          mediaPackage.fileCount <
            GENERAL_MIN_IMAGE_COUNT ||
          mediaPackage.fileCount >
            GENERAL_MAX_IMAGE_COUNT
        ) {
          issues.push({
            level: 'ERROR',
            code: 'INVALID_GENERAL_IMAGE_COUNT',
            message:
              `Proje genel paketinde ${GENERAL_MIN_IMAGE_COUNT}-${GENERAL_MAX_IMAGE_COUNT} görsel olmalıdır.`,
            path: mediaPackage.sourceFolder,
            value: mediaPackage.fileCount,
          });
        }
      } else if (
        mediaPackage.fileCount >
        PACKAGE_MAX_IMAGE_COUNT
      ) {
        issues.push({
          level: 'ERROR',
          code: 'PACKAGE_IMAGE_COUNT_TOO_HIGH',
          message:
            `Standart fotoğraf paketinde en fazla ${PACKAGE_MAX_IMAGE_COUNT} görsel olabilir.`,
          path: mediaPackage.sourceFolder,
          value: mediaPackage.fileCount,
        });
      } else if (
        mediaPackage.fileCount <
        PACKAGE_RECOMMENDED_IMAGE_COUNT
      ) {
        issues.push({
          level: 'WARNING',
          code: 'PACKAGE_IMAGE_COUNT_LOW',
          message:
            `Standart paket için ${PACKAGE_RECOMMENDED_IMAGE_COUNT} görsel önerilir.`,
          path: mediaPackage.sourceFolder,
          value: mediaPackage.fileCount,
        });
      }
    }

    return {
      packages,
      issues,
      totalImageSize: packages.reduce(
        (total, item) => total + item.totalSize,
        0,
      ),
      imageCount: packages.reduce(
        (total, item) => total + item.fileCount,
        0,
      ),
    };
  }

  private async loadPackageDefinitions(
    projectId: string,
  ): Promise<MediaPackageDefinition[]> {
    const definitions =
      await this.prisma.projectMediaPackage.findMany({
        where: {
          projectId,
          isActive: true,
        },
        include: {
          assets: {
            select: {
              path: true,
            },
          },
          _count: {
            select: {
              assets: true,
              units: true,
            },
          },
        },
        orderBy: [
          { sortOrder: 'asc' },
          { createdAt: 'asc' },
        ],
      });

    if (definitions.length === 0) {
      throw new BadRequestException(
        'Projede fotoğraf paketi tanımı bulunamadı. Önce Excel V4 içe aktarma işlemi tamamlanmalıdır.',
      );
    }

    return definitions;
  }

  private normalizeRootFolder(entries: any[]) {
    const prepared = entries.map((entry) => {
      const originalPath = String(entry.path || '')
        .replace(/\\/g, '/')
        .replace(/^\/+|\/+$/g, '');

      return {
        entry,
        originalPath,
        parts: originalPath.split('/').filter(Boolean),
      };
    });

    const firstSegments = new Set(
      prepared
        .filter((item) => item.parts.length >= 3)
        .map((item) => item.parts[0]),
    );
    const hasSingleWrapper =
      firstSegments.size === 1 &&
      prepared.every(
        (item) => item.parts.length >= 3,
      );
    const wrapper = hasSingleWrapper
      ? Array.from(firstSegments)[0]
      : null;

    return prepared.map((item) => {
      const parts =
        wrapper && item.parts[0] === wrapper
          ? item.parts.slice(1)
          : item.parts;

      return {
        entry: item.entry,
        originalPath: item.originalPath,
        path: parts.join('/'),
      };
    });
  }

  private hasUnsafePath(value: string) {
    const normalized = String(value || '')
      .replace(/\\/g, '/');

    return (
      normalized.startsWith('/') ||
      /^[a-zA-Z]:\//.test(normalized) ||
      normalized.split('/').includes('..')
    );
  }

  private shouldIgnoreZipPath(value: string) {
    const normalized = String(value || '')
      .replace(/\\/g, '/')
      .toLocaleLowerCase('tr-TR');

    return (
      normalized.includes('__macosx/') ||
      normalized.endsWith('/.ds_store') ||
      normalized.endsWith('/thumbs.db') ||
      normalized.endsWith('.ds_store') ||
      normalized.endsWith('thumbs.db') ||
      normalized
        .split('/')
        .some((part) => part.startsWith('._'))
    );
  }

  private async findProject(
    userId: string,
    userRole: Role | string | undefined,
    projectCode: string,
  ): Promise<ProjectRecord> {
    const normalizedCode = String(projectCode || '').trim();

    if (!normalizedCode) {
      throw new BadRequestException(
        'Proje Kodu zorunludur.',
      );
    }

    const project = await this.prisma.project.findFirst({
      where: {
        code: {
          equals: normalizedCode,
          mode: 'insensitive',
        },
        ...(userRole === Role.SUPER_ADMIN
          ? {}
          : { ownerId: userId }),
      },
      select: {
        id: true,
        code: true,
        name: true,
        ownerId: true,
      },
    });

    if (!project) {
      throw new NotFoundException(
        'Proje bulunamadı veya bu projeye erişim yetkiniz yok.',
      );
    }

    return project;
  }

  private validateZipFile(file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException(
        'ZIP dosyası yüklenmedi.',
      );
    }

    if (!file.path) {
      throw new BadRequestException(
        'ZIP dosyası geçici alana kaydedilemedi.',
      );
    }

    if (
      extname(file.originalname)
        .toLocaleLowerCase('tr-TR') !== '.zip'
    ) {
      throw new BadRequestException(
        'Yalnızca .zip dosyası yüklenebilir.',
      );
    }

    if (file.size <= 0) {
      throw new BadRequestException('ZIP dosyası boş.');
    }

    if (file.size > ZIP_MAX_FILE_SIZE) {
      throw new BadRequestException(
        `ZIP dosyası en fazla ${ZIP_MAX_FILE_SIZE / (1024 * 1024)} MB olabilir.`,
      );
    }
  }

  private matchesImageSignature(
    buffer: Buffer,
    mimetype: string,
  ) {
    if (mimetype === 'image/jpeg') {
      return (
        buffer.length >= 3 &&
        buffer[0] === 0xff &&
        buffer[1] === 0xd8 &&
        buffer[2] === 0xff
      );
    }

    if (mimetype === 'image/png') {
      const signature = [
        0x89,
        0x50,
        0x4e,
        0x47,
        0x0d,
        0x0a,
        0x1a,
        0x0a,
      ];

      return (
        buffer.length >= signature.length &&
        signature.every(
          (value, index) =>
            buffer[index] === value,
        )
      );
    }

    if (mimetype === 'image/webp') {
      return (
        buffer.length >= 12 &&
        buffer
          .subarray(0, 4)
          .toString('ascii') === 'RIFF' &&
        buffer
          .subarray(8, 12)
          .toString('ascii') === 'WEBP'
      );
    }

    return false;
  }

  private safeStorageFileName(value: string) {
    const extension = extname(value)
      .toLocaleLowerCase('tr-TR');
    const name = basename(value, extension)
      .toLocaleLowerCase('tr-TR')
      .replace(/ç/g, 'c')
      .replace(/ğ/g, 'g')
      .replace(/ı/g, 'i')
      .replace(/ö/g, 'o')
      .replace(/ş/g, 's')
      .replace(/ü/g, 'u')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80);

    return `${name || 'image'}${extension}`;
  }

  private slugifyCode(value: string) {
    return String(value || '')
      .trim()
      .toLocaleLowerCase('tr-TR')
      .replace(/ç/g, 'c')
      .replace(/ğ/g, 'g')
      .replace(/ı/g, 'i')
      .replace(/ö/g, 'o')
      .replace(/ş/g, 's')
      .replace(/ü/g, 'u')
      .replace(/\+/g, '-')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private async removeTempFile(path?: string) {
    if (!path) {
      return;
    }

    try {
      await unlink(path);
    } catch (error) {
      this.logger.warn(
        `Geçici ZIP dosyası silinemedi: ${this.errorMessage(error)}`,
      );
    }
  }

  private errorMessage(error: unknown) {
    return error instanceof Error
      ? error.message
      : String(error);
  }
}
