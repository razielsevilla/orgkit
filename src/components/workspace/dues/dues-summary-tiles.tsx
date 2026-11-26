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

  const ringRadius = 40;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset =
    ringCircumference * (1 - Math.min(Math.max(collectionRate, 0), 100) / 100);

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
          gap: 14px;
          width: 100%;
        }
        @media (max-width: 840px) {
          .orgkit-dues-summary-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 480px) {
          .orgkit-dues-summary-grid {
            grid-template-columns: 1fr;
          }
          .orgkit-dues-summary-banner-top {
            flex-direction: column !important;
            align-items: flex-start !important;
          }
          .orgkit-dues-summary-banner-meta {
            text-align: left !important;
            width: 100% !important;
            display: flex !important;
            justify-content: space-between !important;
            align-items: baseline !important;
          }
        }
        @media (max-width: 640px) {
          .orgkit-banner-divider {
            display: none !important;
          }
        }
      `}</style>

      {/* Main Collection Progress Banner (Circular Donut Ring Design) */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 16,
          padding: "20px 24px",
          backgroundColor: "var(--color-surface)",
          border: "1px solid var(--color-line)",
          borderRadius: 24,
          boxShadow: "0 2px 10px rgba(24, 24, 27, 0.03)",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        <div
          className="orgkit-dues-summary-banner-top"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
            minWidth: 0,
            flex: "1 1 420px",
          }}
        >
          {/* Circular Donut Ring Progress */}
          <div
            role="progressbar"
            aria-valuenow={collectionRate}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Collection progress: ${collectionRate}%`}
            style={{
              position: "relative",
              width: 96,
              height: 96,
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg
              width={96}
              height={96}
              viewBox="0 0 96 96"
              style={{ transform: "rotate(-90deg)" }}
              aria-hidden="true"
            >
              <circle
                cx={48}
                cy={48}
                r={ringRadius}
                fill="transparent"
                stroke="color-mix(in srgb, var(--color-accent) 16%, transparent)"
                strokeWidth={8}
              />
              <circle
                cx={48}
                cy={48}
                r={ringRadius}
                fill="transparent"
                stroke="var(--color-accent)"
                strokeWidth={8}
                strokeDasharray={ringCircumference}
                strokeDashoffset={ringOffset}
                strokeLinecap="round"
                style={{ transition: "stroke-dashoffset 0.5s ease" }}
              />
            </svg>
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
              }}
            >
              <span className="sr-only">{collectionRate}% collected</span>
              <span
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  color: "var(--color-ink)",
                  lineHeight: 1,
                  letterSpacing: "-0.02em",
                }}
              >
                {collectionRate}%
              </span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "var(--color-muted)",
                  marginTop: 4,
                  lineHeight: 1,
                }}
              >
                Collected
              </span>
            </div>
          </div>

          {/* Left Vertical Divider */}
          <div
            className="orgkit-banner-divider"
            aria-hidden="true"
            style={{
              width: 1,
              height: 64,
              backgroundColor: "var(--color-line)",
              flexShrink: 0,
            }}
          />

          {/* Title & Status Details */}
          <div style={{ minWidth: 0, flex: 1 }}>
            <span
              style={{
                fontSize: 11.5,
                fontWeight: 700,
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
                fontSize: "clamp(18px, 2.2vw, 24px)",
                fontWeight: 800,
                color: "var(--color-ink)",
                letterSpacing: "-0.02em",
                wordBreak: "break-word",
              }}
            >
              Collected {formatPeso(summary.collectedAmount)} of{" "}
              {formatPeso(summary.expectedAmount)}
            </h2>
            <p
              style={{
                margin: "4px 0 0 0",
                fontSize: 12.5,
                color: "var(--color-muted)",
                fontWeight: 500,
              }}
            >
              {summary.paidCount} of {summary.activeMemberCount}{" "}
              {summary.activeMemberCount === 1 ? "member has" : "members have"} paid
            </p>
          </div>
        </div>

        {/* Right Vertical Divider & Meta Column */}
        <div
          className="orgkit-dues-summary-banner-meta"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            flexShrink: 0,
          }}
        >
          <div
            className="orgkit-banner-divider"
            aria-hidden="true"
            style={{
              width: 1,
              height: 64,
              backgroundColor: "var(--color-line)",
              flexShrink: 0,
            }}
          />

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              textAlign: "right",
              justifyContent: "center",
            }}
          >
            <span
              style={{
                fontSize: 11.5,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: "var(--color-amber-strong, #b45309)",
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  backgroundColor: "var(--color-amber, #d97706)",
                }}
              />
              Outstanding
            </span>
            <div
              style={{
                margin: "4px 0 0 0",
                fontSize: "clamp(18px, 2.2vw, 24px)",
                fontWeight: 800,
                color: summary.outstandingAmount > 0 ? "var(--color-amber-strong, #b45309)" : "var(--color-ink)",
                letterSpacing: "-0.02em",
                lineHeight: 1.2,
              }}
            >
              {formatPeso(summary.outstandingAmount)}
            </div>
          </div>
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
            padding: "20px 22px",
            background:
              "radial-gradient(circle at 100% 100%, color-mix(in srgb, var(--color-accent) 20%, transparent) 0%, transparent 65%), var(--color-surface)",
            border: `1px solid ${
              activeStatusFilter === "paid"
                ? "var(--color-accent)"
                : "var(--color-line)"
            }`,
            borderRadius: 20,
            boxShadow:
              activeStatusFilter === "paid"
                ? "0 0 0 1px var(--color-accent), 0 2px 8px rgba(5, 150, 105, 0.1)"
                : "0 2px 8px rgba(24, 24, 27, 0.03)",
            cursor: "pointer",
            position: "relative",
            overflow: "hidden",
            transition: "all 0.15s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-1px)";
            e.currentTarget.style.boxShadow = "0 6px 18px rgba(24, 24, 27, 0.08)";
            if (activeStatusFilter !== "paid") {
              e.currentTarget.style.borderColor = "var(--color-line-strong)";
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "none";
            e.currentTarget.style.boxShadow =
              activeStatusFilter === "paid"
                ? "0 0 0 1px var(--color-accent), 0 2px 8px rgba(5, 150, 105, 0.1)"
                : "0 2px 8px rgba(24, 24, 27, 0.03)";
            if (activeStatusFilter !== "paid") {
              e.currentTarget.style.borderColor = "var(--color-line)";
            }
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <CheckCircle2 size={18} strokeWidth={2.2} style={{ color: "var(--color-accent)" }} />
            <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--color-ink)" }}>Paid</span>
          </div>
          <div style={{ marginTop: 14 }}>
            <span style={{ fontSize: 32, fontWeight: 800, color: "var(--color-ink)", lineHeight: 1, letterSpacing: "-0.02em" }}>
              {summary.paidCount}
            </span>
            <p style={{ margin: "6px 0 0 0", fontSize: 12, color: "var(--color-muted)" }}>
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
          aria-label={
            summary.pendingCount > 0 && onOpenReviewQueue
              ? `Open review queue for ${summary.pendingCount} pending submissions`
              : `Pending review: ${summary.pendingCount} submissions`
          }
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "20px 22px",
            background:
              "radial-gradient(circle at 100% 100%, color-mix(in srgb, var(--color-warning) 22%, transparent) 0%, transparent 65%), var(--color-surface)",
            border: `1px solid ${
              activeStatusFilter === "pending"
                ? "var(--color-accent)"
                : summary.pendingCount > 0
                ? "var(--color-warning-line)"
                : "var(--color-line)"
            }`,
            borderRadius: 20,
            boxShadow:
              activeStatusFilter === "pending"
                ? "0 0 0 1px var(--color-accent), 0 2px 8px rgba(5, 150, 105, 0.1)"
                : "0 2px 8px rgba(24, 24, 27, 0.03)",
            cursor: "pointer",
            position: "relative",
            overflow: "hidden",
            transition: "all 0.15s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-1px)";
            e.currentTarget.style.boxShadow = "0 6px 18px rgba(24, 24, 27, 0.08)";
            if (activeStatusFilter !== "pending" && summary.pendingCount === 0) {
              e.currentTarget.style.borderColor = "var(--color-line-strong)";
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "none";
            e.currentTarget.style.boxShadow =
              activeStatusFilter === "pending"
                ? "0 0 0 1px var(--color-accent), 0 2px 8px rgba(5, 150, 105, 0.1)"
                : "0 2px 8px rgba(24, 24, 27, 0.03)";
            if (activeStatusFilter !== "pending" && summary.pendingCount === 0) {
              e.currentTarget.style.borderColor = "var(--color-line)";
            }
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Clock size={18} strokeWidth={2.2} style={{ color: "var(--color-amber, #d97706)" }} />
              <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--color-ink)" }}>
                Pending review
              </span>
            </div>
            {summary.pendingCount > 0 && onOpenReviewQueue && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 2,
                  fontSize: 11,
                  fontWeight: 700,
                  color: "var(--color-amber-strong, #b45309)",
                  backgroundColor: "var(--color-amber-soft, #fef3c7)",
                  padding: "2px 8px",
                  borderRadius: 9999,
                  border: "1px solid var(--color-amber-line, #fde68a)",
                }}
              >
                Review <ArrowUpRight size={12} strokeWidth={2.5} />
              </span>
            )}
          </div>
          <div style={{ marginTop: 14 }}>
            <span style={{ fontSize: 32, fontWeight: 800, color: "var(--color-ink)", lineHeight: 1, letterSpacing: "-0.02em" }}>
              {summary.pendingCount}
            </span>
            <p style={{ margin: "6px 0 0 0", fontSize: 12, color: "var(--color-muted)" }}>
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
            padding: "20px 22px",
            background:
              "radial-gradient(circle at 100% 100%, color-mix(in srgb, var(--color-danger) 20%, transparent) 0%, transparent 65%), var(--color-surface)",
            border: `1px solid ${
              activeStatusFilter === "rejected"
                ? "var(--color-accent)"
                : "var(--color-line)"
            }`,
            borderRadius: 20,
            boxShadow:
              activeStatusFilter === "rejected"
                ? "0 0 0 1px var(--color-accent), 0 2px 8px rgba(5, 150, 105, 0.1)"
                : "0 2px 8px rgba(24, 24, 27, 0.03)",
            cursor: "pointer",
            position: "relative",
            overflow: "hidden",
            transition: "all 0.15s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-1px)";
            e.currentTarget.style.boxShadow = "0 6px 18px rgba(24, 24, 27, 0.08)";
            if (activeStatusFilter !== "rejected") {
              e.currentTarget.style.borderColor = "var(--color-line-strong)";
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "none";
            e.currentTarget.style.boxShadow =
              activeStatusFilter === "rejected"
                ? "0 0 0 1px var(--color-accent), 0 2px 8px rgba(5, 150, 105, 0.1)"
                : "0 2px 8px rgba(24, 24, 27, 0.03)";
            if (activeStatusFilter !== "rejected") {
              e.currentTarget.style.borderColor = "var(--color-line)";
            }
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <XCircle size={18} strokeWidth={2.2} style={{ color: "var(--color-danger)" }} />
            <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--color-ink)" }}>Rejected</span>
          </div>
          <div style={{ marginTop: 14 }}>
            <span style={{ fontSize: 32, fontWeight: 800, color: "var(--color-ink)", lineHeight: 1, letterSpacing: "-0.02em" }}>
              {summary.rejectedCount}
            </span>
            <p style={{ margin: "6px 0 0 0", fontSize: 12, color: "var(--color-muted)" }}>
              No re-submission
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
            padding: "20px 22px",
            background:
              "radial-gradient(circle at 100% 100%, color-mix(in srgb, var(--color-ink) 10%, transparent) 0%, transparent 65%), var(--color-surface)",
            border: `1px solid ${
              activeStatusFilter === "unpaid"
                ? "var(--color-accent)"
                : "var(--color-line)"
            }`,
            borderRadius: 20,
            boxShadow:
              activeStatusFilter === "unpaid"
                ? "0 0 0 1px var(--color-accent), 0 2px 8px rgba(5, 150, 105, 0.1)"
                : "0 2px 8px rgba(24, 24, 27, 0.03)",
            cursor: "pointer",
            position: "relative",
            overflow: "hidden",
            transition: "all 0.15s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-1px)";
            e.currentTarget.style.boxShadow = "0 6px 18px rgba(24, 24, 27, 0.08)";
            if (activeStatusFilter !== "unpaid") {
              e.currentTarget.style.borderColor = "var(--color-line-strong)";
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "none";
            e.currentTarget.style.boxShadow =
              activeStatusFilter === "unpaid"
                ? "0 0 0 1px var(--color-accent), 0 2px 8px rgba(5, 150, 105, 0.1)"
                : "0 2px 8px rgba(24, 24, 27, 0.03)";
            if (activeStatusFilter !== "unpaid") {
              e.currentTarget.style.borderColor = "var(--color-line)";
            }
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <AlertTriangle size={18} strokeWidth={2.2} style={{ color: "var(--color-muted-strong, #52525b)" }} />
            <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--color-ink)" }}>Unpaid</span>
          </div>
          <div style={{ marginTop: 14 }}>
            <span style={{ fontSize: 32, fontWeight: 800, color: "var(--color-ink)", lineHeight: 1, letterSpacing: "-0.02em" }}>
              {summary.unpaidCount}
            </span>
            <p style={{ margin: "6px 0 0 0", fontSize: 12, color: "var(--color-muted)" }}>
              Awaiting payment
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
