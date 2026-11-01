import { Suspense } from "react";
import { requireOfficer } from "@/src/lib/officer";
import { WorkspaceView } from "./workspace-view";

export default function WorkspacePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen w-full items-center justify-center bg-[#F4F4F5] text-sm text-[#71717A]">
          Loading workspace...
        </div>
      }
    >
      <WorkspaceContent />
    </Suspense>
  );
}

async function WorkspaceContent() {
  const { officer } = await requireOfficer();
  return <WorkspaceView officer={officer} />;
}

