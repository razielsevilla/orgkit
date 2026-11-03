import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentOfficer, getOfficerDefaultWorkspace } from "@/src/app/(workspace)/actions";
import { CreateOrgForm } from "./create-org-form";
import { NewOrgScreen } from "./new-org-screen";
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
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          border: "3px solid color-mix(in srgb, var(--color-accent) 20%, transparent)",
          borderTopColor: "var(--color-accent)",
          animation: "spin 0.8s linear infinite",
        }}
      />
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
