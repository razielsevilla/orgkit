import { UserPlus, AlertCircle } from "lucide-react";
import { WorkspaceOfficersData } from "@/src/app/(workspace)/officers-actions";

interface OfficersHeaderProps {
  data: WorkspaceOfficersData;
  pageError: string | null;
  onInvite: () => void;
}

export function OfficersHeader({ data, pageError, onInvite }: OfficersHeaderProps) {
  return (
    <>
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
            color: "var(--color-ink)",
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
            color: "var(--color-muted)",
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
            onClick={onInvite}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 20px",
              borderRadius: 9999,
              border: "none",
              backgroundColor: "var(--color-accent)",
              color: "var(--color-on-accent)",
              fontSize: 13.5,
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 2px 8px color-mix(in srgb, var(--color-accent) 25%, transparent)",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--color-accent-strong)")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "var(--color-accent)")}
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
          backgroundColor: "var(--color-danger-soft)",
          border: "1px solid var(--color-danger-line)",
          color: "var(--color-danger)",
          fontSize: 13,
          lineHeight: 1.4,
          marginBottom: 20,
        }}
      >
        <AlertCircle size={16} style={{ flexShrink: 0 }} />
        <span>{pageError}</span>
      </div>
    )}
    </>
  );
}
