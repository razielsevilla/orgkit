import { afterEach, describe, expect, it, vi } from "vitest";
import { findErrorRule, rpcFailure, type ErrorRule } from "@/src/lib/rpc-errors";

type Code = "not_found" | "payment_gone" | "denied";

const GENERIC: ErrorRule<Code> = { match: "not_found", error: "not_found", message: "Generic not found." };
const SPECIFIC: ErrorRule<Code> = {
  match: "payment_not_found",
  error: "payment_gone",
  message: "Payment not found.",
};
const DENIED: ErrorRule<Code> = { match: "not_authorized", error: "denied", message: "Not allowed." };

afterEach(() => {
  vi.restoreAllMocks();
});

describe("findErrorRule: the order of the table does not decide", () => {
  it("picks the more specific rule even when the generic one is listed first", () => {
    // On the old first-match rule this returned the generic rule's message
    expect(findErrorRule("payment_not_found", [GENERIC, SPECIFIC])?.message).toBe("Payment not found.");
    expect(findErrorRule("payment_not_found", [SPECIFIC, GENERIC])?.message).toBe("Payment not found.");
  });

  it("gives the same answer for every ordering of the table", () => {
    const orderings = [
      [GENERIC, SPECIFIC, DENIED],
      [GENERIC, DENIED, SPECIFIC],
      [SPECIFIC, GENERIC, DENIED],
      [SPECIFIC, DENIED, GENERIC],
      [DENIED, GENERIC, SPECIFIC],
      [DENIED, SPECIFIC, GENERIC],
    ];
    for (const message of ["payment_not_found", "not_found", "not_authorized", "other"]) {
      const answers = orderings.map((table) => findErrorRule(message, table)?.error ?? null);
      expect(new Set(answers).size).toBe(1);
    }
  });

  it("on equal length, the earlier rule wins", () => {
    const a: ErrorRule<Code> = { match: "boom", error: "not_found", message: "first" };
    const b: ErrorRule<Code> = { match: "boom", error: "denied", message: "second" };
    expect(findErrorRule("boom", [a, b])?.message).toBe("first");
  });

  it("returns undefined when nothing matches", () => {
    expect(findErrorRule("something else", [GENERIC, SPECIFIC])).toBeUndefined();
    expect(findErrorRule("", [GENERIC])).toBeUndefined();
  });
});

describe("findErrorRule: exact rules", () => {
  const EXACT_GENERIC: ErrorRule<Code> = { ...GENERIC, exact: true };

  it("matches only a message that is exactly the code, ignoring surrounding spaces", () => {
    expect(findErrorRule("not_found", [EXACT_GENERIC])).toBe(EXACT_GENERIC);
    expect(findErrorRule("  not_found\n", [EXACT_GENERIC])).toBe(EXACT_GENERIC);
  });

  it("does not match a longer code that merely contains it", () => {
    // On the old matcher "member_not_found" got the generic message
    expect(findErrorRule("member_not_found", [EXACT_GENERIC])).toBeUndefined();
    expect(findErrorRule("payment_not_found", [EXACT_GENERIC])).toBeUndefined();
    expect(findErrorRule("error: not_found", [EXACT_GENERIC])).toBeUndefined();
  });

  it("an exact rule beats a substring rule that also matches", () => {
    const loose: ErrorRule<Code> = { match: "not_fou", error: "denied", message: "loose" };
    expect(findErrorRule("not_found", [loose, EXACT_GENERIC])).toBe(EXACT_GENERIC);
  });
});

describe("rpcFailure", () => {
  it("returns the matched rule's code and message without logging", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = rpcFailure(
      "verify_dues_payment",
      { message: "payment_not_found" },
      [GENERIC, SPECIFIC],
      "fallback"
    );
    expect(res).toEqual({ success: false, error: "payment_gone", errorMessage: "Payment not found." });
    expect(spy).not.toHaveBeenCalled();
  });

  it("logs an unmatched error and returns the generic failure with the fallback message", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = rpcFailure(
      "verify_dues_payment",
      { message: "relation dues_payments does not exist" },
      [GENERIC, SPECIFIC],
      "We couldn't do that."
    );
    expect(res).toEqual({ success: false, error: "failed", errorMessage: "We couldn't do that." });
    const entry = JSON.parse(String(spy.mock.calls[0][0]));
    expect(entry).toMatchObject({
      level: "error",
      event: "rpc.call_failed",
      context: { rpc: "verify_dues_payment" },
    });
  });

  it("adds the given log context to the entry for an unmatched error, and only then", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    rpcFailure("x", { message: "boom" }, [GENERIC], "fb", { orgId: "org-1", periodId: "period-1" });
    const entry = JSON.parse(String(spy.mock.calls[0][0]));
    expect(entry.context).toMatchObject({ rpc: "x", orgId: "org-1", periodId: "period-1", error: { message: "boom" } });

    // a matched error is not logged, so the context is not used
    spy.mockClear();
    rpcFailure("x", { message: "not_found" }, [GENERIC], "fb", { orgId: "org-1" });
    expect(spy).not.toHaveBeenCalled();
  });

  it("does not let the log context replace the rpc name or the error", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    rpcFailure("real_rpc", { message: "boom" }, [GENERIC], "fb", { rpc: "fake", error: "fake" });
    const entry = JSON.parse(String(spy.mock.calls[0][0]));
    expect(entry.context.rpc).toBe("real_rpc");
    expect(entry.context.error).toMatchObject({ message: "boom" });
  });

  it("works without a log context, as every existing call does", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    rpcFailure("x", { message: "boom" }, [GENERIC], "fb");
    expect(JSON.parse(String(spy.mock.calls[0][0])).context).toEqual({
      rpc: "x",
      error: { message: "boom" },
    });
  });

  it("treats a missing message as unmatched", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(rpcFailure("x", {}, [GENERIC], "fb").errorMessage).toBe("fb");
  });
});
