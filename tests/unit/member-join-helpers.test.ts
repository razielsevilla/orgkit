import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseContactEmail } from "../../src/lib/members/member-join.ts";

describe("parseContactEmail", () => {
  it("returns a valid address, trimmed", () => {
    assert.equal(parseContactEmail("  privacy@orgkit.example "), "privacy@orgkit.example");
  });

  it("returns null when it is missing, blank or not an email, so the join page stays closed", () => {
    for (const value of [undefined, null, "", "   ", "[privacy contact email]", "privacy", "a@b", "a b@c.com"]) {
      assert.equal(parseContactEmail(value), null, String(value));
    }
  });
});
