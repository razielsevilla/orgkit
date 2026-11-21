import { fail, type ActionResult } from "@/src/lib/action-result";
import { logger } from "@/src/lib/logger";

/**
 * One way a database function can refuse: the word its RAISE EXCEPTION puts in
 * the error message, and what to tell the user. Keeping these in a table next
 * to the action means the codes the database raises are listed in one place.
 */
export interface ErrorRule<E extends string> {
  match: string;
  error: E;
  message: string;
  /**
   * Match only when the whole database message is exactly `match` (ignoring
   * surrounding spaces), not when it merely contains it. Use this for a generic
   * code such as "not_found" that is also a piece of longer codes
   * ("payment_not_found", "member_not_found").
   */
  exact?: boolean;
}

/**
 * Picks the rule for a database message, so that the order of the table never
 * decides the answer:
 *  1. A rule with `exact: true` whose `match` is the whole message wins.
 *  2. Otherwise, of the other rules whose `match` appears in the message, the one
 *     with the longest `match` wins (the most specific). On a tie the earlier rule wins.
 * A message nothing matches returns undefined.
 */
export function findErrorRule<E extends string>(
  message: string,
  rules: readonly ErrorRule<E>[]
): ErrorRule<E> | undefined {
  const trimmed = message.trim();
  const exact = rules.find((r) => r.exact && r.match === trimmed);
  if (exact) return exact;

  let best: ErrorRule<E> | undefined;
  for (const rule of rules) {
    if (rule.exact || !message.includes(rule.match)) continue;
    if (!best || rule.match.length > best.match.length) best = rule;
  }
  return best;
}

/**
 * Turns an RPC error into a failed result using `findErrorRule`; anything no
 * rule covers is logged and shown as a generic failure, so internal details
 * never reach the browser.
 *
 * `logContext` is added to that log entry. Use it for IDs that have already been
 * validated (an org or period ID), never for names, emails, tokens or free text.
 */
export function rpcFailure<E extends string>(
  rpc: string,
  error: { message?: string },
  rules: readonly ErrorRule<E>[],
  fallbackMessage: string,
  logContext?: Record<string, string>
): ActionResult<never, E | "failed"> {
  const rule = findErrorRule(error.message ?? "", rules);
  if (rule) return fail(rule.error, rule.message);

  logger.error("rpc.call_failed", { ...logContext, rpc, error });
  return fail("failed", fallbackMessage);
}
