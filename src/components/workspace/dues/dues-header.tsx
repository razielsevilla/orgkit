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
        marginBottom: 24,
      }}
    >
      <div>
        <h1
          tabIndex={-1}
          style={{
            outline: "none",
            fontSize: "clamp(26px, 2.6vw, 34px)",
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
            margin: "6px 0 0 0",
            fontSize: 14,
            color: "var(--color-muted)",
            lineHeight: 1.4,
          }}
        >
          {summaryText}
        </p>
      </div>

      {totalCount > 0 && (
        <button
          type="button"
          onClick={onCreatePeriod}
          className="orgkit-btn-accent"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            minHeight: 42,
            padding: "10px 20px",
            borderRadius: 9999,
            backgroundColor: "var(--color-accent)",
            color: "#FFFFFF",
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
      )}
    </div>
  );
}

