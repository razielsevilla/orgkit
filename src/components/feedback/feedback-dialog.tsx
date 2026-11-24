"use client";

import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Dialog, DialogBody, DialogButton, DialogFooter, DialogHeader } from "@/src/components/ui/dialog";
import { FieldError } from "@/src/components/ui/field-error";
import { submitFeedbackAction } from "@/src/app/(workspace)/feedback-actions";
import {
  FEEDBACK_MAX,
  FEEDBACK_MESSAGES,
  countCharacters,
  validateFeedback,
} from "@/src/lib/feedback/feedback-validation";

const TITLE_ID = "feedback-title";
const FIELD_ID = "feedback-message";
const FIELD_ERROR_ID = "feedback-message-error";
const NOTICE_ID = "feedback-notice";

const labelStyle = {
  display: "block",
  fontSize: 13,
  fontWeight: 600,
  color: "var(--color-ink)",
  marginBottom: 6,
} as const;

/** 16px text keeps phones from zooming in when the field is focused */
function fieldStyle(hasError: boolean) {
  return {
    display: "block",
    width: "100%",
    minHeight: 140,
    resize: "vertical",
    boxSizing: "border-box",
    padding: "10px 12px",
    borderRadius: 10,
    border: `1px solid ${hasError ? "var(--color-danger)" : "var(--color-line-strong, var(--color-line))"}`,
    backgroundColor: "var(--color-surface)",
    color: "var(--color-ink)",
    fontFamily: "inherit",
    fontSize: 16,
    lineHeight: 1.5,
    overflowWrap: "anywhere",
  } as const;
}

interface FeedbackFormViewProps {
  message: string;
  onMessageChange: (message: string) => void;
  isSending: boolean;
  /** Problem with the message itself (empty, too long) */
  fieldError: string | null;
  /** Problem with sending (throttled, server error): the message is kept */
  formError: string | null;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
}

/** The form: what the officer types, the limit, and what happens to it */
export function FeedbackFormView({
  message,
  onMessageChange,
  isSending,
  fieldError,
  formError,
  onSubmit,
  onClose,
}: FeedbackFormViewProps) {
  const count = countCharacters(message.trim());
  const overLimit = count > FEEDBACK_MAX;
  const hasError = Boolean(fieldError) || overLimit;

  return (
    // Not dismissed by a click outside, so a stray tap can't hide a half-written message
    <Dialog labelledBy={TITLE_ID} onDismiss={onClose} dismissOnBackdrop={false} maxWidth={460}>
      <form
        onSubmit={onSubmit}
        noValidate
        style={{ display: "flex", flexDirection: "column", flex: "1 1 auto", minHeight: 0 }}
      >
        <DialogHeader
          titleId={TITLE_ID}
          title="Tell us what's working or what's not"
          onClose={onClose}
          closeDisabled={isSending}
          closeLabel="Close feedback dialog"
        />
        <DialogBody>
          {formError && (
            <div
              role="alert"
              style={{
                padding: "8px 12px",
                borderRadius: 10,
                backgroundColor: "var(--color-danger-soft)",
                border: "1px solid var(--color-danger-line)",
                color: "var(--color-danger-strong)",
                fontSize: 13,
                fontWeight: 500,
                marginBottom: 16,
                overflowWrap: "anywhere",
              }}
            >
              {formError}
            </div>
          )}

          <label htmlFor={FIELD_ID} style={labelStyle}>
            Your message
          </label>
          <textarea
            id={FIELD_ID}
            data-autofocus
            value={message}
            onChange={(e) => onMessageChange(e.target.value)}
            disabled={isSending}
            aria-invalid={hasError}
            aria-describedby={`${fieldError ? `${FIELD_ERROR_ID} ` : ""}${NOTICE_ID}`}
            style={fieldStyle(hasError)}
          />
          {fieldError && <FieldError id={FIELD_ERROR_ID}>{fieldError}</FieldError>}
          <div
            style={{
              marginTop: 4,
              fontSize: 12,
              textAlign: "right",
              color: overLimit ? "var(--color-danger)" : "var(--color-muted)",
            }}
          >
            {count}/{FEEDBACK_MAX}
          </div>
          <p id={NOTICE_ID} style={{ margin: "8px 0 0", fontSize: 12.5, lineHeight: 1.5, color: "var(--color-muted)" }}>
            Sent to the OrgKit team with the page you&apos;re on and your name and email.
          </p>
        </DialogBody>
        <DialogFooter>
          <DialogButton onClick={onClose} disabled={isSending}>
            Cancel
          </DialogButton>
          <DialogButton type="submit" variant="primary" disabled={isSending}>
            {isSending && <Loader2 size={16} aria-hidden="true" style={{ animation: "spin 1s linear infinite" }} />}
            <span>{isSending ? "Sending..." : "Send feedback"}</span>
          </DialogButton>
        </DialogFooter>
      </form>
    </Dialog>
  );
}

/** The confirmation shown once a message is saved */
export function FeedbackSentView({ onClose }: { onClose: () => void }) {
  return (
    <Dialog labelledBy={TITLE_ID} onDismiss={onClose} maxWidth={440}>
      <DialogHeader titleId={TITLE_ID} title="Feedback sent" onClose={onClose} closeLabel="Close feedback dialog" />
      <DialogBody>
        <p
          role="status"
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
            margin: 0,
            fontSize: 15,
            lineHeight: 1.5,
            color: "var(--color-ink)",
          }}
        >
          <CheckCircle2 size={20} aria-hidden="true" style={{ color: "var(--color-accent)", flexShrink: 0, marginTop: 2 }} />
          <span>{FEEDBACK_MESSAGES.thanks}</span>
        </p>
      </DialogBody>
      <DialogFooter>
        <DialogButton variant="primary" onClick={onClose} data-autofocus>
          Close
        </DialogButton>
      </DialogFooter>
    </Dialog>
  );
}

interface FeedbackDialogProps {
  /** The page the officer is on. Only the path is saved, with ids removed. */
  pathname: string;
  /** The typed text lives in the button, so it survives closing the dialog by accident or a failed send */
  message: string;
  onMessageChange: (message: string) => void;
  /** The message was saved: the button clears the text */
  onSent: () => void;
  onClose: () => void;
}

/**
 * Send feedback to the OrgKit team. A failed or throttled send keeps the typed
 * message, so nothing the officer wrote is lost; only a saved message clears it.
 */
export function FeedbackDialog({ pathname, message, onMessageChange, onSent, onClose }: FeedbackDialogProps) {
  const [isSending, setIsSending] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSending) return;

    setFieldError(null);
    setFormError(null);

    const validation = validateFeedback(message);
    if (!validation.valid) {
      setFieldError(validation.error);
      return;
    }

    setIsSending(true);
    try {
      const res = await submitFeedbackAction({ message: validation.message, pathname });
      if (res.success) {
        onSent();
        setSent(true);
      } else if (res.error === "invalid_request") {
        setFieldError(res.errorMessage ?? FEEDBACK_MESSAGES.failed);
      } else {
        setFormError(res.errorMessage ?? FEEDBACK_MESSAGES.failed);
      }
    } catch {
      setFormError(FEEDBACK_MESSAGES.failed);
    } finally {
      setIsSending(false);
    }
  }

  if (sent) return <FeedbackSentView onClose={onClose} />;

  return (
    <FeedbackFormView
      message={message}
      onMessageChange={(next) => {
        onMessageChange(next);
        if (fieldError) setFieldError(null);
      }}
      isSending={isSending}
      fieldError={fieldError}
      formError={formError}
      onSubmit={handleSubmit}
      onClose={onClose}
    />
  );
}
