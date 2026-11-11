"use client";

import React, { useRef } from "react";
import { AlertCircle, FileUp, Loader2 } from "lucide-react";
import { MAX_CSV_BYTES, MAX_IMPORT_ROWS, CSV_ERROR_MESSAGES } from "@/src/lib/members/csv-import";
import { DialogButton } from "@/src/components/ui/dialog";
import { ImportStepLayout } from "./import-step-layout";
import { bodyText, errorBox, noteBox, spinnerStyle } from "./import-styles";

interface ImportUploadStepProps {
  /** The steps indicator, placed at the top of the body */
  indicator?: React.ReactNode;
  isReading: boolean;
  error: string | null;
  onFile: (file: File) => void;
  onCancel: () => void;
}

/** Renders the step's body and footer, to sit directly inside the Dialog after its header */
export function ImportUploadStep({ indicator, isReading, error, onFile, onCancel }: ImportUploadStepProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Allow choosing the same file again after an error
    event.target.value = "";
    if (file) onFile(file);
  };

  return (
    <ImportStepLayout indicator={indicator} footer={<DialogButton onClick={onCancel}>Cancel</DialogButton>}>
      <>
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
            <AlertCircle
              size={16}
              color="var(--color-danger)"
              style={{ flexShrink: 0, marginTop: 2 }}
              aria-hidden="true"
            />
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
              gap: 8,
              padding: "16px 4px",
              color: "var(--color-muted)",
              fontSize: 14,
            }}
          >
            <Loader2 size={16} aria-hidden="true" style={spinnerStyle} />
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
            <div style={{ display: "flex", justifyContent: "center", padding: "8px 0 4px" }}>
              <DialogButton
                variant="primary"
                data-autofocus
                onClick={() => inputRef.current?.click()}
                style={{ width: "100%", maxWidth: 320 }}
              >
                <FileUp size={16} aria-hidden="true" />
                <span>Choose CSV file</span>
              </DialogButton>
            </div>
          </>
        )}
      </>
    </ImportStepLayout>
  );
}

/** Quick check in the browser so an obviously too-large file isn't uploaded. The server checks again. */
export function clientFileProblem(file: File): string | null {
  return file.size > MAX_CSV_BYTES ? CSV_ERROR_MESSAGES.too_large : null;
}
