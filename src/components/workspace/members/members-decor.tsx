"use client";

import React, { useRef, useState, useEffect } from "react";
import { Users, Calendar, Wallet, QrCode, ClipboardCheck } from "lucide-react";

/**
 * Dynamic floating icons decor for the member roster card.
 * Generously spreads icons into the negative canvas space around the card,
 * preventing any compressed feeling or border hugging while dynamically
 * adapting to card dimensions.
 */
export function MembersFloatingDecor() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });

  useEffect(() => {
    const parent = containerRef.current?.parentElement;
    if (!parent) return;

    const measure = () => {
      const rect = parent.getBoundingClientRect();
      setDimensions({ width: rect.width, height: rect.height });
    };

    measure();

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });

    observer.observe(parent);
    window.addEventListener("resize", measure);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  const { width, height } = dimensions;

  // Generous lateral spread based on card width so icons float freely in negative space
  // Desktop (>= 950px): -98px corners, -136px flanks (50px+ clear margin from card edge)
  // Medium (780px - 950px): -76px corners, -104px flanks
  // Compact (640px - 780px): -52px corners, -72px flanks
  const isCompact = width > 0 && width < 780;
  const isMedium = width >= 780 && width < 950;

  const cornerSpread = isCompact ? -52 : isMedium ? -76 : -98;
  const flankSpread = isCompact ? -72 : isMedium ? -104 : -136;

  // Vertical distribution modes based on card height
  // 1. Short card (< 260px, e.g. 1-2 members): 4 corner icons only (prevents squishing)
  // 2. Medium card (260px - 480px, e.g. 3-6 members): 4 corners + mid-left Calendar
  // 3. Tall card (> 480px, e.g. 7+ members): full orbit with staggered side icons
  const isShortCard = height > 0 && height < 260;
  const isTallCard = height >= 480;

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="orgkit-floating-decor"
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 1,
      }}
    >
      {/* ── 1. Top-Left: Users Card (-7deg tilt, white surface) ── */}
      <div
        className="orgkit-burst-tl"
        style={{
          position: "absolute",
          top: -16,
          left: cornerSpread,
          zIndex: 10,
          transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
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

      {/* ── 2. Top-Right: QR Code Card (+8deg tilt, emerald solid) ── */}
      <div
        className="orgkit-burst-tr"
        style={{
          position: "absolute",
          top: -16,
          right: cornerSpread,
          zIndex: 10,
          transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
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
            transform: "rotate(8deg)",
          }}
        >
          <QrCode size={22} color="#FFFFFF" strokeWidth={2} />
        </div>
      </div>

      {/* ── 3. Bottom-Left: Wallet Card (+6deg tilt, white surface) ── */}
      <div
        className="orgkit-burst-bl"
        style={{
          position: "absolute",
          bottom: -16,
          left: cornerSpread + 6,
          zIndex: 10,
          transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
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
            boxShadow: "0 10px 25px rgba(24, 24, 27, 0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transform: "rotate(6deg)",
          }}
        >
          <Wallet size={20} color="var(--color-accent)" strokeWidth={2} />
        </div>
      </div>

      {/* ── 4. Bottom-Right: Clipboard Check Card (-6deg tilt, mint tint) ── */}
      <div
        className="orgkit-burst-br"
        style={{
          position: "absolute",
          bottom: -16,
          right: cornerSpread + 6,
          zIndex: 10,
          transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
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
            transform: "rotate(-6deg)",
          }}
        >
          <ClipboardCheck size={20} color="var(--color-accent)" strokeWidth={2} />
        </div>
      </div>

      {/* ── 5. Mid-Left: Calendar Card (Dynamic: shown when card has vertical breathing room) ── */}
      {!isShortCard && (
        <div
          className="orgkit-burst-fl"
          style={{
            position: "absolute",
            top: isTallCard ? "35%" : "calc(50% - 23px)",
            left: flankSpread,
            zIndex: 10,
            transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
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
              transform: "rotate(-5deg)",
            }}
          >
            <Calendar size={20} color="var(--color-accent)" strokeWidth={2} />
          </div>
        </div>
      )}

      {/* ── 6. Mid-Right: Dynamic Second Badge (shown on tall cards to balance flank) ── */}
      {isTallCard && (
        <div
          className="orgkit-burst-fr"
          style={{
            position: "absolute",
            top: "65%",
            right: flankSpread,
            zIndex: 10,
            transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
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
              boxShadow: "0 8px 20px rgba(24, 24, 27, 0.06)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transform: "rotate(6deg)",
            }}
          >
            <Users size={19} color="var(--color-accent)" strokeWidth={2} />
          </div>
        </div>
      )}

      {/* ── Floating Emerald Accent Dots (spaced in the airy negative margin) ── */}
      <div
        className="orgkit-burst-dot"
        style={{
          position: "absolute",
          left: cornerSpread + 28,
          top: "24%",
          width: 6,
          height: 6,
          borderRadius: "50%",
          backgroundColor: "color-mix(in srgb, var(--color-accent) 45%, transparent)",
        }}
      />
      <div
        className="orgkit-burst-dot"
        style={{
          position: "absolute",
          right: cornerSpread + 28,
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
          right: cornerSpread + 24,
          bottom: "26%",
          width: 6,
          height: 6,
          borderRadius: "50%",
          backgroundColor: "color-mix(in srgb, var(--color-accent) 35%, transparent)",
        }}
      />
    </div>
  );
}
