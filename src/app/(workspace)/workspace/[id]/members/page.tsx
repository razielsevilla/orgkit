import { connection } from "next/server";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { isUuid } from "@/src/lib/validation";
import { getSessionUser } from "@/src/lib/auth/session-user";
import { getWorkspaceMembers } from "@/src/app/(workspace)/members-actions";
import { MembersClient } from "@/src/components/workspace/members/members-client";
import { EMPTY_MEMBERS_DATA } from "@/src/components/workspace/members/members-empty-data";
import { ROUTES, officerLandingPath } from "@/src/lib/routes";
import {
  getOrganizationById,
  getCurrentOfficer,
  getOfficerDefaultWorkspace,
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

  // Check caller belongs to this org
  const org = await getOrganizationById(rawId);
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

  // Only an admin sees Export. The route and the database check the role again.
  const [membersRes, { supabase }] = await Promise.all([
    getWorkspaceMembers(rawId),
    getSessionUser(),
  ]);
  const { data: isAdmin } = await supabase.rpc("is_org_admin", { target_org: rawId });
  const canExport = isAdmin === true;

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
      <MembersClient rawId={rawId} initialData={membersRes.data} canExport={canExport} />
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
