"use client";

import { OfficerProfile } from "@/src/components/layout/navbar";
import { SidebarStyles } from "@/src/components/layout/sidebar/sidebar-styles";
import { BrandHeader } from "@/src/components/layout/sidebar/brand-header";
import { WorkspaceCard } from "@/src/components/layout/sidebar/workspace-card";
import { NavList, type SidebarSection } from "@/src/components/layout/sidebar/nav-list";
import { ProfileMenu } from "@/src/components/layout/sidebar/profile-menu";

export interface SidebarProps {
  rawId: string;
  orgName: string;
  schoolName?: string | null;
  officer?: OfficerProfile | null;
  /** Admins of the org also see the member join link screen */
  isAdmin?: boolean;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  /** Which entry is highlighted */
  activeSection?: SidebarSection;
  /**
   * On a phone or small tablet the sidebar is a drawer (see frame-styles.tsx).
   * Then it is never collapsed, and its collapse button becomes Close menu.
   */
  isDrawer?: boolean;
  isDrawerOpen?: boolean;
  onCloseDrawer?: () => void;
  /** Lets the frame move focus into the drawer and keep it there while it is open */
  asideRef?: React.Ref<HTMLElement>;
  /** Opens the officer tour from the profile menu */
  onStartTour?: () => void;
}

export function Sidebar({
  rawId,
  orgName,
  schoolName,
  officer,
  isAdmin = false,
  isCollapsed,
  onToggleCollapse,
  activeSection = "home",
  isDrawer = false,
  isDrawerOpen = false,
  onCloseDrawer,
  asideRef,
  onStartTour,
}: SidebarProps) {
  return (
    <aside
      ref={asideRef}
      id="orgkit-sidebar"
      data-tour="sidebar"
      className={`orgkit-aside${isDrawerOpen ? " is-open" : ""}`}
      // As a drawer it is a modal menu; on a desktop it is just the side navigation
      role={isDrawer ? "dialog" : undefined}
      aria-modal={isDrawer && isDrawerOpen ? true : undefined}
      aria-label={isDrawer ? "Menu" : undefined}
      tabIndex={isDrawer ? -1 : undefined}
      style={{
        width: isCollapsed ? 70 : 256,
        minWidth: isCollapsed ? 70 : 256,
        maxWidth: isCollapsed ? 70 : 256,
        backgroundColor: "var(--color-surface)",
        borderRight: "1px solid var(--color-line)",
        display: "flex",
        flexDirection: "column",
        padding: isCollapsed ? "16px 10px" : "16px 14px 14px 14px",
        boxSizing: "border-box",
        flexShrink: 0,
        zIndex: 30,
        transition:
          "width 0.25s cubic-bezier(0.16, 1, 0.3, 1), min-width 0.25s cubic-bezier(0.16, 1, 0.3, 1), max-width 0.25s cubic-bezier(0.16, 1, 0.3, 1), padding 0.25s ease",
        position: "relative",
      }}
    >
      <SidebarStyles />

      {/* ── Top Brand Header & Sidebar Toggle ── */}
      <BrandHeader
        rawId={rawId}
        isCollapsed={isCollapsed}
        onToggleCollapse={onToggleCollapse}
        isDrawer={isDrawer}
        onCloseDrawer={onCloseDrawer}
      />

      {/* ── Bespoke Workspace Card ── */}
      <WorkspaceCard orgName={orgName} schoolName={schoolName} isCollapsed={isCollapsed} />

      {/* ── Navigation Items ── */}
      <NavList rawId={rawId} isAdmin={isAdmin} isCollapsed={isCollapsed} activeSection={activeSection} />

      {/* ── Pinned Bottom Officer Profile Card ── */}
      <ProfileMenu officer={officer} isCollapsed={isCollapsed} onStartTour={onStartTour} />
    </aside>
  );
}
