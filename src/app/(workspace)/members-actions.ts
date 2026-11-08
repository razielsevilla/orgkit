"use server";

import { revalidatePath } from "next/cache";
import { fail, ok, type ActionResult } from "@/src/lib/action-result";
import { accessFailure, getCallerOrgMembership } from "@/src/lib/orgs/org-access";
import { membersPath } from "@/src/lib/routes";
import { isUuid } from "@/src/lib/validation";
import { MEMBERS_PAGE_SIZE, buildMemberSearchFilter } from "@/src/lib/members/member-search";
import {
  validateMemberEdit,
  MEMBER_EDIT_MESSAGES,
} from "@/src/lib/members/member-edit";

export type MemberStatus = "pending" | "active" | "inactive";

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
}

export type MembersActionError =
  | "not_authenticated"
  | "access_revoked"
  | "not_found"
  | "invalid_request"
  | "duplicate_email"
  | "stale"
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
    // 1. Total working members count (active + pending) for this org
    const { count: totalCount, error: totalCountErr } = await supabase
      .from("members")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .neq("status", "inactive");

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

    // 3. Inactive members count for this org
    const { count: inactiveCount, error: inactiveCountErr } = await supabase
      .from("members")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("status", "inactive");

    if (inactiveCountErr) {
      return fail("failed", "We couldn't load your members. Try again.");
    }

    // 4. Query members with search and status filtering
    let query = supabase
      .from("members")
      .select("id, org_id, full_name, email, status, created_at, updated_at, is_pending", { count: "exact" })
      .eq("org_id", orgId);

    const statusFilter = options?.status?.toLowerCase().trim();
    if (statusFilter === "inactive") {
      query = query.eq("status", "inactive");
    } else if (statusFilter === "pending") {
      query = query.eq("status", "pending");
    } else if (statusFilter === "active") {
      query = query.eq("status", "active");
    } else {
      // Default / "all": Shows the working roster (active + pending), keeping inactive members out of main view
      query = query.neq("status", "inactive");
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
      updatedAt: row.updated_at,
    }));

    // If org has no members yet (zero active, pending, or inactive), fetch join link
    let joinLinkToken: string | null = null;
    if ((totalCount ?? 0) === 0 && (inactiveCount ?? 0) === 0 && offset === 0) {
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
      inactiveCount: inactiveCount ?? 0,
      joinLinkToken,
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

export async function updateMemberAction(
  orgId: string,
  memberId: string,
  data: { fullName: string; email: string },
  expectedStatus?: MemberStatus
): Promise<ActionResult<{ fullName: string; email: string }, MembersActionError>> {
  if (!isUuid(orgId) || !isUuid(memberId)) {
    return fail("invalid_request", "Invalid request parameters.");
  }

  const validation = validateMemberEdit(data);
  if (!validation.valid) {
    return fail("invalid_request", validation.error || "Invalid member details.");
  }

  const access = await getCallerOrgMembership(orgId);
  if (!access.ok) {
    return accessFailure(access.error);
  }

  const { supabase } = access.caller;

  try {
    const { error: rpcErr } = await supabase.rpc("update_member", {
      target_member: memberId,
      new_name: validation.fullName,
      new_email: validation.email,
      ...(expectedStatus ? { expected_status: expectedStatus } : {}),
    });

    if (rpcErr) {
      const msg = rpcErr.message || "";
      if (msg.includes("stale_member")) {
        return fail("stale", MEMBER_EDIT_MESSAGES.stale);
      }
      if (msg.includes("duplicate_email")) {
        return fail("duplicate_email", MEMBER_EDIT_MESSAGES.duplicateEmail);
      }
      if (msg.includes("invalid_name")) {
        return fail("invalid_request", MEMBER_EDIT_MESSAGES.nameInvalid);
      }
      if (msg.includes("invalid_email")) {
        return fail("invalid_request", MEMBER_EDIT_MESSAGES.emailInvalid);
      }
      if (msg.includes("not_permitted")) {
        return fail("access_revoked", MEMBER_EDIT_MESSAGES.notPermitted);
      }
      if (msg.includes("member_not_found")) {
        return fail("not_found", MEMBER_EDIT_MESSAGES.notFound);
      }
      return fail("failed", MEMBER_EDIT_MESSAGES.saveFailed);
    }

    revalidatePath(membersPath(orgId));
    return ok({ fullName: validation.fullName, email: validation.email });
  } catch {
    return fail("failed", MEMBER_EDIT_MESSAGES.saveFailed);
  }
}

export async function setMemberStatusAction(
  orgId: string,
  memberId: string,
  newStatus: "active" | "inactive",
  expectedStatus?: MemberStatus
): Promise<ActionResult<void, MembersActionError>> {
  if (!isUuid(orgId) || !isUuid(memberId)) {
    return fail("invalid_request", "Invalid request parameters.");
  }

  if (newStatus !== "active" && newStatus !== "inactive") {
    return fail("invalid_request", "Invalid member status.");
  }

  const access = await getCallerOrgMembership(orgId);
  if (!access.ok) {
    return accessFailure(access.error);
  }

  const { supabase } = access.caller;

  try {
    const { error: rpcErr } = await supabase.rpc("set_member_status", {
      target_member: memberId,
      new_status: newStatus,
      ...(expectedStatus ? { expected_status: expectedStatus } : {}),
    });

    if (rpcErr) {
      const msg = rpcErr.message || "";
      if (msg.includes("stale_member")) {
        return fail("stale", MEMBER_EDIT_MESSAGES.stale);
      }
      if (msg.includes("not_permitted")) {
        return fail("access_revoked", MEMBER_EDIT_MESSAGES.notPermitted);
      }
      if (msg.includes("member_not_found")) {
        return fail("not_found", MEMBER_EDIT_MESSAGES.notFound);
      }
      return fail("failed", MEMBER_EDIT_MESSAGES.statusChangeFailed);
    }

    revalidatePath(membersPath(orgId));
    return ok();
  } catch {
    return fail("failed", MEMBER_EDIT_MESSAGES.statusChangeFailed);
  }
}

