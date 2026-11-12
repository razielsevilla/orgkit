import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { plusJakarta } from "@/src/lib/fonts";
import { Card } from "@/src/components/ui/card";
import { FloatingIconsDecor } from "@/src/components/decor/floating-decor";
import { getCheckinEvent } from "@/src/lib/checkin/checkin-server";
import { CheckinForm } from "@/src/components/checkin/checkin-form";
import { CheckinExpiredView } from "@/src/components/checkin/checkin-results";
import { JoinBackdrop } from "@/src/components/join/join-backdrop";
import { FlowLoader } from "@/src/components/workspace/frame/flow-loader";

// The link is a secret: keep it out of search results
export const metadata: Metadata = {
  title: "Check in · OrgKit",
  robots: { index: false, follow: false },
};

export default function CheckinPage({ params }: { params: Promise<{ token: string }> }) {
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

        <Suspense fallback={<CheckinLoadingCard />}>
          <CheckinContent params={params} />
        </Suspense>
      </div>
    </main>
  );
}

function CheckinLoadingCard() {
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

// Reads the token from the URL, the clock and the database, so it streams in behind Suspense
async function CheckinContent({ params }: { params: Promise<{ token: string }> }) {
  await connection();
  const { token } = await params;

  let event = null;
  try {
    event = await getCheckinEvent(token);
  } catch (err) {
    // A missing signing secret must look like a closed link, not a crash
    console.error("Error loading the check-in page:", err);
  }

  if (!event) return <CheckinExpiredView />;

  return <CheckinForm token={token} orgName={event.orgName} eventTitle={event.eventTitle} />;
}
