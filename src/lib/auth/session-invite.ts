import { cookies } from "next/headers";
import { isValidInviteToken } from "@/src/lib/invites/tokens";

export const INVITE_COOKIE_NAME = "orgkit_pending_invite";
const INVITE_COOKIE_MAX_AGE = 30 * 60; // 30 minutes in seconds

/**
 * Stores the pending invite token in a short-lived, HttpOnly cookie.
 * Used during the sign-in / consent flow when an unauthenticated visitor
 * lands on an invite link.
 *
 * Next.js does not allow setting cookies while a Server Component renders, so
 * call this only from a Route Handler or Server Action.
 */
export async function setPendingInviteCookie(token: string) {
  if (!isValidInviteToken(token.trim())) return;
  const cookieStore = await cookies();
  cookieStore.set(INVITE_COOKIE_NAME, token.trim(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: INVITE_COOKIE_MAX_AGE,
  });
}

/**
 * Retrieves the pending invite token stored in the visitor's cookie, if any.
 * A cookie that does not look like an invite token is ignored.
 */
export async function getPendingInviteCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get(INVITE_COOKIE_NAME)?.value;
  return isValidInviteToken(value) ? value : null;
}

/**
 * Clears the pending invite cookie once the invite has been accepted,
 * cancelled, or expired. Route Handler or Server Action only.
 */
export async function clearPendingInviteCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(INVITE_COOKIE_NAME);
}
