import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToReadableStream } from "react-dom/server";
import type { DuesMemberRow } from "@/src/lib/dues/dues-dashboard";

const { DuesMemberMobileCard } = await import(
  "@/src/components/workspace/dues/dues-member-mobile-card"
);
const { DuesSummaryTiles } = await import(
  "@/src/components/workspace/dues/dues-summary-tiles"
);

async function render(element: ReturnType<typeof createElement>): Promise<string> {
  const stream = await renderToReadableStream(element);
  await stream.allReady;
  return (await new Response(stream).text()).replace(/<!-- -->/g, "");
}

const mockMemberVerified: DuesMemberRow = {
  memberId: "m-mobile-1",
  fullName: "Maria Clara",
  email: "maria.clara@school.edu",
  memberStatus: "active",
  duesStatus: "paid",
  paymentId: "p-mob-1",
  amount: 250.0,
  referenceNo: "GCASH-987654321",
  paymentStatus: "verified",
  rejectReason: null,
  submittedAt: "2026-11-05T08:30:00Z",
  reviewedAt: "2026-11-05T09:00:00Z",
};

const mockMemberRejected: DuesMemberRow = {
  memberId: "m-mobile-2",
  fullName: "Crisostomo Ibarra",
  email: "ibarra@school.edu",
  memberStatus: "active",
  duesStatus: "rejected",
  paymentId: "p-mob-2",
  amount: 250.0,
  referenceNo: "GCASH-REJECTED",
  paymentStatus: "rejected",
  rejectReason: "Screenshot blurred and unreadable",
  submittedAt: "2026-11-06T10:00:00Z",
  reviewedAt: "2026-11-06T11:00:00Z",
};

const mockMemberUnpaid: DuesMemberRow = {
  memberId: "m-mobile-3",
  fullName: "Elias Morales",
  email: "elias@school.edu",
  memberStatus: "inactive",
  duesStatus: "unpaid",
  paymentId: null,
  amount: null,
  referenceNo: null,
  paymentStatus: null,
  rejectReason: null,
  submittedAt: null,
  reviewedAt: null,
};

describe("Dues Dashboard 360px Mobile Viewport Components", () => {
  it("renders verified payment mobile card with copy shortcut and date", async () => {
    const html = await render(
      createElement(DuesMemberMobileCard, {
        member: mockMemberVerified,
      })
    );

    expect(html).toContain('data-testid="dues-member-mobile-card-m-mobile-1"');
    expect(html).toContain("Maria Clara");
    expect(html).toContain("maria.clara@school.edu");
    expect(html).toContain("MC"); // Initials avatar
    expect(html).toContain("Paid");
    expect(html).toContain("GCASH-987654321");
    expect(html).toContain('aria-label="Copy reference GCASH-987654321"');
    expect(html).toContain("Nov 5, 2026");
  });

  it("renders rejected payment mobile card with reject reason notice", async () => {
    const html = await render(
      createElement(DuesMemberMobileCard, {
        member: mockMemberRejected,
      })
    );

    expect(html).toContain("Crisostomo Ibarra");
    expect(html).toContain("Rejected");
    expect(html).toContain("Screenshot blurred and unreadable");
  });

  it("renders unpaid member mobile card with inactive indicator", async () => {
    const html = await render(
      createElement(DuesMemberMobileCard, {
        member: mockMemberUnpaid,
      })
    );

    expect(html).toContain("Elias Morales");
    expect(html).toContain("Unpaid");
    expect(html).toContain("Inactive");
    expect(html).toContain("No reference");
    expect(html).toContain("—");
  });

  it("summary tiles include 360px-friendly stacking media queries", async () => {
    const html = await render(
      createElement(DuesSummaryTiles, {
        summary: {
          collectedAmount: 250,
          expectedAmount: 750,
          outstandingAmount: 500,
          paidCount: 1,
          pendingCount: 0,
          rejectedCount: 1,
          unpaidCount: 1,
          activeMemberCount: 3,
          totalMemberCount: 3,
        },
      })
    );

    // Verifies 480px / 360px breakpoint media queries for single column stacking
    expect(html).toContain("grid-template-columns: 1fr;");
    expect(html).toContain("orgkit-dues-summary-banner-top");
    expect(html).toContain("orgkit-dues-summary-banner-meta");
  });
});
