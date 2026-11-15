"use client";

import React, { useState } from "react";
import { AlertCircle, RefreshCw, MailX } from "lucide-react";
import type { SendReminderFailure } from "@/src/lib/dues/dues-reminders-types";

interface DuesReminderFailureListProps {
  failures: SendReminderFailure[];
  onRetry: (memberIds: string[]) => void;
  isRetrying?: boolean;
}

export function DuesReminderFailureList({
  failures,
  onRetry,
  isRetrying = false,
}: DuesReminderFailureListProps) {
  if (!failures || failures.length === 0) return null;

  const handleRetryAll = () => {
    const ids = failures.map((f) => f.member_id);
    onRetry(ids);
  };

  return (
    <div
      data-testid="dues-reminder-failure-list"
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        borderRadius: 14,
        padding: "16px",
        backgroundColor: "color-mix(in srgb, var(--color-danger, #ef4444) 6%, var(--color-surface))",
        border: "1px solid color-mix(in srgb, var(--color-danger, #ef4444) 22%, transparent)",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <AlertCircle
          size={18}
          style={{ color: "var(--color-danger, #ef4444)", flexShrink: 0, marginTop: 1 }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--color-ink)" }}>
            {failures.length} {failures.length === 1 ? "email" : "emails"} could not be delivered
          </div>
          <div style={{ fontSize: 12, color: "var(--color-muted-strong)", marginTop: 2 }}>
            The following members did not receive their reminder. You can retry sending to only these members without resending to successful recipients.
          </div>
        </div>
      </div>

      {/* Failure List Items */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          maxHeight: 180,
          overflowY: "auto",
          paddingRight: 4,
        }}
      >
        {failures.map((f) => (
          <div
            key={f.member_id}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 8,
              padding: "10px 12px",
              borderRadius: 10,
              backgroundColor: "var(--color-surface)",
              border: "1px solid var(--color-line)",
              fontSize: 12.5,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: "1 1 180px" }}>
              <span style={{ fontWeight: 600, color: "var(--color-ink)", overflowWrap: "anywhere", wordBreak: "break-word" }}>
                {f.full_name}
              </span>
              <span style={{ color: "var(--color-muted)", fontSize: 11.5, overflowWrap: "anywhere", wordBreak: "break-word" }}>
                {f.email}
              </span>
            </div>

            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "4px 8px",
                borderRadius: 9999,
                fontSize: 11,
                fontWeight: 600,
                backgroundColor: "color-mix(in srgb, var(--color-danger, #ef4444) 12%, transparent)",
                color: "var(--color-danger, #ef4444)",
                flexShrink: 0,
                maxWidth: "100%",
                overflowWrap: "anywhere",
              }}
            >
              <MailX size={12} style={{ flexShrink: 0 }} />
              <span style={{ overflowWrap: "anywhere" }}>{f.error_message}</span>
            </span>
          </div>
        ))}
      </div>

      {/* Retry Action Toolbar */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          paddingTop: 4,
        }}
      >
        <button
          type="button"
          onClick={handleRetryAll}
          disabled={isRetrying}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 16px",
            borderRadius: 9999,
            backgroundColor: "var(--color-surface)",
            border: "1px solid var(--color-line-strong)",
            fontSize: 12.5,
            fontWeight: 600,
            color: "var(--color-ink)",
            cursor: isRetrying ? "not-allowed" : "pointer",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          }}
        >
          <RefreshCw
            size={13}
            className={isRetrying ? "animate-spin" : undefined}
            style={{ color: "var(--color-accent)" }}
          />
          <span>{isRetrying ? "Retrying..." : `Retry failed (${failures.length})`}</span>
        </button>
      </div>
    </div>
  );
}
