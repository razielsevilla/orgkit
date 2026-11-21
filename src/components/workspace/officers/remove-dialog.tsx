"use client";

import React, { useState } from "react";
import { AlertCircle } from "lucide-react";
import { removeWorkspaceOfficer } from "@/src/app/(workspace)/officers-actions";
import { Dialog, DialogBody, DialogButton, DialogFooter, DialogHeader } from "@/src/components/ui/dialog";
import { ErrorToast } from "@/src/components/error-toast";

interface RemoveDialogProps {
  orgId: string;
  officerId: string | null;
  officerName: string;
  isOpen: boolean;
  onClose: () => void;
  onRemoved: () => void;
}

export function RemoveDialog({
  orgId,
  officerId,
  officerName,
  isOpen,
  onClose,
  onRemoved,
}: RemoveDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !officerId) return null;

  async function handleConfirm() {
    if (!officerId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await removeWorkspaceOfficer(orgId, officerId);
      if (res.success) {
        onRemoved();
        onClose();
      } else {
        setError(res.errorMessage || "Failed to remove officer.");
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Dialog
        labelledBy="remove-modal-title"
        onDismiss={loading ? undefined : onClose}
        maxWidth={440}
      >
        <DialogHeader
          titleId="remove-modal-title"
          title="Remove officer"
          onClose={onClose}
          closeDisabled={loading}
          closeLabel="Close"
        />
        <DialogBody>
          <p style={{ fontSize: 14, color: "var(--color-muted-strong)", margin: "0 0 16px 0", lineHeight: 1.5 }}>
            Are you sure you want to remove <strong style={{ color: "var(--color-ink)" }}>{officerName}</strong>?
          </p>
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 8,
              padding: "12px 14px",
              borderRadius: 10,
              backgroundColor: "var(--color-danger-soft)",
              border: "1px solid var(--color-danger-line)",
              color: "var(--color-danger-strong)",
              fontSize: 13,
              lineHeight: 1.45,
            }}
          >
            <AlertCircle size={16} aria-hidden="true" style={{ flexShrink: 0, marginTop: 1 }} />
            <span>They will lose access to this organization immediately. Everything they created will be kept.</span>
          </div>
        </DialogBody>
        <DialogFooter>
          <DialogButton onClick={onClose} disabled={loading}>
            Cancel
          </DialogButton>
          <DialogButton variant="danger" onClick={handleConfirm} disabled={loading}>
            {loading ? "Removing…" : "Remove officer"}
          </DialogButton>
        </DialogFooter>
      </Dialog>

      {/* Floating Error Toast */}
      <ErrorToast message={error} onDismiss={() => setError(null)} />
    </>
  );
}
