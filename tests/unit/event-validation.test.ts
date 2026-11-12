import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  EVENT_MESSAGES,
  fromDatetimeLocal,
  isPastEvent,
  sortEvents,
  toDatetimeLocal,
  validateEvent,
} from "../../src/lib/events/event-validation.ts";

const START = "2030-05-01T10:00:00.000Z";
const END = "2030-05-01T12:00:00.000Z";

describe("validateEvent", () => {
  it("accepts a full event and a title-and-times event with no location", () => {
    const full = validateEvent({ title: "General meeting", startsAt: START, endsAt: END, location: "Room 4" });
    assert.ok(full.valid);
    assert.equal(full.location, "Room 4");

    for (const location of [undefined, null, "", "   "]) {
      const bare = validateEvent({ title: "Workshop", startsAt: START, endsAt: END, location });
      assert.ok(bare.valid);
      assert.equal(bare.location, null);
    }
  });

  it("rejects a 1-character title and a 101-character title", () => {
    for (const title of ["a", " a ", "x".repeat(101), ""]) {
      const result = validateEvent({ title, startsAt: START, endsAt: END });
      assert.ok(!result.valid);
      assert.equal(result.field, "title");
      assert.equal(result.error, EVENT_MESSAGES.titleInvalid);
    }
  });

  it("accepts titles at the 2 and 100 character limits", () => {
    assert.ok(validateEvent({ title: "ab", startsAt: START, endsAt: END }).valid);
    assert.ok(validateEvent({ title: "x".repeat(100), startsAt: START, endsAt: END }).valid);
  });

  it("collapses extra whitespace in the title", () => {
    const result = validateEvent({ title: "  Board   meeting ", startsAt: START, endsAt: END });
    assert.ok(result.valid);
    assert.equal(result.title, "Board meeting");
  });

  it("rejects an end before or equal to the start", () => {
    for (const endsAt of ["2030-05-01T09:00:00.000Z", START]) {
      const result = validateEvent({ title: "Meeting", startsAt: START, endsAt });
      assert.ok(!result.valid);
      assert.equal(result.field, "endsAt");
      assert.equal(result.error, EVENT_MESSAGES.endBeforeStart);
    }
  });

  it("rejects a missing or unreadable time", () => {
    const noStart = validateEvent({ title: "Meeting", startsAt: "", endsAt: END });
    assert.ok(!noStart.valid && noStart.field === "startsAt");
    const badEnd = validateEvent({ title: "Meeting", startsAt: START, endsAt: "not a date" });
    assert.ok(!badEnd.valid && badEnd.field === "endsAt");
  });

  it("rejects a location over 200 characters", () => {
    const result = validateEvent({ title: "Meeting", startsAt: START, endsAt: END, location: "x".repeat(201) });
    assert.ok(!result.valid && result.field === "location");
  });
});

describe("sortEvents", () => {
  const now = new Date("2030-06-01T00:00:00Z").getTime();
  const ev = (id: string, startsAt: string, endsAt: string) => ({ id, startsAt, endsAt });

  it("puts upcoming first (soonest first), then past (most recent first)", () => {
    const sorted = sortEvents(
      [
        ev("past-old", "2030-01-01T10:00:00Z", "2030-01-01T11:00:00Z"),
        ev("later", "2030-08-01T10:00:00Z", "2030-08-01T11:00:00Z"),
        ev("past-new", "2030-05-01T10:00:00Z", "2030-05-01T11:00:00Z"),
        ev("soon", "2030-06-10T10:00:00Z", "2030-06-10T11:00:00Z"),
      ],
      now
    );
    assert.deepEqual(sorted.map((e) => e.id), ["soon", "later", "past-new", "past-old"]);
  });

  it("treats an event still running as upcoming", () => {
    const running = ev("running", "2030-05-31T23:00:00Z", "2030-06-01T01:00:00Z");
    assert.equal(isPastEvent(running, now), false);
    assert.equal(sortEvents([ev("p", "2030-01-01T10:00:00Z", "2030-01-01T11:00:00Z"), running], now)[0].id, "running");
  });
});

describe("datetime-local helpers", () => {
  it("round-trips an instant through the local input format", () => {
    const local = toDatetimeLocal(START);
    assert.match(local, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    assert.equal(fromDatetimeLocal(local), START);
  });

  it("returns an empty string for empty or invalid input", () => {
    assert.equal(fromDatetimeLocal(""), "");
    assert.equal(fromDatetimeLocal("nope"), "");
    assert.equal(toDatetimeLocal("nope"), "");
  });
});
