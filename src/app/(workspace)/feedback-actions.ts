"use server";

import { fail, ok, type ActionResult } from "@/src/lib/action-result";
import { logger } from "@/src/lib/logger";
import { getSessionUser } from "@/src/lib/auth/session-user";
import { getOfficerRow } from "@/src/lib/auth/officer-profile";
import { createAdminClient } from "@/src/lib/supabase/service-role";
import { allowFeedbackAttempt } from "@/src/lib/feedback/feedback-server";
import {
  FEEDBACK_MESSAGES,
  orgIdFromPath,
  sanitizePagePath,
  validateFeedback,
} from "@/src/lib/feedback/feedback-validation";

export type FeedbackError =
  | "not_authenticated"
  | "not_authorized"
  | "invalid_request"
  | "throttled"
  | "failed";

export interface FeedbackInput {
  message: string;
  /** The page the officer is on, from the browser. Only its path is kept. */
  pathname: string;
}

/**
 * Saves a signed-in officer's feedback with the page they were on.
 *
 * Order: who is asking, the per-device rate limit, the message rules, then the
 * save. The save goes through a service-role-only database function, so the
 * browser cannot write feedback any other way (and so cannot skip the limit).
 *
 * Logs carry an error code only: the message is personal data and must never
 * appear in a log line, and a database error can repeat the row it rejected.
 */
export async function submitFeedbackAction(input: FeedbackInput): Promise<ActionResult<never, FeedbackError>> {
  try {
    const { user } = await getSessionUser();
    if (!user) return fail("not_authenticated", FEEDBACK_MESSAGES.notSignedIn);

    // Same gate as every workspace page: the officer must have agreed to the privacy notice
    const officer = await getOfficerRow(user.id);
    if (!officer) return fail("not_authorized", FEEDBACK_MESSAGES.notSignedIn);

    if (!(await allowFeedbackAttempt())) return fail("throttled", FEEDBACK_MESSAGES.throttled);

    const validation = validateFeedback(input?.message);
    if (!validation.valid) return fail("invalid_request", validation.error);

    const { error } = await createAdminClient().rpc("submit_feedback", {
      p_officer_id: user.id,
      p_org_id: orgIdFromPath(input?.pathname),
      p_message: validation.message,
      p_page: sanitizePagePath(input?.pathname),
    });

    if (error) {
      if (error.message.includes("rate_limited")) return fail("throttled", FEEDBACK_MESSAGES.throttled);
      logger.error("feedback.submit_failed", { code: error.code });
      return fail("failed", FEEDBACK_MESSAGES.failed);
    }

    return ok();
  } catch (err) {
    logger.error("feedback.submit_unexpected", { errorName: err instanceof Error ? err.name : "unknown" });
    return fail("failed", FEEDBACK_MESSAGES.failed);
  }
}
