"use client";

import React from "react";
import { Users, Calendar, Wallet, QrCode, ClipboardCheck } from "lucide-react";

/**
 * Premium floating icons decor tailored for the members roster canvas.
 * Anchored closely to the card perimeter so they never clip on laptop or mid-sized screens.
 */
export function MembersFloatingDecor() {
  return (
    <div
      aria-hidden="true"
      className="orgkit-floating-decor"
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 1,
      }}
    >
      {/* 1. Top-Left: Users (White Card, -7deg tilt, ambient float) */}
      <div
        className="orgkit-burst-tl"
        style={{
          position: "absolute",
          top: -28,
          left: -22,
          zIndex: 10,
        }}
      >
        <div
          className="orgkit-float-a"
          style={{
            width: 48,
            height: 48,
            borderRadius: 15,
            backgroundColor: "var(--color-surface)",
            border: "1px solid color-mix(in srgb, var(--color-line) 80%, transparent)",
            boxShadow: "0 10px 25px rgba(24, 24, 27, 0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transform: "rotate(-7deg)",
          }}
        >
          <Users size={22} color="var(--color-accent)" strokeWidth={2} />
        </div>
      </div>

      {/* 2. Top-Right: QR Code (Emerald Solid Card, +8deg tilt) */}
      <div
        className="orgkit-burst-tr"
        style={{
          position: "absolute",
          top: -24,
          right: -20,
          zIndex: 10,
        }}
      >
        <div
          className="orgkit-float-b"
          style={{
            width: 48,
            height: 48,
            borderRadius: 15,
            backgroundColor: "var(--color-accent)",
            boxShadow: "0 10px 22px color-mix(in srgb, var(--color-accent) 35%, transparent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transform: "rotate(8deg)",
          }}
        >
          <QrCode size={22} color="#FFFFFF" strokeWidth={2} />
        </div>
      </div>

      {/* 3. Mid-Left: Calendar (Mint Tint Card, -5deg tilt) */}
      <div
        className="orgkit-burst-fl"
        style={{
          position: "absolute",
          top: "40%",
          left: -26,
          zIndex: 10,
        }}
      >
        <div
          className="orgkit-float-b"
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            backgroundColor: "color-mix(in srgb, var(--color-accent) 12%, transparent)",
            boxShadow: "0 6px 18px color-mix(in srgb, var(--color-accent) 8%, transparent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transform: "rotate(-5deg)",
          }}
        >
          <Calendar size={20} color="var(--color-accent)" strokeWidth={2} />
        </div>
      </div>

      {/* 4. Mid-Right: Clipboard Check (Mint Tint Card, +6deg tilt) */}
      <div
        className="orgkit-burst-fr"
        style={{
          position: "absolute",
          top: "45%",
          right: -24,
          zIndex: 10,
        }}
      >
        <div
          className="orgkit-float-a"
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            backgroundColor: "color-mix(in srgb, var(--color-accent) 12%, transparent)",
            boxShadow: "0 6px 18px color-mix(in srgb, var(--color-accent) 8%, transparent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transform: "rotate(6deg)",
          }}
        >
          <ClipboardCheck size={20} color="var(--color-accent)" strokeWidth={2} />
        </div>
      </div>

      {/* 5. Bottom-Left: Wallet (White Card, +7deg tilt) */}
      <div
        className="orgkit-burst-bl"
        style={{
          position: "absolute",
          bottom: 20,
          left: -20,
          zIndex: 10,
        }}
      >
        <div
          className="orgkit-float-a"
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            backgroundColor: "var(--color-surface)",
            border: "1px solid color-mix(in srgb, var(--color-line) 80%, transparent)",
            boxShadow: "0 10px 25px rgba(24, 24, 27, 0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transform: "rotate(7deg)",
          }}
        >
          <Wallet size={20} color="var(--color-accent)" strokeWidth={2} />
        </div>
      </div>

      {/* Decorative Emerald Accent Dots */}
      <div
        className="orgkit-burst-dot"
        style={{
          position: "absolute",
          left: -12,
          top: "20%",
          width: 6,
          height: 6,
          borderRadius: "50%",
          backgroundColor: "color-mix(in srgb, var(--color-accent) 40%, transparent)",
        }}
      />
      <div
        className="orgkit-burst-dot"
        style={{
          position: "absolute",
          right: -10,
          top: "28%",
          width: 5,
          height: 5,
          borderRadius: "50%",
          backgroundColor: "color-mix(in srgb, var(--color-accent) 35%, transparent)",
        }}
      />
      <div
        className="orgkit-burst-dot"
        style={{
          position: "absolute",
          right: -14,
          bottom: "22%",
          width: 6,
          height: 6,
          borderRadius: "50%",
          backgroundColor: "color-mix(in srgb, var(--color-accent) 30%, transparent)",
        }}
      />
    </div>
  );
}

