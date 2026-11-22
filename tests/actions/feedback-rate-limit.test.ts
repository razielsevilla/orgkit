import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Feedback uses the shared per-device limiter under its own "feedback" scope, so
 * a busy join or check-in does not use up an officer's feedback budget. The limit
 * is FEEDBACK_ATTEMPTS_PER_MINUTE (default 5).
 */

interface FakeState {
  result: { data: unknown; error: { message: string } | null };
  calls: { fn: string; args: Record<string, unknown> }[];
}

const state: FakeState = { result: { data: true, error: null }, calls: [] };

vi.mock("@/src/lib/supabase/service-role", () => ({
  createAdminClient: () => ({
    rpc: async (fn: string, args: Record<string, unknown>) => {
      state.calls.push({ fn, args });
      return state.result;
    },
  }),
}));
vi.mock("next/headers", () => ({ headers: async () => new Headers({ "x-forwarded-for": "203.0.113.7" }) }));

const { allowFeedbackAttempt } = await import("@/src/lib/feedback/feedback-server");
const { allowCheckinAttempt } = await import("@/src/lib/checkin/checkin-server");

beforeEach(() => {
  state.result = { data: true, error: null };
  state.calls = [];
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("allowFeedbackAttempt", () => {
  it("sends the default limit of 5 a minute", async () => {
    expect(await allowFeedbackAttempt()).toBe(true);
    expect(state.calls[0].fn).toBe("hit_join_rate_limit");
    expect(state.calls[0].args.p_limit).toBe(5);
  });

  it("uses FEEDBACK_ATTEMPTS_PER_MINUTE when it is a good number, and the default when it is not", async () => {
    vi.stubEnv("FEEDBACK_ATTEMPTS_PER_MINUTE", "12");
    await allowFeedbackAttempt();
    expect(state.calls[0].args.p_limit).toBe(12);

    for (const bad of ["", "0", "-3", "2.5", "lots"]) {
      vi.stubEnv("FEEDBACK_ATTEMPTS_PER_MINUTE", bad);
      await allowFeedbackAttempt();
      expect(state.calls.at(-1)!.args.p_limit, bad).toBe(5);
    }
  });

  it("refuses when the database says the device is over the limit, or when the check fails", async () => {
    state.result = { data: false, error: null };
    expect(await allowFeedbackAttempt()).toBe(false);

    state.result = { data: null, error: { message: "db down" } };
    expect(await allowFeedbackAttempt()).toBe(false);
  });

  it("keeps its own count, apart from other features on the same device", async () => {
    await allowFeedbackAttempt();
    await allowCheckinAttempt();

    const [feedbackKey, checkinKey] = state.calls.map((c) => c.args.p_key);
    expect(feedbackKey).toMatch(/^[0-9a-f]{64}$/);
    expect(feedbackKey).not.toBe(checkinKey);
    expect(JSON.stringify(state.calls)).not.toContain("203.0.113.7");
  });
});
