import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  reviewReasonSchema,
  validateReviewReason,
} from "../../src/lib/dues/dues-review-validation.ts";
import { REJECT_REASON_SHORTCUTS } from "../../src/lib/dues/dues-review.ts";

describe("Dues Review Validation", () => {
  it("validates and trims legitimate reasons", () => {
    const res = validateReviewReason("  Amount doesn't match the required fee.  ");
    assert.equal(res.isValid, true);
    assert.equal(res.cleaned, "Amount doesn't match the required fee.");
    assert.equal(res.error, undefined);
  });

  it("accepts all predefined reject reason shortcuts", () => {
    for (const shortcut of REJECT_REASON_SHORTCUTS) {
      const res = validateReviewReason(shortcut);
      assert.equal(res.isValid, true);
      assert.equal(res.cleaned, shortcut);
    }
  });

  it("rejects empty, missing, or whitespace-only reasons", () => {
    assert.equal(validateReviewReason("").isValid, false);
    assert.equal(validateReviewReason("   ").isValid, false);
    assert.equal(validateReviewReason(null).isValid, false);
    assert.equal(validateReviewReason(undefined).isValid, false);
    assert.equal(validateReviewReason(123).isValid, false);
  });

  it("rejects reasons that are too short (< 3 characters)", () => {
    const res = validateReviewReason("No");
    assert.equal(res.isValid, false);
    assert.ok(res.error?.includes("at least 3 characters"));
  });

  it("rejects reasons that exceed 500 characters", () => {
    const longReason = "A".repeat(501);
    const res = validateReviewReason(longReason);
    assert.equal(res.isValid, false);
    assert.ok(res.error?.includes("cannot exceed 500 characters"));

    // Exactly 500 characters should pass
    const exact500 = "B".repeat(500);
    assert.equal(validateReviewReason(exact500).isValid, true);
  });

  it("reviewReasonSchema parses correctly and throws on invalid inputs", () => {
    assert.equal(reviewReasonSchema.parse("Valid reason"), "Valid reason");
    assert.throws(() => reviewReasonSchema.parse(""));
  });
});
