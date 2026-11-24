import React from "react";
import { Search, Calendar, RotateCcw, Filter } from "lucide-react";
import { Select } from "@/src/components/ui/select";
import type {
  PastEventsFilterState,
  TermFilterOption,
} from "@/src/lib/events/past-events-types";

interface EventsLogFilterBarProps {
  filter: PastEventsFilterState;
  terms: TermFilterOption[];
  onFilterChange: (update: Partial<PastEventsFilterState>) => void;
  onReset: () => void;
  hasActiveFilters: boolean;
  totalFiltered: number;
}

export function EventsLogFilterBar({
  filter,
  terms,
  onFilterChange,
  onReset,
  hasActiveFilters,
  totalFiltered,
}: EventsLogFilterBarProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        width: "100%",
        padding: "16px 20px",
        backgroundColor: "var(--color-surface)",
        borderRadius: 20,
        border: "1px solid var(--color-line)",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.02)",
      }}
    >
      <div
        className="orgkit-log-filters"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
          width: "100%",
        }}
      >
        {/* Search Input */}
        <div
          style={{
            position: "relative",
            flex: "1 1 240px",
            minWidth: 200,
          }}
        >
          <Search
            size={16}
            color="var(--color-muted)"
            style={{
              position: "absolute",
              left: 14,
              top: "50%",
              transform: "translateY(-50%)",
              pointerEvents: "none",
            }}
          />
          <input
            type="text"
            value={filter.search ?? ""}
            onChange={(e) => onFilterChange({ search: e.target.value })}
            placeholder="Search by title, location..."
            aria-label="Search past events"
            style={{
              width: "100%",
              padding: "9px 14px 9px 38px",
              borderRadius: 12,
              border: "1px solid var(--color-line)",
              backgroundColor: "var(--color-base)",
              fontSize: 13.5,
              color: "var(--color-ink)",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Term Selector Dropdown */}
        {terms.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
            <label
              htmlFor="term-filter"
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "var(--color-muted)",
              }}
            >
              Term:
            </label>
            <Select
              id="term-filter"
              value={filter.term}
              onChange={(term) => onFilterChange({ term })}
              fullWidth={false}
              size="sm"
              options={[
                { value: "all", label: "All Terms" },
                ...terms.map((t) => ({ value: t.termName, label: t.termName })),
              ]}
              triggerStyle={{
                minWidth: 140,
                height: 38,
                borderRadius: 12,
                backgroundColor: "var(--color-base)",
                fontWeight: 600,
              }}
            />
          </div>
        )}

        {/* Date Range Inputs */}
        <div
          className="orgkit-log-date-inputs"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 13, color: "var(--color-muted)", fontWeight: 500 }}>
              From:
            </span>
            <input
              type="date"
              value={filter.fromDate ?? ""}
              onChange={(e) => onFilterChange({ fromDate: e.target.value })}
              aria-label="Filter from date"
              style={{
                padding: "7px 10px",
                borderRadius: 10,
                border: "1px solid var(--color-line)",
                backgroundColor: "var(--color-base)",
                fontSize: 12.5,
                color: "var(--color-ink)",
                outline: "none",
              }}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 13, color: "var(--color-muted)", fontWeight: 500 }}>
              To:
            </span>
            <input
              type="date"
              value={filter.toDate ?? ""}
              onChange={(e) => onFilterChange({ toDate: e.target.value })}
              aria-label="Filter to date"
              style={{
                padding: "7px 10px",
                borderRadius: 10,
                border: "1px solid var(--color-line)",
                backgroundColor: "var(--color-base)",
                fontSize: 12.5,
                color: "var(--color-ink)",
                outline: "none",
              }}
            />
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={onReset}
              title="Reset all filters"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "7px 14px",
                borderRadius: 9999,
                border: "1px solid color-mix(in srgb, var(--color-line) 80%, transparent)",
                backgroundColor: "var(--color-surface)",
                color: "var(--color-muted-strong)",
                fontSize: 12.5,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <RotateCcw size={13} />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
