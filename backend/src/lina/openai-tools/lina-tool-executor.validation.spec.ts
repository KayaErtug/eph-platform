import { Role } from "@prisma/client";

import { LinaToolExecutorService } from "./lina-tool-executor.service";
import { LinaToolInputValidatorService } from "./lina-tool-input-validator.service";
import { LinaToolPolicyService } from "./lina-tool-policy.service";
import { LinaToolRegistryService } from "./lina-tool-registry.service";
import {
  LinaToolContext,
  LinaToolDefinition,
} from "./lina-tool.types";

const context: LinaToolContext = {
  userId: "user-1",
  role: Role.EMLAKCI,
  sourceModule: "crm",
  packageName: "GOLD",
  membershipActive: true,
};

const createDefinition = (
  overrides: Partial<LinaToolDefinition> = {},
): LinaToolDefinition => ({
  name: "create_crm_customer",
  description:
    "Onaylanan CRM müşteri kaydını oluşturur.",
  family: "crm",
  riskLevel: 2,
  allowedRoles: [Role.EMLAKCI],
  allowedSourceModules: ["crm"],
  inputSchema: {
    type: "object",
    properties: {
      customerName: {
        type: "string",
        minLength: 2,
        maxLength: 100,
      },
    },
    required: ["customerName"],
    additionalProperties: false,
  },
  ...overrides,
});

describe("LinaToolExecutorService runtime validation", () => {
  let registry: LinaToolRegistryService;
  let executor: LinaToolExecutorService;

  beforeEach(() => {
    const policy =
      new LinaToolPolicyService();

    registry =
      new LinaToolRegistryService(policy);

    executor =
      new LinaToolExecutorService(
        registry,
        policy,
        new LinaToolInputValidatorService(),
      );
  });

  it("blocks invalid input before confirmation", async () => {
    const handler = jest.fn(async () => ({
      success: true,
      message: "CRM kaydı oluşturuldu.",
    }));

    registry.register(
      createDefinition(),
      handler,
    );

    const result = await executor.execute(
      {
        name: "create_crm_customer",
        input: {
          customerName: "A",
        },
      },
      context,
    );

    expect(result.status).toBe("error");
    expect(result.success).toBe(false);
    expect(
      result.requiresConfirmation,
    ).toBe(false);
    expect(result.data).toEqual({
      issues: [
        "$.customerName: en az 2 karakter olmalıdır.",
      ],
    });
    expect(handler).not.toHaveBeenCalled();
  });

  it("blocks unknown input fields", async () => {
    const handler = jest.fn(async () => ({
      success: true,
      message: "CRM kaydı oluşturuldu.",
    }));

    registry.register(
      createDefinition(),
      handler,
    );

    const result = await executor.execute(
      {
        name: "create_crm_customer",
        input: {
          customerName: "Ahmet",
          unauthorizedField: true,
        },
      },
      context,
    );

    expect(result.status).toBe("error");
    expect(result.data).toEqual({
      issues: [
        "$.unauthorizedField: tanımsız alan gönderilemez.",
      ],
    });
    expect(handler).not.toHaveBeenCalled();
  });

  it("requires confirmation after valid input validation", async () => {
    const handler = jest.fn(async () => ({
      success: true,
      message: "CRM kaydı oluşturuldu.",
    }));

    registry.register(
      createDefinition(),
      handler,
    );

    const result = await executor.execute(
      {
        name: "create_crm_customer",
        input: {
          customerName: "Ahmet Yılmaz",
        },
      },
      context,
    );

    expect(result.status).toBe(
      "approval_required",
    );
    expect(
      result.requiresConfirmation,
    ).toBe(true);
    expect(handler).not.toHaveBeenCalled();
  });

  it("runs the handler after valid confirmed input", async () => {
    const handler = jest.fn(async () => ({
      success: true,
      message: "CRM kaydı oluşturuldu.",
    }));

    registry.register(
      createDefinition(),
      handler,
    );

    const result = await executor.execute(
      {
        name: "create_crm_customer",
        input: {
          customerName: "Ahmet Yılmaz",
        },
        confirmed: true,
      },
      context,
    );

    expect(result.status).toBe("success");
    expect(result.success).toBe(true);
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
