"use client";

import React from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import {
  CSV_ERROR_MESSAGES,
  buildInviteRows,
  columnLabel,
  exceedsRowLimit,
  type ParsedRoster,
} from "@/src/lib/members/csv-import";
import { StepHeading } from "./step-heading";
import {
  bodyText,
  buttonRow,
  errorBox,
  fieldLabel,
  noteBox,
  primaryButton,
  secondaryButton,
  selectField,
  wrapText,
} from "./import-styles";

interface ImportMatchStepProps {
  fileName: string;
  roster: ParsedRoster;
  hasHeader: boolean;
  emailColumn: number | null;
  nameColumn: number | null;
  isBusy: boolean;
  error: string | null;
  onHasHeaderChange: (value: boolean) => void;
  onEmailColumnChange: (value: number | null) => void;
  onNameColumnChange: (value: number | null) => void;
  onBack: () => void;
  onContinue: () => void;
}

export function ImportMatchStep({
  fileName,
  roster,
  hasHeader,
  emailColumn,
  nameColumn,
  isBusy,
  error,
  onHasHeaderChange,
  onEmailColumnChange,
  onNameColumnChange,
  onBack,
  onContinue,
}: ImportMatchStepProps) {
  const { records } = roster;
  const width = Math.max(...records.map((r) => r.cells.length));
  const dataRows = records.length - (hasHeader ? 1 : 0);
  const tooMany = exceedsRowLimit(records.length, hasHeader);

  const firstData = records[hasHeader ? 1 : 0];
  const optionLabel = (col: number) => {
    const heading = hasHeader ? records[0].cells[col]?.trim() : "";
    const label = heading || columnLabel(col);
    const sample = firstData?.cells[col]?.trim();
    return sample ? `${label} (for example: ${sample.slice(0, 40)})` : label;
  };

  const sampleRows = buildInviteRows(records, hasHeader, emailColumn ?? 0, nameColumn).slice(0, 3);
  const canContinue = emailColumn !== null && !tooMany && dataRows > 0 && !isBusy;

  return (
    <div>
      <StepHeading>Match columns</StepHeading>
      <p style={{ ...bodyText, ...wrapText }}>
        <strong style={{ color: "var(--color-ink)" }}>{fileName}</strong> has {dataRows.toLocaleString("en-US")}{" "}
        {dataRows === 1 ? "row" : "rows"}. Tell us which column is the email address. The name is optional.
      </p>

      {(error || tooMany) && (
        <div role="alert" style={errorBox}>
          <AlertCircle size={18} color="#DC2626" style={{ flexShrink: 0, marginTop: 1 }} aria-hidden="true" />
          <span>{tooMany ? CSV_ERROR_MESSAGES.too_many_rows : error}</span>
        </div>
      )}

      <label
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 10,
          fontSize: 13.5,
          color: "var(--color-ink)",
          marginBottom: 16,
          cursor: "pointer",
        }}
      >
        <input
          type="checkbox"
          checked={hasHeader}
          onChange={(e) => onHasHeaderChange(e.target.checked)}
          style={{ marginTop: 3, width: 16, height: 16, accentColor: "var(--color-accent)", flexShrink: 0 }}
        />
        <span>
          The first row is column headings, not a person
          <span style={{ display: "block", fontSize: 12.5, color: "var(--color-muted)" }}>
            {hasHeader
              ? "It looks like headings, so those are used as the column names."
              : "Untick this only if your first row is a real person."}
          </span>
        </span>
      </label>

      <div style={{ display: "grid", gap: 14, marginBottom: 16 }}>
        <div>
          <label htmlFor="orgkit-import-email-col" style={fieldLabel}>
            Email column (required)
          </label>
          <select
            id="orgkit-import-email-col"
            value={emailColumn === null ? "" : String(emailColumn)}
            onChange={(e) => onEmailColumnChange(e.target.value === "" ? null : Number(e.target.value))}
            style={selectField}
            aria-required="true"
          >
            <option value="">Choose a column…</option>
            {Array.from({ length: width }, (_, col) => (
              <option key={col} value={col}>
                {optionLabel(col)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="orgkit-import-name-col" style={fieldLabel}>
            Name column (optional)
          </label>
          <select
            id="orgkit-import-name-col"
            value={nameColumn === null ? "" : String(nameColumn)}
            onChange={(e) => onNameColumnChange(e.target.value === "" ? null : Number(e.target.value))}
            style={selectField}
          >
            <option value="">No name column</option>
            {Array.from({ length: width }, (_, col) => (
              <option key={col} value={col} disabled={col === emailColumn}>
                {optionLabel(col)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {emailColumn !== null && sampleRows.length > 0 && (
        <div style={noteBox}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>First rows as we read them</div>
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 4 }}>
            {sampleRows.map((r) => (
              <li key={r.row} style={{ ...wrapText, fontSize: 13 }}>
                <span style={{ color: "var(--color-muted)" }}>Row {r.row}: </span>
                {r.email || "(no email)"}
                {r.name ? ` · ${r.name}` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div style={buttonRow}>
        <button type="button" onClick={onBack} disabled={isBusy} style={secondaryButton}>
          Back
        </button>
        <button
          type="button"
          onClick={onContinue}
          disabled={!canContinue}
          className="orgkit-btn-accent"
          style={{ ...primaryButton, opacity: canContinue ? 1 : 0.6, cursor: canContinue ? "pointer" : "not-allowed" }}
        >
          {isBusy ? (
            <>
              <Loader2 size={16} aria-hidden="true" style={{ animation: "spin 1s linear infinite" }} />
              <span>Checking…</span>
            </>
          ) : (
            "Continue"
          )}
        </button>
      </div>
    </div>
  );
}
