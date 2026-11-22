import React from "react";

export function DocumentsSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading documents"
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
        @keyframes docSkeletonPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.45; }
        }
        .doc-shimmer {
          background-color: var(--color-line);
          border-radius: 8px;
          animation: docSkeletonPulse 1.6s ease-in-out infinite;
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
          <div className="doc-shimmer" style={{ width: 180, height: 28, borderRadius: 10 }} />
          <div className="doc-shimmer" style={{ width: 280, height: 16, borderRadius: 6 }} />
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <div className="doc-shimmer" style={{ width: 110, height: 40, borderRadius: 12 }} />
          <div className="doc-shimmer" style={{ width: 110, height: 40, borderRadius: 12 }} />
        </div>
      </div>

      {/* Filter / Search Bar Skeleton */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div className="doc-shimmer" style={{ width: 240, height: 38, borderRadius: 12 }} />
        <div style={{ display: "flex", gap: 8 }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="doc-shimmer" style={{ width: 70, height: 32, borderRadius: 20 }} />
          ))}
        </div>
      </div>

      {/* Content Container Skeleton */}
      <div
        style={{
          backgroundColor: "var(--color-surface)",
          borderRadius: 20,
          border: "1px solid var(--color-line)",
          padding: 24,
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        {[1, 2, 3, 4].map((idx) => (
          <div
            key={idx}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 0",
              borderBottom: idx < 4 ? "1px solid var(--color-line)" : "none",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div className="doc-shimmer" style={{ width: 36, height: 36, borderRadius: 10 }} />
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div className="doc-shimmer" style={{ width: 200, height: 16, borderRadius: 4 }} />
                <div className="doc-shimmer" style={{ width: 120, height: 12, borderRadius: 4 }} />
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div className="doc-shimmer" style={{ width: 80, height: 24, borderRadius: 12 }} />
              <div className="doc-shimmer" style={{ width: 32, height: 32, borderRadius: 8 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
