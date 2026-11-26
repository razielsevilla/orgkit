import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import {
  getOrganizationById,
  getCurrentOfficer,
  getOfficerDefaultWorkspace,
} from "@/src/app/(workspace)/actions";
import { getWorkspaceDuesPeriods } from "@/src/app/(workspace)/dues-periods-actions";
import { getDuesDashboardData } from "@/src/app/(workspace)/dues-dashboard-actions";
import { isUuid } from "@/src/lib/validation";
import { getSiteUrl } from "@/src/lib/site-url";
import { ROUTES, officerLandingPath } from "@/src/lib/routes";
import { WorkspaceNotFound } from "@/src/components/workspace/home/workspace-not-found";
import DuesLoading from "./loading";
import { PageReveal } from "@/src/components/workspace/frame/page-reveal";
import { DuesWithDemo } from "@/src/components/workspace/tour/demo/page-demos";

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

  const siteUrl = getSiteUrl();

  const defaultPeriod =
    periodsRes.data.find((p) => p.status === "open") || periodsRes.data[0];

  const initialDashboardRes = defaultPeriod
    ? await getDuesDashboardData(rawId, { periodId: defaultPeriod.id })
    : null;
  const initialDashboardData = initialDashboardRes?.success
    ? initialDashboardRes.data
    : null;

  return (
    <PageReveal>
      <DuesWithDemo
        rawId={rawId}
        initialPeriods={periodsRes.data}
        initialDashboardData={initialDashboardData}
        siteUrl={siteUrl}
      />
    </PageReveal>
  );
}

export default function DuesPage(props: DuesPageProps) {
  return (
    <Suspense fallback={<DuesLoading />}>
      <DuesContent {...props} />
    </Suspense>
  );
}
