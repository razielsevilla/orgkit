import { UserPlus, ShieldAlert } from "lucide-react";
import { WorkspaceOfficersData } from "@/src/app/(workspace)/officers-actions";
import { ErrorToast } from "@/src/components/error-toast";

interface OfficersHeaderProps {
  data: WorkspaceOfficersData;
  pageError: string | null;
  onInvite: () => void;
  onTransferAdmin?: () => void;
  onClearError?: () => void;
}

export function OfficersHeader({ data, pageError, onInvite, onTransferAdmin, onClearError }: OfficersHeaderProps) {
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

        {/* Admin Actions Group */}
        {data.canInvite && (
          <div
            className="orgkit-header-actions"
            style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}
          >
            {onTransferAdmin && data.currentRole === "admin" && (
              <button
                type="button"
                onClick={onTransferAdmin}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "9px 18px",
                  borderRadius: 9999,
                  border: "1px solid var(--color-line)",
                  backgroundColor: "var(--color-surface)",
                  color: "var(--color-ink)",
                  fontSize: 13.5,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--color-ink)";
                  e.currentTarget.style.backgroundColor = "var(--color-base)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--color-line)";
                  e.currentTarget.style.backgroundColor = "var(--color-surface)";
                }}
              >
                <ShieldAlert size={16} color="var(--color-muted-strong)" />
                <span>Transfer admin rights</span>
              </button>
            )}

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

      {/* Floating Error Toast on bottom of screen with screen shake */}
      <ErrorToast message={pageError} onDismiss={onClearError} />
    </>
  );
}
