"use client";

import Image from "next/image";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Users, CalendarDays, ChartNoAxesCombined } from "lucide-react";
import { useEffect } from "react";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

export function AuthLayout({ children }: { children: React.ReactNode }) {
  // Enforce zero-scrollbar policy and lock html/body on desktop viewports
  useEffect(() => {
    function enforceDesktop() {
      const w = window.innerWidth;

      if (w >= 1024) {
        document.documentElement.style.overflow = "hidden";
        document.documentElement.style.height = "100%";
        document.documentElement.style.backgroundColor = "#F4F4F5";
        document.body.style.overflow = "hidden";
        document.body.style.height = "100%";
        document.body.style.backgroundColor = "#F4F4F5";
      } else {
        document.documentElement.style.overflow = "";
        document.documentElement.style.height = "";
        document.documentElement.style.backgroundColor = "";
        document.body.style.overflow = "";
        document.body.style.height = "";
        document.body.style.backgroundColor = "";
      }
    }

    enforceDesktop();
    window.addEventListener("resize", enforceDesktop);
    return () => {
      window.removeEventListener("resize", enforceDesktop);
      document.documentElement.style.overflow = "";
      document.documentElement.style.height = "";
      document.documentElement.style.backgroundColor = "";
      document.body.style.overflow = "";
      document.body.style.height = "";
      document.body.style.backgroundColor = "";
    };
  }, []);

  return (
    <main
      className={`${plusJakarta.className} orgkit-page-root`}
      style={{
        backgroundColor: "#F4F4F5",
        color: "#18181B",
        position: "relative",
        width: "100vw",
        minWidth: "100%",
        height: "100vh",
        maxHeight: "100vh",
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      <style>{`
        /* ── Full-Bleed Global Baseline ── */
        html, body {
          background-color: #F4F4F5 !important;
          margin: 0 !important;
          padding: 0 !important;
        }

        /* ── Desktop View (>= 1024px): Zero Scroll, Edge-to-Edge Full Bleed ── */
        @media (min-width: 1024px) {
          html, body {
            overflow: hidden !important;
            height: 100vh !important;
            max-height: 100vh !important;
            width: 100vw !important;
          }

          .orgkit-page-root {
            width: 100vw !important;
            height: 100vh !important;
            max-height: 100vh !important;
            overflow: hidden !important;
            display: flex !important;
            align-items: center !important;
          }

          .orgkit-layout-body {
            display: flex !important;
            width: 100% !important;
            height: 100% !important;
            align-items: center !important;
            justify-content: space-between !important;
            padding-left: clamp(32px, 10.5vw, 175px) !important;
            padding-right: clamp(32px, 10.1vw, 170px) !important;
            box-sizing: border-box !important;
            position: relative !important;
            z-index: 10 !important;
          }

          .orgkit-left-pane {
            display: flex !important;
            flex-direction: column !important;
            justify-content: center !important;
            flex-shrink: 0 !important;
            max-width: clamp(480px, 46vw, 680px) !important;
          }

          .orgkit-marketing-content {
            display: block !important;
          }

          .orgkit-right-pane {
            display: flex !important;
            align-items: center !important;
            justify-content: flex-end !important;
            flex-shrink: 0 !important;
          }
        }

        /* ── Mobile View Fallback (< 1024px) ── */
        @media (max-width: 1023px) {
          html, body {
            overflow-y: auto !important;
            overflow-x: hidden !important;
            height: auto !important;
            max-height: none !important;
          }

          .orgkit-page-root {
            height: auto !important;
            min-height: 100vh !important;
            max-height: none !important;
            overflow-y: auto !important;
            overflow-x: hidden !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            justify-content: flex-start !important;
            width: 100% !important;
            padding: 32px 16px 48px 16px !important;
          }

          .orgkit-bg-decor {
            display: none !important;
          }

          .orgkit-layout-body {
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            width: 100% !important;
            max-width: 440px !important;
            box-sizing: border-box !important;
          }

          .orgkit-left-pane {
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            width: 100% !important;
            margin-bottom: 24px !important;
          }

          .orgkit-marketing-content {
            display: none !important;
          }

          .orgkit-right-pane {
            width: 100% !important;
            display: flex !important;
            justify-content: center !important;
          }
        }

        /* ── Interactive Button & Links UX Styling ── */
        @keyframes orgkitCardFadeIn {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .orgkit-card {
          animation: orgkitCardFadeIn 0.22s cubic-bezier(0.16, 1, 0.3, 1) both;
          transition: box-shadow 0.25s ease, border-color 0.25s ease;
        }

        .orgkit-google-btn {
          width: 100%;
          border-radius: 9999px;
          background-color: #FFFFFF;
          border: 2px solid #E4E4E7;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
          outline: none;
          box-sizing: border-box;
          user-select: none;
          box-shadow: 0 1px 3px rgba(24, 24, 27, 0.04);
        }

        .orgkit-google-btn:hover:not(:disabled) {
          background-color: #FAFAFA;
          border-color: #D4D4D8;
          box-shadow: 0 6px 18px rgba(24, 24, 27, 0.08);
          transform: translateY(-1px);
        }

        .orgkit-google-btn:active:not(:disabled) {
          transform: translateY(0.5px) scale(0.995);
          box-shadow: 0 1px 2px rgba(24, 24, 27, 0.05);
          background-color: #F4F4F5;
        }

        .orgkit-google-btn:focus-visible {
          box-shadow: 0 0 0 2px #FFFFFF, 0 0 0 4px #059669;
        }

        .orgkit-google-btn:disabled {
          opacity: 0.75;
          cursor: not-allowed;
          transform: none !important;
        }

        /* ── Feature Items Micro-interactions ── */
        .orgkit-feature-item {
          display: flex;
          align-items: center;
          cursor: default;
          transition: transform 0.2s ease;
          user-select: none;
        }

        .orgkit-feature-item:hover {
          transform: translateY(-1px);
        }

        .orgkit-feature-item:hover .orgkit-feature-icon {
          color: #059669 !important;
          transform: scale(1.08);
        }

        .orgkit-feature-item:hover .orgkit-feature-label {
          color: #18181B !important;
        }

        .orgkit-feature-icon {
          transition: color 0.2s ease, transform 0.2s ease;
        }

        .orgkit-feature-label {
          transition: color 0.2s ease;
        }

        /* ── Keyboard & Link Focus Accessibility ── */
        .orgkit-terms-link {
          color: #059669;
          text-decoration: none;
          font-weight: 600;
          border-radius: 2px;
          transition: color 0.15s ease, text-decoration 0.15s ease;
        }

        .orgkit-terms-link:hover {
          text-decoration: underline;
          color: #047857;
        }

        .orgkit-terms-link:focus-visible {
          outline: 2px solid #059669;
          outline-offset: 2px;
          text-decoration: underline;
        }

        .orgkit-signin-link {
          color: #059669;
          text-decoration: none;
          font-weight: 700;
          border-radius: 2px;
          transition: color 0.15s ease, text-decoration 0.15s ease;
        }

        .orgkit-signin-link:hover {
          text-decoration: underline;
          color: #047857;
        }

        .orgkit-signin-link:focus-visible {
          outline: 2px solid #059669;
          outline-offset: 2px;
          text-decoration: underline;
        }

        /* ── Smooth Loading Spinner ── */
        @keyframes orgkitSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .orgkit-spinner {
          animation: orgkitSpin 0.75s linear infinite;
        }

        /* ── Respect User Preferences: Reduced Motion ── */
        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
            scroll-behavior: auto !important;
          }
          .orgkit-google-btn:hover,
          .orgkit-google-btn:active,
          .orgkit-feature-item:hover {
            transform: none !important;
          }
        }
      `}</style>

      {/* ═══════════════════════════════════════════════════════════════
          FULL-BLEED BACKGROUND DECORATION LAYER (0 to 100vw, 0 to 100vh)
          ═══════════════════════════════════════════════════════════════ */}
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
              <stop offset="0%" stopColor="#059669" />
              <stop offset="70%" stopColor="#059669" />
              <stop offset="100%" stopColor="#10b981" />
            </radialGradient>

            <radialGradient
              id="bottomRightEmeraldGrad"
              cx="30%"
              cy="30%"
              r="70%"
            >
              <stop offset="0%" stopColor="#059669" />
              <stop offset="100%" stopColor="#10b981" />
            </radialGradient>
          </defs>

          {/* Top-Left: Large pale-green circle (accent/6%, r=290, center (-70, -120)) */}
          <circle
            cx="-70"
            cy="-120"
            r="290"
            fill="#059669"
            fillOpacity="0.06"
          />

          {/* Top-Left: Concentric 1.5px outline circle (r=250, center (-70, -120)) */}
          <circle
            cx="-70"
            cy="-120"
            r="250"
            fill="none"
            stroke="#059669"
            strokeWidth="1.5"
            strokeOpacity="0.35"
          />

          {/* Top-Left: Tiny emerald triangular tick on pale edge near (224, 44) */}
          <polygon
            points="224,44 228,54 219,52"
            fill="#059669"
          />

          {/* Top-Right: Concentric pale-green ring (r=320, center (1700, -120), accent/10%) */}
          <circle
            cx="1700"
            cy="-120"
            r="320"
            fill="#059669"
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
            stroke="#059669"
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
            fill="#059669"
            fillOpacity="0.08"
          />

          {/* Bottom-Left: Second pale mint circle behind building (center (560, 900), r=250) */}
          <circle
            cx="560"
            cy="900"
            r="250"
            fill="#059669"
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

      {/* ═══════════════════════════════════════════════════════════════
          RESPONSIVE BODY: Left Marketing Stack + Right Card Slot
          ═══════════════════════════════════════════════════════════════ */}
      <div className="orgkit-layout-body">
        {/* ── Left Pane: Header + Marketing Stack ── */}
        <div className="orgkit-left-pane">
          {/* Header: Logo with OrgKit wordmark */}
          <header
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: "clamp(24px, 5.1vh, 48px)",
            }}
          >
            <Image
              src="/orgkit-text-logo.png"
              alt="OrgKit"
              width={217}
              height={72}
              priority
              draggable={false}
              className="object-contain select-none"
              style={{
                width: "clamp(150px, 13vw, 220px)",
                height: "auto",
                display: "block",
              }}
            />
          </header>

          {/* Marketing Content: Desktop only, hidden on mobile */}
          <div className="orgkit-marketing-content">
            <h1
              style={{
                marginTop: 0,
                fontSize: "clamp(38px, 3.83vw, 64px)",
                lineHeight: 1.05,
                fontWeight: 800,
                letterSpacing: "-0.025em",
                color: "#18181B",
                marginRight: 0,
                marginBottom: 0,
              }}
            >
              <span style={{ whiteSpace: "nowrap" }}>Organize. Collaborate.</span>
              <br />
              <span style={{ color: "#059669" }}>Lead.</span>
            </h1>

            <p
              style={{
                marginTop: "clamp(14px, 2.97vh, 28px)",
                fontSize: "clamp(16px, 1.44vw, 24px)",
                lineHeight: 1.25,
                color: "#71717A",
                fontWeight: 400,
                marginBottom: 0,
              }}
            >
              A modern platform for student organizations
              <br />
              to connect, manage, and grow together.
            </p>

            <div
              role="list"
              aria-label="Key Platform Features"
              style={{
                marginTop: "clamp(24px, 6.8vh, 64px)",
                display: "flex",
                alignItems: "center",
              }}
            >
              {/* Feature 1: Manage Members */}
              <div
                role="listitem"
                className="orgkit-feature-item"
                title="Easily manage all organization members and rosters"
                style={{
                  gap: "clamp(8px, 0.84vw, 14px)",
                }}
              >
                <Users
                  className="orgkit-feature-icon"
                  style={{
                    width: "clamp(22px, 1.8vw, 30px)",
                    height: "clamp(22px, 1.8vw, 30px)",
                  }}
                  strokeWidth={1.5}
                  color="#18181B"
                  aria-hidden="true"
                />
                <span
                  className="orgkit-feature-label"
                  style={{
                    fontSize: "clamp(13px, 0.93vw, 15.5px)",
                    fontWeight: 500,
                    color: "#3F3F46",
                    whiteSpace: "nowrap",
                  }}
                >
                  Manage Members
                </span>
              </div>

              <div
                aria-hidden="true"
                style={{
                  width: 1.5,
                  height: "clamp(20px, 3.19vh, 30px)",
                  backgroundColor: "rgba(161, 161, 170, 0.6)",
                  marginLeft: "clamp(14px, 1.79vw, 30px)",
                  marginRight: "clamp(14px, 1.79vw, 30px)",
                  flexShrink: 0,
                }}
              />

              {/* Feature 2: Organize Events */}
              <div
                role="listitem"
                className="orgkit-feature-item"
                title="Plan, publish, and schedule student events"
                style={{
                  gap: "clamp(8px, 0.84vw, 14px)",
                }}
              >
                <CalendarDays
                  className="orgkit-feature-icon"
                  style={{
                    width: "clamp(22px, 1.8vw, 30px)",
                    height: "clamp(22px, 1.8vw, 30px)",
                  }}
                  strokeWidth={1.5}
                  color="#18181B"
                  aria-hidden="true"
                />
                <span
                  className="orgkit-feature-label"
                  style={{
                    fontSize: "clamp(13px, 0.93vw, 15.5px)",
                    fontWeight: 500,
                    color: "#3F3F46",
                    whiteSpace: "nowrap",
                  }}
                >
                  Organize Events
                </span>
              </div>

              <div
                aria-hidden="true"
                style={{
                  width: 1.5,
                  height: "clamp(20px, 3.19vh, 30px)",
                  backgroundColor: "rgba(161, 161, 170, 0.6)",
                  marginLeft: "clamp(14px, 1.79vw, 30px)",
                  marginRight: "clamp(14px, 1.79vw, 30px)",
                  flexShrink: 0,
                }}
              />

              {/* Feature 3: Track Activities */}
              <div
                role="listitem"
                className="orgkit-feature-item"
                title="Monitor organizational growth and participation"
                style={{
                  gap: "clamp(8px, 0.84vw, 14px)",
                }}
              >
                <ChartNoAxesCombined
                  className="orgkit-feature-icon"
                  style={{
                    width: "clamp(22px, 1.8vw, 30px)",
                    height: "clamp(22px, 1.8vw, 30px)",
                  }}
                  strokeWidth={1.5}
                  color="#18181B"
                  aria-hidden="true"
                />
                <span
                  className="orgkit-feature-label"
                  style={{
                    fontSize: "clamp(13px, 0.93vw, 15.5px)",
                    fontWeight: 500,
                    color: "#3F3F46",
                    whiteSpace: "nowrap",
                  }}
                >
                  Track Activities
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right Pane: Dynamic Card Content ── */}
        <div className="orgkit-right-pane">
          {children}
        </div>
      </div>
    </main>
  );
}

