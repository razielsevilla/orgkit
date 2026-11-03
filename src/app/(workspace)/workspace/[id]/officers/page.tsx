import { Suspense } from "react";
import { redirect } from "next/navigation";
import { plusJakarta } from "@/src/lib/fonts";
import { getCurrentOfficer, getOrganizationById } from "@/src/app/(workspace)/actions";
import { getWorkspaceOfficers } from "@/src/app/(workspace)/officers-actions";
import { OfficersClientWrapper } from "./page-client-wrapper";

interface OfficersPageProps {
  params: Promise<{ id: string }>;
}

async function OfficersContent({ params }: OfficersPageProps) {
  const { id: rawId } = await params;

  if (!rawId) {
    redirect("/");
  }

  // Parallel fetch: current officer profile, workspace org details, and officers list
  const [officer, org, officersRes] = await Promise.all([
    getCurrentOfficer(),
    getOrganizationById(rawId),
    getWorkspaceOfficers(rawId),
  ]);

  // If not authenticated or not in this org
  if (!officersRes.success || !officersRes.data || !org) {
    if (officersRes.error === "not_authenticated") {
      redirect("/signin");
    }
    redirect(`/workspace/${rawId}`);
  }

  return (
    <div className={plusJakarta.className}>
      <OfficersClientWrapper
        rawId={rawId}
        orgName={org.name}
        schoolName={org.school}
        officer={officer}
        initialData={officersRes.data}
      />
    </div>
  );
}

export default function OfficersPage(props: OfficersPageProps) {
  return (
    <Suspense fallback={null}>
      <OfficersContent {...props} />
    </Suspense>
  );
}
