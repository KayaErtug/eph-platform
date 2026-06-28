import {
  ProjectInventoryBatchStatus,
} from '@prisma/client';

export interface ProjectSalesImportProjectResult {
  projectId: string;
  projectCode: string;
  projectName: string;
  batchId: string;
  batchStatus: ProjectInventoryBatchStatus;
  idempotent: boolean;
  projectCreated: boolean;
  createdBlockCount: number;
  existingBlockCount: number;
  createdFloorCount: number;
  existingFloorCount: number;
  createdPhotoPackageCount: number;
  existingPhotoPackageCount: number;
  createdUnitCount: number;
  skippedUnitCount: number;
}

export interface ProjectSalesImportResult {
  success: true;
  fileName: string;
  fileHash: string;
  templateVersion: string;
  idempotencyKey: string;
  summary: {
    projectCount: number;
    createdProjectCount: number;
    batchCount: number;
    idempotentBatchCount: number;
    createdBlockCount: number;
    createdFloorCount: number;
    createdPhotoPackageCount: number;
    createdUnitCount: number;
    skippedUnitCount: number;
  };
  projects: ProjectSalesImportProjectResult[];
}
