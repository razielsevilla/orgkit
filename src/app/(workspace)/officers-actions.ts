"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { createClient } from "@/src/lib/supabase/server";
import { createAdminClient } from "@/src/lib/supabase/service-role";
import { can, OfficerRole, isOfficerRole } from "@/src/lib/permissions";
import { generateInviteToken, hashInviteToken, normalizeEmail } from "@/src/lib/tokens";

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

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: ActionError;
  errorMessage?: string;
}

/**
 * Derives the base URL of the application from request headers or environment.
 */
async function getBaseUrl(): Promise<string> {
  try {
    const headerList = await headers();
    const host = headerList.get("x-forwarded-host") || headerList.get("host");
    const proto =
      headerList.get("x-forwarded-proto") ||
      (host?.includes("localhost") || host?.includes("127.0.0.1") ? "http" : "https");
    if (host) {
      return `${proto}://${host}`;
    }
  } catch {
    // Fallback if headers() is unavailable
  }
  return process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000";
}

/**
 * Validates the caller's session and retrieves their fresh membership from the database.
 * Never caches roles in sessions or claims.
 */
async function getCallerOrgMembership(orgId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "not_authenticated" as const, user: null, role: null };
  }

  // Fresh database lookup
  const { data: membership, error } = await supabase
    .from("org_officers")
    .select("role")
    .eq("org_id", orgId)
    .eq("officer_id", user.id)
    .maybeSingle();

  if (error || !membership || !isOfficerRole(membership.role)) {
    return { error: "access_revoked" as const, user, role: null };
  }

  return { error: null, user, role: membership.role as OfficerRole };
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
    const caller = await getCallerOrgMembership(orgId);
    if (caller.error || !caller.user || !caller.role) {
      return {
        success: false,
        error: caller.error || "access_revoked",
        errorMessage:
          caller.error === "not_authenticated"
            ? "You must be signed in."
            : "You no longer have access to this org.",
      };
    }

    const supabase = await createClient();
    const adminClient = createAdminClient();

    // 1. Fetch organization details
    const { data: org, error: orgError } = await supabase
      .from("orgs")
      .select("id, name")
      .eq("id", orgId)
      .maybeSingle();

    if (orgError || !org) {
      return {
        success: false,
        error: "access_revoked",
        errorMessage: "You no longer have access to this org.",
      };
    }

    // 2. Fetch all officer memberships in this org
    const { data: memberships, error: memError } = await supabase
      .from("org_officers")
      .select("officer_id, role, joined_at")
      .eq("org_id", orgId)
      .order("joined_at", { ascending: true });

    if (memError || !memberships) {
      console.error("Error fetching memberships:", memError);
      return { success: false, error: "failed", errorMessage: "Failed to load officers." };
    }

    // 3. Fetch officer profiles (names, and emails if admin)
    const officerIds = memberships.map((m) => m.officer_id);
    const { data: officerProfiles, error: profError } = await adminClient
      .from("officers")
      .select("id, full_name, email")
      .in("id", officerIds);

    if (profError) {
      console.error("Error fetching officer profiles:", profError);
    }

    const profileMap = new Map(
      (officerProfiles || []).map((p) => [p.id, p])
    );

    const canViewEmails = can(caller.role, "officer:view_emails");

    const activeOfficers: ActiveOfficer[] = memberships.map((m) => {
      const profile = profileMap.get(m.officer_id);
      const isCurrentUser = m.officer_id === caller.user!.id;
      const role = isOfficerRole(m.role) ? m.role : "officer";

      return {
        id: m.officer_id,
        fullName: profile?.full_name?.trim() || profile?.email?.split("@")[0] || "Officer",
        email: canViewEmails ? profile?.email || null : null,
        role,
        isCurrentUser,
        joinedAt: m.joined_at,
      };
    });

    // 4. Fetch pending invites
    const { data: inviteRows, error: inviteError } = await supabase
      .from("org_invites")
      .select("id, role, email, created_at, expires_at, used_at, revoked_at")
      .eq("org_id", orgId)
      .is("used_at", null)
      .is("revoked_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });

    if (inviteError) {
      console.error("Error fetching invites:", inviteError);
    }

    const pendingInvites: PendingInvite[] = (inviteRows || []).map((inv) => ({
      id: inv.id,
      role: isOfficerRole(inv.role) ? inv.role : "officer",
      createdAt: inv.created_at,
      expiresAt: inv.expires_at,
      email: canViewEmails ? inv.email : null,
    }));

    const adminCount = activeOfficers.filter((o) => o.role === "admin").length;
    const officerCount = activeOfficers.length;

    return {
      success: true,
      data: {
        orgId: org.id,
        orgName: org.name,
        currentRole: caller.role,
        officers: activeOfficers,
        pendingInvites,
        officerCount,
        adminCount,
        canInvite: can(caller.role, "invite:create") && officerCount < 30 && pendingInvites.length < 30,
        canManageRoles: can(caller.role, "officer:change_role"),
        canRemove: can(caller.role, "officer:remove"),
      },
    };
  } catch (err) {
    console.error("Unexpected error in getWorkspaceOfficers:", err);
    return { success: false, error: "failed", errorMessage: "Failed to load officers." };
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
  try {
    const parsed = createInviteSchema.safeParse({ orgId, email, role });
    if (!parsed.success) {
      return {
        success: false,
        error: "invalid_email",
        errorMessage: parsed.error.issues[0]?.message || "Invalid input.",
      };
    }

    const caller = await getCallerOrgMembership(orgId);
    if (caller.error || !caller.role) {
      return {
        success: false,
        error: caller.error || "access_revoked",
        errorMessage:
          caller.error === "not_authenticated"
            ? "You must be signed in."
            : "You no longer have access to this org.",
      };
    }

    if (!can(caller.role, "invite:create")) {
      return {
        success: false,
        error: "not_authorized",
        errorMessage: "Only admins can invite officers.",
      };
    }

    // Generate 32 cryptographically secure random bytes
    const rawToken = generateInviteToken();
    const tokenHash = hashInviteToken(rawToken);

    const supabase = await createClient();
    const { data, error } = await supabase.rpc("create_invite", {
      p_org_id: parsed.data.orgId,
      p_email: parsed.data.email,
      p_role: parsed.data.role,
      p_raw_token: rawToken,
      p_token_hash: tokenHash,
    });

    if (error) {
      const msg = error.message || "";
      if (msg.includes("already_officer")) {
        return {
          success: false,
          error: "already_officer",
          errorMessage: "This person is already an officer of this org.",
        };
      }
      if (msg.includes("officer_limit_reached")) {
        return {
          success: false,
          error: "officer_limit_reached",
          errorMessage: "This org has reached the maximum of 30 officers.",
        };
      }
      if (msg.includes("invite_limit_reached")) {
        return {
          success: false,
          error: "invite_limit_reached",
          errorMessage: "This org has reached the maximum of 30 pending invites.",
        };
      }
      if (msg.includes("not_authorized")) {
        return {
          success: false,
          error: "not_authorized",
          errorMessage: "Only admins can invite officers.",
        };
      }
      console.error("Error calling create_invite RPC:", error);
      return {
        success: false,
        error: "failed",
        errorMessage: "Failed to create invite link. Please try again.",
      };
    }

    const baseUrl = await getBaseUrl();
    const inviteUrl = `${baseUrl}/invite/${rawToken}`;

    return {
      success: true,
      data: {
        inviteUrl,
        rawToken,
        email: parsed.data.email,
        role: parsed.data.role,
      },
    };
  } catch (err) {
    console.error("Unexpected error in createOfficerInvite:", err);
    return {
      success: false,
      error: "failed",
      errorMessage: "An unexpected error occurred while creating the invite.",
    };
  }
}

/**
 * Revokes a pending invite. Admin only.
 */
export async function revokeOfficerInvite(
  orgId: string,
  inviteId: string
): Promise<ActionResult<void>> {
  try {
    const caller = await getCallerOrgMembership(orgId);
    if (caller.error || !caller.role) {
      return {
        success: false,
        error: caller.error || "access_revoked",
        errorMessage: "You no longer have access to this org.",
      };
    }

    if (!can(caller.role, "invite:revoke")) {
      return {
        success: false,
        error: "not_authorized",
        errorMessage: "Only admins can revoke invites.",
      };
    }

    const supabase = await createClient();
    const { error } = await supabase.rpc("revoke_invite", {
      p_invite_id: inviteId,
    });

    if (error) {
      console.error("Error calling revoke_invite:", error);
      return {
        success: false,
        error: "failed",
        errorMessage: "Failed to revoke invite.",
      };
    }

    return { success: true };
  } catch (err) {
    console.error("Unexpected error in revokeOfficerInvite:", err);
    return {
      success: false,
      error: "failed",
      errorMessage: "An unexpected error occurred.",
    };
  }
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
  try {
    if (!isOfficerRole(newRole)) {
      return {
        success: false,
        error: "invalid_role",
        errorMessage: "Invalid role selected.",
      };
    }

    const caller = await getCallerOrgMembership(orgId);
    if (caller.error || !caller.role) {
      return {
        success: false,
        error: caller.error || "access_revoked",
        errorMessage: "You no longer have access to this org.",
      };
    }

    if (!can(caller.role, "officer:change_role")) {
      return {
        success: false,
        error: "not_authorized",
        errorMessage: "Only admins can change officer roles.",
      };
    }

    const supabase = await createClient();
    const { error } = await supabase.rpc("change_role", {
      p_officer_id: targetOfficerId,
      p_role: newRole,
    });

    if (error) {
      const msg = error.message || "";
      if (msg.includes("last_admin")) {
        return {
          success: false,
          error: "last_admin",
          errorMessage: "Every org needs at least one admin. Make someone else an admin first.",
        };
      }
      console.error("Error in change_role RPC:", error);
      return {
        success: false,
        error: "failed",
        errorMessage: "Failed to update role. Please try again.",
      };
    }

    return { success: true };
  } catch (err) {
    console.error("Unexpected error in updateOfficerRole:", err);
    return {
      success: false,
      error: "failed",
      errorMessage: "An unexpected error occurred while updating role.",
    };
  }
}

/**
 * Removes an officer from the organization.
 * Admin only. Enforces the last-admin safeguard.
 */
export async function removeWorkspaceOfficer(
  orgId: string,
  targetOfficerId: string
): Promise<ActionResult<void>> {
  try {
    const caller = await getCallerOrgMembership(orgId);
    if (caller.error || !caller.role) {
      return {
        success: false,
        error: caller.error || "access_revoked",
        errorMessage: "You no longer have access to this org.",
      };
    }

    if (!can(caller.role, "officer:remove")) {
      return {
        success: false,
        error: "not_authorized",
        errorMessage: "Only admins can remove officers.",
      };
    }

    const supabase = await createClient();
    const { error } = await supabase.rpc("remove_officer", {
      p_officer_id: targetOfficerId,
    });

    if (error) {
      const msg = error.message || "";
      if (msg.includes("last_admin")) {
        return {
          success: false,
          error: "last_admin",
          errorMessage: "Every org needs at least one admin. Make someone else an admin first.",
        };
      }
      console.error("Error in remove_officer RPC:", error);
      return {
        success: false,
        error: "failed",
        errorMessage: "Failed to remove officer. Please try again.",
      };
    }

    return { success: true };
  } catch (err) {
    console.error("Unexpected error in removeWorkspaceOfficer:", err);
    return {
      success: false,
      error: "failed",
      errorMessage: "An unexpected error occurred while removing officer.",
    };
  }
}
