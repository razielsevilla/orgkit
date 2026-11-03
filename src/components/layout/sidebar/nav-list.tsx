import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Home, Users, UserCheck, Calendar, Wallet, Archive, QrCode } from "lucide-react";
import { joinPanelPath, officersPath, workspacePath } from "@/src/lib/routes";

interface NavLinkItemProps {
  href: string;
  title: string;
  label: string;
  icon: LucideIcon;
  strokeWidth: number;
  isActive: boolean;
  isCollapsed: boolean;
  /** Whether the "active" class is applied to the link when active */
  withActiveClass?: boolean;
}

function NavLinkItem({
  href,
  title,
  label,
  icon: Icon,
  strokeWidth,
  isActive,
  isCollapsed,
  withActiveClass = true,
}: NavLinkItemProps) {
  return (
    <Link
      href={href}
      className={withActiveClass ? `orgkit-nav-item ${isActive ? "active" : ""}` : "orgkit-nav-item"}
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

interface NavListProps {
  rawId: string;
  isAdmin: boolean;
  isCollapsed: boolean;
  activePath: string;
}

export function NavList({ rawId, isAdmin, isCollapsed, activePath }: NavListProps) {
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
      {/* Active: Home */}
      <NavLinkItem
        href={workspacePath(rawId)}
        title="Home"
        label="Home"
        icon={Home}
        strokeWidth={2.2}
        isActive={activePath === "home"}
        isCollapsed={isCollapsed}
      />

      {/* Navigation Item: Officers (Ticket Section 8: above Manage group) */}
      <NavLinkItem
        href={officersPath(rawId)}
        title="Officers"
        label="Officers"
        icon={UserCheck}
        strokeWidth={2.2}
        isActive={activePath === "officers"}
        isCollapsed={isCollapsed}
      />

      {/* Section Divider: Manage */}
      {!isCollapsed ? (
        <div
          style={{
            fontSize: 11.5,
            fontWeight: 600,
            letterSpacing: "0.01em",
            color: "var(--color-muted)",
            padding: "12px 10px 5px 10px",
            userSelect: "none",
          }}
        >
          Manage
        </div>
      ) : (
        <div
          style={{
            height: 1,
            backgroundColor: "var(--color-line)",
            margin: "8px 12px",
          }}
        />
      )}

      {isAdmin && (
        <NavLinkItem
          href={joinPanelPath(rawId)}
          title="Member join"
          label="Member join"
          icon={QrCode}
          strokeWidth={1.8}
          isActive={activePath === "member-join"}
          isCollapsed={isCollapsed}
          withActiveClass={false}
        />
      )}

      {/* Future modules */}
      {[
        { label: "Members", icon: Users },
        { label: "Events", icon: Calendar },
        { label: "Dues", icon: Wallet },
        { label: "Archive", icon: Archive },
      ].map(({ label, icon: Icon }) => (
        <div
          key={label}
          className="orgkit-nav-item"
          title={`${label} (Soon)`}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: isCollapsed ? "center" : "space-between",
            borderRadius: 12,
            padding: isCollapsed ? "9px 0" : "9px 12px",
            color: "var(--color-muted-strong)",
            fontSize: 13.5,
            fontWeight: 500,
            cursor: "default",
            userSelect: "none",
            transition: "all 0.15s ease",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Icon size={18} strokeWidth={1.8} color="var(--color-muted)" />
            {!isCollapsed && <span>{label}</span>}
          </div>

          {!isCollapsed && (
            <span
              style={{
                fontSize: 10.5,
                fontWeight: 600,
                color: "var(--color-muted)",
                backgroundColor: "var(--color-base)",
                border: "1px solid color-mix(in srgb, var(--color-line) 80%, transparent)",
                borderRadius: 9999,
                padding: "1.5px 7px",
                lineHeight: 1.2,
              }}
            >
              Soon
            </span>
          )}
        </div>
      ))}
    </nav>
  );
}
