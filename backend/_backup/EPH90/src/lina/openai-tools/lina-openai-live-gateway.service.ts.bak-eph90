import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { LinaRequestIdentity } from "../catalog/lina-user-context.service";
import { LinaConversationMessage } from "./lina-openai-response.types";
import { LinaOpenAiRuntimeService } from "./lina-openai-runtime.service";
import {
  LinaPendingApproval,
  LinaToolSourceModule,
} from "./lina-tool.types";

export type LinaOpenAiLiveGatewayRequest = {
  message: string;
  instructions: string;
  identity: LinaRequestIdentity;
  sourceModule: LinaToolSourceModule;
  history?: LinaConversationMessage[];
};

export type LinaOpenAiLiveGatewayResult = {
  status: "completed" | "approval_required";
  content: string;
  provider:
    | "responses"
    | "chat_completions"
    | "local";
  inputTokens: number;
  outputTokens: number;
  runtimeError?: string;
  pendingApproval?: LinaPendingApproval;
};

@Injectable()
export class LinaOpenAiLiveGatewayService {
  constructor(
    private readonly configService:
      ConfigService,
    private readonly runtimeService:
      LinaOpenAiRuntimeService,
  ) {}

  async run(
    request: LinaOpenAiLiveGatewayRequest,
  ): Promise<LinaOpenAiLiveGatewayResult> {
    const message = String(
      request?.message || "",
    ).trim();

    const instructions = String(
      request?.instructions || "",
    ).trim();

    const history = this.normalizeHistory(
      request?.history,
    );

    const runtimeResult =
      await this.runtimeService.run({
        message,
        instructions,
        identity:
          request?.identity || {},
        sourceModule:
          request?.sourceModule ||
          "general",
        history,
      });

    if (
      runtimeResult.status ===
        "completed" &&
      runtimeResult.success
    ) {
      return {
        status: "completed",
        content:
          runtimeResult.message,
        provider: "responses",
        inputTokens: 0,
        outputTokens: 0,
      };
    }

    if (
      runtimeResult.status ===
      "approval_required"
    ) {
      return {
        status:
          "approval_required",
        content:
          runtimeResult.message,
        provider: "responses",
        inputTokens: 0,
        outputTokens: 0,
        pendingApproval:
          runtimeResult.pendingApproval,
      };
    }

    return this.runLegacyChatCompletions({
      message,
      instructions,
      history,
      runtimeError:
        runtimeResult.message,
    });
  }

  private async runLegacyChatCompletions(
    input: {
      message: string;
      instructions: string;
      history:
        LinaConversationMessage[];
      runtimeError: string;
    },
  ): Promise<LinaOpenAiLiveGatewayResult> {
    const apiKey =
      this.configService.get<string>(
        "OPENAI_API_KEY",
      ) ||
      process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return {
        status: "completed",
        content:
          this.localFallbackAnswer(
            input.message,
          ),
        provider: "local",
        inputTokens: 0,
        outputTokens: 0,
        runtimeError:
          input.runtimeError,
      };
    }

    const model =
      this.configService.get<string>(
        "OPENAI_MODEL",
      ) ||
      process.env.OPENAI_MODEL ||
      "gpt-4.1-mini";

    const response = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization:
            `Bearer ${apiKey}`,
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          model,
          temperature: 0.18,
          max_tokens: 900,
          presence_penalty: -0.1,
          frequency_penalty: 0.25,
          messages: [
            {
              role: "system",
              content:
                input.instructions,
            },
            ...input.history,
            {
              role: "user",
              content: input.message,
            },
          ],
        }),
      },
    );

    if (!response.ok) {
      const detail =
        await response.text();

      throw new Error(
        `OPENAI_ERROR_${response.status}: ${detail}`,
      );
    }

    const data =
      (await response.json()) as {
        choices?: Array<{
          message?: {
            content?: string;
          };
        }>;
        usage?: {
          prompt_tokens?: number;
          completion_tokens?: number;
        };
      };

    const content =
      data.choices?.[0]?.message
        ?.content?.trim();

    if (!content) {
      throw new Error(
        "OPENAI_EMPTY_RESPONSE",
      );
    }

    return {
      status: "completed",
      content,
      provider:
        "chat_completions",
      inputTokens:
        data.usage?.prompt_tokens ||
        0,
      outputTokens:
        data.usage
          ?.completion_tokens || 0,
      runtimeError:
        input.runtimeError,
    };
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
                item.role ===
                  "assistant"
              ) &&
              typeof item.content ===
                "string" &&
              item.content.trim(),
          ),
      )
      .map((item) => ({
        role: item.role,
        content:
          item.content.trim(),
      }))
      .slice(-20);
  }

  private localFallbackAnswer(
    message: string,
  ): string {
    return [
      "Lina şu anda yerel güvenli modda yanıt veriyor.",
      "OpenAI bağlantısı yeniden kullanılabilir olduğunda doğal yanıt üretimi devam edecektir.",
      `Mesajınız alındı: "${message.slice(0, 160)}"`,
    ].join(" ");
  }
}
