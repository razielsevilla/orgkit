import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { formatFeedbackTime, toFeedbackItem, type FeedbackRow } from "../../src/lib/owner/feedback-report.ts";

const ROW: FeedbackRow = {
  id: "f-1",
  created_at: "2026-11-21T14:05:09.123Z",
  message: "The roster is slow",
  page: "/workspace/:id/members",
  org_id: "o-1",
  org_name: "Computer Science Society",
  officer_name: "Ana Reyes",
  officer_email: "ana@school.edu",
};

describe("toFeedbackItem", () => {
  it("maps a row to the inbox's shape", () => {
    assert.deepEqual(toFeedbackItem(ROW), {
      id: "f-1",
      createdAt: "2026-11-21T14:05:09.123Z",
      message: "The roster is slow",
      page: "/workspace/:id/members",
      orgName: "Computer Science Society",
      senderName: "Ana Reyes",
      senderEmail: "ana@school.edu",
    });
  });

  it("keeps a missing org as null", () => {
    assert.equal(toFeedbackItem({ ...ROW, org_id: null, org_name: null }).orgName, null);
  });

  it("copes with a sender who has no name or email", () => {
    const item = toFeedbackItem({ ...ROW, officer_name: "  ", officer_email: null });
    assert.equal(item.senderName, "Unknown sender");
    assert.equal(item.senderEmail, "");
  });
});

describe("formatFeedbackTime", () => {
  it("prints the same text in UTC, whatever the machine's time zone", () => {
    assert.equal(formatFeedbackTime("2026-11-21T14:05:09Z"), "Nov 21, 2026, 14:05 UTC");
    assert.equal(formatFeedbackTime("2026-01-03T00:07:00+00:00"), "Jan 3, 2026, 00:07 UTC");
  });

  it("converts an offset to UTC", () => {
    assert.equal(formatFeedbackTime("2026-11-21T22:30:00+08:00"), "Nov 21, 2026, 14:30 UTC");
  });

  it("shows an unreadable date as it came instead of throwing", () => {
    assert.equal(formatFeedbackTime("not a date"), "not a date");
  });
});
