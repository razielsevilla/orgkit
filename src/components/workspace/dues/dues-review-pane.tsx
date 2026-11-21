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

function getMemberInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "—";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
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
    <div style={{ width: "100%", position: "relative" }}>
      <style>{`
        .orgkit-review-container {
          display: grid;
          grid-template-columns: 290px 1fr;
          gap: 16px;
          width: 100%;
          box-sizing: border-box;
          align-items: stretch;
        }
        .orgkit-review-queue-col {
          display: flex;
          flex-direction: column;
          gap: 10px;
          width: 100%;
          min-width: 0;
        }
        .orgkit-review-detail-col {
          display: flex;
          flex-direction: column;
          gap: 12px;
          width: 100%;
          min-width: 0;
        }
        .orgkit-review-back-btn {
          display: none !important;
        }
        @media (max-width: 768px) {
          .orgkit-review-container {
            grid-template-columns: 1fr;
            gap: 12px;
          }
          .orgkit-review-queue-col {
            display: ${selectedItem ? "none" : "flex"} !important;
          }
          .orgkit-review-detail-col {
            display: ${selectedItem ? "flex" : "none"} !important;
          }
          .orgkit-review-back-btn {
            display: inline-flex !important;
          }
        }
        @media (min-width: 769px) {
          .orgkit-review-queue-col {
            display: flex !important;
          }
          .orgkit-review-detail-col {
            display: flex !important;
          }
          .orgkit-review-back-btn {
            display: none !important;
          }
        }
      `}</style>

      <div className="orgkit-review-container">
        {/* Left column: Review queue list */}
        <div className="orgkit-review-queue-col">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "2px 4px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                style={{
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  color: "var(--color-ink)",
                }}
              >
                Review queue
              </span>
              <span
                style={{
                  fontSize: "0.6875rem",
                  fontWeight: 700,
                  padding: "2px 8px",
                  borderRadius: 9999,
                  backgroundColor: "var(--color-amber-soft, #fef3c7)",
                  color: "var(--color-amber-strong, #b45309)",
                  border: "1px solid var(--color-amber-line, #fde68a)",
                }}
              >
                {items.length} pending
              </span>
            </div>
            <span style={{ fontSize: "0.75rem", color: "var(--color-muted)" }}>
              Oldest first
            </span>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              maxHeight: 460,
              overflowY: "auto",
              paddingRight: 2,
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
          <div className="orgkit-review-detail-col">
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
                padding: "16px 18px",
                borderRadius: 16,
                backgroundColor: "var(--color-surface)",
                border: "1px solid var(--color-line)",
                boxShadow: "0 2px 12px rgba(0, 0, 0, 0.03)",
                width: "100%",
                boxSizing: "border-box",
              }}
            >
              {/* Mobile Back Button */}
              <div className="orgkit-review-back-btn">
                <button
                  type="button"
                  onClick={() => onSelectItem(null)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 10px",
                    fontSize: "0.8125rem",
                    fontWeight: 600,
                    color: "var(--color-ink)",
                    backgroundColor: "color-mix(in srgb, var(--color-base) 80%, transparent)",
                    border: "1px solid var(--color-line)",
                    borderRadius: 8,
                    cursor: "pointer",
                    marginBottom: 2,
                  }}
                >
                  <ArrowLeft size={15} />
                  <span>Back to queue</span>
                </button>
              </div>

              {/* Profile Header Bar */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  paddingBottom: 10,
                  borderBottom: "1px solid var(--color-line)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                  <div
                    aria-hidden="true"
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: "50%",
                      backgroundColor: "color-mix(in srgb, var(--color-accent) 12%, var(--color-surface))",
                      border: "1px solid color-mix(in srgb, var(--color-accent) 24%, transparent)",
                      color: "var(--color-accent-strong)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.8125rem",
                      fontWeight: 700,
                      flexShrink: 0,
                      letterSpacing: "0.02em",
                    }}
                  >
                    {getMemberInitials(selectedItem.memberName)}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                    <h4
                      style={{
                        margin: 0,
                        fontSize: "1rem",
                        fontWeight: 700,
                        color: "var(--color-ink)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {selectedItem.memberName}
                    </h4>
                    <span
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--color-muted)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {selectedItem.memberEmail} • Submitted {formatSubmissionTime(selectedItem.submittedAt)}
                    </span>
                  </div>
                </div>

                <span
                  style={{
                    fontSize: "0.6875rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    padding: "2px 8px",
                    borderRadius: 9999,
                    backgroundColor: "var(--color-amber-soft, #fef3c7)",
                    color: "var(--color-amber-strong, #b45309)",
                    border: "1px solid var(--color-amber-line, #fde68a)",
                    flexShrink: 0,
                  }}
                >
                  Pending
                </span>
              </div>

              {/* Match Comparison Strip: Amount & Reference */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1.25fr",
                  gap: 12,
                  padding: "10px 14px",
                  borderRadius: 12,
                  backgroundColor: "color-mix(in srgb, var(--color-base) 45%, var(--color-surface))",
                  border: "1px solid var(--color-line)",
                  alignItems: "center",
                }}
              >
                {/* Target Amount */}
                <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  <span
                    style={{
                      fontSize: "0.6875rem",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      color: "var(--color-muted)",
                    }}
                  >
                    Amount to match
                  </span>
                  <span
                    style={{
                      fontSize: "1.375rem",
                      fontWeight: 800,
                      color: "var(--color-accent-strong)",
                      lineHeight: 1.2,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {formatPesos(selectedItem.amount)}
                  </span>
                </div>

                {/* GCash Reference */}
                <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                  <span
                    style={{
                      fontSize: "0.6875rem",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      color: "var(--color-muted)",
                    }}
                  >
                    GCash Reference Number
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span
                      style={{
                        fontFamily: "monospace",
                        fontSize: "0.875rem",
                        fontWeight: 700,
                        color: "var(--color-ink)",
                        letterSpacing: "0.03em",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {selectedItem.referenceNo}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(selectedItem.referenceNo)}
                      aria-label="Copy reference number"
                      style={{
                        padding: "4px 8px",
                        borderRadius: 6,
                        border: "1px solid var(--color-line)",
                        backgroundColor: copiedRef
                          ? "color-mix(in srgb, var(--color-accent) 12%, var(--color-surface))"
                          : "var(--color-surface)",
                        color: copiedRef ? "var(--color-accent-strong)" : "var(--color-ink)",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        flexShrink: 0,
                        transition: "all 0.15s ease",
                      }}
                    >
                      {copiedRef ? <Check size={12} /> : <Copy size={12} />}
                      <span>{copiedRef ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Screenshot Preview */}
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
                    padding: "8px 12px",
                    borderRadius: 8,
                    backgroundColor: "color-mix(in srgb, #ef4444 10%, transparent)",
                    color: "var(--color-danger-strong)",
                    fontSize: "0.8125rem",
                  }}
                >
                  <XCircle size={15} style={{ flexShrink: 0 }} />
                  <span>{verifyError}</span>
                </div>
              )}

              {/* Action Decision Buttons */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1.25fr",
                  gap: 10,
                  width: "100%",
                  marginTop: 2,
                }}
              >
                <button
                  type="button"
                  onClick={() => onOpenReject(selectedItem)}
                  disabled={isVerifying}
                  style={{
                    padding: "10px 14px",
                    borderRadius: 10,
                    border: "1.5px solid var(--color-danger-line)",
                    backgroundColor: "var(--color-surface)",
                    color: "var(--color-danger-strong)",
                    fontSize: "0.875rem",
                    fontWeight: 600,
                    cursor: isVerifying ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    minHeight: 42,
                    boxSizing: "border-box",
                    transition: "all 0.15s ease",
                  }}
                >
                  <XCircle size={16} />
                  <span>Reject payment</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleVerifyClick(selectedItem.paymentId)}
                  disabled={isVerifying}
                  style={{
                    padding: "10px 14px",
                    borderRadius: 10,
                    border: "1px solid var(--color-accent-strong)",
                    backgroundColor: "var(--color-accent)",
                    color: "#ffffff",
                    fontSize: "0.875rem",
                    fontWeight: 600,
                    cursor: isVerifying ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    minHeight: 42,
                    boxSizing: "border-box",
                    boxShadow: "0 2px 10px rgba(5, 150, 105, 0.28)",
                    transition: "all 0.15s ease",
                  }}
                >
                  {isVerifying ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} />
                      <span>Verify payment</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div
            className="orgkit-review-detail-col"
            style={{
              alignItems: "center",
              justifyContent: "center",
              padding: 40,
              borderRadius: 16,
              backgroundColor: "var(--color-surface)",
              border: "1px dashed var(--color-line)",
              minHeight: 320,
              textAlign: "center",
              color: "var(--color-muted)",
              boxSizing: "border-box",
            }}
          >
            <span style={{ fontSize: "0.875rem", fontWeight: 500 }}>
              Select a submission from the queue to verify or reject.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
