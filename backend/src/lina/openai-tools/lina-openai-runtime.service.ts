import { Injectable } from "@nestjs/common";

import {
  LinaRequestIdentity,
  LinaUserContextService,
} from "../catalog/lina-user-context.service";
import {
  LinaConversationMessage,
  LinaOpenAiOrchestratorResult,
} from "./lina-openai-response.types";
import { LinaOpenAiOrchestratorService } from "./lina-openai-orchestrator.service";
import { LinaToolSourceModule } from "./lina-tool.types";

export type LinaOpenAiRuntimeRequest = {
  message: string;
  instructions: string;
  identity: LinaRequestIdentity;
  sourceModule: LinaToolSourceModule;
  history?: LinaConversationMessage[];
};

@Injectable()
export class LinaOpenAiRuntimeService {
  constructor(
    private readonly userContextService:
      LinaUserContextService,
    private readonly orchestratorService:
      LinaOpenAiOrchestratorService,
  ) {}

  async run(
    request: LinaOpenAiRuntimeRequest,
  ): Promise<LinaOpenAiOrchestratorResult> {
    const message = String(
      request?.message || "",
    ).trim();

    if (!message) {
      return this.errorResult(
        "Lina'ya gönderilecek kullanıcı mesajı boş olamaz.",
      );
    }

    const instructions = String(
      request?.instructions || "",
    ).trim();

    if (!instructions) {
      return this.errorResult(
        "Lina OpenAI sistem talimatı bulunamadı.",
      );
    }

    const sourceModule =
      this.normalizeSourceModule(
        request?.sourceModule,
      );

    const context =
      await this.userContextService.resolve(
        request?.identity || {},
        sourceModule,
      );

    return this.orchestratorService.run({
      message,
      instructions,
      context,
      history: this.normalizeHistory(
        request?.history,
      ),
    });
  }

  private normalizeHistory(
    history:
      | LinaConversationMessage[]
      | undefined,
  ): LinaConversationMessage[] {
    if (!Array.isArray(history)) {
      return [];
    }

    return history
      .filter(
        (
          item,
        ): item is LinaConversationMessage =>
          Boolean(
            item &&
              (
                item.role === "user" ||
                item.role === "assistant"
              ) &&
              typeof item.content ===
                "string" &&
              item.content.trim(),
          ),
      )
      .map((item) => ({
        role: item.role,
        content: item.content.trim(),
      }))
      .slice(-20);
  }

  private normalizeSourceModule(
    value: unknown,
  ): LinaToolSourceModule {
    const allowedModules:
      LinaToolSourceModule[] = [
      "dashboard",
      "crm",
      "network",
      "pool",
      "notifications",
      "general",
      "portfolio",
      "projects",
      "stock",
      "admin",
    ];

    const normalized = String(
      value || "",
    ).trim() as LinaToolSourceModule;

    return allowedModules.includes(
      normalized,
    )
      ? normalized
      : "general";
  }

  private errorResult(
    message: string,
  ): LinaOpenAiOrchestratorResult {
    return {
      status: "error",
      success: false,
      message,
      iterations: 0,
      toolExecutions: [],
    };
  }
}
