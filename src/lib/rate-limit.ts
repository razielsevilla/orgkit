import "server-only";
import { createHmac } from "node:crypto";
import { createAdminClient } from "@/src/lib/supabase/service-role";
import { getClientIp } from "@/src/lib/request";

/** Invite page opens allowed per device per minute. */
export const INVITE_ATTEMPTS_PER_MINUTE = Number(process.env.INVITE_ATTEMPTS_PER_MINUTE) || 20;

/**
 * Counts this request against the caller's device for one feature (`scope`)
 * and says whether it may go ahead. The count lives in the database
 * (hit_join_rate_limit), so it is shared by every server instance and survives
 * restarts. A device is its IP address, hashed with a secret so no raw IP is
 * stored. Fails closed: if the check itself breaks, the request is refused.
 */
export async function allowRequest(scope: string, limitPerMinute: number): Promise<boolean> {
  const ip = await getClientIp();

  const secret =
    process.env.JOIN_RATE_LIMIT_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  const key = createHmac("sha256", secret).update(`${scope}:${ip}`).digest("hex");

  const { data, error } = await createAdminClient().rpc("hit_join_rate_limit", {
    p_key: key,
    p_limit: limitPerMinute,
  });
  if (error) {
    console.error(`Error checking ${scope} rate limit:`, error);
    return false;
  }
  return data === true;
}
