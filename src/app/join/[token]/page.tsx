import type { Metadata } from "next";
import { Suspense } from "react";
import { Plus_Jakarta_Sans } from "next/font/google";
import { JOIN_MESSAGES } from "@/src/lib/member-join";
import { getJoinOrgName } from "@/src/lib/member-join-server";
import { JoinForm } from "./join-form";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "600", "700"],
});

// The link is a secret: keep it out of search results
export const metadata: Metadata = {
  title: "Join your org · OrgKit",
  robots: { index: false, follow: false },
};

export default function JoinPage({ params }: { params: Promise<{ token: string }> }) {
  return (
    <main
      className={`${plusJakarta.className} flex min-h-screen items-start justify-center bg-base px-4 py-6 sm:items-center`}
    >
      <div className="w-full max-w-[440px] rounded-3xl border border-line/60 bg-surface p-5 shadow-[0_20px_50px_rgba(24,24,27,0.08)] sm:p-8">
        <Suspense fallback={<p className="text-center text-muted">Loading…</p>}>
          <JoinContent params={params} />
        </Suspense>
      </div>
    </main>
  );
}

// Reads the link from the URL and the database, so it streams in behind Suspense
async function JoinContent({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const orgName = await getJoinOrgName(token);

  if (!orgName) {
    return <p className="text-center text-ink">{JOIN_MESSAGES.inactiveLink}</p>;
  }

  return (
    <JoinForm
      token={token}
      orgName={orgName}
      contactEmail={process.env.PRIVACY_CONTACT_EMAIL?.trim() || "[privacy contact email]"}
    />
  );
}
