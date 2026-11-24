import { connection } from "next/server";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getPastEventsLog } from "@/src/app/(workspace)/events-log-actions";
import { EventsLogClient } from "@/src/components/workspace/events-log/events-log-client";
import { ROUTES, workspacePath } from "@/src/lib/routes";
import { WorkspaceContentLoader } from "@/src/components/workspace/frame/workspace-content-loader";
import { PageReveal } from "@/src/components/workspace/frame/page-reveal";

interface EventsLogPageProps {
  params: Promise<{ id: string }>;
}

async function EventsLogContent({ params }: EventsLogPageProps) {
  await connection();
  const { id: rawId } = await params;

  if (!rawId) {
    redirect(ROUTES.home);
  }

  // Load past events log for the organization
  const logRes = await getPastEventsLog(rawId);

  // If not authenticated, send to sign-in.
  // If not an officer, redirect back to org home.
  if (!logRes.success || !logRes.data) {
    if (logRes.error === "not_authenticated") {
      redirect(ROUTES.signIn);
    }
    redirect(workspacePath(rawId));
  }

  return (
    <PageReveal>
      <EventsLogClient initialData={logRes.data} />
    </PageReveal>
  );
}

export default function EventsLogPage(props: EventsLogPageProps) {
  return (
    <Suspense fallback={<WorkspaceContentLoader />}>
      <EventsLogContent {...props} />
    </Suspense>
  );
}
