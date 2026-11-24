import { describe, expect, it, vi } from "vitest";
import { createElement, type ReactNode } from "react";
import { renderToReadableStream } from "react-dom/server";
import type {
  PastEventLogItem,
  PastEventsLogData,
} from "@/src/lib/events/past-events-types";

vi.mock("next/navigation", () => ({
  usePathname: () => "/workspace/11111111-1111-4111-8111-111111111111/events/log",
  useRouter: () => ({ push: vi.fn(), prefetch: vi.fn(), refresh: vi.fn() }),
}));

const { EventsLogSkeleton } = await import(
  "@/src/components/workspace/events-log/events-log-skeleton"
);
const { EventsLogEmptyState } = await import(
  "@/src/components/workspace/events-log/events-log-empty-state"
);
const { EventsLogHeader } = await import(
  "@/src/components/workspace/events-log/events-log-header"
);
const { EventsLogSummaryTiles } = await import(
  "@/src/components/workspace/events-log/events-log-summary-tiles"
);
const { EventsLogTable } = await import(
  "@/src/components/workspace/events-log/events-log-table"
);
const { EventsLogMobileCard } = await import(
  "@/src/components/workspace/events-log/events-log-mobile-card"
);
const { EventsLogClient } = await import(
  "@/src/components/workspace/events-log/events-log-client"
);

async function render(element: ReturnType<typeof createElement>): Promise<string> {
  const stream = await renderToReadableStream(element);
  await stream.allReady;
  return (await new Response(stream).text()).replace(/<!-- -->/g, "");
}

const mockEvents: PastEventLogItem[] = [
  {
    id: "ev-1",
    orgId: "11111111-1111-4111-8111-111111111111",
    title: "Leadership Camp 2025",
    startsAt: "2025-11-20T08:00:00Z",
    endsAt: "2025-11-20T17:00:00Z",
    location: "Camp Site A",
    status: "scheduled",
    attendanceCount: 42,
    createdAt: "2025-11-01T00:00:00Z",
  },
  {
    id: "ev-cancelled",
    orgId: "11111111-1111-4111-8111-111111111111",
    title: "Bad Weather Outdoor Gathering",
    startsAt: "2025-12-05T13:00:00Z",
    endsAt: "2025-12-05T16:00:00Z",
    location: null,
    status: "cancelled",
    attendanceCount: null,
    createdAt: "2025-11-20T00:00:00Z",
  },
];

const mockInitialData: PastEventsLogData = {
  orgId: "11111111-1111-4111-8111-111111111111",
  orgName: "Junior Marketing Association",
  events: mockEvents,
  terms: [
    {
      termName: "A.Y. 2025–2026",
      startDate: "2025-06-01",
      endDate: "2026-05-31",
    },
  ],
  summary: {
    totalEvents: 2,
    completedEvents: 1,
    cancelledEvents: 1,
    totalAttendance: 42,
    averageAttendance: 42,
  },
};

describe("events-log-ui: EventsLogSkeleton", () => {
  it("renders accessible loading skeleton with aria attributes", async () => {
    const html = await render(createElement(EventsLogSkeleton));
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('aria-label="Loading past events log"');
    expect(html).toContain("log-shimmer");
  });
});

describe("events-log-ui: EventsLogEmptyState", () => {
  it("renders initial empty state with educational copy", async () => {
    const html = await render(createElement(EventsLogEmptyState));
    expect(html).toContain("No past events yet");
    expect(html).toContain("When your events conclude");
    expect(html).toContain("Automatic attendance history");
  });

  it("renders filtered empty state with clear button", async () => {
    const html = await render(
      createElement(EventsLogEmptyState, {
        isFiltered: true,
        onClearFilters: vi.fn(),
      })
    );
    expect(html).toContain("No matching past events found");
    expect(html).toContain("Clear filters");
  });
});

describe("events-log-ui: EventsLogHeader", () => {
  it("renders title, back button, org name, and count badge", async () => {
    const html = await render(
      createElement(EventsLogHeader, {
        orgId: "11111111-1111-4111-8111-111111111111",
        orgName: "Junior Marketing Association",
        totalEvents: 2,
      })
    );
    expect(html).toContain("Past events");
    expect(html).toContain("2 events");
    expect(html).toContain("Back to events");
    expect(html).toContain("Junior Marketing Association");
  });
});

describe("events-log-ui: EventsLogSummaryTiles", () => {
  it("renders all four aggregated summary metrics", async () => {
    const html = await render(
      createElement(EventsLogSummaryTiles, {
        summary: mockInitialData.summary,
      })
    );
    expect(html).toContain("Total past events");
    expect(html).toContain("Completed events");
    expect(html).toContain("Total attendance");
    expect(html).toContain("Average attendance");
    expect(html).toContain("42");
    expect(html).toContain("1 cancelled");
  });
});

describe("events-log-ui: EventsLogTable", () => {
  it("renders event date, title, location, attendance badge, and view link", async () => {
    const html = await render(
      createElement(EventsLogTable, {
        orgId: mockInitialData.orgId,
        events: mockEvents,
      })
    );
    expect(html).toContain("Leadership Camp 2025");
    expect(html).toContain("Camp Site A");
    expect(html).toContain("42 attended");
    expect(html).toContain("Bad Weather Outdoor Gathering");
    expect(html).toContain("Cancelled");
    expect(html).toContain("View");
  });
});

describe("events-log-ui: EventsLogMobileCard", () => {
  it("renders mobile card with direct attendee link", async () => {
    const html = await render(
      createElement(EventsLogMobileCard, {
        orgId: mockInitialData.orgId,
        event: mockEvents[0],
      })
    );
    expect(html).toContain("Leadership Camp 2025");
    expect(html).toContain("Camp Site A");
    expect(html).toContain("42 attended");
    expect(html).toContain("View attendees");
    expect(html).toContain(
      "/workspace/11111111-1111-4111-8111-111111111111/events/ev-1"
    );
  });
});

describe("events-log-ui: EventsLogClient", () => {
  it("renders full interactive client layout with summary and filter bar", async () => {
    const html = await render(
      createElement(EventsLogClient, {
        initialData: mockInitialData,
      })
    );
    expect(html).toContain("Past events");
    expect(html).toContain("Term:");
    expect(html).toContain("A.Y. 2025–2026");
    expect(html).toContain("Search by title, location...");
    expect(html).toContain("Leadership Camp 2025");
  });
});
