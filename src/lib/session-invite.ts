import { cookies } from "next/headers";

export const INVITE_COOKIE_NAME = "orgkit_pending_invite";
export const INVITE_COOKIE_MAX_AGE = 30 * 60; // 30 minutes in seconds

/**
 * Stores the pending invite token in a short-lived, HttpOnly cookie.
 * Used during the sign-in / consent flow when an unauthenticated visitor
 * lands on an invite link.
 */
export async function setPendingInviteCookie(token: string) {
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
 */
export async function getPendingInviteCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(INVITE_COOKIE_NAME);
  return cookie?.value ?? null;
}

/**
 * Clears the pending invite cookie once the invite has been accepted,
 * cancelled, or expired.
 */
export async function clearPendingInviteCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(INVITE_COOKIE_NAME);
}

