/**
 * Settings read from the environment, validated where they are used.
 *
 * Every getter reads `process.env` when it is called, never at import time, so
 * `next build` works with placeholder values and nothing here can fail a build.
 * Each variable is documented in `.env.example`.
 */

// Relative with an extension (not "@/"), because the node:test unit tests import this file directly
import { parseContactEmail } from "./members/member-join.ts";

/**
 * The monitored privacy contact (PRIVACY_CONTACT_EMAIL), or null when it is
 * missing or isn't a valid email. The join page and the join action refuse to
 * collect member data while this is null.
 */
export function getPrivacyContactEmail(): string | null {
  return parseContactEmail(process.env.PRIVACY_CONTACT_EMAIL);
}

/** The largest value the database's `int` rate-limit argument can take. */
const MAX_LIMIT = 2_147_483_647;

/**
 * A positive whole number from the environment, or `fallback` when the value is
 * missing, blank, not a number, zero, negative, fractional or too large for the
 * database. A bad value never throws: the feature keeps its default limit.
 */
function positiveIntOrDefault(raw: string | undefined, fallback: number): number {
  const value = Number(raw);
  return Number.isSafeInteger(value) && value > 0 && value <= MAX_LIMIT ? value : fallback;
}

/**
 * Join attempts allowed per device per minute (JOIN_ATTEMPTS_PER_MINUTE).
 * The default is 30, not 10: a whole room can share one campus Wi-Fi IP while a
 * join QR code is on screen at an event.
 */
export function getJoinAttemptsPerMinute(): number {
  return positiveIntOrDefault(process.env.JOIN_ATTEMPTS_PER_MINUTE, 30);
}

/** Invite page opens allowed per device per minute (INVITE_ATTEMPTS_PER_MINUTE). Default 20. */
export function getInviteAttemptsPerMinute(): number {
  return positiveIntOrDefault(process.env.INVITE_ATTEMPTS_PER_MINUTE, 20);
}

/** Check-in attempts allowed per device per minute (CHECKIN_ATTEMPTS_PER_MINUTE). Default 30. */
export function getCheckinAttemptsPerMinute(): number {
  return positiveIntOrDefault(process.env.CHECKIN_ATTEMPTS_PER_MINUTE, 30);
}

/** Dues payment submissions allowed per device per minute (DUES_PAY_ATTEMPTS_PER_MINUTE). Default 30. */
export function getDuesPayAttemptsPerMinute(): number {
  return positiveIntOrDefault(process.env.DUES_PAY_ATTEMPTS_PER_MINUTE, 30);
}

/** Used outside production only, when no secret is configured at all. */
const DEV_RATE_LIMIT_SECRET = "orgkit-dev-only-rate-limit-secret";

/**
 * The secret that hashes IP addresses before they are stored for rate limiting.
 * JOIN_RATE_LIMIT_SECRET if set, else SUPABASE_SERVICE_ROLE_KEY (the documented
 * default). In production, having neither throws here, when it is used: an empty
 * secret would make the stored hashes guessable. Outside production a fixed
 * development value is used so the app runs without setup.
 */
export function getRateLimitSecret(): string {
  const secret =
    process.env.JOIN_RATE_LIMIT_SECRET?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (secret) return secret;

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "JOIN_RATE_LIMIT_SECRET is not set (and SUPABASE_SERVICE_ROLE_KEY is not available as a fallback). " +
        "It is required in production to hash IP addresses for rate limiting."
    );
  }
  return DEV_RATE_LIMIT_SECRET;
}
