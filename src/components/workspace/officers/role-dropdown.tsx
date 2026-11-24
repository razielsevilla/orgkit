"use client";

import React, { useRef, useState } from "react";
import { Check, ChevronDown, Shield, UserCheck, Wallet } from "lucide-react";
import { OfficerRole } from "@/src/lib/orgs/permissions";
import { ActiveOfficer } from "@/src/app/(workspace)/officers-actions";
import { useDismissable } from "@/src/lib/use-dismissable";
import { LAST_ADMIN_MESSAGE, roleBadgeStyles } from "./officers-helpers";

interface OfficerRoleDropdownProps {
  officer: ActiveOfficer;
  isSoleAdmin: boolean;
  disabled: boolean;
  onChangeRole: (officer: ActiveOfficer, newRole: OfficerRole) => Promise<void>;
  onBlockedSoleAdmin?: () => void;
}

const ROLES: readonly {
  role: OfficerRole;
  label: string;
  icon: typeof Shield;
}[] = [
  { role: "admin", label: "Admin", icon: Shield },
  { role: "finance", label: "Finance", icon: Wallet },
  { role: "officer", label: "Officer", icon: UserCheck },
];

export function OfficerRoleDropdown({
  officer,
  isSoleAdmin,
  disabled,
  onChangeRole,
  onBlockedSoleAdmin,
}: OfficerRoleDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useDismissable(containerRef, () => setIsOpen(false));

  const badgeStyle = roleBadgeStyles[officer.role];
  const currentRole = ROLES.find((r) => r.role === officer.role) || ROLES[0];

  const handleTriggerClick = () => {
    if (disabled) return;
    if (isSoleAdmin) {
      onBlockedSoleAdmin?.();
      return;
    }
    setIsOpen((prev) => !prev);
  };

  const handleSelectRole = (newRole: OfficerRole) => {
    setIsOpen(false);
    if (newRole !== officer.role) {
      onChangeRole(officer, newRole);
    }
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        display: "inline-block",
      }}
    >
      {/* Pill Trigger */}
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`Role for ${officer.fullName}, currently ${currentRole.label}`}
        onClick={handleTriggerClick}
        disabled={disabled}
        title={isSoleAdmin ? LAST_ADMIN_MESSAGE : undefined}
        className="orgkit-officer-pill-trigger"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "5px 12px",
          borderRadius: 9999,
          border: `1px solid ${badgeStyle.border}`,
          backgroundColor: badgeStyle.bg,
          color: badgeStyle.text,
          fontSize: 12.5,
          fontWeight: 600,
          cursor: disabled || isSoleAdmin ? "not-allowed" : "pointer",
          outline: "none",
          transition: "all 0.15s ease",
          boxShadow: isOpen
            ? `0 0 0 2px color-mix(in srgb, ${badgeStyle.border} 80%, transparent)`
            : "none",
        }}
      >
        <span>{currentRole.label}</span>
        <ChevronDown
          size={13}
          strokeWidth={2.4}
          aria-hidden="true"
          style={{
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.18s ease",
            opacity: 0.85,
          }}
        />
      </button>

      {/* Styled Popover Menu */}
      {isOpen && (
        <div
          role="listbox"
          aria-label="Select officer role"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            minWidth: 154,
            backgroundColor: "var(--color-surface)",
            border: "1px solid var(--color-line)",
            borderRadius: 14,
            padding: 5,
            boxShadow:
              "0 12px 30px rgba(24, 24, 27, 0.1), 0 2px 8px rgba(24, 24, 27, 0.04)",
            zIndex: 60,
            display: "flex",
            flexDirection: "column",
            gap: 2,
            boxSizing: "border-box",
            animation: "cardPopout 0.15s cubic-bezier(0.16, 1, 0.3, 1) both",
          }}
        >
          {ROLES.map((r) => {
            const isSelected = officer.role === r.role;
            const Icon = r.icon;
            const roleStyle = roleBadgeStyles[r.role];

            return (
              <button
                key={r.role}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => handleSelectRole(r.role)}
                className="orgkit-role-option"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: 9,
                  border: "none",
                  backgroundColor: isSelected
                    ? "color-mix(in srgb, var(--color-accent) 10%, transparent)"
                    : "transparent",
                  color: isSelected
                    ? "var(--color-accent-strong)"
                    : "var(--color-ink)",
                  fontSize: 12.5,
                  fontWeight: isSelected ? 600 : 500,
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.12s ease",
                  boxSizing: "border-box",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 6,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: roleStyle.bg,
                      color: roleStyle.text,
                    }}
                  >
                    <Icon size={12} strokeWidth={2.4} aria-hidden="true" />
                  </div>
                  <span>{r.label}</span>
                </div>
                {isSelected && (
                  <Check
                    size={14}
                    strokeWidth={2.5}
                    color="var(--color-accent-strong)"
                    aria-hidden="true"
                  />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
