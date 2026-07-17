import { UnitStatus, UnitType } from '@prisma/client';

export const PROPERTY_CRITERIA_VERSION = '1.0.0' as const;

export type PropertyCriteriaRecordKind = 'ASSET' | 'DEMAND';

export type PropertyCriteriaSource =
  | 'PORTFOLIO'
  | 'POOL'
  | 'CRM'
  | 'REQUEST_CENTER'
  | 'PROJECT_UNIT'
  | 'LINA'
  | 'UNKNOWN';

export type PropertyCriteriaAreaInput = {
  country?: unknown;
  city?: unknown;
  district?: unknown;
  neighborhood?: unknown;
  latitude?: unknown;
  longitude?: unknown;
};

export type PropertyCriteriaArea = {
  country: string;
  city: string;
  district: string;
  neighborhood: string;
  latitude: number | null;
  longitude: number | null;
};

export type PropertyCriteriaRange = {
  min: number | null;
  max: number | null;
};

export type PropertyCriteriaInput = {
  recordKind: PropertyCriteriaRecordKind;
  source?: PropertyCriteriaSource;
  sourceId?: unknown;

  areas?: unknown;
  country?: unknown;
  city?: unknown;
  district?: unknown;
  neighborhood?: unknown;
  latitude?: unknown;
  longitude?: unknown;

  propertyTypes?: unknown;
  propertyType?: unknown;
  statuses?: unknown;
  status?: unknown;

  price?: unknown;
  minBudget?: unknown;
  maxBudget?: unknown;
  priceCurrency?: unknown;

  area?: unknown;
  grossArea?: unknown;
  minArea?: unknown;
  maxArea?: unknown;

  netArea?: unknown;
  minNetArea?: unknown;
  maxNetArea?: unknown;

  roomCounts?: unknown;
  roomCount?: unknown;
  features?: unknown;

  availableCreditAmount?: unknown;
  isActive?: unknown;
};

export type NormalizedPropertyCriteria = {
  version: typeof PROPERTY_CRITERIA_VERSION;
  recordKind: PropertyCriteriaRecordKind;
  source: PropertyCriteriaSource;
  sourceId: string | null;

  areas: PropertyCriteriaArea[];
  propertyTypes: UnitType[];
  statuses: UnitStatus[];

  budget: PropertyCriteriaRange;
  priceCurrency: string;

  grossArea: PropertyCriteriaRange;
  netArea: PropertyCriteriaRange;

  roomCounts: string[];
  features: string[];

  availableCreditAmount: number | null;
  isActive: boolean;
};
