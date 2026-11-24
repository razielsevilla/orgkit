import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCallerOrgMembership } from "@/src/lib/orgs/org-access";
import {
  getHandoverGuideAction,
  getAvailableHandoverDocumentsAction,
} from "@/src/app/(workspace)/handover-actions";
import { HandoverClient } from "@/src/components/workspace/handover/handover-client";
import { createEmptyHandoverSections } from "@/src/lib/handover/handover-helpers";
import { signInPath, handoverPath } from "@/src/lib/routes";
import { isUuid } from "@/src/lib/validation";

interface PageProps {
  params: Promise<{ id: string; guideId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { guideId } = await params;
  const decoded = decodeURIComponent(guideId);
  return {
    title: `${decoded} Handover Guide | OrgKit`,
    description: "Structured role transition guide with responsibilities, contacts, and key links.",
  };
}

export default async function HandoverGuideDetailPage({ params }: PageProps) {
  const { id, guideId } = await params;
  const lookup = await getCallerOrgMembership(id);

  if (!lookup.ok) {
    if (lookup.error === "not_authenticated") {
      redirect(signInPath());
    }
    notFound();
  }

  const decodedGuideIdOrRole = decodeURIComponent(guideId);
  const [guideRes, docsRes] = await Promise.all([
    getHandoverGuideAction(id, decodedGuideIdOrRole),
    getAvailableHandoverDocumentsAction(id),
  ]);

  const availableDocuments = docsRes.success && docsRes.data ? docsRes.data : [];

  if (!guideRes.success || !guideRes.data) {
    if (guideRes.error === "not_authorized") {
      redirect(handoverPath(id));
    }
    const roleTitle = isUuid(decodedGuideIdOrRole) ? "General Officer" : decodedGuideIdOrRole;
    return (
      <HandoverClient
        initialGuide={{
          id: "",
          orgId: id,
          termId: null,
          termName: null,
          roleTitle,
          status: "draft",
          sections: createEmptyHandoverSections(),
          linkedDocuments: [],
          authorId: lookup.caller.user.id,
          finalizedBy: null,
          finalizedAt: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          canEdit: true,
          canReopen: false,
          canFinalize: true,
        }}
        availableDocuments={availableDocuments}
        isAdmin={lookup.caller.role === "admin"}
      />
    );
  }

  return (
    <HandoverClient
      initialGuide={guideRes.data}
      availableDocuments={availableDocuments}
      isAdmin={lookup.caller.role === "admin"}
    />
  );
}
