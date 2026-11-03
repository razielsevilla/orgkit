import React from "react";
import { Users, Calendar, Wallet, QrCode, Archive, ClipboardCheck } from "lucide-react";

export function FloatingIconsDecor() {
  return (
    <>
      {/* 1. Top-Left: Users (White Card, -7deg tilt) */}
      <div
        className="orgkit-floating-decor orgkit-burst-tl"
        style={{
          position: "absolute",
          top: -46,
          left: -100,
          zIndex: 20,
        }}
      >
        <div
          className="orgkit-float-a"
          style={{
            width: 50,
            height: 50,
            borderRadius: 16,
            backgroundColor: "var(--color-surface)",
            border: "1px solid color-mix(in srgb, var(--color-line) 80%, transparent)",
            boxShadow: "0 10px 25px color-mix(in srgb, var(--color-ink) 8%, transparent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Users size={22} color="var(--color-accent)" strokeWidth={2} />
        </div>
      </div>

      {/* 2. Far-Left: Calendar (Mint Card, -5deg tilt) */}
      <div
        className="orgkit-floating-decor orgkit-burst-fl"
        style={{
          position: "absolute",
          top: 170,
          left: -168,
          zIndex: 20,
        }}
      >
        <div
          className="orgkit-float-b"
          style={{
            width: 46,
            height: 46,
            borderRadius: 15,
            backgroundColor: "color-mix(in srgb, var(--color-accent) 12%, transparent)",
            boxShadow: "0 6px 18px color-mix(in srgb, var(--color-accent) 8%, transparent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Calendar size={20} color="var(--color-accent)" strokeWidth={2} />
        </div>
      </div>

      {/* 3. Bottom-Left: Wallet (White Card, +7deg tilt) */}
      <div
        className="orgkit-floating-decor orgkit-burst-bl"
        style={{
          position: "absolute",
          bottom: 42,
          left: -100,
          zIndex: 20,
        }}
      >
        <div
          className="orgkit-float-a"
          style={{
            width: 50,
            height: 50,
            borderRadius: 16,
            backgroundColor: "var(--color-surface)",
            border: "1px solid color-mix(in srgb, var(--color-line) 80%, transparent)",
            boxShadow: "0 10px 25px color-mix(in srgb, var(--color-ink) 8%, transparent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Wallet size={22} color="var(--color-accent)" strokeWidth={2} />
        </div>
      </div>

      {/* 4. Top-Right: QR Code (Emerald Solid Card, +7deg tilt) */}
      <div
        className="orgkit-floating-decor orgkit-burst-tr"
        style={{
          position: "absolute",
          top: -40,
          right: -96,
          zIndex: 20,
        }}
      >
        <div
          className="orgkit-float-b"
          style={{
            width: 50,
            height: 50,
            borderRadius: 16,
            backgroundColor: "var(--color-accent)",
            boxShadow: "0 10px 22px color-mix(in srgb, var(--color-accent) 35%, transparent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <QrCode size={22} color="var(--color-on-accent)" strokeWidth={2} />
        </div>
      </div>

      {/* 5. Far-Right: Archive Box (White Card, +5deg tilt) */}
      <div
        className="orgkit-floating-decor orgkit-burst-fr"
        style={{
          position: "absolute",
          top: 175,
          right: -158,
          zIndex: 20,
        }}
      >
        <div
          className="orgkit-float-a"
          style={{
            width: 46,
            height: 46,
            borderRadius: 15,
            backgroundColor: "var(--color-surface)",
            border: "1px solid color-mix(in srgb, var(--color-line) 80%, transparent)",
            boxShadow: "0 10px 25px color-mix(in srgb, var(--color-ink) 8%, transparent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Archive size={20} color="var(--color-accent)" strokeWidth={2} />
        </div>
      </div>

      {/* 6. Bottom-Right: Clipboard Check (Mint Card, -6deg tilt) */}
      <div
        className="orgkit-floating-decor orgkit-burst-br"
        style={{
          position: "absolute",
          bottom: 38,
          right: -96,
          zIndex: 20,
        }}
      >
        <div
          className="orgkit-float-b"
          style={{
            width: 48,
            height: 48,
            borderRadius: 15,
            backgroundColor: "color-mix(in srgb, var(--color-accent) 12%, transparent)",
            boxShadow: "0 6px 18px color-mix(in srgb, var(--color-accent) 8%, transparent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ClipboardCheck size={21} color="var(--color-accent)" strokeWidth={2} />
        </div>
      </div>

      {/* Floating Accent Dots */}
      <div
        className="orgkit-floating-decor orgkit-burst-dot"
        style={{
          position: "absolute",
          left: -54,
          top: 110,
          width: 5.5,
          height: 5.5,
          borderRadius: "50%",
          backgroundColor: "color-mix(in srgb, var(--color-accent) 35%, transparent)",
        }}
      />
      <div
        className="orgkit-floating-decor orgkit-burst-dot"
        style={{
          position: "absolute",
          left: -130,
          bottom: 95,
          width: 5,
          height: 5,
          borderRadius: "50%",
          backgroundColor: "color-mix(in srgb, var(--color-accent) 25%, transparent)",
        }}
      />
      <div
        className="orgkit-floating-decor orgkit-burst-dot"
        style={{
          position: "absolute",
          right: -38,
          top: 125,
          width: 5.5,
          height: 5.5,
          borderRadius: "50%",
          backgroundColor: "color-mix(in srgb, var(--color-accent) 35%, transparent)",
        }}
      />
      <div
        className="orgkit-floating-decor orgkit-burst-dot"
        style={{
          position: "absolute",
          right: -128,
          top: 48,
          width: 5,
          height: 5,
          borderRadius: "50%",
          backgroundColor: "color-mix(in srgb, var(--color-accent) 25%, transparent)",
        }}
      />
    </>
  );
}

