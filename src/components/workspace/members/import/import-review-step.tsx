"use client";

import React from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { INVITE_VALID_DAYS, reasonLabel } from "@/src/lib/members/csv-import";
import type { ImportSummary } from "@/src/app/(workspace)/member-invites-actions";
import { StepHeading } from "./step-heading";
import { bodyText, buttonRow, errorBox, noteBox, primaryButton, secondaryButton, wrapText } from "./import-styles";

const SHOWN_PROBLEMS = 50;

interface ImportReviewStepProps {
  preview: ImportSummary;
  isImporting: boolean;
  error: string | null;
  onBack: () => void;
  onCancel: () => void;
  onImport: () => void;
}

const plural = (n: number, one: string, many: string) => `${n.toLocaleString("en-US")} ${n === 1 ? one : many}`;

export function ImportReviewStep({ preview, isImporting, error, onBack, onCancel, onImport }: ImportReviewStepProps) {
  const nothingToInvite = preview.invited === 0;
  const shown = preview.invalidRows.slice(0, SHOWN_PROBLEMS);
  const hidden = preview.invalidRows.length - shown.length;

  return (
    <div>
      <StepHeading>Review</StepHeading>
      <p style={bodyText}>These people will be invited. They are not members until they agree through your join link.</p>

      {error && (
        <div role="alert" style={errorBox}>
          <AlertCircle size={18} color="#DC2626" style={{ flexShrink: 0, marginTop: 1 }} aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {/* The counts are plain text, so a screen reader reads them as sentences */}
      <ul
        aria-label="Import preview"
        style={{ listStyle: "none", margin: "0 0 14px 0", padding: 0, display: "grid", gap: 8 }}
      >
        <li style={{ ...noteBox, margin: 0, fontWeight: 700, fontSize: 15 }}>
          {plural(preview.invited, "person", "people")} will be invited
        </li>
        <li style={{ ...noteBox, margin: 0 }}>
          {plural(preview.duplicates, "row", "rows")} skipped as {preview.duplicates === 1 ? "a duplicate" : "duplicates"}
          <span style={{ display: "block", fontSize: 12.5, color: "var(--color-muted)" }}>
            Already a member, already invited, or listed twice in the file.
          </span>
        </li>
        <li style={{ ...noteBox, margin: 0 }}>{plural(preview.invalid, "row", "rows")} skipped as invalid</li>
      </ul>

      {preview.invalidRows.length > 0 && (
        <div style={{ margin: "0 0 14px 0" }}>
          <h3 style={{ fontSize: 13.5, fontWeight: 700, color: "var(--color-ink)", margin: "0 0 6px 0" }}>
            Rows that will be skipped
          </h3>
          <ul
            style={{
              listStyle: "none",
              margin: 0,
              padding: 0,
              display: "grid",
              gap: 6,
              maxHeight: 200,
              overflowY: "auto",
              fontSize: 13,
            }}
          >
            {shown.map((p) => (
              <li
                key={p.row}
                style={{ ...wrapText, padding: "8px 10px", borderRadius: 10, border: "1px solid var(--color-line)" }}
              >
                <strong>Row {p.row}</strong>
                {p.email ? <span style={{ color: "var(--color-muted)" }}>: {p.email}</span> : null}
                <span style={{ display: "block", color: "#991B1B" }}>{reasonLabel(p.reason)}</span>
              </li>
            ))}
          </ul>
          {hidden > 0 && (
            <p style={{ fontSize: 12.5, color: "var(--color-muted)", margin: "6px 0 0 0" }}>
              and {hidden.toLocaleString("en-US")} more.
            </p>
          )}
        </div>
      )}

      <div style={noteBox}>
        <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 4 }}>
          <li>Invitations last {INVITE_VALID_DAYS} days. After that the stored name and email are deleted.</li>
          <li>Nobody becomes a member until they agree through the join link.</li>
          <li>No emails are sent. You share the join link yourself.</li>
        </ul>
      </div>

      {nothingToInvite && (
        <p role="status" style={{ ...bodyText, margin: "0 0 4px 0" }}>
          There is no one new to invite in this file, so there is nothing to import.
        </p>
      )}

      <div style={buttonRow}>
        <button type="button" onClick={onBack} disabled={isImporting} style={secondaryButton}>
          Back
        </button>
        <button type="button" onClick={onCancel} disabled={isImporting} style={secondaryButton}>
          Cancel
        </button>
        <button
          type="button"
          onClick={onImport}
          disabled={isImporting || nothingToInvite}
          aria-busy={isImporting}
          className="orgkit-btn-accent"
          style={{
            ...primaryButton,
            opacity: isImporting || nothingToInvite ? 0.6 : 1,
            cursor: isImporting || nothingToInvite ? "not-allowed" : "pointer",
          }}
        >
          {isImporting ? (
            <>
              <Loader2 size={16} aria-hidden="true" style={{ animation: "spin 1s linear infinite" }} />
              <span>Importing…</span>
            </>
          ) : (
            `Import ${plural(preview.invited, "person", "people")}`
          )}
        </button>
      </div>
    </div>
  );
}
