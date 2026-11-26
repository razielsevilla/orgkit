/**
 * Date text for the org health dashboard. Dates come from the database already
 * resolved to Manila, so a plain date (YYYY-MM-DD) is formatted as written and
 * never shifted by the server's or browser's time zone.
 */

const TZ = "Asia/Manila";

/** "Dec 21" from a YYYY-MM-DD date, or an empty string when it cannot be read */
export function formatShortDate(date: string | null | undefined): string {
  if (!date) return "";
  const parsed = new Date(`${date.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(parsed);
}

/** "Fri, Dec 4, 4:00 PM" for a moment in time, in Manila */
export function formatEventStart(timestamp: string | null | undefined): string {
  if (!timestamp) return "";
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: TZ,
  }).format(parsed);
}

/** "10:42 AM" for the "Updated" line, in Manila */
export function formatClock(timestamp: string | null | undefined): string {
  if (!timestamp) return "";
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: TZ }).format(parsed);
}
