import { connection } from "next/server";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { isUuid } from "@/src/lib/validation";
import { ROUTES } from "@/src/lib/routes";
import { getWorkspaceEvents } from "@/src/app/(workspace)/events-actions";
import { getOrganizationById } from "@/src/app/(workspace)/actions";
import { EventsClient } from "@/src/components/workspace/events/events-client";
import { EventsLoading } from "@/src/components/workspace/events/event-skeleton";
import { EventsNotFound } from "@/src/components/workspace/events/events-not-found";
import { EVENT_MESSAGES } from "@/src/lib/events/event-validation";
import { PageReveal } from "@/src/components/workspace/frame/page-reveal";

interface EventsPageProps {
  params: Promise<{ id: string }>;
}

async function EventsContent({ params }: EventsPageProps) {
  await connection();
  const { id: rawId } = await params;

  // A malformed ID can't be an org, so no query runs
  if (!rawId || !isUuid(rawId)) return <EventsNotFound />;

  // Org check and event list don't depend on each other
  const [org, eventsRes] = await Promise.all([getOrganizationById(rawId), getWorkspaceEvents(rawId)]);

  if (!org) return <EventsNotFound />;

  if (!eventsRes.success || !eventsRes.data) {
    if (eventsRes.error === "not_authenticated") redirect(ROUTES.signIn);
    // A transient failure is not a missing page: show the retry banner instead
    if (eventsRes.error === "failed") {
      return (
        <PageReveal>
          <EventsClient rawId={rawId} events={[]} initialError={eventsRes.errorMessage ?? EVENT_MESSAGES.loadFailed} />
        </PageReveal>
      );
    }
    return <EventsNotFound />;
  }

  return (
    <PageReveal>
      <EventsClient rawId={rawId} events={eventsRes.data} />
    </PageReveal>
  );
}

export default function EventsPage(props: EventsPageProps) {
  return (
    <Suspense fallback={<EventsLoading />}>
      <EventsContent {...props} />
    </Suspense>
  );
}
