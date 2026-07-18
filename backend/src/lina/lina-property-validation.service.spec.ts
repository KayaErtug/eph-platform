import { UnitType } from "@prisma/client";

import { CrossFieldRuleEngine } from "../property-validation/cross-field-rule.engine";
import { NumericRuleEngine } from "../property-validation/numeric-rule.engine";
import { PropertyValidationService } from "../property-validation/property-validation.service";
import { PropertyValidationContext } from "../property-validation/property-validation.types";
import { LinaPropertyValidationService } from "./lina-property-validation.service";

describe("LinaPropertyValidationService", () => {
  let service: LinaPropertyValidationService;

  beforeEach(() => {
    const propertyValidationService = new PropertyValidationService(
      new NumericRuleEngine(),
      new CrossFieldRuleEngine(),
    );

    service = new LinaPropertyValidationService(
      propertyValidationService,
    );
  });

  it("Lina talebini ortak LINA_ACTION bağlamında doğrular", () => {
    const result = service.validate({
      recordKind: "DEMAND",
      propertyTypes: [UnitType.DAIRE],
      values: {
        minArea: 100,
        maxArea: 2_000,
        roomCounts: ["5+2"],
      },
    });

    expect(result.valid).toBe(true);
    expect(result.requiresConfirmation).toBe(true);
    expect(result.requiredWarningCodes).toEqual([
      "PROPERTY_WARNING_DAIRE_MAX_AREA_VALUE_ABOVE_SOFT_MAX",
    ]);
    expect(result.pendingWarnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          context: PropertyValidationContext.LINA_ACTION,
          propertyType: UnitType.DAIRE,
          field: "maxArea",
          blocking: false,
        }),
      ]),
    );
  });

  it("Lina kullanıcısının warning teyidini ortak motora aktarır", () => {
    const values = {
      minArea: 100,
      maxArea: 2_000,
      roomCounts: ["5+2"],
    };

    const firstResult = service.validate({
      recordKind: "DEMAND",
      propertyTypes: [UnitType.DAIRE],
      values,
    });

    const confirmedResult = service.validate({
      recordKind: "DEMAND",
      propertyTypes: [UnitType.DAIRE],
      values,
      acknowledgedWarningCodes:
        firstResult.requiredWarningCodes,
    });

    expect(confirmedResult.valid).toBe(true);
    expect(confirmedResult.requiresConfirmation).toBe(false);
    expect(confirmedResult.pendingWarnings).toHaveLength(0);
    expect(confirmedResult.acknowledgedWarningCodes).toEqual(
      firstResult.requiredWarningCodes,
    );
  });

  it("Lina üzerinden girilen imkansız değeri engeller", () => {
    const result = service.validate({
      recordKind: "DEMAND",
      propertyTypes: [UnitType.DAIRE],
      values: {
        minArea: 100,
        maxArea: 35_000,
        roomCounts: ["3+1"],
      },
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          context: PropertyValidationContext.LINA_ACTION,
          code: "VALUE_ABOVE_HARD_MAX",
          field: "maxArea",
          blocking: true,
        }),
      ]),
    );
  });
});
