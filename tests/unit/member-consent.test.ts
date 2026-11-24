import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  CURRENT_MEMBER_CONSENT,
  MEMBER_CONSENT_V1,
  MEMBER_CONSENT_V2,
  fillConsentText,
} from "../../src/lib/members/member-consent.ts";

const PLACEHOLDERS = ["{orgName}", "{appName}", "{contactEmail}"];

describe("member consent versions", () => {
  it("keeps v1 as published: a stored v1 record must still map to the words that student saw", () => {
    assert.equal(MEMBER_CONSENT_V1.version, "member-consent-v1");
    assert.match(MEMBER_CONSENT_V1.text.en, /^By joining, you agree that \{orgName\} may collect/);
    assert.doesNotMatch(MEMBER_CONSENT_V1.text.en, /dues reminders/);
  });

  it("points CURRENT at v2, which has its own version string", () => {
    assert.equal(CURRENT_MEMBER_CONSENT, MEMBER_CONSENT_V2);
    assert.equal(MEMBER_CONSENT_V2.version, "member-consent-v2");
    assert.notEqual(MEMBER_CONSENT_V2.version, MEMBER_CONSENT_V1.version);
  });

  it("has English and Filipino text that use every placeholder", () => {
    for (const language of ["en", "fil"] as const) {
      for (const placeholder of PLACEHOLDERS) {
        assert.ok(
          MEMBER_CONSENT_V2.text[language].includes(placeholder),
          `${language} text is missing ${placeholder}`
        );
      }
    }
  });

  it("v2 covers the data added since v1: attendance, dues payments and reminder emails", () => {
    assert.match(MEMBER_CONSENT_V2.text.en, /attendance/);
    assert.match(MEMBER_CONSENT_V2.text.en, /dues payments/);
    assert.match(MEMBER_CONSENT_V2.text.en, /reference number or screenshot/);
    assert.match(MEMBER_CONSENT_V2.text.en, /dues reminders/);
    assert.match(MEMBER_CONSENT_V2.text.fil, /attendance/);
    assert.match(MEMBER_CONSENT_V2.text.fil, /dues/);
    assert.match(MEMBER_CONSENT_V2.text.fil, /screenshot/);
    assert.match(MEMBER_CONSENT_V2.text.fil, /paalala/);
  });

  it("fills every placeholder, leaving none behind", () => {
    for (const language of ["en", "fil"] as const) {
      const filled = fillConsentText(MEMBER_CONSENT_V2.text[language], {
        orgName: "Test Org",
        contactEmail: "privacy@orgkit.example",
      });
      assert.ok(filled.includes("Test Org"));
      assert.ok(filled.includes("privacy@orgkit.example"));
      assert.ok(filled.includes("OrgKit"));
      assert.doesNotMatch(filled, /\{[a-zA-Z]+\}/);
    }
  });
});
