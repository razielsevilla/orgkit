import { connection } from "next/server";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { isUuid } from "@/src/lib/validation";
import { ROUTES } from "@/src/lib/routes";
import { getWorkspaceEvent } from "@/src/app/(workspace)/events-actions";
import { getEventAttendanceAction } from "@/src/app/(workspace)/attendance-actions";
import { AttendanceSection } from "@/src/components/workspace/events/attendance-section";
import { AttendanceSkeleton } from "@/src/components/workspace/events/attendance-skeleton";
import { EventDetail } from "@/src/components/workspace/events/event-detail";
import { EventsNotFound } from "@/src/components/workspace/events/events-not-found";
import { EVENT_MESSAGES } from "@/src/lib/events/event-validation";
import { ATTENDANCE_MESSAGES } from "@/src/lib/events/attendance-state";
import { WorkspaceContentLoader } from "@/src/components/workspace/frame/workspace-content-loader";
import { PageReveal } from "@/src/components/workspace/frame/page-reveal";
import { EventsClient } from "@/src/components/workspace/events/events-client";

interface EventPageProps {
  params: Promise<{ id: string; eventId: string }>;
}

/** The attendance list, streamed in behind its skeleton while the event details are already on screen */
async function AttendanceContent({
  rawId,
  eventId,
  readOnly,
  attendance,
}: {
  rawId: string;
  eventId: string;
  readOnly: boolean;
  attendance: ReturnType<typeof getEventAttendanceAction>;
}) {
  const res = await attendance;
  if (res.error === "not_authenticated") redirect(ROUTES.signIn);

  // A failed first load is not an empty list: show the error, and the poll fills the list in when it recovers
  return (
    <AttendanceSection
      orgId={rawId}
      eventId={eventId}
      initial={res.success && res.data ? res.data : { records: [], activeCount: 0 }}
      initialError={res.success ? null : (res.errorMessage ?? ATTENDANCE_MESSAGES.loadFailed)}
      readOnly={readOnly}
    />
  );
}

async function EventContent({ params }: EventPageProps) {
  await connection();
  const { id: rawId, eventId } = await params;

  // A malformed org or event ID can't match anything, so no query runs
  if (!rawId || !eventId || !isUuid(rawId) || !isUuid(eventId)) return <EventsNotFound />;

  // Both reads start together; the list is awaited further down, inside its own Suspense
  const attendance = getEventAttendanceAction(rawId, eventId);
  const res = await getWorkspaceEvent(rawId, eventId);

  if (!res.success || !res.data) {
    if (res.error === "not_authenticated") redirect(ROUTES.signIn);
    // A transient failure is not a missing page: show the list with the retry banner
    if (res.error === "failed") {
      return (
        <PageReveal>
          <EventsClient rawId={rawId} events={[]} initialError={res.errorMessage ?? EVENT_MESSAGES.loadFailed} />
        </PageReveal>
      );
    }
    // Unknown event, an event of another org, or no access: the same screen for all
    return <EventsNotFound />;
  }

  return (
    <PageReveal>
      <EventDetail
        rawId={rawId}
        event={res.data}
        attendance={
          <Suspense fallback={<AttendanceSkeleton />}>
            <AttendanceContent
              rawId={rawId}
              eventId={eventId}
              readOnly={res.data.status === "cancelled"}
              attendance={attendance}
            />
          </Suspense>
        }
      />
    </PageReveal>
  );
}

export default function EventPage(props: EventPageProps) {
  return (
    <Suspense fallback={<WorkspaceContentLoader />}>
      <EventContent {...props} />
    </Suspense>
  );
}
