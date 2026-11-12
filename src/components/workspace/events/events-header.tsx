import React from "react";
import { AlertCircle, Plus, RefreshCw } from "lucide-react";

interface EventsHeaderProps {
  eventCount: number;
  onNewEvent: () => void;
  errorMessage?: string | null;
  onRetry?: () => void;
  isRetrying?: boolean;
}

/** Title, "New event" button and the load-error banner, laid out like `MembersHeader` */
export function EventsHeader({ eventCount, onNewEvent, errorMessage, onRetry, isRetrying = false }: EventsHeaderProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, width: "100%", marginBottom: 8 }}>
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
            data-events-heading
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
            Events
          </h1>
          <p style={{ margin: "6px 0 0 0", fontSize: 14, color: "var(--color-muted)", lineHeight: 1.4 }}>
            Create and manage your organization&apos;s events. Times are shown in your local time.
          </p>
          <span className="sr-only" aria-live="polite">
            {eventCount} {eventCount === 1 ? "event" : "events"}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={onNewEvent}
            className="orgkit-btn-accent"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              minHeight: 42,
              padding: "10px 20px",
              borderRadius: 9999,
              backgroundColor: "var(--color-accent)",
              color: "#FFFFFF",
              fontSize: 13.5,
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
            }}
          >
            <Plus size={15} aria-hidden="true" />
            <span>New event</span>
          </button>
        </div>
      </div>

      {errorMessage && (
        <div
          role="alert"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
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
              <RefreshCw size={13} style={{ animation: isRetrying ? "spin 1s linear infinite" : "none" }} />
              <span>Try again</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
