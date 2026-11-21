import React from "react";
import { EVENT_STATUS_LABELS, type EventStatus } from "@/src/lib/events/event-validation";
import { STATUS_TONES } from "@/src/components/workspace/members/member-status-tones";

/** Scheduled uses the accent tone and Cancelled the danger tone, the same colors as the member statuses */
const EVENT_TONES = {
  scheduled: STATUS_TONES.active,
  cancelled: STATUS_TONES.inactive,
} as const;

interface EventStatusBadgeProps {
  status: EventStatus;
  size?: "sm" | "md";
}

export function EventStatusBadge({ status, size = "md" }: EventStatusBadgeProps) {
  const tone = EVENT_TONES[status];
  const label = EVENT_STATUS_LABELS[status];

  return (
    <span
      role="status"
      aria-label={`Status: ${label}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: size === "sm" ? "2px 8px" : "4px 10px",
        borderRadius: 9999,
        backgroundColor: tone.background,
        border: tone.border,
        color: tone.text,
        fontSize: size === "sm" ? 11.5 : 12.5,
        fontWeight: 600,
        letterSpacing: "0.01em",
        lineHeight: 1,
        whiteSpace: "nowrap",
        userSelect: "none",
      }}
    >
      <span
        aria-hidden="true"
        style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: tone.dot, display: "inline-block" }}
      />
      {label}
    </span>
  );
}
