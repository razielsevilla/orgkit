/**
 * Attendance list rules (E4): the pure functions behind the optimistic updates,
 * the 5-second poll merge and the "N of M present" label.
 * Kept free of imports so the node:test unit tests can load it directly.
 */

export type AttendanceMethod = "qr" | "manual";

export interface AttendanceRecord {
  memberId: string;
  fullName: string;
  method: AttendanceMethod;
  /** ISO 8601 instant */
  checkedInAt: string;
}

export interface AttendanceData {
  /** Newest check-in first */
  records: AttendanceRecord[];
  /** Active members of the org: the "M" in "N of M present" */
  activeCount: number;
}

/** A member an officer can add: active and not yet present */
export interface AttendeeCandidate {
  id: string;
  fullName: string;
  email: string;
}

export const ATTENDANCE_POLL_MS = 5000;
export const ATTENDEE_SEARCH_LIMIT = 8;

export const ATTENDANCE_MESSAGES = {
  loadFailed: "We couldn't load the attendance list. Try again.",
  searchFailed: "We couldn't search members. Try again.",
  addFailed: "We couldn't add that member. Please try again.",
  removeFailed: "We couldn't remove that member. Please try again.",
  notFound: "We couldn't find that event.",
  memberNotFound: "That member is no longer an active member of this organization.",
  cancelled: "This event is cancelled, so its attendance can't be changed.",
  notPermitted: "You don't have permission to change attendance for this organization.",
  removePrompt: (name: string) => `Remove ${name} from the attendance list?`,
} as const;

/** Newest first, then by member so the order never flickers between polls */
function compareRecords(a: AttendanceRecord, b: AttendanceRecord): number {
  const byTime = Date.parse(b.checkedInAt) - Date.parse(a.checkedInAt);
  if (Number.isFinite(byTime) && byTime !== 0) return byTime;
  return a.memberId < b.memberId ? -1 : a.memberId > b.memberId ? 1 : 0;
}

export function sortRecords(records: AttendanceRecord[]): AttendanceRecord[] {
  return [...records].sort(compareRecords);
}

export function isPresent(data: AttendanceData, memberId: string): boolean {
  return data.records.some((r) => r.memberId === memberId);
}

/** "23 of 85 present" */
export function presentLabel(present: number, active: number): string {
  return `${present} of ${active} present`;
}

/** Adds a record. A member already on the list is never added twice. */
export function addRecord(data: AttendanceData, record: AttendanceRecord): AttendanceData {
  if (isPresent(data, record.memberId)) return data;
  return { ...data, records: sortRecords([...data.records, record]) };
}

/** Takes back an optimistic add */
export function undoAdd(data: AttendanceData, memberId: string): AttendanceData {
  return removeRecord(data, memberId);
}

export function removeRecord(data: AttendanceData, memberId: string): AttendanceData {
  if (!isPresent(data, memberId)) return data;
  return { ...data, records: data.records.filter((r) => r.memberId !== memberId) };
}

/** Takes back an optimistic remove, putting the row back where it was */
export function undoRemove(
  data: AttendanceData,
  record: AttendanceRecord,
  index: number
): AttendanceData {
  if (isPresent(data, record.memberId)) return data;
  const records = [...data.records];
  records.splice(Math.min(Math.max(index, 0), records.length), 0, record);
  return { ...data, records };
}

/**
 * Applies a poll result. The server's list wins, except for members with a
 * change still in flight: those rows keep what the screen shows now, so a poll
 * that raced the change can't make a row flicker back.
 */
export function mergePolled(
  current: AttendanceData,
  polled: AttendanceData,
  pendingIds: ReadonlySet<string>
): AttendanceData {
  if (pendingIds.size === 0) {
    return { records: sortRecords(polled.records), activeCount: polled.activeCount };
  }
  const kept = polled.records.filter((r) => !pendingIds.has(r.memberId));
  const pending = current.records.filter((r) => pendingIds.has(r.memberId));
  return { records: sortRecords([...kept, ...pending]), activeCount: polled.activeCount };
}
