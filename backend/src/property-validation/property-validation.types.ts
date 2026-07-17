import type { UnitType } from '@prisma/client';

import type {
  PropertyCriteriaRecordKind,
  PropertyCriteriaSource,
} from '../property-criteria/property-criteria.types';

export const PROPERTY_VALIDATION_VERSION = '1.0.0' as const;

export enum PropertyValidationSeverity {
  ERROR = 'ERROR',
  CONFLICT = 'CONFLICT',
  WARNING = 'WARNING',
  EVIDENCE_REQUIRED = 'EVIDENCE_REQUIRED',
  DYNAMIC_INFORMATION = 'DYNAMIC_INFORMATION',
}

export enum PropertyValidationContext {
  ASSET = 'ASSET',
  DEMAND = 'DEMAND',
  CRM_DEMAND = 'CRM_DEMAND',
  PROJECT_UNIT = 'PROJECT_UNIT',
  BULK_IMPORT = 'BULK_IMPORT',
  LINA_ACTION = 'LINA_ACTION',
}

export enum PropertyLegalContext {
  EXISTING_STOCK = 'EXISTING_STOCK',
  NEW_PROJECT = 'NEW_PROJECT',
  RENOVATION = 'RENOVATION',
  UNKNOWN = 'UNKNOWN',
}

export type PropertyValidationValues = Readonly<Record<string, unknown>>;

export type PropertyValidationEvidence = Readonly<Record<string, unknown>>;

export type PropertyValidationInput = {
  context: PropertyValidationContext;
  recordKind: PropertyCriteriaRecordKind;
  source: PropertyCriteriaSource;
  sourceId?: string | null;

  propertyTypes: readonly UnitType[];
  values: PropertyValidationValues;

  legalContext?: PropertyLegalContext;
  acknowledgedWarningCodes?: readonly string[];
  evidence?: PropertyValidationEvidence;
};

export type PropertyValidationExpectedValue = {
  min?: number;
  max?: number;
  allowedValues?: readonly string[];
  description?: string;
};

export type PropertyValidationIssue = {
  ruleId: string;
  code: string;
  severity: PropertyValidationSeverity;
  blocking: boolean;

  context: PropertyValidationContext;
  propertyType: UnitType | null;

  field: string | null;
  relatedFields: readonly string[];

  message: string;
  actualValue?: unknown;
  expected?: PropertyValidationExpectedValue;
  metadata?: Readonly<Record<string, unknown>>;
};

export type PropertyValidationResult = {
  version: typeof PROPERTY_VALIDATION_VERSION;

  valid: boolean;
  requiresConfirmation: boolean;
  requiresEvidence: boolean;

  issues: PropertyValidationIssue[];

  errors: PropertyValidationIssue[];
  conflicts: PropertyValidationIssue[];
  warnings: PropertyValidationIssue[];
  evidenceRequests: PropertyValidationIssue[];
  dynamicInformation: PropertyValidationIssue[];
};

export type PropertyValidationRule = {
  id: string;
  description: string;

  contexts: readonly PropertyValidationContext[];
  propertyTypes?: readonly UnitType[];

  validate(input: PropertyValidationInput): PropertyValidationIssue[];
};
