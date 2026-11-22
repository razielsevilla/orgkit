import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { getPrivacyContactEmail } from "../../src/lib/config.ts";

const original = process.env.PRIVACY_CONTACT_EMAIL;

afterEach(() => {
  if (original === undefined) delete process.env.PRIVACY_CONTACT_EMAIL;
  else process.env.PRIVACY_CONTACT_EMAIL = original;
});

describe("getPrivacyContactEmail", () => {
  it("returns the configured address, trimmed", () => {
    process.env.PRIVACY_CONTACT_EMAIL = "  privacy@orgkit.example ";
    assert.equal(getPrivacyContactEmail(), "privacy@orgkit.example");
  });

  it("returns null when missing, blank or invalid, so callers stay closed", () => {
    delete process.env.PRIVACY_CONTACT_EMAIL;
    assert.equal(getPrivacyContactEmail(), null);

    for (const value of ["", "   ", "[privacy contact email]", "a@b"]) {
      process.env.PRIVACY_CONTACT_EMAIL = value;
      assert.equal(getPrivacyContactEmail(), null, value);
    }
  });

  it("reads the variable when called, not at import time", () => {
    process.env.PRIVACY_CONTACT_EMAIL = "first@orgkit.example";
    assert.equal(getPrivacyContactEmail(), "first@orgkit.example");
    process.env.PRIVACY_CONTACT_EMAIL = "second@orgkit.example";
    assert.equal(getPrivacyContactEmail(), "second@orgkit.example");
  });
});
