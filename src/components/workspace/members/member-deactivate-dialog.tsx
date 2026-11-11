"use client";

import React, { useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { Dialog, DialogHeader, DialogBody, DialogFooter, DialogButton } from "@/src/components/ui/dialog";
import { MemberStatusBadge } from "./member-status-badge";
import { getInitials } from "@/src/components/workspace/officers/officers-helpers";
import type { WorkspaceMember } from "@/src/app/(workspace)/members-actions";
import { MEMBER_EDIT_MESSAGES } from "@/src/lib/members/member-edit";

interface MemberDeactivateDialogProps {
  member: WorkspaceMember | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (
    memberId: string
  ) => Promise<{ success: boolean; errorMessage?: string; stale?: boolean }>;
}

export function MemberDeactivateDialog({
  member,
  isOpen,
  onClose,
  onConfirm,
}: MemberDeactivateDialogProps) {
  if (!isOpen || !member) return null;

  // Keyed so error and saving state start fresh every time the prompt opens
  return <DeactivatePrompt key={member.id} member={member} onClose={onClose} onConfirm={onConfirm} />;
}

function DeactivatePrompt({
  member,
  onClose,
  onConfirm,
}: {
  member: WorkspaceMember;
  onClose: () => void;
  onConfirm: MemberDeactivateDialogProps["onConfirm"];
}) {
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDeactivate = async () => {
    setIsDeactivating(true);
    setError(null);
    try {
      const res = await onConfirm(member.id);
      if (res.success || res.stale) {
        // Stale: the roster toast explains and the row is refreshed behind the prompt
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
    >
      <DialogHeader
        titleId="deactivate-dialog-title"
        title="Deactivate member"
        description="Review who you are deactivating."
        onClose={onClose}
        closeDisabled={isDeactivating}
        closeLabel="Close confirmation dialog"
      />
      <DialogBody>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "12px 14px",
            borderRadius: 12,
            backgroundColor: "var(--color-base)",
            border: "1px solid var(--color-line)",
          }}
        >
          <span
            aria-hidden="true"
            style={{
              width: 38,
              height: 38,
              flexShrink: 0,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 13,
              fontWeight: 700,
              color: "var(--color-accent-strong)",
              backgroundColor: "color-mix(in srgb, var(--color-accent) 18%, transparent)",
            }}
          >
            {getInitials(member.fullName)}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              title={member.fullName}
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "var(--color-ink)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {member.fullName}
            </div>
            <div
              title={member.email}
              style={{
                fontSize: 12.5,
                color: "var(--color-muted-strong)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {member.email}
            </div>
          </div>
          <MemberStatusBadge status={member.status} size="sm" />
        </div>

        <p style={{ margin: "16px 0 0", fontSize: 14, lineHeight: 1.5, color: "var(--color-muted-strong)" }}>
          They move to Inactive and leave the main roster. Their record stays, and you can reactivate them at any
          time.
        </p>

        {error && (
          <div
            role="alert"
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 8,
              marginTop: 16,
              padding: "10px 12px",
              borderRadius: 10,
              backgroundColor: "var(--color-danger-soft)",
              border: "1px solid var(--color-danger-line)",
              color: "var(--color-danger-strong)",
              fontSize: 13,
              fontWeight: 500,
              lineHeight: 1.45,
            }}
          >
            <AlertCircle size={16} aria-hidden="true" style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{error}</span>
          </div>
        )}
      </DialogBody>
      <DialogFooter>
        <DialogButton onClick={onClose} disabled={isDeactivating}>
          Cancel
        </DialogButton>
        <DialogButton variant="danger" data-autofocus onClick={handleDeactivate} disabled={isDeactivating}>
          {isDeactivating && <Loader2 size={16} aria-hidden="true" style={{ animation: "spin 1s linear infinite" }} />}
          <span>{isDeactivating ? "Deactivating..." : "Deactivate"}</span>
        </DialogButton>
      </DialogFooter>
    </Dialog>
  );
}
