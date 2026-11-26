/**
 * Dates for the tour's example data, all relative to today, so "due in 10 days"
 * is always true whenever the tour is opened.
 */

const DAY = 24 * 60 * 60 * 1000;

/** An ISO timestamp `days` from now (negative is the past) */
export const isoDaysFromNow = (days: number): string => new Date(Date.now() + days * DAY).toISOString();

/** A YYYY-MM-DD date `days` from now */
export const dateDaysFromNow = (days: number): string => isoDaysFromNow(days).slice(0, 10);

/** An ISO timestamp for a given local hour (and minute) on the day `days` from now */
export function isoAt(days: number, hour: number, minute = 0): string {
  const d = new Date(Date.now() + days * DAY);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}
