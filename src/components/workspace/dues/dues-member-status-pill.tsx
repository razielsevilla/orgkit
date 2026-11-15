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
    backgroundColor: "color-mix(in srgb, #10b981 12%, transparent)",
    border: "1px solid color-mix(in srgb, #10b981 30%, transparent)",
    color: "#047857",
    dot: "#10b981",
    label: "Paid",
  },
  pending: {
    backgroundColor: "color-mix(in srgb, #f59e0b 14%, transparent)",
    border: "1px solid color-mix(in srgb, #f59e0b 32%, transparent)",
    color: "#b45309",
    dot: "#f59e0b",
    label: "Pending review",
  },
  rejected: {
    backgroundColor: "color-mix(in srgb, #ef4444 12%, transparent)",
    border: "1px solid color-mix(in srgb, #ef4444 28%, transparent)",
    color: "#b91c1c",
    dot: "#ef4444",
    label: "Rejected",
  },
  unpaid: {
    backgroundColor: "color-mix(in srgb, var(--color-ink) 7%, transparent)",
    border: "1px solid color-mix(in srgb, var(--color-line) 85%, transparent)",
    color: "var(--color-muted-strong, #64748b)",
    dot: "var(--color-muted, #94a3b8)",
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
