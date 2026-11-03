import Image from "next/image";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { plusJakarta } from "@/src/lib/fonts";
import { Card, CardBadge, CardTitle, CardDescription, CardHeader } from "@/src/components/ui/card";
import { FloatingIconsDecor } from "@/src/components/decor/floating-decor";
import { ClearInviteCookie } from "./invite-client";

/**
 * Centered responsive canvas wrapper matching OrgKit design system (design.md).
 * Includes the background concentric circles and floating decorative icons.
 */
export function InviteContainer({ children }: { children: React.ReactNode }) {
  return (
    <main
      className={plusJakarta.className}
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "var(--color-base)",
        color: "var(--color-ink)",
        padding: "clamp(24px, 4vh, 48px) 16px",
        boxSizing: "border-box",
        position: "relative",
        overflowX: "hidden",
      }}
    >
      <style>{`
        @media (max-width: 639px) {
          .orgkit-floating-decor {
            display: none !important;
          }
        }
      `}</style>

      {/* ── Background Concentric SVG Circles: Top-Left (design.md 5.2) ── */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: 320,
          height: 320,
          pointerEvents: "none",
          zIndex: 1,
        }}
      >
        <svg
          viewBox="0 0 320 320"
          style={{ width: "100%", height: "100%", display: "block" }}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="0" cy="0" r="220" fill="var(--color-accent)" fillOpacity="0.04" />
          <circle
            cx="0"
            cy="0"
            r="260"
            stroke="var(--color-accent)"
            strokeWidth="1.2"
            strokeOpacity="0.22"
          />
          <circle
            cx="0"
            cy="0"
            r="160"
            stroke="var(--color-accent)"
            strokeWidth="1.2"
            strokeOpacity="0.14"
          />
        </svg>
      </div>

      {/* ── Background Concentric SVG Circles: Bottom-Right (design.md 5.2) ── */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          bottom: 0,
          right: 0,
          width: 320,
          height: 320,
          pointerEvents: "none",
          zIndex: 1,
        }}
      >
        <svg
          viewBox="0 0 320 320"
          style={{ width: "100%", height: "100%", display: "block" }}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="320" cy="320" r="200" fill="var(--color-accent)" fillOpacity="0.05" />
          <circle
            cx="320"
            cy="320"
            r="270"
            stroke="var(--color-accent)"
            strokeWidth="1.2"
            strokeOpacity="0.26"
          />
        </svg>
      </div>

      {/* ── Centered Card with Floating Icons Decor ── */}
      <div
        className="orgkit-card-wrapper"
        style={{
          position: "relative",
          zIndex: 10,
          width: "100%",
          maxWidth: 480,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          boxSizing: "border-box",
          animation: "cardPopout 0.45s cubic-bezier(0.16, 1.25, 0.38, 1) both",
        }}
      >
        <FloatingIconsDecor />

        <div style={{ marginBottom: 22, zIndex: 10 }}>
          <Link href="/" aria-label="OrgKit Home">
            <Image
              src="/orgkit-text-logo.png"
              alt="OrgKit"
              width={128}
              height={32}
              priority
              style={{
                height: 30,
                width: "auto",
                objectFit: "contain",
                display: "block",
              }}
            />
          </Link>
        </div>

        <div style={{ width: "100%", position: "relative", zIndex: 10 }}>
          {children}
        </div>
      </div>
    </main>
  );
}

/** A red warning card with a title, a sentence and a link home. */
function WarningCard({
  title,
  description,
  linkLabel,
  descriptionMaxWidth,
  padding = "36px 32px",
  maxWidth = 460,
}: {
  title: string;
  description: string;
  linkLabel: string;
  descriptionMaxWidth?: number;
  padding?: string;
  maxWidth?: number;
}) {
  return (
    <Card maxWidth={maxWidth} padding={padding}>
      <CardHeader>
        <CardBadge size={64} style={{ backgroundColor: "color-mix(in srgb, var(--color-danger) 10%, transparent)" }}>
          <AlertTriangle size={30} color="var(--color-danger)" />
        </CardBadge>
        <CardTitle>{title}</CardTitle>
        <CardDescription style={descriptionMaxWidth ? { maxWidth: descriptionMaxWidth } : undefined}>
          {description}
        </CardDescription>
      </CardHeader>
      <div style={{ textAlign: "center" }}>
        <Link
          href="/"
          style={{
            display: "inline-block",
            padding: "12px 24px",
            borderRadius: 9999,
            backgroundColor: "var(--color-ink)",
            color: "var(--color-on-accent)",
            fontSize: 14,
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          {linkLabel}
        </Link>
      </div>
    </Card>
  );
}

/** Shown when this device has opened too many invite links in a minute. */
export function TooManyRequestsCard() {
  return (
    <InviteContainer>
      <WarningCard
        title="Too Many Requests"
        description="Too many attempts. Please wait a minute before trying again."
        linkLabel="Return Home"
      />
    </InviteContainer>
  );
}

/**
 * Same message for an invalid, used, revoked, expired or missing invite
 * (ticket rule), and it forgets any invite remembered across sign-in.
 */
export function InvalidInviteCard() {
  return (
    <InviteContainer>
      <ClearInviteCookie />
      <WarningCard
        title="Invite no longer valid"
        description="This invite is no longer valid. Ask an admin to send a new one."
        linkLabel="Back to Home"
        descriptionMaxWidth={360}
      />
    </InviteContainer>
  );
}
