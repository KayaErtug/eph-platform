export const LINA_SOURCE_MODULES = [
  "dashboard",
  "crm",
  "portfolio",
  "pool",
  "requests",
  "forum",
  "network",
  "project_sales",
  "kontor",
  "membership",
  "messages",
  "notifications",
  "admin",
  "audit",
  "tasks",
  "projects",
  "stock",
  "general",
] as const;

export type LinaSourceModule = (typeof LINA_SOURCE_MODULES)[number];

export const LINA_CHAT_SOURCE_MODULES = [
  "dashboard",
  "crm",
  "network",
  "pool",
  "notifications",
  "general",
] as const satisfies readonly LinaSourceModule[];

export type LinaChatSourceModule =
  (typeof LINA_CHAT_SOURCE_MODULES)[number];

export const LINA_ACCESS_SOURCE_MODULES = [
  "dashboard",
  "crm",
  "network",
  "pool",
  "notifications",
  "admin",
  "audit",
  "general",
] as const satisfies readonly LinaSourceModule[];

export type LinaAccessSourceModule =
  (typeof LINA_ACCESS_SOURCE_MODULES)[number];

export const LINA_ACTION_SOURCE_MODULES = [
  "dashboard",
  "crm",
  "portfolio",
  "pool",
  "requests",
  "forum",
  "network",
  "project_sales",
  "kontor",
  "membership",
  "messages",
  "notifications",
  "admin",
  "general",
] as const satisfies readonly LinaSourceModule[];

export type LinaActionSourceModule =
  (typeof LINA_ACTION_SOURCE_MODULES)[number];

export const LINA_TOOL_SOURCE_MODULES = [
  "dashboard",
  "crm",
  "network",
  "pool",
  "notifications",
  "general",
  "portfolio",
  "projects",
  "stock",
  "admin",
] as const satisfies readonly LinaSourceModule[];

export type LinaToolSourceModule =
  (typeof LINA_TOOL_SOURCE_MODULES)[number];

export const LINA_V7_SOURCE_MODULES = [
  "general",
  "dashboard",
  "portfolio",
  "crm",
  "forum",
  "pool",
  "project_sales",
  "notifications",
  "tasks",
  "admin",
  "audit",
] as const satisfies readonly LinaSourceModule[];

export type LinaV7SourceModule =
  (typeof LINA_V7_SOURCE_MODULES)[number];

export const LINA_NOTIFICATION_SOURCE_MODULES =
  LINA_CHAT_SOURCE_MODULES;

export type LinaNotificationSourceModule =
  (typeof LINA_NOTIFICATION_SOURCE_MODULES)[number];

export function normalizeLinaSourceModule<
  T extends readonly LinaSourceModule[],
>(
  value: unknown,
  allowed: T,
  fallback: T[number] = "general" as T[number],
): T[number] {
  const normalized = String(value || "").trim();

  return (allowed as readonly string[]).includes(normalized)
    ? (normalized as T[number])
    : fallback;
}
