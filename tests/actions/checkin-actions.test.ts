import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * submitCheckin is a public, signed-out write, like submitJoin. These tests pin
 * its order of checks: rate limit, email, token, then the database, and that
 * every way of not being checked in leaves nothing recorded.
 */

interface FakeState {
  headers: Record<string, string>;
  rateLimitResult: { data: unknown; error: { message: string } | null };
  checkinResult: { data: unknown; error: { message: string } | null };
  rpcCalls: { fn: string; args: Record<string, unknown> }[];
}

const state: FakeState = {
  headers: {},
  rateLimitResult: { data: true, error: null },
  checkinResult: { data: [{ result: "checked_in", first_name: "Ana" }], error: null },
  rpcCalls: [],
};

const fakeAdmin = {
  rpc: async (fn: string, args: Record<string, unknown>) => {
    state.rpcCalls.push({ fn, args });
    if (fn === "hit_join_rate_limit") return state.rateLimitResult;
    if (fn === "checkin_member") return state.checkinResult;
    return { data: null, error: null };
  },
};

vi.mock("@/src/lib/supabase/service-role", () => ({ createAdminClient: () => fakeAdmin }));
vi.mock("next/headers", () => ({ headers: async () => new Headers(state.headers) }));

const { submitCheckin } = await import("@/src/app/checkin/[token]/actions");
const { signCheckinToken, slotFor } = await import("@/src/lib/checkin/token");
const { CHECKIN_COPY } = await import("@/src/lib/checkin/checkin-copy");

const SECRET = "checkin-action-test-secret";
const EVENT = "33333333-3333-4333-8333-333333333333";
const idle = { status: "idle" as const };

const freshToken = () => signCheckinToken(EVENT, slotFor(Date.now()), SECRET);

function form(overrides: Record<string, string | null> = {}) {
  const fields: Record<string, string | null> = {
    email: "ana@school.edu",
    language: "en",
    ...overrides,
  };
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    if (value !== null) data.set(key, value);
  }
  return data;
}

const checkinCalls = () => state.rpcCalls.filter((c) => c.fn === "checkin_member");
const limitKeys = () =>
  state.rpcCalls.filter((c) => c.fn === "hit_join_rate_limit").map((c) => c.args.p_key);

beforeEach(() => {
  vi.stubEnv("CHECKIN_TOKEN_SECRET", SECRET);
  state.headers = { "x-forwarded-for": "203.0.113.7, 10.0.0.1" };
  state.rateLimitResult = { data: true, error: null };
  state.checkinResult = { data: [{ result: "checked_in", first_name: "Ana" }], error: null };
  state.rpcCalls = [];
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("submitCheckin", () => {
  it("checks the member in and returns only the first name", async () => {
    const res = await submitCheckin(freshToken(), idle, form());

    expect(res).toEqual({ status: "success", firstName: "Ana" });
    expect(checkinCalls()).toEqual([
      { fn: "checkin_member", args: { p_event: EVENT, p_email: "ana@school.edu" } },
    ]);
  });

  it("says already checked in, with no second record asked for", async () => {
    state.checkinResult = { data: [{ result: "already", first_name: "Ana" }], error: null };
    const res = await submitCheckin(freshToken(), idle, form());
    expect(res).toEqual({ status: "already", firstName: "Ana" });
  });

  it("answers an unknown, pending, inactive or other-org email with one identical failure", async () => {
    state.checkinResult = { data: [{ result: "not_found", first_name: null }], error: null };
    const res = await submitCheckin(freshToken(), idle, form({ email: "nobody@school.edu" }));

    expect(res).toEqual({ status: "failed", formError: CHECKIN_COPY.en.failed });
    // Nothing in the answer says why
    expect(JSON.stringify(res)).not.toMatch(/pending|inactive|unknown|roster/i);
  });

  it("words the failure in Filipino when asked", async () => {
    state.checkinResult = { data: [{ result: "not_found", first_name: null }], error: null };
    const res = await submitCheckin(freshToken(), idle, form({ language: "fil" }));
    expect(res.formError).toBe(CHECKIN_COPY.fil.failed);
  });

  it("treats a closed window or cancelled event as expired", async () => {
    state.checkinResult = { data: [{ result: "closed", first_name: null }], error: null };
    expect((await submitCheckin(freshToken(), idle, form())).status).toBe("expired");
  });

  it("refuses an expired, tampered or garbage token before touching the database", async () => {
    const old = signCheckinToken(EVENT, slotFor(Date.now() - 5 * 60_000), SECRET);
    const tampered = signCheckinToken(EVENT, slotFor(Date.now()), "another-secret");

    for (const token of [old, tampered, "garbage", ""]) {
      expect((await submitCheckin(token, idle, form())).status).toBe("expired");
    }
    expect(checkinCalls()).toEqual([]);
  });

  it("asks for a valid email without recording anything", async () => {
    const res = await submitCheckin(freshToken(), idle, form({ email: "not-an-email" }));
    expect(res).toEqual({ status: "error", emailError: CHECKIN_COPY.en.emailInvalid });
    expect(checkinCalls()).toEqual([]);
  });

  it("slows down a device that is over the limit and records nothing", async () => {
    state.rateLimitResult = { data: false, error: null };
    const res = await submitCheckin(freshToken(), idle, form());

    expect(res).toEqual({ status: "throttled", formError: CHECKIN_COPY.en.tooMany });
    expect(checkinCalls()).toEqual([]);
  });

  it("fails closed when the rate limiter itself fails", async () => {
    state.rateLimitResult = { data: null, error: { message: "boom" } };
    const res = await submitCheckin(freshToken(), idle, form());
    expect(res.status).toBe("throttled");
    expect(checkinCalls()).toEqual([]);
  });

  it("counts attempts against a hashed key, never the raw IP", async () => {
    await submitCheckin(freshToken(), idle, form());
    const [key] = limitKeys();
    expect(key).toMatch(/^[0-9a-f]{64}$/);
    expect(String(key)).not.toContain("203.0.113.7");
  });

  it("shows a save error, not the database message, when the call fails", async () => {
    state.checkinResult = { data: null, error: { message: "relation attendance is broken" } };
    const res = await submitCheckin(freshToken(), idle, form());

    expect(res).toEqual({ status: "error", formError: CHECKIN_COPY.en.saveFailed });
    expect(JSON.stringify(res)).not.toContain("attendance");
  });

  it("shows a save error for an unexpected answer", async () => {
    state.checkinResult = { data: [{ result: "???", first_name: null }], error: null };
    expect((await submitCheckin(freshToken(), idle, form())).status).toBe("error");
  });

  it("shows a save error, without crashing, when the signing secret is missing", async () => {
    vi.stubEnv("CHECKIN_TOKEN_SECRET", "");
    const res = await submitCheckin(freshToken(), idle, form());
    expect(res).toEqual({ status: "error", formError: CHECKIN_COPY.en.saveFailed });
    expect(checkinCalls()).toEqual([]);
  });
});
