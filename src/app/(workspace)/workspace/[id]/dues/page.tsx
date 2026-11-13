import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import {
  getOrganizationById,
  getCurrentOfficer,
  getOfficerDefaultWorkspace,
} from "@/src/app/(workspace)/actions";
import { getWorkspaceDuesPeriods } from "@/src/app/(workspace)/dues-actions";
import { isUuid } from "@/src/lib/validation";
import { ROUTES, officerLandingPath } from "@/src/lib/routes";
import { WorkspaceNotFound } from "@/src/components/workspace/home/workspace-not-found";
import { WorkspaceContentLoader } from "@/src/components/workspace/frame/workspace-content-loader";
import { PageReveal } from "@/src/components/workspace/frame/page-reveal";
import { DuesClient } from "@/src/components/workspace/dues/dues-client";

interface DuesPageProps {
  params: Promise<{ id: string }>;
}

async function DuesContent({ params }: DuesPageProps) {
  await connection();
  const { id: rawId } = await params;

  if (!rawId || !isUuid(rawId)) {
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

  const [org, periodsRes] = await Promise.all([
    getOrganizationById(rawId),
    getWorkspaceDuesPeriods(rawId),
  ]);

  if (!org || !periodsRes.success || !periodsRes.data) {
    if (periodsRes.error === "not_authenticated") {
      redirect(ROUTES.signIn);
    }
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

  return (
    <PageReveal>
      <DuesClient rawId={rawId} initialPeriods={periodsRes.data} />
    </PageReveal>
  );
}

export default function DuesPage(props: DuesPageProps) {
  return (
    <Suspense fallback={<WorkspaceContentLoader />}>
      <DuesContent {...props} />
    </Suspense>
  );
}
