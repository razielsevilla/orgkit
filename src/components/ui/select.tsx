"use client";

import React, { useRef, useState, useId } from "react";
import { ChevronDown, Check } from "lucide-react";
import { useDismissable } from "@/src/lib/use-dismissable";

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
  icon?: React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>;
}

export interface SelectProps {
  id?: string;
  name?: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly (string | SelectOption)[];
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  ariaLabel?: string;
  error?: boolean | string;
  className?: string;
  style?: React.CSSProperties;
  triggerStyle?: React.CSSProperties;
  popoverStyle?: React.CSSProperties;
  fullWidth?: boolean;
  size?: "sm" | "md" | "lg";
}

export function Select({
  id,
  name,
  value,
  onChange,
  options,
  placeholder = "Select an option...",
  disabled = false,
  required = false,
  ariaLabel,
  error,
  className = "",
  style,
  triggerStyle,
  popoverStyle,
  fullWidth = true,
  size = "md",
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const generatedId = useId();
  const selectId = id || generatedId;

  useDismissable(containerRef, () => setIsOpen(false));

  const normalizedOptions: SelectOption[] = options.map((opt) =>
    typeof opt === "string" ? { value: opt, label: opt } : opt
  );

  const selectedOption = normalizedOptions.find((opt) => opt.value === value);

  const handleSelect = (optionValue: string, optionDisabled?: boolean) => {
    if (disabled || optionDisabled) return;
    onChange(optionValue);
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setIsOpen((prev) => !prev);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        return;
      }
      const currentIndex = normalizedOptions.findIndex((opt) => opt.value === value);
      const nextIndex = (currentIndex + 1) % normalizedOptions.length;
      if (!normalizedOptions[nextIndex].disabled) {
        onChange(normalizedOptions[nextIndex].value);
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        return;
      }
      const currentIndex = normalizedOptions.findIndex((opt) => opt.value === value);
      const prevIndex = (currentIndex - 1 + normalizedOptions.length) % normalizedOptions.length;
      if (!normalizedOptions[prevIndex].disabled) {
        onChange(normalizedOptions[prevIndex].value);
      }
    }
  };

  const heightBySize = {
    sm: 36,
    md: 44,
    lg: 48,
  }[size];

  const fontSizeBySize = {
    sm: 13,
    md: 13.5,
    lg: 14.5,
  }[size];

  const paddingBySize = {
    sm: "6px 10px",
    md: "8px 12px",
    lg: "10px 14px",
  }[size];

  const hasError = Boolean(error);

  return (
    <div
      ref={containerRef}
      className={`orgkit-select-container ${className}`}
      style={{
        position: "relative",
        width: fullWidth ? "100%" : "auto",
        display: fullWidth ? "block" : "inline-block",
        ...style,
      }}
    >
      {/* Visual Custom Trigger */}
      <button
        type="button"
        id={`${selectId}-trigger`}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={`${selectId}-listbox`}
        aria-label={ariaLabel || placeholder}
        aria-required={required}
        aria-invalid={hasError}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
        className="orgkit-select-trigger"
        style={{
          width: "100%",
          minHeight: heightBySize,
          padding: paddingBySize,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          borderRadius: 12,
          border: hasError ? "1.5px solid #dc2626" : "1px solid var(--color-line)",
          backgroundColor: disabled ? "var(--color-base)" : "var(--color-surface)",
          color: selectedOption ? "var(--color-ink)" : "var(--color-muted)",
          fontSize: fontSizeBySize,
          fontWeight: 500,
          cursor: disabled ? "not-allowed" : "pointer",
          outline: "none",
          transition: "all 0.15s ease",
          boxShadow: isOpen
            ? "0 0 0 2px color-mix(in srgb, var(--color-accent) 25%, transparent)"
            : "none",
          boxSizing: "border-box",
          ...triggerStyle,
        }}
      >
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {selectedOption?.icon && (
            <selectedOption.icon
              size={15}
              style={{ color: "var(--color-accent)", flexShrink: 0 }}
            />
          )}
          <span>{selectedOption ? selectedOption.label : placeholder}</span>
        </span>

        <ChevronDown
          size={15}
          strokeWidth={2.2}
          aria-hidden="true"
          style={{
            color: "var(--color-muted)",
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.18s ease",
            flexShrink: 0,
          }}
        />
      </button>

      {/* Styled Floating Popover Menu */}
      {isOpen && (
        <div
          role="listbox"
          id={`${selectId}-listbox`}
          aria-label={ariaLabel || placeholder}
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            width: "100%",
            minWidth: 180,
            maxHeight: 280,
            overflowY: "auto",
            backgroundColor: "var(--color-surface)",
            border: "1px solid var(--color-line)",
            borderRadius: 14,
            padding: 5,
            boxShadow:
              "0 12px 30px rgba(24, 24, 27, 0.1), 0 2px 8px rgba(24, 24, 27, 0.04)",
            zIndex: 70,
            display: "flex",
            flexDirection: "column",
            gap: 2,
            boxSizing: "border-box",
            animation: "cardPopout 0.15s cubic-bezier(0.16, 1, 0.3, 1) both",
            ...popoverStyle,
          }}
        >
          {normalizedOptions.map((opt) => {
            const isSelected = opt.value === value;
            const isOptDisabled = Boolean(opt.disabled);

            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                disabled={isOptDisabled}
                onClick={() => handleSelect(opt.value, isOptDisabled)}
                className="orgkit-select-option"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                  width: "100%",
                  minHeight: 38,
                  padding: "8px 12px",
                  borderRadius: 9,
                  border: "none",
                  backgroundColor: isSelected
                    ? "color-mix(in srgb, var(--color-accent) 10%, transparent)"
                    : "transparent",
                  color: isSelected
                    ? "var(--color-accent-strong)"
                    : isOptDisabled
                    ? "var(--color-muted)"
                    : "var(--color-ink)",
                  fontSize: fontSizeBySize,
                  fontWeight: isSelected ? 600 : 500,
                  cursor: isOptDisabled ? "not-allowed" : "pointer",
                  textAlign: "left",
                  opacity: isOptDisabled ? 0.5 : 1,
                  transition: "all 0.12s ease",
                  boxSizing: "border-box",
                }}
                onMouseEnter={(e) => {
                  if (!isSelected && !isOptDisabled) {
                    e.currentTarget.style.backgroundColor =
                      "color-mix(in srgb, var(--color-ink) 4%, transparent)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected && !isOptDisabled) {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                  {opt.icon && (
                    <opt.icon
                      size={15}
                      style={{
                        color: isSelected ? "var(--color-accent-strong)" : "var(--color-muted)",
                        flexShrink: 0,
                      }}
                    />
                  )}
                  <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                    <span
                      style={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {opt.label}
                    </span>
                    {opt.description && (
                      <span
                        style={{
                          fontSize: 11.5,
                          color: "var(--color-muted)",
                          fontWeight: 400,
                        }}
                      >
                        {opt.description}
                      </span>
                    )}
                  </div>
                </div>

                {isSelected && (
                  <Check
                    size={14}
                    strokeWidth={2.4}
                    aria-hidden="true"
                    style={{ color: "var(--color-accent)", flexShrink: 0 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Accessible synchronized hidden native select for forms and test runners */}
      <select
        id={selectId}
        name={name}
        value={value}
        tabIndex={-1}
        aria-hidden="true"
        disabled={disabled}
        required={required}
        onChange={(e) => onChange(e.target.value)}
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
        {placeholder && <option value="">{placeholder}</option>}
        {normalizedOptions.map((opt) => (
          <option key={opt.value} value={opt.value} disabled={opt.disabled}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
