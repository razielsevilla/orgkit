import React from "react";

/** The QR's footprint: a square that fits a 360px phone and a projector */
export const CHECKIN_QR_SIZE = "min(88vw, 60vh, 640px)";

/** A QR-sized grey square, shown while the first code loads */
export function CheckinQrSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading check-in code"
      className="orgkit-skeleton"
      style={{
        width: CHECKIN_QR_SIZE,
        height: CHECKIN_QR_SIZE,
        borderRadius: 24,
        backgroundColor: "color-mix(in srgb, var(--color-line) 85%, transparent)",
      }}
    >
      <span className="sr-only">Loading check-in code...</span>
    </div>
  );
}

/** The whole check-in screen while its page loads (used by `loading.tsx`) */
export function CheckinLoading() {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 900,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 20,
        padding: 16,
        boxSizing: "border-box",
        backgroundColor: "var(--color-base)",
      }}
    >
      <div
        className="orgkit-skeleton"
        style={{
          width: 240,
          maxWidth: "70vw",
          height: 28,
          borderRadius: 8,
          backgroundColor: "color-mix(in srgb, var(--color-line) 85%, transparent)",
        }}
      />
      <CheckinQrSkeleton />
    </div>
  );
}
