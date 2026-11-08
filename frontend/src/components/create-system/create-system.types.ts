import type { ReactNode } from "react";

import type { EPHLocationArea } from "./location.types";

export const EPH_CREATE_SYSTEM_VERSION = "1.0.0" as const;

export type EPHCreateMode =
  | "CREATE"
  | "EDIT"
  | "DUPLICATE"
  | "BULK_CREATE";

export type EPHCreateDomain =
  | "PORTFOLIO"
  | "FORUM_REQUEST"
  | "CRM_CUSTOMER"
  | "CRM_INTEREST"
  | "POOL_FILTER"
  | "PROJECT"
  | "PROJECT_UNIT"
  | "GENERIC";

export type EPHCreateIssueSeverity =
  | "ERROR"
  | "CONFLICT"
  | "WARNING"
  | "EVIDENCE_REQUIRED"
  | "INFORMATION";

export type EPHCreateIssue = {
  code: string;
  message: string;
  severity: EPHCreateIssueSeverity;
  blocking: boolean;
  field?: string | null;
  stepId?: string | null;
  metadata?: Readonly<Record<string, unknown>>;
};

export type EPHCreateValidationResult = {
  valid: boolean;
  requiresConfirmation: boolean;
  requiresEvidence: boolean;
  issues: EPHCreateIssue[];
};

export type EPHCreateContext<
  TState extends object = Record<string, unknown>,
> = {
  version: typeof EPH_CREATE_SYSTEM_VERSION;
  domain: EPHCreateDomain;
  mode: EPHCreateMode;
  state: TState;
  locations: EPHLocationArea[];
  entityId?: string | null;
  actorId?: string | null;
  actorRole?: string | null;
  acknowledgedWarningCodes: string[];
};

export type EPHCreateStepContext<
  TState extends object = Record<string, unknown>,
> = {
  createContext: EPHCreateContext<TState>;
  patchState: (values: Partial<TState>) => void;
  replaceState: (state: TState) => void;
  goNext: () => void;
  goPrevious: () => void;
};

export type EPHCreateStep<
  TState extends object = Record<string, unknown>,
> = {
  id: string;
  title: string;
  description?: string;
  order: number;
  hidden?: (
    context: EPHCreateContext<TState>,
  ) => boolean;
  validate?: (
    context: EPHCreateContext<TState>,
  ) =>
    | EPHCreateValidationResult
    | Promise<EPHCreateValidationResult>;
  render: (
    context: EPHCreateStepContext<TState>,
  ) => ReactNode;
};

export type EPHCreateDefinition<
  TState extends object = Record<string, unknown>,
  TPayload = unknown,
> = {
  id: string;
  version: string;
  domain: EPHCreateDomain;
  title: string;
  subtitle?: string;
  steps: EPHCreateStep<TState>[];
  createInitialState: () => TState;
  normalizeState?: (state: TState) => TState;
  getLocations?: (state: TState) => EPHLocationArea[];
  validate?: (
    context: EPHCreateContext<TState>,
  ) =>
    | EPHCreateValidationResult
    | Promise<EPHCreateValidationResult>;
  toPayload: (
    context: EPHCreateContext<TState>,
  ) => TPayload;
  metadata?: Readonly<Record<string, unknown>>;
};
