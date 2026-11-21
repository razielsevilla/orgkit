import React from "react";
import type { DuesMemberStatus } from "@/src/lib/dues/dues-dashboard";

interface DuesMemberStatusPillProps {
  status: DuesMemberStatus;
  size?: "sm" | "md";
  isInactive?: boolean;
}

interface StatusTone {
  backgroundColor: string;
  border: string;
  color: string;
  dot: string;
  label: string;
}

export const DUES_STATUS_TONES: Record<DuesMemberStatus, StatusTone> = {
  paid: {
    backgroundColor: "color-mix(in srgb, var(--color-accent) 12%, transparent)",
    border: "1px solid color-mix(in srgb, var(--color-accent) 25%, transparent)",
    color: "var(--color-accent-strong)",
    dot: "var(--color-accent)",
    label: "Paid",
  },
  pending: {
    backgroundColor: "var(--color-amber-soft, var(--color-warning-soft))",
    border: "1px solid var(--color-amber-line, var(--color-warning-line))",
    color: "var(--color-amber-strong, var(--color-warning))",
    dot: "var(--color-amber, var(--color-warning))",
    label: "Pending review",
  },
  rejected: {
    backgroundColor: "var(--color-danger-soft)",
    border: "1px solid var(--color-danger-line)",
    color: "var(--color-danger-strong)",
    dot: "var(--color-danger)",
    label: "Rejected",
  },
  unpaid: {
    backgroundColor: "color-mix(in srgb, var(--color-ink) 8%, transparent)",
    border: "1px solid color-mix(in srgb, var(--color-ink) 18%, transparent)",
    color: "var(--color-ink)",
    dot: "var(--color-ink)",
    label: "Unpaid",
  },
};

export function DuesMemberStatusPill({
  status,
  size = "md",
  isInactive = false,
}: DuesMemberStatusPillProps) {
  const tone = DUES_STATUS_TONES[status] || DUES_STATUS_TONES.unpaid;
  const padding = size === "sm" ? "2px 8px" : "3.5px 10px";
  const fontSize = size === "sm" ? 11.5 : 12.5;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
      }}
    >
      <span
        role="status"
        aria-label={`Status: ${tone.label}`}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding,
          borderRadius: 9999,
          backgroundColor: tone.backgroundColor,
          border: tone.border,
          color: tone.color,
          fontSize,
          fontWeight: 600,
          lineHeight: 1.2,
          whiteSpace: "nowrap",
          userSelect: "none",
        }}
      >
        <span
          aria-hidden="true"
          style={{
            width: size === "sm" ? 5.5 : 6.5,
            height: size === "sm" ? 5.5 : 6.5,
            borderRadius: "50%",
            backgroundColor: tone.dot,
            flexShrink: 0,
          }}
        />
        <span>{tone.label}</span>
      </span>

      {isInactive && (
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "var(--color-muted)",
            backgroundColor: "color-mix(in srgb, var(--color-ink) 6%, transparent)",
            padding: "2px 6px",
            borderRadius: 4,
          }}
          title="Inactive member"
        >
          Inactive
        </span>
      )}
    </span>
  );
}
