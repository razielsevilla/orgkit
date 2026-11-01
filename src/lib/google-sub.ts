import type { User } from "@supabase/supabase-js";

/**
 * Google's permanent account ID. Used to match an officer on every sign-in,
 * never the email (the email on a Google account can change).
 */
export function getGoogleSub(user: User): string | null {
  const googleIdentity = user.identities?.find((i) => i.provider === "google");
  const sub =
    user.user_metadata?.sub ||
    (googleIdentity?.identity_data as Record<string, unknown> | undefined)?.sub ||
    user.user_metadata?.provider_id;
  return typeof sub === "string" && sub ? sub : null;
}

export function getFullName(user: User): string {
  return user.user_metadata?.full_name || user.user_metadata?.name || "";
}
