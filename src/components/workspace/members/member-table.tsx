import React from "react";
import type { WorkspaceMember } from "@/src/app/(workspace)/members-actions";
import { MemberStatusBadge } from "./member-status-badge";
import { Check } from "lucide-react";

interface MemberTableProps {
  members: WorkspaceMember[];
  onConfirm: (member: WorkspaceMember) => void;
  confirmingIds: Set<string>;
}

function formatDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(d);
  } catch {
    return isoString;
  }
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return (name[0] || "?").toUpperCase();
}

/**
 * Desktop table for the member roster adhering to docs/design.md:
 * - Columns: Member (avatar, name, email with ellipsis truncation and hover tooltip), Status, Joined Date, Actions.
 * - Confirm button rendered strictly for Pending members with explicit accessible aria-label naming the member.
 * - Fluid row hover transitions and subtle borders.
 */
export function MemberTable({ members, onConfirm, confirmingIds }: MemberTableProps) {
  return (
    <div
      tabIndex={0}
      role="region"
      aria-label="Members roster table"
      style={{
        width: "100%",
        backgroundColor: "var(--color-surface)",
        borderRadius: 22,
        border: "1px solid var(--color-line)",
        boxShadow: "0 4px 18px color-mix(in srgb, var(--color-ink) 3%, transparent)",
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          textAlign: "left",
          tableLayout: "fixed",
        }}
      >
        <thead>
          <tr
            style={{
              backgroundColor: "color-mix(in srgb, var(--color-base) 60%, transparent)",
              borderBottom: "1px solid var(--color-line)",
              fontSize: 12,
              fontWeight: 600,
              color: "var(--color-muted)",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            <th scope="col" style={{ padding: "14px 24px", width: "42%" }}>
              Member
            </th>
            <th scope="col" style={{ padding: "14px 20px", width: "18%" }}>
              Status
            </th>
            <th scope="col" style={{ padding: "14px 20px", width: "20%" }}>
              Joined
            </th>
            <th scope="col" style={{ padding: "14px 24px", width: "20%", textAlign: "right" }}>
              Action
            </th>
          </tr>
        </thead>
        <tbody style={{ fontSize: 13.5 }}>
          {members.map((member, idx) => {
            const isConfirming = confirmingIds.has(member.id);
            const isPending = member.status === "pending";

            return (
              <tr
                key={member.id}
                className="orgkit-member-row"
                style={{
                  borderBottom:
                    idx === members.length - 1 ? "none" : "1px solid var(--color-line)",
                  backgroundColor: "transparent",
                }}
              >
                {/* Member Info: Avatar Initials + Truncated Name & Email */}
                <td style={{ padding: "16px 24px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div
                      aria-hidden="true"
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        backgroundColor: isPending
                          ? "color-mix(in srgb, var(--color-accent) 12%, transparent)"
                          : "color-mix(in srgb, var(--color-line) 80%, transparent)",
                        color: isPending
                          ? "var(--color-accent-strong)"
                          : "var(--color-ink)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 12.5,
                        fontWeight: 700,
                        flexShrink: 0,
                        userSelect: "none",
                      }}
                    >
                      {getInitials(member.fullName)}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 2,
                        minWidth: 0,
                        overflow: "hidden",
                      }}
                    >
                      <span
                        title={member.fullName}
                        style={{
                          fontWeight: 600,
                          color: "var(--color-ink)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {member.fullName}
                      </span>
                      <span
                        title={member.email}
                        style={{
                          fontSize: 12.5,
                          color: "var(--color-muted)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {member.email}
                      </span>
                    </div>
                  </div>
                </td>

                {/* Status Badge */}
                <td style={{ padding: "16px 20px" }}>
                  <MemberStatusBadge status={member.status} />
                </td>

                {/* Joined Date */}
                <td
                  style={{
                    padding: "16px 20px",
                    color: "var(--color-muted)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {formatDate(member.createdAt)}
                </td>

                {/* Actions: Confirm button strictly for Pending members */}
                <td style={{ padding: "16px 24px", textAlign: "right" }}>
                  {isPending ? (
                    <button
                      type="button"
                      onClick={() => onConfirm(member)}
                      disabled={isConfirming}
                      aria-label={`Confirm ${member.fullName}`}
                      className="orgkit-btn-accent"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "7px 18px",
                        borderRadius: 9999,
                        backgroundColor: "var(--color-accent)",
                        color: "var(--color-on-accent)",
                        border: "none",
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: isConfirming ? "not-allowed" : "pointer",
                        opacity: isConfirming ? 0.7 : 1,
                        boxShadow: "0 2px 8px color-mix(in srgb, var(--color-accent) 25%, transparent)",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <Check size={14} strokeWidth={2.5} />
                      <span>{isConfirming ? "Confirming..." : "Confirm"}</span>
                    </button>
                  ) : (
                    <span style={{ fontSize: 13, color: "var(--color-muted)" }}>—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

