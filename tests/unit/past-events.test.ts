import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calculatePastEventsSummary,
  filterPastEvents,
  isPastOrCancelledEvent,
} from "../../src/lib/events/past-events.ts";
import type {
  PastEventLogItem,
  PastEventsFilterState,
  TermFilterOption,
} from "../../src/lib/events/past-events-types.ts";

describe("past-events: isPastOrCancelledEvent", () => {
  const referenceNow = new Date("2026-06-01T12:00:00Z");

  it("returns true for an event that ended before now", () => {
    const event = { endsAt: "2026-05-31T20:00:00Z", status: "scheduled" };
    assert.equal(isPastOrCancelledEvent(event, referenceNow), true);
  });

  it("returns false for an event that ends after now and is scheduled", () => {
    const event = { endsAt: "2026-06-02T10:00:00Z", status: "scheduled" };
    assert.equal(isPastOrCancelledEvent(event, referenceNow), false);
  });

  it("returns true for a cancelled event even if its endsAt is in the future", () => {
    const event = { endsAt: "2026-06-10T10:00:00Z", status: "cancelled" };
    assert.equal(isPastOrCancelledEvent(event, referenceNow), true);
  });

  it("returns true if endsAt exactly equals referenceNow", () => {
    const event = { endsAt: "2026-06-01T12:00:00Z", status: "scheduled" };
    assert.equal(isPastOrCancelledEvent(event, referenceNow), true);
  });
});

describe("past-events: calculatePastEventsSummary", () => {
  it("returns all zeros for empty events array", () => {
    const summary = calculatePastEventsSummary([]);
    assert.deepEqual(summary, {
      totalEvents: 0,
      completedEvents: 0,
      cancelledEvents: 0,
      totalAttendance: 0,
      averageAttendance: 0,
    });
  });

  it("handles cancelled events by excluding them from attendance totals", () => {
    const mockEvents: PastEventLogItem[] = [
      {
        id: "ev-1",
        orgId: "org-1",
        title: "General Assembly",
        startsAt: "2026-01-15T09:00:00Z",
        endsAt: "2026-01-15T12:00:00Z",
        location: "Auditorium",
        status: "scheduled",
        attendanceCount: 45,
        createdAt: "2026-01-01T00:00:00Z",
      },
      {
        id: "ev-2",
        orgId: "org-1",
        title: "Cancelled Workshop",
        startsAt: "2026-02-10T09:00:00Z",
        endsAt: "2026-02-10T12:00:00Z",
        location: "Room 101",
        status: "cancelled",
        attendanceCount: null,
        createdAt: "2026-01-05T00:00:00Z",
      },
      {
        id: "ev-3",
        orgId: "org-1",
        title: "Tech Talk",
        startsAt: "2026-03-05T13:00:00Z",
        endsAt: "2026-03-05T15:00:00Z",
        location: "AVR",
        status: "scheduled",
        attendanceCount: 55,
        createdAt: "2026-02-01T00:00:00Z",
      },
    ];

    const summary = calculatePastEventsSummary(mockEvents);
    assert.equal(summary.totalEvents, 3);
    assert.equal(summary.completedEvents, 2);
    assert.equal(summary.cancelledEvents, 1);
    assert.equal(summary.totalAttendance, 100);
    assert.equal(summary.averageAttendance, 50);
  });

  it("handles events with 0 attendance without breaking division or totals", () => {
    const mockEvents: PastEventLogItem[] = [
      {
        id: "ev-1",
        orgId: "org-1",
        title: "Low turnout meetup",
        startsAt: "2026-04-01T10:00:00Z",
        endsAt: "2026-04-01T11:00:00Z",
        location: "Lab",
        status: "scheduled",
        attendanceCount: 0,
        createdAt: "2026-03-01T00:00:00Z",
      },
      {
        id: "ev-2",
        orgId: "org-1",
        title: "Regular meetup",
        startsAt: "2026-04-15T10:00:00Z",
        endsAt: "2026-04-15T11:00:00Z",
        location: "Lab",
        status: "scheduled",
        attendanceCount: 10,
        createdAt: "2026-03-01T00:00:00Z",
      },
    ];

    const summary = calculatePastEventsSummary(mockEvents);
    assert.equal(summary.totalEvents, 2);
    assert.equal(summary.completedEvents, 2);
    assert.equal(summary.cancelledEvents, 0);
    assert.equal(summary.totalAttendance, 10);
    assert.equal(summary.averageAttendance, 5);
  });

  it("returns average 0 when all events are cancelled", () => {
    const mockEvents: PastEventLogItem[] = [
      {
        id: "ev-1",
        orgId: "org-1",
        title: "Cancelled 1",
        startsAt: "2026-01-01T10:00:00Z",
        endsAt: "2026-01-01T11:00:00Z",
        location: null,
        status: "cancelled",
        attendanceCount: null,
        createdAt: "2026-01-01T00:00:00Z",
      },
    ];
    const summary = calculatePastEventsSummary(mockEvents);
    assert.equal(summary.totalEvents, 1);
    assert.equal(summary.completedEvents, 0);
    assert.equal(summary.cancelledEvents, 1);
    assert.equal(summary.totalAttendance, 0);
    assert.equal(summary.averageAttendance, 0);
  });
});

describe("past-events: filterPastEvents", () => {
  const terms: TermFilterOption[] = [
    {
      termName: "A.Y. 2025–2026",
      startDate: "2025-06-01",
      endDate: "2026-05-31",
    },
    {
      termName: "A.Y. 2024–2025",
      startDate: "2024-06-01",
      endDate: "2025-05-31",
    },
  ];

  const mockEvents: PastEventLogItem[] = [
    {
      id: "ev-old",
      orgId: "org-1",
      title: "Orientation 2024",
      startsAt: "2024-08-15T09:00:00Z",
      endsAt: "2024-08-15T12:00:00Z",
      location: "Gymnasium",
      status: "scheduled",
      attendanceCount: 120,
      createdAt: "2024-08-01T00:00:00Z",
    },
    {
      id: "ev-new-1",
      orgId: "org-1",
      title: "Hackathon 2025",
      startsAt: "2025-10-20T08:00:00Z",
      endsAt: "2025-10-20T18:00:00Z",
      location: "Innovation Hub",
      status: "scheduled",
      attendanceCount: 75,
      createdAt: "2025-10-01T00:00:00Z",
    },
    {
      id: "ev-new-2",
      orgId: "org-1",
      title: "Coding Seminar",
      startsAt: "2026-02-14T13:00:00Z",
      endsAt: "2026-02-14T16:00:00Z",
      location: "Room 304",
      status: "scheduled",
      attendanceCount: 30,
      createdAt: "2026-02-01T00:00:00Z",
    },
    {
      id: "ev-new-cancelled",
      orgId: "org-1",
      title: "Cancelled Socials",
      startsAt: "2026-03-01T17:00:00Z",
      endsAt: "2026-03-01T20:00:00Z",
      location: "Quadrangle",
      status: "cancelled",
      attendanceCount: null,
      createdAt: "2026-02-15T00:00:00Z",
    },
  ];

  it("filters by specific term", () => {
    const filter: PastEventsFilterState = { term: "A.Y. 2024–2025" };
    const filtered = filterPastEvents(mockEvents, filter, terms);
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].title, "Orientation 2024");
  });

  it("returns all events when term is 'all'", () => {
    const filter: PastEventsFilterState = { term: "all" };
    const filtered = filterPastEvents(mockEvents, filter, terms);
    assert.equal(filtered.length, 4);
  });

  it("filters by custom date range (from and to)", () => {
    const filter: PastEventsFilterState = {
      term: "all",
      fromDate: "2025-10-01",
      toDate: "2026-02-28",
    };
    const filtered = filterPastEvents(mockEvents, filter, terms);
    assert.deepEqual(
      filtered.map((e) => e.id),
      ["ev-new-1", "ev-new-2"]
    );
  });

  it("filters by search keyword matching title", () => {
    const filter: PastEventsFilterState = { term: "all", search: "Hackathon" };
    const filtered = filterPastEvents(mockEvents, filter, terms);
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].id, "ev-new-1");
  });

  it("filters by search keyword matching location", () => {
    const filter: PastEventsFilterState = { term: "all", search: "Innovation Hub" };
    const filtered = filterPastEvents(mockEvents, filter, terms);
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].location, "Innovation Hub");
  });

  it("safely handles null locations when searching", () => {
    const filter: PastEventsFilterState = { term: "all", search: "Socials" };
    const filtered = filterPastEvents(mockEvents, filter, terms);
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].id, "ev-new-cancelled");
  });
});
