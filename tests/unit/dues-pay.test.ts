import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  cleanReferenceNo,
  isValidEmail,
  isValidReferenceNo,
  isValidScreenshotFile,
  looksLikeToken,
  MAX_SCREENSHOT_BYTES,
} from "../../src/lib/dues/dues-pay.ts";

describe("Dues Pay Validation Helpers", () => {
  it("validates email format properly", () => {
    assert.equal(isValidEmail("student@school.edu"), true);
    assert.equal(isValidEmail("member.name@sub.domain.ph"), true);
    assert.equal(isValidEmail("invalid-email"), false);
    assert.equal(isValidEmail("@no-user.com"), false);
    assert.equal(isValidEmail("no-domain@"), false);
    assert.equal(isValidEmail(""), false);
  });

  it("cleans and validates GCash reference number", () => {
    assert.equal(cleanReferenceNo("  1001   2345   6789  "), "1001 2345 6789");
    assert.equal(isValidReferenceNo("1001 2345 6789"), true);
    assert.equal(isValidReferenceNo("ABCD"), true); // min 4 chars
    assert.equal(isValidReferenceNo("123"), false); // too short
    assert.equal(isValidReferenceNo("a".repeat(51)), false); // too long (max 50)
  });

  it("checks 64-character unguessable token pattern", () => {
    const valid64 = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    assert.equal(looksLikeToken(valid64), true);
    assert.equal(looksLikeToken("short-token"), false);
    assert.equal(looksLikeToken(valid64.slice(0, 63)), false);
    assert.equal(looksLikeToken(valid64 + "a"), false);
    assert.equal(looksLikeToken("G".repeat(64)), false); // non-hex
  });

  it("validates screenshot file size and type", () => {
    // Missing or 0 size
    assert.deepEqual(isValidScreenshotFile({ size: 0, type: "image/png" }), {
      valid: false,
      errorKey: "screenshotMissing",
    });

    // Too large (> 5 MB)
    assert.deepEqual(
      isValidScreenshotFile({ size: MAX_SCREENSHOT_BYTES + 1, type: "image/jpeg" }),
      {
        valid: false,
        errorKey: "screenshotTooLarge",
      }
    );

    // Invalid MIME type
    assert.deepEqual(
      isValidScreenshotFile({ size: 1024, type: "application/pdf" }),
      {
        valid: false,
        errorKey: "screenshotInvalidType",
      }
    );
    assert.deepEqual(
      isValidScreenshotFile({ size: 1024, type: "image/gif" }),
      {
        valid: false,
        errorKey: "screenshotInvalidType",
      }
    );

    // Valid formats
    assert.deepEqual(
      isValidScreenshotFile({ size: 1024 * 500, type: "image/jpeg" }),
      { valid: true }
    );
    assert.deepEqual(
      isValidScreenshotFile({ size: 1024 * 500, type: "image/png" }),
      { valid: true }
    );
    assert.deepEqual(
      isValidScreenshotFile({ size: 1024 * 500, type: "image/webp" }),
      { valid: true }
    );
  });
});
