import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { checkInviteRateLimit } from "../../src/lib/rate-limit.ts";
import { hashInviteToken, generateInviteToken } from "../../src/lib/tokens.ts";

describe("Phase 5: Rate Limiting", () => {
  it("allows requests under the rate limit for an IP", () => {
    const testIp = `192.168.1.${Math.floor(Math.random() * 200) + 10}`;
    assert.equal(checkInviteRateLimit(testIp, 5, 1000), true);
    assert.equal(checkInviteRateLimit(testIp, 5, 1000), true);
    assert.equal(checkInviteRateLimit(testIp, 5, 1000), true);
  });

  it("blocks requests once the threshold is exceeded", () => {
    const testIp = `10.0.0.${Math.floor(Math.random() * 200) + 10}`;
    const limit = 3;

    assert.equal(checkInviteRateLimit(testIp, limit, 1000), true); // 1
    assert.equal(checkInviteRateLimit(testIp, limit, 1000), true); // 2
    assert.equal(checkInviteRateLimit(testIp, limit, 1000), true); // 3
    assert.equal(checkInviteRateLimit(testIp, limit, 1000), false); // 4 (exceeded)
  });

  it("treats different IPs independently", () => {
    const ipA = "172.16.0.1";
    const ipB = "172.16.0.2";

    assert.equal(checkInviteRateLimit(ipA, 1, 1000), true);
    assert.equal(checkInviteRateLimit(ipA, 1, 1000), false); // ipA exhausted

    assert.equal(checkInviteRateLimit(ipB, 1, 1000), true); // ipB still fresh
  });
});

describe("Phase 5: Token Lookup Hash Integrity", () => {
  it("verifies hash computation is deterministic for DB lookup", () => {
    const token = generateInviteToken();
    const hash1 = hashInviteToken(token);
    const hash2 = hashInviteToken(token);

    assert.equal(hash1, hash2);
    assert.equal(hash1.length, 64);
  });
});

