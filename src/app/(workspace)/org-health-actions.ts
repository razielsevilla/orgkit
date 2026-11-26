"use server";

import { logger } from "@/src/lib/logger";
import { fail, ok, type ActionResult } from "@/src/lib/action-result";
import { withOrgCaller, type OrgCaller, type OrgCallerError } from "@/src/lib/orgs/org-access";
import { rpcFailure, type ErrorRule } from "@/src/lib/rpc-errors";
import { isUuid } from "@/src/lib/validation";
import { mapOrgHealthRpcResponse, type OrgHealthData } from "@/src/lib/health/org-health";

export type OrgHealthError = "not_found" | "not_authorized" | "failed" | OrgCallerError;

const ORG_HEALTH_ERROR_RULES: readonly ErrorRule<"not_authorized">[] = [
  { match: "not_authorized", error: "not_authorized", message: "You no longer have access to this org." },
];

const LOAD_FAILED = "We couldn't load your org's health. Try again.";

/**
 * The facts behind an officer's Home dashboard: members, dues, events, officer
 * terms, handover and documents, gathered by one database function. The function
 * checks the caller is an officer of the org, so another org's officer gets nothing.
 */
export async function getOrgHealth(orgId: string): Promise<ActionResult<OrgHealthData, OrgHealthError>> {
  if (!isUuid(orgId)) {
    return fail("not_found", "Invalid organization ID.");
  }

  return withOrgCaller(
    orgId,
    { name: "getOrgHealth", unexpected: LOAD_FAILED },
    async (caller: OrgCaller) => {
      const { data, error } = await caller.supabase.rpc("get_org_health", { p_org_id: orgId });

      if (error) {
        return rpcFailure("get_org_health", error, ORG_HEALTH_ERROR_RULES, LOAD_FAILED, { orgId });
      }

      try {
        return ok(mapOrgHealthRpcResponse(data));
      } catch (err) {
        logger.error("org_health.parse_failed", { orgId, error: err });
        return fail("failed", LOAD_FAILED);
      }
    }
  );
}
