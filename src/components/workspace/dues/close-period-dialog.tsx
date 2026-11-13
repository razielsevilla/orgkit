"use client";

import React, { useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { Dialog, DialogHeader, DialogBody, DialogFooter, DialogButton } from "@/src/components/ui/dialog";
import type { DuesPeriod } from "@/src/app/(workspace)/dues-actions";

interface ClosePeriodDialogProps {
  period: DuesPeriod | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmClose: (periodId: string) => Promise<{ success: boolean; errorMessage?: string }>;
}

export function ClosePeriodDialog({
  period,
  isOpen,
  onClose,
  onConfirmClose,
}: ClosePeriodDialogProps) {
  if (!isOpen || !period) return null;

  return (
    <ClosePeriodDialogContent
      period={period}
      onClose={onClose}
      onConfirmClose={onConfirmClose}
    />
  );
}

function ClosePeriodDialogContent({
  period,
  onClose,
  onConfirmClose,
}: {
  period: DuesPeriod;
  onClose: () => void;
  onConfirmClose: (periodId: string) => Promise<{ success: boolean; errorMessage?: string }>;
}) {
  const [isClosing, setIsClosing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const titleId = "close-period-dialog-title";

  const handleClose = async () => {
    if (isClosing) return;
    setIsClosing(true);
    setErrorMessage(null);

    try {
      const res = await onConfirmClose(period.id);
      if (res.success) {
        onClose();
      } else {
        setErrorMessage(res.errorMessage || "Failed to close dues period.");
      }
    } catch {
      setErrorMessage("Failed to close dues period.");
    } finally {
      setIsClosing(false);
    }
  };

  return (
    <Dialog
      role="alertdialog"
      labelledBy={titleId}
      onDismiss={isClosing ? undefined : onClose}
      maxWidth={440}
    >
      <DialogHeader
        titleId={titleId}
        title="Close period"
        description="Stop accepting new dues submissions"
        onClose={isClosing ? undefined : onClose}
        closeLabel="Cancel"
        closeDisabled={isClosing}
      />

      <DialogBody>
        {errorMessage && (
          <div
            role="alert"
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 8,
              padding: "10px 14px",
              backgroundColor: "color-mix(in srgb, var(--color-danger) 10%, transparent)",
              border: "1px solid color-mix(in srgb, var(--color-danger) 25%, transparent)",
              borderRadius: 10,
              color: "var(--color-danger-strong)",
              fontSize: 13,
              marginBottom: 16,
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{errorMessage}</span>
          </div>
        )}

        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
            padding: "14px 16px",
            backgroundColor: "color-mix(in srgb, var(--color-warning, #D97706) 10%, transparent)",
            border: "1px solid color-mix(in srgb, var(--color-warning, #D97706) 25%, transparent)",
            borderRadius: 12,
            color: "var(--color-ink)",
            fontSize: 13.5,
            lineHeight: 1.45,
          }}
        >
          <AlertCircle
            size={18}
            style={{
              flexShrink: 0,
              marginTop: 1,
              color: "var(--color-warning-strong, #92400E)",
            }}
          />
          <div>
            Are you sure you want to close <strong>{period.name}</strong>?
            <p style={{ margin: "6px 0 0", color: "var(--color-muted)" }}>
              Closing this period will stop accepting new payment submissions. The period and its totals will remain visible in your dues list.
            </p>
          </div>
        </div>
      </DialogBody>

      <DialogFooter>
        <DialogButton onClick={onClose} disabled={isClosing}>
          Cancel
        </DialogButton>
        <DialogButton variant="danger" onClick={handleClose} disabled={isClosing}>
          {isClosing ? (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Loader2 size={16} className="animate-spin" />
              Closing...
            </span>
          ) : (
            "Close period"
          )}
        </DialogButton>
      </DialogFooter>
    </Dialog>
  );
}
