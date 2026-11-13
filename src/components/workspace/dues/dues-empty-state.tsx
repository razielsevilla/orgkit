import React from "react";
import { Banknote, Plus } from "lucide-react";

interface DuesEmptyStateProps {
  onCreatePeriod: () => void;
}

export function DuesEmptyState({ onCreatePeriod }: DuesEmptyStateProps) {
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
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 16,
          backgroundColor: "color-mix(in srgb, var(--color-accent) 10%, transparent)",
          border: "1px solid color-mix(in srgb, var(--color-accent) 20%, transparent)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 16,
          color: "var(--color-accent)",
        }}
      >
        <Banknote size={28} strokeWidth={1.75} />
      </div>

      <h2
        style={{
          fontSize: 20,
          fontWeight: 700,
          color: "var(--color-ink)",
          margin: "0 0 8px",
          letterSpacing: "-0.015em",
        }}
      >
        No dues periods yet
      </h2>

      <p
        style={{
          fontSize: 14,
          color: "var(--color-muted)",
          maxWidth: 380,
          margin: "0 0 24px",
          lineHeight: 1.5,
        }}
      >
        Create your first dues period to set the amount, due date, and track payments from your members.
      </p>

      <button
        type="button"
        onClick={onCreatePeriod}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          height: 42,
          padding: "0 22px",
          borderRadius: 9999,
          backgroundColor: "var(--color-accent)",
          color: "var(--color-surface)",
          fontSize: 14,
          fontWeight: 600,
          border: "none",
          cursor: "pointer",
          boxShadow: "0 2px 8px color-mix(in srgb, var(--color-accent) 30%, transparent)",
          transition: "background-color 0.15s ease, transform 0.15s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = "var(--color-accent-strong)";
          e.currentTarget.style.transform = "translateY(-1px)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "var(--color-accent)";
          e.currentTarget.style.transform = "translateY(0)";
        }}
      >
        <Plus size={16} strokeWidth={2.2} />
        New period
      </button>
    </div>
  );
}

