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
          gap: 12,
        }}
      >
        <div>
          <h1
            tabIndex={-1}
            data-members-heading
            style={{
              outline: "none",
              fontSize: "clamp(24px, 2.4vw, 32px)",
              fontWeight: 800,
              color: "var(--color-ink)",
              letterSpacing: "-0.02em",
              margin: "0 0 6px 0",
              lineHeight: 1.15,
            }}
          >
            Members
          </h1>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 14,
              color: "var(--color-muted)",
            }}
          >
            <span>{summaryText}</span>
            {pendingCount > 0 && (
              <>
                <span aria-hidden="true">•</span>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    color: "var(--color-accent-strong)",
                    fontWeight: 600,
                  }}
                >
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
              </>
            )}
          </div>
        </div>
        {actions}

        {onExport && totalCount > 0 && (
          <button
            type="button"
            onClick={onExport}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "9px 18px",
              borderRadius: 999,
              border: "1px solid var(--color-line)",
              backgroundColor: "var(--color-surface)",
              color: "var(--color-ink)",
              fontWeight: 600,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            <Download size={15} aria-hidden="true" />
            <span>Export</span>
          </button>
        )}
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
            boxShadow: "0 1px 3px rgba(220, 38, 38, 0.05)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <AlertCircle size={18} color="#DC2626" style={{ flexShrink: 0 }} />
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
                borderRadius: 9999,
                backgroundColor: "#FFFFFF",
                border: "1px solid #FCA5A5",
                color: "#991B1B",
                fontWeight: 600,
                fontSize: 12.5,
                cursor: isRetrying ? "not-allowed" : "pointer",
                boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
                transition: "all 0.15s ease",
              }}
            >
              <RefreshCw
                size={13}
                style={{
                  animation: isRetrying ? "spin 1s linear infinite" : "none",
                }}
              />
              <span>{isRetrying ? "Retrying..." : "Try again"}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

