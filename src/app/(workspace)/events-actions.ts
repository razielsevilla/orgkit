"use server";

import { revalidatePath } from "next/cache";
import { fail, ok, type ActionResult } from "@/src/lib/action-result";
import { withOrgCaller, type OrgCallerError } from "@/src/lib/orgs/org-access";
import { rpcFailure, type ErrorRule } from "@/src/lib/rpc-errors";
import { checkinLinkPath, eventPath, eventsPath } from "@/src/lib/routes";
import { SLOT_SECONDS, signCheckinToken, slotEndsAtMs, slotFor } from "@/src/lib/checkin/token";
import { getCheckinSecret } from "@/src/lib/checkin/secret";
import { CHECKIN_MESSAGES, getCheckinBlock, type CheckinBlock } from "@/src/lib/events/checkin-eligibility";
import { isUuid } from "@/src/lib/validation";
import {
  EVENT_MESSAGES,
  isEventStatus,
  validateEvent,
  type EventInput,
  type EventStatus,
} from "@/src/lib/events/event-validation";

export interface WorkspaceEvent {
  id: string;
  orgId: string;
  title: string;
  startsAt: string;
  endsAt: string;
  location: string | null;
  status: EventStatus;
  /** Whether the officer has opened the check-in window */
  checkinOpen: boolean;
  createdAt: string;
}

export type EventsActionError =
  | OrgCallerError
  | "not_found"
  | "invalid_request"
  | "cancelled"
  | "ended"
  | "closed";

const INVALID_REQUEST = "Invalid request parameters.";
const EVENT_COLUMNS = "id, org_id, title, starts_at, ends_at, location, status, checkin_open, created_at";

interface EventRow {
  id: string;
  org_id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  location: string | null;
  status: string;
  checkin_open: boolean;
  created_at: string;
}

function toWorkspaceEvent(row: EventRow): WorkspaceEvent {
  return {
    id: row.id,
    orgId: row.org_id,
    title: row.title,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    location: row.location,
    // The table's check constraint only allows the two statuses
    status: isEventStatus(row.status) ? row.status : "scheduled",
    checkinOpen: row.checkin_open === true,
    createdAt: row.created_at,
  };
}

/** Every event of the org. The page orders them; an org has far too few to need paging. */
export async function getWorkspaceEvents(
  orgId: string
): Promise<ActionResult<WorkspaceEvent[], EventsActionError>> {
  return withOrgCaller<WorkspaceEvent[], EventsActionError>(
    orgId,
    { name: "getWorkspaceEvents", unexpected: EVENT_MESSAGES.loadFailed },
    async ({ supabase }) => {
      const { data: rows, error } = await supabase
        .from("events")
        .select(EVENT_COLUMNS)
        .eq("org_id", orgId)
        .order("starts_at", { ascending: false })
        .order("id", { ascending: false });

      if (error || !rows) {
        console.error("getWorkspaceEvents: could not read events:", error);
        return fail("failed", EVENT_MESSAGES.loadFailed);
      }
      return ok((rows as EventRow[]).map(toWorkspaceEvent));
    }
  );
}

/**
 * One event of the org. A malformed ID answers "not_found" without touching the
 * database, the same as an event that doesn't exist or belongs to another org.
 */
export async function getWorkspaceEvent(
  orgId: string,
  eventId: string
): Promise<ActionResult<WorkspaceEvent, EventsActionError>> {
  if (!isUuid(orgId) || !isUuid(eventId)) return fail("not_found", EVENT_MESSAGES.notFound);

  return withOrgCaller<WorkspaceEvent, EventsActionError>(
    orgId,
    { name: "getWorkspaceEvent", unexpected: EVENT_MESSAGES.loadFailed },
    async ({ supabase }) => {
      const { data: row, error } = await supabase
        .from("events")
        .select(EVENT_COLUMNS)
        .eq("org_id", orgId)
        .eq("id", eventId)
        .maybeSingle();

      if (error) {
        console.error("getWorkspaceEvent: could not read event:", error);
        return fail("failed", EVENT_MESSAGES.loadFailed);
      }
      if (!row) return fail("not_found", EVENT_MESSAGES.notFound);
      return ok(toWorkspaceEvent(row as EventRow));
    }
  );
}

/** What the database says when an event write is refused, shared by every event write */
const EVENT_WRITE_ERRORS: ErrorRule<EventsActionError>[] = [
  { match: "not_permitted", error: "access_revoked", message: EVENT_MESSAGES.notPermitted },
  { match: "event_not_found", error: "not_found", message: EVENT_MESSAGES.notFound },
];

const SAVE_EVENT_ERRORS: ErrorRule<EventsActionError>[] = [
  { match: "event_cancelled", error: "cancelled", message: EVENT_MESSAGES.alreadyCancelled },
  { match: "invalid_title", error: "invalid_request", message: EVENT_MESSAGES.titleInvalid },
  { match: "invalid_time_range", error: "invalid_request", message: EVENT_MESSAGES.endBeforeStart },
  { match: "invalid_location", error: "invalid_request", message: EVENT_MESSAGES.locationInvalid },
  ...EVENT_WRITE_ERRORS,
];

export async function createEventAction(
  orgId: string,
  input: EventInput
): Promise<ActionResult<{ id: string }, EventsActionError>> {
  if (!isUuid(orgId)) return fail("invalid_request", INVALID_REQUEST);

  const validation = validateEvent(input ?? ({} as EventInput));
  if (!validation.valid) return fail("invalid_request", validation.error);

  return withOrgCaller<{ id: string }, EventsActionError>(
    orgId,
    { name: "createEventAction", unexpected: EVENT_MESSAGES.saveFailed },
    async ({ supabase }) => {
      const { data, error } = await supabase.rpc("create_event", {
        target_org: orgId,
        new_title: validation.title,
        new_starts_at: validation.startsAt,
        new_ends_at: validation.endsAt,
        new_location: validation.location,
      });
      if (error) return rpcFailure("create_event", error, SAVE_EVENT_ERRORS, EVENT_MESSAGES.saveFailed);
      if (typeof data !== "string" || !isUuid(data)) return fail("failed", EVENT_MESSAGES.saveFailed);

      revalidatePath(eventsPath(orgId));
      return ok({ id: data });
    }
  );
}

export async function updateEventAction(
  orgId: string,
  eventId: string,
  input: EventInput
): Promise<ActionResult<void, EventsActionError>> {
  if (!isUuid(orgId) || !isUuid(eventId)) return fail("invalid_request", INVALID_REQUEST);

  const validation = validateEvent(input ?? ({} as EventInput));
  if (!validation.valid) return fail("invalid_request", validation.error);

  return withOrgCaller<void, EventsActionError>(
    orgId,
    { name: "updateEventAction", unexpected: EVENT_MESSAGES.saveFailed },
    async ({ supabase }) => {
      const { error } = await supabase.rpc("update_event", {
        target_event: eventId,
        new_title: validation.title,
        new_starts_at: validation.startsAt,
        new_ends_at: validation.endsAt,
        new_location: validation.location,
      });
      if (error) return rpcFailure("update_event", error, SAVE_EVENT_ERRORS, EVENT_MESSAGES.saveFailed);

      revalidatePath(eventsPath(orgId));
      revalidatePath(eventPath(orgId, eventId));
      return ok();
    }
  );
}

/** Cancelling twice is harmless: the second call succeeds and changes nothing */
export async function cancelEventAction(
  orgId: string,
  eventId: string
): Promise<ActionResult<void, EventsActionError>> {
  if (!isUuid(orgId) || !isUuid(eventId)) return fail("invalid_request", INVALID_REQUEST);

  return withOrgCaller<void, EventsActionError>(
    orgId,
    { name: "cancelEventAction", unexpected: EVENT_MESSAGES.cancelFailed },
    async ({ supabase }) => {
      const { error } = await supabase.rpc("cancel_event", { target_event: eventId });
      if (error) return rpcFailure("cancel_event", error, EVENT_WRITE_ERRORS, EVENT_MESSAGES.cancelFailed);

      revalidatePath(eventsPath(orgId));
      revalidatePath(eventPath(orgId, eventId));
      return ok();
    }
  );
}

const CHECKIN_ERRORS: ErrorRule<EventsActionError>[] = [
  { match: "event_cancelled", error: "cancelled", message: CHECKIN_MESSAGES.cancelled },
  { match: "event_ended", error: "ended", message: CHECKIN_MESSAGES.ended },
  ...EVENT_WRITE_ERRORS,
];

/** Opens or closes the check-in window. Closing always works; opening is refused for a cancelled or long-ended event. */
export async function setCheckinOpenAction(
  orgId: string,
  eventId: string,
  open: boolean
): Promise<ActionResult<void, EventsActionError>> {
  if (!isUuid(orgId) || !isUuid(eventId) || typeof open !== "boolean") {
    return fail("invalid_request", INVALID_REQUEST);
  }

  const failed = open ? CHECKIN_MESSAGES.openFailed : CHECKIN_MESSAGES.closeFailed;
  return withOrgCaller<void, EventsActionError>(
    orgId,
    { name: "setCheckinOpenAction", unexpected: failed },
    async ({ supabase }) => {
      const { error } = await supabase.rpc("set_event_checkin", {
        target_event: eventId,
        should_open: open,
      });
      if (error) return rpcFailure("set_event_checkin", error, CHECKIN_ERRORS, failed);

      revalidatePath(eventPath(orgId, eventId));
      return ok();
    }
  );
}

export interface CheckinToken {
  /** What the QR encodes: the site address plus the signed token */
  url: string;
  /** When this token's slot ends, by the server's clock (ms since the epoch) */
  expiresAtMs: number;
  /** How long a slot lasts, so the screen can draw its countdown */
  slotMs: number;
  /** The server's clock when the token was made, so the screen can ignore a wrong device clock */
  serverNowMs: number;
  /** Members checked in so far */
  count: number;
}

/** The address check-in links are built on, never taken from the request */
function getSiteUrl(): string | null {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");
  return configured || (process.env.NODE_ENV === "production" ? null : "http://localhost:3000");
}

/**
 * The current QR token for an event. Answers only for an officer of the event's
 * org, for an event whose window is open and can still be checked into; every
 * other case returns no token. The token is signed here and never stored.
 */
export async function getCheckinTokenAction(
  orgId: string,
  eventId: string
): Promise<ActionResult<CheckinToken, EventsActionError>> {
  if (!isUuid(orgId) || !isUuid(eventId)) return fail("not_found", EVENT_MESSAGES.notFound);

  return withOrgCaller<CheckinToken, EventsActionError>(
    orgId,
    { name: "getCheckinTokenAction", unexpected: CHECKIN_MESSAGES.tokenFailed },
    async ({ supabase }) => {
      const { data: row, error } = await supabase
        .from("events")
        .select("status, ends_at, checkin_open")
        .eq("org_id", orgId)
        .eq("id", eventId)
        .maybeSingle();

      if (error) {
        console.error("getCheckinTokenAction: could not read event:", error);
        return fail("failed", CHECKIN_MESSAGES.tokenFailed);
      }
      if (!row) return fail("not_found", EVENT_MESSAGES.notFound);

      const now = Date.now();
      const block: CheckinBlock | null = getCheckinBlock(
        { status: String(row.status), endsAt: String(row.ends_at) },
        now
      );
      if (block) return fail(block, CHECKIN_MESSAGES[block]);
      if (row.checkin_open !== true) return fail("closed", CHECKIN_MESSAGES.closed);

      const siteUrl = getSiteUrl();
      if (!siteUrl) {
        console.error("getCheckinTokenAction: NEXT_PUBLIC_SITE_URL is not set");
        return fail("failed", CHECKIN_MESSAGES.tokenFailed);
      }

      // Members checked in so far (E3). Officers can read their org's attendance.
      // A failed count must not hide the QR code, so it falls back to 0.
      const { count, error: countError } = await supabase
        .from("attendance")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId)
        .eq("event_id", eventId);
      if (countError) console.error("getCheckinTokenAction: could not count attendance:", countError);

      const slot = slotFor(now);
      const token = signCheckinToken(eventId, slot, getCheckinSecret());
      return ok({
        url: `${siteUrl}${checkinLinkPath(token)}`,
        expiresAtMs: slotEndsAtMs(slot),
        slotMs: SLOT_SECONDS * 1000,
        serverNowMs: now,
        count: count ?? 0,
      });
    }
  );
}
