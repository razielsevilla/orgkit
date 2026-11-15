import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import {
  getOrganizationById,
  getCurrentOfficer,
  getOfficerDefaultWorkspace,
} from "@/src/app/(workspace)/actions";
import {
  getWorkspaceDuesPeriods,
  getDuesDashboardData,
} from "@/src/app/(workspace)/dues-actions";
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

  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");
  const siteUrl =
    configured || (process.env.NODE_ENV === "production" ? null : "http://localhost:3000");

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
      <DuesClient
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
    <Suspense fallback={<WorkspaceContentLoader />}>
      <DuesContent {...props} />
    </Suspense>
  );
}
