import {
  LinaOpenAiFunctionTool,
  LinaPendingApproval,
  LinaToolContext,
  LinaToolExecutionResult,
} from "./lina-tool.types";

export type LinaConversationRole =
  | "user"
  | "assistant";

export type LinaConversationMessage = {
  role: LinaConversationRole;
  content: string;
};

export type LinaOpenAiInputItem =
  | LinaConversationMessage
  | {
      type: "function_call_output";
      call_id: string;
      output: string;
    }
  | Record<string, unknown>;

export type LinaOpenAiFunctionCallItem = {
  type: "function_call";
  call_id: string;
  name: string;
  arguments: string;
  id?: string;
  status?: string;
};

export type LinaOpenAiTextContent = {
  type: "output_text";
  text: string;
};

export type LinaOpenAiRefusalContent = {
  type: "refusal";
  refusal: string;
};

export type LinaOpenAiMessageItem = {
  type: "message";
  role?: "assistant";
  content?: Array<
    LinaOpenAiTextContent |
    LinaOpenAiRefusalContent |
    Record<string, unknown>
  >;
};

export type LinaOpenAiOutputItem =
  | LinaOpenAiFunctionCallItem
  | LinaOpenAiMessageItem
  | (Record<string, unknown> & {
      type: string;
    });

export type LinaOpenAiResponse = {
  id?: string;
  output?: LinaOpenAiOutputItem[];
  output_text?: string;
  error?: {
    message?: string;
  };
};

export type LinaOpenAiCreateResponseRequest = {
  instructions: string;
  input: LinaOpenAiInputItem[];
  tools: LinaOpenAiFunctionTool[];
  toolChoice?: "auto" | "none" | "required";
  maxOutputTokens?: number;
};

export type LinaOpenAiOrchestratorInput = {
  message: string;
  instructions: string;
  context: LinaToolContext;
  history?: LinaConversationMessage[];
};

export type LinaOpenAiOrchestratorStatus =
  | "completed"
  | "approval_required"
  | "error";

export type LinaOpenAiOrchestratorResult = {
  status: LinaOpenAiOrchestratorStatus;
  success: boolean;
  message: string;
  iterations: number;
  toolExecutions: LinaToolExecutionResult[];
  pendingApproval?: LinaPendingApproval;
};
