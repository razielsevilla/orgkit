"use client";

import React from "react";
import { Users, Clock, CheckCircle } from "lucide-react";

interface DuesReminderStatsBadgeProps {
  eligibleCount: number;
  skipped24hCount: number;
  totalUnpaidCount: number;
}

export function DuesReminderStatsBadge({
  eligibleCount,
  skipped24hCount,
}: DuesReminderStatsBadgeProps) {
  const memberPlural = eligibleCount === 1 ? "member" : "members";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Primary Recipient Count Hero Banner */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "12px 16px",
          borderRadius: 14,
          backgroundColor:
            eligibleCount > 0
              ? "color-mix(in srgb, var(--color-brand-tint) 70%, var(--color-surface))"
              : "color-mix(in srgb, var(--color-surface) 92%, black 8%)",
          border:
            eligibleCount > 0
              ? "1px solid color-mix(in srgb, var(--color-accent) 24%, transparent)"
              : "1px solid var(--color-line)",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 36,
            height: 36,
            borderRadius: 10,
            backgroundColor:
              eligibleCount > 0
                ? "var(--color-surface)"
                : "color-mix(in srgb, var(--color-surface) 80%, black 20%)",
            border: "1px solid color-mix(in srgb, var(--color-accent) 18%, transparent)",
            color: eligibleCount > 0 ? "var(--color-accent)" : "var(--color-muted)",
            flexShrink: 0,
          }}
        >
          {eligibleCount > 0 ? <Users size={18} /> : <CheckCircle size={18} />}
        </div>
        <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
          <span
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: eligibleCount > 0 ? "var(--color-brand-deep)" : "var(--color-ink)",
              lineHeight: 1.25,
            }}
          >
            {eligibleCount > 0
              ? `${eligibleCount} ${memberPlural} will be emailed`
              : "No reminder emails to send"}
          </span>
          <span style={{ fontSize: 12, color: "var(--color-muted-strong)" }}>
            {eligibleCount > 0
              ? `Unpaid active members ready for payment reminder`
              : `Everyone has paid or is pending review`}
          </span>
        </div>
      </div>

      {/* 24-Hour Cooldown Skip Notice */}
      {skipped24hCount > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 8,
            padding: "8px 12px",
            borderRadius: 10,
            backgroundColor: "var(--color-amber-soft, #fef3c7)",
            border: "1px solid var(--color-amber-line, #fde68a)",
            fontSize: 12,
            color: "var(--color-amber-strong, #b45309)",
          }}
        >
          <Clock size={14} style={{ flexShrink: 0, marginTop: 2, color: "var(--color-amber, #d97706)" }} />
          <span style={{ overflowWrap: "anywhere" }}>
            <strong>{skipped24hCount}</strong> {skipped24hCount === 1 ? "member was" : "members were"} reminded in the last 24 hours and will be skipped.
          </span>
        </div>
      )}
    </div>
  );
}
