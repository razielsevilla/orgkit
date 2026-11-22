import React from "react";
import { Plus, Award, History, Layers } from "lucide-react";

interface TermsHeaderProps {
  orgName?: string;
  totalTerms: number;
  currentCount: number;
  pastCount: number;
  activeFilter: "all" | "current" | "past";
  onFilterChange: (filter: "all" | "current" | "past") => void;
  isAdmin: boolean;
  onAddTerm: () => void;
}

export function TermsHeader({
  orgName,
  totalTerms,
  currentCount,
  pastCount,
  activeFilter,
  onFilterChange,
  isAdmin,
  onAddTerm,
}: TermsHeaderProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 16,
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h1
              style={{
                fontSize: "clamp(22px, 3vw, 28px)",
                fontWeight: 800,
                color: "var(--color-ink)",
                margin: 0,
                letterSpacing: "-0.02em",
              }}
            >
              Terms
            </h1>
            <span
              style={{
                backgroundColor: "color-mix(in srgb, var(--color-accent) 12%, transparent)",
                color: "var(--color-accent-strong)",
                fontSize: 12.5,
                fontWeight: 700,
                padding: "2px 10px",
                borderRadius: 999,
              }}
            >
              {totalTerms} {totalTerms === 1 ? "role" : "roles"}
            </span>
          </div>
          <p
            style={{
              fontSize: 14,
              color: "var(--color-muted)",
              margin: 0,
            }}
          >
            {orgName ? `Leadership and officer history for ${orgName}.` : "Record and review who held each officer role and during what period."}
          </p>
        </div>

        {isAdmin && (
          <div className="orgkit-terms-header-actions">
            <button
              type="button"
              onClick={onAddTerm}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                backgroundColor: "var(--color-accent)",
                color: "#ffffff",
                fontWeight: 600,
                fontSize: 13.5,
                padding: "9px 16px",
                borderRadius: 12,
                border: "none",
                cursor: "pointer",
                boxShadow: "0 2px 8px color-mix(in srgb, var(--color-accent) 25%, transparent)",
                transition: "all 0.15s ease",
              }}
            >
              <Plus size={17} strokeWidth={2.4} />
              <span>Record Term</span>
            </button>
          </div>
        )}
      </div>

      {/* Filter Tabs */}
      {totalTerms > 0 && (
        <div
          role="tablist"
          aria-label="Filter officer terms"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            padding: 4,
            borderRadius: 12,
            backgroundColor: "var(--color-surface)",
            border: "1px solid var(--color-line)",
            alignSelf: "flex-start",
          }}
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeFilter === "all"}
            onClick={() => onFilterChange("all")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 12px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: activeFilter === "all" ? 600 : 500,
              color: activeFilter === "all" ? "var(--color-ink)" : "var(--color-muted)",
              backgroundColor: activeFilter === "all" ? "var(--color-base)" : "transparent",
              border: "none",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <Layers size={15} />
            <span>All Terms</span>
            <span style={{ opacity: 0.7, fontSize: 11.5 }}>({totalTerms})</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeFilter === "current"}
            onClick={() => onFilterChange("current")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 12px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: activeFilter === "current" ? 600 : 500,
              color: activeFilter === "current" ? "var(--color-accent-strong)" : "var(--color-muted)",
              backgroundColor: activeFilter === "current" ? "color-mix(in srgb, var(--color-accent) 10%, transparent)" : "transparent",
              border: "none",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <Award size={15} />
            <span>Current</span>
            <span style={{ opacity: 0.7, fontSize: 11.5 }}>({currentCount})</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeFilter === "past"}
            onClick={() => onFilterChange("past")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 12px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: activeFilter === "past" ? 600 : 500,
              color: activeFilter === "past" ? "var(--color-ink)" : "var(--color-muted)",
              backgroundColor: activeFilter === "past" ? "var(--color-base)" : "transparent",
              border: "none",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <History size={15} />
            <span>Past Terms</span>
            <span style={{ opacity: 0.7, fontSize: 11.5 }}>({pastCount})</span>
          </button>
        </div>
      )}
    </div>
  );
}
