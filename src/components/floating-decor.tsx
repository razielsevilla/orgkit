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
            backgroundColor: "#FFFFFF",
            border: "1px solid rgba(228, 228, 231, 0.8)",
            boxShadow: "0 10px 25px rgba(24, 24, 27, 0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Users size={22} color="#059669" strokeWidth={2} />
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
            backgroundColor: "rgba(5, 150, 105, 0.12)",
            boxShadow: "0 6px 18px rgba(5, 150, 105, 0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Calendar size={20} color="#059669" strokeWidth={2} />
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
            backgroundColor: "#FFFFFF",
            border: "1px solid rgba(228, 228, 231, 0.8)",
            boxShadow: "0 10px 25px rgba(24, 24, 27, 0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Wallet size={22} color="#059669" strokeWidth={2} />
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
            backgroundColor: "#059669",
            boxShadow: "0 10px 22px rgba(5, 150, 105, 0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <QrCode size={22} color="#FFFFFF" strokeWidth={2} />
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
            backgroundColor: "#FFFFFF",
            border: "1px solid rgba(228, 228, 231, 0.8)",
            boxShadow: "0 10px 25px rgba(24, 24, 27, 0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Archive size={20} color="#059669" strokeWidth={2} />
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
            backgroundColor: "rgba(5, 150, 105, 0.12)",
            boxShadow: "0 6px 18px rgba(5, 150, 105, 0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ClipboardCheck size={21} color="#059669" strokeWidth={2} />
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
          backgroundColor: "rgba(5, 150, 105, 0.35)",
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
          backgroundColor: "rgba(5, 150, 105, 0.25)",
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
          backgroundColor: "rgba(5, 150, 105, 0.35)",
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
          backgroundColor: "rgba(5, 150, 105, 0.25)",
        }}
      />
    </>
  );
}

