import { connection } from "next/server";
import { Suspense } from "react";
import {
  getOrganizationById,
  getOfficerDefaultWorkspace,
  getCurrentOfficer,
} from "@/src/app/(workspace)/actions";
import { isUuid } from "@/src/lib/validation";
import { WorkspaceNotFound } from "@/src/components/workspace/home/workspace-not-found";
import { officerLandingPath } from "@/src/lib/routes";
import { WorkspaceContentLoader } from "@/src/components/workspace/frame/workspace-content-loader";
import { PageReveal } from "@/src/components/workspace/frame/page-reveal";

interface MembersPageProps {
  params: Promise<{ id: string }>;
}

async function MembersContent({ params }: MembersPageProps) {
  await connection();
  const { id } = await params;

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

  return (
    <PageReveal>
      <div style={{ padding: "32px 24px" }}>
        <h1 style={{ fontSize: "20px", fontWeight: 700, color: "var(--color-foreground)" }}>Members</h1>
      </div>
    </PageReveal>
  );
}

export default function MembersPage({ params }: MembersPageProps) {
  return (
    <Suspense fallback={<WorkspaceContentLoader />}>
      <MembersContent params={params} />
    </Suspense>
  );
}
