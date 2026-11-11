"use client";

import React from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { INVITE_VALID_DAYS, reasonLabel } from "@/src/lib/members/csv-import";
import type { ImportSummary } from "@/src/app/(workspace)/member-invites-actions";
import { DialogButton } from "@/src/components/ui/dialog";
import { ImportStepLayout } from "./import-step-layout";
import { bodyText, errorBox, noteBox, spinnerStyle, tabular, wrapText } from "./import-styles";

const SHOWN_PROBLEMS = 50;

interface ImportReviewStepProps {
  /** The steps indicator, placed at the top of the body */
  indicator?: React.ReactNode;
  preview: ImportSummary;
  isImporting: boolean;
  error: string | null;
  onBack: () => void;
  onCancel: () => void;
  onImport: () => void;
}

const plural = (n: number, one: string, many: string) => `${n.toLocaleString("en-US")} ${n === 1 ? one : many}`;

/** Renders the step's body and footer, to sit directly inside the Dialog after its header */
export function ImportReviewStep({
  indicator,
  preview,
  isImporting,
  error,
  onBack,
  onCancel,
  onImport,
}: ImportReviewStepProps) {
  const nothingToInvite = preview.invited === 0;
  const shown = preview.invalidRows.slice(0, SHOWN_PROBLEMS);
  const hidden = preview.invalidRows.length - shown.length;

  const footer = (
    <>
      <DialogButton onClick={onBack} disabled={isImporting}>
        Back
      </DialogButton>
      <DialogButton onClick={onCancel} disabled={isImporting}>
        Cancel
      </DialogButton>
      <DialogButton
        variant="primary"
        onClick={onImport}
        disabled={isImporting || nothingToInvite}
        aria-busy={isImporting}
      >
        {isImporting ? (
          <>
            <Loader2 size={16} aria-hidden="true" style={spinnerStyle} />
            <span>Importing…</span>
          </>
        ) : (
          `Import ${plural(preview.invited, "person", "people")}`
        )}
      </DialogButton>
    </>
  );

  return (
    <ImportStepLayout indicator={indicator} footer={footer}>
      <p style={bodyText}>These people will be invited. They are not members until they agree through your join link.</p>

      {error && (
        <div role="alert" style={errorBox}>
          <AlertCircle
            size={16}
            color="var(--color-danger)"
            style={{ flexShrink: 0, marginTop: 2 }}
            aria-hidden="true"
          />
          <span>{error}</span>
        </div>
      )}

      {/* The counts are plain text, so a screen reader reads them as sentences */}
      <ul
        aria-label="Import preview"
        style={{ listStyle: "none", margin: "0 0 16px 0", padding: 0, display: "grid", gap: 8, ...tabular }}
      >
        <li style={{ ...noteBox, margin: 0, fontWeight: 700, fontSize: 16 }}>
          {plural(preview.invited, "person", "people")} will be invited
        </li>
        <li style={{ ...noteBox, margin: 0 }}>
          {plural(preview.duplicates, "row", "rows")} skipped as {preview.duplicates === 1 ? "a duplicate" : "duplicates"}
          <span style={{ display: "block", fontSize: 13, color: "var(--color-muted)" }}>
            Already a member, already invited, or listed twice in the file.
          </span>
        </li>
        <li style={{ ...noteBox, margin: 0 }}>{plural(preview.invalid, "row", "rows")} skipped as invalid</li>
      </ul>

      {preview.invalidRows.length > 0 && (
        <div style={{ margin: "0 0 16px 0" }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--color-ink)", margin: "0 0 8px 0" }}>
            Rows that will be skipped
          </h3>
          <ul
            style={{
              listStyle: "none",
              margin: 0,
              padding: 0,
              display: "grid",
              gap: 8,
              maxHeight: 200,
              overflowY: "auto",
              fontSize: 13,
            }}
          >
            {shown.map((p) => (
              <li
                key={p.row}
                style={{ ...wrapText, padding: "8px 12px", borderRadius: 10, border: "1px solid var(--color-line)" }}
              >
                <strong>Row {p.row}</strong>
                {p.email ? <span style={{ color: "var(--color-muted)" }}>: {p.email}</span> : null}
                <span style={{ display: "block", color: "var(--color-danger-strong)" }}>{reasonLabel(p.reason)}</span>
              </li>
            ))}
          </ul>
          {hidden > 0 && (
            <p style={{ fontSize: 13, color: "var(--color-muted)", margin: "8px 0 0 0" }}>
              and {hidden.toLocaleString("en-US")} more.
            </p>
          )}
        </div>
      )}

      <div style={{ ...noteBox, margin: nothingToInvite ? "0 0 12px 0" : 0 }}>
        <ul style={{ margin: 0, paddingLeft: 16, display: "grid", gap: 4 }}>
          <li>Invitations last {INVITE_VALID_DAYS} days. After that the stored name and email are deleted.</li>
          <li>Nobody becomes a member until they agree through the join link.</li>
          <li>No emails are sent. You share the join link yourself.</li>
        </ul>
      </div>

      {nothingToInvite && (
        <p role="status" style={{ ...bodyText, margin: 0 }}>
          There is no one new to invite in this file, so there is nothing to import.
        </p>
      )}
    </ImportStepLayout>
  );
}
