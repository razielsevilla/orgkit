"use client";

import React, { useState } from "react";
import type { WorkspaceMember } from "@/src/app/(workspace)/members-actions";
import { MemberStatusBadge } from "./member-status-badge";
import { MemberActions } from "./member-actions";
import { PANEL_RADIUS } from "./member-table-layout";
import { ChevronDown, ChevronUp } from "lucide-react";

interface MemberMobileCardProps {
  member: WorkspaceMember;
  onConfirm: (member: WorkspaceMember) => void;
  onEdit: (member: WorkspaceMember) => void;
  onViewHistory: (member: WorkspaceMember) => void;
  onDeactivate: (member: WorkspaceMember) => void;
  onReactivate: (member: WorkspaceMember) => void;
  isConfirming: boolean;
  isReactivating?: boolean;
}

function formatDate(isoString: string): string {
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

/**
 * Mobile card view adhering to docs/design.md:
 * - Optimized for 360px viewports with zero horizontal scrolling.
 * - Tap-to-expand reveals full name and email for very long strings.
 * - Context-aware actions (Edit, Deactivate, Reactivate, Confirm) with touch-friendly 40px+ buttons.
 */
export function MemberMobileCard({
  member,
  onConfirm,
  onEdit,
  onViewHistory,
  onDeactivate,
  onReactivate,
  isConfirming,
  isReactivating = false,
}: MemberMobileCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isPending = member.status === "pending";

  return (
    <div
      role="article"
      data-member-row={member.id}
      aria-label={`Member: ${member.fullName}`}
      style={{
        backgroundColor: "var(--color-surface)",
        borderRadius: PANEL_RADIUS,
        border: "1px solid var(--color-line)",
        padding: "16px",
        boxShadow: "0 2px 10px color-mix(in srgb, var(--color-ink) 3%, transparent)",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        width: "100%",
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      {/* Top Row: Avatar + Name/Email preview + Status */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            minWidth: 0,
            flex: 1,
          }}
        >
          <div
            aria-hidden="true"
            style={{
              width: 38,
              height: 38,
              borderRadius: "50%",
              backgroundColor: isPending
                ? "color-mix(in srgb, var(--color-accent) 12%, transparent)"
                : "color-mix(in srgb, var(--color-line) 80%, transparent)",
              color: isPending
                ? "var(--color-accent-strong)"
                : "var(--color-ink)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 13,
              fontWeight: 700,
              flexShrink: 0,
              userSelect: "none",
            }}
          >
            {getInitials(member.fullName)}
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 2,
              minWidth: 0,
              overflow: "hidden",
            }}
          >
            <span
              style={{
                fontWeight: 600,
                color: "var(--color-ink)",
                fontSize: 14,
                overflow: "hidden",
                textOverflow: isExpanded ? "clip" : "ellipsis",
                whiteSpace: isExpanded ? "normal" : "nowrap",
                wordBreak: "break-word",
              }}
            >
              {member.fullName}
            </span>
            <span
              style={{
                fontSize: 12.5,
                color: "var(--color-muted)",
                overflow: "hidden",
                textOverflow: isExpanded ? "clip" : "ellipsis",
                whiteSpace: isExpanded ? "normal" : "nowrap",
                wordBreak: "break-all",
              }}
            >
              {member.email}
            </span>
          </div>
        </div>

        {/* Status Badge */}
        <div style={{ flexShrink: 0 }}>
          <MemberStatusBadge status={member.status} />
        </div>
      </div>

      {/* Date & Expand Toggle */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingTop: 8,
          borderTop: "1px solid color-mix(in srgb, var(--color-line) 60%, transparent)",
          fontSize: 12,
          color: "var(--color-muted)",
        }}
      >
        <span>Joined {formatDate(member.createdAt)}</span>

        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          aria-expanded={isExpanded}
          aria-label={isExpanded ? "Collapse member details" : "Expand member details"}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            border: "none",
            backgroundColor: "transparent",
            color: "var(--color-muted)",
            fontSize: 11.5,
            cursor: "pointer",
            padding: "2px 4px",
          }}
        >
          <span>{isExpanded ? "Less" : "Details"}</span>
          {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>
      </div>

      {/* Action Controls for all member states */}
      <div style={{ marginTop: 4, width: "100%" }}>
        <MemberActions
          member={member}
          onConfirm={onConfirm}
          onEdit={onEdit}
          onViewHistory={onViewHistory}
          onDeactivate={onDeactivate}
          onReactivate={onReactivate}
          isConfirming={isConfirming}
          isReactivating={isReactivating}
          isMobile={true}
        />
      </div>
    </div>
  );
}
