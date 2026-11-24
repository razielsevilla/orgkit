import React from "react";

export function EventsLogSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading past events log"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 24,
        width: "100%",
        maxWidth: 960,
        margin: "0 auto",
      }}
    >
      <style>{`
        @keyframes logSkeletonPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.45; }
        }
        .log-shimmer {
          background-color: var(--color-line);
          border-radius: 8px;
          animation: logSkeletonPulse 1.6s ease-in-out infinite;
        }
      `}</style>

      {/* Header Skeleton */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div className="log-shimmer" style={{ width: 140, height: 16, borderRadius: 6 }} />
        <div className="log-shimmer" style={{ width: 220, height: 32, borderRadius: 10 }} />
        <div className="log-shimmer" style={{ width: "min(320px, 100%)", height: 16, borderRadius: 6 }} />
      </div>

      {/* Summary Tiles Skeleton */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 16,
          width: "100%",
        }}
      >
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            style={{
              padding: 20,
              borderRadius: 18,
              backgroundColor: "var(--color-surface)",
              border: "1px solid var(--color-line)",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <div className="log-shimmer" style={{ width: 90, height: 14 }} />
            <div className="log-shimmer" style={{ width: 60, height: 28, borderRadius: 8 }} />
          </div>
        ))}
      </div>

      {/* Filter Bar Skeleton */}
      <div
        style={{
          padding: 16,
          borderRadius: 16,
          backgroundColor: "var(--color-surface)",
          border: "1px solid var(--color-line)",
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div className="log-shimmer" style={{ width: 160, height: 38, borderRadius: 10 }} />
        <div className="log-shimmer" style={{ width: 200, height: 38, borderRadius: 10 }} />
        <div className="log-shimmer" style={{ flex: 1, minWidth: 200, height: 38, borderRadius: 10 }} />
      </div>

      {/* Table Rows Skeleton */}
      <div
        style={{
          borderRadius: 20,
          backgroundColor: "var(--color-surface)",
          border: "1px solid var(--color-line)",
          padding: 20,
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "12px 0",
              borderBottom: i < 5 ? "1px solid var(--color-line)" : "none",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div className="log-shimmer" style={{ width: 120, height: 14 }} />
              <div className="log-shimmer" style={{ width: 240, height: 18 }} />
            </div>
            <div className="log-shimmer" style={{ width: 80, height: 24, borderRadius: 20 }} />
          </div>
        ))}
      </div>
    </div>
  );
}
