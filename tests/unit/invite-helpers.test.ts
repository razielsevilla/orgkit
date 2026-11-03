import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { generateInviteToken, isValidInviteToken } from "../../src/lib/tokens.ts";
import { isInviteUsable } from "../../src/lib/invite-status.ts";

const NOW = Date.parse("2026-11-03T12:00:00Z");
const DAY = 24 * 60 * 60 * 1000;
const iso = (ms: number) => new Date(ms).toISOString();

describe("isInviteUsable", () => {
  const fresh = { used_at: null, revoked_at: null, expires_at: iso(NOW + 3 * DAY) };

  it("accepts an unused, unrevoked, unexpired invite", () => {
    assert.equal(isInviteUsable(fresh, NOW), true);
  });

  it("rejects a missing invite", () => {
    assert.equal(isInviteUsable(null, NOW), false);
    assert.equal(isInviteUsable(undefined, NOW), false);
  });

  it("rejects a used invite", () => {
    assert.equal(isInviteUsable({ ...fresh, used_at: iso(NOW - DAY) }, NOW), false);
  });

  it("rejects a revoked invite", () => {
    assert.equal(isInviteUsable({ ...fresh, revoked_at: iso(NOW - DAY) }, NOW), false);
  });

  it("rejects an expired invite, including at the exact expiry moment", () => {
    assert.equal(isInviteUsable({ ...fresh, expires_at: iso(NOW - 1) }, NOW), false);
    assert.equal(isInviteUsable({ ...fresh, expires_at: iso(NOW) }, NOW), false);
    assert.equal(isInviteUsable({ ...fresh, expires_at: iso(NOW + 1) }, NOW), true);
  });

  it("rejects an invite created 8 days ago with a 7-day life", () => {
    const created = NOW - 8 * DAY;
    assert.equal(isInviteUsable({ ...fresh, expires_at: iso(created + 7 * DAY) }, NOW), false);
  });
});

describe("isValidInviteToken", () => {
  it("accepts tokens from generateInviteToken", () => {
    for (let i = 0; i < 20; i++) assert.equal(isValidInviteToken(generateInviteToken()), true);
  });

  it("rejects anything that is not a 43-character base64url string", () => {
    const good = generateInviteToken();
    for (const bad of [
      "",
      "short",
      good + "a",
      good.slice(1),
      `${good.slice(0, 42)}/`,
      `${good.slice(0, 42)} `,
      `${good.slice(0, 40)}../`,
      "<script>alert(1)</script>".padEnd(43, "x"),
      undefined,
      null,
      42,
    ]) {
      assert.equal(isValidInviteToken(bad), false, String(bad));
    }
  });
});

describe("invite page never writes cookies while rendering", () => {
  // Next.js throws if a Server Component sets or deletes a cookie. Cookie writes
  // belong in the start route, a Server Action, or the proxy.
  const page = readFileSync(join(import.meta.dirname, "../../src/app/invite/[token]/page.tsx"), "utf8");

  it("does not call the cookie setters from the page", () => {
    assert.equal(/setPendingInviteCookie|clearPendingInviteCookie/.test(page), false);
    assert.equal(/cookies\(\)\s*\.\s*(set|delete)/.test(page), false);
  });
});
