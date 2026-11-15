import React from "react";
import { CheckCircle2 } from "lucide-react";

interface DuesReviewEmptyStateProps {
  periodName?: string;
}

export function DuesReviewEmptyState({ periodName }: DuesReviewEmptyStateProps) {
  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "clamp(36px, 5vw, 56px) clamp(20px, 3vw, 36px)",
        textAlign: "center",
        backgroundColor: "var(--color-surface)",
        borderRadius: 20,
        border: "1px solid var(--color-line)",
        width: "100%",
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: 16,
          backgroundColor: "color-mix(in srgb, #10b981 12%, transparent)",
          color: "#059669",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 16,
        }}
      >
        <CheckCircle2 size={28} />
      </div>

      <h3
        style={{
          margin: "0 0 6px 0",
          fontSize: "1.1rem",
          fontWeight: 600,
          color: "var(--color-ink)",
        }}
      >
        Nothing to review
      </h3>

      <p
        style={{
          margin: 0,
          fontSize: "0.875rem",
          color: "var(--color-ink-muted)",
          maxWidth: 320,
          lineHeight: 1.5,
        }}
      >
        {periodName
          ? `All payment submissions for ${periodName} have been verified or resolved.`
          : "All payment submissions for this period have been reviewed."}
      </p>
    </div>
  );
}
