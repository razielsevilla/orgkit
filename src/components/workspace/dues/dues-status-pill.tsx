import React from "react";
import type { DuesPeriodStatus } from "@/src/app/(workspace)/dues-actions";

interface DuesStatusPillProps {
  status: DuesPeriodStatus;
  size?: "sm" | "md";
}

interface StatusTone {
  backgroundColor: string;
  border: string;
  color: string;
  dot: string;
}

export function DuesStatusPill({ status, size = "md" }: DuesStatusPillProps) {
  const isOpen = status === "open";
  const label = isOpen ? "Open" : "Closed";

  const padding = size === "sm" ? "2px 8px" : "4px 10px";
  const fontSize = size === "sm" ? 11.5 : 12.5;

  const tone: StatusTone = isOpen
    ? {
        backgroundColor: "color-mix(in srgb, var(--color-accent) 12%, transparent)",
        border: "1px solid color-mix(in srgb, var(--color-accent) 25%, transparent)",
        color: "var(--color-accent-strong)",
        dot: "var(--color-accent)",
      }
    : {
        backgroundColor: "color-mix(in srgb, var(--color-ink) 6%, transparent)",
        border: "1px solid color-mix(in srgb, var(--color-line) 80%, transparent)",
        color: "var(--color-muted-strong)",
        dot: "var(--color-muted)",
      };

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
        backgroundColor: tone.backgroundColor,
        border: tone.border,
        color: tone.color,
        fontSize,
        fontWeight: 600,
        letterSpacing: "0.01em",
        lineHeight: 1,
        whiteSpace: "nowrap",
        userSelect: "none",
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
