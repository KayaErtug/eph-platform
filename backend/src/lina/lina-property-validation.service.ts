import { Injectable } from "@nestjs/common";
import { UnitType } from "@prisma/client";

import type { PropertyCriteriaRecordKind } from "../property-criteria/property-criteria.types";
import { PropertyValidationService } from "../property-validation/property-validation.service";
import {
  PropertyLegalContext,
  PropertyValidationContext,
  PropertyValidationResult,
} from "../property-validation/property-validation.types";

export type LinaPropertyValidationRequest = {
  recordKind: PropertyCriteriaRecordKind;
  propertyTypes: readonly UnitType[];
  values: Readonly<Record<string, unknown>>;
  acknowledgedWarningCodes?: readonly string[];
  sourceId?: string | null;
  legalContext?: PropertyLegalContext;
};

@Injectable()
export class LinaPropertyValidationService {
  constructor(
    private readonly propertyValidationService: PropertyValidationService,
  ) {}

  validate(
    request: LinaPropertyValidationRequest,
  ): PropertyValidationResult {
    return this.propertyValidationService.validate({
      context: PropertyValidationContext.LINA_ACTION,
      recordKind: request.recordKind,
      source: "LINA",
      sourceId: request.sourceId ?? null,
      propertyTypes: request.propertyTypes,
      values: request.values,
      legalContext:
        request.legalContext ?? PropertyLegalContext.UNKNOWN,
      acknowledgedWarningCodes:
        request.acknowledgedWarningCodes ?? [],
    });
  }
}
