"use client";

import React from "react";
import { AlertCircle, Download, Loader2 } from "lucide-react";
import { Dialog } from "@/src/components/ui/dialog";
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
  fontSize: 14.5,
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
  fontWeight: 700,
  letterSpacing: "0.02em",
  textTransform: "uppercase",
  color: "var(--color-muted)",
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
      cardStyle={{ maxHeight: "calc(100dvh - 32px)", overflowY: "auto" }}
    >
      <h2
        id="export-dialog-title"
        style={{ margin: "0 0 16px", fontSize: 22, fontWeight: 700, color: "var(--color-ink)" }}
      >
        Export members
      </h2>

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
            padding: "10px 14px",
            backgroundColor: "#FEF2F2",
            border: "1px solid #FCA5A5",
            borderRadius: 12,
            color: "#991B1B",
            fontSize: 13.5,
          }}
        >
          <AlertCircle size={16} color="#DC2626" style={{ flexShrink: 0 }} />
          <span>{ex.error}</span>
        </div>
      )}

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "flex-end",
          gap: 10,
          marginTop: 20,
        }}
      >
        <button
          type="button"
          onClick={onClose}
          disabled={ex.isExporting}
          style={{
            padding: "10px 20px",
            borderRadius: 999,
            border: "1px solid var(--color-line)",
            backgroundColor: "var(--color-surface)",
            color: "var(--color-ink)",
            fontWeight: 600,
            fontSize: 14,
            cursor: ex.isExporting ? "not-allowed" : "pointer",
          }}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={ex.download}
          disabled={!ex.canDownload}
          aria-describedby="export-count"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            padding: "10px 22px",
            borderRadius: 999,
            border: "1px solid transparent",
            backgroundColor: "var(--color-ink)",
            color: "#FFFFFF",
            fontWeight: 600,
            fontSize: 14,
            cursor: ex.canDownload ? "pointer" : "not-allowed",
            opacity: ex.canDownload ? 1 : 0.5,
          }}
        >
          {ex.isExporting ? (
            <Loader2 size={16} aria-hidden="true" style={{ animation: "spin 1s linear infinite" }} />
          ) : (
            <Download size={16} aria-hidden="true" />
          )}
          <span>{ex.isExporting ? "Preparing…" : ex.error ? "Try again" : "Download CSV"}</span>
        </button>
      </div>
    </Dialog>
  );
}
