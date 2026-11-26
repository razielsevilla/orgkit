import type { OrgHealthData } from "@/src/lib/health/org-health";
import { DEMO_DUES_PERIODS, DEMO_DUES_DASHBOARD } from "@/src/lib/tour/demo/dues";
import { dateDaysFromNow, isoDaysFromNow } from "@/src/lib/tour/demo/dates";

/**
 * Example Home for the officer tour: a young org that is mostly fine, with a
 * couple of things to look at, so the chips, the Do next list and every card
 * have something real-looking in them. It agrees with the other example pages:
 * the same dues period and counts, the same terms ending in about 50 days.
 */
export function demoHealthData(): OrgHealthData {
  const dues = DEMO_DUES_PERIODS[0];
  const s = DEMO_DUES_DASHBOARD.summary;

  return {
    today: dateDaysFromNow(0),
    generatedAt: isoDaysFromNow(0),
    members: {
      active: 8,
      pending: 2,
      inactive: 2,
      joined30d: 7,
      joinedPrev30d: 3,
      oldestPendingDays: 3,
      joinedWeekly: [0, 1, 1, 2, 1, 2, 2, 1],
    },
    dues: {
      periodId: dues.id,
      name: dues.name,
      amount: dues.amount,
      dueOn: dues.dueOn,
      createdOn: dues.createdAt.slice(0, 10),
      activeMembers: s.activeMemberCount,
      paid: s.paidCount,
      pending: s.pendingCount,
      rejected: s.rejectedCount,
      unpaid: s.unpaidCount,
      collected: s.collectedAmount,
      expected: s.expectedAmount,
      outstanding: s.outstandingAmount,
    },
    events: {
      total: 6,
      upcoming: 2,
      nextEvent: { id: "00000000-0000-4000-8000-000000000401", title: "General Assembly", startsAt: isoDaysFromNow(1) },
      held90d: 3,
      turnoutPct90d: 68,
      heldPrev90d: 2,
      turnoutPctPrev90d: 61,
      recent: [
        { title: "Officers' Meeting", startsAt: isoDaysFromNow(-36), turnoutPct: 70 },
        { title: "Community Outreach Drive", startsAt: isoDaysFromNow(-22), turnoutPct: 64 },
        { title: "Orientation Day", startsAt: isoDaysFromNow(-8), turnoutPct: 71 },
      ],
    },
    officers: { withAccess: 3, termsTotal: 6, termsCurrent: 3, termsEnding30d: 0, nextTermEnd: dateDaysFromNow(50) },
    handover: {
      endingTotal: 2,
      endingReady: 0,
      endingDraft: 1,
      endingMissing: 1,
      roles: [
        { roleTitle: "Treasurer", endDate: dateDaysFromNow(50), guideStatus: "draft" },
        { roleTitle: "Vice President", endDate: dateDaysFromNow(50), guideStatus: "missing" },
      ],
      guidesReady: 1,
      guidesDraft: 1,
    },
    documents: { total: 5, categoriesCovered: 5 },
  };
}
