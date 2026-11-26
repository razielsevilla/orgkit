"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock, Plus, ArrowRight } from "lucide-react";
import { HandoverStyles } from "./handover-styles";
import { HandoverEmptyState } from "./handover-empty-state";
import { FloatingIconsDecor } from "@/src/components/decor/floating-decor";
import { Select } from "@/src/components/ui/select";
import { handoverGuidePath } from "@/src/lib/routes";
import type { HandoverGuidesSummary } from "@/src/app/(workspace)/handover-actions";

interface HandoverOverviewClientProps {
  summary: HandoverGuidesSummary;
  isAdmin: boolean;
}

export function HandoverOverviewClient({ summary }: HandoverOverviewClientProps) {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState(
    summary.activeRoles[0] || "President"
  );

  const handleStartRoleGuide = () => {
    if (!selectedRole) return;
    router.push(`${handoverGuidePath(summary.orgId, encodeURIComponent(selectedRole))}`);
  };

  const defaultRoleOptions = [
    "President",
    "Vice President",
    "Secretary",
    "Treasurer",
    "Auditor",
    "Public Relations Officer",
    ...summary.activeRoles,
  ];
  const uniqueRoles = Array.from(new Set(defaultRoleOptions));

  return (
    <div
      className="orgkit-handover-scroll-container"
      style={{
        height: "100%",
        overflowY: "auto",
        overflowX: "hidden",
        WebkitOverflowScrolling: "touch",
        padding: "clamp(24px, 3vw, 40px) clamp(16px, 3vw, 36px) 100px clamp(16px, 3vw, 36px)",
        boxSizing: "border-box",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 960,
          margin: "0 auto",
        }}
      >
        <HandoverStyles />

        {/* Floating Icons Decor positioned behind the cards */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            zIndex: 0,
          }}
        >
          <FloatingIconsDecor />
        </div>

        {/* Foreground Content */}
        <div style={{ position: "relative", zIndex: 2 }}>
        {/* Header Section */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
            marginBottom: 28,
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <h1
                style={{
                  fontSize: "clamp(24px, 2.3vw, 32px)",
                  fontWeight: 700,
                  color: "var(--color-ink)",
                  letterSpacing: "-0.015em",
                  margin: 0,
                }}
              >
                Handover Guides
              </h1>
              <span
                style={{
                  padding: "3px 10px",
                  borderRadius: 9999,
                  backgroundColor: "color-mix(in srgb, var(--color-accent) 10%, transparent)",
                  color: "var(--color-accent-strong)",
                  fontSize: 12.5,
                  fontWeight: 600,
                }}
              >
                {summary.guides.length} {summary.guides.length === 1 ? "guide" : "guides"}
              </span>
            </div>

            <p
              style={{
                fontSize: 14,
                color: "var(--color-muted)",
                margin: 0,
                maxWidth: 580,
                lineHeight: 1.45,
              }}
            >
              Structured transition templates for incoming and outgoing officers. Keep contacts, recurring duties, and document links organized across terms.
            </p>
          </div>

          {/* Quick Start Role Selector */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <div style={{ minWidth: 200 }}>
              <Select
                value={selectedRole}
                onChange={setSelectedRole}
                options={uniqueRoles}
                placeholder="Select role..."
                size="md"
              />
            </div>

            <button
              type="button"
              onClick={handleStartRoleGuide}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                backgroundColor: "var(--color-accent)",
                color: "#ffffff",
                border: "none",
                padding: "10px 18px",
                borderRadius: 9999,
                fontSize: 13.5,
                fontWeight: 600,
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(5, 150, 105, 0.25)",
                transition: "background-color 0.15s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--color-accent-strong)")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "var(--color-accent)")}
            >
              <Plus size={15} strokeWidth={2.5} />
              <span>Open role guide</span>
            </button>
          </div>
        </div>

        {/* Guides List */}
        {summary.guides.length === 0 ? (
          <HandoverEmptyState
            onStartGuide={handleStartRoleGuide}
            canStart={true}
          />
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(min(300px, 100%), 1fr))",
              gap: 16,
            }}
          >
            {summary.guides.map((g) => {
              const isReady = g.status === "ready";

              return (
                <Link
                  key={g.id}
                  href={handoverGuidePath(summary.orgId, g.id)}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    padding: "20px",
                    borderRadius: 20,
                    backgroundColor: "var(--color-surface)",
                    border: "1px solid var(--color-line)",
                    textDecoration: "none",
                    boxShadow: "0 2px 10px rgba(24, 24, 27, 0.02)",
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--color-accent)";
                    e.currentTarget.style.transform = "translateY(-2px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--color-line)";
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  <div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 10,
                        marginBottom: 10,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 16,
                          fontWeight: 700,
                          color: "var(--color-ink)",
                          letterSpacing: "-0.01em",
                        }}
                      >
                        {g.roleTitle}
                      </span>

                      {isReady ? (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            padding: "3px 8px",
                            borderRadius: 9999,
                            backgroundColor: "#ecfdf5",
                            color: "#047857",
                            fontSize: 11.5,
                            fontWeight: 600,
                          }}
                        >
                          <CheckCircle2 size={12} />
                          <span>Ready</span>
                        </span>
                      ) : (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            padding: "3px 8px",
                            borderRadius: 9999,
                            backgroundColor: "#fef3c7",
                            color: "#b45309",
                            fontSize: 11.5,
                            fontWeight: 600,
                          }}
                        >
                          <Clock size={12} />
                          <span>Draft</span>
                        </span>
                      )}
                    </div>

                    <p style={{ fontSize: 13, color: "var(--color-muted)", margin: "0 0 14px 0", lineHeight: 1.4 }}>
                      {g.termName ? `Term: ${g.termName}` : "Current leadership term"}
                    </p>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      paddingTop: 12,
                      borderTop: "1px solid var(--color-line)",
                      fontSize: 12.5,
                      fontWeight: 600,
                      color: "var(--color-accent)",
                    }}
                  >
                    <span>View guide</span>
                    <ArrowRight size={14} />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  </div>
);
}
