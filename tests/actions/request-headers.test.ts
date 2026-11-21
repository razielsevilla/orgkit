import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The parts of request.ts that request-base-url.test.ts and rate-limit.test.ts do not
 * reach: which request header wins when the address is taken from the request (only
 * outside production), and the odd shapes an X-Forwarded-For header can have.
 */

const state: { headers: Record<string, string>; headersCalls: number } = { headers: {}, headersCalls: 0 };

vi.mock("next/headers", () => ({
  headers: async () => {
    state.headersCalls += 1;
    return { get: (name: string) => state.headers[name.toLowerCase()] ?? null };
  },
}));

const { getBaseUrl, getClientIp } = await import("@/src/lib/request");

beforeEach(() => {
  state.headers = {};
  state.headersCalls = 0;
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getBaseUrl: taking the address from the request (outside production only)", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "development");
  });

  it("prefers X-Forwarded-Host over Host", async () => {
    state.headers = { host: "internal.local:3000", "x-forwarded-host": "public.example", "x-forwarded-proto": "https" };
    await expect(getBaseUrl()).resolves.toBe("https://public.example");
  });

  it("uses X-Forwarded-Proto even when the host is local", async () => {
    state.headers = { host: "localhost:3000", "x-forwarded-proto": "https" };
    await expect(getBaseUrl()).resolves.toBe("https://localhost:3000");
  });

  it("uses X-Forwarded-Proto to say http for a public host", async () => {
    state.headers = { host: "preview.example", "x-forwarded-proto": "http" };
    await expect(getBaseUrl()).resolves.toBe("http://preview.example");
  });

  it("assumes http for 127.0.0.1 and https for anything else when no protocol is forwarded", async () => {
    state.headers = { host: "127.0.0.1:3000" };
    await expect(getBaseUrl()).resolves.toBe("http://127.0.0.1:3000");

    state.headers = { host: "staging.example" };
    await expect(getBaseUrl()).resolves.toBe("https://staging.example");
  });

  it("falls back to Host when X-Forwarded-Host is empty", async () => {
    state.headers = { host: "real.example", "x-forwarded-host": "" };
    await expect(getBaseUrl()).resolves.toBe("https://real.example");
  });
});

describe("getBaseUrl: when an address is configured, the request is not consulted at all", () => {
  it("in production, returns the configured address without reading a single header", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://orgkit.example");
    state.headers = { host: "evil.example", "x-forwarded-host": "evil.example", "x-forwarded-proto": "http" };

    await expect(getBaseUrl()).resolves.toBe("https://orgkit.example");

    expect(state.headersCalls).toBe(0);
  });

  it("outside production too: a configured address wins and the headers are never read", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://staging.orgkit.example/");
    state.headers = { host: "192.168.1.20:3000" };

    await expect(getBaseUrl()).resolves.toBe("https://staging.orgkit.example");

    expect(state.headersCalls).toBe(0);
  });
});

describe("getClientIp: odd shapes of X-Forwarded-For", () => {
  it("takes the first address of a list, trimmed", async () => {
    state.headers = { "x-forwarded-for": "  203.0.113.7 , 10.0.0.1 , 10.0.0.2" };
    await expect(getClientIp()).resolves.toBe("203.0.113.7");
  });

  it("handles an IPv6 address", async () => {
    state.headers = { "x-forwarded-for": "2001:db8::1, 10.0.0.1" };
    await expect(getClientIp()).resolves.toBe("2001:db8::1");
  });

  it("never promotes a later entry: an empty first entry falls back to x-real-ip, not to the second address", async () => {
    state.headers = { "x-forwarded-for": ", 10.0.0.1", "x-real-ip": "192.0.2.5" };
    await expect(getClientIp()).resolves.toBe("192.0.2.5");

    state.headers = { "x-forwarded-for": ", 10.0.0.1" };
    await expect(getClientIp()).resolves.toBe("unknown");
  });

  it("treats an empty or blank header as missing", async () => {
    state.headers = { "x-forwarded-for": "", "x-real-ip": "192.0.2.5" };
    await expect(getClientIp()).resolves.toBe("192.0.2.5");

    state.headers = { "x-forwarded-for": "   ", "x-real-ip": "192.0.2.5" };
    await expect(getClientIp()).resolves.toBe("192.0.2.5");

    state.headers = { "x-forwarded-for": "   " };
    await expect(getClientIp()).resolves.toBe("unknown");
  });

  it("ignores headers other than X-Forwarded-For and X-Real-IP", async () => {
    state.headers = { "cf-connecting-ip": "198.51.100.1", forwarded: "for=198.51.100.2", "true-client-ip": "198.51.100.3" };
    await expect(getClientIp()).resolves.toBe("unknown");
  });
});
