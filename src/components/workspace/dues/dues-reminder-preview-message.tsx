"use client";

import React from "react";
import { Mail, Info } from "lucide-react";

interface DuesReminderPreviewMessageProps {
  subject: string;
  text: string;
  sampleRecipientName?: string;
  sampleRecipientEmail?: string;
}

export function DuesReminderPreviewMessage({
  subject,
  text,
  sampleRecipientName = "Maria Clara",
  sampleRecipientEmail = "maria@example.com",
}: DuesReminderPreviewMessageProps) {
  return (
    <div
      style={{
        borderRadius: 16,
        border: "1px solid var(--color-line)",
        backgroundColor: "var(--color-surface)",
        overflow: "hidden",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.03)",
      }}
    >
      {/* Email Header Simulation */}
      <div
        style={{
          padding: "12px 16px",
          backgroundColor: "color-mix(in srgb, var(--color-brand-tint) 50%, var(--color-surface))",
          borderBottom: "1px solid var(--color-line)",
          display: "flex",
          flexDirection: "column",
          gap: 6,
          fontSize: 12.5,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            flexWrap: "wrap",
            gap: "4px 6px",
            color: "var(--color-muted-strong)",
          }}
        >
          <Mail size={13} style={{ color: "var(--color-accent)", flexShrink: 0, alignSelf: "center" }} />
          <span>To:</span>
          <span style={{ fontWeight: 600, color: "var(--color-ink)", overflowWrap: "anywhere", wordBreak: "break-word" }}>
            {sampleRecipientName}
          </span>
          <span style={{ color: "var(--color-muted)", overflowWrap: "anywhere", wordBreak: "break-word" }}>
            &lt;{sampleRecipientEmail}&gt;
          </span>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            flexWrap: "wrap",
            gap: "4px 6px",
            color: "var(--color-muted-strong)",
          }}
        >
          <span style={{ width: 13, flexShrink: 0 }} />
          <span>Subject:</span>
          <span style={{ fontWeight: 600, color: "var(--color-brand-deep)", overflowWrap: "anywhere", wordBreak: "break-word" }}>
            {subject}
          </span>
        </div>
      </div>

      {/* Email Body */}
      <div
        style={{
          padding: "16px",
          fontSize: 13,
          lineHeight: 1.6,
          color: "var(--color-ink)",
          whiteSpace: "pre-wrap",
          overflowWrap: "anywhere",
          wordBreak: "break-word",
          maxHeight: 220,
          overflowY: "auto",
          fontFamily: "var(--font-sans, inherit)",
          backgroundColor: "var(--color-surface)",
        }}
      >
        {text}
      </div>

      {/* Note footer */}
      <div
        style={{
          padding: "8px 16px",
          backgroundColor: "color-mix(in srgb, var(--color-surface) 90%, black 10%)",
          borderTop: "1px solid var(--color-line)",
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontSize: 11.5,
          color: "var(--color-muted)",
        }}
      >
        <Info size={12} style={{ flexShrink: 0 }} />
        <span>Each member receives their own personalized payment link and dues amount.</span>
      </div>
    </div>
  );
}
