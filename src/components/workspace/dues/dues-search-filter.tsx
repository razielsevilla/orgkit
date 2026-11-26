"use client";

import React, { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import type { DuesStatusFilter, DuesPeriodSummary } from "@/src/lib/dues/dues-dashboard";

interface DuesSearchFilterProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: DuesStatusFilter;
  onStatusChange: (status: DuesStatusFilter) => void;
  summary: DuesPeriodSummary;
  disabled?: boolean;
}

export function DuesSearchFilter({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusChange,
  summary,
  disabled = false,
}: DuesSearchFilterProps) {
  const [localSearch, setLocalSearch] = useState(searchQuery);

  // Sync incoming search query (e.g. reset). Adjusting state while rendering, the
  // pattern React recommends for "reset state when a prop changes", avoids an extra
  // render pass from an effect.
  const [syncedQuery, setSyncedQuery] = useState(searchQuery);
  if (searchQuery !== syncedQuery) {
    setSyncedQuery(searchQuery);
    setLocalSearch(searchQuery);
  }

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== searchQuery) {
        onSearchChange(localSearch);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [localSearch, searchQuery, onSearchChange]);

  const tabs: { id: DuesStatusFilter; label: string; count: number }[] = [
    { id: "all", label: "All", count: summary.totalMemberCount },
    { id: "paid", label: "Paid", count: summary.paidCount },
    { id: "pending", label: "Pending review", count: summary.pendingCount },
    { id: "unpaid", label: "Unpaid", count: summary.unpaidCount },
    { id: "rejected", label: "Rejected", count: summary.rejectedCount },
  ];

  return (
    <div
      data-tour="dues-filter"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 14,
        width: "100%",
        marginBottom: 16,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        {/* Filter Tabs */}
        <div
          role="tablist"
          aria-label="Filter members by dues status"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "4px 6px",
            borderRadius: 9999,
            backgroundColor: "color-mix(in srgb, var(--color-ink) 5%, transparent)",
            maxWidth: "100%",
            overflowX: "auto",
            scrollbarWidth: "none",
          }}
        >
          {tabs.map((tab) => {
            const isSelected = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                type="button"
                aria-selected={isSelected}
                aria-controls="dues-members-panel"
                disabled={disabled}
                onClick={() => onStatusChange(tab.id)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 14px",
                  borderRadius: 9999,
                  fontSize: 13,
                  fontWeight: isSelected ? 700 : 500,
                  color: isSelected ? "var(--color-ink)" : "var(--color-muted)",
                  backgroundColor: isSelected ? "var(--color-surface)" : "transparent",
                  border: isSelected ? "1px solid var(--color-line)" : "1px solid transparent",
                  cursor: disabled ? "not-allowed" : "pointer",
                  transition: "all 0.15s ease",
                  whiteSpace: "nowrap",
                  boxShadow: isSelected ? "0 1px 4px rgba(24, 24, 27, 0.08)" : "none",
                  outline: "none",
                }}
                onFocus={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.color = "var(--color-ink)";
                  }
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.color = "var(--color-ink)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.color = "var(--color-muted)";
                  }
                }}
              >
                <span>{tab.label}</span>
                <span
                  style={{
                    fontSize: 11.5,
                    fontWeight: 700,
                    padding: "1.5px 8px",
                    borderRadius: 9999,
                    backgroundColor: isSelected
                      ? "color-mix(in srgb, var(--color-accent) 15%, transparent)"
                      : "color-mix(in srgb, var(--color-ink) 6%, transparent)",
                    color: isSelected ? "var(--color-accent-strong)" : "var(--color-muted)",
                  }}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div
          style={{
            position: "relative",
            minWidth: 220,
            flex: "1 1 260px",
            maxWidth: 380,
          }}
        >
          <Search
            size={16}
            aria-hidden="true"
            style={{
              position: "absolute",
              left: 16,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--color-muted)",
              pointerEvents: "none",
            }}
          />
          <input
            type="search"
            aria-label="Search members by name or email"
            placeholder="Search by name or email..."
            value={localSearch}
            disabled={disabled}
            onChange={(e) => setLocalSearch(e.target.value)}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "var(--color-accent)";
              e.currentTarget.style.boxShadow =
                "0 0 0 3px color-mix(in srgb, var(--color-accent) 15%, transparent)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "var(--color-line)";
              e.currentTarget.style.boxShadow = "0 1px 2px rgba(24, 24, 27, 0.03)";
            }}
            style={{
              width: "100%",
              height: 42,
              padding: "0 38px 0 42px",
              borderRadius: 9999,
              backgroundColor: "var(--color-surface)",
              border: "1px solid var(--color-line)",
              color: "var(--color-ink)",
              fontSize: 13.5,
              outline: "none",
              boxShadow: "0 1px 3px rgba(24, 24, 27, 0.03)",
              transition: "border-color 0.15s ease, box-shadow 0.15s ease",
            }}
          />
          {localSearch && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => {
                setLocalSearch("");
                onSearchChange("");
              }}
              style={{
                position: "absolute",
                right: 10,
                top: "50%",
                transform: "translateY(-50%)",
                background: "color-mix(in srgb, var(--color-line) 80%, transparent)",
                border: "none",
                borderRadius: "50%",
                width: 20,
                height: 20,
                cursor: "pointer",
                color: "var(--color-ink)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "opacity 0.15s ease",
              }}
            >
              <X size={12} strokeWidth={2.2} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
