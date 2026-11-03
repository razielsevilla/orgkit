"use client";

import { OfficerProfile } from "@/src/components/layout/navbar";
import { SidebarStyles } from "@/src/components/layout/sidebar/sidebar-styles";
import { BrandHeader } from "@/src/components/layout/sidebar/brand-header";
import { WorkspaceCard } from "@/src/components/layout/sidebar/workspace-card";
import { NavList } from "@/src/components/layout/sidebar/nav-list";
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
  activePath?: string;
}

export function Sidebar({
  rawId,
  orgName,
  schoolName,
  officer,
  isAdmin = false,
  isCollapsed,
  onToggleCollapse,
  activePath = "home",
}: SidebarProps) {
  return (
    <aside
      style={{
        width: isCollapsed ? 70 : 256,
        minWidth: isCollapsed ? 70 : 256,
        maxWidth: isCollapsed ? 70 : 256,
        height: "100vh",
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
      <BrandHeader rawId={rawId} isCollapsed={isCollapsed} onToggleCollapse={onToggleCollapse} />

      {/* ── Bespoke Workspace Card ── */}
      <WorkspaceCard orgName={orgName} schoolName={schoolName} isCollapsed={isCollapsed} />

      {/* ── Navigation Items ── */}
      <NavList rawId={rawId} isAdmin={isAdmin} isCollapsed={isCollapsed} activePath={activePath} />

      {/* ── Pinned Bottom Officer Profile Card ── */}
      <ProfileMenu officer={officer} isCollapsed={isCollapsed} />
    </aside>
  );
}
