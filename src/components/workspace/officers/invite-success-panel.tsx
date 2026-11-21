"use client";

import React, { useState } from "react";
import { Copy, Check } from "lucide-react";
import { OfficerRole } from "@/src/lib/orgs/permissions";
import { Dialog, DialogBody, DialogButton, DialogFooter, DialogHeader } from "@/src/components/ui/dialog";

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
    <Dialog labelledBy="success-panel-title" maxWidth={480}>
      <DialogHeader
        titleId="success-panel-title"
        title="Invite link created"
        description="Copy the link and send it to them. It works once, for 7 days."
      />
      <DialogBody>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            id="invite-link-input"
            type="text"
            readOnly
            aria-label="Invite link"
            value={inviteUrl}
            onFocus={(e) => e.currentTarget.select()}
            style={{
              flex: 1,
              minWidth: 0,
              height: 40,
              padding: "0 12px",
              borderRadius: 10,
              border: "1px solid var(--color-line-strong)",
              backgroundColor: "var(--color-base)",
              fontSize: 13,
              color: "var(--color-ink)",
              outline: "none",
              fontFamily: "monospace",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              boxSizing: "border-box",
            }}
          />
          <DialogButton onClick={handleCopy} style={{ flexShrink: 0, gap: 6 }}>
            {copied ? (
              <>
                <Check size={14} aria-hidden="true" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy size={14} aria-hidden="true" />
                <span>Copy link</span>
              </>
            )}
          </DialogButton>
        </div>

        <p style={{ fontSize: 12, color: "var(--color-muted)", margin: "12px 0 0", lineHeight: 1.45 }}>
          For security, the full link is shown once. If lost, you can revoke it and create a new link at any time.
        </p>
      </DialogBody>
      <DialogFooter>
        <DialogButton variant="primary" onClick={onClose}>
          Done
        </DialogButton>
      </DialogFooter>
    </Dialog>
  );
}
