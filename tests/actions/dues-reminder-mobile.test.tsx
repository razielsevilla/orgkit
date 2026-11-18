import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToReadableStream } from "react-dom/server";
import { DuesReminderPreviewMessage } from "@/src/components/workspace/dues/dues-reminder-preview-message";
import { DuesReminderFailureList } from "@/src/components/workspace/dues/dues-reminder-failure-list";
import { DuesReminderProgressBar } from "@/src/components/workspace/dues/dues-reminder-progress";
import { DuesReminderSuccessSummary } from "@/src/components/workspace/dues/dues-reminder-success-summary";
import { DuesReminderStatsBadge } from "@/src/components/workspace/dues/dues-reminder-stats-badge";

async function renderComponent(element: React.ReactElement): Promise<string> {
  const stream = await renderToReadableStream(element);
  await stream.allReady;
  const rawHtml = await new Response(stream).text();
  // Strip React SSR comment markers for clean text assertions
  return rawHtml.replace(/<!-- -->/g, "");
}

describe("Dues Reminder 360px Mobile Viewport & Accessibility", () => {
  it("renders preview message with wrapping and text break styles suitable for 360px", async () => {
    const html = await renderComponent(
      createElement(DuesReminderPreviewMessage, {
        subject: "Reminder: Extraordinarily Long Organization Name With Subscriptions and Due Dues For 1st Semester",
        text: "https://orgkit.ph/pay/extraordinarily-long-unguessable-token-string-that-could-overflow-if-not-wrapped",
        sampleRecipientName: "Maria Clara De Los Santos Garcia Y Rodriguez",
        sampleRecipientEmail: "maria.clara.extraordinarily.long.student.email@university.edu.ph",
      })
    );

    // Checks that long texts and headers contain wrap styles
    expect(html).toContain("overflow-wrap:anywhere");
    expect(html).toContain("word-break:break-word");
    expect(html).toContain("flex-wrap:wrap");
    expect(html).toContain("Maria Clara De Los Santos Garcia Y Rodriguez");
    expect(html).toContain("maria.clara.extraordinarily.long.student.email@university.edu.ph");
  });

  it("renders failure list with wrap layout and ARIA assertive live region", async () => {
    const failures = [
      {
        member_id: "m-1",
        full_name: "Juan Luna",
        email: "juan.luna@university.edu.ph",
        error_type: "bounce" as const,
        error_message: "Mailbox does not exist or domain rejected delivery",
      },
      {
        member_id: "m-2",
        full_name: "Jose Rizal",
        email: "jose.rizal@university.edu.ph",
        error_type: "rate_limit" as const,
        error_message: "Rate limit exceeded. Please retry.",
      },
    ];

    const html = await renderComponent(
      createElement(DuesReminderFailureList, {
        failures,
        onRetry: () => {},
      })
    );

    expect(html).toContain('role="alert"');
    expect(html).toContain('aria-live="assertive"');
    expect(html).toContain('aria-atomic="true"');
    expect(html).toContain("flex-wrap:wrap");
    expect(html).toContain("2 emails could not be delivered");
    expect(html).toContain("Retry failed (2)");
  });

  it("renders progress bar with ARIA status and polite live announcement", async () => {
    const html = await renderComponent(
      createElement(DuesReminderProgressBar, {
        current: 5,
        total: 10,
        label: "Sending payment reminders...",
      })
    );

    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('aria-atomic="true"');
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('role="progressbar"');
    expect(html).toContain('aria-valuenow="50"');
    expect(html).toContain("5 of 10 (50%)");
  });

  it("renders success summary with ARIA status and polite live announcement", async () => {
    const html = await renderComponent(
      createElement(DuesReminderSuccessSummary, {
        sentCount: 15,
        skippedCount: 3,
      })
    );

    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('aria-atomic="true"');
    expect(html).toContain("Payment reminders sent!");
    expect(html).toContain("15");
    expect(html).toContain("3 members were skipped");
  });

  it("renders stats badge with flexible wrap layout for 360px phones", async () => {
    const html = await renderComponent(
      createElement(DuesReminderStatsBadge, {
        eligibleCount: 12,
        skipped24hCount: 4,
        totalUnpaidCount: 16,
      })
    );

    expect(html).toContain("12 members will be emailed");
    expect(html).toContain("4");
    expect(html).toContain("reminded in the last 24 hours and will be skipped");
    expect(html).toContain("overflow-wrap:anywhere");
  });
});
