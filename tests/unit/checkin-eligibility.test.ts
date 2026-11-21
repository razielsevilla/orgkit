import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { CHECKIN_GRACE_MS, getCheckinBlock } from "../../src/lib/events/checkin-eligibility.ts";

// E2: check-in can't be opened for a cancelled event, or one that ended more
// than 1 hour ago. The database enforces the same rule.

const NOW = Date.UTC(2030, 4, 1, 12, 0, 0);
const iso = (ms: number) => new Date(ms).toISOString();

describe("getCheckinBlock", () => {
  it("allows a scheduled event that is upcoming or running", () => {
    assert.equal(getCheckinBlock({ status: "scheduled", endsAt: iso(NOW + 3_600_000) }, NOW), null);
    assert.equal(getCheckinBlock({ status: "scheduled", endsAt: iso(NOW + 1) }, NOW), null);
  });

  it("allows an event that ended less than an hour ago, and exactly an hour ago", () => {
    assert.equal(CHECKIN_GRACE_MS, 3_600_000);
    assert.equal(getCheckinBlock({ status: "scheduled", endsAt: iso(NOW - 59 * 60_000) }, NOW), null);
    assert.equal(getCheckinBlock({ status: "scheduled", endsAt: iso(NOW - CHECKIN_GRACE_MS) }, NOW), null);
  });

  it("blocks an event that ended more than an hour ago", () => {
    assert.equal(getCheckinBlock({ status: "scheduled", endsAt: iso(NOW - CHECKIN_GRACE_MS - 1) }, NOW), "ended");
  });

  it("blocks a cancelled event, even one that is still upcoming", () => {
    assert.equal(getCheckinBlock({ status: "cancelled", endsAt: iso(NOW + 3_600_000) }, NOW), "cancelled");
  });

  it("reports a cancelled event as cancelled rather than ended", () => {
    assert.equal(getCheckinBlock({ status: "cancelled", endsAt: iso(NOW - 10 * CHECKIN_GRACE_MS) }, NOW), "cancelled");
  });
});
