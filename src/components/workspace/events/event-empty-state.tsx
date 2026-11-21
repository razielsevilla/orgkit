import React from "react";
import { CalendarDays } from "lucide-react";

/** Shown when the org has no events. The header's "New event" button is the single call to action. */
export function EventEmptyState() {
  return (
    <div
      role="region"
      aria-label="No events yet"
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "clamp(48px, 6vw, 72px) clamp(24px, 4vw, 48px)",
        backgroundColor: "var(--color-surface)",
        borderRadius: 28,
        border: "1px solid var(--color-line)",
        textAlign: "center",
        boxShadow: "0 20px 50px rgba(24, 24, 27, 0.05)",
        overflow: "hidden",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: -60,
          left: -60,
          width: 220,
          height: 220,
          borderRadius: "50%",
          backgroundColor: "color-mix(in srgb, var(--color-accent) 4%, transparent)",
          pointerEvents: "none",
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          bottom: -80,
          right: -80,
          width: 260,
          height: 260,
          borderRadius: "50%",
          backgroundColor: "color-mix(in srgb, var(--color-accent) 5%, transparent)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: "50%",
          backgroundColor: "color-mix(in srgb, var(--color-accent) 10%, transparent)",
          border: "1px solid color-mix(in srgb, var(--color-accent) 22%, transparent)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--color-accent)",
          marginBottom: 20,
          boxShadow: "0 8px 24px rgba(5, 150, 105, 0.12)",
        }}
      >
        <CalendarDays size={28} strokeWidth={2.2} aria-hidden="true" />
      </div>

      <h2
        style={{
          fontSize: "clamp(22px, 2.2vw, 28px)",
          fontWeight: 700,
          color: "var(--color-ink)",
          letterSpacing: "-0.015em",
          margin: "0 0 10px 0",
        }}
      >
        No events yet
      </h2>
      <p style={{ fontSize: 15, color: "var(--color-muted)", maxWidth: 420, lineHeight: 1.5, margin: 0 }}>
        Create your first event. Attendance is recorded against an event.
      </p>
    </div>
  );
}
