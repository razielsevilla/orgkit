import { connection } from "next/server";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { isUuid } from "@/src/lib/validation";
import { getWorkspaceMembers } from "@/src/app/(workspace)/members-actions";
import { MembersClient } from "@/src/components/workspace/members/members-client";
import { MembersWithDemo } from "@/src/components/workspace/tour/demo/members-with-demo";
import { EMPTY_MEMBERS_DATA } from "@/src/components/workspace/members/members-empty-data";
import { ROUTES, officerLandingPath } from "@/src/lib/routes";
import {
  getOrganizationById,
  getCurrentOfficer,
  getOfficerDefaultWorkspace,
  isOrgAdmin,
} from "@/src/app/(workspace)/actions";
import { WorkspaceNotFound } from "@/src/components/workspace/home/workspace-not-found";
import { WorkspaceContentLoader } from "@/src/components/workspace/frame/workspace-content-loader";
import { PageReveal } from "@/src/components/workspace/frame/page-reveal";

interface MembersPageProps {
  params: Promise<{ id: string }>;
}

async function MembersContent({ params }: MembersPageProps) {
  await connection();
  const { id: rawId } = await params;

  // A malformed ID can't be an org
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

  // Fire org verification, role check, and member data retrieval concurrently in parallel
  const [org, isAdmin, membersRes] = await Promise.all([
    getOrganizationById(rawId),
    isOrgAdmin(rawId),
    getWorkspaceMembers(rawId),
  ]);

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

  const canExport = isAdmin === true;
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");
  const siteUrl =
    configured || (process.env.NODE_ENV === "production" ? null : "http://localhost:3000");

  if (!membersRes.success || !membersRes.data) {
    if (membersRes.error === "not_authenticated") {
      redirect(ROUTES.signIn);
    }
    // A transient failure is not a missing page: show the retry banner instead
    if (membersRes.error === "failed") {
      return (
        <PageReveal>
          <MembersClient
            rawId={rawId}
            initialData={EMPTY_MEMBERS_DATA}
            initialError={membersRes.errorMessage ?? "We couldn't load your members. Try again."}
            canExport={canExport}
            orgName={org.name}
            schoolName={org.school}
            siteUrl={siteUrl}
          />
        </PageReveal>
      );
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
      <MembersWithDemo
        rawId={rawId}
        initialData={membersRes.data}
        canExport={canExport}
        orgName={org.name}
        schoolName={org.school}
        initialJoinToken={membersRes.data.joinLinkToken}
        siteUrl={siteUrl}
      />
    </PageReveal>
  );
}

export default function MembersPage(props: MembersPageProps) {
  return (
    <Suspense fallback={<WorkspaceContentLoader />}>
      <MembersContent {...props} />
    </Suspense>
  );
}
