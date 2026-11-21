import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
const { allowJoinAttempt } = await import("@/src/lib/members/member-join-server");
const { allowCheckinAttempt } = await import("@/src/lib/checkin/checkin-server");
const { allowPayAttempt } = await import("@/src/lib/dues/dues-pay-server");

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

describe("the hashing secret", () => {
  const keyFor = async () => {
    state.calls = [];
    await allowRequest("invite", 20);
    return state.calls[0]?.args.p_key as string | undefined;
  };

  beforeEach(() => {
    vi.stubEnv("JOIN_RATE_LIMIT_SECRET", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses JOIN_RATE_LIMIT_SECRET when set", async () => {
    vi.stubEnv("JOIN_RATE_LIMIT_SECRET", "secret-one");
    const one = await keyFor();
    vi.stubEnv("JOIN_RATE_LIMIT_SECRET", "secret-two");
    const two = await keyFor();
    expect(one).toMatch(/^[0-9a-f]{64}$/);
    expect(one).not.toBe(two);
  });

  it("falls back to the service role key, as documented", async () => {
    vi.stubEnv("JOIN_RATE_LIMIT_SECRET", "same-value");
    const explicit = await keyFor();
    vi.stubEnv("JOIN_RATE_LIMIT_SECRET", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "same-value");
    expect(await keyFor()).toBe(explicit);
  });

  it("in production with no secret at all, refuses the request and logs why, without calling the database", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(await allowRequest("invite", 20)).toBe(false);

    expect(state.calls).toHaveLength(0);
    // The user only sees "too many attempts", so the log has to say why: at error
    // level, naming the missing variable
    expect(errorSpy).toHaveBeenCalledTimes(1);
    const entry = JSON.parse(String(errorSpy.mock.calls[0][0]));
    expect(entry.level).toBe("error");
    expect(entry.event).toBe("rate_limit.secret_missing");
    expect(entry.context.variable).toBe("JOIN_RATE_LIMIT_SECRET");
    expect(entry.context.scope).toBe("invite");
  });

  it("outside production with no secret, uses a development value instead of an empty one", async () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(await allowRequest("invite", 20)).toBe(true);
    expect(state.calls[0].args.p_key).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("limits come from the environment", () => {
  const limitFrom = async (attempt: () => Promise<boolean>) => {
    state.calls = [];
    await attempt();
    return state.calls[0].args.p_limit;
  };

  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "development");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("keeps today's defaults when nothing is set", async () => {
    vi.stubEnv("JOIN_ATTEMPTS_PER_MINUTE", "");
    vi.stubEnv("CHECKIN_ATTEMPTS_PER_MINUTE", "");
    vi.stubEnv("DUES_PAY_ATTEMPTS_PER_MINUTE", "");
    expect(await limitFrom(allowJoinAttempt)).toBe(30);
    expect(await limitFrom(allowCheckinAttempt)).toBe(30);
    expect(await limitFrom(allowPayAttempt)).toBe(30);
  });

  it("reads each limit when the attempt is checked, not when the module loads", async () => {
    vi.stubEnv("JOIN_ATTEMPTS_PER_MINUTE", "7");
    vi.stubEnv("CHECKIN_ATTEMPTS_PER_MINUTE", "8");
    vi.stubEnv("DUES_PAY_ATTEMPTS_PER_MINUTE", "9");
    expect(await limitFrom(allowJoinAttempt)).toBe(7);
    expect(await limitFrom(allowCheckinAttempt)).toBe(8);
    expect(await limitFrom(allowPayAttempt)).toBe(9);
  });
});
