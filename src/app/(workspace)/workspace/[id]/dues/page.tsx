import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { getOrganizationById } from "@/src/app/(workspace)/actions";
import { getWorkspaceDuesPeriods } from "@/src/app/(workspace)/dues-actions";
import { isUuid } from "@/src/lib/validation";
import { ROUTES, workspacePath } from "@/src/lib/routes";
import { WorkspaceContentLoader } from "@/src/components/workspace/frame/workspace-content-loader";
import { PageReveal } from "@/src/components/workspace/frame/page-reveal";

interface DuesPageProps {
  params: Promise<{ id: string }>;
}

async function DuesContent({ params }: DuesPageProps) {
  await connection();
  const { id: rawId } = await params;

  if (!rawId || !isUuid(rawId)) {
    redirect(ROUTES.home);
  }

  const [org, periodsRes] = await Promise.all([
    getOrganizationById(rawId),
    getWorkspaceDuesPeriods(rawId),
  ]);

  if (!org || !periodsRes.success || !periodsRes.data) {
    if (periodsRes.error === "not_authenticated") {
      redirect(ROUTES.signIn);
    }
    redirect(workspacePath(rawId));
  }

  return (
    <PageReveal>
      <div style={{ padding: "32px 24px" }}>
        <h1>Dues</h1>
      </div>
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
