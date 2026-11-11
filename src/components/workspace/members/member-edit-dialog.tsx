"use client";

import React, { useState } from "react";
import { Loader2 } from "lucide-react";
import { Dialog, DialogHeader, DialogBody, DialogFooter, DialogButton } from "@/src/components/ui/dialog";
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
  ) => Promise<{ success: boolean; errorMessage?: string; stale?: boolean }>;
}

interface MemberEditFormProps {
  member: WorkspaceMember;
  onClose: () => void;
  onSave: (
    memberId: string,
    updates: { fullName: string; email: string }
  ) => Promise<{ success: boolean; errorMessage?: string; stale?: boolean }>;
}

function MemberEditForm({ member, onClose, onSave }: MemberEditFormProps) {
  const [fullName, setFullName] = useState(member.fullName);
  const [email, setEmail] = useState(member.email);
  const [nameError, setNameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

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
      validation.email === member.email.trim()
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

      if (res.success || res.stale) {
        // Stale: the roster toast explains and the row is refreshed behind the dialog
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
  });
  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 13,
    fontWeight: 500,
    color: "var(--color-ink-soft)",
    marginBottom: 8,
  };
  const errorTextStyle: React.CSSProperties = {
    margin: "8px 0 0 0",
    padding: "4px 8px",
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 500,
    color: "var(--color-danger-strong)",
    backgroundColor: "var(--color-danger-soft)",
  };

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      style={{ display: "flex", flexDirection: "column", flex: "1 1 auto", minHeight: 0 }}
    >
      <DialogHeader
        titleId="edit-member-title"
        title="Edit member details"
        description="Update their name or email address. Their consent record remains untouched."
        onClose={onClose}
        closeDisabled={isSaving}
        closeLabel="Close edit dialog"
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
          <label htmlFor="edit-member-name" style={labelStyle}>
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
            style={inputStyle(Boolean(nameError))}
          />
          {nameError && (
            <p id="edit-member-name-error" role="alert" style={errorTextStyle}>
              {nameError}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="edit-member-email" style={labelStyle}>
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
            style={inputStyle(Boolean(emailError))}
          />
          {emailError && (
            <p id="edit-member-email-error" role="alert" style={errorTextStyle}>
              {emailError}
            </p>
          )}
        </div>
      </DialogBody>
      <DialogFooter>
        <DialogButton onClick={onClose} disabled={isSaving}>
          Cancel
        </DialogButton>
        <DialogButton type="submit" variant="primary" disabled={isSaving}>
          {isSaving && <Loader2 size={16} aria-hidden="true" style={{ animation: "spin 1s linear infinite" }} />}
          <span>{isSaving ? "Saving..." : "Save changes"}</span>
        </DialogButton>
      </DialogFooter>
    </form>
  );
}

export function MemberEditDialog({
  member,
  isOpen,
  onClose,
  onSave,
}: MemberEditDialogProps) {
  if (!isOpen || !member) return null;

  return (
    <Dialog
      labelledBy="edit-member-title"
      onDismiss={onClose}
      maxWidth={460}
    >
      <MemberEditForm
        key={member.id}
        member={member}
        onClose={onClose}
        onSave={onSave}
      />
    </Dialog>
  );
}
