"use client";

import { useSidebarCollapsed } from "@/src/lib/use-sidebar-collapsed";
import { Sidebar } from "@/src/components/layout/sidebar";
import { OfficerProfile } from "@/src/components/layout/navbar";
import { WorkspaceOfficersData } from "@/src/app/(workspace)/officers-actions";
import { OfficersClient } from "./officers-client";

interface OfficersClientWrapperProps {
  rawId: string;
  orgName: string;
  schoolName?: string | null;
  officer: OfficerProfile | null;
  initialData: WorkspaceOfficersData;
}

export function OfficersClientWrapper({
  rawId,
  orgName,
  schoolName,
  officer,
  initialData,
}: OfficersClientWrapperProps) {
  const [isSidebarCollapsed, toggleSidebar] = useSidebarCollapsed();

  return (
    <div
      style={{
        height: "100vh",
        maxHeight: "100vh",
        width: "100%",
        overflow: "hidden",
        position: "relative",
        margin: 0,
        padding: 0,
        backgroundColor: "var(--color-base)",
        color: "var(--color-ink)",
        display: "flex",
        boxSizing: "border-box",
      }}
    >
      <Sidebar
        rawId={rawId}
        orgName={orgName}
        schoolName={schoolName}
        officer={officer}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={toggleSidebar}
        activePath="officers"
      />

      <main
        style={{
          flex: 1,
          height: "100vh",
          position: "relative",
          overflowY: "auto",
          backgroundColor: "var(--color-base)",
          padding: "32px 24px",
          boxSizing: "border-box",
        }}
      >
        <OfficersClient initialData={initialData} orgId={rawId} />
      </main>
    </div>
  );
}

