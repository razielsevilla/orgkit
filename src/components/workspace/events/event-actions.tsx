"use client";

import React from "react";
import { Ban, Pencil, type LucideIcon } from "lucide-react";
import type { WorkspaceEvent } from "@/src/app/(workspace)/events-actions";

interface EventActionsProps {
  event: WorkspaceEvent;
  onEdit: (event: WorkspaceEvent) => void;
  onCancel: (event: WorkspaceEvent) => void;
  /** Mobile cards show a text label on each button; the desktop table shows the icon alone */
  isMobile?: boolean;
}

function ActionButton({
  label,
  event,
  icon: Icon,
  danger,
  onClick,
  showLabel,
}: {
  label: string;
  event: WorkspaceEvent;
  icon: LucideIcon;
  danger?: boolean;
  onClick: (event: WorkspaceEvent) => void;
  showLabel: boolean;
}) {
  const size = showLabel ? 40 : 32;

  return (
    <button
      type="button"
      onClick={() => onClick(event)}
      aria-label={`${label} ${event.title}`}
      title={label}
      className={danger ? "orgkit-btn-deactivate" : "orgkit-btn-edit"}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        height: size,
        ...(showLabel ? { padding: "0 16px", flex: "1 1 auto" } : { width: size, padding: 0 }),
        borderRadius: 9999,
        fontSize: showLabel ? 13.5 : 12.5,
        fontWeight: 600,
        cursor: "pointer",
        whiteSpace: "nowrap",
        transition: "background-color 0.15s ease, border-color 0.15s ease",
        ...(danger
          ? { backgroundColor: "#FEF2F2", border: "1px solid #FEE2E2", color: "#DC2626" }
          : { backgroundColor: "var(--color-surface)", border: "1px solid var(--color-line)", color: "var(--color-ink)" }),
      }}
      onMouseEnter={danger ? (e) => (e.currentTarget.style.backgroundColor = "#FEE2E2") : undefined}
      onMouseLeave={danger ? (e) => (e.currentTarget.style.backgroundColor = "#FEF2F2") : undefined}
    >
      <Icon size={15} strokeWidth={2} aria-hidden="true" />
      {showLabel && <span>{label}</span>}
    </button>
  );
}

/**
 * Edit and Cancel for a scheduled event. A cancelled event has no actions: it
 * can't be edited and can't be cancelled again.
 */
export function EventActions({ event, onEdit, onCancel, isMobile = false }: EventActionsProps) {
  if (event.status === "cancelled") return null;

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
      <ActionButton label="Edit" event={event} icon={Pencil} onClick={onEdit} showLabel={isMobile} />
      <ActionButton label="Cancel event" event={event} icon={Ban} danger onClick={onCancel} showLabel={isMobile} />
    </div>
  );
}
