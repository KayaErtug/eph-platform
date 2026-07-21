import { Injectable } from "@nestjs/common";

import { LinaToolInputValidatorService } from "./lina-tool-input-validator.service";
import { LinaToolPolicyService } from "./lina-tool-policy.service";
import { LinaToolRegistryService } from "./lina-tool-registry.service";
import {
  LinaToolCall,
  LinaToolContext,
  LinaToolExecutionResult,
} from "./lina-tool.types";

@Injectable()
export class LinaToolExecutorService {
  constructor(
    private readonly registryService: LinaToolRegistryService,
    private readonly policyService: LinaToolPolicyService,
    private readonly inputValidatorService: LinaToolInputValidatorService = new LinaToolInputValidatorService(),
  ) {}

  async execute(
    call: LinaToolCall,
    context: LinaToolContext,
  ): Promise<LinaToolExecutionResult> {
    const registeredTool =
      this.registryService.getRegisteredTool(call.name);

    if (!registeredTool) {
      return {
        status: "not_found",
        success: false,
        toolName: call.name,
        message:
          "OpenAI kayıtlı olmayan bir EPH aracını çağırdı.",
      };
    }

    const { definition, handler } = registeredTool;

    const policyDecision =
      this.policyService.evaluate(
        definition,
        context,
      );

    if (!policyDecision.allowed) {
      return {
        status: "denied",
        success: false,
        toolName: definition.name,
        message:
          policyDecision.reason ||
          "Lina aracı için yetki verilmedi.",
        riskLevel: definition.riskLevel,
      };
    }

    const validationResult =
      this.inputValidatorService.validate(
        definition.inputSchema,
        call.input,
      );

    if (!validationResult.valid) {
      return {
        status: "error",
        success: false,
        toolName: definition.name,
        message:
          "Lina aracı için gönderilen parametreler geçersiz.",
        data: {
          issues: validationResult.issues,
        },
        riskLevel: definition.riskLevel,
        requiresConfirmation: false,
      };
    }

    const requiresConfirmation =
      this.policyService.requiresConfirmation(
        definition,
      );

    if (
      requiresConfirmation &&
      call.confirmed !== true
    ) {
      return {
        status: "approval_required",
        success: false,
        toolName: definition.name,
        message:
          "Bu işlem gerçekleştirilmeden önce kullanıcının açık onayı gerekir.",
        riskLevel: definition.riskLevel,
        requiresConfirmation: true,
        data: {
          input: call.input,
        },
      };
    }

    try {
      const result = await handler(
        call.input,
        context,
      );

      return {
        status: result.success
          ? "success"
          : "error",
        success: result.success,
        toolName: definition.name,
        message: result.message,
        data: result.data,
        riskLevel: definition.riskLevel,
        requiresConfirmation: false,
      };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Lina aracı çalıştırılırken bilinmeyen hata oluştu.";

      return {
        status: "error",
        success: false,
        toolName: definition.name,
        message,
        riskLevel: definition.riskLevel,
        requiresConfirmation: false,
      };
    }
  }
}
