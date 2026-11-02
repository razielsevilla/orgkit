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

const messageStyle: React.CSSProperties = {
  margin: 0,
  textAlign: "center",
  fontSize: 15,
  lineHeight: 1.5,
  color: "#18181B",
};

export default function JoinPage({ params }: { params: Promise<{ token: string }> }) {
  return (
    <main
      className={plusJakarta.className}
      style={{
        minHeight: "100vh",
        backgroundColor: "#F4F4F5",
        color: "#18181B",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        padding: "clamp(16px, 5vh, 48px) 16px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 440,
          backgroundColor: "#FFFFFF",
          border: "1px solid rgba(228, 228, 231, 0.6)",
          borderRadius: 26,
          padding: "clamp(20px, 5vw, 32px)",
          boxShadow: "0 20px 50px rgba(24, 24, 27, 0.08)",
          boxSizing: "border-box",
        }}
      >
        <Suspense fallback={<p style={{ ...messageStyle, color: "#71717A" }}>Loading…</p>}>
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
    return <p style={messageStyle}>{JOIN_MESSAGES.inactiveLink}</p>;
  }

  return (
    <JoinForm
      token={token}
      orgName={orgName}
      contactEmail={process.env.PRIVACY_CONTACT_EMAIL?.trim() || "[privacy contact email]"}
    />
  );
}
