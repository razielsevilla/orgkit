"use client";

import React from "react";
import { Check, Edit2, UserMinus, UserCheck, Loader2 } from "lucide-react";
import type { WorkspaceMember } from "@/src/app/(workspace)/members-actions";

interface MemberActionsProps {
  member: WorkspaceMember;
  onEdit: (member: WorkspaceMember) => void;
  onDeactivate: (member: WorkspaceMember) => void;
  onReactivate: (member: WorkspaceMember) => void;
  onConfirm?: (member: WorkspaceMember) => void;
  isConfirming?: boolean;
  isReactivating?: boolean;
  isMobile?: boolean;
}

/**
 * Action controls for individual members according to Ticket R2 & docs/design.md:
 * - Pending members: Confirm (primary emerald), Edit, and Deactivate (reject pending).
 * - Active members: Edit and Deactivate (quiet neutral action, NOT alarm/red).
 * - Inactive members: Reactivate (primary emerald) and Edit.
 * - Accessible keyboard labels and touch-friendly target sizes.
 */
export function MemberActions({
  member,
  onEdit,
  onDeactivate,
  onReactivate,
  onConfirm,
  isConfirming = false,
  isReactivating = false,
  isMobile = false,
}: MemberActionsProps) {
  const isPending = member.status === "pending";
  const isActive = member.status === "active";
  const isInactive = member.status === "inactive";

  const buttonBaseStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: isMobile ? 40 : 32,
    padding: isMobile ? "0 16px" : "0 12px",
    borderRadius: 9999,
    fontSize: isMobile ? 13.5 : 12.5,
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.15s ease",
    whiteSpace: "nowrap",
  };

  const editButton = (
    <button
      type="button"
      onClick={() => onEdit(member)}
      aria-label={`Edit ${member.fullName}`}
      className="orgkit-btn-edit"
      style={{
        ...buttonBaseStyle,
        backgroundColor: "var(--color-surface)",
        border: "1px solid var(--color-line)",
        color: "var(--color-ink)",
      }}
    >
      <Edit2 size={13} strokeWidth={2} />
      <span>Edit</span>
    </button>
  );

  const deactivateButton = (
    <button
      type="button"
      onClick={() => onDeactivate(member)}
      aria-label={`Deactivate ${member.fullName}`}
      className="orgkit-btn-deactivate"
      style={{
        ...buttonBaseStyle,
        backgroundColor: "transparent",
        border: "1px solid var(--color-line)",
        color: "var(--color-muted)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = "var(--color-ink)";
        e.currentTarget.style.borderColor = "color-mix(in srgb, var(--color-ink) 25%, transparent)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = "var(--color-muted)";
        e.currentTarget.style.borderColor = "var(--color-line)";
      }}
    >
      <UserMinus size={13} strokeWidth={2} />
      <span>Deactivate</span>
    </button>
  );

  const reactivateButton = (
    <button
      type="button"
      onClick={() => onReactivate(member)}
      disabled={isReactivating}
      aria-label={`Reactivate ${member.fullName}`}
      className="orgkit-btn-accent"
      style={{
        ...buttonBaseStyle,
        backgroundColor: "var(--color-accent)",
        color: "var(--color-on-accent)",
        border: "none",
        cursor: isReactivating ? "not-allowed" : "pointer",
        opacity: isReactivating ? 0.75 : 1,
        boxShadow: "0 2px 8px color-mix(in srgb, var(--color-accent) 25%, transparent)",
      }}
    >
      {isReactivating ? (
        <Loader2 size={13} className="animate-spin" style={{ animation: "spin 1s linear infinite" }} />
      ) : (
        <UserCheck size={13} strokeWidth={2.5} />
      )}
      <span>{isReactivating ? "Reactivating..." : "Reactivate"}</span>
    </button>
  );

  const confirmButton = onConfirm && (
    <button
      type="button"
      onClick={() => onConfirm(member)}
      disabled={isConfirming}
      aria-label={`Confirm ${member.fullName}`}
      className="orgkit-btn-accent"
      style={{
        ...buttonBaseStyle,
        backgroundColor: "var(--color-accent)",
        color: "var(--color-on-accent)",
        border: "none",
        cursor: isConfirming ? "not-allowed" : "pointer",
        opacity: isConfirming ? 0.7 : 1,
        boxShadow: "0 2px 8px color-mix(in srgb, var(--color-accent) 25%, transparent)",
      }}
    >
      {isConfirming ? (
        <Loader2 size={13} className="animate-spin" style={{ animation: "spin 1s linear infinite" }} />
      ) : (
        <Check size={13} strokeWidth={2.5} />
      )}
      <span>{isConfirming ? "Confirming..." : "Confirm"}</span>
    </button>
  );

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: isMobile ? "stretch" : "flex-end",
        gap: 8,
        flexWrap: isMobile ? "wrap" : "nowrap",
        width: isMobile ? "100%" : "auto",
      }}
    >
      {isPending && (
        <>
          {confirmButton}
          {editButton}
          {deactivateButton}
        </>
      )}

      {isActive && (
        <>
          {editButton}
          {deactivateButton}
        </>
      )}

      {isInactive && (
        <>
          {reactivateButton}
          {editButton}
        </>
      )}
    </div>
  );
}
