import React from "react";
import type { MemberStatus } from "@/src/app/(workspace)/members-actions";

interface MemberStatusBadgeProps {
  status: MemberStatus;
  size?: "sm" | "md";
}

/**
 * Status badge conforming to docs/design.md:
 * - Pending: Emerald accent tint with soft border and pulse dot (signals required officer action).
 * - Active: Clean zinc neutral badge.
 * - Inactive: Muted subtle badge.
 */
export function MemberStatusBadge({ status, size = "md" }: MemberStatusBadgeProps) {
  const isPending = status === "pending";
  const isActive = status === "active";

  const padding = size === "sm" ? "2px 8px" : "4px 10px";
  const fontSize = size === "sm" ? 11.5 : 12.5;

  let bg = "var(--color-surface)";
  let border = "1px solid var(--color-line)";
  let textColor = "var(--color-muted)";
  let label = "Inactive";
  let dotColor = "var(--color-muted)";

  if (isPending) {
    bg = "color-mix(in srgb, var(--color-accent) 8%, transparent)";
    border = "1px solid color-mix(in srgb, var(--color-accent) 28%, transparent)";
    textColor = "var(--color-accent-strong)";
    label = "Pending";
    dotColor = "var(--color-accent)";
  } else if (isActive) {
    bg = "color-mix(in srgb, var(--color-base) 80%, transparent)";
    border = "1px solid var(--color-line)";
    textColor = "var(--color-ink)";
    label = "Active";
    dotColor = "#10B981";
  }

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
        backgroundColor: bg,
        border,
        color: textColor,
        fontSize,
        fontWeight: 600,
        letterSpacing: "0.01em",
        lineHeight: 1,
        whiteSpace: "nowrap",
        userSelect: "none",
        transition: "all 0.15s ease",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          backgroundColor: dotColor,
          display: "inline-block",
        }}
      />
      {label}
    </span>
  );
}

