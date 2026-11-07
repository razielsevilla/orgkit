import type { SupabaseClient, User } from "@supabase/supabase-js";
import { fail, type ActionResult } from "@/src/lib/action-result";
import { can, isOfficerRole, type OfficerAction, type OfficerRole } from "@/src/lib/orgs/permissions";
import { getSessionUser } from "@/src/lib/auth/session-user";
import { isUuid } from "@/src/lib/validation";

export type OrgAccessError = "not_authenticated" | "access_revoked" | "not_authorized" | "failed";

export interface OrgCaller {
  supabase: SupabaseClient;
  user: User;
  role: OfficerRole;
}

type CallerLookup =
  | { ok: true; caller: OrgCaller }
  | { ok: false; error: "not_authenticated" | "access_revoked" };

/**
 * Validates the caller's session and reads their membership fresh from the
 * database. Roles are never cached in sessions or claims, so a removed officer
 * loses access on their very next request.
 */
export async function getCallerOrgMembership(orgId: string): Promise<CallerLookup> {
  const { supabase, user } = await getSessionUser();
  if (!user) return { ok: false, error: "not_authenticated" };

  // A malformed ID can't be an org they belong to
  if (!isUuid(orgId)) return { ok: false, error: "access_revoked" };

  const { data: membership, error } = await supabase
    .from("org_officers")
    .select("role")
    .eq("org_id", orgId)
    .eq("officer_id", user.id)
    .maybeSingle();

  if (error || !membership || !isOfficerRole(membership.role)) {
    return { ok: false, error: "access_revoked" };
  }

  return { ok: true, caller: { supabase, user, role: membership.role } };
}

/** The failure for a caller who is signed out or no longer in the org. */
export function accessFailure(error: "not_authenticated" | "access_revoked") {
  return fail(
    error,
    error === "not_authenticated" ? "You must be signed in." : "You no longer have access to this org."
  );
}

interface PermissionMessages {
  /** Action name for the log line when something unexpected is thrown */
  name: string;
  /** Shown when the caller's role may not do this */
  denied: string;
  /** Shown when something unexpected is thrown */
  unexpected: string;
}

/**
 * Runs an org action for a signed-in officer whose current role allows it:
 * looks the caller up, checks the permission, then calls `run`. Anything
 * thrown becomes a generic failure, so an action never leaks a stack trace.
 * The database function behind each action checks the role again; this check
 * only saves a round trip and gives a clear message.
 */
export async function withOrgPermission<T, E extends string>(
  orgId: string,
  permission: OfficerAction,
  messages: PermissionMessages,
  run: (caller: OrgCaller) => Promise<ActionResult<T, E>>
): Promise<ActionResult<T, E | OrgAccessError>> {
  try {
    const lookup = await getCallerOrgMembership(orgId);
    if (!lookup.ok) return accessFailure(lookup.error);

    if (!can(lookup.caller.role, permission)) {
      return fail("not_authorized", messages.denied);
    }

    return await run(lookup.caller);
  } catch (err) {
    console.error(`Unexpected error in ${messages.name}:`, err);
    return fail("failed", messages.unexpected);
  }
}
