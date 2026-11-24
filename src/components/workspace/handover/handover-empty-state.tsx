import React from "react";
import { BookOpen, Plus } from "lucide-react";
import { FloatingIconsDecor } from "@/src/components/decor/floating-decor";

interface HandoverEmptyStateProps {
  onStartGuide?: () => void;
  canStart?: boolean;
}

export function HandoverEmptyState({ onStartGuide, canStart = true }: HandoverEmptyStateProps) {
  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "64px 24px",
        backgroundColor: "var(--color-surface)",
        borderRadius: 24,
        border: "1px solid var(--color-line)",
        textAlign: "center",
        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.04)",
      }}
    >
      <FloatingIconsDecor />
      <div
        style={{
          position: "relative",
          zIndex: 1,
          width: 58,
          height: 58,
          borderRadius: 18,
          backgroundColor: "color-mix(in srgb, var(--color-accent) 12%, transparent)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--color-accent)",
          marginBottom: 18,
        }}
      >
        <BookOpen size={28} strokeWidth={2} />
      </div>

      <h3
        style={{
          fontSize: "clamp(20px, 2.2vw, 24px)",
          fontWeight: 700,
          color: "var(--color-ink)",
          margin: "0 0 10px 0",
          letterSpacing: "-0.015em",
        }}
      >
        No handover guide started yet
      </h3>

      <p
        style={{
          fontSize: 14,
          color: "var(--color-muted)",
          maxWidth: 440,
          margin: "0 0 24px 0",
          lineHeight: 1.5,
        }}
      >
        Create a structured transition guide for your role covering responsibilities, regular duties, key contacts, open projects, and links to stored documents.
      </p>

      {canStart && onStartGuide && (
        <button
          type="button"
          onClick={onStartGuide}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            backgroundColor: "var(--color-accent)",
            color: "#ffffff",
            border: "none",
            padding: "11px 24px",
            borderRadius: 9999,
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(5, 150, 105, 0.25)",
            transition: "all 0.15s ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--color-accent-strong)")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "var(--color-accent)")}
        >
          <Plus size={16} strokeWidth={2.5} />
          <span>Start my handover guide</span>
        </button>
      )}
    </div>
  );
}
