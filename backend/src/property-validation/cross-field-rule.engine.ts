import { Injectable } from '@nestjs/common';
import { UnitType } from '@prisma/client';

import type { PropertyRangeRule } from './property-rule.registry';
import {
  PropertyValidationInput,
  PropertyValidationIssue,
  PropertyValidationSeverity,
} from './property-validation.types';

@Injectable()
export class CrossFieldRuleEngine {
  validateRanges(
    input: PropertyValidationInput,
    propertyType: UnitType,
    rules: readonly PropertyRangeRule[],
  ): PropertyValidationIssue[] {
    const issues: PropertyValidationIssue[] = [];

    for (const rule of rules) {
      const minimumValue = this.toNumber(input.values[rule.minField]);
      const maximumValue = this.toNumber(input.values[rule.maxField]);

      if (minimumValue === null || maximumValue === null) {
        continue;
      }

      if (minimumValue <= maximumValue) {
        continue;
      }

      issues.push({
        ruleId: `cross-field.${rule.minField}.${rule.maxField}.range-order`,
        code: 'MINIMUM_GREATER_THAN_MAXIMUM',
        severity: PropertyValidationSeverity.CONFLICT,
        blocking: true,
        context: input.context,
        propertyType,
        field: rule.minField,
        relatedFields: [rule.maxField],
        message: `${rule.label} için minimum değer maksimum değerden büyük olamaz.`,
        actualValue: {
          minimum: minimumValue,
          maximum: maximumValue,
        },
        expected: {
          description: 'Minimum değer maksimum değere eşit veya küçük olmalıdır.',
        },
      });
    }

    return issues;
  }

  private toNumber(value: unknown): number | null {
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : null;
    }

    if (typeof value !== 'string') {
      return null;
    }

    let normalized = value.trim().replace(/\s/g, '');

    if (!normalized) {
      return null;
    }

    if (normalized.includes('.') && normalized.includes(',')) {
      normalized = normalized.replace(/\./g, '').replace(',', '.');
    } else if (normalized.includes(',')) {
      normalized = normalized.replace(',', '.');
    } else if (/^-?\d{1,3}(\.\d{3})+$/.test(normalized)) {
      normalized = normalized.replace(/\./g, '');
    }

    const numberValue = Number(normalized);

    return Number.isFinite(numberValue) ? numberValue : null;
  }
}
