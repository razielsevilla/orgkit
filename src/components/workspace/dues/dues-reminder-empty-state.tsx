"use client";

import React from "react";
import { CheckCircle2 } from "lucide-react";

interface DuesReminderEmptyStateProps {
  title?: string;
  description?: string;
}

export function DuesReminderEmptyState({
  title = "Everyone has paid or is pending review",
  description = "There are currently no active unpaid members who need a payment reminder.",
}: DuesReminderEmptyStateProps) {
  return (
    <div
      data-testid="dues-reminder-empty-state"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "36px 20px",
        borderRadius: 16,
        backgroundColor: "color-mix(in srgb, var(--color-surface) 90%, black 10%)",
        border: "1px dashed var(--color-line-strong)",
        gap: 12,
      }}
    >
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 48,
          height: 48,
          borderRadius: "50%",
          backgroundColor: "color-mix(in srgb, var(--color-accent) 14%, transparent)",
          color: "var(--color-accent)",
        }}
      >
        <CheckCircle2 size={26} strokeWidth={2.2} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 4, maxWidth: 360 }}>
        <h4
          style={{
            margin: 0,
            fontSize: 16,
            fontWeight: 700,
            color: "var(--color-ink)",
            lineHeight: 1.3,
          }}
        >
          {title}
        </h4>
        <p
          style={{
            margin: 0,
            fontSize: 13,
            color: "var(--color-muted)",
            lineHeight: 1.5,
          }}
        >
          {description}
        </p>
      </div>
    </div>
  );
}
