import { Injectable } from '@nestjs/common';
import { UnitType } from '@prisma/client';

import { PropertyNumericRule } from './property-rule.registry';
import {
  PropertyValidationInput,
  PropertyValidationIssue,
  PropertyValidationSeverity,
} from './property-validation.types';

@Injectable()
export class NumericRuleEngine {
  validate(
    input: PropertyValidationInput,
    propertyType: UnitType,
    rules: readonly PropertyNumericRule[],
  ): PropertyValidationIssue[] {
    const issues: PropertyValidationIssue[] = [];

    for (const rule of rules) {
      const rawValue = input.values[rule.field];

      if (
        rawValue === undefined ||
        rawValue === null ||
        rawValue === ''
      ) {
        continue;
      }

      const value = this.toNumber(rawValue);

      if (value === null) {
        issues.push(
          this.createIssue({
            input,
            propertyType,
            rule,
            code: 'NUMERIC_VALUE_INVALID',
            severity: PropertyValidationSeverity.ERROR,
            message: `${rule.label} geçerli bir sayı olmalıdır.`,
            actualValue: rawValue,
          }),
        );
        continue;
      }

      if (value === 0 && rule.allowZero === false) {
        issues.push(
          this.createIssue({
            input,
            propertyType,
            rule,
            code: 'ZERO_VALUE_NOT_ALLOWED',
            severity: PropertyValidationSeverity.ERROR,
            message: `${rule.label} sıfır olamaz.`,
            actualValue: value,
          }),
        );
        continue;
      }

      if (rule.integerOnly && !Number.isInteger(value)) {
        issues.push(
          this.createIssue({
            input,
            propertyType,
            rule,
            code: 'INTEGER_VALUE_REQUIRED',
            severity: PropertyValidationSeverity.ERROR,
            message: `${rule.label} tam sayı olmalıdır.`,
            actualValue: value,
          }),
        );
        continue;
      }

      if (rule.hardMin !== undefined && value < rule.hardMin) {
        issues.push(
          this.createIssue({
            input,
            propertyType,
            rule,
            code: 'VALUE_BELOW_HARD_MIN',
            severity: PropertyValidationSeverity.ERROR,
            message: `${rule.label} en az ${this.formatNumber(rule.hardMin)} olmalıdır.`,
            actualValue: value,
            expected: {
              min: rule.hardMin,
            },
          }),
        );
        continue;
      }

      if (rule.hardMax !== undefined && value > rule.hardMax) {
        issues.push(
          this.createIssue({
            input,
            propertyType,
            rule,
            code: 'VALUE_ABOVE_HARD_MAX',
            severity: PropertyValidationSeverity.ERROR,
            message: `${rule.label} en fazla ${this.formatNumber(rule.hardMax)} olabilir.`,
            actualValue: value,
            expected: {
              max: rule.hardMax,
            },
          }),
        );
        continue;
      }

      if (rule.softMin !== undefined && value < rule.softMin) {
        issues.push(
          this.createIssue({
            input,
            propertyType,
            rule,
            code: 'VALUE_BELOW_SOFT_MIN',
            severity: PropertyValidationSeverity.WARNING,
            message: `${rule.label} olağan değerlerin altında görünüyor.`,
            actualValue: value,
            expected: {
              min: rule.softMin,
            },
          }),
        );
      }

      if (rule.softMax !== undefined && value > rule.softMax) {
        issues.push(
          this.createIssue({
            input,
            propertyType,
            rule,
            code: 'VALUE_ABOVE_SOFT_MAX',
            severity: PropertyValidationSeverity.WARNING,
            message: `${rule.label} olağan değerlerin üzerinde görünüyor.`,
            actualValue: value,
            expected: {
              max: rule.softMax,
            },
          }),
        );
      }
    }

    return issues;
  }

  private createIssue(params: {
    input: PropertyValidationInput;
    propertyType: UnitType;
    rule: PropertyNumericRule;
    code: string;
    severity: PropertyValidationSeverity;
    message: string;
    actualValue: unknown;
    expected?: {
      min?: number;
      max?: number;
    };
  }): PropertyValidationIssue {
    return {
      ruleId: `numeric.${params.rule.field}.${params.code.toLowerCase()}`,
      code: params.code,
      severity: params.severity,
      blocking: params.severity === PropertyValidationSeverity.ERROR,
      context: params.input.context,
      propertyType: params.propertyType,
      field: params.rule.field,
      relatedFields: [],
      message: params.message,
      actualValue: params.actualValue,
      expected: params.expected,
    };
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

  private formatNumber(value: number): string {
    return new Intl.NumberFormat('tr-TR').format(value);
  }
}
