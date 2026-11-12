"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowLeft, Ban, Pencil, QrCode } from "lucide-react";
import type { WorkspaceEvent } from "@/src/app/(workspace)/events-actions";
import { PANEL_RADIUS } from "@/src/components/workspace/members/member-table-layout";
import { MembersStyles } from "@/src/components/workspace/members/members-styles";
import { checkinPath, eventsPath } from "@/src/lib/routes";
import { EventStatusBadge } from "./event-status-badge";
import { LocalTime } from "./local-time";

const EventFormDialog = dynamic(() => import("./event-form-dialog").then((m) => m.EventFormDialog), {
  ssr: false,
});
const EventCancelDialog = dynamic(() => import("./event-cancel-dialog").then((m) => m.EventCancelDialog), {
  ssr: false,
});

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: "var(--color-muted)",
  letterSpacing: "0.04em",
  textTransform: "uppercase",
};

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
      <dt style={labelStyle}>{label}</dt>
      <dd style={{ margin: 0, fontSize: 14.5, color: "var(--color-ink)", wordBreak: "break-word" }}>{children}</dd>
    </div>
  );
}

/** One event's page: its details, with Edit and Cancel while it is scheduled */
export function EventDetail({ rawId, event }: { rawId: string; event: WorkspaceEvent }) {
  const [editOpen, setEditOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const cancelled = event.status === "cancelled";

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
        style={{
          width: "100%",
          maxWidth: 720,
          margin: "0 auto",
          animation: "cardPopout 0.45s cubic-bezier(0.16, 1.25, 0.38, 1) both",
        }}
      >
        <MembersStyles />

        <EventFormDialog orgId={rawId} event={event} isOpen={editOpen} onClose={() => setEditOpen(false)} />
        <EventCancelDialog orgId={rawId} event={event} isOpen={cancelOpen} onClose={() => setCancelOpen(false)} />

        <Link
          href={eventsPath(rawId)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 16,
            fontSize: 13.5,
            fontWeight: 600,
            color: "var(--color-muted-strong)",
            textDecoration: "none",
          }}
        >
          <ArrowLeft size={15} aria-hidden="true" />
          <span>All events</span>
        </Link>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div style={{ minWidth: 0, flex: "1 1 240px" }}>
            <h1
              tabIndex={-1}
              style={{
                outline: "none",
                fontSize: "clamp(24px, 2.6vw, 32px)",
                fontWeight: 800,
                color: cancelled ? "var(--color-muted)" : "var(--color-ink)",
                textDecoration: cancelled ? "line-through" : "none",
                letterSpacing: "-0.025em",
                margin: "0 0 10px 0",
                lineHeight: 1.15,
                wordBreak: "break-word",
              }}
            >
              {event.title}
            </h1>
            <EventStatusBadge status={event.status} />
          </div>

          {!cancelled && (
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Link
                href={checkinPath(rawId, event.id)}
                className="orgkit-btn-accent"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  minHeight: 42,
                  padding: "0 20px",
                  borderRadius: 9999,
                  backgroundColor: "var(--color-accent)",
                  color: "#FFFFFF",
                  fontWeight: 600,
                  fontSize: 13.5,
                  textDecoration: "none",
                }}
              >
                <QrCode size={15} aria-hidden="true" />
                <span>{event.checkinOpen ? "Check-in is open" : "Check-in"}</span>
              </Link>
              <button
                type="button"
                onClick={() => setEditOpen(true)}
                className="orgkit-btn-secondary"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  minHeight: 42,
                  padding: "0 20px",
                  borderRadius: 9999,
                  border: "1px solid var(--color-line)",
                  backgroundColor: "var(--color-surface)",
                  color: "var(--color-ink)",
                  fontWeight: 600,
                  fontSize: 13.5,
                  cursor: "pointer",
                }}
              >
                <Pencil size={15} aria-hidden="true" />
                <span>Edit</span>
              </button>
              <button
                type="button"
                onClick={() => setCancelOpen(true)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  minHeight: 42,
                  padding: "0 20px",
                  borderRadius: 9999,
                  border: "1px solid #FEE2E2",
                  backgroundColor: "#FEF2F2",
                  color: "#DC2626",
                  fontWeight: 600,
                  fontSize: 13.5,
                  cursor: "pointer",
                }}
              >
                <Ban size={15} aria-hidden="true" />
                <span>Cancel event</span>
              </button>
            </div>
          )}
        </div>

        <dl
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 20,
            margin: "24px 0 0 0",
            padding: 24,
            backgroundColor: "var(--color-surface)",
            borderRadius: PANEL_RADIUS,
            border: "1px solid var(--color-line)",
            boxShadow: "0 4px 18px color-mix(in srgb, var(--color-ink) 3%, transparent)",
            boxSizing: "border-box",
          }}
        >
          <Detail label="Starts">
            <LocalTime iso={event.startsAt} />
          </Detail>
          <Detail label="Ends">
            <LocalTime iso={event.endsAt} />
          </Detail>
          <Detail label="Location">
            {event.location ?? <span style={{ color: "var(--color-muted)" }}>No location</span>}
          </Detail>
        </dl>

        {cancelled && (
          <p style={{ margin: "16px 0 0", fontSize: 14, color: "var(--color-muted-strong)", lineHeight: 1.5 }}>
            This event is cancelled. It stays in the list, and nobody can check in.
          </p>
        )}
      </div>
    </div>
  );
}
