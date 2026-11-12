"use client";

import { use } from "react";
import { usePathname } from "next/navigation";
import { plusJakarta } from "@/src/lib/fonts";
import { eventsPath, joinPanelPath, membersPath, officersPath } from "@/src/lib/routes";
import { useSidebarCollapsed } from "@/src/lib/use-sidebar-collapsed";
import { Sidebar } from "@/src/components/layout/sidebar";
import type { SidebarSection } from "@/src/components/layout/sidebar/nav-list";
import type { OfficerProfile } from "@/src/components/layout/navbar";
import { ZeroScrollLock } from "@/src/components/ui/zero-scroll-lock";
import { WorkspaceBackdrop } from "./workspace-backdrop";

/** What the frame needs to know about the org and the signed-in officer */
export interface WorkspaceFrameData {
  rawId: string;
  orgName: string;
  schoolName: string | null;
  officer: OfficerProfile | null;
  isAdmin: boolean;
}

function sectionFor(pathname: string, rawId: string): SidebarSection {
  if (pathname.startsWith(joinPanelPath(rawId))) return "join";
  if (pathname.startsWith(membersPath(rawId))) return "members";
  if (pathname.startsWith(eventsPath(rawId))) return "events";
  if (pathname.startsWith(officersPath(rawId))) return "invite";
  return "home";
}

/**
 * The one frame every workspace screen (Home, Join, Invite) sits in: the
 * sidebar on the left and the content canvas on the right. It lives in the
 * workspace layout, so the sidebar is built once and stays put as you move
 * between screens.
 *
 * `data` is null when there is no org to show (it doesn't exist, or the officer
 * isn't in it). Then the page itself renders the "can't find that page" screen.
 */
export function WorkspaceFrame({
  data,
  children,
}: {
  data: Promise<WorkspaceFrameData | null>;
  children: React.ReactNode;
}) {
  const frame = use(data);
  const pathname = usePathname();
  const [isSidebarCollapsed, toggleSidebar] = useSidebarCollapsed();

  if (!frame) return <>{children}</>;

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
        rawId={frame.rawId}
        orgName={frame.orgName}
        schoolName={frame.schoolName}
        officer={frame.officer}
        isAdmin={frame.isAdmin}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={toggleSidebar}
        activeSection={sectionFor(pathname, frame.rawId)}
      />

      <main
        style={{
          flex: 1,
          minWidth: 0,
          height: "100vh",
          position: "relative",
          overflow: "hidden",
          backgroundColor: "var(--color-base)",
        }}
      >
        <WorkspaceBackdrop />
        {/* Each screen fills this area and decides for itself how to centre or scroll */}
        <div style={{ position: "relative", zIndex: 1, height: "100%" }}>{children}</div>
      </main>
    </div>
  );
}
