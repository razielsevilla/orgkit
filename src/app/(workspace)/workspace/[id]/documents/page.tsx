import { connection } from "next/server";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getWorkspaceDocuments } from "@/src/app/(workspace)/documents-actions";
import { DocumentsWithDemo } from "@/src/components/workspace/tour/demo/page-demos";
import { ROUTES, workspacePath } from "@/src/lib/routes";
import { WorkspaceContentLoader } from "@/src/components/workspace/frame/workspace-content-loader";
import { PageReveal } from "@/src/components/workspace/frame/page-reveal";

interface DocumentsPageProps {
  params: Promise<{ id: string }>;
}

async function DocumentsContent({ params }: DocumentsPageProps) {
  await connection();
  const { id: rawId } = await params;

  if (!rawId) {
    redirect(ROUTES.home);
  }

  // Load documents for the organization
  const docRes = await getWorkspaceDocuments(rawId);

  // If not authenticated, send to sign-in.
  // If not an officer (e.g. member who is not an officer), access is denied -> redirect to org home.
  if (!docRes.success || !docRes.data) {
    if (docRes.error === "not_authenticated") {
      redirect(ROUTES.signIn);
    }
    redirect(workspacePath(rawId));
  }

  return (
    <PageReveal>
      <DocumentsWithDemo initialData={docRes.data} />
    </PageReveal>
  );
}

export default function DocumentsPage(props: DocumentsPageProps) {
  return (
    <Suspense fallback={<WorkspaceContentLoader />}>
      <DocumentsContent {...props} />
    </Suspense>
  );
}
