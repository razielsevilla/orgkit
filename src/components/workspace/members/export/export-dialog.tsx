"use client";

import React from "react";
import { AlertCircle, Download, Loader2 } from "lucide-react";
import { Dialog, DialogHeader, DialogBody, DialogFooter, DialogButton } from "@/src/components/ui/dialog";
import {
  EXPORT_FIELDS,
  EXPORT_STATUSES,
  PERSONAL_DATA_NOTE,
  type ExportStatus,
} from "@/src/lib/members/member-export";
import { useMemberExport } from "./use-member-export";

const STATUS_LABELS: Record<ExportStatus, string> = {
  pending: "Pending",
  active: "Active",
  inactive: "Inactive",
};

interface ExportDialogProps {
  orgId: string;
  onClose: () => void;
}

const checkRow: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: 10,
  padding: "8px 0",
  fontSize: 14,
  color: "var(--color-ink)",
  cursor: "pointer",
};

const checkbox: React.CSSProperties = {
  width: 18,
  height: 18,
  marginTop: 2,
  flexShrink: 0,
  accentColor: "var(--color-accent-strong)",
  cursor: "pointer",
};

const legend: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 500,
  color: "var(--color-ink-soft)",
  padding: 0,
  marginBottom: 4,
};

const fieldset: React.CSSProperties = { border: 0, margin: 0, padding: 0, minWidth: 0 };

export function ExportDialog({ orgId, onClose }: ExportDialogProps) {
  const ex = useMemberExport(orgId, onClose);

  let countText: string;
  if (ex.noFields) countText = "Pick at least one field.";
  else if (ex.statuses.length === 0) countText = "Pick at least one status.";
  else if (ex.countFailed) countText = "We couldn't count your members.";
  else if (ex.count === null) countText = "Counting members…";
  else if (ex.count === 0) countText = "No members match those statuses.";
  else countText = `${ex.count} ${ex.count === 1 ? "member" : "members"} will be exported.`;

  const blockedMessage = ex.noFields
    ? "Pick at least one field."
    : ex.noMembers || ex.statuses.length === 0
      ? countText
      : null;

  return (
    <Dialog
      labelledBy="export-dialog-title"
      onDismiss={ex.isExporting ? undefined : onClose}
      maxWidth={460}
    >
      <DialogHeader
        titleId="export-dialog-title"
        title="Export members"
        onClose={onClose}
        closeDisabled={ex.isExporting}
        closeLabel="Close export dialog"
      />
      <DialogBody>

      <fieldset style={fieldset}>
        <legend style={legend}>Fields</legend>
        {EXPORT_FIELDS.map((field) => {
          const noteId = `export-note-${field.key}`;
          return (
            <label key={field.key} style={checkRow}>
              <input
                type="checkbox"
                style={checkbox}
                checked={ex.fields.includes(field.key)}
                onChange={() => ex.toggleField(field.key)}
                disabled={ex.isExporting}
                aria-describedby={field.personal ? noteId : undefined}
                data-autofocus={field.key === "full_name" ? "" : undefined}
              />
              <span>
                {field.label}
                {field.personal && (
                  <span
                    id={noteId}
                    style={{ display: "block", fontSize: 12.5, color: "var(--color-muted)" }}
                  >
                    {PERSONAL_DATA_NOTE}
                  </span>
                )}
              </span>
            </label>
          );
        })}
      </fieldset>

      <fieldset style={{ ...fieldset, marginTop: 16 }}>
        <legend style={legend}>Which members</legend>
        <div style={{ display: "flex", flexWrap: "wrap", columnGap: 20 }}>
          {EXPORT_STATUSES.map((status) => (
            <label key={status} style={checkRow}>
              <input
                type="checkbox"
                style={checkbox}
                checked={ex.statuses.includes(status)}
                onChange={() => ex.toggleStatus(status)}
                disabled={ex.isExporting}
              />
              <span>{STATUS_LABELS[status]}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <p
        id="export-count"
        role="status"
        aria-live="polite"
        style={{
          margin: "16px 0 0",
          fontSize: 14,
          fontWeight: 600,
          color: blockedMessage ? "var(--color-muted)" : "var(--color-ink)",
        }}
      >
        {countText}
      </p>

      {ex.error && (
        <div
          role="alert"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginTop: 12,
            padding: "8px 12px",
            backgroundColor: "var(--color-danger-soft)",
            border: "1px solid var(--color-danger-line)",
            borderRadius: 10,
            color: "var(--color-danger-strong)",
            fontSize: 13.5,
          }}
        >
          <AlertCircle size={16} aria-hidden="true" style={{ flexShrink: 0 }} />
          <span>{ex.error}</span>
        </div>
      )}

      </DialogBody>
      <DialogFooter>
        <DialogButton onClick={onClose} disabled={ex.isExporting}>
          Cancel
        </DialogButton>
        <DialogButton variant="primary" onClick={ex.download} disabled={!ex.canDownload} aria-describedby="export-count">
          {ex.isExporting ? (
            <Loader2 size={16} aria-hidden="true" style={{ animation: "spin 1s linear infinite" }} />
          ) : (
            <Download size={16} aria-hidden="true" />
          )}
          <span>{ex.isExporting ? "Preparing…" : ex.error ? "Try again" : "Download CSV"}</span>
        </DialogButton>
      </DialogFooter>
    </Dialog>
  );
}
