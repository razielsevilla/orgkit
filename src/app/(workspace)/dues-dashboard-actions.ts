"use server";

import { logger } from "@/src/lib/logger";
import { fail, ok, type ActionResult } from "@/src/lib/action-result";
import { withOrgCaller, type OrgCaller } from "@/src/lib/orgs/org-access";
import { rpcFailure } from "@/src/lib/rpc-errors";
import { isUuid } from "@/src/lib/validation";
import {
  type DuesDashboardData,
  type DuesStatusFilter,
  mapDashboardRpcResponse,
} from "@/src/lib/dues/dues-dashboard";
import { validateDashboardQuery } from "@/src/lib/dues/dues-dashboard-validation";
import { DUES_ERROR_RULES, type DuesActionError } from "@/src/app/(workspace)/dues-shared";

export interface GetDuesDashboardOptions {
  periodId: string;
  search?: string;
  status?: DuesStatusFilter;
  page?: number;
  pageSize?: number;
}

/**
 * Retrieves the aggregated dues dashboard metrics and paged member dues records for a period.
 */
export async function getDuesDashboardData(
  orgId: string,
  options: GetDuesDashboardOptions
): Promise<ActionResult<DuesDashboardData, DuesActionError>> {
  if (!isUuid(orgId)) {
    return fail("not_found", "Invalid organization ID.");
  }

  const validation = validateDashboardQuery(options);
  if (!validation.isValid || !validation.data) {
    return fail("invalid_input", validation.error ?? "Invalid query parameters.");
  }

  const query = validation.data;

  return withOrgCaller(
    orgId,
    {
      name: "getDuesDashboardData",
      unexpected: "We couldn't load the dues dashboard. Try again.",
    },
    async (caller: OrgCaller) => {
      const { data, error } = await caller.supabase.rpc("get_dues_period_dashboard", {
        p_period_id: query.periodId,
        p_search: query.search || null,
        p_status: query.status || null,
        p_page: query.page,
        p_page_size: query.pageSize,
      });

      if (error) {
        return rpcFailure(
          "get_dues_period_dashboard",
          error,
          DUES_ERROR_RULES,
          "We couldn't load the dues dashboard. Try again."
        );
      }

      try {
        const mapped = mapDashboardRpcResponse(data);
        return ok(mapped);
      } catch (err) {
        logger.error("dues_dashboard.parse_failed", { orgId, periodId: query.periodId, error: err });
        return fail("failed", "Failed to parse dues dashboard data.");
      }
    }
  );
}
