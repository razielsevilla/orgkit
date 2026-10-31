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
function GoogleLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
      style={{
        width: "2.39cqw",
        height: "2.39cqw",
        minWidth: 24,
        minHeight: 24,
        flexShrink: 0,
      }}
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

  // Enforce zero-scrollbar policy on desktop viewport
  useEffect(() => {
    function enforceDesktopLock() {
      if (window.innerWidth >= 1024 || (window.innerWidth >= 900 && window.innerWidth > window.innerHeight)) {
        document.documentElement.style.overflow = "hidden";
        document.documentElement.style.height = "100%";
        document.body.style.overflow = "hidden";
        document.body.style.height = "100%";
      } else {
        document.documentElement.style.overflow = "";
        document.documentElement.style.height = "";
        document.body.style.overflow = "";
        document.body.style.height = "";
      }
    }

    enforceDesktopLock();
    window.addEventListener("resize", enforceDesktopLock);
    return () => {
      window.removeEventListener("resize", enforceDesktopLock);
      document.documentElement.style.overflow = "";
      document.documentElement.style.height = "";
      document.body.style.overflow = "";
      document.body.style.height = "";
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
        height: "100vh",
        maxHeight: "100vh",
        overflow: "hidden",
        boxSizing: "border-box",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <style>{`
        /* ── Desktop View (>= 1024px): Zero Scroll, Perfect Fit ── */
        @media (min-width: 1024px) {
          html, body {
            overflow: hidden !important;
            height: 100vh !important;
            max-height: 100vh !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          .orgkit-page-root {
            width: 100vw !important;
            height: 100vh !important;
            max-height: 100vh !important;
            overflow: hidden !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
          }

          .orgkit-mobile-wrapper {
            display: none !important;
          }
        }

        /* ── Adaptive Desktop Stage Container ── */
        .orgkit-stage {
          aspect-ratio: 1672 / 941;
          width: min(100vw, calc(100vh * (1672 / 941)));
          height: min(100vh, calc(100vw * (941 / 1672)));
          max-width: 1672px;
          max-height: 941px;
          container-type: size;
          position: relative;
          overflow: hidden;
          box-sizing: border-box;
          flex-shrink: 0;
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

          .orgkit-mobile-wrapper {
            display: flex !important;
            flex-direction: column;
            align-items: center;
            width: 100%;
            max-width: 440px;
            box-sizing: border-box;
          }

          .orgkit-stage {
            display: none !important;
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
          DESKTOP VIEW: Adaptive 1672×941 Container Stage (Zero Scroll)
          ═══════════════════════════════════════════════════════════════ */}
      <div className="orgkit-stage">
        {/* ── Background SVG Vector Art (1672×941 Reference Geometry) ── */}
        <svg
          viewBox="0 0 1672 941"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
            zIndex: 0,
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
            width: "53.23cqw",
            height: "30.82cqh",
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

        {/* ── Top-Left Header: Logo + Divider + Wordmark (x: 10.47cqw, y: 11.48cqh) ── */}
        <header
          style={{
            position: "absolute",
            left: "10.47cqw",
            top: "11.48cqh",
            display: "flex",
            alignItems: "center",
            zIndex: 10,
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
              width: "4.90cqw",
              height: "auto",
              display: "block",
            }}
          />
          <div
            style={{
              width: "max(1.5px, 0.09cqw)",
              height: "5.31cqh",
              backgroundColor: "#E4E4E7",
              marginLeft: "1.44cqw",
              marginRight: "1.44cqw",
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontSize: "2.27cqw",
              fontWeight: 700,
              color: "#18181B",
              letterSpacing: "-0.015em",
              lineHeight: 1,
            }}
          >
            OrgKit
          </span>
        </header>

        {/* ── Left Column: Marketing Stack (x: 10.47cqw, y: 24.23cqh) ── */}
        <div
          style={{
            position: "absolute",
            left: "10.47cqw",
            top: "24.23cqh",
            width: "45.45cqw",
            zIndex: 10,
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
          }}
        >
          {/* 1. Pill Badge */}
          <div
            style={{
              height: "4.04cqh",
              paddingLeft: "1.20cqw",
              paddingRight: "1.20cqw",
              borderRadius: 9999,
              backgroundColor: "rgba(5, 150, 105, 0.08)",
              border: "1.5px solid rgba(5, 150, 105, 0.25)",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.72cqw",
              boxSizing: "border-box",
            }}
          >
            <span
              style={{
                width: "0.72cqw",
                height: "0.72cqw",
                borderRadius: "50%",
                backgroundColor: "#059669",
                flexShrink: 0,
                display: "inline-block",
              }}
            />
            <span
              style={{
                fontSize: "0.93cqw",
                fontWeight: 500,
                color: "#3F3F46",
                whiteSpace: "nowrap",
              }}
            >
              Student Organization Management System
            </span>
          </div>

          {/* 2. H1 Headline (3.40cqh below badge) */}
          <h1
            style={{
              marginTop: "3.40cqh",
              fontSize: "3.83cqw",
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

          {/* 3. Subtitle Paragraph (2.98cqh below H1) */}
          <p
            style={{
              marginTop: "2.98cqh",
              fontSize: "1.44cqw",
              lineHeight: "3.19cqh",
              color: "#71717A",
              fontWeight: 400,
              marginBottom: 0,
            }}
          >
            A modern platform for student organizations
            <br />
            to connect, manage, and grow together.
          </p>

          {/* 4. Feature Row (6.80cqh below paragraph) */}
          <div
            style={{
              marginTop: "6.80cqh",
              display: "flex",
              alignItems: "center",
            }}
          >
            {/* Feature 1: Manage Members */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.84cqw",
              }}
            >
              <Users
                style={{ width: "1.79cqw", height: "1.79cqw" }}
                strokeWidth={1.5}
                color="#18181B"
                aria-hidden="true"
              />
              <span
                style={{
                  fontSize: "0.93cqw",
                  fontWeight: 500,
                  color: "#3F3F46",
                  whiteSpace: "nowrap",
                }}
              >
                Manage Members
              </span>
            </div>

            {/* 1.5px vertical divider (1.79cqw margin each side) */}
            <div
              style={{
                width: "max(1.5px, 0.09cqw)",
                height: "3.19cqh",
                backgroundColor: "rgba(161, 161, 170, 0.6)",
                marginLeft: "1.79cqw",
                marginRight: "1.79cqw",
                flexShrink: 0,
              }}
            />

            {/* Feature 2: Organize Events */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.84cqw",
              }}
            >
              <CalendarDays
                style={{ width: "1.79cqw", height: "1.79cqw" }}
                strokeWidth={1.5}
                color="#18181B"
                aria-hidden="true"
              />
              <span
                style={{
                  fontSize: "0.93cqw",
                  fontWeight: 500,
                  color: "#3F3F46",
                  whiteSpace: "nowrap",
                }}
              >
                Organize Events
              </span>
            </div>

            {/* 1.5px vertical divider (1.79cqw margin each side) */}
            <div
              style={{
                width: "max(1.5px, 0.09cqw)",
                height: "3.19cqh",
                backgroundColor: "rgba(161, 161, 170, 0.6)",
                marginLeft: "1.79cqw",
                marginRight: "1.79cqw",
                flexShrink: 0,
              }}
            />

            {/* Feature 3: Track Activities */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.84cqw",
              }}
            >
              <ChartNoAxesCombined
                style={{ width: "1.79cqw", height: "1.79cqw" }}
                strokeWidth={1.5}
                color="#18181B"
                aria-hidden="true"
              />
              <span
                style={{
                  fontSize: "0.93cqw",
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

        {/* ── Right Card: Registration Card (Vertically Centered, Centered at ~73% Width) ── */}
        <div
          style={{
            position: "absolute",
            right: "10.17cqw",
            top: "50%",
            transform: "translateY(-50%)",
            width: "33.85cqw",
            backgroundColor: "#FFFFFF",
            borderRadius: "1.67cqw",
            padding: "4.25cqh 2.69cqw",
            boxShadow: "0 20px 50px rgba(24, 24, 27, 0.08)",
            border: "1px solid rgba(228, 228, 231, 0.6)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            boxSizing: "border-box",
            zIndex: 10,
          }}
        >
          {/* 1. OrgKit Logo (5.50cqw wide) */}
          <Image
            src="/orgkit-logo.png"
            alt="OrgKit"
            width={92}
            height={58}
            priority
            className="object-contain"
            style={{
              width: "5.50cqw",
              height: "auto",
              display: "block",
            }}
          />

          {/* 2. H2 "Create Your Account" (2.34cqh below logo) */}
          <h2
            style={{
              marginTop: "2.34cqh",
              fontSize: "2.39cqw",
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

          {/* 3. Subtitle (1.70cqh below H2, max-width 26.3cqw) */}
          <p
            style={{
              marginTop: "1.70cqh",
              fontSize: "1.26cqw",
              lineHeight: "3.08cqh",
              color: "#71717A",
              maxWidth: "26.3cqw",
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

          {/* 4. Google Sign-up Button (4.25cqh below subtitle, height 7.65cqh) */}
          <div style={{ width: "100%", marginTop: "4.25cqh" }}>
            <button
              type="button"
              disabled={loading}
              onClick={handleGoogleSignUp}
              className="orgkit-google-btn"
              style={{
                height: "7.65cqh",
                gap: "0.84cqw",
              }}
            >
              {!loading && <GoogleLogo />}
              <span
                style={{
                  fontSize: "1.44cqw",
                  fontWeight: 500,
                  color: "#18181B",
                }}
              >
                {loading ? "Signing up..." : "Sign up with Google"}
              </span>
            </button>
          </div>

          {/* 5. Divider Row (4.68cqh below button) */}
          <div
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              marginTop: "4.68cqh",
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
                paddingLeft: "1.44cqw",
                paddingRight: "1.44cqw",
                fontSize: "1.20cqw",
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

          {/* 6. Legal Text (4.04cqh below divider) */}
          <p
            style={{
              marginTop: "4.04cqh",
              fontSize: "1.02cqw",
              lineHeight: "2.98cqh",
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
            backgroundColor: "#FFFFFF",
            borderRadius: 24,
            padding: "32px 20px",
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
            width={72}
            height={46}
            className="object-contain"
            style={{ width: 72, height: "auto" }}
          />

          <h2
            style={{
              marginTop: 18,
              fontSize: "clamp(22px, 6.5vw, 28px)",
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
              fontSize: "clamp(13.5px, 3.8vw, 15px)",
              lineHeight: "22px",
              color: "#71717A",
              maxWidth: 340,
              marginBottom: 0,
            }}
          >
            Join OrgKit and be part of a more connected student community.
          </p>

          <div style={{ width: "100%", marginTop: 28 }}>
            <button
              type="button"
              disabled={loading}
              onClick={handleGoogleSignUp}
              className="orgkit-google-btn"
              style={{
                height: 56,
                paddingLeft: 16,
                paddingRight: 16,
                gap: 12,
              }}
            >
              {!loading && (
                <svg
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                  style={{ width: 26, height: 26, flexShrink: 0 }}
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
                  fontSize: "clamp(15px, 4.2vw, 18px)",
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
