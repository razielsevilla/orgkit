import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state: { headers: Record<string, string>; headersThrows: boolean; headersCalls: number } = {
  headers: {},
  headersThrows: false,
  headersCalls: 0,
};

vi.mock("next/headers", () => ({
  headers: async () => {
    state.headersCalls += 1;
    if (state.headersThrows) throw new Error("headers() outside a request");
    return { get: (name: string) => state.headers[name.toLowerCase()] ?? null };
  },
}));

const { getBaseUrl } = await import("@/src/lib/request");

// What an attacker could send to try to steer an emailed link
const FORGED = {
  host: "evil.example",
  "x-forwarded-host": "evil.example",
  "x-forwarded-proto": "https",
};

describe("getBaseUrl", () => {
  beforeEach(() => {
    state.headers = {};
    state.headersThrows = false;
    state.headersCalls = 0;
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("in production", () => {
    beforeEach(() => {
      vi.stubEnv("NODE_ENV", "production");
    });

    it("returns the configured address, without a trailing slash", async () => {
      vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://orgkit.example/");
      await expect(getBaseUrl()).resolves.toBe("https://orgkit.example");
    });

    it("ignores a forged Host and X-Forwarded-Host when an address is configured", async () => {
      vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://orgkit.example");
      state.headers = { ...FORGED };
      await expect(getBaseUrl()).resolves.toBe("https://orgkit.example");
    });

    it("fails clearly when no address is configured, even if the request has a Host", async () => {
      state.headers = { ...FORGED };
      await expect(getBaseUrl()).rejects.toThrow(/NEXT_PUBLIC_SITE_URL is not set/);
      // It must not even look at the request headers
      expect(state.headersCalls).toBe(0);
    });
  });

  describe("outside production", () => {
    beforeEach(() => {
      vi.stubEnv("NODE_ENV", "development");
    });

    it("prefers the configured address over the request's host", async () => {
      vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://staging.orgkit.example");
      state.headers = { host: "192.168.1.20:3000" };
      await expect(getBaseUrl()).resolves.toBe("https://staging.orgkit.example");
    });

    it("falls back to the request's host when nothing is configured", async () => {
      state.headers = { host: "192.168.1.20:3000", "x-forwarded-proto": "http" };
      await expect(getBaseUrl()).resolves.toBe("http://192.168.1.20:3000");
    });

    it("uses http for a localhost host and https otherwise when no protocol is forwarded", async () => {
      state.headers = { host: "localhost:3000" };
      await expect(getBaseUrl()).resolves.toBe("http://localhost:3000");
      state.headers = { host: "preview.example" };
      await expect(getBaseUrl()).resolves.toBe("https://preview.example");
    });

    it("falls back to localhost when there is no host or no request", async () => {
      await expect(getBaseUrl()).resolves.toBe("http://localhost:3000");
      state.headersThrows = true;
      await expect(getBaseUrl()).resolves.toBe("http://localhost:3000");
    });
  });
});
