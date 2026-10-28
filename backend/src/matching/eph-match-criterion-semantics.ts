export type EphCriterionOperator =
  | 'MINIMUM'
  | 'MAXIMUM'
  | 'ORDERED_MINIMUM'
  | 'EXACT_OR_ANY'
  | 'REQUIRED_OR_ANY'
  | 'PREFERENCE'
  | 'MAXIMUM_DATE';

export type EphCriterionStrength = 'HARD' | 'SOFT';

export type EphCriterionSemantic = {
  operator: EphCriterionOperator;
  strength: EphCriterionStrength;
};

const soft = (
  operator: EphCriterionOperator,
): EphCriterionSemantic => ({
  operator,
  strength: 'SOFT',
});

export const CARD_PROFILE_CRITERION_SEMANTICS: Readonly<
  Record<string, Readonly<Record<string, EphCriterionSemantic>>>
> = {
  DAIRE: {
    roomCount: soft('ORDERED_MINIMUM'),
    netArea: soft('MINIMUM'),
    floor: soft('PREFERENCE'),
    buildingAge: soft('MAXIMUM'),
    heatingType: soft('EXACT_OR_ANY'),
    parkingType: soft('REQUIRED_OR_ANY'),
    facade: soft('EXACT_OR_ANY'),
    elevatorStatus: soft('REQUIRED_OR_ANY'),
  },

  VILLA_MUSTAKIL: {
    roomCount: soft('ORDERED_MINIMUM'),
    netArea: soft('MINIMUM'),
    landArea: soft('MINIMUM'),
    structureType: soft('EXACT_OR_ANY'),
    buildingAge: soft('MAXIMUM'),
    poolType: soft('REQUIRED_OR_ANY'),
    gardenStatus: soft('REQUIRED_OR_ANY'),
    parkingType: soft('REQUIRED_OR_ANY'),
  },

  ARSA_IMARLI: {
    area: soft('MINIMUM'),
    zoningType: soft('EXACT_OR_ANY'),
    zoningKaks: soft('MINIMUM'),
    zoningTaks: soft('MINIMUM'),
    floorPermit: soft('MINIMUM'),
    facade: soft('EXACT_OR_ANY'),
    roadStatus: soft('REQUIRED_OR_ANY'),
    infrastructureStatus: soft('REQUIRED_OR_ANY'),
  },

  SANAYI_ARSASI: {
    area: soft('MINIMUM'),
    industrialZoning: soft('EXACT_OR_ANY'),
    zoningKaks: soft('MINIMUM'),
    electricityPower: soft('MINIMUM'),
    naturalGasStatus: soft('REQUIRED_OR_ANY'),
    tirEntranceStatus: soft('REQUIRED_OR_ANY'),
    roadWidth: soft('MINIMUM'),
    osbDistance: soft('MAXIMUM'),
  },

  TARLA: {
    area: soft('MINIMUM'),
    titleDeedType: soft('EXACT_OR_ANY'),
    agricultureType: soft('EXACT_OR_ANY'),
    waterStatus: soft('REQUIRED_OR_ANY'),
    electricityStatus: soft('REQUIRED_OR_ANY'),
    roadFrontage: soft('REQUIRED_OR_ANY'),
    villageDistance: soft('MAXIMUM'),
    altitude: soft('PREFERENCE'),
  },

  BAG: {
    area: soft('MINIMUM'),
    cropType: soft('EXACT_OR_ANY'),
    vineyardArea: soft('MINIMUM'),
    irrigationStatus: soft('REQUIRED_OR_ANY'),
    electricityStatus: soft('REQUIRED_OR_ANY'),
    roadStatus: soft('REQUIRED_OR_ANY'),
    warehouseStatus: soft('REQUIRED_OR_ANY'),
    fencingStatus: soft('REQUIRED_OR_ANY'),
  },

  BAHCE: {
    area: soft('MINIMUM'),
    treeCount: soft('MINIMUM'),
    cropType: soft('EXACT_OR_ANY'),
    irrigationStatus: soft('REQUIRED_OR_ANY'),
    electricityStatus: soft('REQUIRED_OR_ANY'),
    roadStatus: soft('REQUIRED_OR_ANY'),
    warehouseStatus: soft('REQUIRED_OR_ANY'),
    fencingStatus: soft('REQUIRED_OR_ANY'),
  },

  ZEYTINLIK: {
    area: soft('MINIMUM'),
    oliveTreeCount: soft('MINIMUM'),
    averageTreeAge: soft('PREFERENCE'),
    irrigationStatus: soft('REQUIRED_OR_ANY'),
    electricityStatus: soft('REQUIRED_OR_ANY'),
    roadStatus: soft('REQUIRED_OR_ANY'),
    yieldStatus: soft('EXACT_OR_ANY'),
    harvestInfo: soft('PREFERENCE'),
  },

  DUKKAN: {
    area: soft('MINIMUM'),
    floor: soft('PREFERENCE'),
    facade: soft('EXACT_OR_ANY'),
    streetFrontageStatus: soft('REQUIRED_OR_ANY'),
    buildingAge: soft('MAXIMUM'),
    heatingType: soft('EXACT_OR_ANY'),
    parkingType: soft('REQUIRED_OR_ANY'),
    usageStatus: soft('EXACT_OR_ANY'),
  },

  OFIS: {
    area: soft('MINIMUM'),
    floor: soft('PREFERENCE'),
    roomCount: soft('ORDERED_MINIMUM'),
    buildingAge: soft('MAXIMUM'),
    heatingType: soft('EXACT_OR_ANY'),
    parkingType: soft('REQUIRED_OR_ANY'),
    elevatorStatus: soft('REQUIRED_OR_ANY'),
    usageStatus: soft('EXACT_OR_ANY'),
  },

  FABRIKA: {
    closedArea: soft('MINIMUM'),
    openArea: soft('MINIMUM'),
    electricityPower: soft('MINIMUM'),
    ceilingHeight: soft('MINIMUM'),
    tirEntranceStatus: soft('REQUIRED_OR_ANY'),
    loadingRampStatus: soft('REQUIRED_OR_ANY'),
    officeArea: soft('MINIMUM'),
    fireSystemStatus: soft('REQUIRED_OR_ANY'),
  },

  DEPO: {
    closedArea: soft('MINIMUM'),
    openArea: soft('MINIMUM'),
    ceilingHeight: soft('MINIMUM'),
    shelvingSystemStatus: soft('REQUIRED_OR_ANY'),
    tirEntranceStatus: soft('REQUIRED_OR_ANY'),
    loadingArea: soft('MINIMUM'),
    fireSystemStatus: soft('REQUIRED_OR_ANY'),
    securityStatus: soft('REQUIRED_OR_ANY'),
  },

  OTEL_TURISTIK: {
    roomCount: soft('MINIMUM'),
    bedCount: soft('MINIMUM'),
    tourismCategory: soft('ORDERED_MINIMUM'),
    operatingStatus: soft('EXACT_OR_ANY'),
    licenseStatus: soft('REQUIRED_OR_ANY'),
    occupancyRate: soft('MINIMUM'),
    locationType: soft('EXACT_OR_ANY'),
    distanceInfo: soft('MAXIMUM'),
  },

  PROJE_INSAAT: {
    unitCount: soft('MINIMUM'),
    unitsForSale: soft('MINIMUM'),
    deliveryDate: soft('MAXIMUM_DATE'),
    projectStatus: soft('ORDERED_MINIMUM'),
    landArea: soft('MINIMUM'),
    totalFloors: soft('MINIMUM'),
    licenseStatus: soft('REQUIRED_OR_ANY'),
    presaleStatus: soft('EXACT_OR_ANY'),
  },
};

const ANY_VALUES = new Set([
  'FARKETMEZ',
  'FARK ETMEZ',
  'ANY',
  '__ANY__',
]);

function normalize(value: unknown) {
  return String(value ?? '')
    .trim()
    .toLocaleUpperCase('tr-TR');
}

function isAny(value: unknown) {
  return ANY_VALUES.has(normalize(value));
}

function numberFrom(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  let text = String(value ?? '').trim();
  if (!text) return null;

  const match = text.match(/-?[\d.,]+/);
  if (!match) return null;

  text = match[0];

  if (text.includes(',')) {
    text = text.replace(/\./g, '').replace(',', '.');
  } else {
    const dotCount = (text.match(/\./g) || []).length;

    if (dotCount > 1) {
      text = text.replace(/\./g, '');
    } else if (dotCount === 1) {
      const parts = text.split('.');

      if (
        parts.length === 2 &&
        parts[1].length === 3 &&
        parts[0] !== '0'
      ) {
        text = parts.join('');
      }
    }
  }

  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
}

function roomRank(value: unknown): number | null {
  const normalized = normalize(value);

  const match = normalized.match(/^(\d+)\s*\+\s*(\d+)$/);

  if (!match) {
    return numberFrom(value);
  }

  const main = Number(match[1]);
  const secondary = Number(match[2]);

  return main * 100 + secondary;
}

export function getCriterionSemantic(
  profile: string,
  key: string,
): EphCriterionSemantic {
  return (
    CARD_PROFILE_CRITERION_SEMANTICS[profile]?.[key] ??
    soft('EXACT_OR_ANY')
  );
}

export function matchesCriterion(
  operator: EphCriterionOperator,
  expectedValues: readonly unknown[],
  actualValue: unknown,
): boolean {
  if (
    expectedValues.length === 0 ||
    expectedValues.some(isAny)
  ) {
    return true;
  }

  if (expectedValues.length > 1) {
    return expectedValues.some((expected) =>
      matchesCriterion(operator, [expected], actualValue),
    );
  }

  const actualText = normalize(actualValue);

  if (!actualText) return false;

  if (
    operator === 'EXACT_OR_ANY' ||
    operator === 'REQUIRED_OR_ANY' ||
    operator === 'PREFERENCE'
  ) {
    return expectedValues.some(
      (expected) => normalize(expected) === actualText,
    );
  }

  const expected = expectedValues[0];

  if (operator === 'ORDERED_MINIMUM') {
    const expectedRank = roomRank(expected);
    const actualRank = roomRank(actualValue);

    if (
      expectedRank !== null &&
      actualRank !== null
    ) {
      return actualRank >= expectedRank;
    }

    return normalize(expected) === actualText;
  }

  if (operator === 'MINIMUM') {
    const expectedNumber = numberFrom(expected);
    const actualNumber = numberFrom(actualValue);

    return (
      expectedNumber !== null &&
      actualNumber !== null &&
      actualNumber >= expectedNumber
    );
  }

  if (operator === 'MAXIMUM') {
    const expectedNumber = numberFrom(expected);
    const actualNumber = numberFrom(actualValue);

    return (
      expectedNumber !== null &&
      actualNumber !== null &&
      actualNumber <= expectedNumber
    );
  }

  if (operator === 'MAXIMUM_DATE') {
    const expectedDate = Date.parse(String(expected ?? ''));
    const actualDate = Date.parse(String(actualValue ?? ''));

    return (
      Number.isFinite(expectedDate) &&
      Number.isFinite(actualDate) &&
      actualDate <= expectedDate
    );
  }

  return false;
}
