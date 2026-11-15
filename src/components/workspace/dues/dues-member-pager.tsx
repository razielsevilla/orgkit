"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { pageNumbers } from "@/src/lib/pagination";

interface DuesMemberPagerProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
}

const BUTTON_SIZE = 32;

const baseButton: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: BUTTON_SIZE,
  height: BUTTON_SIZE,
  padding: 0,
  borderRadius: 8,
  fontSize: 13,
  transition: "background-color 0.15s ease, border-color 0.15s ease, opacity 0.15s ease",
};

export function DuesMemberPager({
  page,
  totalPages,
  onPageChange,
  disabled = false,
}: DuesMemberPagerProps) {
  if (totalPages <= 1) return null;

  const arrow = (label: string, target: number, icon: React.ReactNode) => {
    const unavailable = disabled || target < 1 || target > totalPages;
    return (
      <button
        type="button"
        aria-label={label}
        disabled={unavailable}
        onClick={() => onPageChange(target)}
        style={{
          ...baseButton,
          border: "1px solid var(--color-line)",
          backgroundColor: "var(--color-surface)",
          color: unavailable ? "var(--color-muted)" : "var(--color-ink)",
          cursor: unavailable ? "not-allowed" : "pointer",
          opacity: unavailable ? 0.45 : 1,
        }}
      >
        {icon}
      </button>
    );
  };

  return (
    <nav aria-label="Pagination" style={{ display: "flex", alignItems: "center", gap: 6 }}>
      {arrow("Previous page", page - 1, <ChevronLeft size={16} strokeWidth={2} />)}

      {pageNumbers(page, totalPages).map((entry, i) =>
        entry === "gap" ? (
          <span
            key={`gap-${i}`}
            aria-hidden="true"
            style={{ color: "var(--color-muted)", padding: "0 2px" }}
          >
            …
          </span>
        ) : (
          <button
            key={entry}
            type="button"
            aria-label={`Page ${entry}`}
            aria-current={entry === page ? "page" : undefined}
            disabled={disabled || entry === page}
            onClick={() => onPageChange(entry)}
            style={{
              ...baseButton,
              border: entry === page ? "none" : "1px solid var(--color-line)",
              backgroundColor: entry === page ? "var(--color-accent)" : "var(--color-surface)",
              color: entry === page ? "#FFFFFF" : "var(--color-ink)",
              fontWeight: entry === page ? 700 : 500,
              cursor: entry === page ? "default" : disabled ? "not-allowed" : "pointer",
              opacity: disabled && entry !== page ? 0.5 : 1,
            }}
          >
            {entry}
          </button>
        )
      )}

      {arrow("Next page", page + 1, <ChevronRight size={16} strokeWidth={2} />)}
    </nav>
  );
}
