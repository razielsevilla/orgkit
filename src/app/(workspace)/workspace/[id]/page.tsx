import { connection } from "next/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import {
  getOrganizationById,
  getOfficerDefaultWorkspace,
  getCurrentOfficer,
} from "@/src/app/(workspace)/actions";
import { getOrgHealth } from "@/src/app/(workspace)/org-health-actions";
import { isUuid } from "@/src/lib/validation";
import { OrgHealthDashboard } from "@/src/components/workspace/home/org-health-dashboard";
import { OrgHealthUnavailable } from "@/src/components/workspace/home/org-health-unavailable";
import { WorkspaceNotFound } from "@/src/components/workspace/home/workspace-not-found";
import { ROUTES, officerLandingPath } from "@/src/lib/routes";
import { WorkspaceContentLoader } from "@/src/components/workspace/frame/workspace-content-loader";
import { PageReveal } from "@/src/components/workspace/frame/page-reveal";

async function WorkspaceDetailContent({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;

  // Org details come only from the server, which returns them to members only.
  // Nothing from the URL is ever shown. A malformed ID can't be an org, so it
  // gets the same screen as an org the officer doesn't belong to. The sidebar
  // frame around this screen comes from the workspace layout.
  const [org, health] = isUuid(id)
    ? await Promise.all([getOrganizationById(id), getOrgHealth(id)])
    : [null, null];

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

  if (health?.error === "not_authenticated") {
    redirect(ROUTES.signIn);
  }

  return (
    <PageReveal>
      {health?.success && health.data ? (
        <OrgHealthDashboard
          orgId={id}
          orgName={org.name}
          schoolName={org.school?.trim() || null}
          data={health.data}
        />
      ) : (
        <OrgHealthUnavailable
          orgId={id}
          message={health?.errorMessage ?? "We couldn't load your org's health. Try again."}
        />
      )}
    </PageReveal>
  );
}

export default function WorkspaceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<WorkspaceContentLoader />}>
      <WorkspaceDetailContent params={params} />
    </Suspense>
  );
}
