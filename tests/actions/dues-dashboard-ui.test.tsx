import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToReadableStream } from "react-dom/server";
import type { DuesPeriod } from "@/src/app/(workspace)/dues-actions";
import type { DuesPeriodSummary } from "@/src/lib/dues/dues-dashboard";

const { DuesPeriodPicker } = await import(
  "@/src/components/workspace/dues/dues-period-picker"
);
const { DuesSummaryTiles } = await import(
  "@/src/components/workspace/dues/dues-summary-tiles"
);
const { DuesDashboardSkeleton } = await import(
  "@/src/components/workspace/dues/dues-dashboard-skeleton"
);
const { DuesDashboardError } = await import(
  "@/src/components/workspace/dues/dues-dashboard-error"
);
const { DuesMemberStatusPill } = await import(
  "@/src/components/workspace/dues/dues-member-status-pill"
);
const { DuesSearchFilter } = await import(
  "@/src/components/workspace/dues/dues-search-filter"
);
const { DuesMemberTable } = await import(
  "@/src/components/workspace/dues/dues-member-table"
);
const { DuesMemberPager } = await import(
  "@/src/components/workspace/dues/dues-member-pager"
);
const { DuesDashboardEmpty } = await import(
  "@/src/components/workspace/dues/dues-dashboard-empty"
);

async function render(element: ReturnType<typeof createElement>): Promise<string> {
  const stream = await renderToReadableStream(element);
  await stream.allReady;
  return (await new Response(stream).text()).replace(/<!-- -->/g, "");
}

const mockPeriods: DuesPeriod[] = [
  {
    id: "p-1",
    orgId: "org-1",
    name: "1st Sem Membership Dues",
    amount: 250.0,
    dueOn: "2026-12-15",
    status: "open",
    paymentCount: 12,
    createdAt: "2026-11-01T00:00:00Z",
    updatedAt: "2026-11-01T00:00:00Z",
  },
  {
    id: "p-2",
    orgId: "org-1",
    name: "2nd Sem Membership Dues",
    amount: 300.0,
    dueOn: "2027-05-15",
    status: "closed",
    paymentCount: 0,
    createdAt: "2026-11-02T00:00:00Z",
    updatedAt: "2026-11-02T00:00:00Z",
  },
];

const mockSummary: DuesPeriodSummary = {
  collectedAmount: 500.0,
  expectedAmount: 1000.0,
  outstandingAmount: 500.0,
  paidCount: 2,
  pendingCount: 3,
  rejectedCount: 1,
  unpaidCount: 4,
  activeMemberCount: 10,
  totalMemberCount: 10,
};

describe("Dues Dashboard UI Components", () => {
  describe("DuesPeriodPicker", () => {
    it("renders select with period names and statuses", async () => {
      const html = await render(
        createElement(DuesPeriodPicker, {
          periods: mockPeriods,
          selectedPeriodId: "p-1",
          onSelectPeriod: vi.fn(),
        })
      );

      expect(html).toContain("1st Sem Membership Dues (Open)");
      expect(html).toContain("2nd Sem Membership Dues (Closed)");
      expect(html).toContain("₱250.00 / member");
      expect(html).toContain("Due 2026-12-15");
    });
  });

  describe("DuesSummaryTiles", () => {
    it("renders collection progress with expected, collected, and outstanding", async () => {
      const html = await render(
        createElement(DuesSummaryTiles, {
          summary: mockSummary,
          onOpenReviewQueue: vi.fn(),
        })
      );

      expect(html).toContain("Collected ₱500.00 of ₱1,000.00");
      expect(html).toContain("50% collected");
      expect(html).toContain("Outstanding");
      expect(html).toContain("₱500.00");
    });

    it("renders 4 status breakdown tiles with exact counts", async () => {
      const html = await render(
        createElement(DuesSummaryTiles, {
          summary: mockSummary,
          onOpenReviewQueue: vi.fn(),
        })
      );

      expect(html).toContain("Paid");
      expect(html).toContain("Pending review");
      expect(html).toContain("Rejected");
      expect(html).toContain("Unpaid");

      expect(html).toContain("2"); // Paid count
      expect(html).toContain("3"); // Pending count
      expect(html).toContain("1"); // Rejected count
      expect(html).toContain("4"); // Unpaid count
      expect(html).toContain("Review"); // Review badge
    });

    it("handles zero expected amount without division by zero", async () => {
      const zeroSummary: DuesPeriodSummary = {
        collectedAmount: 0,
        expectedAmount: 0,
        outstandingAmount: 0,
        paidCount: 0,
        pendingCount: 0,
        rejectedCount: 0,
        unpaidCount: 0,
        activeMemberCount: 0,
        totalMemberCount: 0,
      };

      const html = await render(
        createElement(DuesSummaryTiles, {
          summary: zeroSummary,
        })
      );

      expect(html).toContain("Collected ₱0.00 of ₱0.00");
      expect(html).toContain("0% collected");
      expect(html).not.toContain("NaN");
    });
  });

  describe("DuesDashboardSkeleton", () => {
    it("renders accessible loading skeleton", async () => {
      const html = await render(createElement(DuesDashboardSkeleton, { rowCount: 4 }));
      expect(html).toContain('role="status"');
      expect(html).toContain('aria-label="Loading dues dashboard"');
      expect(html).toContain("orgkit-skeleton");
    });
  });

  describe("DuesDashboardError", () => {
    it("renders error alert with message and retry button", async () => {
      const html = await render(
        createElement(DuesDashboardError, {
          message: "Failed to connect to dues server.",
          onRetry: vi.fn(),
        })
      );

      expect(html).toContain('role="alert"');
      expect(html).toContain("Failed to load dashboard");
      expect(html).toContain("Failed to connect to dues server.");
      expect(html).toContain("Try again");
    });
  });

  describe("DuesMemberStatusPill", () => {
    it("renders each dues status pill with correct label", async () => {
      const paidHtml = await render(createElement(DuesMemberStatusPill, { status: "paid" }));
      expect(paidHtml).toContain("Paid");

      const pendingHtml = await render(createElement(DuesMemberStatusPill, { status: "pending" }));
      expect(pendingHtml).toContain("Pending review");

      const rejectedHtml = await render(createElement(DuesMemberStatusPill, { status: "rejected" }));
      expect(rejectedHtml).toContain("Rejected");

      const unpaidHtml = await render(createElement(DuesMemberStatusPill, { status: "unpaid" }));
      expect(unpaidHtml).toContain("Unpaid");
    });

    it("renders inactive tag when isInactive is true", async () => {
      const html = await render(
        createElement(DuesMemberStatusPill, { status: "paid", isInactive: true })
      );
      expect(html).toContain("Paid");
      expect(html).toContain("Inactive");
    });
  });

  describe("DuesSearchFilter", () => {
    it("renders status tabs with summary counts and search input", async () => {
      const html = await render(
        createElement(DuesSearchFilter, {
          searchQuery: "Alice",
          onSearchChange: vi.fn(),
          statusFilter: "all",
          onStatusChange: vi.fn(),
          summary: mockSummary,
        })
      );

      expect(html).toContain('role="tablist"');
      expect(html).toContain("All");
      expect(html).toContain("Paid");
      expect(html).toContain("Pending review");
      expect(html).toContain("Unpaid");
      expect(html).toContain("Rejected");
      expect(html).toContain('value="Alice"');
      expect(html).toContain('placeholder="Search by name or email..."');
    });
  });

  describe("DuesMemberTable", () => {
    const mockMembers = [
      {
        memberId: "m-1",
        fullName: "Alice Cooper",
        email: "alice@school.edu",
        memberStatus: "active" as const,
        duesStatus: "paid" as const,
        paymentId: "p-1",
        amount: 250.0,
        referenceNo: "GCASH-123456",
        paymentStatus: "verified" as const,
        rejectReason: null,
        submittedAt: "2026-11-01T10:00:00Z",
        reviewedAt: "2026-11-02T10:00:00Z",
      },
      {
        memberId: "m-2",
        fullName: "Bob Marley",
        email: "bob@school.edu",
        memberStatus: "inactive" as const,
        duesStatus: "unpaid" as const,
        paymentId: null,
        amount: null,
        referenceNo: null,
        paymentStatus: null,
        rejectReason: null,
        submittedAt: null,
        reviewedAt: null,
      },
    ];

    it("renders member rows, reference numbers, and formatted dates", async () => {
      const html = await render(
        createElement(DuesMemberTable, {
          members: mockMembers,
          page: 1,
          pageSize: 20,
          totalMatching: 2,
          totalPages: 1,
          onPageChange: vi.fn(),
        })
      );

      expect(html).toContain("Alice Cooper");
      expect(html).toContain("alice@school.edu");
      expect(html).toContain("GCASH-123456");
      expect(html).toContain("Paid");

      expect(html).toContain("Bob Marley");
      expect(html).toContain("bob@school.edu");
      expect(html).toContain("Unpaid");
      expect(html).toContain("Inactive");

      expect(html).toContain("Showing ");
      expect(html).toContain("1–2");
      expect(html).toContain("of ");
      expect(html).toContain("members");
    });

    it("renders empty state when members list is empty", async () => {
      const html = await render(
        createElement(DuesMemberTable, {
          members: [],
          page: 1,
          pageSize: 20,
          totalMatching: 0,
          totalPages: 0,
          onPageChange: vi.fn(),
          emptyType: "no_members",
        })
      );

      expect(html).toContain("No active members yet");
    });
  });

  describe("DuesMemberPager", () => {
    it("renders numbered page buttons and current page", async () => {
      const html = await render(
        createElement(DuesMemberPager, {
          page: 2,
          totalPages: 5,
          onPageChange: vi.fn(),
        })
      );

      expect(html).toContain('aria-label="Pagination"');
      expect(html).toContain('aria-label="Page 1"');
      expect(html).toContain('aria-label="Page 2"');
      expect(html).toContain('aria-current="page"');
      expect(html).toContain('aria-label="Next page"');
      expect(html).toContain('aria-label="Previous page"');
    });

    it("renders nothing when totalPages is 1 or less", async () => {
      const html = await render(
        createElement(DuesMemberPager, {
          page: 1,
          totalPages: 1,
          onPageChange: vi.fn(),
        })
      );

      expect(html).toBe("");
    });
  });
});
