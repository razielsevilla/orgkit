"use client";

import React from "react";
import { CheckCircle2, Clock } from "lucide-react";

interface DuesReminderSuccessSummaryProps {
  sentCount: number;
  skippedCount: number;
}

export function DuesReminderSuccessSummary({
  sentCount,
  skippedCount,
}: DuesReminderSuccessSummaryProps) {
  const memberPlural = sentCount === 1 ? "email" : "emails";

  return (
    <div
      data-testid="dues-reminder-success-summary"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "32px 20px",
        borderRadius: 16,
        backgroundColor: "color-mix(in srgb, var(--color-brand-tint) 70%, var(--color-surface))",
        border: "1px solid color-mix(in srgb, var(--color-accent) 26%, transparent)",
        gap: 14,
      }}
    >
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 56,
          height: 56,
          borderRadius: "50%",
          backgroundColor: "var(--color-surface)",
          border: "2px solid var(--color-accent)",
          color: "var(--color-accent)",
          boxShadow: "0 4px 14px rgba(28, 75, 56, 0.12)",
        }}
      >
        <CheckCircle2 size={32} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <h3
          style={{
            margin: 0,
            fontSize: 18,
            fontWeight: 700,
            color: "var(--color-brand-deep)",
            letterSpacing: "-0.01em",
          }}
        >
          Payment reminders sent!
        </h3>
        <p style={{ margin: 0, fontSize: 13.5, color: "var(--color-muted-strong)" }}>
          Successfully sent <strong>{sentCount}</strong> {memberPlural} to active unpaid members.
        </p>
      </div>

      {skippedCount > 0 && (
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 12px",
            borderRadius: 9999,
            backgroundColor: "var(--color-surface)",
            border: "1px solid var(--color-line)",
            fontSize: 12,
            color: "var(--color-muted-strong)",
            marginTop: 4,
          }}
        >
          <Clock size={13} style={{ color: "var(--color-muted)" }} />
          <span>{skippedCount} members were skipped (reminded within last 24h)</span>
        </div>
      )}
    </div>
  );
}
