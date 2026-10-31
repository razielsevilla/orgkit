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

/* ── Google "G" multicolor logo (inline SVG, 24×24 viewBox) ──────── */
function GoogleLogo({ size = 40 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
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
      className={`${plusJakarta.className} relative flex min-h-screen w-full overflow-hidden`}
      style={{ backgroundColor: "#F4F4F5" }}
    >
      {/* ═══════════ BACKGROUND DECORATION ═══════════ */}
      <div
        className="pointer-events-none absolute inset-0 z-0"
        aria-hidden="true"
      >
        {/* ── Top-left: pale green circle + outline arc ── */}
        <div
          className="absolute"
          style={{
            width: "580px",
            height: "580px",
            top: "-120px",
            left: "-70px",
            borderRadius: "50%",
            background: "rgba(5,150,105,0.06)",
          }}
        />
        <div
          className="absolute"
          style={{
            width: "500px",
            height: "500px",
            top: "-120px",
            left: "-70px",
            borderRadius: "50%",
            border: "1.5px solid rgba(5,150,105,0.35)",
            /* center same as the filled circle, smaller radius */
            transform: "translate(40px, 40px)",
          }}
        />
        {/* Tiny emerald tick near the outline edge */}
        <div
          className="absolute"
          style={{
            width: 0,
            height: 0,
            top: "42px",
            left: "222px",
            borderLeft: "6px solid transparent",
            borderRight: "6px solid transparent",
            borderBottom: "10px solid #059669",
            transform: "rotate(-30deg)",
          }}
        />

        {/* ── Top-right: solid emerald circle + pale ring ── */}
        <div
          className="absolute"
          style={{
            width: "640px",
            height: "640px",
            top: "-280px",
            right: "-260px",
            borderRadius: "50%",
            background: "rgba(5,150,105,0.10)",
          }}
        />
        <div
          className="absolute"
          style={{
            width: "570px",
            height: "570px",
            top: "-245px",
            right: "-225px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle at 40% 40%, #059669, #34d399 90%)",
          }}
        />

        {/* ── Bottom-right: solid emerald segment + outline arc ── */}
        <div
          className="absolute"
          style={{
            width: "460px",
            height: "460px",
            bottom: "-280px",
            right: "-120px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle at 30% 30%, #059669, #10b981 90%)",
          }}
        />
        <div
          className="absolute"
          style={{
            width: "560px",
            height: "560px",
            bottom: "-300px",
            right: "-160px",
            borderRadius: "50%",
            border: "1.5px solid rgba(5,150,105,0.35)",
          }}
        />

        {/* ── Bottom-left: two pale mint circles ── */}
        <div
          className="absolute"
          style={{
            width: "520px",
            height: "520px",
            bottom: "-260px",
            left: "-180px",
            borderRadius: "50%",
            background: "rgba(5,150,105,0.08)",
          }}
        />
        <div
          className="absolute"
          style={{
            width: "500px",
            height: "500px",
            bottom: "-220px",
            left: "310px",
            borderRadius: "50%",
            background: "rgba(5,150,105,0.08)",
          }}
        />

        {/* ── Campus building photo (bottom-left) ── */}
        <div
          className="absolute bottom-0 left-0 hidden lg:block"
          style={{
            width: "clamp(500px, 53vw, 890px)",
            height: "clamp(180px, 18.5vw, 290px)",
            maskImage:
              "linear-gradient(to right, rgba(0,0,0,1) 50%, rgba(0,0,0,0) 100%), linear-gradient(to top, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 100%)",
            maskComposite: "intersect",
            WebkitMaskImage:
              "linear-gradient(to right, rgba(0,0,0,1) 50%, rgba(0,0,0,0) 100%), linear-gradient(to top, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 100%)",
            WebkitMaskComposite: "source-in" as React.CSSProperties["WebkitMaskComposite"],
          }}
        >
          <Image
            src="/campus-building.png"
            alt=""
            fill
            className="object-cover object-top"
            style={{ filter: "grayscale(100%)" }}
          />
        </div>
      </div>

      {/* ═══════════ CONTENT ═══════════ */}
      <div className="relative z-10 flex w-full flex-col" style={{ minHeight: "100vh" }}>
        {/* ── Header ── */}
        <header
          className="flex items-center"
          style={{
            paddingTop: "clamp(2rem, 6.5vw, 6.5rem)",
            paddingLeft: "clamp(1.5rem, 10.5vw, 11rem)",
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
              width: "clamp(52px, 4.9vw, 82px)",
              height: "auto",
            }}
          />
          <div
            className="mx-6 self-stretch"
            style={{
              width: "1.5px",
              height: "clamp(32px, 3vw, 50px)",
              backgroundColor: "#D4D4D8",
            }}
          />
          <span
            className="font-bold"
            style={{
              fontSize: "clamp(24px, 2.27vw, 38px)",
              color: "#18181B",
              letterSpacing: "-0.01em",
            }}
          >
            OrgKit
          </span>
        </header>

        {/* ── Two-column layout ── */}
        <div className="flex flex-1 items-center">
          {/* Left marketing column */}
          <div
            className="hidden flex-col lg:flex"
            style={{
              paddingLeft: "clamp(1.5rem, 10.5vw, 11rem)",
              paddingTop: "clamp(1rem, 1.5vw, 2rem)",
              maxWidth: "55%",
            }}
          >
            {/* Pill badge */}
            <div
              className="inline-flex w-fit items-center gap-3"
              style={{
                height: "38px",
                paddingLeft: "20px",
                paddingRight: "20px",
                borderRadius: "9999px",
                background: "rgba(5,150,105,0.08)",
                border: "1.5px solid rgba(5,150,105,0.25)",
              }}
            >
              <span
                style={{
                  width: "12px",
                  height: "12px",
                  borderRadius: "50%",
                  backgroundColor: "#059669",
                  flexShrink: 0,
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

            {/* H1 */}
            <h1
              style={{
                marginTop: "clamp(20px, 1.9vw, 32px)",
                fontSize: "clamp(36px, 3.83vw, 64px)",
                lineHeight: 1.05,
                fontWeight: 800,
                letterSpacing: "-0.02em",
                color: "#18181B",
              }}
            >
              Organize. Collaborate.
              <br />
              <span style={{ color: "#059669" }}>Lead.</span>
            </h1>

            {/* Subtitle */}
            <p
              style={{
                marginTop: "clamp(16px, 1.67vw, 28px)",
                fontSize: "clamp(16px, 1.44vw, 24px)",
                lineHeight: "1.25",
                color: "#71717A",
                fontWeight: 400,
              }}
            >
              A modern platform for student organizations
              <br />
              to connect, manage, and grow together.
            </p>

            {/* Feature row */}
            <div
              className="flex items-center"
              style={{
                marginTop: "clamp(32px, 3.83vw, 64px)",
                gap: 0,
              }}
            >
              {/* Manage Members */}
              <div className="flex items-center" style={{ gap: "14px" }}>
                <Users
                  size={30}
                  strokeWidth={1.5}
                  color="#18181B"
                  aria-hidden="true"
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

              {/* Divider */}
              <div
                style={{
                  width: "1.5px",
                  height: "30px",
                  backgroundColor: "rgba(161,161,170,0.6)",
                  marginLeft: "30px",
                  marginRight: "30px",
                  flexShrink: 0,
                }}
              />

              {/* Organize Events */}
              <div className="flex items-center" style={{ gap: "14px" }}>
                <CalendarDays
                  size={30}
                  strokeWidth={1.5}
                  color="#18181B"
                  aria-hidden="true"
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

              {/* Divider */}
              <div
                style={{
                  width: "1.5px",
                  height: "30px",
                  backgroundColor: "rgba(161,161,170,0.6)",
                  marginLeft: "30px",
                  marginRight: "30px",
                  flexShrink: 0,
                }}
              />

              {/* Track Activities */}
              <div className="flex items-center" style={{ gap: "14px" }}>
                <ChartNoAxesCombined
                  size={30}
                  strokeWidth={1.5}
                  color="#18181B"
                  aria-hidden="true"
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

          {/* Right card */}
          <div
            className="flex flex-1 items-center justify-center lg:justify-end"
            style={{
              paddingRight: "clamp(1rem, 5vw, 5.5rem)",
              paddingLeft: "clamp(1rem, 2vw, 2rem)",
            }}
          >
            <div
              className="flex w-full flex-col items-center"
              style={{
                maxWidth: "min(100%, clamp(340px, 33.8vw, 566px))",
                backgroundColor: "#FFFFFF",
                borderRadius: "28px",
                paddingTop: "clamp(28px, 2.4vw, 40px)",
                paddingBottom: "clamp(28px, 2.4vw, 40px)",
                paddingLeft: "clamp(20px, 2.7vw, 45px)",
                paddingRight: "clamp(20px, 2.7vw, 45px)",
                boxShadow: "0 20px 50px rgba(24,24,27,0.08)",
                border: "1px solid rgba(228,228,231,0.6)",
              }}
            >
              {/* Logo in card */}
              <Image
                src="/orgkit-logo.png"
                alt="OrgKit"
                width={92}
                height={58}
                className="object-contain"
                style={{
                  width: "clamp(64px, 5.5vw, 92px)",
                  height: "auto",
                }}
              />

              {/* Card heading */}
              <h2
                className="text-center"
                style={{
                  marginTop: "clamp(14px, 1.32vw, 22px)",
                  fontSize: "clamp(26px, 2.4vw, 40px)",
                  fontWeight: 700,
                  color: "#18181B",
                  lineHeight: 1.15,
                }}
              >
                Create Your Account
              </h2>

              {/* Card subtitle */}
              <p
                className="text-center"
                style={{
                  marginTop: "clamp(10px, 0.96vw, 16px)",
                  fontSize: "clamp(15px, 1.26vw, 21px)",
                  lineHeight: "1.38",
                  color: "#71717A",
                  maxWidth: "440px",
                }}
              >
                Join OrgKit and be part of a more connected
                <br />
                student community.
              </p>

              {/* Google sign-up button */}
              <button
                type="button"
                disabled={loading}
                onClick={handleGoogleSignUp}
                className="group flex w-full cursor-pointer items-center justify-center transition-colors hover:bg-zinc-50 focus-visible:ring-2 focus-visible:ring-[#059669] focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-70"
                style={{
                  marginTop: "clamp(24px, 2.4vw, 40px)",
                  height: "clamp(52px, 4.3vw, 72px)",
                  borderRadius: "9999px",
                  backgroundColor: "#FFFFFF",
                  border: "2px solid #E4E4E7",
                  gap: "14px",
                  boxShadow: "none",
                  outline: "none",
                }}
              >
                {!loading && <GoogleLogo size={40} />}
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

              {/* Divider row */}
              <div
                className="flex w-full items-center"
                style={{
                  marginTop: "clamp(28px, 2.63vw, 44px)",
                }}
              >
                <div className="flex-1" style={{ height: "1px", backgroundColor: "#E4E4E7" }} />
                <span
                  style={{
                    paddingLeft: "24px",
                    paddingRight: "24px",
                    fontSize: "clamp(15px, 1.2vw, 20px)",
                    color: "#71717A",
                  }}
                >
                  or
                </span>
                <div className="flex-1" style={{ height: "1px", backgroundColor: "#E4E4E7" }} />
              </div>

              {/* Legal text */}
              <p
                className="text-center"
                style={{
                  marginTop: "clamp(24px, 2.27vw, 38px)",
                  fontSize: "clamp(13px, 1.02vw, 17px)",
                  lineHeight: "1.65",
                  color: "#71717A",
                }}
              >
                By continuing, you agree to our
                <br />
                <Link
                  href="/terms"
                  className="hover:underline focus:underline"
                  style={{ color: "#059669", textDecoration: "none" }}
                >
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link
                  href="/privacy"
                  className="hover:underline focus:underline"
                  style={{ color: "#059669", textDecoration: "none" }}
                >
                  Privacy Policy
                </Link>
                .
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════ MOBILE LAYOUT (< 1024px) ═══════════ */}
      {/* On mobile the two-column layout above hides the left column.
          We show a simplified single-column version below the header.
          The card is already visible and centered via flex-1 + justify-center.
          Below 640px the H1 block and features are hidden via lg:flex on the left col.
          The corner shapes scale naturally since they use fixed px sizes that
          overflow and clip via the parent overflow-hidden. */}
    </main>
  );
}
