"use client";

import React, { useRef } from "react";
import { AlertCircle, FileUp, Loader2 } from "lucide-react";
import { MAX_CSV_BYTES, MAX_IMPORT_ROWS, CSV_ERROR_MESSAGES } from "@/src/lib/members/csv-import";
import { StepHeading } from "./step-heading";
import { bodyText, buttonRow, errorBox, noteBox, primaryButton, secondaryButton } from "./import-styles";

interface ImportUploadStepProps {
  isReading: boolean;
  error: string | null;
  onFile: (file: File) => void;
  onCancel: () => void;
}

export function ImportUploadStep({ isReading, error, onFile, onCancel }: ImportUploadStepProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Allow choosing the same file again after an error
    event.target.value = "";
    if (file) onFile(file);
  };

  return (
    <div>
      <StepHeading>Upload your member list</StepHeading>
      <p style={bodyText}>
        Choose a CSV file with one person per row. It needs an email column and can have a name column. Up to{" "}
        {MAX_IMPORT_ROWS.toLocaleString("en-US")} rows and 1 MB.
      </p>

      <div style={noteBox}>
        Nobody is added as a member. Each person is invited, and becomes a member only after they open your join link
        and agree themselves.
      </div>

      {error && (
        <div role="alert" style={errorBox}>
          <AlertCircle size={18} color="#DC2626" style={{ flexShrink: 0, marginTop: 1 }} aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {isReading ? (
        <div
          role="status"
          aria-live="polite"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "18px 4px",
            color: "var(--color-muted)",
            fontSize: 14,
          }}
        >
          <Loader2 size={18} aria-hidden="true" style={{ animation: "spin 1s linear infinite" }} />
          <span>Reading your file…</span>
        </div>
      ) : (
        <>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv,text/plain"
            onChange={handleChange}
            className="sr-only"
            aria-label="CSV file"
            tabIndex={-1}
          />
          <div style={{ display: "flex", justifyContent: "center", padding: "6px 0 2px" }}>
            <button
              type="button"
              data-autofocus
              onClick={() => inputRef.current?.click()}
              className="orgkit-btn-accent"
              style={{ ...primaryButton, width: "100%", maxWidth: 320 }}
            >
              <FileUp size={16} aria-hidden="true" />
              <span>Choose CSV file</span>
            </button>
          </div>
        </>
      )}

      <div style={buttonRow}>
        <button type="button" onClick={onCancel} style={secondaryButton}>
          Cancel
        </button>
      </div>
    </div>
  );
}

/** Quick check in the browser so an obviously too-large file isn't uploaded. The server checks again. */
export function clientFileProblem(file: File): string | null {
  return file.size > MAX_CSV_BYTES ? CSV_ERROR_MESSAGES.too_large : null;
}
