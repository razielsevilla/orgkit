import { Suspense } from "react";
import { requireOfficer } from "@/src/lib/auth/officer";

// Reads the session, so it streams in behind the Suspense boundary below.
// Signed-out visitors go to sign-in; officers who haven't agreed to the
// privacy notice go to /consent before they can reach any workspace page.
async function OfficerGate({ children }: { children: React.ReactNode }) {
  await requireOfficer();
  return <>{children}</>;
}

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <OfficerGate>{children}</OfficerGate>
    </Suspense>
  );
}
