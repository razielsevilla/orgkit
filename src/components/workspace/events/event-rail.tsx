"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { useSelectedLayoutSegments } from "next/navigation";
import type { WorkspaceEvent } from "@/src/app/(workspace)/events-actions";
import { isPastEvent, sortEvents } from "@/src/lib/events/event-validation";
import { eventPath } from "@/src/lib/routes";
import { LocalDateTile, LocalTimeRange } from "./local-time";

const railStyle: React.CSSProperties = {
  height: "100%",
  overflowY: "auto",
  padding: "36px 12px 40px",
  boxSizing: "border-box",
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

/** Placeholder while the list streams in */
export function EventRailSkeleton() {
  return (
    <div role="status" aria-label="Loading events" style={railStyle}>
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="orgkit-skeleton"
          style={{
            height: 64,
            borderRadius: 14,
            backgroundColor: "color-mix(in srgb, var(--color-line) 60%, transparent)",
          }}
        />
      ))}
    </div>
  );
}

/**
 * The events list as a narrow, scrollable rail beside an open event. The open
 * event is highlighted; every other row opens that event.
 */
export function EventRail({ rawId, events }: { rawId: string; events: WorkspaceEvent[] }) {
  const selectedId = useSelectedLayoutSegments()[0];
  const sorted = useMemo(() => sortEvents(events), [events]);

  return (
    <nav aria-label="Events" style={railStyle}>
      <h2 style={{ margin: 0, padding: "0 6px 4px", fontSize: 14, fontWeight: 700, color: "var(--color-ink)" }}>Events</h2>

      {sorted.map((event) => {
        const active = event.id === selectedId;
        const cancelled = event.status === "cancelled";
        const muted = cancelled || isPastEvent(event);
        return (
          <Link
            key={event.id}
            href={eventPath(rawId, event.id)}
            aria-current={active ? "page" : undefined}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: 10,
              borderRadius: 14,
              textDecoration: "none",
              color: "inherit",
              border: active
                ? "1px solid color-mix(in srgb, var(--color-accent) 45%, var(--color-line))"
                : "1px solid transparent",
              backgroundColor: active ? "var(--color-surface)" : "transparent",
              boxShadow: active ? "0 4px 14px color-mix(in srgb, var(--color-ink) 6%, transparent)" : "none",
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 46,
                height: 46,
                flexShrink: 0,
                borderRadius: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: muted ? "var(--color-muted)" : "var(--color-accent)",
                backgroundColor: muted
                  ? "color-mix(in srgb, var(--color-line) 55%, transparent)"
                  : "color-mix(in srgb, var(--color-accent) 10%, transparent)",
              }}
            >
              <LocalDateTile iso={event.startsAt} />
            </span>
            <span style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: cancelled ? "var(--color-muted)" : "var(--color-ink)",
                  textDecoration: cancelled ? "line-through" : "none",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {event.title}
              </span>
              <span style={{ fontSize: 12.5, color: "var(--color-muted-strong)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                <LocalTimeRange startIso={event.startsAt} endIso={event.endsAt} />
              </span>
            </span>
            {event.checkinOpen && !cancelled && (
              <span
                role="img"
                aria-label="Check-in open"
                title="Check-in open"
                style={{ marginLeft: "auto", width: 8, height: 8, flexShrink: 0, borderRadius: "50%", backgroundColor: "var(--color-accent)" }}
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
