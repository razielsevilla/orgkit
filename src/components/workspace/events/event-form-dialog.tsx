"use client";

import React, { useEffect, useState } from "react";
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

/** `YYYY-MM-DDTHH:mm` into [date, time] */
function splitLocal(value: string): [string, string] {
  const [d = "", t = ""] = value.split("T");
  return [d, t];
}

/** Date and time inputs back into a datetime-local value, or "" if either is missing */
function joinLocal(date: string, time: string): string {
  return date && time ? `${date}T${time}` : "";
}

/** `HH:mm` plus one hour, or "" past midnight so the user picks the end themselves */
function oneHourLater(time: string): string {
  const [h, m] = time.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m) || h >= 23) return "";
  return `${String(h + 1).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

interface Draft {
  title: string;
  date: string;
  startClock: string;
  endClock: string;
  endDate: string;
  multiDay: boolean;
  endTouched: boolean;
  location: string;
}

/**
 * Unsaved form contents, kept while the page stays open so closing the dialog by
 * accident (Escape, the X, Cancel) doesn't lose what was typed. One draft per
 * event being edited, plus one for a new event. Cleared on a successful save.
 */
const drafts = new Map<string, Draft>();
const draftKey = (orgId: string, event: WorkspaceEvent | null) => `${orgId}:${event?.id ?? "new"}`;

function EventForm({ orgId, event, onClose, onSaved }: Omit<EventFormDialogProps, "isOpen">) {
  const isEdit = event !== null;
  const [startDate, startTime] = splitLocal(event ? toDatetimeLocal(event.startsAt) : "");
  const [endDateInit, endTimeInit] = splitLocal(event ? toDatetimeLocal(event.endsAt) : "");
  const initial: Draft = {
    title: event?.title ?? "",
    date: startDate,
    startClock: startTime,
    endClock: endTimeInit,
    endDate: endDateInit,
    multiDay: Boolean(event) && endDateInit !== startDate,
    // Once the user edits the end time, stop auto-filling it from the start time
    endTouched: Boolean(event),
    location: event?.location ?? "",
  };
  const key = draftKey(orgId, event);
  const [restored, setRestored] = useState(() => drafts.has(key));
  const [start] = useState<Draft>(() => drafts.get(key) ?? initial);

  const [title, setTitle] = useState(start.title);
  const [date, setDate] = useState(start.date);
  const [startClock, setStartClock] = useState(start.startClock);
  const [endClock, setEndClock] = useState(start.endClock);
  const [endDate, setEndDate] = useState(start.endDate);
  const [multiDay, setMultiDay] = useState(start.multiDay);
  const [endTouched, setEndTouched] = useState(start.endTouched);
  const [location, setLocation] = useState(start.location);
  const startsAt = joinLocal(date, startClock);
  const endsAt = joinLocal(multiDay ? endDate : date, endClock);

  // Keep the draft up to date; drop it when the form is back to its starting values
  useEffect(() => {
    const current: Draft = { title, date, startClock, endClock, endDate, multiDay, endTouched, location };
    const unchanged =
      title === initial.title &&
      date === initial.date &&
      startClock === initial.startClock &&
      endClock === initial.endClock &&
      location === initial.location &&
      multiDay === initial.multiDay &&
      (!multiDay || endDate === initial.endDate);
    if (unchanged) drafts.delete(key);
    else drafts.set(key, current);
    // `initial` is rebuilt each render from the same props; the fields are what change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, date, startClock, endClock, endDate, multiDay, endTouched, location, key]);

  const discardDraft = () => {
    drafts.delete(key);
    setTitle(initial.title);
    setDate(initial.date);
    setStartClock(initial.startClock);
    setEndClock(initial.endClock);
    setEndDate(initial.endDate);
    setMultiDay(initial.multiDay);
    setEndTouched(initial.endTouched);
    setLocation(initial.location);
    setErrors({});
    setRestored(false);
  };

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
          drafts.delete(key);
          onSaved?.({ id: event.id, created: false });
          onClose();
        } else {
          setFormError(res.errorMessage || EVENT_MESSAGES.saveFailed);
        }
      } else {
        const res = await createEventAction(orgId, input);
        if (res.success && res.data) {
          drafts.delete(key);
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
        {restored && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              padding: "8px 12px",
              borderRadius: 10,
              backgroundColor: "color-mix(in srgb, var(--color-accent) 8%, transparent)",
              border: "1px solid color-mix(in srgb, var(--color-accent) 20%, transparent)",
              color: "var(--color-ink-soft)",
              fontSize: 13,
              marginBottom: 16,
            }}
          >
            <span>Restored your unsaved changes.</span>
            <button
              type="button"
              onClick={discardDraft}
              disabled={isSaving}
              style={{ background: "none", border: "none", padding: 0, fontSize: 13, fontWeight: 600, color: "var(--color-accent)", cursor: "pointer" }}
            >
              Discard
            </button>
          </div>
        )}
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
          <label htmlFor="event-date" style={labelStyle}>
            Date
          </label>
          <input
            id="event-date"
            type="date"
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
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

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 8 }}>
          <div>
            <label htmlFor="event-start-time" style={labelStyle}>
              Starts
            </label>
            <input
              id="event-start-time"
              type="time"
              value={startClock}
              onChange={(e) => {
                const value = e.target.value;
                setStartClock(value);
                if (!endTouched) setEndClock(oneHourLater(value));
                clearError("startsAt");
                clearError("endsAt");
              }}
              disabled={isSaving}
              aria-invalid={Boolean(errors.startsAt)}
              style={inputStyle(Boolean(errors.startsAt))}
            />
          </div>
          <div>
            <label htmlFor="event-end-time" style={labelStyle}>
              Ends
            </label>
            <input
              id="event-end-time"
              type="time"
              value={endClock}
              onChange={(e) => {
                setEndClock(e.target.value);
                setEndTouched(true);
                clearError("endsAt");
              }}
              disabled={isSaving}
              aria-invalid={Boolean(errors.endsAt)}
              aria-describedby={errors.endsAt ? "event-ends-at-error" : undefined}
              style={inputStyle(Boolean(errors.endsAt))}
            />
          </div>
        </div>
        {errors.endsAt && <FieldError id="event-ends-at-error">{errors.endsAt}</FieldError>}

        <div style={{ marginBottom: 16 }}>
          {multiDay ? (
            <div style={{ marginTop: 8 }}>
              <label htmlFor="event-end-date" style={labelStyle}>
                End date
              </label>
              <input
                id="event-end-date"
                type="date"
                value={endDate}
                min={date || undefined}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  clearError("endsAt");
                }}
                disabled={isSaving}
                style={inputStyle(Boolean(errors.endsAt))}
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setEndDate(date);
                setMultiDay(true);
              }}
              disabled={isSaving}
              style={{
                background: "none",
                border: "none",
                padding: 0,
                marginTop: 4,
                fontSize: 13,
                fontWeight: 500,
                color: "var(--color-accent)",
                cursor: "pointer",
              }}
            >
              Ends on a different day
            </button>
          )}
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
    <Dialog labelledBy="event-form-title" onDismiss={onClose} dismissOnBackdrop={false} maxWidth={460}>
      <EventForm key={event?.id ?? "new"} orgId={orgId} event={event} onClose={onClose} onSaved={onSaved} />
    </Dialog>
  );
}
