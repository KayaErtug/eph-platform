import { UnitType } from '@prisma/client';

import { PropertyValidationContext } from './property-validation.types';

export type PropertyNumericRule = {
  field: string;
  label: string;
  hardMin?: number;
  softMin?: number;
  softMax?: number;
  hardMax?: number;
  allowZero?: boolean;
  integerOnly?: boolean;
};

export type PropertyRangeRule = {
  minField: string;
  maxField: string;
  label: string;
};

export type PropertySelectionRule = {
  field: string;
  allowedValues: readonly string[];
  minimumSelections?: number;
  maximumSelections?: number;
};

export type PropertyTypeContextRule = {
  numericRules: readonly PropertyNumericRule[];
  rangeRules: readonly PropertyRangeRule[];
  selectionRules: readonly PropertySelectionRule[];
};

export type PropertyTypeRuleRegistry = Partial<
  Record<
    UnitType,
    Partial<
      Record<PropertyValidationContext, PropertyTypeContextRule>
    >
  >
>;

export const DAIRE_ROOM_COUNT_OPTIONS = [
  '1+0',
  '1+1',
  '2+1',
  '2+2',
  '3+1',
  '3+2',
  '4+1',
  '4+2',
  '5+1',
  '5+2',
  '6+',
] as const;

const DAIRE_COMMON_NUMERIC_RULES: readonly PropertyNumericRule[] = [
  {
    field: 'minArea',
    label: 'Minimum brüt alan',
    hardMin: 10,
    softMax: 1500,
    hardMax: 5000,
    allowZero: false,
  },
  {
    field: 'maxArea',
    label: 'Maksimum brüt alan',
    hardMin: 10,
    softMax: 1500,
    hardMax: 5000,
    allowZero: false,
  },
  {
    field: 'minNetArea',
    label: 'Minimum net alan',
    hardMin: 8,
    softMax: 1200,
    hardMax: 4500,
    allowZero: false,
  },
  {
    field: 'maxNetArea',
    label: 'Maksimum net alan',
    hardMin: 8,
    softMax: 1200,
    hardMax: 4500,
    allowZero: false,
  },
  {
    field: 'minBudget',
    label: 'Minimum bütçe',
    hardMin: 1,
    softMax: 1_000_000_000,
    hardMax: 100_000_000_000,
    allowZero: false,
  },
  {
    field: 'maxBudget',
    label: 'Maksimum bütçe',
    hardMin: 1,
    softMax: 1_000_000_000,
    hardMax: 100_000_000_000,
    allowZero: false,
  },
];

const DAIRE_COMMON_RANGE_RULES: readonly PropertyRangeRule[] = [
  {
    minField: 'minArea',
    maxField: 'maxArea',
    label: 'Brüt alan',
  },
  {
    minField: 'minNetArea',
    maxField: 'maxNetArea',
    label: 'Net alan',
  },
  {
    minField: 'minBudget',
    maxField: 'maxBudget',
    label: 'Bütçe',
  },
];

export const PROPERTY_RULE_REGISTRY: PropertyTypeRuleRegistry = {
  [UnitType.DAIRE]: {
    [PropertyValidationContext.ASSET]: {
      numericRules: DAIRE_COMMON_NUMERIC_RULES,
      rangeRules: DAIRE_COMMON_RANGE_RULES,
      selectionRules: [
        {
          field: 'roomCounts',
          allowedValues: DAIRE_ROOM_COUNT_OPTIONS,
          minimumSelections: 1,
          maximumSelections: 1,
        },
      ],
    },

    [PropertyValidationContext.DEMAND]: {
      numericRules: DAIRE_COMMON_NUMERIC_RULES,
      rangeRules: DAIRE_COMMON_RANGE_RULES,
      selectionRules: [
        {
          field: 'roomCounts',
          allowedValues: DAIRE_ROOM_COUNT_OPTIONS,
          minimumSelections: 1,
        },
      ],
    },

    [PropertyValidationContext.CRM_DEMAND]: {
      numericRules: DAIRE_COMMON_NUMERIC_RULES,
      rangeRules: DAIRE_COMMON_RANGE_RULES,
      selectionRules: [
        {
          field: 'roomCounts',
          allowedValues: DAIRE_ROOM_COUNT_OPTIONS,
          minimumSelections: 1,
        },
      ],
    },
  },
};

export function getPropertyTypeContextRule(
  propertyType: UnitType,
  context: PropertyValidationContext,
): PropertyTypeContextRule | null {
  return PROPERTY_RULE_REGISTRY[propertyType]?.[context] ?? null;
}
