import { createAdminClient } from "@/src/lib/supabase/service-role";
import { hashInviteToken, isValidInviteToken } from "@/src/lib/invites/tokens";
import { isInviteUsable } from "@/src/lib/invites/invite-status";

export interface UsableInvite {
  id: string;
  org_id: string;
  role: string;
  orgName: string | null;
  orgSchool: string | null;
}

/**
 * Looks an invite link up by the hash of its token. Returns null for any link
 * that cannot be used (malformed, missing, used, revoked or expired).
 */
export async function findUsableInvite(
  token: string
): Promise<{ invite: UsableInvite; tokenHash: string } | null> {
  if (!isValidInviteToken(token)) return null;

  const tokenHash = hashInviteToken(token);
  const { data, error } = await createAdminClient()
    .from("org_invites")
    .select("id, org_id, role, expires_at, used_at, revoked_at, orgs(id, name, school)")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (error || !isInviteUsable(data, Date.now())) return null;

  const orgRaw = data!.orgs;
  const org = Array.isArray(orgRaw) ? orgRaw[0] : orgRaw;

  return {
    tokenHash,
    invite: {
      id: data!.id,
      org_id: data!.org_id,
      role: data!.role,
      orgName: org?.name ?? null,
      orgSchool: org?.school ?? null,
    },
  };
}
