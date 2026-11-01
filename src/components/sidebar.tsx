"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ChevronsUpDown,
  LogOut,
  Home,
  Users,
  Calendar,
  Wallet,
  Archive,
  PanelLeft,
} from "lucide-react";
import { signOut } from "@/src/app/auth/actions";
import { OfficerProfile } from "@/src/components/navbar";

export interface SidebarProps {
  rawId: string;
  orgName: string;
  schoolName?: string | null;
  officer?: OfficerProfile | null;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  activePath?: string;
}

export function Sidebar({
  rawId,
  orgName,
  schoolName,
  officer,
  isCollapsed,
  onToggleCollapse,
  activePath = "home",
}: SidebarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Compute officer initials and display name
  const displayName = officer?.full_name?.trim() || officer?.email?.split("@")[0] || "Officer";
  const officerInitials = (() => {
    const nameToUse = officer?.full_name?.trim() || officer?.email || "";
    if (!nameToUse) return "OF";
    const parts = nameToUse.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    if (parts.length === 1 && parts[0].length > 0) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return "OF";
  })();

  // Derive organization initials (e.g. "Junior Marketing Association" -> "JM")
  const orgInitials = (() => {
    const parts = (orgName || "Organization").trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    if (parts.length === 1 && parts[0].length > 0) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return "OR";
  })();

  // Close dropdown on click outside or Escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <aside
      style={{
        width: isCollapsed ? 70 : 256,
        minWidth: isCollapsed ? 70 : 256,
        maxWidth: isCollapsed ? 70 : 256,
        height: "100vh",
        backgroundColor: "#FFFFFF",
        borderRight: "1px solid #E4E4E7",
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
      {/* ── Top Brand Header & Sidebar Toggle ── */}
      {!isCollapsed ? (
        /* Expanded: Logo on left, Toggle on right */
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
            height: 36,
          }}
        >
          <Link
            href={`/workspace/${rawId}`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              textDecoration: "none",
            }}
            aria-label="OrgKit Home"
          >
            <Image
              src="/orgkit-text-logo.png"
              alt="OrgKit"
              width={132}
              height={32}
              priority
              style={{
                height: 30,
                width: "auto",
                objectFit: "contain",
                display: "block",
              }}
            />
          </Link>

          <button
            type="button"
            onClick={onToggleCollapse}
            className="orgkit-sidebar-toggle"
            title="Collapse sidebar"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 32,
              height: 32,
              borderRadius: 8,
              border: "none",
              backgroundColor: "transparent",
              color: "#71717A",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <PanelLeft size={18} strokeWidth={1.8} />
          </button>
        </div>
      ) : (
        /* Collapsed: Logo is the toggle button! Swaps to PanelLeft on hover */
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: 16,
            height: 36,
          }}
        >
          <button
            type="button"
            onClick={onToggleCollapse}
            className="orgkit-collapsed-brand-btn"
            title="Expand sidebar"
            style={{
              position: "relative",
              width: 36,
              height: 36,
              borderRadius: 10,
              border: "none",
              backgroundColor: "transparent",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              padding: 0,
              transition: "background-color 0.15s ease",
            }}
          >
            {/* Default: OrgKit brand icon */}
            <div
              className="orgkit-brand-icon"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "opacity 0.15s ease, transform 0.15s ease",
              }}
            >
              <Image
                src="/orgkit-logo.png"
                alt="OrgKit"
                width={26}
                height={26}
                style={{
                  width: 24,
                  height: 24,
                  objectFit: "contain",
                  display: "block",
                }}
              />
            </div>

            {/* Hover: Sidebar expand toggle icon */}
            <div
              className="orgkit-toggle-icon"
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#18181B",
                transition: "opacity 0.15s ease, transform 0.15s ease",
              }}
            >
              <PanelLeft size={20} strokeWidth={1.8} />
            </div>
          </button>
        </div>
      )}

      {/* ── Bespoke Workspace Card ── */}
      {!isCollapsed ? (
        <div
          style={{
            position: "relative",
            overflow: "hidden",
            borderRadius: 18,
            background:
              "linear-gradient(135deg, rgba(236, 253, 245, 0.85) 0%, rgba(209, 250, 229, 0.45) 100%)",
            border: "1px solid rgba(5, 150, 105, 0.18)",
            padding: "12px 14px 14px 14px",
            marginBottom: 16,
            boxShadow: "0 2px 6px rgba(5, 150, 105, 0.04)",
          }}
        >
          {/* Top decorative handle bar */}
          <div
            style={{
              width: 32,
              height: 3,
              borderRadius: 9999,
              backgroundColor: "rgba(5, 150, 105, 0.28)",
              margin: "0 auto 10px auto",
            }}
          />

          {/* Subtitle / Eyebrow */}
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "#059669",
              marginBottom: 4,
            }}
          >
            WORKSPACE
          </div>

          {/* Organization Name */}
          <h2
            style={{
              fontSize: 14.5,
              fontWeight: 700,
              letterSpacing: "-0.015em",
              color: "#18181B",
              margin: 0,
              lineHeight: 1.25,
              wordBreak: "break-word",
            }}
          >
            {orgName}
          </h2>

          {/* School / Community (Only rendered if present) */}
          {schoolName && (
            <div
              style={{
                fontSize: 11.5,
                fontWeight: 400,
                color: "#52525B",
                marginTop: 3,
                lineHeight: 1.2,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              title={schoolName}
            >
              {schoolName}
            </div>
          )}

          {/* Role Badge */}
          <div style={{ marginTop: 10 }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                borderRadius: 9999,
                backgroundColor: "#FFFFFF",
                border: "1px solid rgba(228, 228, 231, 0.9)",
                padding: "2.5px 8.5px",
                fontSize: 11,
                fontWeight: 600,
                color: "#059669",
                boxShadow: "0 1px 3px rgba(0, 0, 0, 0.03)",
              }}
            >
              <span
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  backgroundColor: "#059669",
                }}
              />
              Officer
            </span>
          </div>
        </div>
      ) : (
        /* Collapsed: Compact Workspace Pill */
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: 16,
          }}
        >
          <div
            style={{
              position: "relative",
              width: 44,
              height: 48,
              borderRadius: 14,
              background:
                "linear-gradient(135deg, rgba(236, 253, 245, 0.9) 0%, rgba(209, 250, 229, 0.5) 100%)",
              border: "1px solid rgba(5, 150, 105, 0.2)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 2px 6px rgba(5, 150, 105, 0.05)",
            }}
            title={`${orgName}${schoolName ? ` • ${schoolName}` : ""}`}
          >
            <div
              style={{
                width: 14,
                height: 2.5,
                borderRadius: 9999,
                backgroundColor: "rgba(5, 150, 105, 0.3)",
                marginBottom: 4,
              }}
            />
            <span
              style={{
                fontSize: 13,
                fontWeight: 800,
                color: "#059669",
                letterSpacing: "-0.02em",
              }}
            >
              {orgInitials}
            </span>
          </div>
        </div>
      )}

      {/* ── Navigation Items ── */}
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
        <Link
          href={`/workspace/${rawId}`}
          className="orgkit-nav-item"
          title="Home"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: isCollapsed ? "center" : "flex-start",
            gap: 12,
            borderRadius: 12,
            padding: isCollapsed ? "9px 0" : "9px 12px",
            backgroundColor: "rgba(5, 150, 105, 0.10)",
            color: "#059669",
            textDecoration: "none",
            fontWeight: 600,
            fontSize: 13.5,
            transition: "all 0.15s ease",
          }}
        >
          <Home size={18} strokeWidth={2.2} color="#059669" />
          {!isCollapsed && <span>Home</span>}
        </Link>

        {/* Section Divider: Manage */}
        {!isCollapsed ? (
          <div
            style={{
              fontSize: 11.5,
              fontWeight: 600,
              letterSpacing: "0.01em",
              color: "#71717A",
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
              backgroundColor: "#E4E4E7",
              margin: "8px 12px",
            }}
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
              color: "#52525B",
              fontSize: 13.5,
              fontWeight: 500,
              cursor: "default",
              userSelect: "none",
              transition: "all 0.15s ease",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Icon size={18} strokeWidth={1.8} color="#71717A" />
              {!isCollapsed && <span>{label}</span>}
            </div>

            {!isCollapsed && (
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: 600,
                  color: "#71717A",
                  backgroundColor: "#F4F4F5",
                  border: "1px solid rgba(228, 228, 231, 0.8)",
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

      {/* ── Pinned Bottom Officer Profile Card ── */}
      <div style={{ position: "relative", marginTop: "auto" }} ref={menuRef}>
        {!isCollapsed ? (
          /* Expanded: Full Profile Card */
          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-expanded={menuOpen}
            aria-haspopup="true"
            className="orgkit-profile-row"
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderRadius: 14,
              border: "1px solid #E4E4E7",
              backgroundColor: "#FFFFFF",
              padding: "7px 10px",
              cursor: "pointer",
              transition: "all 0.15s ease",
              boxSizing: "border-box",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                overflow: "hidden",
              }}
            >
              {/* Initials Avatar */}
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  backgroundColor: "#D1FAE5",
                  color: "#059669",
                  fontSize: 11.5,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  userSelect: "none",
                }}
              >
                {officerInitials}
              </div>

              {/* Officer Name & Role */}
              <div style={{ textAlign: "left", overflow: "hidden" }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#18181B",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    lineHeight: 1.2,
                  }}
                  title={displayName}
                >
                  {displayName}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "#71717A",
                    marginTop: 2,
                    lineHeight: 1,
                  }}
                >
                  Officer
                </div>
              </div>
            </div>

            <ChevronsUpDown size={15} color="#71717A" style={{ flexShrink: 0 }} />
          </button>
        ) : (
          /* Collapsed: Avatar only trigger */
          <div style={{ display: "flex", justifyContent: "center" }}>
            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              aria-expanded={menuOpen}
              aria-haspopup="true"
              className="orgkit-profile-trigger"
              title={displayName}
              style={{
                width: 38,
                height: 38,
                borderRadius: "50%",
                backgroundColor: "#D1FAE5",
                color: "#059669",
                fontSize: 13,
                fontWeight: 700,
                border: "1px solid rgba(5, 150, 105, 0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                padding: 0,
                transition: "transform 0.15s ease",
              }}
            >
              {officerInitials}
            </button>
          </div>
        )}

        {/* Profile Dropdown Menu */}
        {menuOpen && (
          <div
            style={{
              position: "absolute",
              bottom: isCollapsed ? 48 : 56,
              left: isCollapsed ? 6 : 0,
              width: 220,
              borderRadius: 14,
              border: "1px solid #E4E4E7",
              backgroundColor: "#FFFFFF",
              padding: 6,
              boxShadow: "0 10px 25px rgba(0, 0, 0, 0.08)",
              zIndex: 60,
              boxSizing: "border-box",
            }}
          >
            <div
              style={{
                borderBottom: "1px solid #E4E4E7",
                padding: "8px 10px",
              }}
            >
              <p
                style={{
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: "#18181B",
                  margin: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {displayName}
              </p>
              <p
                style={{
                  fontSize: 11,
                  color: "#71717A",
                  margin: "2px 0 0 0",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {officer?.email || ""}
              </p>
            </div>

            <div style={{ padding: "4px 0 0 0" }}>
              <form action={signOut}>
                <button
                  type="submit"
                  style={{
                    display: "flex",
                    width: "100%",
                    alignItems: "center",
                    gap: 8,
                    borderRadius: 9,
                    padding: "8px 10px",
                    fontSize: 12,
                    fontWeight: 500,
                    color: "#DC2626",
                    border: "none",
                    backgroundColor: "transparent",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                  className="orgkit-profile-row"
                >
                  <LogOut style={{ width: 14, height: 14 }} />
                  Sign out
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

