import { UnitType } from '@prisma/client';

import { CrossFieldRuleEngine } from './cross-field-rule.engine';
import { NumericRuleEngine } from './numeric-rule.engine';
import { PropertyValidationService } from './property-validation.service';
import {
  PropertyValidationContext,
  PropertyValidationInput,
} from './property-validation.types';

describe('PropertyValidationService', () => {
  let service: PropertyValidationService;

  beforeEach(() => {
    service = new PropertyValidationService(
      new NumericRuleEngine(),
      new CrossFieldRuleEngine(),
    );
  });

  function createDemandInput(
    values: Record<string, unknown>,
    propertyType: UnitType = UnitType.DAIRE,
  ): PropertyValidationInput {
    return {
      context: PropertyValidationContext.DEMAND,
      recordKind: 'DEMAND',
      source: 'REQUEST_CENTER',
      propertyTypes: [propertyType],
      values,
    };
  }

  it('daire için 2 m² minimum alanı reddeder', () => {
    const result = service.validate(
      createDemandInput({
        minArea: 2,
        maxArea: 100,
        roomCounts: ['2+1'],
      }),
    );

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'VALUE_BELOW_HARD_MIN',
          field: 'minArea',
          blocking: true,
        }),
      ]),
    );
  });

  it('daire için 35.000 m² maksimum alanı reddeder', () => {
    const result = service.validate(
      createDemandInput({
        minArea: 100,
        maxArea: 35_000,
        roomCounts: ['3+1'],
      }),
    );

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'VALUE_ABOVE_HARD_MAX',
          field: 'maxArea',
          blocking: true,
        }),
      ]),
    );
  });

  it('minimum alan maksimum alandan büyükse conflict üretir', () => {
    const result = service.validate(
      createDemandInput({
        minArea: 200,
        maxArea: 100,
        roomCounts: ['3+1'],
      }),
    );

    expect(result.valid).toBe(false);
    expect(result.conflicts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'MINIMUM_GREATER_THAN_MAXIMUM',
          field: 'minArea',
          relatedFields: ['maxArea'],
          blocking: true,
        }),
      ]),
    );
  });

  it('talepte birden fazla oda tipi seçilmesine izin verir', () => {
    const result = service.validate(
      createDemandInput({
        minArea: 80,
        maxArea: 180,
        minBudget: 2_000_000,
        maxBudget: 8_000_000,
        roomCounts: ['2+1', '3+1', '4+1'],
      }),
    );

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.conflicts).toHaveLength(0);
  });

  it('portföyde birden fazla oda tipi seçimini reddeder', () => {
    const result = service.validate({
      context: PropertyValidationContext.ASSET,
      recordKind: 'ASSET',
      source: 'PORTFOLIO',
      propertyTypes: [UnitType.DAIRE],
      values: {
        minArea: 120,
        maxArea: 120,
        minBudget: 5_000_000,
        maxBudget: 5_000_000,
        roomCounts: ['2+1', '3+1'],
      },
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'MAXIMUM_SELECTION_EXCEEDED',
          field: 'roomCounts',
        }),
      ]),
    );
  });

  it('olağan dışı fakat mümkün değerde warning üretir', () => {
    const result = service.validate(
      createDemandInput({
        minArea: 100,
        maxArea: 2_000,
        roomCounts: ['5+2'],
      }),
    );

    expect(result.valid).toBe(true);
    expect(result.requiresConfirmation).toBe(true);
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'VALUE_ABOVE_SOFT_MAX',
          field: 'maxArea',
          blocking: false,
        }),
      ]),
    );
  });

  it('geçersiz oda tipini reddeder', () => {
    const result = service.validate(
      createDemandInput({
        minArea: 80,
        maxArea: 180,
        roomCounts: ['1599'],
      }),
    );

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'SELECTION_VALUE_NOT_ALLOWED',
          field: 'roomCounts',
        }),
      ]),
    );
  });
  it('villa için astronomik metrekareyi reddeder', () => {
    const result = service.validate(
      createDemandInput(
        {
          minArea: 150,
          maxArea: 36_963_696_666,
          minRoom: 4,
          maxRoom: 8,
        },
        UnitType.VILLA,
      ),
    );

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'VALUE_ABOVE_HARD_MAX',
          field: 'maxArea',
          blocking: true,
        }),
      ]),
    );
  });

  it('villa için astronomik oda sayısını reddeder', () => {
    const result = service.validate(
      createDemandInput(
        {
          minArea: 150,
          maxArea: 250,
          minRoom: 4,
          maxRoom: 36_363_636_363,
        },
        UnitType.VILLA,
      ),
    );

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'VALUE_ABOVE_HARD_MAX',
          field: 'maxRoom',
          blocking: true,
        }),
      ]),
    );
  });

  it('normal villa talebini kabul eder', () => {
    const result = service.validate(
      createDemandInput(
        {
          minArea: 150,
          maxArea: 250,
          minRoom: 4,
          maxRoom: 8,
          minBudget: 11_000_000,
          maxBudget: 25_000_000,
        },
        UnitType.VILLA,
      ),
    );

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.conflicts).toHaveLength(0);
  });

  it('arsa talebinde oda sayısını reddeder', () => {
    const result = service.validate(
      createDemandInput(
        {
          minArea: 500,
          maxArea: 5_000,
          minRoom: 2,
          maxRoom: 4,
        },
        UnitType.ARSA,
      ),
    );

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code:
            'FIELD_NOT_ALLOWED_FOR_PROPERTY_TYPE',
          field: 'minRoom',
          blocking: true,
        }),
        expect.objectContaining({
          code:
            'FIELD_NOT_ALLOWED_FOR_PROPERTY_TYPE',
          field: 'maxRoom',
          blocking: true,
        }),
      ]),
    );
  });

  it('minimum bütçe maksimum bütçeden büyükse engeller', () => {
    const result = service.validate(
      createDemandInput(
        {
          minArea: 100,
          maxArea: 200,
          minBudget: 30_000_000,
          maxBudget: 10_000_000,
        },
        UnitType.DAIRE,
      ),
    );

    expect(result.valid).toBe(false);
    expect(result.conflicts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'MINIMUM_GREATER_THAN_MAXIMUM',
          field: 'minBudget',
          relatedFields: ['maxBudget'],
        }),
      ]),
    );
  });

  it('sıfır bütçeyi reddeder', () => {
    const result = service.validate(
      createDemandInput(
        {
          minArea: 100,
          maxArea: 200,
          minBudget: 0,
          maxBudget: 10_000_000,
        },
        UnitType.DAIRE,
      ),
    );

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'ZERO_VALUE_NOT_ALLOWED',
          field: 'minBudget',
        }),
      ]),
    );
  });

});
