"use client";

import React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

interface DuesDashboardErrorProps {
  message?: string;
  onRetry?: () => void;
  isRetrying?: boolean;
}

export function DuesDashboardError({
  message = "We couldn't load the dues dashboard.",
  onRetry,
  isRetrying = false,
}: DuesDashboardErrorProps) {
  return (
    <div
      role="alert"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        padding: "32px 24px",
        backgroundColor: "var(--color-danger-soft)",
        border: "1px solid var(--color-danger-line)",
        borderRadius: 16,
        textAlign: "center",
        width: "100%",
        maxWidth: 960,
        margin: "20px auto",
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: "50%",
          backgroundColor: "color-mix(in srgb, var(--color-danger) 15%, transparent)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--color-danger-strong)",
        }}
      >
        <AlertCircle size={22} strokeWidth={2.2} />
      </div>

      <div>
        <h3
          style={{
            margin: "0 0 4px 0",
            fontSize: 16,
            fontWeight: 700,
            color: "var(--color-ink)",
          }}
        >
          Failed to load dashboard
        </h3>
        <p
          style={{
            margin: 0,
            fontSize: 13.5,
            color: "var(--color-muted)",
            maxWidth: 420,
            lineHeight: 1.45,
          }}
        >
          {message}
        </p>
      </div>

      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          disabled={isRetrying}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            height: 38,
            padding: "0 18px",
            marginTop: 4,
            borderRadius: 9999,
            backgroundColor: "var(--color-surface)",
            border: "1px solid var(--color-line)",
            color: "var(--color-ink)",
            fontSize: 13,
            fontWeight: 600,
            cursor: isRetrying ? "not-allowed" : "pointer",
            opacity: isRetrying ? 0.6 : 1,
            transition: "all 0.15s ease",
            boxShadow: "0 1px 3px rgba(24, 24, 27, 0.04)",
          }}
          onMouseEnter={(e) => {
            if (!isRetrying) {
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(24, 24, 27, 0.08)";
            }
          }}
          onMouseLeave={(e) => {
            if (!isRetrying) {
              e.currentTarget.style.transform = "none";
              e.currentTarget.style.boxShadow = "0 1px 3px rgba(24, 24, 27, 0.04)";
            }
          }}
        >
          <RefreshCw
            size={14}
            strokeWidth={2}
            style={{
              animation: isRetrying ? "spin 1s linear infinite" : "none",
            }}
          />
          {isRetrying ? "Retrying..." : "Try again"}
        </button>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
