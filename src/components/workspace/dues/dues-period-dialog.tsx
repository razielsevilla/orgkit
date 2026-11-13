"use client";

import React, { useEffect, useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { Dialog, DialogHeader, DialogBody, DialogFooter, DialogButton } from "@/src/components/ui/dialog";
import { FieldError } from "@/src/components/ui/field-error";
import type { DuesPeriod } from "@/src/app/(workspace)/dues-actions";
import { validateDuesPeriodInput } from "@/src/lib/dues/dues-validation";

interface DuesPeriodDialogProps {
  isOpen: boolean;
  onClose: () => void;
  period?: DuesPeriod | null;
  onSave: (input: {
    name: string;
    amount: number;
    dueOn: string;
  }) => Promise<{ success: boolean; errorMessage?: string }>;
}

export function DuesPeriodDialog({
  isOpen,
  onClose,
  period,
  onSave,
}: DuesPeriodDialogProps) {
  if (!isOpen) return null;

  return (
    <DuesPeriodDialogForm
      key={period?.id ?? "new"}
      period={period}
      onClose={onClose}
      onSave={onSave}
    />
  );
}

function DuesPeriodDialogForm({
  period,
  onClose,
  onSave,
}: {
  period?: DuesPeriod | null;
  onClose: () => void;
  onSave: (input: {
    name: string;
    amount: number;
    dueOn: string;
  }) => Promise<{ success: boolean; errorMessage?: string }>;
}) {
  const isEditing = Boolean(period);

  const [name, setName] = useState(period?.name ?? "");
  const [amount, setAmount] = useState(period ? String(period.amount) : "");
  const [dueOn, setDueOn] = useState(period?.dueOn ?? "");

  const [nameError, setNameError] = useState<string | null>(null);
  const [amountError, setAmountError] = useState<string | null>(null);
  const [dueOnError, setDueOnError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const titleId = "dues-period-dialog-title";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

    setNameError(null);
    setAmountError(null);
    setDueOnError(null);
    setFormError(null);

    const validation = validateDuesPeriodInput({ name, amount, dueOn });
    if (!validation.isValid || !validation.cleaned) {
      if (validation.errors.name) setNameError(validation.errors.name);
      if (validation.errors.amount) setAmountError(validation.errors.amount);
      if (validation.errors.dueOn) setDueOnError(validation.errors.dueOn);
      return;
    }

    setIsSaving(true);
    try {
      const res = await onSave(validation.cleaned);
      if (res.success) {
        onClose();
      } else {
        setFormError(res.errorMessage || "Failed to save dues period. Try again.");
      }
    } catch {
      setFormError("Failed to save dues period. Try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const inputStyle = (hasError: boolean): React.CSSProperties => ({
    width: "100%",
    height: 40,
    padding: "0 12px",
    borderRadius: 10,
    border: hasError ? "1px solid var(--color-danger-strong)" : "1px solid var(--color-line)",
    backgroundColor: "var(--color-surface)",
    color: "var(--color-ink)",
    fontSize: 14,
    boxSizing: "border-box",
    outline: "none",
    transition: "border-color 0.15s ease",
  });

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 13,
    fontWeight: 500,
    color: "var(--color-ink)",
    marginBottom: 6,
  };

  const hasPayments = (period?.paymentCount ?? 0) > 0;

  return (
    <Dialog
      labelledBy={titleId}
      onDismiss={isSaving ? undefined : onClose}
      maxWidth={460}
    >
      <DialogHeader
        titleId={titleId}
        title={isEditing ? "Edit period" : "New period"}
        description={
          isEditing
            ? "Update the period name, amount or due date"
            : "Set the dues amount and due date"
        }
        onClose={isSaving ? undefined : onClose}
        closeLabel="Close dialog"
        closeDisabled={isSaving}
      />

      <form onSubmit={handleSubmit} noValidate>
        <DialogBody>
          {formError && (
            <div
              role="alert"
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 8,
                padding: "10px 14px",
                backgroundColor: "color-mix(in srgb, var(--color-danger) 10%, transparent)",
                border: "1px solid color-mix(in srgb, var(--color-danger) 25%, transparent)",
                borderRadius: 10,
                color: "var(--color-danger-strong)",
                fontSize: 13,
                marginBottom: 16,
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{formError}</span>
            </div>
          )}

          {isEditing && hasPayments && (
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                padding: "10px 14px",
                backgroundColor: "color-mix(in srgb, var(--color-warning, #D97706) 10%, transparent)",
                border: "1px solid color-mix(in srgb, var(--color-warning, #D97706) 25%, transparent)",
                borderRadius: 10,
                color: "var(--color-warning-strong, #92400E)",
                fontSize: 13,
                lineHeight: 1.4,
                marginBottom: 16,
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
              <span>
                Payments already exist for this period. Changing the amount will not change those payments' recorded amounts.
              </span>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Period Name */}
            <div>
              <label htmlFor="period-name" style={labelStyle}>
                Period name
              </label>
              <input
                id="period-name"
                type="text"
                data-autofocus
                placeholder="e.g. 1st Sem Membership Dues"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (nameError) setNameError(null);
                }}
                disabled={isSaving}
                aria-invalid={Boolean(nameError)}
                aria-describedby={nameError ? "period-name-error" : undefined}
                style={inputStyle(Boolean(nameError))}
              />
              {nameError && <FieldError id="period-name-error">{nameError}</FieldError>}
            </div>

            {/* Amount */}
            <div>
              <label htmlFor="period-amount" style={labelStyle}>
                Amount (₱)
              </label>
              <div style={{ position: "relative" }}>
                <span
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    left: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    fontSize: 14,
                    fontWeight: 600,
                    color: "var(--color-muted)",
                    pointerEvents: "none",
                  }}
                >
                  ₱
                </span>
                <input
                  id="period-amount"
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    if (amountError) setAmountError(null);
                  }}
                  disabled={isSaving}
                  aria-invalid={Boolean(amountError)}
                  aria-describedby={amountError ? "period-amount-error" : undefined}
                  style={{
                    ...inputStyle(Boolean(amountError)),
                    paddingLeft: 28,
                  }}
                />
              </div>
              {amountError && <FieldError id="period-amount-error">{amountError}</FieldError>}
            </div>

            {/* Due Date */}
            <div>
              <label htmlFor="period-due-on" style={labelStyle}>
                Due date
              </label>
              <input
                id="period-due-on"
                type="date"
                value={dueOn}
                onChange={(e) => {
                  setDueOn(e.target.value);
                  if (dueOnError) setDueOnError(null);
                }}
                disabled={isSaving}
                aria-invalid={Boolean(dueOnError)}
                aria-describedby={dueOnError ? "period-due-on-error" : undefined}
                style={inputStyle(Boolean(dueOnError))}
              />
              {dueOnError && <FieldError id="period-due-on-error">{dueOnError}</FieldError>}
            </div>
          </div>
        </DialogBody>

        <DialogFooter>
          <DialogButton onClick={onClose} disabled={isSaving}>
            Cancel
          </DialogButton>
          <DialogButton variant="primary" type="submit" disabled={isSaving}>
            {isSaving ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <Loader2 size={16} className="animate-spin" />
                Saving...
              </span>
            ) : isEditing ? (
              "Save changes"
            ) : (
              "Create period"
            )}
          </DialogButton>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
