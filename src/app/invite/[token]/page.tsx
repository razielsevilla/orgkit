import { redirect } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { AlertCircle, Building, UserCheck } from "lucide-react";
import { createClient } from "@/src/lib/supabase/server";
import { createAdminClient } from "@/src/lib/supabase/service-role";
import { findUsableInvite } from "@/src/lib/invites/invite-lookup";
import { acceptInvite } from "@/src/lib/invites/invite-accept";
import { allowRequest, INVITE_ATTEMPTS_PER_MINUTE } from "@/src/lib/rate-limit";
import { workspacePath } from "@/src/lib/orgs/memberships";
import { ROLE_DETAILS, isOfficerRole } from "@/src/lib/orgs/permissions";
import {
  Card,
  CardBadge,
  CardTitle,
  CardDescription,
  CardHeader,
} from "@/src/components/ui/card";
import {
  InviteGuestButton,
  SwitchAccountButton,
  GoToWorkspaceButton,
  ClearInviteCookie,
} from "./invite-client";
import { InvalidInviteCard, InviteContainer, TooManyRequestsCard } from "./invite-cards";

interface InvitePageProps {
  params: Promise<{ token: string }>;
}

async function InviteContent({ params }: InvitePageProps) {
  const { token } = await params;

  // 1. Rate limit per device
  if (!(await allowRequest("invite", INVITE_ATTEMPTS_PER_MINUTE))) {
    return <TooManyRequestsCard />;
  }

  // 2. Look up the token by its SHA-256 hash. Cookies cannot be written while a
  //    page renders, so this page only reads them; the cookie is set by
  //    /invite/[token]/start and cleared by <ClearInviteCookie />.
  const found = await findUsableInvite(token);
  if (!found) return <InvalidInviteCard />;

  const { invite, tokenHash } = found;
  const orgName = invite.orgName || "the organization";
  const orgSchool = invite.orgSchool || null;
  const roleInfo = ROLE_DETAILS[isOfficerRole(invite.role) ? invite.role : "officer"];

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
              <UserCheck size={32} color="var(--color-accent)" />
            </CardBadge>

            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--color-accent)",
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
                  color: "var(--color-muted)",
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
                backgroundColor: "color-mix(in srgb, var(--color-accent) 8%, transparent)",
                border: "1px solid color-mix(in srgb, var(--color-accent) 20%, transparent)",
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
                  color: "var(--color-accent-strong)",
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
                  color: "var(--color-muted-strong)",
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
              color: "var(--color-muted)",
              textAlign: "center",
              margin: "18px 0 0 0",
              lineHeight: 1.4,
            }}
          >
            By continuing, you agree to OrgKit&apos;s{" "}
            <Link href="/terms" style={{ color: "var(--color-accent)", textDecoration: "underline" }}>
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" style={{ color: "var(--color-accent)", textDecoration: "underline" }}>
              Privacy Policy
            </Link>
            .
          </p>
        </Card>
      </InviteContainer>
    );
  }

  // Visitor IS signed in: check privacy consent agreement (A1)
  const { data: officer } = await createAdminClient()
    .from("officers")
    .select("id, email, full_name, consent_at")
    .eq("id", user.id)
    .maybeSingle();

  if (!officer || !officer.consent_at) {
    // The start route remembers the invite, then sends them to the A1 consent screen
    redirect(`/invite/${token}/start`);
  }

  // Visitor has consent: accept the invite in one database transaction
  const outcome = await acceptInvite(supabase, tokenHash);

  switch (outcome.kind) {
    // Go to the workspace (the proxy clears the cookie there)
    case "joined":
      redirect(workspacePath(outcome.orgId));

    // Email mismatch: show switch account card
    case "email_mismatch":
      // The cookie stays as it is, so signing in with the right Google account
      // routes them back here. The button below re-sets it before signing out.
      return (
        <InviteContainer>
          <Card maxWidth={480} padding="36px 32px">
            <CardHeader>
              <CardBadge
                size={64}
                style={{ backgroundColor: "color-mix(in srgb, var(--color-danger) 10%, transparent)" }}
              >
                <AlertCircle size={30} color="var(--color-danger)" />
              </CardBadge>
              <CardTitle>Different account required</CardTitle>
              <CardDescription style={{ marginBottom: 12 }}>
                This invite was sent to a different email address.
              </CardDescription>

              <div
                style={{
                  width: "100%",
                  borderRadius: 12,
                  backgroundColor: "var(--color-base)",
                  padding: "10px 14px",
                  fontSize: 12.5,
                  color: "var(--color-muted-strong)",
                  textAlign: "center",
                  boxSizing: "border-box",
                  marginBottom: 4,
                }}
              >
                Signed in as: <strong style={{ color: "var(--color-ink)" }}>{user.email}</strong>
              </div>
            </CardHeader>

            <SwitchAccountButton token={token} />
          </Card>
        </InviteContainer>
      );

    // Already belongs to another org (one org per officer in v0.2)
    case "in_other_org":
      return (
        <InviteContainer>
          <ClearInviteCookie />
          <Card maxWidth={480} padding="36px 32px">
            <CardHeader>
              <CardBadge
                size={64}
                style={{ backgroundColor: "color-mix(in srgb, var(--color-accent) 10%, transparent)" }}
              >
                <Building size={30} color="var(--color-accent)" />
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

    default:
      return <InvalidInviteCard />;
  }
}

export default function InvitePage(props: InvitePageProps) {
  return (
    <Suspense fallback={null}>
      <InviteContent {...props} />
    </Suspense>
  );
}
