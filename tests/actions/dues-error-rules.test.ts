import { afterEach, describe, expect, it, vi } from "vitest";
import { rpcFailure } from "@/src/lib/rpc-errors";
import { DUES_ERROR_RULES } from "@/src/app/(workspace)/dues-shared";

const FALLBACK = "fallback message";
const NOT_PERMITTED = "You are not permitted to manage dues for this organization.";

/** What each dues database function can raise, and what the officer should see */
const REAL_DATABASE_MESSAGES: { message: string; error: string; text: string }[] = [
  { message: "Dues period not found", error: "not_found", text: "Dues period not found." },
  { message: "period_not_found", error: "not_found", text: "Dues period not found." },
  { message: "not_found", error: "not_found", text: "Dues period not found." },
  { message: "payment_not_found", error: "not_found", text: "Payment submission not found." },
  { message: "not_authorized", error: "not_authorized", text: NOT_PERMITTED },
  {
    message: "Not permitted to close dues periods for this organization",
    error: "not_authorized",
    text: NOT_PERMITTED,
  },
  {
    message: "already_reviewed",
    error: "already_reviewed",
    text: "This payment has already been reviewed by another officer.",
  },
  {
    message: "cannot_review_own_payment",
    error: "cannot_review_own_payment",
    text: "You cannot review your own payment.",
  },
  {
    message: "admin_only",
    error: "admin_only",
    text: "Only organization admins can undo payment verifications.",
  },
  { message: "reason_required", error: "invalid_input", text: "A reason is required." },
  { message: "reason_too_long", error: "invalid_input", text: "Reason cannot exceed 500 characters." },
  { message: "Cannot edit closed dues period", error: "closed_period", text: "Closed dues periods cannot be edited." },
  {
    message: "period_closed",
    error: "closed_period",
    text: "Closed dues periods cannot accept payment links.",
  },
  { message: "invalid_action", error: "invalid_input", text: "Invalid action for payment link." },
  { message: "Due date is required", error: "invalid_input", text: "Due date is required." },
  {
    message: "Name must be between 2 and 100 characters",
    error: "invalid_input",
    text: "Name must be between 2 and 100 characters.",
  },
  {
    message: "Amount must be above 0 and at most 100,000 with up to 2 decimal places",
    error: "invalid_input",
    text: "Amount must be above ₱0 and at most ₱100,000 with up to 2 decimal places.",
  },
];

const resolve = (message: string, rules = DUES_ERROR_RULES) => {
  const res = rpcFailure("rpc", { message }, rules, FALLBACK);
  return { error: res.error, text: res.errorMessage };
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("DUES_ERROR_RULES", () => {
  it.each(REAL_DATABASE_MESSAGES)("maps the database message $message", ({ message, error, text }) => {
    expect(resolve(message)).toEqual({ error, text });
  });

  it("gives every real database message the same answer in any order of the table", () => {
    const reversed = [...DUES_ERROR_RULES].reverse();
    const rotated = [...DUES_ERROR_RULES.slice(5), ...DUES_ERROR_RULES.slice(0, 5)];
    for (const { message } of REAL_DATABASE_MESSAGES) {
      const expected = resolve(message);
      expect(resolve(message, reversed)).toEqual(expected);
      expect(resolve(message, rotated)).toEqual(expected);
    }
  });

  it("never lets the generic not_found message cover a payment, in any order", () => {
    expect(resolve("payment_not_found").text).toBe("Payment submission not found.");
    expect(resolve("payment_not_found", [...DUES_ERROR_RULES].reverse()).text).toBe(
      "Payment submission not found."
    );
  });

  it("does not call an unknown *_not_found code a missing dues period", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    // member_not_found comes from log_dues_reminder. The old generic substring rule
    // answered it with "Dues period not found.", which is wrong.
    expect(resolve("member_not_found")).toEqual({ error: "failed", text: FALLBACK });
    expect(resolve("something_else_not_found")).toEqual({ error: "failed", text: FALLBACK });
  });

  it("falls back for codes it has no rule for, and logs them", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    for (const message of ["not_authenticated", "invalid_status_transition", "relation x does not exist"]) {
      expect(rpcFailure("rpc", { message }, DUES_ERROR_RULES, FALLBACK)).toMatchObject({
        error: "failed",
        errorMessage: FALLBACK,
      });
    }
    expect(spy).toHaveBeenCalledTimes(3);
  });
});
