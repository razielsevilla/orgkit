import React from "react";
import { Search, X } from "lucide-react";

export type StatusFilterOption = "all" | "pending" | "active" | "inactive";

interface MembersSearchFilterProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: StatusFilterOption;
  onStatusChange: (status: StatusFilterOption) => void;
  pendingCount: number;
  totalCount: number;
}

export function MembersSearchFilter({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusChange,
  pendingCount,
  totalCount,
}: MembersSearchFilterProps) {
  const filterTabs: { id: StatusFilterOption; label: string; badge?: number }[] = [
    { id: "all", label: "All", badge: totalCount },
    { id: "pending", label: "Pending", badge: pendingCount },
    { id: "active", label: "Active" },
    { id: "inactive", label: "Inactive" },
  ];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        width: "100%",
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
            placeholder="Search by name or email"
            aria-label="Search by name or email"
            style={{
              width: "100%",
              height: 42,
              paddingLeft: 38,
              paddingRight: searchQuery ? 38 : 14,
              borderRadius: 9999,
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
            padding: 3,
            backgroundColor: "color-mix(in srgb, var(--color-line) 50%, transparent)",
            borderRadius: 9999,
            gap: 2,
          }}
        >
          {filterTabs.map((tab) => {
            const isActive = statusFilter === tab.id;
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
                  gap: 6,
                  padding: "6px 14px",
                  borderRadius: 9999,
                  border: "none",
                  backgroundColor: isActive ? "var(--color-surface)" : "transparent",
                  color: isActive ? "var(--color-ink)" : "var(--color-muted)",
                  fontWeight: isActive ? 600 : 500,
                  fontSize: 13,
                  cursor: "pointer",
                  boxShadow: isActive
                    ? "0 2px 8px color-mix(in srgb, var(--color-ink) 8%, transparent)"
                    : "none",
                  transition: "all 0.15s ease",
                  userSelect: "none",
                }}
              >
                <span>{tab.label}</span>
                {typeof tab.badge === "number" && tab.badge > 0 && (
                  <span
                    style={{
                      padding: "1px 6px",
                      borderRadius: 9999,
                      fontSize: 11,
                      fontWeight: 700,
                      backgroundColor:
                        tab.id === "pending"
                          ? "color-mix(in srgb, var(--color-accent) 15%, transparent)"
                          : "color-mix(in srgb, var(--color-line) 80%, transparent)",
                      color:
                        tab.id === "pending" ? "var(--color-accent-strong)" : "var(--color-ink)",
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

