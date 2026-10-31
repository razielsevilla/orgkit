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

  // Auto-fit 1672x941 design to ANY viewport (including monitor scaling & browser zoom)
  useEffect(() => {
    function updateScale() {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const s = Math.min(w / 1672, h / 941);
      document.documentElement.style.setProperty("--scale", String(s));
    }

    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, []);

  // TODO: Replace with the real Google sign-in handler from the auth system (A1 ticket)
  function handleGoogleSignUp() {
    setLoading(true);
    // TODO: Implement Google OAuth sign-up flow
    setTimeout(() => setLoading(false), 2000);
  }

  return (
    <main
      className={`${plusJakarta.className} orgkit-main-viewport`}
      style={{
        width: "100vw",
        height: "100vh",
        maxWidth: "100vw",
        maxHeight: "100vh",
        position: "fixed",
        inset: 0,
        overflow: "hidden",
        backgroundColor: "#F4F4F5",
        color: "#18181B",
      }}
    >
      {/* Immediate execution script to prevent layout flash before hydration */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function() {
              function setScale() {
                var s = Math.min(window.innerWidth / 1672, window.innerHeight / 941);
                document.documentElement.style.setProperty('--scale', s);
              }
              setScale();
              window.addEventListener('resize', setScale);
            })();
          `,
        }}
      />

      <style>{`
        /* Lock page scrollbars on every device and zoom level */
        html, body {
          overflow: hidden !important;
          height: 100% !important;
          width: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
        }

        .orgkit-main-viewport {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          overflow: hidden;
          background-color: #F4F4F5;
        }

        /* Fixed 1672x941 stage that dynamically scales to fit any screen */
        .orgkit-scalable-stage {
          width: 1672px;
          height: 941px;
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) scale(var(--scale, 1));
          transform-origin: center center;
          overflow: hidden;
          box-sizing: border-box;
          pointer-events: auto;
        }

        /* Card styles */
        .orgkit-card {
          width: 566px;
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
      `}</style>

      {/* ═══════════════════════════════════════════════════════════════
          SCALABLE STAGE (Exact 1672 x 941 canvas)
          ═══════════════════════════════════════════════════════════════ */}
      <div className="orgkit-scalable-stage">
        {/* ── BACKGROUND DECORATION LAYER ── */}
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
              width: "1672px",
              height: "941px",
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

            {/* Top-Left: Tiny emerald triangular tick on pale edge near (222, 50) */}
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

            {/* Top-Right: Large solid emerald circle (r=285, center (1700, -120)) */}
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

            {/* Bottom-Right: Solid emerald segment */}
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

          {/* Bottom-Left: Grayscale Building Photo with linear mask fade */}
          <div
            className="pointer-events-none absolute bottom-0 left-0"
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              width: "890px",
              height: "290px",
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
                objectPosition: "0 100%", // Crop out top text residue
                filter: "grayscale(100%)",
              }}
            />
          </div>
        </div>

        {/* ── Header (top-left, y about 108px, x about 176px / 10.5%) ── */}
        <header
          style={{
            position: "absolute",
            top: "108px",
            left: "176px",
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

        {/* ── Left Marketing Column (starting 10.5% / 176px from left, y=254px) ── */}
        <div
          style={{
            position: "absolute",
            top: "254px",
            left: "176px",
            width: "720px",
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            zIndex: 10,
          }}
        >
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

          {/* 2. H1 (32px below badge, 64px / line-height 1.05, weight 800) */}
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

        {/* ── Right Card (centered at x = 73% / 935px, top = 195px, width = 566px) ── */}
        <div
          style={{
            position: "absolute",
            top: "195px",
            left: "935px",
            width: "566px",
            zIndex: 10,
          }}
        >
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

            {/* 2. H2 "Create Your Account", 40px, weight 700 (22px below logo) */}
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

            {/* 3. Subtitle (16px below heading, 21px / 29px, max-width ~440px) */}
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

            {/* 5. Divider Row (44px below, two 1px lines with "or" between) */}
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
      </div>
    </main>
  );
}
