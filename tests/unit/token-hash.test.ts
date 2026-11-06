import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { hashInviteToken, generateInviteToken } from "../../src/lib/invites/tokens.ts";

describe("Token lookup hash integrity", () => {
  it("verifies hash computation is deterministic for DB lookup", () => {
    const token = generateInviteToken();
    const hash1 = hashInviteToken(token);
    const hash2 = hashInviteToken(token);

    assert.equal(hash1, hash2);
    assert.equal(hash1.length, 64);
  });
});

