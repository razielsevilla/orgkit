import Link from "next/link";
import Image from "next/image";
import { Plus_Jakarta_Sans } from "next/font/google";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export default function PrivacyPage() {
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
            Privacy Policy
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
            OrgKit is a modern management platform for student organizations to connect,
            manage, and grow together. This policy applies to our website and application.
          </p>

          {/* Section: What we collect */}
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
                color: "#3F3F46",
              }}
            >
              <li>
                <strong style={{ color: "#18181B" }}>Account data.</strong> Google sign-in provides
                your name, email address, and permanent Google account identifier (<code>google_sub</code>).
                Google may also provide your profile photo. We never receive your Google account password.
              </li>
              <li>
                <strong style={{ color: "#18181B" }}>Organizational data.</strong> Student organization
                rosters, officer roles, event schedules, and activity records are securely stored within
                your organization&apos;s workspace and accessible only to authorized officers.
              </li>
              <li>
                <strong style={{ color: "#18181B" }}>Minimal permissions.</strong> OrgKit requests
                only the minimal <code>openid</code>, <code>email</code>, and <code>profile</code> scopes.
                We never request or access your Gmail, Google Drive, or Google Sheets.
              </li>
              <li>
                <strong style={{ color: "#18181B" }}>Security & audit records.</strong> Sign-in
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
                color: "#18181B",
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
                color: "#3F3F46",
              }}
            >
              <li>
                <strong style={{ color: "#18181B" }}>Officer authentication.</strong> We use your Google
                account ID to authenticate your session, ensuring that account access remains uninterrupted
                even if your institutional email changes.
              </li>
              <li>
                <strong style={{ color: "#18181B" }}>Organization management.</strong> Your name and email
                allow fellow student leaders to coordinate events, assign tasks, and manage organization
                affairs effectively.
              </li>
              <li>
                <strong style={{ color: "#18181B" }}>No data sale.</strong> We do not sell, rent, or monetize
                student personal information or organization data to third parties.
              </li>
            </ul>
          </div>

          {/* Section: Your rights */}
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
                color: "#3F3F46",
              }}
            >
              <li>
                You can revoke OrgKit&apos;s connection at any time in your Google Account security settings.
              </li>
              <li>
                You can request deletion of your officer record through your student organization administrator
                or by contacting OrgKit support.
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
            <span>© {new Date().getFullYear()} OrgKit. All rights reserved.</span>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <Link
                href="/terms"
                style={{ color: "#71717A", textDecoration: "none" }}
              >
                Terms of Service
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
