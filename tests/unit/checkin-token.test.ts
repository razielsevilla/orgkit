import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  GRACE_SLOTS,
  SLOT_SECONDS,
  signCheckinToken,
  slotEndsAtMs,
  slotFor,
  verifyCheckinToken,
} from "../../src/lib/checkin/token.ts";

// E2: the rotating check-in token. It is stateless, so everything here runs
// with only a secret and a clock: no database is ever involved.

const SECRET = "test-secret-for-checkin-tokens";
const EVENT = "33333333-3333-4333-8333-333333333333";
const OTHER_EVENT = "44444444-4444-4444-8444-444444444444";
const NOW = Date.UTC(2030, 4, 1, 10, 0, 7); // 7 seconds into a slot
const SLOT = slotFor(NOW);

const tokenFor = (slot: number, eventId = EVENT, secret = SECRET) => signCheckinToken(eventId, slot, secret);

describe("slots", () => {
  it("are 30 seconds long and change on the boundary", () => {
    assert.equal(SLOT_SECONDS, 30);
    const start = SLOT * 30 * 1000;
    assert.equal(slotFor(start), SLOT);
    assert.equal(slotFor(start + 29_999), SLOT);
    assert.equal(slotFor(start + 30_000), SLOT + 1);
    assert.equal(slotEndsAtMs(SLOT), start + 30_000);
  });
});

describe("verifyCheckinToken", () => {
  it("accepts a token from the current slot and returns its event", () => {
    assert.deepEqual(verifyCheckinToken(tokenFor(SLOT), SECRET, NOW), { ok: true, eventId: EVENT });
  });

  it("accepts a token from the previous slot (grace for slow scans)", () => {
    assert.equal(GRACE_SLOTS, 1);
    assert.deepEqual(verifyCheckinToken(tokenFor(SLOT - 1), SECRET, NOW), { ok: true, eventId: EVENT });
  });

  it("rejects a token two slots old, however long ago", () => {
    assert.deepEqual(verifyCheckinToken(tokenFor(SLOT - 2), SECRET, NOW), { ok: false });
    assert.deepEqual(verifyCheckinToken(tokenFor(SLOT - 1000), SECRET, NOW), { ok: false });
  });

  it("rejects a token from a future slot", () => {
    assert.deepEqual(verifyCheckinToken(tokenFor(SLOT + 1), SECRET, NOW), { ok: false });
    assert.deepEqual(verifyCheckinToken(tokenFor(SLOT + 1000), SECRET, NOW), { ok: false });
  });

  it("stops accepting a token once its grace slot is over", () => {
    const token = tokenFor(SLOT);
    const twoSlotsLater = NOW + 2 * 30_000;
    assert.deepEqual(verifyCheckinToken(token, SECRET, NOW + 30_000), { ok: true, eventId: EVENT });
    assert.deepEqual(verifyCheckinToken(token, SECRET, twoSlotsLater), { ok: false });
  });

  it("rejects a tampered signature", () => {
    const token = tokenFor(SLOT);
    const last = token.slice(-1);
    const tampered = token.slice(0, -1) + (last === "A" ? "B" : "A");
    assert.deepEqual(verifyCheckinToken(tampered, SECRET, NOW), { ok: false });
  });

  it("rejects a token signed with a different secret", () => {
    assert.deepEqual(verifyCheckinToken(tokenFor(SLOT, EVENT, "another-secret"), SECRET, NOW), { ok: false });
  });

  it("rejects a changed event ID or a changed slot", () => {
    const [, , signature] = tokenFor(SLOT).split(".");
    assert.deepEqual(verifyCheckinToken(`${OTHER_EVENT}.${SLOT}.${signature}`, SECRET, NOW), { ok: false });
    assert.deepEqual(verifyCheckinToken(`${EVENT}.${SLOT - 1}.${signature}`, SECRET, NOW), { ok: false });
  });

  it("rejects garbage of every kind", () => {
    const garbage: unknown[] = [
      "",
      " ",
      "garbage",
      "a.b.c",
      "...",
      `${EVENT}.${SLOT}`,
      `${EVENT}.${SLOT}.`,
      `${EVENT}.${SLOT}.${"A".repeat(43)}.extra`,
      `${EVENT}.-1.${"A".repeat(43)}`,
      `${EVENT}.1e3.${"A".repeat(43)}`,
      `not-a-uuid.${SLOT}.${"A".repeat(43)}`,
      "x".repeat(10_000),
      "💥".repeat(50),
      null,
      undefined,
      42,
      {},
      [],
    ];
    for (const value of garbage) {
      assert.deepEqual(verifyCheckinToken(value, SECRET, NOW), { ok: false }, `should reject ${String(value).slice(0, 30)}`);
    }
  });

  it("rejects everything when no secret is set", () => {
    assert.deepEqual(verifyCheckinToken(tokenFor(SLOT), "", NOW), { ok: false });
  });

  it("is a different token every slot, and the same token within one", () => {
    assert.notEqual(tokenFor(SLOT), tokenFor(SLOT + 1));
    assert.equal(tokenFor(SLOT), tokenFor(SLOT));
  });
});
