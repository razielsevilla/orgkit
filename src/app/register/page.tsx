"use client";

import Image from "next/image";
import Link from "next/link";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Users, CalendarDays, ChartNoAxesCombined } from "lucide-react";
import { useState, useEffect } from "react";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

/* ── Google "G" multicolor official logo (inline SVG, 24×24 viewBox) ── */
function GoogleLogo({ size = 36 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
      />
    </svg>
  );
}

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);

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

  // TODO: Replace with the real Google sign-in handler from the auth system (A1 ticket)
  function handleGoogleSignUp() {
    setLoading(true);
    // TODO: Implement Google OAuth sign-up flow
    setTimeout(() => setLoading(false), 2000);
  }

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

          .orgkit-mobile-wrapper {
            display: none !important;
          }

          .orgkit-desktop-body {
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

          .orgkit-desktop-body {
            display: none !important;
          }

          .orgkit-mobile-wrapper {
            display: flex !important;
            flex-direction: column;
            align-items: center;
            width: 100%;
            max-width: 440px;
            box-sizing: border-box;
          }
        }

        /* ── Interactive Button & Links Styling ── */
        .orgkit-google-btn {
          width: 100%;
          border-radius: 9999px;
          background-color: #FFFFFF;
          border: 2px solid #E4E4E7;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background-color 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
          outline: none;
          box-sizing: border-box;
        }

        .orgkit-google-btn:hover {
          background-color: #F4F4F5;
        }

        .orgkit-google-btn:focus-visible {
          box-shadow: 0 0 0 2px #FFFFFF, 0 0 0 4px #059669;
        }

        .orgkit-google-btn:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .orgkit-terms-link {
          color: #059669;
          text-decoration: none;
          font-weight: 500;
        }

        .orgkit-terms-link:hover, .orgkit-terms-link:focus-visible {
          text-decoration: underline;
        }
      `}</style>

      {/* ═══════════════════════════════════════════════════════════════
          FULL-BLEED BACKGROUND DECORATION LAYER (0 to 100vw, 0 to 100vh)
          No white bars or side borders!
          ═══════════════════════════════════════════════════════════════ */}
      <div
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
            className="object-cover"
            style={{
              objectFit: "cover",
              objectPosition: "0 100%", // Crop out residual mock text from asset
              filter: "grayscale(100%)",
            }}
          />
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          DESKTOP VIEW: Full-Bleed 2-Column Responsive Layout (Zero Scroll)
          ═══════════════════════════════════════════════════════════════ */}
      <div className="orgkit-desktop-body">
        {/* ── Left Pane: Header + Marketing Stack ── */}
        <div className="orgkit-left-pane">
          {/* 1. Header: Logo + Divider + Wordmark */}
          <header
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: "clamp(24px, 5.1vh, 48px)",
            }}
          >
            <Image
              src="/orgkit-logo.png"
              alt="OrgKit"
              width={82}
              height={52}
              priority
              className="object-contain"
              style={{
                width: "clamp(56px, 4.9vw, 82px)",
                height: "auto",
                display: "block",
              }}
            />
            <div
              style={{
                width: 1.5,
                height: "clamp(34px, 5.3vh, 50px)",
                backgroundColor: "#E4E4E7",
                marginLeft: "clamp(14px, 1.44vw, 24px)",
                marginRight: "clamp(14px, 1.44vw, 24px)",
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontSize: "clamp(26px, 2.27vw, 38px)",
                fontWeight: 700,
                color: "#18181B",
                letterSpacing: "-0.015em",
                lineHeight: 1,
              }}
            >
              OrgKit
            </span>
          </header>

          {/* 2. Pill Badge */}
          <div
            style={{
              height: "clamp(32px, 4vh, 38px)",
              paddingLeft: "clamp(14px, 1.2vw, 20px)",
              paddingRight: "clamp(14px, 1.2vw, 20px)",
              borderRadius: 9999,
              backgroundColor: "rgba(5, 150, 105, 0.08)",
              border: "1.5px solid rgba(5, 150, 105, 0.25)",
              display: "inline-flex",
              alignItems: "center",
              gap: "clamp(8px, 0.72vw, 12px)",
              boxSizing: "border-box",
            }}
          >
            <span
              style={{
                width: "clamp(9px, 0.72vw, 12px)",
                height: "clamp(9px, 0.72vw, 12px)",
                borderRadius: "50%",
                backgroundColor: "#059669",
                flexShrink: 0,
                display: "inline-block",
              }}
            />
            <span
              style={{
                fontSize: "clamp(13px, 0.93vw, 15.5px)",
                fontWeight: 500,
                color: "#3F3F46",
                whiteSpace: "nowrap",
              }}
            >
              Student Organization Management System
            </span>
          </div>

          {/* 3. H1 Headline (32px below badge) */}
          <h1
            style={{
              marginTop: "clamp(18px, 3.4vh, 32px)",
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

          {/* 4. Subtitle Paragraph (28px below H1) */}
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

          {/* 5. Feature Row (64px below paragraph) */}
          <div
            style={{
              marginTop: "clamp(24px, 6.8vh, 64px)",
              display: "flex",
              alignItems: "center",
            }}
          >
            {/* Feature 1: Manage Members */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "clamp(8px, 0.84vw, 14px)",
              }}
            >
              <Users
                style={{
                  width: "clamp(22px, 1.8vw, 30px)",
                  height: "clamp(22px, 1.8vw, 30px)",
                }}
                strokeWidth={1.5}
                color="#18181B"
                aria-hidden="true"
              />
              <span
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

            {/* 1.5px vertical divider (30px margin each side) */}
            <div
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
              style={{
                display: "flex",
                alignItems: "center",
                gap: "clamp(8px, 0.84vw, 14px)",
              }}
            >
              <CalendarDays
                style={{
                  width: "clamp(22px, 1.8vw, 30px)",
                  height: "clamp(22px, 1.8vw, 30px)",
                }}
                strokeWidth={1.5}
                color="#18181B"
                aria-hidden="true"
              />
              <span
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

            {/* 1.5px vertical divider (30px margin each side) */}
            <div
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
              style={{
                display: "flex",
                alignItems: "center",
                gap: "clamp(8px, 0.84vw, 14px)",
              }}
            >
              <ChartNoAxesCombined
                style={{
                  width: "clamp(22px, 1.8vw, 30px)",
                  height: "clamp(22px, 1.8vw, 30px)",
                }}
                strokeWidth={1.5}
                color="#18181B"
                aria-hidden="true"
              />
              <span
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

        {/* ── Right Pane: Registration Card (Vertically Centered) ── */}
        <div className="orgkit-right-pane">
          <div
            style={{
              width: "clamp(380px, 33.85vw, 566px)",
              maxWidth: 566,
              backgroundColor: "#FFFFFF",
              borderRadius: "clamp(20px, 1.67vw, 28px)",
              padding: "clamp(24px, 4.25vh, 40px) clamp(24px, 2.69vw, 45px)",
              boxShadow: "0 20px 50px rgba(24, 24, 27, 0.08)",
              border: "1px solid rgba(228, 228, 231, 0.6)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              boxSizing: "border-box",
            }}
          >
            {/* 1. OrgKit Logo (92px wide) */}
            <Image
              src="/orgkit-logo.png"
              alt="OrgKit"
              width={92}
              height={58}
              priority
              className="object-contain"
              style={{
                width: "clamp(64px, 5.5vw, 92px)",
                height: "auto",
                display: "block",
              }}
            />

            {/* 2. H2 "Create Your Account" (22px below logo) */}
            <h2
              style={{
                marginTop: "clamp(12px, 2.34vh, 22px)",
                fontSize: "clamp(26px, 2.39vw, 40px)",
                fontWeight: 700,
                color: "#18181B",
                lineHeight: 1.15,
                letterSpacing: "-0.015em",
                marginBottom: 0,
                whiteSpace: "nowrap",
              }}
            >
              Create Your Account
            </h2>

            {/* 3. Subtitle (16px below H2, max-width 440px) */}
            <p
              style={{
                marginTop: "clamp(10px, 1.7vh, 16px)",
                fontSize: "clamp(14px, 1.26vw, 21px)",
                lineHeight: 1.38,
                color: "#71717A",
                maxWidth: 440,
                marginBottom: 0,
                fontWeight: 400,
              }}
            >
              <span style={{ whiteSpace: "nowrap" }}>
                Join OrgKit and be part of a more connected
              </span>
              <br />
              <span>student community.</span>
            </p>

            {/* 4. Google Sign-up Button (40px below subtitle, height 72px) */}
            <div
              style={{
                width: "100%",
                marginTop: "clamp(20px, 4.25vh, 40px)",
              }}
            >
              <button
                type="button"
                disabled={loading}
                onClick={handleGoogleSignUp}
                className="orgkit-google-btn"
                style={{
                  height: "clamp(52px, 7.65vh, 72px)",
                  gap: "clamp(10px, 0.84vw, 14px)",
                }}
              >
                {!loading && <GoogleLogo size={36} />}
                <span
                  style={{
                    fontSize: "clamp(17px, 1.44vw, 24px)",
                    fontWeight: 500,
                    color: "#18181B",
                  }}
                >
                  {loading ? "Signing up..." : "Sign up with Google"}
                </span>
              </button>
            </div>

            {/* 5. Divider Row (44px below button) */}
            <div
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                marginTop: "clamp(20px, 4.68vh, 44px)",
              }}
            >
              <div
                style={{
                  flex: 1,
                  height: 1,
                  backgroundColor: "#E4E4E7",
                }}
              />
              <span
                style={{
                  paddingLeft: "clamp(14px, 1.44vw, 24px)",
                  paddingRight: "clamp(14px, 1.44vw, 24px)",
                  fontSize: "clamp(15px, 1.2vw, 20px)",
                  color: "#71717A",
                  fontWeight: 400,
                }}
              >
                or
              </span>
              <div
                style={{
                  flex: 1,
                  height: 1,
                  backgroundColor: "#E4E4E7",
                }}
              />
            </div>

            {/* 6. Legal Text (38px below divider) */}
            <p
              style={{
                marginTop: "clamp(18px, 4.04vh, 38px)",
                fontSize: "clamp(12px, 1.02vw, 17px)",
                lineHeight: 1.65,
                color: "#71717A",
                marginBottom: 0,
                fontWeight: 400,
              }}
            >
              <span style={{ whiteSpace: "nowrap" }}>
                By continuing, you agree to our
              </span>
              <br />
              <Link href="/terms" className="orgkit-terms-link">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="orgkit-terms-link">
                Privacy Policy
              </Link>
              .
            </p>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          MOBILE VIEW: Clean Single-Column Card (Portrait Viewports)
          ═══════════════════════════════════════════════════════════════ */}
      <div className="orgkit-mobile-wrapper">
        <header
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: 24,
          }}
        >
          <Image
            src="/orgkit-logo.png"
            alt="OrgKit"
            width={60}
            height={38}
            priority
            className="object-contain"
            style={{ width: 60, height: "auto" }}
          />
          <div
            style={{
              width: 1.5,
              height: 36,
              backgroundColor: "#E4E4E7",
              marginLeft: 16,
              marginRight: 16,
            }}
          />
          <span
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: "#18181B",
              letterSpacing: "-0.015em",
            }}
          >
            OrgKit
          </span>
        </header>

        <div
          style={{
            width: "100%",
            maxWidth: 400,
            backgroundColor: "#FFFFFF",
            borderRadius: 24,
            padding: "32px 16px",
            boxShadow: "0 20px 50px rgba(24, 24, 27, 0.08)",
            border: "1px solid rgba(228, 228, 231, 0.6)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            boxSizing: "border-box",
          }}
        >
          <Image
            src="/orgkit-logo.png"
            alt="OrgKit"
            width={68}
            height={44}
            className="object-contain"
            style={{ width: 68, height: "auto" }}
          />

          <h2
            style={{
              marginTop: 18,
              fontSize: "clamp(20px, 6vw, 26px)",
              fontWeight: 700,
              color: "#18181B",
              lineHeight: 1.2,
              letterSpacing: "-0.015em",
              marginBottom: 0,
            }}
          >
            Create Your Account
          </h2>

          <p
            style={{
              marginTop: 12,
              fontSize: "clamp(13px, 3.6vw, 15px)",
              lineHeight: "22px",
              color: "#71717A",
              maxWidth: 290,
              marginBottom: 0,
            }}
          >
            Join OrgKit and be part of a more connected student community.
          </p>

          <div style={{ width: "100%", marginTop: 24 }}>
            <button
              type="button"
              disabled={loading}
              onClick={handleGoogleSignUp}
              className="orgkit-google-btn"
              style={{
                height: 54,
                paddingLeft: 12,
                paddingRight: 12,
                gap: 10,
              }}
            >
              {!loading && (
                <svg
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                  style={{ width: 24, height: 24, flexShrink: 0 }}
                >
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
              )}
              <span
                style={{
                  fontSize: "clamp(14px, 4vw, 17px)",
                  fontWeight: 500,
                  color: "#18181B",
                }}
              >
                {loading ? "Signing up..." : "Sign up with Google"}
              </span>
            </button>
          </div>

          <div
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              marginTop: 28,
            }}
          >
            <div style={{ flex: 1, height: 1, backgroundColor: "#E4E4E7" }} />
            <span
              style={{
                paddingLeft: 16,
                paddingRight: 16,
                fontSize: 16,
                color: "#71717A",
              }}
            >
              or
            </span>
            <div style={{ flex: 1, height: 1, backgroundColor: "#E4E4E7" }} />
          </div>

          <p
            style={{
              marginTop: 24,
              fontSize: "clamp(12.5px, 3.5vw, 14px)",
              lineHeight: "22px",
              color: "#71717A",
              marginBottom: 0,
            }}
          >
            By continuing, you agree to our{" "}
            <Link href="/terms" className="orgkit-terms-link">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="orgkit-terms-link">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>
    </main>
  );
}
