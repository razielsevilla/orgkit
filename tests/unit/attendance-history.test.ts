import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  parseHistory,
  rowStatus,
  summarise,
  summaryLabel,
  type MemberHistoryRow,
} from "../../src/lib/members/attendance-history.ts";

const JOINED = "2030-03-01T00:00:00Z";

function row(over: Partial<MemberHistoryRow> = {}): MemberHistoryRow {
  return {
    eventId: "e1",
    title: "Meeting",
    startsAt: "2030-04-01T10:00:00Z",
    endsAt: "2030-04-01T12:00:00Z",
    cancelled: false,
    attended: false,
    method: null,
    checkedInAt: null,
    ...over,
  };
}

describe("rowStatus", () => {
  it("labels present, absent and cancelled", () => {
    assert.equal(rowStatus(row({ attended: true, method: "qr" })), "present");
    assert.equal(rowStatus(row()), "absent");
    assert.equal(rowStatus(row({ cancelled: true })), "cancelled");
  });

  it("calls a cancelled event cancelled even with a record", () => {
    assert.equal(rowStatus(row({ cancelled: true, attended: true })), "cancelled");
  });
});

describe("summarise", () => {
  it("counts attended and total", () => {
    const rows = [row({ attended: true }), row({ attended: true }), row()];
    assert.deepEqual(summarise(rows, JOINED), { attended: 2, total: 3 });
  });

  it("skips cancelled events", () => {
    const rows = [row({ attended: true }), row({ cancelled: true }), row({ cancelled: true, attended: true })];
    assert.deepEqual(summarise(rows, JOINED), { attended: 1, total: 1 });
  });

  it("skips events that ended before the member joined", () => {
    const early = row({ startsAt: "2030-01-01T10:00:00Z", endsAt: "2030-01-01T12:00:00Z", attended: true });
    assert.deepEqual(summarise([early, row()], JOINED), { attended: 0, total: 1 });
  });

  it("counts nothing for no events", () => {
    assert.deepEqual(summarise([], JOINED), { attended: 0, total: 0 });
  });
});

describe("summaryLabel", () => {
  it("reads 'Attended X of Y events'", () => {
    assert.equal(summaryLabel(12, 15), "Attended 12 of 15 events");
    assert.equal(summaryLabel(0, 3), "Attended 0 of 3 events");
  });

  it("uses the singular for one event", () => {
    assert.equal(summaryLabel(1, 1), "Attended 1 of 1 event");
  });

  it("never says '0 of 0'", () => {
    assert.equal(summaryLabel(0, 0), null);
  });
});

describe("parseHistory", () => {
  const raw = {
    joined_at: JOINED,
    events: [
      {
        event_id: "a",
        title: "One",
        starts_at: "2030-04-01T10:00:00Z",
        ends_at: "2030-04-01T12:00:00Z",
        status: "scheduled",
        attended: true,
        method: "manual",
        checked_in_at: "2030-04-01T10:05:00Z",
      },
      {
        event_id: "b",
        title: "Two",
        starts_at: "2030-04-02T10:00:00Z",
        ends_at: "2030-04-02T12:00:00Z",
        status: "cancelled",
        attended: false,
        method: null,
        checked_in_at: null,
      },
    ],
  };

  it("maps the database shape", () => {
    const parsed = parseHistory(raw);
    assert.equal(parsed?.joinedAt, JOINED);
    assert.equal(parsed?.rows.length, 2);
    assert.equal(parsed?.rows[0].method, "manual");
    assert.equal(parsed?.rows[1].cancelled, true);
    assert.equal(parsed?.rows[1].method, null);
  });

  it("rejects anything unexpected", () => {
    assert.equal(parseHistory(null), null);
    assert.equal(parseHistory({ joined_at: JOINED }), null);
    assert.equal(parseHistory({ joined_at: JOINED, events: [{ title: "x" }] }), null);
  });
});
