"use client";

import React, { useRef, useState } from "react";
import { Dialog } from "@/src/components/ui/dialog";
import {
  buildInviteRows,
  guessEmailColumn,
  guessNameColumn,
  type InviteRow,
  type ParsedRoster,
} from "@/src/lib/members/csv-import";
import {
  importMemberInvites,
  parseRosterCsv,
  previewMemberInvites,
  type ImportDone,
  type ImportSummary,
} from "@/src/app/(workspace)/member-invites-actions";
import { ImportStepsIndicator, type ImportStep } from "./import-steps-indicator";
import { ImportUploadStep, clientFileProblem } from "./import-upload-step";
import { ImportMatchStep } from "./import-match-step";
import { ImportReviewStep } from "./import-review-step";
import { ImportDoneStep } from "./import-done-step";
import { IMPORT_TITLE_ID } from "./step-heading";

interface ImportDialogProps {
  orgId: string;
  /** Leave without importing (nothing was saved) */
  onClose: () => void;
  /** Leave after an import finished, so the Invited view can refresh */
  onFinished: () => void;
  /** The session ended: send the admin to sign-in */
  onSignedOut: () => void;
}

type Busy = "reading" | "previewing" | "importing" | null;

/**
 * Upload, Match columns, Review, Done. Nothing is saved until the admin presses
 * Import on the Review step; closing before that leaves nothing behind. The file
 * is read on the server, and the Review counts come from the same database
 * rules the import uses.
 */
export function ImportDialog({ orgId, onClose, onFinished, onSignedOut }: ImportDialogProps) {
  const [step, setStep] = useState<ImportStep>("upload");
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<string | null>(null);

  const [fileName, setFileName] = useState("");
  const [roster, setRoster] = useState<ParsedRoster | null>(null);
  const [hasHeader, setHasHeader] = useState(false);
  const [emailColumn, setEmailColumn] = useState<number | null>(null);
  const [nameColumn, setNameColumn] = useState<number | null>(null);

  const [rows, setRows] = useState<InviteRow[]>([]);
  const [preview, setPreview] = useState<ImportSummary | null>(null);
  const [done, setDone] = useState<ImportDone | null>(null);

  // A ref, not state: a second click in the same tick must not start a second import
  const importStarted = useRef(false);

  const goTo = (next: ImportStep) => {
    setError(null);
    setStep(next);
  };

  const handleFile = async (file: File) => {
    const problem = clientFileProblem(file);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setBusy("reading");
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await parseRosterCsv(orgId, formData);
      if (!res.success || !res.data) {
        if (res.error === "not_authenticated") return onSignedOut();
        setError(res.errorMessage ?? "We couldn't read that file. Please try again.");
        return;
      }
      setFileName(file.name);
      setRoster(res.data);
      setHasHeader(res.data.hasHeader);
      setEmailColumn(res.data.emailColumn);
      setNameColumn(res.data.nameColumn);
      goTo("match");
    } catch {
      setError("We couldn't read that file. Please try again.");
    } finally {
      setBusy(null);
    }
  };

  const handleHasHeaderChange = (value: boolean) => {
    if (!roster) return;
    setHasHeader(value);
    const email = guessEmailColumn(roster.records, value);
    setEmailColumn(email);
    setNameColumn(guessNameColumn(roster.records, value, email));
    setError(null);
  };

  const handleEmailColumnChange = (value: number | null) => {
    setEmailColumn(value);
    if (value !== null && value === nameColumn) setNameColumn(null);
  };

  const handleContinue = async () => {
    if (!roster || emailColumn === null) return;
    const built = buildInviteRows(roster.records, hasHeader, emailColumn, nameColumn);
    setError(null);
    setBusy("previewing");
    try {
      const res = await previewMemberInvites(orgId, built);
      if (!res.success || !res.data) {
        if (res.error === "not_authenticated") return onSignedOut();
        setError(res.errorMessage ?? "We couldn't build the preview. Please try again.");
        return;
      }
      setRows(built);
      setPreview(res.data);
      goTo("review");
    } catch {
      setError("We couldn't build the preview. Please try again.");
    } finally {
      setBusy(null);
    }
  };

  const handleImport = async () => {
    if (importStarted.current) return;
    importStarted.current = true;
    setError(null);
    setBusy("importing");
    try {
      const res = await importMemberInvites(orgId, rows);
      if (!res.success || !res.data) {
        if (res.error === "not_authenticated") return onSignedOut();
        // The import is all or nothing, so a failure means nothing was saved
        setError(res.errorMessage ?? "Nothing was saved. Please try again.");
        importStarted.current = false;
        return;
      }
      setDone(res.data);
      goTo("done");
    } catch {
      setError("Nothing was saved. Please check your connection and try again.");
      importStarted.current = false;
    } finally {
      setBusy(null);
    }
  };

  const handleDismiss = () => {
    if (busy === "importing") return;
    if (step === "done") onFinished();
    else onClose();
  };

  return (
    <Dialog
      labelledBy={IMPORT_TITLE_ID}
      onDismiss={busy === "importing" ? undefined : handleDismiss}
      dismissOnBackdrop={false}
      maxWidth={600}
      padding="22px clamp(16px, 4vw, 28px) 24px"
      cardStyle={{ maxHeight: "calc(100dvh - 32px)", overflowY: "auto" }}
    >
      <ImportStepsIndicator current={step} />

      {step === "upload" && (
        <ImportUploadStep isReading={busy === "reading"} error={error} onFile={handleFile} onCancel={onClose} />
      )}

      {step === "match" && roster && (
        <ImportMatchStep
          fileName={fileName}
          roster={roster}
          hasHeader={hasHeader}
          emailColumn={emailColumn}
          nameColumn={nameColumn}
          isBusy={busy === "previewing"}
          error={error}
          onHasHeaderChange={handleHasHeaderChange}
          onEmailColumnChange={handleEmailColumnChange}
          onNameColumnChange={setNameColumn}
          onBack={() => goTo("upload")}
          onContinue={handleContinue}
        />
      )}

      {step === "review" && preview && (
        <ImportReviewStep
          preview={preview}
          isImporting={busy === "importing"}
          error={error}
          onBack={() => goTo("match")}
          onCancel={onClose}
          onImport={handleImport}
        />
      )}

      {step === "done" && done && <ImportDoneStep orgId={orgId} result={done} onDone={onFinished} />}
    </Dialog>
  );
}
