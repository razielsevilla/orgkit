import React from "react";
import { Search, X } from "lucide-react";
import { FIELD_RADIUS } from "./member-table-layout";
import { ALL_TONE, STATUS_TONES } from "./member-status-tones";

export type StatusFilterOption = "all" | "pending" | "active" | "inactive";

interface MembersSearchFilterProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: StatusFilterOption;
  onStatusChange: (status: StatusFilterOption) => void;
  pendingCount: number;
  totalCount: number;
  inactiveCount?: number;
}

export function MembersSearchFilter({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusChange,
  pendingCount,
  totalCount,
  inactiveCount,
}: MembersSearchFilterProps) {
  const filterTabs: { id: StatusFilterOption; label: string; badge?: number }[] = [
    { id: "all", label: "All", badge: totalCount },
    { id: "pending", label: "Pending", badge: pendingCount },
    { id: "active", label: "Active" },
    { id: "inactive", label: "Inactive", badge: inactiveCount },
  ];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        width: "100%",
        marginTop: 4,
      }}
    >
      <div
        className="orgkit-search-filter-row"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        {/* Search Bar Input */}
        <div
          className="orgkit-search-bar"
          style={{
            position: "relative",
            flex: "1 1 280px",
            maxWidth: 420,
            display: "flex",
            alignItems: "center",
          }}
        >
          <Search
            size={16}
            aria-hidden="true"
            style={{
              position: "absolute",
              left: 14,
              color: "var(--color-muted)",
              pointerEvents: "none",
            }}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by name or email..."
            aria-label="Search by name or email"
            style={{
              width: "100%",
              height: 42,
              paddingLeft: 38,
              paddingRight: searchQuery ? 38 : 14,
              borderRadius: FIELD_RADIUS,
              backgroundColor: "var(--color-surface)",
              border: "1px solid var(--color-line)",
              color: "var(--color-ink)",
              fontSize: 13.5,
              outline: "none",
              transition: "all 0.15s ease",
              boxShadow: "0 1px 2px rgba(24, 24, 27, 0.03)",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "var(--color-accent)";
              e.currentTarget.style.boxShadow =
                "0 0 0 3px color-mix(in srgb, var(--color-accent) 15%, transparent)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "var(--color-line)";
              e.currentTarget.style.boxShadow = "0 1px 2px rgba(24, 24, 27, 0.03)";
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              aria-label="Clear search text"
              style={{
                position: "absolute",
                right: 12,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 20,
                height: 20,
                borderRadius: "50%",
                backgroundColor: "color-mix(in srgb, var(--color-line) 80%, transparent)",
                border: "none",
                cursor: "pointer",
                color: "var(--color-ink)",
                padding: 0,
              }}
            >
              <X size={12} strokeWidth={2.5} />
            </button>
          )}
        </div>

        {/* Status Filter Tab Pills */}
        <div
          role="tablist"
          aria-label="Filter members by status"
          className="orgkit-status-tabs"
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: 2,
            borderRadius: 9999,
            gap: 6,
          }}
        >
          {filterTabs.map((tab) => {
            const isActive = statusFilter === tab.id;
            // Each tab wears its status color; "All" is neutral
            const tone = tab.id === "all" ? ALL_TONE : STATUS_TONES[tab.id];
            return (
              <button
                key={tab.id}
                role="tab"
                type="button"
                aria-selected={isActive}
                onClick={() => onStatusChange(tab.id)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "6px 14px",
                  borderRadius: 9999,
                  border: isActive ? tone.border : "1px solid transparent",
                  backgroundColor: isActive ? tone.background : "transparent",
                  color: isActive ? tone.text : "var(--color-muted)",
                  fontWeight: isActive ? 600 : 500,
                  fontSize: 13,
                  cursor: "pointer",
                  transition: "background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease",
                  userSelect: "none",
                }}
              >
                <span>{tab.label}</span>
                {typeof tab.badge === "number" && tab.badge > 0 && tab.id !== "all" && (
                  <span
                    style={{
                      padding: "1px 6px",
                      borderRadius: 9999,
                      fontSize: 11,
                      fontWeight: 700,
                      backgroundColor: tone.background,
                      color: tone.text,
                    }}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

