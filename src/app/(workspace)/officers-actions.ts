"use server";

import { z } from "zod";
import { unstable_rethrow } from "next/navigation";
import { createAdminClient } from "@/src/lib/supabase/service-role";
import { can, OfficerRole, isOfficerRole } from "@/src/lib/orgs/permissions";
import { generateInviteToken, hashInviteToken, normalizeEmail } from "@/src/lib/invites/tokens";
import { fail, ok, type ActionResult as BaseActionResult } from "@/src/lib/action-result";
import {
  accessFailure,
  getCallerOrgMembership,
  withOrgPermission,
  type OrgCaller,
} from "@/src/lib/orgs/org-access";
import { rpcFailure, type ErrorRule } from "@/src/lib/rpc-errors";
import { MAX_OFFICERS_PER_ORG, MAX_PENDING_INVITES_PER_ORG } from "@/src/lib/orgs/org-limits";
import { getBaseUrl } from "@/src/lib/request";
import { isUuid } from "@/src/lib/validation";

export interface ActiveOfficer {
  id: string; // officer_id
  fullName: string;
  email?: string | null; // ONLY visible to admins
  role: OfficerRole;
  isCurrentUser: boolean;
  joinedAt: string;
}

export interface PendingInvite {
  id: string;
  role: OfficerRole;
  createdAt: string;
  expiresAt: string;
  email?: string | null; // ONLY visible to admins
}

export interface WorkspaceOfficersData {
  orgId: string;
  orgName: string;
  currentRole: OfficerRole;
  officers: ActiveOfficer[];
  pendingInvites: PendingInvite[];
  officerCount: number;
  adminCount: number;
  canInvite: boolean;
  canManageRoles: boolean;
  canRemove: boolean;
}

export type ActionError =
  | "not_authenticated"
  | "access_revoked"
  | "not_authorized"
  | "last_admin"
  | "already_officer"
  | "officer_limit_reached"
  | "invite_limit_reached"
  | "invalid_email"
  | "invalid_role"
  | "invite_not_found"
  | "officer_not_found"
  | "failed";

export type ActionResult<T = unknown> = BaseActionResult<T, ActionError>;

const INVALID_REQUEST = "That request wasn't valid. Please reload the page and try again.";

const LAST_ADMIN_RULE: ErrorRule<ActionError> = {
  match: "last_admin",
  error: "last_admin",
  message: "Every org needs at least one admin. Make someone else an admin first.",
};

const CREATE_INVITE_ERRORS: ErrorRule<ActionError>[] = [
  {
    match: "already_officer",
    error: "already_officer",
    message: "This person is already an officer of this org.",
  },
  {
    match: "officer_limit_reached",
    error: "officer_limit_reached",
    message: `This org has reached the maximum of ${MAX_OFFICERS_PER_ORG} officers.`,
  },
  {
    match: "invite_limit_reached",
    error: "invite_limit_reached",
    message: `This org has reached the maximum of ${MAX_PENDING_INVITES_PER_ORG} pending invites.`,
  },
  {
    match: "not_authorized",
    error: "not_authorized",
    message: "Only admins can invite officers.",
  },
];

/** A person's display name, falling back to the start of their email. */
function displayName(profile?: { full_name?: string | null; email?: string | null }) {
  return profile?.full_name?.trim() || profile?.email?.split("@")[0] || "Officer";
}

async function loadOfficers(
  { supabase, user }: OrgCaller,
  orgId: string,
  canViewEmails: boolean
): Promise<ActiveOfficer[] | null> {
  const { data: memberships, error } = await supabase
    .from("org_officers")
    .select("officer_id, role, joined_at")
    .eq("org_id", orgId)
    .order("joined_at", { ascending: true });

  if (error || !memberships) {
    console.error("Error fetching memberships:", error);
    return null;
  }

  // Profiles are read with the service role: officers can't read each other's
  // rows directly, so this is where emails are hidden from non-admins.
  const { data: profiles, error: profileError } = await createAdminClient()
    .from("officers")
    .select("id, full_name, email")
    .in(
      "id",
      memberships.map((m) => m.officer_id)
    );

  if (profileError) {
    console.error("Error fetching officer profiles:", profileError);
  }

  const profileById = new Map((profiles || []).map((p) => [p.id, p]));

  return memberships.map((m) => {
    const profile = profileById.get(m.officer_id);
    return {
      id: m.officer_id,
      fullName: displayName(profile),
      email: canViewEmails ? profile?.email || null : null,
      role: isOfficerRole(m.role) ? m.role : "officer",
      isCurrentUser: m.officer_id === user.id,
      joinedAt: m.joined_at,
    };
  });
}

async function loadPendingInvites(
  { supabase }: OrgCaller,
  orgId: string,
  canViewEmails: boolean
): Promise<PendingInvite[]> {
  const { data: rows, error } = await supabase
    .from("org_invites")
    .select("id, role, email, created_at, expires_at, used_at, revoked_at")
    .eq("org_id", orgId)
    .is("used_at", null)
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching invites:", error);
  }

  return (rows || []).map((inv) => ({
    id: inv.id,
    role: isOfficerRole(inv.role) ? inv.role : "officer",
    createdAt: inv.created_at,
    expiresAt: inv.expires_at,
    email: canViewEmails ? inv.email : null,
  }));
}

/**
 * Retrieves all officers and pending invites for the given workspace.
 * Re-checks caller's role against the database on every call.
 * Non-admins see names and roles, but email addresses are hidden.
 */
export async function getWorkspaceOfficers(
  orgId: string
): Promise<ActionResult<WorkspaceOfficersData>> {
  try {
    const lookup = await getCallerOrgMembership(orgId);
    if (!lookup.ok) return accessFailure(lookup.error);
    const { caller } = lookup;

    const canViewEmails = can(caller.role, "officer:view_emails");

    // The three reads don't depend on each other, so they run together
    const [{ data: org, error: orgError }, officers, pendingInvites] = await Promise.all([
      caller.supabase.from("orgs").select("id, name").eq("id", orgId).maybeSingle(),
      loadOfficers(caller, orgId, canViewEmails),
      loadPendingInvites(caller, orgId, canViewEmails),
    ]);

    if (orgError || !org) return accessFailure("access_revoked");
    if (!officers) return fail("failed", "Failed to load officers.");

    const officerCount = officers.length;

    return ok({
      orgId: org.id,
      orgName: org.name,
      currentRole: caller.role,
      officers,
      pendingInvites,
      officerCount,
      adminCount: officers.filter((o) => o.role === "admin").length,
      canInvite:
        can(caller.role, "invite:create") &&
        officerCount < MAX_OFFICERS_PER_ORG &&
        pendingInvites.length < MAX_PENDING_INVITES_PER_ORG,
      canManageRoles: can(caller.role, "officer:change_role"),
      canRemove: can(caller.role, "officer:remove"),
    });
  } catch (err) {
    // Let Next.js handle its own control-flow errors (redirects, prerender bailouts)
    unstable_rethrow(err);
    console.error("Unexpected error in getWorkspaceOfficers:", err);
    return fail("failed", "Failed to load officers.");
  }
}

const createInviteSchema = z.object({
  orgId: z.string().uuid("Invalid organization ID."),
  email: z
    .string()
    .trim()
    .min(1, "Email is required.")
    .email("Enter a valid email address.")
    .transform(normalizeEmail),
  role: z.enum(["admin", "finance", "officer"], {
    message: "Select a valid role.",
  }),
});

/**
 * Creates a single-use invite link for an officer.
 * Admin only. Link is returned once; token hash is stored.
 */
export async function createOfficerInvite(
  orgId: string,
  email: string,
  role: OfficerRole
): Promise<
  ActionResult<{
    inviteUrl: string;
    rawToken: string;
    email: string;
    role: OfficerRole;
  }>
> {
  const parsed = createInviteSchema.safeParse({ orgId, email, role });
  if (!parsed.success) {
    return fail("invalid_email", parsed.error.issues[0]?.message || "Invalid input.");
  }

  return withOrgPermission(
    parsed.data.orgId,
    "invite:create",
    {
      name: "createOfficerInvite",
      denied: "Only admins can invite officers.",
      unexpected: "An unexpected error occurred while creating the invite.",
    },
    async ({ supabase }) => {
      // 32 cryptographically secure random bytes; only the hash is stored
      const rawToken = generateInviteToken();

      const { error } = await supabase.rpc("create_invite", {
        p_org_id: parsed.data.orgId,
        p_email: parsed.data.email,
        p_role: parsed.data.role,
        p_raw_token: rawToken,
        p_token_hash: hashInviteToken(rawToken),
      });

      if (error) {
        return rpcFailure(
          "create_invite",
          error,
          CREATE_INVITE_ERRORS,
          "Failed to create invite link. Please try again."
        );
      }

      return ok({
        inviteUrl: `${await getBaseUrl()}/invite/${rawToken}`,
        rawToken,
        email: parsed.data.email,
        role: parsed.data.role,
      });
    }
  );
}

/**
 * Revokes a pending invite. Admin only.
 */
export async function revokeOfficerInvite(
  orgId: string,
  inviteId: string
): Promise<ActionResult<void>> {
  return withOrgPermission(
    orgId,
    "invite:revoke",
    {
      name: "revokeOfficerInvite",
      denied: "Only admins can revoke invites.",
      unexpected: "An unexpected error occurred.",
    },
    async ({ supabase }) => {
      if (!isUuid(inviteId)) return fail("failed", INVALID_REQUEST);

      const { error } = await supabase.rpc("revoke_invite", { p_invite_id: inviteId });
      if (error) return rpcFailure("revoke_invite", error, [], "Failed to revoke invite.");

      return ok();
    }
  );
}

/**
 * Updates an officer's role in the organization.
 * Admin only. Enforces the last-admin safeguard.
 */
export async function updateOfficerRole(
  orgId: string,
  targetOfficerId: string,
  newRole: OfficerRole
): Promise<ActionResult<void>> {
  if (!isOfficerRole(newRole)) {
    return fail("invalid_role", "Invalid role selected.");
  }

  return withOrgPermission(
    orgId,
    "officer:change_role",
    {
      name: "updateOfficerRole",
      denied: "Only admins can change officer roles.",
      unexpected: "An unexpected error occurred while updating role.",
    },
    async ({ supabase }) => {
      if (!isUuid(targetOfficerId)) return fail("failed", INVALID_REQUEST);

      const { error } = await supabase.rpc("change_role", {
        p_officer_id: targetOfficerId,
        p_role: newRole,
      });
      if (error) {
        return rpcFailure(
          "change_role",
          error,
          [LAST_ADMIN_RULE],
          "Failed to update role. Please try again."
        );
      }

      return ok();
    }
  );
}

/**
 * Removes an officer from the organization.
 * Admin only. Enforces the last-admin safeguard.
 */
export async function removeWorkspaceOfficer(
  orgId: string,
  targetOfficerId: string
): Promise<ActionResult<void>> {
  return withOrgPermission(
    orgId,
    "officer:remove",
    {
      name: "removeWorkspaceOfficer",
      denied: "Only admins can remove officers.",
      unexpected: "An unexpected error occurred while removing officer.",
    },
    async ({ supabase }) => {
      if (!isUuid(targetOfficerId)) return fail("failed", INVALID_REQUEST);

      const { error } = await supabase.rpc("remove_officer", { p_officer_id: targetOfficerId });
      if (error) {
        return rpcFailure(
          "remove_officer",
          error,
          [LAST_ADMIN_RULE],
          "Failed to remove officer. Please try again."
        );
      }

      return ok();
    }
  );
}
