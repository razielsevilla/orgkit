import React from "react";
import type { WorkspaceEvent } from "@/src/app/(workspace)/events-actions";
import { isPastEvent } from "@/src/lib/events/event-validation";
import { EventCard, EventCardStyles } from "./event-card";

interface EventListProps {
  orgId: string;
  events: WorkspaceEvent[];
  onEdit: (event: WorkspaceEvent) => void;
  onCancel: (event: WorkspaceEvent) => void;
}

const headingStyle: React.CSSProperties = {
  margin: "0 4px",
  fontSize: 13,
  fontWeight: 600,
  color: "var(--color-muted-strong)",
};

/**
 * Events as a 2x2 board: Past top-left, Cancelled bottom-left, and Upcoming down
 * the whole right side, with the cards stacked inside each box. All three always
 * show (an empty one says so); on a narrow screen they stack, Upcoming first.
 */
export function EventList({ orgId, events, onEdit, onCancel }: EventListProps) {
  const cancelled = events.filter((e) => e.status === "cancelled");
  const live = events.filter((e) => e.status !== "cancelled");
  const upcoming = live.filter((e) => !isPastEvent(e));
  const past = live.filter((e) => isPastEvent(e));

  const column = (label: string, items: WorkspaceEvent[], isPast: boolean, emptyText: string) => (
      <section aria-label={label} className={`orgkit-ev-column orgkit-ev-area-${label.toLowerCase()}`}>
        <h2 style={headingStyle}>
          {label} <span style={{ fontWeight: 500, color: "var(--color-muted)" }}>{items.length}</span>
        </h2>
        <div className="orgkit-ev-stack" tabIndex={0} role="region" aria-label={`${label} events`}>
          {items.length === 0 && (
            <div
              style={{
                padding: "28px 16px",
                textAlign: "center",
                fontSize: 13,
                color: "var(--color-muted)",
                border: "1px dashed var(--color-line-strong)",
                borderRadius: 20,
              }}
            >
              {emptyText}
            </div>
          )}
          {items.map((event) => (
            <EventCard key={event.id} orgId={orgId} event={event} past={isPast} onEdit={onEdit} onCancel={onCancel} />
          ))}
        </div>
      </section>
  );

  return (
    <div data-tour="events-board" className="orgkit-ev-board" style={{ position: "relative", width: "100%", marginTop: 16, flex: "1 1 auto", minHeight: 0 }}>
      <EventCardStyles />
      {column("Upcoming", upcoming, false, "No upcoming events")}
      {column("Past", past, true, "No past events")}
      {column("Cancelled", cancelled, true, "No cancelled events")}
    </div>
  );
}
