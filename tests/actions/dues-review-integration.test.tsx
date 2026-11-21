import { describe, expect, it, vi } from "vitest";
import { createElement, type ReactNode } from "react";
import { renderToReadableStream } from "react-dom/server";
import type { DuesPeriod } from "@/src/app/(workspace)/dues-shared";

vi.mock("@/src/components/ui/dialog", () => ({
  Dialog: ({ children }: { children: ReactNode }) => createElement("div", { role: "dialog" }, children),
  DialogHeader: ({ titleId, title }: { titleId: string; title: string }) =>
    createElement("div", null, createElement("h2", { id: titleId }, title)),
  DialogBody: ({ children }: { children: ReactNode }) => createElement("div", null, children),
  DialogFooter: ({ children }: { children: ReactNode }) => createElement("div", null, children),
  DialogButton: ({ children, ...props }: { children: ReactNode }) =>
    createElement("button", { type: "button", ...props }, children),
}));

// The dues actions now live in four files. One factory serves all of them, so every
// mocked name resolves from whichever file a component imports it from.
function duesActionsMock() {
  return {
  getDuesReviewQueue: vi.fn().mockResolvedValue({
    success: true,
    data: [
      {
        paymentId: "pay-1",
        memberId: "mem-1",
        memberName: "Ana Reyes",
        memberEmail: "ana@school.edu",
        amount: 300,
        referenceNo: "GCASH-9988-7766",
        screenshotPath: "dues-screenshots/screenshot.png",
        submittedAt: "2026-11-15T09:00:00Z",
      },
    ],
  }),
  getPaymentScreenshotUrl: vi.fn().mockResolvedValue({
    success: true,
    data: { signedUrl: "https://storage.mock/signed-shot.png" },
  }),
  verifyDuesPayment: vi.fn().mockResolvedValue({ success: true }),
  rejectDuesPayment: vi.fn().mockResolvedValue({ success: true }),
  };
}
vi.mock("@/src/app/(workspace)/dues-periods-actions", duesActionsMock);
vi.mock("@/src/app/(workspace)/dues-review-actions", duesActionsMock);
vi.mock("@/src/app/(workspace)/dues-dashboard-actions", duesActionsMock);
vi.mock("@/src/app/(workspace)/dues-reminders-actions", duesActionsMock);

const { DuesReviewDialog } = await import(
  "@/src/components/workspace/dues/dues-review-dialog"
);
const { DuesTable } = await import(
  "@/src/components/workspace/dues/dues-table"
);
const { DuesMobileCard } = await import(
  "@/src/components/workspace/dues/dues-mobile-card"
);

async function render(element: ReturnType<typeof createElement>): Promise<string> {
  const stream = await renderToReadableStream(element);
  await stream.allReady;
  return (await new Response(stream).text()).replace(/<!-- -->/g, "");
}

const mockPeriod: DuesPeriod = {
  id: "period-1",
  orgId: "org-1",
  name: "2nd Sem Dues 2026",
  amount: 300,
  dueOn: "2026-12-31",
  status: "open",
  paymentCount: 0,
  createdAt: "2026-11-01T00:00:00Z",
  updatedAt: "2026-11-01T00:00:00Z",
};

describe("Dues Review Integration Flow", () => {
  it("renders review button in DuesTable and triggers review callback", async () => {
    const onReview = vi.fn();
    const html = await render(
      createElement(DuesTable, {
        periods: [mockPeriod],
        onEdit: () => {},
        onClosePeriod: () => {},
        onReview,
      })
    );

    expect(html).toContain("Review");
    expect(html).toContain("Review submissions for 2nd Sem Dues 2026");
  });

  it("renders review button in DuesMobileCard", async () => {
    const onReview = vi.fn();
    const html = await render(
      createElement(DuesMobileCard, {
        period: mockPeriod,
        onEdit: () => {},
        onClosePeriod: () => {},
        onReview,
      })
    );

    expect(html).toContain("Review submissions");
  });

  it("renders DuesReviewDialog with title, skeleton, and done button during initial mount", async () => {
    const html = await render(
      createElement(DuesReviewDialog, {
        period: mockPeriod,
        isOpen: true,
        onClose: () => {},
        orgId: "org-1",
      })
    );

    expect(html).toContain("Review payments: 2nd Sem Dues 2026");
    expect(html).toContain("orgkit-skeleton");
    expect(html).toContain("Done");
  });

  it("returns null when review dialog is closed", async () => {
    const html = await render(
      createElement(DuesReviewDialog, {
        period: mockPeriod,
        isOpen: false,
        onClose: () => {},
        orgId: "org-1",
      })
    );

    expect(html).toBe("");
  });
});
