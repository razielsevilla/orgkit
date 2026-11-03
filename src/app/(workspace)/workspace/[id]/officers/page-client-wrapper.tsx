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
          overflow: "hidden",
          backgroundColor: "var(--color-base)",
          display: "flex",
          flexDirection: "column",
          boxSizing: "border-box",
        }}
      >
        {/* Background Concentric SVG Circles: Top-Left (Matching Workspace Home & Join Panel) */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: 340,
            height: 340,
            pointerEvents: "none",
            zIndex: 0,
          }}
        >
          <svg viewBox="0 0 340 340" fill="none" style={{ width: "100%", height: "100%" }}>
            <circle cx="0" cy="0" r="260" fill="color-mix(in srgb, var(--color-accent) 5%, transparent)" />
            <circle
              cx="0"
              cy="0"
              r="200"
              stroke="color-mix(in srgb, var(--color-accent) 12%, transparent)"
              strokeWidth="1.2"
            />
            <circle
              cx="0"
              cy="0"
              r="320"
              stroke="color-mix(in srgb, var(--color-accent) 8%, transparent)"
              strokeWidth="1.2"
            />
          </svg>
        </div>

        {/* Background Concentric SVG Circles: Bottom-Right */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            bottom: 0,
            right: 0,
            width: 400,
            height: 400,
            pointerEvents: "none",
            zIndex: 0,
          }}
        >
          <svg viewBox="0 0 400 400" fill="none" style={{ width: "100%", height: "100%" }}>
            <circle
              cx="400"
              cy="400"
              r="340"
              stroke="color-mix(in srgb, var(--color-accent) 12%, transparent)"
              strokeWidth="1.2"
            />
            <circle
              cx="400"
              cy="400"
              r="260"
              stroke="color-mix(in srgb, var(--color-accent) 10%, transparent)"
              strokeWidth="1.2"
            />
            <circle
              cx="400"
              cy="400"
              r="180"
              stroke="color-mix(in srgb, var(--color-accent) 8%, transparent)"
              strokeWidth="1.2"
            />
          </svg>
        </div>

        {/* Scrollable Main Area */}
        <div
          style={{
            position: "relative",
            zIndex: 1,
            flex: 1,
            height: "100%",
            overflowY: "auto",
            padding: "36px clamp(16px, 4vw, 36px) 60px clamp(16px, 4vw, 36px)",
            boxSizing: "border-box",
          }}
        >
          <OfficersClient initialData={initialData} orgId={rawId} />
        </div>
      </main>
    </div>
  );
}
