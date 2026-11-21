import { describe, expect, it, vi } from "vitest";
import { createElement, type ReactNode } from "react";
import { renderToReadableStream } from "react-dom/server";
import type { DuesReviewQueueItem } from "@/src/lib/dues/dues-review";

// Mock Dialog components so they render inline in SSR stream
vi.mock("@/src/components/ui/dialog", () => ({
  Dialog: ({ children }: { children: ReactNode }) => createElement("div", { role: "dialog" }, children),
  DialogHeader: ({ titleId, title }: { titleId: string; title: string }) =>
    createElement("div", null, createElement("h2", { id: titleId }, title)),
  DialogBody: ({ children }: { children: ReactNode }) => createElement("div", null, children),
  DialogFooter: ({ children }: { children: ReactNode }) => createElement("div", null, children),
  DialogButton: ({ children, ...props }: { children: ReactNode }) =>
    createElement("button", { type: "button", ...props }, children),
}));

vi.mock("@/src/app/(workspace)/dues-actions", () => ({
  getPaymentScreenshotUrl: vi.fn().mockResolvedValue({
    success: true,
    data: { signedUrl: "https://storage.mock/receipt-123.png" },
  }),
}));

const { DuesReviewEmptyState } = await import(
  "@/src/components/workspace/dues/dues-review-empty-state"
);
const { DuesReviewSkeleton } = await import(
  "@/src/components/workspace/dues/dues-review-skeleton"
);
const { DuesRejectDialog } = await import(
  "@/src/components/workspace/dues/dues-reject-dialog"
);
const { DuesUndoDialog } = await import(
  "@/src/components/workspace/dues/dues-undo-dialog"
);
const { DuesScreenshotViewer } = await import(
  "@/src/components/workspace/dues/dues-screenshot-viewer"
);
const { DuesReviewQueueItemRow } = await import(
  "@/src/components/workspace/dues/dues-review-queue-item"
);
const { DuesReviewPane } = await import(
  "@/src/components/workspace/dues/dues-review-pane"
);

async function render(element: ReturnType<typeof createElement>): Promise<string> {
  const stream = await renderToReadableStream(element);
  await stream.allReady;
  return (await new Response(stream).text()).replace(/<!-- -->/g, "");
}

const mockItem: DuesReviewQueueItem = {
  paymentId: "pay-1",
  memberId: "mem-1",
  memberName: "Maria Santos",
  memberEmail: "maria@school.edu",
  amount: 200,
  referenceNo: "1001 2345 6789",
  screenshotPath: "dues-screenshots/receipt-1.png",
  submittedAt: "2026-11-15T10:00:00Z",
};

describe("DuesReviewEmptyState component", () => {
  it("renders empty state headline and description", async () => {
    const html = await render(
      createElement(DuesReviewEmptyState, { periodName: "Annual Dues 2026" })
    );
    expect(html).toContain("Nothing to review");
    expect(html).toContain("Annual Dues 2026");
  });
});

describe("DuesReviewSkeleton component", () => {
  it("renders skeleton layout", async () => {
    const html = await render(createElement(DuesReviewSkeleton));
    expect(html).toContain("orgkit-skeleton");
  });
});

describe("DuesRejectDialog component", () => {
  it("renders reject dialog with member info, reason shortcuts, and inputs", async () => {
    const html = await render(
      createElement(DuesRejectDialog, {
        item: mockItem,
        isOpen: true,
        onClose: () => {},
        onConfirmReject: async () => ({ success: true }),
      })
    );

    expect(html).toContain("Reject payment");
    expect(html).toContain("Maria Santos");
    expect(html).toContain("1001 2345 6789");
    expect(html).toContain("Amount doesn&#x27;t match");
    expect(html).toContain("Screenshot unclear");
    expect(html).toContain("Reason");
  });

  it("returns null when not open", async () => {
    const html = await render(
      createElement(DuesRejectDialog, {
        item: mockItem,
        isOpen: false,
        onClose: () => {},
        onConfirmReject: async () => ({ success: true }),
      })
    );
    expect(html).toBe("");
  });
});

describe("DuesUndoDialog component", () => {
  it("renders undo verification dialog with member name and reason input", async () => {
    const html = await render(
      createElement(DuesUndoDialog, {
        paymentId: "pay-1",
        memberName: "Juan Dela Cruz",
        referenceNo: "9876 5432 1000",
        isOpen: true,
        onClose: () => {},
        onConfirmUndo: async () => ({ success: true }),
      })
    );

    expect(html).toContain("Undo payment verification");
    expect(html).toContain("Juan Dela Cruz");
    expect(html).toContain("9876 5432 1000");
    expect(html).toContain("Reason for undo");
  });
});

describe("DuesScreenshotViewer component", () => {
  it("renders initial container with loading state", async () => {
    const html = await render(
      createElement(DuesScreenshotViewer, {
        orgId: "org-1",
        screenshotPath: "dues-screenshots/receipt-1.png",
        referenceNo: "1001 2345 6789",
      })
    );
    expect(html).toContain("Loading screenshot...");
  });
});

describe("DuesReviewQueueItemRow component", () => {
  it("renders member name, amount, reference, and formatted timestamp", async () => {
    const html = await render(
      createElement(DuesReviewQueueItemRow, {
        item: mockItem,
        isSelected: false,
        onSelect: () => {},
      })
    );

    expect(html).toContain("Maria Santos");
    expect(html).toContain("₱200.00");
    expect(html).toContain("1001 2345 6789");
  });

  it("indicates selected state when active", async () => {
    const html = await render(
      createElement(DuesReviewQueueItemRow, {
        item: mockItem,
        isSelected: true,
        onSelect: () => {},
      })
    );

    expect(html).toContain('aria-selected="true"');
  });
});

describe("DuesReviewPane layout component", () => {
  it("renders pending count badge, queue, and detail pane when item selected", async () => {
    const html = await render(
      createElement(DuesReviewPane, {
        orgId: "org-1",
        periodId: "period-1",
        periodName: "1st Sem 2026",
        items: [mockItem],
        selectedItem: mockItem,
        onSelectItem: () => {},
        onVerify: async () => ({ success: true }),
        onOpenReject: () => {},
      })
    );

    expect(html).toContain("1 pending");
    expect(html).toContain("Maria Santos");
    expect(html).toContain("Amount to match");
    expect(html).toContain("₱200.00");
    expect(html).toContain("Verify payment");
    expect(html).toContain("Reject payment");
    expect(html).toContain("Back to queue");
  });

  it("renders empty state when items list is empty", async () => {
    const html = await render(
      createElement(DuesReviewPane, {
        orgId: "org-1",
        periodId: "period-1",
        periodName: "1st Sem 2026",
        items: [],
        selectedItem: null,
        onSelectItem: () => {},
        onVerify: async () => ({ success: true }),
        onOpenReject: () => {},
      })
    );

    expect(html).toContain("Nothing to review");
  });
});

