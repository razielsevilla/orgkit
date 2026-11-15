/**
 * Domain types and interfaces for the Dues Status Dashboard (Ticket P4).
 */

export const DUES_STATUS_FILTERS = ["all", "paid", "pending", "rejected", "unpaid"] as const;
export type DuesStatusFilter = (typeof DUES_STATUS_FILTERS)[number];

export const DUES_MEMBER_STATUSES = ["paid", "pending", "rejected", "unpaid"] as const;
export type DuesMemberStatus = (typeof DUES_MEMBER_STATUSES)[number];

export interface DuesPeriodInfo {
  id: string;
  orgId: string;
  name: string;
  amount: number;
  dueOn: string;
  status: "open" | "closed";
  payToken: string | null;
  payLinkActive: boolean;
}

export interface DuesPeriodSummary {
  collectedAmount: number;
  expectedAmount: number;
  outstandingAmount: number;
  paidCount: number;
  pendingCount: number;
  rejectedCount: number;
  unpaidCount: number;
  activeMemberCount: number;
  totalMemberCount: number;
}

export interface DuesMemberRow {
  memberId: string;
  fullName: string;
  email: string;
  memberStatus: "active" | "inactive" | "pending";
  duesStatus: DuesMemberStatus;
  paymentId: string | null;
  amount: number | null;
  referenceNo: string | null;
  paymentStatus: "submitted" | "verified" | "rejected" | null;
  rejectReason: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
}

export interface DuesDashboardPagination {
  page: number;
  pageSize: number;
  totalMatching: number;
  totalPages: number;
}

export interface DuesDashboardData {
  period: DuesPeriodInfo;
  summary: DuesPeriodSummary;
  members: DuesMemberRow[];
  pagination: DuesDashboardPagination;
}

export const DUES_PAGE_SIZE = 20;
