import { describe, expect, it, vi } from "vitest";
import { createElement, type ReactNode } from "react";
import { renderToReadableStream } from "react-dom/server";
import type { DuesPeriod } from "@/src/app/(workspace)/dues-actions";

// Mock Dialog components so they render inline in SSR stream
vi.mock("@/src/components/ui/dialog", () => ({
  Dialog: ({ children }: { children: ReactNode }) => createElement("div", { role: "dialog" }, children),
  DialogHeader: ({ titleId, title, description }: { titleId: string; title: string; description?: string }) =>
    createElement("div", null, createElement("h2", { id: titleId }, title), description && createElement("p", null, description)),
  DialogBody: ({ children }: { children: ReactNode }) => createElement("div", null, children),
  DialogFooter: ({ children }: { children: ReactNode }) => createElement("div", null, children),
  DialogButton: ({ children, ...props }: { children: ReactNode }) =>
    createElement("button", { type: "button", ...props }, children),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/workspace/11111111-1111-4111-8111-111111111111/dues",
  useRouter: () => ({ push: vi.fn(), prefetch: vi.fn(), refresh: vi.fn() }),
}));

const { DuesStatusPill } = await import("@/src/components/workspace/dues/dues-status-pill");
const { DuesEmptyState } = await import("@/src/components/workspace/dues/dues-empty-state");
const { DuesHeader } = await import("@/src/components/workspace/dues/dues-header");
const { DuesTable, formatPesos, formatDueDate } = await import("@/src/components/workspace/dues/dues-table");
const { DuesMobileCard } = await import("@/src/components/workspace/dues/dues-mobile-card");
const { DuesPeriodDialog } = await import("@/src/components/workspace/dues/dues-period-dialog");
const { ClosePeriodDialog } = await import("@/src/components/workspace/dues/close-period-dialog");
const { DuesClient } = await import("@/src/components/workspace/dues/dues-client");
const { DuesSkeleton } = await import("@/src/components/workspace/dues/dues-skeleton");

async function render(element: ReturnType<typeof createElement>): Promise<string> {
  const stream = await renderToReadableStream(element);
  await stream.allReady;
  return (await new Response(stream).text()).replace(/<!-- -->/g, "");
}

const mockPeriodOpen: DuesPeriod = {
  id: "period-1",
  orgId: "org-1",
  name: "1st Sem Membership Dues",
  amount: 250.0,
  dueOn: "2026-12-15",
  status: "open",
  paymentCount: 0,
  createdAt: "2026-11-01T00:00:00Z",
  updatedAt: "2026-11-01T00:00:00Z",
};

const mockPeriodClosed: DuesPeriod = {
  id: "period-2",
  orgId: "org-1",
  name: "General Assembly Fee",
  amount: 1500.5,
  dueOn: "2026-10-10",
  status: "closed",
  paymentCount: 15,
  createdAt: "2026-09-01T00:00:00Z",
  updatedAt: "2026-10-11T00:00:00Z",
};

describe("Dues Status Pill", () => {
  it("renders Open status pill with accessible role and label", async () => {
    const html = await render(createElement(DuesStatusPill, { status: "open" }));
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-label="Status: Open"');
    expect(html).toContain("Open");
  });

  it("renders Closed status pill", async () => {
    const html = await render(createElement(DuesStatusPill, { status: "closed" }));
    expect(html).toContain('aria-label="Status: Closed"');
    expect(html).toContain("Closed");
  });
});

describe("Dues Empty State & Skeleton", () => {
  it("renders empty state with clear headline and New period button", async () => {
    const html = await render(createElement(DuesEmptyState, { onCreatePeriod: () => {} }));
    expect(html).toContain("No dues periods yet");
    expect(html).toContain("New period");
  });

  it("renders DuesSkeleton matching table layout", async () => {
    const html = await render(createElement(DuesSkeleton, { rowCount: 3 }));
    expect(html).toContain("orgkit-skeleton");
  });

  it("renders DuesHeader with counts and action button", async () => {
    const html = await render(
      createElement(DuesHeader, {
        totalCount: 3,
        openCount: 2,
        onCreatePeriod: () => {},
      })
    );
    expect(html).toContain("Dues");
    expect(html).toContain("3 periods • 2 open");
    expect(html).toContain("New period");
  });
});

describe("Dues Formatting Helpers", () => {
  it("formats Philippine pesos with currency symbol and 2 decimals", () => {
    expect(formatPesos(250)).toBe("₱250.00");
    expect(formatPesos(1500.5)).toBe("₱1,500.50");
    expect(formatPesos(100000)).toBe("₱100,000.00");
  });

  it("formats due date string into human-readable format", () => {
    expect(formatDueDate("2026-12-15")).toBe("Dec 15, 2026");
    expect(formatDueDate("2026-01-05")).toBe("Jan 5, 2026");
  });
});

describe("Dues Table & Mobile Cards", () => {
  it("renders desktop table with columns, formatted amounts, and actions", async () => {
    const html = await render(
      createElement(DuesTable, {
        periods: [mockPeriodOpen, mockPeriodClosed],
        onEdit: () => {},
        onClosePeriod: () => {},
      })
    );
    expect(html).toContain("1st Sem Membership Dues");
    expect(html).toContain("₱250.00");
    expect(html).toContain("Dec 15, 2026");
    expect(html).toContain("General Assembly Fee");
    expect(html).toContain("₱1,500.50");
    expect(html).toContain("Edit");
    expect(html).toContain("Close period");
  });

  it("renders mobile card with period details and touch targets", async () => {
    const html = await render(
      createElement(DuesMobileCard, {
        period: mockPeriodOpen,
        onEdit: () => {},
        onClosePeriod: () => {},
      })
    );
    expect(html).toContain("1st Sem Membership Dues");
    expect(html).toContain("₱250.00");
    expect(html).toContain("Dec 15, 2026");
    expect(html).toContain("Edit");
    expect(html).toContain("Close");
  });

  it("renders closed indicator on closed mobile card", async () => {
    const html = await render(
      createElement(DuesMobileCard, {
        period: mockPeriodClosed,
        onEdit: () => {},
        onClosePeriod: () => {},
      })
    );
    expect(html).toContain("Period closed");
  });
});

describe("Dues Dialogs", () => {
  it("renders New period dialog with input fields", async () => {
    const html = await render(
      createElement(DuesPeriodDialog, {
        isOpen: true,
        onClose: () => {},
        period: null,
        onSave: async () => ({ success: true }),
      })
    );
    expect(html).toContain("New period");
    expect(html).toContain("Set the dues amount and due date");
    expect(html).toContain("Period name");
    expect(html).toContain("Amount (₱)");
    expect(html).toContain("Due date");
    expect(html).toContain("Create period");
  });

  it("renders Edit period dialog with existing payment warning note when payments exist", async () => {
    const periodWithPayments: DuesPeriod = {
      ...mockPeriodOpen,
      paymentCount: 5,
    };
    const html = await render(
      createElement(DuesPeriodDialog, {
        isOpen: true,
        onClose: () => {},
        period: periodWithPayments,
        onSave: async () => ({ success: true }),
      })
    );
    expect(html).toContain("Edit period");
    expect(html).toContain("Update the period name, amount or due date");
    expect(html).toContain("Payments already exist for this period.");
    expect(html).toContain("Changing the amount will not change");
    expect(html).toContain("Save changes");
  });

  it("renders ClosePeriodDialog with confirmation copy", async () => {
    const html = await render(
      createElement(ClosePeriodDialog, {
        isOpen: true,
        period: mockPeriodOpen,
        onClose: () => {},
        onConfirmClose: async () => ({ success: true }),
      })
    );
    expect(html).toContain("Close period");
    expect(html).toContain("Stop accepting new dues submissions");
    expect(html).toContain("Closing this period will stop accepting new payment submissions.");
  });
});

describe("DuesClient", () => {
  it("renders empty state when there are no dues periods", async () => {
    const html = await render(
      createElement(DuesClient, {
        rawId: "org-1",
        initialPeriods: [],
      })
    );
    expect(html).toContain("Dues");
    expect(html).toContain("No dues periods yet");
  });

  it("renders both desktop table and mobile card markup for responsive viewports", async () => {
    const html = await render(
      createElement(DuesClient, {
        rawId: "org-1",
        initialPeriods: [mockPeriodOpen],
      })
    );
    expect(html).toContain("orgkit-dues-desktop");
    expect(html).toContain("orgkit-dues-mobile");
    expect(html).toContain("1st Sem Membership Dues");
    expect(html).toContain("1 period • 1 open");
  });
});
