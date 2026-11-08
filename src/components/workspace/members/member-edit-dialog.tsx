"use client";

import React, { useState, useEffect } from "react";
import { X, Loader2 } from "lucide-react";
import { Dialog } from "@/src/components/ui/dialog";
import type { WorkspaceMember } from "@/src/app/(workspace)/members-actions";
import {
  validateMemberEdit,
  MEMBER_EDIT_MESSAGES,
} from "@/src/lib/members/member-edit";

interface MemberEditDialogProps {
  member: WorkspaceMember | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    memberId: string,
    updates: { fullName: string; email: string }
  ) => Promise<{ success: boolean; errorMessage?: string }>;
}

export function MemberEditDialog({
  member,
  isOpen,
  onClose,
  onSave,
}: MemberEditDialogProps) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (member) {
      setFullName(member.fullName);
      setEmail(member.email);
      setNameError(null);
      setEmailError(null);
      setFormError(null);
      setIsSaving(false);
    }
  }, [member, isOpen]);

  if (!isOpen || !member) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

    setNameError(null);
    setEmailError(null);
    setFormError(null);

    const validation = validateMemberEdit({ fullName, email });
    if (!validation.valid) {
      if (validation.field === "fullName") {
        setNameError(validation.error || MEMBER_EDIT_MESSAGES.nameInvalid);
      } else if (validation.field === "email") {
        setEmailError(validation.error || MEMBER_EDIT_MESSAGES.emailInvalid);
      }
      return;
    }

    // No-change save check: if values are identical, return cleanly without error
    if (
      validation.fullName === member.fullName.trim() &&
      validation.email.toLowerCase() === member.email.trim().toLowerCase()
    ) {
      onClose();
      return;
    }

    setIsSaving(true);
    try {
      const res = await onSave(member.id, {
        fullName: validation.fullName,
        email: validation.email,
      });

      if (res.success) {
        onClose();
      } else {
        const errorMsg = res.errorMessage || MEMBER_EDIT_MESSAGES.saveFailed;
        if (errorMsg === MEMBER_EDIT_MESSAGES.duplicateEmail) {
          setEmailError(errorMsg);
        } else if (errorMsg === MEMBER_EDIT_MESSAGES.nameInvalid) {
          setNameError(errorMsg);
        } else if (errorMsg === MEMBER_EDIT_MESSAGES.emailInvalid) {
          setEmailError(errorMsg);
        } else {
          setFormError(errorMsg);
        }
      }
    } catch {
      setFormError(MEMBER_EDIT_MESSAGES.saveFailed);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog
      labelledBy="edit-member-title"
      onDismiss={isSaving ? undefined : onClose}
      maxWidth={460}
      padding="24px"
    >
      <div style={{ position: "relative", width: "100%" }}>
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={isSaving}
          aria-label="Close edit dialog"
          style={{
            position: "absolute",
            top: -4,
            right: -4,
            width: 36,
            height: 36,
            borderRadius: 8,
            border: "none",
            backgroundColor: "transparent",
            color: "var(--color-muted)",
            cursor: isSaving ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "color 0.15s ease",
          }}
        >
          <X size={18} />
        </button>

        {/* Title */}
        <h2
          id="edit-member-title"
          style={{
            margin: "0 0 6px 0",
            fontSize: 18,
            fontWeight: 700,
            color: "var(--color-ink)",
            letterSpacing: "-0.01em",
          }}
        >
          Edit member details
        </h2>
        <p
          style={{
            margin: "0 0 20px 0",
            fontSize: 13.5,
            color: "var(--color-muted)",
            lineHeight: 1.45,
          }}
        >
          Update their name or email address. Their consent record remains untouched.
        </p>

        {/* Form Error Banner */}
        {formError && (
          <div
            role="alert"
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              backgroundColor: "color-mix(in srgb, var(--color-danger, #ef4444) 10%, transparent)",
              color: "var(--color-danger, #ef4444)",
              fontSize: 13,
              fontWeight: 500,
              marginBottom: 16,
            }}
          >
            {formError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* Full Name Input */}
          <div style={{ marginBottom: 16 }}>
            <label
              htmlFor="edit-member-name"
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 600,
                color: "var(--color-ink)",
                marginBottom: 6,
              }}
            >
              Full name
            </label>
            <input
              id="edit-member-name"
              data-autofocus
              type="text"
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                if (nameError) setNameError(null);
              }}
              disabled={isSaving}
              aria-invalid={Boolean(nameError)}
              aria-describedby={nameError ? "edit-member-name-error" : undefined}
              style={{
                width: "100%",
                height: 42,
                padding: "0 14px",
                borderRadius: 10,
                border: nameError
                  ? "1px solid var(--color-danger, #ef4444)"
                  : "1px solid var(--color-line)",
                backgroundColor: "var(--color-base)",
                color: "var(--color-ink)",
                fontSize: 14,
                outline: "none",
                boxSizing: "border-box",
                transition: "all 0.15s ease",
              }}
            />
            {nameError && (
              <p
                id="edit-member-name-error"
                role="alert"
                style={{
                  margin: "6px 0 0 0",
                  fontSize: 12.5,
                  color: "var(--color-danger, #ef4444)",
                  fontWeight: 500,
                }}
              >
                {nameError}
              </p>
            )}
          </div>

          {/* Email Input */}
          <div style={{ marginBottom: 24 }}>
            <label
              htmlFor="edit-member-email"
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 600,
                color: "var(--color-ink)",
                marginBottom: 6,
              }}
            >
              Email address
            </label>
            <input
              id="edit-member-email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (emailError) setEmailError(null);
              }}
              disabled={isSaving}
              aria-invalid={Boolean(emailError)}
              aria-describedby={emailError ? "edit-member-email-error" : undefined}
              style={{
                width: "100%",
                height: 42,
                padding: "0 14px",
                borderRadius: 10,
                border: emailError
                  ? "1px solid var(--color-danger, #ef4444)"
                  : "1px solid var(--color-line)",
                backgroundColor: "var(--color-base)",
                color: "var(--color-ink)",
                fontSize: 14,
                outline: "none",
                boxSizing: "border-box",
                transition: "all 0.15s ease",
              }}
            />
            {emailError && (
              <p
                id="edit-member-email-error"
                role="alert"
                style={{
                  margin: "6px 0 0 0",
                  fontSize: 12.5,
                  color: "var(--color-danger, #ef4444)",
                  fontWeight: 500,
                }}
              >
                {emailError}
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: 10,
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              style={{
                minHeight: 44,
                padding: "0 16px",
                borderRadius: 10,
                border: "1px solid var(--color-line)",
                backgroundColor: "transparent",
                color: "var(--color-ink)",
                fontSize: 13.5,
                fontWeight: 600,
                cursor: isSaving ? "not-allowed" : "pointer",
                opacity: isSaving ? 0.6 : 1,
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              style={{
                minHeight: 44,
                padding: "0 20px",
                borderRadius: 10,
                border: "none",
                backgroundColor: "var(--color-accent)",
                color: "var(--color-on-accent)",
                fontSize: 13.5,
                fontWeight: 600,
                cursor: isSaving ? "not-allowed" : "pointer",
                opacity: isSaving ? 0.75 : 1,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                boxShadow: "0 2px 8px color-mix(in srgb, var(--color-accent) 25%, transparent)",
              }}
            >
              {isSaving && (
                <Loader2
                  size={15}
                  className="animate-spin"
                  style={{ animation: "spin 1s linear infinite" }}
                />
              )}
              <span>{isSaving ? "Saving..." : "Save changes"}</span>
            </button>
          </div>
        </form>
      </div>
    </Dialog>
  );
}

