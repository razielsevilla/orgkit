"use client";

import React, { useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { removeWorkspaceOfficer } from "@/src/app/(workspace)/officers-actions";
import { Dialog } from "@/src/components/ui/dialog";

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
    <Dialog
      labelledBy="remove-modal-title"
      onDismiss={loading ? undefined : onClose}
      maxWidth={440}
    >
      <button
        type="button"
        onClick={onClose}
        disabled={loading}
        aria-label="Close"
        style={{
          position: "absolute",
          top: 18,
          right: 18,
          width: 32,
          height: 32,
          borderRadius: 8,
          border: "none",
          backgroundColor: "transparent",
          color: "var(--color-muted)",
          cursor: loading ? "not-allowed" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <X size={18} />
      </button>

      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: "50%",
            backgroundColor: "color-mix(in srgb, var(--color-danger) 10%, transparent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 14px auto",
          }}
        >
          <AlertTriangle size={26} color="var(--color-danger)" />
        </div>

        <h2
          id="remove-modal-title"
          style={{
            fontSize: 18.5,
            fontWeight: 700,
            color: "var(--color-ink)",
            margin: "0 0 6px 0",
            letterSpacing: "-0.015em",
          }}
        >
          Remove officer
        </h2>

        <p style={{ fontSize: 13, color: "var(--color-muted-strong)", margin: 0, lineHeight: 1.45 }}>
          Are you sure you want to remove <strong>{officerName}</strong>? They will lose access to this organization immediately. Everything they created will be kept.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          style={{
            padding: "10px 14px",
            borderRadius: 12,
            backgroundColor: "var(--color-danger-soft)",
            border: "1px solid var(--color-danger-line)",
            color: "var(--color-danger)",
            fontSize: 12.5,
            lineHeight: 1.4,
            marginBottom: 18,
            textAlign: "center",
          }}
        >
          {error}
        </div>
      )}

      <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          style={{
            flex: 1,
            padding: "10px 18px",
            borderRadius: 9999,
            border: "1px solid var(--color-line)",
            backgroundColor: "var(--color-surface)",
            color: "var(--color-muted-strong)",
            fontSize: 13.5,
            fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={loading}
          style={{
            flex: 1,
            padding: "10px 18px",
            borderRadius: 9999,
            border: "none",
            backgroundColor: "var(--color-danger)",
            color: "var(--color-on-accent)",
            fontSize: 13.5,
            fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer",
            boxShadow: "0 2px 8px color-mix(in srgb, var(--color-danger) 25%, transparent)",
            opacity: loading ? 0.75 : 1,
            transition: "all 0.15s ease",
          }}
          onMouseEnter={(e) => {
            if (!loading) e.currentTarget.style.backgroundColor = "var(--color-danger-strong)";
          }}
          onMouseLeave={(e) => {
            if (!loading) e.currentTarget.style.backgroundColor = "var(--color-danger)";
          }}
        >
          {loading ? "Removing…" : "Remove officer"}
        </button>
      </div>
    </Dialog>
  );
}

