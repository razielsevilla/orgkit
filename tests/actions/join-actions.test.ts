import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * submitJoin is the one public, signed-out write in the app, so these tests pin
 * down its order of checks: rate limit, fields, consent, 18+, then the database.
 */

interface FakeState {
  headers: Record<string, string>;
  rateLimitResult: { data: unknown; error: { message: string } | null };
  joinResult: { data: unknown; error: { message: string } | null };
  rpcCalls: { fn: string; args: Record<string, unknown> }[];
}

const state: FakeState = {
  headers: {},
  rateLimitResult: { data: true, error: null },
  joinResult: { data: "ok", error: null },
  rpcCalls: [],
};

const fakeAdmin = {
  rpc: async (fn: string, args: Record<string, unknown>) => {
    state.rpcCalls.push({ fn, args });
    if (fn === "hit_join_rate_limit") return state.rateLimitResult;
    if (fn === "join_org") return state.joinResult;
    return { data: null, error: null };
  },
};

vi.mock("@/src/lib/supabase/service-role", () => ({ createAdminClient: () => fakeAdmin }));
vi.mock("next/headers", () => ({ headers: async () => new Headers(state.headers) }));

const { submitJoin } = await import("@/src/app/join/[token]/actions");
const { JOIN_MESSAGES } = await import("@/src/lib/members/member-join");
const { CURRENT_MEMBER_CONSENT } = await import("@/src/lib/members/member-consent");

const TOKEN = "a".repeat(64);

function form(overrides: Record<string, string | null> = {}) {
  const fields: Record<string, string | null> = {
    fullName: "  Ana   Reyes ",
    email: "ana@school.edu",
    language: "en",
    consentVersion: CURRENT_MEMBER_CONSENT.version,
    agree: "on",
    adult: "on",
    ...overrides,
  };
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    if (value !== null) data.set(key, value);
  }
  return data;
}

const idle = { status: "idle" as const };
const joinCalls = () => state.rpcCalls.filter((c) => c.fn === "join_org");
const limitKeys = () =>
  state.rpcCalls.filter((c) => c.fn === "hit_join_rate_limit").map((c) => c.args.p_key);

beforeEach(() => {
  state.headers = { "x-forwarded-for": "203.0.113.7, 10.0.0.1" };
  state.rateLimitResult = { data: true, error: null };
  state.joinResult = { data: "ok", error: null };
  state.rpcCalls = [];
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("submitJoin", () => {
  it("saves a cleaned name and the consent version the student saw", async () => {
    const res = await submitJoin(TOKEN, idle, form({ language: "fil" }));

    expect(res).toEqual({ status: "success" });
    expect(joinCalls()).toEqual([
      {
        fn: "join_org",
        args: {
          p_token: TOKEN,
          p_name: "Ana Reyes",
          p_email: "ana@school.edu",
          p_language: "fil",
          p_consent_version: CURRENT_MEMBER_CONSENT.version,
        },
      },
    ]);
  });

  it("treats any unknown language as English", async () => {
    await submitJoin(TOKEN, idle, form({ language: "xx" }));
    expect(joinCalls()[0].args.p_language).toBe("en");
  });

  it("refuses an over-limit device before saving anything", async () => {
    state.rateLimitResult = { data: false, error: null };
    const res = await submitJoin(TOKEN, idle, form());

    expect(res).toEqual({ status: "error", formError: JOIN_MESSAGES.tooMany });
    expect(joinCalls()).toHaveLength(0);
  });

  it("fails closed when the rate limit check itself breaks", async () => {
    state.rateLimitResult = { data: null, error: { message: "boom" } };
    const res = await submitJoin(TOKEN, idle, form());

    expect(res).toEqual({ status: "error", formError: JOIN_MESSAGES.tooMany });
    expect(joinCalls()).toHaveLength(0);
  });

  it("counts attempts against a hashed device key, never the raw IP", async () => {
    await submitJoin(TOKEN, idle, form());
    const hit = state.rpcCalls.find((c) => c.fn === "hit_join_rate_limit")!;

    expect(hit.args.p_key).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(hit.args)).not.toContain("203.0.113.7");
    expect(typeof hit.args.p_limit).toBe("number");
  });

  it("gives the same device the same key and a different device another", async () => {
    await submitJoin(TOKEN, idle, form());
    await submitJoin(TOKEN, idle, form());
    state.headers = { "x-forwarded-for": "198.51.100.9" };
    await submitJoin(TOKEN, idle, form());

    const keys = limitKeys();
    expect(keys[0]).toBe(keys[1]);
    expect(keys[2]).not.toBe(keys[0]);
  });

  it("falls back to x-real-ip, then to a shared unknown device", async () => {
    state.headers = { "x-real-ip": "192.0.2.5" };
    await submitJoin(TOKEN, idle, form());
    state.headers = {};
    await submitJoin(TOKEN, idle, form());

    const keys = limitKeys();
    expect(keys[0]).not.toBe(keys[1]);
  });

  it("returns a message under each bad field without saving", async () => {
    const res = await submitJoin(TOKEN, idle, form({ fullName: "A", email: "nope" }));

    expect(res).toEqual({
      status: "error",
      nameError: JOIN_MESSAGES.nameInvalid,
      emailError: JOIN_MESSAGES.emailInvalid,
    });
    expect(joinCalls()).toHaveLength(0);
  });

  it("asks for a reload when the consent wording has changed", async () => {
    const res = await submitJoin(TOKEN, idle, form({ consentVersion: "member-consent-v0" }));
    expect(res).toEqual({ status: "error", formError: JOIN_MESSAGES.pageUpdated });
    expect(joinCalls()).toHaveLength(0);
  });

  it("requires the agreement box", async () => {
    const res = await submitJoin(TOKEN, idle, form({ agree: null }));
    expect(res).toEqual({ status: "error", formError: JOIN_MESSAGES.consentMissing });
    expect(joinCalls()).toHaveLength(0);
  });

  it("requires the 18+ box", async () => {
    const res = await submitJoin(TOKEN, idle, form({ adult: null }));
    expect(res).toEqual({ status: "error", formError: JOIN_MESSAGES.underAge });
    expect(joinCalls()).toHaveLength(0);
  });

  it("treats a malformed token as an inactive link without calling join_org", async () => {
    const res = await submitJoin("not-a-token", idle, form());
    expect(res).toEqual({ status: "inactive" });
    expect(joinCalls()).toHaveLength(0);
  });

  it("reports an inactive link when the database says so", async () => {
    state.joinResult = { data: "inactive", error: null };
    expect(await submitJoin(TOKEN, idle, form())).toEqual({ status: "inactive" });
  });

  it("shows a save error for a database error or an unexpected answer", async () => {
    state.joinResult = { data: null, error: { message: "boom" } };
    expect(await submitJoin(TOKEN, idle, form())).toEqual({
      status: "error",
      formError: JOIN_MESSAGES.saveFailed,
    });

    state.joinResult = { data: "something-else", error: null };
    expect(await submitJoin(TOKEN, idle, form())).toEqual({
      status: "error",
      formError: JOIN_MESSAGES.saveFailed,
    });
  });
});
