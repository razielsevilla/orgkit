"use client";

import { useState, useRef } from "react";
import { ChevronsUpDown, LogOut } from "lucide-react";
import { signOut } from "@/src/app/auth/actions";
import { OfficerProfile } from "@/src/components/layout/navbar";
import { useDismissable } from "@/src/lib/use-dismissable";

interface ProfileMenuProps {
  officer?: OfficerProfile | null;
  isCollapsed: boolean;
}

export function ProfileMenu({ officer, isCollapsed }: ProfileMenuProps) {
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

  useDismissable(menuRef, () => setMenuOpen(false));

  return (
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
            border: "1px solid var(--color-line)",
            backgroundColor: "var(--color-surface)",
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
                backgroundColor: "var(--color-accent-soft)",
                color: "var(--color-accent)",
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
                  color: "var(--color-ink)",
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
                  color: "var(--color-muted)",
                  marginTop: 2,
                  lineHeight: 1,
                }}
              >
                Officer
              </div>
            </div>
          </div>

          <ChevronsUpDown size={15} color="var(--color-muted)" style={{ flexShrink: 0 }} />
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
              backgroundColor: "var(--color-accent-soft)",
              color: "var(--color-accent)",
              fontSize: 13,
              fontWeight: 700,
              border: "1px solid color-mix(in srgb, var(--color-accent) 20%, transparent)",
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
            border: "1px solid var(--color-line)",
            backgroundColor: "var(--color-surface)",
            padding: 6,
            boxShadow: "0 10px 25px rgba(0, 0, 0, 0.08)",
            zIndex: 60,
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              borderBottom: "1px solid var(--color-line)",
              padding: "8px 10px",
            }}
          >
            <p
              style={{
                fontSize: 12.5,
                fontWeight: 600,
                color: "var(--color-ink)",
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
                color: "var(--color-muted)",
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
                  color: "var(--color-danger)",
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
  );
}
