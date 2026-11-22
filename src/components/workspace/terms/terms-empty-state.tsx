import React from "react";
import { Award, Plus } from "lucide-react";

interface TermsEmptyStateProps {
  isAdmin: boolean;
  onAddTerm?: () => void;
}

export function TermsEmptyState({ isAdmin, onAddTerm }: TermsEmptyStateProps) {
  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "clamp(48px, 6vw, 72px) clamp(24px, 4vw, 48px)",
        textAlign: "center",
        backgroundColor: "var(--color-surface)",
        borderRadius: 24,
        border: "1px solid var(--color-line)",
        boxShadow: "0 20px 50px rgba(24, 24, 27, 0.04)",
        width: "100%",
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      {/* Decorative Geometric Background Circles */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: -60,
          left: -60,
          width: 220,
          height: 220,
          borderRadius: "50%",
          backgroundColor: "color-mix(in srgb, var(--color-accent) 4%, transparent)",
          pointerEvents: "none",
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          bottom: -80,
          right: -80,
          width: 260,
          height: 260,
          borderRadius: "50%",
          backgroundColor: "color-mix(in srgb, var(--color-accent) 5%, transparent)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 16,
          backgroundColor: "color-mix(in srgb, var(--color-accent) 10%, transparent)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--color-accent)",
          marginBottom: 20,
        }}
      >
        <Award size={28} strokeWidth={2.2} />
      </div>

      <h3
        style={{
          fontSize: "clamp(18px, 2.5vw, 22px)",
          fontWeight: 700,
          color: "var(--color-ink)",
          margin: "0 0 10px 0",
          letterSpacing: "-0.01em",
        }}
      >
        No officer terms recorded yet
      </h3>

      <p
        style={{
          fontSize: 14.5,
          lineHeight: 1.6,
          color: "var(--color-muted)",
          maxWidth: 480,
          margin: "0 0 28px 0",
        }}
      >
        Record your organization&apos;s leadership terms and officer roles so future teams
        can easily see who held each role and during what period.
      </p>

      {isAdmin ? (
        <button
          type="button"
          onClick={onAddTerm}
          className="orgkit-primary-btn"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            backgroundColor: "var(--color-accent)",
            color: "#ffffff",
            fontWeight: 600,
            fontSize: 14,
            padding: "10px 20px",
            borderRadius: 12,
            border: "none",
            cursor: "pointer",
            boxShadow: "0 4px 12px color-mix(in srgb, var(--color-accent) 25%, transparent)",
            transition: "all 0.15s ease",
          }}
        >
          <Plus size={18} strokeWidth={2.2} />
          <span>Record Current Term</span>
        </button>
      ) : (
        <span
          style={{
            display: "inline-block",
            fontSize: 13,
            color: "var(--color-muted)",
            backgroundColor: "var(--color-base)",
            padding: "6px 14px",
            borderRadius: 999,
          }}
        >
          Only admins can record or edit officer terms.
        </span>
      )}
    </div>
  );
}
