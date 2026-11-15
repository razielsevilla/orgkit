import { describe, expect, it, vi } from "vitest";
import { createElement, type ReactNode } from "react";
import { renderToReadableStream } from "react-dom/server";
import type { DuesPeriod } from "@/src/app/(workspace)/dues-actions";
import type { DuesDashboardData } from "@/src/lib/dues/dues-dashboard";

vi.mock("@/src/components/ui/dialog", () => ({
  Dialog: ({ children }: { children: ReactNode }) =>
    createElement("div", { role: "dialog" }, children),
  DialogHeader: ({ titleId, title }: { titleId: string; title: string }) =>
    createElement("div", null, createElement("h2", { id: titleId }, title)),
  DialogBody: ({ children }: { children: ReactNode }) =>
    createElement("div", null, children),
  DialogFooter: ({ children }: { children: ReactNode }) =>
    createElement("div", null, children),
  DialogButton: ({ children, ...props }: { children: ReactNode }) =>
    createElement("button", { type: "button", ...props }, children),
}));

const mockDashboardData: DuesDashboardData = {
  period: {
    id: "period-1",
    orgId: "org-1",
    name: "1st Sem Membership Dues",
    amount: 250.0,
    dueOn: "2026-12-15",
    status: "open",
    payToken: "pay-token-123",
    payLinkActive: true,
  },
  summary: {
    collectedAmount: 500.0,
    expectedAmount: 1000.0,
    outstandingAmount: 500.0,
    paidCount: 2,
    pendingCount: 1,
    rejectedCount: 1,
    unpaidCount: 2,
    activeMemberCount: 4,
    totalMemberCount: 5,
  },
  members: [
    {
      memberId: "m-1",
      fullName: "Alice Cooper",
      email: "alice@school.edu",
      memberStatus: "active",
      duesStatus: "paid",
      paymentId: "p-1",
      amount: 250.0,
      referenceNo: "GCASH-1111",
      paymentStatus: "verified",
      rejectReason: null,
      submittedAt: "2026-11-01T10:00:00Z",
      reviewedAt: "2026-11-02T10:00:00Z",
    },
    {
      memberId: "m-2",
      fullName: "Bob Builder",
      email: "bob@school.edu",
      memberStatus: "active",
      duesStatus: "pending",
      paymentId: "p-2",
      amount: 250.0,
      referenceNo: "GCASH-2222",
      paymentStatus: "submitted",
      rejectReason: null,
      submittedAt: "2026-11-03T10:00:00Z",
      reviewedAt: null,
    },
    {
      memberId: "m-3",
      fullName: "Charlie Brown",
      email: "charlie@school.edu",
      memberStatus: "active",
      duesStatus: "rejected",
      paymentId: "p-3",
      amount: 250.0,
      referenceNo: "GCASH-3333",
      paymentStatus: "rejected",
      rejectReason: "Screenshot blurred",
      submittedAt: "2026-11-04T10:00:00Z",
      reviewedAt: "2026-11-04T12:00:00Z",
    },
    {
      memberId: "m-4",
      fullName: "Diana Prince",
      email: "diana@school.edu",
      memberStatus: "active",
      duesStatus: "unpaid",
      paymentId: null,
      amount: null,
      referenceNo: null,
      paymentStatus: null,
      rejectReason: null,
      submittedAt: null,
      reviewedAt: null,
    },
    {
      memberId: "m-5",
      fullName: "Evan Deactivated",
      email: "evan@school.edu",
      memberStatus: "inactive",
      duesStatus: "paid",
      paymentId: "p-5",
      amount: 250.0,
      referenceNo: "GCASH-5555",
      paymentStatus: "verified",
      rejectReason: null,
      submittedAt: "2026-11-01T08:00:00Z",
      reviewedAt: "2026-11-01T09:00:00Z",
    },
  ],
  pagination: {
    page: 1,
    pageSize: 20,
    totalMatching: 5,
    totalPages: 1,
  },
};

vi.mock("@/src/app/(workspace)/dues-actions", () => ({
  createDuesPeriod: vi.fn(),
  updateDuesPeriod: vi.fn(),
  closeDuesPeriod: vi.fn(),
  getDuesDashboardData: vi.fn().mockResolvedValue({
    success: true,
    data: mockDashboardData,
  }),
  getDuesReviewQueue: vi.fn().mockResolvedValue({
    success: true,
    data: [],
  }),
  getPaymentScreenshotUrl: vi.fn(),
  verifyDuesPayment: vi.fn(),
  rejectDuesPayment: vi.fn(),
}));

const { DuesClient } = await import(
  "@/src/components/workspace/dues/dues-client"
);

async function render(element: ReturnType<typeof createElement>): Promise<string> {
  const stream = await renderToReadableStream(element);
  await stream.allReady;
  return (await new Response(stream).text()).replace(/<!-- -->/g, "");
}

const mockPeriods: DuesPeriod[] = [
  {
    id: "period-1",
    orgId: "org-1",
    name: "1st Sem Membership Dues",
    amount: 250.0,
    dueOn: "2026-12-15",
    status: "open",
    paymentCount: 15,
    createdAt: "2026-11-01T00:00:00Z",
    updatedAt: "2026-11-01T00:00:00Z",
  },
];

describe("Dues Dashboard End-to-End Integration Flow", () => {
  it("renders full dashboard view when periods exist", async () => {
    const html = await render(
      createElement(DuesClient, {
        rawId: "org-1",
        initialPeriods: mockPeriods,
        initialDashboardData: mockDashboardData,
        siteUrl: "http://localhost:3000",
      })
    );

    // Header & Period Picker
    expect(html).toContain("Dues");
    expect(html).toContain("1st Sem Membership Dues (Open)");
    expect(html).toContain("₱250.00 / member");
    expect(html).toContain("Pay Link");
    expect(html).toContain("Close Period");

    // Collection banner & Summary Tiles
    expect(html).toContain("Collected ₱500.00 of ₱1,000.00");
    expect(html).toContain("50% collected");
    expect(html).toContain("Outstanding");
    expect(html).toContain("Paid");
    expect(html).toContain("Pending review");
    expect(html).toContain("Rejected");
    expect(html).toContain("Unpaid");

    // Status filter tabs & Search
    expect(html).toContain('role="tablist"');
    expect(html).toContain('placeholder="Search by name or email..."');

    // Desktop and mobile member views
    expect(html).toContain("Alice Cooper");
    expect(html).toContain("Bob Builder");
    expect(html).toContain("Charlie Brown");
    expect(html).toContain("Diana Prince");
    expect(html).toContain("Evan Deactivated");

    // Check inactive indicator
    expect(html).toContain("Inactive");

    // Check references
    expect(html).toContain("GCASH-1111");
    expect(html).toContain("GCASH-2222");
    expect(html).toContain("GCASH-3333");
  });

  it("renders empty state when organization has no dues periods yet", async () => {
    const html = await render(
      createElement(DuesClient, {
        rawId: "org-1",
        initialPeriods: [],
      })
    );

    expect(html).toContain("No dues periods yet");
    expect(html).toContain("Create your first dues period to set the amount");
  });
});
