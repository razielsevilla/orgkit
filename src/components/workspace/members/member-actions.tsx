"use client";

import React from "react";
import { Check, Pencil, UserCheck, UserX, Loader2, type LucideIcon } from "lucide-react";
import type { WorkspaceMember } from "@/src/app/(workspace)/members-actions";

interface MemberActionsProps {
  member: WorkspaceMember;
  onEdit: (member: WorkspaceMember) => void;
  onDeactivate: (member: WorkspaceMember) => void;
  onReactivate: (member: WorkspaceMember) => void;
  onConfirm?: (member: WorkspaceMember) => void;
  isConfirming?: boolean;
  isReactivating?: boolean;
  /** Mobile cards show a text label on each button; the desktop table shows the icon alone */
  isMobile?: boolean;
}

type Variant = "primary" | "neutral" | "danger";

const VARIANT_STYLES: Record<Variant, React.CSSProperties> = {
  primary: {
    backgroundColor: "var(--color-accent)",
    color: "var(--color-on-accent)",
    border: "none",
    boxShadow: "0 2px 8px color-mix(in srgb, var(--color-accent) 25%, transparent)",
  },
  neutral: {
    backgroundColor: "var(--color-surface)",
    border: "1px solid var(--color-line)",
    color: "var(--color-ink)",
  },
  danger: {
    backgroundColor: "#FEF2F2",
    border: "1px solid #FEE2E2",
    color: "#DC2626",
  },
};

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: "orgkit-btn-accent",
  neutral: "orgkit-btn-edit",
  danger: "orgkit-btn-deactivate",
};

interface ActionButtonProps {
  /** What the button does ("Edit"); also its tooltip and screen-reader name */
  label: string;
  member: WorkspaceMember;
  icon: LucideIcon;
  variant: Variant;
  onClick: (member: WorkspaceMember) => void;
  showLabel: boolean;
  /** A request is running: show a spinner, and `busyLabel` in place of `label` */
  busy?: boolean;
  busyLabel?: string;
}

function ActionButton({
  label,
  member,
  icon: Icon,
  variant,
  onClick,
  showLabel,
  busy = false,
  busyLabel,
}: ActionButtonProps) {
  const size = showLabel ? 40 : 32;

  return (
    <button
      type="button"
      onClick={() => onClick(member)}
      disabled={busy}
      aria-label={`${label} ${member.fullName}`}
      aria-busy={busy || undefined}
      title={label}
      className={VARIANT_CLASSES[variant]}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        height: size,
        // Icon only: a square that the radius turns into a circle
        ...(showLabel ? { padding: "0 16px" } : { width: size, padding: 0 }),
        borderRadius: 9999,
        fontSize: showLabel ? 13.5 : 12.5,
        fontWeight: 600,
        cursor: busy ? "not-allowed" : "pointer",
        opacity: busy ? 0.7 : 1,
        transition: "background-color 0.15s ease, border-color 0.15s ease, opacity 0.15s ease",
        whiteSpace: "nowrap",
        ...VARIANT_STYLES[variant],
      }}
      onMouseEnter={variant === "danger" ? (e) => (e.currentTarget.style.backgroundColor = "#FEE2E2") : undefined}
      onMouseLeave={variant === "danger" ? (e) => (e.currentTarget.style.backgroundColor = "#FEF2F2") : undefined}
    >
      {busy ? (
        <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} aria-hidden="true" />
      ) : (
        <Icon size={15} strokeWidth={2} aria-hidden="true" />
      )}
      {showLabel && <span>{busy && busyLabel ? busyLabel : label}</span>}
    </button>
  );
}

/**
 * Action controls for individual members:
 * - Pending members: Confirm (primary), Edit, and Deactivate.
 * - Active members: Edit and Deactivate.
 * - Inactive members: Reactivate (primary) and Edit.
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
  const common = { member, showLabel: isMobile };

  const edit = <ActionButton {...common} label="Edit" icon={Pencil} variant="neutral" onClick={onEdit} />;
  const deactivate = (
    <ActionButton {...common} label="Deactivate" icon={UserX} variant="danger" onClick={onDeactivate} />
  );
  const reactivate = (
    <ActionButton
      {...common}
      label="Reactivate"
      busyLabel="Reactivating..."
      icon={UserCheck}
      variant="primary"
      onClick={onReactivate}
      busy={isReactivating}
    />
  );
  const confirm = onConfirm && (
    <ActionButton
      {...common}
      label="Confirm"
      busyLabel="Confirming..."
      icon={Check}
      variant="primary"
      onClick={onConfirm}
      busy={isConfirming}
    />
  );

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: isMobile ? "stretch" : "center",
        gap: 8,
        flexWrap: isMobile ? "wrap" : "nowrap",
        width: isMobile ? "100%" : "auto",
      }}
    >
      {member.status === "pending" && (
        <>
          {confirm}
          {edit}
          {deactivate}
        </>
      )}

      {member.status === "active" && (
        <>
          {edit}
          {deactivate}
        </>
      )}

      {member.status === "inactive" && (
        <>
          {reactivate}
          {edit}
        </>
      )}
    </div>
  );
}
