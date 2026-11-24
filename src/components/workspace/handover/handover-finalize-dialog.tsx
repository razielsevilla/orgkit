"use client";

import React, { useTransition } from "react";
import { AlertCircle, CheckCircle2, Lock, RotateCcw } from "lucide-react";
import { Dialog, DialogHeader, DialogBody, DialogFooter } from "@/src/components/ui/dialog";

interface HandoverFinalizeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  roleTitle: string;
}

export function HandoverFinalizeDialog({
  isOpen,
  onClose,
  onConfirm,
  roleTitle,
}: HandoverFinalizeDialogProps) {
  const [isPending, startTransition] = useTransition();

  if (!isOpen) return null;

  const handleConfirm = () => {
    startTransition(async () => {
      await onConfirm();
      onClose();
    });
  };

  return (
    <Dialog onDismiss={onClose} maxWidth={460}>
      <DialogHeader
        title="Mark Handover Guide as Ready"
        description={`Lock and publish your transition notes for ${roleTitle}.`}
        onClose={onClose}
      />

      <DialogBody style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
            padding: "12px 16px",
            borderRadius: 14,
            backgroundColor: "#ecfdf5",
            border: "1px solid #a7f3d0",
            color: "#065f46",
            fontSize: 13,
            lineHeight: 1.45,
          }}
        >
          <CheckCircle2 size={18} style={{ flexShrink: 0, marginTop: 2 }} />
          <span>
            Once marked as ready, incoming officers will be able to read this guide and open all attached documents.
          </span>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
            padding: "12px 16px",
            borderRadius: 14,
            backgroundColor: "var(--color-base)",
            border: "1px solid var(--color-line)",
            color: "var(--color-ink)",
            fontSize: 13,
            lineHeight: 1.45,
          }}
        >
          <Lock size={18} style={{ flexShrink: 0, marginTop: 2, color: "var(--color-muted)" }} />
          <span>
            Editing will be locked to prevent accidental changes. Only an organization admin can reopen it later if edits are needed.
          </span>
        </div>
      </DialogBody>

      <DialogFooter>
        <button
          type="button"
          disabled={isPending}
          onClick={onClose}
          style={{
            padding: "9px 16px",
            borderRadius: 9999,
            border: "1px solid var(--color-line)",
            backgroundColor: "var(--color-surface)",
            color: "var(--color-ink)",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Cancel
        </button>

        <button
          type="button"
          disabled={isPending}
          onClick={handleConfirm}
          style={{
            padding: "9px 20px",
            borderRadius: 9999,
            border: "none",
            backgroundColor: "var(--color-accent)",
            color: "#ffffff",
            fontSize: 13,
            fontWeight: 600,
            cursor: isPending ? "not-allowed" : "pointer",
            transition: "background-color 0.15s ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--color-accent-strong)")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "var(--color-accent)")}
        >
          {isPending ? "Finalizing..." : "Confirm & mark ready"}
        </button>
      </DialogFooter>
    </Dialog>
  );
}

interface HandoverReopenDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  roleTitle: string;
}

export function HandoverReopenDialog({
  isOpen,
  onClose,
  onConfirm,
  roleTitle,
}: HandoverReopenDialogProps) {
  const [isPending, startTransition] = useTransition();

  if (!isOpen) return null;

  const handleConfirm = () => {
    startTransition(async () => {
      await onConfirm();
      onClose();
    });
  };

  return (
    <Dialog onDismiss={onClose} maxWidth={460}>
      <DialogHeader
        title="Reopen Handover Guide"
        description={`Allow new edits to the ${roleTitle} transition guide.`}
        onClose={onClose}
      />

      <DialogBody style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <p style={{ fontSize: 13.5, color: "var(--color-ink)", lineHeight: 1.5, margin: 0 }}>
          As an organization admin, you can reopen this guide back to draft status so the author or leadership team can update section notes and attached documents.
        </p>
      </DialogBody>

      <DialogFooter>
        <button
          type="button"
          disabled={isPending}
          onClick={onClose}
          style={{
            padding: "9px 16px",
            borderRadius: 9999,
            border: "1px solid var(--color-line)",
            backgroundColor: "var(--color-surface)",
            color: "var(--color-ink)",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Cancel
        </button>

        <button
          type="button"
          disabled={isPending}
          onClick={handleConfirm}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "9px 20px",
            borderRadius: 9999,
            border: "none",
            backgroundColor: "var(--color-accent)",
            color: "#ffffff",
            fontSize: 13,
            fontWeight: 600,
            cursor: isPending ? "not-allowed" : "pointer",
          }}
        >
          <RotateCcw size={14} />
          <span>{isPending ? "Reopening..." : "Reopen for editing"}</span>
        </button>
      </DialogFooter>
    </Dialog>
  );
}
