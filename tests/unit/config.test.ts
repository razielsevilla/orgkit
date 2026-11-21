import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  getCheckinAttemptsPerMinute,
  getDuesPayAttemptsPerMinute,
  getInviteAttemptsPerMinute,
  getJoinAttemptsPerMinute,
  getRateLimitSecret,
} from "../../src/lib/config.ts";

const env = process.env as Record<string, string | undefined>;
const NAMES = [
  "NODE_ENV",
  "JOIN_ATTEMPTS_PER_MINUTE",
  "INVITE_ATTEMPTS_PER_MINUTE",
  "CHECKIN_ATTEMPTS_PER_MINUTE",
  "DUES_PAY_ATTEMPTS_PER_MINUTE",
  "JOIN_RATE_LIMIT_SECRET",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;
const saved: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const name of NAMES) {
    saved[name] = env[name];
    if (name !== "NODE_ENV") delete env[name];
  }
});

afterEach(() => {
  for (const name of NAMES) {
    if (saved[name] === undefined) delete env[name];
    else env[name] = saved[name];
  }
});

const LIMITS = [
  { name: "JOIN_ATTEMPTS_PER_MINUTE", get: getJoinAttemptsPerMinute, fallback: 30 },
  { name: "INVITE_ATTEMPTS_PER_MINUTE", get: getInviteAttemptsPerMinute, fallback: 20 },
  { name: "CHECKIN_ATTEMPTS_PER_MINUTE", get: getCheckinAttemptsPerMinute, fallback: 30 },
  { name: "DUES_PAY_ATTEMPTS_PER_MINUTE", get: getDuesPayAttemptsPerMinute, fallback: 30 },
];

for (const { name, get, fallback } of LIMITS) {
  describe(`${name}`, () => {
    it(`defaults to ${fallback} when unset or blank`, () => {
      assert.equal(get(), fallback);
      env[name] = "";
      assert.equal(get(), fallback);
      env[name] = "   ";
      assert.equal(get(), fallback);
    });

    it("uses a valid positive whole number", () => {
      env[name] = "5";
      assert.equal(get(), 5);
      env[name] = " 120 ";
      assert.equal(get(), 120);
    });

    it("falls back for values that are not a usable limit", () => {
      for (const bad of ["abc", "30abc", "0", "-5", "1.5", "Infinity", "NaN", "99999999999"]) {
        env[name] = bad;
        assert.equal(get(), fallback, `value ${JSON.stringify(bad)}`);
      }
    });

    it("reads the environment when called, not at import", () => {
      env[name] = "11";
      assert.equal(get(), 11);
      env[name] = "12";
      assert.equal(get(), 12);
    });
  });
}

describe("getRateLimitSecret", () => {
  it("prefers JOIN_RATE_LIMIT_SECRET, then the service role key", () => {
    env.NODE_ENV = "production";
    env.SUPABASE_SERVICE_ROLE_KEY = "service-key";
    assert.equal(getRateLimitSecret(), "service-key");
    env.JOIN_RATE_LIMIT_SECRET = "dedicated";
    assert.equal(getRateLimitSecret(), "dedicated");
  });

  it("in production, throws when called with nothing configured (and never returns an empty string)", () => {
    env.NODE_ENV = "production";
    assert.throws(() => getRateLimitSecret(), /JOIN_RATE_LIMIT_SECRET is not set/);
    env.JOIN_RATE_LIMIT_SECRET = "   ";
    assert.throws(() => getRateLimitSecret(), /JOIN_RATE_LIMIT_SECRET is not set/);
  });

  it("outside production, uses a non-empty development value", () => {
    env.NODE_ENV = "development";
    const secret = getRateLimitSecret();
    assert.ok(secret.length > 0);
  });
});
