"use server";

import { revalidatePath } from "next/cache";
import { fail, ok, type ActionResult } from "@/src/lib/action-result";
import { accessFailure, getCallerOrgMembership } from "@/src/lib/orgs/org-access";
import { membersPath } from "@/src/lib/routes";
import { isUuid } from "@/src/lib/validation";

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
  pendingCount: number;
  joinLinkToken: string | null;
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

    const searchTerm = options?.search?.trim();
    if (searchTerm) {
      const cleaned = searchTerm.replace(/\s+/g, " ");
      query = query.or(`full_name.ilike.%${cleaned}%,email.ilike.%${cleaned}%`);
    }

    // Order pending members first, then newest joins first within groups
    query = query.order("is_pending", { ascending: false }).order("created_at", { ascending: false });

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
    if ((totalCount ?? 0) === 0) {
      const { data: linkToken } = await supabase.rpc("get_org_join_link", {
        target_org: orgId,
      });
      joinLinkToken = linkToken || null;
    }

    return ok({
      members,
      totalCount: totalCount ?? 0,
      matchingCount: matchingCount ?? members.length,
      pendingCount: pendingCount ?? 0,
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

