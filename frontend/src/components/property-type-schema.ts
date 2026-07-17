import {
  CATEGORY_OPTIONS,
  CATEGORY_TYPE_MAP,
  MAIN_CATEGORY_OPTIONS,
  TYPE_LABELS,
} from "@/components/stok/stokConstants";
import {
  getFieldRule,
  getSpecialFields,
  type PortfolioFieldKey,
  type PortfolioSpecialField,
} from "@/components/stok/stokFieldRules";
import { getFeaturePresetKeys } from "@/components/stok/stokFeaturePresets";

export type PropertySchemaRecordKind = "ASSET" | "DEMAND";

export type PropertyTypeOption = {
  type: string;
  label: string;
  mainCategory: string;
  subCategory: string;
};

export type PropertyTypeSchema = PropertyTypeOption & {
  recordKind: PropertySchemaRecordKind;
  requiredFields: PortfolioFieldKey[];
  optionalFields: PortfolioFieldKey[];
  visibleFields: PortfolioFieldKey[];
  specialFields: PortfolioSpecialField[];
  featureGroupKeys: string[];
};

const DEMAND_EXCLUDED_FIELDS = new Set<PortfolioFieldKey>([
  "number",
  "price",
  "description",
]);

function buildPropertyTypeOptions(): PropertyTypeOption[] {
  const result: PropertyTypeOption[] = [];

  for (const mainCategory of MAIN_CATEGORY_OPTIONS) {
    const subCategories = CATEGORY_OPTIONS[mainCategory] || [];

    for (const subCategory of subCategories) {
      const type = CATEGORY_TYPE_MAP[mainCategory]?.[subCategory];

      if (!type) {
        continue;
      }

      result.push({
        type,
        label: TYPE_LABELS[type] || subCategory,
        mainCategory,
        subCategory,
      });
    }
  }

  return result;
}

export const PROPERTY_TYPE_OPTIONS = buildPropertyTypeOptions();

const PROPERTY_TYPE_OPTION_MAP = new Map(
  PROPERTY_TYPE_OPTIONS.map((option) => [option.type, option]),
);

export function isKnownPropertyType(type?: string | null): boolean {
  const normalized = String(type || "").trim().toUpperCase();
  return PROPERTY_TYPE_OPTION_MAP.has(normalized);
}

export function normalizePropertyTypeCode(
  type?: string | null,
): string | null {
  const normalized = String(type || "").trim().toUpperCase();

  return PROPERTY_TYPE_OPTION_MAP.has(normalized)
    ? normalized
    : null;
}

export function getPropertyTypeOption(
  type?: string | null,
): PropertyTypeOption | null {
  const normalizedType = normalizePropertyTypeCode(type);

  if (!normalizedType) {
    return null;
  }

  return PROPERTY_TYPE_OPTION_MAP.get(normalizedType) || null;
}

export function getPropertyTypeSchema(
  type?: string | null,
  recordKind: PropertySchemaRecordKind = "ASSET",
): PropertyTypeSchema | null {
  const option = getPropertyTypeOption(type);

  if (!option) {
    return null;
  }

  const rule = getFieldRule(option.type);
  const assetVisibleFields = Array.from(
    new Set<PortfolioFieldKey>([
      ...rule.requiredFields,
      ...rule.optionalFields,
    ]),
  );

  if (recordKind === "DEMAND") {
    const demandVisibleFields = assetVisibleFields.filter(
      (field) => !DEMAND_EXCLUDED_FIELDS.has(field),
    );

    return {
      ...option,
      recordKind,
      requiredFields: [],
      optionalFields: demandVisibleFields,
      visibleFields: demandVisibleFields,
      specialFields: getSpecialFields(option.type).map((field) => ({
        ...field,
        required: false,
        options: [...field.options],
      })),
      featureGroupKeys: [...getFeaturePresetKeys(option.type)],
    };
  }

  return {
    ...option,
    recordKind,
    requiredFields: [...rule.requiredFields],
    optionalFields: [...rule.optionalFields],
    visibleFields: assetVisibleFields,
    specialFields: getSpecialFields(option.type).map((field) => ({
      ...field,
      options: [...field.options],
    })),
    featureGroupKeys: [...getFeaturePresetKeys(option.type)],
  };
}

export function getAllPropertyTypeSchemas(
  recordKind: PropertySchemaRecordKind = "ASSET",
): PropertyTypeSchema[] {
  return PROPERTY_TYPE_OPTIONS
    .map((option) => getPropertyTypeSchema(option.type, recordKind))
    .filter((schema): schema is PropertyTypeSchema => Boolean(schema));
}

export function getPropertyTypesByMainCategory(
  mainCategory: string,
): PropertyTypeOption[] {
  return PROPERTY_TYPE_OPTIONS.filter(
    (option) => option.mainCategory === mainCategory,
  );
}

export function propertyTypeSupportsField(
  type: string,
  field: PortfolioFieldKey,
  recordKind: PropertySchemaRecordKind = "ASSET",
): boolean {
  return Boolean(
    getPropertyTypeSchema(type, recordKind)?.visibleFields.includes(field),
  );
}

export function propertyTypeRequiresField(
  type: string,
  field: PortfolioFieldKey,
  recordKind: PropertySchemaRecordKind = "ASSET",
): boolean {
  return Boolean(
    getPropertyTypeSchema(type, recordKind)?.requiredFields.includes(field),
  );
}

export function propertyTypeSupportsRoomCount(
  type: string,
  recordKind: PropertySchemaRecordKind = "ASSET",
): boolean {
  return propertyTypeSupportsField(type, "roomCount", recordKind);
}
