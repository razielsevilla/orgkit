"use client";

import React from "react";
import { Award, Calendar, CheckCircle2, History, Pencil, Trash2, User } from "lucide-react";
import type { OfficerTerm } from "@/src/app/(workspace)/terms-actions";

export interface TermGroup {
  termName: string;
  startDate: string;
  endDate: string;
  isEnded: boolean;
  terms: OfficerTerm[];
}

interface TermGroupCardProps {
  group: TermGroup;
  isAdmin: boolean;
  onEditTerm?: (term: OfficerTerm) => void;
  onDeleteTerm?: (term: OfficerTerm) => void;
}

function formatDate(isoDate: string): string {
  if (!isoDate) return "—";
  try {
    const [year, month, day] = isoDate.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    });
  } catch {
    return isoDate;
  }
}

export function TermGroupCard({
  group,
  isAdmin,
  onEditTerm,
  onDeleteTerm,
}: TermGroupCardProps) {
  return (
    <div
      className="orgkit-term-card"
      style={{
        backgroundColor: "var(--color-surface)",
        borderRadius: 20,
        border: "1px solid var(--color-line)",
        boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      {/* Term Group Header */}
      <div
        style={{
          padding: "16px 20px",
          backgroundColor: group.isEnded
            ? "color-mix(in srgb, var(--color-base) 60%, var(--color-surface))"
            : "color-mix(in srgb, var(--color-accent) 6%, var(--color-surface))",
          borderBottom: "1px solid var(--color-line)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              backgroundColor: group.isEnded
                ? "var(--color-line)"
                : "color-mix(in srgb, var(--color-accent) 15%, transparent)",
              color: group.isEnded ? "var(--color-muted)" : "var(--color-accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {group.isEnded ? <History size={18} /> : <Award size={18} />}
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  color: "var(--color-muted)",
                  letterSpacing: "0.05em",
                }}
              >
                Term
              </span>
              <h2
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: "var(--color-ink)",
                  margin: 0,
                }}
              >
                {group.termName}
              </h2>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 12.5,
                color: "var(--color-muted)",
                marginTop: 2,
              }}
            >
              <Calendar size={13} />
              <span>
                {formatDate(group.startDate)} – {formatDate(group.endDate)}
              </span>
            </div>
          </div>
        </div>

        <div>
          {group.isEnded ? (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                backgroundColor: "var(--color-base)",
                color: "var(--color-muted)",
                fontSize: 12,
                fontWeight: 600,
                padding: "4px 10px",
                borderRadius: 999,
              }}
            >
              <History size={13} />
              <span>Ended</span>
            </span>
          ) : (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                backgroundColor: "color-mix(in srgb, var(--color-accent) 12%, transparent)",
                color: "var(--color-accent-strong)",
                fontSize: 12,
                fontWeight: 600,
                padding: "4px 10px",
                borderRadius: 999,
              }}
            >
              <CheckCircle2 size={13} />
              <span>Active Term</span>
            </span>
          )}
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="orgkit-terms-table-wrapper" style={{ width: "100%", overflowX: "auto" }}>
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
                borderBottom: "1px solid var(--color-line)",
                backgroundColor: "var(--color-surface)",
              }}
            >
              <th style={{ padding: "12px 20px", fontWeight: 600, color: "var(--color-muted)" }}>
                Role
              </th>
              <th style={{ padding: "12px 20px", fontWeight: 600, color: "var(--color-muted)" }}>
                Holder
              </th>
              <th style={{ padding: "12px 20px", fontWeight: 600, color: "var(--color-muted)" }}>
                Starts
              </th>
              <th style={{ padding: "12px 20px", fontWeight: 600, color: "var(--color-muted)" }}>
                Ends
              </th>
              {isAdmin && (
                <th
                  style={{
                    padding: "12px 20px",
                    fontWeight: 600,
                    color: "var(--color-muted)",
                    textAlign: "right",
                  }}
                >
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {group.terms.map((term) => (
              <tr
                key={term.id}
                className="orgkit-term-row"
                style={{
                  borderBottom: "1px solid var(--color-line)",
                  transition: "background-color 0.1s ease",
                }}
              >
                <td style={{ padding: "14px 20px", fontWeight: 600, color: "var(--color-ink)" }}>
                  {term.roleTitle}
                </td>
                <td style={{ padding: "14px 20px", color: "var(--color-ink)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: "50%",
                        backgroundColor: "var(--color-base)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--color-muted)",
                      }}
                    >
                      <User size={14} />
                    </div>
                    <span>{term.holderName}</span>
                  </div>
                </td>
                <td style={{ padding: "14px 20px", color: "var(--color-muted)" }}>
                  {formatDate(term.startDate)}
                </td>
                <td style={{ padding: "14px 20px", color: "var(--color-muted)" }}>
                  {formatDate(term.endDate)}
                </td>
                {isAdmin && (
                  <td style={{ padding: "14px 20px", textAlign: "right" }}>
                    <div style={{ display: "inline-flex", gap: 6 }}>
                      <button
                        type="button"
                        onClick={() => onEditTerm?.(term)}
                        title="Edit term"
                        aria-label={`Edit ${term.roleTitle}`}
                        className="orgkit-term-action-btn"
                        style={{
                          padding: "6px 8px",
                          borderRadius: 8,
                          border: "1px solid var(--color-line)",
                          backgroundColor: "transparent",
                          color: "var(--color-muted)",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteTerm?.(term)}
                        title="Delete term"
                        aria-label={`Delete ${term.roleTitle}`}
                        className="orgkit-term-delete-btn"
                        style={{
                          padding: "6px 8px",
                          borderRadius: 8,
                          border: "1px solid var(--color-line)",
                          backgroundColor: "transparent",
                          color: "var(--color-muted)",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards View */}
      <div
        className="orgkit-terms-mobile-cards"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          padding: 16,
        }}
      >
        {group.terms.map((term) => (
          <div
            key={term.id}
            style={{
              padding: 14,
              borderRadius: 14,
              backgroundColor: "var(--color-base)",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <span style={{ fontSize: 11, fontWeight: 600, color: "var(--color-muted)", textTransform: "uppercase" }}>
                  Role
                </span>
                <div style={{ fontWeight: 700, fontSize: 15, color: "var(--color-ink)" }}>
                  {term.roleTitle}
                </div>
              </div>
              {isAdmin && (
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    type="button"
                    onClick={() => onEditTerm?.(term)}
                    aria-label={`Edit ${term.roleTitle}`}
                    style={{
                      padding: "6px 8px",
                      borderRadius: 8,
                      border: "1px solid var(--color-line)",
                      backgroundColor: "var(--color-surface)",
                      color: "var(--color-muted)",
                      cursor: "pointer",
                    }}
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteTerm?.(term)}
                    aria-label={`Delete ${term.roleTitle}`}
                    style={{
                      padding: "6px 8px",
                      borderRadius: 8,
                      border: "1px solid var(--color-line)",
                      backgroundColor: "var(--color-surface)",
                      color: "var(--color-muted)",
                      cursor: "pointer",
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>

            <div>
              <span style={{ fontSize: 11, fontWeight: 600, color: "var(--color-muted)", textTransform: "uppercase" }}>
                Holder
              </span>
              <div style={{ fontSize: 13.5, color: "var(--color-ink)", display: "flex", alignItems: "center", gap: 6 }}>
                <User size={13} style={{ color: "var(--color-muted)" }} />
                <span>{term.holderName}</span>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 4 }}>
              <div>
                <span style={{ fontSize: 11, fontWeight: 600, color: "var(--color-muted)", textTransform: "uppercase" }}>
                  Starts
                </span>
                <div style={{ fontSize: 13, color: "var(--color-ink)" }}>{formatDate(term.startDate)}</div>
              </div>
              <div>
                <span style={{ fontSize: 11, fontWeight: 600, color: "var(--color-muted)", textTransform: "uppercase" }}>
                  Ends
                </span>
                <div style={{ fontSize: 13, color: "var(--color-ink)" }}>{formatDate(term.endDate)}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
