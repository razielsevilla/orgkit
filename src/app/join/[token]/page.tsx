import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import Image from "next/image";
import { plusJakarta } from "@/src/lib/fonts";
import { Link2Off } from "lucide-react";
import { Card, CardBadge, CardTitle, CardDescription } from "@/src/components/ui/card";
import { FloatingIconsDecor } from "@/src/components/decor/floating-decor";
import { JOIN_MESSAGES } from "@/src/lib/members/member-join";
import { getJoinOrgName } from "@/src/lib/members/member-join-server";
import { JoinForm } from "@/src/components/join/join-form";
import { JoinBackdrop } from "@/src/components/join/join-backdrop";
import { FlowLoader } from "@/src/components/workspace/frame/flow-loader";

// The link is a secret: keep it out of search results
export const metadata: Metadata = {
  title: "Join your org · OrgKit",
  robots: { index: false, follow: false },
};

export default function JoinPage({ params }: { params: Promise<{ token: string }> }) {
  return (
    <main
      className={`${plusJakarta.className} orgkit-join-page`}
      style={{
        position: "relative",
        minHeight: "100vh",
        backgroundColor: "var(--color-base)",
        color: "var(--color-ink)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "clamp(24px, 4vh, 48px) 16px",
        boxSizing: "border-box",
        overflowX: "hidden",
      }}
    >
      <JoinBackdrop />

      {/* ── Centered Card with Floating Icons Decor ── */}
      <div
        className="orgkit-card-wrapper"
        style={{
          position: "relative",
          zIndex: 10,
          width: "100%",
          maxWidth: 460,
          boxSizing: "border-box",
          animation: "cardPopout 0.45s cubic-bezier(0.16, 1.25, 0.38, 1) both",
        }}
      >
        <FloatingIconsDecor />

        <Suspense fallback={<JoinLoadingCard />}>
          <JoinContent params={params} />
        </Suspense>
      </div>
    </main>
  );
}

function JoinLoadingCard() {
  return (
    <Card maxWidth={460} padding="48px 36px">
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 180,
        }}
      >
        <FlowLoader />
      </div>
    </Card>
  );
}

// Reads the link from the URL and the database, so it streams in behind Suspense
async function JoinContent({ params }: { params: Promise<{ token: string }> }) {
  await connection();
  const { token } = await params;
  const orgName = await getJoinOrgName(token);

  if (!orgName) {
    return (
      <Card maxWidth={460} padding="clamp(32px, 4vw, 44px) clamp(24px, 3vw, 36px)">
        <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
            <Image
              src="/orgkit-text-logo.png"
              alt="OrgKit"
              width={112}
              height={34}
              priority
              style={{
                height: 28,
                width: "auto",
                display: "block",
                userSelect: "none",
              }}
            />
          </div>
          <CardBadge size={68} style={{ backgroundColor: "color-mix(in srgb, var(--color-danger) 8%, transparent)", marginBottom: 18 }}>
            <Link2Off size={30} color="var(--color-danger)" strokeWidth={2.2} />
          </CardBadge>
          <CardTitle style={{ fontSize: 24, marginBottom: 10 }}>
            Link isn&apos;t active
          </CardTitle>
          <CardDescription style={{ fontSize: 15, lineHeight: 1.55, color: "var(--color-muted-strong)", maxWidth: 360 }}>
            {JOIN_MESSAGES.inactiveLink}
          </CardDescription>
        </div>
      </Card>
    );
  }

  return (
    <JoinForm
      token={token}
      orgName={orgName}
      contactEmail={process.env.PRIVACY_CONTACT_EMAIL?.trim() || "[privacy contact email]"}
    />
  );
}
