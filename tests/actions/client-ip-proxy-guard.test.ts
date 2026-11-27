import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state: { headers: Record<string, string> } = { headers: {} };
const logged: { event: string; message?: unknown }[] = [];

vi.mock("next/headers", () => ({
  headers: async () => ({ get: (name: string) => state.headers[name.toLowerCase()] ?? null }),
}));
vi.mock("@/src/lib/logger", () => ({
  logger: {
    error: (event: string, message?: unknown) => {
      logged.push({ event, message });
    },
  },
}));

/** A fresh copy of the module each time, because the warning is logged once per process */
async function load() {
  vi.resetModules();
  return import("@/src/lib/request");
}

describe("getClientIp proxy guard", () => {
  beforeEach(() => {
    state.headers = { "x-forwarded-for": "203.0.113.9, 10.0.0.1" };
    logged.length = 0;
    vi.stubEnv("VERCEL", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("logs rate_limit.untrusted_proxy, once, in production outside Vercel", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const { getClientIp } = await load();

    await getClientIp();
    await getClientIp();
    await getClientIp();

    const hits = logged.filter((l) => l.event === "rate_limit.untrusted_proxy");
    expect(hits).toHaveLength(1);
    expect(String(hits[0].message)).toMatch(/not running on Vercel/);
  });

  it("stays quiet on Vercel", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL", "1");
    const { getClientIp } = await load();
    await getClientIp();
    expect(logged).toHaveLength(0);
  });

  it("stays quiet in development and tests", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const { getClientIp } = await load();
    await getClientIp();
    expect(logged).toHaveLength(0);
  });

  it("still returns the first forwarded address either way", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const { getClientIp } = await load();
    await expect(getClientIp()).resolves.toBe("203.0.113.9");
    state.headers = { "x-real-ip": "198.51.100.4" };
    await expect(getClientIp()).resolves.toBe("198.51.100.4");
    state.headers = {};
    await expect(getClientIp()).resolves.toBe("unknown");
  });
});
