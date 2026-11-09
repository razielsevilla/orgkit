"use server";

import { revalidatePath } from "next/cache";
import { fail, ok, type ActionResult } from "@/src/lib/action-result";
import { withOrgPermission, type OrgAccessError } from "@/src/lib/orgs/org-access";
import { rpcFailure, type ErrorRule } from "@/src/lib/rpc-errors";
import { createAdminClient } from "@/src/lib/supabase/service-role";
import { membersPath } from "@/src/lib/routes";
import {
  CSV_ERROR_MESSAGES,
  MAX_CSV_BYTES,
  MAX_IMPORT_ROWS,
  readRoster,
  type CsvErrorCode,
  type InviteRow,
  type ParsedRoster,
} from "@/src/lib/members/csv-import";

export interface InviteRowProblem {
  row: number;
  email: string;
  reason: string;
}

/** What an import (or its preview) did, or would do */
export interface ImportSummary {
  invited: number;
  duplicates: number;
  invalid: number;
  invalidRows: InviteRowProblem[];
}

export type JoinLinkStatus = "on" | "off" | "unknown";

export interface ImportDone extends ImportSummary {
  joinLinkStatus: JoinLinkStatus;
  joinLinkToken: string | null;
}

export interface MemberInvite {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
  expiresAt: string;
  joinedAt: string | null;
}

export interface MemberInvitesData {
  invites: MemberInvite[];
  /** Pending and joined invitations that have not expired */
  totalCount: number;
  pendingCount: number;
  hasMore: boolean;
}

export type InviteActionError =
  | OrgAccessError
  | CsvErrorCode
  | "invalid_request"
  | "no_rows"
  | "too_many_rows";

const INVITES_PAGE_SIZE = 50;
const NOT_ADMIN = "Only admins can import a member list.";
const UNEXPECTED = "Something went wrong. Please try again.";

const IMPORT_ERRORS: ErrorRule<InviteActionError>[] = [
  { match: "not_admin", error: "not_authorized", message: NOT_ADMIN },
  { match: "too_many_rows", error: "too_many_rows", message: CSV_ERROR_MESSAGES.too_many_rows },
  { match: "no_rows", error: "no_rows", message: CSV_ERROR_MESSAGES.no_rows },
  { match: "invalid_rows", error: "invalid_request", message: UNEXPECTED },
];

/**
 * Reads the uploaded CSV on the server, so the size and row limits cannot be
 * skipped by editing the page. Saves nothing: it only returns the lines and our
 * first guesses for the columns.
 */
export async function parseRosterCsv(
  orgId: string,
  formData: FormData
): Promise<ActionResult<ParsedRoster, InviteActionError>> {
  return withOrgPermission<ParsedRoster, InviteActionError>(
    orgId,
    "member:import",
    { name: "parseRosterCsv", denied: NOT_ADMIN, unexpected: "We couldn't read that file. Please try again." },
    async () => {
      const file = formData.get("file");
      if (!(file instanceof File)) {
        return fail("invalid_request", "Choose a CSV file to upload.");
      }
      // Check the size before reading it into memory
      if (file.size > MAX_CSV_BYTES) return fail("too_large", CSV_ERROR_MESSAGES.too_large);

      const result = readRoster(new Uint8Array(await file.arrayBuffer()));
      if (!result.ok) return fail(result.error, CSV_ERROR_MESSAGES[result.error]);
      return ok(result.roster);
    }
  );
}

/** Whatever the browser sends is untrusted: rebuild each row from scratch. */
function cleanRows(rows: unknown): InviteRow[] | null {
  if (!Array.isArray(rows)) return null;
  return rows.map((raw, i) => {
    const item = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
    const row = typeof item.row === "number" && Number.isSafeInteger(item.row) && item.row > 0 && item.row < 1e7
      ? item.row
      : i + 1;
    return {
      row,
      email: typeof item.email === "string" ? item.email.slice(0, 400) : "",
      name: typeof item.name === "string" ? item.name.slice(0, 400) : "",
    };
  });
}

interface RpcSummary {
  invited?: number;
  duplicates?: number;
  invalid?: number;
  invalid_rows?: { row: number; email: string; reason: string }[];
}

function toSummary(data: unknown): ImportSummary | null {
  if (!data || typeof data !== "object") return null;
  const d = data as RpcSummary;
  if (typeof d.invited !== "number" || typeof d.duplicates !== "number" || typeof d.invalid !== "number") {
    return null;
  }
  return {
    invited: d.invited,
    duplicates: d.duplicates,
    invalid: d.invalid,
    invalidRows: Array.isArray(d.invalid_rows)
      ? d.invalid_rows.map((r) => ({ row: r.row, email: r.email, reason: r.reason }))
      : [],
  };
}

/**
 * The preview: runs the real import rules in the database but saves nothing, so
 * the counts the admin sees are exactly what the import will do.
 */
export async function previewMemberInvites(
  orgId: string,
  rows: InviteRow[]
): Promise<ActionResult<ImportSummary, InviteActionError>> {
  return withOrgPermission<ImportSummary, InviteActionError>(
    orgId,
    "member:import",
    { name: "previewMemberInvites", denied: NOT_ADMIN, unexpected: "We couldn't build the preview. Please try again." },
    async ({ supabase }) => {
      const clean = cleanRows(rows);
      if (!clean) return fail("invalid_request", UNEXPECTED);
      if (clean.length === 0) return fail("no_rows", CSV_ERROR_MESSAGES.no_rows);
      if (clean.length > MAX_IMPORT_ROWS) return fail("too_many_rows", CSV_ERROR_MESSAGES.too_many_rows);

      const { data, error } = await supabase.rpc("import_member_invites", {
        target_org: orgId,
        p_rows: clean,
        p_dry_run: true,
      });
      if (error) {
        return rpcFailure("import_member_invites", error, IMPORT_ERRORS, "We couldn't build the preview. Please try again.");
      }
      const summary = toSummary(data);
      return summary ? ok(summary) : fail("failed", "We couldn't build the preview. Please try again.");
    }
  );
}

/**
 * Saves the invitations in one transaction: every valid row, or none. Running
 * it twice (a double press, a reload) never invites anyone twice, because the
 * database skips people who are already invited. Nobody is emailed: the result
 * carries the join link so the admin can share it by hand.
 */
export async function importMemberInvites(
  orgId: string,
  rows: InviteRow[]
): Promise<ActionResult<ImportDone, InviteActionError>> {
  return withOrgPermission<ImportDone, InviteActionError>(
    orgId,
    "member:import",
    {
      name: "importMemberInvites",
      denied: NOT_ADMIN,
      unexpected: "Nothing was saved. Please try again.",
    },
    async ({ supabase }) => {
      const clean = cleanRows(rows);
      if (!clean) return fail("invalid_request", UNEXPECTED);
      if (clean.length === 0) return fail("no_rows", CSV_ERROR_MESSAGES.no_rows);
      if (clean.length > MAX_IMPORT_ROWS) return fail("too_many_rows", CSV_ERROR_MESSAGES.too_many_rows);

      const { data, error } = await supabase.rpc("import_member_invites", {
        target_org: orgId,
        p_rows: clean,
        p_dry_run: false,
      });
      if (error) {
        return rpcFailure("import_member_invites", error, IMPORT_ERRORS, "Nothing was saved. Please try again.");
      }
      const summary = toSummary(data);
      if (!summary) return fail("failed", "We couldn't confirm the import. Reload the page to check the Invited view.");

      let joinLinkStatus: JoinLinkStatus = "unknown";
      let joinLinkToken: string | null = null;
      try {
        const { data: token, error: linkError } = await supabase.rpc("get_org_join_link", {
          target_org: orgId,
        });
        if (!linkError) {
          joinLinkToken = typeof token === "string" && token ? token : null;
          joinLinkStatus = joinLinkToken ? "on" : "off";
        }
      } catch {
        // The invitations are saved; the summary just can't say whether the link is on
      }

      revalidatePath(membersPath(orgId));
      return ok({ ...summary, joinLinkStatus, joinLinkToken });
    }
  );
}

/**
 * The Invited view: invitations that have not expired, pending first, then
 * joined, newest first. Only admins can read them (they hold emails). Expired
 * invitations are removed here too, on top of the daily schedule.
 */
export async function getMemberInvites(
  orgId: string,
  options?: { offset?: number }
): Promise<ActionResult<MemberInvitesData, InviteActionError>> {
  return withOrgPermission<MemberInvitesData, InviteActionError>(
    orgId,
    "member:import",
    {
      name: "getMemberInvites",
      denied: "Only admins can see invitations.",
      unexpected: "We couldn't load the invitations. Try again.",
    },
    async ({ supabase }) => {
      const failed = fail("failed", "We couldn't load the invitations. Try again.");

      // Housekeeping: a failure here must not stop the page. Expired rows are
      // filtered out below either way.
      try {
        await createAdminClient().rpc("cleanup_expired_member_invites");
      } catch (err) {
        console.error("Could not clean up expired invitations:", err);
      }

      const nowIso = new Date().toISOString();
      const rawOffset = Number.isFinite(options?.offset) ? Math.trunc(options!.offset!) : 0;
      const offset = Math.max(rawOffset, 0);

      const { count: pendingCount, error: pendingErr } = await supabase
        .from("member_invites")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId)
        .is("joined_at", null)
        .gt("expires_at", nowIso);
      if (pendingErr) return failed;

      const { data, count, error } = await supabase
        .from("member_invites")
        .select("id, email, name, created_at, expires_at, joined_at", { count: "exact" })
        .eq("org_id", orgId)
        .gt("expires_at", nowIso)
        .order("joined_at", { ascending: false, nullsFirst: true })
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .range(offset, offset + INVITES_PAGE_SIZE - 1);
      if (error || !data) return failed;

      const invites: MemberInvite[] = data.map((row) => ({
        id: row.id,
        email: row.email,
        name: row.name,
        createdAt: row.created_at,
        expiresAt: row.expires_at,
        joinedAt: row.joined_at,
      }));
      const total = count ?? invites.length;

      return ok({
        invites,
        totalCount: total,
        pendingCount: pendingCount ?? 0,
        hasMore: offset + invites.length < total,
      });
    }
  );
}
