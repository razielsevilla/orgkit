"use server";

import { revalidatePath } from "next/cache";
import { fail, ok, type ActionResult } from "@/src/lib/action-result";
import {
  withOrgCaller,
  withOrgPermission,
  type OrgCaller,
  type OrgCallerError,
} from "@/src/lib/orgs/org-access";
import { can } from "@/src/lib/orgs/permissions";
import { normalizeLimit, normalizeOffset } from "@/src/lib/pagination";
import { rpcFailure, type ErrorRule } from "@/src/lib/rpc-errors";
import { membersPath } from "@/src/lib/routes";
import { isUuid } from "@/src/lib/validation";
import { MEMBERS_PAGE_SIZE, buildMemberSearchFilter } from "@/src/lib/members/member-search";
import { validateMemberEdit, MEMBER_EDIT_MESSAGES } from "@/src/lib/members/member-edit";

const MEMBER_STATUSES = ["pending", "active", "inactive"] as const;
export type MemberStatus = (typeof MEMBER_STATUSES)[number];

export interface WorkspaceMember {
  id: string;
  orgId: string;
  fullName: string;
  email: string;
  status: MemberStatus;
  createdAt: string;
  updatedAt?: string;
}

export interface WorkspaceMembersData {
  members: WorkspaceMember[];
  totalCount: number;
  matchingCount: number;
  hasMore: boolean;
  pendingCount: number;
  inactiveCount: number;
  joinLinkToken: string | null;
  /** Admins can import a member list and see invitations */
  canImport: boolean;
}

export type MembersActionError =
  | OrgCallerError
  | "not_found"
  | "invalid_request"
  | "duplicate_email"
  | "stale";

const MAX_PAGE_SIZE = 100;
const LOAD_FAILED = "We couldn't load your members. Try again.";
const INVALID_REQUEST = "Invalid request parameters.";

function isMemberStatus(value: unknown): value is MemberStatus {
  return (MEMBER_STATUSES as readonly unknown[]).includes(value);
}

/**
 * Which members a query covers: exactly one status, or everyone except one.
 * "All" in the UI means the working roster, so inactive members stay out of it.
 */
type StatusScope = { status: MemberStatus } | { excluding: MemberStatus };

const WORKING_ROSTER: StatusScope = { excluding: "inactive" };

function toStatusScope(filter: string | undefined): StatusScope {
  const status = filter?.toLowerCase().trim();
  return isMemberStatus(status) ? { status } : WORKING_ROSTER;
}

/** How many of the org's members are in `scope`, or null if the read failed. */
async function countMembers(
  { supabase }: OrgCaller,
  orgId: string,
  scope: StatusScope
): Promise<number | null> {
  const query = supabase
    .from("members")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId);

  const { count, error } = await ("status" in scope
    ? query.eq("status", scope.status)
    : query.neq("status", scope.excluding));

  return error ? null : (count ?? 0);
}

interface MemberRow {
  id: string;
  org_id: string;
  full_name: string;
  email: string;
  status: string;
  created_at: string;
  updated_at: string;
}

function toWorkspaceMember(row: MemberRow): WorkspaceMember {
  return {
    id: row.id,
    orgId: row.org_id,
    fullName: row.full_name,
    email: row.email,
    status: row.status as MemberStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getWorkspaceMembers(
  orgId: string,
  options?: {
    search?: string;
    status?: string;
    offset?: number;
    limit?: number;
  }
): Promise<ActionResult<WorkspaceMembersData, MembersActionError>> {
  return withOrgCaller<WorkspaceMembersData, MembersActionError>(
    orgId,
    { name: "getWorkspaceMembers", unexpected: LOAD_FAILED },
    async (caller) => {
      const { supabase } = caller;

      // The three counts don't depend on each other, so they run together
      const [totalCount, pendingCount, inactiveCount] = await Promise.all([
        countMembers(caller, orgId, WORKING_ROSTER),
        countMembers(caller, orgId, { status: "pending" }),
        countMembers(caller, orgId, { status: "inactive" }),
      ]);
      if (totalCount === null || pendingCount === null || inactiveCount === null) {
        return fail("failed", LOAD_FAILED);
      }

      const offset = normalizeOffset(options?.offset);
      const limit = normalizeLimit(options?.limit, MEMBERS_PAGE_SIZE, MAX_PAGE_SIZE);

      let query = supabase
        .from("members")
        .select("id, org_id, full_name, email, status, created_at, updated_at, is_pending", {
          count: "exact",
        })
        .eq("org_id", orgId);

      const scope = toStatusScope(options?.status);
      query = "status" in scope ? query.eq("status", scope.status) : query.neq("status", scope.excluding);

      const searchFilter = buildMemberSearchFilter(options?.search ?? "");
      if (searchFilter) query = query.or(searchFilter);

      // Pending first, then newest joins first; id keeps pages stable on ties
      const { data: rows, count, error } = await query
        .order("is_pending", { ascending: false })
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .range(offset, offset + limit - 1);

      if (error || !rows) return fail("failed", LOAD_FAILED);

      const members = rows.map(toWorkspaceMember);
      const matchingCount = count ?? members.length;

      // An org with no members at all (not even inactive ones) is shown its join link
      let joinLinkToken: string | null = null;
      if (totalCount === 0 && inactiveCount === 0 && offset === 0) {
        const { data: token } = await supabase.rpc("get_org_join_link", { target_org: orgId });
        joinLinkToken = token || null;
      }

      return ok({
        members,
        totalCount,
        matchingCount,
        hasMore: offset + members.length < matchingCount,
        pendingCount,
        inactiveCount,
        joinLinkToken,
        canImport: can(caller.role, "member:import"),
      });
    }
  );
}

/** What the database says when a member can't be changed, shared by every member write */
const MEMBER_WRITE_ERRORS: ErrorRule<MembersActionError>[] = [
  { match: "stale_member", error: "stale", message: MEMBER_EDIT_MESSAGES.stale },
  { match: "not_permitted", error: "access_revoked", message: MEMBER_EDIT_MESSAGES.notPermitted },
  { match: "member_not_found", error: "not_found", message: MEMBER_EDIT_MESSAGES.notFound },
];

const UPDATE_MEMBER_ERRORS: ErrorRule<MembersActionError>[] = [
  MEMBER_WRITE_ERRORS[0],
  { match: "duplicate_email", error: "duplicate_email", message: MEMBER_EDIT_MESSAGES.duplicateEmail },
  { match: "invalid_name", error: "invalid_request", message: MEMBER_EDIT_MESSAGES.nameInvalid },
  { match: "invalid_email", error: "invalid_request", message: MEMBER_EDIT_MESSAGES.emailInvalid },
  ...MEMBER_WRITE_ERRORS.slice(1),
];

/** The optional "only if still in this status" guard that makes a write fail as stale */
function expectedStatusArg(expectedStatus: MemberStatus | undefined) {
  return expectedStatus ? { expected_status: expectedStatus } : {};
}

export async function confirmMemberAction(
  orgId: string,
  memberId: string
): Promise<ActionResult<void, MembersActionError>> {
  if (!isUuid(orgId) || !isUuid(memberId)) return fail("invalid_request", INVALID_REQUEST);

  const failedMessage = "Could not confirm member. Please try again.";

  return withOrgCaller<void, MembersActionError>(
    orgId,
    { name: "confirmMemberAction", unexpected: failedMessage },
    async ({ supabase }) => {
      const { error } = await supabase.rpc("confirm_member", { target_member: memberId });
      if (error) return rpcFailure("confirm_member", error, [], failedMessage);

      revalidatePath(membersPath(orgId));
      return ok();
    }
  );
}

export async function updateMemberAction(
  orgId: string,
  memberId: string,
  data: { fullName: string; email: string },
  expectedStatus?: MemberStatus
): Promise<ActionResult<{ fullName: string; email: string }, MembersActionError>> {
  if (!isUuid(orgId) || !isUuid(memberId)) return fail("invalid_request", INVALID_REQUEST);

  const validation = validateMemberEdit(data);
  if (!validation.valid) {
    return fail("invalid_request", validation.error || "Invalid member details.");
  }

  return withOrgCaller<{ fullName: string; email: string }, MembersActionError>(
    orgId,
    { name: "updateMemberAction", unexpected: MEMBER_EDIT_MESSAGES.saveFailed },
    async ({ supabase }) => {
      const { error } = await supabase.rpc("update_member", {
        target_member: memberId,
        new_name: validation.fullName,
        new_email: validation.email,
        ...expectedStatusArg(expectedStatus),
      });
      if (error) {
        return rpcFailure("update_member", error, UPDATE_MEMBER_ERRORS, MEMBER_EDIT_MESSAGES.saveFailed);
      }

      revalidatePath(membersPath(orgId));
      return ok({ fullName: validation.fullName, email: validation.email });
    }
  );
}

export async function setMemberStatusAction(
  orgId: string,
  memberId: string,
  newStatus: "active" | "inactive",
  expectedStatus?: MemberStatus
): Promise<ActionResult<void, MembersActionError>> {
  if (!isUuid(orgId) || !isUuid(memberId)) return fail("invalid_request", INVALID_REQUEST);
  if (newStatus !== "active" && newStatus !== "inactive") {
    return fail("invalid_request", "Invalid member status.");
  }

  return withOrgCaller<void, MembersActionError>(
    orgId,
    { name: "setMemberStatusAction", unexpected: MEMBER_EDIT_MESSAGES.statusChangeFailed },
    async ({ supabase }) => {
      const { error } = await supabase.rpc("set_member_status", {
        target_member: memberId,
        new_status: newStatus,
        ...expectedStatusArg(expectedStatus),
      });
      if (error) {
        return rpcFailure(
          "set_member_status",
          error,
          MEMBER_WRITE_ERRORS,
          MEMBER_EDIT_MESSAGES.statusChangeFailed
        );
      }

      revalidatePath(membersPath(orgId));
      return ok();
    }
  );
}

/**
 * How many members an export with these statuses would contain. Admin only,
 * the same rule as the export itself. Reads a count, never member data.
 */
export async function getExportCount(
  orgId: string,
  statuses: string[]
): Promise<ActionResult<{ count: number }, MembersActionError | "not_authorized">> {
  if (!isUuid(orgId) || !Array.isArray(statuses) || !statuses.every(isMemberStatus)) {
    return fail("invalid_request", INVALID_REQUEST);
  }
  // No statuses chosen: nothing would be exported, so skip the query
  if (statuses.length === 0) return ok({ count: 0 });

  const failedMessage = "We couldn't count your members. Try again.";

  return withOrgPermission(
    orgId,
    "members:export",
    { name: "getExportCount", denied: "Only admins can export members.", unexpected: failedMessage },
    async ({ supabase }) => {
      const { count, error } = await supabase
        .from("members")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId)
        .in("status", statuses);
      if (error) return fail("failed", failedMessage);
      return ok({ count: count ?? 0 });
    }
  );
}
