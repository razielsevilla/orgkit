/**
 * Check-in tokens for the rotating QR code.
 *
 * A token is `<eventId>.<slot>.<signature>`, where the slot is
 * floor(unix seconds / 30) and the signature is an HMAC-SHA256 of
 * `<eventId>.<slot>` in base64url. Nothing is stored: verifying a token needs
 * only the secret and the clock, never the database.
 *
 * A token is accepted in its own slot and the one right after it (a short
 * grace for slow scans), so it lives for 30 to 60 seconds. Every other slot,
 * including one that hasn't started yet, is rejected.
 *
 * Kept free of `server-only` and of app imports so the node:test unit tests
 * can load it directly. The secret comes from `getCheckinSecret()` (secret.ts).
 */

import { createHmac, timingSafeEqual } from "node:crypto";

export const SLOT_SECONDS = 30;

/** How many slots after its own a token still works */
export const GRACE_SLOTS = 1;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** base64url of a 32-byte SHA-256 digest */
const SIGNATURE_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const SLOT_PATTERN = /^\d{1,12}$/;
/** Longest well-formed token: 36 + 1 + 12 + 1 + 43. Anything longer is garbage. */
const MAX_TOKEN_LENGTH = 93;

export type CheckinTokenResult = { ok: true; eventId: string } | { ok: false };

/** The slot a moment in time falls in */
export function slotFor(nowMs: number): number {
  return Math.floor(nowMs / 1000 / SLOT_SECONDS);
}

/** When a slot ends (the next one begins), in ms since the epoch */
export function slotEndsAtMs(slot: number): number {
  return (slot + 1) * SLOT_SECONDS * 1000;
}

function sign(eventId: string, slot: number, secret: string): string {
  return createHmac("sha256", secret).update(`${eventId}.${slot}`).digest("base64url");
}

export function signCheckinToken(eventId: string, slot: number, secret: string): string {
  return `${eventId}.${slot}.${sign(eventId, slot, secret)}`;
}

/**
 * Checks shape, then signature, then slot. Returns the event the token is for;
 * the caller still has to check that the event's window is open.
 * Garbage is turned away before any HMAC is computed.
 */
export function verifyCheckinToken(token: unknown, secret: string, nowMs: number): CheckinTokenResult {
  if (typeof token !== "string" || token.length > MAX_TOKEN_LENGTH || !secret) return { ok: false };

  const parts = token.split(".");
  if (parts.length !== 3) return { ok: false };
  const [eventId, slotText, signature] = parts;
  if (!UUID_PATTERN.test(eventId) || !SLOT_PATTERN.test(slotText) || !SIGNATURE_PATTERN.test(signature)) {
    return { ok: false };
  }

  const slot = Number(slotText);
  const expected = Buffer.from(sign(eventId, slot, secret));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return { ok: false };

  const age = slotFor(nowMs) - slot;
  if (age < 0 || age > GRACE_SLOTS) return { ok: false };

  return { ok: true, eventId };
}
