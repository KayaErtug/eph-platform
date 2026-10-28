import { Injectable } from "@nestjs/common";
import { evaluateLinaV7Policy } from "../v7/policies/lina-v7-policy";
import { getLinaV7ToolPolicyBinding } from "../v7/lina-v7-tool-policy-map";


import {
  LinaToolContext,
  LinaToolDefinition,
  LinaToolPolicyDecision,
} from "./lina-tool.types";

@Injectable()
export class LinaToolPolicyService {
  evaluate(
    definition: LinaToolDefinition,
    context: LinaToolContext,
  ): LinaToolPolicyDecision {
    if (!String(context.userId || "").trim()) {
      return {
        allowed: false,
        reason: "Lina aracı için doğrulanmış kullanıcı gerekir.",
      };
    }

    if (
      definition.allowedRoles?.length &&
      !definition.allowedRoles.includes(context.role)
    ) {
      return {
        allowed: false,
        reason: "Kullanıcı rolü bu Lina aracını kullanamaz.",
      };
    }

    if (
      definition.allowedSourceModules?.length &&
      !definition.allowedSourceModules.includes(
        context.sourceModule,
      )
    ) {
      return {
        allowed: false,
        reason:
          "Lina aracı mevcut ekran veya modül bağlamında kullanılamaz.",
      };
    }

    if (
      definition.requiresActiveMembership &&
      context.membershipActive !== true
    ) {
      return {
        allowed: false,
        reason:
          "Bu Lina aracı için aktif üyelik gereklidir.",
      };
    }

    if (
      definition.requiredPackages?.length &&
      !definition.requiredPackages.includes(
        String(context.packageName || ""),
      )
    ) {
      return {
        allowed: false,
        reason:
          "Kullanıcının paketi bu Lina aracını kapsamıyor.",
      };
    }

    if (
      definition.requiresTenant &&
      !String(context.tenantId || "").trim()
    ) {
      return {
        allowed: false,
        reason:
          "Bu Lina aracı için geçerli işletme veya tenant bağlamı gerekir.",
      };
    }

    const v7Binding =
      getLinaV7ToolPolicyBinding(definition.name);

    if (v7Binding) {
      const metadata =
        context.metadata &&
        typeof context.metadata === "object"
          ? context.metadata
          : {};

      const effectivePersonas =
        Array.isArray(metadata["effectivePersonas"])
          ? metadata["effectivePersonas"].filter(
              (value): value is string =>
                typeof value === "string",
            )
          : [];

      const v7Decision = evaluateLinaV7Policy({
        userId: context.userId,
        role: String(context.role || ""),
        capabilities: effectivePersonas,
        module: v7Binding.module,
        operation: v7Binding.operation,
        scope: v7Binding.scope,
        isResourceOwner:
          v7Binding.isResourceOwner ??
          v7Binding.scope === "OWN",
      });

      if (!v7Decision.allowed) {
        return {
          allowed: false,
          reason:
            v7Decision.reason ||
            "Lina V7 güvenlik politikası bu işleme izin vermedi.",
        };
      }
    }

    return {
      allowed: true,
    };
  }

  requiresConfirmation(
    definition: LinaToolDefinition,
  ): boolean {
    return (
      definition.requiresConfirmation === true ||
      definition.riskLevel >= 2
    );
  }
}
