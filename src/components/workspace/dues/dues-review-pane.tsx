"use client";

import React, { useState } from "react";
import { Check, CheckCircle2, Copy, XCircle, ArrowLeft, Loader2 } from "lucide-react";
import type { DuesReviewQueueItem } from "@/src/lib/dues/dues-review";
import { formatPesos } from "@/src/components/workspace/dues/dues-table";
import {
  DuesReviewQueueItemRow,
  formatSubmissionTime,
} from "./dues-review-queue-item";
import { DuesScreenshotViewer } from "./dues-screenshot-viewer";
import { DuesReviewEmptyState } from "./dues-review-empty-state";

interface DuesReviewPaneProps {
  orgId: string;
  periodId: string;
  periodName: string;
  items: DuesReviewQueueItem[];
  selectedItem: DuesReviewQueueItem | null;
  onSelectItem: (item: DuesReviewQueueItem | null) => void;
  onVerify: (paymentId: string) => Promise<{ success: boolean; errorMessage?: string }>;
  onOpenReject: (item: DuesReviewQueueItem) => void;
  isVerifying?: boolean;
}

export function DuesReviewPane({
  orgId,
  periodName,
  items,
  selectedItem,
  onSelectItem,
  onVerify,
  onOpenReject,
  isVerifying = false,
}: DuesReviewPaneProps) {
  const [copiedRef, setCopiedRef] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  if (items.length === 0) {
    return <DuesReviewEmptyState periodName={periodName} />;
  }

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedRef(true);
      setTimeout(() => setCopiedRef(false), 2000);
    } catch {
      // Fallback or ignore
    }
  };

  const handleVerifyClick = async (paymentId: string) => {
    setVerifyError(null);
    const res = await onVerify(paymentId);
    if (!res.success) {
      setVerifyError(res.errorMessage || "Failed to verify payment.");
    }
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
        gap: 20,
        width: "100%",
        boxSizing: "border-box",
        alignItems: "start",
      }}
    >
      {/* Left column: Review queue list */}
      <div
        className={selectedItem ? "hidden md:flex" : "flex"}
        style={{
          flexDirection: "column",
          gap: 12,
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 4px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                fontSize: "0.9375rem",
                fontWeight: 600,
                color: "var(--color-ink)",
              }}
            >
              Review queue
            </span>
            <span
              style={{
                fontSize: "0.75rem",
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: 12,
                backgroundColor: "color-mix(in srgb, #f59e0b 16%, transparent)",
                color: "#b45309",
              }}
            >
              {items.length} pending
            </span>
          </div>
          <span style={{ fontSize: "0.75rem", color: "var(--color-ink-muted)" }}>
            Oldest first
          </span>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            maxHeight: "calc(100vh - 280px)",
            overflowY: "auto",
          }}
        >
          {items.map((item) => (
            <DuesReviewQueueItemRow
              key={item.paymentId}
              item={item}
              isSelected={selectedItem?.paymentId === item.paymentId}
              onSelect={(clicked) => {
                onSelectItem(clicked);
                setVerifyError(null);
              }}
            />
          ))}
        </div>
      </div>

      {/* Right column: Selected item detail view */}
      {selectedItem ? (
        <div
          className="flex"
          style={{
            flexDirection: "column",
            gap: 16,
            padding: 20,
            borderRadius: 18,
            backgroundColor: "var(--color-surface)",
            border: "1px solid var(--color-line)",
            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.04)",
            width: "100%",
            boxSizing: "border-box",
          }}
        >
          {/* Mobile Back Button */}
          <div className="flex md:hidden" style={{ marginBottom: -4 }}>
            <button
              type="button"
              onClick={() => onSelectItem(null)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 10px",
                fontSize: "0.8125rem",
                fontWeight: 500,
                color: "var(--color-ink)",
                backgroundColor: "color-mix(in srgb, var(--color-line) 40%, transparent)",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
              }}
            >
              <ArrowLeft size={16} />
              <span>Back to queue</span>
            </button>
          </div>

          {/* Submission Info Bar */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              flexWrap: "wrap",
              gap: 12,
              paddingBottom: 14,
              borderBottom: "1px solid var(--color-line)",
            }}
          >
            <div>
              <h4
                style={{
                  margin: "0 0 2px 0",
                  fontSize: "1.125rem",
                  fontWeight: 700,
                  color: "var(--color-ink)",
                }}
              >
                {selectedItem.memberName}
              </h4>
              <span style={{ fontSize: "0.8125rem", color: "var(--color-ink-muted)" }}>
                {selectedItem.memberEmail} • Submitted {formatSubmissionTime(selectedItem.submittedAt)}
              </span>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
                gap: 2,
              }}
            >
              <span style={{ fontSize: "0.75rem", color: "var(--color-ink-muted)", fontWeight: 500 }}>
                Amount to match
              </span>
              <span
                style={{
                  fontSize: "1.25rem",
                  fontWeight: 800,
                  color: "#059669",
                }}
              >
                {formatPesos(selectedItem.amount)}
              </span>
            </div>
          </div>

          {/* Reference Number Copy Card */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 14px",
              borderRadius: 12,
              backgroundColor: "color-mix(in srgb, var(--color-line) 30%, transparent)",
              border: "1px solid var(--color-line)",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
              <span
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  color: "var(--color-ink-muted)",
                }}
              >
                GCash Reference Number
              </span>
              <span
                style={{
                  fontFamily: "monospace",
                  fontSize: "1rem",
                  fontWeight: 700,
                  color: "var(--color-ink)",
                  letterSpacing: "0.05em",
                  wordBreak: "break-all",
                }}
              >
                {selectedItem.referenceNo}
              </span>
            </div>

            <button
              type="button"
              onClick={() => handleCopy(selectedItem.referenceNo)}
              aria-label="Copy reference number"
              style={{
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid var(--color-line)",
                backgroundColor: "var(--color-surface)",
                color: copiedRef ? "#059669" : "var(--color-ink)",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: "0.8125rem",
                fontWeight: 600,
                flexShrink: 0,
                transition: "all 0.15s ease",
              }}
            >
              {copiedRef ? <Check size={14} /> : <Copy size={14} />}
              <span>{copiedRef ? "Copied" : "Copy"}</span>
            </button>
          </div>

          {/* Screenshot Display */}
          <DuesScreenshotViewer
            orgId={orgId}
            screenshotPath={selectedItem.screenshotPath}
            referenceNo={selectedItem.referenceNo}
          />

          {/* Inline Action Error */}
          {verifyError && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 14px",
                borderRadius: 8,
                backgroundColor: "color-mix(in srgb, #ef4444 10%, transparent)",
                color: "#b91c1c",
                fontSize: "0.8125rem",
              }}
            >
              <XCircle size={16} style={{ flexShrink: 0 }} />
              <span>{verifyError}</span>
            </div>
          )}

          {/* Action Decision Buttons */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              marginTop: 4,
            }}
          >
            <button
              type="button"
              onClick={() => onOpenReject(selectedItem)}
              disabled={isVerifying}
              style={{
                padding: "12px 16px",
                borderRadius: 12,
                border: "1.5px solid color-mix(in srgb, #ef4444 40%, var(--color-line))",
                backgroundColor: "var(--color-surface)",
                color: "#b91c1c",
                fontSize: "0.9375rem",
                fontWeight: 600,
                cursor: isVerifying ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                minHeight: 46,
                transition: "all 0.15s ease",
              }}
            >
              <XCircle size={18} />
              <span>Reject payment</span>
            </button>

            <button
              type="button"
              onClick={() => handleVerifyClick(selectedItem.paymentId)}
              disabled={isVerifying}
              style={{
                padding: "12px 16px",
                borderRadius: 12,
                border: "none",
                backgroundColor: "#059669",
                color: "#ffffff",
                fontSize: "0.9375rem",
                fontWeight: 600,
                cursor: isVerifying ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                minHeight: 46,
                boxShadow: "0 4px 14px rgba(5, 150, 105, 0.25)",
                transition: "all 0.15s ease",
              }}
            >
              {isVerifying ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Verifying...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={18} />
                  <span>Verify payment</span>
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        <div
          className="hidden md:flex"
          style={{
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: 48,
            borderRadius: 18,
            backgroundColor: "var(--color-surface)",
            border: "1px dashed var(--color-line)",
            minHeight: 340,
            textAlign: "center",
            color: "var(--color-ink-muted)",
          }}
        >
          <span style={{ fontSize: "0.9375rem", fontWeight: 500 }}>
            Select a submission from the queue to verify or reject.
          </span>
        </div>
      )}
    </div>
  );
}
