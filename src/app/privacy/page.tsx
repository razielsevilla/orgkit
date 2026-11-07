import Link from "next/link";
import Image from "next/image";
import { plusJakarta } from "@/src/lib/fonts";
import { ROUTES } from "@/src/lib/routes";
import { parseContactEmail } from "@/src/lib/members/member-join";

export default function PrivacyPage() {
  const contactEmail = parseContactEmail(process.env.PRIVACY_CONTACT_EMAIL);

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
            Privacy Policy
          </h1>
          <p
            style={{
              marginTop: 8,
              fontSize: 14,
              color: "var(--color-muted)",
              marginBottom: 0,
            }}
          >
            Last updated: November 7, 2026
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
            OrgKit is a modern management platform for student organizations to connect,
            manage, and grow together. This policy applies to our website and application.
          </p>

          {/* Section: What we collect */}
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
              What we collect
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
                <strong style={{ color: "var(--color-ink)" }}>Account data.</strong> Google sign-in provides
                your name, email address, and permanent Google account identifier (<code>google_sub</code>).
                Google may also provide your profile photo. We never receive your Google account password.
              </li>
              <li>
                <strong style={{ color: "var(--color-ink)" }}>Organizational data.</strong> Student organization
                rosters, officer roles, event schedules, and activity records are securely stored within
                your organization&apos;s workspace and accessible only to authorized officers.
              </li>
              <li>
                <strong style={{ color: "var(--color-ink)" }}>Minimal permissions.</strong> OrgKit requests
                only the minimal <code>openid</code>, <code>email</code>, and <code>profile</code> scopes.
                We never request or access your Gmail, Google Drive, or Google Sheets.
              </li>
              <li>
                <strong style={{ color: "var(--color-ink)" }}>Security & audit records.</strong> Sign-in
                timestamps and agreement logs are recorded to verify officer access and ensure accountability
                across organizational operations.
              </li>
            </ul>
          </div>

          {/* Section: How we use your data */}
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
              How we use your information
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
                <strong style={{ color: "var(--color-ink)" }}>Officer authentication.</strong> We use your Google
                account ID to authenticate your session, ensuring that account access remains uninterrupted
                even if your institutional email changes.
              </li>
              <li>
                <strong style={{ color: "var(--color-ink)" }}>Organization management.</strong> Your name and email
                allow fellow student leaders to coordinate events, assign tasks, and manage organization
                affairs effectively.
              </li>
              <li>
                <strong style={{ color: "var(--color-ink)" }}>No data sale.</strong> We do not sell, rent, or monetize
                student personal information or organization data to third parties.
              </li>
            </ul>
          </div>

          {/* Section: Members (students who join an org through its link or QR) */}
          <div id="members" style={{ marginBottom: 28, scrollMarginTop: 24 }}>
            <h2
              style={{
                fontSize: "clamp(16px, 1.25vw, 18px)",
                fontWeight: 700,
                color: "var(--color-ink)",
                marginTop: 0,
                marginBottom: 14,
              }}
            >
              If you join an org as a member
            </h2>
            <p
              style={{
                fontSize: "clamp(14px, 1vw, 15px)",
                lineHeight: 1.6,
                color: "var(--color-ink-soft)",
                marginTop: 0,
                marginBottom: 12,
              }}
            >
              Students join a student organization through a link or QR code that its officers share.
              You do not create an OrgKit account. This section explains what happens to the details
              you give when you do. It is in addition to the consent text you see when you join.
            </p>
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
                <strong style={{ color: "var(--color-ink)" }}>What we collect.</strong> Your full name and
                email address. We also record which consent wording you saw, in which language, and when you
                agreed, and that you confirmed you are 18 or older. We do not collect anything else when you join.
              </li>
              <li>
                <strong style={{ color: "var(--color-ink)" }}>Why.</strong> So the org can manage its
                membership, attendance and dues. Your details are not used for advertising and are never sold.
              </li>
              <li>
                <strong style={{ color: "var(--color-ink)" }}>Who can see it.</strong> Only the officers of the
                org you joined. Another org&apos;s officers cannot see it, and neither can other members.
              </li>
              <li>
                <strong style={{ color: "var(--color-ink)" }}>Pending until confirmed.</strong> A new join
                is marked as pending until an officer of the org confirms you.
              </li>
              <li>
                <strong style={{ color: "var(--color-ink)" }}>How long we keep it.</strong> For as long as you
                stay on the org&apos;s list, and until you ask us to delete it.
              </li>
              <li>
                <strong style={{ color: "var(--color-ink)" }}>Your rights.</strong> Under the Philippine Data
                Privacy Act you can ask to see, correct or delete your details, and withdraw your consent.
                {contactEmail ? (
                  <>
                    {" "}
                    Write to <a href={`mailto:${contactEmail}`} style={{ color: "var(--color-accent)" }}>{contactEmail}</a>.
                  </>
                ) : (
                  <> Ask the officers of your org, who can reach us on your behalf.</>
                )}
              </li>
              <li>
                <strong style={{ color: "var(--color-ink)" }}>Under 18.</strong> Joining is for members aged 18
                or over. If you are younger, please do not join.
              </li>
            </ul>
          </div>

          {/* Section: Your rights */}
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
              Your control & choices
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
                You can revoke OrgKit&apos;s connection at any time in your Google Account security settings.
              </li>
              <li>
                You can request deletion of your officer record through your student organization administrator
                or by contacting OrgKit support.
                {contactEmail ? (
                  <>
                    {" "}
                    Privacy questions and requests:{" "}
                    <a href={`mailto:${contactEmail}`} style={{ color: "var(--color-accent)" }}>{contactEmail}</a>.
                  </>
                ) : null}
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
                href={ROUTES.terms}
                style={{ color: "var(--color-muted)", textDecoration: "none" }}
              >
                Terms of Service
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
