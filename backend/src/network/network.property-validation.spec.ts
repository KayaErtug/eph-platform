import { BadRequestException } from "@nestjs/common";
import { UnitType } from "@prisma/client";

import { PrismaService } from "../prisma/prisma.service";
import { PropertyCriteriaService } from "../property-criteria/property-criteria.service";
import { PropertyValidationService } from "../property-validation/property-validation.service";
import { PropertyValidationContext } from "../property-validation/property-validation.types";
import { PushService } from "../push/push.service";
import { NetworkService } from "./network.service";

describe("NetworkService property validation integration", () => {
  let service: NetworkService;
  let criteriaNormalizeMock: jest.Mock;
  let propertyValidateMock: jest.Mock;

  beforeEach(() => {
    criteriaNormalizeMock = jest.fn().mockReturnValue({
      propertyTypes: [UnitType.DAIRE],
    });

    propertyValidateMock = jest.fn();

    service = new NetworkService(
      {} as PrismaService,
      {} as PushService,
      {
        normalize: criteriaNormalizeMock,
      } as unknown as PropertyCriteriaService,
      {
        validate: propertyValidateMock,
      } as unknown as PropertyValidationService,
    );
  });

  function runValidation(
    category: string,
    dto: Record<string, unknown>,
  ): void {
    (
      service as unknown as {
        validatePropertyDemandInput(
          category: string,
          dto: Record<string, unknown>,
        ): void;
      }
    ).validatePropertyDemandInput(category, dto);
  }

  it("PORTFOY_ARIYORUM dışındaki kategorilerde mülk doğrulamasını çalıştırmaz", () => {
    runValidation("DUYURU", {
      propertyTypes: [],
      minArea: 2,
      maxArea: 35_000,
    });

    expect(criteriaNormalizeMock).not.toHaveBeenCalled();
    expect(propertyValidateMock).not.toHaveBeenCalled();
  });

  it("PORTFOY_ARIYORUM kriterlerini doğrulama çekirdeğine gönderir", () => {
    propertyValidateMock.mockReturnValue({
      version: "1.0.0",
      valid: true,
      requiresConfirmation: false,
      requiresEvidence: false,
      issues: [],
      errors: [],
      conflicts: [],
      warnings: [],
      evidenceRequests: [],
      dynamicInformation: [],
    });

    runValidation("PORTFOY_ARIYORUM", {
      propertyTypes: ["DAIRE"],
      minArea: 80,
      maxArea: 180,
      minBudget: 2_000_000,
      maxBudget: 8_000_000,
      roomCounts: ["2+1", "3+1"],
      acknowledgedWarningCodes: ["VALUE_ABOVE_SOFT_MAX"],
    });

    expect(propertyValidateMock).toHaveBeenCalledWith({
      context: PropertyValidationContext.DEMAND,
      recordKind: "DEMAND",
      source: "REQUEST_CENTER",
      propertyTypes: [UnitType.DAIRE],
      acknowledgedWarningCodes: ["VALUE_ABOVE_SOFT_MAX"],
      values: {
        minArea: 80,
        maxArea: 180,
        minBudget: 2_000_000,
        maxBudget: 8_000_000,
        roomCounts: ["2+1", "3+1"],
      },
    });
  });

  it("engelleyici doğrulama hatasını BadRequestException olarak döndürür", () => {
    propertyValidateMock.mockReturnValue({
      version: "1.0.0",
      valid: false,
      requiresConfirmation: false,
      requiresEvidence: false,
      issues: [
        {
          code: "VALUE_BELOW_HARD_MIN",
          message: "Minimum brüt alan en az 10 m² olmalıdır.",
          blocking: true,
        },
      ],
      errors: [],
      conflicts: [],
      warnings: [],
      evidenceRequests: [],
      dynamicInformation: [],
    });

    try {
      runValidation("PORTFOY_ARIYORUM", {
        propertyTypes: ["DAIRE"],
        minArea: 2,
        maxArea: 100,
        roomCounts: ["2+1"],
      });

      throw new Error("Doğrulama hatası bekleniyordu.");
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);

      const response = (error as BadRequestException).getResponse();

      expect(response).toMatchObject({
        code: "PROPERTY_VALIDATION_FAILED",
        message: "Minimum brüt alan en az 10 m² olmalıdır.",
      });
    }
  });

  it("warning onayı gerektiğinde confirmation hatası döndürür", () => {
    propertyValidateMock.mockReturnValue({
      version: "1.0.0",
      valid: true,
      requiresConfirmation: true,
      requiresEvidence: false,
      issues: [
        {
          code: "VALUE_ABOVE_SOFT_MAX",
          message: "Girilen alan olağan değerlerin üzerindedir.",
          blocking: false,
        },
      ],
      errors: [],
      conflicts: [],
      warnings: [
        {
          code: "VALUE_ABOVE_SOFT_MAX",
          message: "Girilen alan olağan değerlerin üzerindedir.",
          blocking: false,
        },
      ],
      evidenceRequests: [],
      dynamicInformation: [],
    });

    try {
      runValidation("PORTFOY_ARIYORUM", {
        propertyTypes: ["DAIRE"],
        minArea: 100,
        maxArea: 2_000,
        roomCounts: ["5+2"],
      });

      throw new Error("Kullanıcı onayı hatası bekleniyordu.");
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);

      const response = (error as BadRequestException).getResponse();

      expect(response).toMatchObject({
        code: "PROPERTY_VALIDATION_CONFIRMATION_REQUIRED",
        message: "Girilen alan olağan değerlerin üzerindedir.",
      });
    }
  });

  it("tek bütçe değerini minimum ve maksimum bütçeye aktarır", () => {
    propertyValidateMock.mockReturnValue({
      version: "1.0.0",
      valid: true,
      requiresConfirmation: false,
      requiresEvidence: false,
      issues: [],
      errors: [],
      conflicts: [],
      warnings: [],
      evidenceRequests: [],
      dynamicInformation: [],
    });

    runValidation("PORTFOY_ARIYORUM", {
      propertyTypes: ["DAIRE"],
      budget: 5_000_000,
      minArea: 80,
      maxArea: 120,
      roomCounts: ["2+1"],
    });

    expect(propertyValidateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        values: expect.objectContaining({
          minBudget: 5_000_000,
          maxBudget: 5_000_000,
        }),
      }),
    );
  });
});
