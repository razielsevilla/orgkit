import React from "react";
import { Calendar, Pencil, XCircle } from "lucide-react";
import type { DuesPeriod } from "@/src/app/(workspace)/dues-actions";
import { DuesStatusPill } from "./dues-status-pill";

interface DuesTableProps {
  periods: DuesPeriod[];
  onEdit: (period: DuesPeriod) => void;
  onClosePeriod: (period: DuesPeriod) => void;
}

export function formatPesos(amount: number): string {
  return `₱${amount.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatDueDate(dateString: string): string {
  try {
    const [year, month, day] = dateString.split("-").map(Number);
    if (year && month && day) {
      const d = new Date(year, month - 1, day);
      return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(d);
    }
    return dateString;
  } catch {
    return dateString;
  }
}

export function DuesTable({ periods, onEdit, onClosePeriod }: DuesTableProps) {
  return (
    <div
      style={{
        backgroundColor: "var(--color-surface)",
        borderRadius: 20,
        border: "1px solid var(--color-line)",
        boxShadow: "0 20px 50px rgba(24, 24, 27, 0.04)",
        overflow: "hidden",
        width: "100%",
      }}
    >
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          textAlign: "left",
          fontSize: 13.5,
        }}
      >
        <thead>
          <tr
            style={{
              backgroundColor: "color-mix(in srgb, var(--color-base) 60%, transparent)",
              borderBottom: "1px solid var(--color-line)",
              color: "var(--color-muted)",
              fontSize: 12,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            <th style={{ padding: "14px 20px" }}>Period</th>
            <th style={{ padding: "14px 20px" }}>Amount</th>
            <th style={{ padding: "14px 20px" }}>Due date</th>
            <th style={{ padding: "14px 20px" }}>Status</th>
            <th style={{ padding: "14px 20px", textAlign: "right" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {periods.map((period, index) => {
            const isOpen = period.status === "open";
            const isLast = index === periods.length - 1;

            return (
              <tr
                key={period.id}
                style={{
                  borderBottom: isLast ? "none" : "1px solid var(--color-line)",
                  transition: "background-color 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor =
                    "color-mix(in srgb, var(--color-base) 40%, transparent)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                {/* Period Name */}
                <td style={{ padding: "16px 20px", fontWeight: 600, color: "var(--color-ink)" }}>
                  <div>{period.name}</div>
                </td>

                {/* Amount */}
                <td style={{ padding: "16px 20px", fontWeight: 700, color: "var(--color-ink)" }}>
                  {formatPesos(period.amount)}
                </td>

                {/* Due Date */}
                <td style={{ padding: "16px 20px", color: "var(--color-muted-strong)" }}>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <Calendar size={14} color="var(--color-muted)" />
                    <span>{formatDueDate(period.dueOn)}</span>
                  </div>
                </td>

                {/* Status */}
                <td style={{ padding: "16px 20px" }}>
                  <DuesStatusPill status={period.status} />
                </td>

                {/* Actions */}
                <td style={{ padding: "16px 20px", textAlign: "right" }}>
                  {isOpen ? (
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        justifyContent: "flex-end",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => onEdit(period)}
                        title="Edit period"
                        aria-label={`Edit ${period.name}`}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          height: 32,
                          padding: "0 12px",
                          borderRadius: 8,
                          backgroundColor: "var(--color-surface)",
                          border: "1px solid var(--color-line)",
                          color: "var(--color-ink)",
                          fontSize: 12.5,
                          fontWeight: 500,
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor =
                            "color-mix(in srgb, var(--color-base) 70%, transparent)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = "var(--color-surface)";
                        }}
                      >
                        <Pencil size={13} strokeWidth={2} />
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => onClosePeriod(period)}
                        title="Close period"
                        aria-label={`Close ${period.name}`}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          height: 32,
                          padding: "0 12px",
                          borderRadius: 8,
                          backgroundColor: "color-mix(in srgb, var(--color-danger, #DC2626) 8%, transparent)",
                          border: "1px solid color-mix(in srgb, var(--color-danger, #DC2626) 20%, transparent)",
                          color: "var(--color-danger-strong)",
                          fontSize: 12.5,
                          fontWeight: 500,
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor =
                            "color-mix(in srgb, var(--color-danger, #DC2626) 16%, transparent)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor =
                            "color-mix(in srgb, var(--color-danger, #DC2626) 8%, transparent)";
                        }}
                      >
                        <XCircle size={13} strokeWidth={2} />
                        Close period
                      </button>
                    </div>
                  ) : (
                    <span
                      style={{
                        fontSize: 12.5,
                        color: "var(--color-muted)",
                        fontStyle: "italic",
                      }}
                    >
                      Closed
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
