"use client";

import React from "react";
import { Clock, RefreshCw, XCircle } from "lucide-react";
import {
  WorkspaceOfficersData,
  PendingInvite,
} from "@/src/app/(workspace)/officers-actions";
import { formatDate } from "./officers-helpers";

interface PendingInvitesSectionProps {
  data: WorkspaceOfficersData;
  loading: boolean;
  handleRecreate: (invite: PendingInvite) => Promise<void>;
  handleRevoke: (inviteId: string) => Promise<void>;
}

export function PendingInvitesSection({
  data,
  loading,
  handleRecreate,
  handleRevoke,
}: PendingInvitesSectionProps) {
  return (
    <section
      style={{
        backgroundColor: "var(--color-surface)",
        borderRadius: 22,
        border: "1px solid var(--color-line)",
        boxShadow: "0 4px 18px color-mix(in srgb, var(--color-ink) 3%, transparent)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "18px 24px",
          borderBottom: "1px solid var(--color-line)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
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
            Pending invites
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
            {data.pendingInvites.length} / 30
          </span>
        </div>
      </div>

      {/* Empty State */}
      {data.pendingInvites.length === 0 ? (
        <div
          style={{
            padding: "36px 24px",
            textAlign: "center",
            color: "var(--color-muted)",
            fontSize: 13.5,
          }}
        >
          No pending invites.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {data.pendingInvites.map((invite, idx) => (
            <div
              key={invite.id}
              className="orgkit-officer-row"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "16px 24px",
                borderBottom:
                  idx < data.pendingInvites.length - 1
                    ? "1px solid var(--color-base)"
                    : "none",
                backgroundColor: "var(--color-surface)",
              }}
            >
              {/* Left: Role, Date, Email (Admin) */}
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "var(--color-warning)",
                    backgroundColor: "var(--color-warning-soft)",
                    border: "1px solid var(--color-warning-line)",
                    padding: "2px 8px",
                    borderRadius: 9999,
                    letterSpacing: "0.03em",
                    textTransform: "uppercase",
                  }}
                >
                  Pending
                </span>

                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span
                      style={{
                        fontSize: 13.5,
                        fontWeight: 600,
                        color: "var(--color-ink)",
                        textTransform: "capitalize",
                      }}
                    >
                      {invite.role}
                    </span>

                    {/* Invited Email (Admin only per Ticket Section 4 Point 8) */}
                    {invite.email && (
                      <span
                        style={{
                          fontSize: 12.5,
                          color: "var(--color-muted-strong)",
                        }}
                      >
                        • {invite.email}
                      </span>
                    )}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: 11.5,
                      color: "var(--color-muted)",
                      marginTop: 2,
                    }}
                  >
                    <Clock size={12} />
                    <span>Created {formatDate(invite.createdAt)}</span>
                  </div>
                </div>
              </div>

              {/* Right: Revoke & Recreate actions (Admins only) */}
              {data.canManageRoles && (
                <div
                  className="orgkit-officer-controls"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => handleRecreate(invite)}
                    disabled={loading}
                    title="Make a fresh link you can copy. The old link stops working."
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "6px 12px",
                      borderRadius: 9999,
                      border: "1px solid var(--color-line)",
                      backgroundColor: "var(--color-surface)",
                      color: "var(--color-ink)",
                      fontSize: 12,
                      fontWeight: 500,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.backgroundColor = "var(--color-base)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.backgroundColor = "var(--color-surface)")
                    }
                  >
                    <RefreshCw size={12} />
                    <span>Copy new link</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRevoke(invite.id)}
                    disabled={loading}
                    title="Revoke this invite link"
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
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "var(--color-danger-soft)";
                      e.currentTarget.style.borderColor = "var(--color-danger-line)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "var(--color-surface)";
                      e.currentTarget.style.borderColor = "var(--color-line)";
                    }}
                  >
                    <XCircle size={12} />
                    <span>Revoke</span>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
