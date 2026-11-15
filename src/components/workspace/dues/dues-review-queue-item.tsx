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
      aria-selected={isSelected}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
        padding: "14px 16px",
        borderRadius: 14,
        border: isSelected
          ? "1.5px solid var(--color-ink)"
          : "1px solid var(--color-line)",
        backgroundColor: isSelected
          ? "color-mix(in srgb, var(--color-ink) 5%, var(--color-surface))"
          : "var(--color-surface)",
        boxShadow: isSelected
          ? "0 4px 12px rgba(0, 0, 0, 0.05)"
          : "none",
        cursor: "pointer",
        textAlign: "left",
        transition: "all 0.15s ease",
        boxSizing: "border-box",
        gap: 12,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0, flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <span
            style={{
              fontSize: "0.9375rem",
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
              fontSize: "0.9375rem",
              fontWeight: 700,
              color: "#059669",
              flexShrink: 0,
            }}
          >
            {formatPesos(item.amount)}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <span
            style={{
              fontSize: "0.8125rem",
              color: "var(--color-ink-muted)",
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
              fontSize: "0.75rem",
              color: "var(--color-ink-muted)",
              flexShrink: 0,
            }}
          >
            <Clock size={12} />
            <span>{formatSubmissionTime(item.submittedAt)}</span>
          </span>
        </div>
      </div>

      <ChevronRight
        size={18}
        style={{
          color: isSelected ? "var(--color-ink)" : "var(--color-ink-muted)",
          flexShrink: 0,
          transform: isSelected ? "translateX(2px)" : "none",
          transition: "transform 0.15s ease",
        }}
      />
    </button>
  );
}
