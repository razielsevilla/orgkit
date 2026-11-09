"use client";

import React, { useState } from "react";
import { AlertTriangle, Check, Copy } from "lucide-react";
import { joinLinkPath, joinPanelPath } from "@/src/lib/routes";
import type { ImportDone } from "@/src/app/(workspace)/member-invites-actions";
import { StepHeading } from "./step-heading";
import { bodyText, buttonRow, noteBox, primaryButton, secondaryButton, wrapText } from "./import-styles";

interface ImportDoneStepProps {
  orgId: string;
  result: ImportDone;
  onDone: () => void;
}

export function ImportDoneStep({ orgId, result, onDone }: ImportDoneStepProps) {
  const [copied, setCopied] = useState(false);

  const joinUrl = result.joinLinkToken
    ? `${typeof window !== "undefined" ? window.location.origin : ""}${joinLinkPath(result.joinLinkToken)}`
    : "";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked: the link is shown above, so it can be copied by hand
    }
  };

  const n = (value: number) => value.toLocaleString("en-US");

  return (
    <div>
      <StepHeading>Import finished</StepHeading>
      <p
        role="status"
        style={{ ...bodyText, color: "var(--color-ink)", fontWeight: 700, fontSize: 16, margin: "0 0 4px 0" }}
      >
        {n(result.invited)} invited, {n(result.duplicates)} already here, {n(result.invalid)} skipped
      </p>
      <p style={{ ...bodyText, fontSize: 13, margin: "0 0 16px 0" }}>
        {n(result.duplicates)} skipped as duplicates, {n(result.invalid)} skipped as invalid.
      </p>

      <div style={noteBox}>
        <strong>No emails were sent.</strong> These people have not been contacted. Share the join link with them
        yourself, for example in your group chat. They become members only after they open it and agree.
      </div>

      {result.joinLinkStatus === "on" && (
        <div style={{ margin: "0 0 12px 0" }}>
          <label
            htmlFor="orgkit-import-join-link"
            style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--color-ink)", marginBottom: 6 }}
          >
            Join link
          </label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <input
              id="orgkit-import-join-link"
              readOnly
              value={joinUrl}
              onFocus={(e) => e.currentTarget.select()}
              style={{
                flex: "1 1 200px",
                minWidth: 0,
                minHeight: 42,
                padding: "9px 12px",
                borderRadius: 12,
                border: "1px solid var(--color-line)",
                backgroundColor: "var(--color-surface)",
                color: "var(--color-ink)",
                fontSize: 13,
                boxSizing: "border-box",
              }}
            />
            <button type="button" onClick={copy} style={secondaryButton}>
              {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
              <span>{copied ? "Copied" : "Copy link"}</span>
            </button>
          </div>
          <span role="status" className="sr-only">
            {copied ? "Join link copied" : ""}
          </span>
        </div>
      )}

      {result.joinLinkStatus === "off" && (
        <div
          role="alert"
          style={{
            ...noteBox,
            display: "flex",
            gap: 10,
            alignItems: "flex-start",
            borderColor: "#FCD34D",
            backgroundColor: "#FFFBEB",
          }}
        >
          <AlertTriangle size={18} color="#B45309" aria-hidden="true" style={{ flexShrink: 0, marginTop: 1 }} />
          <span style={wrapText}>
            The join link is off, so invitees cannot join until the link is turned on.{" "}
            <a href={joinPanelPath(orgId)} style={{ color: "var(--color-accent-strong)", fontWeight: 600 }}>
              Open join link settings
            </a>
          </span>
        </div>
      )}

      {result.joinLinkStatus === "unknown" && (
        <div style={noteBox}>
          We couldn&apos;t check the join link.{" "}
          <a href={joinPanelPath(orgId)} style={{ color: "var(--color-accent-strong)", fontWeight: 600 }}>
            Open join link settings
          </a>{" "}
          to copy it or turn it on.
        </div>
      )}

      <div style={buttonRow}>
        <button type="button" onClick={onDone} data-autofocus className="orgkit-btn-accent" style={primaryButton}>
          View invited people
        </button>
      </div>
    </div>
  );
}
