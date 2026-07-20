import { Role } from "@prisma/client";

export type LinaToolRiskLevel = 0 | 1 | 2 | 3 | 4;

export type LinaToolSourceModule =
  | "dashboard"
  | "crm"
  | "network"
  | "pool"
  | "notifications"
  | "general"
  | "portfolio"
  | "projects"
  | "stock"
  | "admin";

export type LinaToolContext = {
  userId: string;
  role: Role;
  sourceModule: LinaToolSourceModule;
  tenantId?: string | null;
  packageName?: string | null;
  membershipActive?: boolean;
  metadata?: Record<string, unknown>;
};

export type LinaToolJsonSchema = {
  type: "object";
  properties: Record<string, unknown>;
  required?: string[];
  additionalProperties?: boolean;
};

export type LinaToolDefinition = {
  name: string;
  description: string;
  family: string;
  riskLevel: LinaToolRiskLevel;
  inputSchema: LinaToolJsonSchema;
  allowedRoles?: Role[];
  allowedSourceModules?: LinaToolSourceModule[];
  requiredPackages?: string[];
  requiresActiveMembership?: boolean;
  requiresTenant?: boolean;
  requiresConfirmation?: boolean;
};

export type LinaToolHandlerResult = {
  success: boolean;
  message: string;
  data?: unknown;
};

export type LinaToolHandler = (
  input: Record<string, unknown>,
  context: LinaToolContext,
) => Promise<LinaToolHandlerResult> | LinaToolHandlerResult;

export type LinaRegisteredTool = {
  definition: LinaToolDefinition;
  handler: LinaToolHandler;
};

export type LinaOpenAiFunctionTool = {
  type: "function";
  name: string;
  description: string;
  parameters: LinaToolJsonSchema;
  strict: true;
};

export type LinaToolPolicyDecision = {
  allowed: boolean;
  reason?: string;
};

export type LinaToolCall = {
  name: string;
  input: Record<string, unknown>;
  confirmed?: boolean;
};

export type LinaToolExecutionStatus =
  | "success"
  | "approval_required"
  | "denied"
  | "not_found"
  | "error";

export type LinaToolExecutionResult = {
  status: LinaToolExecutionStatus;
  success: boolean;
  toolName: string;
  message: string;
  data?: unknown;
  riskLevel?: LinaToolRiskLevel;
  requiresConfirmation?: boolean;
};

export type LinaPendingApproval = {
  toolName: string;
  input: Record<string, unknown>;
  riskLevel: LinaToolRiskLevel;
  message: string;
};
