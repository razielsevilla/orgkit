import "server-only";
import { notFound } from "next/navigation";
import { logger } from "@/src/lib/logger";
import { getSessionUser } from "@/src/lib/auth/session-user";
import { toUsageWeek, type UsageReportRow, type UsageWeek } from "@/src/lib/owner/usage-report";

export type UsageReportResult = { ok: true; weeks: UsageWeek[] } | { ok: false };

/** How many completed weeks the owner sees */
const REPORT_WEEKS = 4;

/**
 * The last completed weeks, newest first, through the signed-in user's own
 * session. The database function refuses anyone who is not the owner, so this
 * is a second lock behind requireOwner(): a "not_authorized" answer is a 404.
 */
export async function getUsageReport(): Promise<UsageReportResult> {
  const { supabase } = await getSessionUser();

  const { data, error } = await supabase.rpc("get_usage_report", { p_weeks: REPORT_WEEKS });

  if (error) {
    if (error.message.includes("not_authorized") || error.message.includes("not_authenticated")) {
      notFound();
    }
    logger.error("owner_usage.load_failed", { error });
    return { ok: false };
  }

  const rows = (data ?? []) as UsageReportRow[];
  return { ok: true, weeks: rows.map(toUsageWeek) };
}
