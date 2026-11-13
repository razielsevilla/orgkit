import React from "react";
import { Calendar, Pencil, XCircle } from "lucide-react";
import type { DuesPeriod } from "@/src/app/(workspace)/dues-actions";
import { DuesStatusPill } from "./dues-status-pill";
import { formatDueDate, formatPesos } from "./dues-table";

interface DuesMobileCardProps {
  period: DuesPeriod;
  onEdit: (period: DuesPeriod) => void;
  onClosePeriod: (period: DuesPeriod) => void;
}

export function DuesMobileCard({
  period,
  onEdit,
  onClosePeriod,
}: DuesMobileCardProps) {
  const isOpen = period.status === "open";

  return (
    <div
      style={{
        backgroundColor: "var(--color-surface)",
        borderRadius: 16,
        border: "1px solid var(--color-line)",
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        boxShadow: "0 4px 16px rgba(24, 24, 27, 0.03)",
        boxSizing: "border-box",
        width: "100%",
      }}
    >
      {/* Top row: Name and Status Pill */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <h2
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: "var(--color-ink)",
            margin: 0,
            lineHeight: 1.3,
            wordBreak: "break-word",
          }}
        >
          {period.name}
        </h2>
        <DuesStatusPill status={period.status} size="sm" />
      </div>

      {/* Details: Amount & Due Date */}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 8,
          paddingTop: 4,
          paddingBottom: 4,
          borderTop: "1px solid color-mix(in srgb, var(--color-line) 60%, transparent)",
          borderBottom: "1px solid color-mix(in srgb, var(--color-line) 60%, transparent)",
        }}
      >
        <div>
          <span style={{ fontSize: 11.5, color: "var(--color-muted)", display: "block" }}>
            Amount
          </span>
          <span style={{ fontSize: 16, fontWeight: 700, color: "var(--color-ink)" }}>
            {formatPesos(period.amount)}
          </span>
        </div>

        <div>
          <span style={{ fontSize: 11.5, color: "var(--color-muted)", display: "block" }}>
            Due date
          </span>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, color: "var(--color-muted-strong)" }}>
            <Calendar size={13} color="var(--color-muted)" />
            <span>{formatDueDate(period.dueOn)}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      {isOpen ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 8,
            marginTop: 4,
          }}
        >
          <button
            type="button"
            onClick={() => onEdit(period)}
            aria-label={`Edit ${period.name}`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              height: 36,
              borderRadius: 8,
              backgroundColor: "var(--color-surface)",
              border: "1px solid var(--color-line)",
              color: "var(--color-ink)",
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            <Pencil size={14} strokeWidth={2} />
            Edit
          </button>

          <button
            type="button"
            onClick={() => onClosePeriod(period)}
            aria-label={`Close ${period.name}`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              height: 36,
              borderRadius: 8,
              backgroundColor: "color-mix(in srgb, var(--color-danger, #DC2626) 8%, transparent)",
              border: "1px solid color-mix(in srgb, var(--color-danger, #DC2626) 20%, transparent)",
              color: "var(--color-danger-strong)",
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            <XCircle size={14} strokeWidth={2} />
            Close
          </button>
        </div>
      ) : (
        <div
          style={{
            fontSize: 12.5,
            color: "var(--color-muted)",
            fontStyle: "italic",
            textAlign: "right",
          }}
        >
          Period closed
        </div>
      )}
    </div>
  );
}
