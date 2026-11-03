"use client";

import { AlertCircle } from "lucide-react";

// Form Error and Submit Button
export function JoinSubmit({
  formError,
  pending,
  joiningLabel,
  joinLabel,
}: {
  formError?: string;
  pending: boolean;
  joiningLabel: string;
  joinLabel: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
      {formError && (
        <div
          role="alert"
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 8,
            padding: "10px 14px",
            borderRadius: 12,
            backgroundColor: "color-mix(in srgb, var(--color-danger) 8%, transparent)",
            border: "1px solid color-mix(in srgb, var(--color-danger) 20%, transparent)",
            color: "var(--color-danger)",
            fontSize: 13.5,
            lineHeight: 1.4,
          }}
        >
          <AlertCircle size={17} color="var(--color-danger)" style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{formError}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="jf-btn jf-submit"
        style={{
          height: 48,
          borderRadius: 9999,
          border: "none",
          backgroundColor: "var(--color-accent)",
          color: "var(--color-on-accent)",
          fontSize: 15,
          fontWeight: 600,
          fontFamily: "inherit",
          cursor: pending ? "default" : "pointer",
          opacity: pending ? 0.7 : 1,
          boxShadow: "0 2px 8px color-mix(in srgb, var(--color-accent) 22%, transparent)",
          transition: "all 0.15s ease",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
        }}
      >
        {pending ? (
          <>
            <div
              style={{
                width: 18,
                height: 18,
                borderRadius: "50%",
                border: "2.5px solid rgba(255, 255, 255, 0.35)",
                borderTopColor: "var(--color-surface)",
                animation: "spin 0.8s linear infinite",
              }}
            />
            <span>{joiningLabel}</span>
          </>
        ) : (
          <span>{joinLabel}</span>
        )}
      </button>
    </div>
  );
}
