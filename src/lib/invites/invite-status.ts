export interface InviteLifecycle {
  used_at: string | null;
  revoked_at: string | null;
  expires_at: string;
}

/**
 * An invite link works only while it is unused, unrevoked and unexpired.
 * Missing, used, revoked and expired links are all treated the same, so the
 * invitee sees one message for every case.
 */
export function isInviteUsable(
  invite: InviteLifecycle | null | undefined,
  nowMs: number
): boolean {
  if (!invite) return false;
  if (invite.used_at !== null || invite.revoked_at !== null) return false;
  return new Date(invite.expires_at).getTime() > nowMs;
}
