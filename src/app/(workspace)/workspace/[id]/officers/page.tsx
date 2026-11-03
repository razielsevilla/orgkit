import { connection } from "next/server";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getWorkspaceOfficers } from "@/src/app/(workspace)/officers-actions";
import { OfficersClientWrapper } from "@/src/components/workspace/officers/page-client-wrapper";
import { ROUTES, workspacePath } from "@/src/lib/routes";

interface OfficersPageProps {
  params: Promise<{ id: string }>;
}

async function OfficersContent({ params }: OfficersPageProps) {
  await connection();
  const { id: rawId } = await params;

  if (!rawId) {
    redirect(ROUTES.home);
  }

  // The officers list also proves the caller belongs to this org
  const officersRes = await getWorkspaceOfficers(rawId);

  // If not authenticated or not in this org
  if (!officersRes.success || !officersRes.data) {
    if (officersRes.error === "not_authenticated") {
      redirect(ROUTES.signIn);
    }
    redirect(workspacePath(rawId));
  }

  return <OfficersClientWrapper rawId={rawId} initialData={officersRes.data} />;
}

export default function OfficersPage(props: OfficersPageProps) {
  return (
    <Suspense fallback={null}>
      <OfficersContent {...props} />
    </Suspense>
  );
}
