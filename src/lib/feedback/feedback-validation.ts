/**
 * Rules for the in-app feedback message and the page it came from (T5). No
 * imports, so the dialog, the Server Action and the node:test tests share them.
 * The database enforces the same limits again (see the T5 migration).
 */

export const FEEDBACK_MAX = 2000;
const PAGE_MAX = 200;

export const FEEDBACK_MESSAGES = {
  empty: "Please write a message before sending.",
  tooLong: `Please keep your message to ${FEEDBACK_MAX} characters or fewer.`,
  throttled: "You're sending feedback too quickly. Please wait a minute and try again.",
  failed: "We couldn't send your feedback. Your message is still here, so you can try again.",
  notSignedIn: "Please sign in again to send feedback.",
  thanks: "Thanks! Your feedback was sent.",
} as const;

/**
 * Characters as a person counts them, so an emoji is one character here just as
 * the database counts it. String.length counts UTF-16 units and would call it two.
 */
export function countCharacters(text: string): number {
  return Array.from(text).length;
}

/** Spaces and line breaks at the ends go; line breaks inside the message stay */
export function cleanFeedback(raw: string): string {
  return raw.replace(/\r\n?/g, "\n").replace(/^[ \t\n]+|[ \t\n]+$/g, "");
}

export type FeedbackValidation =
  | { valid: true; message: string }
  | { valid: false; error: string };

export function validateFeedback(raw: unknown): FeedbackValidation {
  if (typeof raw !== "string") return { valid: false, error: FEEDBACK_MESSAGES.empty };

  const message = cleanFeedback(raw);
  if (message.length === 0) return { valid: false, error: FEEDBACK_MESSAGES.empty };
  if (countCharacters(message) > FEEDBACK_MAX) return { valid: false, error: FEEDBACK_MESSAGES.tooLong };

  return { valid: true, message };
}

const UUID_SEGMENT = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A long run of letters, digits, dashes and underscores looks like a token, not a page name */
function looksLikeToken(segment: string): boolean {
  return segment.length >= 24 && /^[A-Za-z0-9_-]+$/.test(segment);
}

/**
 * The page to save: a path only, with ids and tokens swapped for ":id", so the
 * inbox shows "/workspace/:id/dues" and a secret link never lands in the table.
 * Anything that is not a plain path becomes "/".
 */
export function sanitizePagePath(pathname: unknown): string {
  if (typeof pathname !== "string") return "/";

  const path = pathname.split(/[?#]/)[0].trim();
  if (!path.startsWith("/") || path.startsWith("//")) return "/";

  const segments = path.split("/").map((segment) => {
    if (UUID_SEGMENT.test(segment) || looksLikeToken(segment)) return ":id";
    return segment;
  });

  // Control characters and spaces never belong in a route
  const cleaned = segments.join("/").replace(/[^\x21-\x7e/]/g, "");
  const trimmed = cleaned.length > 1 ? cleaned.replace(/\/+$/, "") : cleaned;
  return (trimmed.length > PAGE_MAX ? trimmed.slice(0, PAGE_MAX) : trimmed) || "/";
}

/** The org id in a /workspace/:id/... path, or null. The database confirms the sender belongs to it. */
export function orgIdFromPath(pathname: unknown): string | null {
  if (typeof pathname !== "string") return null;

  const path = pathname.split(/[?#]/)[0];
  const match = /^\/workspace\/([^/]+)/.exec(path);
  if (!match || !UUID_SEGMENT.test(match[1])) return null;
  return match[1].toLowerCase();
}
