import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { plusJakarta } from "@/src/lib/fonts";
import { ROUTES } from "@/src/lib/routes";
import { requireOwner } from "@/src/lib/auth/owner";
import { getUsageReport } from "@/src/lib/owner/usage-queries";
import { UsageTable } from "@/src/components/owner/usage-table";
import { OwnerNav } from "@/src/components/owner/owner-nav";
import { WorkspaceContentLoader } from "@/src/components/workspace/frame/workspace-content-loader";

// Only the owner can open this, and there is nothing here for a search engine
export const metadata: Metadata = {
  title: "Usage · OrgKit",
  robots: { index: false, follow: false },
};

async function UsageContent() {
  // Anyone who is not the owner gets a 404 here, before anything is loaded
  await requireOwner();
  const result = await getUsageReport();

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
        We couldn&apos;t load the usage report. Please reload the page to try again.
      </p>
    );
  }

  return <UsageTable weeks={result.weeks} />;
}

export default function OwnerUsagePage() {
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
        <OwnerNav current="usage" />

        <h1
          style={{
            fontSize: "clamp(26px, 3.2vw, 36px)",
            fontWeight: 700,
            letterSpacing: "-0.02em",
            margin: "16px 0 6px",
            lineHeight: 1.15,
          }}
        >
          Weekly usage
        </h1>
        <p style={{ margin: "0 0 24px", fontSize: 14, color: "var(--color-muted)", lineHeight: 1.5 }}>
          The last 4 completed weeks (Monday to Sunday, UTC). Counts only: nothing about individual
          members or page views.
        </p>

        <Suspense fallback={<WorkspaceContentLoader />}>
          <UsageContent />
        </Suspense>

        <div
          style={{
            marginTop: 24,
            fontSize: 13,
            lineHeight: 1.6,
            color: "var(--color-muted)",
          }}
        >
          <p style={{ margin: "0 0 6px" }}>
            <strong style={{ color: "var(--color-ink-soft)" }}>Active org:</strong> that week it created
            an event, had a check-in, sent a dues reminder, or reviewed a dues payment. Every other org
            is counted as inactive.
          </p>
          <p style={{ margin: 0 }}>
            <strong style={{ color: "var(--color-ink-soft)" }}>Active officer:</strong> an officer who did
            one of those actions that week.
          </p>
        </div>
      </div>
    </main>
  );
}
