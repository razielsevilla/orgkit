import "server-only";
import { createHmac } from "node:crypto";
import { headers } from "next/headers";
import { createAdminClient } from "@/src/lib/supabase/service-role";
import { looksLikeToken } from "@/src/lib/member-join";

/**
 * Join attempts allowed per device per minute (ticket open question 5).
 * The ticket proposed 10, but a device is an IP address and a whole room can
 * share one campus Wi-Fi or mobile-carrier IP when a QR is shown at an event.
 * 30 still stops scripted hammering while letting a crowd join. Founders to confirm.
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

/**
 * Counts this attempt against the caller's device and says whether it may go
 * ahead. A device is its IP address, hashed so no raw IP is stored. Fails
 * closed: if the check itself breaks, the attempt is refused.
 */
export async function allowJoinAttempt(): Promise<boolean> {
  const headerList = await headers();
  const ip =
    headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headerList.get("x-real-ip") ||
    "unknown";

  const secret =
    process.env.JOIN_RATE_LIMIT_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  const key = createHmac("sha256", secret).update(ip).digest("hex");

  const { data, error } = await createAdminClient().rpc("hit_join_rate_limit", {
    p_key: key,
    p_limit: JOIN_ATTEMPTS_PER_MINUTE,
  });
  if (error) {
    console.error("Error checking join rate limit:", error);
    return false;
  }
  return data === true;
}
