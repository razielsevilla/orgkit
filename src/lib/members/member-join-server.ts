import "server-only";
import { createAdminClient } from "@/src/lib/supabase/service-role";
import { looksLikeToken } from "@/src/lib/members/member-join";
import { allowRequest } from "@/src/lib/rate-limit";

/**
 * Join attempts allowed per device per minute. The ticket asks for 10. A device
 * is an IP address, though, and a whole room can share one campus Wi-Fi or
 * mobile-carrier IP when a QR is shown at an event, so 10 may be too tight
 * there (ticket open question 5 suggests 30). Founders to confirm; set
 * JOIN_ATTEMPTS_PER_MINUTE to change it without a code change.
 */
export const JOIN_ATTEMPTS_PER_MINUTE =
  Number(process.env.JOIN_ATTEMPTS_PER_MINUTE) || 10;

/** The org's name for an active token, or null. Nothing else leaves the server. */
export async function getJoinOrgName(token: string): Promise<string | null> {
  if (!looksLikeToken(token)) return null;
  const { data, error } = await createAdminClient().rpc("get_join_org", { p_token: token });
  if (error) {
    console.error("Error loading join link:", error);
    return null;
  }
  return typeof data === "string" ? data : null;
}

/** Counts this attempt against the caller's device and says whether it may go ahead. */
export function allowJoinAttempt(): Promise<boolean> {
  return allowRequest("join", JOIN_ATTEMPTS_PER_MINUTE);
}
