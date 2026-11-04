import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentOfficer, getOfficerDefaultWorkspace } from "@/src/app/(workspace)/actions";
import { CreateOrgForm } from "@/src/components/workspace/new-org/create-org-form";
import { NewOrgScreen } from "@/src/components/workspace/new-org/new-org-screen";
import { FlowLoader } from "@/src/components/workspace/frame/flow-loader";
import { ROUTES, workspacePath } from "@/src/lib/routes";

/** Shown inside the frame while the server checks who is signing in. */
function CheckingWorkspace() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: 220,
      }}
    >
      <FlowLoader />
    </div>
  );
}

// Reads the session, so it streams in behind the Suspense boundary below.
async function NewOrgContent() {
  const officer = await getCurrentOfficer();
  if (!officer) redirect(ROUTES.signIn);

  // One org per officer: someone who already has a workspace goes straight to it
  const existing = await getOfficerDefaultWorkspace();
  if (existing?.orgId) redirect(workspacePath(existing.orgId));

  return (
    <NewOrgScreen officer={officer}>
      <CreateOrgForm />
    </NewOrgScreen>
  );
}

export default function NewOrgPage() {
  return (
    <Suspense
      fallback={
        <NewOrgScreen officer={null}>
          <CheckingWorkspace />
        </NewOrgScreen>
      }
    >
      <NewOrgContent />
    </Suspense>
  );
}
