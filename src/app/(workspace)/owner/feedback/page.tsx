import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { plusJakarta } from "@/src/lib/fonts";
import { ROUTES } from "@/src/lib/routes";
import { requireOwner } from "@/src/lib/auth/owner";
import { getFeedbackInbox } from "@/src/lib/owner/feedback-queries";
import { FeedbackList } from "@/src/components/owner/feedback-list";
import { OwnerNav } from "@/src/components/owner/owner-nav";
import { WorkspaceContentLoader } from "@/src/components/workspace/frame/workspace-content-loader";

// Only the owner can open this, and it holds what people wrote: keep it out of search
export const metadata: Metadata = {
  title: "Feedback · OrgKit",
  robots: { index: false, follow: false },
};

async function FeedbackContent() {
  // Anyone who is not the owner gets a 404 here, before anything is loaded
  await requireOwner();
  const result = await getFeedbackInbox();

  if (!result.ok) {
    return (
      <p
        role="alert"
        style={{
          margin: 0,
          padding: "16px 18px",
          borderRadius: 16,
          border: "1px solid var(--color-danger)",
          color: "var(--color-danger)",
          fontSize: 14,
        }}
      >
        We couldn&apos;t load the feedback inbox. Please reload the page to try again.
      </p>
    );
  }

  return <FeedbackList items={result.items} />;
}

export default function OwnerFeedbackPage() {
  return (
    <main
      className={plusJakarta.className}
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--color-base)",
        color: "var(--color-ink)",
        padding: "clamp(24px, 5vh, 48px) 16px",
        boxSizing: "border-box",
      }}
    >
      {/* The app locks page scrolling by default; this page can be taller than the screen */}
      <style>{`
        html, body {
          overflow-y: auto !important;
          height: auto !important;
          min-height: 100% !important;
          max-height: none !important;
        }
      `}</style>

      <div style={{ maxWidth: 820, margin: "0 auto" }}>
        <Link
          href={ROUTES.home}
          style={{ fontSize: 14, fontWeight: 600, color: "var(--color-accent)", textDecoration: "none" }}
        >
          ← Back to OrgKit
        </Link>
        <OwnerNav current="feedback" />

        <h1
          style={{
            fontSize: "clamp(26px, 3.2vw, 36px)",
            fontWeight: 700,
            letterSpacing: "-0.02em",
            margin: "16px 0 6px",
            lineHeight: 1.15,
          }}
        >
          Feedback
        </h1>
        <p style={{ margin: "0 0 24px", fontSize: 14, color: "var(--color-muted)", lineHeight: 1.5 }}>
          What officers sent with the Feedback button, newest first (the latest 100). Each shows the
          page they were on. This is personal data: read it, act on it, then delete what you no
          longer need.
        </p>

        <Suspense fallback={<WorkspaceContentLoader />}>
          <FeedbackContent />
        </Suspense>
      </div>
    </main>
  );
}
