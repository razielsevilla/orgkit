"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus_Jakarta_Sans } from "next/font/google";
import {
  createWorkspace,
  getOfficerDefaultWorkspace,
  getCurrentOfficer,
} from "@/src/app/workspace/actions";
import { Navbar, OfficerProfile } from "@/src/components/navbar";
import {
  Card,
  CardHeader,
  CardBadge,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/src/components/card";
import { FloatingIconsDecor } from "@/src/components/floating-decor";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

export default function WorkspacePage() {
  const router = useRouter();
  // view: "create" corresponds to "Set up your org" card (first screen for signed-in officer with no org)
  // view: "empty" corresponds to "We can't find that page."
  const [view, setView] = useState<"empty" | "create">("create");
  const [officer, setOfficer] = useState<OfficerProfile | null>(null);

  // Form field state for the workspace card
  const [orgName, setOrgName] = useState("");
  const [school, setSchool] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isCheckingWorkspace, setIsCheckingWorkspace] = useState(true);

  // Load current signed-in officer session and check if they already have a workspace
  useEffect(() => {
    async function loadOfficerSession() {
      try {
        const officerData = await getCurrentOfficer();
        if (officerData) {
          setOfficer(officerData);
        } else {
          window.location.href = "/signin";
          return;
        }

        // Check if this officer already has an assigned workspace
        const existingWorkspace = await getOfficerDefaultWorkspace();
        if (existingWorkspace?.orgId) {
          window.location.assign(`/workspace/${existingWorkspace.orgId}`);
          return;
        }
      } catch (err) {
        console.error("Failed to load officer session:", err);
      } finally {
        setIsCheckingWorkspace(false);
      }
    }
    loadOfficerSession();
  }, [router]);

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

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNameError(null);
    setSaveError(null);

    const cleanName = orgName.trim();
    if (!cleanName) {
      setNameError("Org name is required.");
      return;
    }
    if (cleanName.length < 2) {
      setNameError("Org name must be at least 2 characters.");
      return;
    }
    if (cleanName.length > 80) {
      setNameError("Org name cannot be longer than 80 characters.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await createWorkspace(cleanName, school);
      if (res.success && res.orgId) {
        const query = new URLSearchParams();
        query.set("name", cleanName);
        if (school.trim()) {
          query.set("school", school.trim());
        }
        router.push(`/workspace/${res.orgId}?${query.toString()}`);
        return;
      }
      if (res.existingOrgId) {
        router.push(`/workspace/${res.existingOrgId}`);
        return;
      }
      if (res.fieldError) {
        setNameError(res.fieldError);
        setIsSubmitting(false);
        return;
      }
      if (res.error) {
        setSaveError(res.error);
        setIsSubmitting(false);
        return;
      }
    } catch {
      setSaveError("We couldn't create your workspace. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className={plusJakarta.className}
      style={{
        position: "relative",
        height: "100vh",
        maxHeight: "100vh",
        width: "100%",
        overflow: "hidden",
        backgroundColor: "#F4F4F5",
        color: "#18181B",
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
      }}
    >
      {/* ── CSS Styles & Keyframe Animations ── */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
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
        @keyframes burstTL {
          0% { opacity: 0; transform: translate(140px, 90px) scale(0.2) rotate(0deg); }
          65% { opacity: 1; transform: translate(-4px, -4px) scale(1.08) rotate(-9deg); }
          100% { opacity: 1; transform: translate(0, 0) scale(1) rotate(-7deg); }
        }
        @keyframes burstFL {
          0% { opacity: 0; transform: translate(170px, 0) scale(0.2) rotate(0deg); }
          65% { opacity: 1; transform: translate(-5px, 0) scale(1.08) rotate(-7deg); }
          100% { opacity: 1; transform: translate(0, 0) scale(1) rotate(-5deg); }
        }
        @keyframes burstBL {
          0% { opacity: 0; transform: translate(140px, -90px) scale(0.2) rotate(0deg); }
          65% { opacity: 1; transform: translate(-4px, 4px) scale(1.08) rotate(9deg); }
          100% { opacity: 1; transform: translate(0, 0) scale(1) rotate(7deg); }
        }
        @keyframes burstTR {
          0% { opacity: 0; transform: translate(-140px, 90px) scale(0.2) rotate(0deg); }
          65% { opacity: 1; transform: translate(4px, -4px) scale(1.08) rotate(9deg); }
          100% { opacity: 1; transform: translate(0, 0) scale(1) rotate(7deg); }
        }
        @keyframes burstFR {
          0% { opacity: 0; transform: translate(-170px, 0) scale(0.2) rotate(0deg); }
          65% { opacity: 1; transform: translate(5px, 0) scale(1.08) rotate(7deg); }
          100% { opacity: 1; transform: translate(0, 0) scale(1) rotate(5deg); }
        }
        @keyframes burstBR {
          0% { opacity: 0; transform: translate(-150px, -90px) scale(0.2) rotate(0deg); }
          65% { opacity: 1; transform: translate(5px, 4px) scale(1.08) rotate(-7.5deg); }
          100% { opacity: 1; transform: translate(0, 0) scale(1) rotate(-6deg); }
        }
        @keyframes burstDot {
          0% { opacity: 0; transform: scale(0); }
          100% { opacity: 1; transform: scale(1); }
        }
        .orgkit-burst-tl { animation: burstTL 0.52s cubic-bezier(0.16, 1.25, 0.38, 1) 0.04s both; }
        .orgkit-burst-fl { animation: burstFL 0.52s cubic-bezier(0.16, 1.25, 0.38, 1) 0.08s both; }
        .orgkit-burst-bl { animation: burstBL 0.52s cubic-bezier(0.16, 1.25, 0.38, 1) 0.12s both; }
        .orgkit-burst-tr { animation: burstTR 0.52s cubic-bezier(0.16, 1.25, 0.38, 1) 0.06s both; }
        .orgkit-burst-fr { animation: burstFR 0.52s cubic-bezier(0.16, 1.25, 0.38, 1) 0.1s both; }
        .orgkit-burst-br { animation: burstBR 0.52s cubic-bezier(0.16, 1.25, 0.38, 1) 0.14s both; }
        .orgkit-burst-dot { animation: burstDot 0.4s ease 0.2s both; }

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

        .orgkit-workspace-input:focus {
          border-color: #059669 !important;
          box-shadow: 0 0 0 3px rgba(5, 150, 105, 0.12) !important;
        }
        .orgkit-workspace-btn:hover {
          background-color: #047857 !important;
          box-shadow: 0 4px 14px rgba(5, 150, 105, 0.28) !important;
        }
        @media (max-width: 639px) {
          .orgkit-floating-decor {
            display: none !important;
          }
        }
      `}</style>

      {/* ── Background Concentric SVG Circles ── */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: 260,
          height: 260,
          pointerEvents: "none",
          zIndex: 1,
        }}
      >
        <svg
          viewBox="0 0 260 260"
          style={{ width: "100%", height: "100%", display: "block" }}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="0" cy="0" r="160" fill="#059669" fillOpacity="0.04" />
          <circle
            cx="0"
            cy="0"
            r="200"
            stroke="#059669"
            strokeWidth="1.2"
            strokeOpacity="0.25"
          />
        </svg>
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 0,
          right: 0,
          width: 260,
          height: 260,
          pointerEvents: "none",
          zIndex: 1,
        }}
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

      {/* ── Reusable Standalone Top Navigation Bar ── */}
      <Navbar officer={officer} logoHref="/workspace" />

      {/* ── Main Viewport Content ── */}
      <main
        style={{
          position: "relative",
          zIndex: 10,
          display: "flex",
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          padding: "20px clamp(24px, 4.5vw, 64px) 36px clamp(24px, 4.5vw, 64px)",
          marginTop: -12,
          boxSizing: "border-box",
        }}
      >
        {isCheckingWorkspace ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: 220,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                border: "3px solid rgba(5, 150, 105, 0.2)",
                borderTopColor: "#059669",
                animation: "spin 0.8s linear infinite",
              }}
            />
          </div>
        ) : view === "empty" ? (
          /* Empty State ("We can't find that page.") */
          <Card maxWidth={380} padding="36px 32px">
            <CardHeader style={{ marginBottom: 20 }}>
              <CardBadge size={64}>
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
            <CardContent style={{ textAlign: "center" }}>
              <button
                type="button"
                onClick={() => setView("create")}
                className="orgkit-workspace-btn"
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
                Create your Workspace
              </button>
            </CardContent>
          </Card>
        ) : (
          /* Workspace Creation Card ("Set up your org") */
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
            <Card maxWidth={450} padding="32px 34px">
              <CardHeader style={{ marginBottom: 0 }}>
                <CardTitle style={{ fontSize: 26, marginBottom: 5 }}>
                  Set up your Organization
                </CardTitle>
                <CardDescription style={{ fontSize: 14, marginBottom: 26 }}>
                  Start by giving your organization a name.
                </CardDescription>
              </CardHeader>

              <CardContent>
                <form onSubmit={handleCreateSubmit} noValidate>
                  {/* Field 1: Org name (required) */}
                  <div style={{ marginBottom: 16 }}>
                    <label
                      htmlFor="org-name"
                      style={{
                        display: "block",
                        fontSize: 13.5,
                        fontWeight: 600,
                        color: "#18181B",
                        marginBottom: 7,
                      }}
                    >
                      Organization Name
                    </label>
                    <input
                      id="org-name"
                      type="text"
                      required
                      value={orgName}
                      onChange={(e) => {
                        setOrgName(e.target.value);
                        if (nameError) setNameError(null);
                        if (saveError) setSaveError(null);
                      }}
                      placeholder="e.g. Junior Marketing Association"
                      className="orgkit-workspace-input"
                      style={{
                        height: 46,
                        width: "100%",
                        borderRadius: 12,
                        border: nameError
                          ? "1px solid #DC2626"
                          : "1px solid #E4E4E7",
                        backgroundColor: "#FFFFFF",
                        padding: "0 14px",
                        fontSize: 14,
                        color: "#18181B",
                        boxSizing: "border-box",
                        outline: "none",
                        transition: "border-color 0.15s ease, box-shadow 0.15s ease",
                      }}
                    />
                    {nameError && (
                      <p
                        style={{
                          fontSize: 12,
                          color: "#DC2626",
                          fontWeight: 500,
                          margin: "6px 0 0 0",
                          textAlign: "left",
                        }}
                      >
                        {nameError}
                      </p>
                    )}
                  </div>

                  {/* Field 2: School or community (Optional) */}
                  <div style={{ marginBottom: 24 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 7,
                      }}
                    >
                      <label
                        htmlFor="school-community"
                        style={{
                          fontSize: 13.5,
                          fontWeight: 600,
                          color: "#18181B",
                        }}
                      >
                        School or Community
                      </label>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          borderRadius: 9999,
                          backgroundColor: "#F4F4F5",
                          padding: "2.5px 8px",
                          fontSize: 11,
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
                      onChange={(e) => {
                        setSchool(e.target.value);
                        if (saveError) setSaveError(null);
                      }}
                      placeholder="e.g. Your school or community"
                      className="orgkit-workspace-input"
                      style={{
                        height: 46,
                        width: "100%",
                        borderRadius: 12,
                        border: "1px solid #E4E4E7",
                        backgroundColor: "#FFFFFF",
                        padding: "0 14px",
                        fontSize: 14,
                        color: "#18181B",
                        boxSizing: "border-box",
                        outline: "none",
                        transition: "border-color 0.15s ease, box-shadow 0.15s ease",
                      }}
                    />
                    <p
                      style={{
                        fontSize: 11.5,
                        color: "#71717A",
                        margin: "7px 0 0 0",
                      }}
                    >
                      Leave blank if your org isn't tied to one school.
                    </p>
                  </div>

                  {/* Save Error Alert (Above Button) */}
                  {saveError && (
                    <div
                      style={{
                        marginBottom: 16,
                        padding: "10px 14px",
                        borderRadius: 12,
                        backgroundColor: "rgba(220, 38, 38, 0.08)",
                        border: "1px solid rgba(220, 38, 38, 0.25)",
                        color: "#DC2626",
                        fontSize: 13,
                        fontWeight: 500,
                        textAlign: "left",
                      }}
                    >
                      {saveError}
                    </div>
                  )}

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="orgkit-workspace-btn"
                    style={{
                      display: "flex",
                      height: 46,
                      width: "100%",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      borderRadius: 9999,
                      backgroundColor: "#059669",
                      fontSize: 14.5,
                      fontWeight: 600,
                      color: "#FFFFFF",
                      border: "none",
                      cursor: isSubmitting ? "not-allowed" : "pointer",
                      opacity: isSubmitting ? 0.85 : 1,
                      boxShadow: "0 2px 8px rgba(5, 150, 105, 0.2)",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {isSubmitting ? (
                      <>
                        <div
                          style={{
                            width: 16,
                            height: 16,
                            borderRadius: "50%",
                            border: "2.5px solid rgba(255, 255, 255, 0.35)",
                            borderTopColor: "#FFFFFF",
                            animation: "spin 0.6s linear infinite",
                          }}
                        />
                        <span>Creating…</span>
                      </>
                    ) : (
                      "Create workspace"
                    )}
                  </button>
                </form>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
