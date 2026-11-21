/**
 * Shapes and wording for the owner's weekly usage report (T3). No imports, so
 * the node:test unit tests can load this file directly.
 *
 * The numbers come from the database function get_usage_report(). Weeks run
 * Monday to Sunday in UTC, and dates arrive as "YYYY-MM-DD" text.
 */

export type UsageWeekStatus = "ready" | "failed" | "pending";

/** The database gives up on a failed week after this many attempts (run_weekly_usage_report) */
export const MAX_REPORT_ATTEMPTS = 5;

/** One row as the database returns it */
export interface UsageReportRow {
  week_start: string;
  week_end: string;
  status: string;
  orgs_total: number | null;
  orgs_active: number | null;
  orgs_inactive: number | null;
  events_created: number | null;
  check_ins: number | null;
  active_officers: number | null;
  attempts: number | null;
  error_message?: string | null;
  next_retry_at?: string | null;
}

export interface UsageWeek {
  weekStart: string;
  weekEnd: string;
  status: UsageWeekStatus;
  orgsActive: number;
  orgsInactive: number;
  eventsCreated: number;
  checkIns: number;
  activeOfficers: number;
  /** How many times the database has tried to produce a failed week */
  attempts: number;
}

function isStatus(value: string): value is UsageWeekStatus {
  return value === "ready" || value === "failed" || value === "pending";
}

/** A week with no snapshot has null counts: they become 0 and the status says why */
export function toUsageWeek(row: UsageReportRow): UsageWeek {
  return {
    weekStart: row.week_start,
    weekEnd: row.week_end,
    status: isStatus(row.status) ? row.status : "pending",
    orgsActive: row.orgs_active ?? 0,
    orgsInactive: row.orgs_inactive ?? 0,
    eventsCreated: row.events_created ?? 0,
    checkIns: row.check_ins ?? 0,
    activeOfficers: row.active_officers ?? 0,
    attempts: row.attempts ?? 0,
  };
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function parseDay(day: string): { year: number; month: number; date: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(day);
  if (!match) return null;
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;
  return { year: Number(match[1]), month, date: Number(match[3]) };
}

/**
 * "Nov 9 – 15, 2026", "Nov 30 – Dec 6, 2026" or, across a year end,
 * "Dec 28, 2026 – Jan 3, 2027". Done by hand (not Intl) so the server and the
 * tests always print the same text, in any time zone.
 */
export function formatWeekRange(weekStart: string, weekEnd: string): string {
  const start = parseDay(weekStart);
  const end = parseDay(weekEnd);
  if (!start || !end) return `${weekStart} – ${weekEnd}`;

  const startMonth = MONTHS[start.month - 1];
  const endMonth = MONTHS[end.month - 1];

  if (start.year !== end.year) {
    return `${startMonth} ${start.date}, ${start.year} – ${endMonth} ${end.date}, ${end.year}`;
  }
  if (start.month !== end.month) {
    return `${startMonth} ${start.date} – ${endMonth} ${end.date}, ${end.year}`;
  }
  return `${startMonth} ${start.date} – ${end.date}, ${end.year}`;
}

/** What to tell the owner about a week that has no numbers */
export function describeMissingWeek(week: UsageWeek): string {
  if (week.status === "failed") {
    if (week.attempts >= MAX_REPORT_ATTEMPTS) {
      return `Report failed after ${week.attempts} attempts. It will not retry on its own.`;
    }
    const tries = week.attempts === 1 ? "1 attempt" : `${week.attempts} attempts`;
    return `Report failed (${tries}). Retrying automatically.`;
  }
  return "No data yet";
}
