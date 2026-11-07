import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Home, QrCode, UserPlus, Users } from "lucide-react";
import { joinPanelPath, membersPath, officersPath, workspacePath } from "@/src/lib/routes";

interface NavLinkItemProps {
  href: string;
  title: string;
  label: string;
  icon: LucideIcon;
  strokeWidth: number;
  isActive: boolean;
  isCollapsed: boolean;
}

function NavLinkItem({
  href,
  title,
  label,
  icon: Icon,
  strokeWidth,
  isActive,
  isCollapsed,
}: NavLinkItemProps) {
  return (
    <Link
      href={href}
      prefetch={true}
      className={`orgkit-nav-item ${isActive ? "active" : ""}`}
      title={title}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: isCollapsed ? "center" : "flex-start",
        gap: 12,
        borderRadius: 12,
        padding: isCollapsed ? "9px 0" : "9px 12px",
        backgroundColor: isActive ? "color-mix(in srgb, var(--color-accent) 10%, transparent)" : "transparent",
        color: isActive ? "var(--color-accent)" : "var(--color-muted-strong)",
        textDecoration: "none",
        fontWeight: isActive ? 600 : 500,
        fontSize: 13.5,
        transition: "all 0.15s ease",
      }}
    >
      <Icon size={18} strokeWidth={strokeWidth} color={isActive ? "var(--color-accent)" : "var(--color-muted)"} />
      {!isCollapsed && <span>{label}</span>}
    </Link>
  );
}

/** The sidebar entries. Only features that exist are listed. */
export type SidebarSection = "home" | "members" | "join" | "invite";

interface NavListProps {
  rawId: string;
  isAdmin: boolean;
  isCollapsed: boolean;
  activeSection: SidebarSection;
}

export function NavList({ rawId, isAdmin, isCollapsed, activeSection }: NavListProps) {
  return (
    <nav
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 4,
        flex: 1,
        overflowY: "auto",
      }}
    >
      <NavLinkItem
        href={workspacePath(rawId)}
        title="Home"
        label="Home"
        icon={Home}
        strokeWidth={2.2}
        isActive={activeSection === "home"}
        isCollapsed={isCollapsed}
      />

      <NavLinkItem
        href={membersPath(rawId)}
        title="Members: view and manage roster"
        label="Members"
        icon={Users}
        strokeWidth={2.2}
        isActive={activeSection === "members"}
        isCollapsed={isCollapsed}
      />

      {/* Admins only: the public link and QR code students join with */}
      {isAdmin && (
        <NavLinkItem
          href={joinPanelPath(rawId)}
          title="Join: the link and QR code for members"
          label="Join"
          icon={QrCode}
          strokeWidth={2.2}
          isActive={activeSection === "join"}
          isCollapsed={isCollapsed}
        />
      )}

      <NavLinkItem
        href={officersPath(rawId)}
        title="Invite: officers and invites"
        label="Invite"
        icon={UserPlus}
        strokeWidth={2.2}
        isActive={activeSection === "invite"}
        isCollapsed={isCollapsed}
      />
    </nav>
  );
}
