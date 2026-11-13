"use server";

import { revalidatePath } from "next/cache";
import { fail, ok, type ActionResult } from "@/src/lib/action-result";
import { withOrgCaller, type OrgCallerError } from "@/src/lib/orgs/org-access";
import { rpcFailure, type ErrorRule } from "@/src/lib/rpc-errors";
import { eventPath } from "@/src/lib/routes";
import { isUuid } from "@/src/lib/validation";
import { buildMemberSearchFilter } from "@/src/lib/members/member-search";
import {
  ATTENDANCE_MESSAGES,
  ATTENDEE_SEARCH_LIMIT,
  sortRecords,
  type AttendanceData,
  type AttendanceMethod,
  type AttendanceRecord,
  type AttendeeCandidate,
} from "@/src/lib/events/attendance-state";
import { HISTORY_MESSAGES, parseHistory, type MemberHistory } from "@/src/lib/members/attendance-history";

/** Attendance lists and manual add or remove (E4). Officers of the event's org only. */
export type AttendanceActionError =
  | OrgCallerError
  | "not_found"
  | "member_not_found"
  | "invalid_request"
  | "cancelled";

const INVALID_REQUEST = "Invalid request parameters.";

interface AttendanceRow {
  member_id: string;
  method: string;
  checked_in_at: string;
  // PostgREST returns a to-one embed as an object; tolerate an array too
  members: { full_name: string } | { full_name: string }[] | null;
}

function toRecord(row: AttendanceRow): AttendanceRecord {
  const member = Array.isArray(row.members) ? row.members[0] : row.members;
  const method: AttendanceMethod = row.method === "manual" ? "manual" : "qr";
  return {
    memberId: row.member_id,
    fullName: member?.full_name ?? "Unknown member",
    method,
    checkedInAt: row.checked_in_at,
  };
}

/** Who is present at the event, newest first, and how many active members the org has */
export async function getEventAttendanceAction(
  orgId: string,
  eventId: string
): Promise<ActionResult<AttendanceData, AttendanceActionError>> {
  if (!isUuid(orgId) || !isUuid(eventId)) return fail("not_found", ATTENDANCE_MESSAGES.notFound);

  return withOrgCaller<AttendanceData, AttendanceActionError>(
    orgId,
    { name: "getEventAttendanceAction", unexpected: ATTENDANCE_MESSAGES.loadFailed },
    async ({ supabase }) => {
      const [attendance, active] = await Promise.all([
        supabase
          .from("attendance")
          .select("member_id, method, checked_in_at, members(full_name)")
          .eq("org_id", orgId)
          .eq("event_id", eventId),
        supabase
          .from("members")
          .select("id", { count: "exact", head: true })
          .eq("org_id", orgId)
          .eq("status", "active"),
      ]);

      if (attendance.error || !attendance.data) {
        console.error("getEventAttendanceAction: could not read attendance:", attendance.error);
        return fail("failed", ATTENDANCE_MESSAGES.loadFailed);
      }
      if (active.error) {
        console.error("getEventAttendanceAction: could not count members:", active.error);
        return fail("failed", ATTENDANCE_MESSAGES.loadFailed);
      }

      const records = sortRecords((attendance.data as unknown as AttendanceRow[]).map(toRecord));
      return ok({ records, activeCount: active.count ?? 0 });
    }
  );
}

/** What the database says when a member's history can't be read */
const HISTORY_ERRORS: ErrorRule<AttendanceActionError>[] = [
  { match: "member_not_found", error: "not_found", message: HISTORY_MESSAGES.notFound },
];

/**
 * One member's attendance across past events (E5). A malformed ID, a missing
 * member and a member of another org all answer `not_found`, with no data.
 */
export async function getMemberAttendanceHistoryAction(
  orgId: string,
  memberId: string
): Promise<ActionResult<MemberHistory, AttendanceActionError>> {
  if (!isUuid(orgId) || !isUuid(memberId)) return fail("not_found", HISTORY_MESSAGES.notFound);

  return withOrgCaller<MemberHistory, AttendanceActionError>(
    orgId,
    { name: "getMemberAttendanceHistoryAction", unexpected: HISTORY_MESSAGES.loadFailed },
    async ({ supabase }) => {
      const { data, error } = await supabase.rpc("get_member_attendance_history", {
        target_member: memberId,
      });
      if (error) {
        return rpcFailure(
          "get_member_attendance_history",
          error,
          HISTORY_ERRORS,
          HISTORY_MESSAGES.loadFailed
        );
      }

      // An officer of two orgs must not read a member through the wrong one
      const memberOrg = (data as { org_id?: unknown } | null)?.org_id;
      if (memberOrg !== orgId) return fail("not_found", HISTORY_MESSAGES.notFound);

      const history = parseHistory(data);
      if (!history) {
        console.error("getMemberAttendanceHistoryAction: unexpected response shape");
        return fail("failed", HISTORY_MESSAGES.loadFailed);
      }
      return ok(history);
    }
  );
}

/**
 * Active members matching the search who are not yet present. An empty search
 * answers with nothing: the officer has to type to find someone.
 */
export async function searchAttendeeCandidatesAction(
  orgId: string,
  eventId: string,
  search: string
): Promise<ActionResult<AttendeeCandidate[], AttendanceActionError>> {
  if (!isUuid(orgId) || !isUuid(eventId) || typeof search !== "string") {
    return fail("invalid_request", INVALID_REQUEST);
  }
  const filter = buildMemberSearchFilter(search);
  if (!filter) return ok([]);

  return withOrgCaller<AttendeeCandidate[], AttendanceActionError>(
    orgId,
    { name: "searchAttendeeCandidatesAction", unexpected: ATTENDANCE_MESSAGES.searchFailed },
    async ({ supabase }) => {
      const { data: present, error: presentError } = await supabase
        .from("attendance")
        .select("member_id")
        .eq("org_id", orgId)
        .eq("event_id", eventId);
      if (presentError || !present) {
        console.error("searchAttendeeCandidatesAction: could not read attendance:", presentError);
        return fail("failed", ATTENDANCE_MESSAGES.searchFailed);
      }

      let query = supabase
        .from("members")
        .select("id, full_name, email")
        .eq("org_id", orgId)
        .eq("status", "active")
        .or(filter)
        .order("full_name", { ascending: true })
        .order("id", { ascending: true })
        .limit(ATTENDEE_SEARCH_LIMIT);

      // The IDs come from our own table, never from the request
      const presentIds = present.map((r) => String(r.member_id)).filter(isUuid);
      if (presentIds.length > 0) query = query.not("id", "in", `(${presentIds.join(",")})`);

      const { data: rows, error } = await query;
      if (error || !rows) {
        console.error("searchAttendeeCandidatesAction: could not search members:", error);
        return fail("failed", ATTENDANCE_MESSAGES.searchFailed);
      }

      return ok(
        rows.map((r) => ({
          id: String(r.id),
          fullName: String(r.full_name),
          email: String(r.email),
        }))
      );
    }
  );
}

/** What the database says when an attendance write is refused */
const ATTENDANCE_WRITE_ERRORS: ErrorRule<AttendanceActionError>[] = [
  { match: "not_permitted", error: "access_revoked", message: ATTENDANCE_MESSAGES.notPermitted },
  { match: "event_not_found", error: "not_found", message: ATTENDANCE_MESSAGES.notFound },
  { match: "event_cancelled", error: "cancelled", message: ATTENDANCE_MESSAGES.cancelled },
  { match: "member_not_found", error: "member_not_found", message: ATTENDANCE_MESSAGES.memberNotFound },
];

/**
 * Marks a member present by hand. Adding someone who is already present (even
 * from another officer's screen at the same moment) succeeds and changes
 * nothing, so the list can never hold a duplicate.
 */
export async function addAttendanceAction(
  orgId: string,
  eventId: string,
  memberId: string
): Promise<ActionResult<void, AttendanceActionError>> {
  if (!isUuid(orgId) || !isUuid(eventId) || !isUuid(memberId)) {
    return fail("invalid_request", INVALID_REQUEST);
  }

  return withOrgCaller<void, AttendanceActionError>(
    orgId,
    { name: "addAttendanceAction", unexpected: ATTENDANCE_MESSAGES.addFailed },
    async ({ supabase }) => {
      const { error } = await supabase.rpc("mark_attendance_manual", {
        target_event: eventId,
        target_member: memberId,
      });
      if (error) {
        return rpcFailure(
          "mark_attendance_manual",
          error,
          ATTENDANCE_WRITE_ERRORS,
          ATTENDANCE_MESSAGES.addFailed
        );
      }

      revalidatePath(eventPath(orgId, eventId));
      return ok();
    }
  );
}

/** Takes a member off the list. Removing someone already gone is harmless. */
export async function removeAttendanceAction(
  orgId: string,
  eventId: string,
  memberId: string
): Promise<ActionResult<void, AttendanceActionError>> {
  if (!isUuid(orgId) || !isUuid(eventId) || !isUuid(memberId)) {
    return fail("invalid_request", INVALID_REQUEST);
  }

  return withOrgCaller<void, AttendanceActionError>(
    orgId,
    { name: "removeAttendanceAction", unexpected: ATTENDANCE_MESSAGES.removeFailed },
    async ({ supabase }) => {
      const { error } = await supabase.rpc("remove_attendance", {
        target_event: eventId,
        target_member: memberId,
      });
      if (error) {
        return rpcFailure(
          "remove_attendance",
          error,
          ATTENDANCE_WRITE_ERRORS,
          ATTENDANCE_MESSAGES.removeFailed
        );
      }

      revalidatePath(eventPath(orgId, eventId));
      return ok();
    }
  );
}
