import "server-only";

/**
 * The key that signs check-in tokens. It is its own secret on purpose: it
 * never falls back to the service role key, so a leak of one doesn't expose
 * the other. Server only.
 */
export function getCheckinSecret(): string {
  const secret = process.env.CHECKIN_TOKEN_SECRET?.trim();
  if (!secret) {
    throw new Error("CHECKIN_TOKEN_SECRET is missing. Check your .env.local.");
  }
  return secret;
}
