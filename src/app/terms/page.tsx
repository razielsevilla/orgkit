import Link from "next/link";
import Image from "next/image";
import { plusJakarta } from "@/src/lib/fonts";
import { ROUTES } from "@/src/lib/routes";

export default function TermsPage() {
  return (
    <main
      className={plusJakarta.className}
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--color-base)",
        color: "var(--color-ink)",
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
          <Link href={ROUTES.signIn} style={{ display: "inline-flex", textDecoration: "none" }}>
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
            href={ROUTES.signIn}
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "var(--color-accent)",
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
              fontWeight: 700, // the page font is loaded up to 800; this heading has always rendered at 700
              letterSpacing: "-0.02em",
              color: "var(--color-ink)",
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
              color: "var(--color-muted)",
              marginBottom: 0,
            }}
          >
            Last updated: November 1, 2026
          </p>
        </div>

        {/* Clean Content Card */}
        <div
          style={{
            backgroundColor: "var(--color-surface)",
            borderRadius: 24,
            border: "1px solid var(--color-line)",
            boxShadow: "0 10px 40px -10px color-mix(in srgb, var(--color-ink) 8%, transparent), 0 1px 3px color-mix(in srgb, var(--color-ink) 4%, transparent)",
            padding: "clamp(24px, 4.5vw, 48px)",
            boxSizing: "border-box",
          }}
        >
          {/* Intro text */}
          <p
            style={{
              fontSize: "clamp(14.5px, 1.1vw, 16px)",
              lineHeight: 1.65,
              color: "var(--color-ink-soft)",
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
                color: "var(--color-ink)",
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
                color: "var(--color-ink-soft)",
              }}
            >
              <li>
                You are responsible for your account and any activity conducted under it when you sign in
                with your Google credentials.
              </li>
              <li>
                <strong style={{ color: "var(--color-ink)" }}>One account per person.</strong> Each officer must
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
                color: "var(--color-ink)",
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
                color: "var(--color-ink-soft)",
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
                color: "var(--color-ink)",
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
                color: "var(--color-ink-soft)",
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
                color: "var(--color-ink)",
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
                color: "var(--color-ink-soft)",
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
              borderTop: "1px solid var(--color-line)",
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              fontSize: 13,
              color: "var(--color-muted)",
            }}
          >
            <span>© 2026 OrgKit. All rights reserved.</span>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <Link
                href={ROUTES.privacy}
                style={{ color: "var(--color-muted)", textDecoration: "none" }}
              >
                Privacy Policy
              </Link>
              <span>•</span>
              <Link
                href={ROUTES.signIn}
                style={{ color: "var(--color-accent)", fontWeight: 600, textDecoration: "none" }}
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
