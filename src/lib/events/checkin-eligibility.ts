/**
 * When an event's check-in window can be opened. The database enforces the
 * same rule in set_event_checkin; this copy lets the screen explain why
 * instead of failing. Kept free of imports so node:test can load it directly.
 */

/** How long after an event ends an officer can still open check-in */
export const CHECKIN_GRACE_MS = 60 * 60 * 1000;

export type CheckinBlock = "cancelled" | "ended";

export const CHECKIN_MESSAGES = {
  cancelled: "This event is cancelled, so nobody can check in.",
  ended: "This event ended more than an hour ago, so check-in can't be opened.",
  closed: "Check-in is closed.",
  openFailed: "We couldn't open check-in. Please try again.",
  closeFailed: "We couldn't close check-in. Please try again.",
  tokenFailed: "We couldn't refresh the check-in code.",
  closePrompt: "Close check-in? Members won't be able to check in until you open it again.",
} as const;

interface CheckinEvent {
  status: string;
  endsAt: string;
}

/** Why check-in can't be opened for this event, or null if it can */
export function getCheckinBlock(event: CheckinEvent, now: number = Date.now()): CheckinBlock | null {
  if (event.status === "cancelled") return "cancelled";
  if (new Date(event.endsAt).getTime() < now - CHECKIN_GRACE_MS) return "ended";
  return null;
}
