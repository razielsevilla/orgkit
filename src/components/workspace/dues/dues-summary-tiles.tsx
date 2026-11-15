"use client";

import React from "react";
import { CheckCircle2, Clock, AlertTriangle, XCircle, ArrowUpRight } from "lucide-react";
import type { DuesPeriodSummary } from "@/src/lib/dues/dues-dashboard";
import { formatPeso, calculateCollectionRate } from "@/src/lib/dues/dues-dashboard";

interface DuesSummaryTilesProps {
  summary: DuesPeriodSummary;
  onOpenReviewQueue?: () => void;
  onSelectStatusFilter?: (status: "all" | "paid" | "pending" | "rejected" | "unpaid") => void;
  activeStatusFilter?: string;
}

export function DuesSummaryTiles({
  summary,
  onOpenReviewQueue,
  onSelectStatusFilter,
  activeStatusFilter = "all",
}: DuesSummaryTilesProps) {
  const collectionRate = calculateCollectionRate(
    summary.collectedAmount,
    summary.expectedAmount
  );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 16,
        width: "100%",
        marginBottom: 24,
      }}
    >
      <style>{`
        .orgkit-dues-summary-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          width: 100%;
        }
        @media (max-width: 768px) {
          .orgkit-dues-summary-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 480px) {
          .orgkit-dues-summary-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      {/* Main Collection Progress Banner */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          padding: "20px 22px",
          backgroundColor: "var(--color-surface)",
          border: "1px solid var(--color-line)",
          borderRadius: 14,
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <div>
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: "var(--color-muted)",
              }}
            >
              Collection Status
            </span>
            <h2
              style={{
                margin: "4px 0 0 0",
                fontSize: "clamp(20px, 2.2vw, 26px)",
                fontWeight: 800,
                color: "var(--color-ink)",
                letterSpacing: "-0.02em",
              }}
            >
              Collected {formatPeso(summary.collectedAmount)} of {formatPeso(summary.expectedAmount)}
            </h2>
          </div>

          <div style={{ textAlign: "right" }}>
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: collectionRate === 100 ? "var(--color-success-strong, #10b981)" : "var(--color-accent)",
              }}
            >
              {collectionRate}% collected
            </span>
            <div
              style={{
                fontSize: 12.5,
                color: "var(--color-muted)",
                marginTop: 2,
              }}
            >
              Outstanding:{" "}
              <span style={{ fontWeight: 600, color: "var(--color-ink)" }}>
                {formatPeso(summary.outstandingAmount)}
              </span>
            </div>
          </div>
        </div>

        {/* Visual Progress Bar */}
        <div
          role="progressbar"
          aria-valuenow={collectionRate}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Collection progress: ${collectionRate}%`}
          style={{
            width: "100%",
            height: 8,
            backgroundColor: "color-mix(in srgb, var(--color-line) 70%, transparent)",
            borderRadius: 9999,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${collectionRate}%`,
              height: "100%",
              backgroundColor: "var(--color-accent)",
              borderRadius: 9999,
              transition: "width 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          />
        </div>
      </div>

      {/* 4 Status Breakdown Tiles */}
      <div className="orgkit-dues-summary-grid">
        {/* Paid Tile */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => onSelectStatusFilter?.("paid")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onSelectStatusFilter?.("paid");
            }
          }}
          aria-label={`Paid: ${summary.paidCount} members`}
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "16px 18px",
            backgroundColor: "var(--color-surface)",
            border: `1px solid ${
              activeStatusFilter === "paid"
                ? "var(--color-accent)"
                : "var(--color-line)"
            }`,
            borderRadius: 12,
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.03)",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-muted)" }}>Paid</span>
            <CheckCircle2 size={16} style={{ color: "#10b981" }} />
          </div>
          <div style={{ marginTop: 10 }}>
            <span style={{ fontSize: 26, fontWeight: 800, color: "var(--color-ink)", lineHeight: 1 }}>
              {summary.paidCount}
            </span>
            <p style={{ margin: "4px 0 0 0", fontSize: 11.5, color: "var(--color-muted)" }}>
              Verified payments
            </p>
          </div>
        </div>

        {/* Pending Review Tile */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            if (summary.pendingCount > 0 && onOpenReviewQueue) {
              onOpenReviewQueue();
            } else {
              onSelectStatusFilter?.("pending");
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              if (summary.pendingCount > 0 && onOpenReviewQueue) {
                onOpenReviewQueue();
              } else {
                onSelectStatusFilter?.("pending");
              }
            }
          }}
          aria-label={`Pending review: ${summary.pendingCount} submissions`}
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "16px 18px",
            backgroundColor: summary.pendingCount > 0
              ? "color-mix(in srgb, #f59e0b 5%, var(--color-surface))"
              : "var(--color-surface)",
            border: `1px solid ${
              summary.pendingCount > 0
                ? "color-mix(in srgb, #f59e0b 35%, var(--color-line))"
                : "var(--color-line)"
            }`,
            borderRadius: 12,
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.03)",
            cursor: "pointer",
            transition: "all 0.15s ease",
            position: "relative",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-muted)" }}>
              Pending review
            </span>
            <Clock size={16} style={{ color: "#f59e0b" }} />
          </div>
          <div style={{ marginTop: 10 }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
              <span style={{ fontSize: 26, fontWeight: 800, color: "var(--color-ink)", lineHeight: 1 }}>
                {summary.pendingCount}
              </span>
              {summary.pendingCount > 0 && onOpenReviewQueue && (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 2,
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#d97706",
                  }}
                >
                  Review <ArrowUpRight size={12} />
                </span>
              )}
            </div>
            <p style={{ margin: "4px 0 0 0", fontSize: 11.5, color: "var(--color-muted)" }}>
              {summary.pendingCount > 0 ? "Click to open review" : "No pending submissions"}
            </p>
          </div>
        </div>

        {/* Rejected Tile */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => onSelectStatusFilter?.("rejected")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onSelectStatusFilter?.("rejected");
            }
          }}
          aria-label={`Rejected: ${summary.rejectedCount} members`}
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "16px 18px",
            backgroundColor: "var(--color-surface)",
            border: `1px solid ${
              activeStatusFilter === "rejected"
                ? "var(--color-accent)"
                : "var(--color-line)"
            }`,
            borderRadius: 12,
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.03)",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-muted)" }}>Rejected</span>
            <XCircle size={16} style={{ color: "#ef4444" }} />
          </div>
          <div style={{ marginTop: 10 }}>
            <span style={{ fontSize: 26, fontWeight: 800, color: "var(--color-ink)", lineHeight: 1 }}>
              {summary.rejectedCount}
            </span>
            <p style={{ margin: "4px 0 0 0", fontSize: 11.5, color: "var(--color-muted)" }}>
              No resubmission
            </p>
          </div>
        </div>

        {/* Unpaid Tile */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => onSelectStatusFilter?.("unpaid")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onSelectStatusFilter?.("unpaid");
            }
          }}
          aria-label={`Unpaid: ${summary.unpaidCount} members`}
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "16px 18px",
            backgroundColor: "var(--color-surface)",
            border: `1px solid ${
              activeStatusFilter === "unpaid"
                ? "var(--color-accent)"
                : "var(--color-line)"
            }`,
            borderRadius: 12,
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.03)",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-muted)" }}>Unpaid</span>
            <AlertTriangle size={16} style={{ color: "var(--color-muted)" }} />
          </div>
          <div style={{ marginTop: 10 }}>
            <span style={{ fontSize: 26, fontWeight: 800, color: "var(--color-ink)", lineHeight: 1 }}>
              {summary.unpaidCount}
            </span>
            <p style={{ margin: "4px 0 0 0", fontSize: 11.5, color: "var(--color-muted)" }}>
              Awaiting payment
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
