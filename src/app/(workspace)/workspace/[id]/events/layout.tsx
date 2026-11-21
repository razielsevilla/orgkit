import { connection } from "next/server";
import { Suspense } from "react";
import { getWorkspaceEvents } from "@/src/app/(workspace)/events-actions";
import { EventRail, EventRailSkeleton } from "@/src/components/workspace/events/event-rail";
import { EventsShell } from "@/src/components/workspace/events/events-shell";
import { isUuid } from "@/src/lib/validation";

/** The event list for the side rail. If it can't load, the rail is left out and the page still works. */
async function EventRailLoader({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  if (!id || !isUuid(id)) return null;

  const res = await getWorkspaceEvents(id);
  if (!res.success || !res.data) return null;

  return <EventRail rawId={id} events={res.data} />;
}

/**
 * Shared by the events list, an event's page and its check-in screen. The shell
 * shows the rail only beside an event's page, so the list stays in view (and
 * keeps its scroll position) while officers move between events.
 */
export default function EventsLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  return (
    <EventsShell
      rail={
        <Suspense fallback={<EventRailSkeleton />}>
          <EventRailLoader params={params} />
        </Suspense>
      }
    >
      {children}
    </EventsShell>
  );
}
