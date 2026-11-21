"use client";

import React from "react";
import { Dialog, DialogHeader, DialogBody, DialogFooter, DialogButton } from "@/src/components/ui/dialog";
import { getInitials } from "@/src/components/workspace/officers/officers-helpers";
import { ATTENDANCE_MESSAGES, type AttendanceRecord } from "@/src/lib/events/attendance-state";
import { AttendanceMethodBadge } from "./attendance-method-badge";

interface AttendanceRemoveDialogProps {
  record: AttendanceRecord | null;
  isOpen: boolean;
  onClose: () => void;
  /** Starts the removal. The row leaves the list at once and comes back if the server refuses. */
  onConfirm: (record: AttendanceRecord) => void;
}

export function AttendanceRemoveDialog({ record, isOpen, onClose, onConfirm }: AttendanceRemoveDialogProps) {
  if (!isOpen || !record) return null;

  return (
    <Dialog role="alertdialog" labelledBy="attendance-remove-title" onDismiss={onClose} maxWidth={440}>
      <DialogHeader
        titleId="attendance-remove-title"
        title="Remove from attendance"
        description={ATTENDANCE_MESSAGES.removePrompt(record.fullName)}
        onClose={onClose}
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
            {getInitials(record.fullName)}
          </span>
          <span
            title={record.fullName}
            style={{
              flex: 1,
              minWidth: 0,
              fontSize: 14,
              fontWeight: 600,
              color: "var(--color-ink)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {record.fullName}
          </span>
          <AttendanceMethodBadge method={record.method} />
        </div>
        <p style={{ margin: "16px 0 0", fontSize: 14, lineHeight: 1.5, color: "var(--color-muted-strong)" }}>
          They leave the list and the count. You can add them again at any time.
        </p>
      </DialogBody>
      <DialogFooter>
        <DialogButton onClick={onClose}>Cancel</DialogButton>
        <DialogButton
          variant="danger"
          data-autofocus
          onClick={() => {
            onConfirm(record);
            onClose();
          }}
        >
          Remove
        </DialogButton>
      </DialogFooter>
    </Dialog>
  );
}
