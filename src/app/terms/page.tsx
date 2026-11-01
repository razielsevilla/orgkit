import Link from "next/link";
import Image from "next/image";
import { Plus_Jakarta_Sans } from "next/font/google";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export default function TermsPage() {
  return (
    <main
      className={plusJakarta.className}
      style={{
        minHeight: "100vh",
        backgroundColor: "#F4F4F5",
        color: "#18181B",
        padding: "clamp(24px, 5vh, 48px) clamp(16px, 3vw, 24px)",
      }}
    >
      <style>{`
        html, body {
          overflow-y: auto !important;
          height: auto !important;
          min-height: 100% !important;
          max-height: none !important;
        }
      `}</style>
      <div style={{ maxWidth: 820, margin: "0 auto" }}>
        {/* Top Header / Navigation */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "clamp(20px, 3.5vh, 32px)",
          }}
        >
          <Link href="/signin" style={{ display: "inline-flex", textDecoration: "none" }}>
            <Image
              src="/orgkit-text-logo.png"
              alt="OrgKit"
              width={140}
              height={46}
              priority
              style={{ height: 32, width: "auto", display: "block" }}
            />
          </Link>
          <Link
            href="/signin"
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "#059669",
              textDecoration: "none",
            }}
          >
            ← Back to Sign in
          </Link>
        </div>

        {/* Page Title & Last Updated (Outside Card, matching reference) */}
        <div style={{ marginBottom: "clamp(20px, 3.5vh, 28px)" }}>
          <h1
            style={{
              fontSize: "clamp(28px, 3.2vw, 40px)",
              fontWeight: 800,
              letterSpacing: "-0.02em",
              color: "#18181B",
              margin: 0,
              lineHeight: 1.15,
            }}
          >
            Terms of Service
          </h1>
          <p
            style={{
              marginTop: 8,
              fontSize: 14,
              color: "#71717A",
              marginBottom: 0,
            }}
          >
            Last updated: November 1, 2026
          </p>
        </div>

        {/* Clean Content Card */}
        <div
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 24,
            border: "1px solid #E4E4E7",
            boxShadow: "0 10px 40px -10px rgba(24, 24, 27, 0.08), 0 1px 3px rgba(24, 24, 27, 0.04)",
            padding: "clamp(24px, 4.5vw, 48px)",
            boxSizing: "border-box",
          }}
        >
          {/* Intro text */}
          <p
            style={{
              fontSize: "clamp(14.5px, 1.1vw, 16px)",
              lineHeight: 1.65,
              color: "#3F3F46",
              marginTop: 0,
              marginBottom: 28,
            }}
          >
            Welcome to OrgKit — a modern platform for student organizations to connect,
            manage, and grow together. By using the website or mobile application, you agree
            to these terms.
          </p>

          {/* Section: Your account */}
          <div style={{ marginBottom: 28 }}>
            <h2
              style={{
                fontSize: "clamp(16px, 1.25vw, 18px)",
                fontWeight: 700,
                color: "#18181B",
                marginTop: 0,
                marginBottom: 14,
              }}
            >
              Your account
            </h2>
            <ul
              style={{
                listStyleType: "disc",
                paddingLeft: 22,
                margin: 0,
                display: "flex",
                flexDirection: "column",
                gap: 12,
                fontSize: "clamp(14px, 1vw, 15px)",
                lineHeight: 1.6,
                color: "#3F3F46",
              }}
            >
              <li>
                You are responsible for your account and any activity conducted under it when you sign in
                with your Google credentials.
              </li>
              <li>
                <strong style={{ color: "#18181B" }}>One account per person.</strong> Each officer must
                authenticate using their individual Google account. Shared or team-wide accounts are strictly
                prohibited to maintain audit integrity.
              </li>
              <li>
                You must be an authorized officer or student leader of your organization to access
                administrative tools, membership lists, and financial records.
              </li>
              <li>
                You may request deactivation or removal of your officer account by contacting your organization
                administrator.
              </li>
            </ul>
          </div>

          {/* Section: Content & ownership */}
          <div style={{ marginBottom: 28 }}>
            <h2
              style={{
                fontSize: "clamp(16px, 1.25vw, 18px)",
                fontWeight: 700,
                color: "#18181B",
                marginTop: 0,
                marginBottom: 14,
              }}
            >
              Your content & organization data
            </h2>
            <ul
              style={{
                listStyleType: "disc",
                paddingLeft: 22,
                margin: 0,
                display: "flex",
                flexDirection: "column",
                gap: 12,
                fontSize: "clamp(14px, 1vw, 15px)",
                lineHeight: 1.6,
                color: "#3F3F46",
              }}
            >
              <li>
                Student organizations retain full ownership of all materials they publish and manage —
                including rosters, calendars, event details, and documentation.
              </li>
              <li>
                By using OrgKit, you grant us permission to securely host, process, and display this content
                solely for providing the organization management platform.
              </li>
            </ul>
          </div>

          {/* Section: Acceptable use */}
          <div style={{ marginBottom: 28 }}>
            <h2
              style={{
                fontSize: "clamp(16px, 1.25vw, 18px)",
                fontWeight: 700,
                color: "#18181B",
                marginTop: 0,
                marginBottom: 14,
              }}
            >
              Acceptable use
            </h2>
            <ul
              style={{
                listStyleType: "disc",
                paddingLeft: 22,
                margin: 0,
                display: "flex",
                flexDirection: "column",
                gap: 12,
                fontSize: "clamp(14px, 1vw, 15px)",
                lineHeight: 1.6,
                color: "#3F3F46",
              }}
            >
              <li>
                Do not impersonate other student officers, organizations, or campus administration.
              </li>
              <li>
                Do not misuse, scrape, or export member contact information for unauthorized personal,
                commercial, or promotional solicitations.
              </li>
              <li>
                Do not attempt to compromise the security, integrity, or accessibility of OrgKit services.
              </li>
            </ul>
          </div>

          {/* Section: Service terms */}
          <div style={{ marginBottom: 32 }}>
            <h2
              style={{
                fontSize: "clamp(16px, 1.25vw, 18px)",
                fontWeight: 700,
                color: "#18181B",
                marginTop: 0,
                marginBottom: 14,
              }}
            >
              Service availability & updates
            </h2>
            <ul
              style={{
                listStyleType: "disc",
                paddingLeft: 22,
                margin: 0,
                display: "flex",
                flexDirection: "column",
                gap: 12,
                fontSize: "clamp(14px, 1vw, 15px)",
                lineHeight: 1.6,
                color: "#3F3F46",
              }}
            >
              <li>
                We continuously improve OrgKit features. Occasional maintenance or feature rollouts may occur.
              </li>
              <li>
                We reserve the right to suspend or restrict accounts that violate these terms or compromise
                campus community standards.
              </li>
            </ul>
          </div>

          {/* Card Footer */}
          <div
            style={{
              paddingTop: 20,
              borderTop: "1px solid #E4E4E7",
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              fontSize: 13,
              color: "#71717A",
            }}
          >
            <span>© 2026 OrgKit. All rights reserved.</span>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <Link
                href="/privacy"
                style={{ color: "#71717A", textDecoration: "none" }}
              >
                Privacy Policy
              </Link>
              <span>•</span>
              <Link
                href="/signin"
                style={{ color: "#059669", fontWeight: 600, textDecoration: "none" }}
              >
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
