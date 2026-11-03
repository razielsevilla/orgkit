"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  UserPlus,
  Trash2,
  RefreshCw,
  XCircle,
  AlertCircle,
  Shield,
  Wallet,
  UserCheck,
  Clock,
  LogOut,
} from "lucide-react";
import { OfficerRole, ROLE_DETAILS } from "@/src/lib/permissions";
import {
  WorkspaceOfficersData,
  ActiveOfficer,
  PendingInvite,
  getWorkspaceOfficers,
  createOfficerInvite,
  updateOfficerRole,
  revokeOfficerInvite,
} from "@/src/app/(workspace)/officers-actions";
import { InviteDialog, SuccessPanel } from "./invite-dialog";
import { RemoveDialog } from "./remove-dialog";

interface OfficersClientProps {
  initialData: WorkspaceOfficersData;
  orgId: string;
}

export function OfficersClient({ initialData, orgId }: OfficersClientProps) {
  const router = useRouter();
  const [data, setData] = useState<WorkspaceOfficersData>(initialData);
  const [loading, setLoading] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [accessRevoked, setAccessRevoked] = useState(false);

  // Invite modal state
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteDialogSession, setInviteDialogSession] = useState(0);
  const [invitePrefill, setInvitePrefill] = useState<{ email?: string; role?: OfficerRole }>({});

  // Success panel state
  const [successData, setSuccessData] = useState<{
    inviteUrl: string;
    email: string;
    role: OfficerRole;
  } | null>(null);

  // Remove officer modal state
  const [removeTarget, setRemoveTarget] = useState<ActiveOfficer | null>(null);

  // Refresh data from server
  async function refreshData() {
    try {
      const res = await getWorkspaceOfficers(orgId);
      if (res.success && res.data) {
        setData(res.data);
        setPageError(null);
      } else if (res.error === "access_revoked") {
        setAccessRevoked(true);
      } else {
        setPageError(res.errorMessage || "Failed to refresh officers.");
      }
    } catch {
      setPageError("Failed to communicate with server.");
    }
  }

  // Handle role change
  async function handleRoleChange(officer: ActiveOfficer, newRole: OfficerRole) {
    if (officer.role === newRole) return;
    setLoading(true);
    setPageError(null);

    try {
      const res = await updateOfficerRole(orgId, officer.id, newRole);
      if (res.success) {
        await refreshData();
      } else if (res.error === "access_revoked") {
        setAccessRevoked(true);
      } else {
        setPageError(res.errorMessage || "Failed to update role.");
      }
    } catch {
      setPageError("Failed to update role.");
    } finally {
      setLoading(false);
    }
  }

  // Handle revoke invite
  async function handleRevoke(inviteId: string) {
    setLoading(true);
    setPageError(null);
    try {
      const res = await revokeOfficerInvite(orgId, inviteId);
      if (res.success) {
        await refreshData();
      } else if (res.error === "access_revoked") {
        setAccessRevoked(true);
      } else {
        setPageError(res.errorMessage || "Failed to revoke invite.");
      }
    } catch {
      setPageError("Failed to revoke invite.");
    } finally {
      setLoading(false);
    }
  }

  // Only the hash of an invite link is stored, so an old link cannot be shown
  // again. This makes a fresh link for the same email and role (the old one
  // stops working) and opens the copy panel.
  async function handleRecreate(invite: PendingInvite) {
    if (!invite.email) return;
    setLoading(true);
    setPageError(null);
    try {
      const res = await createOfficerInvite(orgId, invite.email, invite.role);
      if (res.success && res.data) {
        setSuccessData(res.data);
        await refreshData();
      } else if (res.error === "access_revoked") {
        setAccessRevoked(true);
      } else {
        setPageError(res.errorMessage || "Failed to create a new link.");
      }
    } catch {
      setPageError("Failed to create a new link.");
    } finally {
      setLoading(false);
    }
  }

  // The last admin cannot be demoted or removed. Say why instead of leaving a dead control.
  const LAST_ADMIN_MESSAGE = "Every org needs at least one admin. Make someone else an admin first.";

  // Compute initials for an officer
  function getInitials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    if (parts.length === 1 && parts[0].length > 0) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return "OF";
  }

  // Format date helper
  function formatDate(iso: string): string {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return "Recent";
    }
  }

  const roleBadgeStyles: Record<
    OfficerRole,
    { bg: string; text: string; border: string }
  > = {
    admin: {
      bg: "rgba(5, 150, 105, 0.10)",
      text: "#047857",
      border: "rgba(5, 150, 105, 0.25)",
    },
    finance: {
      bg: "#F4F4F5",
      text: "#3F3F46",
      border: "#E4E4E7",
    },
    officer: {
      bg: "#F4F4F5",
      text: "#52525B",
      border: "#E4E4E7",
    },
  };

  return (
    <div style={{ width: "100%", maxWidth: 1024, margin: "0 auto", paddingBottom: 60 }}>
      {/* ── Keyframe Animations & Responsive Styles ── */}
      <style>{`
        @media (max-width: 640px) {
          .orgkit-officer-row {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 12px !important;
          }
          .orgkit-officer-controls {
            width: 100% !important;
            justifyContent: space-between !important;
            margin-top: 4px !important;
          }
          .orgkit-officer-select {
            flex: 1 !important;
          }
          .orgkit-header-actions {
            width: 100% !important;
            margin-top: 12px !important;
          }
          .orgkit-header-actions button {
            width: 100% !important;
            justify-content: center !important;
          }
        }
      `}</style>

      {/* ── Removed Officer Alert Modal (Ticket Decision 7) ── */}
      {accessRevoked && (
        <div
          role="alertdialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 120,
            backgroundColor: "rgba(24, 24, 27, 0.55)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
        >
          <div
            className="orgkit-card"
            style={{
              width: "100%",
              maxWidth: 420,
              backgroundColor: "#FFFFFF",
              borderRadius: 24,
              border: "1px solid #E4E4E7",
              boxShadow: "0 20px 50px rgba(24, 24, 27, 0.15)",
              padding: "32px 28px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                backgroundColor: "rgba(220, 38, 38, 0.10)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px auto",
              }}
            >
              <LogOut size={26} color="#DC2626" />
            </div>

            <h2
              style={{
                fontSize: 19,
                fontWeight: 700,
                color: "#18181B",
                margin: "0 0 8px 0",
              }}
            >
              Access Revoked
            </h2>

            <p style={{ fontSize: 13.5, color: "#52525B", margin: "0 0 24px 0", lineHeight: 1.45 }}>
              You no longer have access to this org.
            </p>

            <button
              type="button"
              onClick={() => router.push("/")}
              style={{
                width: "100%",
                padding: "12px 20px",
                borderRadius: 9999,
                border: "none",
                backgroundColor: "#18181B",
                color: "#FFFFFF",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Return Home
            </button>
          </div>
        </div>
      )}

      {/* ── Page Header ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "clamp(24px, 2.5vw, 32px)",
              fontWeight: 800,
              color: "#18181B",
              margin: 0,
              letterSpacing: "-0.025em",
              lineHeight: 1.15,
            }}
          >
            Officers
          </h1>
          <p
            style={{
              fontSize: 13.5,
              color: "#71717A",
              margin: "4px 0 0 0",
            }}
          >
            Manage team members, roles, and pending invitations for {data.orgName}.
          </p>
        </div>

        {/* Admin-only "Invite an officer" button */}
        {data.canInvite && (
          <div className="orgkit-header-actions">
            <button
              type="button"
              onClick={() => {
                setInvitePrefill({});
                setInviteDialogSession((n) => n + 1);
                setInviteModalOpen(true);
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 20px",
                borderRadius: 9999,
                border: "none",
                backgroundColor: "#059669",
                color: "#FFFFFF",
                fontSize: 13.5,
                fontWeight: 600,
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(5, 150, 105, 0.25)",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#047857")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#059669")}
            >
              <UserPlus size={16} />
              <span>Invite an officer</span>
            </button>
          </div>
        )}
      </div>

      {/* Error Banner */}
      {pageError && (
        <div
          role="alert"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "12px 16px",
            borderRadius: 14,
            backgroundColor: "#FEF2F2",
            border: "1px solid #FCA5A5",
            color: "#DC2626",
            fontSize: 13,
            lineHeight: 1.4,
            marginBottom: 20,
          }}
        >
          <AlertCircle size={16} style={{ flexShrink: 0 }} />
          <span>{pageError}</span>
        </div>
      )}

      {/* ── Active Officers Section ── */}
      <section
        style={{
          backgroundColor: "#FFFFFF",
          borderRadius: 22,
          border: "1px solid #E4E4E7",
          boxShadow: "0 4px 18px rgba(24, 24, 27, 0.03)",
          overflow: "hidden",
          marginBottom: 32,
        }}
      >
        <div
          style={{
            padding: "18px 24px",
            borderBottom: "1px solid #E4E4E7",
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
                color: "#18181B",
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
                color: "#71717A",
                backgroundColor: "#F4F4F5",
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
                  padding: "16px 24px",
                  borderBottom:
                    idx < data.officers.length - 1 ? "1px solid #F4F4F5" : "none",
                  backgroundColor: "#FFFFFF",
                  transition: "background-color 0.15s ease",
                }}
              >
                {/* Left: Avatar + Details */}
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: "50%",
                      backgroundColor: "rgba(5, 150, 105, 0.10)",
                      border: "1px solid rgba(5, 150, 105, 0.20)",
                      color: "#059669",
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

                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: "#18181B",
                          lineHeight: 1.2,
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
                            color: "#047857",
                            backgroundColor: "rgba(5, 150, 105, 0.12)",
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
                          color: "#71717A",
                          marginTop: 3,
                        }}
                      >
                        {officer.email}
                      </span>
                    ) : (
                      <span
                        style={{
                          display: "block",
                          fontSize: 11.5,
                          color: "#A1A1AA",
                          marginTop: 2,
                        }}
                      >
                        Joined {formatDate(officer.joinedAt)}
                      </span>
                    )}

                    {/* Last Admin warning hint */}
                    {isSoleAdmin && data.canManageRoles && (
                      <span
                        style={{
                          display: "block",
                          fontSize: 12,
                          color: "#B45309",
                          marginTop: 4,
                        }}
                      >
                        {LAST_ADMIN_MESSAGE}
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
                      gap: 12,
                    }}
                  >
                    {/* Role select */}
                    <div style={{ position: "relative" }}>
                      <select
                        aria-label={`Role for ${officer.fullName}`}
                        className="orgkit-officer-select"
                        value={officer.role}
                        onChange={(e) =>
                          handleRoleChange(officer, e.target.value as OfficerRole)
                        }
                        disabled={loading}
                        title={isSoleAdmin ? LAST_ADMIN_MESSAGE : undefined}
                        style={{
                          padding: "6px 12px",
                          borderRadius: 9999,
                          border: `1px solid ${badgeStyle.border}`,
                          backgroundColor: badgeStyle.bg,
                          color: badgeStyle.text,
                          fontSize: 12.5,
                          fontWeight: 600,
                          cursor: "pointer",
                          outline: "none",
                        }}
                      >
                        <option value="admin">Admin</option>
                        <option value="finance">Finance</option>
                        <option value="officer">Officer</option>
                      </select>
                    </div>

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
                          border: "1px solid #E4E4E7",
                          backgroundColor: "#FFFFFF",
                          color: "#DC2626",
                          fontSize: 12,
                          fontWeight: 500,
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                          opacity: isSoleAdmin ? 0.6 : 1,
                        }}
                        onMouseEnter={(e) => {
                          if (!isSoleAdmin && !loading) {
                            e.currentTarget.style.backgroundColor = "#FEF2F2";
                            e.currentTarget.style.borderColor = "#FCA5A5";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isSoleAdmin && !loading) {
                            e.currentTarget.style.backgroundColor = "#FFFFFF";
                            e.currentTarget.style.borderColor = "#E4E4E7";
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

      {/* ── Pending Invites Section ── */}
      <section
        style={{
          backgroundColor: "#FFFFFF",
          borderRadius: 22,
          border: "1px solid #E4E4E7",
          boxShadow: "0 4px 18px rgba(24, 24, 27, 0.03)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "18px 24px",
            borderBottom: "1px solid #E4E4E7",
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
                color: "#18181B",
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
                color: "#71717A",
                backgroundColor: "#F4F4F5",
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
              color: "#71717A",
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
                      ? "1px solid #F4F4F5"
                      : "none",
                  backgroundColor: "#FFFFFF",
                }}
              >
                {/* Left: Role, Date, Email (Admin) */}
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#B45309",
                      backgroundColor: "#FEF3C7",
                      border: "1px solid #FDE68A",
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
                          color: "#18181B",
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
                            color: "#52525B",
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
                        color: "#71717A",
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
                        border: "1px solid #E4E4E7",
                        backgroundColor: "#FFFFFF",
                        color: "#18181B",
                        fontSize: 12,
                        fontWeight: 500,
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.backgroundColor = "#F4F4F5")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.backgroundColor = "#FFFFFF")
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
                        border: "1px solid #E4E4E7",
                        backgroundColor: "#FFFFFF",
                        color: "#DC2626",
                        fontSize: 12,
                        fontWeight: 500,
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#FEF2F2";
                        e.currentTarget.style.borderColor = "#FCA5A5";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "#FFFFFF";
                        e.currentTarget.style.borderColor = "#E4E4E7";
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

      {/* ── Dialog Modals ── */}
      <InviteDialog
        // Remount on every open so the form starts from the prefill, not old input
        key={`${inviteDialogSession}`}
        orgId={orgId}
        isOpen={inviteModalOpen}
        initialEmail={invitePrefill.email}
        initialRole={invitePrefill.role}
        onClose={() => setInviteModalOpen(false)}
        onSuccess={(created) => {
          setInviteModalOpen(false);
          setSuccessData(created);
          refreshData();
        }}
      />

      {successData && (
        <SuccessPanel
          inviteUrl={successData.inviteUrl}
          email={successData.email}
          role={successData.role}
          onClose={() => setSuccessData(null)}
        />
      )}

      <RemoveDialog
        orgId={orgId}
        officerId={removeTarget?.id || null}
        officerName={removeTarget?.fullName || "this officer"}
        isOpen={removeTarget !== null}
        onClose={() => setRemoveTarget(null)}
        onRemoved={refreshData}
      />
    </div>
  );
}

