import React from "react";

/**
 * Route-specific loading skeleton for the Join Link & QR management page.
 */
export default function MemberJoinLoading() {
  return (
    <div
      style={{
        height: "100%",
        padding: "36px clamp(16px, 4vw, 36px) 60px clamp(16px, 4vw, 36px)",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: "100%",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 620,
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        <div>
          <div
            className="animate-pulse"
            style={{
              width: 180,
              height: 28,
              borderRadius: 8,
              backgroundColor: "color-mix(in srgb, var(--color-line) 80%, transparent)",
            }}
          />
          <div
            className="animate-pulse"
            style={{
              width: 300,
              height: 14,
              borderRadius: 6,
              backgroundColor: "color-mix(in srgb, var(--color-line) 60%, transparent)",
              marginTop: 8,
            }}
          />
        </div>

        <div
          className="animate-pulse"
          style={{
            height: 380,
            borderRadius: 24,
            backgroundColor: "var(--color-surface)",
            border: "1px solid var(--color-line)",
          }}
        />
      </div>
    </div>
  );
}

