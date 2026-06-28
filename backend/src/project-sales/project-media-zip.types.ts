import {
  ProjectMediaPackageType,
  UnitType,
} from '@prisma/client';

export type ProjectMediaZipIssueLevel = 'ERROR' | 'WARNING';

export interface ProjectMediaZipIssue {
  level: ProjectMediaZipIssueLevel;
  code: string;
  message: string;
  path?: string;
  value?: unknown;
}

export interface ProjectMediaZipFilePreview {
  originalPath: string;
  fileName: string;
  extension: string;
  mimetype: string;
  size: number;
  sortOrder: number;
  isCover: boolean;
}

export interface ProjectMediaZipPackagePreview {
  packageId: string;
  sourceFolder: string;
  code: string;
  name: string;
  type: ProjectMediaPackageType;
  unitType: UnitType | null;
  roomCount: string | null;
  isDefault: boolean;
  sortOrder: number;
  fileCount: number;
  totalSize: number;
  existingAssetCount: number;
  assignedUnitCount: number;
  action: 'CREATE_ASSETS' | 'REPLACE_ASSETS' | 'BLOCKED';
  files: ProjectMediaZipFilePreview[];
}

export interface ProjectMediaZipPreviewResult {
  valid: boolean;
  project: {
    id: string;
    code: string | null;
    name: string;
  };
  archive: {
    fileName: string;
    fileSize: number;
    totalImageSize: number;
    compressionRatio: number;
  };
  summary: {
    packageCount: number;
    imageCount: number;
    totalImageSize: number;
    existingPackageCount: number;
    existingAssetCount: number;
    assignedUnitCount: number;
    errorCount: number;
    warningCount: number;
  };
  packages: ProjectMediaZipPackagePreview[];
  issues: ProjectMediaZipIssue[];
}

export interface ProjectMediaZipUploadResult {
  success: true;
  project: {
    id: string;
    code: string | null;
    name: string;
  };
  summary: {
    packageCount: number;
    uploadedAssetCount: number;
    replacedAssetCount: number;
    assignedUnitCount: number;
  };
  packages: Array<{
    id: string;
    code: string;
    name: string;
    type: ProjectMediaPackageType;
    assetCount: number;
    assignedUnitCount: number;
  }>;
  warnings: ProjectMediaZipIssue[];
}
