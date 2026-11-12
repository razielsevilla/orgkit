"use client";

import React, { useState } from "react";
import { Loader2 } from "lucide-react";
import { Dialog, DialogHeader, DialogBody, DialogFooter, DialogButton } from "@/src/components/ui/dialog";
import { FieldError } from "@/src/components/ui/field-error";
import {
  createEventAction,
  updateEventAction,
  type WorkspaceEvent,
} from "@/src/app/(workspace)/events-actions";
import {
  EVENT_LOCATION_MAX,
  EVENT_MESSAGES,
  EVENT_TITLE_MAX,
  fromDatetimeLocal,
  toDatetimeLocal,
  validateEvent,
  type EventField,
} from "@/src/lib/events/event-validation";

interface EventFormDialogProps {
  orgId: string;
  /** The event being edited, or null to create a new one */
  event: WorkspaceEvent | null;
  isOpen: boolean;
  onClose: () => void;
  /** Called after a successful save. Create passes the new event's ID. */
  onSaved?: (result: { id: string; created: boolean }) => void;
}

type FieldErrors = Partial<Record<EventField, string>>;

const inputStyle = (hasError: boolean): React.CSSProperties => ({
  width: "100%",
  height: 40,
  padding: "0 12px",
  borderRadius: 10,
  border: hasError ? "1px solid var(--color-danger-strong)" : "1px solid var(--color-line-strong)",
  backgroundColor: "var(--color-base)",
  color: "var(--color-ink)",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
  minWidth: 0,
});

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  fontWeight: 500,
  color: "var(--color-ink-soft)",
  marginBottom: 8,
};

function EventForm({ orgId, event, onClose, onSaved }: Omit<EventFormDialogProps, "isOpen">) {
  const isEdit = event !== null;
  const [title, setTitle] = useState(event?.title ?? "");
  const [startsAt, setStartsAt] = useState(event ? toDatetimeLocal(event.startsAt) : "");
  const [endsAt, setEndsAt] = useState(event ? toDatetimeLocal(event.endsAt) : "");
  const [location, setLocation] = useState(event?.location ?? "");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const clearError = (field: EventField) => {
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

    setErrors({});
    setFormError(null);

    // The inputs hold local times; the server and database work in exact instants
    const validation = validateEvent({
      title,
      startsAt: fromDatetimeLocal(startsAt),
      endsAt: fromDatetimeLocal(endsAt),
      location,
    });
    if (!validation.valid) {
      setErrors({ [validation.field]: validation.error });
      return;
    }

    // Nothing changed: close without a request
    if (
      event &&
      validation.title === event.title &&
      validation.startsAt === new Date(event.startsAt).toISOString() &&
      validation.endsAt === new Date(event.endsAt).toISOString() &&
      validation.location === event.location
    ) {
      onClose();
      return;
    }

    const input = {
      title: validation.title,
      startsAt: validation.startsAt,
      endsAt: validation.endsAt,
      location: validation.location,
    };

    setIsSaving(true);
    try {
      if (event) {
        const res = await updateEventAction(orgId, event.id, input);
        if (res.success) {
          onSaved?.({ id: event.id, created: false });
          onClose();
        } else {
          setFormError(res.errorMessage || EVENT_MESSAGES.saveFailed);
        }
      } else {
        const res = await createEventAction(orgId, input);
        if (res.success && res.data) {
          onSaved?.({ id: res.data.id, created: true });
          onClose();
        } else {
          setFormError(res.errorMessage || EVENT_MESSAGES.saveFailed);
        }
      }
    } catch {
      setFormError(EVENT_MESSAGES.saveFailed);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      style={{ display: "flex", flexDirection: "column", flex: "1 1 auto", minHeight: 0 }}
    >
      <DialogHeader
        titleId="event-form-title"
        title={isEdit ? "Edit event" : "New event"}
        description={
          isEdit
            ? "Change the title, time or location."
            : "Add the title and when it happens. Location is optional."
        }
        onClose={onClose}
        closeDisabled={isSaving}
        closeLabel={isEdit ? "Close edit event dialog" : "Close new event dialog"}
      />
      <DialogBody>
        {formError && (
          <div
            role="alert"
            style={{
              padding: "8px 12px",
              borderRadius: 10,
              backgroundColor: "var(--color-danger-soft)",
              border: "1px solid var(--color-danger-line)",
              color: "var(--color-danger-strong)",
              fontSize: 13,
              fontWeight: 500,
              marginBottom: 16,
            }}
          >
            {formError}
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <label htmlFor="event-title" style={labelStyle}>
            Title
          </label>
          <input
            id="event-title"
            data-autofocus
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              clearError("title");
            }}
            disabled={isSaving}
            autoComplete="off"
            aria-invalid={Boolean(errors.title)}
            aria-describedby={errors.title ? "event-title-error" : undefined}
            style={inputStyle(Boolean(errors.title))}
          />
          {errors.title && <FieldError id="event-title-error">{errors.title}</FieldError>}
          <div style={{ marginTop: 4, fontSize: 12, color: "var(--color-muted)", textAlign: "right" }}>
            {title.trim().length}/{EVENT_TITLE_MAX}
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label htmlFor="event-starts-at" style={labelStyle}>
            Starts
          </label>
          <input
            id="event-starts-at"
            type="datetime-local"
            value={startsAt}
            onChange={(e) => {
              setStartsAt(e.target.value);
              clearError("startsAt");
              clearError("endsAt");
            }}
            disabled={isSaving}
            aria-invalid={Boolean(errors.startsAt)}
            aria-describedby={errors.startsAt ? "event-starts-at-error" : undefined}
            style={inputStyle(Boolean(errors.startsAt))}
          />
          {errors.startsAt && <FieldError id="event-starts-at-error">{errors.startsAt}</FieldError>}
        </div>

        <div style={{ marginBottom: 16 }}>
          <label htmlFor="event-ends-at" style={labelStyle}>
            Ends
          </label>
          <input
            id="event-ends-at"
            type="datetime-local"
            value={endsAt}
            onChange={(e) => {
              setEndsAt(e.target.value);
              clearError("endsAt");
            }}
            disabled={isSaving}
            aria-invalid={Boolean(errors.endsAt)}
            aria-describedby={errors.endsAt ? "event-ends-at-error" : undefined}
            style={inputStyle(Boolean(errors.endsAt))}
          />
          {errors.endsAt && <FieldError id="event-ends-at-error">{errors.endsAt}</FieldError>}
        </div>

        <div>
          <label htmlFor="event-location" style={labelStyle}>
            Location <span style={{ color: "var(--color-muted)", fontWeight: 400 }}>(optional)</span>
          </label>
          <input
            id="event-location"
            type="text"
            value={location}
            onChange={(e) => {
              setLocation(e.target.value);
              clearError("location");
            }}
            disabled={isSaving}
            maxLength={EVENT_LOCATION_MAX + 20}
            autoComplete="off"
            aria-invalid={Boolean(errors.location)}
            aria-describedby={errors.location ? "event-location-error" : undefined}
            style={inputStyle(Boolean(errors.location))}
          />
          {errors.location && <FieldError id="event-location-error">{errors.location}</FieldError>}
        </div>
      </DialogBody>
      <DialogFooter>
        <DialogButton onClick={onClose} disabled={isSaving}>
          Cancel
        </DialogButton>
        <DialogButton type="submit" variant="primary" disabled={isSaving}>
          {isSaving && <Loader2 size={16} aria-hidden="true" style={{ animation: "spin 1s linear infinite" }} />}
          <span>{isSaving ? "Saving..." : isEdit ? "Save changes" : "Create event"}</span>
        </DialogButton>
      </DialogFooter>
    </form>
  );
}

/** Create (event = null) or edit an event. The form is keyed so each open starts fresh. */
export function EventFormDialog({ orgId, event, isOpen, onClose, onSaved }: EventFormDialogProps) {
  if (!isOpen) return null;

  return (
    <Dialog labelledBy="event-form-title" onDismiss={onClose} maxWidth={460}>
      <EventForm key={event?.id ?? "new"} orgId={orgId} event={event} onClose={onClose} onSaved={onSaved} />
    </Dialog>
  );
}
