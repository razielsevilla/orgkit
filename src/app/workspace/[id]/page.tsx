"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { Plus_Jakarta_Sans } from "next/font/google";
import {
  ChevronDown,
  ChevronsUpDown,
  LogOut,
  Home,
  Users,
  Calendar,
  Wallet,
  Archive,
  QrCode,
  ClipboardCheck,
  PanelLeft,
  PanelLeftClose,
} from "lucide-react";
import { signOut } from "@/src/app/auth/actions";
import {
  getOrganizationById,
  getOfficerDefaultWorkspace,
  getCurrentOfficer,
} from "@/src/app/workspace/actions";
import { createClient } from "@/src/lib/supabase/client";

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

function WorkspaceDetailContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const rawId = (params?.id as string) || "";

  // Query param overrides or fallback defaults from design
  const queryName = searchParams.get("name");
  const querySchool = searchParams.get("school");

  const [orgData, setOrgData] = useState<{ name: string; school: string } | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Restore sidebar preference from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("orgkit_sidebar_collapsed");
      if (saved === "true") {
        setIsSidebarCollapsed(true);
      }
    } catch {
      // localStorage may be disabled in some sandboxes
    }
  }, []);

  const toggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("orgkit_sidebar_collapsed", String(next));
      } catch {}
      return next;
    });
  };

  const [isLoadingOrg, setIsLoadingOrg] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    async function loadOrg() {
      if (!rawId) {
        setIsLoadingOrg(false);
        setAccessDenied(true);
        return;
      }
      try {
        const org = await getOrganizationById(rawId);
        if (org) {
          setOrgData({ name: org.name, school: org.school || "" });
          setAccessDenied(false);
        } else {
          // Check if officer belongs to their own workspace and route them there
          const defaultWs = await getOfficerDefaultWorkspace();
          if (defaultWs?.orgId && defaultWs.orgId !== rawId) {
            router.replace(`/workspace/${defaultWs.orgId}`);
            return;
          }
          // Officer is not a member of this organization, or organization does not exist
          setAccessDenied(true);
        }
      } catch (err) {
        console.error("Error loading org from database:", err);
        setAccessDenied(true);
      } finally {
        setIsLoadingOrg(false);
      }
    }
    loadOrg();
  }, [rawId, router]);

  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      rawId
    );

  const orgName =
    orgData?.name ||
    queryName?.trim() ||
    (!isUuid && rawId && rawId !== "default"
      ? rawId
          .split("-")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ")
      : "Organization");

  // Only display school/community if explicitly provided or saved in DB (never fall back to static text)
  const schoolName = (() => {
    if (orgData) {
      return orgData.school?.trim() || null;
    }
    if (querySchool !== null && querySchool !== undefined) {
      return querySchool.trim() || null;
    }
    return null;
  })();

  // Derive organization initials (e.g. "Junior Marketing Association" -> "JM")
  const orgInitials = (() => {
    const parts = orgName.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    if (parts.length === 1 && parts[0].length > 0) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return "JM";
  })();

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [officer, setOfficer] = useState<OfficerProps | null>(null);

  // Load signed-in officer session
  useEffect(() => {
    async function loadOfficerSession() {
      try {
        const officerData = await getCurrentOfficer();
        if (officerData) {
          setOfficer(officerData);
        }
      } catch (err) {
        console.error("Failed to load officer session:", err);
      }
    }
    loadOfficerSession();
  }, []);

  // Strict zero-scroll desktop policy
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

  if (isLoadingOrg) {
    return <WorkspaceLoadingSkeleton />;
  }

  if (accessDenied) {
    return (
      <div
        className={plusJakarta.className}
        style={{
          height: "100vh",
          width: "100%",
          overflow: "hidden",
          position: "relative",
          margin: 0,
          padding: 0,
          backgroundColor: "#F4F4F5",
          color: "#18181B",
          display: "flex",
          flexDirection: "column",
          boxSizing: "border-box",
        }}
      >
        {/* Top Minimal Navigation Bar */}
        <header
          style={{
            height: 60,
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 clamp(16px, 3.5vw, 40px)",
            boxSizing: "border-box",
          }}
        >
          <Image
            src="/orgkit-text-logo.png"
            alt="OrgKit"
            width={132}
            height={32}
            priority
            style={{ height: 30, width: "auto", objectFit: "contain" }}
          />

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                backgroundColor: "#D1FAE5",
                color: "#059669",
                fontSize: 12,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                userSelect: "none",
              }}
            >
              {officerInitials}
            </div>
            <span
              style={{
                fontSize: 13.5,
                fontWeight: 600,
                color: "#18181B",
              }}
            >
              {displayName}
            </span>
          </div>
        </header>

        {/* Access Refused Main Canvas */}
        <main
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            textAlign: "center",
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              maxWidth: 360,
              width: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            {/* Search/Not Found Circle Icon */}
            <div
              style={{
                marginBottom: 20,
                display: "flex",
                width: 66,
                height: 66,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "50%",
                backgroundColor: "rgba(5, 150, 105, 0.10)",
              }}
            >
              <svg
                style={{
                  width: 28,
                  height: 28,
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

            <h1
              style={{
                fontSize: 28,
                fontWeight: 800,
                letterSpacing: "-0.025em",
                color: "#18181B",
                margin: "0 0 8px 0",
                lineHeight: 1.15,
              }}
            >
              We can’t find that page.
            </h1>

            <p
              style={{
                fontSize: 14.5,
                fontWeight: 400,
                lineHeight: 1.45,
                color: "#71717A",
                margin: "0 0 24px 0",
              }}
            >
              It may not exist, or you may not have access to it.
            </p>

            <button
              type="button"
              onClick={async () => {
                const defaultWs = await getOfficerDefaultWorkspace();
                if (defaultWs?.orgId) {
                  router.replace(`/workspace/${defaultWs.orgId}`);
                } else {
                  router.replace("/workspace");
                }
              }}
              className="orgkit-cta-btn"
              style={{
                display: "inline-flex",
                height: 46,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 9999,
                backgroundColor: "#059669",
                padding: "0 32px",
                fontSize: 14.5,
                fontWeight: 600,
                color: "#FFFFFF",
                border: "none",
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(5, 150, 105, 0.2)",
              }}
            >
              Go to your workspace
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div
      className={plusJakarta.className}
      style={{
        height: "100vh",
        maxHeight: "100vh",
        width: "100%",
        maxWidth: "100%",
        overflow: "hidden",
        position: "relative",
        margin: 0,
        padding: 0,
        backgroundColor: "#F4F4F5",
        color: "#18181B",
        display: "flex",
        boxSizing: "border-box",
      }}
    >
      <style>{`
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          background-color: #F4F4F5 !important;
        }
        .orgkit-nav-item:hover {
          background-color: rgba(0, 0, 0, 0.04);
        }
        .orgkit-cta-btn:hover {
          background-color: #047857 !important;
          transform: translateY(-1px);
          box-shadow: 0 4px 14px rgba(5, 150, 105, 0.28) !important;
        }
        .orgkit-cta-btn:active {
          transform: translateY(0);
        }
        .orgkit-sidebar-toggle:hover {
          background-color: rgba(0, 0, 0, 0.05);
          color: #18181B !important;
        }
        .orgkit-collapsed-brand-btn:hover {
          background-color: rgba(0, 0, 0, 0.05);
        }
        .orgkit-collapsed-brand-btn .orgkit-toggle-icon {
          opacity: 0;
          transform: scale(0.85);
          pointer-events: none;
        }
        .orgkit-collapsed-brand-btn:hover .orgkit-toggle-icon {
          opacity: 1;
          transform: scale(1);
          pointer-events: auto;
        }
        .orgkit-collapsed-brand-btn .orgkit-brand-icon {
          opacity: 1;
          transform: scale(1);
        }
        .orgkit-collapsed-brand-btn:hover .orgkit-brand-icon {
          opacity: 0;
          transform: scale(0.85);
        }
        .orgkit-profile-row:hover {
          background-color: rgba(0, 0, 0, 0.04);
        }
        @keyframes cardPopout {
          0% {
            opacity: 0;
            transform: scale(0.92) translateY(14px);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        /* ── Floating Icons Burst Outward with Natural Tilt ── */
        @keyframes burstTL {
          0% {
            opacity: 0;
            transform: translate(160px, 240px) scale(0.2) rotate(0deg);
          }
          65% {
            opacity: 1;
            transform: translate(-5px, -6px) scale(1.08) rotate(-8.5deg);
          }
          100% {
            opacity: 1;
            transform: translate(0, 0) scale(1) rotate(-7deg);
          }
        }
        @keyframes burstFL {
          0% {
            opacity: 0;
            transform: translate(220px, 30px) scale(0.2) rotate(0deg);
          }
          65% {
            opacity: 1;
            transform: translate(-6px, 0px) scale(1.08) rotate(-6deg);
          }
          100% {
            opacity: 1;
            transform: translate(0, 0) scale(1) rotate(-5deg);
          }
        }
        @keyframes burstBL {
          0% {
            opacity: 0;
            transform: translate(150px, -90px) scale(0.2) rotate(0deg);
          }
          65% {
            opacity: 1;
            transform: translate(-5px, 4px) scale(1.08) rotate(8.5deg);
          }
          100% {
            opacity: 1;
            transform: translate(0, 0) scale(1) rotate(7deg);
          }
        }
        @keyframes burstTR {
          0% {
            opacity: 0;
            transform: translate(-150px, 240px) scale(0.2) rotate(0deg);
          }
          65% {
            opacity: 1;
            transform: translate(5px, -6px) scale(1.08) rotate(8.5deg);
          }
          100% {
            opacity: 1;
            transform: translate(0, 0) scale(1) rotate(7deg);
          }
        }
        @keyframes burstFR {
          0% {
            opacity: 0;
            transform: translate(-210px, 20px) scale(0.2) rotate(0deg);
          }
          65% {
            opacity: 1;
            transform: translate(6px, 0px) scale(1.08) rotate(6deg);
          }
          100% {
            opacity: 1;
            transform: translate(0, 0) scale(1) rotate(5deg);
          }
        }
        @keyframes burstBR {
          0% {
            opacity: 0;
            transform: translate(-150px, -90px) scale(0.2) rotate(0deg);
          }
          65% {
            opacity: 1;
            transform: translate(5px, 4px) scale(1.08) rotate(-7.5deg);
          }
          100% {
            opacity: 1;
            transform: translate(0, 0) scale(1) rotate(-6deg);
          }
        }
        @keyframes burstDot {
          0% {
            opacity: 0;
            transform: scale(0);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }

        .orgkit-burst-tl { animation: burstTL 0.52s cubic-bezier(0.16, 1.25, 0.38, 1) 0.04s both; }
        .orgkit-burst-fl { animation: burstFL 0.52s cubic-bezier(0.16, 1.25, 0.38, 1) 0.08s both; }
        .orgkit-burst-bl { animation: burstBL 0.52s cubic-bezier(0.16, 1.25, 0.38, 1) 0.12s both; }
        .orgkit-burst-tr { animation: burstTR 0.52s cubic-bezier(0.16, 1.25, 0.38, 1) 0.06s both; }
        .orgkit-burst-fr { animation: burstFR 0.52s cubic-bezier(0.16, 1.25, 0.38, 1) 0.1s both; }
        .orgkit-burst-br { animation: burstBR 0.52s cubic-bezier(0.16, 1.25, 0.38, 1) 0.14s both; }
        .orgkit-burst-dot { animation: burstDot 0.4s ease 0.2s both; }

        /* Gentle ambient floating loop */
        @keyframes ambientFloatA {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        @keyframes ambientFloatB {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(4px); }
        }
        .orgkit-float-a { animation: ambientFloatA 3.4s ease-in-out infinite; }
        .orgkit-float-b { animation: ambientFloatB 3.8s ease-in-out infinite; }

        @media (max-width: 639px) {
          .orgkit-floating-decor {
            display: none !important;
          }
        }
      `}</style>

      {/* ═════════════════════════════════════════════════════════════════
          REVAMPED SIDEBAR (EXPANDED & COLLAPSIBLE)
          ═════════════════════════════════════════════════════════════════ */}
      <aside
        style={{
          width: isSidebarCollapsed ? 70 : 256,
          minWidth: isSidebarCollapsed ? 70 : 256,
          maxWidth: isSidebarCollapsed ? 70 : 256,
          height: "100vh",
          backgroundColor: "#FFFFFF",
          borderRight: "1px solid #E4E4E7",
          display: "flex",
          flexDirection: "column",
          padding: isSidebarCollapsed ? "16px 10px" : "16px 14px 14px 14px",
          boxSizing: "border-box",
          flexShrink: 0,
          zIndex: 30,
          transition: "width 0.25s cubic-bezier(0.16, 1, 0.3, 1), min-width 0.25s cubic-bezier(0.16, 1, 0.3, 1), max-width 0.25s cubic-bezier(0.16, 1, 0.3, 1), padding 0.25s ease",
          position: "relative",
        }}
      >
        {/* ── Top Brand Header & Sidebar Toggle ── */}
        {!isSidebarCollapsed ? (
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
              onClick={toggleSidebar}
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
              onClick={toggleSidebar}
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
                  width={28}
                  height={28}
                  priority
                  style={{
                    height: 26,
                    width: 26,
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
        {!isSidebarCollapsed ? (
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
                height: 3.5,
                borderRadius: 9999,
                backgroundColor: "rgba(5, 150, 105, 0.22)",
                margin: "0 auto 10px auto",
              }}
            />

            {/* Subtle decorative curved arcs in bottom right */}
            <div
              style={{
                position: "absolute",
                bottom: -15,
                right: -15,
                width: 80,
                height: 80,
                pointerEvents: "none",
              }}
            >
              <svg viewBox="0 0 80 80" fill="none" style={{ width: "100%", height: "100%" }}>
                <circle cx="80" cy="80" r="60" stroke="rgba(5, 150, 105, 0.16)" strokeWidth="1.2" />
                <circle cx="80" cy="80" r="40" stroke="rgba(5, 150, 105, 0.12)" strokeWidth="1.2" />
                <circle cx="80" cy="80" r="20" stroke="rgba(5, 150, 105, 0.08)" strokeWidth="1.2" />
              </svg>
            </div>

            {/* Label: WORKSPACE */}
            <div
              style={{
                fontSize: 9.5,
                fontWeight: 700,
                letterSpacing: "0.08em",
                color: "#059669",
                textTransform: "uppercase",
                marginBottom: 3,
              }}
            >
              WORKSPACE
            </div>

            {/* Organization Name */}
            <div
              style={{
                fontSize: 14.5,
                fontWeight: 800,
                letterSpacing: "-0.015em",
                color: "#18181B",
                lineHeight: 1.25,
                overflow: "hidden",
                textOverflow: "ellipsis",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
              }}
              title={orgName}
            >
              {orgName}
            </div>

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
          /* Collapsed Workspace Icon Card */
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginBottom: 16,
            }}
          >
            <div
              title={`${orgName}${schoolName ? ` (${schoolName})` : ""}`}
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                backgroundColor: "rgba(5, 150, 105, 0.12)",
                border: "1px solid rgba(5, 150, 105, 0.22)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                color: "#059669",
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: "0.02em",
                cursor: "pointer",
                position: "relative",
              }}
            >
              <div
                style={{
                  width: 14,
                  height: 2.5,
                  borderRadius: 9999,
                  backgroundColor: "rgba(5, 150, 105, 0.3)",
                  position: "absolute",
                  top: 3,
                }}
              />
              {orgInitials}
            </div>
          </div>
        )}

        {/* ── Navigation Links ── */}
        <nav
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 3,
            flex: 1,
            overflowY: "auto",
            overflowX: "hidden",
          }}
        >
          {/* 1. Home (Active) */}
          <Link
            href={`/workspace/${rawId || "default"}`}
            title="Home"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: isSidebarCollapsed ? "center" : "flex-start",
              gap: 12,
              borderRadius: 12,
              padding: isSidebarCollapsed ? "9px 0" : "9px 12px",
              backgroundColor: "rgba(5, 150, 105, 0.10)",
              color: "#059669",
              textDecoration: "none",
              fontWeight: 600,
              fontSize: 13.5,
              transition: "all 0.15s ease",
            }}
          >
            <Home size={18} strokeWidth={2.2} color="#059669" />
            {!isSidebarCollapsed && <span>Home</span>}
          </Link>

          {/* Section Divider: Manage */}
          {!isSidebarCollapsed ? (
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
                width: 22,
                height: 1,
                backgroundColor: "#E4E4E7",
                margin: "8px auto 6px auto",
              }}
            />
          )}

          {/* 2. Members (Soon) */}
          <div
            className="orgkit-nav-item"
            title="Members (Coming soon)"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: isSidebarCollapsed ? "center" : "space-between",
              borderRadius: 12,
              padding: isSidebarCollapsed ? "9px 0" : "9px 12px",
              color: "#52525B",
              fontSize: 13.5,
              fontWeight: 500,
              cursor: "default",
              userSelect: "none",
              transition: "background-color 0.15s ease",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                justifyContent: isSidebarCollapsed ? "center" : "flex-start",
              }}
            >
              <Users size={18} strokeWidth={1.8} color="#71717A" />
              {!isSidebarCollapsed && <span>Members</span>}
            </div>
            {!isSidebarCollapsed && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  borderRadius: 9999,
                  backgroundColor: "#F4F4F5",
                  border: "1px solid #E4E4E7",
                  padding: "2px 7px",
                  fontSize: 10.5,
                  fontWeight: 500,
                  color: "#71717A",
                }}
              >
                Soon
              </span>
            )}
          </div>

          {/* 3. Events (Soon) */}
          <div
            className="orgkit-nav-item"
            title="Events (Coming soon)"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: isSidebarCollapsed ? "center" : "space-between",
              borderRadius: 12,
              padding: isSidebarCollapsed ? "9px 0" : "9px 12px",
              color: "#52525B",
              fontSize: 13.5,
              fontWeight: 500,
              cursor: "default",
              userSelect: "none",
              transition: "background-color 0.15s ease",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                justifyContent: isSidebarCollapsed ? "center" : "flex-start",
              }}
            >
              <Calendar size={18} strokeWidth={1.8} color="#71717A" />
              {!isSidebarCollapsed && <span>Events</span>}
            </div>
            {!isSidebarCollapsed && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  borderRadius: 9999,
                  backgroundColor: "#F4F4F5",
                  border: "1px solid #E4E4E7",
                  padding: "2px 7px",
                  fontSize: 10.5,
                  fontWeight: 500,
                  color: "#71717A",
                }}
              >
                Soon
              </span>
            )}
          </div>

          {/* 4. Dues (Soon) */}
          <div
            className="orgkit-nav-item"
            title="Dues (Coming soon)"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: isSidebarCollapsed ? "center" : "space-between",
              borderRadius: 12,
              padding: isSidebarCollapsed ? "9px 0" : "9px 12px",
              color: "#52525B",
              fontSize: 13.5,
              fontWeight: 500,
              cursor: "default",
              userSelect: "none",
              transition: "background-color 0.15s ease",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                justifyContent: isSidebarCollapsed ? "center" : "flex-start",
              }}
            >
              <Wallet size={18} strokeWidth={1.8} color="#71717A" />
              {!isSidebarCollapsed && <span>Dues</span>}
            </div>
            {!isSidebarCollapsed && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  borderRadius: 9999,
                  backgroundColor: "#F4F4F5",
                  border: "1px solid #E4E4E7",
                  padding: "2px 7px",
                  fontSize: 10.5,
                  fontWeight: 500,
                  color: "#71717A",
                }}
              >
                Soon
              </span>
            )}
          </div>

          {/* 5. Archive (Soon) */}
          <div
            className="orgkit-nav-item"
            title="Archive (Coming soon)"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: isSidebarCollapsed ? "center" : "space-between",
              borderRadius: 12,
              padding: isSidebarCollapsed ? "9px 0" : "9px 12px",
              color: "#52525B",
              fontSize: 13.5,
              fontWeight: 500,
              cursor: "default",
              userSelect: "none",
              transition: "background-color 0.15s ease",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                justifyContent: isSidebarCollapsed ? "center" : "flex-start",
              }}
            >
              <Archive size={18} strokeWidth={1.8} color="#71717A" />
              {!isSidebarCollapsed && <span>Archive</span>}
            </div>
            {!isSidebarCollapsed && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  borderRadius: 9999,
                  backgroundColor: "#F4F4F5",
                  border: "1px solid #E4E4E7",
                  padding: "2px 7px",
                  fontSize: 10.5,
                  fontWeight: 500,
                  color: "#71717A",
                }}
              >
                Soon
              </span>
            )}
          </div>
        </nav>

        {/* ── Bottom Officer Profile Section (Pinned) ── */}
        <div
          style={{
            position: "relative",
            marginTop: "auto",
            paddingTop: 10,
            borderTop: "1px solid #E4E4E7",
          }}
          ref={menuRef}
        >
          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            className="orgkit-profile-row"
            title={displayName}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: isSidebarCollapsed ? "center" : "space-between",
              gap: 10,
              padding: isSidebarCollapsed ? "6px 0" : "7px 8px",
              borderRadius: 12,
              backgroundColor: "transparent",
              border: "none",
              cursor: "pointer",
              transition: "background-color 0.15s ease",
              textAlign: "left",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
              {/* Avatar */}
              <div
                style={{
                  width: 34,
                  height: 34,
                  minWidth: 34,
                  borderRadius: "50%",
                  backgroundColor: "rgba(5, 150, 105, 0.12)",
                  color: "#059669",
                  fontSize: 12,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {officerInitials}
              </div>

              {!isSidebarCollapsed && (
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: "#18181B",
                      lineHeight: 1.25,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {displayName}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 400,
                      color: "#71717A",
                      lineHeight: 1.2,
                      marginTop: 1,
                    }}
                  >
                    Officer
                  </div>
                </div>
              )}
            </div>

            {!isSidebarCollapsed && (
              <ChevronsUpDown size={14} color="#71717A" style={{ flexShrink: 0 }} />
            )}
          </button>

          {/* Profile Dropdown Menu */}
          {menuOpen && (
            <div
              role="menu"
              style={{
                position: "absolute",
                left: isSidebarCollapsed ? "calc(100% + 8px)" : 0,
                bottom: isSidebarCollapsed ? 0 : "calc(100% + 8px)",
                width: 220,
                borderRadius: 14,
                backgroundColor: "#FFFFFF",
                border: "1px solid #E4E4E7",
                boxShadow: "0 10px 25px rgba(24, 24, 27, 0.08)",
                padding: "6px",
                zIndex: 50,
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
                    fontWeight: 700,
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

      {/* ═════════════════════════════════════════════════════════════════
          MAIN CONTENT CANVAS (FULL BLEED)
          ═════════════════════════════════════════════════════════════════ */}
      <main
        style={{
          flex: 1,
          height: "100vh",
          position: "relative",
          overflow: "hidden",
          backgroundColor: "#F4F4F5",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          boxSizing: "border-box",
        }}
      >
          {/* Background Concentric SVG Circles (design.md aesthetic) */}
          {/* Top-Left Arc */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: 320,
              height: 320,
              pointerEvents: "none",
              zIndex: 1,
            }}
          >
            <svg
              viewBox="0 0 320 320"
              fill="none"
              style={{ width: "100%", height: "100%" }}
            >
              <circle
                cx="0"
                cy="0"
                r="240"
                fill="rgba(5, 150, 105, 0.05)"
              />
              <circle
                cx="0"
                cy="0"
                r="180"
                stroke="rgba(5, 150, 105, 0.12)"
                strokeWidth="1.2"
              />
              <circle
                cx="0"
                cy="0"
                r="300"
                stroke="rgba(5, 150, 105, 0.08)"
                strokeWidth="1.2"
              />
            </svg>
          </div>

          {/* Bottom-Right Concentric Ring Arc */}
          <div
            style={{
              position: "absolute",
              bottom: 0,
              right: 0,
              width: 380,
              height: 380,
              pointerEvents: "none",
              zIndex: 1,
            }}
          >
            <svg
              viewBox="0 0 380 380"
              fill="none"
              style={{ width: "100%", height: "100%" }}
            >
              <circle
                cx="380"
                cy="380"
                r="320"
                stroke="rgba(5, 150, 105, 0.12)"
                strokeWidth="1.2"
              />
              <circle
                cx="380"
                cy="380"
                r="240"
                stroke="rgba(5, 150, 105, 0.10)"
                strokeWidth="1.2"
              />
              <circle
                cx="380"
                cy="380"
                r="160"
                stroke="rgba(5, 150, 105, 0.08)"
                strokeWidth="1.2"
              />
            </svg>
          </div>

          {/* ═════════════════════════════════════════════════════════════
              CENTER FLOATING CARD & FLOATING BADGES: "Your workspace is ready."
              ═════════════════════════════════════════════════════════════ */}
          <div
            className="orgkit-card-wrapper"
            style={{
              position: "relative",
              width: "100%",
              maxWidth: 450,
              boxSizing: "border-box",
              animation: "cardPopout 0.45s cubic-bezier(0.16, 1.25, 0.38, 1) both",
            }}
          >
            {/* ── Floating Icons Decor (Burst outward with popout animation, natural spacing & tilt) ── */}
            {/* 1. Top-Left: Users (White Card, -7deg tilt) */}
            <div
              className="orgkit-floating-decor orgkit-burst-tl"
              style={{
                position: "absolute",
                top: -46,
                left: -100,
                zIndex: 20,
              }}
            >
              <div
                className="orgkit-float-a"
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: 16,
                  backgroundColor: "#FFFFFF",
                  border: "1px solid rgba(228, 228, 231, 0.8)",
                  boxShadow: "0 10px 25px rgba(24, 24, 27, 0.08)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Users size={22} color="#059669" strokeWidth={2} />
              </div>
            </div>

            {/* 2. Far-Left: Calendar (Mint Card, -5deg tilt) */}
            <div
              className="orgkit-floating-decor orgkit-burst-fl"
              style={{
                position: "absolute",
                top: 170,
                left: -168,
                zIndex: 20,
              }}
            >
              <div
                className="orgkit-float-b"
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 15,
                  backgroundColor: "rgba(5, 150, 105, 0.12)",
                  boxShadow: "0 6px 18px rgba(5, 150, 105, 0.08)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Calendar size={20} color="#059669" strokeWidth={2} />
              </div>
            </div>

            {/* 3. Bottom-Left: Wallet (White Card, +7deg tilt) */}
            <div
              className="orgkit-floating-decor orgkit-burst-bl"
              style={{
                position: "absolute",
                bottom: 42,
                left: -100,
                zIndex: 20,
              }}
            >
              <div
                className="orgkit-float-a"
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: 16,
                  backgroundColor: "#FFFFFF",
                  border: "1px solid rgba(228, 228, 231, 0.8)",
                  boxShadow: "0 10px 25px rgba(24, 24, 27, 0.08)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Wallet size={22} color="#059669" strokeWidth={2} />
              </div>
            </div>

            {/* 4. Top-Right: QR Code (Emerald Solid Card, +7deg tilt) */}
            <div
              className="orgkit-floating-decor orgkit-burst-tr"
              style={{
                position: "absolute",
                top: -40,
                right: -96,
                zIndex: 20,
              }}
            >
              <div
                className="orgkit-float-b"
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: 16,
                  backgroundColor: "#059669",
                  boxShadow: "0 10px 22px rgba(5, 150, 105, 0.35)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <QrCode size={22} color="#FFFFFF" strokeWidth={2} />
              </div>
            </div>

            {/* 5. Far-Right: Archive Box (White Card, +5deg tilt) */}
            <div
              className="orgkit-floating-decor orgkit-burst-fr"
              style={{
                position: "absolute",
                top: 175,
                right: -158,
                zIndex: 20,
              }}
            >
              <div
                className="orgkit-float-a"
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 15,
                  backgroundColor: "#FFFFFF",
                  border: "1px solid rgba(228, 228, 231, 0.8)",
                  boxShadow: "0 10px 25px rgba(24, 24, 27, 0.08)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Archive size={20} color="#059669" strokeWidth={2} />
              </div>
            </div>

            {/* 6. Bottom-Right: Clipboard Check (Mint Card, -6deg tilt) */}
            <div
              className="orgkit-floating-decor orgkit-burst-br"
              style={{
                position: "absolute",
                bottom: 38,
                right: -96,
                zIndex: 20,
              }}
            >
              <div
                className="orgkit-float-b"
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 15,
                  backgroundColor: "rgba(5, 150, 105, 0.12)",
                  boxShadow: "0 6px 18px rgba(5, 150, 105, 0.08)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ClipboardCheck size={21} color="#059669" strokeWidth={2} />
              </div>
            </div>

            {/* ── Floating Accent Dots ── */}
            <div
              className="orgkit-floating-decor orgkit-burst-dot"
              style={{
                position: "absolute",
                left: -54,
                top: 110,
                width: 5.5,
                height: 5.5,
                borderRadius: "50%",
                backgroundColor: "rgba(5, 150, 105, 0.35)",
              }}
            />
            <div
              className="orgkit-floating-decor orgkit-burst-dot"
              style={{
                position: "absolute",
                left: -130,
                bottom: 95,
                width: 5,
                height: 5,
                borderRadius: "50%",
                backgroundColor: "rgba(5, 150, 105, 0.25)",
              }}
            />
            <div
              className="orgkit-floating-decor orgkit-burst-dot"
              style={{
                position: "absolute",
                right: -38,
                top: 125,
                width: 5.5,
                height: 5.5,
                borderRadius: "50%",
                backgroundColor: "rgba(5, 150, 105, 0.35)",
              }}
            />
            <div
              className="orgkit-floating-decor orgkit-burst-dot"
              style={{
                position: "absolute",
                right: -128,
                top: 48,
                width: 5,
                height: 5,
                borderRadius: "50%",
                backgroundColor: "rgba(5, 150, 105, 0.25)",
              }}
            />

            {/* Main Floating Welcome Card */}
            <div
              style={{
                position: "relative",
                zIndex: 10,
                width: "100%",
                borderRadius: 26,
                border: "1px solid #E4E4E7",
                backgroundColor: "#FFFFFF",
                padding: "44px 36px 40px 36px",
                boxShadow: "0 20px 50px rgba(24, 24, 27, 0.06)",
                boxSizing: "border-box",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
              }}
            >
              {/* Circular Mint Badge with Emerald Users Icon */}
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: "50%",
                  backgroundColor: "rgba(5, 150, 105, 0.10)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 24,
                }}
              >
                <Users size={32} color="#059669" strokeWidth={2} />
              </div>

              {/* Card Heading */}
              <h2
                style={{
                  fontSize: 27,
                  fontWeight: 800,
                  letterSpacing: "-0.025em",
                  color: "#18181B",
                  margin: "0 0 8px 0",
                  lineHeight: 1.2,
                }}
              >
                Your workspace is ready.
              </h2>

              {/* Card Subtitle */}
              <p
                style={{
                  fontSize: 14.5,
                  fontWeight: 400,
                  color: "#71717A",
                  margin: "0 0 28px 0",
                  lineHeight: 1.4,
                }}
              >
                Next: add your members.
              </p>

              {/* Primary Action Button */}
              <button
                type="button"
                className="orgkit-cta-btn"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: 46,
                  borderRadius: 9999,
                  backgroundColor: "#059669",
                  padding: "0 34px",
                  fontSize: 14.5,
                  fontWeight: 600,
                  color: "#FFFFFF",
                  border: "none",
                  cursor: "pointer",
                  boxShadow: "0 2px 8px rgba(5, 150, 105, 0.2)",
                  transition: "all 0.15s ease",
                }}
              >
                Add members
              </button>
            </div>
          </div>
        </main>
    </div>
  );
}

function WorkspaceLoadingSkeleton() {
  return (
    <div
      style={{
        height: "100vh",
        width: "100%",
        backgroundColor: "#F4F4F5",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: "50%",
          border: "3px solid rgba(5, 150, 105, 0.2)",
          borderTopColor: "#059669",
          animation: "spin 0.8s linear infinite",
        }}
      />
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default function WorkspaceDetailPage() {
  return (
    <Suspense fallback={<WorkspaceLoadingSkeleton />}>
      <WorkspaceDetailContent />
    </Suspense>
  );
}
