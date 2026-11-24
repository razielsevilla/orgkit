import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getPastEventsLog } from "@/src/app/(workspace)/events-log-actions";

interface FakeState {
  user: { id: string } | null;
  callerRole: string | null;
  org: { id: string; name: string } | null;
  events: Record<string, unknown>[];
  attendance: { event_id: string; org_id: string }[];
  terms: { term_name: string; start_date: string; end_date: string; org_id: string }[];
}

const state: FakeState = {
  user: null,
  callerRole: null,
  org: null,
  events: [],
  attendance: [],
  terms: [],
};

function query(table: string) {
  let filterOrgId: string | null = null;

  const builder: Record<string, unknown> = {
    select: () => builder,
    order: () => builder,
    eq: (col: string, val: string) => {
      if (col === "org_id" || col === "id") filterOrgId = val;
      return builder;
    },
    maybeSingle: async () => {
      if (table === "org_officers") {
        return { data: state.callerRole ? { role: state.callerRole } : null, error: null };
      }
      if (table === "orgs") {
        return { data: state.org, error: null };
      }
      return { data: null, error: null };
    },
    then: (resolve: (v: unknown) => unknown) => {
      if (table === "events") {
        const filtered = state.events.filter((e) => !filterOrgId || e.org_id === filterOrgId);
        return resolve({ data: filtered, error: null });
      }
      if (table === "attendance") {
        const filtered = state.attendance.filter((a) => !filterOrgId || a.org_id === filterOrgId);
        return resolve({ data: filtered, error: null });
      }
      if (table === "officer_terms") {
        const filtered = state.terms.filter((t) => !filterOrgId || t.org_id === filterOrgId);
        return resolve({ data: filtered, error: null });
      }
      return resolve({ data: [], error: null });
    },
  };

  return builder;
}

const fakeClient = {
  auth: {
    getUser: async () => ({ data: { user: state.user } }),
  },
  from: (table: string) => query(table),
};

vi.mock("@/src/lib/supabase/server", () => ({
  createClient: async () => fakeClient,
}));

const TARGET_ORG = "11111111-1111-4111-8111-111111111111";

describe("events-log-actions: getPastEventsLog", () => {
  beforeEach(() => {
    state.user = { id: "officer-user-1" };
    state.callerRole = "officer";
    state.org = { id: TARGET_ORG, name: "Robotics Club" };
    state.events = [];
    state.attendance = [];
    state.terms = [];
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("fails with invalid_request for non-uuid org ID without querying database", async () => {
    const res = await getPastEventsLog("malformed-id");
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error).toBe("invalid_request");
    }
  });

  it("fails with not_authenticated if no user is signed in", async () => {
    state.user = null;
    const res = await getPastEventsLog(TARGET_ORG);
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error).toBe("not_authenticated");
    }
  });

  it("fails with access_revoked if user is not an officer in target org", async () => {
    state.callerRole = null;
    const res = await getPastEventsLog(TARGET_ORG);
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error).toBe("access_revoked");
    }
  });

  it("loads ended and cancelled events, maps attendance counts, and excludes future scheduled events", async () => {
    state.events = [
      {
        id: "ev-ended-1",
        org_id: TARGET_ORG,
        title: "Intro to Python",
        starts_at: "2026-01-10T10:00:00Z",
        ends_at: "2026-01-10T12:00:00Z",
        location: "Room 101",
        status: "scheduled",
        created_at: "2026-01-01T00:00:00Z",
      },
      {
        id: "ev-cancelled",
        org_id: TARGET_ORG,
        title: "Cancelled Hackathon",
        starts_at: "2026-02-15T09:00:00Z",
        ends_at: "2026-02-15T18:00:00Z",
        location: null,
        status: "cancelled",
        created_at: "2026-02-01T00:00:00Z",
      },
      {
        id: "ev-zero-attendance",
        org_id: TARGET_ORG,
        title: "Empty Study Session",
        starts_at: "2026-03-01T14:00:00Z",
        ends_at: "2026-03-01T16:00:00Z",
        location: "Library",
        status: "scheduled",
        created_at: "2026-02-20T00:00:00Z",
      },
      {
        id: "ev-future-scheduled",
        org_id: TARGET_ORG,
        title: "Far Future Gala",
        starts_at: "2030-05-01T18:00:00Z",
        ends_at: "2030-05-01T22:00:00Z",
        location: "Grand Ballroom",
        status: "scheduled",
        created_at: "2026-03-01T00:00:00Z",
      },
    ];

    state.attendance = [
      { event_id: "ev-ended-1", org_id: TARGET_ORG },
      { event_id: "ev-ended-1", org_id: TARGET_ORG },
      { event_id: "ev-ended-1", org_id: TARGET_ORG },
    ];

    state.terms = [
      {
        org_id: TARGET_ORG,
        term_name: "A.Y. 2025–2026",
        start_date: "2025-06-01",
        end_date: "2026-05-31",
      },
    ];

    const res = await getPastEventsLog(TARGET_ORG);
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.orgName).toBe("Robotics Club");
      // Future scheduled event must NOT appear
      expect(res.data.events.some((e) => e.id === "ev-future-scheduled")).toBe(false);

      // Ended event with attendance
      const ended1 = res.data.events.find((e) => e.id === "ev-ended-1");
      expect(ended1).toBeDefined();
      expect(ended1?.attendanceCount).toBe(3);

      // Cancelled event must have null attendanceCount
      const cancelled = res.data.events.find((e) => e.id === "ev-cancelled");
      expect(cancelled).toBeDefined();
      expect(cancelled?.attendanceCount).toBeNull();
      expect(cancelled?.status).toBe("cancelled");

      // Zero attendance event must have 0 attendanceCount
      const zeroAtt = res.data.events.find((e) => e.id === "ev-zero-attendance");
      expect(zeroAtt).toBeDefined();
      expect(zeroAtt?.attendanceCount).toBe(0);

      // Summary checks
      expect(res.data.summary.totalEvents).toBe(3);
      expect(res.data.summary.completedEvents).toBe(2);
      expect(res.data.summary.cancelledEvents).toBe(1);
      expect(res.data.summary.totalAttendance).toBe(3);
      expect(res.data.summary.averageAttendance).toBe(2); // Math.round(3 / 2) = 2

      // Term options
      expect(res.data.terms).toHaveLength(1);
      expect(res.data.terms[0].termName).toBe("A.Y. 2025–2026");
    }
  });
});
