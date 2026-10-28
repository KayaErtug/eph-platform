import type {
  LinaV7Module,
  LinaV7Operation,
  LinaV7ResourceScope,
} from "./policies/lina-v7-policy";

export type LinaV7ToolPolicyBinding = {
  module: LinaV7Module;
  operation: LinaV7Operation;
  scope: LinaV7ResourceScope;
  isResourceOwner?: boolean;
};

const BINDINGS: Readonly<
  Record<string, LinaV7ToolPolicyBinding>
> = {
  get_my_eph_context: {
    module: "general",
    operation: "READ",
    scope: "OWN",
  },
  get_eph_location_catalog_summary: {
    module: "general",
    operation: "READ",
    scope: "PLATFORM",
  },
  list_eph_regions: {
    module: "general",
    operation: "READ",
    scope: "PLATFORM",
  },
  resolve_eph_location: {
    module: "general",
    operation: "READ",
    scope: "PLATFORM",
  },
  list_my_crm_interests: {
    module: "crm",
    operation: "READ",
    scope: "OWN",
  },
  find_crm_interest_pool_matches: {
    module: "crm",
    operation: "READ",
    scope: "OWN",
  },
  list_my_request_center_posts: {
    module: "forum",
    operation: "READ",
    scope: "OWN",
  },
  list_my_pool_portfolios: {
    module: "pool",
    operation: "READ",
    scope: "OWN",
  },
};

export function getLinaV7ToolPolicyBinding(
  toolName: string,
): LinaV7ToolPolicyBinding | null {
  return BINDINGS[toolName] || null;
}
