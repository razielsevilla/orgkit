"use client";

import Image from "next/image";

export function AuthBackgroundDecor() {
  // FULL-BLEED BACKGROUND DECORATION LAYER (0 to 100vw, 0 to 100vh)
  return (
    <div
      className="orgkit-bg-decor"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        overflow: "hidden",
        pointerEvents: "none",
        zIndex: 0,
      }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 1672 941"
        preserveAspectRatio="none"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
        }}
        aria-hidden="true"
      >
        <defs>
          <radialGradient
            id="topRightEmeraldGrad"
            cx="40%"
            cy="40%"
            r="60%"
            fx="30%"
            fy="30%"
          >
            <stop offset="0%" stopColor="var(--color-accent)" />
            <stop offset="70%" stopColor="var(--color-accent)" />
            <stop offset="100%" stopColor="var(--color-accent-bright)" />
          </radialGradient>

          <radialGradient
            id="bottomRightEmeraldGrad"
            cx="30%"
            cy="30%"
            r="70%"
          >
            <stop offset="0%" stopColor="var(--color-accent)" />
            <stop offset="100%" stopColor="var(--color-accent-bright)" />
          </radialGradient>
        </defs>

        {/* Top-Left: Large pale-green circle (accent/6%, r=290, center (-70, -120)) */}
        <circle
          cx="-70"
          cy="-120"
          r="290"
          fill="var(--color-accent)"
          fillOpacity="0.06"
        />

        {/* Top-Left: Concentric 1.5px outline circle (r=250, center (-70, -120)) */}
        <circle
          cx="-70"
          cy="-120"
          r="250"
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth="1.5"
          strokeOpacity="0.35"
        />

        {/* Top-Left: Tiny emerald triangular tick on pale edge near (224, 44) */}
        <polygon
          points="224,44 228,54 219,52"
          fill="var(--color-accent)"
        />

        {/* Top-Right: Concentric pale-green ring (r=320, center (1700, -120), accent/10%) */}
        <circle
          cx="1700"
          cy="-120"
          r="320"
          fill="var(--color-accent)"
          fillOpacity="0.10"
        />

        {/* Top-Right: Large solid emerald circle (r=285, center (1700, -120)) with gradient */}
        <circle
          cx="1700"
          cy="-120"
          r="285"
          fill="url(#topRightEmeraldGrad)"
        />

        {/* Bottom-Right: Thin 1.5px emerald outline arc */}
        <path
          d="M 1340 941 C 1440 840, 1545 795, 1672 785"
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth="1.5"
          strokeOpacity="0.4"
        />

        {/* Bottom-Right: Solid emerald circle segment */}
        <path
          d="M 1440 941 C 1515 880, 1595 855, 1672 848 L 1672 941 Z"
          fill="url(#bottomRightEmeraldGrad)"
        />

        {/* Bottom-Left: Large pale mint circle (top of arc at y≈545, r≈395) */}
        <circle
          cx="-50"
          cy="940"
          r="395"
          fill="var(--color-accent)"
          fillOpacity="0.08"
        />

        {/* Bottom-Left: Second pale mint circle behind building (center (560, 900), r=250) */}
        <circle
          cx="560"
          cy="900"
          r="250"
          fill="var(--color-accent)"
          fillOpacity="0.08"
        />
      </svg>

      {/* ── Bottom-Left: Campus Building Photo with Dual-Gradient Fade ── */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          width: "clamp(550px, 53.2vw, 890px)",
          height: "clamp(180px, 30.8vh, 290px)",
          overflow: "hidden",
          zIndex: 1,
          pointerEvents: "none",
          maskImage:
            "linear-gradient(to right, rgba(0,0,0,1) 50%, transparent 100%), linear-gradient(to top, rgba(0,0,0,1) 40%, transparent 100%)",
          maskComposite: "intersect",
          WebkitMaskImage:
            "linear-gradient(to right, rgba(0,0,0,1) 50%, transparent 100%), linear-gradient(to top, rgba(0,0,0,1) 40%, transparent 100%)",
          WebkitMaskComposite: "source-in",
        }}
      >
        <Image
          src="/campus-building.png"
          alt=""
          fill
          priority
          sizes="clamp(550px, 53.2vw, 890px)"
          className="object-cover"
          style={{
            objectFit: "cover",
            objectPosition: "0 100%",
            filter: "grayscale(100%)",
          }}
        />
      </div>
    </div>
  );
}
