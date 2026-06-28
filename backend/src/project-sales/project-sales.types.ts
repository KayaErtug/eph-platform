import { ProjectFloorType, UnitStatus, UnitType } from '@prisma/client';

export type ProjectSalesPreviewAction =
  | 'CREATE'
  | 'USE_EXISTING'
  | 'SKIP_DUPLICATE';

export type ProjectSalesIssueLevel = 'ERROR' | 'WARNING';

export interface ProjectSalesValidationIssue {
  level: ProjectSalesIssueLevel;
  sheet: string;
  row: number;
  column?: string;
  code: string;
  message: string;
  value?: unknown;
}

export interface ProjectSalesProjectRow {
  sourceRow: number;
  projectCode: string;
  name: string;
  city: string;
  district: string;
  address: string;
  completionPercent: number | null;
  defaultDeliveryDate: string | null;
  isActive: boolean;
  description: string | null;
  action: ProjectSalesPreviewAction;
  existingProjectId: string | null;
  valid: boolean;
  issues: ProjectSalesValidationIssue[];
}

export interface ProjectSalesBlockRow {
  sourceRow: number;
  projectCode: string;
  blockCode: string;
  normalizedBlockCode: string;
  name: string | null;
  sortOrder: number;
  isActive: boolean;
  description: string | null;
  action: ProjectSalesPreviewAction;
  existingBlockId: string | null;
  valid: boolean;
  issues: ProjectSalesValidationIssue[];
}

export interface ProjectSalesFloorValue {
  code: string;
  level: number;
  label: string;
  floorType: ProjectFloorType;
}

export interface ProjectSalesUnitRow {
  sourceRow: number;
  projectCode: string;
  blockCode: string;
  normalizedBlockCode: string;
  floor: ProjectSalesFloorValue;
  number: string;
  inventoryCode: string;
  externalRef: string | null;
  type: UnitType | null;
  roomCount: string | null;
  netArea: number | null;
  grossArea: number | null;
  price: number | null;
  priceCurrency: string;
  status: UnitStatus | null;
  facades: string[];
  deliveryDate: string | null;
  featurePackageCode: string | null;
  features: string[];
  salesRepresentativeEmail: string | null;
  description: string | null;
  action: ProjectSalesPreviewAction;
  existingUnitId: string | null;
  valid: boolean;
  issues: ProjectSalesValidationIssue[];
}

export interface ProjectSalesFeaturePackage {
  code: string;
  features: string[];
}

export interface ProjectSalesPreviewSummary {
  projectCount: number;
  blockCount: number;
  unitCount: number;
  featurePackageCount: number;
  selectedFeatureCount: number;
  validUnitCount: number;
  invalidUnitCount: number;
  duplicateUnitCount: number;
  existingProjectCount: number;
  existingBlockCount: number;
  errorCount: number;
  warningCount: number;
}

export interface ProjectSalesPreviewResult {
  templateVersion: string;
  fileName: string;
  fileSize: number;
  valid: boolean;
  summary: ProjectSalesPreviewSummary;
  projects: ProjectSalesProjectRow[];
  blocks: ProjectSalesBlockRow[];
  units: ProjectSalesUnitRow[];
  featurePackages: ProjectSalesFeaturePackage[];
  issues: ProjectSalesValidationIssue[];
}
