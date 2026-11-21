import "server-only";
import { createAdminClient } from "@/src/lib/supabase/service-role";
import { looksLikeToken } from "@/src/lib/members/member-join";
import { allowRequest } from "@/src/lib/rate-limit";
import { logger } from "@/src/lib/logger";
import { getJoinAttemptsPerMinute } from "@/src/lib/config";

/** The org's name for an active token, or null. Nothing else leaves the server. */
export async function getJoinOrgName(token: string): Promise<string | null> {
  if (!looksLikeToken(token)) return null;
  const { data, error } = await createAdminClient().rpc("get_join_org", { p_token: token });
  if (error) {
    logger.error("join.load_link_failed", { error });
    return null;
  }
  return typeof data === "string" ? data : null;
}

/**
 * Counts this attempt against the caller's device and says whether it may go ahead.
 * The limit is JOIN_ATTEMPTS_PER_MINUTE (default 30). The ticket asked for 10, but a
 * device is an IP address, and a whole room can share one campus Wi-Fi or
 * mobile-carrier IP when a QR is shown at an event, so 10 would turn real
 * students away (ticket open question 5; founders to confirm).
 */
export function allowJoinAttempt(): Promise<boolean> {
  return allowRequest("join", getJoinAttemptsPerMinute());
}
