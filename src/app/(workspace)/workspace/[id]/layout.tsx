import { Suspense } from "react";
import { unstable_rethrow } from "next/navigation";
import {
  getCurrentOfficer,
  getOrganizationById,
  isOrgAdmin,
} from "@/src/app/(workspace)/actions";
import { isUuid } from "@/src/lib/validation";
import {
  WorkspaceFrame,
  type WorkspaceFrameData,
} from "@/src/components/workspace/frame/workspace-frame";
import { WorkspaceLoadingSkeleton } from "@/src/components/workspace/frame/workspace-skeleton";

async function loadFrameData(id: string): Promise<WorkspaceFrameData | null> {
  // A malformed ID can't be an org, so skip the database
  if (!isUuid(id)) return null;

  try {
    const [org, officer, isAdmin] = await Promise.all([
      getOrganizationById(id),
      getCurrentOfficer(),
      isOrgAdmin(id),
    ]);
    if (!org) return null;

    return {
      rawId: id,
      orgName: org.name,
      schoolName: org.school?.trim() || null,
      officer,
      isAdmin,
    };
  } catch (err) {
    unstable_rethrow(err);
    return null;
  }
}

// Reads the session, so it streams in behind the Suspense boundary below. The
// data is handed to the frame as a promise, not awaited here, so the page under
// it renders at the same time instead of waiting for the sidebar's data.
async function WorkspaceFrameLoader({
  params,
  children,
}: {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
}) {
  const { id } = await params;
  return <WorkspaceFrame data={loadFrameData(id)}>{children}</WorkspaceFrame>;
}

/**
 * Wraps Home, Invite and Join in the one workspace frame, so the sidebar is the
 * same on every screen that has one.
 */
export default function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<WorkspaceLoadingSkeleton />}>
      <WorkspaceFrameLoader params={params}>{children}</WorkspaceFrameLoader>
    </Suspense>
  );
}
