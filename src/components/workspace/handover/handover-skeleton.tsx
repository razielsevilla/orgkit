import React from "react";
import { HandoverStyles } from "./handover-styles";

export function HandoverSkeleton() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 20,
        maxWidth: 880,
        margin: "0 auto",
        width: "100%",
        paddingTop: 16,
      }}
    >
      <HandoverStyles />

      {/* Top Header Row Skeleton */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div className="handover-shimmer" style={{ width: 140, height: 16, borderRadius: 6 }} />
        <div className="handover-shimmer" style={{ width: "min(320px, 100%)", height: 32, borderRadius: 10 }} />
        <div className="handover-shimmer" style={{ width: "min(400px, 100%)", height: 16, borderRadius: 6 }} />
      </div>

      {/* Completeness Bar Skeleton */}
      <div
        style={{
          borderRadius: 16,
          backgroundColor: "var(--color-surface)",
          border: "1px solid var(--color-line)",
          padding: "16px 20px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <div className="handover-shimmer" style={{ width: 220, height: 16, borderRadius: 6 }} />
        <div className="handover-shimmer" style={{ width: "100%", height: 8, borderRadius: 9999 }} />
      </div>

      {/* Section Cards Skeleton */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            style={{
              borderRadius: 20,
              backgroundColor: "var(--color-surface)",
              border: "1px solid var(--color-line)",
              padding: "20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
              <div className="handover-shimmer" style={{ width: 160, height: 18, borderRadius: 6 }} />
              <div className="handover-shimmer" style={{ width: "min(280px, 90%)", height: 14, borderRadius: 6 }} />
            </div>
            <div className="handover-shimmer" style={{ width: 28, height: 28, borderRadius: "50%" }} />
          </div>
        ))}
      </div>
    </div>
  );
}
