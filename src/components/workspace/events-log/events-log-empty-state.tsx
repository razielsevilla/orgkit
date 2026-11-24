import React from "react";
import { CalendarDays, FilterX, RotateCcw } from "lucide-react";
import { PAST_EVENTS_MESSAGES } from "@/src/lib/events/past-events-types";

interface EventsLogEmptyStateProps {
  isFiltered?: boolean;
  onClearFilters?: () => void;
}

export function EventsLogEmptyState({
  isFiltered = false,
  onClearFilters,
}: EventsLogEmptyStateProps) {
  if (isFiltered) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "54px 24px",
          backgroundColor: "var(--color-surface)",
          borderRadius: 24,
          border: "1px solid var(--color-line)",
          textAlign: "center",
          boxShadow: "0 2px 12px rgba(0, 0, 0, 0.03)",
        }}
      >
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 16,
            backgroundColor: "color-mix(in srgb, var(--color-muted) 12%, transparent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--color-muted-strong)",
            marginBottom: 16,
          }}
        >
          <FilterX size={26} strokeWidth={2} />
        </div>

        <h3
          style={{
            fontSize: "clamp(18px, 2vw, 20px)",
            fontWeight: 700,
            color: "var(--color-ink)",
            margin: "0 0 8px 0",
            letterSpacing: "-0.015em",
          }}
        >
          No matching past events found
        </h3>

        <p
          style={{
            fontSize: 14,
            color: "var(--color-muted)",
            maxWidth: 400,
            margin: "0 0 20px 0",
            lineHeight: 1.5,
          }}
        >
          No events match the selected term, date range, or keyword query. Try adjusting or clearing your filters.
        </p>

        {onClearFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              backgroundColor: "var(--color-surface)",
              color: "var(--color-ink)",
              border: "1px solid var(--color-line)",
              padding: "10px 22px",
              borderRadius: 9999,
              fontSize: 13.5,
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
              transition: "all 0.15s ease",
            }}
          >
            <RotateCcw size={15} />
            <span>Clear filters</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      style={{
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
      <div
        style={{
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
        <CalendarDays size={30} strokeWidth={2} />
      </div>

      <h3
        style={{
          fontSize: "clamp(20px, 2.2vw, 24px)",
          fontWeight: 700,
          color: "var(--color-ink)",
          margin: "0 0 10px 0",
          letterSpacing: "-0.02em",
        }}
      >
        {PAST_EVENTS_MESSAGES.noPastEvents}
      </h3>

      <p
        style={{
          fontSize: 14.5,
          color: "var(--color-muted)",
          maxWidth: 480,
          margin: "0 0 16px 0",
          lineHeight: 1.6,
        }}
      >
        {PAST_EVENTS_MESSAGES.emptyDescription}
      </p>

      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 14px",
          borderRadius: 9999,
          backgroundColor: "color-mix(in srgb, var(--color-accent) 8%, transparent)",
          color: "var(--color-accent-strong)",
          fontSize: 12.5,
          fontWeight: 600,
        }}
      >
        <span>Automatic attendance history</span>
      </div>
    </div>
  );
}
