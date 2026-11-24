import React from "react";
import { CalendarDays, CheckCircle2, Users, TrendingUp, XCircle } from "lucide-react";
import type { PastEventsSummary } from "@/src/lib/events/past-events-types";

interface EventsLogSummaryTilesProps {
  summary: PastEventsSummary;
}

export function EventsLogSummaryTiles({ summary }: EventsLogSummaryTilesProps) {
  const tiles = [
    {
      label: "Total past events",
      value: summary.totalEvents,
      icon: CalendarDays,
      color: "var(--color-ink)",
      bg: "color-mix(in srgb, var(--color-ink) 6%, transparent)",
      detail: `${summary.cancelledEvents} cancelled`,
    },
    {
      label: "Completed events",
      value: summary.completedEvents,
      icon: CheckCircle2,
      color: "var(--color-accent)",
      bg: "color-mix(in srgb, var(--color-accent) 10%, transparent)",
      detail: "Held successfully",
    },
    {
      label: "Total attendance",
      value: summary.totalAttendance,
      icon: Users,
      color: "#2563EB", // Royal blue
      bg: "color-mix(in srgb, #2563EB 10%, transparent)",
      detail: "Recorded attendees",
    },
    {
      label: "Average attendance",
      value: summary.averageAttendance,
      icon: TrendingUp,
      color: "#D97706", // Amber
      bg: "color-mix(in srgb, #D97706 10%, transparent)",
      detail: "Per completed event",
    },
  ];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: 16,
        width: "100%",
      }}
    >
      {tiles.map((tile) => {
        const Icon = tile.icon;
        return (
          <div
            key={tile.label}
            style={{
              padding: "18px 20px",
              backgroundColor: "var(--color-surface)",
              borderRadius: 20,
              border: "1px solid var(--color-line)",
              boxShadow: "0 2px 10px rgba(0, 0, 0, 0.02)",
              display: "flex",
              flexDirection: "column",
              gap: 10,
              position: "relative",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--color-muted)",
                }}
              >
                {tile.label}
              </span>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  backgroundColor: tile.bg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: tile.color,
                }}
              >
                <Icon size={16} strokeWidth={2.2} />
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span
                style={{
                  fontSize: "clamp(24px, 2.5vw, 28px)",
                  fontWeight: 800,
                  color: "var(--color-ink)",
                  letterSpacing: "-0.025em",
                  lineHeight: 1,
                }}
              >
                {tile.value}
              </span>
              <span
                style={{
                  fontSize: 12,
                  color: "var(--color-muted)",
                  fontWeight: 500,
                }}
              >
                {tile.detail}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
