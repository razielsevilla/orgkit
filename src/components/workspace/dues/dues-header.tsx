import React from "react";
import { Plus } from "lucide-react";

interface DuesHeaderProps {
  totalCount: number;
  openCount: number;
  onCreatePeriod: () => void;
}

export function DuesHeader({
  totalCount,
  openCount,
  onCreatePeriod,
}: DuesHeaderProps) {
  const summaryText =
    totalCount === 0
      ? "No dues periods yet"
      : `${totalCount} ${totalCount === 1 ? "period" : "periods"} • ${openCount} open`;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 16,
        width: "100%",
        marginBottom: 20,
      }}
    >
      <div>
        <h1
          style={{
            fontSize: "clamp(24px, 2.5vw, 32px)",
            fontWeight: 800,
            color: "var(--color-ink)",
            letterSpacing: "-0.025em",
            margin: 0,
            lineHeight: 1.15,
          }}
        >
          Dues
        </h1>
        <p
          style={{
            fontSize: 13.5,
            color: "var(--color-muted)",
            margin: "4px 0 0",
          }}
        >
          {summaryText}
        </p>
      </div>

      <button
        type="button"
        onClick={onCreatePeriod}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          height: 38,
          padding: "0 18px",
          borderRadius: 9999,
          backgroundColor: "var(--color-accent)",
          color: "var(--color-surface)",
          fontSize: 13.5,
          fontWeight: 600,
          border: "none",
          cursor: "pointer",
          boxShadow: "0 2px 8px color-mix(in srgb, var(--color-accent) 25%, transparent)",
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
