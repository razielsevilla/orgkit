import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  cleanReferenceNo,
  detectImageMimeType,
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

  it("detects genuine image magic bytes and rejects non-image files renamed to .png", () => {
    // Genuine PNG bytes: 89 50 4E 47 0D 0A 1A 0A
    const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
    assert.equal(detectImageMimeType(pngBuffer), "image/png");

    // Genuine JPEG bytes: FF D8 FF
    const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
    assert.equal(detectImageMimeType(jpegBuffer), "image/jpeg");

    // Genuine WebP bytes: RIFF....WEBP
    const webpBuffer = Buffer.from([
      0x52, 0x49, 0x46, 0x46, // RIFF
      0x00, 0x00, 0x00, 0x00,
      0x57, 0x45, 0x42, 0x50, // WEBP
    ]);
    assert.equal(detectImageMimeType(webpBuffer), "image/webp");

    // File renamed to .png that is actually text / exe
    const textFileAsPng = Buffer.from("Hello world, this is a plain text file pretending to be an image");
    assert.equal(detectImageMimeType(textFileAsPng), null);

    // Empty or short buffer
    assert.equal(detectImageMimeType(Buffer.from([0x89, 0x50])), null);
  });
});
