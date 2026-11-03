"use client";

import { WorkspaceOfficersData } from "@/src/app/(workspace)/officers-actions";
import { OfficersClient } from "./officers-client";

interface OfficersClientWrapperProps {
  rawId: string;
  initialData: WorkspaceOfficersData;
}

/**
 * The Invite screen's content. The sidebar and canvas around it come from the
 * workspace frame, so this only has to scroll its own list.
 */
export function OfficersClientWrapper({ rawId, initialData }: OfficersClientWrapperProps) {
  return (
    <div
      style={{
        height: "100%",
        overflowY: "auto",
        padding: "36px clamp(16px, 4vw, 36px) 60px clamp(16px, 4vw, 36px)",
        boxSizing: "border-box",
      }}
    >
      <OfficersClient initialData={initialData} orgId={rawId} />
    </div>
  );
}
