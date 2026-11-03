"use client";

import { plusJakarta } from "@/src/lib/fonts";
import { useSidebarCollapsed } from "@/src/lib/use-sidebar-collapsed";
import { Sidebar } from "@/src/components/layout/sidebar";
import type { OfficerProfile } from "@/src/components/layout/navbar";
import { ZeroScrollLock } from "@/src/components/ui/zero-scroll-lock";

interface WorkspaceShellProps {
  rawId: string;
  orgName: string;
  schoolName: string | null;
  officer: OfficerProfile | null;
  isAdmin: boolean;
  /** The screen's own content, rendered on the server and shown beside the sidebar */
  children: React.ReactNode;
}

/**
 * The workspace frame: the collapsible sidebar on the left and the content
 * canvas on the right. Only the sidebar's collapsed state needs the browser,
 * so the page content stays a Server Component passed in as `children`.
 */
export function WorkspaceShell({
  rawId,
  orgName,
  schoolName,
  officer,
  isAdmin,
  children,
}: WorkspaceShellProps) {
  const [isSidebarCollapsed, toggleSidebar] = useSidebarCollapsed();

  return (
    <div
      className={plusJakarta.className}
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
      <ZeroScrollLock />

      <Sidebar
        rawId={rawId}
        orgName={orgName}
        schoolName={schoolName}
        officer={officer}
        isAdmin={isAdmin}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={toggleSidebar}
        activePath="home"
      />

      {/* ── Main Full-Bleed Content Canvas ── */}
      <main
        style={{
          flex: 1,
          height: "100vh",
          position: "relative",
          overflow: "hidden",
          backgroundColor: "var(--color-base)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          boxSizing: "border-box",
        }}
      >
        {children}
      </main>
    </div>
  );
}
