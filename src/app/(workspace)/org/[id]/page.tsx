"use client";

import { useState, useEffect, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Users } from "lucide-react";
import {
  getOrganizationById,
  getOfficerDefaultWorkspace,
  getCurrentOfficer,
  isOrgAdmin,
} from "@/src/app/(workspace)/actions";
import { useSidebarCollapsed } from "@/src/lib/use-sidebar-collapsed";
import { Sidebar } from "@/src/components/sidebar";
import { Navbar, OfficerProfile } from "@/src/components/navbar";
import {
  Card,
  CardHeader,
  CardBadge,
  CardTitle,
  CardDescription,
} from "@/src/components/card";
import { FloatingIconsDecor } from "@/src/components/floating-decor";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

function WorkspaceDetailContent() {
  const router = useRouter();
  const params = useParams();
  const rawId = (params?.id as string) || "";

  // Org details come only from the server, which returns them to members only.
  // Nothing from the URL is ever shown.
  const [orgData, setOrgData] = useState<{ name: string; school: string } | null>(null);
  const [isLoadingOrg, setIsLoadingOrg] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [officer, setOfficer] = useState<OfficerProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSidebarCollapsed, toggleSidebar] = useSidebarCollapsed();

  // Parallel fetch: loads organization and officer profile concurrently
  useEffect(() => {
    async function loadWorkspaceData() {
      if (!rawId) {
        setIsLoadingOrg(false);
        setAccessDenied(true);
        return;
      }
      try {
        const [org, officerData, adminFlag] = await Promise.all([
          getOrganizationById(rawId),
          getCurrentOfficer(),
          isOrgAdmin(rawId),
        ]);
        setIsAdmin(adminFlag);

        if (officerData) {
          setOfficer(officerData);
        }

        if (org) {
          setOrgData({ name: org.name, school: org.school || "" });
          setAccessDenied(false);
        } else {
          // Officer is not a member of this organization, or organization does not exist
          setAccessDenied(true);
        }
      } catch (err) {
        console.error("Error loading workspace data:", err);
        setAccessDenied(true);
      } finally {
        setIsLoadingOrg(false);
      }
    }
    loadWorkspaceData();
  }, [rawId, router]);

  const orgName = orgData?.name || "Organization";
  const schoolName = orgData?.school?.trim() || null;

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
        {/* Top Navbar for Access Refused Screen */}
        <Navbar officer={officer} logoHref="/" />

        {/* Access Refused Main Canvas */}
        <main
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            boxSizing: "border-box",
          }}
        >
          <Card maxWidth={380} padding="36px 32px">
            <CardHeader style={{ marginBottom: 20 }}>
              <CardBadge size={66}>
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
              </CardBadge>
              <CardTitle style={{ fontSize: 28, marginBottom: 8 }}>
                We can’t find that page.
              </CardTitle>
              <CardDescription style={{ maxWidth: 300 }}>
                It may not exist, or you may not have access to it.
              </CardDescription>
            </CardHeader>
            <div style={{ textAlign: "center", width: "100%" }}>
              <button
                type="button"
                onClick={async () => {
                  try {
                    const defaultWs = await getOfficerDefaultWorkspace();
                    if (defaultWs?.orgId) {
                      router.push(`/org/${defaultWs.orgId}`);
                    } else {
                      router.push("/orgs/new");
                    }
                  } catch {
                    router.push("/orgs/new");
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
                  padding: "0 28px",
                  fontSize: 14.5,
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
          </Card>
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
      {/* ── Keyframe Animations ── */}
      <style>{`
        @keyframes cardPopout {
          0% {
            opacity: 0;
            transform: scale(0.92) translateY(12px);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        .orgkit-cta-btn:hover {
          background-color: #047857 !important;
          box-shadow: 0 4px 14px rgba(5, 150, 105, 0.28) !important;
        }
      `}</style>

      {/* ── Reusable Standalone Collapsible Sidebar (Navbar removed) ── */}
      <Sidebar
        rawId={rawId}
        orgName={orgName}
        schoolName={schoolName}
        officer={officer}
        isAdmin={isAdmin}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={toggleSidebar}
        activePath="home"
      />

      {/* ── Main Full-Bleed Content Canvas ── */}
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
        {/* Background Concentric SVG Circles */}
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
            <circle cx="0" cy="0" r="240" fill="rgba(5, 150, 105, 0.05)" />
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

        {/* Center Floating Card Wrapper */}
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
          {/* Reusable Floating Decor */}
          <FloatingIconsDecor />

          {/* Reusable Standalone Card Component */}
          <Card maxWidth={440} padding="44px 36px 40px 36px">
            <CardHeader style={{ marginBottom: 24 }}>
              <CardBadge size={72} style={{ marginBottom: 24 }}>
                <Users size={32} color="#059669" strokeWidth={2} />
              </CardBadge>
              <p
                style={{
                  margin: "0 0 6px 0",
                  fontSize: 13.5,
                  fontWeight: 600,
                  color: "#059669",
                }}
              >
                {schoolName ? `${orgName} · ${schoolName}` : orgName}
              </p>
              <CardTitle
                style={{
                  fontSize: 27,
                  lineHeight: 1.2,
                  margin: "0 0 8px 0",
                }}
              >
                Your workspace is ready.
              </CardTitle>
              <CardDescription
                style={{
                  fontSize: 14.5,
                  color: "#71717A",
                  lineHeight: 1.4,
                }}
              >
                Next: add your members.
              </CardDescription>
            </CardHeader>
          </Card>
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
        maxHeight: "100vh",
        width: "100%",
        overflow: "hidden",
        position: "relative",
        backgroundColor: "#F4F4F5",
        display: "flex",
        boxSizing: "border-box",
      }}
    >
      {/* Top Emerald Loading Progress Beam */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          zIndex: 9999,
          overflow: "hidden",
          backgroundColor: "rgba(5, 150, 105, 0.15)",
        }}
      >
        <div
          className="orgkit-progress-beam"
          style={{
            height: "100%",
            width: "40%",
            backgroundColor: "#059669",
            borderRadius: 9999,
          }}
        />
      </div>

      {/* Sidebar Skeleton (Expanded 256px) */}
      <aside
        style={{
          width: 256,
          minWidth: 256,
          height: "100vh",
          backgroundColor: "#FFFFFF",
          borderRight: "1px solid #E4E4E7",
          padding: "16px 14px 14px 14px",
          display: "flex",
          flexDirection: "column",
          boxSizing: "border-box",
          flexShrink: 0,
        }}
      >
        {/* Top Header Placeholder */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
            height: 36,
          }}
        >
          <div
            className="orgkit-shimmer"
            style={{ width: 100, height: 26, borderRadius: 8, backgroundColor: "#F4F4F5" }}
          />
          <div
            className="orgkit-shimmer"
            style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: "#F4F4F5" }}
          />
        </div>

        {/* Workspace Card Shimmer */}
        <div
          className="orgkit-shimmer"
          style={{
            height: 104,
            borderRadius: 18,
            backgroundColor: "rgba(5, 150, 105, 0.08)",
            border: "1px solid rgba(5, 150, 105, 0.12)",
            marginBottom: 16,
          }}
        />

        {/* Nav Items Shimmer */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
          <div
            className="orgkit-shimmer"
            style={{ height: 38, borderRadius: 12, backgroundColor: "rgba(5, 150, 105, 0.10)" }}
          />
          <div style={{ height: 16, width: 60, marginTop: 12, marginBottom: 4 }} className="orgkit-shimmer" />
          <div className="orgkit-shimmer" style={{ height: 36, borderRadius: 10, backgroundColor: "#F4F4F5" }} />
          <div className="orgkit-shimmer" style={{ height: 36, borderRadius: 10, backgroundColor: "#F4F4F5" }} />
          <div className="orgkit-shimmer" style={{ height: 36, borderRadius: 10, backgroundColor: "#F4F4F5" }} />
        </div>

        {/* Bottom Officer Profile Card Shimmer */}
        <div
          className="orgkit-shimmer"
          style={{
            height: 52,
            borderRadius: 14,
            border: "1px solid #E4E4E7",
            backgroundColor: "#FFFFFF",
          }}
        />
      </aside>

      {/* Main Canvas Skeleton */}
      <main
        style={{
          flex: 1,
          height: "100vh",
          backgroundColor: "#F4F4F5",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          position: "relative",
          overflow: "hidden",
          boxSizing: "border-box",
        }}
      >
        {/* Center Card Skeleton */}
        <div
          style={{
            width: "100%",
            maxWidth: 440,
            borderRadius: 26,
            border: "1px solid #E4E4E7",
            backgroundColor: "#FFFFFF",
            padding: "44px 36px 40px 36px",
            boxShadow: "0 20px 50px rgba(24, 24, 27, 0.06)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            boxSizing: "border-box",
          }}
        >
          {/* Circular Badge Placeholder */}
          <div
            className="orgkit-shimmer"
            style={{
              width: 66,
              height: 66,
              borderRadius: "50%",
              backgroundColor: "rgba(5, 150, 105, 0.10)",
              marginBottom: 22,
            }}
          />
          {/* Title Placeholder */}
          <div
            className="orgkit-shimmer"
            style={{
              width: 220,
              height: 28,
              borderRadius: 8,
              backgroundColor: "#E4E4E7",
              marginBottom: 10,
            }}
          />
          {/* Subtitle Placeholder */}
          <div
            className="orgkit-shimmer"
            style={{
              width: 150,
              height: 16,
              borderRadius: 6,
              backgroundColor: "#F4F4F5",
              marginBottom: 28,
            }}
          />
          {/* Action Button Placeholder */}
          <div
            className="orgkit-shimmer"
            style={{
              width: 140,
              height: 46,
              borderRadius: 9999,
              backgroundColor: "#059669",
              opacity: 0.85,
            }}
          />
        </div>
      </main>

      <style>{`
        @keyframes shimmerPulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 0.95; }
        }
        @keyframes progressSlide {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(350%); }
        }
        .orgkit-shimmer {
          animation: shimmerPulse 1.4s ease-in-out infinite;
        }
        .orgkit-progress-beam {
          animation: progressSlide 1.2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
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
