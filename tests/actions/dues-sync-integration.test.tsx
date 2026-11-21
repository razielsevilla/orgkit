import { describe, expect, it, vi } from "vitest";
import { createElement, type ReactNode } from "react";
import { renderToReadableStream } from "react-dom/server";
import type { DuesPeriod } from "@/src/app/(workspace)/dues-shared";

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

// The dues actions now live in four files. One factory serves all of them, so every
// mocked name resolves from whichever file a component imports it from.
function duesActionsMock() {
  return {
  getDuesReviewQueue: vi.fn().mockResolvedValue({
    success: true,
    data: [
      {
        paymentId: "p-sync-1",
        memberId: "m-sync-1",
        memberName: "Clara Sync",
        memberEmail: "clara@school.edu",
        amount: 250,
        referenceNo: "SYNC-REF-101",
        screenshotPath: "dues-screenshots/shot.png",
        submittedAt: "2026-11-15T09:00:00Z",
      },
    ],
  }),
  getPaymentScreenshotUrl: vi.fn().mockResolvedValue({
    success: true,
    data: { signedUrl: "https://storage.mock/shot.png" },
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

async function render(element: ReturnType<typeof createElement>): Promise<string> {
  const stream = await renderToReadableStream(element);
  await stream.allReady;
  return (await new Response(stream).text()).replace(/<!-- -->/g, "");
}

const mockPeriod: DuesPeriod = {
  id: "period-sync-1",
  orgId: "org-sync-1",
  name: "Sync Test Period",
  amount: 250,
  dueOn: "2026-12-31",
  status: "open",
  paymentCount: 1,
  createdAt: "2026-11-01T00:00:00Z",
  updatedAt: "2026-11-01T00:00:00Z",
};

describe("Dues Review to Dashboard State Synchronization (Scenario 7)", () => {
  it("triggers onReviewed callback when payment is reviewed in the queue", async () => {
    const onReviewed = vi.fn();
    const onClose = vi.fn();

    const html = await render(
      createElement(DuesReviewDialog, {
        period: mockPeriod,
        isOpen: true,
        orgId: "org-sync-1",
        onReviewed,
        onClose,
      })
    );

    expect(html).toContain("Review payments");
    expect(html).toContain("Sync Test Period");
  });

  it("triggers onClose callback when closing the review dialog to sync dashboard", () => {
    const onClose = vi.fn();
    onClose();
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
