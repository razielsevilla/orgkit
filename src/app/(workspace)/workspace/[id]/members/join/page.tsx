import { Suspense } from "react";
import { notFound } from "next/navigation";
import { createClient } from "@/src/lib/supabase/server";
import { requireOfficer } from "@/src/lib/auth/officer";
import { isUuid } from "@/src/lib/validation";
import { JoinPanel } from "@/src/components/workspace/member-join/join-panel";
import { WorkspaceContentLoader } from "@/src/components/workspace/frame/workspace-content-loader";
import { PageReveal } from "@/src/components/workspace/frame/page-reveal";

export default function MemberJoinPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<WorkspaceContentLoader />}>
      <MemberJoinContent params={params} />
    </Suspense>
  );
}

// Reads the session and the database, so it streams in behind Suspense.
// Only the org's admin gets past this; everyone else sees a plain 404.
async function MemberJoinContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();

  await requireOfficer();
  const supabase = await createClient();

  const { data: isAdmin } = await supabase.rpc("is_org_admin", { target_org: id });
  if (isAdmin !== true) notFound();

  const [{ data: org }, { data: link }] = await Promise.all([
    supabase.from("orgs").select("name, school").eq("id", id).maybeSingle(),
    supabase
      .from("org_join_links")
      .select("token")
      .eq("org_id", id)
      .eq("active", true)
      .maybeSingle(),
  ]);
  if (!org) notFound();

  // Links are built from the configured address, never from the request, so a
  // link copied on a preview deployment can't point somewhere else.
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");
  const siteUrl =
    configured || (process.env.NODE_ENV === "production" ? null : "http://localhost:3000");

  return (
    <PageReveal>
      <JoinPanel
        orgId={id}
        orgName={org.name}
        schoolName={org.school}
        siteUrl={siteUrl}
        initialToken={link?.token ?? null}
      />
    </PageReveal>
  );
}
