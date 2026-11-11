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

interface ActionNames {
  /** Action name for the log line when something unexpected is thrown */
  name: string;
  /** Shown when something unexpected is thrown */
  unexpected: string;
}

interface PermissionMessages extends ActionNames {
  /** Shown when the caller's role may not do this */
  denied: string;
}

/** What `withOrgCaller` can answer on its own, before `run` has a say */
export type OrgCallerError = "not_authenticated" | "access_revoked" | "failed";

/**
 * Runs an org action for a signed-in member of the org: looks the caller up,
 * then calls `run`. Anything thrown becomes a generic failure, so an action
 * never leaks a stack trace. For actions that need a specific role, use
 * `withOrgPermission`.
 */
export async function withOrgCaller<T, E extends string>(
  orgId: string,
  messages: ActionNames,
  run: (caller: OrgCaller) => Promise<ActionResult<T, E>>
): Promise<ActionResult<T, E | OrgCallerError>> {
  try {
    const lookup = await getCallerOrgMembership(orgId);
    if (!lookup.ok) return accessFailure(lookup.error);

    return await run(lookup.caller);
  } catch (err) {
    console.error(`Unexpected error in ${messages.name}:`, err);
    return fail("failed", messages.unexpected);
  }
}

/**
 * `withOrgCaller` for an officer whose current role allows `permission`. The
 * database function behind each action checks the role again; this check only
 * saves a round trip and gives a clear message.
 */
export async function withOrgPermission<T, E extends string>(
  orgId: string,
  permission: OfficerAction,
  messages: PermissionMessages,
  run: (caller: OrgCaller) => Promise<ActionResult<T, E>>
): Promise<ActionResult<T, E | OrgAccessError>> {
  return withOrgCaller<T, E | "not_authorized">(orgId, messages, async (caller) =>
    can(caller.role, permission) ? run(caller) : fail("not_authorized", messages.denied)
  );
}
