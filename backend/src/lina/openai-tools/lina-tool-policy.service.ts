import { Injectable } from "@nestjs/common";

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
