"use client";

import React from "react";
import { Trash2 } from "lucide-react";
import { OfficerRole } from "@/src/lib/orgs/permissions";
import {
  WorkspaceOfficersData,
  ActiveOfficer,
} from "@/src/app/(workspace)/officers-actions";
import {
  LAST_ADMIN_MESSAGE,
  getInitials,
  formatDate,
  roleBadgeStyles,
} from "./officers-helpers";
import { OfficerRoleDropdown } from "./role-dropdown";

interface ActiveOfficersSectionProps {
  data: WorkspaceOfficersData;
  loading: boolean;
  handleRoleChange: (officer: ActiveOfficer, newRole: OfficerRole) => Promise<void>;
  setPageError: (message: string | null) => void;
  setRemoveTarget: (officer: ActiveOfficer | null) => void;
}

export function ActiveOfficersSection({
  data,
  loading,
  handleRoleChange,
  setPageError,
  setRemoveTarget,
}: ActiveOfficersSectionProps) {
  return (
    <section
      data-tour="officers-list"
      style={{
        backgroundColor: "var(--color-surface)",
        borderRadius: 22,
        border: "1px solid var(--color-line)",
        boxShadow: "0 4px 18px color-mix(in srgb, var(--color-ink) 3%, transparent)",
        overflow: "visible",
        marginBottom: 32,
      }}
    >
      <div
        style={{
          padding: "18px 24px",
          borderBottom: "1px solid var(--color-line)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderRadius: "22px 22px 0 0",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <h2
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: "var(--color-ink)",
              margin: 0,
              letterSpacing: "-0.01em",
            }}
          >
            Active officers
          </h2>
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "var(--color-muted)",
              backgroundColor: "var(--color-base)",
              padding: "2px 8px",
              borderRadius: 9999,
            }}
          >
            {data.officerCount} / 30
          </span>
        </div>
      </div>

      {/* Officers List */}
      <div style={{ display: "flex", flexDirection: "column" }}>
        {data.officers.map((officer, idx) => {
          const isSoleAdmin = officer.role === "admin" && data.adminCount <= 1;
          const badgeStyle = roleBadgeStyles[officer.role];

          return (
            <div
              key={officer.id}
              className="orgkit-officer-row"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                padding: "16px 24px",
                borderBottom:
                  idx < data.officers.length - 1 ? "1px solid var(--color-base)" : "none",
                backgroundColor: "var(--color-surface)",
                borderRadius: idx === data.officers.length - 1 ? "0 0 22px 22px" : undefined,
                transition: "background-color 0.15s ease",
              }}
            >
              {/* Left: Avatar + Details */}
              <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0, flex: "1 1 auto" }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    backgroundColor: "color-mix(in srgb, var(--color-accent) 10%, transparent)",
                    border: "1px solid color-mix(in srgb, var(--color-accent) 20%, transparent)",
                    color: "var(--color-accent)",
                    fontSize: 13,
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {getInitials(officer.fullName)}
                </div>

                {/* minWidth: 0 lets a long name or email wrap instead of widening the row */}
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: "var(--color-ink)",
                        lineHeight: 1.2,
                        overflowWrap: "anywhere",
                      }}
                    >
                      {officer.fullName}
                    </span>

                    {/* "You" Tag on own row */}
                    {officer.isCurrentUser && (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: "var(--color-accent-strong)",
                          backgroundColor: "color-mix(in srgb, var(--color-accent) 12%, transparent)",
                          padding: "2px 7px",
                          borderRadius: 9999,
                          letterSpacing: "0.02em",
                        }}
                      >
                        You
                      </span>
                    )}

                    {/* Read-only Role Badge (for non-admins or as secondary tag) */}
                    {!data.canManageRoles && (
                      <span
                        style={{
                          fontSize: 11.5,
                          fontWeight: 600,
                          color: badgeStyle.text,
                          backgroundColor: badgeStyle.bg,
                          border: `1px solid ${badgeStyle.border}`,
                          padding: "2px 8px",
                          borderRadius: 9999,
                          textTransform: "capitalize",
                        }}
                      >
                        {officer.role}
                      </span>
                    )}
                  </div>

                  {/* Email (Admins only per Ticket Conflict 8) */}
                  {officer.email ? (
                    <span
                      style={{
                        display: "block",
                        fontSize: 12,
                        color: "var(--color-muted)",
                        marginTop: 3,
                        overflowWrap: "anywhere",
                      }}
                    >
                      {officer.email}
                    </span>
                  ) : (
                    <span
                      style={{
                        display: "block",
                        fontSize: 11.5,
                        color: "var(--color-muted-soft)",
                        marginTop: 2,
                      }}
                    >
                      Joined {formatDate(officer.joinedAt)}
                    </span>
                  )}
                </div>
              </div>

              {/* Right: Controls (Admins only) */}
              {data.canManageRoles && (
                <div
                  className="orgkit-officer-controls"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 12,
                  }}
                >
                  {/* Role select */}
                  <OfficerRoleDropdown
                    officer={officer}
                    isSoleAdmin={isSoleAdmin}
                    disabled={loading}
                    onChangeRole={handleRoleChange}
                    onBlockedSoleAdmin={() => setPageError(LAST_ADMIN_MESSAGE)}
                  />

                  {/* Remove button */}
                  {data.canRemove && (
                    <button
                      type="button"
                      onClick={() => {
                        if (isSoleAdmin) {
                          setPageError(LAST_ADMIN_MESSAGE);
                          return;
                        }
                        setRemoveTarget(officer);
                      }}
                      disabled={loading}
                      title={isSoleAdmin ? LAST_ADMIN_MESSAGE : undefined}
                      aria-label={`Remove ${officer.fullName}`}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "6px 12px",
                        borderRadius: 9999,
                        border: "1px solid var(--color-line)",
                        backgroundColor: "var(--color-surface)",
                        color: "var(--color-danger)",
                        fontSize: 12,
                        fontWeight: 500,
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                        opacity: isSoleAdmin ? 0.6 : 1,
                      }}
                      onMouseEnter={(e) => {
                        if (!isSoleAdmin && !loading) {
                          e.currentTarget.style.backgroundColor = "var(--color-danger-soft)";
                          e.currentTarget.style.borderColor = "var(--color-danger-line)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSoleAdmin && !loading) {
                          e.currentTarget.style.backgroundColor = "var(--color-surface)";
                          e.currentTarget.style.borderColor = "var(--color-line)";
                        }
                      }}
                    >
                      <Trash2 size={13} />
                      <span>Remove</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
