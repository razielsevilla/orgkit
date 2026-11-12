/**
 * Event rules shared by the dialog (to show inline messages) and the server
 * action (to refuse bad input). The database enforces the same rules.
 * Kept free of imports so the node:test unit tests can load it directly.
 */

export const EVENT_TITLE_MIN = 2;
export const EVENT_TITLE_MAX = 100;
export const EVENT_LOCATION_MAX = 200;

export type EventStatus = "scheduled" | "cancelled";

export const EVENT_MESSAGES = {
  titleInvalid: `Enter a title between ${EVENT_TITLE_MIN} and ${EVENT_TITLE_MAX} characters.`,
  startInvalid: "Choose a start date and time.",
  endInvalid: "Choose an end date and time.",
  endBeforeStart: "The end must be after the start.",
  locationInvalid: `Location can be at most ${EVENT_LOCATION_MAX} characters.`,
  saveFailed: "We couldn't save this event. Please try again.",
  cancelFailed: "We couldn't cancel this event. Please try again.",
  loadFailed: "We couldn't load your events. Try again.",
  notFound: "We couldn't find that event.",
  notPermitted: "You don't have permission to change events for this organization.",
  alreadyCancelled: "This event is cancelled, so it can't be edited.",
  cancelPrompt: (title: string) =>
    `Cancel ${title}? It will stay in the list marked Cancelled, and nobody will be able to check in.`,
} as const;

export const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  scheduled: "Scheduled",
  cancelled: "Cancelled",
};

export function isEventStatus(value: unknown): value is EventStatus {
  return value === "scheduled" || value === "cancelled";
}

export interface EventInput {
  title: string;
  /** ISO 8601 instant */
  startsAt: string;
  /** ISO 8601 instant */
  endsAt: string;
  location?: string | null;
}

export type EventField = "title" | "startsAt" | "endsAt" | "location";

export type EventValidationResult =
  | {
      valid: true;
      title: string;
      startsAt: string;
      endsAt: string;
      location: string | null;
    }
  | { valid: false; field: EventField; error: string };

/** Trim and collapse runs of whitespace, as the database does */
export function cleanText(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function toTime(value: string | null | undefined): number {
  if (typeof value !== "string" || value.trim() === "") return Number.NaN;
  return new Date(value).getTime();
}

/**
 * Title 2 to 100 characters, a valid start, an end after the start, and an
 * optional location. Returns the first problem, with the field it belongs to.
 */
export function validateEvent(input: EventInput): EventValidationResult {
  const title = cleanText(input.title);
  if (title.length < EVENT_TITLE_MIN || title.length > EVENT_TITLE_MAX) {
    return { valid: false, field: "title", error: EVENT_MESSAGES.titleInvalid };
  }

  const start = toTime(input.startsAt);
  if (Number.isNaN(start)) {
    return { valid: false, field: "startsAt", error: EVENT_MESSAGES.startInvalid };
  }

  const end = toTime(input.endsAt);
  if (Number.isNaN(end)) {
    return { valid: false, field: "endsAt", error: EVENT_MESSAGES.endInvalid };
  }
  if (end <= start) {
    return { valid: false, field: "endsAt", error: EVENT_MESSAGES.endBeforeStart };
  }

  const location = cleanText(input.location);
  if (location.length > EVENT_LOCATION_MAX) {
    return { valid: false, field: "location", error: EVENT_MESSAGES.locationInvalid };
  }

  return {
    valid: true,
    title,
    startsAt: new Date(start).toISOString(),
    endsAt: new Date(end).toISOString(),
    location: location === "" ? null : location,
  };
}

interface Sortable {
  startsAt: string;
  endsAt: string;
}

/**
 * Upcoming events first (soonest first), then past events (most recent first).
 * An event that is still running counts as upcoming. Cancelled events sit
 * where their time puts them; the list marks them.
 */
export function sortEvents<T extends Sortable>(events: readonly T[], now: number = Date.now()): T[] {
  const upcoming: T[] = [];
  const past: T[] = [];
  for (const event of events) {
    (new Date(event.endsAt).getTime() >= now ? upcoming : past).push(event);
  }
  const byStart = (a: T, b: T) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime();
  upcoming.sort(byStart);
  past.sort((a, b) => byStart(b, a));
  return [...upcoming, ...past];
}

/** True once the event has ended */
export function isPastEvent(event: Sortable, now: number = Date.now()): boolean {
  return new Date(event.endsAt).getTime() < now;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** An ISO instant as the local `YYYY-MM-DDTHH:mm` a datetime-local input wants */
export function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** A datetime-local value (read in the viewer's zone) as an ISO instant, or "" if empty or invalid */
export function fromDatetimeLocal(value: string): string {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}
