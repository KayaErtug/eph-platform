import { Injectable } from "@nestjs/common";

import { LinaToolJsonSchema } from "./lina-tool.types";

type JsonSchemaNode = Record<string, unknown>;

export type LinaToolInputValidationResult = {
  valid: boolean;
  issues: string[];
};

@Injectable()
export class LinaToolInputValidatorService {
  validate(
    schema: LinaToolJsonSchema,
    input: unknown,
  ): LinaToolInputValidationResult {
    const issues: string[] = [];

    this.validateNode(
      schema as unknown as JsonSchemaNode,
      input,
      "$",
      issues,
    );

    return {
      valid: issues.length === 0,
      issues,
    };
  }

  private validateNode(
    schema: JsonSchemaNode,
    value: unknown,
    path: string,
    issues: string[],
  ): void {
    this.validateCompositions(
      schema,
      value,
      path,
      issues,
    );

    if (
      Array.isArray(schema.enum) &&
      !schema.enum.some((item) =>
        this.valuesEqual(item, value),
      )
    ) {
      issues.push(
        `${path}: izin verilen değerlerden biri olmalıdır.`,
      );
      return;
    }

    if (
      Object.prototype.hasOwnProperty.call(
        schema,
        "const",
      ) &&
      !this.valuesEqual(schema.const, value)
    ) {
      issues.push(
        `${path}: beklenen sabit değerle eşleşmiyor.`,
      );
      return;
    }

    const expectedTypes =
      this.getExpectedTypes(schema.type);

    if (
      expectedTypes.length > 0 &&
      !expectedTypes.some((type) =>
        this.matchesType(type, value),
      )
    ) {
      issues.push(
        `${path}: beklenen veri tipi ${expectedTypes.join(
          " veya ",
        )}.`,
      );
      return;
    }

    if (value === null) {
      return;
    }

    if (
      this.isPlainObject(value) &&
      (expectedTypes.includes("object") ||
        this.isPlainObject(schema.properties))
    ) {
      this.validateObject(
        schema,
        value,
        path,
        issues,
      );
      return;
    }

    if (
      Array.isArray(value) &&
      (expectedTypes.includes("array") ||
        this.isPlainObject(schema.items))
    ) {
      this.validateArray(
        schema,
        value,
        path,
        issues,
      );
      return;
    }

    if (typeof value === "string") {
      this.validateString(
        schema,
        value,
        path,
        issues,
      );
      return;
    }

    if (
      typeof value === "number" &&
      Number.isFinite(value)
    ) {
      this.validateNumber(
        schema,
        value,
        path,
        issues,
      );
    }
  }

  private validateCompositions(
    schema: JsonSchemaNode,
    value: unknown,
    path: string,
    issues: string[],
  ): void {
    if (Array.isArray(schema.allOf)) {
      for (const branch of schema.allOf) {
        if (this.isPlainObject(branch)) {
          this.validateNode(
            branch,
            value,
            path,
            issues,
          );
        }
      }
    }

    if (Array.isArray(schema.anyOf)) {
      const matchingBranches =
        schema.anyOf.filter(
          (branch) =>
            this.isPlainObject(branch) &&
            this.branchMatches(branch, value),
        );

      if (matchingBranches.length === 0) {
        issues.push(
          `${path}: tanımlı seçeneklerden hiçbirine uymuyor.`,
        );
      }
    }

    if (Array.isArray(schema.oneOf)) {
      const matchingBranches =
        schema.oneOf.filter(
          (branch) =>
            this.isPlainObject(branch) &&
            this.branchMatches(branch, value),
        );

      if (matchingBranches.length !== 1) {
        issues.push(
          `${path}: tanımlı seçeneklerden yalnızca birine uymalıdır.`,
        );
      }
    }

    if (
      this.isPlainObject(schema.not) &&
      this.branchMatches(schema.not, value)
    ) {
      issues.push(
        `${path}: yasaklanan veri biçimiyle eşleşiyor.`,
      );
    }
  }

  private validateObject(
    schema: JsonSchemaNode,
    value: Record<string, unknown>,
    path: string,
    issues: string[],
  ): void {
    const properties = this.isPlainObject(
      schema.properties,
    )
      ? schema.properties
      : {};

    const required = Array.isArray(
      schema.required,
    )
      ? schema.required.filter(
          (item): item is string =>
            typeof item === "string",
        )
      : [];

    for (const propertyName of required) {
      if (
        !Object.prototype.hasOwnProperty.call(
          value,
          propertyName,
        )
      ) {
        issues.push(
          `${path}.${propertyName}: zorunlu alan eksik.`,
        );
      }
    }

    for (const [propertyName, propertyValue] of Object.entries(
      value,
    )) {
      const propertySchema =
        properties[propertyName];

      if (this.isPlainObject(propertySchema)) {
        this.validateNode(
          propertySchema,
          propertyValue,
          `${path}.${propertyName}`,
          issues,
        );
        continue;
      }

      if (schema.additionalProperties === false) {
        issues.push(
          `${path}.${propertyName}: tanımsız alan gönderilemez.`,
        );
        continue;
      }

      if (
        this.isPlainObject(
          schema.additionalProperties,
        )
      ) {
        this.validateNode(
          schema.additionalProperties,
          propertyValue,
          `${path}.${propertyName}`,
          issues,
        );
      }
    }

    const propertyCount =
      Object.keys(value).length;

    const minProperties =
      this.asFiniteNumber(
        schema.minProperties,
      );

    if (
      minProperties !== null &&
      propertyCount < minProperties
    ) {
      issues.push(
        `${path}: en az ${minProperties} alan içermelidir.`,
      );
    }

    const maxProperties =
      this.asFiniteNumber(
        schema.maxProperties,
      );

    if (
      maxProperties !== null &&
      propertyCount > maxProperties
    ) {
      issues.push(
        `${path}: en fazla ${maxProperties} alan içermelidir.`,
      );
    }
  }

  private validateArray(
    schema: JsonSchemaNode,
    value: unknown[],
    path: string,
    issues: string[],
  ): void {
    const minItems =
      this.asFiniteNumber(schema.minItems);

    if (
      minItems !== null &&
      value.length < minItems
    ) {
      issues.push(
        `${path}: en az ${minItems} öğe içermelidir.`,
      );
    }

    const maxItems =
      this.asFiniteNumber(schema.maxItems);

    if (
      maxItems !== null &&
      value.length > maxItems
    ) {
      issues.push(
        `${path}: en fazla ${maxItems} öğe içermelidir.`,
      );
    }

    if (schema.uniqueItems === true) {
      const uniqueValues = new Set(
        value.map((item) =>
          JSON.stringify(item),
        ),
      );

      if (
        uniqueValues.size !== value.length
      ) {
        issues.push(
          `${path}: tekrar eden öğe içeremez.`,
        );
      }
    }

    if (!this.isPlainObject(schema.items)) {
      return;
    }

    value.forEach((item, index) => {
      this.validateNode(
        schema.items as JsonSchemaNode,
        item,
        `${path}[${index}]`,
        issues,
      );
    });
  }

  private validateString(
    schema: JsonSchemaNode,
    value: string,
    path: string,
    issues: string[],
  ): void {
    const minLength =
      this.asFiniteNumber(
        schema.minLength,
      );

    if (
      minLength !== null &&
      value.length < minLength
    ) {
      issues.push(
        `${path}: en az ${minLength} karakter olmalıdır.`,
      );
    }

    const maxLength =
      this.asFiniteNumber(
        schema.maxLength,
      );

    if (
      maxLength !== null &&
      value.length > maxLength
    ) {
      issues.push(
        `${path}: en fazla ${maxLength} karakter olmalıdır.`,
      );
    }

    if (typeof schema.pattern === "string") {
      try {
        const pattern = new RegExp(
          schema.pattern,
        );

        if (!pattern.test(value)) {
          issues.push(
            `${path}: beklenen metin biçimiyle eşleşmiyor.`,
          );
        }
      } catch {
        issues.push(
          `${path}: doğrulama şemasındaki metin deseni geçersiz.`,
        );
      }
    }
  }

  private validateNumber(
    schema: JsonSchemaNode,
    value: number,
    path: string,
    issues: string[],
  ): void {
    const minimum =
      this.asFiniteNumber(schema.minimum);

    if (
      minimum !== null &&
      value < minimum
    ) {
      issues.push(
        `${path}: ${minimum} değerinden küçük olamaz.`,
      );
    }

    const maximum =
      this.asFiniteNumber(schema.maximum);

    if (
      maximum !== null &&
      value > maximum
    ) {
      issues.push(
        `${path}: ${maximum} değerinden büyük olamaz.`,
      );
    }

    const exclusiveMinimum =
      this.asFiniteNumber(
        schema.exclusiveMinimum,
      );

    if (
      exclusiveMinimum !== null &&
      value <= exclusiveMinimum
    ) {
      issues.push(
        `${path}: ${exclusiveMinimum} değerinden büyük olmalıdır.`,
      );
    }

    const exclusiveMaximum =
      this.asFiniteNumber(
        schema.exclusiveMaximum,
      );

    if (
      exclusiveMaximum !== null &&
      value >= exclusiveMaximum
    ) {
      issues.push(
        `${path}: ${exclusiveMaximum} değerinden küçük olmalıdır.`,
      );
    }

    const multipleOf =
      this.asFiniteNumber(
        schema.multipleOf,
      );

    if (
      multipleOf !== null &&
      multipleOf > 0
    ) {
      const quotient =
        value / multipleOf;

      if (
        Math.abs(
          quotient -
            Math.round(quotient),
        ) > Number.EPSILON * 10
      ) {
        issues.push(
          `${path}: ${multipleOf} değerinin katı olmalıdır.`,
        );
      }
    }
  }

  private branchMatches(
    schema: JsonSchemaNode,
    value: unknown,
  ): boolean {
    const branchIssues: string[] = [];

    this.validateNode(
      schema,
      value,
      "$",
      branchIssues,
    );

    return branchIssues.length === 0;
  }

  private getExpectedTypes(
    value: unknown,
  ): string[] {
    if (typeof value === "string") {
      return [value];
    }

    if (!Array.isArray(value)) {
      return [];
    }

    return value.filter(
      (item): item is string =>
        typeof item === "string",
    );
  }

  private matchesType(
    type: string,
    value: unknown,
  ): boolean {
    switch (type) {
      case "object":
        return this.isPlainObject(value);

      case "array":
        return Array.isArray(value);

      case "string":
        return typeof value === "string";

      case "number":
        return (
          typeof value === "number" &&
          Number.isFinite(value)
        );

      case "integer":
        return (
          typeof value === "number" &&
          Number.isInteger(value)
        );

      case "boolean":
        return typeof value === "boolean";

      case "null":
        return value === null;

      default:
        return false;
    }
  }

  private isPlainObject(
    value: unknown,
  ): value is Record<string, unknown> {
    return (
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value)
    );
  }

  private asFiniteNumber(
    value: unknown,
  ): number | null {
    return (
      typeof value === "number" &&
      Number.isFinite(value)
    )
      ? value
      : null;
  }

  private valuesEqual(
    left: unknown,
    right: unknown,
  ): boolean {
    if (Object.is(left, right)) {
      return true;
    }

    if (
      (Array.isArray(left) ||
        this.isPlainObject(left)) &&
      (Array.isArray(right) ||
        this.isPlainObject(right))
    ) {
      try {
        return (
          JSON.stringify(left) ===
          JSON.stringify(right)
        );
      } catch {
        return false;
      }
    }

    return false;
  }
}
