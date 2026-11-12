import React from "react";
import Link from "next/link";
import type { WorkspaceEvent } from "@/src/app/(workspace)/events-actions";
import { PANEL_RADIUS } from "@/src/components/workspace/members/member-table-layout";
import { eventPath } from "@/src/lib/routes";
import { EventActions } from "./event-actions";
import { EventStatusBadge } from "./event-status-badge";
import { LocalTime } from "./local-time";

interface EventMobileCardProps {
  orgId: string;
  event: WorkspaceEvent;
  onEdit: (event: WorkspaceEvent) => void;
  onCancel: (event: WorkspaceEvent) => void;
}

const labelStyle: React.CSSProperties = { color: "var(--color-muted)", fontSize: 12, fontWeight: 600 };

/** Phone card: no horizontal scroll at 360px, long text wraps, 40px buttons */
export function EventMobileCard({ orgId, event, onEdit, onCancel }: EventMobileCardProps) {
  const cancelled = event.status === "cancelled";

  return (
    <div
      role="article"
      data-event-row={event.id}
      aria-label={`Event: ${event.title}`}
      style={{
        backgroundColor: "var(--color-surface)",
        borderRadius: PANEL_RADIUS,
        border: "1px solid var(--color-line)",
        padding: 16,
        boxShadow: "0 2px 10px color-mix(in srgb, var(--color-ink) 3%, transparent)",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        width: "100%",
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <Link
            href={eventPath(orgId, event.id)}
            style={{
              display: "block",
              fontWeight: 600,
              fontSize: 14.5,
              color: cancelled ? "var(--color-muted)" : "var(--color-ink)",
              textDecoration: cancelled ? "line-through" : "none",
              wordBreak: "break-word",
            }}
          >
            {event.title}
          </Link>
          {event.location && (
            <div style={{ marginTop: 2, fontSize: 12.5, color: "var(--color-muted)", wordBreak: "break-word" }}>
              {event.location}
            </div>
          )}
        </div>
        <div style={{ flexShrink: 0 }}>
          <EventStatusBadge status={event.status} />
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "auto 1fr",
          columnGap: 12,
          rowGap: 4,
          paddingTop: 10,
          borderTop: "1px solid color-mix(in srgb, var(--color-line) 60%, transparent)",
          fontSize: 13,
          color: "var(--color-muted-strong)",
        }}
      >
        <span style={labelStyle}>Starts</span>
        <LocalTime iso={event.startsAt} />
        <span style={labelStyle}>Ends</span>
        <LocalTime iso={event.endsAt} />
      </div>

      {!cancelled && <EventActions event={event} onEdit={onEdit} onCancel={onCancel} isMobile />}
    </div>
  );
}
