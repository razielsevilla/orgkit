"use server";

import { clearPendingInviteCookie } from "@/src/lib/session-invite";

/** Forgets the pending invite once it can no longer be used. */
export async function clearInviteCookie() {
  await clearPendingInviteCookie();
}
