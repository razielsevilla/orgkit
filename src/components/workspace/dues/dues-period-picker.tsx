"use client";

import React from "react";
import { ChevronDown, Calendar, Plus } from "lucide-react";
import type { DuesPeriod } from "@/src/app/(workspace)/dues-actions";
import { DuesStatusPill } from "./dues-status-pill";
import { formatPeso } from "@/src/lib/dues/dues-dashboard";

interface DuesPeriodPickerProps {
  periods: DuesPeriod[];
  selectedPeriodId: string;
  onSelectPeriod: (periodId: string) => void;
  onCreatePeriod?: () => void;
  disabled?: boolean;
}

export function DuesPeriodPicker({
  periods,
  selectedPeriodId,
  onSelectPeriod,
  onCreatePeriod,
  disabled = false,
}: DuesPeriodPickerProps) {
  const selectedPeriod = periods.find((p) => p.id === selectedPeriodId) || periods[0];

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        width: "100%",
        padding: "16px 20px",
        backgroundColor: "var(--color-surface)",
        border: "1px solid var(--color-line)",
        borderRadius: 14,
        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 14,
          minWidth: 0,
        }}
      >
        <div style={{ position: "relative", minWidth: 220, maxWidth: 360 }}>
          <label htmlFor="dues-period-select" className="sr-only" style={{ display: "none" }}>
            Select dues period
          </label>
          <select
            id="dues-period-select"
            aria-label="Select dues period"
            disabled={disabled || periods.length === 0}
            value={selectedPeriod?.id || ""}
            onChange={(e) => onSelectPeriod(e.target.value)}
            style={{
              width: "100%",
              height: 40,
              padding: "0 36px 0 14px",
              appearance: "none",
              borderRadius: 10,
              backgroundColor: "color-mix(in srgb, var(--color-surface) 90%, var(--color-line) 10%)",
              border: "1px solid var(--color-line)",
              color: "var(--color-ink)",
              fontSize: 14,
              fontWeight: 600,
              cursor: disabled ? "not-allowed" : "pointer",
              outline: "none",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              overflow: "hidden",
            }}
          >
            {periods.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.status === "open" ? "Open" : "Closed"})
              </option>
            ))}
          </select>
          <ChevronDown
            size={16}
            aria-hidden="true"
            style={{
              position: "absolute",
              right: 12,
              top: "50%",
              transform: "translateY(-50%)",
              pointerEvents: "none",
              color: "var(--color-muted)",
            }}
          />
        </div>

        {selectedPeriod && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 10,
              fontSize: 13,
              color: "var(--color-muted)",
            }}
          >
            <DuesStatusPill status={selectedPeriod.status} size="sm" />
            <span style={{ fontWeight: 600, color: "var(--color-ink)" }}>
              {formatPeso(selectedPeriod.amount)} / member
            </span>
            <span aria-hidden="true">•</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <Calendar size={13} style={{ flexShrink: 0 }} />
              Due {selectedPeriod.dueOn}
            </span>
          </div>
        )}
      </div>

      {onCreatePeriod && (
        <button
          type="button"
          onClick={onCreatePeriod}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            height: 36,
            padding: "0 14px",
            borderRadius: 8,
            backgroundColor: "transparent",
            border: "1px solid var(--color-line)",
            color: "var(--color-ink)",
            fontSize: 13,
            fontWeight: 500,
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "var(--color-surface-hover, rgba(0,0,0,0.03))";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
          }}
        >
          <Plus size={14} strokeWidth={2.2} />
          New period
        </button>
      )}
    </div>
  );
}
