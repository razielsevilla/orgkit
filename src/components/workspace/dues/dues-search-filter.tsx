"use client";

import React, { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import type { DuesStatusFilter, DuesPeriodSummary } from "@/src/lib/dues/dues-dashboard";
import { DUES_STATUS_TONES } from "./dues-member-status-pill";

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

  // Sync incoming search query (e.g. reset)
  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

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
            gap: 4,
            padding: 4,
            borderRadius: 10,
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
                  padding: "6px 12px",
                  borderRadius: 7,
                  fontSize: 13,
                  fontWeight: isSelected ? 700 : 500,
                  color: isSelected ? "var(--color-ink)" : "var(--color-muted)",
                  backgroundColor: isSelected ? "var(--color-surface)" : "transparent",
                  border: isSelected ? "1px solid var(--color-line)" : "1px solid transparent",
                  cursor: disabled ? "not-allowed" : "pointer",
                  transition: "all 0.15s ease",
                  whiteSpace: "nowrap",
                  boxShadow: isSelected ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
                }}
              >
                <span>{tab.label}</span>
                <span
                  style={{
                    fontSize: 11.5,
                    fontWeight: 700,
                    padding: "1px 6px",
                    borderRadius: 9999,
                    backgroundColor: isSelected
                      ? "color-mix(in srgb, var(--color-ink) 10%, transparent)"
                      : "color-mix(in srgb, var(--color-ink) 5%, transparent)",
                    color: isSelected ? "var(--color-ink)" : "var(--color-muted)",
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
            flex: "1 1 240px",
            maxWidth: 360,
          }}
        >
          <Search
            size={15}
            aria-hidden="true"
            style={{
              position: "absolute",
              left: 12,
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
            style={{
              width: "100%",
              height: 38,
              padding: "0 34px 0 34px",
              borderRadius: 8,
              backgroundColor: "var(--color-surface)",
              border: "1px solid var(--color-line)",
              color: "var(--color-ink)",
              fontSize: 13,
              outline: "none",
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
                right: 8,
                top: "50%",
                transform: "translateY(-50%)",
                background: "transparent",
                border: "none",
                padding: 4,
                cursor: "pointer",
                color: "var(--color-muted)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
