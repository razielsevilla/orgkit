"use client";

import React, { useState } from "react";
import { FieldError } from "@/src/components/ui/field-error";
import { OfficerRole } from "@/src/lib/orgs/permissions";
import { createOfficerInvite } from "@/src/app/(workspace)/officers-actions";
import { Dialog, DialogBody, DialogButton, DialogFooter, DialogHeader } from "@/src/components/ui/dialog";
import { ErrorToast } from "@/src/components/error-toast";
import { InviteRolePicker } from "./invite-role-picker";

interface InviteDialogProps {
  orgId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (data: { inviteUrl: string; email: string; role: OfficerRole }) => void;
  initialEmail?: string;
  initialRole?: OfficerRole;
}

export function InviteDialog({
  orgId,
  isOpen,
  onClose,
  onSuccess,
  initialEmail = "",
  initialRole = "officer",
}: InviteDialogProps) {
  const [email, setEmail] = useState(initialEmail);
  const [role, setRole] = useState<OfficerRole>(initialRole);
  const [loading, setLoading] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldError(null);
    setServerError(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setFieldError("Email is required.");
      return;
    }

    if (!cleanEmail.includes("@") || !cleanEmail.includes(".")) {
      setFieldError("Enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      const res = await createOfficerInvite(orgId, cleanEmail, role);
      if (res.success && res.data) {
        onSuccess(res.data);
      } else {
        setServerError(res.errorMessage || "Failed to create invite.");
      }
    } catch {
      setServerError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Dialog
        labelledBy="invite-modal-title"
        onDismiss={loading ? undefined : onClose}
        maxWidth={480}
      >
        <DialogHeader
          titleId="invite-modal-title"
          title="Invite an officer"
          description="Create a single-use invite link. It works once and expires in 7 days."
          onClose={onClose}
          closeDisabled={loading}
          closeLabel="Close modal"
        />

        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", minHeight: 0, flex: "1 1 auto" }}
        >
          <DialogBody>
            <div style={{ marginBottom: 20 }}>
              <label
                htmlFor="invite-email"
                style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 500,
                  color: "var(--color-ink-soft)",
                  marginBottom: 6,
                }}
              >
                Email address
              </label>
              <input
                id="invite-email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (fieldError) setFieldError(null);
                }}
                placeholder="officer@school.edu"
                disabled={loading}
                autoFocus
                aria-invalid={fieldError ? true : undefined}
                aria-describedby={fieldError ? "invite-email-error" : undefined}
                style={{
                  width: "100%",
                  height: 40,
                  padding: "0 12px",
                  borderRadius: 10,
                  border: fieldError ? "1px solid var(--color-danger)" : "1px solid var(--color-line-strong)",
                  backgroundColor: "var(--color-surface)",
                  fontSize: 14,
                  color: "var(--color-ink)",
                  outline: "none",
                  boxSizing: "border-box",
                  transition: "border-color 0.15s ease, box-shadow 0.15s ease",
                }}
                onFocus={(e) => {
                  if (!fieldError) {
                    e.currentTarget.style.borderColor = "var(--color-accent)";
                    e.currentTarget.style.boxShadow = "0 0 0 3px color-mix(in srgb, var(--color-accent) 15%, transparent)";
                  }
                }}
                onBlur={(e) => {
                  if (!fieldError) {
                    e.currentTarget.style.borderColor = "var(--color-line-strong)";
                    e.currentTarget.style.boxShadow = "none";
                  }
                }}
              />
              {fieldError && <FieldError id="invite-email-error">{fieldError}</FieldError>}
            </div>

            <InviteRolePicker role={role} setRole={setRole} loading={loading} />
          </DialogBody>

          <DialogFooter>
            <DialogButton onClick={onClose} disabled={loading}>
              Cancel
            </DialogButton>
            <DialogButton type="submit" variant="primary" disabled={loading}>
              {loading ? "Creating…" : "Create invite"}
            </DialogButton>
          </DialogFooter>
        </form>
      </Dialog>

      {/* Floating Server Error Toast */}
      <ErrorToast message={serverError} onDismiss={() => setServerError(null)} />
    </>
  );
}

export { SuccessPanel } from "./invite-success-panel";
