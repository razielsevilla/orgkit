import React from "react";
import { MemberSkeleton } from "@/src/components/workspace/members/member-skeleton";

/**
 * Route-specific loading skeleton for the Members roster.
 * Holds exact dimensions to achieve 0.00 CLS and instant visual feedback on navigation.
 */
export default function MembersRouteLoading() {
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
          maxWidth: 960,
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        {/* Header Skeleton */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div
              className="animate-pulse"
              style={{
                width: 140,
                height: 32,
                borderRadius: 8,
                backgroundColor: "color-mix(in srgb, var(--color-line) 80%, transparent)",
              }}
            />
            <div
              className="animate-pulse"
              style={{
                width: 320,
                height: 14,
                borderRadius: 6,
                backgroundColor: "color-mix(in srgb, var(--color-line) 60%, transparent)",
                marginTop: 8,
              }}
            />
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <div
              className="animate-pulse"
              style={{
                width: 96,
                height: 42,
                borderRadius: 9999,
                backgroundColor: "color-mix(in srgb, var(--color-accent) 25%, transparent)",
              }}
            />
            <div
              className="animate-pulse"
              style={{
                width: 96,
                height: 42,
                borderRadius: 9999,
                backgroundColor: "color-mix(in srgb, var(--color-line) 60%, transparent)",
              }}
            />
          </div>
        </div>

        {/* Search & Status Filter Skeleton */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginTop: 8 }}>
          <div
            className="animate-pulse"
            style={{
              width: "100%",
              maxWidth: 360,
              height: 42,
              borderRadius: 9999,
              backgroundColor: "var(--color-surface)",
              border: "1px solid var(--color-line)",
            }}
          />
          <div style={{ display: "flex", gap: 8 }}>
            {[48, 68, 64, 68].map((w, idx) => (
              <div
                key={idx}
                className="animate-pulse"
                style={{
                  width: w,
                  height: 32,
                  borderRadius: 9999,
                  backgroundColor: "color-mix(in srgb, var(--color-line) 60%, transparent)",
                }}
              />
            ))}
          </div>
        </div>

        {/* Table Rows Skeleton */}
        <div style={{ marginTop: 8 }}>
          <MemberSkeleton rowCount={5} />
        </div>
      </div>
    </div>
  );
}

