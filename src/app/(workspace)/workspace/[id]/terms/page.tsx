import { connection } from "next/server";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getWorkspaceTerms } from "@/src/app/(workspace)/terms-actions";
import { TermsClient } from "@/src/components/workspace/terms/terms-client";
import { ROUTES, workspacePath } from "@/src/lib/routes";
import { WorkspaceContentLoader } from "@/src/components/workspace/frame/workspace-content-loader";
import { PageReveal } from "@/src/components/workspace/frame/page-reveal";

interface TermsPageProps {
  params: Promise<{ id: string }>;
}

async function TermsContent({ params }: TermsPageProps) {
  await connection();
  const { id: rawId } = await params;

  if (!rawId) {
    redirect(ROUTES.home);
  }

  // Load terms for the organization
  const termsRes = await getWorkspaceTerms(rawId);

  // If not authenticated or access revoked
  if (!termsRes.success || !termsRes.data) {
    if (termsRes.error === "not_authenticated") {
      redirect(ROUTES.signIn);
    }
    redirect(workspacePath(rawId));
  }

  return (
    <PageReveal>
      <TermsClient initialData={termsRes.data} />
    </PageReveal>
  );
}

export default function TermsPage(props: TermsPageProps) {
  return (
    <Suspense fallback={<WorkspaceContentLoader />}>
      <TermsContent {...props} />
    </Suspense>
  );
}
