import { Suspense } from "react";
import {
  getOrganizationById,
  getOfficerDefaultWorkspace,
  getCurrentOfficer,
} from "@/src/app/(workspace)/actions";
import { isUuid } from "@/src/lib/validation";
import { WorkspaceHome } from "@/src/components/workspace/home/workspace-home";
import { WorkspaceNotFound } from "@/src/components/workspace/home/workspace-not-found";
import { officerLandingPath } from "@/src/lib/routes";

async function WorkspaceDetailContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Org details come only from the server, which returns them to members only.
  // Nothing from the URL is ever shown. A malformed ID can't be an org, so it
  // gets the same screen as an org the officer doesn't belong to. The sidebar
  // frame around this screen comes from the workspace layout.
  const org = isUuid(id) ? await getOrganizationById(id) : null;

  if (!org) {
    const [officer, workspace] = await Promise.all([
      getCurrentOfficer(),
      getOfficerDefaultWorkspace(),
    ]);
    return (
      <WorkspaceNotFound
        officer={officer}
        workspaceHref={officerLandingPath({ orgId: workspace?.orgId })}
      />
    );
  }

  return <WorkspaceHome orgName={org.name} schoolName={org.school?.trim() || null} />;
}

export default function WorkspaceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={null}>
      <WorkspaceDetailContent params={params} />
    </Suspense>
  );
}
