import { Suspense } from "react";
import {
  getOrganizationById,
  getOfficerDefaultWorkspace,
  getCurrentOfficer,
  isOrgAdmin,
} from "@/src/app/(workspace)/actions";
import { isUuid } from "@/src/lib/validation";
import { WorkspaceHome } from "./workspace-home";
import { WorkspaceLoadingSkeleton } from "./workspace-skeleton";
import { WorkspaceNotFound } from "./workspace-not-found";
import { WorkspaceShell } from "./workspace-shell";
import { officerLandingPath } from "@/src/lib/routes";

async function WorkspaceDetailContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Org details come only from the server, which returns them to members only.
  // Nothing from the URL is ever shown. A malformed ID can't be an org, so it
  // gets the same screen as an org the officer doesn't belong to.
  const valid = isUuid(id);
  const [org, officer, isAdmin] = await Promise.all([
    valid ? getOrganizationById(id) : null,
    getCurrentOfficer(),
    valid ? isOrgAdmin(id) : false,
  ]);

  if (!org) {
    const workspace = await getOfficerDefaultWorkspace();
    return (
      <WorkspaceNotFound
        officer={officer}
        workspaceHref={officerLandingPath({ orgId: workspace?.orgId })}
      />
    );
  }

  const schoolName = org.school?.trim() || null;

  return (
    <WorkspaceShell
      rawId={id}
      orgName={org.name}
      schoolName={schoolName}
      officer={officer}
      isAdmin={isAdmin}
    >
      <WorkspaceHome orgName={org.name} schoolName={schoolName} />
    </WorkspaceShell>
  );
}

export default function WorkspaceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<WorkspaceLoadingSkeleton />}>
      <WorkspaceDetailContent params={params} />
    </Suspense>
  );
}
