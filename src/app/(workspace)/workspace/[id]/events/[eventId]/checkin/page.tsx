import { connection } from "next/server";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { isUuid } from "@/src/lib/validation";
import { ROUTES } from "@/src/lib/routes";
import { getWorkspaceEvent } from "@/src/app/(workspace)/events-actions";
import { getCheckinBlock } from "@/src/lib/events/checkin-eligibility";
import { EVENT_MESSAGES } from "@/src/lib/events/event-validation";
import { CheckinScreen } from "@/src/components/workspace/events/checkin-screen";
import { CheckinLoading } from "@/src/components/workspace/events/checkin-skeleton";
import { EventsNotFound } from "@/src/components/workspace/events/events-not-found";
import { EventsClient } from "@/src/components/workspace/events/events-client";
import { PageReveal } from "@/src/components/workspace/frame/page-reveal";

interface CheckinPageProps {
  params: Promise<{ id: string; eventId: string }>;
}

async function CheckinContent({ params }: CheckinPageProps) {
  await connection();
  const { id: rawId, eventId } = await params;

  // A malformed org or event ID can't match anything, so no query runs
  if (!rawId || !eventId || !isUuid(rawId) || !isUuid(eventId)) return <EventsNotFound />;

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

  return <CheckinScreen orgId={rawId} event={res.data} initialBlock={getCheckinBlock(res.data)} />;
}

export default function CheckinPage(props: CheckinPageProps) {
  return (
    <Suspense fallback={<CheckinLoading />}>
      <CheckinContent {...props} />
    </Suspense>
  );
}
