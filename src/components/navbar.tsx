"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronDown, LogOut } from "lucide-react";
import { signOut } from "@/src/app/auth/actions";

export interface OfficerProfile {
  id?: string;
  email?: string;
  full_name?: string;
}

export interface NavbarProps {
  officer?: OfficerProfile | null;
  logoHref?: string;
}

export function Navbar({ officer, logoHref = "/workspace" }: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Compute officer initials and display name
  const displayName = officer?.full_name?.trim() || officer?.email?.split("@")[0] || "Officer";
  const initials = (() => {
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

  // Close dropdown on outside click or Escape
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
    <header
      style={{
        position: "relative",
        zIndex: 30,
        display: "flex",
        height: 72,
        width: "100%",
        flexShrink: 0,
        alignItems: "center",
        justifyContent: "space-between",
        padding: "14px clamp(24px, 3.5vw, 52px) 0 clamp(24px, 3.5vw, 52px)",
        boxSizing: "border-box",
      }}
    >
      {/* OrgKit Logo */}
      <Link
        href={logoHref}
        style={{
          display: "inline-flex",
          alignItems: "center",
          textDecoration: "none",
          transition: "opacity 0.15s ease",
        }}
        aria-label="OrgKit Home"
      >
        <Image
          src="/orgkit-text-logo.png"
          alt="OrgKit"
          width={126}
          height={42}
          priority
          style={{
            height: 40,
            width: "auto",
            display: "block",
            userSelect: "none",
          }}
        />
      </Link>

      {/* Officer Profile Badge & Dropdown */}
      <div style={{ position: "relative" }} ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((prev) => !prev)}
          aria-expanded={menuOpen}
          aria-haspopup="true"
          className="orgkit-profile-trigger"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 9,
            borderRadius: 9999,
            padding: "4px 10px 4px 6px",
            border: "none",
            backgroundColor: "transparent",
            cursor: "pointer",
            outline: "none",
            transition: "background-color 0.15s ease",
          }}
        >
          {/* Avatar Circle with initials */}
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              backgroundColor: "#D1FAE5",
              color: "#059669",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "-0.01em",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              userSelect: "none",
              flexShrink: 0,
            }}
          >
            {initials}
          </div>

          {/* Officer Name */}
          <span
            style={{
              fontSize: 13.5,
              fontWeight: 600,
              color: "#18181B",
              letterSpacing: "-0.01em",
            }}
          >
            {displayName}
          </span>

          {/* Down Chevron */}
          <ChevronDown
            style={{
              width: 14.5,
              height: 14.5,
              color: "#71717A",
              transform: menuOpen ? "rotate(180deg)" : "none",
              transition: "transform 0.2s ease",
            }}
            strokeWidth={2}
          />
        </button>

        {/* Dropdown Menu */}
        {menuOpen && (
          <div
            style={{
              position: "absolute",
              right: 0,
              marginTop: 8,
              width: 220,
              borderRadius: 16,
              border: "1px solid #E4E4E7",
              backgroundColor: "#FFFFFF",
              padding: 6,
              boxShadow: "0 10px 25px rgba(0, 0, 0, 0.08)",
              zIndex: 50,
              boxSizing: "border-box",
            }}
          >
            <div
              style={{
                borderBottom: "1px solid #E4E4E7",
                padding: "8px 12px",
              }}
            >
              <p
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#18181B",
                  margin: 0,
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

            <div style={{ padding: 4 }}>
              <form action={signOut}>
                <button
                  type="submit"
                  style={{
                    display: "flex",
                    width: "100%",
                    alignItems: "center",
                    gap: 8,
                    borderRadius: 10,
                    padding: "8px 10px",
                    fontSize: 12,
                    fontWeight: 500,
                    color: "#DC2626",
                    border: "none",
                    backgroundColor: "transparent",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "background-color 0.15s ease",
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
    </header>
  );
}

