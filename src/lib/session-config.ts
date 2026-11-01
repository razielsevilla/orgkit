/**
 * Session configuration for OrgKit.
 * Easily editable before going live or when moving beyond the /setup page.
 */

export const SESSION_MAX_DAYS = 7;
export const SESSION_MAX_MS = SESSION_MAX_DAYS * 24 * 60 * 60 * 1000;

/**
 * Checks if a user's session has exceeded the maximum allowed duration.
 * @param lastSignInAt ISO timestamp string from Supabase user.last_sign_in_at
 */
export function isSessionExpired(lastSignInAt?: string | null): boolean {
  if (!lastSignInAt) return false;
  const lastSignInTime = new Date(lastSignInAt).getTime();
  if (isNaN(lastSignInTime)) return false;
  return Date.now() - lastSignInTime > SESSION_MAX_MS;
}

