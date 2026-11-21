import "server-only";
import { createAdminClient } from "@/src/lib/supabase/service-role";
import { verifyCheckinToken } from "@/src/lib/checkin/token";
import { getCheckinSecret } from "@/src/lib/checkin/secret";
import { allowRequest } from "@/src/lib/rate-limit";
import { logger } from "@/src/lib/logger";
import { getCheckinAttemptsPerMinute } from "@/src/lib/config";

/**
 * Counts this attempt against the caller's device and says whether it may go ahead.
 * The limit is CHECKIN_ATTEMPTS_PER_MINUTE (default 30): a device is an IP address,
 * and a whole room can share one campus Wi-Fi IP while the QR is on screen.
 */
export function allowCheckinAttempt(): Promise<boolean> {
  return allowRequest("checkin", getCheckinAttemptsPerMinute());
}

/** The event id for a token that is genuine and still fresh, or null. */
export function eventIdFromToken(token: string): string | null {
  const result = verifyCheckinToken(token, getCheckinSecret(), Date.now());
  return result.ok ? result.eventId : null;
}

export interface CheckinEvent {
  orgName: string;
  eventTitle: string;
}

/**
 * What the page shows for a token, or null when the token is expired or
 * tampered with, or the window is closed or the event cancelled. Nothing else
 * leaves the server.
 */
export async function getCheckinEvent(token: string): Promise<CheckinEvent | null> {
  const eventId = eventIdFromToken(token);
  if (!eventId) return null;

  const { data, error } = await createAdminClient().rpc("get_checkin_event", {
    p_event: eventId,
  });
  if (error) {
    logger.error("checkin.load_event_failed", { eventId, error });
    return null;
  }

  const row = Array.isArray(data) ? data[0] : null;
  if (!row || typeof row.org_name !== "string" || typeof row.event_title !== "string") {
    return null;
  }
  return { orgName: row.org_name, eventTitle: row.event_title };
}
