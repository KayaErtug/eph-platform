import { Role } from "@prisma/client";

export type LinaActionSourceModule =
  | "dashboard"
  | "crm"
  | "portfolio"
  | "pool"
  | "requests"
  | "forum"
  | "network"
  | "project_sales"
  | "kontor"
  | "membership"
  | "messages"
  | "notifications"
  | "admin"
  | "general";

export type LinaActionUser = {
  id?: string;
  role?: string;
  email?: string;
};

export type LinaResolvedUser = {
  id: string;
  role: Role;
  email?: string;
};

export type LinaActionHistoryItem = {
  role: "user" | "assistant";
  content: string;
};

export type LinaActionName =
  | "crm_customer_list"
  | "crm_customer_find"
  | "crm_customer_create"
  | "crm_customer_create_with_interest"
  | "crm_customer_update"
  | "crm_customer_status_update"
  | "crm_customer_delete"
  | "crm_activity_create"
  | "crm_task_create"
  | "crm_task_update"
  | "confirmation_cancelled";

export type LinaActionExecutionResult = {
  handled: boolean;
  success?: boolean;
  message?: string;
  action?: LinaActionName;
  requiresConfirmation?: boolean;
  data?: unknown;
};

export type LinaPendingAction =
  | {
      type: "crm_customer_delete";
      userId: string;
      createdAt: number;
      expiresAt: number;
      payload: {
        customerId: string;
        customerName: string;
      };
    };
