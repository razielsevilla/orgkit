/**
 * Member attendance history rules (E5): how a past event is labelled and how the
 * "Attended X of Y events" summary is counted.
 * Kept free of imports so the node:test unit tests can load it directly.
 */

export type HistoryMethod = "qr" | "manual";
export type HistoryStatus = "present" | "absent" | "cancelled";

export interface MemberHistoryRow {
  eventId: string;
  title: string;
  /** ISO 8601 instants */
  startsAt: string;
  endsAt: string;
  cancelled: boolean;
  attended: boolean;
  /** How they were marked present; null when absent */
  method: HistoryMethod | null;
  checkedInAt: string | null;
}

export interface MemberHistory {
  /** When the member joined (members.created_at), ISO 8601 */
  joinedAt: string;
  /** Past events, newest first */
  rows: MemberHistoryRow[];
}

export const HISTORY_MESSAGES = {
  loadFailed: "We couldn't load this member's attendance. Try again.",
  notFound: "We couldn't find that member.",
  empty: "No events yet",
  emptyHint: "Events that end after this member joined will show up here.",
} as const;

export const HISTORY_STATUS_LABELS: Record<HistoryStatus, string> = {
  present: "Present",
  absent: "Absent",
  cancelled: "Cancelled",
};

/** A cancelled event is "Cancelled" whatever else is recorded for it */
export function rowStatus(row: Pick<MemberHistoryRow, "cancelled" | "attended">): HistoryStatus {
  if (row.cancelled) return "cancelled";
  return row.attended ? "present" : "absent";
}

/**
 * Counts only events that ended after the member joined and were not cancelled.
 * An event they attended from before they joined is listed but not counted, so a
 * late joiner is never penalised for earlier events.
 */
export function summarise(
  rows: readonly MemberHistoryRow[],
  joinedAt: string
): { attended: number; total: number } {
  const joined = Date.parse(joinedAt);
  let attended = 0;
  let total = 0;
  for (const row of rows) {
    if (row.cancelled) continue;
    const ended = Date.parse(row.endsAt);
    if (Number.isFinite(joined) && Number.isFinite(ended) && ended <= joined) continue;
    total += 1;
    if (row.attended) attended += 1;
  }
  return { attended, total };
}

/** "Attended 12 of 15 events"; null when nothing counts, so the screen never shows "0 of 0" */
export function summaryLabel(attended: number, total: number): string | null {
  if (total <= 0) return null;
  return `Attended ${attended} of ${total} ${total === 1 ? "event" : "events"}`;
}

/** Reads what get_member_attendance_history returns. Anything unexpected gives null. */
export function parseHistory(raw: unknown): MemberHistory | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as { joined_at?: unknown; events?: unknown };
  if (typeof value.joined_at !== "string" || !Array.isArray(value.events)) return null;

  const rows: MemberHistoryRow[] = [];
  for (const item of value.events) {
    if (!item || typeof item !== "object") return null;
    const e = item as Record<string, unknown>;
    if (
      typeof e.event_id !== "string" ||
      typeof e.title !== "string" ||
      typeof e.starts_at !== "string" ||
      typeof e.ends_at !== "string"
    ) {
      return null;
    }
    const attended = e.attended === true;
    rows.push({
      eventId: e.event_id,
      title: e.title,
      startsAt: e.starts_at,
      endsAt: e.ends_at,
      cancelled: e.status === "cancelled",
      attended,
      method: attended ? (e.method === "manual" ? "manual" : "qr") : null,
      checkedInAt: typeof e.checked_in_at === "string" ? e.checked_in_at : null,
    });
  }
  return { joinedAt: value.joined_at, rows };
}
