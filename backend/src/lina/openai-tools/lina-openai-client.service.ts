import {
  Injectable,
  Logger,
} from "@nestjs/common";

import {
  LinaOpenAiCreateResponseRequest,
  LinaOpenAiResponse,
} from "./lina-openai-response.types";

@Injectable()
export class LinaOpenAiClientService {
  private readonly logger = new Logger(
    LinaOpenAiClientService.name,
  );

  private readonly endpoint =
    process.env.LINA_OPENAI_RESPONSES_URL?.trim() ||
    "https://api.openai.com/v1/responses";

  private readonly model =
    process.env.LINA_OPENAI_MODEL?.trim() ||
    process.env.OPENAI_MODEL?.trim() ||
    "gpt-4.1-mini";

  async createResponse(
    request: LinaOpenAiCreateResponseRequest,
  ): Promise<LinaOpenAiResponse> {
    const apiKey =
      process.env.OPENAI_API_KEY?.trim();

    if (!apiKey) {
      throw new Error(
        "OPENAI_API_KEY yapılandırılmamış.",
      );
    }

    const timeoutMs = this.readTimeoutMs();
    const controller = new AbortController();

    const timeout = setTimeout(
      () => controller.abort(),
      timeoutMs,
    );

    try {
      const payload: Record<string, unknown> = {
        model: this.model,
        instructions: request.instructions,
        input: request.input,
        tool_choice:
          request.toolChoice || "auto",
        store: false,
        max_output_tokens:
          request.maxOutputTokens || 1400,
      };

      if (request.tools.length > 0) {
        payload.tools = request.tools;
      }

      const response = await fetch(
        this.endpoint,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        },
      );

      const responseText =
        await response.text();

      let parsed: LinaOpenAiResponse;

      try {
        parsed = responseText
          ? JSON.parse(responseText)
          : {};
      } catch {
        throw new Error(
          `OPENAI_RESPONSES_INVALID_JSON:${response.status}`,
        );
      }

      if (!response.ok) {
        const remoteMessage =
          parsed.error?.message?.trim() ||
          responseText.slice(0, 500) ||
          "OpenAI Responses API isteği başarısız.";

        throw new Error(
          `OPENAI_RESPONSES_HTTP_${response.status}:${remoteMessage}`,
        );
      }

      return parsed;
    } catch (error) {
      if (
        error instanceof Error &&
        error.name === "AbortError"
      ) {
        throw new Error(
          `OPENAI_RESPONSES_TIMEOUT:${timeoutMs}`,
        );
      }

      this.logger.error(
        error instanceof Error
          ? error.message
          : "OpenAI Responses API bilinmeyen hatası.",
      );

      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  private readTimeoutMs(): number {
    const configured = Number(
      process.env.LINA_OPENAI_TIMEOUT_MS,
    );

    if (
      Number.isFinite(configured) &&
      configured >= 5000 &&
      configured <= 120000
    ) {
      return configured;
    }

    return 45000;
  }
}
