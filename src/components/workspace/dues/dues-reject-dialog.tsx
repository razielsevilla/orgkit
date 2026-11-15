"use client";

import React, { useState } from "react";
import { AlertCircle, AlertTriangle, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogButton,
} from "@/src/components/ui/dialog";
import {
  REJECT_REASON_SHORTCUTS,
  type DuesReviewQueueItem,
} from "@/src/lib/dues/dues-review";
import { validateReviewReason } from "@/src/lib/dues/dues-review-validation";

interface DuesRejectDialogProps {
  item: DuesReviewQueueItem | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmReject: (
    paymentId: string,
    reason: string
  ) => Promise<{ success: boolean; errorMessage?: string }>;
}

export function DuesRejectDialog({
  item,
  isOpen,
  onClose,
  onConfirmReject,
}: DuesRejectDialogProps) {
  if (!isOpen || !item) return null;

  return (
    <DuesRejectDialogContent
      item={item}
      onClose={onClose}
      onConfirmReject={onConfirmReject}
    />
  );
}

function DuesRejectDialogContent({
  item,
  onClose,
  onConfirmReject,
}: {
  item: DuesReviewQueueItem;
  onClose: () => void;
  onConfirmReject: (
    paymentId: string,
    reason: string
  ) => Promise<{ success: boolean; errorMessage?: string }>;
}) {
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const titleId = "reject-payment-dialog-title";

  const handleShortcutClick = (shortcut: string) => {
    setReason(shortcut);
    setErrorMessage(null);
  };

  const handleReject = async () => {
    const validation = validateReviewReason(reason);
    if (!validation.isValid || !validation.cleaned) {
      setErrorMessage(validation.error ?? "A reason is required.");
      return;
    }

    if (isSubmitting) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await onConfirmReject(item.paymentId, validation.cleaned);
      if (res.success) {
        onClose();
      } else {
        setErrorMessage(res.errorMessage || "Failed to reject payment.");
      }
    } catch {
      setErrorMessage("Failed to reject payment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog labelledBy={titleId} onDismiss={isSubmitting ? undefined : onClose} maxWidth={480}>
      <DialogHeader
        title="Reject payment"
        titleId={titleId}
        onClose={isSubmitting ? undefined : onClose}
        icon={<AlertTriangle size={20} style={{ color: "#ef4444" }} />}
        iconBg="color-mix(in srgb, #ef4444 12%, transparent)"
      />

      <DialogBody>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <p
            style={{
              margin: 0,
              fontSize: "0.875rem",
              color: "var(--color-ink-muted)",
              lineHeight: 1.5,
            }}
          >
            Provide a clear reason for rejecting{" "}
            <strong style={{ color: "var(--color-ink)" }}>{item.memberName}</strong>
            &apos;s payment (ref: <code>{item.referenceNo}</code>). The member will be able to resubmit.
          </p>

          {/* Shortcut Chips */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.8125rem",
                fontWeight: 600,
                color: "var(--color-ink)",
                marginBottom: 8,
              }}
            >
              Suggested reasons:
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {REJECT_REASON_SHORTCUTS.map((shortcut) => {
                const isSelected = reason === shortcut;
                return (
                  <button
                    key={shortcut}
                    type="button"
                    onClick={() => handleShortcutClick(shortcut)}
                    disabled={isSubmitting}
                    style={{
                      padding: "6px 12px",
                      fontSize: "0.8125rem",
                      fontWeight: 500,
                      borderRadius: 16,
                      border: isSelected
                        ? "1px solid var(--color-ink)"
                        : "1px solid var(--color-line)",
                      backgroundColor: isSelected
                        ? "color-mix(in srgb, var(--color-ink) 8%, transparent)"
                        : "var(--color-surface)",
                      color: "var(--color-ink)",
                      cursor: isSubmitting ? "not-allowed" : "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {shortcut}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Reason Input */}
          <div>
            <label
              htmlFor="reject-reason-input"
              style={{
                display: "block",
                fontSize: "0.8125rem",
                fontWeight: 600,
                color: "var(--color-ink)",
                marginBottom: 6,
              }}
            >
              Reason <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <textarea
              id="reject-reason-input"
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              disabled={isSubmitting}
              placeholder="Explain what needs to be fixed..."
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

          {/* Error Message */}
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
          onClick={handleReject}
          disabled={isSubmitting || !reason.trim()}
        >
          {isSubmitting ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>Rejecting...</span>
            </>
          ) : (
            "Reject payment"
          )}
        </DialogButton>
      </DialogFooter>
    </Dialog>
  );
}
