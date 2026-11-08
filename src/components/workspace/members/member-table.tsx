import React from "react";
import type { WorkspaceMember } from "@/src/app/(workspace)/members-actions";
import { MemberStatusBadge } from "./member-status-badge";
import { MemberActions } from "./member-actions";

interface MemberTableProps {
  members: WorkspaceMember[];
  onConfirm: (member: WorkspaceMember) => void;
  onEdit: (member: WorkspaceMember) => void;
  onDeactivate: (member: WorkspaceMember) => void;
  onReactivate: (member: WorkspaceMember) => void;
  confirmingIds: Set<string>;
  reactivatingIds?: Set<string>;
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
 * - Actions include Edit, Deactivate, Reactivate, and Confirm with clear accessibility labels.
 * - Fluid row hover transitions and subtle zinc borders.
 */
export function MemberTable({
  members,
  onConfirm,
  onEdit,
  onDeactivate,
  onReactivate,
  confirmingIds,
  reactivatingIds = new Set(),
}: MemberTableProps) {
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
            <th scope="col" style={{ padding: "14px 24px", width: "36%" }}>
              Member
            </th>
            <th scope="col" style={{ padding: "14px 20px", width: "16%" }}>
              Status
            </th>
            <th scope="col" style={{ padding: "14px 20px", width: "18%" }}>
              Joined
            </th>
            <th scope="col" style={{ padding: "14px 24px", width: "30%", textAlign: "right" }}>
              Actions
            </th>
          </tr>
        </thead>
        <tbody style={{ fontSize: 13.5 }}>
          {members.map((member, idx) => {
            const isConfirming = confirmingIds.has(member.id);
            const isReactivating = reactivatingIds.has(member.id);
            const isPending = member.status === "pending";

            return (
              <tr
                key={member.id}
                className="orgkit-member-row"
                style={{
                  borderBottom:
                    idx === members.length - 1 ? "none" : "1px solid var(--color-line)",
                  backgroundColor: "transparent",
                  transition: "background-color 0.15s ease",
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

                {/* Actions Cell */}
                <td style={{ padding: "16px 24px", textAlign: "right" }}>
                  <MemberActions
                    member={member}
                    onConfirm={onConfirm}
                    onEdit={onEdit}
                    onDeactivate={onDeactivate}
                    onReactivate={onReactivate}
                    isConfirming={isConfirming}
                    isReactivating={isReactivating}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
