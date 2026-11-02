"use client";

import React, { useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { removeWorkspaceOfficer } from "@/src/app/(workspace)/officers-actions";

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
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="remove-modal-title"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        backgroundColor: "rgba(24, 24, 27, 0.45)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        boxSizing: "border-box",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <div
        className="orgkit-card"
        style={{
          width: "100%",
          maxWidth: 440,
          backgroundColor: "#FFFFFF",
          borderRadius: 24,
          border: "1px solid #E4E4E7",
          boxShadow: "0 20px 50px rgba(24, 24, 27, 0.12)",
          padding: "28px 24px",
          boxSizing: "border-box",
          position: "relative",
          animation: "cardPopout 0.2s cubic-bezier(0.16, 1, 0.3, 1) both",
        }}
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
            color: "#71717A",
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
              backgroundColor: "rgba(220, 38, 38, 0.10)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 14px auto",
            }}
          >
            <AlertTriangle size={26} color="#DC2626" />
          </div>

          <h2
            id="remove-modal-title"
            style={{
              fontSize: 18.5,
              fontWeight: 700,
              color: "#18181B",
              margin: "0 0 6px 0",
              letterSpacing: "-0.015em",
            }}
          >
            Remove officer
          </h2>

          <p style={{ fontSize: 13, color: "#52525B", margin: 0, lineHeight: 1.45 }}>
            Are you sure you want to remove <strong>{officerName}</strong>? They will lose access to this organization immediately. Everything they created will be kept.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            style={{
              padding: "10px 14px",
              borderRadius: 12,
              backgroundColor: "#FEF2F2",
              border: "1px solid #FCA5A5",
              color: "#DC2626",
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
              border: "1px solid #E4E4E7",
              backgroundColor: "#FFFFFF",
              color: "#52525B",
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
              backgroundColor: "#DC2626",
              color: "#FFFFFF",
              fontSize: 13.5,
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              boxShadow: "0 2px 8px rgba(220, 38, 38, 0.25)",
              opacity: loading ? 0.75 : 1,
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              if (!loading) e.currentTarget.style.backgroundColor = "#B91C1C";
            }}
            onMouseLeave={(e) => {
              if (!loading) e.currentTarget.style.backgroundColor = "#DC2626";
            }}
          >
            {loading ? "Removing…" : "Remove officer"}
          </button>
        </div>
      </div>
    </div>
  );
}

