import type { OrgHealthData } from "../../src/lib/health/org-health.ts";

/**
 * A healthy org with data in every area, as of 2026-12-01. Tests change only
 * what they are about. Not a test file (no ".test." in the name).
 */
export function healthy(overrides: Partial<OrgHealthData> = {}): OrgHealthData {
  return {
    today: "2026-12-01",
    generatedAt: "2026-12-01T02:00:00Z",
    members: { active: 40, pending: 0, inactive: 3, joined30d: 6, joinedPrev30d: 4, oldestPendingDays: null, joinedWeekly: [2, 1, 3, 2, 1, 4, 3, 2] },
    dues: {
      periodId: "p1",
      name: "1st Sem Dues",
      amount: 100,
      dueOn: "2026-12-21",
      createdOn: "2026-11-21",
      activeMembers: 40,
      paid: 30,
      pending: 0,
      rejected: 0,
      unpaid: 10,
      collected: 3000,
      expected: 4000,
      outstanding: 1000,
    },
    events: {
      total: 8,
      upcoming: 2,
      nextEvent: { id: "e1", title: "General assembly", startsAt: "2026-12-05T08:00:00Z" },
      held90d: 4,
      turnoutPct90d: 62,
      heldPrev90d: 3,
      turnoutPctPrev90d: 60,
      recent: [
        { title: "Orientation", startsAt: "2026-09-10T06:00:00Z", turnoutPct: 55 },
        { title: "Workshop", startsAt: "2026-09-24T06:00:00Z", turnoutPct: 58 },
        { title: "Outreach", startsAt: "2026-10-08T06:00:00Z", turnoutPct: 60 },
        { title: "Assembly", startsAt: "2026-11-05T06:00:00Z", turnoutPct: 66 },
      ],
    },
    officers: { withAccess: 6, termsTotal: 6, termsCurrent: 6, termsEnding30d: 0, nextTermEnd: "2027-03-31" },
    handover: {
      endingTotal: 0,
      endingReady: 0,
      endingDraft: 0,
      endingMissing: 0,
      roles: [],
      guidesReady: 3,
      guidesDraft: 0,
    },
    documents: { total: 7, categoriesCovered: 4 },
    ...overrides,
  };
}

/** A workspace that was just created: nothing to measure yet */
export function brandNew(): OrgHealthData {
  return healthy({
    members: { active: 0, pending: 0, inactive: 0, joined30d: 0, joinedPrev30d: 0, oldestPendingDays: null, joinedWeekly: [0, 0, 0, 0, 0, 0, 0, 0] },
    dues: null,
    events: {
      total: 0,
      upcoming: 0,
      nextEvent: null,
      held90d: 0,
      turnoutPct90d: null,
      heldPrev90d: 0,
      turnoutPctPrev90d: null,
      recent: [],
    },
    officers: { withAccess: 1, termsTotal: 0, termsCurrent: 0, termsEnding30d: 0, nextTermEnd: null },
    handover: {
      endingTotal: 0,
      endingReady: 0,
      endingDraft: 0,
      endingMissing: 0,
      roles: [],
      guidesReady: 0,
      guidesDraft: 0,
    },
    documents: { total: 0, categoriesCovered: 0 },
  });
}
