"use client";

import React from "react";
import { Clock, ChevronRight } from "lucide-react";
import type { DuesReviewQueueItem } from "@/src/lib/dues/dues-review";
import { formatPesos } from "@/src/components/workspace/dues/dues-table";

interface DuesReviewQueueItemProps {
  item: DuesReviewQueueItem;
  isSelected: boolean;
  onSelect: (item: DuesReviewQueueItem) => void;
}

export function formatSubmissionTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(d);
  } catch {
    return isoString;
  }
}

export function DuesReviewQueueItemRow({
  item,
  isSelected,
  onSelect,
}: DuesReviewQueueItemProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(item)}
      aria-pressed={isSelected}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
        padding: "12px 14px",
        borderRadius: 12,
        border: isSelected
          ? "1.5px solid var(--color-accent)"
          : "1px solid var(--color-line)",
        backgroundColor: isSelected
          ? "color-mix(in srgb, var(--color-accent) 6%, var(--color-surface))"
          : "var(--color-surface)",
        boxShadow: isSelected
          ? "0 3px 12px color-mix(in srgb, var(--color-accent) 14%, transparent)"
          : "none",
        cursor: "pointer",
        textAlign: "left",
        transition: "all 0.15s ease",
        boxSizing: "border-box",
        gap: 10,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0, flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <span
            style={{
              fontSize: "0.875rem",
              fontWeight: 600,
              color: "var(--color-ink)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {item.memberName}
          </span>
          <span
            style={{
              fontSize: "0.875rem",
              fontWeight: 700,
              color: "var(--color-accent-strong)",
              flexShrink: 0,
            }}
          >
            {formatPesos(item.amount)}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <span
            style={{
              fontSize: "0.75rem",
              color: "var(--color-muted)",
              fontFamily: "monospace",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            Ref: {item.referenceNo}
          </span>
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontSize: "0.6875rem",
              color: "var(--color-muted)",
              flexShrink: 0,
            }}
          >
            <Clock size={11} />
            <span>{formatSubmissionTime(item.submittedAt)}</span>
          </span>
        </div>
      </div>

      <ChevronRight
        size={16}
        style={{
          color: isSelected ? "var(--color-accent)" : "var(--color-muted-soft)",
          flexShrink: 0,
          transform: isSelected ? "translateX(2px)" : "none",
          transition: "transform 0.15s ease",
        }}
      />
    </button>
  );
}
