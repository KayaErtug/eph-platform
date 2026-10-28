import { Injectable } from "@nestjs/common";

import { LinaOpenAiClientService } from "./lina-openai-client.service";
import {
  LinaOpenAiFunctionCallItem,
  LinaOpenAiInputItem,
  LinaOpenAiOrchestratorInput,
  LinaOpenAiOrchestratorResult,
  LinaOpenAiOutputItem,
  LinaOpenAiResponse,
} from "./lina-openai-response.types";
import { LinaToolExecutorService } from "./lina-tool-executor.service";
import { LinaToolRegistryService } from "./lina-tool-registry.service";
import {
  LinaToolExecutionResult,
  LinaToolRiskLevel,
} from "./lina-tool.types";

@Injectable()
export class LinaOpenAiOrchestratorService {
  private readonly maximumIterations = 6;

  constructor(
    private readonly clientService:
      LinaOpenAiClientService,
    private readonly registryService:
      LinaToolRegistryService,
    private readonly executorService:
      LinaToolExecutorService,
  ) {}

  async run(
    request: LinaOpenAiOrchestratorInput,
  ): Promise<LinaOpenAiOrchestratorResult> {
    const message = request.message.trim();
    const instructions =
      request.instructions.trim();

    if (!message) {
      return this.errorResult(
        "Lina'ya gönderilecek kullanıcı mesajı boş olamaz.",
        0,
        [],
      );
    }

    if (!instructions) {
      return this.errorResult(
        "Lina OpenAI sistem talimatı bulunamadı.",
        0,
        [],
      );
    }

    const tools =
      this.registryService.listOpenAiTools(
        request.context,
      );

    const conversation: LinaOpenAiInputItem[] = [
      ...(request.history || [])
        .filter((item) =>
          Boolean(item.content?.trim()),
        )
        .map((item) => ({
          role: item.role,
          content: item.content.trim(),
        })),
      {
        role: "user",
        content: message,
      },
    ];

    const toolExecutions:
      LinaToolExecutionResult[] = [];

    try {
      for (
        let iteration = 1;
        iteration <= this.maximumIterations;
        iteration += 1
      ) {
        const response =
          await this.clientService.createResponse({
            instructions,
            input: conversation,
            tools,
            toolChoice: "auto",
            maxOutputTokens: 1400,
          });

        const output = Array.isArray(
          response.output,
        )
          ? response.output
          : [];

        const functionCalls =
          output.filter(
            this.isFunctionCallItem,
          );

        if (functionCalls.length === 0) {
          const answer =
            this.extractResponseText(response);

          if (!answer) {
            return this.errorResult(
              "OpenAI herhangi bir metin veya araç çağrısı üretmedi.",
              iteration,
              toolExecutions,
            );
          }

          return {
            status: "completed",
            success: true,
            message: answer,
            iterations: iteration,
            toolExecutions,
          };
        }

        conversation.push(
          ...output.map(
            (item) =>
              item as LinaOpenAiInputItem,
          ),
        );

        for (const functionCall of functionCalls) {
          const parsedInput =
            this.parseToolArguments(
              functionCall.arguments,
            );

          let execution:
            LinaToolExecutionResult;

          if (parsedInput.success === false) {
            execution = {
              status: "error",
              success: false,
              toolName: functionCall.name,
              message: parsedInput.message,
            };
          } else {
            execution =
              await this.executorService.execute(
                {
                  name: functionCall.name,
                  input: parsedInput.input,
                },
                request.context,
              );
          }

          toolExecutions.push(execution);

          if (
            execution.status ===
            "approval_required"
          ) {
            return {
              status: "approval_required",
              success: false,
              message: execution.message,
              iterations: iteration,
              toolExecutions,
              pendingApproval: {
                toolName: functionCall.name,
                input: parsedInput.success
                  ? parsedInput.input
                  : {},
                riskLevel:
                  execution.riskLevel || 2,
                message: execution.message,
              },
            };
          }

          conversation.push({
            type: "function_call_output",
            call_id: functionCall.call_id,
            output: JSON.stringify(execution),
          });
        }
      }

      return this.errorResult(
        "Lina araç çağrısı güvenlik döngüsü sınırına ulaştı.",
        this.maximumIterations,
        toolExecutions,
      );
    } catch (error) {
      return this.errorResult(
        error instanceof Error
          ? error.message
          : "Lina OpenAI orkestratöründe bilinmeyen hata oluştu.",
        toolExecutions.length > 0 ? 1 : 0,
        toolExecutions,
      );
    }
  }

  private isFunctionCallItem(
    item: LinaOpenAiOutputItem,
  ): item is LinaOpenAiFunctionCallItem {
    return (
      item?.type === "function_call" &&
      typeof (
        item as LinaOpenAiFunctionCallItem
      ).call_id === "string" &&
      typeof (
        item as LinaOpenAiFunctionCallItem
      ).name === "string" &&
      typeof (
        item as LinaOpenAiFunctionCallItem
      ).arguments === "string"
    );
  }

  private parseToolArguments(
    rawArguments: string,
  ):
    | {
        success: true;
        input: Record<string, unknown>;
      }
    | {
        success: false;
        message: string;
      } {
    try {
      const parsed = JSON.parse(
        rawArguments || "{}",
      );

      if (
        !parsed ||
        typeof parsed !== "object" ||
        Array.isArray(parsed)
      ) {
        return {
          success: false,
          message:
            "OpenAI araç parametreleri JSON nesnesi biçiminde değil.",
        };
      }

      return {
        success: true,
        input: parsed as Record<
          string,
          unknown
        >,
      };
    } catch {
      return {
        success: false,
        message:
          "OpenAI araç parametreleri geçerli JSON değil.",
      };
    }
  }

  private extractResponseText(
    response: LinaOpenAiResponse,
  ): string {
    if (
      typeof response.output_text === "string" &&
      response.output_text.trim()
    ) {
      return response.output_text.trim();
    }

    const texts: string[] = [];

    for (const item of response.output || []) {
      if (
        item.type !== "message" ||
        !Array.isArray(
          (
            item as {
              content?: unknown[];
            }
          ).content,
        )
      ) {
        continue;
      }

      for (
        const content of (
          item as {
            content: Array<
              Record<string, unknown>
            >;
          }
        ).content
      ) {
        if (
          content.type === "output_text" &&
          typeof content.text === "string"
        ) {
          texts.push(content.text.trim());
        }

        if (
          content.type === "refusal" &&
          typeof content.refusal === "string"
        ) {
          texts.push(content.refusal.trim());
        }
      }
    }

    return texts
      .filter(Boolean)
      .join("\n")
      .trim();
  }

  private errorResult(
    message: string,
    iterations: number,
    toolExecutions:
      LinaToolExecutionResult[],
  ): LinaOpenAiOrchestratorResult {
    return {
      status: "error",
      success: false,
      message,
      iterations,
      toolExecutions,
    };
  }
}
