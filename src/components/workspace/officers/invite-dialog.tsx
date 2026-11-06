"use client";

import React, { useState } from "react";
import { AlertCircle, X } from "lucide-react";
import { OfficerRole } from "@/src/lib/orgs/permissions";
import { createOfficerInvite } from "@/src/app/(workspace)/officers-actions";
import { Dialog } from "@/src/components/ui/dialog";
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
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          aria-label="Close modal"
          style={{
            position: "absolute",
            top: 20,
            right: 20,
            width: 32,
            height: 32,
            borderRadius: 8,
            border: "none",
            backgroundColor: "transparent",
            color: "var(--color-muted)",
            cursor: loading ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.15s ease",
          }}
          onMouseEnter={(e) => {
            if (!loading) e.currentTarget.style.backgroundColor = "var(--color-base)";
          }}
          onMouseLeave={(e) => {
            if (!loading) e.currentTarget.style.backgroundColor = "transparent";
          }}
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div style={{ marginBottom: 20 }}>
          <h2
            id="invite-modal-title"
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: "var(--color-ink)",
              margin: "0 0 6px 0",
              letterSpacing: "-0.015em",
            }}
          >
            Invite an officer
          </h2>
          <p style={{ fontSize: 13, color: "var(--color-muted)", margin: 0, lineHeight: 1.4 }}>
            Create a single-use invite link. It works once and expires in 7 days.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Email Input */}
          <div style={{ marginBottom: 20 }}>
            <label
              htmlFor="invite-email"
              style={{
                display: "block",
                fontSize: 12.5,
                fontWeight: 600,
                color: "var(--color-ink)",
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
              style={{
                width: "100%",
                padding: "11px 14px",
                borderRadius: 12,
                border: fieldError ? "1.5px solid var(--color-danger)" : "1px solid var(--color-line)",
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
                  e.currentTarget.style.boxShadow = "0 0 0 3px color-mix(in srgb, var(--color-accent) 12%, transparent)";
                }
              }}
              onBlur={(e) => {
                if (!fieldError) {
                  e.currentTarget.style.borderColor = "var(--color-line)";
                  e.currentTarget.style.boxShadow = "none";
                }
              }}
            />
            {fieldError && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  marginTop: 6,
                  color: "var(--color-danger)",
                  fontSize: 12,
                  fontWeight: 500,
                }}
              >
                <AlertCircle size={13} />
                <span>{fieldError}</span>
              </div>
            )}
          </div>

          <InviteRolePicker role={role} setRole={setRole} loading={loading} />

          {/* Action Buttons */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                padding: "10px 18px",
                borderRadius: 9999,
                border: "1px solid var(--color-line)",
                backgroundColor: "var(--color-surface)",
                color: "var(--color-muted-strong)",
                fontSize: 13.5,
                fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: "10px 22px",
                borderRadius: 9999,
                border: "none",
                backgroundColor: "var(--color-accent)",
                color: "var(--color-on-accent)",
                fontSize: 13.5,
                fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
                boxShadow: "0 2px 8px color-mix(in srgb, var(--color-accent) 25%, transparent)",
                opacity: loading ? 0.75 : 1,
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                if (!loading) e.currentTarget.style.backgroundColor = "var(--color-accent-strong)";
              }}
              onMouseLeave={(e) => {
                if (!loading) e.currentTarget.style.backgroundColor = "var(--color-accent)";
              }}
            >
              {loading ? "Creating…" : "Create invite"}
            </button>
          </div>
        </form>
      </Dialog>

      {/* Floating Server Error Toast */}
      <ErrorToast message={serverError} onDismiss={() => setServerError(null)} />
    </>
  );
}

export { SuccessPanel } from "./invite-success-panel";
