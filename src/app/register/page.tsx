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
      className={`${plusJakarta.className} orgkit-root relative w-full overflow-hidden bg-base text-ink`}
      style={{
        backgroundColor: "#F4F4F5",
        color: "#18181B",
      }}
    >
      {/* ── Scoped CSS matching the 1672x941 reference specifications ── */}
      <style>{`
        /* Base full-viewport setup */
        .orgkit-root {
          min-height: 100vh;
          height: 100vh;
          max-height: 100vh;
          position: relative;
          overflow: hidden;
          width: 100%;
        }

        /* Desktop layout (>= 1024px) */
        @media (min-width: 1024px) {
          .orgkit-desktop-header {
            position: absolute;
            top: clamp(48px, 11.48vh, 108px);
            left: 10.5%;
            display: flex;
            align-items: center;
            z-index: 10;
          }
          .orgkit-desktop-left {
            position: absolute;
            top: clamp(160px, 27vh, 254px);
            left: 10.5%;
            width: clamp(540px, 48vw, 780px);
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            z-index: 10;
          }
          .orgkit-desktop-card-wrap {
            position: absolute;
            top: calc(50% - 10px);
            left: 73%;
            transform: translate(-50%, -50%);
            width: clamp(460px, 33.8vw, 566px);
            max-width: 566px;
            z-index: 10;
          }
          .orgkit-mobile-container {
            display: none !important;
          }
        }

        /* Card styles */
        .orgkit-card {
          width: 100%;
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

        /* Google button */
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

        /* Links */
        .orgkit-terms-link {
          color: #059669;
          text-decoration: none;
          font-weight: 500;
        }
        .orgkit-terms-link:hover, .orgkit-terms-link:focus-visible {
          text-decoration: underline;
        }

        /* Responsive Mobile (< 1024px) */
        @media (max-width: 1023px) {
          .orgkit-root {
            height: auto !important;
            max-height: none !important;
            min-height: 100vh !important;
            overflow-y: auto !important;
          }
          .orgkit-desktop-header,
          .orgkit-desktop-left,
          .orgkit-desktop-card-wrap {
            display: none !important;
          }
          .orgkit-mobile-container {
            display: flex !important;
            flex-direction: column;
            min-height: 100vh;
            width: 100%;
            position: relative;
            z-index: 10;
            padding-bottom: 40px;
            box-sizing: border-box;
          }
          .orgkit-mobile-header {
            display: flex;
            align-items: center;
            padding: 28px 24px;
          }
          .orgkit-mobile-card-section {
            display: flex;
            justify-content: center;
            padding: 16px 20px;
            width: 100%;
            box-sizing: border-box;
          }
          .orgkit-mobile-card {
            width: 100%;
            max-width: 460px;
            padding: 32px 24px;
          }
          .orgkit-building-layer {
            display: none !important;
          }
        }

        @media (max-width: 480px) {
          .orgkit-mobile-header {
            padding: 20px 16px;
          }
          .orgkit-mobile-card-section {
            padding: 10px 12px;
          }
          .orgkit-mobile-card {
            padding: 24px 14px !important;
            border-radius: 18px !important;
          }
          .orgkit-mobile-card h2 {
            font-size: 24px !important;
          }
          .orgkit-mobile-card p {
            font-size: 13.5px !important;
            line-height: 20px !important;
          }
          .orgkit-google-btn {
            height: 52px !important;
            margin-top: 24px !important;
            gap: 10px !important;
          }
          .orgkit-google-btn span {
            font-size: 15px !important;
          }
        }
      `}</style>

      {/* ═══════════════════════════════════════════════════════════════
          BACKGROUND DECORATION (SVG layer + Building Image)
          Vector-identical to the 1672x941 design reference
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
            d="M 1340 941 C 1440 840, 1545 795, 1672 785"
            fill="none"
            stroke="#059669"
            strokeWidth="1.5"
            strokeOpacity="0.4"
          />

          {/* ── Bottom-Right: Solid emerald circle segment visible from (1440, 941) to (1672, 848) ── */}
          <path
            d="M 1440 941 C 1515 880, 1595 855, 1672 848 L 1672 941 Z"
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
          className="orgkit-building-layer pointer-events-none absolute bottom-0 left-0"
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            width: "clamp(550px, 53.2vw, 890px)",
            height: "clamp(200px, 17.3vw, 290px)",
            overflow: "hidden",
            maskImage:
              "linear-gradient(to right, rgba(0,0,0,1) 50%, transparent 100%), linear-gradient(to top, rgba(0,0,0,1) 40%, transparent 100%)",
            maskComposite: "intersect",
            WebkitMaskImage:
              "linear-gradient(to right, rgba(0,0,0,1) 50%, transparent 100%), linear-gradient(to top, rgba(0,0,0,1) 40%, transparent 100%)",
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
              objectPosition: "0 100%", // Anchors to bottom to crop out top text residue
              filter: "grayscale(100%)",
            }}
          />
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          DESKTOP CONTENT (>= 1024px)
          Exact measurements matching the 1672x941 reference
          ═══════════════════════════════════════════════════════════════ */}

      {/* ── Desktop Header (top-left, y about 108px, x about 10.5%) ── */}
      <header className="orgkit-desktop-header">
        <Image
          src="/orgkit-logo.png"
          alt="OrgKit"
          width={82}
          height={52}
          preload
          className="object-contain"
          style={{
            width: "82px",
            height: "auto",
            display: "block",
          }}
        />
        <div
          style={{
            width: "1.5px",
            height: "50px",
            backgroundColor: "#E4E4E7",
            marginLeft: "20px",
            marginRight: "20px",
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontSize: "38px",
            fontWeight: 700,
            color: "#18181B",
            letterSpacing: "-0.015em",
            lineHeight: 1,
          }}
        >
          OrgKit
        </span>
      </header>

      {/* ── Desktop Left Marketing Column (starting 10.5% from left, top-aligned to header) ── */}
      <div className="orgkit-desktop-left">
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

        {/* 2. H1 (32px below badge, 64px / line-height 1.05, weight 800, tight tracking) */}
        <h1
          style={{
            marginTop: "32px",
            fontSize: "64px",
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

        {/* 3. Paragraph (28px below, 24px / 30px, #71717A, weight 400) */}
        <p
          style={{
            marginTop: "28px",
            fontSize: "24px",
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

        {/* 4. Feature Row (about 64px below) */}
        <div
          style={{
            marginTop: "64px",
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

          {/* 1.5px x 30px vertical divider (zinc-400 at ~60%), 30px space each side */}
          <div
            style={{
              width: "1.5px",
              height: "30px",
              backgroundColor: "rgba(161, 161, 170, 0.6)",
              marginLeft: "30px",
              marginRight: "30px",
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

          {/* 1.5px x 30px vertical divider */}
          <div
            style={{
              width: "1.5px",
              height: "30px",
              backgroundColor: "rgba(161, 161, 170, 0.6)",
              marginLeft: "30px",
              marginRight: "30px",
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

      {/* ── Desktop Right Card (vertically centered, centered at 73% width, max 566px) ── */}
      <div className="orgkit-desktop-card-wrap">
        <div className="orgkit-card">
          {/* 1. Logo icon, about 92px wide */}
          <Image
            src="/orgkit-logo.png"
            alt="OrgKit"
            width={92}
            height={58}
            className="object-contain"
            style={{
              width: "92px",
              height: "auto",
              display: "block",
            }}
          />

          {/* 2. H2 "Create Your Account", 40px, weight 700, #18181B (22px below logo) */}
          <h2
            style={{
              marginTop: "22px",
              fontSize: "40px",
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

          {/* 3. Subtitle (16px below heading, 21px / 29px, #71717A, max-width ~440px) */}
          <p
            style={{
              marginTop: "16px",
              fontSize: "21px",
              lineHeight: "29px",
              color: "#71717A",
              maxWidth: "440px",
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
                fontSize: "24px",
                fontWeight: 500,
                color: "#18181B",
              }}
            >
              {loading ? "Signing up..." : "Sign up with Google"}
            </span>
          </button>

          {/* 5. Divider Row (44px below, two 1px #E4E4E7 lines with "or" between them) */}
          <div
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              marginTop: "44px",
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
                fontSize: "20px",
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
              marginTop: "38px",
              fontSize: "17px",
              lineHeight: "28px",
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
          MOBILE CONTENT (< 1024px)
          ═══════════════════════════════════════════════════════════════ */}
      <div className="orgkit-mobile-container">
        {/* Mobile Header */}
        <header className="orgkit-mobile-header">
          <Image
            src="/orgkit-logo.png"
            alt="OrgKit"
            width={64}
            height={40}
            preload
            className="object-contain"
            style={{
              width: "60px",
              height: "auto",
              display: "block",
            }}
          />
          <div
            style={{
              width: "1.5px",
              height: "36px",
              backgroundColor: "#E4E4E7",
              marginLeft: "16px",
              marginRight: "16px",
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontSize: "26px",
              fontWeight: 700,
              color: "#18181B",
              letterSpacing: "-0.015em",
              lineHeight: 1,
            }}
          >
            OrgKit
          </span>
        </header>

        {/* Mobile Centered Card */}
        <div className="orgkit-mobile-card-section">
          <div className="orgkit-card orgkit-mobile-card">
            {/* Logo */}
            <Image
              src="/orgkit-logo.png"
              alt="OrgKit"
              width={76}
              height={48}
              className="object-contain"
              style={{
                width: "72px",
                height: "auto",
                display: "block",
              }}
            />

            {/* H2 */}
            <h2
              style={{
                marginTop: "16px",
                fontSize: "26px",
                fontWeight: 700,
                color: "#18181B",
                lineHeight: 1.15,
                letterSpacing: "-0.015em",
                marginBottom: 0,
              }}
            >
              Create Your Account
            </h2>

            {/* Subtitle */}
            <p
              style={{
                marginTop: "12px",
                fontSize: "14.5px",
                lineHeight: "22px",
                color: "#71717A",
                maxWidth: "380px",
                marginBottom: 0,
                fontWeight: 400,
              }}
            >
              Join OrgKit and be part of a more connected student community.
            </p>

            {/* Google Button */}
            <button
              type="button"
              disabled={loading}
              onClick={handleGoogleSignUp}
              className="orgkit-google-btn"
            >
              {!loading && <GoogleLogo size={32} />}
              <span
                style={{
                  fontSize: "18px",
                  fontWeight: 500,
                  color: "#18181B",
                }}
              >
                {loading ? "Signing up..." : "Sign up with Google"}
              </span>
            </button>

            {/* Divider */}
            <div
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                marginTop: "24px",
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
                  paddingLeft: "16px",
                  paddingRight: "16px",
                  fontSize: "15px",
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

            {/* Legal */}
            <p
              style={{
                marginTop: "24px",
                fontSize: "13px",
                lineHeight: "22px",
                color: "#71717A",
                marginBottom: 0,
                fontWeight: 400,
              }}
            >
              By continuing, you agree to our
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
    </main>
  );
}
