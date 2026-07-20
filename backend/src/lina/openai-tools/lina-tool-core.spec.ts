import { Role } from "@prisma/client";

import { LinaToolExecutorService } from "./lina-tool-executor.service";
import { LinaToolPolicyService } from "./lina-tool-policy.service";
import { LinaToolRegistryService } from "./lina-tool-registry.service";
import {
  LinaToolContext,
  LinaToolDefinition,
} from "./lina-tool.types";

const emlakciContext: LinaToolContext = {
  userId: "user-emlakci",
  role: Role.EMLAKCI,
  sourceModule: "crm",
  tenantId: "tenant-1",
  packageName: "GOLD",
  membershipActive: true,
};

const createDefinition = (
  overrides: Partial<LinaToolDefinition> = {},
): LinaToolDefinition => ({
  name: "search_crm_customers",
  description:
    "Kullanıcının erişebildiği CRM müşterilerini arar.",
  family: "crm",
  riskLevel: 0,
  allowedRoles: [Role.EMLAKCI],
  allowedSourceModules: ["crm", "general"],
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
  ...overrides,
});

describe("Lina OpenAI tool core", () => {
  let policy: LinaToolPolicyService;
  let registry: LinaToolRegistryService;
  let executor: LinaToolExecutorService;

  beforeEach(() => {
    policy = new LinaToolPolicyService();
    registry = new LinaToolRegistryService(policy);
    executor = new LinaToolExecutorService(
      registry,
      policy,
    );
  });

  it("registers unique strict tools and exports Responses API schemas", () => {
    registry.register(
      createDefinition(),
      async () => ({
        success: true,
        message: "Arama tamamlandı.",
      }),
    );

    expect(registry.count()).toBe(1);

    expect(
      registry.listOpenAiTools(emlakciContext),
    ).toEqual([
      {
        type: "function",
        name: "search_crm_customers",
        description:
          "Kullanıcının erişebildiği CRM müşterilerini arar.",
        parameters: {
          type: "object",
          properties: {
            query: {
              type: "string",
            },
          },
          required: ["query"],
          additionalProperties: false,
        },
        strict: true,
      },
    ]);

    expect(() =>
      registry.register(
        createDefinition(),
        async () => ({
          success: true,
          message: "Tekrar.",
        }),
      ),
    ).toThrow(
      "LINA_TOOL_DUPLICATE_NAME:search_crm_customers",
    );
  });

  it("rejects tool schemas that are not strict", () => {
    expect(() =>
      registry.register(
        createDefinition({
          name: "invalid_optional_schema",
          inputSchema: {
            type: "object",
            properties: {
              query: {
                type: "string",
              },
            },
            required: [],
            additionalProperties: false,
          },
        }),
        async () => ({
          success: true,
          message: "Tamam.",
        }),
      ),
    ).toThrow(
      "LINA_TOOL_STRICT_REQUIRED_FIELDS:invalid_optional_schema",
    );

    expect(() =>
      registry.register(
        createDefinition({
          name: "invalid_open_schema",
          inputSchema: {
            type: "object",
            properties: {
              query: {
                type: "string",
              },
            },
            required: ["query"],
            additionalProperties: true,
          },
        }),
        async () => ({
          success: true,
          message: "Tamam.",
        }),
      ),
    ).toThrow(
      "LINA_TOOL_STRICT_ADDITIONAL_PROPERTIES:invalid_open_schema",
    );
  });

  it("filters the dynamic catalog by role, module and membership", () => {
    registry.register(
      createDefinition({
        requiresActiveMembership: true,
      }),
      async () => ({
        success: true,
        message: "Tamam.",
      }),
    );

    expect(
      registry.listDefinitions(emlakciContext),
    ).toHaveLength(1);

    expect(
      registry.listDefinitions({
        ...emlakciContext,
        role: Role.MUTEAHHIT,
      }),
    ).toHaveLength(0);

    expect(
      registry.listDefinitions({
        ...emlakciContext,
        sourceModule: "projects",
      }),
    ).toHaveLength(0);

    expect(
      registry.listDefinitions({
        ...emlakciContext,
        membershipActive: false,
      }),
    ).toHaveLength(0);
  });

  it("runs a permitted read tool without confirmation", async () => {
    const handler = jest.fn(
      async (
        input: Record<string, unknown>,
      ) => ({
        success: true,
        message: "2 müşteri bulundu.",
        data: {
          query: input.query,
          count: 2,
        },
      }),
    );

    registry.register(
      createDefinition(),
      handler,
    );

    const result = await executor.execute(
      {
        name: "search_crm_customers",
        input: {
          query: "Ahmet",
        },
      },
      emlakciContext,
    );

    expect(result.status).toBe("success");
    expect(result.success).toBe(true);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(result.data).toEqual({
      query: "Ahmet",
      count: 2,
    });
  });

  it("requires explicit confirmation before a write tool runs", async () => {
    const handler = jest.fn(async () => ({
      success: true,
      message: "CRM kaydı oluşturuldu.",
    }));

    registry.register(
      createDefinition({
        name: "create_crm_customer",
        description:
          "Onaylanan CRM müşteri taslağını oluşturur.",
        riskLevel: 2,
      }),
      handler,
    );

    const pendingResult = await executor.execute(
      {
        name: "create_crm_customer",
        input: {
          query: "Ahmet Yılmaz",
        },
      },
      emlakciContext,
    );

    expect(pendingResult.status).toBe(
      "approval_required",
    );
    expect(
      pendingResult.requiresConfirmation,
    ).toBe(true);
    expect(handler).not.toHaveBeenCalled();

    const confirmedResult = await executor.execute(
      {
        name: "create_crm_customer",
        input: {
          query: "Ahmet Yılmaz",
        },
        confirmed: true,
      },
      emlakciContext,
    );

    expect(confirmedResult.status).toBe("success");
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("blocks unknown and unauthorized tool calls", async () => {
    const unknownResult = await executor.execute(
      {
        name: "run_arbitrary_sql",
        input: {},
      },
      emlakciContext,
    );

    expect(unknownResult.status).toBe("not_found");

    registry.register(
      createDefinition(),
      async () => ({
        success: true,
        message: "Tamam.",
      }),
    );

    const unauthorizedResult =
      await executor.execute(
        {
          name: "search_crm_customers",
          input: {
            query: "Ahmet",
          },
        },
        {
          ...emlakciContext,
          role: Role.ADMIN,
        },
      );

    expect(unauthorizedResult.status).toBe(
      "denied",
    );
    expect(unauthorizedResult.success).toBe(false);
  });
});
