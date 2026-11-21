import "server-only";
import { notFound } from "next/navigation";
import { logger } from "@/src/lib/logger";
import { getSessionUser } from "@/src/lib/auth/session-user";
import { toFeedbackItem, type FeedbackItem, type FeedbackRow } from "@/src/lib/owner/feedback-report";

export type FeedbackInboxResult = { ok: true; items: FeedbackItem[] } | { ok: false };

/** How many messages the inbox shows, newest first */
const INBOX_LIMIT = 100;

/**
 * The feedback inbox, through the signed-in user's own session. The database
 * function refuses anyone who is not the owner, so this is a second lock behind
 * requireOwner(): a "not_authorized" answer is a 404.
 */
export async function getFeedbackInbox(): Promise<FeedbackInboxResult> {
  const { supabase } = await getSessionUser();

  const { data, error } = await supabase.rpc("get_feedback", { p_limit: INBOX_LIMIT });

  if (error) {
    if (error.message.includes("not_authorized") || error.message.includes("not_authenticated")) {
      notFound();
    }
    // The error code only: a failed read must not copy anyone's message into a log
    logger.error("owner_feedback.load_failed", { code: error.code });
    return { ok: false };
  }

  const rows = (data ?? []) as FeedbackRow[];
  return { ok: true, items: rows.map(toFeedbackItem) };
}
