import { describe, expect, it, vi, beforeEach } from "vitest";
import { createElement, type ReactNode } from "react";
import { renderToReadableStream } from "react-dom/server";
import type { DuesPeriod } from "@/src/app/(workspace)/dues-actions";

vi.mock("@/src/components/ui/dialog", () => ({
  Dialog: ({ children, labelledBy }: { children: ReactNode; labelledBy?: string }) =>
    createElement("div", { role: "dialog", "aria-labelledby": labelledBy }, children),
  DialogHeader: ({ titleId, title, description }: { titleId: string; title: string; description?: string }) =>
    createElement("header", null, [
      createElement("h2", { key: "title", id: titleId }, title),
      description ? createElement("p", { key: "desc" }, description) : null,
    ]),
  DialogBody: ({ children }: { children: ReactNode }) => createElement("div", null, children),
  DialogFooter: ({ children }: { children: ReactNode }) => createElement("footer", null, children),
  DialogButton: ({ children, disabled, variant, onClick }: { children: ReactNode; disabled?: boolean; variant?: string; onClick?: () => void }) =>
    createElement("button", { type: "button", disabled, "data-variant": variant, onClick }, children),
}));

const mockPreviewData = {
  period: {
    period_id: "22222222-2222-2222-2222-222222222222",
    org_id: "11111111-1111-1111-1111-111111111111",
    org_name: "Computer Science Society",
    period_name: "1st Sem Membership Dues",
    amount: 250,
    due_on: "2026-12-15",
    pay_token: "test-token",
    is_closed: false,
    pay_url: "https://orgkit.ph/pay/test-token",
  },
  total_unpaid_count: 5,
  eligible_count: 3,
  skipped_24h_count: 2,
  is_email_configured: true,
  preview_subject: "Reminder: Dues for 1st Sem Membership Dues · Computer Science Society",
  preview_text: "Hi Member,\n\nThis is a friendly reminder...",
  sample_recipient: {
    name: "Alice Doe",
    email: "alice@school.edu",
  },
  recipients: [],
};

vi.mock("@/src/app/(workspace)/dues-actions", () => ({
  getDuesReminderPreviewAction: vi.fn(async () => ({
    success: true,
    data: mockPreviewData,
  })),
  sendDuesRemindersAction: vi.fn(async () => ({
    success: true,
    data: {
      total_targeted: 3,
      sent_count: 3,
      failed_count: 0,
      skipped_count: 2,
      failures: [],
    },
  })),
  retryFailedRemindersAction: vi.fn(async () => ({
    success: true,
    data: {
      total_targeted: 1,
      sent_count: 1,
      failed_count: 0,
      skipped_count: 0,
      failures: [],
    },
  })),
}));

const { DuesReminderDialog } = await import(
  "@/src/components/workspace/dues/dues-reminder-dialog"
);

const samplePeriod: DuesPeriod = {
  id: "22222222-2222-2222-2222-222222222222",
  orgId: "11111111-1111-1111-1111-111111111111",
  name: "1st Sem Membership Dues",
  amount: 250,
  dueOn: "2026-12-15",
  status: "open",
  paymentCount: 12,
  createdAt: "2026-11-01T00:00:00Z",
  updatedAt: "2026-11-01T00:00:00Z",
};

async function render(props: Partial<Parameters<typeof DuesReminderDialog>[0]> = {}) {
  const stream = await renderToReadableStream(
    createElement(DuesReminderDialog, {
      isOpen: true,
      onClose: () => {},
      orgId: "11111111-1111-1111-1111-111111111111",
      period: samplePeriod,
      ...props,
    })
  );
  await stream.allReady;
  return new Response(stream).text();
}

describe("DuesReminderDialog component render", () => {
  it("renders nothing when isOpen is false or period is null", async () => {
    const closedHtml = await render({ isOpen: false });
    expect(closedHtml).toBe("");

    const nullPeriodHtml = await render({ period: null });
    expect(nullPeriodHtml).toBe("");
  });

  it("renders dialog header with title and period name", async () => {
    const html = await render();
    expect(html).toContain("Send payment reminders");
    expect(html).toContain('id="dues-reminders-title"');
    expect(html).toContain("1st Sem Membership Dues");
  });

  it("renders buttons for Cancel and Send reminders", async () => {
    const html = await render();
    expect(html).toContain("Cancel");
    expect(html).toContain("Send reminders");
  });

  it("renders closed period notice when period is closed", async () => {
    const closedPeriod: DuesPeriod = {
      ...samplePeriod,
      status: "closed",
    };
    const html = await render({ period: closedPeriod });
    expect(html).toContain("Reminders cannot be sent for a closed dues period.");
  });
});
