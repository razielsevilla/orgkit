import type {
  PastEventLogItem,
  PastEventsFilterState,
  PastEventsSummary,
  TermFilterOption,
} from "./past-events-types";

/**
 * Returns whether an event belongs in the past events log:
 * either it is cancelled, or its end time has elapsed.
 */
export function isPastOrCancelledEvent(
  event: { endsAt: string; status: string },
  now: Date = new Date()
): boolean {
  if (event.status === "cancelled") return true;
  const endsAtMs = new Date(event.endsAt).getTime();
  return !Number.isNaN(endsAtMs) && endsAtMs <= now.getTime();
}

/**
 * Calculates aggregated summary numbers over a list of past events.
 * Cancelled events do not contribute to total or average attendance.
 * Zero-attendance events do not cause division-by-zero errors.
 */
export function calculatePastEventsSummary(
  events: PastEventLogItem[]
): PastEventsSummary {
  const totalEvents = events.length;
  let cancelledEvents = 0;
  let completedEvents = 0;
  let totalAttendance = 0;

  for (const ev of events) {
    if (ev.status === "cancelled") {
      cancelledEvents++;
    } else {
      completedEvents++;
      if (typeof ev.attendanceCount === "number" && ev.attendanceCount > 0) {
        totalAttendance += ev.attendanceCount;
      }
    }
  }

  const averageAttendance =
    completedEvents > 0 ? Math.round(totalAttendance / completedEvents) : 0;

  return {
    totalEvents,
    completedEvents,
    cancelledEvents,
    totalAttendance,
    averageAttendance,
  };
}

/**
 * Extracts the YYYY-MM-DD date string from an ISO timestamp.
 */
export function toIsoDate(isoString: string): string {
  try {
    return new Date(isoString).toISOString().split("T")[0];
  } catch {
    return "";
  }
}

/**
 * Filters past events by selected term, custom date range, and search text.
 */
export function filterPastEvents(
  events: PastEventLogItem[],
  filter: PastEventsFilterState,
  terms: TermFilterOption[] = []
): PastEventLogItem[] {
  let result = events;

  // 1. Term filter
  if (filter.term && filter.term !== "all") {
    const matchedTerm = terms.find((t) => t.termName === filter.term);
    if (matchedTerm) {
      result = result.filter((ev) => {
        const evDate = toIsoDate(ev.startsAt);
        return evDate >= matchedTerm.startDate && evDate <= matchedTerm.endDate;
      });
    }
  }

  // 2. Custom date range (From)
  if (filter.fromDate && filter.fromDate.trim()) {
    const from = filter.fromDate.trim();
    result = result.filter((ev) => toIsoDate(ev.startsAt) >= from);
  }

  // 3. Custom date range (To)
  if (filter.toDate && filter.toDate.trim()) {
    const to = filter.toDate.trim();
    result = result.filter((ev) => toIsoDate(ev.startsAt) <= to);
  }

  // 4. Keyword search across title and location
  if (filter.search && filter.search.trim()) {
    const query = filter.search.trim().toLowerCase();
    result = result.filter((ev) => {
      const matchTitle = ev.title.toLowerCase().includes(query);
      const matchLoc = ev.location ? ev.location.toLowerCase().includes(query) : false;
      const matchDate = toIsoDate(ev.startsAt).includes(query);
      return matchTitle || matchLoc || matchDate;
    });
  }

  return result;
}
