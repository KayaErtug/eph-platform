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

export type PropertyForbiddenFieldRule = {
  field: string;
  label: string;
};

export type PropertyTypeContextRule = {
  numericRules: readonly PropertyNumericRule[];
  rangeRules: readonly PropertyRangeRule[];
  selectionRules: readonly PropertySelectionRule[];
  forbiddenFields: readonly PropertyForbiddenFieldRule[];
};

export type PropertyTypeRuleRegistry = Partial<
  Record<
    UnitType,
    Partial<
      Record<PropertyValidationContext, PropertyTypeContextRule>
    >
  >
>;

export const RESIDENTIAL_ROOM_COUNT_OPTIONS = [
  '1+0',
  '1+1',
  '2+0',
  '2+1',
  '2+2',
  '3+1',
  '3+2',
  '4+1',
  '4+2',
  '5+1',
  '5+2',
  '6+',
  '6+1',
  '6+2',
  '6+3',
  '7+1',
  '7+2',
  '7+3',
  '7+4',
  '8+1',
  '8+2',
  '8+3',
  '8+4',
] as const;

/**
 * Geriye dönük uyumluluk.
 */
export const DAIRE_ROOM_COUNT_OPTIONS =
  RESIDENTIAL_ROOM_COUNT_OPTIONS;

type PropertyFamily =
  | 'APARTMENT'
  | 'VILLA'
  | 'OFFICE'
  | 'COMMERCIAL'
  | 'INDUSTRIAL'
  | 'LAND'
  | 'TOURISM'
  | 'BUILDING';

type FamilyRuleDefinition = {
  numericRules: readonly PropertyNumericRule[];
  forbiddenFields: readonly PropertyForbiddenFieldRule[];
  supportsResidentialRoomCounts: boolean;
};

const HARD_BUDGET_MAX = 999_999_999_999_999;

const COMMON_RANGE_RULES: readonly PropertyRangeRule[] = [
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
  {
    minField: 'minRoom',
    maxField: 'maxRoom',
    label: 'Oda sayısı',
  },
];

const LAND_FORBIDDEN_FIELDS: readonly PropertyForbiddenFieldRule[] = [
  {
    field: 'minRoom',
    label: 'Minimum oda sayısı',
  },
  {
    field: 'maxRoom',
    label: 'Maksimum oda sayısı',
  },
  {
    field: 'roomCounts',
    label: 'Oda tipi',
  },
];

const NON_RESIDENTIAL_ROOM_FORBIDDEN_FIELDS:
  readonly PropertyForbiddenFieldRule[] = [
    {
      field: 'minRoom',
      label: 'Minimum konut oda sayısı',
    },
    {
      field: 'maxRoom',
      label: 'Maksimum konut oda sayısı',
    },
    {
      field: 'roomCounts',
      label: 'Konut oda tipi',
    },
  ];

function buildAreaRules(params: {
  hardMin: number;
  softMin?: number;
  softMax: number;
  hardMax: number;
}): PropertyNumericRule[] {
  return [
    {
      field: 'minArea',
      label: 'Minimum brüt alan',
      hardMin: params.hardMin,
      softMin: params.softMin,
      softMax: params.softMax,
      hardMax: params.hardMax,
      allowZero: false,
    },
    {
      field: 'maxArea',
      label: 'Maksimum brüt alan',
      hardMin: params.hardMin,
      softMin: params.softMin,
      softMax: params.softMax,
      hardMax: params.hardMax,
      allowZero: false,
    },
  ];
}

function buildNetAreaRules(params: {
  hardMin: number;
  softMax: number;
  hardMax: number;
}): PropertyNumericRule[] {
  return [
    {
      field: 'minNetArea',
      label: 'Minimum net alan',
      hardMin: params.hardMin,
      softMax: params.softMax,
      hardMax: params.hardMax,
      allowZero: false,
    },
    {
      field: 'maxNetArea',
      label: 'Maksimum net alan',
      hardMin: params.hardMin,
      softMax: params.softMax,
      hardMax: params.hardMax,
      allowZero: false,
    },
  ];
}

function buildBudgetRules(
  softMax: number,
): PropertyNumericRule[] {
  return [
    {
      field: 'minBudget',
      label: 'Minimum bütçe',
      hardMin: 1,
      softMax,
      hardMax: HARD_BUDGET_MAX,
      allowZero: false,
    },
    {
      field: 'maxBudget',
      label: 'Maksimum bütçe',
      hardMin: 1,
      softMax,
      hardMax: HARD_BUDGET_MAX,
      allowZero: false,
    },
  ];
}

function buildRoomRules(params: {
  hardMin: number;
  softMax: number;
  hardMax: number;
  allowZero: boolean;
}): PropertyNumericRule[] {
  return [
    {
      field: 'minRoom',
      label: 'Minimum oda sayısı',
      hardMin: params.hardMin,
      softMax: params.softMax,
      hardMax: params.hardMax,
      allowZero: params.allowZero,
      integerOnly: true,
    },
    {
      field: 'maxRoom',
      label: 'Maksimum oda sayısı',
      hardMin: params.hardMin,
      softMax: params.softMax,
      hardMax: params.hardMax,
      allowZero: params.allowZero,
      integerOnly: true,
    },
  ];
}

const FAMILY_RULES: Record<PropertyFamily, FamilyRuleDefinition> = {
  APARTMENT: {
    numericRules: [
      ...buildAreaRules({
        hardMin: 10,
        softMin: 25,
        softMax: 1_500,
        hardMax: 5_000,
      }),
      ...buildNetAreaRules({
        hardMin: 8,
        softMax: 1_200,
        hardMax: 4_500,
      }),
      ...buildRoomRules({
        hardMin: 0,
        softMax: 10,
        hardMax: 20,
        allowZero: true,
      }),
      ...buildBudgetRules(1_000_000_000),
    ],
    forbiddenFields: [],
    supportsResidentialRoomCounts: true,
  },

  VILLA: {
    numericRules: [
      ...buildAreaRules({
        hardMin: 20,
        softMin: 60,
        softMax: 5_000,
        hardMax: 20_000,
      }),
      ...buildNetAreaRules({
        hardMin: 15,
        softMax: 4_000,
        hardMax: 18_000,
      }),
      ...buildRoomRules({
        hardMin: 1,
        softMax: 15,
        hardMax: 50,
        allowZero: false,
      }),
      ...buildBudgetRules(5_000_000_000),
    ],
    forbiddenFields: [],
    supportsResidentialRoomCounts: true,
  },

  OFFICE: {
    numericRules: [
      ...buildAreaRules({
        hardMin: 5,
        softMin: 15,
        softMax: 100_000,
        hardMax: 1_000_000,
      }),
      ...buildRoomRules({
        hardMin: 0,
        softMax: 30,
        hardMax: 100,
        allowZero: true,
      }),
      ...buildBudgetRules(50_000_000_000),
    ],
    forbiddenFields: [],
    supportsResidentialRoomCounts: true,
  },

  COMMERCIAL: {
    numericRules: [
      ...buildAreaRules({
        hardMin: 5,
        softMin: 15,
        softMax: 100_000,
        hardMax: 1_000_000,
      }),
      ...buildBudgetRules(50_000_000_000),
    ],
    forbiddenFields: NON_RESIDENTIAL_ROOM_FORBIDDEN_FIELDS,
    supportsResidentialRoomCounts: false,
  },

  INDUSTRIAL: {
    numericRules: [
      ...buildAreaRules({
        hardMin: 20,
        softMin: 100,
        softMax: 2_000_000,
        hardMax: 20_000_000,
      }),
      ...buildBudgetRules(50_000_000_000),
    ],
    forbiddenFields: NON_RESIDENTIAL_ROOM_FORBIDDEN_FIELDS,
    supportsResidentialRoomCounts: false,
  },

  LAND: {
    numericRules: [
      ...buildAreaRules({
        hardMin: 1,
        softMin: 50,
        softMax: 10_000_000,
        hardMax: 1_000_000_000,
      }),
      ...buildBudgetRules(100_000_000_000),
    ],
    forbiddenFields: LAND_FORBIDDEN_FIELDS,
    supportsResidentialRoomCounts: false,
  },

  TOURISM: {
    numericRules: [
      ...buildAreaRules({
        hardMin: 20,
        softMin: 100,
        softMax: 500_000,
        hardMax: 5_000_000,
      }),
      ...buildBudgetRules(500_000_000_000),
    ],
    forbiddenFields: NON_RESIDENTIAL_ROOM_FORBIDDEN_FIELDS,
    supportsResidentialRoomCounts: false,
  },

  BUILDING: {
    numericRules: [
      ...buildAreaRules({
        hardMin: 20,
        softMin: 100,
        softMax: 2_000_000,
        hardMax: 20_000_000,
      }),
      ...buildBudgetRules(500_000_000_000),
    ],
    forbiddenFields: NON_RESIDENTIAL_ROOM_FORBIDDEN_FIELDS,
    supportsResidentialRoomCounts: false,
  },
};

const APARTMENT_TYPES = new Set<UnitType>([
  UnitType.DAIRE,
  UnitType.STUDYO,
  UnitType.REZIDANS,
  UnitType.YALI_DAIRESI,
  UnitType.PENTHOUSE,
  UnitType.LOFT,
  UnitType.TERAS_LOFT,
  UnitType.DUBLEKS,
  UnitType.TRIPLEKS,
  UnitType.LOFT_DUBLEKS,
  UnitType.MARINA_RESIDENCE,
  UnitType.GOLF_RESIDENCE,
  UnitType.SAHIL_RESIDENCE,
  UnitType.DAG_RESIDENCE,
  UnitType.SKY_RESIDENCE,
  UnitType.DEVRE_MULK,
  UnitType.KONUT_PROJESI,
  UnitType.REZIDANS_PROJESI,
]);

const VILLA_TYPES = new Set<UnitType>([
  UnitType.VILLA,
  UnitType.MUSTAK_EV,
  UnitType.KOSK_YALI,
  UnitType.CIFTLIK_EVI,
  UnitType.PREFABRIK_EV,
  UnitType.VILLA_TERAS,
  UnitType.VILLA_GARDEN,
  UnitType.DUBLEKS_VILLA,
  UnitType.TRIPLEKS_VILLA,
  UnitType.KOY_EVI,
  UnitType.TAS_EV,
  UnitType.AHSAP_EV,
  UnitType.CELIK_KONSTRUKSIYON,
  UnitType.TINY_HOUSE,
  UnitType.BUNGALOV,
  UnitType.DAG_EVI,
  UnitType.YAYLA_EVI,
  UnitType.GOL_EVI,
  UnitType.BAG_EVI,
  UnitType.HOBI_BAHCESI_EVI,
  UnitType.MAGARA_EV,
  UnitType.YALI,
  UnitType.KONAK,
  UnitType.OZEL_HAVUZLU_VILLA,
  UnitType.OZEL_ISKELELI_VILLA,
  UnitType.AKILLI_VILLA,
  UnitType.ULTRA_LUKS_VILLA,
  UnitType.YAZLIK,
  UnitType.VILLA_PROJESI,
]);

const OFFICE_TYPES = new Set<UnitType>([
  UnitType.OFIS_BURO,
  UnitType.PLAZA_KATI,
  UnitType.HOME_OFFICE,
  UnitType.MUAYENEHANE,
  UnitType.KLINIK,
  UnitType.IS_HANI_KATI,
  UnitType.IS_MERKEZI,
  UnitType.PAYLASIMLI_OFIS,
]);

const COMMERCIAL_TYPES = new Set<UnitType>([
  UnitType.DUKKAN_MAGAZA,
  UnitType.MARKET,
  UnitType.SHOWROOM,
  UnitType.DUGUN_SALONU,
  UnitType.AKARYAKIT_ISTASYONU,
  UnitType.RESTORAN,
  UnitType.KAFE,
  UnitType.TICARI_ISLETME,
]);

const INDUSTRIAL_TYPES = new Set<UnitType>([
  UnitType.DEPO_ANTREPO,
  UnitType.FABRIKA_ATOLYE,
  UnitType.LOJISTIK_MERKEZI,
  UnitType.URETIM_TESISI,
  UnitType.FABRIKA_URETIM_TESISI,
  UnitType.ATOLYE,
]);

const LAND_TYPES = new Set<UnitType>([
  UnitType.ARSA,
  UnitType.TARLA,
  UnitType.BAHCE,
  UnitType.ZEYTINLIK,
  UnitType.ADA,
  UnitType.KONUT_ARSASI,
  UnitType.VILLA_ARSASI,
  UnitType.TICARI_ARSA,
  UnitType.SANAYI_ARSASI,
  UnitType.TURIZM_IMARLI_ARSA,
  UnitType.BAG,
  UnitType.MEYVE_BAHCESI,
  UnitType.SERA,
  UnitType.BESI_CIFTLIGI,
  UnitType.ORMAN_ARAZISI,
]);

const TOURISM_TYPES = new Set<UnitType>([
  UnitType.OTEL_PANSIYON,
  UnitType.TURISTIK_TESIS,
  UnitType.APART_OTEL,
  UnitType.OTEL_ODASI,
  UnitType.SPOR_TESISI,
  UnitType.OKUL_EGITIM_TESISI,
  UnitType.HASTANE_SAGLIK_TESISI,
  UnitType.OTEL,
  UnitType.BUTIK_OTEL,
  UnitType.MOTEL,
  UnitType.PANSIYON,
  UnitType.KAMP_YERI,
  UnitType.TATIL_KOYU,
]);

function resolvePropertyFamily(
  propertyType: UnitType,
): PropertyFamily {
  if (APARTMENT_TYPES.has(propertyType)) {
    return 'APARTMENT';
  }

  if (VILLA_TYPES.has(propertyType)) {
    return 'VILLA';
  }

  if (OFFICE_TYPES.has(propertyType)) {
    return 'OFFICE';
  }

  if (COMMERCIAL_TYPES.has(propertyType)) {
    return 'COMMERCIAL';
  }

  if (INDUSTRIAL_TYPES.has(propertyType)) {
    return 'INDUSTRIAL';
  }

  if (LAND_TYPES.has(propertyType)) {
    return 'LAND';
  }

  if (TOURISM_TYPES.has(propertyType)) {
    return 'TOURISM';
  }

  return 'BUILDING';
}

function buildContextRule(
  family: PropertyFamily,
  context: PropertyValidationContext,
): PropertyTypeContextRule {
  const definition = FAMILY_RULES[family];

  const selectionRules:
    readonly PropertySelectionRule[] =
    definition.supportsResidentialRoomCounts
      ? [
          {
            field: 'roomCounts',
            allowedValues:
              RESIDENTIAL_ROOM_COUNT_OPTIONS,
            maximumSelections:
              context ===
              PropertyValidationContext.ASSET
                ? 1
                : undefined,
          },
        ]
      : [];

  return {
    numericRules: definition.numericRules,
    rangeRules: COMMON_RANGE_RULES,
    selectionRules,
    forbiddenFields: definition.forbiddenFields,
  };
}

/**
 * Eski dış kullanımlar için tutulur.
 * Kurallar artık aile bazlı dinamik üretilir.
 */
export const PROPERTY_RULE_REGISTRY: PropertyTypeRuleRegistry = {};

export function getPropertyTypeContextRule(
  propertyType: UnitType,
  context: PropertyValidationContext,
): PropertyTypeContextRule {
  return buildContextRule(
    resolvePropertyFamily(propertyType),
    context,
  );
}
