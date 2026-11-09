import React from "react";
import { AlertCircle, Download, RefreshCw } from "lucide-react";

interface MembersHeaderProps {
  totalCount: number;
  matchingCount: number;
  pendingCount: number;
  isFiltered: boolean;
  errorMessage?: string | null;
  onRetry?: () => void;
  isRetrying?: boolean;
  /** Buttons shown beside the title, such as Import (admins only) */
  actions?: React.ReactNode;
  /** Admins only: shows the Export button */
  onExport?: () => void;
}

export function MembersHeader({
  totalCount,
  matchingCount,
  pendingCount,
  isFiltered,
  errorMessage,
  onRetry,
  isRetrying = false,
  actions,
  onExport,
}: MembersHeaderProps) {
  // Summary text format: "X members match • Y pending to review" or "X members • Y pending to review"
  let summaryText = "";
  if (totalCount === 0) {
    summaryText = "0 members";
  } else if (isFiltered) {
    const memberLabel = matchingCount === 1 ? "member matches" : "members match";
    summaryText = `${matchingCount} ${memberLabel}`;
  } else {
    const memberLabel = totalCount === 1 ? "member" : "members";
    summaryText = `${totalCount} ${memberLabel}`;
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 16,
        width: "100%",
        marginBottom: 8,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div>
          <h1
            tabIndex={-1}
            data-members-heading
            style={{
              outline: "none",
              fontSize: "clamp(26px, 2.6vw, 34px)",
              fontWeight: 800,
              color: "var(--color-ink)",
              letterSpacing: "-0.025em",
              margin: 0,
              lineHeight: 1.15,
            }}
          >
            Members
          </h1>
          <p
            style={{
              margin: "6px 0 0 0",
              fontSize: 14,
              color: "var(--color-muted)",
              lineHeight: 1.4,
            }}
          >
            Manage your organization&apos;s members and their access levels.
            {pendingCount > 0 && (
              <span
                style={{
                  marginLeft: 8,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  color: "var(--color-accent-strong)",
                  fontWeight: 600,
                }}
              >
                •
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    backgroundColor: "var(--color-accent)",
                  }}
                />
                {pendingCount} pending to review
              </span>
            )}
          </p>
          <span className="sr-only" aria-live="polite">
            {summaryText}
          </span>
        </div>

        {/* Action Buttons: Import & Export */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          {actions}

          {onExport && (
            <button
              type="button"
              onClick={onExport}
              className="orgkit-btn-export"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                height: 42,
                padding: "0 20px",
                borderRadius: 9999,
                border: "1px solid var(--color-line)",
                backgroundColor: "var(--color-surface)",
                color: "var(--color-ink)",
                fontWeight: 600,
                fontSize: 13.5,
                cursor: "pointer",
                boxShadow: "0 1px 3px rgba(24, 24, 27, 0.04)",
                transition: "all 0.15s ease",
              }}
            >
              <Download size={15} strokeWidth={2} aria-hidden="true" />
              <span>Export</span>
            </button>
          )}
        </div>
      </div>

      {/* Error Banner with Retry button if fetch failed */}
      {errorMessage && (
        <div
          role="alert"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 18px",
            backgroundColor: "#FEF2F2",
            border: "1px solid #FCA5A5",
            borderRadius: 14,
            color: "#991B1B",
            fontSize: 13.5,
            fontWeight: 500,
            marginTop: 4,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <AlertCircle size={18} aria-hidden="true" />
            <span>{errorMessage}</span>
          </div>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              disabled={isRetrying}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                borderRadius: 999,
                border: "1px solid #F87171",
                backgroundColor: "#FFFFFF",
                color: "#991B1B",
                fontSize: 12.5,
                fontWeight: 600,
                cursor: isRetrying ? "not-allowed" : "pointer",
                opacity: isRetrying ? 0.6 : 1,
              }}
            >
              <RefreshCw
                size={13}
                style={{
                  animation: isRetrying ? "spin 1s linear infinite" : "none",
                }}
              />
              <span>Try again</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

