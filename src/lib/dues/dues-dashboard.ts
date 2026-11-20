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

/**
 * Formats a numeric amount in Philippine Pesos with thousands separators.
 * Amounts are stored with two decimal places.
 */
export function formatPeso(
  amount: number | string | null | undefined,
  options: { showDecimals?: boolean } = {}
): string {
  const { showDecimals = true } = options;
  if (amount === null || amount === undefined || amount === "") {
    return showDecimals ? "₱0.00" : "₱0";
  }

  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (Number.isNaN(num)) {
    return showDecimals ? "₱0.00" : "₱0";
  }

  const formatted = new Intl.NumberFormat("en-PH", {
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  }).format(num);

  return `₱${formatted}`;
}

/**
 * Calculates collection rate percentage from collected and expected totals.
 * Handles edge case where expected is 0 or negative without division by zero.
 */
export function calculateCollectionRate(
  collected: number | null | undefined,
  expected: number | null | undefined,
  clampAt100 = true
): number {
  const coll = collected ?? 0;
  const exp = expected ?? 0;

  if (exp <= 0 || coll <= 0) {
    return 0;
  }

  const rate = Math.round((coll / exp) * 100);
  return clampAt100 ? Math.min(rate, 100) : rate;
}

interface RawMemberRow {
  member_id?: string;
  full_name?: string;
  email?: string;
  member_status?: DuesMemberRow["memberStatus"];
  dues_status?: DuesMemberStatus;
  payment_id?: string | null;
  amount?: number | string | null;
  reference_no?: string | null;
  payment_status?: DuesMemberRow["paymentStatus"];
  reject_reason?: string | null;
  submitted_at?: string | null;
  reviewed_at?: string | null;
}

/**
 * Safely maps the raw JSON response from get_dues_period_dashboard RPC into typed DuesDashboardData.
 */
export function mapDashboardRpcResponse(raw: unknown): DuesDashboardData {
  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid dashboard RPC response");
  }

  const rawObj = raw as Record<string, unknown>;
  const periodRaw = (rawObj.period || {}) as Record<string, unknown>;
  const summaryRaw = (rawObj.summary || {}) as Record<string, unknown>;
  const membersRaw = Array.isArray(rawObj.members) ? (rawObj.members as RawMemberRow[]) : [];
  const paginationRaw = (rawObj.pagination || {}) as Record<string, unknown>;

  return {
    period: {
      id: String(periodRaw.id || ""),
      orgId: String(periodRaw.org_id || ""),
      name: String(periodRaw.name || ""),
      amount: typeof periodRaw.amount === "number" ? periodRaw.amount : parseFloat(String(periodRaw.amount || "0")),
      dueOn: String(periodRaw.due_on || ""),
      status: periodRaw.status === "closed" ? "closed" : "open",
      payToken: periodRaw.pay_token ? String(periodRaw.pay_token) : null,
      payLinkActive: Boolean(periodRaw.pay_link_active),
    },
    summary: {
      collectedAmount: typeof summaryRaw.collected_amount === "number" ? summaryRaw.collected_amount : parseFloat(String(summaryRaw.collected_amount || "0")),
      expectedAmount: typeof summaryRaw.expected_amount === "number" ? summaryRaw.expected_amount : parseFloat(String(summaryRaw.expected_amount || "0")),
      outstandingAmount: typeof summaryRaw.outstanding_amount === "number" ? summaryRaw.outstanding_amount : parseFloat(String(summaryRaw.outstanding_amount || "0")),
      paidCount: Number(summaryRaw.paid_count || 0),
      pendingCount: Number(summaryRaw.pending_count || 0),
      rejectedCount: Number(summaryRaw.rejected_count || 0),
      unpaidCount: Number(summaryRaw.unpaid_count || 0),
      activeMemberCount: Number(summaryRaw.active_member_count || 0),
      totalMemberCount: Number(summaryRaw.total_member_count || 0),
    },
    members: membersRaw.map((m: RawMemberRow) => ({
      memberId: m.member_id || "",
      fullName: m.full_name || "",
      email: m.email || "",
      memberStatus: (m.member_status || "active") as DuesMemberRow["memberStatus"],
      duesStatus: (m.dues_status || "unpaid") as DuesMemberStatus,
      paymentId: m.payment_id || null,
      amount: m.amount !== null && m.amount !== undefined ? (typeof m.amount === "number" ? m.amount : parseFloat(String(m.amount))) : null,
      referenceNo: m.reference_no || null,
      paymentStatus: m.payment_status || null,
      rejectReason: m.reject_reason || null,
      submittedAt: m.submitted_at || null,
      reviewedAt: m.reviewed_at || null,
    })),
    pagination: {
      page: Number(paginationRaw.page || 1),
      pageSize: Number(paginationRaw.page_size || DUES_PAGE_SIZE),
      totalMatching: Number(paginationRaw.total_matching || 0),
      totalPages: Number(paginationRaw.total_pages || 0),
    },
  };
}
