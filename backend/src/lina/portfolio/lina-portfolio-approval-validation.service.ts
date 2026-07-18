import { Injectable } from "@nestjs/common";
import { UnitType } from "@prisma/client";

import type { PropertyValidationResult } from "../../property-validation/property-validation.types";
import { LinaPropertyValidationService } from "../lina-property-validation.service";
import type { LinaPortfolioSessionContext } from "./lina-portfolio-session.service";

@Injectable()
export class LinaPortfolioApprovalValidationService {
  constructor(
    private readonly linaPropertyValidationService: LinaPropertyValidationService,
  ) {}

  validateForApproval(
    session: LinaPortfolioSessionContext,
    acknowledgedWarningCodes: readonly string[] = [],
  ): PropertyValidationResult {
    return this.linaPropertyValidationService.validate({
      recordKind: "ASSET",
      sourceId: session.id,
      propertyTypes: this.resolvePropertyTypes(session.propertyType),
      values: this.buildValidationValues(session),
      acknowledgedWarningCodes,
    });
  }

  private resolvePropertyTypes(
    rawPropertyType: string | null,
  ): UnitType[] {
    const normalized = String(rawPropertyType || "")
      .trim()
      .toUpperCase();

    const unitTypes = Object.values(UnitType) as string[];

    if (!unitTypes.includes(normalized)) {
      return [];
    }

    return [normalized as UnitType];
  }

  private buildValidationValues(
    session: LinaPortfolioSessionContext,
  ): Record<string, unknown> {
    const values: Record<string, unknown> = {};

    /*
     * Portföy kaydı bir aralık değil, kesin değer taşır.
     * Aynı değeri min ve max alanlarına birlikte yazmak
     * ortak motorda iki ayrı warning oluşturur.
     */
    if (session.squareMeter !== null) {
      values.maxArea = session.squareMeter;
    }

    if (session.price !== null) {
      values.maxBudget = session.price;
    }

    if (session.roomCount) {
      values.roomCounts = [session.roomCount];
    }

    return values;
  }
}
