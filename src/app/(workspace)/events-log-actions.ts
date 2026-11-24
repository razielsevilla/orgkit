"use server";

import { logger } from "@/src/lib/logger";
import { fail, ok, type ActionResult } from "@/src/lib/action-result";
import { withOrgCaller, type OrgCallerError } from "@/src/lib/orgs/org-access";
import { isUuid } from "@/src/lib/validation";
import type {
  PastEventLogItem,
  PastEventsLogData,
  TermFilterOption,
} from "@/src/lib/events/past-events-types";
import { PAST_EVENTS_MESSAGES } from "@/src/lib/events/past-events-types";
import {
  calculatePastEventsSummary,
  isPastOrCancelledEvent,
} from "@/src/lib/events/past-events";
import type { EventStatus } from "@/src/lib/events/event-validation";

export type PastEventsActionError = OrgCallerError | "not_found" | "invalid_request";

interface EventDbRow {
  id: string;
  org_id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  location: string | null;
  status: string;
  created_at: string;
}

interface TermDbRow {
  term_name: string;
  start_date: string;
  end_date: string;
}

interface AttendanceCountRow {
  event_id: string;
}

/**
 * Loads all past and cancelled events for an organization, their attendance counts,
 * and available officer term boundaries for filtering.
 */
export async function getPastEventsLog(
  orgId: string
): Promise<ActionResult<PastEventsLogData, PastEventsActionError>> {
  if (!isUuid(orgId)) {
    return fail("invalid_request", "Invalid organization ID.");
  }

  return withOrgCaller<PastEventsLogData, PastEventsActionError>(
    orgId,
    { name: "getPastEventsLog", unexpected: PAST_EVENTS_MESSAGES.loadFailed },
    async ({ supabase }) => {
      // 1. Fetch organization details, events, and attendance concurrently
      const [orgRes, eventsRes, attendanceRes, termsRes] = await Promise.all([
        supabase.from("orgs").select("name").eq("id", orgId).maybeSingle(),
        supabase
          .from("events")
          .select("id, org_id, title, starts_at, ends_at, location, status, created_at")
          .eq("org_id", orgId)
          .order("starts_at", { ascending: false })
          .order("id", { ascending: false }),
        supabase.from("attendance").select("event_id").eq("org_id", orgId),
        supabase
          .from("officer_terms")
          .select("term_name, start_date, end_date")
          .eq("org_id", orgId)
          .order("start_date", { ascending: false }),
      ]);

      if (orgRes.error || !orgRes.data) {
        logger.error("events_log.org_read_failed", { orgId, error: orgRes.error });
        return fail("failed", PAST_EVENTS_MESSAGES.loadFailed);
      }

      if (eventsRes.error || !eventsRes.data) {
        logger.error("events_log.events_read_failed", { orgId, error: eventsRes.error });
        return fail("failed", PAST_EVENTS_MESSAGES.loadFailed);
      }

      // Map attendance counts by event_id
      const attendanceCountMap = new Map<string, number>();
      if (attendanceRes.data) {
        for (const row of attendanceRes.data as AttendanceCountRow[]) {
          const current = attendanceCountMap.get(row.event_id) ?? 0;
          attendanceCountMap.set(row.event_id, current + 1);
        }
      }

      // Build past events list
      const now = new Date();
      const pastEvents: PastEventLogItem[] = [];

      for (const row of eventsRes.data as EventDbRow[]) {
        const isPastOrCancelled = isPastOrCancelledEvent(
          { endsAt: row.ends_at, status: row.status },
          now
        );

        if (isPastOrCancelled) {
          const isCancelled = row.status === "cancelled";
          pastEvents.push({
            id: row.id,
            orgId: row.org_id,
            title: row.title,
            startsAt: row.starts_at,
            endsAt: row.ends_at,
            location: row.location,
            status: isCancelled ? "cancelled" : ("scheduled" as EventStatus),
            attendanceCount: isCancelled
              ? null
              : (attendanceCountMap.get(row.id) ?? 0),
            createdAt: row.created_at,
          });
        }
      }

      // Build distinct term options from officer_terms
      const termsMap = new Map<string, TermFilterOption>();
      if (termsRes.data) {
        for (const t of termsRes.data as TermDbRow[]) {
          if (!termsMap.has(t.term_name)) {
            termsMap.set(t.term_name, {
              termName: t.term_name,
              startDate: t.start_date,
              endDate: t.end_date,
            });
          } else {
            const existing = termsMap.get(t.term_name)!;
            if (t.start_date < existing.startDate) existing.startDate = t.start_date;
            if (t.end_date > existing.endDate) existing.endDate = t.end_date;
          }
        }
      }

      const terms = Array.from(termsMap.values());
      const summary = calculatePastEventsSummary(pastEvents);

      return ok({
        orgId,
        orgName: orgRes.data.name,
        events: pastEvents,
        terms,
        summary,
      });
    }
  );
}
