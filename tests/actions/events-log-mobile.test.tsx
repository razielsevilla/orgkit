import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToReadableStream } from "react-dom/server";
import type { PastEventsLogData } from "@/src/lib/events/past-events-types";

vi.mock("next/navigation", () => ({
  usePathname: () => "/workspace/11111111-1111-4111-8111-111111111111/events/log",
  useRouter: () => ({ push: vi.fn(), prefetch: vi.fn(), refresh: vi.fn() }),
}));

const { EventsLogClient } = await import(
  "@/src/components/workspace/events-log/events-log-client"
);

async function render(element: ReturnType<typeof createElement>): Promise<string> {
  const stream = await renderToReadableStream(element);
  await stream.allReady;
  return (await new Response(stream).text()).replace(/<!-- -->/g, "");
}

const mockData: PastEventsLogData = {
  orgId: "11111111-1111-4111-8111-111111111111",
  orgName: "Engineering Student Council",
  events: [
    {
      id: "ev-mobile-1",
      orgId: "11111111-1111-4111-8111-111111111111",
      title: "Freshman Welcome Night",
      startsAt: "2025-08-28T17:00:00Z",
      endsAt: "2025-08-28T21:00:00Z",
      location: "Main Gymnasium",
      status: "scheduled",
      attendanceCount: 150,
      createdAt: "2025-08-01T00:00:00Z",
    },
  ],
  terms: [
    {
      termName: "A.Y. 2025–2026",
      startDate: "2025-06-01",
      endDate: "2026-05-31",
    },
  ],
  summary: {
    totalEvents: 1,
    completedEvents: 1,
    cancelledEvents: 0,
    totalAttendance: 150,
    averageAttendance: 150,
  },
};

describe("events-log-mobile: 360px viewport responsiveness", () => {
  it("renders mobile cards and includes responsive styles for 360px width", async () => {
    const html = await render(
      createElement(EventsLogClient, {
        initialData: mockData,
      })
    );

    // Responsive styles must be injected
    expect(html).toContain(".orgkit-log-mobile-cards");
    expect(html).toContain(".orgkit-log-desktop-table");
    expect(html).toContain("@media (max-width: 768px)");

    // Fluid typography and shell container
    expect(html).toContain("orgkit-events-log-shell");

    // Both desktop table and mobile card containers exist in DOM
    expect(html).toContain("orgkit-log-desktop-table");
    expect(html).toContain("orgkit-log-mobile-cards");
    expect(html).toContain("Freshman Welcome Night");
    expect(html).toContain("150 attended");
  });

  it("ensures filter bar inputs can stack and wrap without fixed widths", async () => {
    const html = await render(
      createElement(EventsLogClient, {
        initialData: mockData,
      })
    );

    expect(html).toContain("orgkit-log-filters");
    expect(html).toContain("orgkit-log-date-inputs");
    expect(html).toContain("Filter from date");
    expect(html).toContain("Filter to date");
  });
});
