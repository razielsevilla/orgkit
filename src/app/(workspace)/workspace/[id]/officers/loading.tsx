import React from "react";
import { MemberSkeleton } from "@/src/components/workspace/members/member-skeleton";

/**
 * Route-specific loading skeleton for the Officers & Invites page.
 */
export default function OfficersLoading() {
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
          gap: 20,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div
              className="animate-pulse"
              style={{
                width: 160,
                height: 32,
                borderRadius: 8,
                backgroundColor: "color-mix(in srgb, var(--color-line) 80%, transparent)",
              }}
            />
            <div
              className="animate-pulse"
              style={{
                width: 280,
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
              width: 120,
              height: 42,
              borderRadius: 9999,
              backgroundColor: "color-mix(in srgb, var(--color-accent) 25%, transparent)",
            }}
          />
        </div>

        <MemberSkeleton rowCount={4} />
      </div>
    </div>
  );
}

