import type { DuesPeriod } from "@/src/app/(workspace)/dues-shared";
import type { DuesDashboardData, DuesMemberRow } from "@/src/lib/dues/dues-dashboard";
import { DEMO_MEMBER_LIST } from "@/src/lib/tour/demo/members";
import { dateDaysFromNow, isoDaysFromNow } from "@/src/lib/tour/demo/dates";

/**
 * Example dues for the officer tour: one open period, part way through
 * collecting, and one closed period from earlier. The numbers add up the way the
 * real dashboard's do: collected is the verified payments, expected is the active
 * members times the amount, outstanding is everyone not yet verified.
 */

const AMOUNT = 300;
export const DEMO_OPEN_PERIOD_ID = "00000000-0000-4000-8000-000000000201";

export const DEMO_DUES_PERIODS: DuesPeriod[] = [
  {
    id: DEMO_OPEN_PERIOD_ID,
    orgId: "demo",
    name: "1st Sem Membership Dues",
    amount: AMOUNT,
    dueOn: dateDaysFromNow(10),
    status: "open",
    paymentCount: 7,
    payToken: "demo-pay-token",
    payLinkActive: true,
    createdAt: isoDaysFromNow(-20),
    updatedAt: isoDaysFromNow(-2),
  },
  {
    id: "00000000-0000-4000-8000-000000000202",
    orgId: "demo",
    name: "Org Shirt Fund",
    amount: 450,
    dueOn: dateDaysFromNow(-40),
    status: "closed",
    paymentCount: 8,
    payToken: null,
    payLinkActive: false,
    createdAt: isoDaysFromNow(-70),
    updatedAt: isoDaysFromNow(-38),
  },
];

/** The eight active members (the demo roster minus the two still pending, and the first two) */
const ACTIVE = DEMO_MEMBER_LIST.filter((m) => m.status === "active");

function row(
  i: number,
  status: DuesMemberRow["duesStatus"],
  extra: Partial<DuesMemberRow> = {}
): DuesMemberRow {
  const member = ACTIVE[i];
  const paid = status !== "unpaid";
  return {
    memberId: member.id,
    fullName: member.fullName,
    email: member.email,
    memberStatus: "active",
    duesStatus: status,
    paymentId: paid ? `00000000-0000-4000-8000-0000000003${String(i).padStart(2, "0")}` : null,
    amount: paid ? AMOUNT : null,
    referenceNo: paid ? `${1200 + i * 37} ${5500 + i * 91} ${8800 + i * 13}` : null,
    paymentStatus: status === "paid" ? "verified" : status === "pending" ? "submitted" : status === "rejected" ? "rejected" : null,
    rejectReason: null,
    submittedAt: paid ? isoDaysFromNow(-(i + 1)) : null,
    reviewedAt: status === "paid" || status === "rejected" ? isoDaysFromNow(-i) : null,
    ...extra,
  };
}

export const DEMO_DUES_DASHBOARD: DuesDashboardData = {
  period: {
    id: DEMO_OPEN_PERIOD_ID,
    orgId: "demo",
    name: "1st Sem Membership Dues",
    amount: AMOUNT,
    dueOn: DEMO_DUES_PERIODS[0].dueOn,
    status: "open",
    payToken: "demo-pay-token",
    payLinkActive: true,
  },
  summary: {
    collectedAmount: 4 * AMOUNT,
    expectedAmount: ACTIVE.length * AMOUNT,
    outstandingAmount: 4 * AMOUNT,
    paidCount: 4,
    pendingCount: 2,
    rejectedCount: 1,
    unpaidCount: 1,
    activeMemberCount: ACTIVE.length,
    totalMemberCount: ACTIVE.length,
  },
  members: [
    row(0, "paid"),
    row(1, "paid"),
    row(2, "paid"),
    row(3, "paid"),
    row(4, "pending"),
    row(5, "pending"),
    row(6, "rejected", { rejectReason: "The reference number does not match the screenshot" }),
    row(7, "unpaid"),
  ],
  pagination: { page: 1, pageSize: 20, totalMatching: ACTIVE.length, totalPages: 1 },
};
