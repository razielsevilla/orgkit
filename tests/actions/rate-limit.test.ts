import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The limiter keeps its counts in the database, so these tests check what it
 * sends there: a hashed, per-feature, per-device key and the limit, and that a
 * broken check refuses the request instead of letting it through.
 */

interface FakeState {
  headers: Record<string, string>;
  result: { data: unknown; error: { message: string } | null };
  calls: { fn: string; args: Record<string, unknown> }[];
}

const state: FakeState = { headers: {}, result: { data: true, error: null }, calls: [] };

const fakeAdmin = {
  rpc: async (fn: string, args: Record<string, unknown>) => {
    state.calls.push({ fn, args });
    return state.result;
  },
};

vi.mock("@/src/lib/supabase/service-role", () => ({ createAdminClient: () => fakeAdmin }));
vi.mock("next/headers", () => ({ headers: async () => new Headers(state.headers) }));

const { allowRequest } = await import("@/src/lib/rate-limit");
const { getClientIp } = await import("@/src/lib/request");

beforeEach(() => {
  state.headers = { "x-forwarded-for": "203.0.113.7, 10.0.0.1" };
  state.result = { data: true, error: null };
  state.calls = [];
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("allowRequest", () => {
  it("allows a request the database counts as under the limit", async () => {
    expect(await allowRequest("invite", 20)).toBe(true);
    expect(state.calls).toHaveLength(1);
    expect(state.calls[0].fn).toBe("hit_join_rate_limit");
    expect(state.calls[0].args.p_limit).toBe(20);
  });

  it("refuses a request the database counts as over the limit", async () => {
    state.result = { data: false, error: null };
    expect(await allowRequest("invite", 20)).toBe(false);
  });

  it("refuses when the check itself fails", async () => {
    state.result = { data: null, error: { message: "db down" } };
    expect(await allowRequest("invite", 20)).toBe(false);
  });

  it("refuses anything that is not an explicit yes", async () => {
    state.result = { data: "true", error: null };
    expect(await allowRequest("invite", 20)).toBe(false);
  });

  it("stores a hashed key that never contains the IP", async () => {
    await allowRequest("invite", 20);
    const key = state.calls[0].args.p_key as string;

    expect(key).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(state.calls[0])).not.toContain("203.0.113.7");
  });

  it("counts the same device separately for each feature", async () => {
    await allowRequest("invite", 20);
    await allowRequest("join", 10);
    await allowRequest("invite", 20);

    const [invite1, join, invite2] = state.calls.map((c) => c.args.p_key);
    expect(invite1).toBe(invite2);
    expect(join).not.toBe(invite1);
  });

  it("counts different devices separately", async () => {
    await allowRequest("invite", 20);
    state.headers = { "x-forwarded-for": "198.51.100.9" };
    await allowRequest("invite", 20);

    expect(state.calls[0].args.p_key).not.toBe(state.calls[1].args.p_key);
  });
});

describe("getClientIp", () => {
  it("uses the first forwarded address, then x-real-ip, then unknown", async () => {
    state.headers = { "x-forwarded-for": " 203.0.113.7 , 10.0.0.1", "x-real-ip": "192.0.2.5" };
    expect(await getClientIp()).toBe("203.0.113.7");

    state.headers = { "x-real-ip": "192.0.2.5" };
    expect(await getClientIp()).toBe("192.0.2.5");

    state.headers = {};
    expect(await getClientIp()).toBe("unknown");
  });
});
