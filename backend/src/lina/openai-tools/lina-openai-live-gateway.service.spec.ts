import {
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { LinaOpenAiLiveGatewayService } from "./lina-openai-live-gateway.service";
import { LinaOpenAiRuntimeService } from "./lina-openai-runtime.service";

describe(
  "LinaOpenAiLiveGatewayService",
  () => {
    let runtimeRun: jest.Mock;
    let configGet: jest.Mock;
    let service:
      LinaOpenAiLiveGatewayService;

    beforeEach(() => {
      runtimeRun = jest.fn();

      configGet = jest.fn(
        (key: string) => {
          if (
            key ===
            "OPENAI_API_KEY"
          ) {
            return "test-api-key";
          }

          if (
            key ===
            "OPENAI_MODEL"
          ) {
            return "gpt-4.1-mini";
          }

          return undefined;
        },
      );

      const configService = {
        get: configGet,
      } as unknown as ConfigService;

      const runtimeService = {
        run: runtimeRun,
      } as unknown as LinaOpenAiRuntimeService;

      service =
        new LinaOpenAiLiveGatewayService(
          configService,
          runtimeService,
        );
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it(
      "uses a completed Responses API result without legacy fallback",
      async () => {
        runtimeRun.mockResolvedValue({
          status: "completed",
          success: true,
          message:
            "Responses API yanıtı.",
          iterations: 1,
          toolExecutions: [],
        });

        const fetchSpy =
          jest.spyOn(
            global,
            "fetch",
          );

        const result =
          await service.run({
            message:
              "Konum kataloğunu göster.",
            instructions:
              "Sen Lina'sın.",
            identity: {
              id: "user-1",
              role: "EMLAKCI",
            },
            sourceModule:
              "general",
          });

        expect(result).toEqual({
          status: "completed",
          content:
            "Responses API yanıtı.",
          provider: "responses",
          inputTokens: 0,
          outputTokens: 0,
        });

        expect(
          fetchSpy,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      "returns approval details without invoking legacy fallback",
      async () => {
        runtimeRun.mockResolvedValue({
          status:
            "approval_required",
          success: false,
          message:
            "Bu işlem kullanıcı onayı gerektiriyor.",
          iterations: 1,
          toolExecutions: [],
          pendingApproval: {
            toolName:
              "future_write_tool",
            input: {
              recordId:
                "record-1",
            },
            riskLevel: 2,
            message:
              "Bu işlem kullanıcı onayı gerektiriyor.",
          },
        });

        const fetchSpy =
          jest.spyOn(
            global,
            "fetch",
          );

        const result =
          await service.run({
            message:
              "Kaydı sil.",
            instructions:
              "Sen Lina'sın.",
            identity: {
              id: "user-1",
              role: "EMLAKCI",
            },
            sourceModule: "crm",
          });

        expect(result.status).toBe(
          "approval_required",
        );

        expect(
          result.pendingApproval,
        ).toEqual({
          toolName:
            "future_write_tool",
          input: {
            recordId:
              "record-1",
          },
          riskLevel: 2,
          message:
            "Bu işlem kullanıcı onayı gerektiriyor.",
        });

        expect(
          fetchSpy,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      "uses Chat Completions when the Responses runtime returns an error",
      async () => {
        runtimeRun.mockResolvedValue({
          status: "error",
          success: false,
          message:
            "OPENAI_RESPONSES_HTTP_500",
          iterations: 0,
          toolExecutions: [],
        });

        jest.spyOn(
          global,
          "fetch",
        ).mockResolvedValue({
          ok: true,
          json: async () => ({
            choices: [
              {
                message: {
                  content:
                    "Eski sağlayıcı yanıtı.",
                },
              },
            ],
            usage: {
              prompt_tokens: 22,
              completion_tokens: 8,
            },
          }),
        } as Response);

        const result =
          await service.run({
            message:
              "Bugünkü işlerimi söyle.",
            instructions:
              "Sen Lina'sın.",
            identity: {
              id: "user-1",
              role: "EMLAKCI",
            },
            sourceModule:
              "dashboard",
            history: [
              {
                role: "user",
                content:
                  " Önce görevleri konuşalım. ",
              },
            ],
          });

        expect(result).toEqual({
          status: "completed",
          content:
            "Eski sağlayıcı yanıtı.",
          provider:
            "chat_completions",
          inputTokens: 22,
          outputTokens: 8,
          runtimeError:
            "OPENAI_RESPONSES_HTTP_500",
        });

        expect(
          global.fetch,
        ).toHaveBeenCalledWith(
          "https://api.openai.com/v1/chat/completions",
          expect.objectContaining({
            method: "POST",
          }),
        );
      },
    );

    it(
      "uses local safe mode when no API key exists",
      async () => {
        runtimeRun.mockResolvedValue({
          status: "error",
          success: false,
          message:
            "OPENAI_API_KEY yapılandırılmamış.",
          iterations: 0,
          toolExecutions: [],
        });

        configGet.mockReturnValue(
          undefined,
        );

        const previousKey =
          process.env
            .OPENAI_API_KEY;

        delete process.env
          .OPENAI_API_KEY;

        try {
          const result =
            await service.run({
              message:
                "Merhaba Lina.",
              instructions:
                "Sen Lina'sın.",
              identity: {
                id: "user-1",
                role:
                  "EMLAKCI",
              },
              sourceModule:
                "general",
            });

          expect(result.provider).toBe(
            "local",
          );

          expect(
            result.content,
          ).toContain(
            "yerel güvenli modda",
          );
        } finally {
          if (previousKey) {
            process.env
              .OPENAI_API_KEY =
              previousKey;
          }
        }
      },
    );

    it(
      "does not bypass authoritative user-context failures",
      async () => {
        runtimeRun.mockRejectedValue(
          new UnauthorizedException(
            "Lina kullanıcısı bulunamadı.",
          ),
        );

        const fetchSpy =
          jest.spyOn(
            global,
            "fetch",
          );

        await expect(
          service.run({
            message:
              "CRM verilerimi göster.",
            instructions:
              "Sen Lina'sın.",
            identity: {
              id:
                "missing-user",
            },
            sourceModule: "crm",
          }),
        ).rejects.toThrow(
          "Lina kullanıcısı bulunamadı.",
        );

        expect(
          fetchSpy,
        ).not.toHaveBeenCalled();
      },
    );
  },
);
