"use client";

import React from "react";
import { Users, SearchX } from "lucide-react";

interface DuesDashboardEmptyProps {
  type: "no_members" | "no_results";
  searchQuery?: string;
  onClearFilters?: () => void;
}

export function DuesDashboardEmpty({
  type,
  searchQuery,
  onClearFilters,
}: DuesDashboardEmptyProps) {
  if (type === "no_results") {
    return (
      <div
        role="status"
        aria-label="No matching members"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "48px 24px",
          textAlign: "center",
          color: "var(--color-muted)",
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            backgroundColor: "color-mix(in srgb, var(--color-ink) 5%, transparent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 12,
            color: "var(--color-muted)",
          }}
        >
          <SearchX size={20} />
        </div>
        <h3
          style={{
            margin: "0 0 6px 0",
            fontSize: 15,
            fontWeight: 700,
            color: "var(--color-ink)",
          }}
        >
          No matching members found
        </h3>
        <p
          style={{
            margin: 0,
            fontSize: 13,
            maxWidth: 360,
            lineHeight: 1.45,
          }}
        >
          {searchQuery
            ? `No members matching "${searchQuery}" in this status.`
            : "No members match the current status filter."}
        </p>
        {onClearFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            style={{
              marginTop: 14,
              padding: "6px 14px",
              borderRadius: 8,
              border: "1px solid var(--color-line)",
              backgroundColor: "var(--color-surface)",
              color: "var(--color-ink)",
              fontSize: 12.5,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Clear filters
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-label="No active members yet"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "64px 24px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: "50%",
          backgroundColor: "color-mix(in srgb, var(--color-accent) 12%, transparent)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 14,
          color: "var(--color-accent)",
        }}
      >
        <Users size={24} />
      </div>
      <h3
        style={{
          margin: "0 0 6px 0",
          fontSize: 17,
          fontWeight: 700,
          color: "var(--color-ink)",
        }}
      >
        No active members yet
      </h3>
      <p
        style={{
          margin: 0,
          fontSize: 13.5,
          color: "var(--color-muted)",
          maxWidth: 380,
          lineHeight: 1.5,
        }}
      >
        Once students join and are confirmed on the roster, they will appear here with their dues status.
      </p>
    </div>
  );
}
