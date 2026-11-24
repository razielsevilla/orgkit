/**
 * Shapes and wording for the owner's feedback inbox (T5). No imports, so the
 * node:test unit tests can load this file directly.
 */

/** One row as get_feedback() returns it */
export interface FeedbackRow {
  id: string;
  created_at: string;
  message: string;
  page: string;
  org_id: string | null;
  org_name: string | null;
  officer_name: string | null;
  officer_email: string | null;
}

export interface FeedbackItem {
  id: string;
  createdAt: string;
  message: string;
  page: string;
  orgName: string | null;
  senderName: string;
  senderEmail: string;
}

export function toFeedbackItem(row: FeedbackRow): FeedbackItem {
  return {
    id: row.id,
    createdAt: row.created_at,
    message: row.message,
    page: row.page,
    orgName: row.org_name,
    senderName: row.officer_name?.trim() || "Unknown sender",
    senderEmail: row.officer_email ?? "",
  };
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const two = (n: number) => String(n).padStart(2, "0");

/**
 * "Nov 21, 2026, 14:05 UTC". Done by hand so the server and the tests print the
 * same text in any time zone. An unreadable date is shown as it came.
 */
export function formatFeedbackTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;

  return (
    `${MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}, ` +
    `${two(date.getUTCHours())}:${two(date.getUTCMinutes())} UTC`
  );
}
