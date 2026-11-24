import React from "react";
import Link from "next/link";
import { ArrowRight, Calendar, MapPin, Users, XCircle } from "lucide-react";
import { eventPath } from "@/src/lib/routes";
import type { PastEventLogItem } from "@/src/lib/events/past-events-types";

interface EventsLogMobileCardProps {
  orgId: string;
  event: PastEventLogItem;
}

function formatMobileDate(isoDate: string): string {
  try {
    const d = new Date(isoDate);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return isoDate;
  }
}

export function EventsLogMobileCard({ orgId, event }: EventsLogMobileCardProps) {
  const isCancelled = event.status === "cancelled";
  const targetUrl = eventPath(orgId, event.id);

  return (
    <Link
      href={targetUrl}
      className="orgkit-log-card"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        padding: "16px 18px",
        backgroundColor: "var(--color-surface)",
        borderRadius: 18,
        border: "1px solid var(--color-line)",
        textDecoration: "none",
        color: "inherit",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.02)",
        position: "relative",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--color-muted)", fontSize: 12.5 }}>
          <Calendar size={13} />
          <span>{formatMobileDate(event.startsAt)}</span>
        </div>

        {isCancelled ? (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              backgroundColor: "#FEF2F2",
              color: "#DC2626",
              border: "1px solid #FECACA",
              padding: "2px 8px",
              borderRadius: 9999,
              fontSize: 11.5,
              fontWeight: 700,
            }}
          >
            <XCircle size={12} />
            <span>Cancelled</span>
          </span>
        ) : (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              backgroundColor: "color-mix(in srgb, var(--color-accent) 12%, transparent)",
              color: "var(--color-accent-strong)",
              border: "1px solid color-mix(in srgb, var(--color-accent) 25%, transparent)",
              padding: "2px 8px",
              borderRadius: 9999,
              fontSize: 11.5,
              fontWeight: 700,
            }}
          >
            <Users size={12} />
            <span>{event.attendanceCount ?? 0} attended</span>
          </span>
        )}
      </div>

      <div>
        <h4
          style={{
            margin: 0,
            fontSize: 15,
            fontWeight: 700,
            color: "var(--color-ink)",
            lineHeight: 1.3,
            wordBreak: "break-word",
          }}
        >
          {event.title}
        </h4>

        {event.location && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              marginTop: 6,
              color: "var(--color-muted)",
              fontSize: 12.5,
            }}
          >
            <MapPin size={12} style={{ flexShrink: 0 }} />
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {event.location}
            </span>
          </div>
        )}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: 4,
          color: "var(--color-accent)",
          fontSize: 12.5,
          fontWeight: 600,
          paddingTop: 4,
          borderTop: "1px solid color-mix(in srgb, var(--color-line) 60%, transparent)",
        }}
      >
        <span>View attendees</span>
        <ArrowRight size={13} />
      </div>
    </Link>
  );
}
