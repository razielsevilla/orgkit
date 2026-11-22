"use client";

import React, { useState } from "react";
import { Dialog, DialogHeader, DialogBody, DialogFooter } from "@/src/components/ui/dialog";
import { AlertCircle, Loader2 } from "lucide-react";
import type { OfficerTerm } from "@/src/app/(workspace)/terms-actions";
import {
  areDatesOrdered,
  TERMS_ERROR_MESSAGES,
  type OfficerTermInput,
} from "@/src/lib/terms/terms-validation";

interface MemberOption {
  id: string;
  fullName: string;
  email: string;
}

interface TermFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: OfficerTermInput, termId?: string) => Promise<{ success: boolean; error?: string }>;
  editingTerm?: OfficerTerm | null;
  members: MemberOption[];
  defaultTermName?: string;
}

export function TermFormDialog({
  isOpen,
  onClose,
  onSubmit,
  editingTerm,
  members,
  defaultTermName = "",
}: TermFormDialogProps) {
  const [termName, setTermName] = useState(editingTerm?.termName || defaultTermName || "A.Y. 2025-2026");
  const [roleTitle, setRoleTitle] = useState(editingTerm?.roleTitle || "");
  const [holderName, setHolderName] = useState(editingTerm?.holderName || "");
  const [selectedMemberId, setSelectedMemberId] = useState(editingTerm?.memberId || "");
  const [startDate, setStartDate] = useState(editingTerm?.startDate || "2025-06-01");
  const [endDate, setEndDate] = useState(editingTerm?.endDate || "2026-05-31");

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleMemberSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedMemberId(val);
    if (val) {
      const match = members.find((m) => m.id === val);
      if (match) {
        setHolderName(match.fullName);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanTerm = termName.trim();
    const cleanRole = roleTitle.trim();
    const cleanHolder = holderName.trim();

    if (cleanTerm.length < 2) {
      setErrorMessage(TERMS_ERROR_MESSAGES.invalid_term_name);
      return;
    }
    if (cleanRole.length < 2) {
      setErrorMessage(TERMS_ERROR_MESSAGES.invalid_role_title);
      return;
    }
    if (cleanHolder.length < 2) {
      setErrorMessage(TERMS_ERROR_MESSAGES.invalid_holder_name);
      return;
    }

    if (!areDatesOrdered(startDate, endDate)) {
      setErrorMessage(TERMS_ERROR_MESSAGES.invalid_dates);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await onSubmit(
        {
          termName: cleanTerm,
          roleTitle: cleanRole,
          holderName: cleanHolder,
          startDate,
          endDate,
          memberId: selectedMemberId || null,
        },
        editingTerm?.id
      );

      if (!res.success) {
        setErrorMessage(res.error || TERMS_ERROR_MESSAGES.failed);
      } else {
        onClose();
      }
    } catch {
      setErrorMessage(TERMS_ERROR_MESSAGES.failed);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog onDismiss={onClose} labelledBy="term-dialog-title" maxWidth={500}>
      <DialogHeader
        title={editingTerm ? "Edit Officer Term" : "Record Officer Term"}
        subtitle="Record who held which officer role and the exact term dates."
        onClose={onClose}
      />

      <form onSubmit={handleSubmit}>
        <DialogBody>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {errorMessage && (
              <div
                role="alert"
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  padding: "12px 14px",
                  borderRadius: 12,
                  backgroundColor: "#fef2f2",
                  border: "1px solid #fecaca",
                  color: "#b91c1c",
                  fontSize: 13.5,
                  lineHeight: 1.45,
                }}
              >
                <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Term Name */}
            <div>
              <label
                htmlFor="term-name"
                style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--color-ink)",
                  marginBottom: 6,
                }}
              >
                Term
              </label>
              <input
                id="term-name"
                type="text"
                required
                value={termName}
                onChange={(e) => setTermName(e.target.value)}
                placeholder="e.g. A.Y. 2025-2026"
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: 10,
                  border: "1px solid var(--color-line)",
                  backgroundColor: "var(--color-surface)",
                  color: "var(--color-ink)",
                  fontSize: 14,
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* Role Title */}
            <div>
              <label
                htmlFor="role-title"
                style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--color-ink)",
                  marginBottom: 6,
                }}
              >
                Role
              </label>
              <input
                id="role-title"
                type="text"
                required
                value={roleTitle}
                onChange={(e) => setRoleTitle(e.target.value)}
                placeholder="e.g. President, Vice President, Secretary"
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: 10,
                  border: "1px solid var(--color-line)",
                  backgroundColor: "var(--color-surface)",
                  color: "var(--color-ink)",
                  fontSize: 14,
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* Holder (Member dropdown & manual input) */}
            <div>
              <label
                htmlFor="holder-select"
                style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--color-ink)",
                  marginBottom: 6,
                }}
              >
                Holder
              </label>
              {members.length > 0 && (
                <select
                  id="holder-select"
                  value={selectedMemberId}
                  onChange={handleMemberSelect}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: 10,
                    border: "1px solid var(--color-line)",
                    backgroundColor: "var(--color-surface)",
                    color: "var(--color-ink)",
                    fontSize: 14,
                    marginBottom: 8,
                    boxSizing: "border-box",
                  }}
                >
                  <option value="">Select from organization roster (optional)...</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.fullName} ({m.email})
                    </option>
                  ))}
                </select>
              )}
              <input
                id="holder-name"
                type="text"
                required
                value={holderName}
                onChange={(e) => setHolderName(e.target.value)}
                placeholder="Person's full name"
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: 10,
                  border: "1px solid var(--color-line)",
                  backgroundColor: "var(--color-surface)",
                  color: "var(--color-ink)",
                  fontSize: 14,
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* Starts & Ends Dates */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div>
                <label
                  htmlFor="term-start-date"
                  style={{
                    display: "block",
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--color-ink)",
                    marginBottom: 6,
                  }}
                >
                  Starts
                </label>
                <input
                  id="term-start-date"
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: 10,
                    border: "1px solid var(--color-line)",
                    backgroundColor: "var(--color-surface)",
                    color: "var(--color-ink)",
                    fontSize: 14,
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div>
                <label
                  htmlFor="term-end-date"
                  style={{
                    display: "block",
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--color-ink)",
                    marginBottom: 6,
                  }}
                >
                  Ends
                </label>
                <input
                  id="term-end-date"
                  type="date"
                  required
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: 10,
                    border: "1px solid var(--color-line)",
                    backgroundColor: "var(--color-surface)",
                    color: "var(--color-ink)",
                    fontSize: 14,
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>
          </div>
        </DialogBody>

        <DialogFooter>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            style={{
              padding: "9px 16px",
              borderRadius: 10,
              border: "1px solid var(--color-line)",
              backgroundColor: "transparent",
              color: "var(--color-ink)",
              fontSize: 13.5,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "9px 18px",
              borderRadius: 10,
              border: "none",
              backgroundColor: "var(--color-accent)",
              color: "#ffffff",
              fontSize: 13.5,
              fontWeight: 600,
              cursor: isSubmitting ? "not-allowed" : "pointer",
              opacity: isSubmitting ? 0.7 : 1,
            }}
          >
            {isSubmitting && <Loader2 size={16} className="animate-spin" />}
            <span>{editingTerm ? "Save Changes" : "Record Term"}</span>
          </button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
