"use client";

import React, { useState } from "react";
import { Copy, Check, Calendar, Hash } from "lucide-react";
import type { DuesMemberRow } from "@/src/lib/dues/dues-dashboard";
import { DuesMemberStatusPill } from "./dues-member-status-pill";

interface DuesMemberMobileCardProps {
  member: DuesMemberRow;
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

export function DuesMemberMobileCard({ member }: DuesMemberMobileCardProps) {
  const [copied, setCopied] = useState(false);
  const displayDate = member.reviewedAt || member.submittedAt;
  const isInactive = member.memberStatus === "inactive";

  const handleCopy = (ref: string) => {
    navigator.clipboard?.writeText(ref);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div
      data-testid={`dues-member-mobile-card-${member.memberId}`}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        padding: "14px 16px",
        backgroundColor: "var(--color-surface)",
        border: "1px solid var(--color-line)",
        borderRadius: 12,
        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.03)",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      {/* Header: Avatar, Name, Email, Status Pill */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
          <div
            aria-hidden="true"
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              backgroundColor: "color-mix(in srgb, var(--color-accent) 15%, transparent)",
              color: "var(--color-accent-strong)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              fontSize: 13,
              flexShrink: 0,
            }}
          >
            {getInitials(member.fullName)}
          </div>
          <div style={{ minWidth: 0, overflow: "hidden" }}>
            <h4
              style={{
                margin: 0,
                fontSize: 14,
                fontWeight: 700,
                color: "var(--color-ink)",
                whiteSpace: "nowrap",
                textOverflow: "ellipsis",
                overflow: "hidden",
                lineHeight: 1.25,
              }}
            >
              {member.fullName}
            </h4>
            <p
              style={{
                margin: "2px 0 0 0",
                fontSize: 12,
                color: "var(--color-muted)",
                whiteSpace: "nowrap",
                textOverflow: "ellipsis",
                overflow: "hidden",
              }}
            >
              {member.email}
            </p>
          </div>
        </div>

        <DuesMemberStatusPill
          status={member.duesStatus}
          size="sm"
          isInactive={isInactive}
        />
      </div>

      {/* Rejection Reason if any */}
      {member.rejectReason && (
        <div
          style={{
            fontSize: 12,
            padding: "8px 10px",
            borderRadius: 8,
            backgroundColor: "color-mix(in srgb, var(--color-danger, #ef4444) 8%, var(--color-surface))",
            border: "1px solid color-mix(in srgb, var(--color-danger, #ef4444) 20%, transparent)",
            color: "var(--color-danger-strong, #dc2626)",
            lineHeight: 1.4,
          }}
        >
          <span style={{ fontWeight: 600 }}>Rejected:</span> {member.rejectReason}
        </div>
      )}

      {/* Footer details: Reference & Date */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 8,
          paddingTop: 8,
          borderTop: "1px solid color-mix(in srgb, var(--color-line) 60%, transparent)",
          fontSize: 12,
          color: "var(--color-muted)",
        }}
      >
        <div style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
          <Hash size={13} style={{ flexShrink: 0 }} />
          {member.referenceNo ? (
            <div style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <code
                style={{
                  fontSize: 12,
                  fontFamily: "monospace",
                  fontWeight: 600,
                  color: "var(--color-ink)",
                  backgroundColor: "color-mix(in srgb, var(--color-ink) 5%, transparent)",
                  padding: "1px 5px",
                  borderRadius: 4,
                }}
              >
                {member.referenceNo}
              </code>
              <button
                type="button"
                aria-label={`Copy reference ${member.referenceNo}`}
                onClick={() => handleCopy(member.referenceNo!)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 22,
                  height: 22,
                  padding: 0,
                  background: "transparent",
                  border: "none",
                  borderRadius: 4,
                  cursor: "pointer",
                  color: copied ? "#10b981" : "var(--color-muted)",
                }}
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
              </button>
            </div>
          ) : (
            <span>No reference</span>
          )}
        </div>

        <div style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          <Calendar size={13} style={{ flexShrink: 0 }} />
          <span>{formatDate(displayDate)}</span>
        </div>
      </div>
    </div>
  );
}
