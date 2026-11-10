import { Suspense } from "react";
import { connection } from "next/server";
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
import { WorkspaceContentLoader } from "@/src/components/workspace/frame/workspace-content-loader";
import { WorkspaceBackdrop } from "@/src/components/workspace/frame/workspace-backdrop";

async function loadFrameData(id: string): Promise<WorkspaceFrameData | null> {
  await connection();
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
  await connection();
  const { id } = await params;
  return (
    <WorkspaceFrame data={loadFrameData(id)}>
      <Suspense fallback={<WorkspaceContentLoader />}>
        {children}
      </Suspense>
    </WorkspaceFrame>
  );
}

function WorkspaceFullLoading() {
  return (
    <div
      style={{
        height: "100vh",
        maxHeight: "100vh",
        width: "100vw",
        overflow: "hidden",
        backgroundColor: "var(--color-base)",
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <WorkspaceBackdrop />
      <div style={{ position: "relative", zIndex: 1, width: "100%" }}>
        <WorkspaceContentLoader />
      </div>
    </div>
  );
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
    <Suspense fallback={<WorkspaceFullLoading />}>
      <WorkspaceFrameLoader params={params}>{children}</WorkspaceFrameLoader>
    </Suspense>
  );
}
