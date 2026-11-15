"use client";

import React, { useState } from "react";
import { AlertCircle, RotateCcw, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogButton,
} from "@/src/components/ui/dialog";
import { validateReviewReason } from "@/src/lib/dues/dues-review-validation";

interface DuesUndoDialogProps {
  paymentId: string | null;
  memberName: string;
  referenceNo: string;
  isOpen: boolean;
  onClose: () => void;
  onConfirmUndo: (
    paymentId: string,
    reason: string
  ) => Promise<{ success: boolean; errorMessage?: string }>;
}

export function DuesUndoDialog({
  paymentId,
  memberName,
  referenceNo,
  isOpen,
  onClose,
  onConfirmUndo,
}: DuesUndoDialogProps) {
  if (!isOpen || !paymentId) return null;

  return (
    <DuesUndoDialogContent
      paymentId={paymentId}
      memberName={memberName}
      referenceNo={referenceNo}
      onClose={onClose}
      onConfirmUndo={onConfirmUndo}
    />
  );
}

function DuesUndoDialogContent({
  paymentId,
  memberName,
  referenceNo,
  onClose,
  onConfirmUndo,
}: {
  paymentId: string;
  memberName: string;
  referenceNo: string;
  onClose: () => void;
  onConfirmUndo: (
    paymentId: string,
    reason: string
  ) => Promise<{ success: boolean; errorMessage?: string }>;
}) {
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const titleId = "undo-verification-dialog-title";

  const handleUndo = async () => {
    const validation = validateReviewReason(reason);
    if (!validation.isValid || !validation.cleaned) {
      setErrorMessage(validation.error ?? "A reason is required to undo verification.");
      return;
    }

    if (isSubmitting) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await onConfirmUndo(paymentId, validation.cleaned);
      if (res.success) {
        onClose();
      } else {
        setErrorMessage(res.errorMessage || "Failed to undo verification.");
      }
    } catch {
      setErrorMessage("Failed to undo verification.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog labelledBy={titleId} onDismiss={isSubmitting ? undefined : onClose} maxWidth={460}>
      <DialogHeader
        title="Undo payment verification"
        titleId={titleId}
        onClose={isSubmitting ? undefined : onClose}
        icon={<RotateCcw size={20} style={{ color: "#d97706" }} />}
        iconBg="color-mix(in srgb, #f59e0b 12%, transparent)"
      />

      <DialogBody>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <p
            style={{
              margin: 0,
              fontSize: "0.875rem",
              color: "var(--color-ink-muted)",
              lineHeight: 1.5,
            }}
          >
            Reversing verification for{" "}
            <strong style={{ color: "var(--color-ink)" }}>{memberName}</strong>
            &apos;s payment (ref: <code>{referenceNo}</code>) will return it to the review queue.
            An audit record will be logged.
          </p>

          <div>
            <label
              htmlFor="undo-reason-input"
              style={{
                display: "block",
                fontSize: "0.8125rem",
                fontWeight: 600,
                color: "var(--color-ink)",
                marginBottom: 6,
              }}
            >
              Reason for undo <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <textarea
              id="undo-reason-input"
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              disabled={isSubmitting}
              placeholder="e.g. Accidental click, matched wrong GCash reference..."
              rows={3}
              maxLength={500}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid var(--color-line)",
                backgroundColor: "var(--color-surface)",
                color: "var(--color-ink)",
                fontSize: "0.875rem",
                boxSizing: "border-box",
                resize: "vertical",
                fontFamily: "inherit",
              }}
            />
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                fontSize: "0.75rem",
                color: "var(--color-ink-muted)",
                marginTop: 4,
              }}
            >
              <span>{reason.length}/500</span>
            </div>
          </div>

          {errorMessage && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 14px",
                borderRadius: 8,
                backgroundColor: "color-mix(in srgb, #ef4444 10%, transparent)",
                color: "#b91c1c",
                fontSize: "0.8125rem",
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>
      </DialogBody>

      <DialogFooter>
        <DialogButton variant="secondary" onClick={onClose} disabled={isSubmitting}>
          Cancel
        </DialogButton>
        <DialogButton
          variant="danger"
          onClick={handleUndo}
          disabled={isSubmitting || !reason.trim()}
        >
          {isSubmitting ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>Undoing...</span>
            </>
          ) : (
            "Undo verification"
          )}
        </DialogButton>
      </DialogFooter>
    </Dialog>
  );
}
