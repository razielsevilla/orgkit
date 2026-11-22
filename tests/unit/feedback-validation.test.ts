import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  FEEDBACK_MAX,
  FEEDBACK_MESSAGES,
  cleanFeedback,
  countCharacters,
  orgIdFromPath,
  sanitizePagePath,
  validateFeedback,
} from "../../src/lib/feedback/feedback-validation.ts";

const ORG = "0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d";

describe("cleanFeedback", () => {
  it("trims the ends and keeps line breaks inside the message", () => {
    assert.equal(cleanFeedback("  \n Hello\n\nworld \t\n "), "Hello\n\nworld");
  });

  it("turns Windows and old Mac line breaks into plain ones", () => {
    assert.equal(cleanFeedback("a\r\nb\rc"), "a\nb\nc");
  });
});

describe("countCharacters", () => {
  it("counts an emoji as one character, as the database does", () => {
    assert.equal(countCharacters("😀"), 1);
    assert.equal("😀".length, 2);
    assert.equal(countCharacters("héllo"), 5);
  });
});

describe("validateFeedback", () => {
  it("accepts a normal message and returns it cleaned", () => {
    assert.deepEqual(validateFeedback("  The dues page is slow \n"), {
      valid: true,
      message: "The dues page is slow",
    });
  });

  it("rejects an empty message, and one with only spaces or line breaks", () => {
    for (const value of ["", "   ", "\n\n", " \t \r\n "]) {
      assert.deepEqual(validateFeedback(value), { valid: false, error: FEEDBACK_MESSAGES.empty }, JSON.stringify(value));
    }
  });

  it("rejects anything that is not text", () => {
    for (const value of [undefined, null, 42, {}, ["a"]]) {
      assert.deepEqual(validateFeedback(value), { valid: false, error: FEEDBACK_MESSAGES.empty });
    }
  });

  it("allows exactly the maximum and rejects one more", () => {
    assert.equal(validateFeedback("a".repeat(FEEDBACK_MAX)).valid, true);
    assert.deepEqual(validateFeedback("a".repeat(FEEDBACK_MAX + 1)), {
      valid: false,
      error: FEEDBACK_MESSAGES.tooLong,
    });
  });

  it("does not count the spaces around the message", () => {
    assert.equal(validateFeedback(` ${"a".repeat(FEEDBACK_MAX)} \n`).valid, true);
  });

  it("counts emoji as characters, not as two", () => {
    assert.equal(validateFeedback("😀".repeat(FEEDBACK_MAX)).valid, true);
    assert.equal(validateFeedback("😀".repeat(FEEDBACK_MAX + 1)).valid, false);
  });

  it("keeps line breaks inside the message", () => {
    const res = validateFeedback("one\ntwo");
    assert.deepEqual(res, { valid: true, message: "one\ntwo" });
  });
});

describe("sanitizePagePath", () => {
  it("replaces ids with :id", () => {
    assert.equal(sanitizePagePath(`/workspace/${ORG}/dues`), "/workspace/:id/dues");
    assert.equal(
      sanitizePagePath(`/workspace/${ORG}/events/${ORG.toUpperCase()}/checkin`),
      "/workspace/:id/events/:id/checkin"
    );
  });

  it("drops the query string and the hash", () => {
    assert.equal(sanitizePagePath("/workspace/new?next=/x&token=abc#top"), "/workspace/new");
    assert.equal(sanitizePagePath("/owner/usage#top"), "/owner/usage");
  });

  it("replaces a secret token segment, so a link never lands in the table", () => {
    const token = "a".repeat(43);
    assert.equal(sanitizePagePath(`/checkin/${token}`), "/checkin/:id");
    assert.equal(sanitizePagePath(`/join/${"0f".repeat(32)}`), "/join/:id");
  });

  it("leaves ordinary page names alone", () => {
    for (const path of ["/", "/owner/usage", "/owner/feedback", "/workspace/new", "/workspace/:id/members/join"]) {
      assert.equal(sanitizePagePath(path), path);
    }
  });

  it("removes a trailing slash", () => {
    assert.equal(sanitizePagePath("/workspace/new/"), "/workspace/new");
  });

  it("falls back to / for anything that is not a plain path", () => {
    for (const value of [undefined, null, 42, "", "workspace/new", "https://evil.example/x", "//evil.example/x"]) {
      assert.equal(sanitizePagePath(value), "/", String(value));
    }
  });

  it("strips spaces and control characters", () => {
    assert.equal(sanitizePagePath("/work space/new\u0000\n"), "/workspace/new");
  });

  it("caps the length", () => {
    const long = "/" + "a-b.".repeat(100);
    const cleaned = sanitizePagePath(long);
    assert.equal(cleaned.length, 200);
    assert.ok(cleaned.startsWith("/a-b.a-b."));
  });
});

describe("orgIdFromPath", () => {
  it("finds the org in a workspace path, in lower case", () => {
    assert.equal(orgIdFromPath(`/workspace/${ORG}/dues`), ORG);
    assert.equal(orgIdFromPath(`/workspace/${ORG.toUpperCase()}`), ORG);
    assert.equal(orgIdFromPath(`/workspace/${ORG}?tab=x#y`), ORG);
  });

  it("is null when the path is not inside an org", () => {
    for (const value of ["/workspace/new", "/owner/usage", "/", `/other/${ORG}`, "/workspace/not-a-uuid", undefined, 5]) {
      assert.equal(orgIdFromPath(value), null, String(value));
    }
  });
});
