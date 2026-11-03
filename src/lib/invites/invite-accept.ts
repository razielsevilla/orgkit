import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * What happened when a signed-in officer tried to use an invite link.
 * "invalid" covers every other case (used, revoked, expired, unknown token, a
 * database error), so the invitee sees one message for all of them.
 */
export type AcceptInviteOutcome =
  | { kind: "joined"; orgId: string }
  | { kind: "email_mismatch" }
  | { kind: "in_other_org" }
  | { kind: "invalid" };

/**
 * Accepts an invite through the accept_invite database function, which does
 * every check and the join in one transaction. Run as the signed-in officer.
 */
export async function acceptInvite(
  supabase: SupabaseClient,
  tokenHash: string
): Promise<AcceptInviteOutcome> {
  const { data, error } = await supabase.rpc("accept_invite", { p_token_hash: tokenHash });
  if (error) console.error("Error calling accept_invite:", error);

  switch (data?.status) {
    case "success":
    case "already_member":
      return typeof data.org_id === "string"
        ? { kind: "joined", orgId: data.org_id }
        : { kind: "invalid" };
    case "email_mismatch":
      return { kind: "email_mismatch" };
    case "in_other_org":
      return { kind: "in_other_org" };
    default:
      return { kind: "invalid" };
  }
}
