import { Role } from "@prisma/client";

import { LinaOpenAiClientService } from "./lina-openai-client.service";
import { LinaOpenAiOrchestratorService } from "./lina-openai-orchestrator.service";
import { LinaToolExecutorService } from "./lina-tool-executor.service";
import { LinaToolPolicyService } from "./lina-tool-policy.service";
import { LinaToolRegistryService } from "./lina-tool-registry.service";
import { LinaToolContext } from "./lina-tool.types";

const context: LinaToolContext = {
  userId: "emlakci-1",
  role: Role.EMLAKCI,
  sourceModule: "crm",
  tenantId: "tenant-1",
  packageName: "GOLD",
  membershipActive: true,
};

describe("LinaOpenAiOrchestratorService", () => {
  let createResponse: jest.Mock;
  let registry: LinaToolRegistryService;
  let executor: LinaToolExecutorService;
  let orchestrator:
    LinaOpenAiOrchestratorService;

  beforeEach(() => {
    const policy =
      new LinaToolPolicyService();

    registry =
      new LinaToolRegistryService(policy);

    executor =
      new LinaToolExecutorService(
        registry,
        policy,
      );

    createResponse = jest.fn();

    const client = {
      createResponse,
    } as unknown as LinaOpenAiClientService;

    orchestrator =
      new LinaOpenAiOrchestratorService(
        client,
        registry,
        executor,
      );
  });

  it("returns a direct OpenAI answer when no tool is required", async () => {
    createResponse.mockResolvedValueOnce({
      id: "response-1",
      output: [
        {
          type: "message",
          role: "assistant",
          content: [
            {
              type: "output_text",
              text:
                "Bugünkü çalışmalarınızı birlikte planlayabiliriz.",
            },
          ],
        },
      ],
    });

    const result = await orchestrator.run({
      message:
        "Bugün nereden başlamalıyım?",
      instructions:
        "Sen EPH dijital asistanı Lina'sın.",
      context,
    });

    expect(result.status).toBe("completed");
    expect(result.success).toBe(true);
    expect(result.message).toContain(
      "birlikte planlayabiliriz",
    );
    expect(result.iterations).toBe(1);
    expect(createResponse).toHaveBeenCalledTimes(1);

    expect(
      createResponse.mock.calls[0][0].tools,
    ).toEqual([]);
  });

  it("executes a read tool and returns its result to OpenAI", async () => {
    const handler = jest.fn(
      async (
        input: Record<string, unknown>,
      ) => ({
        success: true,
        message: "Müşteri araması tamamlandı.",
        data: {
          query: input.query,
          count: 2,
        },
      }),
    );

    registry.register(
      {
        name: "search_crm_customers",
        description:
          "CRM müşterilerini kullanıcının yetkileri içinde arar.",
        family: "crm",
        riskLevel: 0,
        allowedRoles: [Role.EMLAKCI],
        allowedSourceModules: [
          "crm",
          "general",
        ],
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
            },
          },
          required: ["query"],
          additionalProperties: false,
        },
      },
      handler,
    );

    createResponse
      .mockResolvedValueOnce({
        id: "response-tool",
        output: [
          {
            type: "function_call",
            call_id: "call-1",
            name: "search_crm_customers",
            arguments:
              '{"query":"Ahmet"}',
          },
        ],
      })
      .mockResolvedValueOnce({
        id: "response-final",
        output: [
          {
            type: "message",
            role: "assistant",
            content: [
              {
                type: "output_text",
                text:
                  "Ahmet adına uyan iki CRM kaydı buldum.",
              },
            ],
          },
        ],
      });

    const result = await orchestrator.run({
      message:
        "CRM'de Ahmet isimli müşterileri bul.",
      instructions:
        "Sen EPH dijital asistanı Lina'sın.",
      context,
    });

    expect(result.status).toBe("completed");
    expect(result.success).toBe(true);
    expect(result.iterations).toBe(2);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(createResponse).toHaveBeenCalledTimes(2);
    expect(result.toolExecutions).toHaveLength(1);

    const secondRequest =
      createResponse.mock.calls[1][0];

    expect(
      secondRequest.input,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "function_call_output",
          call_id: "call-1",
          output: expect.stringContaining(
            '"count":2',
          ),
        }),
      ]),
    );
  });

  it("stops before a write tool and returns pending approval", async () => {
    const handler = jest.fn(async () => ({
      success: true,
      message: "CRM kaydı oluşturuldu.",
    }));

    registry.register(
      {
        name: "create_crm_customer",
        description:
          "Onaylanmış CRM müşteri kaydını oluşturur.",
        family: "crm",
        riskLevel: 2,
        allowedRoles: [Role.EMLAKCI],
        allowedSourceModules: [
          "crm",
          "general",
        ],
        inputSchema: {
          type: "object",
          properties: {
            customerName: {
              type: "string",
            },
          },
          required: ["customerName"],
          additionalProperties: false,
        },
      },
      handler,
    );

    createResponse.mockResolvedValueOnce({
      id: "response-write",
      output: [
        {
          type: "function_call",
          call_id: "call-write",
          name: "create_crm_customer",
          arguments:
            '{"customerName":"Ahmet Yılmaz"}',
        },
      ],
    });

    const result = await orchestrator.run({
      message:
        "Ahmet Yılmaz adına müşteri kaydı oluştur.",
      instructions:
        "Sen EPH dijital asistanı Lina'sın.",
      context,
    });

    expect(result.status).toBe(
      "approval_required",
    );
    expect(result.success).toBe(false);
    expect(result.pendingApproval).toEqual({
      toolName: "create_crm_customer",
      input: {
        customerName: "Ahmet Yılmaz",
      },
      riskLevel: 2,
      message:
        "Bu işlem gerçekleştirilmeden önce kullanıcının açık onayı gerekir.",
    });

    expect(handler).not.toHaveBeenCalled();
    expect(createResponse).toHaveBeenCalledTimes(1);
  });

  it("returns an invalid tool argument error to OpenAI instead of crashing", async () => {
    registry.register(
      {
        name: "search_crm_customers",
        description:
          "CRM müşterilerini arar.",
        family: "crm",
        riskLevel: 0,
        allowedRoles: [Role.EMLAKCI],
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
            },
          },
          required: ["query"],
          additionalProperties: false,
        },
      },
      async () => ({
        success: true,
        message: "Tamam.",
      }),
    );

    createResponse
      .mockResolvedValueOnce({
        output: [
          {
            type: "function_call",
            call_id: "bad-call",
            name: "search_crm_customers",
            arguments: "{bozuk-json",
          },
        ],
      })
      .mockResolvedValueOnce({
        output: [
          {
            type: "message",
            role: "assistant",
            content: [
              {
                type: "output_text",
                text:
                  "Arama parametrelerini anlayamadım. Müşteri adını tekrar söyler misiniz?",
              },
            ],
          },
        ],
      });

    const result = await orchestrator.run({
      message: "Müşteriyi bul.",
      instructions:
        "Sen EPH dijital asistanı Lina'sın.",
      context,
    });

    expect(result.status).toBe("completed");
    expect(result.toolExecutions[0]).toEqual(
      expect.objectContaining({
        status: "error",
        success: false,
        toolName: "search_crm_customers",
      }),
    );

    const secondRequest =
      createResponse.mock.calls[1][0];

    expect(
      secondRequest.input,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "function_call_output",
          call_id: "bad-call",
          output: expect.stringContaining(
            "geçerli JSON değil",
          ),
        }),
      ]),
    );
  });

  it("returns the real OpenAI client error without claiming success", async () => {
    createResponse.mockRejectedValueOnce(
      new Error(
        "OPENAI_RESPONSES_HTTP_500:test",
      ),
    );

    const result = await orchestrator.run({
      message: "Portföylerimi getir.",
      instructions:
        "Sen EPH dijital asistanı Lina'sın.",
      context,
    });

    expect(result.status).toBe("error");
    expect(result.success).toBe(false);
    expect(result.message).toContain(
      "OPENAI_RESPONSES_HTTP_500",
    );
  });
});
