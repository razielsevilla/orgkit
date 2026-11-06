import { fail, type ActionResult } from "@/src/lib/action-result";

/**
 * One way a database function can refuse: the word its RAISE EXCEPTION puts in
 * the error message, and what to tell the user. Keeping these in a table next
 * to the action means the codes the database raises are listed in one place.
 */
export interface ErrorRule<E extends string> {
  match: string;
  error: E;
  message: string;
}

/**
 * Turns an RPC error into a failed result. The first rule whose word appears in
 * the database message wins; anything else is logged and shown as a generic
 * failure, so internal details never reach the browser.
 */
export function rpcFailure<E extends string>(
  rpc: string,
  error: { message?: string },
  rules: readonly ErrorRule<E>[],
  fallbackMessage: string
): ActionResult<never, E | "failed"> {
  const message = error.message ?? "";
  const rule = rules.find((r) => message.includes(r.match));
  if (rule) return fail(rule.error, rule.message);

  console.error(`Error calling ${rpc} RPC:`, error);
  return fail("failed", fallbackMessage);
}
