import "server-only";
import { allowRequest } from "@/src/lib/rate-limit";
import { getFeedbackAttemptsPerMinute } from "@/src/lib/config";

/**
 * Counts this attempt against the caller's device and says whether it may go
 * ahead. The limit is FEEDBACK_ATTEMPTS_PER_MINUTE (default 5). If the check
 * itself fails, the answer is no.
 */
export function allowFeedbackAttempt(): Promise<boolean> {
  return allowRequest("feedback", getFeedbackAttemptsPerMinute());
}
