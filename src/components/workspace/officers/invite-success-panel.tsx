"use client";

import React, { useState } from "react";
import { Copy, Check } from "lucide-react";
import { OfficerRole } from "@/src/lib/orgs/permissions";
import { Dialog } from "@/src/components/ui/dialog";

interface SuccessPanelProps {
  inviteUrl: string;
  email: string;
  role: OfficerRole;
  onClose: () => void;
}

export function SuccessPanel({ inviteUrl, onClose }: SuccessPanelProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
      const input = document.getElementById("invite-link-input") as HTMLInputElement;
      if (input) {
        input.select();
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    }
  }

  return (
    <Dialog
      labelledBy="success-panel-title"
      maxWidth={480}
      padding="32px 28px"
      popSeconds={0.22}
    >
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            backgroundColor: "color-mix(in srgb, var(--color-accent) 10%, transparent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 14px auto",
          }}
        >
          <Check size={28} color="var(--color-accent)" strokeWidth={2.5} />
        </div>

        <h2
          id="success-panel-title"
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: "var(--color-ink)",
            margin: "0 0 6px 0",
            letterSpacing: "-0.015em",
          }}
        >
          Invite link created
        </h2>

        <p style={{ fontSize: 13.5, color: "var(--color-muted-strong)", margin: 0, lineHeight: 1.4 }}>
          Invite created. Copy the link and send it to them. It works once, for 7 days.
        </p>
      </div>

      {/* Copy Link Input Bar */}
      <div style={{ marginBottom: 16 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 8px 6px 14px",
            borderRadius: 14,
            border: "1px solid var(--color-line)",
            backgroundColor: "var(--color-base)",
          }}
        >
          <input
            id="invite-link-input"
            type="text"
            readOnly
            value={inviteUrl}
            onFocus={(e) => e.currentTarget.select()}
            style={{
              flex: 1,
              border: "none",
              backgroundColor: "transparent",
              fontSize: 13,
              color: "var(--color-ink)",
              outline: "none",
              fontFamily: "monospace",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          />

          <button
            type="button"
            onClick={handleCopy}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 14px",
              borderRadius: 10,
              border: "none",
              backgroundColor: copied ? "var(--color-accent)" : "var(--color-ink)",
              color: "var(--color-on-accent)",
              fontSize: 12.5,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.15s ease",
              flexShrink: 0,
            }}
          >
            {copied ? (
              <>
                <Check size={14} />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy size={14} />
                <span>Copy link</span>
              </>
            )}
          </button>
        </div>
      </div>

      <p
        style={{
          fontSize: 11.5,
          color: "var(--color-muted)",
          textAlign: "center",
          margin: "0 0 24px 0",
          lineHeight: 1.35,
        }}
      >
        For security, the full link is shown once. If lost, you can revoke it and create a new link at any time.
      </p>

      <div style={{ textAlign: "center" }}>
        <button
          type="button"
          onClick={onClose}
          style={{
            width: "100%",
            padding: "11px 20px",
            borderRadius: 9999,
            border: "1px solid var(--color-line)",
            backgroundColor: "var(--color-surface)",
            color: "var(--color-ink)",
            fontSize: 13.5,
            fontWeight: 600,
            cursor: "pointer",
            transition: "background-color 0.15s ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--color-base)")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "var(--color-surface)")}
        >
          Done
        </button>
      </div>
    </Dialog>
  );
}

