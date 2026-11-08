"use client";

import React, { useState } from "react";
import { X, Loader2, UserMinus } from "lucide-react";
import { Dialog } from "@/src/components/ui/dialog";
import type { WorkspaceMember } from "@/src/app/(workspace)/members-actions";
import { MEMBER_EDIT_MESSAGES } from "@/src/lib/members/member-edit";

interface MemberDeactivateDialogProps {
  member: WorkspaceMember | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (memberId: string) => Promise<{ success: boolean; errorMessage?: string }>;
}

export function MemberDeactivateDialog({
  member,
  isOpen,
  onClose,
  onConfirm,
}: MemberDeactivateDialogProps) {
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !member) return null;

  const handleDeactivate = async () => {
    setIsDeactivating(true);
    setError(null);
    try {
      const res = await onConfirm(member.id);
      if (res.success) {
        onClose();
      } else {
        setError(res.errorMessage || MEMBER_EDIT_MESSAGES.statusChangeFailed);
      }
    } catch {
      setError(MEMBER_EDIT_MESSAGES.statusChangeFailed);
    } finally {
      setIsDeactivating(false);
    }
  };

  return (
    <Dialog
      role="alertdialog"
      labelledBy="deactivate-dialog-title"
      onDismiss={isDeactivating ? undefined : onClose}
      maxWidth={440}
      padding="24px"
    >
      <div style={{ position: "relative", width: "100%", textAlign: "left" }}>
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={isDeactivating}
          aria-label="Close confirmation dialog"
          style={{
            position: "absolute",
            top: -4,
            right: -4,
            width: 36,
            height: 36,
            borderRadius: 8,
            border: "none",
            backgroundColor: "transparent",
            color: "var(--color-muted)",
            cursor: isDeactivating ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "color 0.15s ease",
          }}
        >
          <X size={18} />
        </button>

        {/* Quiet Icon Header */}
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            backgroundColor: "color-mix(in srgb, var(--color-ink) 7%, transparent)",
            color: "var(--color-ink)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 16,
          }}
        >
          <UserMinus size={22} strokeWidth={2} />
        </div>

        {/* Title */}
        <h2
          id="deactivate-dialog-title"
          style={{
            margin: "0 0 8px 0",
            fontSize: 18,
            fontWeight: 700,
            color: "var(--color-ink)",
            letterSpacing: "-0.01em",
          }}
        >
          Deactivate {member.fullName}?
        </h2>

        {/* Prompt description */}
        <p
          style={{
            margin: "0 0 20px 0",
            fontSize: 13.5,
            color: "var(--color-muted)",
            lineHeight: 1.5,
          }}
        >
          They’ll move to Inactive. You can reactivate them later.
        </p>

        {/* Error message */}
        {error && (
          <div
            role="alert"
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              backgroundColor: "color-mix(in srgb, var(--color-danger, #ef4444) 10%, transparent)",
              color: "var(--color-danger, #ef4444)",
              fontSize: 13,
              fontWeight: 500,
              marginBottom: 16,
            }}
          >
            {error}
          </div>
        )}

        {/* Actions - Quiet, calm buttons adhering to design guidelines */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 10,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={isDeactivating}
            style={{
              minHeight: 44,
              padding: "0 16px",
              borderRadius: 10,
              border: "1px solid var(--color-line)",
              backgroundColor: "transparent",
              color: "var(--color-ink)",
              fontSize: 13.5,
              fontWeight: 600,
              cursor: isDeactivating ? "not-allowed" : "pointer",
              opacity: isDeactivating ? 0.6 : 1,
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            data-autofocus
            onClick={handleDeactivate}
            disabled={isDeactivating}
            style={{
              minHeight: 44,
              padding: "0 20px",
              borderRadius: 10,
              border: "1px solid color-mix(in srgb, var(--color-ink) 20%, transparent)",
              backgroundColor: "color-mix(in srgb, var(--color-ink) 9%, transparent)",
              color: "var(--color-ink)",
              fontSize: 13.5,
              fontWeight: 600,
              cursor: isDeactivating ? "not-allowed" : "pointer",
              opacity: isDeactivating ? 0.75 : 1,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              transition: "all 0.15s ease",
            }}
          >
            {isDeactivating && (
              <Loader2
                size={15}
                className="animate-spin"
                style={{ animation: "spin 1s linear infinite" }}
              />
            )}
            <span>{isDeactivating ? "Deactivating..." : "Deactivate"}</span>
          </button>
        </div>
      </div>
    </Dialog>
  );
}

