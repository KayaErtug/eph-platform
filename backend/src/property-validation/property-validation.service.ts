import { Injectable } from '@nestjs/common';
import { UnitType } from '@prisma/client';

import { CrossFieldRuleEngine } from './cross-field-rule.engine';
import { NumericRuleEngine } from './numeric-rule.engine';
import {
  getPropertyTypeContextRule,
  PropertySelectionRule,
} from './property-rule.registry';
import {
  PROPERTY_VALIDATION_VERSION,
  PropertyValidationInput,
  PropertyValidationIssue,
  PropertyValidationResult,
  PropertyValidationSeverity,
} from './property-validation.types';

@Injectable()
export class PropertyValidationService {
  constructor(
    private readonly numericRuleEngine: NumericRuleEngine,
    private readonly crossFieldRuleEngine: CrossFieldRuleEngine,
  ) {}

  validate(input: PropertyValidationInput): PropertyValidationResult {
    const issues: PropertyValidationIssue[] = [];

    if (input.propertyTypes.length === 0) {
      issues.push({
        ruleId: 'property-type.required',
        code: 'PROPERTY_TYPE_REQUIRED',
        severity: PropertyValidationSeverity.ERROR,
        blocking: true,
        context: input.context,
        propertyType: null,
        field: 'propertyTypes',
        relatedFields: [],
        message: 'En az bir gayrimenkul tipi seçilmelidir.',
      });
    }

    for (const propertyType of input.propertyTypes) {
      const contextRule = getPropertyTypeContextRule(
        propertyType,
        input.context,
      );

      if (!contextRule) {
        continue;
      }

      issues.push(
        ...this.validateForbiddenFields(
          input,
          propertyType,
          contextRule.forbiddenFields,
        ),
      );

      issues.push(
        ...this.numericRuleEngine.validate(
          input,
          propertyType,
          contextRule.numericRules,
        ),
      );

      issues.push(
        ...this.crossFieldRuleEngine.validateRanges(
          input,
          propertyType,
          contextRule.rangeRules,
        ),
      );

      issues.push(
        ...this.validateSelections(
          input,
          propertyType,
          contextRule.selectionRules,
        ),
      );
    }

    const errors = issues.filter(
      (issue) => issue.severity === PropertyValidationSeverity.ERROR,
    );

    const conflicts = issues.filter(
      (issue) => issue.severity === PropertyValidationSeverity.CONFLICT,
    );

    const warnings = issues.filter(
      (issue) => issue.severity === PropertyValidationSeverity.WARNING,
    );

    const evidenceRequests = issues.filter(
      (issue) =>
        issue.severity === PropertyValidationSeverity.EVIDENCE_REQUIRED,
    );

    const dynamicInformation = issues.filter(
      (issue) =>
        issue.severity === PropertyValidationSeverity.DYNAMIC_INFORMATION,
    );

    const suppliedAcknowledgedWarningCodes = [
      ...new Set(
        (input.acknowledgedWarningCodes ?? [])
          .filter((code): code is string => typeof code === 'string')
          .map((code) => code.trim())
          .filter(Boolean),
      ),
    ];

    const currentWarningCodes = new Set(
      warnings.map((warning) => warning.code),
    );

    const acknowledgedWarningCodes =
      suppliedAcknowledgedWarningCodes.filter((code) =>
        currentWarningCodes.has(code),
      );

    const acknowledgedWarningCodeSet = new Set(
      acknowledgedWarningCodes,
    );

    const pendingWarnings = warnings.filter(
      (warning) =>
        !acknowledgedWarningCodeSet.has(warning.code),
    );

    const requiredWarningCodes = [
      ...new Set(
        pendingWarnings.map((warning) => warning.code),
      ),
    ];

    return {
      version: PROPERTY_VALIDATION_VERSION,
      valid: !issues.some((issue) => issue.blocking),
      requiresConfirmation: pendingWarnings.length > 0,
      requiresEvidence: evidenceRequests.length > 0,
      issues,
      errors,
      conflicts,
      warnings,
      pendingWarnings,
      evidenceRequests,
      dynamicInformation,
      requiredWarningCodes,
      acknowledgedWarningCodes,
    };
  }

  private validateForbiddenFields(
    input: PropertyValidationInput,
    propertyType: UnitType,
    rules: readonly {
      field: string;
      label: string;
    }[],
  ): PropertyValidationIssue[] {
    const issues: PropertyValidationIssue[] = [];

    for (const rule of rules) {
      const value = input.values[rule.field];

      const exists = Array.isArray(value)
        ? value.length > 0
        : value !== undefined &&
          value !== null &&
          String(value).trim() !== '';

      if (!exists) {
        continue;
      }

      issues.push({
        ruleId:
          `property-type.${propertyType}.${rule.field}.not-allowed`,
        code: 'FIELD_NOT_ALLOWED_FOR_PROPERTY_TYPE',
        severity: PropertyValidationSeverity.ERROR,
        blocking: true,
        context: input.context,
        propertyType,
        field: rule.field,
        relatedFields: [],
        message:
          `${rule.label} bu gayrimenkul türünde kullanılamaz.`,
        actualValue: value,
      });
    }

    return issues;
  }

  private validateSelections(
    input: PropertyValidationInput,
    propertyType: UnitType,
    rules: readonly PropertySelectionRule[],
  ): PropertyValidationIssue[] {
    const issues: PropertyValidationIssue[] = [];

    for (const rule of rules) {
      const values = this.toStringArray(input.values[rule.field]);
      const allowedValues = new Set(rule.allowedValues);

      if (
        rule.minimumSelections !== undefined &&
        values.length < rule.minimumSelections
      ) {
        issues.push({
          ruleId: `selection.${rule.field}.minimum`,
          code: 'MINIMUM_SELECTION_REQUIRED',
          severity: PropertyValidationSeverity.ERROR,
          blocking: true,
          context: input.context,
          propertyType,
          field: rule.field,
          relatedFields: [],
          message: `${rule.field} alanında en az ${rule.minimumSelections} seçim yapılmalıdır.`,
          actualValue: values,
          expected: {
            allowedValues: rule.allowedValues,
          },
        });
      }

      if (
        rule.maximumSelections !== undefined &&
        values.length > rule.maximumSelections
      ) {
        issues.push({
          ruleId: `selection.${rule.field}.maximum`,
          code: 'MAXIMUM_SELECTION_EXCEEDED',
          severity: PropertyValidationSeverity.ERROR,
          blocking: true,
          context: input.context,
          propertyType,
          field: rule.field,
          relatedFields: [],
          message: `${rule.field} alanında en fazla ${rule.maximumSelections} seçim yapılabilir.`,
          actualValue: values,
          expected: {
            allowedValues: rule.allowedValues,
          },
        });
      }

      const invalidValues = values.filter(
        (value) => !allowedValues.has(value),
      );

      if (invalidValues.length > 0) {
        issues.push({
          ruleId: `selection.${rule.field}.invalid-value`,
          code: 'SELECTION_VALUE_NOT_ALLOWED',
          severity: PropertyValidationSeverity.ERROR,
          blocking: true,
          context: input.context,
          propertyType,
          field: rule.field,
          relatedFields: [],
          message: `${rule.field} alanında geçersiz seçim bulunmaktadır.`,
          actualValue: invalidValues,
          expected: {
            allowedValues: rule.allowedValues,
          },
        });
      }
    }

    return issues;
  }

  private toStringArray(value: unknown): string[] {
    if (Array.isArray(value)) {
      return value
        .map((item) => String(item).trim())
        .filter(Boolean);
    }

    if (value === null || value === undefined || value === '') {
      return [];
    }

    return [String(value).trim()].filter(Boolean);
  }
}
