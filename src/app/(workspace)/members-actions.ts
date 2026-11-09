"use server";

import { revalidatePath } from "next/cache";
import { fail, ok, type ActionResult } from "@/src/lib/action-result";
import { accessFailure, getCallerOrgMembership, withOrgPermission } from "@/src/lib/orgs/org-access";
import { membersPath } from "@/src/lib/routes";
import { isUuid } from "@/src/lib/validation";
import { MEMBERS_PAGE_SIZE, buildMemberSearchFilter } from "@/src/lib/members/member-search";

export type MemberStatus = "pending" | "active" | "inactive";

export interface WorkspaceMember {
  id: string;
  orgId: string;
  fullName: string;
  email: string;
  status: MemberStatus;
  createdAt: string;
}

export interface WorkspaceMembersData {
  members: WorkspaceMember[];
  totalCount: number;
  matchingCount: number;
  hasMore: boolean;
  pendingCount: number;
  joinLinkToken: string | null;
  /** Admins can import a member list and see invitations */
  canImport: boolean;
}

export type MembersActionError =
  | "not_authenticated"
  | "access_revoked"
  | "not_found"
  | "invalid_request"
  | "failed";

export async function getWorkspaceMembers(
  orgId: string,
  options?: {
    search?: string;
    status?: string;
    offset?: number;
    limit?: number;
  }
): Promise<ActionResult<WorkspaceMembersData, MembersActionError>> {
  const access = await getCallerOrgMembership(orgId);
  if (!access.ok) {
    return accessFailure(access.error);
  }

  const { supabase } = access.caller;

  try {
    // 1. Total members count for this org
    const { count: totalCount, error: totalCountErr } = await supabase
      .from("members")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId);

    if (totalCountErr) {
      return fail("failed", "We couldn't load your members. Try again.");
    }

    // 2. Pending members count for this org
    const { count: pendingCount, error: pendingCountErr } = await supabase
      .from("members")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("status", "pending");

    if (pendingCountErr) {
      return fail("failed", "We couldn't load your members. Try again.");
    }

    // 3. Query members with search and status filtering
    let query = supabase
      .from("members")
      .select("id, org_id, full_name, email, status, created_at, is_pending", { count: "exact" })
      .eq("org_id", orgId);

    const statusFilter = options?.status?.toLowerCase().trim();
    if (statusFilter && statusFilter !== "all") {
      if (statusFilter === "pending" || statusFilter === "active" || statusFilter === "inactive") {
        query = query.eq("status", statusFilter);
      }
    }

    const searchFilter = buildMemberSearchFilter(options?.search ?? "");
    if (searchFilter) {
      query = query.or(searchFilter);
    }

    const rawLimit = Number.isFinite(options?.limit) ? Math.trunc(options!.limit!) : MEMBERS_PAGE_SIZE;
    const rawOffset = Number.isFinite(options?.offset) ? Math.trunc(options!.offset!) : 0;
    const limit = Math.min(Math.max(rawLimit, 1), 100);
    const offset = Math.max(rawOffset, 0);

    // Pending first, then newest joins first; id keeps pages stable on ties
    query = query
      .order("is_pending", { ascending: false })
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: rawMembers, count: matchingCount, error: fetchErr } = await query;

    if (fetchErr || !rawMembers) {
      return fail("failed", "We couldn't load your members. Try again.");
    }

    const members: WorkspaceMember[] = rawMembers.map((row) => ({
      id: row.id,
      orgId: row.org_id,
      fullName: row.full_name,
      email: row.email,
      status: row.status as MemberStatus,
      createdAt: row.created_at,
    }));

    // If org has no members yet, fetch the active join link token for the empty state
    let joinLinkToken: string | null = null;
    if ((totalCount ?? 0) === 0 && offset === 0) {
      const { data: linkToken } = await supabase.rpc("get_org_join_link", {
        target_org: orgId,
      });
      joinLinkToken = linkToken || null;
    }

    return ok({
      members,
      totalCount: totalCount ?? 0,
      matchingCount: matchingCount ?? members.length,
      hasMore: offset + members.length < (matchingCount ?? members.length),
      pendingCount: pendingCount ?? 0,
      joinLinkToken,
      canImport: can(access.caller.role, "member:import"),
    });
  } catch {
    return fail("failed", "We couldn't load your members. Try again.");
  }
}

export async function confirmMemberAction(
  orgId: string,
  memberId: string
): Promise<ActionResult<void, MembersActionError>> {
  if (!isUuid(orgId) || !isUuid(memberId)) {
    return fail("invalid_request", "Invalid request parameters.");
  }

  const access = await getCallerOrgMembership(orgId);
  if (!access.ok) {
    return accessFailure(access.error);
  }

  const { supabase } = access.caller;

  try {
    const { error: rpcErr } = await supabase.rpc("confirm_member", {
      target_member: memberId,
    });

    if (rpcErr) {
      return fail("failed", "Could not confirm member. Please try again.");
    }

    revalidatePath(membersPath(orgId));
    return ok();
  } catch {
    return fail("failed", "Could not confirm member. Please try again.");
  }
}


/**
 * How many members an export with these statuses would contain. Admin only,
 * the same rule as the export itself. Reads a count, never member data.
 */
export async function getExportCount(
  orgId: string,
  statuses: string[]
): Promise<ActionResult<{ count: number }, MembersActionError | "not_authorized">> {
  if (!isUuid(orgId) || !Array.isArray(statuses)) {
    return fail("invalid_request", "Invalid request parameters.");
  }
  const valid = statuses.filter((s): s is MemberStatus =>
    s === "pending" || s === "active" || s === "inactive"
  );
  if (valid.length !== statuses.length) {
    return fail("invalid_request", "Invalid request parameters.");
  }
  // No statuses chosen: nothing would be exported, so skip the query
  if (valid.length === 0) return ok({ count: 0 });

  return withOrgPermission(
    orgId,
    "members:export",
    {
      name: "getExportCount",
      denied: "Only admins can export members.",
      unexpected: "We couldn't count your members. Try again.",
    },
    async ({ supabase }) => {
      const { count, error } = await supabase
        .from("members")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId)
        .in("status", valid);
      if (error) return fail("failed", "We couldn't count your members. Try again.");
      return ok({ count: count ?? 0 });
    }
  );
}
