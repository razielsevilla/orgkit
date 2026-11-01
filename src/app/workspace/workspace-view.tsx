"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Plus_Jakarta_Sans } from "next/font/google";
import { ChevronDown, LogOut } from "lucide-react";
import { signOut } from "@/src/app/auth/actions";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

interface OfficerProps {
  id?: string;
  email?: string;
  full_name?: string;
}

export function WorkspaceView({ officer }: { officer?: OfficerProps }) {
  // view: "empty" corresponds to Image 2 ("We can't find that page.")
  // view: "create" corresponds to Image 3 ("Set up your org" card)
  const [view, setView] = useState<"empty" | "create">("empty");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Form field state for the workspace card
  const [orgName, setOrgName] = useState("");
  const [school, setSchool] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Lock scrollbars on desktop viewports to guarantee 100% viewport-fit
  useEffect(() => {
    function enforceZeroScroll() {
      if (window.innerWidth >= 1024) {
        document.documentElement.style.overflow = "hidden";
        document.body.style.overflow = "hidden";
      } else {
        document.documentElement.style.overflow = "";
        document.body.style.overflow = "";
      }
    }
    enforceZeroScroll();
    window.addEventListener("resize", enforceZeroScroll);
    return () => {
      window.removeEventListener("resize", enforceZeroScroll);
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    };
  }, []);

  // Close dropdown menu on click outside or Escape
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

  // Compute officer initials and display name
  const displayName = officer?.full_name?.trim() || "Alex Reyes";
  const initials = (() => {
    if (!officer?.full_name) return "AR";
    const parts = officer.full_name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    if (parts.length === 1 && parts[0].length > 0) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return "AR";
  })();

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
    }, 1000);
  };

  return (
    <div
      className={plusJakarta.className}
      style={{
        height: "100vh",
        maxHeight: "100vh",
        width: "100vw",
        maxWidth: "100%",
        overflow: "hidden",
        position: "relative",
        backgroundColor: "#F4F4F5",
        color: "#18181B",
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
      }}
    >
      <style>{`
        .orgkit-workspace-input:focus {
          border-color: #059669 !important;
          box-shadow: 0 0 0 3px rgba(5, 150, 105, 0.15) !important;
        }
        .orgkit-workspace-btn:hover:not(:disabled) {
          background-color: #047857 !important;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(5, 150, 105, 0.25) !important;
        }
        .orgkit-workspace-btn:active:not(:disabled) {
          transform: translateY(0);
        }
        .orgkit-profile-trigger:hover {
          background-color: rgba(0, 0, 0, 0.04);
        }
      `}</style>

      {/* ── Background Curved Corner Decorations (Absolute & strictly bounded) ── */}
      {/* Top-Left Arc */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: 220,
          height: 220,
          overflow: "hidden",
          pointerEvents: "none",
          zIndex: 0,
        }}
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 220 220"
          style={{ width: "100%", height: "100%", display: "block" }}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="0" cy="0" r="140" fill="#059669" fillOpacity="0.06" />
          <circle
            cx="0"
            cy="0"
            r="190"
            stroke="#059669"
            strokeWidth="1.2"
            strokeOpacity="0.32"
          />
        </svg>
      </div>

      {/* Bottom-Right Arc */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          right: 0,
          width: 260,
          height: 260,
          overflow: "hidden",
          pointerEvents: "none",
          zIndex: 0,
        }}
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 260 260"
          style={{ width: "100%", height: "100%", display: "block" }}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="260" cy="260" r="150" fill="#059669" fillOpacity="0.06" />
          <circle
            cx="260"
            cy="260"
            r="205"
            stroke="#059669"
            strokeWidth="1.2"
            strokeOpacity="0.32"
          />
        </svg>
      </div>

      {/* ── Top Navigation Bar ── */}
      <header
        style={{
          position: "relative",
          zIndex: 20,
          display: "flex",
          height: 56,
          width: "100%",
          flexShrink: 0,
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 32px",
          boxSizing: "border-box",
        }}
      >
        {/* OrgKit Logo */}
        <Link
          href="/workspace"
          style={{
            display: "inline-flex",
            alignItems: "center",
            textDecoration: "none",
          }}
        >
          <Image
            src="/orgkit-text-logo.png"
            alt="OrgKit"
            width={96}
            height={32}
            priority
            style={{
              height: 24,
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
              gap: 8,
              borderRadius: 9999,
              padding: "4px 8px 4px 5px",
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
                width: 28,
                height: 28,
                borderRadius: "50%",
                backgroundColor: "#D1FAE5",
                color: "#059669",
                fontSize: 11,
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
                fontSize: 13,
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
                width: 14,
                height: 14,
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
                  {officer?.email || "officer@example.com"}
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
                    }}
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

      {/* ── Main Viewport Content ── */}
      <main
        style={{
          position: "relative",
          zIndex: 10,
          display: "flex",
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          padding: "0 16px 24px 16px",
          marginTop: -20,
          boxSizing: "border-box",
        }}
      >
        {view === "empty" ? (
          /* ═════════════════════════════════════════════════════════════════
             IMAGE 2: Empty State ("We can't find that page.")
             ═════════════════════════════════════════════════════════════════ */
          <div
            style={{
              display: "flex",
              width: "100%",
              maxWidth: 320,
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
            }}
          >
            {/* Circular Document Search Badge */}
            <div
              style={{
                marginBottom: 16,
                display: "flex",
                width: 52,
                height: 52,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "50%",
                backgroundColor: "rgba(5, 150, 105, 0.10)",
              }}
            >
              <svg
                style={{
                  width: 24,
                  height: 24,
                  display: "block",
                  color: "#059669",
                }}
                viewBox="0 0 24 24"
                fill="none"
                stroke="#059669"
                strokeWidth="1.85"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <circle cx="11.5" cy="14" r="2.25" />
                <path d="m13.2 15.7 2.3 2.3" />
              </svg>
            </div>

            {/* Heading */}
            <h1
              style={{
                fontSize: 25,
                fontWeight: 800,
                letterSpacing: "-0.025em",
                color: "#18181B",
                margin: "0 0 6px 0",
                lineHeight: 1.15,
              }}
            >
              We can’t find that page.
            </h1>

            {/* Subtitle */}
            <p
              style={{
                fontSize: 13,
                fontWeight: 400,
                lineHeight: 1.45,
                color: "#71717A",
                margin: "0 0 20px 0",
                maxWidth: 270,
              }}
            >
              It may not exist, or you may not have access to it.
            </p>

            {/* "Go to my workspace" CTA */}
            <button
              type="button"
              onClick={() => setView("create")}
              className="orgkit-workspace-btn"
              style={{
                display: "inline-flex",
                height: 40,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 9999,
                backgroundColor: "#059669",
                padding: "0 24px",
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: "0.01em",
                color: "#FFFFFF",
                border: "none",
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(5, 150, 105, 0.2)",
                transition: "all 0.15s ease",
              }}
            >
              Go to my workspace
            </button>
          </div>
        ) : (
          /* ═════════════════════════════════════════════════════════════════
             IMAGE 3: Workspace Creation Card ("Set up your org")
             ═════════════════════════════════════════════════════════════════ */
          <div
            style={{
              width: "100%",
              maxWidth: 380,
              boxSizing: "border-box",
            }}
          >
            {/* Main Card */}
            <div
              style={{
                width: "100%",
                borderRadius: 22,
                border: "1px solid #E4E4E7",
                backgroundColor: "#FFFFFF",
                padding: "26px 28px",
                boxShadow: "0 16px 40px rgba(24, 24, 27, 0.06)",
                boxSizing: "border-box",
              }}
            >
              {/* Card Header */}
              <div style={{ textAlign: "center" }}>
                <h1
                  style={{
                    fontSize: 22,
                    fontWeight: 700,
                    letterSpacing: "-0.015em",
                    color: "#18181B",
                    margin: "0 0 4px 0",
                  }}
                >
                  Set up your Organization
                </h1>
                <p
                  style={{
                    fontSize: 12.5,
                    color: "#71717A",
                    margin: "0 0 22px 0",
                  }}
                >
                  Start by giving your organization a name.
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleCreateSubmit}>
                {/* Field 1: Org name */}
                <div style={{ marginBottom: 14 }}>
                  <label
                    htmlFor="org-name"
                    style={{
                      display: "block",
                      fontSize: 12.5,
                      fontWeight: 600,
                      color: "#18181B",
                      marginBottom: 6,
                    }}
                  >
                    Org name
                  </label>
                  <input
                    id="org-name"
                    type="text"
                    required
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="e.g. Junior Marketing Association"
                    className="orgkit-workspace-input"
                    style={{
                      height: 40,
                      width: "100%",
                      borderRadius: 10,
                      border: "1px solid #E4E4E7",
                      backgroundColor: "#FFFFFF",
                      padding: "0 12px",
                      fontSize: 12.5,
                      color: "#18181B",
                      boxSizing: "border-box",
                      outline: "none",
                      transition: "border-color 0.15s ease, box-shadow 0.15s ease",
                    }}
                  />
                </div>

                {/* Field 2: School or community (Optional) */}
                <div style={{ marginBottom: 20 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 6,
                    }}
                  >
                    <label
                      htmlFor="school-community"
                      style={{
                        fontSize: 12.5,
                        fontWeight: 600,
                        color: "#18181B",
                      }}
                    >
                      School or community
                    </label>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        borderRadius: 9999,
                        backgroundColor: "#F4F4F5",
                        padding: "2px 8px",
                        fontSize: 10,
                        fontWeight: 500,
                        color: "#71717A",
                      }}
                    >
                      Optional
                    </span>
                  </div>
                  <input
                    id="school-community"
                    type="text"
                    value={school}
                    onChange={(e) => setSchool(e.target.value)}
                    placeholder="e.g. Your school or community"
                    className="orgkit-workspace-input"
                    style={{
                      height: 40,
                      width: "100%",
                      borderRadius: 10,
                      border: "1px solid #E4E4E7",
                      backgroundColor: "#FFFFFF",
                      padding: "0 12px",
                      fontSize: 12.5,
                      color: "#18181B",
                      boxSizing: "border-box",
                      outline: "none",
                      transition: "border-color 0.15s ease, box-shadow 0.15s ease",
                    }}
                  />
                  <p
                    style={{
                      fontSize: 11,
                      color: "#71717A",
                      margin: "6px 0 0 0",
                    }}
                  >
                    Leave blank if your org isn't tied to one school.
                  </p>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="orgkit-workspace-btn"
                  style={{
                    display: "flex",
                    height: 40,
                    width: "100%",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 9999,
                    backgroundColor: "#059669",
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#FFFFFF",
                    border: "none",
                    cursor: isSubmitting ? "not-allowed" : "pointer",
                    opacity: isSubmitting ? 0.75 : 1,
                    boxShadow: "0 2px 8px rgba(5, 150, 105, 0.2)",
                    transition: "all 0.15s ease",
                  }}
                >
                  {isSubmitting ? "Creating…" : "Create workspace"}
                </button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
