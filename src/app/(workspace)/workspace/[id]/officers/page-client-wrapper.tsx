"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/src/components/sidebar";
import { OfficerProfile } from "@/src/components/navbar";
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
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Restore sidebar preference from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("orgkit_sidebar_collapsed");
      if (saved === "true") {
        setIsSidebarCollapsed(true);
      }
    } catch {
      // localStorage may be disabled in some sandboxes
    }
  }, []);

  const toggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("orgkit_sidebar_collapsed", String(next));
      } catch {}
      return next;
    });
  };

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
        backgroundColor: "#F4F4F5",
        color: "#18181B",
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
          backgroundColor: "#F4F4F5",
          padding: "32px 24px",
          boxSizing: "border-box",
        }}
      >
        <OfficersClient initialData={initialData} orgId={rawId} />
      </main>
    </div>
  );
}

