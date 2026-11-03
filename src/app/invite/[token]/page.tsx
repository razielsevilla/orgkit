import { redirect } from "next/navigation";
import { Suspense } from "react";
import { headers } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import {
  AlertTriangle,
  AlertCircle,
  Building,
  UserCheck,
} from "lucide-react";
import { createClient } from "@/src/lib/supabase/server";
import { createAdminClient } from "@/src/lib/supabase/service-role";
import { findUsableInvite } from "@/src/lib/invite-lookup";
import { checkInviteRateLimit } from "@/src/lib/rate-limit";
import { ROLE_DETAILS, OfficerRole } from "@/src/lib/permissions";
import {
  Card,
  CardBadge,
  CardTitle,
  CardDescription,
  CardHeader,
} from "@/src/components/card";
import {
  InviteGuestButton,
  SwitchAccountButton,
  GoToWorkspaceButton,
  ClearInviteCookie,
} from "./invite-client";

interface InvitePageProps {
  params: Promise<{ token: string }>;
}

async function InviteContent({ params }: InvitePageProps) {
  const { token } = await params;

  // 1. Rate limit per IP
  const headerList = await headers();
  const clientIp =
    headerList.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

  if (!checkInviteRateLimit(clientIp)) {
    return (
      <InviteContainer>
        <Card maxWidth={460} padding="36px 32px">
          <CardHeader>
            <CardBadge
              size={64}
              style={{ backgroundColor: "rgba(220, 38, 38, 0.10)" }}
            >
              <AlertTriangle size={30} color="#DC2626" />
            </CardBadge>
            <CardTitle>Too Many Requests</CardTitle>
            <CardDescription>
              Too many attempts. Please wait a minute before trying again.
            </CardDescription>
          </CardHeader>
          <div style={{ textAlign: "center" }}>
            <Link
              href="/"
              style={{
                display: "inline-block",
                padding: "11px 22px",
                borderRadius: 9999,
                backgroundColor: "#18181B",
                color: "#FFFFFF",
                fontSize: 14,
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Return Home
            </Link>
          </div>
        </Card>
      </InviteContainer>
    );
  }

  // 2. Look up the token by its SHA-256 hash. Cookies cannot be written while a
  //    page renders, so this page only reads them; the cookie is set by
  //    /invite/[token]/start and cleared by <ClearInviteCookie />.
  const adminClient = createAdminClient();
  const found = await findUsableInvite(token);

  // Uniform invalid invite message (Ticket Rule: Same message for invalid, used, revoked, expired, or missing)
  if (!found) {
    return (
      <InviteContainer>
        <ClearInviteCookie />
        <Card maxWidth={460} padding="36px 32px">
          <CardHeader>
            <CardBadge
              size={64}
              style={{ backgroundColor: "rgba(220, 38, 38, 0.10)" }}
            >
              <AlertTriangle size={30} color="#DC2626" />
            </CardBadge>
            <CardTitle>Invite no longer valid</CardTitle>
            <CardDescription style={{ maxWidth: 360 }}>
              This invite is no longer valid. Ask an admin to send a new one.
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
              Back to Home
            </Link>
          </div>
        </Card>
      </InviteContainer>
    );
  }

  const { invite, tokenHash } = found;
  const orgName = invite.orgName || "the organization";
  const orgSchool = invite.orgSchool || null;
  const role = (invite.role as OfficerRole) || "officer";
  const roleInfo = ROLE_DETAILS[role] || {
    label: "Officer",
    description: "View the roster and run check-in.",
  };

  // 3. Check visitor authentication state
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Visitor is NOT signed in: set HttpOnly cookie and offer Google sign-in
  if (!user) {
    return (
      <InviteContainer>
        <Card maxWidth={480} padding="40px 36px">
          <CardHeader>
            <CardBadge size={68}>
              <UserCheck size={32} color="#059669" />
            </CardBadge>

            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "#059669",
                marginBottom: 6,
              }}
            >
              YOU&apos;RE INVITED TO JOIN
            </div>

            <CardTitle style={{ fontSize: "clamp(22px, 2.2vw, 30px)", marginBottom: 4 }}>
              {orgName}
            </CardTitle>

            {orgSchool && (
              <p
                style={{
                  fontSize: 13,
                  color: "#71717A",
                  margin: "0 0 14px 0",
                }}
              >
                {orgSchool}
              </p>
            )}

            {/* Role Badge & Summary */}
            <div
              style={{
                display: "inline-flex",
                flexDirection: "column",
                alignItems: "center",
                borderRadius: 14,
                backgroundColor: "rgba(5, 150, 105, 0.08)",
                border: "1px solid rgba(5, 150, 105, 0.20)",
                padding: "10px 16px",
                margin: "8px 0 16px 0",
                width: "100%",
                boxSizing: "border-box",
              }}
            >
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#047857",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  marginBottom: 2,
                }}
              >
                Role: {roleInfo.label}
              </span>
              <span
                style={{
                  fontSize: 12,
                  color: "#52525B",
                  textAlign: "center",
                  lineHeight: 1.35,
                }}
              >
                {roleInfo.description}
              </span>
            </div>

            <CardDescription style={{ fontSize: 13.5, margin: 0 }}>
              Sign in with your Google account to accept this invite and access the workspace.
            </CardDescription>
          </CardHeader>

          <InviteGuestButton token={token} />

          <p
            style={{
              fontSize: 11.5,
              color: "#71717A",
              textAlign: "center",
              margin: "18px 0 0 0",
              lineHeight: 1.4,
            }}
          >
            By continuing, you agree to OrgKit&apos;s{" "}
            <Link href="/terms" style={{ color: "#059669", textDecoration: "underline" }}>
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" style={{ color: "#059669", textDecoration: "underline" }}>
              Privacy Policy
            </Link>
            .
          </p>
        </Card>
      </InviteContainer>
    );
  }

  // Visitor IS signed in: check privacy consent agreement (A1)
  const { data: officer } = await adminClient
    .from("officers")
    .select("id, email, full_name, consent_at")
    .eq("id", user.id)
    .maybeSingle();

  if (!officer || !officer.consent_at) {
    // The start route remembers the invite, then sends them to the A1 consent screen
    redirect(`/invite/${token}/start`);
  }

  // Visitor has consent: invoke atomic accept_invite RPC
  const { data: acceptResult } = await supabase.rpc(
    "accept_invite",
    {
      p_token_hash: tokenHash,
    }
  );

  const status = acceptResult?.status;

  // 1. Success or Already Member: go to the workspace (the proxy clears the cookie there)
  if (status === "success" || status === "already_member") {
    redirect(`/workspace/${acceptResult.org_id}`);
  }

  // 2. Email mismatch: show switch account card
  if (status === "email_mismatch") {
    // The cookie stays as it is, so signing in with the right Google account
    // routes them back here. The button below re-sets it before signing out.

    return (
      <InviteContainer>
        <Card maxWidth={480} padding="36px 32px">
          <CardHeader>
            <CardBadge
              size={64}
              style={{ backgroundColor: "rgba(220, 38, 38, 0.10)" }}
            >
              <AlertCircle size={30} color="#DC2626" />
            </CardBadge>
            <CardTitle>Different account required</CardTitle>
            <CardDescription style={{ marginBottom: 12 }}>
              This invite was sent to a different email address.
            </CardDescription>

            <div
              style={{
                width: "100%",
                borderRadius: 12,
                backgroundColor: "#F4F4F5",
                padding: "10px 14px",
                fontSize: 12.5,
                color: "#52525B",
                textAlign: "center",
                boxSizing: "border-box",
                marginBottom: 4,
              }}
            >
              Signed in as: <strong style={{ color: "#18181B" }}>{user.email}</strong>
            </div>
          </CardHeader>

          <SwitchAccountButton token={token} />
        </Card>
      </InviteContainer>
    );
  }

  // 3. Already belongs to another org (one org per officer in v0.2)
  if (status === "in_other_org") {
    return (
      <InviteContainer>
        <ClearInviteCookie />
        <Card maxWidth={480} padding="36px 32px">
          <CardHeader>
            <CardBadge
              size={64}
              style={{ backgroundColor: "rgba(5, 150, 105, 0.10)" }}
            >
              <Building size={30} color="#059669" />
            </CardBadge>
            <CardTitle>Already in an organization</CardTitle>
            <CardDescription style={{ maxWidth: 380 }}>
              You already belong to another org. In this version, an officer can belong to only one org.
            </CardDescription>
          </CardHeader>

          <GoToWorkspaceButton />
        </Card>
      </InviteContainer>
    );
  }

  // 4. Default / Invalid token
  return (
    <InviteContainer>
      <ClearInviteCookie />
      <Card maxWidth={460} padding="36px 32px">
        <CardHeader>
          <CardBadge
            size={64}
            style={{ backgroundColor: "rgba(220, 38, 38, 0.10)" }}
          >
            <AlertTriangle size={30} color="#DC2626" />
          </CardBadge>
          <CardTitle>Invite no longer valid</CardTitle>
          <CardDescription style={{ maxWidth: 360 }}>
            This invite is no longer valid. Ask an admin to send a new one.
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
            Back to Home
          </Link>
        </div>
      </Card>
    </InviteContainer>
  );
}

/**
 * Centered responsive canvas wrapper matching OrgKit design system.
 */
function InviteContainer({ children }: { children: React.ReactNode }) {
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

export default function InvitePage(props: InvitePageProps) {
  return (
    <Suspense fallback={null}>
      <InviteContent {...props} />
    </Suspense>
  );
}

