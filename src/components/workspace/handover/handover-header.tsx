"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Clock, RotateCcw, Save } from "lucide-react";
import type { HandoverGuide } from "@/src/lib/handover/handover-types";
import { handoverPath } from "@/src/lib/routes";

interface HandoverHeaderProps {
  guide: HandoverGuide;
  completeness: { filledCount: number; totalCount: number; percentage: number };
  saveStatus: "idle" | "saving" | "saved" | "error";
  isSavingManual: boolean;
  onSaveManual: () => void;
  onOpenFinalize: () => void;
  onOpenReopen: () => void;
}

export function HandoverHeader({
  guide,
  completeness,
  saveStatus,
  isSavingManual,
  onSaveManual,
  onOpenFinalize,
  onOpenReopen,
}: HandoverHeaderProps) {
  const isReady = guide.status === "ready";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 16,
        marginBottom: 24,
      }}
    >
      {/* Top Navigation Row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <Link
          href={handoverPath(guide.orgId)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 13,
            fontWeight: 600,
            color: "var(--color-muted)",
            textDecoration: "none",
            transition: "color 0.15s ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-ink)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--color-muted)")}
        >
          <ArrowLeft size={16} />
          <span>All Handover Guides</span>
        </Link>

        {/* Save Status Indicator */}
        {!isReady && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--color-muted)" }}>
            {saveStatus === "saving" && <span>Saving changes...</span>}
            {saveStatus === "saved" && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "var(--color-accent)" }}>
                <CheckCircle2 size={13} />
                <span>All changes saved</span>
              </span>
            )}
            {saveStatus === "error" && (
              <span style={{ color: "#dc2626" }}>Failed to save. Please try again.</span>
            )}
          </div>
        )}
      </div>

      {/* Main Header Card */}
      <div
        className="orgkit-handover-header-row"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
            <h1
              style={{
                fontSize: "clamp(24px, 2.2vw, 32px)",
                fontWeight: 700,
                color: "var(--color-ink)",
                letterSpacing: "-0.015em",
                margin: 0,
              }}
            >
              {guide.roleTitle} Handover Guide
            </h1>

            {/* Status Badge */}
            {isReady ? (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "4px 10px",
                  borderRadius: 9999,
                  backgroundColor: "#ecfdf5",
                  border: "1px solid #a7f3d0",
                  color: "#047857",
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                <CheckCircle2 size={13} />
                <span>Ready for successor</span>
              </span>
            ) : (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "4px 10px",
                  borderRadius: 9999,
                  backgroundColor: "#fef3c7",
                  border: "1px solid #fde68a",
                  color: "#b45309",
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                <Clock size={13} />
                <span>Draft in progress</span>
              </span>
            )}
          </div>

          <p style={{ fontSize: 13.5, color: "var(--color-muted)", margin: 0, lineHeight: 1.4 }}>
            {isReady
              ? "This guide has been finalized and locked. Incoming officers can read all sections and open linked records."
              : "Structured transition template. Detail your responsibilities, contacts, and links so your successor hits the ground running."}
          </p>
        </div>

        {/* Action CTAs */}
        <div
          className="orgkit-handover-actions-group"
          style={{ display: "flex", alignItems: "center", gap: 10 }}
        >
          {/* Manual Save Button */}
          {guide.canEdit && !isReady && (
            <button
              type="button"
              disabled={isSavingManual}
              onClick={onSaveManual}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                padding: "8px 14px",
                borderRadius: 9999,
                border: "1px solid var(--color-line)",
                backgroundColor: "var(--color-surface)",
                color: "var(--color-ink)",
                fontSize: 13,
                fontWeight: 600,
                cursor: isSavingManual ? "not-allowed" : "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <Save size={14} color="var(--color-muted)" />
              <span>{isSavingManual ? "Saving..." : "Save draft"}</span>
            </button>
          )}

          {/* Mark as Ready CTA */}
          {guide.canFinalize && !isReady && (
            <button
              type="button"
              onClick={onOpenFinalize}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                padding: "8px 18px",
                borderRadius: 9999,
                border: "none",
                backgroundColor: "var(--color-accent)",
                color: "#ffffff",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                transition: "background-color 0.15s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--color-accent-strong)")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "var(--color-accent)")}
            >
              <CheckCircle2 size={14} />
              <span>Mark as ready</span>
            </button>
          )}

          {/* Reopen CTA for Admin */}
          {guide.canReopen && isReady && (
            <button
              type="button"
              onClick={onOpenReopen}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                padding: "8px 16px",
                borderRadius: 9999,
                border: "1px solid var(--color-line)",
                backgroundColor: "var(--color-surface)",
                color: "var(--color-ink)",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <RotateCcw size={14} color="var(--color-muted)" />
              <span>Reopen for editing</span>
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 6,
          padding: "14px 18px",
          borderRadius: 16,
          backgroundColor: "var(--color-surface)",
          border: "1px solid var(--color-line)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12.5 }}>
          <span style={{ fontWeight: 600, color: "var(--color-ink)" }}>
            Guide Completeness: {completeness.filledCount} of {completeness.totalCount} sections filled
          </span>
          <span style={{ fontWeight: 700, color: "var(--color-accent)" }}>
            {completeness.percentage}%
          </span>
        </div>
        <div
          style={{
            width: "100%",
            height: 6,
            borderRadius: 9999,
            backgroundColor: "var(--color-base)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${completeness.percentage}%`,
              height: "100%",
              borderRadius: 9999,
              backgroundColor: "var(--color-accent)",
              transition: "width 0.3s ease",
            }}
          />
        </div>
      </div>
    </div>
  );
}
