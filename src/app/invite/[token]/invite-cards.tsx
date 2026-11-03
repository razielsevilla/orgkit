import Image from "next/image";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Card, CardBadge, CardTitle, CardDescription, CardHeader } from "@/src/components/card";
import { ClearInviteCookie } from "./invite-client";

/**
 * Centered responsive canvas wrapper matching OrgKit design system.
 */
export function InviteContainer({ children }: { children: React.ReactNode }) {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#F4F4F5",
        padding: "32px 16px",
        boxSizing: "border-box",
        position: "relative",
      }}
    >
      <div style={{ marginBottom: 28 }}>
        <Link href="/" aria-label="OrgKit Home">
          <Image
            src="/orgkit-text-logo.png"
            alt="OrgKit"
            width={132}
            height={32}
            priority
            style={{
              height: 32,
              width: "auto",
              objectFit: "contain",
              display: "block",
            }}
          />
        </Link>
      </div>

      {children}
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
        <CardBadge size={64} style={{ backgroundColor: "rgba(220, 38, 38, 0.10)" }}>
          <AlertTriangle size={30} color="#DC2626" />
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
            backgroundColor: "#18181B",
            color: "#FFFFFF",
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
