import { UnitType } from "@prisma/client";

import { CrossFieldRuleEngine } from "../../property-validation/cross-field-rule.engine";
import { NumericRuleEngine } from "../../property-validation/numeric-rule.engine";
import { PropertyValidationService } from "../../property-validation/property-validation.service";
import { LinaPropertyValidationService } from "../lina-property-validation.service";
import { LinaPortfolioApprovalValidationService } from "./lina-portfolio-approval-validation.service";
import type { LinaPortfolioSessionContext } from "./lina-portfolio-session.service";

describe("LinaPortfolioApprovalValidationService", () => {
  let service: LinaPortfolioApprovalValidationService;

  beforeEach(() => {
    const propertyValidationService = new PropertyValidationService(
      new NumericRuleEngine(),
      new CrossFieldRuleEngine(),
    );

    const linaPropertyValidationService =
      new LinaPropertyValidationService(
        propertyValidationService,
      );

    service = new LinaPortfolioApprovalValidationService(
      linaPropertyValidationService,
    );
  });

  function createSession(
    overrides: Partial<LinaPortfolioSessionContext> = {},
  ): LinaPortfolioSessionContext {
    return {
      id: "lina-session-1",
      userId: "user-1",
      mode: "PORTFOLIO_CREATE",
      sessionType: "PORTFOLIO_DRAFT",
      step: "SUMMARY",
      status: "READY_FOR_CONFIRMATION",
      confirmationStatus: "WAITING",
      title: "Deneme portföyü",
      titleSkipped: false,
      city: "Denizli",
      district: "Merkezefendi",
      neighborhood: "Yenişehir",
      mainCategory: "KONUT",
      propertyType: "DAIRE",
      transactionType: "SATILIK",
      roomCount: "3+1",
      squareMeter: 120,
      buildingAge: "5",
      floor: "2. Kat",
      buildingFloorCount: 5,
      adaNo: null,
      adaNoSkipped: true,
      parselNo: null,
      parselNoSkipped: true,
      unitNumber: null,
      unitNumberSkipped: true,
      currency: "TRY",
      currencyConfirmed: true,
      price: 5_000_000,
      missingFields: [],
      state: {},
      expiresAt: null,
      lastActivityAt: new Date(),
      ...overrides,
    };
  }

  it("normal portföyü ortak motorla kabul eder", () => {
    const result = service.validateForApproval(
      createSession(),
    );

    expect(result.valid).toBe(true);
    expect(result.requiresConfirmation).toBe(false);
    expect(result.errors).toHaveLength(0);
    expect(result.conflicts).toHaveLength(0);
  });

  it("olağan dışı villa alanında warning üretir", () => {
    const result = service.validateForApproval(
      createSession({
        propertyType: UnitType.VILLA,
        roomCount: "5+2",
        squareMeter: 7_500,
        price: 25_000_000,
      }),
    );

    expect(result.valid).toBe(true);
    expect(result.requiresConfirmation).toBe(true);
    expect(result.requiredWarningCodes).toEqual([
      "PROPERTY_WARNING_VILLA_MAX_AREA_VALUE_ABOVE_SOFT_MAX",
    ]);
  });

  it("warning kodu teyit edilince yeniden onay istemez", () => {
    const session = createSession({
      propertyType: UnitType.VILLA,
      roomCount: "5+2",
      squareMeter: 7_500,
      price: 25_000_000,
    });

    const firstResult = service.validateForApproval(session);

    const confirmedResult = service.validateForApproval(
      session,
      firstResult.requiredWarningCodes,
    );

    expect(confirmedResult.valid).toBe(true);
    expect(confirmedResult.requiresConfirmation).toBe(false);
    expect(confirmedResult.pendingWarnings).toHaveLength(0);
    expect(confirmedResult.acknowledgedWarningCodes).toEqual(
      firstResult.requiredWarningCodes,
    );
  });

  it("imkansız villa alanını engeller", () => {
    const result = service.validateForApproval(
      createSession({
        propertyType: UnitType.VILLA,
        roomCount: "5+2",
        squareMeter: 25_000,
      }),
    );

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "VALUE_ABOVE_HARD_MAX",
          field: "maxArea",
          blocking: true,
        }),
      ]),
    );
  });

  it("tanımsız gayrimenkul türünü engeller", () => {
    const result = service.validateForApproval(
      createSession({
        propertyType: "BILINMEYEN_TUR",
      }),
    );

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "PROPERTY_TYPE_REQUIRED",
          field: "propertyTypes",
          blocking: true,
        }),
      ]),
    );
  });
});
