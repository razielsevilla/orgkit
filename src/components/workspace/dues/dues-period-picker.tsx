"use client";

import React, { useEffect, useRef, useState } from "react";
import { ChevronDown, Calendar, Layers, Check } from "lucide-react";
import type { DuesPeriod } from "@/src/app/(workspace)/dues-shared";
import { DuesStatusPill } from "./dues-status-pill";
import { formatPeso } from "@/src/lib/dues/dues-dashboard";

interface DuesPeriodPickerProps {
  periods: DuesPeriod[];
  selectedPeriodId: string;
  onSelectPeriod: (periodId: string) => void;
  disabled?: boolean;
}

export function DuesPeriodPicker({
  periods,
  selectedPeriodId,
  onSelectPeriod,
  disabled = false,
}: DuesPeriodPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedPeriod = periods.find((p) => p.id === selectedPeriodId) || periods[0];

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        width: "100%",
        padding: "18px 24px",
        backgroundColor: "var(--color-surface)",
        border: "1px solid var(--color-line)",
        borderRadius: 24,
        boxShadow: "0 2px 10px rgba(24, 24, 27, 0.03)",
        boxSizing: "border-box",
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
        {/* Custom Styled Dropdown Trigger and Popover */}
        <div
          ref={containerRef}
          style={{
            position: "relative",
            minWidth: 230,
            maxWidth: 360,
          }}
        >
          <button
            type="button"
            id="dues-period-select-btn"
            aria-haspopup="listbox"
            aria-expanded={isOpen}
            aria-label="Select dues period"
            disabled={disabled || periods.length === 0}
            onClick={() => setIsOpen((prev) => !prev)}
            style={{
              width: "100%",
              height: 42,
              padding: "0 36px 0 38px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderRadius: 12,
              backgroundColor: "var(--color-surface)",
              border: `1px solid ${isOpen ? "var(--color-accent)" : "var(--color-line)"}`,
              boxShadow: isOpen
                ? "0 0 0 3px color-mix(in srgb, var(--color-accent) 15%, transparent)"
                : "none",
              color: "var(--color-ink)",
              fontSize: 13.5,
              fontWeight: 600,
              cursor: disabled ? "not-allowed" : "pointer",
              outline: "none",
              transition: "border-color 0.15s ease, box-shadow 0.15s ease",
              textAlign: "left",
            }}
          >
            <Layers
              size={16}
              strokeWidth={2}
              aria-hidden="true"
              style={{
                position: "absolute",
                left: 14,
                top: "50%",
                transform: "translateY(-50%)",
                pointerEvents: "none",
                color: "var(--color-ink)",
              }}
            />
            <span
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                marginRight: 6,
              }}
            >
              {selectedPeriod ? `${selectedPeriod.name} (${selectedPeriod.status === "open" ? "Open" : "Closed"})` : "Select period"}
            </span>
            <ChevronDown
              size={16}
              aria-hidden="true"
              style={{
                position: "absolute",
                right: 12,
                top: "50%",
                transform: `translateY(-50%) ${isOpen ? "rotate(180deg)" : "rotate(0deg)"}`,
                transition: "transform 0.2s ease",
                pointerEvents: "none",
                color: "var(--color-muted)",
              }}
            />
          </button>

          {/* Custom Dropdown Popover Menu */}
          {isOpen && (
            <div
              role="listbox"
              aria-label="Dues periods"
              style={{
                position: "absolute",
                top: "calc(100% + 6px)",
                left: 0,
                width: "max-content",
                minWidth: "100%",
                maxWidth: 320,
                backgroundColor: "var(--color-surface)",
                border: "1px solid var(--color-line)",
                borderRadius: 14,
                boxShadow: "0 10px 30px rgba(24, 24, 27, 0.12), 0 2px 6px rgba(24, 24, 27, 0.04)",
                padding: "6px",
                zIndex: 60,
                boxSizing: "border-box",
                animation: "orgkitCardFadeIn 0.18s cubic-bezier(0.16, 1, 0.3, 1) both",
              }}
            >
              {periods.map((p) => {
                const isSelected = p.id === selectedPeriod?.id;
                return (
                  <div
                    key={p.id}
                    role="option"
                    aria-selected={isSelected}
                    tabIndex={0}
                    onClick={() => {
                      onSelectPeriod(p.id);
                      setIsOpen(false);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onSelectPeriod(p.id);
                        setIsOpen(false);
                      }
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                      padding: "8px 12px",
                      borderRadius: 10,
                      backgroundColor: isSelected
                        ? "color-mix(in srgb, var(--color-accent) 10%, transparent)"
                        : "transparent",
                      color: isSelected ? "var(--color-accent-strong)" : "var(--color-ink)",
                      fontSize: 13,
                      fontWeight: isSelected ? 700 : 500,
                      cursor: "pointer",
                      transition: "background-color 0.12s ease",
                      userSelect: "none",
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.backgroundColor =
                          "color-mix(in srgb, var(--color-ink) 4%, transparent)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }
                    }}
                  >
                    <span
                      style={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {p.name} ({p.status === "open" ? "Open" : "Closed"})
                    </span>
                    {isSelected && (
                      <Check
                        size={15}
                        strokeWidth={2.5}
                        style={{ color: "var(--color-accent)", flexShrink: 0 }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Accessible hidden select for SSR, form submission, and test runner assertions */}
          <select
            id="dues-period-select"
            aria-label="Select dues period hidden"
            tabIndex={-1}
            aria-hidden="true"
            value={selectedPeriod?.id || ""}
            onChange={(e) => onSelectPeriod(e.target.value)}
            style={{
              position: "absolute",
              opacity: 0,
              pointerEvents: "none",
              width: 0,
              height: 0,
              margin: 0,
              padding: 0,
              border: 0,
            }}
          >
            {periods.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.status === "open" ? "Open" : "Closed"})
              </option>
            ))}
          </select>
        </div>

        {selectedPeriod && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12,
              fontSize: 13,
              color: "var(--color-muted)",
            }}
          >
            <DuesStatusPill status={selectedPeriod.status} size="sm" />
            <span style={{ fontWeight: 700, color: "var(--color-ink)", fontSize: 13.5 }}>
              {formatPeso(selectedPeriod.amount)} / member
            </span>
            <span aria-hidden="true" style={{ color: "var(--color-line-strong)" }}>•</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
              <Calendar size={14} strokeWidth={1.6} style={{ flexShrink: 0, color: "var(--color-muted)" }} />
              Due {selectedPeriod.dueOn}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
