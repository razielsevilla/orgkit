import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { eventsPath } from "@/src/lib/routes";

interface EventsLogHeaderProps {
  orgId: string;
  orgName: string;
  totalEvents: number;
}

export function EventsLogHeader({
  orgId,
  orgName,
  totalEvents,
}: EventsLogHeaderProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      {/* Back button */}
      <div>
        <Link
          href={eventsPath(orgId)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            color: "var(--color-muted)",
            fontSize: 13,
            fontWeight: 600,
            textDecoration: "none",
            transition: "color 0.15s ease",
          }}
        >
          <ArrowLeft size={15} />
          <span>Back to events</span>
        </Link>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
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
              Past events
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
              {totalEvents} {totalEvents === 1 ? "event" : "events"}
            </span>
          </div>

          <p
            style={{
              margin: "6px 0 0 0",
              fontSize: 14,
              color: "var(--color-muted)",
              lineHeight: 1.4,
            }}
          >
            Recorded history and attendance of completed and cancelled events for {orgName}.
          </p>
        </div>
      </div>
    </div>
  );
}
