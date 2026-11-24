import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCallerOrgMembership } from "@/src/lib/orgs/org-access";
import { getHandoverGuidesListAction } from "@/src/app/(workspace)/handover-actions";
import { HandoverOverviewClient } from "@/src/components/workspace/handover/handover-overview-client";
import { signInPath } from "@/src/lib/routes";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Handover Guides | OrgKit",
    description: "Structured role transition guides for incoming and outgoing officers.",
  };
}

export default async function HandoverOverviewPage({ params }: PageProps) {
  const { id } = await params;
  const lookup = await getCallerOrgMembership(id);

  if (!lookup.ok) {
    if (lookup.error === "not_authenticated") {
      redirect(signInPath());
    }
    notFound();
  }

  const res = await getHandoverGuidesListAction(id);
  const summary = res.success && res.data
    ? res.data
    : { orgId: id, guides: [], activeRoles: [] };

  return (
    <HandoverOverviewClient
      summary={summary}
      isAdmin={lookup.caller.role === "admin"}
    />
  );
}
