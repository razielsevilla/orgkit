"use client";

import Image from "next/image";
import Link from "next/link";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Users, CalendarDays, ChartNoAxesCombined } from "lucide-react";
import { useState } from "react";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

/* ── Google "G" multicolor official logo (inline SVG, 24×24 viewBox) ── */
function GoogleLogo({ size = 40 }: { size?: number }) {
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

  // TODO: Replace with the real Google sign-in handler from the auth system (A1 ticket)
  function handleGoogleSignUp() {
    setLoading(true);
    // TODO: Implement Google OAuth sign-up flow
    setTimeout(() => setLoading(false), 2000);
  }

  return (
    <main
      className={`${plusJakarta.className} relative min-h-screen w-full overflow-hidden bg-base text-ink`}
      style={{
        backgroundColor: "#F4F4F5",
        color: "#18181B",
        minHeight: "100vh",
        height: "100vh",
        maxHeight: "100vh",
        width: "100%",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* ── Scoped CSS styles matching the reference design ── */}
      <style>{`
        .orgkit-main-container {
          position: relative;
          z-index: 10;
          display: flex;
          flex-direction: column;
          height: 100vh;
          max-height: 100vh;
          width: 100%;
          overflow: hidden;
          box-sizing: border-box;
        }
        .orgkit-header {
          display: flex;
          align-items: center;
          padding-top: clamp(28px, 6.46vw, 108px);
          padding-left: clamp(24px, 10.5vw, 176px);
          flex-shrink: 0;
        }
        .orgkit-body {
          display: flex;
          flex: 1;
          align-items: center;
          position: relative;
          min-height: 0;
        }
        .orgkit-left-col {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          padding-left: clamp(24px, 10.5vw, 176px);
          width: 53%;
          z-index: 2;
        }
        .orgkit-right-col {
          display: flex;
          flex: 1;
          justify-content: center;
          align-items: center;
          padding-right: clamp(20px, 6vw, 100px);
          padding-left: 20px;
          z-index: 2;
        }
        .orgkit-card {
          width: 100%;
          max-width: 566px;
          background-color: #FFFFFF;
          border-radius: 28px;
          padding: 40px 45px;
          box-shadow: 0 20px 50px rgba(24, 24, 27, 0.08);
          border: 1px solid rgba(228, 228, 231, 0.6);
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          box-sizing: border-box;
        }
        .orgkit-google-btn {
          width: 100%;
          height: 72px;
          border-radius: 9999px;
          background-color: #FFFFFF;
          border: 2px solid #E4E4E7;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 14px;
          cursor: pointer;
          transition: background-color 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
          outline: none;
          margin-top: 40px;
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
        @media (min-width: 640px) {
          .orgkit-card-title {
            white-space: nowrap;
          }
          .orgkit-subtitle-line1 {
            white-space: nowrap;
          }
          .orgkit-legal-line1 {
            white-space: nowrap;
          }
        }
        @media (max-width: 1023px) {
          main, .orgkit-main-container {
            height: auto !important;
            max-height: none !important;
            overflow-y: auto !important;
          }
          .orgkit-body {
            flex-direction: column !important;
            width: 100% !important;
          }
          .orgkit-left-col {
            display: none !important;
          }
          .orgkit-right-col {
            width: 100% !important;
            box-sizing: border-box !important;
            padding-right: 20px !important;
            padding-left: 20px !important;
            padding-top: 24px !important;
            padding-bottom: 40px !important;
          }
          .orgkit-card {
            max-width: 460px;
            padding: 32px 24px;
          }
          .orgkit-google-btn {
            height: 60px;
            margin-top: 28px;
          }
          .orgkit-building {
            display: none !important;
          }
        }
        @media (max-width: 480px) {
          .orgkit-header {
            padding-left: 16px !important;
            padding-top: 20px !important;
          }
          .orgkit-body {
            flex-direction: column !important;
            width: 100% !important;
          }
          .orgkit-right-col {
            width: 100% !important;
            box-sizing: border-box !important;
            padding-left: 14px !important;
            padding-right: 14px !important;
            padding-top: 12px !important;
            padding-bottom: 32px !important;
          }
          .orgkit-card {
            padding: 24px 14px !important;
            border-radius: 18px !important;
            width: 100% !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
          }
          .orgkit-card-title {
            font-size: 22px !important;
            white-space: normal !important;
          }
          .orgkit-card p {
            font-size: 13.5px !important;
            line-height: 20px !important;
          }
          .orgkit-google-btn {
            height: 50px !important;
            margin-top: 20px !important;
            gap: 10px !important;
          }
          .orgkit-google-btn span {
            font-size: 15px !important;
          }
        }
      `}</style>

      {/* ═══════════════════════════════════════════════════════════════
          BACKGROUND DECORATION (SVG + Building Image)
          ═══════════════════════════════════════════════════════════════ */}
      <div
        className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
          overflow: "hidden",
        }}
      >
        <svg
          viewBox="0 0 1672 941"
          preserveAspectRatio="none"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
          }}
          aria-hidden="true"
        >
          <defs>
            {/* Top-right subtle emerald gradient */}
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

            {/* Bottom-right subtle emerald gradient */}
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

          {/* ── Top-Left: Large pale-green circle (accent/6%, r=290, center (-70, -120)) ── */}
          <circle
            cx="-70"
            cy="-120"
            r="290"
            fill="#059669"
            fillOpacity="0.06"
          />

          {/* ── Top-Left: Concentric 1.5px outline circle (r=250, center (-70, -120)) ── */}
          <circle
            cx="-70"
            cy="-120"
            r="250"
            fill="none"
            stroke="#059669"
            strokeWidth="1.5"
            strokeOpacity="0.35"
          />

          {/* ── Top-Left: Tiny emerald triangular tick on the pale edge near (222, 50) ── */}
          <polygon
            points="224,44 228,54 219,52"
            fill="#059669"
          />

          {/* ── Top-Right: Concentric pale-green ring (r=320, center (1700, -120), accent/10%) ── */}
          <circle
            cx="1700"
            cy="-120"
            r="320"
            fill="#059669"
            fillOpacity="0.10"
          />

          {/* ── Top-Right: Large solid emerald circle (r=285, center (1700, -120)) with gradient ── */}
          <circle
            cx="1700"
            cy="-120"
            r="285"
            fill="url(#topRightEmeraldGrad)"
          />

          {/* ── Bottom-Right: Thin 1.5px emerald outline arc from ~ (1340, 941) to (1672, 785) ── */}
          <path
            d="M 1340 941 C 1450 850, 1550 800, 1672 785"
            fill="none"
            stroke="#059669"
            strokeWidth="1.5"
            strokeOpacity="0.4"
          />

          {/* ── Bottom-Right: Solid emerald circle segment visible from (1440, 941) to (1672, 848) ── */}
          <path
            d="M 1440 941 C 1520 880, 1600 855, 1672 848 L 1672 941 Z"
            fill="url(#bottomRightEmeraldGrad)"
          />

          {/* ── Bottom-Left: Large pale mint circle cut off at left edge (top of arc at y≈545, r≈395) ── */}
          <circle
            cx="-50"
            cy="940"
            r="395"
            fill="#059669"
            fillOpacity="0.08"
          />

          {/* ── Bottom-Left: Second pale mint circle behind building centered at (560, 900), r=250 ── */}
          <circle
            cx="560"
            cy="900"
            r="250"
            fill="#059669"
            fillOpacity="0.08"
          />
        </svg>

        {/* ── Bottom-Left: Grayscale Building Photo with linear mask fade ── */}
        <div
          className="orgkit-building pointer-events-none absolute bottom-0 left-0"
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            width: "clamp(550px, 53.2vw, 890px)",
            height: "clamp(180px, 17.3vw, 290px)",
            overflow: "hidden",
            maskImage:
              "linear-gradient(to right, rgba(0,0,0,1) 45%, transparent 100%), linear-gradient(to top, rgba(0,0,0,1) 35%, transparent 100%)",
            maskComposite: "intersect",
            WebkitMaskImage:
              "linear-gradient(to right, rgba(0,0,0,1) 45%, transparent 100%), linear-gradient(to top, rgba(0,0,0,1) 35%, transparent 100%)",
            WebkitMaskComposite:
              "source-in" as React.CSSProperties["WebkitMaskComposite"],
          }}
        >
          <Image
            src="/campus-building.png"
            alt=""
            fill
            className="object-cover"
            style={{
              objectFit: "cover",
              objectPosition: "0 100%", // Crop out the top 30% that has the duplicate text
              filter: "grayscale(100%)",
            }}
          />
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          CONTENT LAYER
          ═══════════════════════════════════════════════════════════════ */}
      <div className="orgkit-main-container">
        {/* ── Header (top-left, y about 108px) ── */}
        <header className="orgkit-header">
          {/* Logo icon (about 82x52px) */}
          <Image
            src="/orgkit-logo.png"
            alt="OrgKit"
            width={82}
            height={52}
            preload
            className="object-contain"
            style={{
              width: "clamp(54px, 4.9vw, 82px)",
              height: "auto",
              display: "block",
            }}
          />

          {/* 1.5px vertical divider (50px tall, zinc-300) with 24px space each side */}
          <div
            style={{
              width: "1.5px",
              height: "clamp(34px, 3vw, 50px)",
              backgroundColor: "#E4E4E7",
              marginLeft: "clamp(14px, 1.44vw, 24px)",
              marginRight: "clamp(14px, 1.44vw, 24px)",
              flexShrink: 0,
            }}
          />

          {/* Wordmark "OrgKit" (38px, weight 700, #18181B) */}
          <span
            style={{
              fontSize: "clamp(24px, 2.27vw, 38px)",
              fontWeight: 700,
              color: "#18181B",
              letterSpacing: "-0.015em",
              lineHeight: 1,
            }}
          >
            OrgKit
          </span>
        </header>

        {/* ── Body: Two columns ── */}
        <div className="orgkit-body">
          {/* ─── Left Marketing Column ─── */}
          <div className="orgkit-left-col">
            {/* 1. Pill Badge */}
            <div
              style={{
                height: "38px",
                paddingLeft: "20px",
                paddingRight: "20px",
                borderRadius: "9999px",
                backgroundColor: "rgba(5, 150, 105, 0.08)",
                border: "1.5px solid rgba(5, 150, 105, 0.25)",
                display: "inline-flex",
                alignItems: "center",
                gap: "12px",
                boxSizing: "border-box",
              }}
            >
              {/* 12px solid emerald dot */}
              <span
                style={{
                  width: "12px",
                  height: "12px",
                  borderRadius: "50%",
                  backgroundColor: "#059669",
                  flexShrink: 0,
                  display: "inline-block",
                }}
              />
              <span
                style={{
                  fontSize: "15.5px",
                  fontWeight: 500,
                  color: "#3F3F46",
                  whiteSpace: "nowrap",
                }}
              >
                Student Organization Management System
              </span>
            </div>

            {/* 2. H1 (32px below badge, 64px / 1.05, weight 800, tight tracking) */}
            <h1
              style={{
                marginTop: "clamp(20px, 1.9vw, 32px)",
                fontSize: "clamp(36px, 3.83vw, 64px)",
                lineHeight: 1.05,
                fontWeight: 800,
                letterSpacing: "-0.025em",
                color: "#18181B",
                marginRight: 0,
                marginBottom: 0,
              }}
            >
              Organize. Collaborate.
              <br />
              <span style={{ color: "#059669" }}>Lead.</span>
            </h1>

            {/* 3. Paragraph (28px below, 24px / 30px, #71717A, weight 400) */}
            <p
              style={{
                marginTop: "clamp(18px, 1.67vw, 28px)",
                fontSize: "clamp(16px, 1.44vw, 24px)",
                lineHeight: "30px",
                color: "#71717A",
                fontWeight: 400,
                marginBottom: 0,
              }}
            >
              A modern platform for student organizations
              <br />
              to connect, manage, and grow together.
            </p>

            {/* 4. Feature Row (~64px below) */}
            <div
              style={{
                marginTop: "clamp(32px, 3.83vw, 64px)",
                display: "flex",
                alignItems: "center",
              }}
            >
              {/* Feature 1: Manage Members */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                }}
              >
                <Users
                  size={30}
                  strokeWidth={1.5}
                  color="#18181B"
                  aria-hidden="true"
                  style={{ flexShrink: 0 }}
                />
                <span
                  style={{
                    fontSize: "15.5px",
                    fontWeight: 500,
                    color: "#3F3F46",
                    whiteSpace: "nowrap",
                  }}
                >
                  Manage Members
                </span>
              </div>

              {/* 1.5px x 30px divider (zinc-400 at ~60%), 30px space each side */}
              <div
                style={{
                  width: "1.5px",
                  height: "30px",
                  backgroundColor: "rgba(161, 161, 170, 0.6)",
                  marginLeft: "clamp(16px, 1.8vw, 30px)",
                  marginRight: "clamp(16px, 1.8vw, 30px)",
                  flexShrink: 0,
                }}
              />

              {/* Feature 2: Organize Events */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                }}
              >
                <CalendarDays
                  size={30}
                  strokeWidth={1.5}
                  color="#18181B"
                  aria-hidden="true"
                  style={{ flexShrink: 0 }}
                />
                <span
                  style={{
                    fontSize: "15.5px",
                    fontWeight: 500,
                    color: "#3F3F46",
                    whiteSpace: "nowrap",
                  }}
                >
                  Organize Events
                </span>
              </div>

              {/* 1.5px x 30px divider */}
              <div
                style={{
                  width: "1.5px",
                  height: "30px",
                  backgroundColor: "rgba(161, 161, 170, 0.6)",
                  marginLeft: "clamp(16px, 1.8vw, 30px)",
                  marginRight: "clamp(16px, 1.8vw, 30px)",
                  flexShrink: 0,
                }}
              />

              {/* Feature 3: Track Activities */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                }}
              >
                <ChartNoAxesCombined
                  size={30}
                  strokeWidth={1.5}
                  color="#18181B"
                  aria-hidden="true"
                  style={{ flexShrink: 0 }}
                />
                <span
                  style={{
                    fontSize: "15.5px",
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

          {/* ─── Right Column: Registration Card ─── */}
          <div className="orgkit-right-col">
            <div className="orgkit-card">
              {/* 1. Logo icon, about 92px wide */}
              <Image
                src="/orgkit-logo.png"
                alt="OrgKit"
                width={92}
                height={58}
                className="object-contain"
                style={{
                  width: "clamp(68px, 5.5vw, 92px)",
                  height: "auto",
                  display: "block",
                }}
              />

              {/* 2. H2 "Create Your Account", 40px, weight 700, #18181B (22px below logo) */}
              <h2
                className="orgkit-card-title"
                style={{
                  marginTop: "clamp(16px, 1.32vw, 22px)",
                  fontSize: "clamp(24px, 2.4vw, 40px)",
                  fontWeight: 700,
                  color: "#18181B",
                  lineHeight: 1.15,
                  letterSpacing: "-0.015em",
                  marginBottom: 0,
                }}
              >
                Create Your Account
              </h2>

              {/* 3. Subtitle (16px below heading, 21px / 29px, #71717A, max-width ~440px) */}
              <p
                style={{
                  marginTop: "clamp(12px, 0.96vw, 16px)",
                  fontSize: "clamp(15px, 1.26vw, 21px)",
                  lineHeight: "29px",
                  color: "#71717A",
                  maxWidth: "460px",
                  marginBottom: 0,
                  fontWeight: 400,
                }}
              >
                <span className="orgkit-subtitle-line1">
                  Join OrgKit and be part of a more connected
                </span>
                <br />
                <span>student community.</span>
              </p>

              {/* 4. Google Sign-up Button (40px below, 72px tall, fully rounded) */}
              <button
                type="button"
                disabled={loading}
                onClick={handleGoogleSignUp}
                className="orgkit-google-btn"
              >
                {!loading && <GoogleLogo size={40} />}
                <span
                  style={{
                    fontSize: "clamp(18px, 1.44vw, 24px)",
                    fontWeight: 500,
                    color: "#18181B",
                  }}
                >
                  {loading ? "Signing up..." : "Sign up with Google"}
                </span>
              </button>

              {/* 5. Divider Row (44px below, two 1px lines with "or" in between) */}
              <div
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  marginTop: "clamp(28px, 2.63vw, 44px)",
                }}
              >
                <div
                  style={{
                    flex: 1,
                    height: "1px",
                    backgroundColor: "#E4E4E7",
                  }}
                />
                <span
                  style={{
                    paddingLeft: "24px",
                    paddingRight: "24px",
                    fontSize: "clamp(16px, 1.2vw, 20px)",
                    color: "#71717A",
                    fontWeight: 400,
                  }}
                >
                  or
                </span>
                <div
                  style={{
                    flex: 1,
                    height: "1px",
                    backgroundColor: "#E4E4E7",
                  }}
                />
              </div>

              {/* 6. Legal Text (38px below, 17px / 28px, #71717A) */}
              <p
                style={{
                  marginTop: "clamp(24px, 2.27vw, 38px)",
                  fontSize: "clamp(13px, 1.02vw, 17px)",
                  lineHeight: "28px",
                  color: "#71717A",
                  marginBottom: 0,
                  fontWeight: 400,
                }}
              >
                <span className="orgkit-legal-line1">
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
      </div>
    </main>
  );
}
