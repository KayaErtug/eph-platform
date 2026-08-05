import {
  getAllSelectionTypeKeys,
  getSelectionFieldRule,
  type SelectionSpecialField,
} from "./stokSelectionAdapter";

export type PortfolioFieldKey =
  | "roomCount"
  | "area"
  | "openArea"
  | "closedArea"
  | "bedCount"
  | "buildingAge"
  | "floor"
  | "totalFloors"
  | "adaNo"
  | "parselNo"
  | "number"
  | "price"
  | "description"
  | "availableCreditAmount";

export type PortfolioSpecialField = SelectionSpecialField;

export type PortfolioFieldRule = {
  type: string;
  requiredFields: PortfolioFieldKey[];
  optionalFields: PortfolioFieldKey[];
  specialFields: PortfolioSpecialField[];
  note?: string;
};

const PORTFOLIO_FIELD_KEYS = new Set<PortfolioFieldKey>([
  "roomCount",
  "area",
  "openArea",
  "closedArea",
  "bedCount",
  "buildingAge",
  "floor",
  "totalFloors",
  "adaNo",
  "parselNo",
  "number",
  "price",
  "description",
  "availableCreditAmount",
]);

function isPortfolioFieldKey(value: string): value is PortfolioFieldKey {
  return PORTFOLIO_FIELD_KEYS.has(value as PortfolioFieldKey);
}

function buildFieldRule(type: string): PortfolioFieldRule {
  const selectionRule = getSelectionFieldRule(type);

  return {
    type: selectionRule.type,
    requiredFields: selectionRule.requiredFields.filter(isPortfolioFieldKey),
    optionalFields: selectionRule.optionalFields.filter(isPortfolioFieldKey),
    specialFields: selectionRule.specialFields,
    note: selectionRule.note,
  };
}

function getSpecialFieldOptions(type: string, key: string) {
  return buildFieldRule(type).specialFields.find((field) => field.key === key)?.options || [];
}

export const VILLA_TYPE_OPTIONS = getSpecialFieldOptions("VILLA", "villaType");
export const VILLA_LAYOUT_OPTIONS = getSpecialFieldOptions("VILLA", "layoutType");
export const POOL_TYPE_OPTIONS = getSpecialFieldOptions("VILLA", "poolType");
export const HOME_TYPE_OPTIONS = getSpecialFieldOptions("MUSTAK_EV", "homeType");
export const RURAL_BUILDING_TYPE_OPTIONS = getSpecialFieldOptions("KOY_EVI", "buildingStyle");
export const YAZLIK_TYPE_OPTIONS = getSpecialFieldOptions("YAZLIK", "summerHouseType");
export const ACCESS_SEASON_OPTIONS = getSpecialFieldOptions("DAG_EVI_YAYLA_EVI", "accessSeason");
export const BUILDING_USAGE_OPTIONS = getSpecialFieldOptions("KOMPLE_BINA", "buildingUsage");
export const BUILDING_ORDER_OPTIONS = getSpecialFieldOptions("APARTMAN", "layoutType");
export const PLAZA_CLASS_OPTIONS = getSpecialFieldOptions("PLAZA_BINA", "plazaClass");
export const STATION_TYPE_OPTIONS = getSpecialFieldOptions("BENZIN_ISTASYONU", "stationType");
export const LAND_ZONING_OPTIONS = getSpecialFieldOptions("ARSA", "zoningType");

export const FIELD_RULES: Record<string, PortfolioFieldRule> = Object.fromEntries(
  getAllSelectionTypeKeys().map((type) => [type, buildFieldRule(type)]),
);

export function getFieldRule(type: string) {
  return FIELD_RULES[type] || FIELD_RULES.DAIRE || buildFieldRule("DAIRE");
}

export function hasRequiredField(type: string, field: PortfolioFieldKey) {
  return getFieldRule(type).requiredFields.includes(field);
}

export function hasOptionalField(type: string, field: PortfolioFieldKey) {
  return getFieldRule(type).optionalFields.includes(field);
}

export function shouldShowField(type: string, field: PortfolioFieldKey) {
  const rule = getFieldRule(type);
  return rule.requiredFields.includes(field) || rule.optionalFields.includes(field);
}

export function getSpecialFields(type: string) {
  return getFieldRule(type).specialFields;
}
