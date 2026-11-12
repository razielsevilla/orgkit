import React from "react";
import type { MemberStatus } from "@/src/app/(workspace)/members-actions";
import { STATUS_LABELS, STATUS_TONES } from "./member-status-tones";

interface MemberStatusBadgeProps {
  status: MemberStatus;
  size?: "sm" | "md";
}

/** Status badge, colored by `STATUS_TONES` so it matches its filter tab. */
export function MemberStatusBadge({ status, size = "md" }: MemberStatusBadgeProps) {
  const tone = STATUS_TONES[status];
  const label = STATUS_LABELS[status];

  const padding = size === "sm" ? "2px 8px" : "4px 10px";
  const fontSize = size === "sm" ? 11.5 : 12.5;

  return (
    <span
      role="status"
      aria-label={`Status: ${label}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding,
        borderRadius: 9999,
        backgroundColor: tone.background,
        border: tone.border,
        color: tone.text,
        fontSize,
        fontWeight: 600,
        letterSpacing: "0.01em",
        lineHeight: 1,
        whiteSpace: "nowrap",
        userSelect: "none",
        transition: "background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          backgroundColor: tone.dot,
          display: "inline-block",
        }}
      />
      {label}
    </span>
  );
}

