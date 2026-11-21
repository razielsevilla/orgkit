"use client";

import React from "react";
import { Loader2 } from "lucide-react";

interface DuesReminderProgressBarProps {
  current?: number;
  total?: number;
  label?: string;
}

export function DuesReminderProgressBar({
  current,
  total,
  label = "Sending payment reminders...",
}: DuesReminderProgressBarProps) {
  const isIndeterminate = current === undefined || total === undefined || total === 0;
  const percent = isIndeterminate ? 100 : Math.min(100, Math.round((current / total) * 100));

  return (
    <div
      data-testid="dues-reminder-progress"
      role="status"
      aria-live="polite"
      aria-atomic="true"
      aria-busy="true"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        padding: "20px 16px",
        borderRadius: 14,
        backgroundColor: "color-mix(in srgb, var(--color-brand-tint) 50%, var(--color-surface))",
        border: "1px solid color-mix(in srgb, var(--color-accent) 24%, transparent)",
      }}
    >
      {/* Label and Count */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          fontSize: 13,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--color-brand-deep)", fontWeight: 600 }}>
          <Loader2 size={16} className="animate-spin" style={{ color: "var(--color-accent)", flexShrink: 0 }} />
          <span>{label}</span>
        </div>
        {!isIndeterminate && (
          <span style={{ fontSize: 12, color: "var(--color-muted-strong)", fontWeight: 500 }}>
            {current} of {total} ({percent}%)
          </span>
        )}
      </div>

      {/* Progress Track */}
      <div
        role="progressbar"
        aria-valuenow={isIndeterminate ? undefined : percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
        style={{
          width: "100%",
          height: 8,
          borderRadius: 9999,
          backgroundColor: "color-mix(in srgb, var(--color-line) 80%, transparent)",
          overflow: "hidden",
          position: "relative",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${percent}%`,
            borderRadius: 9999,
            backgroundColor: "var(--color-accent)",
            transition: "width 0.3s ease-in-out",
          }}
        />
      </div>

      <div style={{ fontSize: 11.5, color: "var(--color-muted)", textAlign: "center" }}>
        Please keep this window open while reminders are being dispatched.
      </div>
    </div>
  );
}
