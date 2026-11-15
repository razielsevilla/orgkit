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
          onCreatePeriod: vi.fn(),
        })
      );

      expect(html).toContain("1st Sem Membership Dues (Open)");
      expect(html).toContain("2nd Sem Membership Dues (Closed)");
      expect(html).toContain("₱250.00 / member");
      expect(html).toContain("Due 2026-12-15");
      expect(html).toContain("New period");
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
      expect(html).toContain("Outstanding:");
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
});
