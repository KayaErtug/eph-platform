import { Injectable } from "@nestjs/common";

import { LinaToolPolicyService } from "./lina-tool-policy.service";
import {
  LinaOpenAiFunctionTool,
  LinaRegisteredTool,
  LinaToolContext,
  LinaToolDefinition,
  LinaToolHandler,
} from "./lina-tool.types";

const TOOL_NAME_PATTERN = /^[a-z][a-z0-9_]{2,63}$/;

@Injectable()
export class LinaToolRegistryService {
  private readonly tools = new Map<
    string,
    LinaRegisteredTool
  >();

  constructor(
    private readonly policyService: LinaToolPolicyService,
  ) {}

  register(
    definition: LinaToolDefinition,
    handler: LinaToolHandler,
  ): void {
    this.validateDefinition(definition);

    if (this.tools.has(definition.name)) {
      throw new Error(
        `LINA_TOOL_DUPLICATE_NAME:${definition.name}`,
      );
    }

    this.tools.set(definition.name, {
      definition,
      handler,
    });
  }

  registerMany(
    registrations: Array<{
      definition: LinaToolDefinition;
      handler: LinaToolHandler;
    }>,
  ): void {
    const batchNames = new Set<string>();

    for (const registration of registrations) {
      this.validateDefinition(registration.definition);

      const name = registration.definition.name;

      if (
        batchNames.has(name) ||
        this.tools.has(name)
      ) {
        throw new Error(
          `LINA_TOOL_DUPLICATE_NAME:${name}`,
        );
      }

      batchNames.add(name);
    }

    for (const registration of registrations) {
      this.tools.set(
        registration.definition.name,
        registration,
      );
    }
  }

  getRegisteredTool(
    name: string,
  ): LinaRegisteredTool | undefined {
    return this.tools.get(name);
  }

  listDefinitions(
    context: LinaToolContext,
  ): LinaToolDefinition[] {
    return Array.from(this.tools.values())
      .map((tool) => tool.definition)
      .filter(
        (definition) =>
          this.policyService.evaluate(
            definition,
            context,
          ).allowed,
      )
      .sort((left, right) =>
        left.name.localeCompare(right.name),
      );
  }

  listOpenAiTools(
    context: LinaToolContext,
  ): LinaOpenAiFunctionTool[] {
    return this.listDefinitions(context).map(
      (definition) => ({
        type: "function" as const,
        name: definition.name,
        description: definition.description,
        parameters: definition.inputSchema,
        strict: true as const,
      }),
    );
  }

  count(): number {
    return this.tools.size;
  }

  private validateDefinition(
    definition: LinaToolDefinition,
  ): void {
    if (!TOOL_NAME_PATTERN.test(definition.name)) {
      throw new Error(
        `LINA_TOOL_INVALID_NAME:${definition.name}`,
      );
    }

    if (!definition.description.trim()) {
      throw new Error(
        `LINA_TOOL_DESCRIPTION_REQUIRED:${definition.name}`,
      );
    }

    if (!definition.family.trim()) {
      throw new Error(
        `LINA_TOOL_FAMILY_REQUIRED:${definition.name}`,
      );
    }

    if (
      !Number.isInteger(definition.riskLevel) ||
      definition.riskLevel < 0 ||
      definition.riskLevel > 4
    ) {
      throw new Error(
        `LINA_TOOL_INVALID_RISK:${definition.name}`,
      );
    }

    if (
      definition.inputSchema?.type !== "object" ||
      !definition.inputSchema.properties
    ) {
      throw new Error(
        `LINA_TOOL_INVALID_SCHEMA:${definition.name}`,
      );
    }

    if (
      definition.inputSchema.additionalProperties !== false
    ) {
      throw new Error(
        `LINA_TOOL_STRICT_ADDITIONAL_PROPERTIES:${definition.name}`,
      );
    }

    const propertyNames = Object.keys(
      definition.inputSchema.properties,
    );

    const requiredNames = new Set(
      definition.inputSchema.required || [],
    );

    const missingRequired = propertyNames.filter(
      (propertyName) =>
        !requiredNames.has(propertyName),
    );

    const unknownRequired = Array.from(
      requiredNames,
    ).filter(
      (propertyName) =>
        !propertyNames.includes(propertyName),
    );

    if (
      missingRequired.length > 0 ||
      unknownRequired.length > 0
    ) {
      throw new Error(
        `LINA_TOOL_STRICT_REQUIRED_FIELDS:${definition.name}`,
      );
    }
  }
}
