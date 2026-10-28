import {
  Role,
} from "@prisma/client";
import {
  UnauthorizedException,
} from "@nestjs/common";

import { LinaUserContextService } from "../catalog/lina-user-context.service";
import { LinaOpenAiOrchestratorService } from "./lina-openai-orchestrator.service";
import { LinaOpenAiRuntimeService } from "./lina-openai-runtime.service";
import {
  LinaOpenAiOrchestratorResult,
} from "./lina-openai-response.types";
import {
  LinaToolContext,
} from "./lina-tool.types";

describe("LinaOpenAiRuntimeService", () => {
  let resolveContext: jest.Mock;
  let runOrchestrator: jest.Mock;
  let runtime:
    LinaOpenAiRuntimeService;

  const context: LinaToolContext = {
    userId: "user-1",
    role: Role.EMLAKCI,
    sourceModule: "crm",
    tenantId: "office-1",
    packageName: "GOLD",
    membershipActive: true,
  };

  const completedResult:
    LinaOpenAiOrchestratorResult = {
    status: "completed",
    success: true,
    message:
      "Doğrulanmış CRM bağlamıyla yanıt oluşturuldu.",
    iterations: 1,
    toolExecutions: [],
  };

  beforeEach(() => {
    resolveContext =
      jest.fn().mockResolvedValue(
        context,
      );

    runOrchestrator =
      jest.fn().mockResolvedValue(
        completedResult,
      );

    const userContextService = {
      resolve: resolveContext,
    } as unknown as LinaUserContextService;

    const orchestratorService = {
      run: runOrchestrator,
    } as unknown as LinaOpenAiOrchestratorService;

    runtime =
      new LinaOpenAiRuntimeService(
        userContextService,
        orchestratorService,
      );
  });

  it("resolves authoritative context and runs the orchestrator", async () => {
    const result = await runtime.run({
      message:
        " CRM müşterilerimi göster. ",
      instructions:
        " Sen EPH dijital asistanı Lina'sın. ",
      identity: {
        id: "user-1",
        role: "ADMIN",
        email:
          "user@example.com",
      },
      sourceModule: "crm",
      history: [
        {
          role: "user",
          content:
            " Önce son müşterilere bakalım. ",
        },
        {
          role: "assistant",
          content:
            " Müşteri kayıtlarını kontrol ediyorum. ",
        },
      ],
    });

    expect(resolveContext).toHaveBeenCalledWith(
      {
        id: "user-1",
        role: "ADMIN",
        email:
          "user@example.com",
      },
      "crm",
    );

    expect(runOrchestrator).toHaveBeenCalledWith({
      message:
        "CRM müşterilerimi göster.",
      instructions:
        "Sen EPH dijital asistanı Lina'sın.",
      context,
      history: [
        {
          role: "user",
          content:
            "Önce son müşterilere bakalım.",
        },
        {
          role: "assistant",
          content:
            "Müşteri kayıtlarını kontrol ediyorum.",
        },
      ],
    });

    expect(result).toEqual(
      completedResult,
    );
  });

  it("rejects an empty message before resolving context", async () => {
    const result = await runtime.run({
      message: "   ",
      instructions:
        "Sen EPH dijital asistanı Lina'sın.",
      identity: {
        id: "user-1",
      },
      sourceModule: "crm",
    });

    expect(result).toEqual({
      status: "error",
      success: false,
      message:
        "Lina'ya gönderilecek kullanıcı mesajı boş olamaz.",
      iterations: 0,
      toolExecutions: [],
    });

    expect(resolveContext).not.toHaveBeenCalled();
    expect(runOrchestrator).not.toHaveBeenCalled();
  });

  it("rejects missing instructions before resolving context", async () => {
    const result = await runtime.run({
      message:
        "Portföylerimi göster.",
      instructions: "   ",
      identity: {
        id: "user-1",
      },
      sourceModule: "pool",
    });

    expect(result).toEqual({
      status: "error",
      success: false,
      message:
        "Lina OpenAI sistem talimatı bulunamadı.",
      iterations: 0,
      toolExecutions: [],
    });

    expect(resolveContext).not.toHaveBeenCalled();
    expect(runOrchestrator).not.toHaveBeenCalled();
  });

  it("normalizes an unknown module to general", async () => {
    await runtime.run({
      message: "Bugünü planla.",
      instructions:
        "Sen EPH dijital asistanı Lina'sın.",
      identity: {
        id: "user-1",
      },
      sourceModule:
        "invalid" as never,
    });

    expect(resolveContext).toHaveBeenCalledWith(
      {
        id: "user-1",
      },
      "general",
    );
  });

  it("keeps only the latest twenty valid history messages", async () => {
    const history = Array.from(
      {
        length: 25,
      },
      (_, index) => ({
        role:
          index % 2 === 0
            ? "user" as const
            : "assistant" as const,
        content: ` Mesaj ${index + 1} `,
      }),
    );

    await runtime.run({
      message: "Devam et.",
      instructions:
        "Sen EPH dijital asistanı Lina'sın.",
      identity: {
        id: "user-1",
      },
      sourceModule: "general",
      history,
    });

    const orchestratorInput =
      runOrchestrator.mock
        .calls[0][0];

    expect(
      orchestratorInput.history,
    ).toHaveLength(20);

    expect(
      orchestratorInput.history[0]
        .content,
    ).toBe("Mesaj 6");

    expect(
      orchestratorInput.history[19]
        .content,
    ).toBe("Mesaj 25");
  });

  it("does not call the orchestrator when authoritative context fails", async () => {
    resolveContext.mockRejectedValueOnce(
      new UnauthorizedException(
        "Lina kullanıcısı bulunamadı.",
      ),
    );

    await expect(
      runtime.run({
        message:
          "CRM müşterilerimi göster.",
        instructions:
          "Sen EPH dijital asistanı Lina'sın.",
        identity: {
          id: "missing-user",
        },
        sourceModule: "crm",
      }),
    ).rejects.toThrow(
      "Lina kullanıcısı bulunamadı.",
    );

    expect(runOrchestrator).not.toHaveBeenCalled();
  });
});
