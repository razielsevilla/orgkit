"use client";

import React, { useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { Dialog, DialogHeader, DialogBody, DialogFooter, DialogButton } from "@/src/components/ui/dialog";
import { cancelEventAction, type WorkspaceEvent } from "@/src/app/(workspace)/events-actions";
import { EVENT_MESSAGES } from "@/src/lib/events/event-validation";
import { EventStatusBadge } from "./event-status-badge";
import { LocalTime } from "./local-time";

interface EventCancelDialogProps {
  orgId: string;
  event: WorkspaceEvent | null;
  isOpen: boolean;
  onClose: () => void;
  onCancelled?: (event: WorkspaceEvent) => void;
}

/** Confirm before cancelling. The event stays in the list, marked Cancelled. */
export function EventCancelDialog({ orgId, event, isOpen, onClose, onCancelled }: EventCancelDialogProps) {
  if (!isOpen || !event) return null;

  // Keyed so error and saving state start fresh every time the prompt opens
  return <CancelPrompt key={event.id} orgId={orgId} event={event} onClose={onClose} onCancelled={onCancelled} />;
}

function CancelPrompt({
  orgId,
  event,
  onClose,
  onCancelled,
}: {
  orgId: string;
  event: WorkspaceEvent;
  onClose: () => void;
  onCancelled?: (event: WorkspaceEvent) => void;
}) {
  const [isCancelling, setIsCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCancel = async () => {
    setIsCancelling(true);
    setError(null);
    try {
      const res = await cancelEventAction(orgId, event.id);
      if (res.success) {
        onCancelled?.(event);
        onClose();
      } else {
        setError(res.errorMessage || EVENT_MESSAGES.cancelFailed);
      }
    } catch {
      setError(EVENT_MESSAGES.cancelFailed);
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <Dialog
      role="alertdialog"
      labelledBy="cancel-event-title"
      onDismiss={isCancelling ? undefined : onClose}
      maxWidth={440}
    >
      <DialogHeader
        titleId="cancel-event-title"
        title="Cancel event"
        description="Review the event you are cancelling."
        onClose={onClose}
        closeDisabled={isCancelling}
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
          <div style={{ flex: 1, minWidth: 0 }}>
            <div title={event.title} style={{ fontSize: 14, fontWeight: 600, color: "var(--color-ink)", wordBreak: "break-word" }}>
              {event.title}
            </div>
            <div style={{ fontSize: 12.5, color: "var(--color-muted-strong)" }}>
              <LocalTime iso={event.startsAt} />
            </div>
          </div>
          <EventStatusBadge status={event.status} size="sm" />
        </div>

        <p style={{ margin: "16px 0 0", fontSize: 14, lineHeight: 1.5, color: "var(--color-muted-strong)" }}>
          It will stay in the list marked Cancelled, and nobody will be able to check in. This can&apos;t be undone.
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
        <DialogButton onClick={onClose} disabled={isCancelling}>
          Keep event
        </DialogButton>
        <DialogButton variant="danger" data-autofocus onClick={handleCancel} disabled={isCancelling}>
          {isCancelling && <Loader2 size={16} aria-hidden="true" style={{ animation: "spin 1s linear infinite" }} />}
          <span>{isCancelling ? "Cancelling..." : "Cancel event"}</span>
        </DialogButton>
      </DialogFooter>
    </Dialog>
  );
}
