"use client";

import React, { useMemo, useState } from "react";
import type {
  PastEventsFilterState,
  PastEventsLogData,
} from "@/src/lib/events/past-events-types";
import { filterPastEvents, calculatePastEventsSummary } from "@/src/lib/events/past-events";
import { FloatingIconsDecor } from "@/src/components/decor/floating-decor";
import { EventsLogStyles } from "./events-log-styles";
import { EventsLogHeader } from "./events-log-header";
import { EventsLogSummaryTiles } from "./events-log-summary-tiles";
import { EventsLogFilterBar } from "./events-log-filter-bar";
import { EventsLogTable } from "./events-log-table";
import { EventsLogMobileCard } from "./events-log-mobile-card";
import { EventsLogEmptyState } from "./events-log-empty-state";

interface EventsLogClientProps {
  initialData: PastEventsLogData;
}

export function EventsLogClient({ initialData }: EventsLogClientProps) {
  const [filter, setFilter] = useState<PastEventsFilterState>({
    term: "all",
    fromDate: "",
    toDate: "",
    search: "",
  });

  const handleFilterChange = (update: Partial<PastEventsFilterState>) => {
    setFilter((prev) => ({ ...prev, ...update }));
  };

  const handleResetFilters = () => {
    setFilter({
      term: "all",
      fromDate: "",
      toDate: "",
      search: "",
    });
  };

  const hasActiveFilters = useMemo(() => {
    return (
      filter.term !== "all" ||
      Boolean(filter.fromDate && filter.fromDate.trim()) ||
      Boolean(filter.toDate && filter.toDate.trim()) ||
      Boolean(filter.search && filter.search.trim())
    );
  }, [filter]);

  const filteredEvents = useMemo(() => {
    return filterPastEvents(initialData.events, filter, initialData.terms);
  }, [initialData.events, filter, initialData.terms]);

  // Recalculate summary tiles dynamically when filters are active, or show overall summary
  const displayedSummary = useMemo(() => {
    if (!hasActiveFilters) return initialData.summary;
    return calculatePastEventsSummary(filteredEvents);
  }, [hasActiveFilters, initialData.summary, filteredEvents]);

  return (
    <div
      style={{
        height: "100%",
        overflowY: "auto",
        padding: "36px clamp(16px, 4vw, 36px) 60px clamp(16px, 4vw, 36px)",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: "100%",
      }}
    >
      <div
        className="orgkit-events-log-shell"
        style={{
          width: "100%",
          maxWidth: 960,
          margin: "0 auto",
          position: "relative",
          animation: "cardPopout 0.45s cubic-bezier(0.16, 1.25, 0.38, 1) both",
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
        <EventsLogStyles />

        {/* Page Header */}
        <EventsLogHeader
          orgId={initialData.orgId}
          orgName={initialData.orgName}
          totalEvents={initialData.events.length}
        />

        {/* Summary Metric Tiles with Floating Decor behind them */}
        <div style={{ position: "relative", width: "100%" }}>
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              zIndex: 0,
            }}
          >
            <FloatingIconsDecor />
          </div>

          <div style={{ position: "relative", zIndex: 2, width: "100%" }}>
            <EventsLogSummaryTiles summary={displayedSummary} />
          </div>
        </div>

        {/* Filter and Search Bar (shown when organization has past events) */}
        {initialData.events.length > 0 && (
          <EventsLogFilterBar
            filter={filter}
            terms={initialData.terms}
            onFilterChange={handleFilterChange}
            onReset={handleResetFilters}
            hasActiveFilters={hasActiveFilters}
            totalFiltered={filteredEvents.length}
          />
        )}

        {/* Main Content Area */}
        {initialData.events.length === 0 ? (
          <EventsLogEmptyState />
        ) : filteredEvents.length === 0 ? (
          <EventsLogEmptyState
            isFiltered={true}
            onClearFilters={handleResetFilters}
          />
        ) : (
          <>
            {/* Desktop Table View */}
            <EventsLogTable orgId={initialData.orgId} events={filteredEvents} />

            {/* Mobile Cards View */}
            <div
              className="orgkit-log-mobile-cards"
              style={{
                display: "none",
                flexDirection: "column",
                gap: 12,
                width: "100%",
              }}
            >
              {filteredEvents.map((event) => (
                <EventsLogMobileCard
                  key={event.id}
                  orgId={initialData.orgId}
                  event={event}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
