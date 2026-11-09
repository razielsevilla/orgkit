"use client";

import React from "react";
import { AlertCircle, RefreshCw, UserPlus, Upload } from "lucide-react";
import type { MemberInvite, MemberInvitesData } from "@/src/app/(workspace)/member-invites-actions";
import { INVITE_VALID_DAYS } from "@/src/lib/members/csv-import";
import { MemberSkeleton } from "./member-skeleton";

interface InvitedViewProps {
  data: MemberInvitesData | null;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  onRetry: () => void;
  onLoadMore: () => void;
  onImport: () => void;
}

function formatDate(isoString: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(
      new Date(isoString)
    );
  } catch {
    return isoString;
  }
}

function InviteStatus({ invite }: { invite: MemberInvite }) {
  const joined = invite.joinedAt !== null;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "3px 10px",
        borderRadius: 9999,
        fontSize: 12.5,
        fontWeight: 600,
        whiteSpace: "nowrap",
        backgroundColor: joined
          ? "color-mix(in srgb, var(--color-accent) 8%, transparent)"
          : "color-mix(in srgb, var(--color-base) 80%, transparent)",
        border: joined
          ? "1px solid color-mix(in srgb, var(--color-accent) 28%, transparent)"
          : "1px solid var(--color-line)",
        color: joined ? "var(--color-accent-strong)" : "var(--color-ink)",
      }}
    >
      {joined ? "Joined" : "Invited"}
    </span>
  );
}

const wrap: React.CSSProperties = { overflowWrap: "anywhere", wordBreak: "break-word", minWidth: 0 };

/**
 * The Invited view (admins only): everyone invited by import whose invitation
 * has not expired. They are not members; they appear in the roster only after
 * they join through the join link.
 */
export function InvitedView({ data, isLoading, isLoadingMore, error, onRetry, onLoadMore, onImport }: InvitedViewProps) {
  if (isLoading && !data) return <MemberSkeleton rowCount={5} />;

  if (error && (!data || data.invites.length === 0)) {
    return (
      <div
        role="alert"
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          padding: "12px 18px",
          backgroundColor: "#FEF2F2",
          border: "1px solid #FCA5A5",
          borderRadius: 14,
          color: "#991B1B",
          fontSize: 13.5,
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
          <AlertCircle size={18} color="#DC2626" aria-hidden="true" style={{ flexShrink: 0 }} />
          {error}
        </span>
        <button
          type="button"
          onClick={onRetry}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 12px",
            borderRadius: 9999,
            backgroundColor: "#FFFFFF",
            border: "1px solid #FCA5A5",
            color: "#991B1B",
            fontWeight: 600,
            fontSize: 12.5,
            cursor: "pointer",
          }}
        >
          <RefreshCw size={13} aria-hidden="true" />
          <span>Try again</span>
        </button>
      </div>
    );
  }

  if (!data || data.totalCount === 0) {
    return (
      <div
        role="region"
        aria-label="No one is invited"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          padding: "clamp(40px, 6vw, 60px) clamp(20px, 4vw, 36px)",
          backgroundColor: "var(--color-surface)",
          borderRadius: 24,
          border: "1px solid var(--color-line)",
          boxShadow: "0 10px 30px rgba(24, 24, 27, 0.04)",
        }}
      >
        <div
          aria-hidden="true"
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            backgroundColor: "color-mix(in srgb, var(--color-accent) 10%, transparent)",
            color: "var(--color-accent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 16,
          }}
        >
          <UserPlus size={26} strokeWidth={1.8} />
        </div>
        <h3 style={{ fontSize: 19, fontWeight: 700, color: "var(--color-ink)", margin: "0 0 6px 0" }}>
          No one is invited
        </h3>
        <p style={{ fontSize: 14, color: "var(--color-muted)", maxWidth: 380, lineHeight: 1.5, margin: "0 0 22px 0" }}>
          No one is invited. Import a list to get started.
        </p>
        <button
          type="button"
          onClick={onImport}
          className="orgkit-btn-accent"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 24px",
            borderRadius: 9999,
            backgroundColor: "var(--color-accent)",
            color: "#FFFFFF",
            fontSize: 13.5,
            fontWeight: 600,
            border: "none",
            cursor: "pointer",
          }}
        >
          <Upload size={15} aria-hidden="true" />
          Import
        </button>
      </div>
    );
  }

  return (
    <div style={{ width: "100%", marginTop: 4 }}>
      <p style={{ fontSize: 13.5, color: "var(--color-muted)", lineHeight: 1.5, margin: "0 0 12px 0" }}>
        {data.pendingCount.toLocaleString("en-US")} waiting to join. These people are not members until they agree
        through your join link. Invitations last {INVITE_VALID_DAYS} days.
      </p>

      {error && (
        <div role="alert" style={{ fontSize: 13, color: "#991B1B", margin: "0 0 10px 0" }}>
          {error}
        </div>
      )}

      {/* Desktop table */}
      <div className="orgkit-members-desktop">
        <div
          tabIndex={0}
          role="region"
          aria-label="Invited people"
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
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", tableLayout: "fixed" }}>
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
                <th scope="col" style={{ padding: "14px 24px", width: "46%" }}>
                  Person
                </th>
                <th scope="col" style={{ padding: "14px 20px", width: "16%" }}>
                  Status
                </th>
                <th scope="col" style={{ padding: "14px 20px", width: "19%" }}>
                  Invited
                </th>
                <th scope="col" style={{ padding: "14px 20px", width: "19%" }}>
                  Expires
                </th>
              </tr>
            </thead>
            <tbody style={{ fontSize: 13.5 }}>
              {data.invites.map((invite, idx) => (
                <tr
                  key={invite.id}
                  className="orgkit-member-row"
                  style={{ borderBottom: idx === data.invites.length - 1 ? "none" : "1px solid var(--color-line)" }}
                >
                  <td style={{ padding: "14px 24px" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                      <span
                        title={invite.email}
                        style={{
                          fontWeight: 600,
                          color: "var(--color-ink)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {invite.email}
                      </span>
                      {invite.name && (
                        <span
                          title={invite.name}
                          style={{
                            fontSize: 12.5,
                            color: "var(--color-muted)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {invite.name}
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: "14px 20px" }}>
                    <InviteStatus invite={invite} />
                  </td>
                  <td style={{ padding: "14px 20px", color: "var(--color-muted)", whiteSpace: "nowrap" }}>
                    {formatDate(invite.createdAt)}
                  </td>
                  <td style={{ padding: "14px 20px", color: "var(--color-muted)", whiteSpace: "nowrap" }}>
                    {invite.joinedAt ? "—" : formatDate(invite.expiresAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="orgkit-members-mobile">
        {data.invites.map((invite) => (
          <div
            key={invite.id}
            role="article"
            aria-label={`Invited: ${invite.email}`}
            style={{
              backgroundColor: "var(--color-surface)",
              borderRadius: 20,
              border: "1px solid var(--color-line)",
              padding: 16,
              display: "flex",
              flexDirection: "column",
              gap: 10,
              width: "100%",
              boxSizing: "border-box",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
              <div style={{ ...wrap, display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
                <span style={{ ...wrap, fontWeight: 600, color: "var(--color-ink)", fontSize: 14 }}>
                  {invite.email}
                </span>
                {invite.name && (
                  <span style={{ ...wrap, fontSize: 12.5, color: "var(--color-muted)" }}>{invite.name}</span>
                )}
              </div>
              <InviteStatus invite={invite} />
            </div>
            <div
              style={{
                paddingTop: 8,
                borderTop: "1px solid color-mix(in srgb, var(--color-line) 60%, transparent)",
                fontSize: 12,
                color: "var(--color-muted)",
              }}
            >
              Invited {formatDate(invite.createdAt)}
              {invite.joinedAt ? "" : ` · Expires ${formatDate(invite.expiresAt)}`}
            </div>
          </div>
        ))}
      </div>

      {data.hasMore && (
        <div style={{ display: "flex", justifyContent: "center", marginTop: 16 }}>
          <button
            type="button"
            onClick={onLoadMore}
            disabled={isLoadingMore}
            style={{
              padding: "10px 22px",
              borderRadius: 999,
              border: "1px solid var(--color-line)",
              backgroundColor: "var(--color-surface)",
              color: "var(--color-ink)",
              fontWeight: 600,
              fontSize: 14,
              cursor: isLoadingMore ? "not-allowed" : "pointer",
              opacity: isLoadingMore ? 0.7 : 1,
            }}
          >
            {isLoadingMore ? "Loading..." : `Load more (${data.invites.length} of ${data.totalCount})`}
          </button>
        </div>
      )}
    </div>
  );
}
