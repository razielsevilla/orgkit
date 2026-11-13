"use client";

import React, { useState } from "react";
import { AlertCircle } from "lucide-react";
import type { DuesPeriod } from "@/src/app/(workspace)/dues-actions";
import {
  createDuesPeriod,
  updateDuesPeriod,
  closeDuesPeriod,
} from "@/src/app/(workspace)/dues-actions";
import { DuesHeader } from "./dues-header";
import { DuesTable } from "./dues-table";
import { DuesMobileCard } from "./dues-mobile-card";
import { DuesEmptyState } from "./dues-empty-state";
import { DuesPeriodDialog } from "./dues-period-dialog";
import { ClosePeriodDialog } from "./close-period-dialog";
import { FloatingIconsDecor } from "@/src/components/decor/floating-decor";

interface DuesClientProps {
  rawId: string;
  initialPeriods: DuesPeriod[];
}

export function DuesClient({ rawId, initialPeriods }: DuesClientProps) {
  const [periods, setPeriods] = useState<DuesPeriod[]>(initialPeriods);
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState<DuesPeriod | null>(null);
  const [closingPeriod, setClosingPeriod] = useState<DuesPeriod | null>(null);
  const [toastError, setToastError] = useState<string | null>(null);

  const openCount = periods.filter((p) => p.status === "open").length;

  const handleCreateSave = async (input: {
    name: string;
    amount: number;
    dueOn: string;
  }) => {
    setToastError(null);
    const res = await createDuesPeriod(rawId, input);
    if (res.success && res.data) {
      const newPeriod: DuesPeriod = {
        id: res.data.id,
        orgId: rawId,
        name: input.name,
        amount: input.amount,
        dueOn: input.dueOn,
        status: "open",
        paymentCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setPeriods((prev) => [newPeriod, ...prev]);
      return { success: true };
    }
    return {
      success: false,
      errorMessage: res.errorMessage || "Failed to create dues period.",
    };
  };

  const handleEditSave = async (input: {
    name: string;
    amount: number;
    dueOn: string;
  }) => {
    if (!editingPeriod) return { success: false };
    setToastError(null);

    const res = await updateDuesPeriod(rawId, editingPeriod.id, input);
    if (res.success) {
      setPeriods((prev) =>
        prev.map((p) =>
          p.id === editingPeriod.id
            ? {
                ...p,
                name: input.name,
                amount: input.amount,
                dueOn: input.dueOn,
                updatedAt: new Date().toISOString(),
              }
            : p
        )
      );
      return { success: true };
    }
    return {
      success: false,
      errorMessage: res.errorMessage || "Failed to update dues period.",
    };
  };

  const handleConfirmClose = async (periodId: string) => {
    setToastError(null);
    const res = await closeDuesPeriod(rawId, periodId);
    if (res.success) {
      setPeriods((prev) =>
        prev.map((p) =>
          p.id === periodId
            ? { ...p, status: "closed", updatedAt: new Date().toISOString() }
            : p
        )
      );
      return { success: true };
    }
    return {
      success: false,
      errorMessage: res.errorMessage || "Failed to close dues period.",
    };
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
      <style>{`
        .orgkit-dues-desktop {
          display: block !important;
          width: 100%;
        }
        .orgkit-dues-mobile {
          display: none !important;
          width: 100%;
        }
        @media (max-width: 640px) {
          .orgkit-dues-desktop {
            display: none !important;
          }
          .orgkit-dues-mobile {
            display: flex !important;
            flex-direction: column !important;
            gap: 12px !important;
          }
        }
      `}</style>

      <div
        className="orgkit-dues-shell"
        style={{
          width: "100%",
          maxWidth: 960,
          margin: "0 auto",
          position: "relative",
          animation: "cardPopout 0.45s cubic-bezier(0.16, 1.25, 0.38, 1) both",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <DuesHeader
          totalCount={periods.length}
          openCount={openCount}
          onCreatePeriod={() => setIsNewDialogOpen(true)}
        />

        {toastError && (
          <div
            role="alert"
            style={{
              display: "flex",
              alignItems: "center",
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
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{toastError}</span>
          </div>
        )}

        {/* ── Cards / Content Container with Floating Icons Behind ── */}
        <div style={{ position: "relative", width: "100%" }}>
          {/* Floating Icons Decor positioned behind the cards in initial layout */}
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              zIndex: 0,
            }}
          >
            <FloatingIconsDecor />
          </div>

          {/* Foreground Content */}
          <div style={{ position: "relative", zIndex: 2, width: "100%" }}>
            {periods.length === 0 ? (
              <DuesEmptyState onCreatePeriod={() => setIsNewDialogOpen(true)} />
            ) : (
              <>
                <div className="orgkit-dues-desktop">
                  <DuesTable
                    periods={periods}
                    onEdit={(p) => setEditingPeriod(p)}
                    onClosePeriod={(p) => setClosingPeriod(p)}
                  />
                </div>

                <div className="orgkit-dues-mobile">
                  {periods.map((period) => (
                    <DuesMobileCard
                      key={period.id}
                      period={period}
                      onEdit={(p) => setEditingPeriod(p)}
                      onClosePeriod={(p) => setClosingPeriod(p)}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* New Period Dialog */}
      <DuesPeriodDialog
        isOpen={isNewDialogOpen}
        onClose={() => setIsNewDialogOpen(false)}
        onSave={handleCreateSave}
      />

      {/* Edit Period Dialog */}
      <DuesPeriodDialog
        isOpen={Boolean(editingPeriod)}
        period={editingPeriod}
        onClose={() => setEditingPeriod(null)}
        onSave={handleEditSave}
      />

      {/* Close Period Confirmation Dialog */}
      <ClosePeriodDialog
        isOpen={Boolean(closingPeriod)}
        period={closingPeriod}
        onClose={() => setClosingPeriod(null)}
        onConfirmClose={handleConfirmClose}
      />
    </div>
  );
}

