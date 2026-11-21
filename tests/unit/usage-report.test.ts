import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  MAX_REPORT_ATTEMPTS,
  describeMissingWeek,
  formatWeekRange,
  toUsageWeek,
  type UsageReportRow,
} from "../../src/lib/owner/usage-report.ts";

const ROW: UsageReportRow = {
  week_start: "2026-11-09",
  week_end: "2026-11-15",
  status: "ready",
  orgs_total: 5,
  orgs_active: 3,
  orgs_inactive: 2,
  events_created: 7,
  check_ins: 41,
  active_officers: 6,
  attempts: 1,
};

describe("toUsageWeek", () => {
  it("maps a ready row to the page's shape", () => {
    assert.deepEqual(toUsageWeek(ROW), {
      weekStart: "2026-11-09",
      weekEnd: "2026-11-15",
      status: "ready",
      orgsActive: 3,
      orgsInactive: 2,
      eventsCreated: 7,
      checkIns: 41,
      activeOfficers: 6,
      attempts: 1,
    });
  });

  it("turns the nulls of a week with no snapshot into zeros, keeping the status", () => {
    const week = toUsageWeek({
      ...ROW,
      status: "failed",
      orgs_total: null,
      orgs_active: null,
      orgs_inactive: null,
      events_created: null,
      check_ins: null,
      active_officers: null,
      attempts: 2,
    });
    assert.equal(week.status, "failed");
    assert.equal(week.orgsActive, 0);
    assert.equal(week.checkIns, 0);
    assert.equal(week.attempts, 2);
  });

  it("treats an unknown status as pending rather than showing numbers", () => {
    assert.equal(toUsageWeek({ ...ROW, status: "weird" }).status, "pending");
  });
});

describe("formatWeekRange", () => {
  it("shortens a week inside one month", () => {
    assert.equal(formatWeekRange("2026-11-09", "2026-11-15"), "Nov 9 – 15, 2026");
  });

  it("names both months when the week spans two", () => {
    assert.equal(formatWeekRange("2026-11-30", "2026-12-06"), "Nov 30 – Dec 6, 2026");
  });

  it("names both years when the week spans New Year", () => {
    assert.equal(formatWeekRange("2026-12-28", "2027-01-03"), "Dec 28, 2026 – Jan 3, 2027");
  });

  it("falls back to the raw dates instead of throwing on bad input", () => {
    assert.equal(formatWeekRange("nope", "2026-11-15"), "nope – 2026-11-15");
    assert.equal(formatWeekRange("2026-13-01", "2026-11-15"), "2026-13-01 – 2026-11-15");
  });
});

describe("describeMissingWeek", () => {
  const base = toUsageWeek({ ...ROW, status: "pending", attempts: null });

  it("says no data yet for a week not produced and not failed", () => {
    assert.equal(describeMissingWeek(base), "No data yet");
  });

  it("says a failed week is being retried, with the attempt count", () => {
    assert.equal(
      describeMissingWeek({ ...base, status: "failed", attempts: 1 }),
      "Report failed (1 attempt). Retrying automatically."
    );
    assert.equal(
      describeMissingWeek({ ...base, status: "failed", attempts: 3 }),
      "Report failed (3 attempts). Retrying automatically."
    );
  });

  it("says plainly when it has given up", () => {
    assert.equal(
      describeMissingWeek({ ...base, status: "failed", attempts: MAX_REPORT_ATTEMPTS }),
      `Report failed after ${MAX_REPORT_ATTEMPTS} attempts. It will not retry on its own.`
    );
  });
});
