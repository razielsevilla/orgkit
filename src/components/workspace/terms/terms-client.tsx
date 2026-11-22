"use client";

import React, { useMemo, useState } from "react";
import type { OfficerTerm, WorkspaceTermsData } from "@/src/app/(workspace)/terms-actions";
import {
  createOfficerTermAction,
  updateOfficerTermAction,
  deleteOfficerTermAction,
} from "@/src/app/(workspace)/terms-actions";
import { TermsStyles } from "./terms-styles";
import { TermsHeader } from "./terms-header";
import { TermsEmptyState } from "./terms-empty-state";
import { TermGroupCard, type TermGroup } from "./term-group-card";
import { TermFormDialog } from "./term-form-dialog";
import { Dialog, DialogHeader, DialogBody, DialogFooter } from "@/src/components/ui/dialog";
import { AlertCircle, AlertTriangle, Loader2 } from "lucide-react";
import type { OfficerTermInput } from "@/src/lib/terms/terms-validation";

interface TermsClientProps {
  initialData: WorkspaceTermsData;
}

export function TermsClient({ initialData }: TermsClientProps) {
  const [terms, setTerms] = useState<OfficerTerm[]>(initialData.terms);
  const [activeFilter, setActiveFilter] = useState<"all" | "current" | "past">("all");

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTerm, setEditingTerm] = useState<OfficerTerm | null>(null);

  const [deletingTerm, setDeletingTerm] = useState<OfficerTerm | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Group terms by term name, sorted newest first
  const groupedTerms = useMemo(() => {
    const map = new Map<string, TermGroup>();

    for (const term of terms) {
      const key = term.termName;
      if (!map.has(key)) {
        map.set(key, {
          termName: term.termName,
          startDate: term.startDate,
          endDate: term.endDate,
          isEnded: term.isEnded,
          terms: [],
        });
      }
      const group = map.get(key)!;
      group.terms.push(term);
      // Keep earliest start and latest end for the group
      if (term.startDate < group.startDate) group.startDate = term.startDate;
      if (term.endDate > group.endDate) group.endDate = term.endDate;
      if (!term.isEnded) group.isEnded = false;
    }

    // Sort groups newest first: by startDate desc, then endDate desc
    const groups = Array.from(map.values()).sort((a, b) => {
      if (a.startDate !== b.startDate) return b.startDate.localeCompare(a.startDate);
      return b.endDate.localeCompare(a.endDate);
    });

    // Sort terms within each group newest first
    for (const group of groups) {
      group.terms.sort((a, b) => {
        if (a.startDate !== b.startDate) return b.startDate.localeCompare(a.startDate);
        return a.roleTitle.localeCompare(b.roleTitle);
      });
    }

    return groups;
  }, [terms]);

  // Filter groups
  const filteredGroups = useMemo(() => {
    if (activeFilter === "current") {
      return groupedTerms.filter((g) => !g.isEnded);
    }
    if (activeFilter === "past") {
      return groupedTerms.filter((g) => g.isEnded);
    }
    return groupedTerms;
  }, [groupedTerms, activeFilter]);

  const currentCount = useMemo(() => terms.filter((t) => !t.isEnded).length, [terms]);
  const pastCount = useMemo(() => terms.filter((t) => t.isEnded).length, [terms]);

  const handleOpenAddDialog = () => {
    setEditingTerm(null);
    setIsFormOpen(true);
  };

  const handleOpenEditDialog = (term: OfficerTerm) => {
    setEditingTerm(term);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (input: OfficerTermInput, termId?: string) => {
    setActionError(null);
    if (termId) {
      const res = await updateOfficerTermAction(initialData.orgId, termId, input);
      if (!res.success) {
        return { success: false, error: res.errorMessage };
      }
      const today = new Date().toISOString().split("T")[0];
      setTerms((prev) =>
        prev.map((t) =>
          t.id === termId
            ? {
                ...t,
                termName: input.termName,
                roleTitle: input.roleTitle,
                holderName: input.holderName,
                startDate: input.startDate,
                endDate: input.endDate,
                memberId: input.memberId || null,
                isEnded: input.endDate < today,
              }
            : t
        )
      );
      return { success: true };
    } else {
      const res = await createOfficerTermAction(initialData.orgId, input);
      if (!res.success || !res.data) {
        return { success: false, error: res.errorMessage };
      }
      const today = new Date().toISOString().split("T")[0];
      const newTerm: OfficerTerm = {
        id: res.data.id,
        orgId: initialData.orgId,
        memberId: input.memberId || null,
        holderName: input.holderName,
        roleTitle: input.roleTitle,
        termName: input.termName,
        startDate: input.startDate,
        endDate: input.endDate,
        isEnded: input.endDate < today,
        createdAt: new Date().toISOString(),
      };
      setTerms((prev) => [newTerm, ...prev]);
      return { success: true };
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingTerm) return;
    setIsDeleting(true);
    setActionError(null);
    try {
      const res = await deleteOfficerTermAction(initialData.orgId, deletingTerm.id);
      if (!res.success) {
        setActionError(res.errorMessage || "Failed to delete term.");
      } else {
        setTerms((prev) => prev.filter((t) => t.id !== deletingTerm.id));
        setDeletingTerm(null);
      }
    } catch {
      setActionError("An unexpected error occurred while deleting the term.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      style={{
        height: "100%",
        overflowY: "auto",
        padding: "36px clamp(16px, 4vw, 36px) 60px clamp(16px, 4vw, 36px)",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: "100%",
      }}
    >
      <div
        className="orgkit-terms-shell"
        style={{
          width: "100%",
          maxWidth: 960,
          margin: "0 auto",
          position: "relative",
          animation: "cardPopout 0.45s cubic-bezier(0.16, 1.25, 0.38, 1) both",
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
        <TermsStyles />

      {/* Global Error Banner */}
      {actionError && (
        <div
          role="alert"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "12px 16px",
            borderRadius: 12,
            backgroundColor: "#fef2f2",
            border: "1px solid #fecaca",
            color: "#b91c1c",
            fontSize: 13.5,
          }}
        >
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <span>{actionError}</span>
        </div>
      )}

      {/* Header */}
      <TermsHeader
        orgName={initialData.orgName}
        totalTerms={terms.length}
        currentCount={currentCount}
        pastCount={pastCount}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        isAdmin={initialData.isAdmin}
        onAddTerm={handleOpenAddDialog}
      />

      {/* Terms Content: Empty State vs Grouped List */}
      {terms.length === 0 ? (
        <TermsEmptyState
          isAdmin={initialData.isAdmin}
          onAddTerm={handleOpenAddDialog}
        />
      ) : filteredGroups.length === 0 ? (
        <div
          style={{
            padding: 40,
            textAlign: "center",
            backgroundColor: "var(--color-surface)",
            borderRadius: 20,
            border: "1px solid var(--color-line)",
            color: "var(--color-muted)",
            fontSize: 14,
          }}
        >
          No terms found matching the current filter.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {filteredGroups.map((group) => (
            <TermGroupCard
              key={group.termName}
              group={group}
              isAdmin={initialData.isAdmin}
              onEditTerm={handleOpenEditDialog}
              onDeleteTerm={setDeletingTerm}
            />
          ))}
        </div>
      )}

      {/* Form Dialog for Record / Edit */}
      <TermFormDialog
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleFormSubmit}
        editingTerm={editingTerm}
        members={initialData.members}
      />

      {/* Delete Confirmation Dialog */}
      {deletingTerm && (
        <Dialog
          role="alertdialog"
          labelledBy="delete-term-title"
          onDismiss={() => setDeletingTerm(null)}
          maxWidth={440}
        >
          <DialogHeader
            titleId="delete-term-title"
            title="Delete Officer Term?"
            description="Are you sure you want to delete this recorded term?"
            onClose={() => setDeletingTerm(null)}
          />
          <DialogBody>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  backgroundColor: "#fee2e2",
                  color: "#dc2626",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <AlertTriangle size={18} />
              </div>
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: "var(--color-ink)" }}>
                This will remove the record of <strong>{deletingTerm.holderName}</strong> as{" "}
                <strong>{deletingTerm.roleTitle}</strong> for <strong>{deletingTerm.termName}</strong>.
              </p>
            </div>
          </DialogBody>
          <DialogFooter>
            <button
              type="button"
              disabled={isDeleting}
              onClick={() => setDeletingTerm(null)}
              style={{
                padding: "8px 14px",
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
              type="button"
              disabled={isDeleting}
              onClick={handleConfirmDelete}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 16px",
                borderRadius: 10,
                border: "none",
                backgroundColor: "#dc2626",
                color: "#ffffff",
                fontSize: 13.5,
                fontWeight: 600,
                cursor: isDeleting ? "not-allowed" : "pointer",
                opacity: isDeleting ? 0.7 : 1,
              }}
            >
              {isDeleting && <Loader2 size={15} className="animate-spin" />}
              <span>Delete Term</span>
            </button>
          </DialogFooter>
        </Dialog>
      )}
      </div>
    </div>
  );
}
