import "server-only";
import { createHmac } from "node:crypto";
import { createAdminClient } from "@/src/lib/supabase/service-role";
import { getClientIp } from "@/src/lib/request";
import { getRateLimitSecret } from "@/src/lib/config";
import { logger } from "@/src/lib/logger";

/**
 * Counts this request against the caller's device for one feature (`scope`)
 * and says whether it may go ahead. The count lives in the database
 * (hit_join_rate_limit), so it is shared by every server instance and survives
 * restarts. A device is its IP address, hashed with a secret so no raw IP is
 * stored. Fails closed: if the check itself breaks, or the hashing secret is
 * missing in production, the request is refused (and the cause is logged).
 */
export async function allowRequest(scope: string, limitPerMinute: number): Promise<boolean> {
  let secret: string;
  try {
    secret = getRateLimitSecret();
  } catch (err) {
    // The user only sees "too many attempts", so this line is how an operator finds
    // out why. It names the missing variables, never a value.
    logger.error(
      "rate_limit.secret_missing",
      "Rate limit check refused: no hashing secret is configured.",
      {
        scope,
        variable: "JOIN_RATE_LIMIT_SECRET",
        fallbackVariable: "SUPABASE_SERVICE_ROLE_KEY",
        error: err,
      }
    );
    return false;
  }

  const ip = await getClientIp();

  const key = createHmac("sha256", secret).update(`${scope}:${ip}`).digest("hex");

  const { data, error } = await createAdminClient().rpc("hit_join_rate_limit", {
    p_key: key,
    p_limit: limitPerMinute,
  });
  if (error) {
    logger.error("rate_limit.check_failed", { scope, error });
    return false;
  }
  return data === true;
}
