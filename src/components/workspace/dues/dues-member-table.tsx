"use client";

import React, { useEffect, useRef, useState } from "react";
import { Copy, Check } from "lucide-react";
import type { DuesMemberRow } from "@/src/lib/dues/dues-dashboard";
import { DuesMemberStatusPill } from "./dues-member-status-pill";
import { DuesMemberPager } from "./dues-member-pager";
import { DuesDashboardEmpty } from "./dues-dashboard-empty";

interface DuesMemberTableProps {
  members: DuesMemberRow[];
  page: number;
  pageSize: number;
  totalMatching: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  isPaging?: boolean;
  emptyType?: "no_members" | "no_results";
  searchQuery?: string;
  onClearFilters?: () => void;
}

function formatDate(isoString: string | null): string {
  if (!isoString) return "—";
  try {
    const d = new Date(isoString);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(d);
  } catch {
    return isoString;
  }
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return (name[0] || "?").toUpperCase();
}

export function DuesMemberTable({
  members,
  page,
  pageSize,
  totalMatching,
  totalPages,
  onPageChange,
  isPaging = false,
  emptyType,
  searchQuery,
  onClearFilters,
}: DuesMemberTableProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [copiedRef, setCopiedRef] = useState<string | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [page]);

  const handleCopy = (ref: string) => {
    navigator.clipboard?.writeText(ref);
    setCopiedRef(ref);
    setTimeout(() => setCopiedRef(null), 1500);
  };

  if (members.length === 0) {
    return (
      <div
        style={{
          width: "100%",
          backgroundColor: "var(--color-surface)",
          border: "1px solid var(--color-line)",
          borderRadius: 16,
          boxShadow: "0 4px 18px color-mix(in srgb, var(--color-ink) 3%, transparent)",
          overflow: "hidden",
        }}
      >
        <DuesDashboardEmpty
          type={emptyType || "no_results"}
          searchQuery={searchQuery}
          onClearFilters={onClearFilters}
        />
      </div>
    );
  }

  const firstShown = (page - 1) * pageSize + 1;
  const lastShown = Math.min(firstShown + members.length - 1, totalMatching);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        backgroundColor: "var(--color-surface)",
        border: "1px solid var(--color-line)",
        borderRadius: 16,
        boxShadow: "0 4px 18px color-mix(in srgb, var(--color-ink) 3%, transparent)",
        overflow: "hidden",
      }}
    >
      {/* Table Header Bar */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(220px, 2.5fr) minmax(130px, 1.2fr) minmax(140px, 1.3fr) minmax(110px, 1fr)",
          padding: "14px 20px",
          backgroundColor: "color-mix(in srgb, var(--color-surface) 95%, var(--color-line) 5%)",
          borderBottom: "1px solid var(--color-line)",
          fontSize: 12,
          fontWeight: 600,
          color: "var(--color-muted)",
          letterSpacing: "0.04em",
          textTransform: "uppercase",
        }}
      >
        <div>Member</div>
        <div>Status</div>
        <div>Reference #</div>
        <div style={{ textAlign: "right" }}>Date</div>
      </div>

      {/* Inside Scrollable Region */}
      <div
        ref={scrollRef}
        tabIndex={0}
        role="region"
        aria-label="Dues member status table"
        aria-busy={isPaging || undefined}
        style={{
          maxHeight: 520,
          overflowY: "auto",
          scrollbarGutter: "stable",
          opacity: isPaging ? 0.6 : 1,
          transition: "opacity 0.15s ease",
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            textAlign: "left",
          }}
        >
          <tbody style={{ fontSize: 13.5 }}>
            {members.map((member, idx) => {
              const displayDate = member.reviewedAt || member.submittedAt;
              const isInactive = member.memberStatus === "inactive";

              return (
                <tr
                  key={member.memberId}
                  data-testid={`dues-member-row-${member.memberId}`}
                  style={{
                    borderBottom: idx < members.length - 1 ? "1px solid var(--color-line)" : "none",
                    transition: "background-color 0.1s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "color-mix(in srgb, var(--color-ink) 2.5%, transparent)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  {/* Member (Avatar, Name, Email) */}
                  <td style={{ padding: "14px 20px", width: "40%" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                      <div
                        aria-hidden="true"
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: "50%",
                          backgroundColor: "color-mix(in srgb, var(--color-accent) 15%, transparent)",
                          color: "var(--color-accent-strong)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 700,
                          fontSize: 12.5,
                          flexShrink: 0,
                        }}
                      >
                        {getInitials(member.fullName)}
                      </div>
                      <div style={{ minWidth: 0, overflow: "hidden" }}>
                        <div
                          style={{
                            fontWeight: 600,
                            color: "var(--color-ink)",
                            whiteSpace: "nowrap",
                            textOverflow: "ellipsis",
                            overflow: "hidden",
                          }}
                        >
                          {member.fullName}
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            color: "var(--color-muted)",
                            whiteSpace: "nowrap",
                            textOverflow: "ellipsis",
                            overflow: "hidden",
                          }}
                        >
                          {member.email}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Status Pill */}
                  <td style={{ padding: "14px 20px", width: "20%" }}>
                    <DuesMemberStatusPill
                      status={member.duesStatus}
                      size="md"
                      isInactive={isInactive}
                    />
                  </td>

                  {/* Reference # */}
                  <td style={{ padding: "14px 20px", width: "22%" }}>
                    {member.referenceNo ? (
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        <code
                          style={{
                            fontSize: 12.5,
                            fontFamily: "monospace",
                            fontWeight: 600,
                            color: "var(--color-ink)",
                            backgroundColor: "color-mix(in srgb, var(--color-ink) 5%, transparent)",
                            padding: "3px 7px",
                            borderRadius: 6,
                          }}
                        >
                          {member.referenceNo}
                        </code>
                        <button
                          type="button"
                          aria-label={`Copy reference number ${member.referenceNo}`}
                          onClick={() => handleCopy(member.referenceNo!)}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: 24,
                            height: 24,
                            padding: 0,
                            background: "transparent",
                            border: "none",
                            borderRadius: 4,
                            cursor: "pointer",
                            color: copiedRef === member.referenceNo ? "var(--color-accent)" : "var(--color-muted)",
                            transition: "color 0.15s ease",
                          }}
                        >
                          {copiedRef === member.referenceNo ? <Check size={13} strokeWidth={2.2} /> : <Copy size={13} strokeWidth={1.8} />}
                        </button>
                      </div>
                    ) : (
                      <span style={{ color: "var(--color-muted)" }}>—</span>
                    )}
                  </td>

                  {/* Date */}
                  <td style={{ padding: "14px 20px", width: "18%", textAlign: "right", color: "var(--color-muted)", fontSize: 13 }}>
                    {formatDate(displayDate)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Table Footer with Pager */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
          padding: "14px 20px",
          borderTop: "1px solid var(--color-line)",
          backgroundColor: "var(--color-surface)",
        }}
      >
        <span style={{ fontSize: 13, color: "var(--color-muted)" }}>
          Showing <span style={{ fontWeight: 600, color: "var(--color-ink)" }}>{firstShown}–{lastShown}</span> of{" "}
          <span style={{ fontWeight: 600, color: "var(--color-ink)" }}>{totalMatching}</span> {totalMatching === 1 ? "member" : "members"}
        </span>

        <DuesMemberPager
          page={page}
          totalPages={totalPages}
          onPageChange={onPageChange}
          disabled={isPaging}
        />
      </div>
    </div>
  );
}
