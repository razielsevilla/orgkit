import React from "react";

export function TermsSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading officer terms"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 28,
        width: "100%",
        maxWidth: 1200,
        margin: "0 auto",
      }}
    >
      <style>{`
        @keyframes termsPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.45; }
        }
        .terms-shimmer {
          background-color: var(--color-line);
          border-radius: 8px;
          animation: termsPulse 1.6s ease-in-out infinite;
        }
      `}</style>

      {/* Header Skeleton */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div className="terms-shimmer" style={{ width: 180, height: 28, borderRadius: 10 }} />
          <div className="terms-shimmer" style={{ width: 280, height: 16, borderRadius: 6 }} />
        </div>
        <div className="terms-shimmer" style={{ width: 140, height: 42, borderRadius: 12 }} />
      </div>

      {/* Grouped Term Card Skeletons */}
      {[1, 2].map((idx) => (
        <div
          key={idx}
          style={{
            backgroundColor: "var(--color-surface)",
            borderRadius: 20,
            border: "1px solid var(--color-line)",
            padding: 24,
            display: "flex",
            flexDirection: "column",
            gap: 20,
          }}
        >
          {/* Term Group Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div className="terms-shimmer" style={{ width: 160, height: 22, borderRadius: 8 }} />
              <div className="terms-shimmer" style={{ width: 70, height: 22, borderRadius: 999 }} />
            </div>
            <div className="terms-shimmer" style={{ width: 110, height: 16, borderRadius: 6 }} />
          </div>

          {/* Table / rows */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[1, 2, 3].map((rowIdx) => (
              <div
                key={rowIdx}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 16px",
                  borderRadius: 12,
                  backgroundColor: "var(--color-base)",
                  gap: 16,
                }}
              >
                <div style={{ display: "flex", gap: 16, flex: 1 }}>
                  <div className="terms-shimmer" style={{ width: 120, height: 18, borderRadius: 6 }} />
                  <div className="terms-shimmer" style={{ width: 160, height: 18, borderRadius: 6 }} />
                </div>
                <div style={{ display: "flex", gap: 16 }}>
                  <div className="terms-shimmer" style={{ width: 90, height: 16, borderRadius: 6 }} />
                  <div className="terms-shimmer" style={{ width: 90, height: 16, borderRadius: 6 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
