import React from "react";
import Link from "next/link";
import { Clock, MapPin } from "lucide-react";
import type { WorkspaceEvent } from "@/src/app/(workspace)/events-actions";
import { eventPath } from "@/src/lib/routes";
import { EventActions } from "./event-actions";
import { EventStatusBadge } from "./event-status-badge";
import { LocalDateTile, LocalTimeRange } from "./local-time";

interface EventCardProps {
  orgId: string;
  event: WorkspaceEvent;
  /** The event has ended: the date tile is muted */
  past: boolean;
  onEdit: (event: WorkspaceEvent) => void;
  onCancel: (event: WorkspaceEvent) => void;
}

const metaRow: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "center",
  gap: 6,
  minWidth: 0,
  fontSize: 13,
  color: "var(--color-muted-strong)",
};

/** Board, card hover/focus lift and the stretched link */
export function EventCardStyles() {
  return (
    <style>{`
      /* 2x2 board: Past top-left, Cancelled bottom-left, Upcoming down the whole right side */
      .orgkit-ev-board {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(0, 1.3fr);
        grid-template-rows: minmax(0, 1fr) minmax(0, 1fr);
        grid-template-areas: "past upcoming" "cancelled upcoming";
        gap: 24px;
      }
      .orgkit-ev-area-upcoming { grid-area: upcoming; }
      .orgkit-ev-area-past { grid-area: past; }
      .orgkit-ev-area-cancelled { grid-area: cancelled; }
      .orgkit-ev-column { min-width: 0; min-height: 0; display: flex; flex-direction: column; gap: 12px; }
      .orgkit-ev-stack {
        flex: 1 1 auto;
        min-height: 0;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 12px;
        /* room for the card shadow and hover lift, which the scroll area would clip */
        padding: 4px;
        margin: -4px;
        outline: none;
      }
      .orgkit-ev-stack:focus-visible { box-shadow: 0 0 0 2px var(--color-accent); border-radius: 20px; }
      @media (max-width: 1000px) {
        .orgkit-ev-board {
          grid-template-columns: minmax(0, 1fr);
          grid-template-rows: none;
          grid-template-areas: "upcoming" "past" "cancelled";
          align-items: start;
        }
        .orgkit-ev-stack { overflow: visible; }
      }
      .orgkit-ev-card {
        position: relative;
        display: flex;
        flex-direction: column;
        gap: 14px;
        padding: 18px;
        background-color: var(--color-surface);
        border: 1px solid var(--color-line);
        border-radius: 20px;
        box-shadow: 0 2px 10px color-mix(in srgb, var(--color-ink) 3%, transparent);
        transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
      }
      .orgkit-ev-card:hover {
        border-color: color-mix(in srgb, var(--color-accent) 45%, var(--color-line));
        box-shadow: 0 10px 28px color-mix(in srgb, var(--color-ink) 8%, transparent);
        transform: translateY(-1px);
      }
      .orgkit-ev-card:focus-within {
        border-color: var(--color-accent);
        box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-accent) 18%, transparent);
      }
      .orgkit-ev-link { color: inherit; text-decoration: none; outline: none; }
      .orgkit-ev-link::after { content: ""; position: absolute; inset: 0; border-radius: 20px; }
      .orgkit-ev-footer {
        position: relative;
        z-index: 2;
        margin-top: auto;
        padding-top: 14px;
        border-top: 1px solid color-mix(in srgb, var(--color-line) 70%, transparent);
      }
      @media (prefers-reduced-motion: reduce) {
        .orgkit-ev-card { transition: none; }
        .orgkit-ev-card:hover { transform: none; }
      }
    `}</style>
  );
}

/**
 * One event card. The whole card opens the event's page (the title link covers
 * it); Edit and Cancel sit above that link. The status badge only appears when
 * it adds something: "Cancelled", or a live "Check-in open". A scheduled event
 * is already told apart by the Upcoming/Past grouping.
 */
export function EventCard({ orgId, event, past, onEdit, onCancel }: EventCardProps) {
  const cancelled = event.status === "cancelled";
  const muted = cancelled || past;
  const liveCheckin = event.checkinOpen && !cancelled;

  return (
    <div role="article" data-tour="event-card" data-event-row={event.id} className="orgkit-ev-card">
      <div style={{ display: "flex", justifyContent: "center" }}>
        <div
          aria-hidden="true"
          style={{
            width: 56,
            height: 56,
            flexShrink: 0,
            borderRadius: 14,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: muted ? "var(--color-muted)" : "var(--color-accent)",
            backgroundColor: muted
              ? "color-mix(in srgb, var(--color-line) 55%, transparent)"
              : "color-mix(in srgb, var(--color-accent) 10%, transparent)",
            border: muted
              ? "1px solid var(--color-line)"
              : "1px solid color-mix(in srgb, var(--color-accent) 22%, transparent)",
          }}
        >
          <LocalDateTile iso={event.startsAt} />
        </div>

      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, minWidth: 0, textAlign: "center" }}>
        <Link
          href={eventPath(orgId, event.id)}
          className="orgkit-ev-link"
          style={{
            fontWeight: 600,
            fontSize: 16,
            color: cancelled ? "var(--color-muted)" : "var(--color-ink)",
            textDecoration: cancelled ? "line-through" : "none",
            overflowWrap: "anywhere",
          }}
        >
          {event.title}
        </Link>
        <div style={metaRow}>
          <Clock size={13} aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }} />
          <LocalTimeRange startIso={event.startsAt} endIso={event.endsAt} />
        </div>
        {event.location && (
          <div style={metaRow}>
            <MapPin size={13} aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }} />
            <span style={{ overflowWrap: "anywhere" }}>{event.location}</span>
          </div>
        )}
        {(cancelled || liveCheckin) && (
          <div style={{ marginTop: 2 }}>
        {cancelled && <EventStatusBadge status="cancelled" />}
        {liveCheckin && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 10px",
              borderRadius: 9999,
              backgroundColor: "color-mix(in srgb, var(--color-accent) 12%, transparent)",
              color: "var(--color-accent)",
              fontSize: 12.5,
              fontWeight: 600,
              lineHeight: 1,
              whiteSpace: "nowrap",
            }}
          >
            <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "var(--color-accent)" }} />
            Check-in open
          </span>
        )}
          </div>
        )}
      </div>

      {!cancelled && (
        <div className="orgkit-ev-footer">
          <EventActions event={event} onEdit={onEdit} onCancel={onCancel} isMobile />
        </div>
      )}
    </div>
  );
}
