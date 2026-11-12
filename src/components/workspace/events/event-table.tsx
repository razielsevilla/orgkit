import React from "react";
import Link from "next/link";
import type { WorkspaceEvent } from "@/src/app/(workspace)/events-actions";
import {
  ROSTER_FOOTER_STYLE,
  ROSTER_TABLE_STYLE,
  TABLE_CARD_STYLE,
} from "@/src/components/workspace/members/member-table-layout";
import { eventPath } from "@/src/lib/routes";
import { EventActions } from "./event-actions";
import { EventStatusBadge } from "./event-status-badge";
import {
  EVENT_CELL_PADDING,
  EventColgroup,
  EventHeaderBar,
  EventScreenReaderHeader,
} from "./event-table-layout";
import { LocalTime } from "./local-time";

interface EventTableProps {
  orgId: string;
  events: WorkspaceEvent[];
  onEdit: (event: WorkspaceEvent) => void;
  onCancel: (event: WorkspaceEvent) => void;
}

const ellipsis: React.CSSProperties = { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };

/**
 * Desktop table, in the same card as the member roster. The title opens the
 * event's page; cancelled rows stay in the list, struck through and muted.
 */
export function EventTable({ orgId, events, onEdit, onCancel }: EventTableProps) {
  return (
    <div className="orgkit-members-table-card" style={{ ...TABLE_CARD_STYLE, display: "flex", flexDirection: "column" }}>
      <EventHeaderBar />
      <div
        tabIndex={0}
        role="region"
        aria-label="Events table"
        className="orgkit-members-table-scroll"
        style={{ flex: "1 1 auto", minHeight: 0, overflow: "auto", scrollbarGutter: "stable" }}
      >
        <table style={ROSTER_TABLE_STYLE}>
          <EventColgroup />
          <EventScreenReaderHeader />
          <tbody style={{ fontSize: 13.5 }}>
            {events.map((event, idx) => {
              const cancelled = event.status === "cancelled";
              return (
                <tr
                  key={event.id}
                  data-event-row={event.id}
                  className="orgkit-member-row"
                  style={{ borderBottom: idx === events.length - 1 ? "none" : "1px solid var(--color-line)" }}
                >
                  <td style={{ padding: EVENT_CELL_PADDING[0] }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                      <Link
                        href={eventPath(orgId, event.id)}
                        title={event.title}
                        style={{
                          ...ellipsis,
                          fontWeight: 600,
                          color: cancelled ? "var(--color-muted)" : "var(--color-ink)",
                          textDecoration: cancelled ? "line-through" : "none",
                        }}
                      >
                        {event.title}
                      </Link>
                      {event.location && (
                        <span title={event.location} style={{ ...ellipsis, fontSize: 12.5, color: "var(--color-muted)" }}>
                          {event.location}
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: EVENT_CELL_PADDING[1], textAlign: "center", color: "var(--color-muted-strong)" }}>
                    <LocalTime iso={event.startsAt} />
                  </td>
                  <td style={{ padding: EVENT_CELL_PADDING[2], textAlign: "center", color: "var(--color-muted-strong)" }}>
                    <LocalTime iso={event.endsAt} />
                  </td>
                  <td style={{ padding: EVENT_CELL_PADDING[3], textAlign: "center" }}>
                    <EventStatusBadge status={event.status} />
                  </td>
                  <td style={{ padding: EVENT_CELL_PADDING[4], textAlign: "center" }}>
                    <EventActions event={event} onEdit={onEdit} onCancel={onCancel} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={ROSTER_FOOTER_STYLE}>
        <div>
          {events.length} {events.length === 1 ? "event" : "events"}
        </div>
      </div>
    </div>
  );
}
